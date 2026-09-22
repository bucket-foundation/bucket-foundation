-- ros-tier-fix: a node's grade tier is at least the tier of each node it
-- follows in learning order.
--
-- `tier` is a difficulty and ordering axis (learning/research-os/TRUTH-TIERS.md,
-- "What `tier` means today"), and checkTierMonotonicity in
-- src/lib/research-os/ingest/validate.ts states the invariant: a
-- prerequisite never carries a higher tier than its dependent. The Academy
-- importer sets each atom's tier from its depth inside its own course, so
-- the invariant holds inside a course and breaks when a reviewer approves a
-- cross-course factor as learning order: 61 of the 98 confirmed
-- decompose-further pairs have the factor above its target, "Spin and the
-- Pauli exclusion principle" at 28 under "Van der Waals forces" at 13.
--
-- graph.enforce_prerequisite_tiers raises every target to the highest tier
-- among its prerequisites and repeats until nothing moves, so a raise
-- carries through every node downstream. Tiers only rise and are bounded by
-- the highest tier present, so the loop ends, cycles included. It returns
-- the number of raises. decideEdge in src/lib/research-os/inference/
-- review-actions.ts calls it after writing a prerequisite edge.

create or replace function graph.enforce_prerequisite_tiers()
returns integer
language plpgsql
set search_path = graph, public
as $$
declare
  moved integer;
  total integer := 0;
begin
  loop
    update graph.nodes t
       set tier = need.tier
      from (
        select e.to_id, max(f.tier) as tier
          from graph.edges e
          join graph.nodes f on f.id = e.from_id
         where e.kind = 'prerequisite'
           and f.superseded_by is null
         group by e.to_id
      ) need
     where t.id = need.to_id
       and t.superseded_by is null
       and t.tier < need.tier;
    get diagnostics moved = row_count;
    total := total + moved;
    exit when moved = 0;
  end loop;
  return total;
end;
$$;

revoke execute on function graph.enforce_prerequisite_tiers() from public;
grant execute on function graph.enforce_prerequisite_tiers() to service_role;

select graph.enforce_prerequisite_tiers();

-- The K-12 sky-blue seed had Rayleigh's 1871 papers derive from the
-- scattering law. Under the convention that a derives_from edge's from end
-- rests on its to end, that runs backward: the law derives from the papers.
-- Beside the papers-to-law prerequisite it also formed a two-node loop in
-- the prime decomposition. The seed file carries the same fix.
delete from graph.edges e
 using graph.nodes paper, graph.nodes law
 where paper.slug = 'rayleigh-1871-sky-color-papers'
   and law.slug = 'rayleigh-scattering-law'
   and e.kind = 'derives_from'
   and e.from_id = paper.id and e.to_id = law.id
   and exists (
     select 1 from graph.edges r
      where r.kind = 'derives_from' and r.from_id = law.id and r.to_id = paper.id
   );

update graph.edges e
   set from_id = law.id, to_id = paper.id
  from graph.nodes paper, graph.nodes law
 where paper.slug = 'rayleigh-1871-sky-color-papers'
   and law.slug = 'rayleigh-scattering-law'
   and e.kind = 'derives_from'
   and e.from_id = paper.id and e.to_id = law.id;
