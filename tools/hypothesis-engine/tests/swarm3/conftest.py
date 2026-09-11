"""Shared fixtures and helpers for round three of the property swarm
(`bkt-hte-test-swarm`), targeting the three least-covered modules that
belong to neither this branch's own concurrent-editing agent
(`hte/runner.py`, `hte/paper.py`, `hte/referee.py`, `hte/publish.py`,
`hte/pipeline.py`, `hte/artifacts.py`, all off limits here) nor the two
live campaigns writing under `runs/production/` and
`runs/education-atlas/` (also off limits, this round touches no run
directory at all): `hte/cli_synth.py` (24.1% covered as of
`tests/COVERAGE.md`), `hte/cli.py` (90.1%), `hte/roles.py` (90.7%).

Every test under `tests/swarm3/` runs in fake mode (`HTE_LLM_MODE=fake`,
`hte.fakellm`'s own deterministic, no-subprocess stand-ins) and is
forbidden from ever shelling out for real: the `no_real_subprocess`
fixture below is autouse for this whole package, patching
`hte.llm.subprocess.run` to raise if anything ever reaches it, the same
guarantee `hte.llm.complete`'s own fake-mode branch already gives by
construction (it returns before `subprocess` is ever imported into the
call), belt-and-suspenders against a future edit to this package
reintroducing a fallthrough. `fake_llm_mode` is also autouse, so a test
that wants to exercise the real, non-fake `replay_only`/cache path
(`tests/swarm3/test_cli_props.py`'s own `LLMCacheMissError` case) has to
opt back out explicitly with its own `monkeypatch.delenv`.

Round one's own `tests/swarm/conftest.py` and round two's own
`tests/swarm2/conftest.py` are both regular importable modules under this
same `tests` package (`tests/__init__.py` exists), so their own shared
strategies and fixture builders are imported directly here rather than
re-derived: `tests.swarm.conftest` for the belief/evidence primitives,
`tests.swarm2.conftest` for the small hand-built vocabulary and
`Hypothesis`/`Placement` builders `hte.roles` itself takes.
"""
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

