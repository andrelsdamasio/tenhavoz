import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const insert = vi.fn();
const del = vi.fn();
const update = vi.fn();
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
      update: (row: unknown) => ({ eq: async () => update(row) }),
    }),
  }),
}));

import { deleteCommentAction, editCommentAction, postCommentAction } from "./comment-actions";

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
  update.mockResolvedValue({ error: null });
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

const K1 = "11111111-1111-4111-8111-111111111111";

describe("respostas", () => {
  it("responde a um comentário da mesma campanha", async () => {
    commentRow = { id: K1, campaign_id: "c1", parent_id: null };
    const r = await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "Concordo", parentId: K1 }));
    expect(r.posted).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ parent_id: K1 }));
  });

  it("responder a uma resposta vira resposta ao comentário principal", async () => {
    commentRow = { id: "r1", campaign_id: "c1", parent_id: K1 };
    await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "Concordo", parentId: "r1" }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ parent_id: K1 }));
  });

  it("recusa resposta a comentário de outra campanha", async () => {
    commentRow = { id: K1, campaign_id: "outra", parent_id: null };
    const r = await postCommentAction({ error: null, posted: false }, form({ campaignId: "c1", body: "Concordo", parentId: K1 }));
    expect(r.error).toContain("não existe");
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("editCommentAction", () => {
  beforeEach(() => {
    commentRow = { id: K1, user_id: "u1", campaign_id: "c1", body: "antigo" };
  });

  it("o autor edita e o comentário recebe edited_at", async () => {
    const r = await editCommentAction(K1, "texto novo");
    expect(r).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ body: "texto novo", edited_at: expect.any(String) }));
  });

  it("sem login: pede para entrar", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await editCommentAction(K1, "texto novo");
    expect(r).toMatchObject({ ok: false, needsLogin: true });
    expect(update).not.toHaveBeenCalled();
  });

  it("outra pessoa (nem o dono da campanha) não edita", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "owner", email: "d@x.com" } } });
    const r = await editCommentAction(K1, "texto novo");
    expect(r.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("recusa links e id inválido", async () => {
    expect((await editCommentAction(K1, "veja https://x.com")).ok).toBe(false);
    expect((await editCommentAction("abc", "texto novo")).ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("texto igual ao atual não grava nada", async () => {
    commentRow = { id: K1, user_id: "u1", campaign_id: "c1", body: "igual" };
    expect(await editCommentAction(K1, "igual")).toEqual({ ok: true });
    expect(update).not.toHaveBeenCalled();
  });
});
