-- Campanhas de arrecadação (doações). O dinheiro das doações vai direto para a
-- conta Mercado Pago do criador; aqui guardamos só a campanha, o orçamento e o
-- registro de cada doação confirmada. RLS ligado e sem policies: só a service role acessa.

alter table public.app_settings
  add column if not exists fundraising_enabled boolean not null default false,
  add column if not exists fundraising_fee_bps integer not null default 400
    check (fundraising_fee_bps between 0 and 3000);

create table if not exists public.fundraisers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  title text not null check (char_length(title) between 5 and 90),
  summary text check (summary is null or char_length(summary) <= 300),
  story text not null check (char_length(story) between 50 and 6000),
  goal_cents bigint not null check (goal_cents between 1000 and 100000000),
  ends_at timestamptz,
  beneficiary_name text,
  cover_image_url text,
  template_id smallint not null default 1 check (template_id between 1 and 9),
  theme_color text,
  status text not null default 'draft' check (status in ('draft', 'active', 'ended', 'suspended')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fundraisers_user_idx on public.fundraisers (user_id, created_at desc);
create index if not exists fundraisers_active_idx on public.fundraisers (status, published_at desc) where status = 'active';

-- Orçamento: para que o dinheiro será usado (item, valor previsto).
create table if not exists public.fundraiser_budget_items (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers (id) on delete cascade,
  position smallint not null default 0,
  label text not null check (char_length(label) between 2 and 120),
  amount_cents bigint not null check (amount_cents between 0 and 100000000)
);
create index if not exists fundraiser_budget_items_idx on public.fundraiser_budget_items (fundraiser_id, position);

-- Cada doação (preenchida pelo webhook do provedor; o webhook é a única fonte de "pago").
create table if not exists public.fundraiser_donations (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers (id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'refunded', 'failed')),
  amount_cents bigint not null check (amount_cents > 0),
  platform_fee_cents bigint not null default 0,
  tip_cents bigint not null default 0,
  donor_name text,
  donor_email text,
  is_anonymous boolean not null default false,
  message text check (message is null or char_length(message) <= 300),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (provider, provider_payment_id)
);
create index if not exists fundraiser_donations_idx on public.fundraiser_donations (fundraiser_id, status, created_at desc);

-- Conexão do criador com a conta Mercado Pago (tokens: nunca expostos ao navegador).
create table if not exists public.seller_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_user_id text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz not null default now()
);

alter table public.fundraisers enable row level security;
alter table public.fundraiser_budget_items enable row level security;
alter table public.fundraiser_donations enable row level security;
alter table public.seller_connections enable row level security;
