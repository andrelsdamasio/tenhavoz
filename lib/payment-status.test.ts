import { describe, expect, it } from "vitest";
import { describePaymentState } from "./payment-status";

const out = (over = {}) => ({ published: false, found: 0, pending: 0, errors: [] as string[], ...over });
const draft = { status: "draft", duration_hours: 72 };

describe("describePaymentState", () => {
  it("publicada → published", () => {
    expect(describePaymentState({ status: "published", duration_hours: 72 }, null)).toBe("published");
    expect(describePaymentState(draft, out({ published: true }))).toBe("published");
  });
  it("não iniciou o pagamento", () => {
    expect(describePaymentState({ status: "draft", duration_hours: null }, null)).toBe("not_started");
  });
  it("pagamento em análise → pending", () => {
    expect(describePaymentState(draft, out({ found: 1, pending: 1 }))).toBe("pending");
  });
  it("nada encontrado → not_found; provedor fora do ar → unavailable", () => {
    expect(describePaymentState(draft, out())).toBe("not_found");
    expect(describePaymentState(draft, out({ errors: ["mercadopago"] }))).toBe("unavailable");
    expect(describePaymentState(draft, null)).toBe("unavailable");
  });
});
