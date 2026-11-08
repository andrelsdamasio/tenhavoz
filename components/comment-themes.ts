import type { TemplateId } from "@/lib/types";

/**
 * Visual dos comentários em cada tema da página. As classes ficam aqui (dentro
 * de components/) para o Tailwind enxergá-las, e usam as variáveis --tc-* do
 * tema, então acompanham a cor escolhida para a campanha.
 */
export interface CommentTheme {
  section: string;
  card: string;
  title: string;
  titlePrefix: string;
  count: string;
  name: string;
  body: string;
  muted: string;
  faint: string;
  divider: string;
  input: string;
  panel: string;
  panelInner: string;
  primary: string;
  outline: string;
  prompt: string;
  promptLink: string;
  heartOff: string;
  heartOn: string;
  danger: string;
  counter: string;
  /** "palette": cores variadas por pessoa. "accent": todos na cor do tema. */
  avatarMode: "palette" | "accent";
  avatarShape: string;
  avatarAccent: string;
}

const CLASSICO: CommentTheme = {
  section: "bg-white px-4 py-10",
  card: "mx-auto max-w-2xl border-t border-gray-200 pt-6",
  title: "text-lg font-semibold text-gray-900",
  titlePrefix: "",
  count: "text-gray-400",
  name: "font-semibold text-gray-900",
  body: "text-gray-800",
  muted: "text-gray-500 hover:text-gray-800",
  faint: "text-gray-400",
  divider: "divide-gray-100",
  input: "rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
  panel: "border-gray-200 bg-gray-50",
  panelInner: "bg-white text-gray-700",
  primary: "rounded-md bg-[var(--tc-base,#111827)] text-[var(--tc-on,#ffffff)] hover:bg-[var(--tc-dark,#374151)]",
  outline: "border-gray-300 text-gray-700 hover:bg-gray-50",
  prompt: "rounded-md bg-gray-50 text-gray-700",
  promptLink: "text-gray-900",
  heartOff: "text-gray-500 hover:text-gray-800",
  heartOn: "text-red-500",
  danger: "text-red-600",
  counter: "text-gray-500",
  avatarMode: "palette",
  avatarShape: "rounded-full",
  avatarAccent: "",
};

