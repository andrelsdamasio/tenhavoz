-- 1) Aviso de expiração: marca quando o dono da campanha já foi avisado.
alter table public.campaigns
  add column if not exists expiry_notified_at timestamptz;

-- 2) Estatísticas agregadas no banco. Antes o app baixava todas as linhas de
--    events e o PostgREST corta em 1000 por consulta, então campanhas com mais
--    de mil eventos mostravam números menores que os reais.
create or replace function public.campaign_totals(p_ids uuid[])
returns table (campaign_id uuid, views bigint, clicks bigint)
language sql stable
as $$
  select e.campaign_id,
         count(*) filter (where e.type = 'view'),
         count(*) filter (where e.type = 'click')
  from public.events e
  where e.campaign_id = any (p_ids)
  group by e.campaign_id
$$;

-- Eventos por dia (fuso de Brasília) nos últimos p_days dias.
create or replace function public.campaign_daily(p_ids uuid[], p_days int)
returns table (campaign_id uuid, day date, views bigint, clicks bigint)
language sql stable
as $$
  select e.campaign_id,
         (e.created_at at time zone 'America/Sao_Paulo')::date,
         count(*) filter (where e.type = 'view'),
         count(*) filter (where e.type = 'click')
  from public.events e
  where e.campaign_id = any (p_ids)
    and e.created_at >= now() - make_interval(days => p_days)
  group by 1, 2
$$;

-- Só o servidor (service role) consulta: quem chama já validou o dono.
revoke execute on function public.campaign_totals(uuid[]) from public, anon, authenticated;
revoke execute on function public.campaign_daily(uuid[], int) from public, anon, authenticated;
grant execute on function public.campaign_totals(uuid[]) to service_role;
grant execute on function public.campaign_daily(uuid[], int) to service_role;
