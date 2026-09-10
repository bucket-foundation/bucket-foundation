from hte import roles
from hte.corpus import fixtures
from hte.evidence import EvidenceKind, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval


def _corpus():
    return fixtures.build()


def _patch(monkeypatch, fn):
    monkeypatch.setattr(roles.llm, "complete", fn)


def _hyp(corpus, actor="alpha-team"):
    p = Placement(
        actor=actor, action="sighted", object="comet-q", place="alpha-observatory",
        mechanism="transit-timing-method", interval=Interval(start=1950, end=1950),
    )
    return Hypothesis.from_placement(p, corpus.vocab, claims=["gt-alpha"])


def test_generate_grounds_prompt_in_vocab_and_parses_response(monkeypatch):
    corpus = _corpus()
    seen = {}

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
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

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
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

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        assert role == "unknown_unknown"
        assert "alpha-team" in prompt or "Alpha Observatory team" in prompt
        return {"proposals": [{"slot": "actor", "label": "Gamma Team", "rationale": "new actor in evidence"}]}

    _patch(monkeypatch, fake)
    result = roles.unknown_unknown(corpus.vocab, corpus.evidence, cache_dir="/tmp/hte-test-cache")
    assert result["proposals"][0]["label"] == "Gamma Team"


def test_preservation_critique_reads_table(monkeypatch):
    corpus = _corpus()
    h = _hyp(corpus)

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        assert role == "preservation_critic"
        return {"expected_evidence": ["an observatory logbook"], "could_have_survived": True, "detectability_adjustment": 0.8, "rationale": "well-documented era"}

    _patch(monkeypatch, fake)
    result = roles.preservation_critique(h, {"material": 0.8}, cache_dir="/tmp/hte-test-cache")
    assert result["could_have_survived"] is True
    assert result["detectability_adjustment"] == 0.8


def test_judge_returns_clipped_float(monkeypatch):
    corpus = _corpus()
    a = _hyp(corpus, actor="alpha-team")
    b = _hyp(corpus, actor="beta-team")

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        assert role == "judge"
        return {"p_a_wins": 1.4, "rationale": "a is much stronger"}

    _patch(monkeypatch, fake)
    p = roles.judge(a, b, {"opinions": {}}, cache_dir="/tmp/hte-test-cache")
    assert isinstance(p, float)
    assert p == 1.0  # clipped into [0, 1]


def test_meta_review_summarizes_population(monkeypatch):
    corpus = _corpus()
    pop = [_hyp(corpus, actor="alpha-team"), _hyp(corpus, actor="beta-team")]

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        assert role == "meta_review"
        return {"summary": "two consensus readings", "flags": [], "recommended_actions": ["widen next round"]}

    _patch(monkeypatch, fake)
    result = roles.meta_review(pop, {}, cache_dir="/tmp/hte-test-cache")
    assert result["summary"] == "two consensus readings"


def test_self_report_returns_required_fields(monkeypatch):
    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
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


def test_extract_high_agreement_no_escalation(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-alpha"
    text = fixtures.FIXTURE_DOCS[doc_id]
    quote = "A 1962 follow-up confirmed the sighting independently"

    calls = {"n": 0}

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
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

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
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


def test_extract_drops_items_whose_quote_is_not_found_verbatim(monkeypatch):
    corpus = _corpus()
    doc_id = "doc-alpha"
    text = fixtures.FIXTURE_DOCS[doc_id]

    def fake(prompt, *, role, schema, cache_dir, replay_only=False, model=None):
        return {"items": [{"kind": "textual", "tier": "T3", "quote": "this text does not appear anywhere", "claim": "hallucinated"}]}

    _patch(monkeypatch, fake)
    result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir="/tmp/hte-test-cache")
    assert result.items == []
