"""Batched critic and judge calls: one `claude -p` call covering several
hypotheses (or pairs) instead of one call per item.

`hte.roles.critique`/`hte.roles.judge` are this module's reference for
prompt wording and schema fields; `batch_critique`/`batch_judge` request
a JSON array with one entry per input, each entry carrying that input's
own id, instead of one JSON object per call. This module keeps its own
copy of the hypothesis/evidence rendering `hte.roles` uses (rather than
importing its private `_describe_hypothesis`/`_evidence_line` helpers,
which that module's owner may still be revising); the fallback path
below calls `hte.roles.critique`/`hte.roles.judge` directly, since those
are public functions and a batch call degrading to exactly the single-
item behavior a caller already trusts is the point of the fallback.

A batch response is validated id by id: an id absent from the response,
repeated in it, or carrying an entry short a required key is not trusted
for that one hypothesis or pair, which falls back to its own single-item
call rather than the whole batch retrying or raising. `HTE_LLM_MODE=fake`
has no batch-shaped stand-in in `hte.fakellm` (`hte.llm.complete(...,
mode="fake")` only ever returns one role's fixed single-item schema), so
every batch call made in fake mode fails this validation for every id in
it and falls back to single-item calls across the board, each still
served by `hte.fakellm`'s existing per-role stand-ins. This is the
documented behavior in fake mode: `tests/test_batching.py`'s own
fake-mode test asserts the final per-item results match a fully serial
run, the point it checks rather than whether the batch request itself
succeeded.

Cache semantics carry over unchanged: `hte.llm.complete` caches by
sha256 of `(model, prompt)`, and a batch prompt's text (several
hypotheses or pairs joined into one request) is never identical to any
single-item prompt's text, so a batched call and the single-item calls
it might fall back to always land on distinct cache keys, never
colliding or double-paying for the same question.
"""
from __future__ import annotations

from typing import Any, Mapping, Sequence

from . import llm, roles
from .evidence import EvidenceItem
from .hypothesis import Hypothesis, Placement

# --------------------------------------------------------------------------
# Shared rendering (this module's own copy; see the module docstring)
# --------------------------------------------------------------------------


def _describe_hypothesis(h: Hypothesis) -> str:
    if isinstance(h.content, Placement):
        p = h.content
        return (
            f"placement: actor={p.actor!r} action={p.action!r} object={p.object!r} "
            f"place={p.place!r} mechanism={p.mechanism!r} interval=[{p.interval.start},{p.interval.end}]"
        )
    s = h.content
    return (
        f"sequence: first=(actor={s.first.actor!r} action={s.first.action!r} "
        f"object={s.first.object!r} place={s.first.place!r} mechanism={s.first.mechanism!r}) "
        f"{s.relation.value} second=(actor={s.second.actor!r} action={s.second.action!r} "
        f"object={s.second.object!r} place={s.second.place!r} mechanism={s.second.mechanism!r})"
    )


def _evidence_line(item: EvidenceItem) -> str:
    return f"- ({item.kind.value}, {item.tier.value}) {item.span.quote!r} [{item.id}]"


# --------------------------------------------------------------------------
# Batch validation and the shared "run one batched call" helper
# --------------------------------------------------------------------------


def _chunks(seq: Sequence[Any], size: int) -> list[list[Any]]:
    return [list(seq[i:i + size]) for i in range(0, len(seq), size)]


def _run_batch(prompt: str, *, role: str, schema: dict[str, Any], cache_dir: str, replay_only: bool) -> list[Any]:
    """The parsed `"results"` array from one batched `hte.llm.complete`
    call, or an empty list for anything short of a well-formed array: a
    completely missing key, a non-list value (`hte.llm.complete` only
    checks that a required key is present, never its type), or a fake-
    mode response, which carries no `"results"` key at all since
    `hte.fakellm` has no batch-shaped stand-in. An empty list here reads
    the identical way to every caller in this module: every id in this
    chunk needs its own single-item fallback call. `hte.parallel.
    RateLimit` is not caught here, it propagates to the caller unchanged.
    """
    try:
        response = llm.complete(prompt, role=role, schema=schema, cache_dir=cache_dir, replay_only=replay_only)
    except llm.LLMError:
        return []
    results = response.get("results")
    return results if isinstance(results, list) else []


