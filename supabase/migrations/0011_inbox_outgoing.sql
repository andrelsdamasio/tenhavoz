-- Caixa de entrada: mensagens enviadas pelo admin (respostas e novas) ficam
-- na mesma tabela, ligadas à mensagem original quando forem resposta.
alter table public.inbox_messages
  add column if not exists direction text not null default 'in'
    check (direction in ('in', 'out')),
  add column if not exists reply_to_id uuid
    references public.inbox_messages (id) on delete set null;

create index if not exists inbox_messages_reply_to_idx
  on public.inbox_messages (reply_to_id);
