import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCampaignForOwner } from "@/lib/campaigns";
import { getAppSettings } from "@/lib/settings";
import { isAdminEmail } from "@/lib/admin";
import CouponCheckoutPanel from "@/components/CouponCheckoutPanel";

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
  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br").replace(
    /^https?:\/\//,
    ""
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-semibold">Pagamento</h1>
      <p className="mb-1 text-sm text-gray-500">
        Campanha <strong className="text-gray-700">{campaign.title}</strong>
      </p>
      {campaign.slug && (
        <p className="mb-6 text-sm text-gray-500">
          Sua página vai ficar em{" "}
          <span className="font-medium text-gray-700">
            {siteHost}/{campaign.slug}
          </span>
        </p>
      )}

      {canceled && (
        <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          Pagamento não concluído. Tente novamente quando quiser.
        </p>
      )}

      <CouponCheckoutPanel
        campaignId={campaign.id}
        basePriceCents={priceCents}
        isAdmin={isAdminEmail(user.email)}
      />

      <p className="mt-6 text-xs text-gray-500">
        Assim que o pagamento for confirmado, sua campanha vira uma página
        pública automaticamente.
      </p>
    </div>
  );
}
