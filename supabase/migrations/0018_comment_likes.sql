-- Curtidas em comentários. Uma por pessoa por comentário.
-- Só a service role acessa (RLS ligado, sem policies). O contador fica no
-- próprio comentário e é mantido por trigger, para a página pública não
-- precisar contar linhas a cada visita.
alter table public.campaign_comments add column if not exists like_count integer not null default 0;

create table if not exists public.comment_likes (
  comment_id uuid not null references public.campaign_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_user_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

create or replace function public.sync_comment_like_count() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.campaign_comments set like_count = like_count + 1 where id = new.comment_id;
  elsif (tg_op = 'DELETE') then
    update public.campaign_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
after insert or delete on public.comment_likes
for each row execute function public.sync_comment_like_count();
