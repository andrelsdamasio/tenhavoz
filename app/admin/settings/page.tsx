import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getAppSettings } from "@/lib/settings";
import AdminSettingsForm from "../admin-settings-form";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { setAdAction, setFundraisingEnabledAction } from "../actions";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ anuncio?: string }> }) {
  const { anuncio } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings(supabase);
  const fundraisingOn = await isFundraisingEnabled(supabase);
  const { data: adRow } = await supabase
    .from("app_settings")
    .select("ad_enabled, ad_advertiser, ad_title, ad_text, ad_url")
    .eq("id", true)
    .maybeSingle();
  const ad = (adRow ?? {}) as { ad_enabled?: boolean; ad_advertiser?: string | null; ad_title?: string | null; ad_text?: string | null; ad_url?: string | null };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 display text-4xl sm:text-5xl">Configurações</h1>
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
      <form action={setAdAction} className="mt-8 space-y-3 rounded-lg border-2 border-ink/80 bg-white p-4">
        <h2 className="font-semibold">Anúncio nas telas de criar campanha</h2>
        <p className="text-sm text-gray-600">
          Um anúncio simples, sempre marcado como “Publicidade”, que aparece só para quem está criando campanha (e-mail e arrecadação). Não aparece nas páginas públicas.
        </p>
        {anuncio === "ok" && <p role="status" className="rounded-md bg-green-50 p-2 text-sm text-green-800">Anúncio salvo.</p>}
        {anuncio && anuncio !== "ok" && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800">{anuncio}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={!!ad.ad_enabled} />
          Mostrar o anúncio
        </label>
        <label className="block text-sm">Anunciante
          <input name="advertiser" maxLength={60} defaultValue={ad.ad_advertiser ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">Título
          <input name="title" maxLength={80} defaultValue={ad.ad_title ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">Texto
          <textarea name="text" maxLength={200} rows={3} defaultValue={ad.ad_text ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">Link (começa com https://)
          <input name="url" type="url" maxLength={500} defaultValue={ad.ad_url ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Salvar anúncio</button>
      </form>
    </div>
  );
}
