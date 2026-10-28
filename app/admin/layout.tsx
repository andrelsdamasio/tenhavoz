import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import Logo from "@/components/Logo";
import AdminNav, { type AdminNavItem } from "@/components/AdminNav";

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

  const items: AdminNavItem[] = [
    { href: "/admin", label: "Visão geral", hint: "Alertas e resumo do dia" },
    { href: "/admin/reports", label: "Campanhas e vendas", hint: "Páginas, pagamentos e conciliação" },
    { href: "/admin/inbox", label: "Caixa de entrada", hint: "Ler e responder e-mails", badge: unread },
    { href: "/admin/coupons", label: "Cupons", hint: "Descontos e compensações" },
    { href: "/admin/settings", label: "Configurações", hint: "Preço e templates" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Logo className="h-5 w-5 text-brand-600" />
            TenhaVoz <span className="rounded bg-gray-900 px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:underline">
            ← Voltar para minhas campanhas
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[14rem_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <AdminNav items={items} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
