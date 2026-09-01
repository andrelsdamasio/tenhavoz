-- Schema inicial: users (perfil espelhando auth.users), campaigns, payments.
-- Regra de negócio central: uma campaign só vira 'published' depois de existir
-- um payment com status = 'confirmed' vinculado a ela (ver webhooks
-- app/api/webhooks/stripe e app/api/webhooks/mercadopago).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users podem ver o próprio perfil"
  on public.users for select
  using (auth.uid() = id);

create policy "users podem atualizar o próprio perfil"
  on public.users for update
  using (auth.uid() = id);

-- Cria a linha em public.users automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  manifest_text text not null,
  subject text not null,
  recipients jsonb not null default '[]'::jsonb,
  send_mode text not null default 'bcc' check (send_mode in ('bcc', 'to')),
  drive_link text,
  template_id int not null default 1 check (template_id in (1, 2, 3)),
  slug text unique,
  status text not null default 'draft' check (status in ('draft', 'paid', 'published')),
  created_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on public.campaigns (user_id);
create index if not exists campaigns_slug_idx on public.campaigns (slug);

alter table public.campaigns enable row level security;

create policy "usuário gerencia as próprias campanhas"
  on public.campaigns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A landing page pública só pode ler campanhas já publicadas.
create policy "público lê campanhas publicadas"
  on public.campaigns for select
  to anon
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'mercadopago')),
  provider_payment_id text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  amount numeric not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index if not exists payments_campaign_id_idx on public.payments (campaign_id);

alter table public.payments enable row level security;

create policy "usuário vê os próprios pagamentos"
  on public.payments for select
  using (auth.uid() = user_id);

-- Inserção/atualização de payments acontece apenas via webhook, usando a
-- service role key (que ignora RLS) — não há policy de insert/update para
-- usuários autenticados de propósito.
