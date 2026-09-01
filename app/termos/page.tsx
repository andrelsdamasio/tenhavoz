export const metadata = {
  title: "Termos de Serviço — TenhaVoz",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-gray-700">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">
        Termos de Serviço
      </h1>

      <p className="mb-4">
        Ao usar o TenhaVoz, você concorda com os termos abaixo.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        O que o TenhaVoz faz
      </h2>
      <p className="mb-4">
        O TenhaVoz permite criar uma página pública com um botão que abre o
        aplicativo de e-mail do visitante com uma mensagem pré-preenchida
        (destinatários, assunto e corpo). O envio do e-mail é feito pelo
        próprio visitante, através da conta de e-mail dele — o TenhaVoz não
        envia e-mails em nome de ninguém.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Responsabilidade pelo conteúdo
      </h2>
      <p className="mb-4">
        Você é o único responsável pelo conteúdo do manifesto, pelos
        destinatários informados e pela veracidade das informações da sua
        campanha. É proibido usar o TenhaVoz para spam, assédio, discurso de
        ódio ou qualquer conteúdo ilegal.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Pagamento e publicação
      </h2>
      <p className="mb-4">
        A publicação de uma campanha (geração da página pública) depende da
        confirmação do pagamento pelo Stripe ou Mercado Pago. Reembolsos,
        quando aplicáveis, seguem a política de cada meio de pagamento e
        podem ser solicitados pelo contato abaixo.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Disponibilidade
      </h2>
      <p className="mb-4">
        O serviço é fornecido &ldquo;como está&rdquo;, sem garantia de disponibilidade
        ininterrupta. Podemos remover conteúdo que viole estes termos ou a
        lei, a qualquer momento.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold text-gray-900">
        Contato
      </h2>
      <p>
        Dúvidas sobre estes termos podem ser enviadas para{" "}
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