def _validated_entries(entries: list[Any], required: Sequence[str]) -> dict[str, dict[str, Any]]:
    """`{id: entry}` for every entry in `entries` that is a dict, carries
    a non-empty string `"id"` seen exactly once across the whole array,
    and names every key `required` lists. An id repeated in the array, or
    an entry missing a required key, is dropped from the result
    entirely (not just its second occurrence), so a caller reads its
    absence the same way it reads a missing id: one single-item fallback
    call for that id alone."""
    counts: dict[str, int] = {}
    candidates: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        entry_id = entry.get("id")
        if not isinstance(entry_id, str) or not entry_id:
            continue
        counts[entry_id] = counts.get(entry_id, 0) + 1
        if all(k in entry for k in required):
            candidates[entry_id] = entry
    return {k: v for k, v in candidates.items() if counts[k] == 1}


# --------------------------------------------------------------------------
# batch_critique
# --------------------------------------------------------------------------

CRITIQUE_BATCH_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "keep": {"type": "boolean"},
                    "issues": {"type": "array", "items": {"type": "string"}},
                    "rationale": {"type": "string"},
                },
                "required": ["id", "keep", "issues", "rationale"],
            },
        },
    },
    "required": ["results"],
}

_CRITIQUE_REQUIRED = ("id", "keep", "issues", "rationale")


def _critique_batch_prompt(batch: Sequence[Hypothesis], evidence: Sequence[EvidenceItem]) -> str:
    blocks = []
    for h in batch:
        support = [e for e in evidence if h.address in e.supports]
        refute = [e for e in evidence if h.address in e.refutes]
        blocks.append(
            f"### id={h.short_id}\n"
            f"Hypothesis: {_describe_hypothesis(h)}\n"
            f"Claims: {h.claims}\n\n"
            "Supporting evidence:\n" + "\n".join(_evidence_line(e) for e in support) + "\n\n"
            "Refuting evidence:\n" + "\n".join(_evidence_line(e) for e in refute)
        )
    return (
        "Critique each of the following hypotheses against the evidence naming "
        "it. Reject a hypothesis only for a concrete contradiction the evidence "
        "shows; plausibility alone is never grounds to reject it.\n\n"
        + "\n\n".join(blocks) + "\n\n"
        "Return keep=false for a hypothesis only if the evidence itself "
        "contradicts it (for example the actor is not attested inside the "
        "stated time bin, or the place sits outside every tradition the actor "
        "belongs to); list every such issue found, an empty evidence set is not "
        "itself a contradiction.\n\n"
        f"Return a JSON array under \"results\" with exactly {len(batch)} entries, "
        "one per hypothesis above, each carrying that hypothesis's own id (the "
        "id= value from its heading) plus its own keep/issues/rationale, so it "
        "can be matched back to its hypothesis regardless of the order you "
        "return the entries in."
    )


def batch_critique(
    hypotheses: Sequence[Hypothesis],
    evidence: Sequence[EvidenceItem],
    *,
    batch_size: int = 8,
    cache_dir: str,
    replay_only: bool = False,
) -> list[dict[str, Any]]:
    """`hte.roles.critique`'s own `keep`/`issues`/`rationale` contract,
    one dict per hypothesis in `hypotheses`, in the same order,
    `batch_size` hypotheses per `claude -p` call instead of one call per
    hypothesis. `evidence` is the full evidence sequence (matching `hte.
    roles.critique`'s own signature), filtered per hypothesis the same
    way that function filters it.

    Any hypothesis the batch response's own array is missing, repeats,
    or leaves short a required key falls back to one direct `hte.roles.
    critique` call for that hypothesis alone; a whole chunk whose
    response fails outright (`hte.llm.LLMError`) falls back the same way
    for every hypothesis in it. `hte.parallel.RateLimit` propagates
    unchanged, it is not caught or retried here.
    """
    results_by_id: dict[str, dict[str, Any]] = {}
    for chunk in _chunks(list(hypotheses), batch_size):
        entries = _run_batch(
            _critique_batch_prompt(chunk, evidence), role="critic", schema=CRITIQUE_BATCH_SCHEMA,
            cache_dir=cache_dir, replay_only=replay_only,
        )
        by_id = _validated_entries(entries, _CRITIQUE_REQUIRED)
        for h in chunk:
            entry = by_id.get(h.short_id)
            if entry is not None:
                results_by_id[h.short_id] = {
                    "keep": bool(entry["keep"]),
                    "issues": list(entry["issues"]),
                    "rationale": str(entry["rationale"]),
                }
            else:
                results_by_id[h.short_id] = roles.critique(h, evidence, cache_dir=cache_dir, replay_only=replay_only)
    return [results_by_id[h.short_id] for h in hypotheses]


