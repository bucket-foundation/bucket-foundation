from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from typing import Any, Callable, Mapping, Sequence

from . import llm
from .belief import DISCRIMINATION_LR
from . import provenance as prov
from .concepts import Slot, Vocabulary
from .evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Stance, Tier
from .hypothesis import Hypothesis, Placement
from .timeline import Interval

logger = logging.getLogger("hte.roles")

class _RefusalLog:

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_role: dict[str, list[str]] = {}

    def record(self, role: str, log_id: str) -> None:
        with self._lock:
            self._by_role.setdefault(role, []).append(log_id or "(unlabeled)")

    def snapshot(self) -> dict[str, list[str]]:
        with self._lock:
            return {role: list(ids) for role, ids in self._by_role.items()}

    def reset(self) -> None:
        with self._lock:
            self._by_role.clear()

_REFUSAL_LOG = _RefusalLog()

def refusal_log() -> dict[str, list[str]]:
    return _REFUSAL_LOG.snapshot()

def reset_refusal_log() -> None:
    _REFUSAL_LOG.reset()

def _refusal_count() -> int:
    return sum(row.get("refusals", 0) + row.get("truncations", 0) for row in llm.stats().values())

def _with_refusal_default(
    fn: Callable[[], dict[str, Any]], *, role: str, default: Any, log_id: str = "",
) -> dict[str, Any]:
    try:
        return fn()
    except (llm.ModelRefusal, llm.ModelTruncation) as exc:
        kind = "refusal" if isinstance(exc, llm.ModelRefusal) else f"truncation ({exc.reason})"
        logger.warning(
            "hte.roles: role=%r%s defaulted after a model %s (prompt_sha256=%s)",
            role, f" id={log_id!r}" if log_id else "", kind, exc.prompt_sha256,
        )
        _REFUSAL_LOG.record(role, log_id)
        return default() if callable(default) else default

GENERATE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "proposals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "actor": {"type": "string"},
                    "action": {"type": "string"},
                    "object": {"type": "string"},
                    "place": {"type": "string"},
                    "mechanism": {"type": "string"},
                    "time_hint": {"type": "string"},
                    "other_labels": {"type": "object"},
                    "supporting_evidence_ids": {"type": "array", "items": {"type": "string"}},
                    "rationale": {"type": "string"},
                },
                "required": ["actor", "action", "object", "place", "mechanism", "supporting_evidence_ids", "rationale"],
            },
        },
    },
    "required": ["proposals"],
}

GENERATE_DEFAULT: dict[str, Any] = {"proposals": []}

def _vocab_slot_options(vocab: Vocabulary, slot: Slot) -> list[dict[str, str]]:
    return [{"id": c.id, "label": c.label} for c in vocab.concepts(slot)]

def _evidence_line(item: EvidenceItem) -> str:
    return f"- ({item.kind.value}, {item.tier.value}) {item.span.quote!r} [{item.id}]"

def generate(context: Mapping[str, Any], *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    vocab: Vocabulary = context["vocab"]
    evidence: Sequence[EvidenceItem] = context.get("evidence", [])
    n = context.get("n", 5)
    period_hint = context.get("period_hint", "")
    slot_lines = "\n".join(
        f"{slot.value}: {_vocab_slot_options(vocab, slot)}" for slot in
        (Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM)
    )
    evidence_lines = "\n".join(_evidence_line(e) for e in evidence) or "(no evidence supplied)"
    prompt = (
        "Propose placement hypotheses: actor performed action on object at "
        "place via mechanism, each grounded in the evidence below.\n\n"
        f"Evidence:\n{evidence_lines}\n\n"
        f"Vocabulary (id, label) per slot:\n{slot_lines}\n\n"
        f"Period hint: {period_hint or '(none)'}\n\n"
        f"Propose exactly {n} distinct placements. For each slot, use an id "
        "from that slot's vocabulary above whenever one fits. If none fits, "
        f"write \"other-<slot>\" (for example \"other-{Slot.ACTOR.value}\") "
        "and add a one-line reason under other_labels for that slot. Every "
        "proposal needs supporting_evidence_ids, the evidence ids in "
        "brackets above that it draws on (may be empty), and a one-line "
        "rationale."
    )
    return _with_refusal_default(
        lambda: llm.complete(
            prompt, role="generator", schema=GENERATE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only,
            provenance=prov.collect(evidence),
        ),
        role="generator", default=GENERATE_DEFAULT,
    )

DISCRIMINATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": {"type": "string", "enum": ["strong", "moderate", "weak", "none"]},
}
DISCRIMINATION_PROMPT = (
    "Under \"discrimination\", keyed by evidence id, rate how much more likely each "
    "listed item is under this hypothesis than under the strongest competing "
    "explanation of the same event: strong, moderate, weak, or none."
)

