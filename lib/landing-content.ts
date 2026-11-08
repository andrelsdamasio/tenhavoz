/** Conteúdo da página inicial (separado para poder ser testado e reaproveitado no SEO). */

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Preciso saber programar ou ter um site?",
    a: "Não. Você escreve o texto, informa os e-mails de destino e escolhe um visual. A página com o seu link é criada para você.",
  },
  {
    q: "Quem apoia a causa precisa criar conta?",
    a: "Não. A pessoa abre o seu link, aperta o botão e o app de e-mail dela abre com a mensagem pronta. É só enviar.",
  },
  {
    q: "Como o e-mail é enviado?",
    a: "Pelo próprio app de e-mail de quem apoia (Gmail, Outlook, o app do celular...). O TenhaVoz não envia nada em nome de ninguém e não guarda o e-mail de quem participa.",
  },
  {
    q: "Quanto tempo a página fica no ar?",
    a: "Você escolhe no pagamento: 72 horas ou 7 dias. Quando o prazo estiver acabando, avisamos você por e-mail, e é possível renovar a campanha com um clique.",
  },
  {
    q: "Posso mudar o texto depois de publicar?",
    a: "Sim, durante as primeiras 24 horas depois de criada você pode editar o texto, os destinatários e o visual.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "O pagamento é único por campanha e feito com segurança por Pix ou cartão. A página é liberada assim que o pagamento é confirmado.",
  },
  {
    q: "Consigo ver se a campanha está funcionando?",
    a: "Sim. No seu painel você acompanha quantas pessoas viram a página, quantas clicaram no botão de envio e um gráfico dos últimos dias.",
  },
];

export const USE_CASES: { title: string; text: string }[] = [
  { title: "Associações e moradores", text: "Cobre a prefeitura por uma rua, uma praça ou um serviço público." },
  { title: "Sindicatos e categorias", text: "Reúna a categoria para pressionar parlamentares sobre um projeto de lei." },
  { title: "ONGs e coletivos", text: "Transforme uma causa em centenas de mensagens enviadas em poucos dias." },
  { title: "Estudantes e escolas", text: "Peça melhorias à diretoria, à secretaria de educação ou à reitoria." },
];

export const BENEFITS: { title: string; text: string }[] = [
  { title: "Um clique para participar", text: "Quem apoia não cria conta nem preenche formulário: o e-mail já vem escrito." },
  { title: "Funciona no celular", text: "A página e o botão de envio foram pensados para quem recebe o link no WhatsApp." },
  { title: "Acompanhe o alcance", text: "Veja visitas, cliques e o ritmo da campanha dia a dia no seu painel." },
  { title: "Com a cara da sua causa", text: "Vários visuais e qualquer cor, com prévia ao vivo enquanto você escreve." },
];
