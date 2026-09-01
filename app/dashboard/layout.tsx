import Link from "next/link";
import { signOut } from "../(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, getSupportEmail } from "@/lib/admin";
import Logo from "@/components/Logo";

function buildSupportMailto(userEmail: string | undefined): string {
  const supportEmail = getSupportEmail();
  const subject = "Suporte TenhaVoz";
  const body = `Olá! Preciso de ajuda com a minha conta (${userEmail ?? "e-mail não identificado"}).\n\nDescreva aqui o que está acontecendo:\n`;
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const showAdminLink = isAdminEmail(user?.email);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Logo className="h-5 w-5 text-brand-600" />
            TenhaVoz
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Minhas campanhas
            </Link>
            <Link href="/dashboard/new" className="hover:underline">
              Nova campanha
            </Link>
            {showAdminLink && (
              <Link href="/admin" className="hover:underline">
                Admin
              </Link>
            )}
            <a href={buildSupportMailto(user?.email)} className="hover:underline">
              Suporte
            </a>
            <form action={signOut}>
              <button type="submit" className="text-gray-500 hover:underline">
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
