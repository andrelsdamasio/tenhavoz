import { beforeEach, describe, expect, it, vi } from "vitest";

const createDraftCampaign = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@/lib/campaigns", () => ({ createDraftCampaign: (...a: unknown[]) => createDraftCampaign(...a) }));
vi.mock("@/lib/settings", () => ({
  getAppSettings: async () => ({
    manifest_char_limit: 2100,
    manifest_char_limit_enabled: false,
    enabled_templates: [1, 2, 3],
  }),
}));

import { createCampaignAction } from "./actions";

function form(recipients: string) {
  const f = new FormData();
  f.set("title", "Cumpra a lei");
  f.set("subject", "Assunto");
  f.set("manifestText", "Texto do manifesto");
  f.set("recipients", recipients);
  f.set("templateId", "1");
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  createDraftCampaign.mockResolvedValue({ id: "novo" });
});

describe("createCampaignAction: destinatários", () => {
  it("recusa e-mail com final truncado (.gov.b) e nada é salvo", async () => {
    const r = await createCampaignAction(
      { error: null },
      form("educacao.educacao@goiania.go.gov.b, gabinete@goiania.go.gov.br")
    );
    expect(r.error).toContain("educacao.educacao@goiania.go.gov.b");
    expect(r.error).toContain("faltou letra");
    expect(createDraftCampaign).not.toHaveBeenCalled();
  });

  it("lista de endereços válidos é salva normalmente", async () => {
    await expect(
      createCampaignAction({ error: null }, form("a@goiania.go.gov.br\nb@gmail.com"))
    ).rejects.toThrow(/REDIRECT:/);
    expect(createDraftCampaign).toHaveBeenCalledTimes(1);
  });
});
