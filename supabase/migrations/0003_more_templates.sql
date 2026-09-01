-- Amplia de 3 para 5 templates disponíveis (feedback do cliente: estilo
-- "institucional" com seções numeradas, inspirado em campanhas reais dele).
alter table public.campaigns drop constraint if exists campaigns_template_id_check;
alter table public.campaigns add constraint campaigns_template_id_check
  check (template_id in (1, 2, 3, 4, 5));

update public.app_settings
set enabled_templates = '[1, 2, 3, 4, 5]'::jsonb
where id = true and enabled_templates = '[1, 2, 3]'::jsonb;
