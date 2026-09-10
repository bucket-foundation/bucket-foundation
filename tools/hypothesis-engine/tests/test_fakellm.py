"""`hte.llm.complete`'s fake-mode dispatch: never a subprocess call,
never a cache read or write, and every role returns a dict matching its
own schema's required keys.
"""
from __future__ import annotations

import pytest

from hte import fakellm, llm
from hte.roles import (
    CRITIQUE_SCHEMA,
    EXTRACT_SCHEMA,
    GENERATE_SCHEMA,
    JUDGE_SCHEMA,
    META_REVIEW_SCHEMA,
    PRESERVATION_CRITIQUE_SCHEMA,
    SELF_REPORT_SCHEMA,
    UNKNOWN_UNKNOWN_SCHEMA,
)


def _explode(*args, **kwargs):
    raise AssertionError("fake mode must never shell out to `claude -p`")


def test_complete_mode_fake_never_calls_subprocess(monkeypatch, tmp_path):
    monkeypatch.setattr(llm, "subprocess", type("S", (), {"run": staticmethod(_explode)}))
    response = llm.complete(
        "irrelevant prompt", role="preservation_critic", schema=PRESERVATION_CRITIQUE_SCHEMA,
        cache_dir=str(tmp_path / "cache"), mode="fake",
    )
    assert response["could_have_survived"] is True


def test_complete_env_var_fake_never_calls_subprocess(monkeypatch, tmp_path):
    monkeypatch.setattr(llm, "subprocess", type("S", (), {"run": staticmethod(_explode)}))
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    response = llm.complete(
        "irrelevant prompt", role="meta_review", schema=META_REVIEW_SCHEMA,
        cache_dir=str(tmp_path / "cache"),
    )
    assert isinstance(response["summary"], str)


def test_complete_mode_fake_does_not_touch_cache_dir(tmp_path):
    cache_dir = tmp_path / "cache-untouched"
    llm.complete(
        "irrelevant prompt", role="unknown_unknown", schema=UNKNOWN_UNKNOWN_SCHEMA,
        cache_dir=str(cache_dir), mode="fake",
    )
    assert not cache_dir.exists()


@pytest.mark.allow_subprocess  # deliberately takes the real `claude -p` path, bounded by timeout=1.0
def test_complete_mode_fake_ignored_when_not_set(monkeypatch, tmp_path):
    """Without `mode="fake"` and no `HTE_LLM_MODE` set, `complete()` still
    takes the real `claude -p` path (and so still raises on a cache
    miss with no `replay_only`, exercised elsewhere); this just confirms
    the env var is read fresh on every call. `timeout=1.0` bounds the
    real subprocess call this deliberately makes to a `FileNotFoundError`
    or a fast `TimeoutExpired`, either of which `_invoke_cli` turns into
    the `LLMInvocationError` asserted below, never a hang."""
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    with pytest.raises(llm.LLMInvocationError):
        llm.complete(
            "irrelevant prompt", role="critic", schema=CRITIQUE_SCHEMA,
            cache_dir=str(tmp_path / "cache"), replay_only=False, timeout=1.0,
        )


@pytest.mark.parametrize(
    "role,schema",
    [
        ("generator", GENERATE_SCHEMA),
        ("critic", CRITIQUE_SCHEMA),
        ("unknown_unknown", UNKNOWN_UNKNOWN_SCHEMA),
        ("preservation_critic", PRESERVATION_CRITIQUE_SCHEMA),
        ("judge", JUDGE_SCHEMA),
        ("meta_review", META_REVIEW_SCHEMA),
        ("self_report", SELF_REPORT_SCHEMA),
        ("extractor", EXTRACT_SCHEMA),
        ("escalation", EXTRACT_SCHEMA),
    ],
)
def test_fakellm_covers_every_role_with_required_keys(role, schema):
    response = fakellm.complete("some prompt with no structure at all", role=role, schema=schema)
    for key in schema["required"]:
        assert key in response, f"role={role!r} missing required key {key!r}"


