"""`bkt-hte-blind-roles` (audit item 3, `_intake/hypothesis-engine/
STATISTICAL-AUDIT-2026-09-15.md`): the critic and judge prompts carry no
`ConsensusStatus`, prior, or Elo, and swapping which side of a pair
reaches the judge as A versus B mirrors the returned probability.
`HTE_LLM_MODE=fake` throughout: `hte.fakellm`'s stand-ins are
deterministic functions of prompt text, so an identical prompt gives an
identical verdict; the swap test below relies on that determinism, but
only the two direct prompt-content scans (`_assert_no_banned_terms`)
read the full rendered section, so they are what catches a label
leaked outside the fields `hte.fakellm._judge`/`_critic` parse.
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


# Both production judge paths (`hte.runner.run_campaign` wires
# `hte.batching.batch_judge` by default, falling back to `hte.roles.
# judge` per pair; either can be handed to `hte.tournament.run` as its
# single-call `judge`), so the label-swap and banned-terms tests below
# run against both rather than only the single-item one.
_JUDGE_CALLERS = {
    "roles.judge": lambda a, b, ctx: roles.judge(a, b, ctx, cache_dir="unused"),
    "batching.batch_judge": lambda a, b, ctx: batching.batch_judge([(a, b, ctx)], cache_dir="unused")[0],
}


def _run_pipeline(vocab, judge_call):
    """One critic filter plus one judge round, real production entry
    points (`hte.batching.batch_critique`, `hte.tournament.run`)."""
    corpus = fixtures.build()
    a = _hyp(vocab, "alpha-team")
    b = _hyp(vocab, "unverified-observer")
    corpus.evidence[0].supports.append(a.address)
    corpus.evidence[4].supports.append(b.address)
    reports = batching.batch_critique([a, b], corpus.evidence, cache_dir="unused")
    elos = tournament.run([a, b], {}, judge_call, rounds=1, seed=0, context={"evidence": corpus.evidence})
    return reports, elos


@pytest.mark.parametrize("judge_call", _JUDGE_CALLERS.values(), ids=_JUDGE_CALLERS.keys())
def test_critic_and_judge_are_unaffected_by_a_consensus_status_swap(judge_call):
    vocab = fixtures.build().vocab
    before_reports, before_elos = _run_pipeline(vocab, judge_call)

    _swap_actor_consensus_status(vocab, "alpha-team", "unverified-observer")
    after_reports, after_elos = _run_pipeline(vocab, judge_call)

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


# `_judge_batch_prompt` (`hte.batching`) is its own duplicated copy of
# the hypothesis-and-evidence rendering `hte.roles.judge` uses (see
# `hte.batching`'s own module docstring), so a leak introduced only
# there would pass a scan of `roles.judge`'s prompt alone.
_JUDGE_PROMPT_CASES = {
    "roles.judge": (
        lambda a, b, ctx: roles.judge(a, b, ctx, cache_dir="unused"),
        {"p_a_wins": 0.5, "rationale": "fine"},
    ),
    "batching.batch_judge": (
        lambda a, b, ctx: batching.batch_judge([(a, b, ctx)], cache_dir="unused"),
        {"results": [{"id": "0", "p_a_wins": 0.5, "rationale": "fine"}]},
    ),
}


@pytest.mark.parametrize("judge_call, response", _JUDGE_PROMPT_CASES.values(), ids=_JUDGE_PROMPT_CASES.keys())
def test_judge_prompt_carries_no_consensus_or_prior_language(monkeypatch, judge_call, response):
    corpus = fixtures.build()
    a = _hyp(corpus.vocab, "alpha-team")
    b = _hyp(corpus.vocab, "unverified-observer")
    corpus.evidence[0].supports.append(a.address)
    prompt = _capture_prompt(monkeypatch, response, lambda: judge_call(a, b, {"evidence": corpus.evidence}))
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
