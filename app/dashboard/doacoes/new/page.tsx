import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import FundraiserForm from "@/components/FundraiserForm";

export const metadata = { title: "Nova campanha de doação — TenhaVoz" };

export default async function NewFundraiserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/doacoes/new");
  if (!(await isFundraisingEnabled(createAdminClient()))) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Nova campanha de doação</h1>
      <p className="mb-6 text-sm text-gray-600">Em 4 passos. Você pode usar a IA para escrever o texto e ajustar tudo depois.</p>
      <FundraiserForm />
    </div>
  );
}
