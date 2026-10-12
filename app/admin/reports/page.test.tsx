import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildOverview,
  classifyCampaign,
  type CampaignLite,
  type PaymentLite,
} from "@/lib/admin-dashboard";

const NOW = new Date();
const HOUR = 60 * 60 * 1000;

function campaign(id: string, overrides: Partial<CampaignLite> = {}): CampaignLite {
  return {
    id,
    user_id: `user-${id}`,
    title: `Campanha ${id}`,
    slug: `slug-${id}`,
    status: "published",
    created_at: new Date(NOW.getTime() - 24 * HOUR).toISOString(),
    expires_at: new Date(NOW.getTime() + 100 * HOUR).toISOString(),
    duration_hours: 168,
    ...overrides,
  };
}

const payments: PaymentLite[] = [
  { campaign_id: "pago", status: "confirmed", amount: 79.9, created_at: NOW.toISOString() },
];

const campaigns = [
  classifyCampaign(campaign("pago"), payments, NOW),
  classifyCampaign(campaign("gratis"), [], NOW),
  classifyCampaign(
    campaign("vencida", { expires_at: new Date(NOW.getTime() - HOUR).toISOString() }),
    [],
    NOW
  ),
  classifyCampaign(campaign("rascunho", { status: "draft", expires_at: null, slug: null }), [], NOW),
  classifyCampaign(
    campaign("encerrando", { expires_at: new Date(NOW.getTime() + 5 * HOUR).toISOString() }),
    payments,
    NOW
  ),
];

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { email: "admin@x.com" } } }) },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: (email: string) => email === "admin@x.com" }));

vi.mock("@/lib/reports", () => ({
  getSalesReport: async () => ({
    rows: [
      { period: "2026-10", revenue: 159.8, paymentCount: 2, refunded: 0, refundCount: 0 },
      { period: "2026-09", revenue: 79.9, paymentCount: 1, refunded: 79.9, refundCount: 1 },
    ],
    summary: {
      totalRevenue: 239.7,
      totalRefunded: 79.9,
      netRevenue: 159.8,
      totalPayments: 3,
      totalRefunds: 1,
    },
  }),
}));

vi.mock("@/lib/admin-dashboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-dashboard")>();
  return {
    ...actual,
    getAdminDashboard: async () => ({
      campaigns,
      overview: actual.buildOverview(campaigns, payments),
      totals: { views: 200, clicks: 50 },
    }),
    getRowDetails: async (_admin: unknown, rows: { id: string }[]) =>
      Object.fromEntries(
        rows.map((r) => [r.id, { ownerEmail: `dono-${r.id}@x.com`, views: 10, clicks: 2 }])
      ),
  };
});

import ReportsPage from "./page";

async function render(params: Record<string, string> = {}) {
  const jsx = await ReportsPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(jsx);
}

describe("página /admin/reports", () => {
  it("mostra os cartões do dashboard com os números certos", async () => {
    const html = await render();
    expect(html).toContain("Páginas criadas");
    expect(html).toContain("No ar agora");
    expect(html).toContain("Vencidas");
    expect(html).toContain("Rascunhos (sem pagar)");
    expect(html).toContain("200 / 50");
    expect(html).toContain("25%"); // 50 cliques / 200 visitas
    expect(html).toContain("80%"); // 4 de 5 publicadas
  });

  it("lista todas as campanhas, com o dono e a classificação", async () => {
    const html = await render();
    for (const name of ["pago", "gratis", "vencida", "rascunho", "encerrando"]) {
      expect(html).toContain(`Campanha ${name}`);
      expect(html).toContain(`dono-${name}@x.com`);
    }
    expect(html).toContain("Grátis");
    expect(html).toContain("Paga");
    expect(html).toContain("Rascunho");
    expect(html).toContain("Venceu em");
    expect(html).toContain("Encerrando");
  });

  it("o filtro 'vencidas' mostra só as vencidas", async () => {
    const html = await render({ filter: "expired" });
    expect(html).toContain("Campanha vencida");
    expect(html).not.toContain("Campanha pago");
    expect(html).not.toContain("Campanha rascunho");
  });

  it("o filtro 'free' mostra só as grátis (a vencida sem pagamento também é grátis)", async () => {
    const html = await render({ filter: "free" });
    expect(html).toContain("Campanha gratis");
    expect(html).toContain("Campanha vencida");
    expect(html).not.toContain("Campanha pago");
  });

  it("filtro inválido volta para 'todas'", async () => {
    const html = await render({ filter: "xyz" });
    expect(html).toContain("Campanha pago");
    expect(html).toContain("Campanha rascunho");
  });

  it("página fora do intervalo não quebra", async () => {
    const html = await render({ page: "999" });
    expect(html).toContain("Campanha pago");
    const html2 = await render({ page: "abc" });
    expect(html2).toContain("Campanha pago");
  });

  it("mantém o relatório de vendas por período", async () => {
    const html = await render();
    expect(html).toContain("Receita líquida");
    expect(html).toContain("Valor reembolsado");
  });

  it("quem não é admin é redirecionado", async () => {
    vi.doMock("@/lib/admin", () => ({ isAdminEmail: () => false }));
    vi.resetModules();
    const { default: Page } = await import("./page");
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/dashboard");
  });
});
