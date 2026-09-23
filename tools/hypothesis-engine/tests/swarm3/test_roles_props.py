from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import jsonschema
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte import fakellm, roles
from hte.belief import Opinion
from hte.concepts import Vocabulary
from hte.corpus import fixtures
from hte.evidence import EvidenceItem, EvidenceKind, Tier

from tests.swarm3.conftest import (
    assert_carries_model_prior_instruction,
    assert_no_banned_voice_words,
    empty_vocab,
    evidence_item,
    fifty_kb_evidence_item,
    sequence_hypothesis,
    simple_hypothesis,
    small_vocab,
    spy_on_role_completions,
    unicode_evidence_item,
    unicode_vocab,
)

CASES = ("empty", "unicode", "fifty_kb")

def _check_prompts(captured: dict[str, list[str]], role_key: str, *, where: str) -> None:
    prompts = captured.get(role_key, [])
    assert prompts, f"{where}: no {role_key!r} completion was recorded at all"
    for prompt in prompts:
        assert_carries_model_prior_instruction(prompt)
        assert_no_banned_voice_words(prompt, where=f"{where} ({role_key} prompt)")

@pytest.mark.parametrize("case", CASES)
def test_generate_schema_valid_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    if case == "empty":
        context = {"vocab": empty_vocab(), "evidence": [], "n": 1}
    elif case == "unicode":
        context = {"vocab": unicode_vocab(), "evidence": [unicode_evidence_item()], "n": 3}
    else:
        context = {"vocab": small_vocab(), "evidence": [fifty_kb_evidence_item()], "n": 2}

    result = roles.generate(context, cache_dir=str(tmp_path))
    jsonschema.validate(instance=result, schema=roles.GENERATE_SCHEMA)
    _check_prompts(captured, "generator", where=f"generate/{case}")

@pytest.mark.parametrize("case", CASES)
def test_critique_schema_valid_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    vocab = small_vocab()
    h = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
    if case == "empty":
        evidence: list[EvidenceItem] = []
    elif case == "unicode":
        item = unicode_evidence_item()
        item.supports.append(h.address)
        evidence = [item]
    else:
        item = fifty_kb_evidence_item()
        item.supports.append(h.address)
        evidence = [item]

    result = roles.critique(h, evidence, cache_dir=str(tmp_path))
    jsonschema.validate(instance=result, schema=roles.CRITIQUE_SCHEMA)
    _check_prompts(captured, "critic", where=f"critique/{case}")

def test_critique_of_a_sequence_hypothesis_describes_both_placements(monkeypatch, tmp_path):
    captured = spy_on_role_completions(monkeypatch)
    vocab = fixtures.build().vocab
    h = sequence_hypothesis(vocab)
    assert h.is_sequence

    result = roles.critique(h, [], cache_dir=str(tmp_path))
    jsonschema.validate(instance=result, schema=roles.CRITIQUE_SCHEMA)
    prompt = captured["critic"][-1]
    assert "sequence: first=" in prompt
    assert "before" in prompt
    assert_carries_model_prior_instruction(prompt)
    assert_no_banned_voice_words(prompt, where="critique/sequence prompt")

@given(
    n_support=st.integers(min_value=0, max_value=4),
    n_refute=st.integers(min_value=0, max_value=4),
    tier=st.sampled_from(list(Tier)),
)
@settings(max_examples=100)
def test_critic_keep_matches_presence_of_linked_supporting_evidence(tmp_path_factory, n_support, n_refute, tier):
    vocab = small_vocab()
    h = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
    evidence = [
        evidence_item(f"sup-{i}", tier=tier, supports=[h.address]) for i in range(n_support)
    ] + [
        evidence_item(f"ref-{i}", tier=tier, refutes=[h.address]) for i in range(n_refute)
    ]
    cache_dir = tmp_path_factory.mktemp("critic-cache")
    result = roles.critique(h, evidence, cache_dir=str(cache_dir))
    assert result["keep"] == (n_support > 0), (
        f"n_support={n_support} n_refute={n_refute} tier={tier!r}: expected keep={n_support > 0}, got {result}"
    )
    if n_support == 0:
        assert result["issues"], "a rejected hypothesis should name at least one issue"

def test_critic_keeps_a_hypothesis_with_unrefuted_t1_support(tmp_path):
    vocab = small_vocab()
    h = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
    support = evidence_item("sup-t1", tier=Tier.T1, supports=[h.address])
    result = roles.critique(h, [support], cache_dir=str(tmp_path))
    assert result["keep"] is True

def test_critic_never_keeps_a_hypothesis_with_zero_linked_evidence(tmp_path):
    vocab = small_vocab()
    h = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
    assert roles.critique(h, [], cache_dir=str(tmp_path))["keep"] is False

    unrelated = evidence_item("unrelated", supports=[], refutes=[])
    assert roles.critique(h, [unrelated], cache_dir=str(tmp_path))["keep"] is False

