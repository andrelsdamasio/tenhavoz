import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const insert = vi.fn();
const del = vi.fn();
const countRecent = vi.fn();
let campaignRow: Record<string, unknown> | null;
let commentRow: Record<string, unknown> | null;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: (e?: string | null) => e === "admin@x.com" }));
vi.mock("@/lib/campaigns", () => ({ isCampaignExpired: (c: { expires_at: string | null }) => !!c.expires_at && new Date(c.expires_at) < new Date() }));
vi.mock("@/lib/comments", async (orig) => ({
  ...(await orig<typeof import("@/lib/comments")>()),
  countRecentComments: (...a: unknown[]) => countRecent(...a),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: table === "campaigns" ? campaignRow : commentRow }) }),
      }),
      insert: (row: unknown) => insert(row),
      delete: () => ({ eq: () => del() }),
    }),
  }),
}));

import { deleteCommentAction, postCommentAction } from "./comment-actions";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  Object.entries(o).forEach(([k, v]) => f.set(k, v));
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1", email: "maria.silva@x.com", user_metadata: {} } } });
  insert.mockResolvedValue({ error: null });
  del.mockResolvedValue({ error: null });
  countRecent.mockResolvedValue(0);
  campaignRow = { id: "c1", slug: "cumpra", status: "published", expires_at: null, user_id: "owner" };
  commentRow = { id: "k1", user_id: "u1", campaign_id: "c1" };
});

describe("postCommentAction", () => {
  it("sem login: pede para entrar", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "Apoio" }));
    expect(r.error).toContain("Entre");
    expect(insert).not.toHaveBeenCalled();
  });

  it("publica com o primeiro nome, sem expor o e-mail", async () => {
    const r = await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "Apoio total!" }));
    expect(r).toEqual({ error: null, posted: true });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ author_name: "Maria", body: "Apoio total!", user_id: "u1" }));
  });

  it("recusa links", async () => {
    const r = await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "veja https://x.com" }));
    expect(r.error).toContain("Links");
    expect(insert).not.toHaveBeenCalled();
  });

  it("limite de comentários seguidos", async () => {
    countRecent.mockResolvedValue(5);
    const r = await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "mais um" }));
    expect(r.error).toContain("várias vezes");
    expect(insert).not.toHaveBeenCalled();
  });

  it("campanha rascunho ou encerrada não aceita comentário", async () => {
    campaignRow = { ...campaignRow, status: "draft" };
    expect((await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "oi aí" }))).error).toContain("não aceita");
    campaignRow = { id: "c1", slug: "cumpra", status: "published", expires_at: "2020-01-01T00:00:00Z" };
    expect((await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "oi aí" }))).error).toContain("não aceita");
  });

  it("erro do banco: mensagem amigável", async () => {
    insert.mockResolvedValue({ error: new Error("x") });
    const r = await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "oi aí" }));
    expect(r.posted).toBe(false);
    expect(r.error).toContain("Não foi possível");
  });
});

describe("deleteCommentAction", () => {
  it("o autor apaga o próprio comentário", async () => {
    await deleteCommentAction(form({ commentId: "k1" }));
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("o dono da campanha apaga comentário de outra pessoa", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "owner", email: "d@x.com" } } });
    await deleteCommentAction(form({ commentId: "k1" }));
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("o admin apaga qualquer um", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "z", email: "admin@x.com" } } });
    await deleteCommentAction(form({ commentId: "k1" }));
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("um terceiro não consegue apagar", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "intruso", email: "i@x.com" } } });
    await deleteCommentAction(form({ commentId: "k1" }));
    expect(del).not.toHaveBeenCalled();
  });

  it("sem login: nada acontece", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await deleteCommentAction(form({ commentId: "k1" }));
    expect(del).not.toHaveBeenCalled();
  });
});
