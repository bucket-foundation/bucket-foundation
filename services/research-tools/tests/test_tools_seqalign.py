"""No-network unit tests for SeqAlign (tools_seqalign).

Verifies the ACTUAL Needleman-Wunsch (global) and Smith-Waterman (local)
dynamic-programming algorithms on inputs with KNOWN, hand-computable scores:
  * identical sequences → global score = matches × match_score, 100% identity;
  * a known single-gap NW case with the identity matrix;
  * the SW local maximum equals the best local sub-alignment score;
  * BLOSUM62 lookup returns the published diagonal values;
  * malformed input returns a structured error, never raises.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_seqalign.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_seqalign as sa  # noqa: E402


# =========================================================================
# Load-bearing: exact DP scores on hand-computable cases.
# =========================================================================
def test_identical_global_identity_matrix():
    # ACGT vs ACGT, identity matrix match=+1: every column matches → score 4,
    # 100% identity, no gaps.
    out = sa.run_seqalign({"seq_a": "ACGT", "seq_b": "ACGT", "matrix": "identity"})
    assert out["score"] == 4
    assert out["percent_identity"] == 100.0
    assert out["gaps"] == 0
    assert out["matches"] == 4
    assert out["aligned_a"] == "ACGT" and out["aligned_b"] == "ACGT"


def test_global_one_gap_known_score():
    # NW of "GATTACA" vs "GATACA" (identity, match=+1, mismatch=-1, gap=-1).
    # The optimal alignment inserts one gap to keep 6 matches:
    #   GATTACA
    #   GA-TACA  → 6 matches (+6), 1 gap (-1) = score 5.
    out = sa.run_seqalign({
        "seq_a": "GATTACA", "seq_b": "GATACA",
        "matrix": "identity", "match": 1, "mismatch": -1, "gap": -1,
    })
    assert out["score"] == 5
    assert out["matches"] == 6
    assert out["gaps"] == 1
    # gapped alignment length = 7
    assert out["alignment_length"] == 7


def test_local_finds_best_substring():
    # SW: the best local alignment of a shared core "CGTACG" embedded in noise.
    a = "TTTTCGTACGAAAA"
    b = "GGGGCGTACGCCCC"
    out = sa.run_seqalign({"seq_a": a, "seq_b": b, "mode": "local",
                           "matrix": "identity", "match": 1, "mismatch": -1, "gap": -2})
    # shared core CGTACG = 6 identical residues → local score 6, no gaps in it.
    assert out["score"] == 6
    assert out["matches"] == 6
    assert out["gaps"] == 0
    assert "CGTACG" in out["aligned_a"].replace("-", "")


def test_blosum62_diagonal_values():
    # Published BLOSUM62 self-scores: W=11, C=9, A=4, H=8.
    assert sa.BLOSUM62[("W", "W")] == 11
    assert sa.BLOSUM62[("C", "C")] == 9
    assert sa.BLOSUM62[("A", "A")] == 4
    assert sa.BLOSUM62[("H", "H")] == 8
    # a known off-diagonal: (A,R) = -1, (F,Y) = 3
    assert sa.BLOSUM62[("A", "R")] == -1
    assert sa.BLOSUM62[("F", "Y")] == 3


def test_demo_runs_blosum62_global():
    out = sa.run_seqalign({"seq_a": "demo"})
    assert out["demo"] is True
    assert out["matrix"] == "blosum62"
    assert out["mode"] == "global"
    # the alignment should reconstruct both full sequences (global) with gaps
    assert out["aligned_a"].replace("-", "") == "HEAGAWGHEE"
    assert out["aligned_b"].replace("-", "") == "PAWHEAE"


# =========================================================================
# auto matrix detection + symmetry
# =========================================================================
def test_auto_picks_blosum_for_protein():
    out = sa.run_seqalign({"seq_a": "MKWVTFISLL", "seq_b": "MKWVTFISLL", "matrix": "auto"})
    assert out["matrix"] == "blosum62"


def test_auto_picks_identity_for_dna():
    out = sa.run_seqalign({"seq_a": "ACGTACGT", "seq_b": "ACGTACGT", "matrix": "auto"})
    assert out["matrix"] == "identity"


# =========================================================================
# reliability
# =========================================================================
def test_empty_error():
    assert sa.run_seqalign({"seq_a": "", "seq_b": "ACGT"}).get("error")
    assert sa.run_seqalign({"seq_a": "ACGT"}).get("error")


def test_bad_mode_error():
    assert sa.run_seqalign({"seq_a": "ACGT", "seq_b": "ACGT", "mode": "diagonal"}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