# ---------------------------------------------------------------------------
# Never a real subprocess; always fake mode
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def no_real_subprocess(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patches `hte.llm.subprocess.run` (the one call site in this whole
    package that ever shells out to the `claude` CLI, `hte.llm._invoke_cli`)
    to raise `AssertionError` if anything, in this round's own tests or in
    the package code under test, ever reaches it. Fake mode already never
    imports `subprocess` at all (`hte.llm.complete`'s own fake-mode branch
    returns before `resolve_model`/`_cache_path`/`_invoke_cli` are ever
    called), so this is a second, independent guarantee rather than the
    only one: a test that accidentally leaves `HTE_LLM_MODE` unset (a
    `monkeypatch.delenv` call whose surrounding `try`/`finally` gets
    skipped by a prior assertion failure, say) still cannot shell out
    real subprocess."""

    def _forbidden(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError(
            f"tests/swarm3 forbids a real subprocess call; hte.llm.subprocess.run "
            f"was invoked with argv={args[:1]!r}"
        )

    monkeypatch.setattr(llm.subprocess, "run", _forbidden)


@pytest.fixture(autouse=True)
def fake_llm_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    """`HTE_LLM_MODE=fake` for every test in this package by default
    (`hte.llm.complete`'s own env-var dispatch to `hte.fakellm`). A test
    that wants the real, non-fake `replay_only`/cache-miss path calls
    `monkeypatch.delenv("HTE_LLM_MODE", raising=False)` itself; `monkeypatch`
    is function-scoped and this fixture and a test's own `monkeypatch`
    parameter are the identical object for that test, so the override,
    and its own teardown, layers on top of this fixture's own setup and
    teardown."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")


# ---------------------------------------------------------------------------
# The writing-voice banned-word list, `~/.claude/CLAUDE.md`'s own rule 1
# ("Banned words. Never use any of these.") reused as a test constant per
# this round's own task brief, checked against every role's own rendered
# prompt text.
# ---------------------------------------------------------------------------

# voice-ignore-next 8
# Verbatim copy of CLAUDE.md rule 1's own word list; reword the rule, not
# this constant.
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
    """No whole-word, case-insensitive match of `BANNED_VOICE_WORDS`
    anywhere in `text`. Word-bounded so a real term that happens to
    contain a banned word as a substring (there are none in this
    package's own role prompts, confirmed empirically) would not false-
    positive."""
    hits = sorted(set(m.group(1).lower() for m in _BANNED_WORD_RE.finditer(text)))
    assert not hits, f"{where} carries banned voice word(s) {hits}: {text!r}"


def assert_carries_model_prior_instruction(role_prompt: str) -> None:
    """The `model-prior` instruction (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
    §7's "the model's own recall is a low-tier, unverified source") every
    completion this package ever sends a model must carry. `hte/roles.py`'s
    own module docstring states this instruction "lives once, in
    `hte.llm.SYSTEM_PROMPT`, rather than being repeated per role": no
    individual role's own rendered prompt string names `model-prior`
    itself (`grep` over every prompt this module builds finds none), so
    the property this checks is over the full text a real `claude -p`
    call receives for that role: `hte.llm._invoke_cli`'s own
    `--system-prompt SYSTEM_PROMPT` argument plus the role's own prompt
    positional argument."""
    full_text = llm.SYSTEM_PROMPT + "\n\n" + role_prompt
    assert "model-prior" in full_text, (
        f"neither hte.llm.SYSTEM_PROMPT nor this role's own prompt text carries "
        f"the model-prior instruction: {role_prompt[:200]!r}"
    )


def spy_on_role_completions(monkeypatch: pytest.MonkeyPatch) -> dict[str, list[str]]:
    """Wraps `roles.llm.complete` so every call's `role` and `prompt` are
    recorded into the returned `{role: [prompt, ...]}` dict, while still
    dispatching to the real `hte.llm.complete` underneath (fake mode, per
    this file's own `fake_llm_mode` fixture, so the wrapped call stays
    subprocess-free): a recording spy that leaves the response every role
    function sees as the real `hte.fakellm` stand-in's own schema-valid
    answer."""
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


# ---------------------------------------------------------------------------
# Small builders `hte.roles`'s own functions take directly (a `Hypothesis`,
# a `Vocabulary` carrying unicode labels, an `EvidenceItem` with a long or
# unicode-heavy quote), on top of round one/two's own imported helpers.
# ---------------------------------------------------------------------------


def unicode_vocab() -> Vocabulary:
    """A fresh vocabulary carrying one unicode-labeled concept per
    concept-bearing slot: CJK, a combining mark, an emoji, and a Hebrew
    right-to-left label, so a role prompt embedding these labels (`hte.
    roles._vocab_slot_options`) exercises real non-ASCII text rather than
    an empty vocabulary standing in for "unicode" by omission."""
    vocab = Vocabulary()
    vocab.add(Concept(id="actor-u", slot=Slot.ACTOR, label="量子力学の観測者 🜁", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="action-u", slot=Slot.ACTION, label="observ́ed (combining acute)", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="object-u", slot=Slot.OBJECT, label="כוכב לכת", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="place-u", slot=Slot.PLACE, label="Ουρανός Παρατηρητήριο", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    vocab.add(Concept(id="mechanism-u", slot=Slot.MECHANISM, label="спектроскопия 🔭", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    return vocab


def empty_vocab() -> Vocabulary:
    """A vocabulary carrying nothing but `Vocabulary.__post_init__`'s own
    auto-added `OTHER` concept per slot: the "empty inputs" case for a
    role function that takes a `Vocabulary`."""
    return Vocabulary()


def unicode_evidence_item(item_id: str = "ev-unicode") -> EvidenceItem:
    quote = "квант 量子 🜁🜂🜃🜄 observação não confirmada — سُلَّم زمني"
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="doc-unicode",
        span=EvidenceSpan(doc_id="doc-unicode", locator="p1", quote=quote, char_start=0, char_end=len(quote)),
        provenance="test-fixture",
    )


def fifty_kb_evidence_item(item_id: str = "ev-fifty-kb") -> EvidenceItem:
    """A single `EvidenceItem` whose own quote alone clears 50 KB, so a
    role prompt embedding it (`hte.roles._evidence_line`) is itself well
    past 50 KB without needing many items."""
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
    """A `Hypothesis` wrapping a `Sequence` rather than a `Placement`, the
    branch `hte.roles._describe_hypothesis` takes only for a sequence
    hypothesis (lines 128-129, `tests/COVERAGE.md`'s own uncovered-range
    listing for `hte/roles.py`): two placements over the fixture vocab's
    own concepts, joined by `AllenRelation.BEFORE`."""
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
