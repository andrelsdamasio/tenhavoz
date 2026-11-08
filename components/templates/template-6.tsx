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

/** Template 6 (Dividido): tela em duas metades — título gigante à esquerda, ação à direita. */
export default function Template6({ campaign, mailtoUrl }: TemplateProps) {
  return (
    <main style={themeStyle(campaign.theme_color)} className="grid min-h-screen lg:grid-cols-2">
      <section className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[var(--tc-dark,#3730a3)] to-[var(--tc-base,#4f46e5)] px-8 py-16 text-[var(--tc-on,#ffffff)] lg:px-16">
        <div className="animate-blob pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <span className="animate-fade-in-up relative mb-6 w-fit rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-widest">
          Participe
        </span>
        <h1 className="animate-fade-in-up relative text-5xl font-black leading-[1.05] tracking-tight [animation-delay:100ms] lg:text-6xl">
          {campaign.title}
        </h1>
        <p className="animate-fade-in-up relative mt-6 max-w-lg whitespace-pre-wrap text-lg leading-relaxed text-[var(--tc-on-soft,#eef2ff)] [animation-delay:220ms]">
          {campaign.subtitle ?? campaign.manifest_text}
        </p>
      </section>

      <section className="flex flex-col justify-center gap-8 bg-white px-8 py-16 lg:px-16">
        <ol className="animate-fade-in-up space-y-4 [animation-delay:300ms]">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tc-light,#e0e7ff)] font-bold text-[var(--tc-accent,#3730a3)]">
                {i + 1}
              </span>
              <span className="text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
        <div className="animate-fade-in-up flex flex-col gap-3 [animation-delay:400ms]">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="rounded-xl bg-[var(--tc-base,#4338ca)] px-8 py-4 text-center text-lg font-bold text-[var(--tc-on,#ffffff)] shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--tc-dark,#3730a3)] active:scale-[0.98]"
          >
            Enviar e-mail agora
          </TrackedMailtoLink>
          {campaign.drive_link && (
            <a
              href={campaign.drive_link}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-xl border-2 border-[var(--tc-base,#4338ca)] px-8 py-3 text-center font-semibold text-[var(--tc-accent,#3730a3)] hover:bg-[var(--tc-lighter,#eef2ff)]"
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
          className="animate-fade-in-up rounded-xl border border-gray-200 bg-gray-50 p-4 [animation-delay:500ms]"
        />
      </section>
    </main>
  );
}
