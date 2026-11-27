import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getAppSettings } from "@/lib/settings";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { getHealthChecks } from "@/lib/admin-overview";
import { senderDomain } from "@/lib/mailboxes";
import SettingsSection, { settingsInput, StatusPill } from "@/components/SettingsSection";
import AdminSettingsForm from "../admin-settings-form";
import { setAdAction, setFundraisingEnabledAction } from "../actions";

const REPO = "https://github.com/andrelsdamasio/tenhavoz";

const SECTIONS = [
  { id: "precos", label: "Preços" },
  { id: "criacao", label: "Criação" },
  { id: "recursos", label: "Recursos" },
  { id: "anuncio", label: "Anúncio" },
  { id: "emails", label: "E-mails" },
  { id: "integracoes", label: "Integrações" },
  { id: "ferramentas", label: "Ferramentas" },
];

const saveBtn = "rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ anuncio?: string }> }) {
  const { anuncio } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const settings = await getAppSettings(supabase);
  const fundraisingOn = await isFundraisingEnabled(supabase);
  const { data: adRow } = await supabase
    .from("app_settings")
    .select("ad_enabled, ad_advertiser, ad_title, ad_text, ad_url")
    .eq("id", true)
    .maybeSingle();
  const ad = (adRow ?? {}) as { ad_enabled?: boolean; ad_advertiser?: string | null; ad_title?: string | null; ad_text?: string | null; ad_url?: string | null };

  const health = getHealthChecks();
  const okCount = health.filter((h) => h.ok).length;
  const domain = senderDomain(process.env.EMAIL_FROM);
  const emailKeys = health.filter((h) => ["RESEND_API_KEY", "EMAIL_FROM", "RESEND_WEBHOOK_SECRET"].includes(h.key));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="display mb-1 text-4xl sm:text-5xl">Configurações</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Tudo o que controla preço, criação, recursos, anúncio, e-mails e integrações. Mudanças valem para novas campanhas; as já criadas não são afetadas.
      </p>

      <div className="grid gap-6 lg:grid-cols-[11rem_1fr]">
        <nav aria-label="Seções das configurações" className="lg:sticky lg:top-4 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="block rounded-md border-2 border-ink/30 px-3 py-1.5 text-sm font-bold hover:bg-paper-deep lg:border-transparent lg:hover:border-ink/30">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <AdminSettingsForm settings={settings} />

          <SettingsSection
            id="recursos"
            title="Recursos"
            description="Liga e desliga funções para todos os usuários."
            badge={<StatusPill on={fundraisingOn} />}
          >
            <form action={setFundraisingEnabledAction} className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name="enabled" defaultChecked={fundraisingOn} />
                Campanhas de arrecadação (doações) ativas
              </label>
              <p className="text-xs text-ink-soft">
                Desligado, ninguém além do código vê o recurso. Ligue só depois de confirmar o Mercado Pago e testar com contas de teste.
              </p>
              <button type="submit" className={saveBtn}>Salvar recurso</button>
            </form>
          </SettingsSection>

          <SettingsSection
            id="anuncio"
            title="Anúncio"
            description="Anúncio manual (seu, de parceiro ou cortesia): aparece quando não há anúncio pago no ar. Os anúncios vendidos em /anuncie, os preços e a aprovação ficam em Anúncios, no menu."
            badge={<StatusPill on={!!ad.ad_enabled} onLabel="No ar" />}
          >
            <form action={setAdAction} className="space-y-3">
              {anuncio === "ok" && <p role="status" className="rounded-md bg-folha-light p-2 text-sm font-semibold text-folha">Anúncio salvo.</p>}
              {anuncio && anuncio !== "ok" && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800">{anuncio}</p>}
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name="enabled" defaultChecked={!!ad.ad_enabled} />
                Mostrar o anúncio
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Anunciante
                  <input name="advertiser" maxLength={60} defaultValue={ad.ad_advertiser ?? ""} className={settingsInput} />
                </label>
                <label className="block text-sm font-semibold">Título
                  <input name="title" maxLength={80} defaultValue={ad.ad_title ?? ""} className={settingsInput} />
                </label>
              </div>
              <label className="block text-sm font-semibold">Texto
                <textarea name="text" maxLength={200} rows={3} defaultValue={ad.ad_text ?? ""} className={settingsInput} />
              </label>
              <label className="block text-sm font-semibold">Link (começa com https://)
                <input name="url" type="url" maxLength={500} defaultValue={ad.ad_url ?? ""} className={settingsInput} />
              </label>
              <button type="submit" className={saveBtn}>Salvar anúncio</button>
            </form>
          </SettingsSection>

          <SettingsSection
            id="emails"
            title="E-mails"
            description="O recebimento é feito pelo Resend no domínio inteiro: qualquer endereço novo (contato@, suporte@…) já cai na caixa de entrada, sem cPanel."
            badge={<StatusPill on={emailKeys.every((k) => k.ok)} onLabel="Completo" offLabel="Incompleto" />}
          >
            <p className="text-sm">
              Domínio de envio: <strong>{domain ? `@${domain}` : "não configurado (usa remetente de teste)"}</strong>
            </p>
            <ul className="space-y-1 text-sm">
              {emailKeys.map((k) => (
                <li key={k.key} className="flex items-start gap-2">
                  <span aria-hidden="true" className={k.ok ? "text-folha" : "text-brand-600"}>{k.ok ? "●" : "○"}</span>
                  <span>
                    <strong>{k.label}</strong>
                    {!k.ok && <span className="block text-xs text-ink-soft">{k.impact}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/admin/inbox" className="inline-block text-sm font-bold underline underline-offset-4">Abrir a caixa de entrada →</Link>
          </SettingsSection>

          <SettingsSection
            id="integracoes"
            title="Integrações e variáveis"
            description="Só mostra se cada variável existe; nunca expõe os valores. Para mudar, edite na Vercel."
            badge={<span className="text-xs font-extrabold">{okCount}/{health.length} configuradas</span>}
          >
            <ul className="divide-y-2 divide-ink/10">
              {health.map((h) => (
                <li key={h.key} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold">{h.label} {h.critical && <span className="ml-1 rounded bg-sol px-1 text-[10px] font-extrabold uppercase">obrigatória</span>}</p>
                    <p className="font-mono text-xs text-ink-soft">{h.key}</p>
                    {!h.ok && <p className="text-xs text-brand-600">{h.impact}</p>}
                  </div>
                  <StatusPill on={h.ok} onLabel="OK" offLabel="Faltando" />
                </li>
              ))}
            </ul>
          </SettingsSection>

          <SettingsSection id="ferramentas" title="Ferramentas e controle" description="Atalhos para acompanhar código, segurança e hospedagem.">
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                ["Repositório no GitHub", REPO],
                ["Alertas de segurança (Dependabot, CodeQL)", `${REPO}/security`],
                ["Execuções automáticas (Actions)", `${REPO}/actions`],
                ["Pull requests", `${REPO}/pulls`],
                ["Painel do Supabase", "https://supabase.com/dashboard/project/cvmrvhjjdpusdicilphn"],
                ["Painel da Vercel", "https://vercel.com/dashboard"],
              ].map(([label, href]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-md border-2 border-ink/40 px-3 py-2 text-sm font-bold hover:bg-paper-deep">
                    {label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
