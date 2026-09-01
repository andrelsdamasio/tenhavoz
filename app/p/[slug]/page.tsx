import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";
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

  return {
    title: campaign.title,
    description: campaign.manifest_text.slice(0, 160),
  };
}

export default async function PublicCampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const campaign = await getPublishedCampaignBySlug(supabase, slug);

  if (!campaign) {
    notFound();
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
