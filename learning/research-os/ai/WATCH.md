# AI watch ledger

The daily watch from [EVALUATION.md](EVALUATION.md), "Industry news and plan updates", writes its findings to one ledger that this repository checks, bead `ros-ai-watch`. The watch itself stays the operator's scheduled task at 9:00 a.m. America/New_York; no second scheduler exists. `scripts/research-os/ai-watch/cli.ts` is the only writer it uses, so every line meets the contract before it lands.

## Where it lives

The ledger is operator-local: `AI_WATCH_LEDGER`, or `~/.local/share/bucket/ai-watch/ledger.jsonl`. It stays off the repository. It holds public sources and assessments, with no secrets and no personal data.

## Lines

A line is one JSON object, appended and never edited.

| Kind | Carries |
|---|---|
| `item` | `sourceUrl`, `revision`, `title`, `releasedAt`, `discoveredAt`, `assessedAt`, `primarySources`, `mechanism`, `evidenceLevel`, `closestWork`, `component`, `rightsCompute` with license, weights, paid and compute, `test`, `disposition` |
| `run` | `runAt`, the `window` it covered, `sourcesChecked`, `failures` with source and error, `candidates`, `deepReads` |
| `selection` | `milestone`, `itemKey`, `replaces`, `selectedBy`, `selectedAt` |

Evidence levels: `vendor-claim`, `preprint`, `peer-reviewed`, `independent-benchmark`, `reproduced-here`. Dispositions: `ignore`, `prior-art`, `evaluate`, `propose-amendment`. Components: `evidence-search`, `encoder`, `reranker`, `passage-extraction`, `tutor`, `engine`, `graph`, `imports`, `none`.

## Rules the checker holds

| Rule | From the plan |
|---|---|
| An item's key is its canonical https URL plus its revision; the same assessment twice is skipped, a changed one is a new version | Deduplicate by source URL plus model or code revision |
| A new revision of an assessed source is a new item that names the one it reopens | A changed result or revision can reopen an assessed item |
| `discoveredAt` cannot precede `releasedAt` | Distinguish release date from discovery date |
| A run lists what it read and what failed, within 12 candidates and 4 deep reads | Save access failures; bounded triage |
| Paid work cannot be `evaluate`; it becomes `propose-amendment` with a budget | No paid calls; a larger investigation is proposed with a budget |
| One selection per milestone, naming a proposed amendment already in the ledger | The founder selects one candidate at a milestone |

## The watch's steps

1. Record each assessed item: `npm run ai-watch -- add < item.json`. A refused line prints the rule it broke.
2. Record the run, failures included: `npm run ai-watch -- add < run.json`.
3. Run `npm run ai-watch -- report`. Notify when its first line is `NOTIFY`, and stay quiet on `QUIET`.

The report speaks on a failed source, an item to evaluate, a proposed amendment, a ledger line that breaks the contract, a day with no run, or a last run more than 36 hours old. An ordinary day with nothing material stays quiet.

## At a milestone

`npm run ai-watch -- select --milestone <name> --item <key> --replaces <comparison arm> --by <name>` records the founder's one choice. An amended architecture regains a critic score above 9/10 before its commitments are adopted, and a replacement after test access gets a new holdout, per EVALUATION.md.

## For the founder

The scheduled task's instructions gain one line: write every item and run through `npm run ai-watch -- add` in `~/agfarms/bucket-foundation`, then notify only when `npm run ai-watch -- report` begins with `NOTIFY`. The task lives in the desktop app, where this session cannot edit it.
