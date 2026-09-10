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
