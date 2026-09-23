from __future__ import annotations

from typing import Any, Mapping, Sequence

from . import llm, roles
from .evidence import EvidenceItem
from .hypothesis import Hypothesis, Placement
from .parallel import pmap

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

def _chunks(seq: Sequence[Any], size: int) -> list[list[Any]]:
    return [list(seq[i:i + size]) for i in range(0, len(seq), size)]

def _run_batch(prompt: str, *, role: str, schema: dict[str, Any], cache_dir: str, replay_only: bool) -> list[Any]:
    try:
        response = llm.complete(prompt, role=role, schema=schema, cache_dir=cache_dir, replay_only=replay_only)
    except llm.LLMError:
        return []
    results = response.get("results")
    return results if isinstance(results, list) else []

def _validated_entries(entries: list[Any], required: Sequence[str]) -> dict[str, dict[str, Any]]:
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
                    "discrimination": roles.DISCRIMINATION_SCHEMA,
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
        "itself a contradiction. " + roles.DISCRIMINATION_PROMPT + "\n\n"
        f"Return a JSON array under \"results\" with exactly {len(batch)} entries, "
        "one per hypothesis above, each carrying that hypothesis's own id (the "
        "id= value from its heading) plus its own keep/issues/rationale/discrimination, so it "
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
    workers: int | None = None,
) -> list[dict[str, Any]]:
    chunks = _chunks(list(hypotheses), batch_size)
    if not chunks:
        return []

    def _run_chunk(chunk: list[Hypothesis]) -> list[Any]:
        return _run_batch(
            _critique_batch_prompt(chunk, evidence), role="critic", schema=CRITIQUE_BATCH_SCHEMA,
            cache_dir=cache_dir, replay_only=replay_only,
        )

    chunk_entries = pmap(_run_chunk, chunks, workers=workers)

    results_by_id: dict[str, dict[str, Any]] = {}
    for chunk, entries in zip(chunks, chunk_entries):
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

PRESERVATION_BATCH_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "expected_evidence": {"type": "array", "items": {"type": "string"}},
                    "could_have_survived": {"type": "boolean"},
                    "detectability_adjustment": {"type": "number"},
                    "rationale": {"type": "string"},
                },
                "required": ["id", "expected_evidence", "could_have_survived", "detectability_adjustment", "rationale"],
            },
        },
    },
    "required": ["results"],
}
_PRESERVATION_REQUIRED = ("id", "expected_evidence", "could_have_survived", "detectability_adjustment", "rationale")

def _preservation_batch_prompt(batch: Sequence[Hypothesis], table: Mapping[Any, float], period: str | None) -> str:
    rows = [f"{k}: {v}" for k, v in table.items()] if table else ["(no detectability table supplied)"]
    blocks = [f"Hypothesis id={h.short_id}: {_describe_hypothesis(h)}" for h in batch]
    return (
        "For each hypothesis below, if it were true, what evidence would you "
        "expect to exist, and could that evidence plausibly have survived to "
        "be found, given the shared detectability context? A low detectability "
        "score should explain an absence of evidence before falsity does.\n\n"
        f"Period: {period or '(unspecified)'}\n\n"
        "Detectability table rows:\n" + "\n".join(rows) + "\n\n"
        + "\n\n".join(blocks) + "\n\n"
        f"Return a JSON array under \"results\" with exactly {len(batch)} entries, "
        "one per hypothesis above, each carrying that hypothesis's own id (the "
        "id= value from its heading) plus its own expected_evidence, "
        "could_have_survived, detectability_adjustment in [0, 1], and rationale."
    )

