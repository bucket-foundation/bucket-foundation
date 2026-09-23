from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest

from hte import llm, roles
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Stance, Tier
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.timeline import AllenRelation, Interval

from tests.swarm.conftest import evidence_item, evidence_span  # noqa: F401  (re-exported for this package's own tests)
from tests.swarm2.conftest import (  # noqa: F401
    hypothesis_for,
    make_evidence_item,
    placement_from_vocab,
    small_vocab,
)

@pytest.fixture(autouse=True)
def no_real_subprocess(monkeypatch: pytest.MonkeyPatch) -> None:

    def _forbidden(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError(
            f"tests/swarm3 forbids a real subprocess call; hte.llm.subprocess.run "
            f"was invoked with argv={args[:1]!r}"
        )

    monkeypatch.setattr(llm.subprocess, "run", _forbidden)

@pytest.fixture(autouse=True)
def fake_llm_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HTE_LLM_MODE", "fake")

# voice-ignore-next 8
BANNED_VOICE_WORDS: tuple[str, ...] = (
    "genuinely", "genuine", "honest", "honestly", "truly", "really", "actually",
    "basically", "essentially", "literally", "obviously", "clearly", "certainly",
    "absolutely", "definitely", "arguably", "undeniably", "undoubtedly", "simply",
    "merely", "very", "quite", "extremely", "incredibly", "remarkably",
    "fundamentally", "ultimately", "notably", "importantly",
)

_BANNED_WORD_RE = re.compile(
    r"\b(" + "|".join(re.escape(w) for w in BANNED_VOICE_WORDS) + r")\b",
    re.IGNORECASE,
)

def assert_no_banned_voice_words(text: str, *, where: str) -> None:
    hits = sorted(set(m.group(1).lower() for m in _BANNED_WORD_RE.finditer(text)))
    assert not hits, f"{where} carries banned voice word(s) {hits}: {text!r}"

def assert_carries_model_prior_instruction(role_prompt: str) -> None:
    full_text = llm.SYSTEM_PROMPT + "\n\n" + role_prompt
    assert "model-prior" in full_text, (
        f"neither hte.llm.SYSTEM_PROMPT nor this role's own prompt text carries "
        f"the model-prior instruction: {role_prompt[:200]!r}"
    )

def spy_on_role_completions(monkeypatch: pytest.MonkeyPatch) -> dict[str, list[str]]:
    captured: dict[str, list[str]] = {}
    real_complete = roles.llm.complete

    def wrapper(
        prompt: str, *, role: str, schema: dict, cache_dir: str, replay_only: bool = False,
        model: str | None = None, provenance: dict | None = None,
    ):
        captured.setdefault(role, []).append(prompt)
        return real_complete(
            prompt, role=role, schema=schema, cache_dir=cache_dir, replay_only=replay_only,
            model=model, provenance=provenance,
        )

    monkeypatch.setattr(roles.llm, "complete", wrapper)
    return captured

def unicode_vocab() -> Vocabulary:
    vocab = Vocabulary()
    vocab.add(Concept(id="actor-u", slot=Slot.ACTOR, label="量子力学の観測者 🜁", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="action-u", slot=Slot.ACTION, label="observ́ed (combining acute)", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="object-u", slot=Slot.OBJECT, label="כוכב לכת", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="place-u", slot=Slot.PLACE, label="Ουρανός Παρατηρητήριο", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="mechanism-u", slot=Slot.MECHANISM, label="спектроскопия 🔭", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    return vocab

def empty_vocab() -> Vocabulary:
    return Vocabulary()

def unicode_evidence_item(item_id: str = "ev-unicode") -> EvidenceItem:
    quote = "квант 量子 🜁🜂🜃🜄 observação não confirmada — سُلَّم زمني"
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="doc-unicode",
        span=EvidenceSpan(doc_id="doc-unicode", locator="p1", quote=quote, char_start=0, char_end=len(quote)),
        provenance="test-fixture",
    )

def fifty_kb_evidence_item(item_id: str = "ev-fifty-kb") -> EvidenceItem:
    quote = "the quick brown fox jumps over the lazy dog. " * 1200
    assert len(quote.encode("utf-8")) >= 50_000
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T4, source_id="doc-long",
        span=EvidenceSpan(doc_id="doc-long", locator="p1", quote=quote, char_start=0, char_end=len(quote)),
        provenance="test-fixture",
    )

def simple_hypothesis(vocab: Vocabulary, *, actor: str, action: str, object_: str, place: str, mechanism: str, year: int = 1950) -> Hypothesis:
    p = Placement(actor=actor, action=action, object=object_, place=place, mechanism=mechanism, interval=Interval(start=year, end=year))
    return Hypothesis.from_placement(p, vocab)

def sequence_hypothesis(vocab: Vocabulary) -> Hypothesis:
    first = Placement(actor="alpha-team", action="sighted", object="comet-q", place="alpha-observatory", mechanism="transit-timing-method", interval=Interval(start=1950, end=1950))
    second = Placement(actor="beta-team", action="extended", object="comet-q", place="beta-observatory", mechanism="photometric-method", interval=Interval(start=2010, end=2010))
    seq = Sequence(first=first, relation=AllenRelation.BEFORE, second=second)
    return Hypothesis.from_sequence(seq, vocab)

__all__ = [
    "BANNED_VOICE_WORDS",
    "assert_no_banned_voice_words",
    "assert_carries_model_prior_instruction",
    "spy_on_role_completions",
    "unicode_vocab",
    "empty_vocab",
    "unicode_evidence_item",
    "fifty_kb_evidence_item",
    "simple_hypothesis",
    "sequence_hypothesis",
    "evidence_item",
    "evidence_span",
    "hypothesis_for",
    "make_evidence_item",
    "placement_from_vocab",
    "small_vocab",
]
