import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getAppSettings } from "@/lib/settings";
import AdminSettingsForm from "../admin-settings-form";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { setFundraisingEnabledAction } from "../actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings(supabase);
  const fundraisingOn = await isFundraisingEnabled(supabase);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl font-semibold">Configurações</h1>
      <p className="mb-6 text-sm text-gray-600">
        Preço da campanha e templates disponíveis no formulário de criação.
        Mudanças valem para novas campanhas — as já criadas não são afetadas.
      </p>
      <AdminSettingsForm settings={settings} />
      <form action={setFundraisingEnabledAction} className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-1 font-semibold">Campanhas de arrecadação</h2>
        <p className="mb-3 text-sm text-gray-600">
          Desligado: ninguém além do código vê o recurso. Ligue só depois de confirmar o Mercado Pago e testar com contas de teste.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={fundraisingOn} />
          Recurso de doações ativo para os usuários
        </label>
        <button type="submit" className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          Salvar
        </button>
      </form>
    </div>
  );
}
