-- Caixa de entrada do admin: e-mails recebidos em @tenhavoz.com.br (via
-- Resend). Só a service role lê/escreve; a página /admin/inbox exige admin.
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null unique,
  from_address text not null,
  to_addresses text[] not null default '{}',
  subject text not null default '',
  text_body text,
  attachments_count int not null default 0,
  received_at timestamptz not null default now(),
  forwarded_at timestamptz,
  read_at timestamptz
);

create index if not exists inbox_messages_received_at_idx
  on public.inbox_messages (received_at desc);

alter table public.inbox_messages enable row level security;
