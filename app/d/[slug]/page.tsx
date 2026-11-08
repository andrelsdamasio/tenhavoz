import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { daysLeft, loadFundraiserView } from "@/lib/fundraiser-public";
import { relativeTime } from "@/lib/relative-time";
import ShareButtons from "@/components/ShareButtons";
import DonateForm from "@/components/DonateForm";
import FundraiserView from "@/components/FundraiserView";

// Depende de quem está vendo (rascunho só para o dono) e do total arrecadado.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br";

async function load(slug: string) {
  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) return null;
  const view = await loadFundraiserView(admin, slug);
  if (!view) return null;
  if (view.fundraiser.status === "draft" || view.fundraiser.status === "suspended") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== view.fundraiser.user_id) return null;
    return { view, preview: true };
  }
  return { view, preview: false };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const loaded = await load(params.slug);
  if (!loaded) return { title: "Campanha não encontrada", robots: { index: false } };
  const { fundraiser: f } = loaded.view;
  const description = f.summary || f.story.slice(0, 160);
  return {
    title: `${f.title} — TenhaVoz`,
    description,
    openGraph: { title: f.title, description, type: "website", url: `${SITE_URL}/d/${f.slug}` },
    robots: loaded.preview ? { index: false } : undefined,
  };
}

const STATUS_NOTE: Record<string, string> = {
  draft: "Rascunho — só você vê esta página. Ela ainda não está no ar.",
  suspended: "Campanha suspensa pela moderação.",
  ended: "Esta campanha foi encerrada.",
};

export default async function FundraiserPage({ params }: { params: { slug: string } }) {
  const loaded = await load(params.slug);
  if (!loaded) notFound();
  const { view, preview } = loaded;
  const { fundraiser: f, budget, donations, raisedCents, donationCount } = view;

  const left = daysLeft(f.ends_at);
  const canDonate = f.status === "active" && !preview && (left === null || left > 0);
  const url = `${SITE_URL}/d/${f.slug}`;

  return (
    <main className="min-h-screen">
      <FundraiserView
        templateId={f.template_id}
        color={f.theme_color}
        title={f.title}
        beneficiary={f.beneficiary_name}
        summary={f.summary}
        story={f.story}
        goalCents={f.goal_cents}
        raisedCents={raisedCents}
        donationCount={donationCount}
        daysLeft={left}
        budget={budget}
        donations={donations.map((d) => ({ id: d.id, name: d.name, amount_cents: d.amount_cents, message: d.message, when: relativeTime(d.created_at, Date.now()) }))}
        notice={preview || f.status !== "active" ? STATUS_NOTE[f.status] ?? "" : null}
        donateSlot={
          canDonate ? (
            <DonateForm slug={f.slug} />
          ) : (
            <p className="rounded-md bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-700">
              {preview ? "Doações só abrem depois que a campanha for publicada." : "Esta campanha não está recebendo doações."}
            </p>
          )
        }
        shareSlot={<ShareButtons url={url} title={f.title} message={`Ajude esta campanha: "${f.title}".`} />}
      />
    </main>
  );
}
