import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { countReportedComments } from "@/lib/comments";
import WhatsNew from "@/components/WhatsNew";
import { entriesFor } from "@/lib/whats-new";
import Logo from "@/components/Logo";
import AdminNav, { type AdminNavItem } from "@/components/AdminNav";
import MobileMenu from "@/components/MobileMenu";
import { MOBILE_ITEM } from "@/components/mobile-menu-styles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  // Selo de não lidos no menu. Se falhar, o menu aparece sem o selo.
  let unread = 0;
  try {
    const { count } = await createAdminClient()
      .from("inbox_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "in")
      .is("read_at", null);
    unread = count ?? 0;
  } catch {
    unread = 0;
  }

  // Selo de comentários denunciados. Se falhar, o menu aparece sem o selo.
  let reportedComments = 0;
  try {
    reportedComments = await countReportedComments(createAdminClient());
  } catch {
    reportedComments = 0;
  }

  const items: AdminNavItem[] = [
    { group: "Operação", href: "/admin", label: "Visão geral", hint: "Alertas e resumo do dia" },
    { group: "Operação", href: "/admin/inbox", label: "Caixa de entrada", hint: "Ler e responder e-mails", badge: unread },
    { group: "Operação", href: "/admin/comments", label: "Comentários", hint: "Denúncias nas campanhas", badge: reportedComments },
    { group: "Dinheiro", href: "/admin/reports", label: "Campanhas e vendas", hint: "Páginas, pagamentos e conciliação" },
    { group: "Dinheiro", href: "/admin/arrecadacoes", label: "Arrecadações", hint: "Doações, taxa e moderação" },
    { group: "Dinheiro", href: "/admin/coupons", label: "Cupons", hint: "Descontos e compensações" },
    { group: "Sistema", href: "/admin/settings", label: "Configurações", hint: "Preço e templates" },
  ];


  return (
    <div className="tv-app min-h-screen bg-paper">
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="TenhaVoz, página inicial" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-ink" />
            <span className="display text-2xl">TenhaVoz</span>
            <span className="rounded bg-sol px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-ink">Admin</span>
          </Link>
          <div className="hidden items-center gap-4 text-sm font-semibold leading-6 text-ink md:flex">
            <WhatsNew entries={entriesFor(true)} />
            <Link href="/dashboard" className="underline-offset-4 hover:underline">
              ← Voltar para minhas campanhas
            </Link>
          </div>
          <MobileMenu title="Admin">
            <AdminNav items={items} vertical />
            <div className="mt-3 flex flex-col gap-1 border-t-2 border-ink pt-3">
              <WhatsNew entries={entriesFor(true)} buttonClassName={`relative ${MOBILE_ITEM}`} />
              <Link href="/dashboard" className={MOBILE_ITEM}>
                ← Voltar para minhas campanhas
              </Link>
            </div>
          </MobileMenu>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[14rem_1fr]">
        <aside className="hidden md:sticky md:top-6 md:block md:self-start">
          <AdminNav items={items} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
