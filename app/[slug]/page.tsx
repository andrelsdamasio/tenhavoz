import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublishedCampaignBySlug, isCampaignExpired } from "@/lib/campaigns";
import { buildMailtoUrl } from "@/lib/mailto";
import { getTemplateComponent } from "@/components/templates";
import ViewTracker from "@/components/ViewTracker";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const campaign = await getPublishedCampaignBySlug(supabase, slug);

  if (!campaign) return {};

  const description = (campaign.subtitle ?? campaign.manifest_text).slice(0, 160);

  return {
    title: campaign.title,
    description,
    // O layout raiz já define openGraph/twitter com o título e a descrição
    // fixos do site ("TenhaVoz") — Next.js não mescla esses campos com o
    // title/description simples definidos acima, então sem repetir tudo
    // aqui o card compartilhado (WhatsApp, etc.) mostraria sempre
    // "TenhaVoz" em vez do título da campanha específica.
    openGraph: {
      title: campaign.title,
      description,
      siteName: "TenhaVoz",
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: campaign.title,
      description,
    },
  };
}

export default async function PublicCampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const campaign = await getPublishedCampaignBySlug(supabase, slug);

  if (!campaign) {
    notFound();
  }

  if (isCampaignExpired(campaign)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Campanha encerrada</h1>
        <p className="text-gray-600">
          O prazo desta campanha (&quot;{campaign.title}&quot;) já acabou e o
          link de envio não está mais disponível.
        </p>
      </main>
    );
  }

  const { url: mailtoUrl } = buildMailtoUrl({
    recipients: campaign.recipients,
    sendMode: campaign.send_mode,
    subject: campaign.subject,
    body: campaign.manifest_text,
  });

  const Template = getTemplateComponent(campaign.template_id);

  return (
    <>
      <ViewTracker campaignId={campaign.id} />
      <Template campaign={campaign} mailtoUrl={mailtoUrl} />
    </>
  );
}
