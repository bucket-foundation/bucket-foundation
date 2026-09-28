alter table graph.node_words
  add column if not exists root_gloss_form text check (root_gloss_form in ('II', 'IIq', 'III', 'IIIq', 'IV', 'IVq', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV')),
  add column if not exists root_gloss_confidence real check (root_gloss_confidence between 0 and 1);

alter table graph.nsm_exponents
  add column if not exists root_gloss_form text check (root_gloss_form in ('II', 'IIq', 'III', 'IIIq', 'IV', 'IVq', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV')),
  add column if not exists root_gloss_confidence real check (root_gloss_confidence between 0 and 1);
