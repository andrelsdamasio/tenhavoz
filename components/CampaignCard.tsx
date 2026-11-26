import Link from "next/link";
import { CopyPlus, ExternalLink, Eye, MousePointerClick, Pencil, Percent, RefreshCw } from "lucide-react";
import { duplicateCampaignAction } from "@/app/dashboard/actions";
import { clickRate, describeExpiry, nextStepFor, type DayStat } from "@/lib/campaign-stats";
import type { Campaign, CampaignStatus } from "@/lib/types";
import { isCampaignEditable } from "@/lib/campaigns";
import StatsSparkline from "@/components/StatsSparkline";
import ShareButtons from "@/components/ShareButtons";
import QrCodeDetails from "@/components/QrCodeDetails";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import VerifyPaymentButton from "@/components/VerifyPaymentButton";
import CopyLinkChip from "@/components/CopyLinkChip";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Rascunho · falta pagar",
  paid: "Pagamento confirmado · publicando",
  published: "Publicada",
};

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Eye; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border-2 border-ink/15 bg-paper/60 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="display text-2xl leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}

export default function CampaignCard({
  campaign,
  views,
  clicks,
  daily,
  siteUrl,
}: {
  campaign: Campaign;
  views: number;
  clicks: number;
  daily?: DayStat[];
  siteUrl: string;
}) {
  const published = campaign.status === "published";
  const expiry = describeExpiry(campaign.expires_at);
  const expired = !!expiry?.expired;
  const publicUrl = campaign.slug ? `${siteUrl}/${campaign.slug}` : null;
  const host = siteUrl.replace(/^https?:\/\//, "");
  const step = nextStepFor({ published, checkoutStarted: campaign.duration_hours !== null, expired, views, clicks });

  // Faixa de cima: cor e frase dizem, de relance, em que pé a campanha está.
  const band = expired
    ? { cls: "bg-brand-600 text-white", text: "Encerrada" }
    : published
      ? { cls: "bg-folha text-white", text: "Publicada · no ar" }
      : { cls: "bg-sol text-ink", text: STATUS_LABEL[campaign.status] };
  const stepTone =
    step?.tone === "action" ? "border-brand-600 bg-brand-50 text-brand-700" : step?.tone === "warn" ? "border-amber-500 bg-amber-50 text-amber-800" : "border-blue-400 bg-blue-50 text-blue-800";

  return (
    <li className="overflow-hidden rounded-md border-2 border-ink bg-white">
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide ${band.cls}`}>
        <span>{band.text}</span>
        {published && !expired && expiry && <span className="normal-case tracking-normal">{expiry.label}</span>}
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[1fr_17rem]">
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <h3 className="display text-xl leading-tight sm:text-2xl">{campaign.title}</h3>
          {publicUrl && (
            <div className="mt-2">
              <CopyLinkChip url={publicUrl} label={`${host}/${campaign.slug}`} />
            </div>
          )}

          {published && (
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-2">
                <Metric icon={Eye} label="Visitas" value={views.toLocaleString("pt-BR")} />
                <Metric icon={MousePointerClick} label="Envios" value={clicks.toLocaleString("pt-BR")} hint="cliques no botão" />
                <Metric icon={Percent} label="Taxa" value={`${clickRate(views, clicks).toLocaleString("pt-BR")}%`} hint="envios por visita; pode passar de 100%" />
              </div>
              {daily && (
                <div className="mt-3 flex items-end gap-3">
                  <StatsSparkline days={daily} />
                  <p className="pb-1 text-[11px] text-ink-soft">últimos 14 dias<br />barras: visitas · ponto: envios</p>
                </div>
              )}
            </div>
          )}

          {step && <p className={`mt-4 rounded-md border-l-4 px-3 py-2 text-sm font-medium ${stepTone}`}>{step.text}</p>}
        </div>

        <div className="flex flex-col gap-3 lg:border-l-2 lg:border-ink/10 lg:pl-5">
          {published && publicUrl ? (
            <>
              <Link href={`/${campaign.slug}`} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-ink px-3 py-2 text-sm font-bold hover:bg-paper-deep">
                <ExternalLink aria-hidden="true" className="h-4 w-4" /> Ver página pública
              </Link>
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">Divulgar</p>
                <ShareButtons url={publicUrl} title={campaign.title} />
              </div>
            </>
          ) : (
            <>
              <Link href={`/dashboard/checkout?campaignId=${campaign.id}`} className="rounded-md bg-ink px-3 py-2 text-center text-sm font-bold text-white hover:bg-brand-600">
                Pagar e publicar
              </Link>
              <VerifyPaymentButton campaignId={campaign.id} />
              {campaign.duration_hours !== null && (
                <Link href={`/dashboard/pagamento/${campaign.id}`} className="text-center text-sm font-semibold underline-offset-4 hover:underline">
                  Acompanhar pagamento
                </Link>
              )}
            </>
          )}

          {expired && (
            <form action={duplicateCampaignAction}>
              <input type="hidden" name="campaignId" value={campaign.id} />
              <button type="submit" name="mode" value="renew" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-bold text-white hover:bg-brand-600">
                <RefreshCw aria-hidden="true" className="h-4 w-4" /> Renovar campanha
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-ink/10 bg-paper/50 px-4 py-2.5 text-sm font-semibold">
        {isCampaignEditable(campaign) && (
          <Link href={`/dashboard/edit/${campaign.id}`} className="inline-flex items-center gap-1.5 hover:underline">
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" /> Editar
          </Link>
        )}
        {!expired && (
          <form action={duplicateCampaignAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button type="submit" name="mode" value="duplicate" className="inline-flex items-center gap-1.5 hover:underline">
              <CopyPlus aria-hidden="true" className="h-3.5 w-3.5" /> Duplicar
            </button>
          </form>
        )}
        {published && publicUrl && campaign.slug && <QrCodeDetails url={publicUrl} name={campaign.slug} />}
        <span className="ml-auto">
          <DeleteCampaignButton campaignId={campaign.id} published={published} />
        </span>
      </div>
    </li>
  );
}
