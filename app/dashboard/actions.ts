"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteCampaign, getCampaignForOwner } from "@/lib/campaigns";

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
