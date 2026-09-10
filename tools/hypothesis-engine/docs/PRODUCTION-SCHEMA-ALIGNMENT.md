Production Schema Alignment, Research OS PR #6
================================================

`bucket-foundation` PR #6 (`feat/research-os-k12-phase0`) shipped the first
real `graph.productions` table: a Supabase migration
(`supabase/migrations/20260910000000_research_os_graph.sql`), its
TypeScript types (`src/lib/research-os/types.ts`), and the API routes that
read and write it (`src/app/api/research-os/{production,route,state,
workspace}/route.ts`). None of it matches the shape `docs/PRODUCTION-
SCHEMA.md` defined against `learning/research-os/PLAN.md` §5's own YAML on
the older `feat/research-os-k12` branch. Below: the field-by-field diff
between the two, the mapping rule `hte/corpus/production.py`'s new
`normalize_research_os_record` now applies, and what stays a gap because no
mapping exists yet.

## Where each shape lives

- **Research OS (PR #6, shipped 2026-09-10):** `graph.productions` (the
  migration above); a row's shape as `.select("*")` returns it, or as
  `src/app/api/research-os/production/route.ts`'s `POST` writes it.
  `src/lib/research-os/types.ts` carries no `Production`/`ProductionRow`
  interface of its own; `production/route.ts`'s local `ProductionBody`
  interface types only the client-writable request body (`id?,
  targetNodeId?, claim?, evidence?, sources?, transferProof?, status?`), a
  strict subset of the full row. This alignment table treats the
  migration's SQL columns as the shape of record.
- **This engine (`docs/PRODUCTION-SCHEMA.md`, unchanged by this file):**
  `hte.corpus.production.Production` and its nested `Claim`/`ClaimEvidence`/
  `Review` dataclasses, read from `learning/research-os/PLAN.md` §5 on the
  older branch.

## Field by field

