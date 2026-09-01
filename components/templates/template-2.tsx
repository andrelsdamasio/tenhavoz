import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import type { TemplateProps } from "./types";

/** Template 2: hero centralizado, fundo em degradê, chamada mais dramática. */
export default function Template2({ campaign, mailtoUrl }: TemplateProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {campaign.title}
        </h1>
        <p className="whitespace-pre-wrap text-lg leading-relaxed text-brand-50">
          {campaign.manifest_text}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="rounded-full bg-white px-8 py-3.5 text-lg font-semibold text-brand-700 shadow-lg hover:bg-brand-50"
          >
            Assinar e enviar agora
          </TrackedMailtoLink>
          {campaign.drive_link && (
            <a
              href={campaign.drive_link}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border border-white/60 px-8 py-3.5 text-lg font-medium hover:bg-white/10"
            >
              Material de apoio
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
