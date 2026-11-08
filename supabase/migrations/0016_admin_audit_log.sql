-- Histórico das ações do admin sobre campanhas (quem fez o quê e quando).
-- Só a service role acessa (RLS ligado, sem policies).
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_campaign_idx on public.admin_audit_log (campaign_id, created_at desc);

alter table public.admin_audit_log enable row level security;
