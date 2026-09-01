import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import CopyFallbackButtons from "@/components/CopyFallbackButtons";
import { deriveThemeShades, themeShadesToCssVars } from "@/lib/color";
import type { TemplateProps } from "./types";

/**
 * Template 4: institucional, com seções em caixas e passo a passo numerado.
 * Inspirado em campanhas de mobilização real do cliente (audiências
 * públicas, ofícios a autoridades) — mais formal que os templates 1-3.
 */
export default function Template4({ campaign, mailtoUrl }: TemplateProps) {
  const style = campaign.theme_color
    ? (themeShadesToCssVars(deriveThemeShades(campaign.theme_color)) as React.CSSProperties)
    : undefined;

  return (
    <main style={style} className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border-2 border-[var(--tc-base,#4338ca)] bg-white p-8">
        <h1 className="mb-3 text-3xl font-extrabold text-[var(--tc-dark,#3730a3)] sm:text-4xl">
          {campaign.title}
        </h1>
        <p className="mb-6 whitespace-pre-wrap leading-relaxed text-gray-700">
          {campaign.manifest_text}
        </p>

        <div className="mb-4 rounded-md bg-amber-50 p-4">
          <h2 className="mb-2 font-semibold text-amber-900">Como participar</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-amber-900">
            <li>
              Clique em <strong>Abrir e-mail pronto</strong>.
            </li>
            <li>Seu aplicativo de e-mail abrirá automaticamente.</li>
            <li>Confira a mensagem.</li>
            <li>
              Clique em <strong>Enviar</strong>.
            </li>
            <li>Se não funcionar, utilize os campos de cópia abaixo.</li>
          </ol>
        </div>

        <div className="mb-6 rounded-md bg-gray-50 p-4 text-sm text-gray-600">
          Os destinatários estão em{" "}
          {campaign.send_mode === "bcc" ? "cópia oculta (Cco)" : "cópia normal (Para)"},
          garantindo privacidade entre os envolvidos.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="flex-1 rounded-md bg-[var(--tc-base,#4338ca)] px-6 py-3 text-center font-semibold text-white hover:bg-[var(--tc-dark,#3730a3)]"
          >
            Abrir e-mail pronto
          </TrackedMailtoLink>
          {campaign.drive_link && (
            <a
              href={campaign.drive_link}
              target="_blank"
              rel="noreferrer noopener"
              className="flex-1 rounded-md border border-gray-300 px-6 py-3 text-center font-medium text-gray-800 hover:bg-gray-100"
            >
              Documentos de apoio
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
