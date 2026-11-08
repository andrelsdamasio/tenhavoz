import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/components/ShareButtons", () => ({ default: () => <div>share</div> }));
vi.mock("@/components/DonateForm", () => ({ default: () => <div>form-doar</div> }));

let enabled = true;
let view: unknown;
vi.mock("@/lib/fundraisers", async (orig) => ({
  ...(await orig<typeof import("@/lib/fundraisers")>()),
  isFundraisingEnabled: async () => enabled,
}));
vi.mock("@/lib/fundraiser-public", async (orig) => ({
  ...(await orig<typeof import("@/lib/fundraiser-public")>()),
  loadFundraiserView: async () => view,
}));

import FundraiserPage from "./page";

const base = {
  id: "f1", user_id: "u1", slug: "brasilia", title: "Levar o time a Brasília", summary: "Vamos juntos", story: "Nossa história",
  goal_cents: 500000, ends_at: null, beneficiary_name: null, cover_image_url: null, template_id: 1, theme_color: null,
  status: "active", published_at: null, created_at: "", updated_at: "",
};

beforeEach(() => {
  enabled = true;
  view = {
    fundraiser: base,
    budget: [{ id: "b1", fundraiser_id: "f1", position: 0, label: "Ônibus", amount_cents: 300000 }],
    donations: [{ id: "d1", name: "Ana", amount_cents: 5000, message: "Boa!", created_at: new Date().toISOString() }],
    raisedCents: 125000,
    donationCount: 1,
  };
});

describe("página pública da doação", () => {
  it("mostra meta, progresso, orçamento e doadores", async () => {
    const html = renderToStaticMarkup(await FundraiserPage({ params: { slug: "brasilia" } }));
    expect(html).toContain("Levar o time a Brasília");
    expect(html).toContain("25% da meta");
    expect(html).toContain("Ônibus");
    expect(html).toContain("Ana");
    expect(html).toContain("direto para a conta Mercado Pago");
  });

  it("com o recurso desligado, a página não existe", async () => {
    enabled = false;
    await expect(FundraiserPage({ params: { slug: "brasilia" } })).rejects.toThrow("NOT_FOUND");
  });

  it("rascunho: visitante não vê", async () => {
    view = { ...(view as object), fundraiser: { ...base, status: "draft" } };
    await expect(FundraiserPage({ params: { slug: "brasilia" } })).rejects.toThrow("NOT_FOUND");
  });
});
