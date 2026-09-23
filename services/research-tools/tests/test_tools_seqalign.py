from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_seqalign as sa  # noqa: E402

def test_identical_global_identity_matrix():
    out = sa.run_seqalign({"seq_a": "ACGT", "seq_b": "ACGT", "matrix": "identity"})
    assert out["score"] == 4
    assert out["percent_identity"] == 100.0
    assert out["gaps"] == 0
    assert out["matches"] == 4
    assert out["aligned_a"] == "ACGT" and out["aligned_b"] == "ACGT"

def test_global_one_gap_known_score():
    out = sa.run_seqalign({
        "seq_a": "GATTACA", "seq_b": "GATACA",
        "matrix": "identity", "match": 1, "mismatch": -1, "gap": -1,
    })
    assert out["score"] == 5
    assert out["matches"] == 6
    assert out["gaps"] == 1
    assert out["alignment_length"] == 7

def test_local_finds_best_substring():
    a = "TTTTCGTACGAAAA"
    b = "GGGGCGTACGCCCC"
    out = sa.run_seqalign({"seq_a": a, "seq_b": b, "mode": "local",
                           "matrix": "identity", "match": 1, "mismatch": -1, "gap": -2})
    assert out["score"] == 6
    assert out["matches"] == 6
    assert out["gaps"] == 0
    assert "CGTACG" in out["aligned_a"].replace("-", "")

def test_blosum62_diagonal_values():
    assert sa.BLOSUM62[("W", "W")] == 11
    assert sa.BLOSUM62[("C", "C")] == 9
    assert sa.BLOSUM62[("A", "A")] == 4
    assert sa.BLOSUM62[("H", "H")] == 8
    assert sa.BLOSUM62[("A", "R")] == -1
    assert sa.BLOSUM62[("F", "Y")] == 3

def test_demo_runs_blosum62_global():
    out = sa.run_seqalign({"seq_a": "demo"})
    assert out["demo"] is True
    assert out["matrix"] == "blosum62"
    assert out["mode"] == "global"
    assert out["aligned_a"].replace("-", "") == "HEAGAWGHEE"
    assert out["aligned_b"].replace("-", "") == "PAWHEAE"

def test_auto_picks_blosum_for_protein():
    out = sa.run_seqalign({"seq_a": "MKWVTFISLL", "seq_b": "MKWVTFISLL", "matrix": "auto"})
    assert out["matrix"] == "blosum62"

def test_auto_picks_identity_for_dna():
    out = sa.run_seqalign({"seq_a": "ACGTACGT", "seq_b": "ACGTACGT", "matrix": "auto"})
    assert out["matrix"] == "identity"

def test_empty_error():
    assert sa.run_seqalign({"seq_a": "", "seq_b": "ACGT"}).get("error")
    assert sa.run_seqalign({"seq_a": "ACGT"}).get("error")

def test_bad_mode_error():
    assert sa.run_seqalign({"seq_a": "ACGT", "seq_b": "ACGT", "mode": "diagonal"}).get("error")

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
