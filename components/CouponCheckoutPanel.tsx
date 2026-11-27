"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { formatBRL } from "@/lib/pricing";
import CheckoutShell from "@/components/checkout/CheckoutShell";
import PixPanel from "@/components/checkout/PixPanel";
import type { PixView } from "@/lib/checkout-pix";
import {
  startStripeCheckout,
  startMercadoPagoCheckout,
  startCampaignPixAction,
  claimFreeCampaign,
  publishFreeAsAdmin,
  validateCouponAction,
  type ValidateCouponState,
} from "@/app/dashboard/checkout/actions";

const initialCouponState: ValidateCouponState = {
  error: null,
  appliedCode: null,
  discountedPriceCents: null,
};

function ApplyCouponButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
    >
      {pending ? "Aplicando..." : "Aplicar"}
    </button>
  );
}

function PayButton({ label, variant }: { label: string; variant: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const className =
    variant === "primary"
      ? "w-full rounded-md bg-ink px-4 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      : "w-full rounded-md border border-gray-300 px-4 py-2.5 font-medium hover:bg-gray-100 disabled:opacity-60";
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Redirecionando..." : label}
    </button>
  );
}

export default function CouponCheckoutPanel({
  campaignId,
  price72hCents,
  price7dCents,
  isAdmin,
  campaignTitle,
  siteLabel,
  userEmail,
}: {
  campaignTitle: string;
  siteLabel: string | null;
  userEmail: string | null;
  campaignId: string;
  price72hCents: number;
  price7dCents: number;
  isAdmin: boolean;
}) {
  const [state, formAction] = useFormState(validateCouponAction, initialCouponState);
  const [duration, setDuration] = useState<"72" | "168">("72");

  const basePriceCents = duration === "72" ? price72hCents : price7dCents;
  const finalPriceCents = state.discountedPriceCents ?? basePriceCents;
  const hasDiscount = state.appliedCode !== null;
  const isFree = hasDiscount && finalPriceCents === 0;

  const [pix, setPix] = useState<PixView | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixPending, startPix] = useTransition();

  function generatePix(next: number) {
    setPixError(null);
    startPix(async () => {
      const r = await startCampaignPixAction(campaignId, duration, state.appliedCode ?? "", next);
      setAttempt(next);
      if (r.pix) setPix(r.pix);
      else setPixError(r.error);
    });
  }

  const totalLabel = isFree ? "Grátis" : formatBRL(finalPriceCents);

  return (
    <CheckoutShell
      step={2}
      title="Pagamento"
      userEmail={userEmail}
      lines={[
        { label: "Campanha", value: campaignTitle },
        ...(siteLabel ? [{ label: "Endereço", value: siteLabel }] : []),
        { label: "Prazo no ar", value: duration === "72" ? "72 horas" : "7 dias" },
        ...(hasDiscount ? [{ label: "Cupom", value: state.appliedCode ?? "" }] : []),
      ]}
      totalValue={totalLabel}
      perks={["Página pública com link próprio", "Liberada sozinha quando o pagamento cair", "Botão de envio de e-mail e estatísticas", "Você pode renovar ou duplicar depois"]}
    >
    <div className="flex flex-col gap-4">
      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">
          Prazo da campanha
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDuration("72")}
            className={`rounded-md border p-3 text-left ${
              duration === "72"
                ? "border-brand-600 ring-1 ring-brand-600"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <p className="font-medium">72 horas</p>
            <p className="text-sm text-gray-500">{formatBRL(price72hCents)}</p>
          </button>
          <button
            type="button"
            onClick={() => setDuration("168")}
            className={`rounded-md border p-3 text-left ${
              duration === "168"
                ? "border-brand-600 ring-1 ring-brand-600"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <p className="font-medium">7 dias</p>
            <p className="text-sm text-gray-500">{formatBRL(price7dCents)}</p>
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          A página fica no ar até o prazo escolhido acabar.
        </p>
      </div>

      <p className="text-gray-600">
        Campanha{" "}
        <strong>{isFree ? "Grátis" : formatBRL(finalPriceCents)}</strong>
        {hasDiscount && (
          <>
            {" "}
            <span className="text-sm text-gray-400 line-through">
              {formatBRL(basePriceCents)}
            </span>{" "}
            <span className="text-sm font-medium text-green-700">
              cupom {state.appliedCode} aplicado
            </span>
          </>
        )}
      </p>

      <form action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="priceCents" value={basePriceCents} />
        <div className="flex-1">
          <label htmlFor="couponCode" className="mb-1 block text-xs font-medium text-gray-600">
            Cupom de desconto (opcional)
          </label>
          <input
            id="couponCode"
            name="couponCode"
            type="text"
            defaultValue={state.appliedCode ?? ""}
            placeholder="CODIGO10"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          />
        </div>
        <ApplyCouponButton />
      </form>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-col gap-3">
        {isFree ? (
          <form action={claimFreeCampaign}>
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="duration" value={duration} />
            <input type="hidden" name="couponCode" value={state.appliedCode ?? ""} />
            <PayButton label="Publicar campanha gratuitamente" variant="primary" />
          </form>
        ) : (
          <>
            {pix ? (
              <PixPanel
                kind="campaign"
                refId={campaignId}
                pix={pix}
                amountLabel={totalLabel}
                success={{ title: "Pagamento confirmado!", text: "Sua página já está no ar. Compartilhe o link e acompanhe as visitas no painel.", href: "/dashboard?checkout=success", cta: "Ir para minhas campanhas" }}
                onRetry={() => {
                  setPix(null);
                  generatePix(attempt + 1);
                }}
              />
            ) : (
              <>
                <button type="button" disabled={pixPending} onClick={() => generatePix(attempt)} className="w-full rounded-md bg-ink px-4 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                  {pixPending ? "Gerando o Pix…" : `Pagar ${totalLabel} com Pix`}
                </button>
                {pixError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{pixError}</p>}
              </>
            )}
            <form action={startStripeCheckout}>
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="duration" value={duration} />
              <input type="hidden" name="couponCode" value={state.appliedCode ?? ""} />
              <PayButton label="Cartão (Stripe)" variant="secondary" />
            </form>
            <form action={startMercadoPagoCheckout}>
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="duration" value={duration} />
              <input type="hidden" name="couponCode" value={state.appliedCode ?? ""} />
              <PayButton label="Cartão ou saldo Mercado Pago" variant="secondary" />
            </form>
          </>
        )}

        {isAdmin && (
          <form action={publishFreeAsAdmin}>
            <input type="hidden" name="campaignId" value={campaignId} />
            <button
              type="submit"
              className="w-full rounded-md border border-dashed border-gray-400 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Publicar sem pagar (admin)
            </button>
          </form>
        )}
      </div>
    </div>
    </CheckoutShell>
  );
}