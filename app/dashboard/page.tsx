import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listCampaignsForUser, isCampaignEditable } from "@/lib/campaigns";
import { getCampaignStats } from "@/lib/events";
import {
  reconcileCampaignPayment,
  syncMercadoPagoPaymentById,
  syncStripeSessionById,
} from "@/lib/payment-sync";
import ShareButtons from "@/components/ShareButtons";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import VerifyPaymentButton from "@/components/VerifyPaymentButton";
import type { CampaignStatus } from "@/lib/types";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Rascunho — pagamento pendente",
  paid: "Pagamento confirmado — publicando...",
  published: "Publicada",
};

const STATUS_CLASS: Record<CampaignStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
};

/** Só confere pagamento de campanhas criadas há menos que isto... */
const AUTO_CHECK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** ...e no máximo esta quantidade por abertura do dashboard. */
const AUTO_CHECK_MAX_CAMPAIGNS = 3;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

interface PageProps {
  searchParams: Promise<{
    edited?: string;
    editExpired?: string;
    checkout?: string;
    session_id?: string;
    payment_id?: string;
    collection_id?: string;
    verify?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const {
    edited,
    editExpired,
    checkout,
    session_id: stripeSessionId,
    payment_id: paymentId,
    collection_id: collectionId,
    verify,
  } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ao voltar do checkout, confirma o pagamento direto no provedor (o
  // Stripe devolve session_id e o Mercado Pago devolve payment_id na URL)
  // em vez de esperar o webhook — que pode demorar, falhar ou nem chegar.
  // Idempotente: se o webhook já liberou a campanha, não muda nada.
  let releasedNow = false;
  if (checkout === "success" || checkout === "pending") {
    try {
      const admin = createAdminClient();
      const result = stripeSessionId
        ? await syncStripeSessionById(admin, stripeSessionId)
        : paymentId || collectionId
          ? await syncMercadoPagoPaymentById(admin, (paymentId ?? collectionId)!)
          : null;
      releasedNow = !!result?.published;
    } catch (err) {
      // Não derruba o dashboard: o botão "Já paguei" continua disponível.
      console.error("[dashboard] falha ao confirmar o pagamento na volta do checkout", err);
    }
  }

  let campaigns = await listCampaignsForUser(supabase, user.id);

  // Pix: a pessoa paga no app do banco e muitas vezes nem volta ao site, então
  // a checagem acima não acontece. Por isso, ao abrir o dashboard, conferimos
  // as campanhas que já passaram pelo checkout (duration_hours só é gravado ao
  // iniciar o pagamento) e continuam em rascunho. Limitado em quantidade e em
  // idade pra não gerar consultas demais aos provedores.
  const awaitingPayment = campaigns
    .filter(
      (c) =>
        c.status !== "published" &&
        c.duration_hours !== null &&
        Date.now() - new Date(c.created_at).getTime() < AUTO_CHECK_MAX_AGE_MS
    )
    .slice(0, AUTO_CHECK_MAX_CAMPAIGNS);

  if (awaitingPayment.length > 0) {
    const admin = createAdminClient();
    const outcomes = await Promise.all(
      awaitingPayment.map((campaign) =>
        reconcileCampaignPayment(admin, campaign).catch((err) => {
          console.error("[dashboard] falha ao conferir pagamento pendente", {
            campaignId: campaign.id,
            err,
          });
          return null;
        })
      )
    );
    if (outcomes.some((outcome) => outcome?.published)) {
      releasedNow = true;
      campaigns = await listCampaignsForUser(supabase, user.id);
    }
  }

  // events não tem policy de select para o usuário logado (só a service
  // role escreve/lê) — os campaignIds já vieram de uma query com RLS
  // restrita a este user_id, então é seguro consultar as stats com o
  // client admin aqui.
  const stats = await getCampaignStats(
    createAdminClient(),
    campaigns.map((c) => c.id)
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Minhas campanhas</h1>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nova campanha
        </Link>
      </div>

      {edited === "1" && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Campanha atualizada com sucesso.
        </p>
      )}
      {(releasedNow || verify === "ok") && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Pagamento confirmado! Sua página já está no ar.
        </p>
      )}
      {!releasedNow && (checkout === "success" || checkout === "pending") && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Recebemos o retorno do seu pagamento, mas ele ainda não foi
          confirmado. Pix e boleto podem levar alguns minutos. Quando
          confirmar, a página é liberada sozinha; para conferir agora, use
          &quot;Já paguei — verificar pagamento&quot; na sua campanha.
        </p>
      )}
      {verify === "pending" && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Seu pagamento ainda está sendo confirmado (o Pix pode levar alguns
          minutos). Não apague a campanha: assim que for aprovado, sua página
          é liberada e você pode usar o botão &quot;Já paguei — verificar
          pagamento&quot;. Precisando de ajuda, chame o suporte no WhatsApp.
        </p>
      )}
      {verify === "notfound" && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Ainda não encontramos um pagamento aprovado para essa campanha. Se
          você já pagou, aguarde alguns minutos e verifique de novo; se não
          liberar em até 30 minutos, fale com o suporte.
        </p>
      )}
      {verify === "error" && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Não conseguimos consultar o pagamento agora. Tente de novo em
          instantes.
        </p>
      )}
      {editExpired === "1" && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          O prazo de 24 horas para editar essa campanha já passou.
        </p>
      )}

      {campaigns.length === 0 ? (
        <p className="text-gray-600">
          Você ainda não criou nenhuma campanha.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{campaign.title}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[campaign.status]}`}
                >
                  {STATUS_LABEL[campaign.status]}
                </span>
                {campaign.slug && (
                  <p className="mt-1 text-xs text-gray-500">
                    {SITE_HOST}/{campaign.slug}
                  </p>
                )}
                {campaign.status === "published" && (
                  <p className="mt-1 text-xs text-gray-500">
                    {stats[campaign.id]?.views ?? 0} visualizações ·{" "}
                    {stats[campaign.id]?.clicks ?? 0} cliques no botão de
                    envio
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {campaign.status === "published" && campaign.slug ? (
                  <>
                    <Link
                      href={`/${campaign.slug}`}
                      target="_blank"
                      className="text-sm text-brand-600 hover:underline"
                    >
                      Ver página pública ↗
                    </Link>
                    <ShareButtons
                      url={`${SITE_URL}/${campaign.slug}`}
                      title={campaign.title}
                      className="text-right"
                    />
                  </>
                ) : (
                  <>
                    <Link
                      href={`/dashboard/checkout?campaignId=${campaign.id}`}
                      className="text-sm text-brand-600 hover:underline"
                    >
                      Pagar e publicar
                    </Link>
                    <VerifyPaymentButton campaignId={campaign.id} />
                  </>
                )}
                {isCampaignEditable(campaign) && (
                  <Link
                    href={`/dashboard/edit/${campaign.id}`}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Editar
                  </Link>
                )}
                <DeleteCampaignButton
                  campaignId={campaign.id}
                  published={campaign.status === "published"}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
