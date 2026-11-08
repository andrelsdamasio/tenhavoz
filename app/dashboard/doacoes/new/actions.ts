"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasConnection } from "@/lib/mp-oauth";
import { attachBudgetDocs, createFundraiserDraft, isFundraisingEnabled, parseFundraiserForm, validateDocs } from "@/lib/fundraisers";

export interface FundraiserFormState {
  error: string | null;
}

export async function createFundraiserAction(
  _prev: FundraiserFormState,
  formData: FormData
): Promise<FundraiserFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/doacoes/new");

  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) {
    return { error: "As campanhas de arrecadação ainda não estão disponíveis." };
  }

  const parsed = parseFundraiserForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const files = formData.getAll("budgetFile");
  const docError = validateDocs(files.filter((f): f is File => typeof f !== "string"));
  if (docError) return { error: docError };

  try {
    const created = await createFundraiserDraft(admin, user.id, parsed.value);
    await attachBudgetDocs(admin, created.id, parsed.value.budget, files);
    revalidatePath("/dashboard/doacoes");
    const connected = await hasConnection(admin, user.id);
    redirect(`/dashboard/doacoes?criada=${encodeURIComponent(created.slug)}${connected ? "" : "&mp=conecte"}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    if (typeof err === "object" && err && "digest" in err) throw err; // redirect do Next
    console.error("[doacoes] falha ao criar rascunho", err);
    return { error: "Não foi possível salvar a campanha agora. Tente de novo." };
  }
  return { error: null };
}
