from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

from .. import llm

MECHANISM_GLOSS: dict[str, str] = {
    "lexical_proximity": "cognate share, typological or lexical distance between known and target language",
    "comprehensible_input": "volume of understood input: extensive reading or listening, exposure",
    "output_practice": "speaking or writing practice, shadowing, interaction",
    "explicit_instruction": "explicit grammar or form-focused teaching",
    "corrective_feedback": "feedback on errors or performance",
    "spacing": "spaced or distributed practice, SRS schedules",
    "retrieval_practice": "testing effect, practice quizzes, self-testing",
    "interleaving": "mixing problem or item types during practice",
    "deliberate_practice": "accumulated targeted practice hours",
    "cognitive_training": "brain training, working-memory training, chess or music training aimed at general ability",
    "aptitude": "learner aptitude, intelligence, working-memory capacity as a trait",
    "age_of_onset": "age at first exposure, critical or sensitive period",
    "motivation": "motivation, interest, grit, rewards",
    "anxiety": "anxiety, stress, affective filter",
    "vocabulary_coverage": "share of known words in a text, vocabulary size",
    "mastery_learning": "mastery learning, advancing on demonstrated mastery",
    "tutoring": "one-to-one or small-group tutoring, intelligent tutoring systems",
    "worked_examples": "worked examples, cognitive load management, scaffolding",
    "elaboration": "elaborative interrogation, self-explanation, generation",
    "metacognition": "metacognition, self-regulated learning, judgments of learning",
    "multilingual_transfer": "prior languages shaping a new one, bilingual advantage, L3 transfer",
    "breadth_of_domains": "breadth of domains, polymathy, early sampling before specializing",
    "ai_assistance": "AI tools or chatbots used while learning",
}

OUTCOME_GLOSS: dict[str, str] = {
    "time_to_proficiency": "hours or time needed to reach a level",
    "comprehension": "reading or listening comprehension, intelligibility",
    "proficiency": "general language proficiency, accuracy, nativelikeness",
    "vocabulary_gain": "words learned",
    "retention": "long-term memory, recall after a delay",
    "transfer": "performance on untrained tasks, near or far transfer",
    "achievement": "test scores, grades, course outcomes",
    "expert_performance": "elite or expert performance, creative output, eminence",
    "persistence": "persistence, engagement, dropout, adherence",
}

DIRECTIONS = ("positive", "null", "negative")
OPPOSING_DIRECTIONS = frozenset({"null", "negative"})
BATCH_SIZE = 20
ENSEMBLE_SIZE = 3
AGREEMENT_THRESHOLD = 0.5
LLM_WORKERS = 4

_PASS_ANGLES = (
    "Read each record as written and code only what it states.",
    "Code each record conservatively: when a finding is null, small, or shrinks under better designs, code direction null.",
    "Code each record by its main result: the effect the authors report for their central comparison.",
)

EXTRACT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["items"],
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "mechanism", "outcome", "direction"],
                "properties": {
                    "id": {"type": "string"},
                    "mechanism": {"type": "string", "enum": [*MECHANISM_GLOSS, "none"]},
                    "outcome": {"type": "string", "enum": [*OUTCOME_GLOSS, "none"]},
                    "direction": {"type": "string", "enum": list(DIRECTIONS)},
                    "effect_size": {"type": ["string", "null"]},
                    "n": {"type": ["integer", "null"]},
                    "ci": {"type": ["string", "null"]},
                    "se": {"type": ["number", "null"]},
                },
            },
        },
    },
}

@dataclass(frozen=True)
class Record:
    id: str
    text: str

@dataclass(frozen=True)
class Extraction:
    mechanism: str
    outcome: str
    direction: str
    effect_size: str | None = None

    @property
    def opposes(self) -> bool:
        return self.direction in OPPOSING_DIRECTIONS

@dataclass
class ExtractionReport:
    by_id: dict[str, list[Extraction]] = field(default_factory=dict)
    prompts: int = 0
    escalated_records: int = 0
    empty_responses: int = 0

def prompt_for(records: Sequence[Record], pass_index: int) -> str:
    mech = "\n".join(f"- {k}: {v}" for k, v in MECHANISM_GLOSS.items())
    out = "\n".join(f"- {k}: {v}" for k, v in OUTCOME_GLOSS.items())
    body = "\n".join(f"- id: {r.id} | text: {r.text}" for r in records)
    return (
        "You code learning-science findings as mechanism-to-outcome links. "
        f"{_PASS_ANGLES[pass_index % len(_PASS_ANGLES)]}\n"
        "For each record return zero or more items with the record id, one mechanism, one outcome, "
        "a direction, and the effect size string when the text states one (for example g=0.51, d=0.2, 2 sigma). When the text states them, also return n (total participants), ci (the 95% interval of that effect as low to high) and se (its standard error); leave them null otherwise and never estimate them. "
        "direction is positive when the mechanism raises the outcome, negative when it lowers it, and null when "
        "the record reports no effect, no reliable effect, or an effect that vanishes under controls. "
        "Use mechanism or outcome none when nothing fits; omit such items.\n\n"
        f"Mechanisms:\n{mech}\n\nOutcomes:\n{out}\n\nRecords:\n{body}\n"
    )

