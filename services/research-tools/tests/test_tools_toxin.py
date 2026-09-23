from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ["TOOLS_OFFLINE"] = "1"

import pytest  # noqa: E402

import tools_rag as _rag  # noqa: E402
import tools_toxin as tx  # noqa: E402
from fixtures import WORKS_TOXIN_CONOTOXIN  # noqa: E402

def test_is_sequence_distinguishes_name_from_peptide():
    assert tx.is_sequence("CKGKGAKCSRLMYDCCTGSCRSGKC") is True
    assert tx.is_sequence("omega-conotoxin MVIIA") is False
    assert tx.is_sequence("apamin") is False

def test_classify_by_name_known_toxins():
    fams = tx.classify_by_name("omega-conotoxin MVIIA")
    assert fams and any("Cav" in [t for t, _ in f["targets"]] for f in fams)
    fams2 = tx.classify_by_name("apamin")
    assert fams2 and ("SK", 0.95) in fams2[0]["targets"]
    fams3 = tx.classify_by_name("tetrodotoxin (TTX)")
    assert fams3 and ("Nav", 0.97) in fams3[0]["targets"]
    fams4 = tx.classify_by_name("alpha-bungarotoxin")
    assert fams4 and ("nAChR", 0.96) in fams4[0]["targets"]

def test_classify_by_sequence_uses_cysteine_framework():
    seq = "CKGKGAKCSRLMYDCCTGSCRSGKC"
    cands = tx.classify_by_sequence(seq)
    assert cands, "a 6-Cys peptide should match at least one family"
    assert cands[0]["_seq_score"] > 0

def test_count_channel_cooccurrence():
    counts = tx.count_channel_cooccurrence(WORKS_TOXIN_CONOTOXIN)
    assert "Cav" in counts
    assert counts["Cav"]["count"] >= 1
    assert counts["Cav"]["exemplars"]

def test_fuse_targets_kb_beats_literature_only():
    kb = tx.classify_by_name("omega-conotoxin")
    lit = {"Kv": {"count": 1, "exemplars": []}}
    fused = tx.fuse_targets(kb, lit)
    assert fused[0]["channel"] == "Cav"
    assert fused[0]["confidence"] > fused[-1]["confidence"]
    kv = [r for r in fused if r["channel"] == "Kv"]
    assert kv and kv[0]["basis"] == "literature co-occurrence only"

def test_run_toxin_channel_finder_known_name(monkeypatch):
    monkeypatch.setattr(_rag, "search_works", lambda *a, **k: list(WORKS_TOXIN_CONOTOXIN))
    out = tx.run_toxin_channel_finder({"toxin": "omega-conotoxin MVIIA"})
    assert out.get("error") is None
    assert out["identity"]["mode"] == "name"
    assert out["targets"][0]["channel"] == "Cav"
    assert out["targets"][0]["confidence"] >= 0.6
    assert any(f["family"] == "omega-conotoxin" for f in out["matched_families"])
    assert out["targets"][0]["literature_mentions"] >= 1
    assert out["targets"][0]["exemplars"]

def test_run_toxin_channel_finder_sequence_mode(monkeypatch):
    monkeypatch.setattr(_rag, "search_works", lambda *a, **k: [])
    out = tx.run_toxin_channel_finder({"toxin": "CKGKGAKCSRLMYDCCTGSCRSGKC"})
    assert out.get("error") is None
    assert out["identity"]["mode"] == "sequence"
    assert out["identity"]["cysteine_count"] == 6
    assert out["matched_families"], "sequence should classify to >=1 family"

def test_run_toxin_channel_finder_validation():
    assert tx.run_toxin_channel_finder({"toxin": "x"}).get("error")
    assert tx.run_toxin_channel_finder({"toxin": "ACDEFGHIKLMNPQRSTVWYACDEFGHIKB"}).get("error")

def test_run_toxin_channel_finder_offline_degrades(monkeypatch):
    def boom(*a, **k):
        raise _rag.NetworkUnavailable("offline")

    monkeypatch.setattr(_rag, "search_works", boom)
    out = tx.run_toxin_channel_finder({"toxin": "apamin"})
    assert out.get("error") is None
    assert out["degraded"] is True
    assert out["targets"][0]["channel"] == "SK"

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
