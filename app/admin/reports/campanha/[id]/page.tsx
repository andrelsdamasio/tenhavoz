import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { listAdminActions } from "@/lib/admin-audit";
import { getCampaignStats } from "@/lib/events";
import { describeExpiry, clickRate } from "@/lib/campaign-stats";
import FlashMessage from "@/components/FlashMessage";
import { extendDeadlineAction, updateRecipientsAction } from "./actions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ACTION_LABEL: Record<string, string> = {
  extend_deadline: "Prazo estendido",
  update_recipients: "Destinatários alterados",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}

export default async function AdminCampaignPage({ params, searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const { id } = await params;
  const { ok, erro } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: campaign } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) notFound();

  const [owner, stats, payments, history] = await Promise.all([
    admin.auth.admin.getUserById(campaign.user_id).catch(() => null),
    getCampaignStats(admin, [id]).catch(() => ({}) as Record<string, { views: number; clicks: number }>),
    admin
      .from("payments")
      .select("id, provider, status, amount, created_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    listAdminActions(admin, id),
  ]);
  const ownerEmail = owner?.data?.user?.email ?? null;
  const views = stats[id]?.views ?? 0;
  const clicks = stats[id]?.clicks ?? 0;
  const expiry = describeExpiry(campaign.expires_at);
  const canExtend = campaign.status !== "draft";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/reports" className="text-sm text-brand-600 hover:underline">
        ← Campanhas e vendas
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">{campaign.title}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {campaign.status === "published" && campaign.slug ? (
          <Link href={`/${campaign.slug}`} target="_blank" className="text-brand-600 hover:underline">
            /{campaign.slug} ↗
          </Link>
        ) : (
          <span>{campaign.slug ? `/${campaign.slug}` : "sem link ainda"}</span>
        )}
        {" · "}
        {campaign.status === "published" ? "Publicada" : campaign.status === "paid" ? "Paga (publicando)" : "Rascunho"}
        {expiry && ` · ${expiry.label}`}
      </p>

      {ok && <FlashMessage tone="success" autoHideMs={8000} clearParams={["ok"]}>{ok}</FlashMessage>}
      {erro && <FlashMessage tone="error" clearParams={["erro"]}>{erro}</FlashMessage>}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Dono</p>
          <p className="break-all text-sm font-medium">{ownerEmail ?? "—"}</p>
          {ownerEmail && (
            <p className="mt-1 text-xs">
              <a href={`mailto:${ownerEmail}`} className="text-brand-600 hover:underline">
                Escrever
              </a>
              {" · "}
              <Link href="/admin/inbox" className="text-brand-600 hover:underline">
                Caixa de entrada
              </Link>
            </p>
          )}
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Visitas / cliques</p>
          <p className="text-sm font-medium">
            {views} / {clicks} ({clickRate(views, clicks).toLocaleString("pt-BR")}%)
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Criada em</p>
          <p className="text-sm font-medium">{when(campaign.created_at)}</p>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Prazo</h2>
        {canExtend ? (
          <form action={extendDeadlineAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="campaignId" value={id} />
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                type="submit"
                name="days"
                value={d}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              >
                +{d} dia{d > 1 ? "s" : ""}
              </button>
            ))}
            <span className="text-xs text-gray-500">
              Se já encerrou, volta ao ar a partir de agora. O cliente é avisado de novo antes de acabar.
            </span>
          </form>
        ) : (
          <p className="text-sm text-gray-600">Rascunho: ainda não foi pago, não há prazo para estender.</p>
        )}
      </section>

      <section className="mb-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Destinatários</h2>
        <form action={updateRecipientsAction} className="flex flex-col gap-2">
          <input type="hidden" name="campaignId" value={id} />
          <label htmlFor="recipients" className="sr-only">
            E-mails de destino
          </label>
          <textarea
            id="recipients"
            name="recipients"
            rows={4}
            defaultValue={campaign.recipients.join(", ")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div>
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Salvar destinatários
            </button>
          </div>
        </form>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Pagamentos</h2>
        {(payments.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white text-sm">
            {(payments.data ?? []).map((p) => (
              <li key={p.id} className="flex justify-between gap-3 p-3">
                <span>
                  {when(p.created_at)} · {p.provider === "mercadopago" ? "Mercado Pago" : "Stripe"}
                </span>
                <span>
                  {brl(Number(p.amount))} · {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Histórico de ações do admin</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma ação registrada.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white text-sm">
            {history.map((h) => (
              <li key={h.id} className="p-3">
                <p>
                  <strong>{ACTION_LABEL[h.action] ?? h.action}</strong> · {h.admin_email}
                </p>
                <p className="text-xs text-gray-500">{when(h.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
