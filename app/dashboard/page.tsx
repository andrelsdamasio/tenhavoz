import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listCampaignsForUser } from "@/lib/campaigns";
import { getCampaignStats, getDailyStats } from "@/lib/events";
import { clickRate, sumDaily } from "@/lib/campaign-stats";
import { getReferralSummary, REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import CampaignCard from "@/components/CampaignCard";
import ActivityChart from "@/components/ActivityChart";
import {
  reconcileCampaignPayment,
  syncMercadoPagoPaymentById,
  syncStripeSessionById,
} from "@/lib/payment-sync";
import AutoRefresh from "@/components/AutoRefresh";
import FlashMessage from "@/components/FlashMessage";

/** Só confere pagamento de campanhas criadas há menos que isto... */
const AUTO_CHECK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** ...e no máximo esta quantidade por abertura do dashboard. */
const AUTO_CHECK_MAX_CAMPAIGNS = 3;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br";

interface PageProps {
  searchParams: Promise<{
    edited?: string;
    editExpired?: string;
    checkout?: string;
    session_id?: string;
    payment_id?: string;
    collection_id?: string;
    verify?: string;
    copy?: string;
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
    copy,
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

  // Só mostra o aviso do Pix para quem começou há pouco; rascunhos antigos
  // abandonados não devem exibir "pagou o Pix?".
  const recentlyStarted = awaitingPayment.some(
    (c) => Date.now() - new Date(c.created_at).getTime() < 24 * 60 * 60 * 1000
  );

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
  const admin = createAdminClient();
  const campaignIds = campaigns.map((c) => c.id);
  const publishedIds = campaigns.filter((c) => c.status === "published").map((c) => c.id);
  const stats = await getCampaignStats(admin, campaignIds);
  // O gráfico é um extra: se falhar, a lista continua funcionando.
  const daily = await getDailyStats(admin, publishedIds, 14).catch((err) => {
    console.error("[dashboard] falha ao carregar o gráfico diário", err);
    return {} as Awaited<ReturnType<typeof getDailyStats>>;
  });
  // Indicação é um extra: se falhar, o painel segue normal.
  const referral = await getReferralSummary(admin, user.id).catch((err) => {
    console.error("[dashboard] falha ao carregar as indicações", err);
    return null;
  });
  const totals = publishedIds.reduce(
    (acc, id) => ({
      views: acc.views + (stats[id]?.views ?? 0),
      clicks: acc.clicks + (stats[id]?.clicks ?? 0),
    }),
    { views: 0, clicks: 0 }
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="display text-4xl sm:text-5xl">Minhas campanhas</h1>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Nova campanha
        </Link>
      </div>

      {copy === "error" && (
        <FlashMessage tone="error" clearParams={["copy"]}>
          Não foi possível copiar a campanha agora. Tente de novo em instantes.
        </FlashMessage>
      )}
      {publishedIds.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Visualizações", value: totals.views.toLocaleString("pt-BR") },
            { label: "Cliques no botão", value: totals.clicks.toLocaleString("pt-BR") },
            {
              label: "Cliques por visualização",
              value: `${clickRate(totals.views, totals.clicks).toLocaleString("pt-BR")}%`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-md border-2 border-ink bg-white p-3">
              <p className="text-xs font-semibold text-gray-500">{item.label}</p>
              <p className="display mt-1 text-4xl">{item.value}</p>
            </div>
          ))}
        </div>
      )}
      {publishedIds.length > 0 && (
        <section aria-labelledby="atividade" className="mb-6 rounded-md border-2 border-ink bg-white p-4">
          <h2 id="atividade" className="mb-3 text-sm font-extrabold uppercase text-ink-soft">
            Atividade dos últimos 14 dias
          </h2>
          <ActivityChart
            data={sumDaily(publishedIds.map((id) => daily[id] ?? []))}
            series={[
              { key: "views", label: "Visualizações", color: "#e8431f" },
              { key: "clicks", label: "Cliques no botão", color: "#0e5a39" },
            ]}
            summary={`Visualizações e cliques por dia nos últimos 14 dias: ${totals.views} visualizações e ${totals.clicks} cliques no total.`}
            height={200}
          />
        </section>
      )}
      {referral && referral.availableCoupons.length > 0 && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <strong>Você ganhou {REFERRAL_DISCOUNT_PERCENT}% de desconto por indicar o TenhaVoz!</strong>{" "}
          Use o cupom{" "}
          {referral.availableCoupons.map((code, i) => (
            <span key={code}>
              {i > 0 && ", "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono">{code}</code>
            </span>
          ))}{" "}
          no pagamento da sua próxima campanha.
        </p>
      )}
      {edited === "1" && (
        <FlashMessage tone="success" autoHideMs={8000} clearParams={["edited"]}>
          Campanha atualizada com sucesso.
        </FlashMessage>
      )}
      {(releasedNow || verify === "ok") && (
        <FlashMessage tone="success" clearParams={["verify"]}>
          Pagamento confirmado! Sua página já está no ar.
        </FlashMessage>
      )}
      {!releasedNow && (checkout === "success" || checkout === "pending") && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Recebemos o retorno do seu pagamento, mas ele ainda não foi
          confirmado. Pix e boleto podem levar alguns minutos. Quando
          confirmar, a página é liberada sozinha; para conferir agora, use
          &quot;Já paguei — verificar pagamento&quot; na sua campanha.
        </p>
      )}
      {(checkout === "pending" || recentlyStarted) && !releasedNow && verify !== "ok" && (
        <>
          <AutoRefresh />
          <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <strong>Pagou o Pix?</strong> Sua página é liberada sozinha em
            alguns minutos e esta tela atualiza sozinha. <strong>Não apague a
            campanha</strong>: o pagamento está sendo confirmado. Se demorar
            mais de 10 minutos, clique em &quot;Já paguei&quot; ou chame o
            suporte no WhatsApp.
          </p>
        </>
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
        <FlashMessage tone="error" clearParams={["verify"]}>
          Não conseguimos consultar o pagamento agora. Tente de novo em
          instantes.
        </FlashMessage>
      )}
      {editExpired === "1" && (
        <FlashMessage tone="warning" clearParams={["editExpired"]}>
          O prazo de 24 horas para editar essa campanha já passou.
        </FlashMessage>
      )}

      {publishedIds.length > 0 && referral && (
        <p className="mb-4 text-xs text-gray-500">
          Indique e ganhe: quem criar uma conta pelo link no rodapé da sua página e pagar a primeira campanha
          rende {REFERRAL_DISCOUNT_PERCENT}% de desconto para você.
          {referral.invited > 0 && ` Você já indicou ${referral.invited} pessoa(s).`}
        </p>
      )}
      {campaigns.length === 0 ? (
        <p className="text-gray-600">
          Você ainda não criou nenhuma campanha.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              views={stats[campaign.id]?.views ?? 0}
              clicks={stats[campaign.id]?.clicks ?? 0}
              daily={daily[campaign.id]}
              siteUrl={SITE_URL}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
