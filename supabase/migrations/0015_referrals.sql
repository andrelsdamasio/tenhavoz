-- Indicação: quem cria a conta pelo link "Crie a sua" no rodapé da página de
-- uma campanha fica ligado ao dono dessa campanha. Quando o indicado paga a
-- primeira campanha, o indicador ganha um cupom (uma vez por indicado).
-- Só a service role acessa (RLS ligado, sem policies).
create table if not exists public.referrals (
  referred_user_id uuid primary key references auth.users (id) on delete cascade,
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  coupon_code text
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);

alter table public.referrals enable row level security;
