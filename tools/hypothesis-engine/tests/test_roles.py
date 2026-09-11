import pytest

from hte import parallel as parallel_module
from hte import roles
from hte.corpus import fixtures
from hte.evidence import EvidenceKind, Stance, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval


def _corpus():
    return fixtures.build()


def _patch(monkeypatch, fn):
    monkeypatch.setattr(roles.llm, "complete", fn)


def _refuse_role(target_role: str, *, truncation_reason: str | None = None):
    """A `roles.llm.complete` stand-in for `bkt-hte-refusal-handling`'s
    own tests: raises `hte.llm.ModelRefusal` (or, when `truncation_reason`
    is given, `hte.llm.ModelTruncation`) for every call whose `role`
    matches `target_role`, and fails loudly for any other role, so a
    test using this catches a call it did not expect to reach `complete()`
    at all."""
    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        if role != target_role:
            raise AssertionError(f"unexpected role {role!r} reached complete() in this test")
        envelope = {"stop_reason": truncation_reason or "refusal", "session_id": "should-never-leak"}
        if truncation_reason is not None:
            raise roles.llm.ModelTruncation(
                role=role, prompt_sha256="a" * 64, cost_usd=0.01, envelope=envelope, reason=truncation_reason,
            )
        raise roles.llm.ModelRefusal(role=role, prompt_sha256="a" * 64, cost_usd=0.01, envelope=envelope)
    return fake


def _hyp(corpus, actor="alpha-team"):
    p = Placement(
        actor=actor, action="sighted", object="comet-q", place="alpha-observatory",
        mechanism="transit-timing-method", interval=Interval(start=1950, end=1950),
    )
    return Hypothesis.from_placement(p, corpus.vocab, claims=["gt-alpha"])


def test_generate_grounds_prompt_in_vocab_and_parses_response(monkeypatch):
    corpus = _corpus()
    seen = {}

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        seen["role"] = role
        seen["prompt"] = prompt
        seen["schema"] = schema
        return {"proposals": [{
            "actor": "alpha-team", "action": "sighted", "object": "comet-q",
            "place": "alpha-observatory", "mechanism": "transit-timing-method", "time_hint": "1950",
            "other_labels": {}, "supporting_evidence_ids": ["gt-alpha"], "rationale": "seed",
        }]}

    _patch(monkeypatch, fake)
    result = roles.generate({"vocab": corpus.vocab, "evidence": corpus.evidence[:2], "n": 1}, cache_dir="/tmp/hte-test-cache")
    assert seen["role"] == "generator"
    assert "alpha-team" in seen["prompt"]
    assert result["proposals"][0]["actor"] == "alpha-team"


def test_critique_only_shows_related_evidence(monkeypatch):
    corpus = _corpus()
    h = _hyp(corpus)
    corpus.evidence[0].supports.append(h.address)
    seen = {}

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        seen["role"] = role
        seen["prompt"] = prompt
        return {"keep": True, "issues": [], "rationale": "fine"}

    _patch(monkeypatch, fake)
    result = roles.critique(h, corpus.evidence, cache_dir="/tmp/hte-test-cache")
    assert seen["role"] == "critic"
    assert result["keep"] is True
    assert corpus.evidence[0].span.quote in seen["prompt"]


def test_unknown_unknown_lists_existing_vocab(monkeypatch):
    corpus = _corpus()

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "unknown_unknown"
        assert "alpha-team" in prompt or "Alpha Observatory team" in prompt
        return {"proposals": [{"slot": "actor", "label": "Gamma Team", "rationale": "new actor in evidence"}]}

    _patch(monkeypatch, fake)
    result = roles.unknown_unknown(corpus.vocab, corpus.evidence, cache_dir="/tmp/hte-test-cache")
    assert result["proposals"][0]["label"] == "Gamma Team"


def test_preservation_critique_reads_table(monkeypatch):
    corpus = _corpus()
    h = _hyp(corpus)

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "preservation_critic"
        return {"expected_evidence": ["an observatory logbook"], "could_have_survived": True, "detectability_adjustment": 0.8, "rationale": "well-documented era"}

    _patch(monkeypatch, fake)
    result = roles.preservation_critique(h, {"material": 0.8}, cache_dir="/tmp/hte-test-cache")
    assert result["could_have_survived"] is True
    assert result["detectability_adjustment"] == 0.8


