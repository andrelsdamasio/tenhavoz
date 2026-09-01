import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import CopyFallbackButtons from "@/components/CopyFallbackButtons";
import { deriveThemeShades, themeShadesToCssVars } from "@/lib/color";
import type { TemplateProps } from "./types";

/**
 * Template 5: painel de status ("checklist"), com selos de prontidão e um
 * "Como funciona" em 3 passos. Inspirado em outra campanha real do cliente
 * (envio de manifesto a órgãos públicos).
 */
export default function Template5({ campaign, mailtoUrl }: TemplateProps) {
  const style = campaign.theme_color
    ? (themeShadesToCssVars(deriveThemeShades(campaign.theme_color)) as React.CSSProperties)
    : undefined;

  return (
    <main
      style={style}
      className="min-h-screen bg-gradient-to-b from-[var(--tc-lighter,#eef2ff)] to-white px-4 py-12"
    >
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-[var(--tc-light,#e0e7ff)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--tc-dark,#3730a3)]">
            Manifesto público
          </span>
        </div>
        <h1 className="mb-3 text-center text-3xl font-extrabold text-gray-900 sm:text-4xl">
          {campaign.title}
        </h1>
        <p className="mb-6 whitespace-pre-wrap text-center leading-relaxed text-gray-600">
          {campaign.subtitle ?? campaign.manifest_text}
        </p>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <Badge>✓ {campaign.recipients.length} destinatário(s) configurado(s)</Badge>
          <Badge>✓ Assunto preenchido</Badge>
          <Badge>✓ Manifesto pronto</Badge>
        </div>

        <TrackedMailtoLink
          campaignId={campaign.id}
          mailtoUrl={mailtoUrl}
          className="mb-3 block w-full rounded-md bg-[var(--tc-base,#4338ca)] px-6 py-3.5 text-center text-lg font-semibold text-white hover:bg-[var(--tc-dark,#3730a3)]"
        >
          Enviar e-mail agora
        </TrackedMailtoLink>

        {campaign.drive_link && (
          <a
            href={campaign.drive_link}
            target="_blank"
            rel="noreferrer noopener"
            className="mb-6 block w-full rounded-md border border-gray-300 px-6 py-3 text-center font-medium text-gray-800 hover:bg-gray-50"
          >
            Ver material de apoio
          </a>
        )}

        <div className="mb-6 grid grid-cols-3 gap-3 border-t border-gray-100 pt-6 text-center text-xs text-gray-600">
          <Step number={1} text="Clique no botão acima" />
          <Step number={2} text="Confira os dados no seu app de e-mail" />
          <Step number={3} text="Clique em enviar" />
        </div>

        <CopyFallbackButtons
          subject={campaign.subject}
          recipients={campaign.recipients}
          manifestText={campaign.manifest_text}
          sendMode={campaign.send_mode}
          className="border-t border-gray-100 pt-6"
        />
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
      {children}
    </span>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--tc-base,#4338ca)] text-xs font-bold text-white">
        {number}
      </span>
      <span>{text}</span>
    </div>
  );
}
