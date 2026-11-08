import { DEFAULT_FEE_BPS, parseBRLToCents, platformFeeCents } from "@/lib/fundraisers";

export const DONATION_MIN_CENTS = 500; // R$ 5
export const DONATION_MAX_CENTS = 5_000_000; // R$ 50.000
/** Contribuição voluntária ao TenhaVoz: até 25% do valor doado. */
export const TIP_MAX_BPS = 2500;

export interface DonationInput {
  amountCents: number;
  tipCents: number;
  donorName: string | null;
  isAnonymous: boolean;
  message: string | null;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseDonationForm(form: FormData): Parsed<DonationInput> {
  const amountCents = parseBRLToCents(String(form.get("amount") ?? ""));
  if (amountCents === null) return { ok: false, error: "Informe o valor da doação em reais." };
  if (amountCents < DONATION_MIN_CENTS) return { ok: false, error: "O valor mínimo é R$ 5,00." };
  if (amountCents > DONATION_MAX_CENTS) return { ok: false, error: "O valor máximo por doação é R$ 50.000,00." };

  const tipRaw = String(form.get("tip") ?? "0");
  const tipCents = tipRaw.trim() === "" ? 0 : parseBRLToCents(tipRaw);
  if (tipCents === null) return { ok: false, error: "Contribuição voluntária inválida." };
  if (tipCents > Math.floor((amountCents * TIP_MAX_BPS) / 10_000)) {
    return { ok: false, error: "A contribuição voluntária pode ser de no máximo 25% do valor doado." };
  }

  const name = String(form.get("donorName") ?? "").trim().slice(0, 60);
  const isAnonymous = form.get("anonymous") === "on";
  const message = String(form.get("message") ?? "").trim();
  if (message.length > 300) return { ok: false, error: "A mensagem pode ter no máximo 300 caracteres." };
  if (/https?:\/\/|www\./i.test(message)) return { ok: false, error: "Links não são permitidos na mensagem." };

  return {
    ok: true,
    value: { amountCents, tipCents, donorName: name || null, isAnonymous, message: message || null },
  };
}

export interface Charge {
  /** O que a pessoa paga no total. */
  totalCents: number;
  /** O que o TenhaVoz recebe (comissão sobre a doação + contribuição voluntária). */
  marketplaceFeeCents: number;
  platformFeeCents: number;
}

export function computeCharge(amountCents: number, tipCents: number, feeBps: number = DEFAULT_FEE_BPS): Charge {
  const platform = platformFeeCents(amountCents, feeBps);
  return { totalCents: amountCents + tipCents, marketplaceFeeCents: platform + tipCents, platformFeeCents: platform };
}

export interface PreferenceInput {
  donationId: string;
  title: string;
  slug: string;
  charge: Charge;
  siteUrl: string;
}

/** Corpo da preferência do Checkout Pro (a cobrança sai na conta do criador; o split é do Mercado Pago). */
export function buildPreferenceBody({ donationId, title, slug, charge, siteUrl }: PreferenceInput) {
  const back = `${siteUrl}/d/${slug}?obrigado=1`;
  return {
    items: [
      {
        id: donationId,
        title: `Doação: ${title}`.slice(0, 120),
        quantity: 1,
        currency_id: "BRL",
        unit_price: charge.totalCents / 100,
      },
    ],
    marketplace_fee: charge.marketplaceFeeCents / 100,
    external_reference: donationId,
    notification_url: `${siteUrl}/api/webhooks/mp-donations?d=${donationId}`,
    back_urls: { success: back, pending: back, failure: `${siteUrl}/d/${slug}` },
    auto_return: "approved",
    statement_descriptor: "TENHAVOZ",
  };
}

export type PaymentVerdict =
  | { kind: "approved" }
  | { kind: "refunded" }
  | { kind: "failed" }
  | { kind: "pending" }
  | { kind: "reject"; reason: string };

/**
 * Decide o que fazer com um pagamento consultado na API do Mercado Pago. Só o
 * pagamento buscado por nós conta — o conteúdo do aviso nunca é confiado.
 */
export function judgePayment(
  payment: { status?: string; external_reference?: string | null; transaction_amount?: number; currency_id?: string },
  donation: { id: string; amount_cents: number; tip_cents: number }
): PaymentVerdict {
  if (payment.external_reference !== donation.id) return { kind: "reject", reason: "external_reference diferente" };
  const expected = donation.amount_cents + donation.tip_cents;
  if (Math.round((payment.transaction_amount ?? 0) * 100) !== expected) return { kind: "reject", reason: "valor diferente do esperado" };
  if (payment.currency_id && payment.currency_id !== "BRL") return { kind: "reject", reason: "moeda diferente" };
  switch (payment.status) {
    case "approved":
      return { kind: "approved" };
    case "refunded":
    case "charged_back":
      return { kind: "refunded" };
    case "rejected":
    case "cancelled":
      return { kind: "failed" };
    default:
      return { kind: "pending" };
  }
}