# --------------------------------------------------------------------------
# batch_judge
# --------------------------------------------------------------------------

JUDGE_BATCH_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "p_a_wins": {"type": "number"},
                    "rationale": {"type": "string"},
                },
                "required": ["id", "p_a_wins", "rationale"],
            },
        },
    },
    "required": ["results"],
}

_JUDGE_REQUIRED = ("id", "p_a_wins", "rationale")

JudgePair = tuple[Hypothesis, Hypothesis, Mapping[str, Any]]


def _judge_batch_prompt(batch: Sequence[tuple[str, Hypothesis, Hypothesis, Mapping[str, Any]]]) -> str:
    blocks = []
    for pair_id, a, b, context in batch:
        opinions = context.get("opinions", {})
        blocks.append(
            f"### id={pair_id}\n"
            f"Hypothesis A: {_describe_hypothesis(a)}\nA's opinion: {opinions.get(a.address)}\n\n"
            f"Hypothesis B: {_describe_hypothesis(b)}\nB's opinion: {opinions.get(b.address)}"
        )
    return (
        "Judge which of two hypotheses the evidence favors more, given their "
        "current opinions if any, for each of the following pairs.\n\n"
        + "\n\n".join(blocks) + "\n\n"
        f"Return a JSON array under \"results\" with exactly {len(batch)} entries, "
        "one per pair above, each carrying that pair's own id (the id= value "
        "from its heading), p_a_wins (your estimate of P(A is the better-"
        "supported hypothesis), in [0, 1]), and a one-line rationale. Judge "
        "target-blind: apply the identical standard regardless of which "
        "reading, orthodox or fringe, either hypothesis in a pair favors."
    )


def batch_judge(
    pairs: Sequence[JudgePair],
    *,
    batch_size: int = 8,
    cache_dir: str,
    replay_only: bool = False,
) -> list[float]:
    """`hte.roles.judge`'s own `P(a beats b)` contract, one float per
    `(a, b, context)` triple in `pairs`, in the same order, `batch_size`
    pairs per `claude -p` call instead of one call per pair.

    Any pair the batch response's own array is missing, repeats, or
    leaves short a required key falls back to one direct `hte.roles.
    judge` call for that pair alone, the same fallback contract
    `batch_critique` follows. Pair ids are assigned per chunk (`"0"`,
    `"1"`, ...) rather than derived from the two hypotheses, since a
    tournament may judge the same ordered pair more than once across
    different rounds; the id only ever needs to be unique inside its own
    chunk's prompt and response.
    """
    out: list[float] = [0.0] * len(pairs)
    for start in range(0, len(pairs), batch_size):
        chunk = list(pairs[start:start + batch_size])
        local_ids = [str(i) for i in range(len(chunk))]
        prompt = _judge_batch_prompt([(lid, a, b, ctx) for lid, (a, b, ctx) in zip(local_ids, chunk)])
        entries = _run_batch(prompt, role="judge", schema=JUDGE_BATCH_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)
        by_id = _validated_entries(entries, _JUDGE_REQUIRED)
        for lid, (a, b, ctx) in zip(local_ids, chunk):
            entry = by_id.get(lid)
            if entry is not None:
                out[start + int(lid)] = max(0.0, min(1.0, float(entry["p_a_wins"])))
            else:
                out[start + int(lid)] = roles.judge(a, b, ctx, cache_dir=cache_dir, replay_only=replay_only)
    return out


__all__ = [
    "batch_critique", "batch_judge", "JudgePair",
    "CRITIQUE_BATCH_SCHEMA", "JUDGE_BATCH_SCHEMA",
]
