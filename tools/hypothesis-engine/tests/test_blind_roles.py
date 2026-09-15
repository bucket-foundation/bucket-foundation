"""`bkt-hte-blind-roles` (audit item 3, `_intake/hypothesis-engine/
STATISTICAL-AUDIT-2026-09-15.md`): the critic and judge prompts carry no
`ConsensusStatus`, prior, or Elo, so neither role's verdict moves on a
label alone, and swapping which side of a pair reaches the judge as A
versus B mirrors the returned probability. `HTE_LLM_MODE=fake`
throughout: `hte.fakellm`'s stand-ins are deterministic functions of
prompt text alone, exactly what a leaked label would show up in.
"""
from __future__ import annotations

import dataclasses

import pytest

from hte import batching, roles, tournament
from hte.concepts import Slot
from hte.corpus import fixtures
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval

_BANNED_TERMS = ("consensus", "contested", "fringe", "base rate", "prior", "elo")


@pytest.fixture(autouse=True)
def _fake_mode(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")


def _hyp(vocab, actor: str) -> Hypothesis:
    p = Placement(
        actor=actor, action="sighted", object="comet-q", place="alpha-observatory",
        mechanism="transit-timing-method", interval=Interval(start=1950, end=1950),
    )
    return Hypothesis.from_placement(p, vocab)


def _swap_actor_consensus_status(vocab, id_a: str, id_b: str) -> None:
    """Swaps `ConsensusStatus` between two ACTOR concepts in place, at
    each one's own list index, so no hypothesis address moves; only the
    one field the audit names as a leak risk changes."""
    concepts = vocab.by_slot[Slot.ACTOR]
    by_id = {c.id: i for i, c in enumerate(concepts)}
    i, j = by_id[id_a], by_id[id_b]
    status_i, status_j = concepts[i].consensus_status, concepts[j].consensus_status
    concepts[i] = dataclasses.replace(concepts[i], consensus_status=status_j)
    concepts[j] = dataclasses.replace(concepts[j], consensus_status=status_i)


def _assert_no_banned_terms(prompt: str) -> None:
    """Checks the rendered hypothesis-and-evidence block alone (from
    `"Hypothesis"` to the final `"Return ..."` instruction), excluding
    the fixed instruction sentences around it: one of those (critique's
    own "...every tradition the actor belongs to.") contains "elo"
    incidentally, in "belongs"."""
    section = prompt[prompt.index("Hypothesis"):prompt.rindex("\n\nReturn")].lower()
    hits = [term for term in _BANNED_TERMS if term in section]
    assert not hits, f"rendered hypothesis section leaked {hits}: {section!r}"


def _capture_prompt(monkeypatch, response: dict, call) -> str:
    seen = {}

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        seen["prompt"] = prompt
        return response

    monkeypatch.setattr(roles.llm, "complete", fake)
    call()
    return seen["prompt"]


def _run_pipeline(vocab):
    """One critic filter plus one judge round, real production entry
    points (`hte.batching.batch_critique`, `hte.tournament.run`)."""
    corpus = fixtures.build()
    a = _hyp(vocab, "alpha-team")
    b = _hyp(vocab, "unverified-observer")
    corpus.evidence[0].supports.append(a.address)
    corpus.evidence[4].supports.append(b.address)
    reports = batching.batch_critique([a, b], corpus.evidence, cache_dir="unused")
    judge = lambda x, y, ctx: roles.judge(x, y, ctx, cache_dir="unused")  # noqa: E731
    elos = tournament.run([a, b], {}, judge, rounds=1, seed=0, context={"evidence": corpus.evidence})
    return reports, elos


def test_critic_and_judge_are_unaffected_by_a_consensus_status_swap():
    vocab = fixtures.build().vocab
    before_reports, before_elos = _run_pipeline(vocab)

    _swap_actor_consensus_status(vocab, "alpha-team", "unverified-observer")
    after_reports, after_elos = _run_pipeline(vocab)

    assert before_reports == after_reports
    assert before_elos == after_elos


def test_critic_prompt_carries_no_consensus_or_prior_language(monkeypatch):
    corpus = fixtures.build()
    h = _hyp(corpus.vocab, "alpha-team")
    corpus.evidence[0].supports.append(h.address)
    prompt = _capture_prompt(
        monkeypatch, {"keep": True, "issues": [], "rationale": "fine"},
        lambda: roles.critique(h, corpus.evidence, cache_dir="unused"),
    )
    _assert_no_banned_terms(prompt)


def test_judge_prompt_carries_no_consensus_or_prior_language(monkeypatch):
    corpus = fixtures.build()
    a = _hyp(corpus.vocab, "alpha-team")
    b = _hyp(corpus.vocab, "unverified-observer")
    corpus.evidence[0].supports.append(a.address)
    prompt = _capture_prompt(
        monkeypatch, {"p_a_wins": 0.5, "rationale": "fine"},
        lambda: roles.judge(a, b, {"evidence": corpus.evidence}, cache_dir="unused"),
    )
    _assert_no_banned_terms(prompt)


def test_judge_verdict_mirrors_when_the_two_sides_are_swapped():
    corpus = fixtures.build()
    a = _hyp(corpus.vocab, "alpha-team")
    b = _hyp(corpus.vocab, "unverified-observer")
    corpus.evidence[0].supports.append(a.address)
    context = {"evidence": corpus.evidence}

    p_ab = roles.judge(a, b, context, cache_dir="unused")
    p_ba = roles.judge(b, a, context, cache_dir="unused")

    assert p_ab == pytest.approx(1.0 - p_ba)
    assert p_ab != pytest.approx(0.5)  # meaningful only when the two sides differ