| Research OS name : type | Engine name : type | Mapping rule | Gap |
|---|---|---|---|
| `id : uuid` | `Production.id : str` | direct passthrough | none |
| `learner_id : uuid` (FK `auth.users`) | *(no field)* | dropped entirely; never reaches any `Production` field or the engine's response | intentional: `PRODUCTION-SCHEMA.md` carries no student-identity field by design (`RESEARCH-OS-INTEGRATION.md`, "No student PII"); verified by `tests/test_api_research_os.py::test_learner_id_never_appears_in_the_response` |
| `target_node_id : uuid` (FK `graph.nodes`) | `Production.research_question : str` (free text) | folded into descriptive text, `f"Research OS target: {title}"`, using an optional `_target_node.title`/`.slug` join enrichment when the caller supplies one, else the bare id | lossy: `PRODUCTION-SCHEMA.md` has no dedicated "which node this production argues about" field; a caller that needs the structured link back must keep `target_node_id` out of band from the normalized record |
| `claim : text \| null` | `Claim.text : str`, inside `claims[0]` | one claim built from the row's single claim field | Research OS is one-claim-per-production; a normalized record's `claims` list never holds more than one entry. Some shipped fixtures (e.g. `prod-002`) already carry several claims per production, so this narrows how the normalizer itself uses the schema's own capacity |
| `evidence : jsonb [{source_id\|node_id, quote, locator?}]` | `ClaimEvidence[]` | one `ClaimEvidence` per entry: `source_id = source_id or node_id`, `locator = locator or source_id`, `quote = quote or "(no quote recorded)"`, `kind` fixed `"textual"`, `tier` derived (see next row) | Research OS's evidence entries carry no `kind`/`tier` of their own; both are defaulted by the normalizer rather than read off the row. If `evidence` is empty but `sources` is not, one entry is synthesized per source instead (the citation-only branch, `_research_os_evidence`) |
| `sources : jsonb [{label, url?, license?, doi?}]` | `ClaimEvidence.citations[]`, and (via `citations`) `tier` | each source becomes one `Citation` (`type:"doi"` if `doi` is present, else `type:"url"` from `url`, else `type:"url"` from `label`), and the **same** converted citation list is attached to **every** generated evidence entry. `tier` is `"T2"` when any citation is a `doi` (matching `PRODUCTION-SCHEMA.md`'s own "a peer-reviewed paper reads T2"), else `"T4"` | Research OS's `sources` is the whole production's own closed citation set (the migration's column comment); it stands apart from any single quote. The schema's own per-evidence `citations` field implies a tighter binding than Research OS's data carries, so this mapping folds a many-to-many relationship down to "all citations, on every entry" |
| `transfer_proof : jsonb {}` | *(no field)* | dropped; never read | a real gap `RESEARCH-OS-INTEGRATION.md`'s own "What the engine does not touch" section never named, since that section was written before PR #6 existed: the same "a Research OS learner-state field, out of scope" reasoning that excludes `PLAN.md`'s `learner_state_at_submission` applies here too, made explicit for the first time in this file |
| `status : draft\|submitted\|accepted\|returned` | `Review.status : draft\|peer-reviewed\|teacher-reviewed\|accepted\|retracted` | `RESEARCH_OS_STATUS_MAP`: `draft`→`draft`, `submitted`→`draft`, `accepted`→`accepted`, `returned`→`draft` | real semantic gap, not just a renaming: Research OS's own ladder has no independent-review rung at all in Phase 0 (no teacher or peer layer exists, task item 6). Mapping `submitted`/`returned` down to `draft` is a conservative, disclosed choice: a learner clicking submit is not the same as a human reviewing the work, and `PRODUCTION-SCHEMA.md`'s own default `status_min="peer-reviewed"` exists precisely to keep unreviewed material out of belief fusion by default. Consequence: **no Research OS production reaches the engine's default campaign until Research OS ships a review layer (Phase 1) and this map gains real `peer-reviewed`/`teacher-reviewed` targets** |
| `created_at : timestamptz` | `Production.created_at : ISO-8601 str` | direct passthrough | none, both ISO-8601 |
| `updated_at : timestamptz` | `Review.history[-1].date` | used as the one synthesized review-history entry's date (falling back to `created_at` if absent) | approximate: `PRODUCTION-SCHEMA.md`'s `review.history` is a full per-transition log (draft date, peer-reviewed date, accepted date...); Research OS keeps only the current `status` plus the row's last-write timestamp, so an intermediate transition's own date (e.g., when a draft first became `submitted`) is lost. Exact only for the one date `_build_corpus` reads, `review.date_of("accepted")` |
| *(no Research OS field)* | `Production.author_role : student\|teacher\|researcher\|agent` | fixed `"student"` | Phase 0 has no non-student production author (`RESEARCH-OS-INTEGRATION.md`'s own "What the engine needs from Research OS") |
| *(no Research OS field)* | `Production.grade_band : free text` | bucketed from an optional `_target_node.tier` join (`_tier_to_grade_band`: `3-5`/`6-8`/`9-10`/`11-12`/`canon` for the migration's own `tier>=90` sentinel); `"unknown"` without that join | `graph.nodes.tier` is a per-*node* grade-level proxy; `graph.productions` itself carries no field like it, so a bare row with no join cannot resolve a real band. A real integration should embed the joined node onto the row before calling `load`/`load_supabase`/`hypothesize` (a Supabase view, or an application-side fetch) |
| *(no Research OS field)* | `Production.school_or_district_id : str` | fixed sentinel `"research-os-phase-0"` | Phase 0 has no roster or district concept (task item 6, no roster sync); there is nothing pseudonymous to carry yet |
| *(no Research OS analog)* | `Claim.stance : supports\|refutes\|extends` | fixed `"supports"` | Research OS carries no stance vocabulary; a learner's production always stands behind its own claim, so `"supports"` is the only defensible default, never a read from data |
| *(no Research OS analog)* | `Claim.slots : {actor,action,object,place,mechanism}` | all five `None` ("not asserted") | the shipped `vocab-production-seed.json` names concepts about **the engine's own calibration questions** (`tier-assignment`, `hypothesis-ranking`, `fusion-weight`, ...), a meta-vocabulary about the production system itself rather than K-12 physics content. Forcing a sky-is-blue claim into that vocabulary would misrepresent it. No domain-specific K-12 physics vocabulary exists yet; until one does, every normalized claim's slots stay null |
| *(no Research OS analog)* | `Claim.interval : Interval \| None` | always `None` | a physics fact or law has no "the claim's own subject happened in year X" the way a historical claim does. **Consequence:** a normalized Research OS production never contributes a `GroundTruthEvent`, regardless of status, until productions carry a dated subject of their own |

## Real production-form shape

The `evidence`/`sources` rows in the table (`jsonb [{source_id|node_id,
quote, locator?}]` / `jsonb [{label, url?, license?, doi?}]`) describe
the shape a future Quote tool would write. The real production form
shipped on `main` (`src/app/research-os/workspace/page.tsx`) writes
neither shape: `evidence: production.evidence.split("\n").filter
(Boolean)` and `sources: production.sources.split("\n").filter
(Boolean)`, plain arrays of newline-split strings, and `src/app/api/
research-os/production/route.ts`'s `POST` stores whatever it is handed
verbatim (`evidence: body.evidence ?? []`, typed `unknown[]`, validated
by neither field). `_research_os_evidence` used `.get()` on each entry
unconditionally, so a real, accepted production raised `AttributeError`
the moment it reached `Production.from_dict`, and because `hte.corpus.
research_os_outbox._build` called that function over every row in a
batch with no isolation, one such row aborted the whole batch, including
every other production a campaign was about to ingest with it (PR #35's
own seam check on PR #37, `gh pr view 35 --comments`).

Two fixes, both landed together:

1. **`hte/corpus/production.py`'s `_research_os_evidence` now accepts
   either shape**, or a mix of the two within one row: a dict entry
   (matching the table above) reads exactly as it did before; a string
   entry (`_string_evidence_entries`/`_string_source_entries`) becomes
   its own evidence entry, `quote` the line verbatim, `tier` by the
   row's own `author_role` (`_tier_for_author_role`, `T4` for the
   `"student"` this normalizer always writes today), `locator` the
   fixed marker `"(uncited)"`, and no `citations`: an evidence line and
   a `sources` line are two separate, unpaired arrays on the real form
   (neither names which source, if any, backs a given evidence line), so
   attaching every source to every evidence line, the dict shape's own
   closed-citation-set convention, would fabricate a citation link the
   learner never made. A `sources` line still becomes a real `Source` in
   the corpus (a citation-only evidence entry per line, the same pattern
   the dict shape's own "no quoted span" branch already used), parsed by
   shape: a DOI-looking line (`doi:10.x/...` or bare `10.x/...`) tags
   `T2`, an `http(s)://` line or a bare label tags `T4`. Each synthetic
   evidence-line id is scoped by the row's own production id
   (`f"research-os-evidence-line-{production_id}-{i}"`): two productions
   in the same ingest batch each writing their own line 0 must not
   collide onto one `Source` node the way a bare `f"...-line-{i}"` id
   would.
2. **`hte/corpus/research_os_outbox.py`'s `_build` isolates per row**:
   any row that still fails to normalize, this fix or a future one,
   is skipped (never marked consumed, so it stays visible for a retry
   once the row is fixed), reported as `{"production_id", "reason"}`,
   and never aborts the rest of the batch. `scripts/campaign_research_
   os.py`'s `main()` prints each skip and folds the list into
   `MANIFEST.json["skipped_rows"]` (`hte.provenance.stamp_manifest`).

`tests/test_corpus_production.py`'s "Real production-form shape" section
covers the string shape (including the mixed-shape and id-scoping cases);
`tests/test_corpus_research_os_outbox.py`'s per-row-isolation tests cover
`_build`'s own skip-and-report behavior.

## What this normalizer does not attempt

- **Slot-vocabulary alignment.** The gap above (`Claim.slots` always null)
  is the biggest one. `RESEARCH-OS-INTEGRATION.md`'s own finding stands:
  the production record is a real bridge on *shape*; whether a specific
  production's content means anything to this engine's address space is a
  separate, harder question this normalizer leaves open. A K-12 physics
  vocabulary (`actor`/`action`/`object`/`place`/`mechanism` concepts drawn
  from `learning/app/corpus/02-physics.json`'s own atoms, or from
  `graph.nodes` itself) stays real follow-on work.
- **Ground truth from Research OS content.** Since `interval` is always
  `None`, calibration campaigns (`hte.calibrate`) never see a Research OS
  production as a dated event. Question 19's own holdout comparison
  (`RESEARCH-OS-INTEGRATION.md`, "Engine overlap") still runs against the
  existing `PRODUCTION-SCHEMA.md`-shaped fixtures; a Research OS production
  contributes only as an evidence-bearing `Source`, never as ground truth,
  until a K-12 production schema carries a dated claim.
- **A live `graph.nodes` join.** `_target_node` is an optional enrichment
  key this normalizer reads if a caller supplies it; nothing in this
  change queries Supabase to fetch it. `load_supabase(table="productions")`
  reads bare `graph.productions` rows exactly as the REST API returns
  them; joining in the node's `tier`/`title`/`branch` before normalizing is
  the caller's job (a Supabase view over `productions` joined to `nodes`,
  or an application-side fetch), matching this module's existing "no
  network beyond the one documented request" contract.

## Design decisions a founder should confirm

Three defaults above are judgment calls made by hand, worth a founder's
conscious yes rather than a silent default:

1. **`submitted`/`returned` → `draft`, not `peer-reviewed`.** This is the
   conservative reading (unreviewed work should not reach belief fusion by
   default), but it also means the engine will not see *any* Research OS
   evidence at the default `status_min` until Research OS ships a review
   layer. If a pilot needs earlier visibility, the map, and the
   status_min default it feeds, is the one line to revisit
   (`RESEARCH_OS_STATUS_MAP` in `hte/corpus/production.py`).
2. **`stance` fixed to `"supports"`.** Correct for the common case (a
   student stands behind their own claim), wrong for the case Research OS
   does not yet model, a production explicitly built to *rebut* another
   node or claim. Nothing in `graph.productions` distinguishes that case
   today.
3. **`school_or_district_id` as a fixed sentinel.** Every normalized
   Research OS production currently looks like it came from the same
   pseudonymous place. Question 25's own reliability-weighted extraction
   (`RESEARCH-OS-INTEGRATION.md`) needs a real per-source track record
   eventually; a fixed sentinel cannot support it. Out of scope for this
   change, named here so it is not forgotten.

## Verified end to end

```bash
cd tools/hypothesis-engine
python3 -m pytest tests/test_corpus_production.py tests/test_api.py tests/test_api_research_os.py -q
# 68 passed

HTE_LLM_MODE=fake python3 -c "
import json
from hte.api import hypothesize
raw = json.load(open('hte/data/production-fixtures/research-os-sky-blue.json'))
response = hypothesize({'productions': raw, 'status_min': 'draft'})
assert response['ok'] is True
assert 'learner_id' not in json.dumps(response)
print('n_productions', response['corpus']['n_productions'])
"
# n_productions 2
```

`hte/data/production-fixtures/research-os-sky-blue.json` is two
`graph.productions`-shaped rows converted from the founder's own seed
(`supabase/seed/research-os-sky-blue.json`'s `why-the-sky-is-blue` target
and its `light-can-scatter-off-small-things` prerequisite): one
`"submitted"` production quoting the Tyndall 1869 and Rayleigh 1871 nodes
(exercises the doi→T2, multi-citation, multi-evidence-entry path), one
`"accepted"` production citing only a NASA Space Place URL with no quoted
span (exercises the doi-less→T4, citation-only-synthesis path). Both carry
a fake but realistic `learner_id` to prove the normalizer drops it.

`hte/corpus/production.py`'s own test suite
(`tests/test_corpus_production.py`) and `tests/test_api_research_os.py`
cover every mapping rule and default above, plus the older
`PRODUCTION-SCHEMA.md` shape's full existing test suite, unchanged, since
`is_research_os_record` never misclassifies a well-formed record of either
shape (`Production.from_dict`'s own docstring).

## What still needs a real PR

`src/app/api/research-os/hypothesize/route.ts` does not exist yet: nothing
in bucket-foundation's Next.js app forwards a production to `hte-serve`.
`docs/research-os-hypothesize-route.patch` (this same `docs/` folder) is
that route, plus the one `types.ts` addition it needs, written as a
reviewable patch file rather than applied to the working tree. It becomes
its own PR once PR #6 merges, per the task that produced this file.
