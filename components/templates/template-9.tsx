import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import CopyFallbackButtons from "@/components/CopyFallbackButtons";
import { deriveThemeShades, themeShadesToCssVars } from "@/lib/color";
import type { TemplateProps } from "./types";

function themeStyle(color: string | null) {
  return color ? (themeShadesToCssVars(deriveThemeShades(color)) as React.CSSProperties) : undefined;
}

const STEPS = [
  "Clique no botão de enviar.",
  "Confira a mensagem que abrir no seu app de e-mail.",
  "Toque em enviar. Pronto!",
];

/** Template 9 (Neon): fundo escuro quadriculado, cartão com brilho e passos em estilo terminal. */
export default function Template9({ campaign, mailtoUrl }: TemplateProps) {
  return (
    <main
      style={themeStyle(campaign.theme_color)}
      className="min-h-screen bg-gray-950 px-4 py-14 text-gray-100 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]"
    >
      <div className="animate-fade-in mx-auto max-w-2xl rounded-2xl border border-[var(--tc-base,#4f46e5)]/60 bg-gray-900/85 p-8 shadow-[0_0_70px_-12px_var(--tc-base,#4f46e5)] backdrop-blur">
        <p className="font-mono text-sm text-[var(--tc-light,#e0e7ff)]">
          {"// participe"}
          <span className="animate-pulse">_</span>
        </p>
        <h1 className="mt-3 bg-gradient-to-r from-white to-[var(--tc-light,#e0e7ff)] bg-clip-text text-4xl font-bold leading-tight tracking-tight text-transparent sm:text-5xl">
          {campaign.title}
        </h1>
        <p className="mt-5 whitespace-pre-wrap leading-relaxed text-gray-300">
          {campaign.subtitle ?? campaign.manifest_text}
        </p>

        <ul className="mt-6 space-y-1 rounded-lg bg-black/40 p-4 font-mono text-sm text-gray-300">
          {STEPS.map((step) => (
            <li key={step}>
              <span className="text-[var(--tc-light,#e0e7ff)]">&gt;</span> {step}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="animate-glow rounded-lg bg-[var(--tc-base,#4f46e5)] px-8 py-3.5 text-center font-mono text-base font-bold uppercase tracking-wide text-[var(--tc-on,#ffffff)] transition duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            Enviar e-mail agora
          </TrackedMailtoLink>
          {campaign.drive_link && (
            <a
              href={campaign.drive_link}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-white/25 px-8 py-3.5 text-center font-mono text-base uppercase tracking-wide hover:bg-white/10"
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
          className="mt-6 rounded-xl bg-white p-4 text-left text-gray-900"
        />
      </div>
    </main>
  );
}
