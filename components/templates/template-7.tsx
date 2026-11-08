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

/** Template 7 (Pôster): cartaz chamativo — cor sólida, letras enormes, botões "de papelão" com sombra dura. */
export default function Template7({ campaign, mailtoUrl }: TemplateProps) {
  const hard = "border-4 border-black shadow-[8px_8px_0_#000]";
  return (
    <main
      style={themeStyle(campaign.theme_color)}
      className="min-h-screen bg-[var(--tc-base,#4338ca)] px-5 py-14 text-[var(--tc-on,#ffffff)]"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <span className="animate-fade-in-up w-fit -rotate-2 bg-white px-3 py-1 text-sm font-black uppercase tracking-widest text-black">
          Ação coletiva
        </span>
        <h1 className="animate-fade-in-up text-5xl font-black uppercase leading-[0.95] tracking-tighter [animation-delay:100ms] sm:text-7xl">
          {campaign.title}
        </h1>
        <p
          className={`animate-fade-in-up whitespace-pre-wrap bg-white p-6 text-lg font-medium leading-relaxed text-black [animation-delay:220ms] ${hard}`}
        >
          {campaign.subtitle ?? campaign.manifest_text}
        </p>
        <div className="animate-fade-in-up flex flex-col gap-4 [animation-delay:340ms] sm:flex-row">
          <TrackedMailtoLink
            campaignId={campaign.id}
            mailtoUrl={mailtoUrl}
            className="border-4 border-black bg-white px-8 py-4 text-center text-xl font-black uppercase text-black shadow-[6px_6px_0_#000] transition duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_#000] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
          >
            Enviar e-mail agora
          </TrackedMailtoLink>
          {campaign.drive_link && (
            <a
              href={campaign.drive_link}
              target="_blank"
              rel="noreferrer noopener"
              className="border-4 border-black px-8 py-4 text-center text-xl font-black uppercase transition duration-150 hover:bg-black hover:text-white"
            >
              Material de apoio
            </a>
          )}
        </div>
        <p className="animate-fade-in-up text-sm font-bold uppercase tracking-wide [animation-delay:420ms]">
          1. Clique &nbsp;→&nbsp; 2. Confira &nbsp;→&nbsp; 3. Envie
        </p>
        <CopyFallbackButtons
          subject={campaign.subject}
          recipients={campaign.recipients}
          manifestText={campaign.manifest_text}
          sendMode={campaign.send_mode}
          className={`animate-fade-in-up bg-white p-5 text-black [animation-delay:500ms] ${hard}`}
        />
      </div>
    </main>
  );
}
