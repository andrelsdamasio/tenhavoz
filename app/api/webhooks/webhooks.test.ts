import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const syncMercadoPagoPaymentById = vi.fn();
const processStripeSession = vi.fn();
const constructEvent = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/payment-sync", () => ({
  syncMercadoPagoPaymentById: (...a: unknown[]) => syncMercadoPagoPaymentById(...a),
  processStripeSession: (...a: unknown[]) => processStripeSession(...a),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent: (...a: unknown[]) => constructEvent(...a) } }),
}));

import { POST as mercadoPagoPOST } from "./mercadopago/route";
import { POST as stripePOST } from "./stripe/route";

const SECRET = "segredo-do-webhook";

function signedHeaders(dataId: string, requestId = "req-1", ts = "1700000000") {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex");
  return { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId };
}

function mpRequest(query: string, headers: Record<string, string> = {}, body?: unknown) {
  return new Request(`https://tenhavoz.com.br/api/webhooks/mercadopago?${query}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  syncMercadoPagoPaymentById.mockResolvedValue({
    campaignId: "camp-1",
    paymentStatus: "confirmed",
    published: true,
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("webhook Mercado Pago", () => {
  it("webhook v1 com assinatura válida: processa o pagamento", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
    const res = await mercadoPagoPOST(
      mpRequest("data.id=123456&type=payment", signedHeaders("123456"))
    );
    expect(res.status).toBe(200);
    expect(syncMercadoPagoPaymentById).toHaveBeenCalledWith(expect.anything(), "123456");
  });

  it("assinatura inválida: 400, não processa e registra o motivo no log", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "outro-segredo";
    const res = await mercadoPagoPOST(
      mpRequest("data.id=123456&type=payment", signedHeaders("123456"))
    );
    expect(res.status).toBe(400);
    expect(syncMercadoPagoPaymentById).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("assinatura inválida"),
      expect.anything()
    );
  });

  it("formato antigo IPN (?id=...&topic=payment, sem assinatura) agora é processado", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
    const res = await mercadoPagoPOST(mpRequest("id=987654&topic=payment"));
    expect(res.status).toBe(200);
    expect(syncMercadoPagoPaymentById).toHaveBeenCalledWith(expect.anything(), "987654");
  });

  it("id vindo no corpo (data.id) também funciona", async () => {
    const res = await mercadoPagoPOST(
      mpRequest("", {}, { type: "payment", data: { id: 555 } })
    );
    expect(res.status).toBe(200);
    expect(syncMercadoPagoPaymentById).toHaveBeenCalledWith(expect.anything(), "555");
  });

  it("outros tipos (merchant_order etc.) são ignorados com 200", async () => {
    const res = await mercadoPagoPOST(mpRequest("id=1&topic=merchant_order"));
    expect(res.status).toBe(200);
    expect(syncMercadoPagoPaymentById).not.toHaveBeenCalled();
  });

  it("falha ao processar devolve 500 (para o Mercado Pago reenviar) e registra o erro", async () => {
    syncMercadoPagoPaymentById.mockRejectedValue(new Error("banco fora"));
    const res = await mercadoPagoPOST(mpRequest("data.id=1&type=payment"));
    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("webhook Stripe", () => {
  function stripeRequest() {
    return new Request("https://tenhavoz.com.br/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=abc" },
      body: "{}",
    });
  }

  it("sem STRIPE_WEBHOOK_SECRET: 400 e o log diz exatamente o que falta", async () => {
    const res = await stripePOST(stripeRequest());
    expect(res.status).toBe(400);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("STRIPE_WEBHOOK_SECRET"));
  });

  it("assinatura inválida: 400", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });
    const res = await stripePOST(stripeRequest());
    expect(res.status).toBe(400);
  });

  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"])(
    "%s processa a sessão (o async_payment_succeeded antes era ignorado)",
    async (type) => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
      constructEvent.mockReturnValue({ id: "evt_1", type, data: { object: { id: "cs_test_1" } } });
      processStripeSession.mockResolvedValue({
        campaignId: "camp-1",
        paymentStatus: "confirmed",
        published: true,
      });
      const res = await stripePOST(stripeRequest());
      expect(res.status).toBe(200);
      expect(processStripeSession).toHaveBeenCalledTimes(1);
    }
  );

  it("falha ao processar devolve 500 para o Stripe reenviar", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1" } },
    });
    processStripeSession.mockRejectedValue(new Error("banco fora"));
    const res = await stripePOST(stripeRequest());
    expect(res.status).toBe(500);
  });
});
