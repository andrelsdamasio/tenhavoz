-- Cupons de desconto: criados/editados no /admin, aplicados no checkout.
-- Sem policy de select/insert/update para anon/authenticated de propósito —
-- só a service role (server actions do /admin e do checkout) acessa esta
-- tabela, então o código do cupom nunca fica exposto por uma query direta
-- do client.
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value int not null check (discount_value > 0),
  max_redemptions int check (max_redemptions is null or max_redemptions > 0),
  redemption_count int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

-- Guarda qual cupom (se algum) foi usado em cada pagamento, pra auditoria.
alter table public.payments add column if not exists coupon_code text;

-- Cor hex escolhida por quem cria a campanha para o template selecionado;
-- null preserva o visual padrão de sempre (nenhuma campanha existente muda).
alter table public.campaigns add column if not exists theme_color text;

-- Paleta de cores oferecida no formulário de criação — editável no /admin,
-- sem precisar mexer em código pra adicionar/remover uma opção de cor.
alter table public.app_settings
  add column if not exists template_color_palette jsonb not null default
  '["#111827","#1d4ed8","#047857","#b91c1c","#7c3aed","#c2410c","#0f766e","#be185d"]'::jsonb;
