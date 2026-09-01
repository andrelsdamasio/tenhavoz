import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listCampaignsForUser } from "@/lib/campaigns";
import { getCampaignStats } from "@/lib/events";
import ShareButtons from "@/components/ShareButtons";
import type { CampaignStatus } from "@/lib/types";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Rascunho — pagamento pendente",
  paid: "Pagamento confirmado — publicando...",
  published: "Publicada",
};

const STATUS_CLASS: Record<CampaignStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const campaigns = await listCampaignsForUser(supabase, user.id);

  // events não tem policy de select para o usuário logado (só a service
  // role escreve/lê) — os campaignIds já vieram de uma query com RLS
  // restrita a este user_id, então é seguro consultar as stats com o
  // client admin aqui.
  const stats = await getCampaignStats(
    createAdminClient(),
    campaigns.map((c) => c.id)
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Minhas campanhas</h1>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nova campanha
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-gray-600">
          Você ainda não criou nenhuma campanha.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{campaign.title}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[campaign.status]}`}
                >
                  {STATUS_LABEL[campaign.status]}
                </span>
                {campaign.slug && (
                  <p className="mt-1 text-xs text-gray-500">
                    {SITE_HOST}/p/{campaign.slug}
                  </p>
                )}
                {campaign.status === "published" && (
                  <p className="mt-1 text-xs text-gray-500">
                    {stats[campaign.id]?.views ?? 0} visualizações ·{" "}
                    {stats[campaign.id]?.clicks ?? 0} cliques no botão de
                    envio
                  </p>
                )}
              </div>
              {campaign.status === "published" && campaign.slug ? (
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/p/${campaign.slug}`}
                    target="_blank"
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Ver página pública ↗
                  </Link>
                  <ShareButtons
                    url={`${SITE_URL}/p/${campaign.slug}`}
                    title={campaign.title}
                    className="text-right"
                  />
                </div>
              ) : (
                <Link
                  href={`/dashboard/checkout?campaignId=${campaign.id}`}
                  className="text-sm text-brand-600 hover:underline"
                >
                  Pagar e publicar
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
