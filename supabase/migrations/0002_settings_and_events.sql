-- app_settings: linha única (singleton) com configurações editáveis pelo
-- painel /admin — preço da campanha e quais templates aparecem no formulário
-- de criação. Atualização só acontece via service role (server action do
-- admin valida o e-mail contra ADMIN_EMAILS antes de gravar).
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  campaign_price_brl_cents int not null default 4900 check (campaign_price_brl_cents > 0),
  enabled_templates jsonb not null default '[1, 2, 3]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Preço e templates habilitados precisam ser legíveis por qualquer usuário
-- logado (formulário de campanha, checkout) e pelo visitante anônimo
-- (a própria landing page pública não usa isso hoje, mas não há motivo pra
-- esconder um preço público).
create policy "app_settings é público para leitura"
  on public.app_settings for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- events: contagem de visualizações da landing page e cliques no botão de
-- envio (mailto). Só a rota app/api/track grava aqui, usando a service role
-- — por isso não existe policy de insert para anon/authenticated (RLS ativo
-- e sem policy = acesso negado, exceto para service role que ignora RLS).
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  type text not null check (type in ('view', 'click')),
  created_at timestamptz not null default now()
);

create index if not exists events_campaign_id_type_idx on public.events (campaign_id, type);

alter table public.events enable row level security;
