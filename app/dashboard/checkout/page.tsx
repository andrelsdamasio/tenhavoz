import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCampaignForOwner } from "@/lib/campaigns";
import { getAppSettings } from "@/lib/settings";
import { isAdminEmail } from "@/lib/admin";
import CouponCheckoutPanel from "@/components/CouponCheckoutPanel";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    campaignId?: string;
    canceled?: string;
    couponExpired?: string;
    planInvalid?: string;
    checkoutError?: string;
  }>;
}) {
  const { campaignId, canceled, couponExpired, planInvalid, checkoutError } = await searchParams;

  if (!campaignId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const campaign = await getCampaignForOwner(supabase, campaignId);

  if (!campaign || campaign.user_id !== user.id) {
    redirect("/dashboard");
  }

  if (campaign.status === "published") {
    redirect("/dashboard");
  }

  const { price_72h_brl_cents: price72hCents, price_7d_brl_cents: price7dCents } =
    await getAppSettings(supabase);
  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br").replace(
    /^https?:\/\//,
    ""
  );

  return (
    <div className="mx-auto max-w-4xl">

      {canceled && (
        <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          Pagamento não concluído. Tente novamente quando quiser.
        </p>
      )}

      {couponExpired && (
        <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          O cupom não é mais válido — aplique-o de novo ou escolha uma forma
          de pagamento.
        </p>
      )}

      <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        Pagando por Pix, a página é liberada em segundos, direto aqui. Se
        fechar esta tela, a liberação continua sozinha: acompanhe no painel e{" "}
        <strong>não apague a campanha</strong> enquanto o pagamento é confirmado.
      </p>

      {checkoutError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Não conseguimos abrir a tela de pagamento agora. Nada foi cobrado.
          Tente de novo em instantes; se continuar, fale com o suporte.
        </p>
      )}

      {planInvalid && (
        <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          Escolha um prazo antes de continuar.
        </p>
      )}

      <CouponCheckoutPanel
        campaignTitle={campaign.title}
        siteLabel={campaign.slug ? `${siteHost}/${campaign.slug}` : null}
        userEmail={user.email ?? null}
        campaignId={campaign.id}
        price72hCents={price72hCents}
        price7dCents={price7dCents}
        isAdmin={isAdminEmail(user.email)}
      />

      <p className="mt-6 text-xs text-gray-500">
        Assim que o pagamento for confirmado, sua campanha vira uma página
        pública automaticamente.
      </p>
    </div>
  );
}