@pytest.mark.parametrize("case", CASES)
def test_unknown_unknown_schema_valid_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    if case == "empty":
        vocab, evidence = empty_vocab(), []
    elif case == "unicode":
        vocab, evidence = unicode_vocab(), [unicode_evidence_item()]
    else:
        vocab, evidence = small_vocab(), [fifty_kb_evidence_item()]

    result = roles.unknown_unknown(vocab, evidence, cache_dir=str(tmp_path))
    jsonschema.validate(instance=result, schema=roles.UNKNOWN_UNKNOWN_SCHEMA)
    _check_prompts(captured, "unknown_unknown", where=f"unknown_unknown/{case}")

@pytest.mark.parametrize("case", CASES)
def test_preservation_critique_schema_valid_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    vocab = small_vocab()
    h = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
    if case == "empty":
        table, period = {}, None
    elif case == "unicode":
        table, period = {"период 1950-е": 0.5, "🜁-era": 0.2}, "квант период"
    else:
        table, period = {"material": 0.5}, "x" * 50_000

    result = roles.preservation_critique(h, table, period=period, cache_dir=str(tmp_path))
    jsonschema.validate(instance=result, schema=roles.PRESERVATION_CRITIQUE_SCHEMA)
    _check_prompts(captured, "preservation_critic", where=f"preservation_critique/{case}")

@pytest.mark.parametrize("case", CASES)
def test_judge_returns_bounded_float_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    vocab = small_vocab()
    a = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
    b = simple_hypothesis(vocab, actor="aliens", action="razed", object_="granary", place="valley", mechanism="tech")
    if case == "empty":
        context = {"opinions": {}}
    elif case == "unicode":
        context = {"opinions": {a.address: "量子 🜁 not-an-opinion-object", b.address: None}}
    else:
        context = {"opinions": {a.address: "x" * 50_000}}

    p = roles.judge(a, b, context, cache_dir=str(tmp_path))
    assert isinstance(p, float)
    assert 0.0 <= p <= 1.0
    _check_prompts(captured, "judge", where=f"judge/{case}")

@given(
    a_vals=st.tuples(*(st.floats(min_value=-3.0, max_value=3.0, allow_nan=False, allow_infinity=False) for _ in range(4))),
    b_vals=st.tuples(*(st.floats(min_value=-3.0, max_value=3.0, allow_nan=False, allow_infinity=False) for _ in range(4))),
)
@settings(max_examples=200)
def test_judge_is_bounded_and_antisymmetric_in_fake_mode(tmp_path_factory, a_vals, b_vals):
    vocab = small_vocab()
    a = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
    b = simple_hypothesis(vocab, actor="aliens", action="razed", object_="granary", place="valley", mechanism="tech")
    context = {"opinions": {a.address: Opinion(*a_vals), b.address: Opinion(*b_vals)}}

    cache_dir = tmp_path_factory.mktemp("judge-cache")
    p_ab = roles.judge(a, b, context, cache_dir=str(cache_dir))
    p_ba = roles.judge(b, a, context, cache_dir=str(cache_dir))

    assert 0.0 <= p_ab <= 1.0
    assert 0.0 <= p_ba <= 1.0
    assert abs((p_ab + p_ba) - 1.0) < 1e-9, f"judge(a,b)={p_ab} + judge(b,a)={p_ba} != 1 within 1e-9"

@pytest.mark.parametrize("case", CASES)
def test_meta_review_schema_valid_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    vocab = small_vocab()
    if case == "empty":
        population, opinions = [], {}
    elif case == "unicode":
        h = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
        population, opinions = [h], {h.address: "量子 🜁 опиньон"}
    else:
        h = simple_hypothesis(vocab, actor="farmers", action="built", object_="shrine", place="site", mechanism="labor")
        population, opinions = [h], {h.address: "x" * 50_000}

    result = roles.meta_review(population, opinions, cache_dir=str(tmp_path))
    jsonschema.validate(instance=result, schema=roles.META_REVIEW_SCHEMA)
    _check_prompts(captured, "meta_review", where=f"meta_review/{case}")

@pytest.mark.parametrize("case", CASES)
def test_self_report_schema_valid_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    if case == "empty":
        run = {}
    elif case == "unicode":
        run = {"note": "量子力学 🜁 не подтверждено"}
    else:
        run = {"blob": "x" * 50_000}

    result = roles.self_report(run, cache_dir=str(tmp_path))
    jsonschema.validate(instance=result, schema=roles.SELF_REPORT_SCHEMA)
    _check_prompts(captured, "self_report", where=f"self_report/{case}")