def test_fakellm_unknown_role_raises():
    with pytest.raises(KeyError):
        fakellm.complete("prompt", role="not-a-real-role", schema={"required": []})


def test_fakellm_generator_echoes_evidence_slots_and_id():
    prompt = (
        "Propose placement hypotheses: actor performed action on object at "
        "place via mechanism, each grounded in the evidence below.\n\n"
        "Evidence:\n"
        "- (material, T1) 'actor=actor-3 action=action-1 object=object-5 place=place-2 "
        "mechanism=mechanism-0 year=1950' [evt-3]\n\n"
        "Vocabulary (id, label) per slot:\n"
        "actor: [{'id': 'actor-3', 'label': 'AAA'}, {'id': 'actor-7', 'label': 'BBB'}]\n"
        "action: [{'id': 'action-1', 'label': 'CCC'}]\n"
        "object: [{'id': 'object-5', 'label': 'DDD'}]\n"
        "place: [{'id': 'place-2', 'label': 'EEE'}]\n"
        "mechanism: [{'id': 'mechanism-0', 'label': 'FFF'}]\n\n"
        "Period hint: (none)\n\n"
        "Propose exactly 1 distinct placements."
    )
    response = fakellm.complete(prompt, role="generator", schema=GENERATE_SCHEMA)
    assert len(response["proposals"]) == 1
    proposal = response["proposals"][0]
    assert proposal["actor"] == "actor-3"
    assert proposal["action"] == "action-1"
    assert proposal["supporting_evidence_ids"] == ["evt-3"]


def test_fakellm_critic_keeps_when_supporting_evidence_present():
    prompt = (
        "Critique this hypothesis against the evidence naming it.\n\n"
        "Hypothesis: placement: actor='a' action='b' object='c' place='d' mechanism='e' interval=[1,1]\n"
        "Claims: []\n\n"
        "Supporting evidence:\n- (material, T1) 'x' [ev-1]\n\n"
        "Refuting evidence:\n\n"
        "Return keep=false only if..."
    )
    response = fakellm.complete(prompt, role="critic", schema=CRITIQUE_SCHEMA)
    assert response["keep"] is True


def test_fakellm_critic_rejects_when_no_supporting_evidence():
    prompt = (
        "Critique this hypothesis against the evidence naming it.\n\n"
        "Hypothesis: placement: actor='a' action='b' object='c' place='d' mechanism='e' interval=[1,1]\n"
        "Claims: []\n\n"
        "Supporting evidence:\n\n"
        "Refuting evidence:\n\n"
        "Return keep=false only if..."
    )
    response = fakellm.complete(prompt, role="critic", schema=CRITIQUE_SCHEMA)
    assert response["keep"] is False


def test_fakellm_judge_is_sigmoid_of_projection_difference():
    from hte.belief import Opinion, sigmoid

    a = Opinion(b=0.8, d=0.1, u=0.1, a=0.5)
    b = Opinion(b=0.1, d=0.8, u=0.1, a=0.5)
    prompt = f"Hypothesis A: ...\nA's opinion: {a}\n\nHypothesis B: ...\nB's opinion: {b}\n\nReturn p_a_wins..."
    response = fakellm.complete(prompt, role="judge", schema=JUDGE_SCHEMA)
    expected = sigmoid(a.project() - b.project())
    assert response["p_a_wins"] == pytest.approx(expected)


def test_fakellm_is_deterministic_across_calls():
    prompt = "Propose exactly 3 distinct placements.\n\nEvidence:\n(no evidence supplied)\n\n"
    r1 = fakellm.complete(prompt, role="generator", schema=GENERATE_SCHEMA)
    r2 = fakellm.complete(prompt, role="generator", schema=GENERATE_SCHEMA)
    assert r1 == r2
