create table if not exists graph.node_words (
  id          uuid        primary key default gen_random_uuid(),
  node_id     uuid        not null references graph.nodes (id) on delete cascade,
  lang        text        not null check (lang ~ '^[a-z]{2,3}(-[a-z]{2,4})?$'),
  word        text        not null check (length(word) between 1 and 200),
  roman       text,
  gloss       text,
  root_lang   text,
  root_form   text,
  root_gloss  text,
  chain       jsonb       not null default '[]'::jsonb check (jsonb_typeof(chain) = 'array'),
  root_texts  jsonb       not null default '[]'::jsonb check (jsonb_typeof(root_texts) = 'array'),
  en_term     text,
  sense       text,
  source      text        not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists node_words_node_lang_word_uq on graph.node_words (node_id, lang, word);
create index if not exists node_words_node_idx on graph.node_words (node_id);
create index if not exists node_words_root_idx on graph.node_words (root_lang, root_form) where root_form is not null;

alter table graph.node_words enable row level security;

drop policy if exists public_node_select on graph.node_words;
create policy public_node_select on graph.node_words for select using (
  exists (
    select 1 from graph.nodes n
    where n.id = node_id
      and (n.visibility = 'public' or n.owner_id = auth.uid())
  )
);

grant all on graph.node_words to service_role;
revoke all on graph.node_words from authenticated;
revoke all on graph.node_words from anon;
