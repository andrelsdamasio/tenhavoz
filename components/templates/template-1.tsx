import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import CopyFallbackButtons from "@/components/CopyFallbackButtons";
import { deriveThemeShades, themeShadesToCssVars } from "@/lib/color";
import type { TemplateProps } from "./types";

/** Template 1: minimalista, fundo claro, foco no texto. */
export default function Template1({ campaign, mailtoUrl }: TemplateProps) {
  const style = campaign.theme_color
    ? (themeShadesToCssVars(deriveThemeShades(campaign.theme_color)) as React.CSSProperties)
    : undefined;

  return (
    <main
      style={style}
      className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16"
    >
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        {campaign.title}
      </h1>
      <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-700">
        {campaign.manifest_text}
      </p>
      <div className="flex flex-wrap gap-3 pt-4">
        <TrackedMailtoLink
          campaignId={campaign.id}
          mailtoUrl={mailtoUrl}
          className="rounded-md bg-[var(--tc-base,#111827)] px-6 py-3 text-center font-medium text-white hover:bg-[var(--tc-dark,#374151)]"
        >
          Enviar e-mail agora
        </TrackedMailtoLink>
        {campaign.drive_link && (
          <a
            href={campaign.drive_link}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md border border-gray-300 px-6 py-3 text-center font-medium text-gray-800 hover:bg-gray-100"
          >
            Ver material de apoio
          </a>
        )}
      </div>
      <CopyFallbackButtons
        subject={campaign.subject}
        recipients={campaign.recipients}
        manifestText={campaign.manifest_text}
        sendMode={campaign.send_mode}
        className="mt-4 rounded-md border border-gray-200 bg-gray-50/50 p-4"
      />
    </main>
  );
}
