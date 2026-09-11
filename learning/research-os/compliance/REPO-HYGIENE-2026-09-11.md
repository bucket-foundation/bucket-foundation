# Repo Hygiene Pass: Local Paths and Machine-Specific Data

Pass date 2026-09-11.

ROTATE: nothing in this repo needs rotation. Two AWS-access-key-shaped
strings were found (see "Secret patterns checked" below); both belong to
Figma's own S3 account, embedded in an already-expired 7-day presigned
thumbnail URL from an `agf-figma pull` export, a vendor credential with no
bearing on any AGFarms secret. Redacted anyway, since a public repo should
not carry an AWS-access-key-shaped string regardless of whose it is.

A repo-wide pass on tracked files carrying `/home/gian` (or another local
user's absolute home directory), non-public infrastructure identifiers,
and secret-shaped tokens. Scope: `git grep -l "/home/gian"` plus targeted
greps for hostnames, RFC1918 IPs, `~/.ssh`, and common API-key/token
prefixes, run from a worktree off `origin/main`
(`.ros-worktrees/scrub`, branch `chore/local-path-scrub`). No file was
deleted; no file's meaning was changed, only machine-specific path
prefixes and one query-string secret.

## Inventory

Every tracked file `git grep -l "/home/gian"` returned, its hit count at
the start of this pass, its category, and what happened to it. "Rewritten"
means the absolute prefix is gone from that file as of this PR;
"allowlisted" means the file is left as-is and is now a documented,
reviewed exception (see "Founder decision" and the new pre-commit/CI
guard, both below).

| Path | Count | Category | Recommendation | Action |
|---|---|---|---|---|
| `.beads/backup/events.jsonl` | 3 | backup data | keep; propose untrack | left as-is, allowlisted |
| `.beads/backup/issues.jsonl` | 3 | backup data | keep; propose untrack | left as-is, allowlisted |
| `PRODUCTION_LOG.md` | 11 | doc (operational log) | rewrite path mentions; flag the 2 `/home/giany/...` lines for founder review (see "Beyond `/home/gian`" below) | 9 lines rewritten to `~/...`; 2 `/home/giany/` lines left, allowlisted |
| `_intake/.archive-runner.log` | 2516 | runner log | keep; propose untrack | left as-is, allowlisted |
| `_intake/2026-05-18-agentic-search-demo/PLATFORM-RECOVERY-RUNBOOK.md` | 8 | doc (runbook) | rewrite path | rewritten to `~/...` |
| `_intake/embeddings/claim-evidence.jsonl` | 599 | data (`source_path` field, intentionally committed per `.gitignore`'s own comment) | rewrite path, repo-relative | rewritten, prefix stripped |
| `_intake/health-longevity-fitness/media/MANIFEST.jsonl` | 294 | data (`path` field) | rewrite path, repo-relative | rewritten, prefix stripped |
| `_intake/health-longevity-fitness/reports/_epub_combined.md` | 399 | doc (markdown image links, load-bearing: absolute local paths broke the images for anyone else) | rewrite to a renderable path | rewritten to repo-root-relative (`/​_intake/...`) |
| `_intake/health-longevity-fitness/reports/_review/_apply-cycle2.md` | 1 | doc (agent work-dir brief) | rewrite path | rewritten to `~/...` |
| `_intake/health-longevity-fitness/reports/_review/_apply-cycle3.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `_intake/health-longevity-fitness/reports/_review/_apply-cycle4.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `_intake/health-longevity-fitness/reports/_review/_fix-cycle1.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `_intake/health-longevity-fitness/reports/_review/_verify-brief.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `_intake/health-longevity-fitness/reports/viz/_placement_brief.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `_intake/health-longevity-fitness/reports/viz/_trim_brief.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `_intake/health-longevity-fitness/reports/viz/build_structures.py` | 4 | code (load-bearing font paths) | env var + `os.path.expanduser`, note in nearest README | rewritten; note added to `_intake/health-longevity-fitness/README.md` |
| `_intake/health-longevity-fitness/reports/viz/ds.py` | 1 | code (load-bearing font paths) | env var + `os.path.expanduser`, note in nearest README | rewritten; same README note |
| `_intake/research-os-k12/CHANGELOG.md` | 22 | doc (changelog; every hit quotes this same "no `/home/gian` paths" leak-scan policy, none is an actual leaked path) | keep with note | left as-is, allowlisted |
| `_intake/sacred-history-corpus/runners/sacred-history-mirror.service.template` | 1 | systemd unit | keep; propose untrack | left as-is, allowlisted |
| `bucket-canon/01-mathematics/_intake/mathematics-canon-pass-2-2026-05-01.md` | 1 | doc (self-referential file-path label) | rewrite path | rewritten to `~/...` |
| `bucket-canon/_bridges/detected/*/README.md` (17 files, listed below) | 15 each, 255 total | doc (auto-generated bridge-detection reports citing in-repo files) | rewrite path, repo-relative | rewritten, prefix stripped |
| `checkpoints/2026-05-03-session-checkpoint.md` | 4 | doc (session narrative; all 4 hits are `/home/giany/derbyfish-local-supabase/...`, DerbyFish's `.env` file paths) | keep with note, flag for founder review (see "Beyond `/home/gian`" below) | left as-is, allowlisted |
| `data/patents/uspto/scripts/fetch_bulk_xml.sh` | 1 | code (load-bearing `ROOT` default) | env var default, `$HOME` not `~` (quoted context) | rewritten |
| `data/patents/uspto/scripts/fetch_patentsview.sh` | 2 | code (load-bearing `ROOT` default + comment) | env var default, `$HOME` | rewritten |
| `deploy/k8s/README.md` | 2 | doc | rewrite path | rewritten to `~/...` |
| `deploy/k8s/postgres-image/Dockerfile` | 1 | doc (comment) | rewrite path | rewritten to `~/...` |
| `docs/INDEXING.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `docs/research-tools/04-implementation-architecture.md` | 1 | doc (inline prose showing an example systemd `WorkingDirectory=` line) | rewrite path | rewritten to `~/...` |
| `learning/.buildloop/LOOP_TASK.md` | 1 | doc/config (agent task prompt, load-bearing: an agent reads this line to find its own project root) | rewrite path | rewritten to `~/...` |
| `learning/.buildloop/run.log` | 7765 | runner log | keep; propose untrack | left as-is, allowlisted |
| `learning/app/corpus/_build/extract-kaikki-translations.py` | 1 | code (load-bearing `KAIKKI_CACHE` default) | `os.path.expanduser` | rewritten |
| `learning/research-os/CHANGE-LEDGER.md` | 18 | doc (change ledger; same self-referential leak-scan quoting as `CHANGELOG.md` above) | keep with note | left as-is, allowlisted |
| `local/patents/README.md` | 3 | doc | rewrite path | rewritten to `~/...` |
| `manifesto-source/bobber-concept-art-v2/2026-05-03/generate_v2.py` | 1 | code (load-bearing script root) | compute from `__file__` | rewritten to `pathlib.Path(__file__).resolve().parent` |
| `mcp-server/bucket-mcp.py` | 1 | code (comment: example MCP registration command) | rewrite path | rewritten to `~/...` |
| `quantum/reference-impl/CLAUDE-SCIENCE-SETUP.md` | 3 | doc | rewrite path | rewritten to `~/...` |
| `quantum/reference-impl/HARDWARE_STAGING.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `scripts/llm/README.md` | 1 | doc | rewrite path | rewritten to `~/...` |
| `scripts/llm/llm-server.sh` | 2 | code (load-bearing `MODEL`/`LLAMA_BIN` defaults) | env var default, `$HOME` | rewritten |
| `scripts/llm/systemd/bkt-llm-revtunnel.service` | 1 | systemd unit | keep; propose untrack | left as-is, allowlisted |
| `scripts/llm/systemd/bkt-llm-server.service` | 3 | systemd unit | keep; propose untrack | left as-is, allowlisted |
| `scripts/llm/systemd/bkt-llm-shim.service` | 4 | systemd unit | keep; propose untrack | left as-is, allowlisted |
| `scripts/photon/boost.sh` | 1 | code (`cd` at script top) | rewrite path | rewritten to `~/...` |
| `scripts/photon/build_hnsw.sh` | 1 | code | rewrite path | rewritten to `~/...` |
| `scripts/photon/complete_local.sh` | 1 | code | rewrite path | rewritten to `~/...` |
| `scripts/photon/finalize_full.sh` | 1 | code | rewrite path | rewritten to `~/...` |
| `scripts/photon/load_full.sh` | 1 | code | rewrite path | rewritten to `~/...` |
| `scripts/photon/pull_full_prod.sh` | 1 | code (`cd` line only; a separate `giany@5.161.236.151` default on the next line is out of the `/home/gian` scope, see "Beyond `/home/gian`" below) | rewrite path | rewritten to `~/...` |
| `scripts/photon/rebuild_hnsw_hi.sh` | 1 | code | rewrite path | rewritten to `~/...` |
| `scripts/photon/restart_api.sh` | 1 | code | rewrite path | rewritten to `~/...` |
| `scripts/photon/tunnel.sh` | 1 | code | rewrite path | rewritten to `~/...` |
| `scripts/systemd/canon-intake.service` | 1 | systemd unit | keep; propose untrack | left as-is, allowlisted |
| `services/photon-api/complete-deploy.sh` | 1 | code (`cd` at script top) | rewrite path | rewritten to `~/...` |
| `services/research-tools/gateway.py` | 1 | code (load-bearing `SCREENSERVER_DIR` default) | `Path.home()`, matches the file's own existing pattern for `TOOLS_REPO_DIR` two lines up | rewritten |
| `tools/hypothesis-engine/docs/LOOP-LOG.md` | 5 | doc (loop log; every hit quotes the PR-review standard's own "no `/home/gian` paths" rule) | keep with note | left as-is, allowlisted (also already in `.voiceignore` for the separate voice-rule concern) |

The 17 `bucket-canon/_bridges/detected/*/README.md` files, each rewritten
the same way: `01-non-symmetry-principle`, `02-multivalence`,
`03-subjective-truth`, `04-wound-healing`, `05-cold-increases-energy`,
`06-demonstration`, `07-extracurricular-learning`,
`08-second-law-of-thermodynamics`, `09-intrinsic-pressure`,
`10-photoelectric-effect`, `11-nonlinear-dynamical-systems`,
`12-constant-speed-of-light`, `13-global-causality`,
`14-decentralized-operational-law`, `15-curvature-is-fundamental`,
`16-lack-of-self-reference`, `17-two-story-narrative`.

Totals: 71 files carried `/home/gian`. 53 were rewritten. 14 are now
allowlisted with a stated reason (7 backup/log/systemd, 5 narrative/meta
docs that only ever quote this policy, 2 cross-venture disclosures flagged
for founder review). The remaining 4 hits are `/home/giany/` lines in
`PRODUCTION_LOG.md`, outside this pass's rewrite scope by design (see
below). A repo-wide `git grep -l "/home/gian"` (the exact command the
inventory started from) now returns only the 14 allowlisted files.

## Secret patterns checked

Beyond `/home/gian`, this pass grepped for `sk-ant-`/`sk-proj-`/`sk-live-`/
`sk-test-`/generic long `sk-`, `figd_`, `ghp_`, `xox[baprs]-`, `AKIA`, and
`BEGIN ... PRIVATE KEY`, plus a broad `eyJ` (JWT-shaped) sweep.

- **`AKIA` (2 hits, redacted):** `figma-export/bucket-1.0/2026-04-15/_file.json`
  and `figma-export/bucket-pitch/2026-04-23/_file.json`, both a
  `thumbnailUrl` field holding an AWS SigV4 presigned URL to
  `s3-alpha.figma.com`. This is Figma's own AWS account, signing its own
  CDN thumbnail, captured verbatim by `agf-figma pull`; the URL's
  `X-Amz-Expires=604800` (7 days) against an April 2026 `X-Amz-Date` means
  it has been dead for months. Not an AGFarms credential and nothing to
  rotate on our side. The query string (credential ID, date, signature)
  is replaced with `?REDACTED-presigned-aws-url` in both files; both
  remain valid JSON.
- **`eyJ...` JWT-shaped strings:** one real hit,
  `polingual/src/lib/photon-db.ts:19`, a self-hosted Supabase local `anon`
  role token (`{"role":"anon","iss":"supabase"}`, no service-role claim).
  The line's own comment says "restricted at the DB level. Override via
  env in production." An `anon` key is meant to ship in client code, RLS
  is the actual boundary, so this is left as-is; it is not the kind of
  secret this pass redacts. Every other `eyJ`-shaped match was a false
  positive: `package-lock.json` integrity hashes, `figures-gallery.html`
  inline base64 image data, a Wikimedia/researchgate query-string
  fragment in `archaeology/pleiades/*/place.json`, and a base64-encoded
  x402 `PAYMENT_REQUIRED` demo envelope (`_intake/2026-05-18-agentic-search-demo/`,
  `docs/AGENT-TRUST.md`, `src/app/verify/`, `src/app/protocol/agent-trust/`)
  whose only decodable content is a public Base Sepolia wallet address and
  a demo price, no token material anywhere in the envelope.
- `sk-`, `figd_`, `ghp_`, `xox[baprs]-`, and `BEGIN ... PRIVATE KEY`: zero
  real hits. The initial broad `sk-` grep matched only English words
  containing the substring ("risk-", "-guidelines" typos) once narrowed
  to an actual key shape.

## Beyond `/home/gian`

Three findings outside the literal `/home/gian` grep, surfaced by the same
"other machine identifiers" sweep the task asked for
(`prod-hetzner`, RFC1918 ranges, `~/.ssh`). None was rewritten; each is a
founder call this pass documents rather than acts on.

1. **A real public server IP, hardcoded, in 9 files.** `5.161.236.151`
   (the Hetzner CPX42 box) appears as plain text in `PRODUCTION_LOG.md`,
   `grants-gateway/README.md`, `grants-gateway/deploy/k8s.yaml`,
   `scripts/llm/README.md`, `scripts/llm/install-services.sh`,
   `scripts/llm/systemd/bkt-llm-revtunnel.service`,
   `scripts/photon/pull_full_prod.sh`, `services/photon-api/deploy.sh`,
   and `services/research-tools/deploy/DEPLOY.md`. This repo's own
   `CLAUDE.md` already names the box by hostname only
   (`prod-hetzner-1`) in 11 other files (`ROADMAP.md`,
   `services/photon-api/README.md`, `services/research-tools/deploy/*`,
   and others), and the org `CLAUDE.md` states the IP belongs in `~/.env`
   or the ops vault, kept out of tracked files. `scripts/photon/pull_full_prod.sh`
   and `services/photon-api/deploy.sh` already read `AGFARMS_HOST` as an
   env var override; only their fallback default bakes in the raw IP.
   Rewriting a production deploy script's default host without testing it
   against the real box is a behavior change this pass did not make;
   recommend a follow-up bead to swap the fallback for the `prod-hetzner-1`
   hostname (already resolvable, per `PRODUCTION_LOG.md`'s own DNS note)
   or drop the default entirely and require the env var.
2. **A private key's file path, named twice.** `PRODUCTION_LOG.md:50`
   named the Base wallet private key's location as an absolute path before
   this pass (now `~/.bucket-wallet.env`, matching the same file's row 12,
   which already used `~`). No key material is in the repo; only the file
   path was disclosed, and only the path form changed here.
3. **Cross-venture disclosure.** `checkpoints/2026-05-03-session-checkpoint.md`
   (lines 232-234, 240) and `PRODUCTION_LOG.md` (lines 298, 403) name
   `/home/giany/derbyfish-local-supabase/.env` and
   `/home/giany/x402-research/gateway/.env`: DerbyFish's and the
   x402-research-gateway's own `.env` file locations, disclosed inside
   this public Bucket Foundation repo. No secret value is present, both
   entries explicitly say the `.env` itself is not committed, but the
   file's existence and location is. Left untouched and allowlisted
   pending a founder call on whether to redact a historical record versus
   leave it as an accurate incident log.

`172.19.0.2` (the K3s Traefik NodePort's container-internal IP) also
appears in `CLAUDE.md`, `checkpoints/2026-05-03-session-checkpoint.md`,
`services/research-tools/deploy/DEPLOY.md`, and
`services/research-tools/deploy/nginx-research-tools.agfarms.dev.conf`.
This is a Docker-internal address with no route from outside the box;
listed here for completeness, no action recommended.

Not in scope for this pass: a repo-wide `*.log` audit. `git ls-files`
shows 292 tracked `.log` files; only the two named in the inventory table
above (`_intake/.archive-runner.log`, `learning/.buildloop/run.log`)
matched the `/home/gian` grep this pass was scoped to. The other 290
(mostly `yt/*/transcript.error.log` and `blog/*/.scrape.log`) are
untouched and unreviewed here.

## Founder decision: untrack these

The `.gitignore` changes in this PR are commented out and inert; nothing
stops being tracked by this PR alone. Each line below is `git rm --cached
<path>`, which removes the file from the next commit onward and from
`git status` going forward, but the file stays on disk and every prior
commit that touched it is untouched, so the content remains reachable in
history (`git log --all --full-history -- <path>`, or a checkout of an
old commit) until a separate history-rewrite the founder has not asked
for. Uncommenting the matching `.gitignore` line (already added, see
below) stops a future re-add from ever happening by accident again.

| Path | What it is | Untrack command |
|---|---|---|
| `.beads/backup/events.jsonl` | bead event export, regenerated by the bead backup mechanism | `git rm --cached .beads/backup/events.jsonl` |
| `.beads/backup/issues.jsonl` | bead issue export, same mechanism | `git rm --cached .beads/backup/issues.jsonl` |
| `_intake/.archive-runner.log` | raw terminal output from the archive runner | `git rm --cached _intake/.archive-runner.log` |
| `learning/.buildloop/run.log` | raw terminal output from the nightly build-loop agent | `git rm --cached learning/.buildloop/run.log` |
| `_intake/sacred-history-corpus/runners/sacred-history-mirror.service.template` | systemd unit template | `git rm --cached _intake/sacred-history-corpus/runners/sacred-history-mirror.service.template` |
| `scripts/llm/systemd/bkt-llm-revtunnel.service` | systemd unit | `git rm --cached scripts/llm/systemd/bkt-llm-revtunnel.service` |
| `scripts/llm/systemd/bkt-llm-server.service` | systemd unit | `git rm --cached scripts/llm/systemd/bkt-llm-server.service` |
| `scripts/llm/systemd/bkt-llm-shim.service` | systemd unit | `git rm --cached scripts/llm/systemd/bkt-llm-shim.service` |
| `scripts/systemd/canon-intake.service` | systemd unit | `git rm --cached scripts/systemd/canon-intake.service` |

The corresponding `.gitignore` lines are commented out at the bottom of
the file, under "Proposed, not yet active." Uncomment the lines for
whichever paths the founder untracks; leave the rest commented.

Not proposed for untracking, kept tracked with a founder-review flag
instead (see "Beyond `/home/gian`," item 3): `checkpoints/2026-05-03-session-checkpoint.md`
and `PRODUCTION_LOG.md`. Neither is generated data or a runner artifact;
both are narrative records a human wrote, so untracking is not the right
tool even if the founder decides the cross-venture disclosure needs
addressing. Redacting the four specific lines in place, by hand, is the
likely fix if the founder wants one; this pass does not do it, since it
edits history's own record of what happened rather than genericizing a
path.

## New guard: tools/hygiene/check-local-paths.py

A script and an allowlist, wired into a new CI workflow
(`.github/workflows/hygiene-local-paths.yml`, runs on every pull request
and every push to `main`):

- `tools/hygiene/check-local-paths.py`: scans tracked text files for
  `/home/<user>/...`, matching any username, and skips anything listed in
  `tools/hygiene/.local-path-allowlist`. `--staged` (default)
  checks `git diff --cached`, for local pre-commit use; `--all` checks
  every tracked file, used by CI; explicit file arguments are for the
  fixture test. The match pattern requires the leading `/` not be
  preceded by a word character, so a URL path segment that happens to
  contain the literal text `/home/` (`https://iai.tv/home/speakers-and-authors/...`,
  common across this repo's scraped citation corpora: `archaeology/`,
  `openalex*/`, `arxiv/`, `yt/`, `blog/`, `pubmed/`) does not trip it,
  while a real absolute path, always preceded by whitespace, a quote, a
  shell operator, or line start, still does.
- `tools/hygiene/.local-path-allowlist`: the 14 allowlisted files from
  the inventory table above, plus `tools/hypothesis-engine/tests/test_api.py`
  (a test asserting the hypothesis engine's own error-sanitizer redacts
  `/home/x` and other absolute-root placeholders, fixture input for that
  assertion) and this checker's own four files (the hygiene doc names
  every leaked path it found, `check-local-paths.py`'s docstring gives an
  example, and the fixture test below deliberately creates temp content
  containing `/home/alice` and similar strings to prove the checker still
  catches them), 19 entries total.
- `tools/hygiene/test-check-local-paths.sh`: the fixture test. Four
  cases: a clean file passes, a fresh `/home/alice/...` path fails and
  is reported, a non-`gian` username shape (`/home/build-bot-7/...`)
  fails too (confirming the check is not hardcoded to one machine), and
  an allowlisted file (`PRODUCTION_LOG.md`) passes despite its known
  residual hits.

This repo's existing voice-rule pre-commit hook
(`~/agfarms/.githooks/pre-commit`, wired in via `git config
core.hooksPath`, calling `~/agfarms/tools/voice/`) lives outside this
repository, at the AGFarms org level, shared by every venture; it is not
a file this PR can extend, since a fresh clone of Bucket Foundation would
not have it, and touching an org-wide shared hook from a single venture's
PR has no review path. `tools/hygiene/check-local-paths.py --staged`
follows the same calling convention (a repo-relative script, a `--staged`
flag reading `git diff --cached`, a non-zero exit on a hit) on purpose, so
the founder can wire it into that shared hook with one line
(`python3 "$REPO_ROOT/tools/hygiene/check-local-paths.py" --staged || fail=1`,
guarded the same way the voice check already is) if local, pre-push
enforcement is wanted in addition to the CI check this PR ships.

`python3 tools/hygiene/check-local-paths.py --all` against the repo as of
this PR: clean, zero hits (every remaining `/home/gian` instance is
allowlisted). `bash tools/hygiene/test-check-local-paths.sh`: all four
fixture cases pass.
