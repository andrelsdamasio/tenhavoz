alter table fundraiser_budget_items
  add column if not exists description text check (description is null or char_length(description) <= 300),
  add column if not exists attachment_url text,
  add column if not exists attachment_name text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('fundraiser-docs', 'fundraiser-docs', true, 3145728)
on conflict (id) do nothing;
