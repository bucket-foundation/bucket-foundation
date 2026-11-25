import json

import pytest

from hte import api, learning
from hte.corpus import learning as lc
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Stance, Tier

def _write(root, rel, rows):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text("\n".join(json.dumps(r) for r in rows) + "\n")

def _work(wid, finding, study_type="meta-analysis", withdrawn=False):
    return {"id": wid, "authors": ["A"], "year": 2020, "title": "t", "study_type": study_type,
            "finding": finding, "topics": [], "withdrawn": withdrawn}

@pytest.fixture
def root(tmp_path):
    _write(tmp_path, "learning/corpus/works.jsonl", [
        _work("w-cognate", "Higher cognate share cut the hours to reach proficiency."),
        _work("w-spacing", "Spaced practice improved retention over massed study.", "RCT"),
        _work("w-null", "Spacing did not improve retention in this sample.", "correlational"),
        _work("w-gone", "Spaced practice improved retention.", withdrawn=True),
        _work("w-untagged", "A description of a classroom."),
    ])
    _write(tmp_path, "learning/research/language/sla/works.jsonl", [
        _work("w-cognate", "duplicate row ignored"),
        _work("w-input", "Extensive reading raised vocabulary scores.", "experiment"),
    ])
    _write(tmp_path, "learning/corpus/claims.jsonl", [
        {"id": "core:spacing", "name": "Spacing effect", "statement": "Spaced study improves long-term retention.",
         "topics": ["memory"], "supports": ["w-spacing", "missing-work"], "contradicted_by": ["w-null"]},
    ])
    talks = tmp_path / "learning/research/language/talks"
    talks.mkdir(parents=True)
    (talks / "CLAIMS.md").write_text(
        "| # | Claim | Source | Research |\n|---|---|---|---|\n"
        "| 1 | SRS beats massed study for recall. | x @ 1 | CONFIRMS. Cepeda 2006. |\n"
        "| 2 | Cognate-rich languages take fewer hours. | y @ 2 | Untested. FSI estimates. |\n"
        "| 3 | Shadowing improves listening. | z @ 3 | MIXED. Hamada 2016. |\n"
    )
    return tmp_path

def test_tier_mapping():
    assert lc.work_tier("meta-analysis") is Tier.T1
    assert lc.work_tier("RCT") is Tier.T2
    assert lc.work_tier(None) is Tier.T6
    assert lc.work_tier("unknown-kind") is Tier.T6

def test_tagging_and_stance():
    assert "lexical_proximity" in lc.tag_mechanisms("cognate share")
    assert "time_to_proficiency" in lc.tag_outcomes("hours to proficiency")
    assert lc.tag_outcomes("nothing here", ["memory"]) == ["retention"]
    assert lc.text_stance("did not improve recall") is Stance.NEGATIVE
    assert lc.text_stance("improved recall") is Stance.POSITIVE

def test_parse_talk_claims_verdicts():
    rows = lc.parse_talk_claims("| 4 | c | s | CONTRADICTS in part. x |\n| n | header | s | r |\n")
    assert [(r.number, r.verdict) for r in rows] == [(4, "CONTRADICTS")]

def test_load_builds_sources_and_evidence(root):
    got = lc.load(root)
    assert set(got.works) == {"w-cognate", "w-spacing", "w-null", "w-gone", "w-untagged", "w-input"}
    assert got.works["w-cognate"]["finding"].startswith("Higher")
    assert "w-gone" not in got.corpus.sources
    assert got.skipped["withdrawn"] == 1
    assert got.skipped["dangling_work_ref"] >= 1
    assert got.skipped["untagged_work"] >= 1
    ids = {e.id for e in got.corpus.evidence}
    assert "work:w-cognate#lexical_proximity>time_to_proficiency" in ids
    neg = [e for e in got.corpus.evidence if e.id.startswith("claim:core:spacing@w-null")]
    assert neg and all(e.stance is Stance.NEGATIVE for e in neg)
    talks = [e for e in got.corpus.evidence if e.source_id.startswith("talk:")]
    assert talks and all(e.kind is EvidenceKind.MODEL_PRIOR and e.tier is Tier.T6 for e in talks)
    for e in got.corpus.evidence:
        assert e.span.char_end <= e.span.doc_length
        assert 0 < e.views["pair_share"] <= 1

def test_evidence_round_trips(root):
    for e in lc.load(root).corpus.evidence:
        assert EvidenceItem.from_dict(e.to_dict()) == e

def test_load_missing_root_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        lc.load(tmp_path)

def test_bad_jsonl_names_line(tmp_path):
    p = tmp_path / "x.jsonl"
    p.write_text('{"id": 1}\n{oops\n')
    with pytest.raises(ValueError, match="x.jsonl:2"):
        lc.read_jsonl(p)

def test_grade_prefers_supported_hypothesis(root):
    hyps = {h.id: h for h in learning.build_hypotheses(lc.load(root).corpus.evidence)}
    spacing = hyps["spacing>retention"]
    assert spacing.supports and spacing.refutes
    assert spacing.opinion.b > spacing.opinion.d
    assert abs(spacing.opinion.b + spacing.opinion.d + spacing.opinion.u - 1) < 1e-9
    empty = hyps["deliberate_practice>expert_performance"]
    assert empty.seeded and empty.opinion.u == 1.0 and empty.opinion.project() == 0.5

def test_same_source_counts_once():
    span = EvidenceSpan("s", "l", "q", 0, 1, 1)
    items = [EvidenceItem(id=f"e{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="s", span=span, provenance="p") for i in range(3)]
    assert learning.grade(items, []).b == learning.grade(items[:1], []).b

def test_fake_campaign_ranks_and_queues_gaps(root):
    result = learning.run_campaign(root=root, mode="fake", cache_dir=root / "cache")
    ps = [h["P"] for h in result["hypotheses"]]
    assert ps == sorted(ps, reverse=True)
    assert result["counts"]["judged"] > 0
    assert any(h["judge"] for h in result["hypotheses"])
    kinds = {g["kind"] for g in result["gap_nodes"]}
    assert {"thin-evidence", "talk-untested", "talk-mixed"} <= kinds
    vois = [g["value_of_information"] for g in result["gap_nodes"]]
    assert vois == sorted(vois, reverse=True)
    md = learning.render_markdown(result)
    assert "w-spacing" in md and "—" not in md

def test_judge_opinion_mapping():
    assert learning.judge_opinion({"verdict": "insufficient", "confidence": 1}) is None
    assert learning.judge_opinion({"verdict": "refutes", "confidence": 1}).d > 0
    assert learning.judge_opinion({"verdict": "supports", "confidence": 1}).b > 0

def test_api_learning_domain(root, monkeypatch):
    monkeypatch.setenv("HTE_LEARNING_ROOT", str(root))
    out = api.hypothesize({"domain": "learning", "llm_mode": "fake", "judge_top": 2})
    assert out["domain"] == "learning"
    assert out["ranked_markdown"].startswith("# Ranked")

def test_api_rejects_unknown_domain():
    with pytest.raises(api.RequestValidationError, match="domain"):
        api.hypothesize({"domain": "astrology"})

def test_api_learning_validates_judge_top(root, monkeypatch):
    monkeypatch.setenv("HTE_LEARNING_ROOT", str(root))
    with pytest.raises(api.RequestValidationError, match="judge_top"):
        api.hypothesize({"domain": "learning", "llm_mode": "fake", "judge_top": -1})

def test_bad_mode_rejected(root):
    with pytest.raises(ValueError):
        learning.run_campaign(root=root, mode="other")
