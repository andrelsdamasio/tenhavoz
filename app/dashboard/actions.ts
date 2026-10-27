"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCampaign, getCampaignForOwner } from "@/lib/campaigns";
import { reconcileCampaignPayment } from "@/lib/payment-sync";

export async function deleteCampaignAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");

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

  await deleteCampaign(supabase, campaignId, user.id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/**
 * Botão "Já paguei — verificar pagamento": procura nos provedores um
 * pagamento aprovado desta campanha e, se achar, libera a página. É a rede
 * de segurança para quando o webhook não chegou — a pessoa não fica
 * dependendo de a gente descobrir o problema.
 */
export async function verifyPaymentAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");

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

  let result: "ok" | "notfound" | "error" = "notfound";

  if (campaign.status === "published") {
    result = "ok";
  } else {
    try {
      const outcome = await reconcileCampaignPayment(createAdminClient(), campaign);
      if (outcome.errors.length > 0) {
        console.error("[verify-payment] provedor indisponível ao verificar", {
          campaignId,
          errors: outcome.errors,
        });
      }
      if (outcome.published) result = "ok";
      else if (outcome.found === 0 && outcome.errors.length > 0) result = "error";
    } catch (err) {
      console.error("[verify-payment] falha ao verificar o pagamento", { campaignId, err });
      result = "error";
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?verify=${result}`);
}
