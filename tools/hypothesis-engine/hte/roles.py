"""One function per engine-loop role, each an `hte.llm.complete()` call.

Mirrors `main.tex` §8 (Engine loop) and `IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
§7 (The model accounting for itself): the generator, critic, ranking
judge, evolver's meta-reviewer, the two roles §7 adds over the base engine
loop (`unknown_unknown`, `preservation_critique`), the per-run
`self_report`, and the ensemble `extract` role
(`bkt-hte-extraction-ensemble`). Every prompt here is plain, dry
instruction text; the shared low-tier-recall instruction lives once, in
`hte.llm.SYSTEM_PROMPT`, rather than being repeated per role.

Every function takes plain data (dicts, `Hypothesis`, `EvidenceItem`,
`Vocabulary`) and returns plain data: a parsed JSON dict for every role
except `judge` (a `float`) and `extract` (a `list[EvidenceItem]`, built
from parsed JSON plus a span re-anchored against the source text, since an
LLM's own character offsets are not trustworthy enough to hand straight to
`EvidenceSpan`).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from . import llm
from .concepts import Slot, Vocabulary
from .evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Stance, Tier
from .hypothesis import Hypothesis, Placement
from .timeline import Interval

# --------------------------------------------------------------------------
# generate
# --------------------------------------------------------------------------

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


def _vocab_slot_options(vocab: Vocabulary, slot: Slot) -> list[dict[str, str]]:
    return [{"id": c.id, "label": c.label} for c in vocab.concepts(slot)]


def _evidence_line(item: EvidenceItem) -> str:
    return f"- ({item.kind.value}, {item.tier.value}) {item.span.quote!r} [{item.id}]"


def generate(context: Mapping[str, Any], *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    """The generator role (`main.tex` §8's evidence-cluster generator kind,
    read against `context`'s evidence rather than the full combinatorial
    sweep `hte.generate.enumerate_placements` runs without an LLM).

    `context` carries `"vocab"` (a `Vocabulary`), `"evidence"` (a sequence
    of `EvidenceItem`), an optional `"n"` proposal count (default 5), and
    an optional `"period_hint"` string. A proposal may name a concept
    outside the vocabulary for a slot by writing `other-<slot>` as that
    slot's value and adding a one-line reason to `other_labels[slot]`,
    per `hte.concepts.other_id`'s open-world placeholder.
    """
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
    return llm.complete(prompt, role="generator", schema=GENERATE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)


# --------------------------------------------------------------------------
# critique
# --------------------------------------------------------------------------

CRITIQUE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "keep": {"type": "boolean"},
        "issues": {"type": "array", "items": {"type": "string"}},
        "rationale": {"type": "string"},
    },
    "required": ["keep", "issues", "rationale"],
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
    """The critic role (`main.tex` §8's "rule-and-model pass"): rejects a
    hypothesis the evidence on file contradicts, before it reaches
    scoring. `evidence` should be the items naming `h.address` in
    `supports` or `refutes`; the critic reads only what it is handed, per
    target-blind generation's rule that the same evidence produces the
    same critique regardless of which reading it favors."""
    support = [e for e in evidence if h.address in e.supports]
    refute = [e for e in evidence if h.address in e.refutes]
    prompt = (
        "Critique this hypothesis against the evidence naming it. Reject it "
        "only for a concrete contradiction the evidence shows; plausibility "
        "alone is never grounds to reject it.\n\n"
        f"Hypothesis: {_describe_hypothesis(h)}\n"
        f"Claims: {h.claims}\n\n"
        f"Supporting evidence:\n" + "\n".join(_evidence_line(e) for e in support) + "\n\n"
        f"Refuting evidence:\n" + "\n".join(_evidence_line(e) for e in refute) + "\n\n"
        "Return keep=false only if the evidence itself contradicts the "
        "hypothesis (for example the actor is not attested inside the "
        "stated time bin, or the place sits outside every tradition the "
        "actor belongs to). List every such issue found; an empty evidence "
        "set is not itself a contradiction."
    )
    return llm.complete(prompt, role="critic", schema=CRITIQUE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)


# --------------------------------------------------------------------------
# unknown_unknown
# --------------------------------------------------------------------------

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


def unknown_unknown(vocab: Vocabulary, evidence: Sequence[EvidenceItem], *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    """The unknown-unknown generator (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
    §7): proposes slot values outside the current vocabulary, feeding
    `hte.concepts.Vocabulary`'s open-world `OTHER` mass directly. It never
    scores a hypothesis, only names candidates a later `Vocabulary.add`
    call may or may not accept."""
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
    return llm.complete(prompt, role="unknown_unknown", schema=UNKNOWN_UNKNOWN_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)


# --------------------------------------------------------------------------
# preservation_critique
# --------------------------------------------------------------------------

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


def preservation_critique(
    h: Hypothesis,
    table: Mapping[Any, float],
    *,
    period: str | None = None,
    cache_dir: str,
    replay_only: bool = False,
) -> dict[str, Any]:
    """The preservation critic (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §7,
    `main.tex` §8): for a surviving hypothesis, what evidence would exist
    if it were true, and whether that evidence could have survived to be
    found. Reads `table` (`hte.belief.load_detectability_table`'s
    `(period, kind) -> delta` mapping, or any period-keyed slice of it)
    before recommending rejection, so a low detectability score explains
    an absence before falsity does. `detectability_adjustment` is the
    critic's own suggested delta for this hypothesis's period and the
    evidence kinds it names, in `[0, 1]`, for a caller that wants to
    override the table's stored value with the critic's read rather than
    accepting it as-is.
    """
    rows = [f"{k}: {v}" for k, v in table.items()] if table else ["(no detectability table supplied)"]
    prompt = (
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
    return llm.complete(
        prompt, role="preservation_critic", schema=PRESERVATION_CRITIQUE_SCHEMA,
        cache_dir=cache_dir, replay_only=replay_only,
    )


# --------------------------------------------------------------------------
# judge
# --------------------------------------------------------------------------

JUDGE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "p_a_wins": {"type": "number"},
        "rationale": {"type": "string"},
    },
    "required": ["p_a_wins", "rationale"],
}


def judge(a: Hypothesis, b: Hypothesis, context: Mapping[str, Any], *, cache_dir: str, replay_only: bool = False) -> float:
    """The tournament's pairwise debate judge (`main.tex` §8's ranking
    tournament): given two hypotheses and shared context (their current
    opinions, the evidence each names, or anything else
    `hte.tournament.run` wants the judge to see), returns `P(a beats b)`
    in `[0, 1]`. `hte.tournament.run` is expected to call this
    symmetrically or take `1 - judge(b, a, ...)` as its own consistency
    check; this function itself makes no such guarantee across two
    separate calls."""
    opinions = context.get("opinions", {})
    prompt = (
        "Judge which of two hypotheses the evidence favors more, given "
        "their current opinions if any.\n\n"
        f"Hypothesis A: {_describe_hypothesis(a)}\nA's opinion: {opinions.get(a.address)}\n\n"
        f"Hypothesis B: {_describe_hypothesis(b)}\nB's opinion: {opinions.get(b.address)}\n\n"
        "Return p_a_wins, your estimate of P(A is the better-supported "
        "hypothesis), in [0, 1], with a one-line rationale. Judge target-"
        "blind: apply the identical standard regardless of which reading, "
        "orthodox or fringe, either hypothesis favors."
    )
    response = llm.complete(prompt, role="judge", schema=JUDGE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)
    return max(0.0, min(1.0, float(response["p_a_wins"])))


# --------------------------------------------------------------------------
# meta_review
# --------------------------------------------------------------------------

META_REVIEW_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "flags": {"type": "array", "items": {"type": "string"}},
        "recommended_actions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "flags", "recommended_actions"],
}


def meta_review(
    population: Sequence[Hypothesis],
    opinions: Mapping[int, Any],
    *,
    cache_dir: str,
    replay_only: bool = False,
) -> dict[str, Any]:
    """The evolver's meta-review pass (`main.tex` §8): reads the whole
    frontier's opinions at once and flags what a per-hypothesis critic
    would not catch on its own, an over-narrow cluster, a slot the
    population never varies, a period with no dissenting reading."""
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
    return llm.complete(prompt, role="meta_review", schema=META_REVIEW_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)


# --------------------------------------------------------------------------
# self_report
# --------------------------------------------------------------------------

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


def self_report(run: Mapping[str, Any], *, cache_dir: str, replay_only: bool = False) -> dict[str, Any]:
    """The per-run self-report (`main.tex` §8, `IDEAL-STATE-AND-UNKNOWNS-
    SPEC.md` §7): this run's own assumptions, which slot vocabularies it
    judged incomplete, its missing-mass estimate, a calibration summary
    against the holdout tests (`hte.calibrate`), and the target-blind
    check, whether the generator's non-consensus ACTOR/MECHANISM proposal
    rate held steady against the run before it.

    `run` carries whatever `hte.runner.run_campaign` has on hand: hypothesis
    and evidence counts, the vocab-growth log, the coverage interval per
    bin, the calibration Brier score, and the current and prior run's
    non-consensus proposal rate.
    """
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
    return llm.complete(prompt, role="self_report", schema=SELF_REPORT_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)


# --------------------------------------------------------------------------
# extract (ensemble of 3, agreement scoring, escalation)
# --------------------------------------------------------------------------

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
                    # Additive, optional slot fields (`bkt-hte-evidence-slots`): a
                    # free-text label per concept-bearing slot the quote names
                    # (empty when it names none), the astronomical year it dates
                    # to if any, and whether the quote asserts or denies its own
                    # slot values. None of these join `required` below, so a
                    # cached response written before this schema grew still
                    # parses; `hte.roles.extract` reads a missing key as "not
                    # named" rather than raising.
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
    """The outcome of one `extract()` call: the final evidence items, the
    ensemble's agreement score, and whether escalation fired."""
    items: list[EvidenceItem]
    agreement: float
    escalated: bool


