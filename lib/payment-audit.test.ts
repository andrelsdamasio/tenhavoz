import { describe, expect, it } from "vitest";
import { classify } from "@/lib/payment-audit";

const campaigns = new Map([
  ["pub", { title: "No ar", status: "published" }],
  ["draft", { title: "Rascunho", status: "draft" }],
]);

describe("classify (conciliação)", () => {
  it("campanha publicada → ok", () => {
    expect(classify({ id: 1, external_reference: "pub" }, campaigns).status).toBe("ok");
  });
  it("campanha existe mas não publicada → liberar", () => {
    expect(classify({ id: 2, external_reference: "draft" }, campaigns).status).toBe("release");
  });
  it("campanha apagada → alerta", () => {
    expect(classify({ id: 3, external_reference: "sumiu" }, campaigns).status).toBe("campaign_deleted");
  });
  it("sem referência → fora do checkout", () => {
    expect(classify({ id: 4 }, campaigns).status).toBe("no_reference");
  });
});
