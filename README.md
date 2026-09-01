# Painéis de Manifestação

SaaS de ação coletiva: o cliente paga, cria uma campanha e recebe uma landing
page pública com um botão que abre o app de e-mail do visitante (`mailto:`)
com destinatários, assunto e corpo já preenchidos. Não há envio de e-mail via
SMTP próprio — tudo acontece no cliente de e-mail de quem clica.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind, Supabase (Postgres + Auth),
Stripe e Mercado Pago para pagamento via webhooks, deploy na Vercel.

## A peça mais sensível: `lib/mailto.ts`

Links `mailto:` truncam por volta de 1800–2000 caracteres em vários clientes
(Outlook é o mais restritivo). [`lib/mailto.ts`](lib/mailto.ts) centraliza:

- montagem da URL com `to=` ou `bcc=` conforme o modo de envio;
- normalização de quebras de linha do corpo para CRLF (`\r\n`) — sem isso o
  Outlook desktop renderiza o manifesto inteiro em uma linha só;
- cálculo do tamanho **na URL já codificada** (acentos/caracteres especiais
  viram `%XX` e são a causa mais comum de estouro do limite);
- avisos não bloqueantes (`warnings[]`) para limite excedido, e-mail inválido
  ou lista de destinatários vazia.

Testes em [`lib/mailto.test.ts`](lib/mailto.test.ts) — rode isolado com:

```bash
npm test
```

O contador de caracteres em tempo real do formulário de criação
([`components/CampaignForm.tsx`](components/CampaignForm.tsx)) usa essa mesma
função para mostrar exatamente a URL que vai para a landing page.

## Setup local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto no [Supabase](https://supabase.com) e rode a migration em
   `supabase/migrations/0001_init.sql` (SQL Editor do painel, ou
   `supabase db push` via CLI). Ela cria as tabelas `users`, `campaigns`,
   `payments`, as RLS policies e o gatilho que popula `public.users` no
   cadastro.

3. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
     `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API no Supabase.
   - `STRIPE_SECRET_KEY` — Dashboard Stripe → Developers → API keys.
   - `STRIPE_WEBHOOK_SECRET` — criado ao registrar o endpoint de webhook (veja
     abaixo) ou gerado pelo `stripe listen` em dev.
   - `MERCADOPAGO_ACCESS_TOKEN` — Suas integrações → Credenciais.
   - `MERCADOPAGO_WEBHOOK_SECRET` — Suas integrações → Webhooks → chave
     secreta usada para validar o header `x-signature`.

4. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

## Webhooks em desenvolvimento

- **Stripe**: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
  imprime um `whsec_...` — use como `STRIPE_WEBHOOK_SECRET`.
- **Mercado Pago**: não tem CLI equivalente; use um túnel (ngrok/Cloudflare
  Tunnel) apontando para `localhost:3000` e cadastre
  `https://<túnel>/api/webhooks/mercadopago` como notification URL na
  integração de teste.

## Fluxo implementado

1. Cliente cria conta (`/signup`) e loga (`/login`) via Supabase Auth.
2. `/dashboard/new` — formulário de campanha (título, manifesto, assunto,
   destinatários, modo Bcc/To, link do Drive opcional, template 1/2/3) com
   contador de caracteres do mailto em tempo real. Salva como `draft`.
3. `/dashboard/checkout?campaignId=...` — cria uma Stripe Checkout Session ou
   uma Preference do Mercado Pago e redireciona para o checkout hospedado.
4. `app/api/webhooks/stripe` e `app/api/webhooks/mercadopago` validam a
   assinatura do provedor, gravam o `payment` (idempotente via
   `upsert` em `(provider, provider_payment_id)`) e, só então, chamam
   `publishCampaignAfterConfirmedPayment` — **único** lugar do código que
   marca uma campanha como `published` e gera o `slug`. Essa é a regra de
   negócio central do projeto.
5. `app/p/[slug]` — rota dinâmica com `revalidate = 60` (ISR): busca a
   campanha publicada com um client Supabase anônimo (sem `cookies()`, para
   não tirar a rota do cache), monta a URL mailto e renderiza o template
   escolhido. O link do Drive aparece como botão separado, fora do corpo do
   e-mail.

## Antes de ir para produção

- **Testar o `mailto:` gerado em Gmail (app e web), Outlook e Apple Mail**
  com destinatários, assunto e corpo reais — checklist ainda não automatizado
  neste MVP, precisa ser manual.
- Revisar o preço em `CAMPAIGN_PRICE_BRL_CENTS` e o texto de cada template.
- Registrar os webhooks de produção nos dashboards do Stripe e do Mercado
  Pago apontando para `https://<seu-domínio>/api/webhooks/{stripe,mercadopago}`.
- Confirmar que a RLS do Supabase está ativa (a migration já habilita) antes
  de sair do modo de desenvolvimento.

## Deploy

Deploy padrão na Vercel: conectar o repositório, configurar as mesmas
variáveis de `.env.example` no painel do projeto e apontar
`NEXT_PUBLIC_SITE_URL` para o domínio final antes de gerar os webhooks de
produção.
