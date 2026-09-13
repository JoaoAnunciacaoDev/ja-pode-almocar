create or replace function public.slugify(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select trim(both '-' from pg_catalog.regexp_replace(
    pg_catalog.translate(
      pg_catalog.lower(value),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

alter table public.groups add column slug text;

update public.groups
set slug = public.slugify(name) || '-' || left(replace(id::text, '-', ''), 6);

alter table public.groups alter column slug set not null;
alter table public.groups add constraint groups_slug_unique unique (slug);
alter table public.groups add constraint groups_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create or replace function public.set_group_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := public.slugify(new.name) || '-' || left(replace(new.id::text, '-', ''), 6);
  end if;
  return new;
end;
$$;

create trigger groups_set_slug
before insert on public.groups
for each row execute function public.set_group_slug();
