-- Temas 6 a 9: variações do tema 2 (Aurora, Vidro, Claro e Noturno).
alter table public.campaigns drop constraint if exists campaigns_template_id_check;
alter table public.campaigns add constraint campaigns_template_id_check
  check (template_id in (1, 2, 3, 4, 5, 6, 7, 8, 9));

-- Habilita os novos temas no formulário; o admin pode desligar cada um em Configurações.
update public.app_settings
set enabled_templates = (
  select coalesce(jsonb_agg(distinct v order by v), '[]'::jsonb)
  from jsonb_array_elements(enabled_templates || '[6, 7, 8, 9]'::jsonb) as t(v)
)
where id = true;
