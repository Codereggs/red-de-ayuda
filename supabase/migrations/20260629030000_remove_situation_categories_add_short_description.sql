-- Replace situation_categories catalog with cases.short_description

alter table public.cases
  add column if not exists short_description text;

update public.cases c
set short_description = sc.name
from public.situation_categories sc
where c.situation_category_id = sc.id
  and c.short_description is null;

update public.cases
set short_description = 'Sin descripción'
where short_description is null;

alter table public.cases
  alter column short_description set not null;

alter table public.cases
  drop column situation_category_id;

drop policy if exists "situation_categories_public_select" on public.situation_categories;
drop policy if exists "situation_categories_internal_write" on public.situation_categories;

drop table if exists public.situation_categories;