CRITIQUE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "keep": {"type": "boolean"},
        "issues": {"type": "array", "items": {"type": "string"}},
        "rationale": {"type": "string"},
        "discrimination": DISCRIMINATION_SCHEMA,
    },
    "required": ["keep", "issues", "rationale"],
}

def likelihood_ratios(report: Mapping[str, Any]) -> dict[str, float]:
    ratings = report.get("discrimination") or {}
    return {eid: DISCRIMINATION_LR[label] for eid, label in ratings.items() if label in DISCRIMINATION_LR}

CRITIQUE_DEFAULT: dict[str, Any] = {
    "keep": False, "issues": ["model refused or was truncated"], "rationale": "model refused or was truncated",
}

def _describe_hypothesis(h: Hypothesis) -> str:
    if isinstance(h.content, Placement):
        p = h.content
        return (
            f"placement: actor={p.actor!r} action={p.action!r} object={p.object!r} "
            f"place={p.place!r} mechanism={p.mechanism!r} interval=[{p.interval.start},{p.interval.end}]"
        )
    s = h.content
    return f"sequence: first=({_describe_hypothesis_content(s.first)}) {s.relation.value} second=({_describe_hypothesis_content(s.second)})"

def _describe_hypothesis_content(p: Placement) -> str:
    return f"actor={p.actor!r} action={p.action!r} object={p.object!r} place={p.place!r} mechanism={p.mechanism!r}"

def critique(h: Hypothesis, evidence: Sequence[EvidenceItem], *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    support = [e for e in evidence if h.address in e.supports]
    refute = [e for e in evidence if h.address in e.refutes]
    prompt = (
        "Critique this hypothesis against the evidence naming it. Reject it "
        "only for a concrete contradiction the evidence shows; plausibility "
        "alone is never grounds to reject it.\n\n"
        f"Hypothesis: {_describe_hypothesis(h)}\n"
        f"Claims: {h.claims}\n\n"
        "Supporting evidence:\n" + "\n".join(_evidence_line(e) for e in support) + "\n\n"
        "Refuting evidence:\n" + "\n".join(_evidence_line(e) for e in refute) + "\n\n"
        "Return keep=false only if the evidence itself contradicts the "
        "hypothesis (for example the actor is not attested inside the "
        "stated time bin, or the place sits outside every tradition the "
        "actor belongs to). List every such issue found; an empty evidence "
        "set is not itself a contradiction. " + DISCRIMINATION_PROMPT
    )
    return _with_refusal_default(
        lambda: llm.complete(
            prompt, role="critic", schema=CRITIQUE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only,
            provenance=prov.collect(support + refute),
        ),
        role="critic", default=CRITIQUE_DEFAULT, log_id=h.short_id,
    )

UNKNOWN_UNKNOWN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "proposals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "slot": {"type": "string"},
                    "label": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": ["slot", "label", "rationale"],
            },
        },
    },
    "required": ["proposals"],
}

UNKNOWN_UNKNOWN_DEFAULT: dict[str, Any] = {"proposals": []}

