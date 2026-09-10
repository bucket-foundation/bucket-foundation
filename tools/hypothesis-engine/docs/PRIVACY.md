Privacy: Provenance and Purge
==============================

PR #35's own seam check (`gh pr view 35 --comments`) found five places a
learner's own text can land inside `tools/hypothesis-engine` that the
Research OS data inventory and delete path cannot reach, because they sit
outside the Supabase project `deleteLearnerData` deletes from. This doc
names the five spots, what this package now records about each one, the
purge command that reaches four of them directly, and what stays the
app side's job.

## The five landing spots

1. **Run directories**, `runs/<campaign>/<timestamp>/` (`hte.runner.
   run_campaign`'s own `MANIFEST.json`, `timeline.json`, `self-
   report.json`, `run.log`). A research-os campaign run over one or more
   accepted productions writes one of these per run; nothing deleted
   them until `hte purge` (below).
2. **The LLM response cache**, `<cache_dir>/*.json` (`hte.llm.complete`'s
   own `_write_cache`), keyed by a sha256 of `(model, prompt)`. A
   generate/critic/unknown-unknown prompt built from a production's own
   evidence can carry that evidence's quotes verbatim in the cached
   prompt, with no learner or production id anywhere in the filename.
3. **Bridge exports**, `<run>.bridge.json` (`hte.bridge_export`, PR #36,
   unmerged as this doc lands): evidence citation quotes, written
   alongside a run.
4. **Engine-derived graph nodes**, `graph.nodes`/`graph.edges`
   (`src/lib/research-os/engine-bridge.ts`, app side): a
   `provenance.evidence_refs` trace back to a specific production even
   though no write path sets `created_by`.
5. **feed402 write-back envelopes**, `public/research/hypotheses/
   <run-id>.json` and its `.bridge.json` sibling (`hte.canon_writeback`,
   same PR #36).

This engine owns 1 through 3 and 5. Item 4 is app-side (`graph.nodes`/
`graph.edges` live in Supabase); the app side deletes those rows
directly, the same way it deletes every other `PRIVACY_TABLES` row.

## Provenance

This engine's own provenance record stops at `production_id`: the
next section explains why.

`public.research_os_productions_outbox` (`supabase/migrations/
20260910010000_research_os_engine_bridge.sql`) never carries `learner_id`:
that migration's own column comment calls this out as deliberate, quoting
the migration file verbatim:
<!-- voice-ignore-next 1 -->
"`learner_id` and `transfer_proof` are deliberately left off this table,"
so a pseudonymous-but-real user id never reaches a second process. This
package honors that choice instead of working around it.

- `hte.corpus.research_os_outbox._stamp_corpus_provenance` sets
  `production_id` (always) and `learner_id` (only when the row itself
  carries one, which no real `research_os_productions_outbox` row does
  today) as plain instance attributes on every `Source`/`EvidenceItem`
  it builds. `hte.evidence.EvidenceItem`/`Source` gained no new field for
  this: both are ordinary, unslotted `@dataclass`es, so an attribute set
  from outside that module is read back the same way, `getattr(obj,
  "production_id", None)`. `hte.provenance.collect`/`collect_from_corpus`
  do exactly that read; every other corpus adapter's items carry
  neither attribute, and every read defaults to `None`/an empty list.
- `hte.roles.generate`/`critique`/`unknown_unknown` (the three role calls
  that carry `EvidenceItem`s directly) pass `hte.provenance.collect(...)`
  as `hte.llm.complete`'s own `provenance=` argument. `complete()`
  appends one line per call to `<cache_dir>/index.jsonl` mapping that
  call's cache key to the source/production/learner ids in play, **never
  the prompt or response text**. A repeat use of a cached answer appends
  again: the index is an append-only attribution log, each line its own
  record of one use.
- `scripts/campaign_research_os.py`'s `run()` calls `hte.provenance.
  stamp_manifest(artifacts.run_dir, corpus, skipped_rows=...)` once
  `run_campaign` returns, patching `MANIFEST.json` with a `provenance`
  block (`source_ids`/`production_ids`/`learner_ids`, plus a
  `by_production` map naming each production's own quotes and slot
  labels) and, when any outbox row failed to normalize, a `skipped_rows`
  list. `hte.runner.run_campaign` is not this change's own file to edit
  (see `~/agfarms/bucket-foundation/CLAUDE.md`'s working-tree rules, and
  this repo's own concurrent-branch constraint at the time this landed);
  patching the manifest after the fact, from the one script that already
  has both the run directory and the corpus in hand, avoids touching it.

**Consequence a caller must accept:** `hte.purge`'s own `--production
<id>` is the reliable key. `--learner <id>` is accepted and echoed on
the purge report (flagged `learner_id_mismatch` if this engine's own
data happens to carry a different learner id for that production, never
a reason to abort), but it is only a label: nothing in this engine
treats it as an independently matchable identifier, and nothing here
can search for "everything this learner touched" on its own, by design.
**The app side must translate a learner to their production id list
before calling purge**
(`graph.productions.learner_id`, a column this engine never reads).

## `hte purge`

```
hte purge --production <id> [--learner <id>] [--runs-root runs] \
  [--cache-dir <path>] [--public-root public/research/hypotheses] [--dry-run]
```

Or, from Python: `hte.purge.purge(production_id, *, learner_id=None,
runs_root="runs", cache_dir=None, public_root="public/research/hypotheses",
dry_run=False)`.

Four passes, one per reachable landing spot:

1. **Run directories.** Every `MANIFEST.json` under `runs_root` whose own
   `provenance.production_ids` names `id`. A run naming only `id` is
   deleted whole (`shutil.rmtree`); a run naming `id` alongside other
   productions is redacted in place instead: `MANIFEST.json`'s own
   `provenance.by_production[id]` entry (and `id` itself, from every
   summary list) is removed, and every occurrence of that production's
   own quotes and slot labels is blotted out with a `[redacted:<id>]`
   marker inside `timeline.json`, `self-report.json`, and `run.log`.
   `timeline.json`/`self-report.json` are checked for valid JSON after
   redaction; a redaction that would corrupt either file is refused,
   leaving that file exactly as it was.
2. **The LLM cache.** Every `<cache_dir>/index.jsonl` line naming `id` is
   dropped, and the `<cache_key>.json` response file it names is deleted
   outright, even on the rare chance another, non-purged production's
   own line names the identical cache key (two productions whose
   evidence produced the same prompt): a deleted, recomputable cache
   entry is the conservative choice over keeping one byte of a purged
   production's own attributable text on disk.
3. **Bridge exports.** Every `<runs_root>/**/*.bridge.json`: a generic
   JSON walk drops any entry whose own `source_id`/`quote`/`citation`
   names one of `id`'s known source ids or quotes (`hte.bridge_export`,
   PR #36, is not merged as this lands, so this walk is structural, kept
   generic on purpose rather than importing a field-name contract that
   is not yet on `main`).
4. **feed402 envelopes.** Every `<public_root>/*.json`, the same walk; a
   top-level envelope naming `id` is deleted outright (no wrapping list
   to drop one entry from), a list-wrapped export has the matching
   entries dropped and the file rewritten, kept valid.

Idempotent: run it again with the same `id` and every section of the
report comes back empty, since nothing on disk names that id any more.
`--dry-run` computes and returns the identical report with no write,
delete, or rename anywhere. A real (non-dry-run) call also writes
`<runs_root>/PURGE-<timestamp>.json`, the same report plus its own path:
what was removed or redacted, and (`report["not_found"]`) whether nothing
matched `id` anywhere at all.

## What the app side must do

`hte purge` reaches items 1, 2, 3, and 5 above. Item 4 (`graph.nodes`/
`graph.edges`) and the trigger itself live entirely on the app side:

1. **Before** calling `graph.privacy_delete_learner`/`deleteLearnerData`,
   capture the learner's full `productions.id` list (`graph.productions
   .learner_id`, the column this engine never reads).
2. Call (or queue) `hte purge --production <id>` for every one of those
   ids, once per id: this module's own CLI takes one production id per
   invocation, matching `hte.purge.purge`'s own signature.
3. Delete the matching `graph.nodes`/`graph.edges` rows on the app side
   (item 4): `provenance.evidence_refs` naming a purged production id is
   the app's own signal, since this engine's data never reaches that
   table directly.
4. Fold every purge report (`PURGE-<timestamp>.json`, or the dict `hte.
   purge.purge` returns) into the `privacy_events` audit row, the same
   way any other delete-path side effect is recorded.

The same shape, in read mode, answers the export question (PR #35's own
gap 4): call `hte purge --production <id> --dry-run` and fold the
returned report into `buildExportEnvelope`'s response, rather than
building a second read-only code path.

## The consent gate this engine cannot enforce

`requireConsent`/`decideConsent` (`src/lib/research-os/consent.ts`) sits
in front of nothing on the write path that feeds this engine: a
production's acceptance runs on a teacher's approve action alone
(`emitProductionOutboxIfAccepted`), and nothing on that path reads
`learner_profiles.consent_status`. An under-13 or 13-to-17 learner with
`consent_status: "none"`, or no profile row at all, can have a
production accepted, mirrored into `research_os_productions_outbox`, and
picked up by `scripts/campaign_research_os.py`, before any consent check
ever runs.

**This engine has no way to enforce that gate.** It reads whatever row
the outbox hands it; nothing in `hte.corpus.research_os_outbox` or
`scripts/campaign_research_os.py` calls back into Supabase to check a
learner's own consent status before ingesting their production, and
adding that check here would duplicate a decision the app side already
owns and already has the row for. The fix is app-side: the two-line
`requireConsent` call `consent.ts`'s own header already documents, in
`src/app/api/research-os/production/route.ts`'s approve path, before an
unconsented production ever reaches the outbox at all. Until that lands,
the statement is the one PR #35's seam check made: an unconsented
production reaching a campaign is possible today, and this doc is where
that fact is written down rather than left implicit.
