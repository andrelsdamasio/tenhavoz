import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCampaignForOwner } from "@/lib/campaigns";
import { formatBRL } from "@/lib/pricing";
import { getAppSettings } from "@/lib/settings";
import { isAdminEmail } from "@/lib/admin";
import { startStripeCheckout, startMercadoPagoCheckout, publishFreeAsAdmin } from "./actions";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; canceled?: string }>;
}) {
  const { campaignId, canceled } = await searchParams;

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

  const { campaign_price_brl_cents: priceCents } = await getAppSettings(supabase);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-semibold">Pagamento</h1>
      <p className="mb-6 text-gray-600">
        Campanha <strong>{campaign.title}</strong> —{" "}
        {formatBRL(priceCents)}
      </p>

      {canceled && (
        <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          Pagamento não concluído. Tente novamente quando quiser.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <form action={startStripeCheckout}>
          <input type="hidden" name="campaignId" value={campaign.id} />
          <button
            type="submit"
            className="w-full rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Pagar com Stripe
          </button>
        </form>
        <form action={startMercadoPagoCheckout}>
          <input type="hidden" name="campaignId" value={campaign.id} />
          <button
            type="submit"
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 font-medium hover:bg-gray-100"
          >
            Pagar com Mercado Pago
          </button>
        </form>

        {isAdminEmail(user.email) && (
          <form action={publishFreeAsAdmin}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              type="submit"
              className="w-full rounded-md border border-dashed border-gray-400 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Publicar sem pagar (admin)
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Assim que o pagamento for confirmado, sua campanha vira uma página
        pública automaticamente.
      </p>
    </div>
  );
}