const THEMES: Record<TemplateId, CommentTheme> = {
  1: CLASSICO,

  // Degradê: o mesmo degradê da página, com vidro fosco por cima.
  2: {
    ...CLASSICO,
    section:
      "bg-gradient-to-br from-[var(--tc-dark,#3730a3)] via-[var(--tc-base,#4338ca)] to-[var(--tc-base,#4f46e5)] px-4 py-10 text-[var(--tc-on,#ffffff)]",
    card: "mx-auto max-w-2xl rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur",
    title: "text-lg font-semibold",
    count: "opacity-60",
    name: "font-semibold",
    body: "opacity-95",
    muted: "opacity-80 hover:opacity-100",
    faint: "opacity-60",
    divider: "divide-white/15",
    input: "rounded-xl border border-white/30 bg-white/15 text-[var(--tc-on,#ffffff)] placeholder:text-white/60",
    panel: "border-white/20 bg-white/10",
    panelInner: "bg-white/15",
    primary: "rounded-full bg-white text-[var(--tc-on-text,#3730a3)] hover:bg-white/90",
    outline: "border-white/40 hover:bg-white/10",
    prompt: "rounded-xl bg-white/10",
    promptLink: "text-white",
    heartOff: "text-white/70 hover:text-white",
    heartOn: "text-rose-300",
    danger: "text-rose-200",
    counter: "opacity-70",
    avatarMode: "accent",
    avatarAccent: "bg-white/25 text-[var(--tc-on,#ffffff)]",
  },

  // Minimalista: cartão branco discreto, só um toque da cor.
  3: {
    ...CLASSICO,
    section: "bg-gray-100 px-4 py-10",
    card: "mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm",
    title: "text-xs font-semibold uppercase tracking-wide text-[var(--tc-accent,#0d9488)]",
    primary: "rounded-md bg-[var(--tc-base,#0d9488)] text-[var(--tc-on,#ffffff)] hover:bg-[var(--tc-dark,#0f766e)]",
    heartOn: "text-[var(--tc-accent,#0d9488)]",
    avatarMode: "accent",
    avatarShape: "rounded-md",
    avatarAccent: "bg-[var(--tc-light,#ccfbf1)] text-[var(--tc-accent,#0f766e)]",
  },

  // Destaque: moldura grossa na cor do tema.
  4: {
    ...CLASSICO,
    section: "bg-gray-50 px-4 py-10",
    card: "mx-auto max-w-2xl rounded-xl border-2 border-[var(--tc-base,#4338ca)] bg-white p-6",
    title: "text-2xl font-extrabold text-[var(--tc-accent,#3730a3)]",
    name: "font-bold text-gray-900",
    primary: "rounded-lg bg-[var(--tc-base,#4338ca)] font-bold text-[var(--tc-on,#ffffff)] hover:bg-[var(--tc-dark,#3730a3)]",
    heartOn: "text-[var(--tc-accent,#3730a3)]",
    avatarMode: "accent",
    avatarAccent: "bg-[var(--tc-base,#4338ca)] text-[var(--tc-on,#ffffff)]",
  },

  // Completo: fundo suave, cartão arredondado e botões em pílula.
  5: {
    ...CLASSICO,
    section: "bg-gradient-to-b from-white to-[var(--tc-lighter,#eef2ff)] px-4 py-10",
    card: "mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm",
    title: "text-center text-lg font-bold text-gray-900",
    input: "rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
    primary: "rounded-full bg-[var(--tc-base,#4338ca)] text-[var(--tc-on,#ffffff)] hover:bg-[var(--tc-dark,#3730a3)]",
    heartOn: "text-[var(--tc-accent,#3730a3)]",
    avatarMode: "accent",
    avatarAccent: "bg-[var(--tc-light,#e0e7ff)] text-[var(--tc-accent,#3730a3)]",
  },

  // Dividido: faixa em degradê com um cartão branco bem arredondado.
  6: {
    ...CLASSICO,
    section:
      "bg-gradient-to-br from-[var(--tc-dark,#3730a3)] to-[var(--tc-base,#4f46e5)] px-4 py-12",
    card: "mx-auto max-w-2xl rounded-3xl bg-white p-7 shadow-2xl",
    title: "text-xl font-black tracking-tight text-gray-900",
    name: "font-bold text-gray-900",
    input: "rounded-2xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
    primary: "rounded-full bg-[var(--tc-base,#4f46e5)] font-bold text-[var(--tc-on,#ffffff)] hover:bg-[var(--tc-dark,#3730a3)]",
    heartOn: "text-[var(--tc-accent,#3730a3)]",
    avatarMode: "accent",
    avatarAccent:
      "bg-gradient-to-br from-[var(--tc-dark,#3730a3)] to-[var(--tc-base,#4f46e5)] text-[var(--tc-on,#ffffff)]",
  },

  // Pôster: caixas pretas grossas, sombra dura, tudo em maiúsculas.
  7: {
    ...CLASSICO,
    section: "bg-[var(--tc-base,#4338ca)] px-5 py-12",
    card: "mx-auto max-w-2xl border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]",
    title: "text-2xl font-black uppercase tracking-tighter text-black",
    count: "text-gray-500",
    name: "font-black uppercase text-black",
    body: "text-black",
    muted: "font-bold text-black hover:underline",
    faint: "text-gray-600",
    divider: "divide-black/20",
    input: "rounded-none border-4 border-black bg-white text-black placeholder:text-gray-500",
    panel: "border-4 border-black bg-gray-100",
    panelInner: "border-2 border-black bg-white text-black",
    primary:
      "rounded-none border-2 border-black bg-black font-black uppercase text-white shadow-[3px_3px_0_#6b7280] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#6b7280]",
    outline: "rounded-none border-2 border-black font-bold text-black hover:bg-gray-100",
    prompt: "border-2 border-black bg-white font-bold text-black",
    promptLink: "text-black",
    heartOff: "text-black hover:text-red-600",
    heartOn: "text-red-600",
    danger: "text-red-700",
    counter: "font-bold text-black",
    avatarMode: "accent",
    avatarShape: "rounded-none border-2 border-black",
    avatarAccent: "bg-[var(--tc-base,#4338ca)] font-black text-[var(--tc-on,#ffffff)]",
  },

  // Passos: cartão generoso, cantos bem redondos e degradê nos detalhes.
  8: {
    ...CLASSICO,
    section: "bg-[var(--tc-lighter,#eef2ff)] px-4 py-10",
    card: "mx-auto max-w-2xl overflow-hidden rounded-[2rem] bg-white p-7 shadow-lg",
    title: "text-lg font-extrabold text-[var(--tc-accent,#3730a3)]",
    input: "rounded-2xl border border-gray-200 bg-[var(--tc-lighter,#eef2ff)] text-gray-900 placeholder:text-gray-500",
    primary:
      "rounded-full bg-gradient-to-br from-[var(--tc-dark,#3730a3)] to-[var(--tc-base,#4f46e5)] text-[var(--tc-on,#ffffff)] hover:opacity-90",
    heartOn: "text-[var(--tc-accent,#3730a3)]",
    avatarMode: "accent",
    avatarAccent:
      "bg-gradient-to-br from-[var(--tc-dark,#3730a3)] to-[var(--tc-base,#4f46e5)] text-[var(--tc-on,#ffffff)]",
  },

  // Neon: painel escuro com brilho na cor do tema e fonte de terminal.
  9: {
    ...CLASSICO,
    section:
      "bg-gray-950 px-4 py-12 text-gray-100 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]",
    card:
      "mx-auto max-w-2xl rounded-2xl border border-[var(--tc-base,#4f46e5)]/60 bg-gray-900/85 p-6 shadow-[0_0_60px_-14px_var(--tc-base,#4f46e5)] backdrop-blur",
    title: "font-mono text-sm text-[var(--tc-light,#e0e7ff)]",
    titlePrefix: "> ",
    count: "text-gray-500",
    name: "font-mono font-semibold text-white",
    body: "text-gray-200",
    muted: "font-mono text-[var(--tc-light,#c7d2fe)] hover:text-white",
    faint: "font-mono text-gray-500",
    divider: "divide-white/10",
    input:
      "rounded-md border border-[var(--tc-base,#4f46e5)]/50 bg-gray-950 font-mono text-gray-100 placeholder:text-gray-500",
    panel: "border-white/10 bg-white/5",
    panelInner: "bg-gray-950 text-gray-300",
    primary:
      "rounded-md bg-[var(--tc-base,#4f46e5)] font-mono text-[var(--tc-on,#ffffff)] shadow-[0_0_20px_-4px_var(--tc-base,#4f46e5)] hover:opacity-90",
    outline: "border-white/20 text-gray-200 hover:bg-white/10",
    prompt: "rounded-md bg-white/5 text-gray-200",
    promptLink: "text-white",
    heartOff: "text-gray-400 hover:text-white",
    heartOn: "text-pink-400",
    danger: "text-red-400",
    counter: "font-mono text-gray-400",
    avatarMode: "accent",
    avatarShape: "rounded-md border border-[var(--tc-base,#4f46e5)]",
    avatarAccent: "bg-gray-950 font-mono text-[var(--tc-light,#e0e7ff)]",
  },
};

export function getCommentTheme(templateId: TemplateId): CommentTheme {
  return THEMES[templateId] ?? CLASSICO;
}
