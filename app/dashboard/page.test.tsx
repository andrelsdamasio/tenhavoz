import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Campaign } from "@/lib/types";

const listCampaignsForUser = vi.fn();
const reconcileCampaignPayment = vi.fn();
const syncMercadoPagoPaymentById = vi.fn();
const syncStripeSessionById = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
// useFormStatus só existe no React embutido no Next; no Vitest (React 18.3
// comum) não, então os botões de formulário precisam desse stand-in.
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => ({ pending: false }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "a@b.com" } } }) },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/events", () => ({ getCampaignStats: async () => ({}) }));
vi.mock("@/lib/campaigns", () => ({
  listCampaignsForUser: (...a: unknown[]) => listCampaignsForUser(...a),
  isCampaignEditable: () => false,
  deleteCampaign: vi.fn(),
  getCampaignForOwner: vi.fn(),
}));
vi.mock("@/lib/payment-sync", () => ({
  reconcileCampaignPayment: (...a: unknown[]) => reconcileCampaignPayment(...a),
  syncMercadoPagoPaymentById: (...a: unknown[]) => syncMercadoPagoPaymentById(...a),
  syncStripeSessionById: (...a: unknown[]) => syncStripeSessionById(...a),
}));

import DashboardPage from "./page";

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "camp-1",
    user_id: "user-1",
    title: "Minha campanha",
    subtitle: null,
    manifest_text: "texto",
    subject: "assunto",
    recipients: ["a@b.com"],
    send_mode: "bcc",
    drive_link: null,
    template_id: 1,
    theme_color: null,
    slug: "minha-campanha",
    status: "draft",
    duration_hours: 72,
    expires_at: null,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

async function render(params: Record<string, string> = {}) {
  const jsx = await DashboardPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(jsx);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  reconcileCampaignPayment.mockResolvedValue({ published: false, found: 0, errors: [] });
});

describe("dashboard do cliente — liberação de quem pagou", () => {
  it("rascunho que já passou pelo checkout é conferido sozinho; Pix pago libera a página", async () => {
    listCampaignsForUser
      .mockResolvedValueOnce([campaign()])
      .mockResolvedValueOnce([campaign({ status: "published", expires_at: "2099-01-01T00:00:00Z" })]);
    reconcileCampaignPayment.mockResolvedValue({ published: true, found: 1, errors: [] });

    const html = await render();

    expect(reconcileCampaignPayment).toHaveBeenCalledTimes(1);
    expect(listCampaignsForUser).toHaveBeenCalledTimes(2); // relista depois de liberar
    expect(html).toContain("Pagamento confirmado! Sua página já está no ar.");
    expect(html).toContain("Publicada");
    expect(html).not.toContain("Já paguei");
  });

  it("Pix ainda não pago: continua em rascunho e mostra o botão 'Já paguei'", async () => {
    listCampaignsForUser.mockResolvedValue([campaign()]);
    const html = await render();
    expect(reconcileCampaignPayment).toHaveBeenCalledTimes(1);
    expect(listCampaignsForUser).toHaveBeenCalledTimes(1);
    expect(html).toContain("Rascunho");
    expect(html).toContain("Já paguei — verificar pagamento");
    expect(html).not.toContain("Pagamento confirmado!");
  });

  it("rascunho que nunca chegou ao checkout não gera consulta aos provedores", async () => {
    listCampaignsForUser.mockResolvedValue([campaign({ duration_hours: null })]);
    await render();
    expect(reconcileCampaignPayment).not.toHaveBeenCalled();
  });

  it("rascunho antigo demais (mais de 7 dias) não é conferido", async () => {
    listCampaignsForUser.mockResolvedValue([
      campaign({ created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() }),
    ]);
    await render();
    expect(reconcileCampaignPayment).not.toHaveBeenCalled();
  });

  it("confere no máximo 3 campanhas por abertura", async () => {
    listCampaignsForUser.mockResolvedValue(
      [1, 2, 3, 4, 5].map((n) => campaign({ id: `camp-${n}` }))
    );
    await render();
    expect(reconcileCampaignPayment).toHaveBeenCalledTimes(3);
  });

  it("só campanhas publicadas: nenhuma consulta", async () => {
    listCampaignsForUser.mockResolvedValue([campaign({ status: "published" })]);
    await render();
    expect(reconcileCampaignPayment).not.toHaveBeenCalled();
  });

  it("falha do provedor não derruba o dashboard", async () => {
    listCampaignsForUser.mockResolvedValue([campaign()]);
    reconcileCampaignPayment.mockRejectedValue(new Error("MP fora do ar"));
    const html = await render();
    expect(html).toContain("Minha campanha");
  });

  it("volta do Mercado Pago (?checkout=success&payment_id=...) confirma pelo id do pagamento", async () => {
    listCampaignsForUser.mockResolvedValue([campaign({ status: "published" })]);
    syncMercadoPagoPaymentById.mockResolvedValue({
      campaignId: "camp-1",
      paymentStatus: "confirmed",
      published: true,
    });
    const html = await render({ checkout: "success", payment_id: "123456" });
    expect(syncMercadoPagoPaymentById).toHaveBeenCalledWith(expect.anything(), "123456");
    expect(html).toContain("Pagamento confirmado!");
  });

  it("volta do Stripe (?session_id=...) confirma pela sessão", async () => {
    listCampaignsForUser.mockResolvedValue([campaign({ status: "published" })]);
    syncStripeSessionById.mockResolvedValue({
      campaignId: "camp-1",
      paymentStatus: "confirmed",
      published: true,
    });
    await render({ checkout: "success", session_id: "cs_test_abc123" });
    expect(syncStripeSessionById).toHaveBeenCalledWith(expect.anything(), "cs_test_abc123");
  });

  it("voltou do checkout mas o pagamento ainda não confirmou: aviso claro, sem prometer liberação", async () => {
    listCampaignsForUser.mockResolvedValue([campaign()]);
    syncMercadoPagoPaymentById.mockResolvedValue({
      campaignId: "camp-1",
      paymentStatus: "pending",
      published: false,
    });
    const html = await render({ checkout: "pending", payment_id: "123456" });
    expect(html).toContain("ainda não foi");
    expect(html).not.toContain("Pagamento confirmado!");
  });

  it("não chama provedor com ?checkout=success sem id nenhum", async () => {
    listCampaignsForUser.mockResolvedValue([campaign({ duration_hours: null })]);
    await render({ checkout: "success" });
    expect(syncMercadoPagoPaymentById).not.toHaveBeenCalled();
    expect(syncStripeSessionById).not.toHaveBeenCalled();
  });

  it("mensagens do botão 'Já paguei'", async () => {
    listCampaignsForUser.mockResolvedValue([campaign({ duration_hours: null })]);
    expect(await render({ verify: "notfound" })).toContain("Ainda não encontramos um pagamento");
    expect(await render({ verify: "error" })).toContain("Não conseguimos consultar o pagamento");
    expect(await render({ verify: "ok" })).toContain("Pagamento confirmado!");
  });
});
