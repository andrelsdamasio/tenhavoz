export const metadata = {
  title: "Política de Privacidade — TenhaVoz",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-gray-700">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">
        Política de Privacidade
      </h1>

      <p className="mb-4">
        O TenhaVoz é uma plataforma para criação de campanhas de manifesto.
        Esta página descreve, de forma simples, quais dados coletamos e como
        são usados.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Dados que coletamos
      </h2>
      <ul className="mb-4 list-inside list-disc space-y-1">
        <li>
          <strong>Conta:</strong> e-mail (via cadastro direto ou login com
          Google) usado para autenticação e identificação do titular da
          campanha.
        </li>
        <li>
          <strong>Conteúdo da campanha:</strong> título, texto do manifesto,
          assunto, lista de destinatários e link de material de apoio que
          você mesmo informa ao criar uma campanha.
        </li>
        <li>
          <strong>Pagamento:</strong> processado diretamente pelo Stripe ou
          Mercado Pago — não armazenamos números de cartão ou dados
          financeiros em nossos servidores.
        </li>
        <li>
          <strong>Uso da página pública:</strong> contagem de visualizações e
          cliques no botão de envio de cada campanha, sem identificar
          individualmente quem visitou.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Como usamos os dados
      </h2>
      <p className="mb-4">
        Usamos os dados apenas para operar o serviço: autenticar seu acesso,
        publicar sua campanha na URL pública, processar o pagamento e
        mostrar estatísticas de engajamento da sua própria campanha.
        Não vendemos nem compartilhamos seus dados com terceiros para fins de
        marketing.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Envio de e-mails
      </h2>
      <p className="mb-4">
        O TenhaVoz não envia e-mails em massa. O botão da landing page abre o
        aplicativo de e-mail do próprio visitante, com a mensagem pronta —
        quem decide enviar (ou não) é sempre a pessoa que clicou, usando a
        conta de e-mail dela.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Login com Google
      </h2>
      <p className="mb-4">
        Ao entrar com sua conta Google, recebemos apenas seu nome, e-mail e
        foto de perfil públicos, para criar sua conta no TenhaVoz. Não
        acessamos outros dados da sua Conta Google.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Contato
      </h2>
      <p>
        Dúvidas sobre esta política podem ser enviadas para{" "}
        <a
          href="mailto:nexcel09@gmail.com"
          className="text-brand-600 hover:underline"
        >
          nexcel09@gmail.com
        </a>
        .
      </p>
    </main>
  );
}
