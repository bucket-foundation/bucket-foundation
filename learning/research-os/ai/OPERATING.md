# Running the evidence search pilot

What an operator does to turn the pilot on, keep it running, and turn it off. The measurements behind the numbers here are in [RUNTIME.md](RUNTIME.md); the contract they serve is in [IMPLEMENTATION.md](IMPLEMENTATION.md), "Operating envelope".

Everything runs on the founder's machine. No hosted deployment can reach a loopback worker, so Vercel serves the app with keyword ranking alone and says so.

## Turning it on

Four things have to line up: a built corpus, an admitted corpus, vectors for that corpus revision, and a worker holding those vectors.

```bash
set -a; . ./.env.local; set +a

# 1. the corpus, and its admission
npx ts-node --compiler-options '{"module":"commonjs"}' \
  scripts/research-os/evidence/build-corpus.ts build --limit 500
npx ts-node --compiler-options '{"module":"commonjs"}' \
  scripts/research-os/evidence/build-corpus.ts admit local/evidence/<revision> --allow-draft

# 2. the vectors for that revision
cd tools/evidence-search
python3 -m evidence_search verify                  # weights, licence, file hashes
python3 -m evidence_search build-vectors ../../local/evidence/<revision>
cd ../..

# 3. the worker, as a service
scripts/systemd/install-evidence-worker.sh local/evidence/vectors/<revision>/minilm-l6-v2

# 4. the app
#    .env.local:
#      RESEARCH_OS_AI_SEARCH=1
#      RESEARCH_OS_AI_SEARCH_PILOT_IDS=<learner id>,<learner id>
#      EVIDENCE_WORKER_URL=http://127.0.0.1:8431
#      EVIDENCE_WORKER_SECRET=<the value in ~/.config/evidence-worker.env>
```

The vectors and the corpus have to carry the same revision. A worker holding another one refuses every request with `stale_corpus`, and the app answers `degraded` with keyword ranking, which is a working search rather than an outage.

`--allow-draft` is there because the rights policy is a draft until the founder approves it. An approved policy needs no flag.

## Checking it

```bash
systemctl --user status evidence-worker.service
journalctl --user -u evidence-worker.service -n 50

# the worker, directly
curl -sf -H "x-evidence-worker-key: $EVIDENCE_WORKER_SECRET" http://127.0.0.1:8431/health

# the app's own answer, as a pilot account
curl -sf -H "authorization: Bearer <token>" \
  http://127.0.0.1:3000/api/research-os/evidence-search
```

The app's readiness answer names the corpus revision it loaded, how many sources it holds, and whether a worker is configured. `worker: false` means the app has no address or no secret, which is a configuration problem rather than a dead worker.

## What it costs

Measured on 2026-09-22, in the run recorded in [RUNTIME.md](RUNTIME.md).

| | Measured | The unit's cap |
|---|---|---|
| memory at peak | 3.4 GiB | `MemoryHigh=6G`, `MemoryMax=8G` |
| threads | 8 | `CPUQuota=800%` |
| start to first answer | 32 s | none; a start that never finishes shows as a failed unit |
| a search, warm | 91 ms p95 | the route's own 8-second deadline |
| vectors on disk | 12 MiB at 500 sources | the 20 GiB new-disk cap in the plan |

`MemoryMax` is what stops a leak taking the machine with it. The worker is one process holding one model; a kill under memory pressure ends the worker and the app keeps answering from keyword ranking.

## Turning it off

```bash
# the switch that matters: new requests stop reaching the pilot at all
#   .env.local: RESEARCH_OS_AI_SEARCH=0

systemctl --user stop evidence-worker.service      # then drain
```

Order matters. With the flag off the route answers 404 to everyone, including the pilot list, so no request is in flight when the worker stops. Stopping the worker first leaves the app serving keyword ranking, which is correct and still a live pilot.

`systemctl --user disable evidence-worker.service` keeps it stopped the next time the machine starts.

Stop the service before a gate run as well. Both gates in [RUNTIME.md](RUNTIME.md) start their own worker so the counters describe one run, and they refuse to start while another worker holds the port.

## Rolling back a corpus

A corpus directory is immutable and named by its revision, so a rollback is a change of which revision is admitted and which vectors the worker holds.

```bash
# 1. admit the revision to go back to
npx ts-node --compiler-options '{"module":"commonjs"}' \
  scripts/research-os/evidence/build-corpus.ts admit local/evidence/<older revision> --allow-draft

# 2. point the worker at that revision's vectors and restart
scripts/systemd/install-evidence-worker.sh local/evidence/vectors/<older revision>/minilm-l6-v2

# 3. point the app at the same directory if it names one
#    .env.local: RESEARCH_OS_EVIDENCE_DIR=local/evidence/<older revision>
```

Between steps 1 and 2 the worker holds a revision the server no longer admits, so every request answers `degraded` on keyword ranking. Nothing serves the withdrawn revision at any point in the sequence, which is the property the rollback exists for.

A failed build leaves `.tmp-<revision>-<pid>` on disk with its manifest written. Selection skips dot-prefixed names, so it cannot become the corpus the server serves; delete it once its problem is read.

## Withdrawing a source

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' \
  scripts/research-os/evidence/build-corpus.ts withdraw graph:<uuid> --reason "permission withdrawn"
```

The registry row changes first, and the Quote transaction locks it, so a quotation in flight either committed before the withdrawal or fails. Rebuild the artifacts afterwards so the withdrawn text leaves the files as well as the registry; the plan gives that 24 hours.

## Rotating the worker's secret

```bash
rm ~/.config/evidence-worker.env
scripts/systemd/install-evidence-worker.sh local/evidence/vectors/<revision>/minilm-l6-v2
# copy the new value into .env.local and restart the app
```

The worker compares the secret in constant time and refuses a short one, so a rotation that reaches only one side fails closed: the app's calls answer 401 and search degrades to keyword ranking.

## When something is wrong

| What you see | What it is |
|---|---|
| every answer says `degraded` | the worker is down, holds another revision, or the app has the wrong secret |
| `stale_corpus` in the worker's log | the vectors and the admitted corpus are different revisions |
| `corpus_unavailable` from the app | no built corpus under `local/evidence`, or `RESEARCH_OS_EVIDENCE_DIR` names a directory that is gone |
| `eligibility_unavailable` | the admissions table could not be read; the graph is down, and this clears on its own |
| 404 for a pilot account | `RESEARCH_OS_AI_SEARCH` is off |
| 403 `not_in_pilot` for the right person | their learner id is missing from `RESEARCH_OS_AI_SEARCH_PILOT_IDS` |
| the unit restarts in a loop | read `journalctl --user -u evidence-worker.service`; a missing vectors directory and a model revision that does not match the vectors both exit at once rather than serving |
