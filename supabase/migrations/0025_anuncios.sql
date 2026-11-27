-- Anúncios pagos: quem anuncia envia texto, link e imagem, paga pelo checkout
-- (Pix no Mercado Pago do TenhaVoz) e o admin aprova antes de ir ao ar.
alter table public.app_settings
  add column if not exists ad_price_7d_cents integer not null default 4900 check (ad_price_7d_cents >= 0),
  add column if not exists ad_price_30d_cents integer not null default 12900 check (ad_price_30d_cents >= 0);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  advertiser text not null check (char_length(advertiser) between 1 and 60),
  contact_email text not null check (char_length(contact_email) <= 200),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 200),
  url text not null check (char_length(url) <= 500 and url ~* '^https://'),
  image_path text not null,
  duration_days integer not null check (duration_days in (7, 30)),
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'in_review', 'live', 'rejected', 'ended', 'refunded')),
  mp_payment_id text,
  paid_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);

create index if not exists ads_status_idx on public.ads (status, ends_at);

alter table public.ads enable row level security;

-- Qualquer visitante pode ler só os anúncios no ar (a página pública usa o client anônimo).
create policy "anúncios no ar são públicos"
  on public.ads for select
  using (status = 'live' and (ends_at is null or ends_at > now()));

-- Imagens dos anúncios: bucket público (leitura), gravação só pela service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ads', 'ads', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
