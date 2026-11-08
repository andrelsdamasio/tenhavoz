import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublished = vi.fn();
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({}) }));
vi.mock("@/lib/campaigns", () => ({
  getPublishedCampaignBySlug: (...a: unknown[]) => getPublished(...a),
  isCampaignExpired: () => false,
}));
vi.mock("@/components/ViewTracker", () => ({ default: () => null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const listComments = vi.fn();
vi.mock("@/lib/comments", () => ({ listComments: (...a: unknown[]) => listComments(...a) }));
vi.mock("@/components/CommentsSection", () => ({
  default: ({ comments }: { comments: { body: string }[] }) => `COMENTARIOS:${comments.map((c) => c.body).join("|")}`,
}));

import Page from "./page";

const base = {
  id: "c1", title: "Cumpra a lei", subtitle: null, manifest_text: "Texto", subject: "Assunto",
  send_mode: "bcc", drive_link: null, template_id: 1, theme_color: null, slug: "cumpra",
  status: "published", expires_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  listComments.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("página pública: destinatários inválidos", () => {
  it("um endereço inválido salvo NÃO entra no link: o envio funciona para os demais", async () => {
    getPublished.mockResolvedValue({
      ...base,
      recipients: ["educacao.educacao@goiania.go.gov.b", "gabinete@goiania.go.gov.br"],
    });
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "cumpra" }) }));
    expect(html).toContain("mailto:?bcc=gabinete@goiania.go.gov.br&amp;");
    expect(html).not.toContain("gov.b,");
    expect(html).not.toContain("gov.b&");
    expect(html).not.toContain("goiania.go.gov.b<");
  });

  it("todos válidos: link com todos", async () => {
    getPublished.mockResolvedValue({ ...base, recipients: ["a@x.gov.br", "b@y.com"] });
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "cumpra" }) }));
    expect(html).toContain("bcc=a@x.gov.br,b@y.com");
  });
});

describe("página pública: comentários", () => {
  it("mostra os comentários da campanha", async () => {
    getPublished.mockResolvedValue({ ...base, recipients: ["a@x.gov.br"] });
    listComments.mockResolvedValue([{ id: "1", author_name: "Ana", body: "Apoio!", created_at: "2026-11-08T12:00:00Z" }]);
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "cumpra" }) }));
    expect(html).toContain("COMENTARIOS:Apoio!");
  });

  it("falha ao carregar comentários não derruba a página nem o botão de envio", async () => {
    getPublished.mockResolvedValue({ ...base, recipients: ["a@x.gov.br"] });
    listComments.mockRejectedValue(new Error("banco fora"));
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "cumpra" }) }));
    expect(html).toContain("mailto:?bcc=a@x.gov.br");
    expect(html).toContain("COMENTARIOS:");
  });
});
