alter table graph.node_words add column if not exists root_confidence real not null default 1 check (root_confidence >= 0 and root_confidence <= 1);
alter table graph.node_words add column if not exists root_source text check (root_source is null or root_source in ('wiktionary', 'oshb', 'both'));
alter table graph.nsm_exponents add column if not exists root_source text check (root_source is null or root_source in ('wiktionary', 'oshb', 'both'));
