import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import CopyFallbackButtons from "@/components/CopyFallbackButtons";
import { deriveThemeShades, themeShadesToCssVars } from "@/lib/color";
import type { TemplateProps } from "./types";

/** Template 2: hero centralizado, fundo em degradê, chamada mais dramática. */
export default function Template2({ campaign, mailtoUrl }: TemplateProps) {
  const style = campaign.theme_color
    ? (themeShadesToCssVars(deriveThemeShades(campaign.theme_color)) as React.CSSProperties)
    : undefined;

  return (
    <main
      style={style}
      className="min-h-screen bg-gradient-to-br from-[var(--tc-dark,#3730a3)] via-[var(--tc-base,#4338ca)] to-[var(--tc-base,#4f46e5)] text-white"
    >
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {campaign.title}
        </h1>
        <p className="whitespace-pre-wrap text-lg leading-relaxed text-[var(--tc-lighter,#eef2ff)]">
          {campaign.subtitle ?? campaign.manifest_text}
        </p>
        <div className="w-full max-w-xl rounded-xl bg-white/10 p-4 text-sm text-[var(--tc-lighter,#eef2ff)]">
          <p className="mb-1 font-semibold text-white">Como participar</p>
          <p>
            Clique no botão abaixo, confira a mensagem que abrir no seu app de
            e-mail e toque em enviar.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="rounded-full bg-white px-8 py-3.5 text-lg font-semibold text-[var(--tc-dark,#3730a3)] shadow-lg hover:bg-[var(--tc-lighter,#eef2ff)]"
          >
            Enviar e-mail agora
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
        <CopyFallbackButtons
          subject={campaign.subject}
          recipients={campaign.recipients}
          manifestText={campaign.manifest_text}
          sendMode={campaign.send_mode}
          className="w-full max-w-xl rounded-xl bg-white/95 p-4 text-left shadow-lg"
        />
      </div>
    </main>
  );
}
