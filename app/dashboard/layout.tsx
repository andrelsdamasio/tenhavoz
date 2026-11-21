import Link from "next/link";
import { signOut } from "../(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, getSupportEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import Logo from "@/components/Logo";
import WhatsNew from "@/components/WhatsNew";
import { entriesFor } from "@/lib/whats-new";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import MobileMenu from "@/components/MobileMenu";
import { MOBILE_ITEM } from "@/components/mobile-menu-styles";

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
  const showDonations = await isFundraisingEnabled(createAdminClient());

  return (
    <div className="tv-app min-h-screen">
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-ink" />
            <span className="display text-2xl">TenhaVoz</span>
          </Link>
          <nav aria-label="Menu principal" className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold leading-6 md:flex">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">
              Minhas campanhas
            </Link>
            {showDonations && (
              <Link href="/dashboard/doacoes" className="underline-offset-4 hover:underline">
                Arrecadações
              </Link>
            )}
            <Link href="/dashboard/new" className="underline-offset-4 hover:underline">
              Nova campanha
            </Link>
            {showAdminLink && (
              <Link href="/admin" className="underline-offset-4 hover:underline">
                Admin
              </Link>
            )}
            <WhatsNew entries={entriesFor(showAdminLink)} />
            <a href={buildSupportMailto(user?.email)} className="underline-offset-4 hover:underline">
              Suporte
            </a>
            <form action={signOut}>
              <button type="submit" className="text-ink-soft underline-offset-4 hover:underline">
                Sair
              </button>
            </form>
          </nav>
          <MobileMenu>
            <Link href="/dashboard" className={MOBILE_ITEM}>
              Minhas campanhas
            </Link>
            {showDonations && (
              <Link href="/dashboard/doacoes" className={MOBILE_ITEM}>
                Arrecadações
              </Link>
            )}
            <Link href="/dashboard/new" className={MOBILE_ITEM}>
              Nova campanha
            </Link>
            {showAdminLink && (
              <Link href="/admin" className={MOBILE_ITEM}>
                Admin
              </Link>
            )}
            <WhatsNew entries={entriesFor(showAdminLink)} buttonClassName={`relative ${MOBILE_ITEM}`} />
            <a href={buildSupportMailto(user?.email)} className={MOBILE_ITEM}>
              Suporte
            </a>
            <form action={signOut} className="mt-3 border-t-2 border-ink pt-3">
              <button type="submit" className={`${MOBILE_ITEM} text-ink-soft`}>
                Sair
              </button>
            </form>
          </MobileMenu>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
      <WhatsAppSupportButton userEmail={user?.email} />
    </div>
  );
}
