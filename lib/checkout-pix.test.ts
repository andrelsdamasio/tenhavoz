import { describe, expect, it } from "vitest";
import { buildPixBody, pixOutcome } from "./checkout-pix";

const base = {
  accessToken: "t",
  amountCents: 4990,
  description: "Publicação de campanha",
  externalReference: "abc",
  payerEmail: "a@b.com",
  notificationUrl: "https://x/hook",
  idempotencyKey: "k",
  now: Date.UTC(2026, 10, 26, 12, 0, 0),
};

describe("buildPixBody", () => {
  it("converte centavos em reais e define o Pix", () => {
    const b = buildPixBody(base);
    expect(b.transaction_amount).toBe(49.9);
    expect(b.payment_method_id).toBe("pix");
    expect(b.date_of_expiration).toBe("2026-11-26T13:00:00.000+00:00");
  });
  it("inclui a comissão só quando existe", () => {
    expect("application_fee" in buildPixBody(base)).toBe(false);
    expect(buildPixBody({ ...base, applicationFeeCents: 200 }).application_fee).toBe(2);
  });
});

describe("pixOutcome", () => {
  it("traduz os status", () => {
    expect(pixOutcome("approved")).toBe("approved");
    expect(pixOutcome("rejected")).toBe("failed");
    expect(pixOutcome("pending")).toBe("pending");
    expect(pixOutcome(undefined)).toBe("pending");
  });
});
