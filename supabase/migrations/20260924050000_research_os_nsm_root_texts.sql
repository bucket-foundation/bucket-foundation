alter table graph.nsm_exponents
  add column if not exists root_texts jsonb not null default '[]'::jsonb check (jsonb_typeof(root_texts) = 'array');
