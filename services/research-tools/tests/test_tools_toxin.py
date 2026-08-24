"""No-network unit tests for ToxinChannelFinder (tools_toxin).

Verifies the ACTUAL toxin->channel mapping logic:
 * a KNOWN toxin name maps to its known channel family (curated KB);
 * a peptide SEQUENCE is classified by cysteine framework / motif;
 * literature co-occurrence over a fixture work set ranks targets + adds
 citeable exemplars;
 * the fusion produces an, ranked target table.

The OpenAlex client (tools_rag.search_works) is monkeypatched to fixtures and
TOOLS_OFFLINE is set, so a real network call would raise, these run offline.

Run: cd services/research-tools && python3 -m pytest tests/test_tools_toxin.py -q
"""
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


# =========================================================================
# Pure classification
# =========================================================================
def test_is_sequence_distinguishes_name_from_peptide():
    assert tx.is_sequence("CKGKGAKCSRLMYDCCTGSCRSGKC") is True  # a real conotoxin-like seq
    assert tx.is_sequence("omega-conotoxin MVIIA") is False
    assert tx.is_sequence("apamin") is False


def test_classify_by_name_known_toxins():
    # omega-conotoxin -> Cav (N-type calcium channel)
    fams = tx.classify_by_name("omega-conotoxin MVIIA")
    assert fams and any("Cav" in [t for t, _ in f["targets"]] for f in fams)
    # apamin -> SK channel
    fams2 = tx.classify_by_name("apamin")
    assert fams2 and ("SK", 0.95) in fams2[0]["targets"]
    # tetrodotoxin -> Nav
    fams3 = tx.classify_by_name("tetrodotoxin (TTX)")
    assert fams3 and ("Nav", 0.97) in fams3[0]["targets"]
    # alpha-bungarotoxin -> nAChR
    fams4 = tx.classify_by_name("alpha-bungarotoxin")
    assert fams4 and ("nAChR", 0.96) in fams4[0]["targets"]


def test_classify_by_sequence_uses_cysteine_framework():
    # an ICK-like 6-Cys peptide should match the ICK toxin families
    seq = "CKGKGAKCSRLMYDCCTGSCRSGKC"  # 6 cysteines
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
    lit = {"Kv": {"count": 1, "exemplars": []}}  # an unrelated literature-only hit
    fused = tx.fuse_targets(kb, lit)
    # the curated Cav target outranks the literature-only Kv hit
    assert fused[0]["channel"] == "Cav"
    assert fused[0]["confidence"] > fused[-1]["confidence"]
    # the literature-only target is flagged
    kv = [r for r in fused if r["channel"] == "Kv"]
    assert kv and kv[0]["basis"] == "literature co-occurrence only"


# =========================================================================
# Full runner against fixtures (no network)
# =========================================================================
def test_run_toxin_channel_finder_known_name(monkeypatch):
    monkeypatch.setattr(_rag, "search_works", lambda *a, **k: list(WORKS_TOXIN_CONOTOXIN))
    out = tx.run_toxin_channel_finder({"toxin": "omega-conotoxin MVIIA"})
    assert out.get("error") is None
    assert out["identity"]["mode"] == "name"
    # the top target is the N-type calcium channel (Cav)
    assert out["targets"][0]["channel"] == "Cav"
    assert out["targets"][0]["confidence"] >= 0.6
    # the matched family is reported + literature exemplars are attached
    assert any(f["family"] == "omega-conotoxin" for f in out["matched_families"])
    assert out["targets"][0]["literature_mentions"] >= 1
    assert out["targets"][0]["exemplars"]


def test_run_toxin_channel_finder_sequence_mode(monkeypatch):
    monkeypatch.setattr(_rag, "search_works", lambda *a, **k: [])
    out = tx.run_toxin_channel_finder({"toxin": "CKGKGAKCSRLMYDCCTGSCRSGKC"})
    assert out.get("error") is None
    assert out["identity"]["mode"] == "sequence"
    assert out["identity"]["cysteine_count"] == 6
    # a 6-Cys ICK peptide yields candidate channel targets from the framework match
    assert out["matched_families"], "sequence should classify to >=1 family"


def test_run_toxin_channel_finder_validation():
    assert tx.run_toxin_channel_finder({"toxin": "x"}).get("error")
    # a long AA-like string in sequence mode with a non-AA char (B) -> error
    assert tx.run_toxin_channel_finder({"toxin": "ACDEFGHIKLMNPQRSTVWYACDEFGHIKB"}).get("error")


def test_run_toxin_channel_finder_offline_degrades(monkeypatch):
    def boom(*a, **k):
        raise _rag.NetworkUnavailable("offline")

    monkeypatch.setattr(_rag, "search_works", boom)
    # a known name still maps via the curated KB even with no literature
    out = tx.run_toxin_channel_finder({"toxin": "apamin"})
    assert out.get("error") is None
    assert out["degraded"] is True
    assert out["targets"][0]["channel"] == "SK"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
