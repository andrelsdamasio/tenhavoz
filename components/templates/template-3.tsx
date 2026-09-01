import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import CopyFallbackButtons from "@/components/CopyFallbackButtons";
import { deriveThemeShades, themeShadesToCssVars } from "@/lib/color";
import type { TemplateProps } from "./types";

/** Template 3: layout tipo "carta" em cartão, com assinatura formal. */
export default function Template3({ campaign, mailtoUrl }: TemplateProps) {
  const style = campaign.theme_color
    ? (themeShadesToCssVars(deriveThemeShades(campaign.theme_color)) as React.CSSProperties)
    : undefined;

  return (
    <main style={style} className="min-h-screen bg-gray-100 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--tc-base,#4338ca)]">
          Manifesto público
        </p>
        <h1 className="mb-6 text-3xl font-bold text-gray-900 sm:text-4xl">
          {campaign.title}
        </h1>
        <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
          {campaign.subtitle ?? campaign.manifest_text}
        </p>
        <div className="mt-6 rounded-md bg-gray-50 p-4 text-sm text-gray-600">
          <p className="mb-2 font-medium text-gray-800">Como participar</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              Clique em <strong>Enviar e-mail agora</strong>.
            </li>
            <li>Confira a mensagem que abrir no seu aplicativo de e-mail.</li>
            <li>Clique em enviar.</li>
          </ol>
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="flex-1 rounded-md bg-[var(--tc-base,#4338ca)] px-6 py-3 text-center font-medium text-white hover:bg-[var(--tc-dark,#3730a3)]"
          >
            Enviar e-mail agora
          </TrackedMailtoLink>
          {campaign.drive_link && (
            <a
              href={campaign.drive_link}
              target="_blank"
              rel="noreferrer noopener"
              className="flex-1 rounded-md border border-gray-300 px-6 py-3 text-center font-medium text-gray-800 hover:bg-gray-50"
            >
              Documentos
            </a>
          )}
        </div>
        <CopyFallbackButtons
          subject={campaign.subject}
          recipients={campaign.recipients}
          manifestText={campaign.manifest_text}
          sendMode={campaign.send_mode}
          className="mt-6 border-t border-gray-100 pt-6"
        />
      </div>
    </main>
  );
}