def unknown_unknown(vocab: Vocabulary, evidence: Sequence[EvidenceItem], *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    existing = "\n".join(
        f"{slot.value}: {[c.label for c in vocab.concepts(slot)]}" for slot in
        (Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM)
    )
    evidence_lines = "\n".join(_evidence_line(e) for e in evidence) or "(no evidence supplied)"
    prompt = (
        "Read the evidence below against the current slot vocabulary. "
        "Propose slot values the evidence points to that are NOT already "
        "named in that vocabulary, one line of rationale each. Propose "
        "nothing already covered by an existing label, even under a "
        "different wording; propose nothing you cannot tie to a specific "
        "evidence item.\n\n"
        f"Evidence:\n{evidence_lines}\n\n"
        f"Current vocabulary:\n{existing}\n\n"
        "Return an empty proposals list if the evidence names nothing new."
    )
    return _with_refusal_default(
        lambda: llm.complete(
            prompt, role="unknown_unknown", schema=UNKNOWN_UNKNOWN_SCHEMA, cache_dir=cache_dir, replay_only=replay_only,
            provenance=prov.collect(evidence),
        ),
        role="unknown_unknown", default=UNKNOWN_UNKNOWN_DEFAULT,
    )

PRESERVATION_CRITIQUE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "expected_evidence": {"type": "array", "items": {"type": "string"}},
        "could_have_survived": {"type": "boolean"},
        "detectability_adjustment": {"type": "number"},
        "rationale": {"type": "string"},
    },
    "required": ["expected_evidence", "could_have_survived", "detectability_adjustment", "rationale"],
}

PRESERVATION_CRITIQUE_DEFAULT: dict[str, Any] = {
    "expected_evidence": [],
    "could_have_survived": True,
    "detectability_adjustment": 0.5,
    "rationale": "model refused or was truncated; defaulted to a neutral detectability adjustment",
}

def _preservation_critique_prompt(h: Hypothesis, table: Mapping[Any, float], period: str | None) -> str:
    rows = [f"{k}: {v}" for k, v in table.items()] if table else ["(no detectability table supplied)"]
    return (
        "For this hypothesis, if it were true, what evidence would you "
        "expect to exist, and could that evidence plausibly have survived "
        "to be found, given the detectability context below? A low "
        "detectability score should explain an absence of evidence before "
        "falsity does.\n\n"
        f"Hypothesis: {_describe_hypothesis(h)}\n"
        f"Period: {period or '(unspecified)'}\n\n"
        f"Detectability table rows:\n" + "\n".join(rows) + "\n\n"
        "Return the evidence kinds and forms you would expect, whether "
        "detection was plausible, and your own suggested detectability "
        "adjustment in [0, 1] for this hypothesis's period and evidence "
        "kinds."
    )

def preservation_critique(
    h: Hypothesis,
    table: Mapping[Any, float],
    *,
    period: str | None = None,
    cache_dir: str,
    replay_only: bool = False,
) -> dict[str, Any]:
    prompt = _preservation_critique_prompt(h, table, period)
    return _with_refusal_default(
        lambda: llm.complete(
            prompt, role="preservation_critic", schema=PRESERVATION_CRITIQUE_SCHEMA,
            cache_dir=cache_dir, replay_only=replay_only,
        ),
        role="preservation_critic", default=PRESERVATION_CRITIQUE_DEFAULT, log_id=h.short_id,
    )

def preservation_critique_many(
    hypotheses: Sequence[Hypothesis],
    table: Mapping[Any, float],
    *,
    period: str | None = None,
    cache_dir: str,
    replay_only: bool = False,
    workers: int | None = None,
) -> list[dict[str, Any]]:
    prompts = [_preservation_critique_prompt(h, table, period) for h in hypotheses]
    responses = llm.complete_many(
        prompts, role="preservation_critic", schema=PRESERVATION_CRITIQUE_SCHEMA,
        cache_dir=cache_dir, replay_only=replay_only, workers=workers,
        default=PRESERVATION_CRITIQUE_DEFAULT,
    )
    for h, response in zip(hypotheses, responses):
        if response is PRESERVATION_CRITIQUE_DEFAULT:
            logger.warning(
                "hte.roles: role='preservation_critic' id=%r defaulted after a model refusal or truncation",
                h.short_id,
            )
            _REFUSAL_LOG.record("preservation_critic", h.short_id)
    return list(responses)

JUDGE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "p_a_wins": {"type": "number"},
        "rationale": {"type": "string"},
    },
    "required": ["p_a_wins", "rationale"],
}

