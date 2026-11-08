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
}));

import CommentsSection from "./CommentsSection";

const comments = [
  { id: "1", author_name: "Ana", body: "Apoio total!", like_count: 3, created_at: "2026-11-08T15:00:00Z" },
  { id: "2", author_name: "Beto", body: "<b>oi</b>", like_count: 0, created_at: "2026-11-08T16:00:00Z" },
];

describe("CommentsSection", () => {
  it("lista os comentários com autor e total", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" slug="cumpra" comments={comments} />);
    expect(html).toContain("Comentários");
    expect(html).toContain("(2)");
    expect(html).toContain("Ana");
    expect(html).toContain("Apoio total!");
  });

  it("não interpreta HTML dentro do comentário", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" slug="cumpra" comments={comments} />);
    expect(html).not.toContain("<b>oi</b>");
    expect(html).toContain("&lt;b&gt;oi&lt;/b&gt;");
  });

  it("mostra o número de curtidas", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" slug="cumpra" comments={comments} />);
    expect(html).toContain("3 curtidas");
  });

  it("curtir é sempre um botão (nunca um link para o login), mesmo antes de saber a sessão", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" slug="cumpra" comments={comments} />);
    expect(html).toContain('aria-label="Curtir (3 curtidas)"');
    expect(html).not.toContain('href="/login');
  });

  it("sem comentários: convite para ser o primeiro", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" slug="cumpra" comments={[]} />);
    expect(html).toContain("Ainda não há comentários");
  });

  it("não mostra o formulário antes de saber se a pessoa está logada", () => {
    const html = renderToStaticMarkup(<CommentsSection campaignId="c1" slug="cumpra" comments={[]} />);
    expect(html).not.toContain("<textarea");
  });
});
