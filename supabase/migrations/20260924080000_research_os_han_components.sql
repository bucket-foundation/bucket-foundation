create table if not exists graph.han_components (
  char                   text        not null check (length(char) between 1 and 2),
  ord                    smallint    not null check (ord between 1 and 20),
  component              text        not null check (length(component) between 1 and 8),
  meaning                text,
  meaning_source         text        check (meaning_source is null or meaning_source in ('wiktionary-zh', 'wiktionary-ja', 'unihan')),
  ids                    text        not null,
  source                 text        not null,
  confidence             real        not null check (confidence >= 0 and confidence <= 1),
  agrees_with_wiktionary boolean,
  decomposition_license  text        not null,
  meaning_license        text,
  run_id                 text        not null,
  created_at             timestamptz not null default now(),
  primary key (char, ord)
);

alter table graph.han_components enable row level security;

drop policy if exists public_han_components_select on graph.han_components;
create policy public_han_components_select on graph.han_components for select to anon, authenticated using (true);

grant all on graph.han_components to service_role;
revoke all on graph.han_components from anon, authenticated;
grant select on graph.han_components to anon, authenticated;
