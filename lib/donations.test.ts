import { describe, expect, it } from "vitest";
import { buildPreferenceBody, computeCharge, judgePayment, parseDonationForm } from "./donations";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  Object.entries(o).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("parseDonationForm", () => {
  it("aceita doação com contribuição e mensagem", () => {
    const r = parseDonationForm(form({ amount: "50,00", tip: "2,50", donorName: "Maria Silva", message: "Boa sorte!" }));
    expect(r).toMatchObject({ ok: true, value: { amountCents: 5000, tipCents: 250, donorName: "Maria Silva" } });
  });
  it("recusa valores fora dos limites, contribuição acima de 25% e links", () => {
    expect(parseDonationForm(form({ amount: "2" })).ok).toBe(false);
    expect(parseDonationForm(form({ amount: "100000" })).ok).toBe(false);
    expect(parseDonationForm(form({ amount: "10", tip: "5" })).ok).toBe(false);
    expect(parseDonationForm(form({ amount: "10", message: "veja https://x.com" })).ok).toBe(false);
  });
});

describe("computeCharge", () => {
  it("4% sobre a doação + contribuição voluntária inteira", () => {
    expect(computeCharge(10000, 500)).toEqual({ totalCents: 10500, marketplaceFeeCents: 900, platformFeeCents: 400 });
  });
});

describe("buildPreferenceBody", () => {
  it("cobra o total, informa a comissão e identifica a doação", () => {
    const b = buildPreferenceBody({ donationId: "d1", title: "Brasília", slug: "bsb", charge: computeCharge(10000, 500), siteUrl: "https://x.com" });
    expect(b.items[0]!.unit_price).toBe(105);
    expect(b.marketplace_fee).toBe(9);
    expect(b.external_reference).toBe("d1");
    expect(b.notification_url).toBe("https://x.com/api/webhooks/mp-donations?d=d1");
  });
});

describe("judgePayment", () => {
  const donation = { id: "d1", amount_cents: 10000, tip_cents: 500 };
  const pay = { status: "approved", external_reference: "d1", transaction_amount: 105, currency_id: "BRL" };
  it("aprova quando tudo confere", () => {
    expect(judgePayment(pay, donation)).toEqual({ kind: "approved" });
  });
  it("rejeita referência ou valor trocados", () => {
    expect(judgePayment({ ...pay, external_reference: "outro" }, donation).kind).toBe("reject");
    expect(judgePayment({ ...pay, transaction_amount: 10 }, donation).kind).toBe("reject");
  });
  it("mapeia estornos, falhas e pendências", () => {
    expect(judgePayment({ ...pay, status: "refunded" }, donation).kind).toBe("refunded");
    expect(judgePayment({ ...pay, status: "rejected" }, donation).kind).toBe("failed");
    expect(judgePayment({ ...pay, status: "in_process" }, donation).kind).toBe("pending");
  });
});