def _assert_extraction_result_valid(result: roles.ExtractionResult) -> None:
    assert isinstance(result.agreement, float)
    assert 0.0 <= result.agreement <= 1.0
    assert isinstance(result.escalated, bool)
    assert isinstance(result.items, list)
    for item in result.items:
        assert isinstance(item, EvidenceItem)

@pytest.mark.parametrize("case", CASES)
def test_extract_schema_valid_and_prompt_clean(monkeypatch, tmp_path, case):
    captured = spy_on_role_completions(monkeypatch)
    if case == "empty":
        text, vocab = "", empty_vocab()
    elif case == "unicode":
        text, vocab = "квант 量子 🜁🜂🜃🜄 observação não confirmada — سُلَّم زمني", unicode_vocab()
    else:
        text, vocab = "the quick brown fox jumps over the lazy dog. " * 1200, small_vocab()
        assert len(text.encode("utf-8")) >= 50_000

    result = roles.extract(text, vocab, doc_id=f"doc-{case}", cache_dir=str(tmp_path))
    _assert_extraction_result_valid(result)
    _check_prompts(captured, "extractor", where=f"extract/{case}")

def test_extract_ensemble_of_three_agrees_on_the_fixture(tmp_path):
    text = "Header prose with no microformat line.\nactor=alpha-team action=sighted object=comet-q place=alpha-observatory mechanism=transit-timing-method year=1950 [gt-1]\nFooter prose."
    vocab = Vocabulary()
    result = roles.extract(text, vocab, doc_id="doc-agree", cache_dir=str(tmp_path))
    assert result.escalated is False
    assert result.agreement == 1.0
    assert len(result.items) == 1
    assert result.items[0].actor == "alpha-team"

def test_extract_ensemble_escalates_on_a_planted_disagreement(monkeypatch, tmp_path):
    text = "Header prose.\nactor=alpha-team action=sighted object=comet-q place=alpha-observatory mechanism=transit-timing-method year=1950 [gt-2]\nFooter prose."
    vocab = Vocabulary()

    real_complete = fakellm.complete
    calls = {"extractor": 0}

    def patched(prompt, *, role, schema):
        if role == "extractor":
            calls["extractor"] += 1
            if calls["extractor"] == 2:
                return {
                    "items": [
                        {"kind": "textual", "tier": "T4", "quote": "planted disagreement quote one", "claim": "bogus pass"},
                        {"kind": "textual", "tier": "T4", "quote": "planted disagreement quote two", "claim": "bogus pass"},
                    ]
                }
        return real_complete(prompt, role=role, schema=schema)

    monkeypatch.setattr(fakellm, "complete", patched)
    result = roles.extract(text, vocab, doc_id="doc-disagree", cache_dir=str(tmp_path))

    assert calls["extractor"] == 3
    assert result.escalated is True
    assert result.agreement < roles.EXTRACT_AGREEMENT_THRESHOLD
    assert len(result.items) == 1
    assert result.items[0].actor == "alpha-team"
    assert result.items[0].provenance == "llm-extraction-escalated"

def test_extract_locates_a_padded_quote_via_the_stripped_fallback(monkeypatch, tmp_path):
    text = "The quick brown fox jumps over the lazy dog."

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        return {"items": [{
            "kind": "textual", "tier": "T3",
            "quote": "  The quick brown fox jumps over the lazy dog.  \n",
            "claim": "padded quote",
        }]}

    monkeypatch.setattr(roles.llm, "complete", fake)
    result = roles.extract(text, Vocabulary(), doc_id="doc-padded", cache_dir=str(tmp_path))
    assert len(result.items) == 1
    item = result.items[0]
    assert text[item.span.char_start:item.span.char_end] == text

@pytest.mark.parametrize(
    "raw_kind,raw_tier,expected_kind,expected_tier",
    [
        ("not-a-real-kind", "T2", EvidenceKind.MODEL_PRIOR, Tier.T2),
        ("textual", "not-a-real-tier", EvidenceKind.TEXTUAL, Tier.T5),
        ("not-a-real-kind", "not-a-real-tier", EvidenceKind.MODEL_PRIOR, Tier.T5),
    ],
)
def test_extract_falls_back_to_model_prior_and_t5_on_an_invalid_enum(monkeypatch, tmp_path, raw_kind, raw_tier, expected_kind, expected_tier):
    text = "The quick brown fox jumps over the lazy dog."

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        return {"items": [{"kind": raw_kind, "tier": raw_tier, "quote": text, "claim": "enum-fallback probe"}]}

    monkeypatch.setattr(roles.llm, "complete", fake)
    result = roles.extract(text, Vocabulary(), doc_id="doc-enum-fallback", cache_dir=str(tmp_path))
    assert len(result.items) == 1
    assert result.items[0].kind == expected_kind
    assert result.items[0].tier == expected_tier
