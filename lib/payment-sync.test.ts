import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const recordPayment = vi.fn();
const publishCampaign = vi.fn();
const redeemCoupon = vi.fn();
const mpGet = vi.fn();
const mpSearch = vi.fn();
const stripeRetrieve = vi.fn();
const stripeList = vi.fn();

vi.mock("@/lib/payments", () => ({ recordPayment: (...a: unknown[]) => recordPayment(...a) }));
vi.mock("@/lib/campaigns", () => ({
  publishCampaignAfterConfirmedPayment: (...a: unknown[]) => publishCampaign(...a),
}));
vi.mock("@/lib/coupons", () => ({ redeemCoupon: (...a: unknown[]) => redeemCoupon(...a) }));
vi.mock("@/lib/mercadopago", () => ({
  getMercadoPagoPaymentClient: () => ({
    get: (...a: unknown[]) => mpGet(...a),
    search: (...a: unknown[]) => mpSearch(...a),
  }),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: (...a: unknown[]) => stripeRetrieve(...a),
        list: (...a: unknown[]) => stripeList(...a),
      },
    },
  }),
}));

import {
  processMercadoPagoPayment,
  processStripeSession,
  reconcileCampaignPayment,
  syncMercadoPagoPaymentById,
  syncStripeSessionById,
} from "./payment-sync";

/** Admin falso: payments devolve `existingPaymentStatus`, campaigns devolve `campaignRow`. */
function fakeAdmin(opts: {
  existingPaymentStatus?: string | null;
  campaignRow?: { user_id: string } | null;
}) {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.maybeSingle = async () => {
        if (table === "payments") {
          return {
            data: opts.existingPaymentStatus ? { status: opts.existingPaymentStatus } : null,
            error: null,
          };
        }
        return { data: opts.campaignRow ?? null, error: null };
      };
      return builder;
    },
  } as never;
}

function stripeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_abc123",
    payment_status: "paid",
    amount_total: 4990,
    metadata: { campaignId: "camp-1", userId: "user-1", couponCode: "" },
    ...overrides,
  } as Stripe.Checkout.Session;
}

beforeEach(() => {
  vi.clearAllMocks();
  publishCampaign.mockResolvedValue({ campaign: {}, alreadyPublished: false });
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("processStripeSession", () => {
  it("sessão paga: grava como confirmada e publica", async () => {
    const result = await processStripeSession(fakeAdmin({}), stripeSession());
    expect(recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        provider: "stripe",
        providerPaymentId: "cs_test_abc123",
        status: "confirmed",
        amount: 49.9,
        campaignId: "camp-1",
      })
    );
    expect(publishCampaign).toHaveBeenCalledWith(expect.anything(), "camp-1");
    expect(result).toEqual({ campaignId: "camp-1", paymentStatus: "confirmed", published: true });
  });

  it("meio assíncrono ainda não pago: grava pendente e NÃO publica", async () => {
    const result = await processStripeSession(
      fakeAdmin({}),
      stripeSession({ payment_status: "unpaid" })
    );
    expect(recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "pending" })
    );
    expect(publishCampaign).not.toHaveBeenCalled();
    expect(result.published).toBe(false);
  });

  it("resgata o cupom só na primeira publicação (reentrega não conta de novo)", async () => {
    const session = stripeSession({
      metadata: { campaignId: "camp-1", userId: "user-1", couponCode: "PROMO" },
    });
    await processStripeSession(fakeAdmin({}), session);
    expect(redeemCoupon).toHaveBeenCalledTimes(1);

    publishCampaign.mockResolvedValue({ campaign: {}, alreadyPublished: true });
    await processStripeSession(fakeAdmin({}), session);
    expect(redeemCoupon).toHaveBeenCalledTimes(1);
  });

  it("sem metadados: não grava nada", async () => {
    const result = await processStripeSession(fakeAdmin({}), stripeSession({ metadata: {} }));
    expect(recordPayment).not.toHaveBeenCalled();
    expect(result.published).toBe(false);
  });

  it("não desfaz um reembolso ao reprocessar a sessão (Stripe segue dizendo 'paid')", async () => {
    const result = await processStripeSession(
      fakeAdmin({ existingPaymentStatus: "refunded" }),
      stripeSession()
    );
    expect(recordPayment).not.toHaveBeenCalled();
    expect(publishCampaign).not.toHaveBeenCalled();
    expect(result).toEqual({ campaignId: "camp-1", paymentStatus: "refunded", published: false });
  });
});

