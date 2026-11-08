import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignForOwner } from "@/lib/campaigns";
import { reconcileCampaignPayment, type ReconcileOutcome } from "@/lib/payment-sync";
import { describePaymentState, type PaymentView } from "@/lib/payment-status";
import AutoRefresh from "@/components/AutoRefresh";
import VerifyPaymentButton from "@/components/VerifyPaymentButton";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tenhavoz.com.br").replace(/\/$/, "");

const VIEWS: Record<PaymentView, { tone: string; title: string; text: string }> = {
  published: {
    tone: "border-green-200 bg-green-50 text-green-800",
    title: "Pagamento confirmado, sua página está no ar",
    text: "Tudo certo! Você já pode divulgar o link da sua campanha.",
  },
  pending: {
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    title: "Pagamento recebido, aguardando a confirmação do banco",
    text: "O Pix costuma confirmar em segundos; boleto e cartão em análise podem levar mais. Esta tela atualiza sozinha e a página é liberada assim que for aprovado. Não apague a campanha.",
  },
  not_found: {
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    title: "Ainda não encontramos o seu pagamento",
    text: "Se você acabou de pagar, aguarde alguns minutos e confira de novo. Se pagou há mais de 30 minutos, chame o suporte e informe o e-mail da sua conta. Não apague a campanha.",
  },
  unavailable: {
    tone: "border-red-200 bg-red-50 text-red-700",
    title: "Não conseguimos consultar o pagamento agora",
    text: "Isso é um problema nosso e passageiro. Tente de novo em instantes. Seu pagamento, se existir, não se perde.",
  },
  not_started: {
    tone: "border-gray-200 bg-gray-50 text-gray-700",
    title: "O pagamento desta campanha ainda não foi iniciado",
    text: "Escolha o plano e pague para publicar a página.",
  },
};

export default async function PaymentStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const campaign = await getCampaignForOwner(supabase, id);
  if (!campaign || campaign.user_id !== user.id) redirect("/dashboard");

  let outcome: ReconcileOutcome | null = null;
  if (campaign.status !== "published" && campaign.duration_hours !== null) {
    try {
      outcome = await reconcileCampaignPayment(createAdminClient(), campaign);
    } catch (err) {
      console.error("[pagamento] falha ao conferir o pagamento", { campaignId: id, err });
    }
  }

  const state = describePaymentState(campaign, outcome);
  const view = VIEWS[state];

  return (
    <div className="mx-auto max-w-xl">
      {(state === "pending" || state === "not_found") && <AutoRefresh />}
      <h1 className="mb-1 text-2xl font-semibold">Status do pagamento</h1>
      <p className="mb-6 text-sm text-gray-500">
        Campanha <strong className="text-gray-700">{campaign.title}</strong>
      </p>

      <div className={`rounded-lg border p-4 ${view.tone}`} role="status" aria-live="polite">
        <p className="font-semibold">{view.title}</p>
        <p className="mt-1 text-sm">{view.text}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {state === "published" && campaign.slug && (
          <a
            href={`${SITE_URL}/${campaign.slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Abrir minha página
          </a>
        )}
        {state === "not_started" && (
          <Link
            href={`/dashboard/checkout?campaignId=${campaign.id}`}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Pagar e publicar
          </Link>
        )}
        {(state === "pending" || state === "not_found" || state === "unavailable") && (
          <VerifyPaymentButton campaignId={campaign.id} />
        )}
        <Link href="/dashboard" className="text-sm text-gray-600 hover:underline">
          Voltar às campanhas
        </Link>
      </div>
    </div>
  );
}
