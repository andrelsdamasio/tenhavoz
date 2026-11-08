import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const insertLike = vi.fn();
const deleteLike = vi.fn();
let comment: Record<string, unknown> | null;
let campaign: Record<string, unknown> | null;
let existingLike: Record<string, unknown> | null;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: () => false }));
vi.mock("@/lib/campaigns", () => ({
  isCampaignExpired: (c: { expires_at: string | null }) => !!c.expires_at && new Date(c.expires_at) < new Date(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "comment_likes") {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existingLike }) }) }) }),
          insert: (row: unknown) => insertLike(row),
          delete: () => ({ eq: () => ({ eq: () => deleteLike() }) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: table === "campaigns" ? campaign : comment }) }),
        }),
      };
    },
  }),
}));

import { toggleLikeAction } from "./comment-actions";

const ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@x.com" } } });
  comment = { id: ID, user_id: "outra-pessoa", campaign_id: "c1" };
  campaign = { slug: "cumpra", status: "published", expires_at: null };
  existingLike = null;
  insertLike.mockResolvedValue({ error: null });
  deleteLike.mockResolvedValue({ error: null });
});

describe("toggleLikeAction", () => {
  it("curte quando ainda não curtiu", async () => {
    expect(await toggleLikeAction(ID)).toEqual({ ok: true, liked: true });
    expect(insertLike).toHaveBeenCalledWith({ comment_id: ID, user_id: "u1" });
  });

  it("descurte quando já curtiu", async () => {
    existingLike = { comment_id: ID };
    expect(await toggleLikeAction(ID)).toEqual({ ok: true, liked: false });
    expect(deleteLike).toHaveBeenCalledTimes(1);
    expect(insertLike).not.toHaveBeenCalled();
  });

  it("clique duplo (curtida já existe no banco) não dá erro", async () => {
    insertLike.mockResolvedValue({ error: { code: "23505" } });
    expect(await toggleLikeAction(ID)).toEqual({ ok: true, liked: true });
  });

  it("sem login: pede para entrar", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await toggleLikeAction(ID);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Entre");
    expect(insertLike).not.toHaveBeenCalled();
  });

  it("não curte o próprio comentário", async () => {
    comment = { ...comment, user_id: "u1" };
    const r = await toggleLikeAction(ID);
    expect(r.ok).toBe(false);
    expect(insertLike).not.toHaveBeenCalled();
  });

  it("campanha fora do ar: não curte", async () => {
    campaign = { slug: "cumpra", status: "published", expires_at: "2020-01-01T00:00:00Z" };
    expect((await toggleLikeAction(ID)).ok).toBe(false);
    expect(insertLike).not.toHaveBeenCalled();
  });

  it("id inválido ou comentário inexistente", async () => {
    expect((await toggleLikeAction("abc")).ok).toBe(false);
    comment = null;
    expect((await toggleLikeAction(ID)).ok).toBe(false);
  });

  it("erro do banco: mensagem amigável", async () => {
    insertLike.mockResolvedValue({ error: { code: "XX000" } });
    const r = await toggleLikeAction(ID);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Não foi possível");
  });
});
