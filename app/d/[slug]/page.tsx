import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled, formatCentsBRL } from "@/lib/fundraisers";
import { daysLeft, loadFundraiserView, progressPercent } from "@/lib/fundraiser-public";
import { deriveThemeShades, themeShadesToCssVars, isValidHexColor } from "@/lib/color";
import { relativeTime } from "@/lib/relative-time";
import ShareButtons from "@/components/ShareButtons";
import DonateForm from "@/components/DonateForm";

// Depende de quem está vendo (rascunho só para o dono) e do total arrecadado.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br";

async function load(slug: string) {
  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) return null;
  const view = await loadFundraiserView(admin, slug);
  if (!view) return null;
  if (view.fundraiser.status === "draft" || view.fundraiser.status === "suspended") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== view.fundraiser.user_id) return null;
    return { view, preview: true };
  }
  return { view, preview: false };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const loaded = await load(params.slug);
  if (!loaded) return { title: "Campanha não encontrada", robots: { index: false } };
  const { fundraiser: f } = loaded.view;
  const description = f.summary || f.story.slice(0, 160);
  return {
    title: `${f.title} — TenhaVoz`,
    description,
    openGraph: { title: f.title, description, type: "website", url: `${SITE_URL}/d/${f.slug}` },
    robots: loaded.preview ? { index: false } : undefined,
  };
}

const STATUS_NOTE: Record<string, string> = {
  draft: "Rascunho — só você vê esta página. Ela ainda não está no ar.",
  suspended: "Campanha suspensa pela moderação.",
  ended: "Esta campanha foi encerrada.",
};

export default async function FundraiserPage({ params }: { params: { slug: string } }) {
  const loaded = await load(params.slug);
  if (!loaded) notFound();
  const { view, preview } = loaded;
  const { fundraiser: f, budget, donations, raisedCents, donationCount } = view;

  const pct = progressPercent(raisedCents, f.goal_cents);
  const left = daysLeft(f.ends_at);
  const budgetTotal = budget.reduce((s, b) => s + b.amount_cents, 0);
  const color = f.theme_color && isValidHexColor(f.theme_color) ? f.theme_color : "#1d4ed8";
  const vars = themeShadesToCssVars(deriveThemeShades(color));
  const canDonate = f.status === "active" && !preview && (left === null || left > 0);
  const url = `${SITE_URL}/d/${f.slug}`;

  return (
    <main style={vars as React.CSSProperties} className="min-h-screen bg-gray-50 pb-16">
      {(preview || f.status !== "active") && (
        <p role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          {STATUS_NOTE[f.status] ?? ""}
        </p>
      )}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{f.title}</h1>
        {f.beneficiary_name && <p className="mt-1 text-sm text-gray-600">Para: {f.beneficiary_name}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {f.summary && <p className="rounded-lg bg-white p-4 text-lg text-gray-800 shadow-sm">{f.summary}</p>}

            <section className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">A história</h2>
              <div className="space-y-3 whitespace-pre-line text-gray-800">{f.story}</div>
            </section>

            {budget.length > 0 && (
              <section className="rounded-lg bg-white p-5 shadow-sm" aria-labelledby="orcamento">
                <h2 id="orcamento" className="mb-1 text-lg font-semibold">Para que será usado</h2>
                <p className="mb-3 text-sm text-gray-600">Previsão de gastos informada por quem criou a campanha.</p>
                <ul className="divide-y divide-gray-100">
                  {budget.map((b) => (
                    <li key={b.id} className="flex justify-between gap-3 py-2 text-sm">
                      <span>{b.label}</span>
                      <span className="shrink-0 font-medium">{formatCentsBRL(b.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold">
                  <span>Total previsto</span>
                  <span>{formatCentsBRL(budgetTotal)}</span>
                </p>
              </section>
            )}

            <section className="rounded-lg bg-white p-5 shadow-sm" aria-labelledby="doadores">
              <h2 id="doadores" className="mb-3 text-lg font-semibold">Quem já ajudou ({donationCount})</h2>
              {donations.length === 0 ? (
                <p className="text-sm text-gray-600">Seja a primeira pessoa a ajudar.</p>
              ) : (
                <ul className="space-y-3">
                  {donations.map((d) => (
                    <li key={d.id} className="text-sm">
                      <p>
                        <span className="font-medium">{d.name}</span> doou{" "}
                        <span className="font-medium">{formatCentsBRL(d.amount_cents)}</span>{" "}
                        <span className="text-gray-500">· {relativeTime(d.created_at, Date.now())}</span>
                      </p>
                      {d.message && <p className="mt-0.5 text-gray-600">“{d.message}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--tc-on-text)" }}>{formatCentsBRL(raisedCents)}</p>
                <p className="text-sm text-gray-600">arrecadados de {formatCentsBRL(f.goal_cents)}</p>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da meta"
                className="h-3 overflow-hidden rounded-full bg-gray-200"
              >
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--tc-base)" }} />
              </div>
              <p className="flex justify-between text-sm text-gray-700">
                <span>{pct}% da meta</span>
                <span>{donationCount} {donationCount === 1 ? "doação" : "doações"}</span>
              </p>
              {left !== null && <p className="text-sm text-gray-700">{left === 0 ? "Prazo encerrado" : `Faltam ${left} ${left === 1 ? "dia" : "dias"}`}</p>}

              {canDonate ? (
                <DonateForm slug={f.slug} />
              ) : (
                <p className="rounded-md bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {preview ? "Doações só abrem depois que a campanha for publicada." : "Esta campanha não está recebendo doações."}
                </p>
              )}
              <p className="text-xs text-gray-500">
                O dinheiro vai direto para a conta Mercado Pago de quem criou a campanha. O TenhaVoz não guarda o valor das doações.
              </p>
              <div className="border-t border-gray-100 pt-3">
                <p className="mb-2 text-sm font-medium">Compartilhe</p>
                <ShareButtons url={url} title={f.title} message={`Ajude esta campanha: "${f.title}".`} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
