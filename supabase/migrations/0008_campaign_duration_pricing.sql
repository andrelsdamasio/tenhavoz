-- Substitui o preco unico por dois planos de duracao (72h e 7 dias), cada
-- um com seu proprio preco configuravel no admin. Campanhas ja publicadas
-- antes disso ficam com duration_hours/expires_at nulos (nunca expiram).
alter table public.app_settings
  add column if not exists price_72h_brl_cents int not null default 4990 check (price_72h_brl_cents >= 0),
  add column if not exists price_7d_brl_cents int not null default 7990 check (price_7d_brl_cents >= 0);

alter table public.campaigns
  add column if not exists duration_hours int check (duration_hours in (72, 168)),
  add column if not exists expires_at timestamptz;

create index if not exists campaigns_expires_at_idx on public.campaigns (expires_at);
