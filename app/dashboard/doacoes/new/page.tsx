import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import FundraiserForm from "@/components/FundraiserForm";
import { hasConnection } from "@/lib/mp-oauth";

export const metadata = { title: "Nova campanha de arrecadação — TenhaVoz" };

export default async function NewFundraiserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/doacoes/new");
  if (!(await isFundraisingEnabled(createAdminClient()))) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold">Nova campanha de arrecadação</h1>
      <p className="mb-6 text-sm text-gray-600">Em 6 passos, com prévia ao vivo. Você pode usar a IA para escrever o texto e ajustar tudo depois.</p>
      <FundraiserForm connected={await hasConnection(createAdminClient(), user.id)} />
    </div>
  );
}
