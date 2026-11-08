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

/** Template 8 (Passos): faixa de título curva + três cartões numerados que explicam o caminho. */
export default function Template8({ campaign, mailtoUrl }: TemplateProps) {
  return (
    <main style={themeStyle(campaign.theme_color)} className="min-h-screen bg-[var(--tc-lighter,#eef2ff)] pb-16">
      <header className="rounded-b-[3rem] bg-gradient-to-br from-[var(--tc-dark,#3730a3)] to-[var(--tc-base,#4f46e5)] px-6 pb-24 pt-16 text-center text-[var(--tc-on,#ffffff)]">
        <h1 className="animate-fade-in-up mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          {campaign.title}
        </h1>
        <p className="animate-fade-in-up mx-auto mt-5 max-w-2xl whitespace-pre-wrap text-lg leading-relaxed text-[var(--tc-on-soft,#eef2ff)] [animation-delay:120ms]">
          {campaign.subtitle ?? campaign.manifest_text}
        </p>
      </header>

      <div className="mx-auto -mt-14 max-w-4xl px-4">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step}
              style={{ animationDelay: `${240 + i * 120}ms` }}
              className="animate-fade-in-up rounded-2xl bg-white p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="text-5xl font-black text-[var(--tc-accent,#4338ca)]">{i + 1}</span>
              <p className="mt-3 text-gray-700">{step}</p>
            </li>
          ))}
        </ol>

        <div className="animate-fade-in-up mt-10 flex flex-col items-center gap-3 [animation-delay:640ms]">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="rounded-full bg-[var(--tc-base,#4338ca)] px-10 py-4 text-lg font-bold text-[var(--tc-on,#ffffff)] shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--tc-dark,#3730a3)] active:scale-[0.98]"
          >
            Enviar e-mail agora
          </TrackedMailtoLink>
          {campaign.drive_link && (
            <a
              href={campaign.drive_link}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-medium text-[var(--tc-accent,#3730a3)] underline underline-offset-4"
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
          className="animate-fade-in-up mx-auto mt-10 max-w-xl rounded-2xl bg-white p-5 shadow-md [animation-delay:760ms]"
        />
      </div>
    </main>
  );
}
