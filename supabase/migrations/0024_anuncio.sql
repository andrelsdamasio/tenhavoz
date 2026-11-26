-- Espaço de anúncio simples (um patrocinador por vez), controlado pelo admin.
-- Desligado por padrão. Aparece só nas telas de criar campanha, sempre rotulado "Publicidade".
alter table public.app_settings
  add column if not exists ad_enabled boolean not null default false,
  add column if not exists ad_advertiser text check (ad_advertiser is null or char_length(ad_advertiser) <= 60),
  add column if not exists ad_title text check (ad_title is null or char_length(ad_title) <= 80),
  add column if not exists ad_text text check (ad_text is null or char_length(ad_text) <= 200),
  add column if not exists ad_url text check (ad_url is null or (char_length(ad_url) <= 500 and ad_url ~* '^https://'));
