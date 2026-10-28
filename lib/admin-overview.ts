import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export interface HealthCheck {
  key: string;
  label: string;
  ok: boolean;
  /** O que acontece se estiver faltando. */
  impact: string;
  /** Obrigatória para os pagamentos funcionarem. */
  critical: boolean;
}

/** Variáveis de ambiente que o sistema precisa. Só verifica se existem, nunca expõe valores. */
export function getHealthChecks(env: NodeJS.ProcessEnv = process.env): HealthCheck[] {
  const has = (k: string) => !!env[k]?.trim();
  return [
    { key: "MERCADOPAGO_ACCESS_TOKEN", label: "Mercado Pago (acesso)", critical: true, ok: has("MERCADOPAGO_ACCESS_TOKEN"), impact: "Não cria nem confere pagamentos Pix/cartão." },
    { key: "MERCADOPAGO_WEBHOOK_SECRET", label: "Mercado Pago (chave do webhook)", critical: true, ok: has("MERCADOPAGO_WEBHOOK_SECRET"), impact: "Avisos de pagamento são recusados e as páginas não liberam sozinhas." },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Banco de dados (admin)", critical: true, ok: has("SUPABASE_SERVICE_ROLE_KEY"), impact: "Liberações e relatórios deixam de funcionar." },
    { key: "CRON_SECRET", label: "Rotina automática de 5 minutos", critical: false, ok: has("CRON_SECRET"), impact: "Pagamentos que o webhook perder não são liberados sozinhos." },
    { key: "RESEND_API_KEY", label: "Envio de e-mails (Resend)", critical: false, ok: has("RESEND_API_KEY"), impact: "Sem alertas, sem e-mail de confirmação ao cliente e sem respostas da caixa de entrada." },
    { key: "EMAIL_FROM", label: "Remetente dos e-mails", critical: false, ok: has("EMAIL_FROM"), impact: "E-mails saem de um remetente de teste." },
    { key: "RESEND_WEBHOOK_SECRET", label: "Recebimento de e-mails (webhook)", critical: false, ok: has("RESEND_WEBHOOK_SECRET"), impact: "E-mails recebidos não chegam à caixa de entrada." },
    { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe (chave do webhook)", critical: false, ok: has("STRIPE_WEBHOOK_SECRET"), impact: "Pagamentos por cartão via Stripe não liberam sozinhos." },
  ];
}

export interface RecentPayment {
  id: string;
  provider: string;
  status: string;
  amount: number;
  created_at: string;
  campaignTitle: string | null;
}

export interface AwaitingPayment {
  id: string;
  title: string;
  created_at: string;
  ownerEmail: string | null;
}

export interface OverviewExtras {
  unreadInbox: number;
  revenue7d: number;
  revenue30d: number;
  paymentsPending: number;
  recentPayments: RecentPayment[];
  awaiting: AwaitingPayment[];
}

/** Dados extras do painel inicial: caixa de entrada, receita recente, Pix aguardando e últimos pagamentos. */
export async function getOverviewExtras(
  admin: SupabaseClient<Database>,
  now = Date.now()
): Promise<OverviewExtras> {
  const since30 = new Date(now - 30 * DAY).toISOString();

  const [unread, confirmed, pending, recent, drafts] = await Promise.all([
    admin
      .from("inbox_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "in")
      .is("read_at", null),
    admin
      .from("payments")
      .select("amount, created_at")
      .eq("status", "confirmed")
      .gte("created_at", since30),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin
      .from("payments")
      .select("id, provider, status, amount, created_at, campaign_id")
      .order("created_at", { ascending: false })
      .limit(8),
    // Campanhas que já foram ao checkout (duration_hours) e ainda não estão no ar, das últimas 24h.
    admin
      .from("campaigns")
      .select("id, title, created_at, user_id")
      .neq("status", "published")
      .not("duration_hours", "is", null)
      .gte("created_at", new Date(now - DAY).toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const rows = confirmed.data ?? [];
  const since7 = now - 7 * DAY;
  const sum = (items: { amount: number }[]) => items.reduce((t, r) => t + Number(r.amount), 0);

  const campaignIds = [...new Set((recent.data ?? []).map((p) => p.campaign_id))];
  const titles = new Map<string, string>();
  if (campaignIds.length > 0) {
    const { data } = await admin.from("campaigns").select("id, title").in("id", campaignIds);
    for (const c of data ?? []) titles.set(c.id, c.title);
  }

  const awaiting: AwaitingPayment[] = [];
  for (const d of drafts.data ?? []) {
    const { data } = await admin.auth.admin.getUserById(d.user_id);
    awaiting.push({
      id: d.id,
      title: d.title,
      created_at: d.created_at,
      ownerEmail: data.user?.email ?? null,
    });
  }

  return {
    unreadInbox: unread.count ?? 0,
    revenue7d: sum(rows.filter((r) => new Date(r.created_at).getTime() >= since7)),
    revenue30d: sum(rows),
    paymentsPending: pending.count ?? 0,
    recentPayments: (recent.data ?? []).map((p) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amount: Number(p.amount),
      created_at: p.created_at,
      campaignTitle: titles.get(p.campaign_id) ?? null,
    })),
    awaiting,
  };
}
