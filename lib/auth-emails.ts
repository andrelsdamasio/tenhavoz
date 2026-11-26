import { emailShell } from "@/lib/email-template";

/** E-mail de redefinição de senha, no visual do TenhaVoz. */
export function recoveryEmail(input: { siteUrl: string; link: string }) {
  return {
    subject: "Redefinir sua senha no TenhaVoz",
    text:
      "Recebemos um pedido para redefinir a senha da sua conta no TenhaVoz.\n\n" +
      `Abra este link para criar uma nova senha (vale por 1 hora):\n${input.link}\n\n` +
      "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
    html: emailShell({
      siteUrl: input.siteUrl,
      heading: "Redefinir sua senha",
      intro: "Recebemos um pedido para redefinir a senha da sua conta no TenhaVoz. Clique no botão para criar uma nova senha.",
      note: "O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
      cta: { label: "Criar nova senha", url: input.link },
    }),
  };
}

/** Boas-vindas depois do cadastro por e-mail. */
export function welcomeEmail(input: { siteUrl: string }) {
  const url = `${input.siteUrl}/dashboard`;
  return {
    subject: "Bem-vindo ao TenhaVoz",
    text: `Sua conta no TenhaVoz foi criada.\n\nEntre para criar sua primeira campanha: ${url}`,
    html: emailShell({
      siteUrl: input.siteUrl,
      heading: "Bem-vindo ao TenhaVoz!",
      intro: "Sua conta foi criada. Agora você pode criar uma campanha de e-mail ou uma arrecadação e compartilhar com quem importa.",
      note: "Se você não criou esta conta, responda este e-mail e a gente cuida disso.",
      cta: { label: "Ir para minha conta", url },
    }),
  };
}
