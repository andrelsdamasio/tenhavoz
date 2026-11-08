-- Comentários de usuários cadastrados nas páginas públicas das campanhas.
-- Só a service role acessa (RLS ligado, sem policies): leitura e escrita passam pelo servidor.
create table if not exists public.campaign_comments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 2 and 500),
  reported_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists campaign_comments_campaign_idx on public.campaign_comments (campaign_id, created_at desc);
create index if not exists campaign_comments_user_idx on public.campaign_comments (user_id, created_at desc);
create index if not exists campaign_comments_reported_idx on public.campaign_comments (reported_at) where reported_at is not null;

alter table public.campaign_comments enable row level security;
