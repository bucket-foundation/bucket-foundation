# Runtime and Model gates

Two of the release gates in [IMPLEMENTATION.md](IMPLEMENTATION.md), "Verification and release", run on this machine without any import work: whether the pilot answers fast enough to use, and whether the pinned weights are doing the retrieval. Both write a dated report, and both exit non-zero when a threshold is missed.

## What each gate measures

| Gate | Question | Passes when |
|---|---|---|
| Runtime | Can a person use this | 200 warm requests at concurrency one and 200 at concurrency two, p95 at or under 2 s and 5 s; 20 cold starts, first answer p95 at or under 5 s; errors at or under 1%; no request past the eight-second deadline; at least 99% of answered requests on the neural path; every request during a restart answered from keyword ranking |
| Model | Are the weights doing the work | Every case answers on the neural path with the pinned model revision, the worker's own counter rises once per case, the neural path reorders at least 6 of the 12 cases, and returns at least 3 that keyword search misses |

The neural-share check is the one that stops a run passing on the fallback. A worker that is down still answers, through the keyword fallback, inside every latency budget. Without that check a run where the model never loaded would read as the fastest run ever recorded.

A restart holds two waits that differ by a factor of three hundred, so the run measures three things per cold start and the report keeps them apart.

| Measured | What it is | Gated against |
|---|---|---|
| a request with the worker stopped | what a person meets during a restart: checked keyword ranking, marked degraded | the eight-second deadline, zero errors, every answer degraded |
| the worker's own start | loading Python, torch and the weights, with no request inside it | a 60-second ceiling, so a broken install fails |
| the first search after it is up | the request the plan's five-second cold budget is about | 5 s p95, zero errors, every answer on the neural path |

Gating the first answer rather than the whole restart is a claim that nobody waits through a worker start, and the run proves that claim rather than assuming it: the request issued while the worker is stopped has to come back inside the same deadline with `degraded` on it, or the gate fails.

## Running them

Each gate owns the worker process for the length of its run, so the worker's counters describe that run alone. Stop any worker already listening first, or the run refuses to start.

```bash
set -a; . ./.env.local; set +a

# one shell: the app, with the pilot on and a cap that a load run fits inside
RESEARCH_OS_AI_SEARCH=1 \
RESEARCH_OS_AI_SEARCH_PILOT_IDS=<your learner id> \
RESEARCH_OS_DAILY_TOOL_CAP=5000 \
RESEARCH_OS_EVIDENCE_DIR=local/evidence/<corpus revision> \
EVIDENCE_WORKER_URL=http://127.0.0.1:8431 \
EVIDENCE_WORKER_SECRET=<32+ characters> \
npm run dev

# another shell
export EVIDENCE_WORKER_URL=http://127.0.0.1:8431 EVIDENCE_WORKER_SECRET=<the same>
export BENCH_EMAIL=<the pilot account>
npm run gate:evidence:model      # about a minute
npm run gate:evidence:runtime    # about six minutes, mostly the 20 model loads
```

`RESEARCH_OS_DAILY_TOOL_CAP` matters: the default is 200 requests a day per learner, and a runtime run sends more than 400. A reached cap fails the run on its own check rather than hiding inside the error rate, so a report can never read as a latency problem when it was a configuration one.

Reports land in `local/evidence/gates/`, which git ignores, as `runtime-<timestamp>.{json,md}` and `model-<timestamp>.{json,md}`. The markdown is what goes in a release review; the JSON holds every sample.

## The fixtures

[model-gate-fixtures.json](model-gate-fixtures.json) holds 12 paraphrase cases written against node titles in the admitted corpus before any result was measured. Each query asks its question in words the target's own slug does not use, and `scripts/test-research-os-evidence-gates.ts` enforces that: a case that shares a content word with its target's slug fails the test suite.

Editing a case after seeing its result voids the gate. Write a new fixture file, and say in it why the old one was wrong.

## Reading a failure

| Check that failed | What it means |
|---|---|
| neural share | The worker died mid-run, or the app has a different `EVIDENCE_WORKER_URL` than this run |
| rate limited requests | `RESEARCH_OS_DAILY_TOOL_CAP` is still at its default |
| cold p95 | The first answer after start is slow, which is the encoder's first call rather than the model load |
| degraded answers while the worker was stopped | The fallback did not cover the restart window, so a restart is an outage |
| warm p95 at concurrency two | One model computation at a time is the worker's contract, so the second request waits for the first |
| cases the neural path reorders | The vectors were built from a different corpus revision than the one the app serves |
| worker requests scored | The app answered without the worker, so what the report measured was the fallback |

## Where these sit

Neither gate is the release decision. Runtime and Model are two rows of the table in [IMPLEMENTATION.md](IMPLEMENTATION.md); Access, Revocation, Quote, UI, Quality and Rollback are the others, and Quality waits on the sealed judgments in [EVALUATION.md](EVALUATION.md). Adult pilot activation needs all of them, the founder's release review, and a critic score above 9 out of 10.

## First run

Measured on the founder's machine on 2026-09-22, against corpus `4da8176dae7d` at 500 sources, on the 12 fixture cases. Reports are in `local/evidence/gates/`.

Runtime, 18 checks, all passing:

| Phase | requests | p50 ms | p95 ms | max ms | errors | neural |
|---|---|---|---|---|---|---|
| warm, concurrency one | 200 | 86 | 97 | 120 | 0 | 200 |
| warm, concurrency two | 200 | 84 | 94 | 122 | 0 | 200 |
| cold, first answer after start | 20 | 99 | 187 | 203 | 0 | 20 |
| cold, worker stopped | 20 | 82 | 112 | 114 | 0 | 0, all degraded |

The worker's own start is p95 32.3 s, 32.9 s at worst, which is Python and torch importing before the weights load. The four seconds the acquisition probe reported was the weight load alone. No request waits inside it.

Model, 5 checks, all passing: 12 of 12 cases on the neural path, 12 worker requests scored, the pinned revision `1110a243fdf4` reported, and 11 of 12 cases reordered.

The two usefulness signals came in short, 2 of 12 recovered against a target of 3, and 9 of 12 returned by either path. Every one of the three misses returned plausible neighbours rather than nothing: `colour-dependence` asked how steeply scattering depends on colour and got the size-versus-wavelength rule and the Rayleigh law above the fourth-power law, which are better answers than the one the fixture named; `why-membranes-form` got the hydrophobic effect at rank one, which is why bilayers form.

So the signal shortfall is a measurement problem as much as a retrieval one: a fixture that names one acceptable source scores a correct answer as a miss. Sealed human judgments over a set of acceptable sources are the instrument for this, they belong to the Quality gate in [EVALUATION.md](EVALUATION.md), and the corpus there is at release scale rather than the 500-record debug slice. Recorded here so the Quality gate starts from a known weakness in single-target scoring.
