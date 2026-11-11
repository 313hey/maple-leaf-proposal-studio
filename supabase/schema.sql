-- Maple Leaf Proposal Studio public shared workspace.
-- WARNING: These policies intentionally allow unauthenticated internet visitors
-- to read, create, update, and delete every row. Use only if the workspace data
-- is intended to be public and editable by anyone.

create table if not exists public.studio_projects (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.studio_attractions (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.studio_class_templates (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.studio_projects enable row level security;
alter table public.studio_attractions enable row level security;
alter table public.studio_class_templates enable row level security;

drop policy if exists "Public can manage studio projects" on public.studio_projects;
create policy "Public can manage studio projects" on public.studio_projects
  for all to anon, authenticated using (true) with check (true);
drop policy if exists "Public can manage studio attractions" on public.studio_attractions;
create policy "Public can manage studio attractions" on public.studio_attractions
  for all to anon, authenticated using (true) with check (true);
drop policy if exists "Public can manage studio class templates" on public.studio_class_templates;
create policy "Public can manage studio class templates" on public.studio_class_templates
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.studio_projects to anon, authenticated;
grant select, insert, update, delete on public.studio_attractions to anon, authenticated;
grant select, insert, update, delete on public.studio_class_templates to anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='studio_projects') then
    alter publication supabase_realtime add table public.studio_projects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='studio_attractions') then
    alter publication supabase_realtime add table public.studio_attractions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='studio_class_templates') then
    alter publication supabase_realtime add table public.studio_class_templates;
  end if;
end $$;