JUDGE_DEFAULT: dict[str, Any] = {
    "p_a_wins": 0.5, "rationale": "model refused or was truncated; defaulted to a coin-flip p_a_wins",
}

def _judge_evidence_block(label: str, support: Sequence[EvidenceItem], refute: Sequence[EvidenceItem]) -> str:
    lines = [_evidence_line(e) for e in (*support, *refute)]
    if not lines:
        return f"{label}: no linked evidence."
    return f"{label} (supports={len(support)}, refutes={len(refute)}):\n" + "\n".join(lines)

def judge(a: Hypothesis, b: Hypothesis, context: Mapping[str, Any], *, cache_dir: str, replay_only: bool = False) -> float:
    evidence: Sequence[EvidenceItem] = context.get("evidence", [])
    support_a = [e for e in evidence if a.address in e.supports]
    refute_a = [e for e in evidence if a.address in e.refutes]
    support_b = [e for e in evidence if b.address in e.supports]
    refute_b = [e for e in evidence if b.address in e.refutes]
    draw_note = (
        "\n\nNeither hypothesis has any linked evidence. Return "
        "p_a_wins=0.5 (a draw) unless the two differ in internal "
        "consistency (for example one places its actor outside the time "
        "or tradition its own claim requires); note any such difference "
        "in your rationale."
        if not (support_a or refute_a or support_b or refute_b) else ""
    )
    prompt = (
        "Judge which of two hypotheses the linked evidence favors more.\n\n"
        f"Hypothesis A: {_describe_hypothesis(a)}\n{_judge_evidence_block('A', support_a, refute_a)}\n\n"
        f"Hypothesis B: {_describe_hypothesis(b)}\n{_judge_evidence_block('B', support_b, refute_b)}"
        f"{draw_note}\n\n"
        "Return p_a_wins, your estimate of P(A is the better-supported "
        "hypothesis), in [0, 1], with a one-line rationale. Judge target-"
        "blind: apply the identical standard to both sides regardless of "
        "which one seems more familiar or better established."
    )
    response = _with_refusal_default(
        lambda: llm.complete(prompt, role="judge", schema=JUDGE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only),
        role="judge", default=JUDGE_DEFAULT, log_id=f"{a.short_id}-v-{b.short_id}",
    )
    return max(0.0, min(1.0, float(response["p_a_wins"])))

ADVOCATE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "support": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"id": {"type": "string"}, "reason": {"type": "string"}},
                "required": ["id", "reason"],
            },
        },
        "decisive_test": {"type": "string"},
    },
    "required": ["support", "decisive_test"],
}
ADVOCATE_DEFAULT: dict[str, Any] = {"support": [], "decisive_test": "model refused or was truncated"}
ADVOCATE_POOL = 24

def advocate_pool(h: Hypothesis, evidence: Sequence[EvidenceItem], *, limit: int = ADVOCATE_POOL) -> list[EvidenceItem]:
    p = h.content
    slots = {p.actor, p.action, p.object, p.place, p.mechanism}
    pool = [
        e for e in evidence
        if h.address not in e.supports and h.address not in e.refutes
        and slots & {e.actor, e.action, e.object, e.place, e.mechanism}
    ]
    pool.sort(key=lambda e: (e.tier.value, e.id))
    return pool[:limit]

def advocate(
    h: Hypothesis, pool: Sequence[EvidenceItem], *, cache_dir: str, replay_only: bool = False,
) -> dict[str, Any]:
    prompt = (
        "Argue for this hypothesis. Your job is to find support the linker "
        "missed, from the candidate items below only; name every item that "
        "supports the hypothesis, by id, with one sentence each on why. Name "
        "no item that does not support it. Then state the single observation "
        "that would settle the question either way.\n\n"
        f"Hypothesis: {_describe_hypothesis(h)}\n"
        f"Claims: {h.claims}\n\n"
        "Candidate items:\n" + "\n".join(_evidence_line(e) for e in pool) + "\n\n"
        "Return support (id, reason) and decisive_test."
    )
    return _with_refusal_default(
        lambda: llm.complete(prompt, role="advocate", schema=ADVOCATE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only),
        role="advocate", default=ADVOCATE_DEFAULT, log_id=h.short_id,
    )