describe("processMercadoPagoPayment (Pix)", () => {
  const admin = fakeAdmin({ campaignRow: { user_id: "user-1" } });

  it("Pix aprovado: confirma e publica", async () => {
    const result = await processMercadoPagoPayment(admin, {
      id: 123456,
      status: "approved",
      external_reference: "camp-1",
      transaction_amount: 49.9,
      metadata: {},
    });
    expect(recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        provider: "mercadopago",
        providerPaymentId: "123456",
        status: "confirmed",
        userId: "user-1",
        amount: 49.9,
      })
    );
    expect(publishCampaign).toHaveBeenCalledWith(expect.anything(), "camp-1");
    expect(result.published).toBe(true);
  });

  it("Pix gerado mas ainda não pago (pending): grava pendente e NÃO publica", async () => {
    const result = await processMercadoPagoPayment(admin, {
      id: 1,
      status: "pending",
      external_reference: "camp-1",
      transaction_amount: 49.9,
    });
    expect(recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "pending" })
    );
    expect(publishCampaign).not.toHaveBeenCalled();
    expect(result).toEqual({ campaignId: "camp-1", paymentStatus: "pending", published: false });
  });

  it.each([
    ["rejected", "failed"],
    ["cancelled", "failed"],
    ["refunded", "refunded"],
    ["charged_back", "refunded"],
    ["in_process", "pending"],
  ])("status %s do Mercado Pago vira %s", async (mp, expected) => {
    await processMercadoPagoPayment(admin, {
      id: 9,
      status: mp,
      external_reference: "camp-1",
      transaction_amount: 10,
    });
    expect(recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: expected })
    );
    expect(publishCampaign).not.toHaveBeenCalled();
  });

  it("lê o cupom do metadata e o resgata na primeira publicação", async () => {
    await processMercadoPagoPayment(admin, {
      id: 5,
      status: "approved",
      external_reference: "camp-1",
      transaction_amount: 10,
      metadata: { coupon_code: "PROMO" },
    });
    expect(redeemCoupon).toHaveBeenCalledWith(expect.anything(), "PROMO");
  });

  it("campanha apagada depois de pagar: não grava, avisa no log e não publica", async () => {
    const result = await processMercadoPagoPayment(fakeAdmin({ campaignRow: null }), {
      id: 7,
      status: "approved",
      external_reference: "camp-sumiu",
      transaction_amount: 49.9,
    });
    expect(recordPayment).not.toHaveBeenCalled();
    expect(publishCampaign).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("campanha inexistente"),
      expect.objectContaining({ paymentId: 7, campaignId: "camp-sumiu" })
    );
    expect(result.published).toBe(false);
  });

  it("sem external_reference: ignora", async () => {
    const result = await processMercadoPagoPayment(admin, { id: 1, status: "approved" });
    expect(recordPayment).not.toHaveBeenCalled();
    expect(result.campaignId).toBeNull();
  });

  it("não desfaz reembolso já registrado", async () => {
    const result = await processMercadoPagoPayment(
      fakeAdmin({ campaignRow: { user_id: "u" }, existingPaymentStatus: "refunded" }),
      { id: 1, status: "approved", external_reference: "camp-1", transaction_amount: 1 }
    );
    expect(recordPayment).not.toHaveBeenCalled();
    expect(result.published).toBe(false);
  });
});