def _distinct_hyps(corpus, n: int) -> list[Hypothesis]:
    """`n` hypotheses over the fixture vocab's own 3 actors x 2
    mechanisms (6 distinct addresses, `_corpus()`'s own full slot pool),
    each carrying a distinguishable `short_id` for order-checking."""
    combos = [(a, m) for a in ("alpha-team", "beta-team", "unverified-observer")
              for m in ("transit-timing-method", "photometric-method")]
    return [_hyp(corpus, actor=a) if m == "transit-timing-method" else Hypothesis.from_placement(
        Placement(actor=a, action="sighted", object="comet-q", place="alpha-observatory",
                  mechanism=m, interval=Interval(start=1950, end=1950)),
        corpus.vocab,
    ) for a, m in combos[:n]]


def test_preservation_critique_many_matches_serial_calls_in_order(monkeypatch, tmp_path):
    """`bkt-hte-throughput`: `preservation_critique_many` over N
    hypotheses must return the identical per-hypothesis results
    `preservation_critique` would, one call at a time, in the same
    order, whichever worker finished first."""
    corpus = _corpus()
    hyps = _distinct_hyps(corpus, 6)
    table = {"material": 0.8}

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "preservation_critic"
        for h in hyps:
            if f"actor={h.content.actor!r}" in prompt and f"mechanism={h.content.mechanism!r}" in prompt:
                tag = h.short_id
                break
        else:
            raise AssertionError(f"no known hypothesis found in prompt: {prompt!r}")
        return {
            "expected_evidence": [f"a record for {tag}"], "could_have_survived": True,
            "detectability_adjustment": 0.8, "rationale": tag,
        }

    _patch(monkeypatch, fake)
    serial = [roles.preservation_critique(h, table, cache_dir=str(tmp_path / "serial")) for h in hyps]
    many = roles.preservation_critique_many(hyps, table, cache_dir=str(tmp_path / "many"), workers=4)

    assert len(many) == 6
    assert [r["rationale"] for r in many] == [h.short_id for h in hyps]
    assert [r["rationale"] for r in many] == [r["rationale"] for r in serial]


def test_judge_returns_clipped_float(monkeypatch):
    corpus = _corpus()
    a = _hyp(corpus, actor="alpha-team")
    b = _hyp(corpus, actor="beta-team")

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "judge"
        return {"p_a_wins": 1.4, "rationale": "a is much stronger"}

    _patch(monkeypatch, fake)
    p = roles.judge(a, b, {"opinions": {}}, cache_dir="/tmp/hte-test-cache")
    assert isinstance(p, float)
    assert p == 1.0  # clipped into [0, 1]


def test_meta_review_summarizes_population(monkeypatch):
    corpus = _corpus()
    pop = [_hyp(corpus, actor="alpha-team"), _hyp(corpus, actor="beta-team")]

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "meta_review"
        return {"summary": "two consensus readings", "flags": [], "recommended_actions": ["widen next round"]}

    _patch(monkeypatch, fake)
    result = roles.meta_review(pop, {}, cache_dir="/tmp/hte-test-cache")
    assert result["summary"] == "two consensus readings"


def test_self_report_returns_required_fields(monkeypatch):
    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "self_report"
        return {
            "assumptions": ["evidence is textual"], "incomplete_vocabularies": ["mechanism"],
            "missing_mass_estimate": 0.2, "calibration_summary": "reasonable fit",
            "target_blind_steady": True, "target_blind_note": "rate held",
        }

    _patch(monkeypatch, fake)
    result = roles.self_report({"n_hypotheses_generated": 10}, cache_dir="/tmp/hte-test-cache")
    assert result["missing_mass_estimate"] == 0.2
    assert result["target_blind_steady"] is True


def test_understanding_returns_explanation(monkeypatch):
    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        assert role == "understanding"
        assert "Hypothesis: alpha-team sighted comet-q" in prompt
        return {"explanation": "Alpha team spotted a comet; the record backs it up."}

    _patch(monkeypatch, fake)
    result = roles.understanding(
        "alpha-team sighted comet-q", "1 supporting evidence item, P(h)=0.80",
        cache_dir="/tmp/hte-test-cache",
    )
    assert result["explanation"] == "Alpha team spotted a comet; the record backs it up."


def test_understanding_refusal_names_refusal_count(monkeypatch):
    roles.llm.reset_stats()
    roles.reset_refusal_log()
    roles.llm._STATS.record_refusal("critic", wall_time_s=0.0)
    _patch(monkeypatch, _refuse_role("understanding"))
    result = roles.understanding("a claim", "no evidence", cache_dir="/tmp/hte-test-cache")
    assert "1 refusal/truncation event" in result["explanation"]
    assert roles.refusal_log()["understanding"] == ["(unlabeled)"]


