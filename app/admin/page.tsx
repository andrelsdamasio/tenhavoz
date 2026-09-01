import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getAppSettings } from "@/lib/settings";
import AdminSettingsForm from "./admin-settings-form";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings(supabase);

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Minhas campanhas
      </Link>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/reports" className="text-brand-600 hover:underline">
            Relatório de vendas →
          </Link>
          <Link href="/admin/coupons" className="text-brand-600 hover:underline">
            Cupons de desconto →
          </Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-600">
        Preço da campanha e templates disponíveis no formulário de criação.
        Mudanças valem para novas campanhas — as já criadas não são afetadas.
      </p>
      <AdminSettingsForm settings={settings} />
    </div>
  );
}
