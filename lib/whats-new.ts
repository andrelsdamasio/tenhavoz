/**
 * Novidades mostradas no pop-up. Para anunciar algo novo, ADICIONE uma entrada
 * no topo com um `id` novo (a data serve): quem ainda não viu esse id vê o
 * pop-up uma vez. O texto deve falar do que muda para a pessoa, sem jargão.
 */
export interface WhatsNewEntry {
  id: string;
  title: string;
  /** Quem deve ver: criadores de campanha, só o admin, ou todos. */
  audience: "all" | "admin";
  items: { title: string; text: string }[];
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "2026-11-08-instagram",
    title: "Comentários ao estilo Instagram",
    audience: "all",
    items: [
      {
        title: "Responda e edite",
        text: "Responda a qualquer comentário, edite o seu texto ou apague quando quiser.",
      },
      {
        title: "Compartilhe seu comentário",
        text: "Em “Editar”, envie seu comentário junto com o link da campanha pelo WhatsApp, Instagram ou outro app para chamar mais gente.",
      },
      {
        title: "Visual de cada tema",
        text: "Os comentários agora combinam com o modelo e a cor escolhidos para a campanha.",
      },
    ],
  },
  {
    id: "2026-11-08-curtidas",
    title: "Agora dá para comentar e curtir",
    audience: "all",
    items: [
      {
        title: "Curtir comentários",
        text: "Gostou de um comentário? Toque no coração para curtir. Você pode desfazer quando quiser.",
      },
      {
        title: "Comentários nas campanhas",
        text: "Quem tem conta pode deixar seu apoio ou opinião embaixo do manifesto. Quem criou a campanha pode apagar qualquer comentário, e é possível denunciar abusos.",
      },
    ],
  },
  {
    id: "2026-11-08",
    title: "O que há de novo no TenhaVoz",
    audience: "all",
    items: [
      {
        title: "Criar campanha em 4 passos",
        text: "Conteúdo, destinatários, visual e revisão, com a prévia da página ao lado. Seu rascunho é salvo sozinho.",
      },
      {
        title: "Teste antes de publicar",
        text: "No último passo, abra o e-mail exatamente como seus apoiadores vão ver, sem enviar nada.",
      },
      {
        title: "E-mails conferidos na hora",
        text: "Endereços com erro de digitação ficam em vermelho e podem ser removidos com um clique.",
      },
      {
        title: "Próximo passo em cada campanha",
        text: "O painel mostra o que fazer agora: pagar, compartilhar ou renovar.",
      },
    ],
  },
  {
    id: "2026-11-08-admin",
    title: "Novidades para o administrador",
    audience: "admin",
    items: [
      {
        title: "Busca e gestão de campanhas",
        text: "Encontre por título, link ou e-mail do dono. Em “Gerenciar” dá para estender o prazo e corrigir destinatários, com histórico de quem fez o quê.",
      },
      {
        title: "Moderação de comentários",
        text: "Comentários denunciados aparecem em “Comentários” no menu, com opção de apagar ou manter.",
      },
      {
        title: "Saúde do banco",
        text: "A visão geral agora testa o banco de verdade e avisa se ele não responder.",
      },
    ],
  },
];

/** Entradas que a pessoa pode ver, da mais nova para a mais antiga. */
export function entriesFor(isAdmin: boolean): WhatsNewEntry[] {
  return WHATS_NEW.filter((e) => e.audience === "all" || isAdmin);
}