META_REVIEW_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "flags": {"type": "array", "items": {"type": "string"}},
        "recommended_actions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "flags", "recommended_actions"],
}

def _meta_review_default() -> dict[str, Any]:
    n = _refusal_count()
    return {
        "summary": (
            f"meta-review unavailable: the model refused or was truncated "
            f"({n} refusal/truncation event(s) recorded this run so far)."
        ),
        "flags": ["model-refusal"],
        "recommended_actions": ["rerun meta_review once the refusal or truncation clears"],
    }

def meta_review(
    population: Sequence[Hypothesis],
    opinions: Mapping[int, Any],
    *,
    cache_dir: str,
    replay_only: bool = False,
) -> dict[str, Any]:
    lines = []
    for h in population:
        op = opinions.get(h.address)
        lines.append(f"- [{h.short_id}] {_describe_hypothesis(h)} opinion={op}")
    prompt = (
        "Review this frontier of hypotheses and their opinions as a whole. "
        "Flag patterns a per-hypothesis critic would miss: an over-narrow "
        "cluster, a slot the population never varies, a period with no "
        "dissenting reading, or any sign generation has stopped exploring "
        "non-consensus readings.\n\n"
        f"Population ({len(population)} hypotheses):\n" + "\n".join(lines) + "\n\n"
        "Return a short summary, a list of flags, and recommended next "
        "actions for the evolver (recombine, split, generalize, or widen "
        "the next generation round)."
    )
    return _with_refusal_default(
        lambda: llm.complete(prompt, role="meta_review", schema=META_REVIEW_SCHEMA, cache_dir=cache_dir, replay_only=replay_only),
        role="meta_review", default=_meta_review_default,
    )

SELF_REPORT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "assumptions": {"type": "array", "items": {"type": "string"}},
        "incomplete_vocabularies": {"type": "array", "items": {"type": "string"}},
        "missing_mass_estimate": {"type": "number"},
        "calibration_summary": {"type": "string"},
        "target_blind_steady": {"type": "boolean"},
        "target_blind_note": {"type": "string"},
    },
    "required": [
        "assumptions", "incomplete_vocabularies", "missing_mass_estimate",
        "calibration_summary", "target_blind_steady", "target_blind_note",
    ],
}

def _self_report_default() -> dict[str, Any]:
    n = _refusal_count()
    note = (
        f"self-report unavailable: the model refused or was truncated "
        f"({n} refusal/truncation event(s) recorded this run so far, see MANIFEST.json['refusals'])."
    )
    return {
        "assumptions": [note],
        "incomplete_vocabularies": [],
        "missing_mass_estimate": 0.0,
        "calibration_summary": note,
        "target_blind_steady": False,
        "target_blind_note": note,
    }

def self_report(run: Mapping[str, Any], *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    prompt = (
        "Write this run's self-report from the run data below. State your "
        "assumptions, which slot vocabularies you judge incomplete given "
        "how thin their evidence coverage is, your best missing-mass "
        "estimate, and a one-paragraph calibration summary. Then answer "
        "the target-blind check: did the generator's proposal rate for "
        "non-consensus actor or mechanism values hold steady against the "
        "run before it, under stable evidence volume? A falling rate is "
        "the same health signal as a falling surprise rate, read here for "
        "target-blindness instead of vocabulary drift.\n\n"
        f"Run data: {dict(run)}"
    )
    return _with_refusal_default(
        lambda: llm.complete(prompt, role="self_report", schema=SELF_REPORT_SCHEMA, cache_dir=cache_dir, replay_only=replay_only),
        role="self_report", default=_self_report_default,
    )

UNDERSTANDING_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "explanation": {"type": "string"},
    },
    "required": ["explanation"],
}

def _understanding_default() -> dict[str, Any]:
    n = _refusal_count()
    return {
        "explanation": (
            f"plain-language explanation unavailable: the model refused or was "
            f"truncated ({n} refusal/truncation event(s) recorded this run so far)."
        ),
    }

