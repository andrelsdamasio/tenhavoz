-- Endurecimento apontado pela auditoria (advisors do Supabase).

-- 1) A função que cria o perfil no cadastro só deve rodar como gatilho, nunca via API pública.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2) Funções de estatística com search_path fixo.
alter function public.campaign_totals(uuid[]) set search_path = public, pg_temp;
alter function public.campaign_daily(uuid[], integer) set search_path = public, pg_temp;

-- 3) Políticas de acesso: auth.uid() calculado uma vez por consulta, não por linha.
alter policy "usuário gerencia as próprias campanhas" on public.campaigns
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "usuário vê os próprios pagamentos" on public.payments
  using ((select auth.uid()) = user_id);
alter policy "users podem atualizar o próprio perfil" on public.users
  using ((select auth.uid()) = id);
alter policy "users podem ver o próprio perfil" on public.users
  using ((select auth.uid()) = id);

-- 4) Índice para a chave estrangeira de pagamentos.
create index if not exists payments_user_id_idx on public.payments (user_id);
