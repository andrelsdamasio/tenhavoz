-- Limite (rígido, bloqueante) de caracteres do texto do manifesto,
-- configurável pelo painel /admin — pode ser ajustado (ex.: 2100, 2200) ou
-- desativado por completo (manifest_char_limit_enabled = false).
-- Bloqueia a criação da campanha ANTES do pagamento: quem paga precisa ter
-- certeza de que o texto vai caber no mailto sem risco de truncamento.
alter table public.app_settings
  add column if not exists manifest_char_limit int not null default 2100 check (manifest_char_limit > 0),
  add column if not exists manifest_char_limit_enabled boolean not null default true;