def understanding(statement: str, evidence_summary: str, *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    prompt = (
        "Explain the following historical hypothesis in plain language a "
        "non-specialist could restate in their own words. Two to four "
        "sentences. No jargon, no probability numbers, no internal slot "
        "or address ids. Name what the claim says and, in one clause, the "
        "evidence it rests on.\n\n"
        f"Hypothesis: {statement}\n\n"
        f"Evidence summary: {evidence_summary}"
    )
    return _with_refusal_default(
        lambda: llm.complete(prompt, role="understanding", schema=UNDERSTANDING_SCHEMA, cache_dir=cache_dir, replay_only=replay_only),
        role="understanding", default=_understanding_default,
    )

EXTRACT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "kind": {"type": "string"},
                    "tier": {"type": "string"},
                    "quote": {"type": "string"},
                    "claim": {"type": "string"},
                    "actor": {"type": "string"},
                    "action": {"type": "string"},
                    "object": {"type": "string"},
                    "place": {"type": "string"},
                    "mechanism": {"type": "string"},
                    "year": {"type": ["integer", "null"]},
                    "stance": {"type": "string", "enum": ["positive", "negative"]},
                },
                "required": ["kind", "tier", "quote", "claim"],
            },
        },
    },
    "required": ["items"],
}

EXTRACT_EMPTY_DEFAULT: dict[str, Any] = {"items": []}

EXTRACT_ENSEMBLE_SIZE = 3
EXTRACT_AGREEMENT_THRESHOLD = 0.5

_EXTRACT_PASS_ANGLES = (
    "Read the text as written: extract every dated claim exactly as stated, no interpretation.",
    "Focus on named actors and their actions: extract every claim naming who did what.",
    "Focus on dates and mechanisms: extract every claim tying a date to a physical or "
    "mathematical mechanism.",
)

def _extract_prompt(document_text: str, vocab: Vocabulary, pass_index: int) -> str:
    kinds = [k.value for k in EvidenceKind]
    tiers = [t.value for t in Tier]
    angle = _EXTRACT_PASS_ANGLES[pass_index % len(_EXTRACT_PASS_ANGLES)]
    return (
        f"Extraction pass {pass_index + 1} of {EXTRACT_ENSEMBLE_SIZE}. {angle}\n\n"
        "Extract evidence items from the document below. For each item, quote the "
        "exact source text verbatim (so it can be located by string search), give a "
        "one-line paraphrase of the claim, and tag it with an evidence kind and a "
        "source-reliability tier. Also name, for each of actor/action/object/place/"
        "mechanism, the short label the quote itself gives for that slot, leaving a "
        "slot blank when the quote names nothing for it; the astronomical year the "
        "quote dates to, or null if it names none; and whether the quote asserts its "
        "own claim (\"positive\") or denies/downgrades one (\"negative\").\n\n"
        f"Evidence kinds: {kinds}\nTiers (T1 strongest to T6 weakest): {tiers}\n\n"
        f"Document:\n{document_text}"
    )

@dataclass(frozen=True)
class ExtractionResult:
    items: list[EvidenceItem]
    agreement: float
    escalated: bool

def _normalize_quote(q: str) -> str:
    return " ".join(q.split()).strip().lower()

def _slot_label(raw: dict[str, Any], key: str) -> str | None:
    value = raw.get(key)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None

def _locate_span(document_text: str, quote: str) -> tuple[int, int] | None:
    idx = document_text.find(quote)
    if idx >= 0:
        return idx, idx + len(quote)
    stripped = quote.strip()
    if stripped and stripped != quote:
        idx = document_text.find(stripped)
        if idx >= 0:
            return idx, idx + len(stripped)
    return None