describe("syncMercadoPagoPaymentById / syncStripeSessionById", () => {
  it("busca o pagamento no Mercado Pago e processa", async () => {
    mpGet.mockResolvedValue({
      id: 123,
      status: "approved",
      external_reference: "camp-1",
      transaction_amount: 10,
    });
    const result = await syncMercadoPagoPaymentById(
      fakeAdmin({ campaignRow: { user_id: "u" } }),
      "123"
    );
    expect(mpGet).toHaveBeenCalledWith({ id: "123" });
    expect(result.published).toBe(true);
  });

  it("rejeita id que não é numérico sem chamar a API", async () => {
    await syncMercadoPagoPaymentById(fakeAdmin({}), "abc; drop table");
    await syncMercadoPagoPaymentById(fakeAdmin({}), "");
    expect(mpGet).not.toHaveBeenCalled();
  });

  it("busca a sessão no Stripe e processa", async () => {
    stripeRetrieve.mockResolvedValue(stripeSession());
    const result = await syncStripeSessionById(fakeAdmin({}), "cs_test_abc123");
    expect(stripeRetrieve).toHaveBeenCalledWith("cs_test_abc123");
    expect(result.published).toBe(true);
  });

  it("rejeita session_id inválido sem chamar a API", async () => {
    await syncStripeSessionById(fakeAdmin({}), "../../etc");
    await syncStripeSessionById(fakeAdmin({}), "pi_123456789");
    expect(stripeRetrieve).not.toHaveBeenCalled();
  });
});

describe("reconcileCampaignPayment (botão 'Já paguei' e abertura do dashboard)", () => {
  const campaign = { id: "camp-1", created_at: "2026-10-20T10:00:00.000Z" };
  const admin = fakeAdmin({ campaignRow: { user_id: "user-1" } });

  it("acha o Pix aprovado no Mercado Pago pelo external_reference e libera a campanha", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token";
    mpSearch.mockResolvedValue({
      results: [
        { id: "1", status: "pending", external_reference: "camp-1", transaction_amount: 49.9 },
        { id: "2", status: "approved", external_reference: "camp-1", transaction_amount: 49.9 },
      ],
    });

    const outcome = await reconcileCampaignPayment(admin, campaign);

    expect(mpSearch).toHaveBeenCalledWith({
      options: expect.objectContaining({ external_reference: "camp-1" }),
    });
    expect(outcome).toEqual({ published: true, found: 2, errors: [] });
    expect(publishCampaign).toHaveBeenCalledTimes(1);
  });

  it("só Pix pendente: encontra mas não libera", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token";
    mpSearch.mockResolvedValue({
      results: [{ id: "1", status: "pending", external_reference: "camp-1", transaction_amount: 1 }],
    });
    const outcome = await reconcileCampaignPayment(admin, campaign);
    expect(outcome).toEqual({ published: false, found: 1, errors: [] });
    expect(publishCampaign).not.toHaveBeenCalled();
  });

  it("nenhum pagamento: nada a liberar", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token";
    mpSearch.mockResolvedValue({ results: [] });
    expect(await reconcileCampaignPayment(admin, campaign)).toEqual({
      published: false,
      found: 0,
      errors: [],
    });
  });

  it("provedor não configurado é pulado, sem erro", async () => {
    const outcome = await reconcileCampaignPayment(admin, campaign);
    expect(outcome).toEqual({ published: false, found: 0, errors: [] });
    expect(mpSearch).not.toHaveBeenCalled();
    expect(stripeList).not.toHaveBeenCalled();
  });

  it("falha no Mercado Pago não impede de verificar o Stripe (e vice-versa)", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token";
    process.env.STRIPE_SECRET_KEY = "sk";
    mpSearch.mockRejectedValue(new Error("MP fora do ar"));
    stripeList.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield stripeSession({ id: "cs_test_outra", metadata: { campaignId: "outra", userId: "u" } });
        yield stripeSession();
      },
    });

    const outcome = await reconcileCampaignPayment(admin, campaign);

    expect(outcome.published).toBe(true);
    expect(outcome.found).toBe(1); // só a sessão desta campanha
    expect(outcome.errors).toEqual([expect.stringContaining("MP fora do ar")]);
  });
});
