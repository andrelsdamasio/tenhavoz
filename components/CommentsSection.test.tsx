import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => ({ pending: false }),
  useFormState: (_a: unknown, init: unknown) => [init, () => {}],
}));
vi.mock("@/app/[slug]/comment-actions", () => ({
  postCommentAction: vi.fn(),
  deleteCommentAction: vi.fn(),
  reportCommentAction: vi.fn(),
  toggleLikeAction: vi.fn(),
  editCommentAction: vi.fn(),
}));

import CommentsSection from "./CommentsSection";

const comments = [
  { id: "1", author_name: "Ana", body: "Apoio total!", like_count: 3, parent_id: null, edited_at: null, created_at: "2026-11-08T15:00:00Z" },
  { id: "2", author_name: "Beto", body: "<b>oi</b>", like_count: 0, parent_id: null, edited_at: "2026-11-08T17:00:00Z", created_at: "2026-11-08T16:00:00Z" },
];

describe("CommentsSection", () => {
  it("lista os comentários com autor e total", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={comments} />);
    expect(html).toContain("Comentários");
    expect(html).toContain("(2)");
    expect(html).toContain("Ana");
    expect(html).toContain("Apoio total!");
  });

  it("não interpreta HTML dentro do comentário", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={comments} />);
    expect(html).not.toContain("<b>oi</b>");
    expect(html).toContain("&lt;b&gt;oi&lt;/b&gt;");
  });

  it("mostra o número de curtidas", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={comments} />);
    expect(html).toContain("3 curtidas");
  });

  it("curtir é sempre um botão (nunca um link para o login), mesmo antes de saber a sessão", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={comments} />);
    expect(html).toContain('aria-label="Curtir (3 curtidas)"');
    expect(html).not.toContain('href="/login');
  });

  it("sem comentários: convite para ser o primeiro", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={[]} />);
    expect(html).toContain("Ainda não há comentários");
  });

  it("não mostra o formulário antes de saber se a pessoa está logada", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={[]} />);
    expect(html).not.toContain("<textarea");
  });

  it("mostra 'Editado' só no comentário editado", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={comments} />);
    expect(html.match(/Editado/g)).toHaveLength(1);
  });

  it("agrupa respostas sob o comentário principal, recolhidas", () => {
    const withReplies = [
      ...comments,
      { id: "3", author_name: "Cris", body: "Concordo", like_count: 0, parent_id: "1", edited_at: null, created_at: "2026-11-08T18:00:00Z" },
    ];
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="Cumpra a lei" slug="cumpra" comments={withReplies} />);
    expect(html).toContain("(3)");
    expect(html).toContain("Ver 1 resposta");
  });

  it("cada modelo de página tem seu visual de comentários", () => {
    const a = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="T" slug="s" comments={comments} templateId={1} />);
    const b = renderToStaticMarkup(<CommentsSection campaignId="c1" campaignTitle="T" slug="s" comments={comments} templateId={5} />);
    expect(a).toContain('data-comment-theme="1"');
    expect(b).toContain('data-comment-theme="5"');
    expect(a.replace(/data-comment-theme="\d"/, "")).not.toEqual(b.replace(/data-comment-theme="\d"/, ""));
  });
});
