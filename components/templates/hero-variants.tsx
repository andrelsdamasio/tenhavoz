import TrackedMailtoLink from "@/components/TrackedMailtoLink";
import CopyFallbackButtons from "@/components/CopyFallbackButtons";
import { deriveThemeShades, themeShadesToCssVars } from "@/lib/color";
import type { TemplateProps } from "./types";

export type HeroVariant = "aurora" | "vidro" | "claro" | "noturno";

interface VariantStyle {
  main: string;
  backdrop?: React.ReactNode;
  panel: string;
  title: string;
  text: string;
  how: string;
  howTitle: string;
  primary: string;
  secondary: string;
  copy: string;
}

const BTN = "transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]";

const VARIANTS: Record<HeroVariant, VariantStyle> = {
  // Degradê do tema 2 + manchas de luz que flutuam devagar.
  aurora: {
    main: "relative overflow-hidden bg-gradient-to-br from-[var(--tc-dark,#3730a3)] via-[var(--tc-base,#4338ca)] to-[var(--tc-base,#4f46e5)] text-white",
    backdrop: (
      <>
        <div className="animate-blob pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        <div className="animate-blob pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[var(--tc-light,#e0e7ff)]/25 blur-3xl [animation-delay:4s]" />
      </>
    ),
    panel: "relative",
    title: "text-white",
    text: "text-[var(--tc-lighter,#eef2ff)]",
    how: "bg-white/10 text-[var(--tc-lighter,#eef2ff)]",
    howTitle: "text-white",
    primary: `rounded-full bg-white px-8 py-3.5 text-lg font-semibold text-[var(--tc-dark,#3730a3)] shadow-lg hover:bg-[var(--tc-lighter,#eef2ff)] ${BTN}`,
    secondary: `rounded-full border border-white/60 px-8 py-3.5 text-lg font-medium hover:bg-white/10 ${BTN}`,
    copy: "w-full max-w-xl rounded-xl bg-white/95 p-4 text-left text-gray-900 shadow-lg",
  },
  // Cartão de vidro (translúcido) sobre o degradê.
  vidro: {
    main: "relative overflow-hidden bg-gradient-to-tr from-[var(--tc-dark,#3730a3)] to-[var(--tc-base,#4f46e5)] text-white",
    backdrop: (
      <div className="animate-blob pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
    ),
    panel: "relative rounded-3xl border border-white/25 bg-white/10 p-8 shadow-2xl backdrop-blur-md sm:p-12",
    title: "text-white",
    text: "text-[var(--tc-lighter,#eef2ff)]",
    how: "border border-white/20 bg-white/10 text-[var(--tc-lighter,#eef2ff)]",
    howTitle: "text-white",
    primary: `rounded-full bg-white px-8 py-3.5 text-lg font-semibold text-[var(--tc-dark,#3730a3)] shadow-lg hover:bg-[var(--tc-lighter,#eef2ff)] ${BTN}`,
    secondary: `rounded-full border border-white/60 px-8 py-3.5 text-lg font-medium hover:bg-white/15 ${BTN}`,
    copy: "w-full rounded-xl bg-white/95 p-4 text-left text-gray-900 shadow-lg",
  },
  // Fundo claro, título e botão na cor do tema.
  claro: {
    main: "bg-gradient-to-b from-[var(--tc-lighter,#eef2ff)] to-[var(--tc-light,#e0e7ff)] text-gray-900",
    panel: "",
    title: "text-[var(--tc-dark,#3730a3)]",
    text: "text-gray-700",
    how: "border border-[var(--tc-base,#4338ca)]/15 bg-white text-gray-700 shadow-sm",
    howTitle: "text-[var(--tc-dark,#3730a3)]",
    primary: `rounded-full bg-[var(--tc-base,#4338ca)] px-8 py-3.5 text-lg font-semibold text-white shadow-lg hover:bg-[var(--tc-dark,#3730a3)] ${BTN}`,
    secondary: `rounded-full border border-[var(--tc-base,#4338ca)] px-8 py-3.5 text-lg font-medium text-[var(--tc-dark,#3730a3)] hover:bg-white ${BTN}`,
    copy: "w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-md",
  },
  // Quase preto, com brilho da cor do tema no topo.
  noturno: {
    main: "relative overflow-hidden bg-gray-950 text-white",
    backdrop: (
      <div className="animate-blob pointer-events-none absolute left-1/2 -top-40 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[var(--tc-base,#4f46e5)] opacity-40 blur-3xl" />
    ),
    panel: "relative",
    title: "text-white",
    text: "text-gray-300",
    how: "border border-white/10 bg-white/5 text-gray-300",
    howTitle: "text-white",
    primary: `rounded-full bg-[var(--tc-base,#4f46e5)] px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-[var(--tc-base,#4f46e5)]/40 hover:brightness-110 ${BTN}`,
    secondary: `rounded-full border border-white/30 px-8 py-3.5 text-lg font-medium hover:bg-white/10 ${BTN}`,
    copy: "w-full rounded-xl bg-white p-4 text-left text-gray-900 shadow-lg",
  },
};

/** Variações do tema 2 (hero centralizado, degradê, chamada dramática). */
export default function HeroVariant({
  campaign,
  mailtoUrl,
  variant,
}: TemplateProps & { variant: HeroVariant }) {
  const v = VARIANTS[variant];
  const style = campaign.theme_color
    ? (themeShadesToCssVars(deriveThemeShades(campaign.theme_color)) as React.CSSProperties)
    : undefined;

  return (
    <main style={style} className={`min-h-screen ${v.main}`}>
      {v.backdrop}
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className={`flex w-full flex-col items-center gap-8 ${v.panel}`}>
          <h1
            className={`animate-fade-in-up text-4xl font-extrabold tracking-tight sm:text-5xl ${v.title}`}
          >
            {campaign.title}
          </h1>
          <p
            className={`animate-fade-in-up whitespace-pre-wrap text-lg leading-relaxed [animation-delay:120ms] ${v.text}`}
          >
            {campaign.subtitle ?? campaign.manifest_text}
          </p>
          <div
            className={`animate-fade-in-up w-full max-w-xl rounded-xl p-4 text-sm [animation-delay:240ms] ${v.how}`}
          >
            <p className={`mb-1 font-semibold ${v.howTitle}`}>Como participar</p>
            <p>
              Clique no botão abaixo, confira a mensagem que abrir no seu app de
              e-mail e toque em enviar.
            </p>
          </div>
          <div className="animate-fade-in-up flex flex-col gap-3 [animation-delay:360ms] sm:flex-row">
            <TrackedMailtoLink
              campaignId={campaign.id}
              mailtoUrl={mailtoUrl}
              className={v.primary}
            >
              Enviar e-mail agora
            </TrackedMailtoLink>
            {campaign.drive_link && (
              <a
                href={campaign.drive_link}
                target="_blank"
                rel="noreferrer noopener"
                className={v.secondary}
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
            className={`animate-fade-in-up max-w-xl [animation-delay:480ms] ${v.copy}`}
          />
        </div>
      </div>
    </main>
  );
}
