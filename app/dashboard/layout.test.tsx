import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { email: "maria@exemplo.com" } } }) },
  }),
}));
vi.mock("../(auth)/actions", () => ({ signOut: async () => {} }));

import DashboardLayout from "./layout";

describe("layout do dashboard", () => {
  it("mostra o botão de WhatsApp com o e-mail da conta, ao lado do suporte por e-mail", async () => {
    const jsx = await DashboardLayout({ children: <p>conteúdo</p> });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("conteúdo");
    expect(html).toContain("Suporte no WhatsApp");
    expect(html).toContain("https://wa.me/5562993101355?text=");
    expect(decodeURIComponent(html)).toContain("Minha conta: maria@exemplo.com");
    expect(html).toContain("mailto:"); // o suporte por e-mail continua
  });
});
