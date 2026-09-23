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
    concepts = vocab.by_slot[Slot.ACTOR]
    by_id = {c.id: i for i, c in enumerate(concepts)}
    i, j = by_id[id_a], by_id[id_b]
    status_i, status_j = concepts[i].consensus_status, concepts[j].consensus_status
    concepts[i] = dataclasses.replace(concepts[i], consensus_status=status_j)
    concepts[j] = dataclasses.replace(concepts[j], consensus_status=status_i)

def _assert_no_banned_terms(prompt: str) -> None:
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

_JUDGE_CALLERS = {
    "roles.judge": lambda a, b, ctx: roles.judge(a, b, ctx, cache_dir="unused"),
    "batching.batch_judge": lambda a, b, ctx: batching.batch_judge([(a, b, ctx)], cache_dir="unused")[0],
}

def _run_pipeline(vocab, judge_call):
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
    assert p_ab != pytest.approx(0.5)
