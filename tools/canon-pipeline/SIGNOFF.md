# Canon sign-off

The human sign-off tool for `bucket-canon/`, implementing `GOVERNANCE.md`'s
"Canon sign-off" section.

## Policy

No record in `bucket-canon/` counts as approved canon until a named human
signs off. `tools/canon-pipeline/intake.py` lands a new or backfilled record
with `provenance_signoff: "pending: <name>"`. `src/lib/canon-primary.ts`'s
`isPendingSignoff` gate reads that field: a record whose value starts with
`pending` or `rejected` is excluded from `loadPrimaryPapers()`, so it is
never ranked, served in the `/api/research` paid-cite envelope, or presented
as approved canon anywhere the site reads from that loader. A record with no
`provenance_signoff` field predates the rule (ros-11) and stays ungated.

This tool is the only sanctioned way to move a record out of `pending`:

| Value | Meaning |
|---|---|
| `pending: <name>` | awaiting a decision (intake.py's default) |
| `approved: <name> <ISO date>` | a named human approved it |
| `rejected: <name> <ISO date>: <reason>` | a named human rejected it, with a reason |

Approving or rejecting edits only the target record's `provenance_signoff:`
line, in place. Every decision also appends one entry to
`CANON-INGESTION-INDEX.md` under a `## Canon sign-off, <date>` heading,
so the audit trail lives in the same file the ingestion pipeline itself
writes to.

Both actions are idempotent: repeating the same verb on a record already in
that state is a no-op (prints a message, changes nothing, exits 0). Moving
from `rejected` to `approved` (or back) is allowed; a founder who rejected a
record for a fixable reason (a stale DOI, say) can approve it later once
that is resolved.

## Two signoff vocabularies

A second, unrelated write path exists: `hte.canon_writeback.write_back`
(the hypothesis engine's own write-back, `tools/hypothesis-engine/hte/
canon_writeback.py`). It writes a `signed_off_by: <name>` field, with no
verb and no date embedded in the field, on markdown cards tagged
`canon_tier: candidate` under `bucket-canon/<branch>/hypotheses/*.md`. It
never writes `canon_tier: canon`, and it requires a non-blank `signoff`
argument before any file touches disk at all: a blank one is a hard
`ValueError` refusal, raised before the write happens, so no "pending"
state ever lands on disk from that path. Nothing it writes is `pending` in
this tool's sense, so `list`
never surfaces it and `approve`/`reject` never touch it. This is deliberate:
that gate's semantics are untouched by this tool. `audit` still surfaces
those write-back events (they land in the same `CANON-INGESTION-INDEX.md`
file), tagged separately as "hypothesis-engine write-back," so the audit
trail stays complete without conflating the two vocabularies.

## Two allowlists

Approving or rejecting canon requires TWO layers of gating, in the web page:

1. `RESEARCH_OS_REVIEWER_EMAILS` (`src/lib/research-os/reviewer.ts`), the
   existing Research OS teacher-reviewer allowlist.
2. `CANON_SIGNOFF_APPROVERS` (`src/lib/canon-signoff-approvers.ts`), a
   second, narrower allowlist reserved for the founder. A Research OS
   reviewer who is not also on this list gets a 403 from
   `/api/canon/signoff`, even though they pass the first gate.

Both env vars are comma-separated, case-insensitive email lists, and both
fail closed: an unset or empty value approves nobody. Neither list's
membership is ever returned to a client; a missing token, a non-reviewer,
and a reviewer who is not an approver all return the same
`{"error":"forbidden"}` 403.

The CLI has no such gate; it runs with the operator's own filesystem and
git access, the same trust boundary every other `tools/canon-pipeline/*.py`
script already assumes.

## Commands

```bash
# list every pending record: path, title, tier, DOI, score
python3 tools/canon-pipeline/signoff.py list

# approve (refuses unless the DOI resolves via a HEAD request)
python3 tools/canon-pipeline/signoff.py approve bkt-2f40cfaacd63 --by gianyrox

# approve a record with no DOI, or skip the network check
python3 tools/canon-pipeline/signoff.py approve bkt-xxxx --by gianyrox --offline

# reject, with a required one-line reason
python3 tools/canon-pipeline/signoff.py reject bkt-xxxx --by gianyrox --reason "broken DOI, superseded by a 2024 edition"

# every signoff event recorded in CANON-INGESTION-INDEX.md
python3 tools/canon-pipeline/signoff.py audit

# machine-readable output on any subcommand
python3 tools/canon-pipeline/signoff.py list --json
```

`<record>` accepts three forms: a bare record id (e.g. `bkt-2f40cfaacd63`,
globally unique), `<path>#<id>` for precision, or a bare path to a
`primary-papers.yaml` file or its concept directory when it carries exactly
one pending record. `list`'s own output prints the exact `<path>#<id>` form
for every row.

## Web

`/canon/signoff` lists the same pending records with approve/reject buttons,
calling `GET`/`POST /api/canon/signoff`
(`src/app/api/canon/signoff/route.ts`), which shares its approve/reject
logic through `src/lib/canon-signoff.ts` rather than embedding it inline.
The approver identity is always the caller's own verified email, never a
client-supplied field, so attribution cannot be spoofed. The web page's
approve action always runs the live DOI check; there is no `--offline`
equivalent exposed in the UI, only in the CLI.

**Operational note.** This app deploys to Vercel. A Vercel Node function's
filesystem is read-only at runtime, so a write from `/api/canon/signoff`
throws (surfaced as a 500) unless the running process has a writable git
checkout (local `npm run dev`, or a self-hosted `next start` against a
working tree an operator commits from). The CLI, run against a real clone,
is the durable path until a database- or GitHub-API-backed write path
replaces direct filesystem writes; a write made through the web page on a
writable deployment still needs its resulting diff committed and pushed to
persist past the next redeploy, the same as any other change to a tracked
file.

## Audit trail

`CANON-INGESTION-INDEX.md` carries a `## Canon sign-off, <date>` heading per
decision, each with one line: `- **approved**: \`<path>#<id>\` "<title>" by
<name> on <date> (DOI verified)` or the `rejected` equivalent with `--
reason: <text>` appended. `audit` reads them back, plus the hypothesis
engine's own `Signed off by <name>.` write-back sentences from the same
file, reported in a separate section (see "Two signoff vocabularies" above).

## Filter consistency

`isPendingSignoff` (`src/lib/canon-primary.ts`) excludes both `pending` and
`rejected` values. A rejection is a decision that came back negative, and
must never be served as approved canon on the technicality that its value
no longer starts with the word "pending." Covered by
`scripts/test-canon-primary-signoff.ts`.

## Records pending sign-off

As of 2026-09-10, `python3 tools/canon-pipeline/signoff.py list` found **20** records carrying
`provenance_signoff: "pending: gianyrox"` across five dossiers:
`04-information/information-foraging` (1), `07-mind/cognition-and-automation`
(1), `07-mind/curiosity-and-motivation` (4), `07-mind/memory-systems` (3),
and `07-mind/sub-outcomes/education` (11, outcome tier). All 20 carry a DOI.

Eleven of those twenty live under `07-mind/sub-outcomes/education/`, two
levels below its branch directory. `src/lib/canon-primary.ts`'s own
`findPrimaryFiles` walks only one level below each branch
(`<branch>/<concept>/primary-papers.yaml`), so it does not currently reach
that file at all: those eleven records are not served by `/api/research`
today regardless of sign-off status. This tool's own file discovery walks
the full tree at any depth, so `list` still surfaces all twenty. Fixing
`findPrimaryFiles`'s depth limit would change what `/api/research` serves
and is a separate, unrequested change, out of scope here; flagged for
whoever picks it up next.

### Founder runbook

1. `cd bucket-foundation && python3 tools/canon-pipeline/signoff.py list`
   to see the current queue: path, title, tier, DOI, score.
2. Read each record (the DOI resolves to the real paper; `canon_score_reasons`
   in the underlying YAML explains the score) before deciding.
3. `python3 tools/canon-pipeline/signoff.py approve <path>#<id> --by gianyrox`
   for each one that passes review, or `reject ... --reason "..."` for one
   that does not.
4. Commit the result: `git add bucket-canon/ CANON-INGESTION-INDEX.md && git commit`.
   Nothing here auto-commits; the sign-off itself is a plain file edit like
   any other change to `bucket-canon/`.
5. `python3 tools/canon-pipeline/signoff.py audit` any time, to see the full
   history of who approved or rejected what, and when.

No record's `provenance_signoff` value is changed by this PR. The 20 records
above are listed for context; the founder runs the approve/reject commands
directly, on a branch of their own.