def _parse(response: dict[str, Any], ids: set[str]) -> dict[str, set[Extraction]]:
    got: dict[str, set[Extraction]] = {}
    for raw in response.get("items", []):
        rid, m, o, d = raw.get("id"), raw.get("mechanism"), raw.get("outcome"), raw.get("direction")
        if rid not in ids or m not in MECHANISM_GLOSS or o not in OUTCOME_GLOSS or d not in DIRECTIONS:
            continue
        got.setdefault(rid, set()).add(Extraction(m, o, d, effect_string(raw)))
    return got

def effect_string(raw: dict[str, Any]) -> str | None:
    eff = raw.get("effect_size")
    if not eff:
        return None
    parts = [str(eff)]
    if isinstance(raw.get("se"), (int, float)) and raw["se"] > 0:
        parts.append(f"SE={raw['se']}")
    if raw.get("ci"):
        parts.append(f"CI {raw['ci']}")
    if isinstance(raw.get("n"), int) and raw["n"] > 0:
        parts.append(f"n={raw['n']}")
    return "; ".join(parts)

def _key(e: Extraction) -> tuple[str, str, str]:
    return (e.mechanism, e.outcome, e.direction)

def extract(
    records: Sequence[Record], *, mode: str | None, cache_dir: str | Path, replay_only: bool = False,
    batch_size: int = BATCH_SIZE,
) -> ExtractionReport:
    report = ExtractionReport()
    batches = [list(records[i:i + batch_size]) for i in range(0, len(records), batch_size)]
    prompts = [prompt_for(b, p) for b in batches for p in range(ENSEMBLE_SIZE)]
    report.prompts = len(prompts)
    responses = llm.complete_many(
        prompts, role="learning_extractor", schema=EXTRACT_SCHEMA, cache_dir=cache_dir,
        replay_only=replay_only, mode=mode, default={"items": []}, workers=LLM_WORKERS,
    ) if prompts else []
    report.empty_responses = sum(1 for r in responses if not r.get("items"))
    disputed: list[Record] = []
    for bi, batch in enumerate(batches):
        ids = {r.id for r in batch}
        passes = [_parse(responses[bi * ENSEMBLE_SIZE + p], ids) for p in range(ENSEMBLE_SIZE)]
        for rec in batch:
            votes: Counter[tuple[str, str, str]] = Counter()
            first: dict[tuple[str, str, str], Extraction] = {}
            for p in passes:
                for e in p.get(rec.id, ()):
                    votes[_key(e)] += 1
                    if _key(e) not in first or e.effect_size:
                        first[_key(e)] = e
            if not votes:
                continue
            agreed = [first[k] for k, n in votes.items() if n >= 2]
            if len(agreed) / len(votes) < AGREEMENT_THRESHOLD:
                disputed.append(rec)
            if agreed:
                report.by_id[rec.id] = agreed
    if disputed:
        report.escalated_records = len(disputed)
        esc_batches = [disputed[i:i + batch_size] for i in range(0, len(disputed), batch_size)]
        esc = llm.complete_many(
            [prompt_for(b, 0) for b in esc_batches], role="learning_escalation", schema=EXTRACT_SCHEMA,
            cache_dir=cache_dir, replay_only=replay_only, mode=mode, default={"items": []}, workers=LLM_WORKERS,
        )
        report.prompts += len(esc_batches)
        for b, resp in zip(esc_batches, esc):
            for rid, exts in _parse(resp, {r.id for r in b}).items():
                report.by_id[rid] = sorted(exts, key=_key)
    return report

_RECORD_RE = re.compile(r"^- id: (?P<id>.+?) \| text: (?P<text>.*)$", re.MULTILINE)
_EFFECT_RE = re.compile(r"\b([gd]\s?[≈=]\s?-?\d*\.?\d+|\d+(\.\d+)?\s?σ)")

def fake_extract(prompt: str) -> dict[str, Any]:
    from .learning import tag_mechanisms, tag_outcomes, text_stance
    from ..evidence import Stance
    items = []
    for m in _RECORD_RE.finditer(prompt):
        text = m.group("text")
        direction = "null" if text_stance(text) is Stance.NEGATIVE else "positive"
        eff = _EFFECT_RE.search(text)
        for mech in tag_mechanisms(text):
            for out in tag_outcomes(text):
                items.append({"id": m.group("id"), "mechanism": mech, "outcome": out, "direction": direction,
                              "effect_size": eff.group(0) if eff else None})
    return {"items": items}
