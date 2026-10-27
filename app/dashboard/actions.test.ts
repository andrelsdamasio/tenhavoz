import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteCampaign = vi.fn();
const reconcile = vi.fn();
let campaign: { id: string; user_id: string; status: string; created_at: string };

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/campaigns", () => ({
  deleteCampaign: (...a: unknown[]) => deleteCampaign(...a),
  getCampaignForOwner: async () => campaign,
}));
vi.mock("@/lib/payment-sync", () => ({
  reconcileCampaignPayment: (...a: unknown[]) => reconcile(...a),
}));

import { deleteCampaignAction } from "./actions";

function form() {
  const f = new FormData();
  f.set("campaignId", "c1");
  return f;
}

async function run() {
  try {
    await deleteCampaignAction(form());
  } catch (e) {
    return (e as Error).message;
  }
  return "";
}

beforeEach(() => {
  vi.clearAllMocks();
  campaign = { id: "c1", user_id: "u1", status: "draft", created_at: new Date().toISOString() };
});

describe("deleteCampaignAction (trava de pagamento)", () => {
  it("pagamento aprovado: libera em vez de apagar", async () => {
    reconcile.mockResolvedValue({ published: true, found: 1, pending: 0, errors: [] });
    expect(await run()).toBe("REDIRECT:/dashboard?verify=ok");
    expect(deleteCampaign).not.toHaveBeenCalled();
  });

  it("Pix em análise: não apaga", async () => {
    reconcile.mockResolvedValue({ published: false, found: 1, pending: 1, errors: [] });
    expect(await run()).toBe("REDIRECT:/dashboard?verify=pending");
    expect(deleteCampaign).not.toHaveBeenCalled();
  });

  it("provedor fora do ar: adia a exclusão", async () => {
    reconcile.mockResolvedValue({ published: false, found: 0, pending: 0, errors: ["mp: fora"] });
    expect(await run()).toBe("REDIRECT:/dashboard?verify=pending");
    expect(deleteCampaign).not.toHaveBeenCalled();
  });

  it("sem pagamento algum: apaga normalmente", async () => {
    reconcile.mockResolvedValue({ published: false, found: 0, pending: 0, errors: [] });
    expect(await run()).toBe("REDIRECT:/dashboard");
    expect(deleteCampaign).toHaveBeenCalled();
  });

  it("campanha já publicada: apaga sem consultar provedor", async () => {
    campaign.status = "published";
    expect(await run()).toBe("REDIRECT:/dashboard");
    expect(reconcile).not.toHaveBeenCalled();
    expect(deleteCampaign).toHaveBeenCalled();
  });
});
