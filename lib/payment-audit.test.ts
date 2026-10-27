import { describe, expect, it } from "vitest";
import { classify, isFromSite } from "@/lib/payment-audit";

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

describe("isFromSite (ignora outros usos da conta)", () => {
  it("referência de campanha, webhook ou título do item contam como do site", () => {
    expect(isFromSite({ external_reference: "123e4567-e89b-12d3-a456-426614174000" })).toBe(true);
    expect(isFromSite({ notification_url: "https://x.com.br/api/webhooks/mercadopago" })).toBe(true);
    expect(isFromSite({ description: "Publicação de campanha — TenhaVoz" })).toBe(true);
  });
  it("pagamento sem nada do site (outra venda da conta) é ignorado", () => {
    expect(isFromSite({ description: "Venda maquininha", transaction_amount: 1204.6 })).toBe(false);
    expect(isFromSite({})).toBe(false);
  });
});
