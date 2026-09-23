import json

from hte import roles, runner
from hte.fakellm import _advocate
from hte.corpus import fixtures as fixtures_corpus
from hte.generate import combinatorial_sample
from tests.test_runner import _fake_mode_cfg

def test_advocate_pool_holds_only_unlinked_items_sharing_a_slot_value():
    corpus = fixtures_corpus.build()
    h = combinatorial_sample(corpus.vocab, [0], max_items=1, seed=0)[0]
    for e in corpus.evidence:
        e.actor = h.content.actor
    corpus.evidence[0].supports.append(h.address)
    pool = roles.advocate_pool(h, corpus.evidence)
    assert corpus.evidence[0] not in pool and len(pool) == len(corpus.evidence) - 1
    assert [e.tier.value for e in pool] == sorted(e.tier.value for e in pool)

def test_fake_advocate_names_the_first_candidate_and_the_runner_links_and_rescores(tmp_path, monkeypatch):
    report = _advocate("Argue for this hypothesis.\n\nCandidate items:\n- (textual, T2) 'x' [e-first]\n- (textual, T1) 'y' [e-second]\n\nReturn support", roles.ADVOCATE_SCHEMA)
    assert report["support"] == [{"id": "e-first", "reason": "fake stand-in: first candidate"}]
    cfg = _fake_mode_cfg(
        tmp_path, monkeypatch, corpus="production", max_hypotheses=20, combinatorial_max_items=1,
        max_time_bins=2, run_extraction=False, advocate_k=3,
    )
    artifacts = runner.run_campaign(cfg)
    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    summary = manifest["counts"]["advocate"]
    assert summary["n_argued"] == min(3, manifest["counts"]["n_survivors"])
    entries = json.loads((artifacts.run_dir / "survivors.json").read_text())["survivors"]
    argued = [e for e in entries if e["advocate"] is not None]
    assert len(argued) == summary["n_argued"]
    assert all(e["advocate"]["lift_after"] >= e["advocate"]["lift_before"] for e in argued)

def test_advocate_off_at_zero(tmp_path, monkeypatch):
    cfg = _fake_mode_cfg(
        tmp_path, monkeypatch, corpus="production", max_hypotheses=20, combinatorial_max_items=1,
        max_time_bins=2, run_extraction=False, advocate_k=0,
    )
    artifacts = runner.run_campaign(cfg)
    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert manifest["counts"]["advocate"] == {"n_argued": 0, "links_added": 0, "mean_gain": None}
