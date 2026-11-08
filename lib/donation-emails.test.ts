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

describe("e-mails de encerramento", () => {
  it("doador vê o total e quantas doações", async () => {
    const { closingDonorEmail, closingCreatorEmail } = await import("./donation-emails");
    const d = closingDonorEmail({ ...base, raisedCents: 12345, donationCount: 3 });
    expect(d.subject).toContain("encerrada");
    expect(d.text).toContain("3 doações");
    const c = closingCreatorEmail({ ...base, raisedCents: 50000, goalCents: 100000, donationCount: 1 });
    expect(c.text).toContain("50%");
    expect(c.text).toContain("1 doação");
  });
});

describe("e-mail bonito", () => {
  it("recibo traz a logo, o total e escapa HTML", async () => {
    const { donorReceiptEmail } = await import("./donation-emails");
    const e = donorReceiptEmail({ ...base, title: "A <b>b</b>", donorName: "Ana", tipCents: 0 });
    expect(e.html).toContain("logo-email.png");
    expect(e.html).toContain("Comprovante da sua doação");
    expect(e.html).not.toContain("<b>b</b>");
    expect(e.html).toContain("&lt;b&gt;");
  });
});
