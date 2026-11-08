import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/minha-campanha?x=1#comentarios")).toBe("/minha-campanha?x=1#comentarios");
  });
  it("recusa tudo que sai do site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "@evil.com", "evil.com", "javascript:alert(1)", "/a\nb"]) {
      expect(safeRedirectPath(bad)).toBe("/dashboard");
    }
  });
  it("vazio usa o padrão", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath("", "/x")).toBe("/x");
  });
});
