import { describe, expect, it } from "vitest";
import { creatorNoticeEmail, donorReceiptEmail } from "./donation-emails";

const base = { title: "Viagem a Brasília", slug: "brasilia", amountCents: 5000, siteUrl: "https://x.com.br" };

describe("e-mails de doação", () => {
  it("avisa o criador com progresso e link", () => {
    const e = creatorNoticeEmail({ ...base, donorName: "Ana", message: "Força!", raisedCents: 25000, goalCents: 100000 });
    expect(e.subject).toContain("Nova doação");
    expect(e.text).toContain("25%");
    expect(e.text).toContain("Força!");
    expect(e.text).toContain("https://x.com.br/d/brasilia");
  });
  it("recibo soma a contribuição voluntária", () => {
    const e = donorReceiptEmail({ ...base, donorName: "Ana", tipCents: 500 });
    expect(e.text).toContain("Contribuição voluntária");
    expect(e.text).toMatch(/Total pago: R\$\s?55,00/);
  });
  it("recibo sem contribuição não menciona o TenhaVoz como valor", () => {
    expect(donorReceiptEmail({ ...base, donorName: "Ana", tipCents: 0 }).text).not.toContain("Contribuição voluntária");
  });
});
