import { findInvalidEmails, isValidEmailAddress } from "@/lib/email-address";
import CreateYourOwnLink from "@/components/CreateYourOwnLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublishedCampaignBySlug, isCampaignExpired } from "@/lib/campaigns";
import { buildMailtoUrl } from "@/lib/mailto";
import { parseDriveLink } from "@/lib/campaign-input";
import { getTemplateComponent } from "@/components/templates";
import ViewTracker from "@/components/ViewTracker";
import WhatsNew from "@/components/WhatsNew";
import { entriesFor } from "@/lib/whats-new";
import CommentsSection from "@/components/CommentsSection";
import { createAdminClient } from "@/lib/supabase/admin";
import { listComments, type PublicComment } from "@/lib/comments";

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

  // Rede de segurança para campanhas já salvas: um único endereço inválido
  // (ex.: ".gov.b") faria o app de e-mail recusar a mensagem para TODOS. Os
  // inválidos ficam de fora do link e o problema vai para o log.
  const validRecipients = campaign.recipients.filter(isValidEmailAddress);
  if (validRecipients.length !== campaign.recipients.length) {
    console.error("[campanha] destinatário(s) inválido(s) ignorado(s) no link", {
      slug,
      invalid: findInvalidEmails(campaign.recipients),
    });
  }

  const { url: mailtoUrl } = buildMailtoUrl({
    recipients: validRecipients,
    sendMode: campaign.send_mode,
    subject: campaign.subject,
    body: campaign.manifest_text,
  });

  const Template = getTemplateComponent(campaign.template_id);

  // Defesa em profundidade: campanhas salvas antes da validação server-side
  // do link do Drive podem ter um esquema não-http(s) (ex.: javascript:).
  // Nunca vira href na página pública.
  const driveLink = parseDriveLink(campaign.drive_link ?? "");
  const safeCampaign = {
    ...campaign,
    recipients: validRecipients,
    drive_link: driveLink.ok ? driveLink.value : null,
  };

  // Comentários são um extra: se falharem, a página e o botão de envio seguem normais.
  let comments: PublicComment[] = [];
  try {
    comments = await listComments(createAdminClient(), campaign.id);
  } catch (err) {
    console.error("[campanha] falha ao carregar os comentários", { slug, err });
  }

  return (
    <>
      <ViewTracker campaignId={campaign.id} />
      <Template campaign={safeCampaign} mailtoUrl={mailtoUrl} />
      <CommentsSection
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        slug={slug}
        comments={comments}
        templateId={campaign.template_id}
        themeColor={campaign.theme_color}
      />
      <CreateYourOwnLink refSlug={campaign.slug} />
      <WhatsNew entries={entriesFor(false)} popupOnly />
    </>
  );
}
