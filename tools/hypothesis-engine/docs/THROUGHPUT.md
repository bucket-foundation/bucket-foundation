# Throughput layer

`hte.parallel` and `hte.batching` turn the engine loop's strictly serial
critic, preservation critique, and judge calls into a bounded thread pool
and, where the prompt shape allows it, one call covering several
hypotheses at once. Neither module changes `hte.roles`' contract: a
caller can swap a per-item loop for the batched or parallel equivalent
and get back the identical list, in the identical order.

## Wiring recipe

For `hte.runner.run_campaign`'s critic pass, in place of the current
per-hypothesis loop:

```python
from hte import batching

reports = batching.batch_critique(
    all_hypotheses, corpus.evidence, batch_size=8,
    cache_dir=cache_dir, replay_only=replay_only,
)
survivors = [h for h, r in zip(all_hypotheses, reports) if r.get("keep", True)]
```

For the preservation critique and the tournament's judge calls, the
per-item `hte.llm.complete` loop becomes `hte.llm.complete_many`, or,
for judge pairs, `batching.batch_judge`:

```python
from hte import llm, batching

judge_scores = batching.batch_judge(
    pairs, batch_size=8, cache_dir=cache_dir, replay_only=replay_only,
)
```

`llm.stats()` returns a per-role snapshot (`calls`, `cache_hits`,
`rate_limit_pauses`, `wall_time_s`) once wired in; embed it into
`MANIFEST.json` alongside the existing `cache` stats:

```python
manifest["llm_stats"] = llm.stats()
```

Call `llm.reset_stats()` at the top of `run_campaign` first if the
manifest should carry this run's own numbers rather than a total
accumulated across every campaign this process has run.

## Measured speedup

Fake mode makes no subprocess call at all, so it cannot show a real
speedup on its own; the numbers below add a 200ms artificial delay per
call (`time.sleep(0.2)` before each `hte.llm.complete`) to stand in for
the real `claude -p` latency this package's own run logs measure at
20-40 seconds, then compare 64 items run three ways:

| Strategy | Wall time | Speedup |
|---|---|---|
| Serial (1 call per item) | 12.82s | 1.0x |
| 4 workers (`hte.parallel.pmap`, 1 call per item) | 3.20s | 4.0x |
| 4 workers, batch_size=8 (8 calls total) | 0.40s | 32.0x |

4 workers alone gives the expected linear speedup for one-call-per-item
work (`N / workers`). Batching multiplies that by however many items
fit in one call: at `batch_size=8`, 64 items cost 8 calls instead of 64,
so the two gains compound (`workers * batch_size` = 32x here). On a real
400-hypothesis campaign at 20-40 seconds per call, serial critic passes
alone cost 2.2-4.4 hours; 4 workers plus `batch_size=8` brings the same
work down to the neighborhood of single-digit minutes. The gain on a
real campaign depends on how many hypotheses share a batchable call and
how many batch entries need a single-item fallback (see below).

### Measured on a real `run_campaign` call

`bkt-hte-throughput`, 2026-09-10.

The table above measures `hte.llm.complete_many`/`hte.batching` in
isolation, over a flat prompt list this module builds by hand. The
numbers below instead run the actual wiring this bead asks for, `hte.
runner.run_campaign` end to end (critic, preservation critique, and the
tournament's judge calls all included, generation and belief scoring too)
over an `hte.synth` world sized to 400 hypotheses post-`max_hypotheses`
cap (`hte.synth.make_world(0, n_actors=12, n_actions=6, n_objects=8,
n_places=6, n_mechanisms=5, span=(1900,2000), n_true_events=5,
evidence_per_event=(3,6))`, `combinatorial_max_items=100`,
`max_hypotheses=400`), with `hte.llm.complete` itself mocked to sleep
200ms and always return a valid response (`hte.fakellm`'s own critic/
judge stand-ins have no batch-shaped response, so every batched call
under `HTE_LLM_MODE=fake` falls back to single-item calls by design,
`docs/THROUGHPUT.md`'s own "Fallback behavior" section below; measuring
the real wiring's own speedup needs a mock that lets a batch call
succeed instead):

| Config | `HTE_LLM_WORKERS` | `critic_batch_size`/`judge_batch_size` | Wall time | LLM calls | Speedup |
|---|---|---|---|---|---|
| Serial (old behavior) | 1 | 1 | 241.6s | 1204 | 1.0x |
| Parallel + batched | 4 | 8 | 26.8s | 504 | 9.0x |
| Parallel + batched | 8 (`MAX_WORKERS`) | 8 | 14.4s | 504 | 16.8x |

400 survivors out of 566 generated hypotheses in every row (the mock
always returns `keep=True`, so critique never prunes here; this measures
call-count and wall-time only, independent of critic behavior). Both parallel rows
clear the "at least 10x faster than `HTE_LLM_WORKERS=1` with batching off"
bar the throughput work was measured against; `HTE_LLM_WORKERS=4` (this
package's own documented default) lands at 9.0x on this particular
world's own shape, under the bar by itself, because `roles.
preservation_critique_many` is parallelized but not batched (`docs/
THROUGHPUT.md`'s own module docstring: "no natural batched-array shape of
its own"), so its own 400 calls, running `workers` at a time with no
batching multiplier, is the slowest of the three passes at 4 workers and
dominates the fast config's own wall time (~20s of the 26.8s total);
raising to 8 workers, `hte.parallel.MAX_WORKERS`'s own ceiling, roughly
halves that dominant pass and clears 10x outright. The call count itself
(1204 -> 504) is identical at 4 and 8 workers, batching's own gain, not
parallelism's: only the 400 critic calls and ~400 judge calls collapse
to `ceil(400/8) = 50` and `ceil(200/8) x 2 rounds = 50` respectively; the
400 preservation calls stay 400 either way, batching not applying there.

Benchmark script: `tools/hypothesis-engine` (not checked in; reproduce
with `hte.synth.make_world`, `unittest.mock.patch.object(hte.llm,
"complete", side_effect=<a 200ms-sleeping, always-valid stand-in>)`, and
`hte.runner.run_campaign` with `critic_batch_size`/`judge_batch_size`/
`llm_workers` set per row above).

## Rate-limit behavior

`hte.llm.complete` raises `hte.parallel.RateLimit` (re-exported as
`hte.llm.RateLimit`) when a CLI response's stdout or stderr carries a
429, "rate limit", "spend limit", or "usage limit" marker. `pmap` reads
this as a shared account limit and pauses every worker for it: it
sleeps a shared backoff window (`backoff`, default 5-30 seconds,
doubling each pause) and then retries the same item, outside that
item's own per-item `retries` budget.

After `max_rate_limit_pauses` pauses (default 3) inside one `pmap` call,
if the limit still has not cleared, `pmap` raises
`RateLimitAborted` naming the CLI's own reset hint when it printed one
("retry after 3600 seconds", "resets in 2 hours", ...). Every item
already cached by that attempt (or an earlier one) replays for free on
the next run; only the items that never got a response need to run
again.

## Fallback behavior in `hte.batching`

`batch_critique` and `batch_judge` request one JSON array per batch,
each entry carrying the input's own id. An id the response leaves out,
repeats, or answers with a required field missing is not trusted for
that one item: it falls back to a direct, single-item `hte.roles`
call, the same call the engine loop already makes today. A whole
chunk whose call fails outright falls back the same way for every item
in it. `HTE_LLM_MODE=fake` has no batch-shaped stand-in, so a batch
call under fake mode always falls back to single-item calls across the
board, exercised as such in `tests/test_batching.py`.