def test_extract_high_agreement_no_escalation(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-alpha"
    text = fixtures.FIXTURE_DOCS[doc_id]
    quote = "A 1962 follow-up confirmed the sighting independently"

    calls = {"n": 0}

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        calls["n"] += 1
        assert role == "extractor"
        return {"items": [{"kind": "textual", "tier": "T2", "quote": quote, "claim": "confirmed independently"}]}

    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    assert calls["n"] == 3
    assert result.escalated is False
    assert result.agreement == 1.0
    assert len(result.items) == 1
    item = result.items[0]
    assert item.span.quote == quote
    assert text[item.span.char_start:item.span.char_end] == quote
    assert item.kind == EvidenceKind.TEXTUAL
    assert item.tier == Tier.T2


def test_extract_low_agreement_escalates(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-beta"
    text = fixtures.FIXTURE_DOCS[doc_id]
    adjudicated_quote = "the Beta Observatory had extended comet Q's tracked orbit tenfold"

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        if role == "extractor":
            n = fake.n
            fake.n += 1
            quotes = [
                adjudicated_quote,
                "A contested 2015 press release claimed a further tenfold extension",
                "independent confirmation as of",
            ]
            return {"items": [{"kind": "textual", "tier": "T4", "quote": quotes[n % 3], "claim": "disagreeing pass"}]}
        assert role == "escalation"
        assert model == "opus"
        return {"items": [{"kind": "textual", "tier": "T2", "quote": adjudicated_quote, "claim": "adjudicated"}]}

    fake.n = 0
    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    assert result.escalated is True
    assert result.agreement < roles.EXTRACT_AGREEMENT_THRESHOLD
    assert len(result.items) == 1
    assert result.items[0].provenance == "llm-extraction-escalated"


def test_extract_carries_slot_fields_through_when_the_model_names_them(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-alpha"
    text = fixtures.FIXTURE_DOCS[doc_id]
    quote = "the first confirmed sighting of comet Q, tracked by the Alpha team using the transit-timing method"

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        return {"items": [{
            "kind": "material", "tier": "T1", "quote": quote, "claim": "first sighting",
            "actor": "Alpha Observatory team", "action": "sighted", "object": "Comet Q",
            "place": "Alpha Observatory", "mechanism": "transit-timing method",
            "year": 1950, "stance": "positive",
        }]}

    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    [item] = result.items
    assert item.actor == "Alpha Observatory team"
    assert item.mechanism == "transit-timing method"
    assert item.interval == Interval(start=1950, end=1950)
    assert item.stance == Stance.POSITIVE


def test_extract_leaves_slots_none_when_the_model_omits_them(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-alpha"
    text = fixtures.FIXTURE_DOCS[doc_id]
    quote = "A 1962 follow-up confirmed the sighting independently"

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        return {"items": [{"kind": "textual", "tier": "T2", "quote": quote, "claim": "confirmed"}]}

    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    [item] = result.items
    assert item.actor is None
    assert item.interval is None
    assert item.stance == Stance.POSITIVE


def test_extract_drops_items_whose_quote_is_not_found_verbatim(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-alpha"
    text = fixtures.FIXTURE_DOCS[doc_id]

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        return {"items": [{"kind": "textual", "tier": "T3", "quote": "this text does not appear anywhere", "claim": "hallucinated"}]}

    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    assert result.items == []


# --------------------------------------------------------------------------
# refusal/truncation defaults (`bkt-hte-refusal-handling`, 2026-09-10)
# --------------------------------------------------------------------------


def test_generate_refusal_defaults_to_empty_proposals(monkeypatch):
    corpus = _corpus()
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("generator"))
    result = roles.generate({"vocab": corpus.vocab, "evidence": corpus.evidence[:2], "n": 1}, cache_dir="/tmp/hte-test-cache")
    assert result == roles.GENERATE_DEFAULT
    assert result["proposals"] == []
    assert roles.refusal_log()["generator"] == ["(unlabeled)"]


def test_critique_refusal_defaults_to_reject(monkeypatch):
    corpus = _corpus()
    h = _hyp(corpus)
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("critic"))
    result = roles.critique(h, corpus.evidence, cache_dir="/tmp/hte-test-cache")
    assert result == roles.CRITIQUE_DEFAULT
    assert result["keep"] is False
    assert "model refused" in result["rationale"]
    assert roles.refusal_log()["critic"] == [h.short_id]


def test_critique_truncation_also_defaults_to_reject(monkeypatch):
    corpus = _corpus()
    h = _hyp(corpus)
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("critic", truncation_reason="max_tokens"))
    result = roles.critique(h, corpus.evidence, cache_dir="/tmp/hte-test-cache")
    assert result == roles.CRITIQUE_DEFAULT
    assert roles.refusal_log()["critic"] == [h.short_id]


def test_unknown_unknown_refusal_defaults_to_empty(monkeypatch):
    corpus = _corpus()
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("unknown_unknown"))
    result = roles.unknown_unknown(corpus.vocab, corpus.evidence, cache_dir="/tmp/hte-test-cache")
    assert result == roles.UNKNOWN_UNKNOWN_DEFAULT


def test_preservation_critique_refusal_defaults_to_neutral(monkeypatch):
    corpus = _corpus()
    h = _hyp(corpus)
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("preservation_critic"))
    result = roles.preservation_critique(h, {"material": 0.8}, cache_dir="/tmp/hte-test-cache")
    assert result == roles.PRESERVATION_CRITIQUE_DEFAULT
    assert result["detectability_adjustment"] == 0.5
    assert roles.refusal_log()["preservation_critic"] == [h.short_id]


