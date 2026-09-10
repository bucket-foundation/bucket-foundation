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
| *(no Research OS analog)* | `Claim.slots : {actor,action,object,place,mechanism}` | `object` reads `target_node_id` itself (`_target_node.slug` when a join is given, same value either way); `actor`/`action`/`place`/`mechanism` stay `None` ("not asserted") | **Closed 2026-09-10 (`hte/vocab_induce.py`, bead `feat/hte-calibration-vocab`) for `object`; open for the other four.** The shipped `vocab-production-seed.json` names concepts about **the engine's own calibration questions** (`tier-assignment`, `hypothesis-ranking`, `fusion-weight`, ...), a meta-vocabulary about the production system itself rather than K-12 physics content, so forcing a sky-is-blue claim's OBJECT into THAT vocabulary would still misrepresent it. `hte.vocab_induce.induce` (wired into `_build_corpus` as a merge step over `load_vocab()`) resolves it instead: a graph node's own id needs no domain vocabulary to already exist, it becomes one, with a stable id (the `target_node_id` itself, already slug-shaped) and a humanized label. `actor`/`action`/`place`/`mechanism` have no comparably safe, always-available field to read from without guessing at content, so they are unchanged; see the design-decisions section below |
| *(no Research OS analog)* | `Claim.interval : Interval \| None` | the production's own `created_at` year, both `start` and `end` | **Closed 2026-09-10.** A physics fact or law still has no "the claim's own subject happened in year X" the way a historical claim does; this reads instead as "the year THIS RECORD entered Bucket's own reviewed corpus," the same discovery-date-distinct-from-subject-date shape `discovery_year` already gives every other corpus this module builds. **Consequence:** a normalized Research OS production accepted into the record now contributes a `GroundTruthEvent`, dated by when it entered the record rather than by the physics fact's own (nonexistent) date; see the design-decisions section below for the disclosed tradeoff |

## Closing the null-slot gap

The gap this section used to describe as fully open is now half-closed, as
of 2026-09-10. Before `hte/vocab_induce.py` existed, `_build_corpus` read every claim's
slots straight against `load_vocab()`'s own fixed K-12 meta-vocabulary and
raised `ValueError` on anything it did not already name (`_validate_slots`,
removed in this same change); a Research OS record's `object` reading (see
the table above) would have failed to load at all under that regime, which
is exactly why `normalize_research_os_record` set every slot to `None`
instead: a null slot loads cleanly, a mismatched one does not.

`hte.vocab_induce.induce`, wired into `_build_corpus` as a merge step over
`load_vocab()`'s own seed (and available with no seed at all, for a future
domain that never gets a hand-written one), removes that constraint: any
slot value an `EvidenceItem` already carries becomes a real concept, an id
this module's own seed already names, or a freshly induced one, either
kept verbatim (an already id-shaped value, `target_node_id`) or slugified
from a raw label. `normalize_research_os_record` now reads `object` off
`target_node_id` accordingly; `hte.api._validate_production_record`'s own
pre-flight slot-id check is dropped for the same reason, an unresolved
slot value is no longer an error condition anywhere in this path.