def batch_preservation(
    hypotheses: Sequence[Hypothesis],
    table: Mapping[Any, float],
    *,
    period: str | None = None,
    batch_size: int = 8,
    cache_dir: str,
    replay_only: bool = False,
    workers: int | None = None,
) -> list[dict[str, Any]]:
    chunks = _chunks(list(hypotheses), batch_size)
    if not chunks:
        return []

    def _run_chunk(chunk: list[Hypothesis]) -> list[Any]:
        return _run_batch(
            _preservation_batch_prompt(chunk, table, period), role="preservation_critic",
            schema=PRESERVATION_BATCH_SCHEMA, cache_dir=cache_dir, replay_only=replay_only,
        )

    chunk_entries = pmap(_run_chunk, chunks, workers=workers)
    results_by_id: dict[str, dict[str, Any]] = {}
    for chunk, entries in zip(chunks, chunk_entries):
        by_id = _validated_entries(entries, _PRESERVATION_REQUIRED)
        for h in chunk:
            entry = by_id.get(h.short_id)
            if entry is not None:
                results_by_id[h.short_id] = {
                    "expected_evidence": [str(x) for x in entry["expected_evidence"]],
                    "could_have_survived": bool(entry["could_have_survived"]),
                    "detectability_adjustment": min(1.0, max(0.0, float(entry["detectability_adjustment"]))),
                    "rationale": str(entry["rationale"]),
                }
            else:
                results_by_id[h.short_id] = roles.preservation_critique(
                    h, table, period=period, cache_dir=cache_dir, replay_only=replay_only,
                )
    return [results_by_id[h.short_id] for h in hypotheses]

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

def _judge_evidence_block(label: str, support: Sequence[EvidenceItem], refute: Sequence[EvidenceItem]) -> str:
    lines = [_evidence_line(e) for e in (*support, *refute)]
    if not lines:
        return f"{label}: no linked evidence."
    return f"{label} (supports={len(support)}, refutes={len(refute)}):\n" + "\n".join(lines)

def _judge_batch_prompt(batch: Sequence[tuple[str, Hypothesis, Hypothesis, Mapping[str, Any]]]) -> str:
    blocks = []
    for pair_id, a, b, context in batch:
        evidence: Sequence[EvidenceItem] = context.get("evidence", [])
        support_a = [e for e in evidence if a.address in e.supports]
        refute_a = [e for e in evidence if a.address in e.refutes]
        support_b = [e for e in evidence if b.address in e.supports]
        refute_b = [e for e in evidence if b.address in e.refutes]
        draw_note = (
            " Neither side has any linked evidence for this pair: return "
            "p_a_wins=0.5 unless the two differ in internal consistency."
            if not (support_a or refute_a or support_b or refute_b) else ""
        )
        blocks.append(
            f"### id={pair_id}\n"
            f"Hypothesis A: {_describe_hypothesis(a)}\n{_judge_evidence_block('A', support_a, refute_a)}\n\n"
            f"Hypothesis B: {_describe_hypothesis(b)}\n{_judge_evidence_block('B', support_b, refute_b)}"
            f"{draw_note}"
        )
    return (
        "Judge which of two hypotheses the linked evidence favors more, for "
        "each of the following pairs.\n\n"
        + "\n\n".join(blocks) + "\n\n"
        f"Return a JSON array under \"results\" with exactly {len(batch)} entries, "
        "one per pair above, each carrying that pair's own id (the id= value "
        "from its heading), p_a_wins (your estimate of P(A is the better-"
        "supported hypothesis), in [0, 1]), and a one-line rationale. Judge "
        "target-blind: apply the identical standard to both sides regardless "
        "of which one seems more familiar or better established."
    )

def batch_judge(
    pairs: Sequence[JudgePair],
    *,
    batch_size: int = 8,
    cache_dir: str,
    replay_only: bool = False,
    workers: int | None = None,
) -> list[float]:
    chunk_starts = list(range(0, len(pairs), batch_size))
    chunks = [list(pairs[start:start + batch_size]) for start in chunk_starts]
    if not chunks:
        return []

    def _run_chunk(chunk: list[JudgePair]) -> list[Any]:
        local_ids = [str(i) for i in range(len(chunk))]
        prompt = _judge_batch_prompt([(lid, a, b, ctx) for lid, (a, b, ctx) in zip(local_ids, chunk)])
        return _run_batch(prompt, role="judge", schema=JUDGE_BATCH_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)

    chunk_entries = pmap(_run_chunk, chunks, workers=workers)

    out: list[float] = [0.0] * len(pairs)
    for start, chunk, entries in zip(chunk_starts, chunks, chunk_entries):
        local_ids = [str(i) for i in range(len(chunk))]
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
