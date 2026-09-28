create table if not exists graph.node_embeddings (
  node_id     uuid        not null references graph.nodes (id) on delete cascade,
  model       text        not null,
  text_hash   text        not null,
  vector      real[]      not null,
  updated_at  timestamptz not null default now(),
  primary key (node_id, model)
);

alter table graph.node_embeddings enable row level security;
revoke all on graph.node_embeddings from anon, authenticated;
grant all on graph.node_embeddings to service_role;