def _normalize_quote(q: str) -> str:
    return " ".join(q.split()).strip().lower()


def _slot_label(raw: dict[str, Any], key: str) -> str | None:
    """`raw[key]` as a non-empty stripped label, or `None` when the model
    left it blank or omitted it (a cached response written before this
    schema grew a slot field, or a pass that named nothing for it):
    `hte.evidence.EvidenceItem`'s own contract reads a `None` slot as
    "not asserted," matching either case."""
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
    """`bkt-hte-extraction-ensemble`: three independent extraction passes
    over `document_text` (the `extractor` model, low tier per
    `hte/data/model-policy.json`), agreement-scored by exact-quote overlap
    across passes, majority-voted when agreement clears
    `EXTRACT_AGREEMENT_THRESHOLD`, escalated to the `escalation` model
    (opus) for adjudication when it does not.

    Every kept item's span is re-anchored against `document_text` itself
    (`_locate_span`) rather than trusting any character offset the model
    reports: an LLM's own character counting is not reliable enough to
    hand straight to `EvidenceSpan`'s `char_start`/`char_end`, but its
    quoted text can be searched for verbatim. An item whose quote cannot
    be found verbatim in `document_text` (paraphrased rather than quoted)
    is dropped rather than given a fabricated span.
    """
    passes: list[list[dict[str, Any]]] = []
    for i in range(EXTRACT_ENSEMBLE_SIZE):
        prompt = _extract_prompt(document_text, vocab, i)
        response = llm.complete(prompt, role="extractor", schema=EXTRACT_SCHEMA, cache_dir=cache_dir, replay_only=replay_only)
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
        response = llm.complete(
            prompt, role="escalation", schema=EXTRACT_SCHEMA,
            model=llm.escalation_model(), cache_dir=cache_dir, replay_only=replay_only,
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
            span=EvidenceSpan(doc_id=doc_id, locator=f"extract:{n}", quote=raw["quote"], char_start=start, char_end=end),
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
    "judge", "meta_review", "self_report", "extract", "ExtractionResult",
    "EXTRACT_ENSEMBLE_SIZE", "EXTRACT_AGREEMENT_THRESHOLD",
]
