"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createFundraiserDraft, isFundraisingEnabled, parseFundraiserForm } from "@/lib/fundraisers";

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
    return { error: "As campanhas de doação ainda não estão disponíveis." };
  }

  const parsed = parseFundraiserForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    const created = await createFundraiserDraft(admin, user.id, parsed.value);
    revalidatePath("/dashboard/doacoes");
    redirect(`/dashboard/doacoes?criada=${encodeURIComponent(created.slug)}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    if (typeof err === "object" && err && "digest" in err) throw err; // redirect do Next
    console.error("[doacoes] falha ao criar rascunho", err);
    return { error: "Não foi possível salvar a campanha agora. Tente de novo." };
  }
  return { error: null };
}
