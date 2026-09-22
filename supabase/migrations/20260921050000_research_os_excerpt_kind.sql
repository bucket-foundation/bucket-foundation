-- Transcript claim cards are source excerpts (founder decision, 2026-09-21).
--
-- The 599 cards under bucket-canon/<branch>/sub-claims/ are passages from
-- talks and podcasts, each with a video and a timestamp. canon-all.ts loaded
-- them as `fact` nodes with lexical `derives_from` edges to the atoms their
-- text matched, so the prime decomposition read transcript lines as
-- composites resting on the canon. They become `excerpt` nodes, and those
-- edges become `cites`: an excerpt mentions an atom and rests on none.
-- Idempotent, so a replay after `db reset` converges.

alter table graph.nodes drop constraint if exists nodes_kind_check;
alter table graph.nodes add constraint nodes_kind_check check (kind in (
  'fact','concept','law','derivation','primary_source','artifact',
  'hypothesis','extension','replication','peer_review','production',
  'figure','site','excerpt'
));

update graph.nodes
   set kind = 'excerpt'
 where provenance->>'type' in ('canon_claim', 'source_excerpt')
   and kind <> 'excerpt';

-- graph_edges_from_to_kind_uidx keeps one edge per (from, to, kind): where an
-- excerpt already cites the atom, its derives_from edge is the duplicate.
delete from graph.edges d
 using graph.nodes n
 where d.from_id = n.id
   and n.kind = 'excerpt'
   and d.kind = 'derives_from'
   and exists (
     select 1 from graph.edges c
      where c.from_id = d.from_id and c.to_id = d.to_id and c.kind = 'cites'
   );

update graph.edges e
   set kind = 'cites'
  from graph.nodes n
 where e.from_id = n.id
   and n.kind = 'excerpt'
   and e.kind = 'derives_from';

-- The provenance type names where a row came from; `canon_claim` read as a
-- canon claim to anything that filtered on it, so it becomes
-- `source_excerpt`. Last, since the steps above find the rows by it.
update graph.nodes
   set provenance = jsonb_set(provenance, '{type}', '"source_excerpt"')
 where provenance->>'type' = 'canon_claim';