def test_preservation_critique_many_one_refusal_defaults_and_completes(monkeypatch, tmp_path):
    """`bkt-hte-refusal-handling`: one of N hypotheses refuses on every
    attempt; the campaign-facing contract (N results, in order) still
    holds, N-1 real and one substituted `PRESERVATION_CRITIQUE_DEFAULT`,
    logged under `refusal_log()["preservation_critic"]`."""
    corpus = _corpus()
    hyps = _distinct_hyps(corpus, 4)
    table = {"material": 0.8}
    refuse_short_id = hyps[2].short_id
    roles.reset_refusal_log()
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)  # skip pmap's own retry backoff

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "preservation_critic"
        for h in hyps:
            if f"actor={h.content.actor!r}" in prompt and f"mechanism={h.content.mechanism!r}" in prompt:
                if h.short_id == refuse_short_id:
                    raise roles.llm.ModelRefusal(
                        role=role, prompt_sha256="a" * 64, cost_usd=0.01, envelope={"stop_reason": "refusal"},
                    )
                return {
                    "expected_evidence": [], "could_have_survived": True,
                    "detectability_adjustment": 0.9, "rationale": h.short_id,
                }
        raise AssertionError(f"no known hypothesis found in prompt: {prompt!r}")

    _patch(monkeypatch, fake)
    results = roles.preservation_critique_many(hyps, table, cache_dir=str(tmp_path), workers=4)

    assert len(results) == 4
    by_short_id = dict(zip((h.short_id for h in hyps), results))
    assert by_short_id[refuse_short_id] == roles.PRESERVATION_CRITIQUE_DEFAULT
    for h in hyps:
        if h.short_id != refuse_short_id:
            assert by_short_id[h.short_id]["rationale"] == h.short_id
    assert roles.refusal_log()["preservation_critic"] == [refuse_short_id]


def test_preservation_critique_many_non_refusal_failure_propagates_instead_of_defaulting(monkeypatch, tmp_path):
    """Silent-failures review finding 1: a failure other than
    `ModelRefusal`/`ModelTruncation` (here, `LLMInvalidResponseError`,
    the shape a systematic malformed-JSON bug would also take) must
    propagate out of `preservation_critique_many` instead of being
    silently absorbed into `PRESERVATION_CRITIQUE_DEFAULT` and logged as
    an ordinary refusal, `hte.parallel.pmap`'s own `default_exceptions`
    wiring (`hte.llm.complete_many`) now enforces."""
    corpus = _corpus()
    hyps = _distinct_hyps(corpus, 4)
    table = {"material": 0.8}
    fail_short_id = hyps[2].short_id
    roles.reset_refusal_log()
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)  # skip pmap's own retry backoff

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "preservation_critic"
        for h in hyps:
            if f"actor={h.content.actor!r}" in prompt and f"mechanism={h.content.mechanism!r}" in prompt:
                if h.short_id == fail_short_id:
                    raise roles.llm.LLMInvalidResponseError("malformed JSON on both attempts")
                return {
                    "expected_evidence": [], "could_have_survived": True,
                    "detectability_adjustment": 0.9, "rationale": h.short_id,
                }
        raise AssertionError(f"no known hypothesis found in prompt: {prompt!r}")

    _patch(monkeypatch, fake)
    with pytest.raises(roles.llm.LLMInvalidResponseError, match="malformed JSON"):
        roles.preservation_critique_many(hyps, table, cache_dir=str(tmp_path), workers=4)

    # nothing was defaulted or mislabeled as a refusal: the call raised
    # before `preservation_critique_many`'s own refusal-logging loop
    # ever ran over its (never produced) results
    assert roles.refusal_log() == {}


