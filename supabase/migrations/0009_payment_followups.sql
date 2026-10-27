-- Acompanhamento de pagamentos com problema: quando o admin foi avisado e
-- quando o caso foi marcado como resolvido. A chave é o id do pagamento no
-- Mercado Pago (não há FK: o ponto é justamente acompanhar pagamentos cuja
-- campanha pode ter sido apagada). Só a service role lê/escreve.
create table if not exists public.payment_followups (
  provider_payment_id text primary key,
  alerted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_followups enable row level security;
