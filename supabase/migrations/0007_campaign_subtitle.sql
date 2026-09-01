-- Resumo curto (gerado por IA ou digitado no modo avançado) mostrado abaixo
-- do título na página pública, no lugar do texto integral do manifesto.
alter table public.campaigns
  add column if not exists subtitle text;
