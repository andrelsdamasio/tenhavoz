-- Respostas (um nível, como no Instagram) e marca de edição nos comentários.
-- Apagar um comentário apaga as respostas dele.
alter table public.campaign_comments
  add column if not exists parent_id uuid references public.campaign_comments (id) on delete cascade,
  add column if not exists edited_at timestamptz;

create index if not exists campaign_comments_parent_idx on public.campaign_comments (parent_id) where parent_id is not null;