def extract(
    document_text: str,
    vocab: Vocabulary,
    *,
    doc_id: str,
    cache_dir: str,
    replay_only: bool = False,
) -> ExtractionResult:
    passes: list[list[dict[str, Any]]] = []
    for i in range(EXTRACT_ENSEMBLE_SIZE):
        prompt = _extract_prompt(document_text, vocab, i)
        response = _with_refusal_default(
            lambda p=prompt: llm.complete(p, role="extractor", schema=EXTRACT_SCHEMA, cache_dir=cache_dir, replay_only=replay_only),
            role="extractor", default=EXTRACT_EMPTY_DEFAULT, log_id=f"{doc_id}-pass{i}",
        )
        passes.append(response.get("items", []))

    by_quote: dict[str, list[dict[str, Any]]] = {}
    for pass_items in passes:
        seen_this_pass: set[str] = set()
        for raw in pass_items:
            key = _normalize_quote(raw.get("quote", ""))
            if not key or key in seen_this_pass:
                continue
            seen_this_pass.add(key)
            by_quote.setdefault(key, []).append(raw)

    distinct = len(by_quote) or 1
    agreed = sum(1 for entries in by_quote.values() if len(entries) >= 2)
    agreement = agreed / distinct

    escalated = agreement < EXTRACT_AGREEMENT_THRESHOLD
    if escalated:
        summary = "\n".join(
            f"pass {i + 1}: " + "; ".join(_normalize_quote(r.get("quote", "")) for r in p)
            for i, p in enumerate(passes)
        )
        prompt = (
            f"Three extraction passes over the same document disagreed (agreement "
            f"{agreement:.2f} of a {EXTRACT_AGREEMENT_THRESHOLD} threshold). Adjudicate "
            "and return the single best evidence-item list, preferring an item any two "
            "passes agree on and using your own judgment for the rest.\n\n"
            f"Pass summaries:\n{summary}\n\n"
            f"Document:\n{document_text}"
        )
        response = _with_refusal_default(
            lambda: llm.complete(
                prompt, role="escalation", schema=EXTRACT_SCHEMA,
                model=llm.escalation_model(), cache_dir=cache_dir, replay_only=replay_only,
            ),
            role="escalation", default=EXTRACT_EMPTY_DEFAULT, log_id=doc_id,
        )
        raw_items = response.get("items", [])
    else:
        raw_items = [entries[0] for entries in by_quote.values() if len(entries) >= 2]

    items: list[EvidenceItem] = []
    for n, raw in enumerate(raw_items):
        span_bounds = _locate_span(document_text, raw.get("quote", ""))
        if span_bounds is None:
            continue
        start, end = span_bounds
        try:
            kind = EvidenceKind(raw.get("kind"))
        except ValueError:
            kind = EvidenceKind.MODEL_PRIOR
        try:
            tier = Tier(raw.get("tier"))
        except ValueError:
            tier = Tier.T5
        year = raw.get("year")
        interval = Interval(start=year, end=year) if isinstance(year, int) else None
        items.append(EvidenceItem(
            id=f"{doc_id}-ex-{n}",
            kind=kind,
            tier=tier,
            source_id=doc_id,
            span=EvidenceSpan(doc_id=doc_id, locator=f"extract:{n}", quote=raw["quote"], char_start=start, char_end=end, doc_length=len(document_text)),
            provenance="llm-extraction-escalated" if escalated else "llm-extraction-ensemble",
            actor=_slot_label(raw, "actor"),
            action=_slot_label(raw, "action"),
            object=_slot_label(raw, "object"),
            place=_slot_label(raw, "place"),
            mechanism=_slot_label(raw, "mechanism"),
            interval=interval,
            stance=Stance.NEGATIVE if raw.get("stance") == "negative" else Stance.POSITIVE,
        ))

    return ExtractionResult(items=items, agreement=agreement, escalated=escalated)

__all__ = [
    "generate", "critique", "unknown_unknown", "preservation_critique",
    "preservation_critique_many", "judge", "meta_review", "self_report",
    "extract", "ExtractionResult", "EXTRACT_ENSEMBLE_SIZE", "EXTRACT_AGREEMENT_THRESHOLD",
    "GENERATE_DEFAULT", "CRITIQUE_DEFAULT", "UNKNOWN_UNKNOWN_DEFAULT",
    "PRESERVATION_CRITIQUE_DEFAULT", "JUDGE_DEFAULT", "EXTRACT_EMPTY_DEFAULT",
    "refusal_log", "reset_refusal_log",
]
