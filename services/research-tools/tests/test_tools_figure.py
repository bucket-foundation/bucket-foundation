"""No-network unit tests for FigureMiner (tools_figure).

Verifies the ACTUAL text mining on a known mini-paper string:
  * caption extraction finds the Figure/Table blocks;
  * the stats miner extracts p-values, n=, fold-changes, R²/r, mean±spread;
  * the measurement miner extracts unit-bearing numbers (µM, kDa, kPa, ms);
  * per-figure linkage attributes stats to the right figure.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_figure.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_figure as fm  # noqa: E402


SAMPLE = (
    "Figure 1. Knockdown reduced expression (n = 12, p < 0.001). "
    "Binding affinity was 4.2 µM and the protein ran at 55 kDa.\n\n"
    "Figure 2. Modulus increased 3-fold to 12.5 kPa (R^2 = 0.98, r = 0.91). "
    "Mean lifetime 8.3 ± 1.2 ms across n = 30 events.\n\n"
    "Table 1. Summary statistics (95% CI reported)."
)


def test_mine_captions():
    caps = fm.mine_captions(SAMPLE)
    kinds = [(c["kind"], c["number"]) for c in caps]
    assert ("Figure", "1") in kinds
    assert ("Figure", "2") in kinds
    assert ("Table", "1") in kinds


def test_mine_stats_real_values():
    s = fm.mine_stats(SAMPLE)
    # one explicit p-value (p < 0.001)
    assert s["counts"]["p_values"] == 1
    assert s["p_values"][0]["value"] == "0.001"
    # two n= (12 and 30)
    assert sorted(s["sample_sizes"]) == [12, 30]
    # one fold-change (3-fold)
    assert 3.0 in s["fold_changes"]
    # R^2 and r
    assert 0.98 in s["r_squared"]
    assert 0.91 in s["correlations_r"]
    # mean ± spread (8.3 ± 1.2)
    assert any(abs(p["mean"] - 8.3) < 1e-9 and abs(p["spread"] - 1.2) < 1e-9 for p in s["mean_pm_spread"])


def test_mine_measurements_units():
    m = fm.mine_measurements(SAMPLE)
    units = m["by_unit"]
    assert units.get("µM") == 1
    assert units.get("kDa") == 1
    assert units.get("kPa") == 1
    assert units.get("ms") == 1


def test_per_figure_linkage():
    out = fm.run_figure_miner({"text": SAMPLE})
    pf = {row["figure"]: row for row in out["per_figure"]}
    # Figure 1's caption contains the p-value + n=12
    assert "Figure 1" in pf
    assert 12 in pf["Figure 1"]["sample_sizes"]
    # Figure 2's caption contains the fold-change + kPa measurement
    assert "Figure 2" in pf


def test_run_demo_ground_truth():
    out = fm.run_figure_miner({"text": "demo"})
    assert out["demo"] is True
    assert "ground_truth" in out
    gt = out["ground_truth"]
    assert out["n_figures"] + out["n_tables"] == gt["figures"]
    assert out["stats"]["counts"]["p_values"] == gt["p_values"]
    assert sorted(out["stats"]["sample_sizes"]) == [12, 30]


def test_run_validation():
    assert fm.run_figure_miner({"text": "tiny"}).get("error")
    assert fm.run_figure_miner({}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