def test_judge_refusal_defaults_to_coin_flip(monkeypatch):
    corpus = _corpus()
    a = _hyp(corpus, actor="alpha-team")
    b = _hyp(corpus, actor="beta-team")
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("judge"))
    p = roles.judge(a, b, {"opinions": {}}, cache_dir="/tmp/hte-test-cache")
    assert p == 0.5
    assert roles.refusal_log()["judge"] == [f"{a.short_id}-v-{b.short_id}"]


def test_judge_truncation_defaults_to_coin_flip(monkeypatch):
    corpus = _corpus()
    a = _hyp(corpus, actor="alpha-team")
    b = _hyp(corpus, actor="beta-team")
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("judge", truncation_reason="max_tokens"))
    p = roles.judge(a, b, {"opinions": {}}, cache_dir="/tmp/hte-test-cache")
    assert p == 0.5


def test_meta_review_refusal_names_refusal_count(monkeypatch):
    corpus = _corpus()
    pop = [_hyp(corpus, actor="alpha-team"), _hyp(corpus, actor="beta-team")]
    roles.llm.reset_stats()
    roles.reset_refusal_log()
    # One prior refusal recorded in `llm.stats()`, so the default below
    # has a nonzero count to name.
    roles.llm._STATS.record_refusal("critic", wall_time_s=0.0)
    _patch(monkeypatch, _refuse_role("meta_review"))
    result = roles.meta_review(pop, {}, cache_dir="/tmp/hte-test-cache")
    assert result["flags"] == ["model-refusal"]
    assert "1 refusal/truncation event" in result["summary"]
    assert roles.refusal_log()["meta_review"] == ["(unlabeled)"]


def test_self_report_refusal_names_refusal_count(monkeypatch):
    roles.llm.reset_stats()
    roles.reset_refusal_log()
    roles.llm._STATS.record_refusal("critic", wall_time_s=0.0)
    roles.llm._STATS.record_truncation("judge", wall_time_s=0.0)
    _patch(monkeypatch, _refuse_role("self_report"))
    result = roles.self_report({"n_hypotheses_generated": 10}, cache_dir="/tmp/hte-test-cache")
    assert result["target_blind_steady"] is False
    assert "2 refusal/truncation event" in result["assumptions"][0]
    assert "2 refusal/truncation event" in result["calibration_summary"]


def test_extract_refusal_pass_defaults_to_empty_items_and_logs(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-alpha"
    text = fixtures.FIXTURE_DOCS[doc_id]
    quote = "A 1962 follow-up confirmed the sighting independently"
    roles.reset_refusal_log()

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        assert role == "extractor"
        if "pass 2" in prompt:
            raise roles.llm.ModelRefusal(
                role=role, prompt_sha256="a" * 64, cost_usd=0.01, envelope={"stop_reason": "refusal"},
            )
        return {"items": [{"kind": "textual", "tier": "T2", "quote": quote, "claim": "confirmed independently"}]}

    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    # 2 of 3 passes agree on `quote` (pass 2's refusal contributed
    # nothing, read as ordinary low agreement rather than aborting).
    assert result.agreement == 1.0
    assert len(result.items) == 1
    assert roles.refusal_log()["extractor"] == [f"{doc_id}-pass1"]


def test_extract_escalation_refusal_defaults_to_empty_extraction(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-beta"
    text = fixtures.FIXTURE_DOCS[doc_id]
    roles.reset_refusal_log()

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None, **_kwargs):
        if role == "extractor":
            # Three passes that share no quote at all: agreement stays 0,
            # forcing escalation.
            quotes = [
                "A contested 2015 press release claimed a further tenfold extension",
                "independent confirmation as of",
                "the Beta Observatory had extended comet Q's tracked orbit tenfold",
            ]
            idx = fake.n
            fake.n += 1
            return {"items": [{"kind": "textual", "tier": "T4", "quote": quotes[idx % 3], "claim": "disagreeing pass"}]}
        assert role == "escalation"
        raise roles.llm.ModelRefusal(role=role, prompt_sha256="a" * 64, cost_usd=0.01, envelope={"stop_reason": "refusal"})

    fake.n = 0
    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    assert result.escalated is True
    assert result.items == []
    assert roles.refusal_log()["escalation"] == [doc_id]


def test_refusal_log_reset_clears_prior_run(monkeypatch):
    corpus = _corpus()
    roles.reset_refusal_log()
    _patch(monkeypatch, _refuse_role("generator"))
    roles.generate({"vocab": corpus.vocab, "evidence": [], "n": 1}, cache_dir="/tmp/hte-test-cache")
    assert roles.refusal_log()
    roles.reset_refusal_log()
    assert roles.refusal_log() == {}
