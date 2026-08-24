"""No-network unit tests for the genomics/sequence cluster (tools_genomics).

Verifies the ACTUAL computation on inputs with KNOWN ground truth:
 * ChromatinAccess detects a CpG island + TATA box and scores GC-rich as open;
 * AggregatePredict flags a planted hydrophobic β-prone amyloid hot-spot;
 * ChannelDwell idealizes a synthetic two-state record to the right open prob.

Run: cd services/research-tools && python3 -m pytest tests/test_tools_genomics.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
import pytest  # noqa: E402

import tools_genomics as g  # noqa: E402


# =========================================================================
# ChromatinAccess
# =========================================================================
def test_chromatin_helpers():
    assert abs(g.gc_content("GCGC") - 1.0) < 1e-9
    assert abs(g.gc_content("ATAT") - 0.0) < 1e-9
    motifs = g.promoter_motifs("AAATATAAAAAAA")
    assert motifs["TATA_box"]  # finds the TATA box


def test_chromatin_demo_open():
    out = g.run_chromatin_access({"sequence": "demo"})
    assert out["demo"] is True
    assert out["n_cpg_islands"] >= 1
    assert out["n_promoter_motifs"] >= 1
    assert out["accessibility_score"] >= 0.6
    assert out["call"].startswith("open")


def test_chromatin_closed_low_gc():
    out = g.run_chromatin_access({"sequence": "AT" * 60})
    assert out["demo"] is False
    assert out["gc_content"] < 0.1
    assert out["n_cpg_islands"] == 0
    assert out["accessibility_score"] < 0.35


def test_chromatin_validation():
    assert g.run_chromatin_access({"sequence": "ACGT"}).get("error")


# =========================================================================
# AggregatePredict
# =========================================================================
def test_aggregate_demo_finds_hotspot():
    out = g.run_aggregate_predict({"sequence": "demo"})
    assert out["demo"] is True
    assert out["aggregation_prone"] is True
    assert out["n_hotspots"] >= 1


def test_aggregate_charged_sequence_no_hotspot():
    # a charged, non-hydrophobic sequence should NOT be aggregation-prone
    out = g.run_aggregate_predict({"sequence": "DEKRDEKRDEKRDEKRDEKRDEKR"})
    assert out["demo"] is False
    assert out["n_hotspots"] == 0


def test_aggregate_hydrophobic_beta_is_prone():
    out = g.run_aggregate_predict({"sequence": "VIILVFLVIFVIILVFLVIF"})
    assert out["aggregation_prone"] is True


def test_aggregate_validation():
    assert g.run_aggregate_predict({"sequence": "AAA"}).get("error")
    assert g.run_aggregate_predict({"sequence": "VIILVFLBXZ"}).get("error")


# =========================================================================
# ChannelDwell
# =========================================================================
def test_idealize_two_levels():
    # 1000 samples: half at 0 pA, half at 2 pA → p_open = 0.5
    current = np.concatenate([np.zeros(500), np.full(500, 2.0)])
    ideal = g.idealize_half_amplitude(current)
    assert abs(ideal["open_level"] - 2.0) < 0.5
    assert abs(ideal["closed_level"] - 0.0) < 0.5


def test_channeldwell_demo_recovers_popen():
    out = g.run_channel_dwell({"trace": "demo"})
    assert out["demo"] is True
    assert "ground_truth_p_open" in out
    # idealized p_open should be close to the synthetic Markov ground truth
    assert abs(out["p_open"] - out["ground_truth_p_open"]) < 0.1
    assert out["tau_open_ms"] is not None
    assert out["tau_closed_ms"] is not None


def test_channeldwell_user_trace():
    # alternating 100-sample blocks of closed(0)/open(3) → p_open ~ 0.5
    blocks = []
    for k in range(10):
        blocks.append(np.full(100, 0.0 if k % 2 == 0 else 3.0))
    current = np.concatenate(blocks) + np.random.default_rng(0).normal(0, 0.1, 1000)
    out = g.run_channel_dwell({"trace": list(current), "fs_hz": 10000.0})
    assert out["demo"] is False
    assert abs(out["p_open"] - 0.5) < 0.1


def test_channeldwell_validation():
    assert g.run_channel_dwell({"trace": [1, 2], "fs_hz": 10000}).get("error")
    assert g.run_channel_dwell({"trace": "demo", "fs_hz": 0}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
