"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCampaign, duplicateCampaign, getCampaignForOwner } from "@/lib/campaigns";
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

  // Trava de segurança: apagar uma campanha apaga também o registro do pagamento
  // dela. Quem pagou (Pix demora a compensar) e achou que "não liberou" já
  // apagou a campanha e perdeu a página e o rastro do pagamento. Antes de
  // apagar uma campanha que não está no ar, conferimos nos provedores se há
  // pagamento: aprovado → libera em vez de apagar; em análise → não apaga.
  if (campaign.status !== "published") {
    let blocked: "ok" | "pending" | null = null;
    try {
      const outcome = await reconcileCampaignPayment(createAdminClient(), campaign);
      if (outcome.published) blocked = "ok";
      else if (outcome.pending > 0) blocked = "pending";
      else if (outcome.errors.length > 0 && outcome.found === 0) {
        // Não deu para consultar: por segurança, não apaga agora.
        console.error("[delete-campaign] provedor indisponível; exclusão adiada", {
          campaignId,
          errors: outcome.errors,
        });
        blocked = "pending";
      }
    } catch (err) {
      console.error("[delete-campaign] falha ao conferir pagamento; exclusão adiada", {
        campaignId,
        err,
      });
      blocked = "pending";
    }

    if (blocked) {
      revalidatePath("/dashboard");
      redirect(`/dashboard?verify=${blocked}`);
    }
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

/**
 * "Duplicar" abre o rascunho copiado para editar; "Renovar" (campanha
 * encerrada) leva direto ao checkout da cópia, com o mesmo conteúdo e tema.
 */
export async function duplicateCampaignAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const mode = formData.get("mode") === "renew" ? "renew" : "duplicate";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const source = await getCampaignForOwner(supabase, campaignId);
  if (!source || source.user_id !== user.id) redirect("/dashboard");

  let copyId: string;
  try {
    copyId = (await duplicateCampaign(supabase, user.id, source)).id;
  } catch (err) {
    console.error("[duplicate-campaign] falha ao copiar a campanha", { campaignId, err });
    redirect("/dashboard?copy=error");
  }

  revalidatePath("/dashboard");
  redirect(
    mode === "renew"
      ? `/dashboard/checkout?campaignId=${copyId}`
      : `/dashboard/edit/${copyId}`
  );
}