| | Before | After |
|---|---|---|
| `research-os-sky-blue.json`'s own `claims[0].slots` | `{actor: null, action: null, object: null, place: null, mechanism: null}` | `{actor: null, action: null, object: "why-the-sky-is-blue", place: null, mechanism: null}` (ros-sky-blue-001); `object: "light-can-scatter-off-small-things"` (ros-sky-blue-002) |
| `claims[0].interval` | `null` | `{"start": 2026, "end": 2026}` (the record's own `created_at` year) |
| `corpus.ground_truth` for the fixture | `[]` (0 events; both productions' own `interval` was `None`, so `_build_corpus`'s own ground-truth condition never fired) | `[GroundTruthEvent(id="ros-sky-blue-002-c0-e0", year=2026, discovery_year=2026, ...)]` (1 event: ros-sky-blue-002 is `"accepted"`; ros-sky-blue-001 stays `"draft"`, Research OS's own `"submitted"` mapped down, so it never reaches `accepted` regardless of status_min) |
| `hte.api.hypothesize({"productions": raw, "status_min": "draft"})`'s own ranked hypotheses | every survivor's `slots.OBJECT` reads `null` or the meta-vocabulary's own `other-object` | a ranked survivor's own `slots.OBJECT` reads `"why-the-sky-is-blue"`, `slot_labels.OBJECT` reads `"Why The Sky Is Blue"`, `linked_evidence.supports` names the real evidence ids behind it |

What stays open: `actor`/`action`/`place`/`mechanism` still read `None`
for every Research OS record, and `interval` reads the record's OWN entry
date rather than any date the physics fact itself carries. Both are
disclosed, deliberate choices (design-decisions section below), not
oversights the way the fully-null slots and the always-`None` interval
were before this change.

## What this normalizer does not attempt

- **Slot-vocabulary alignment for `actor`/`action`/`place`/`mechanism`.**
  `object` is closed (above); the other four still read `None`.
  `RESEARCH-OS-INTEGRATION.md`'s own finding stands: the production record
  is a real bridge on *shape*; whether a specific production's content
  means anything to this engine's address space is a separate, harder
  question this normalizer leaves open for these four. A K-12 physics
  vocabulary (`actor`/`action`/`place`/`mechanism` concepts drawn from
  `learning/app/corpus/02-physics.json`'s own atoms, or from `graph.nodes`
  itself) stays real follow-on work; `hte.vocab_induce.induce` is ready to
  absorb it the moment such values start appearing on a claim's own
  `slots`, no further wiring needed.
- **A live `graph.nodes` join.** `_target_node` is an optional enrichment
  key this normalizer reads if a caller supplies it; nothing in this
  change queries Supabase to fetch it. `load_supabase(table="productions")`
  reads bare `graph.productions` rows exactly as the REST API returns
  them; joining in the node's `tier`/`title`/`branch` before normalizing is
  the caller's job (a Supabase view over `productions` joined to `nodes`,
  or an application-side fetch), matching this module's existing "no
  network beyond the one documented request" contract.

## Design decisions a founder should confirm

Four defaults above are judgment calls made by hand, worth a founder's
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
4. **`claims[].interval` reads `created_at`'s own year, the date the
   record entered the corpus, standing in for a subject date the physics
   fact itself has no way to carry.** An `accepted` production now
   contributes a `GroundTruthEvent` dated by when the record entered the
   corpus, so `hte.calibrate`'s own discovery-date holdout mode
   (`choose_holdout_mode`) would read every such event's `year` and
   `discovery_year` as equal (this module's own `accepted_date` still sets
   `discovery_year` independently, but the two happen to land in the same
   year whenever a record is accepted the same year it was created, the
   common case for a fast-moving pilot). A founder wanting a real subject
   date instead (Rayleigh's law dates to 1871, a fact independent of
   whatever year a student submitted a production about it) needs a K-12
   physics vocabulary able to name a claim's own historical date rather
   than only its topic; until then, this reading is the one line to
   revisit (`normalize_research_os_record` in `hte/corpus/production.py`).

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
entries = [e for b in response['timeline']['bins'] for e in b['ranked_hypotheses']]
non_null_object = [e for e in entries if e['slots']['OBJECT'] not in (None, 'other-object')]
assert non_null_object, 'expected at least one ranked hypothesis with a non-null, non-OTHER OBJECT slot'
print('n_productions', response['corpus']['n_productions'])
print('n_survivors', response['corpus']['n_survivors'])
print('n_ranked_with_real_object_slot', len(non_null_object))
print('example OBJECT slot_label', non_null_object[0]['slot_labels']['OBJECT'])
"
# n_productions 2
# n_survivors 54
# n_ranked_with_real_object_slot 54
# example OBJECT slot_label Why The Sky Is Blue
```

Ground truth, checked directly against `hte.corpus.production._build_corpus`
(not through `hypothesize()`, which discards its own temp run directory and
never returns `corpus.ground_truth` in its response shape):

```bash
HTE_LLM_MODE=fake python3 -c "
import json
from hte.corpus import production
raw = json.load(open('hte/data/production-fixtures/research-os-sky-blue.json'))
productions = [production.Production.from_dict(r) for r in raw]
corpus = production._build_corpus(productions, status_min='draft', retrieval_run_id='t', source_path_for=lambda p: 'x')
print('n_ground_truth', len(corpus.ground_truth))
print([g.id for g in corpus.ground_truth])
"
# n_ground_truth 1
# ['ros-sky-blue-002-c0-e0']
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
