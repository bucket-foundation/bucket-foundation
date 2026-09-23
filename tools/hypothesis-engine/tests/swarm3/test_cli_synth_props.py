from __future__ import annotations

import json
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest

from hte import cli_synth

@pytest.mark.parametrize("spec,expected", [
    ("0-4", [0, 1, 2, 3, 4]),
    ("0,3,7", [0, 3, 7]),
    ("5", [5]),
    ("0-4,10,12-14", [0, 1, 2, 3, 4, 10, 12, 13, 14]),
    ("3-0", [3, 2, 1, 0]),
    ("0,0,1,1,0", [0, 1]),
    (" 2 , 4 ", [2, 4]),
])
def test_parse_seed_range_every_documented_form(spec, expected):
    assert cli_synth._parse_seed_range(spec) == expected

@pytest.mark.parametrize("spec", ["abc", "1-", "-", "1-2-3", "1.5", "1, x"])
def test_parse_seed_range_malformed_spec_raises_value_error(spec):
    with pytest.raises(ValueError):
        cli_synth._parse_seed_range(spec)

def test_parse_values_every_documented_form():
    assert cli_synth._parse_values("0,0.1,0.2,0.4") == [0.0, 0.1, 0.2, 0.4]
    assert cli_synth._parse_values("5") == [5.0]
    assert cli_synth._parse_values(" -1.5 , 2 ") == [-1.5, 2.0]

def test_parse_values_malformed_spec_raises_value_error():
    with pytest.raises(ValueError):
        cli_synth._parse_values("not-a-number")

def _assert_summary_json_and_md_agree(summary: dict, md_text: str) -> None:
    for row in summary["per_seed"]:
        for key in ("seed", "n_survivors", "coverage_of_truth", "brier_true_only", "exotic_false_positive_rate"):
            assert str(row[key]) in md_text, f"SUMMARY.md missing {key}={row[key]!r} for seed {row['seed']}"
        assert f"{row['elapsed_s']:.2f}" in md_text
    for key in ("coverage_of_truth", "brier_true_only", "exotic_false_positive_rate"):
        agg = summary["aggregate"][key]
        assert f"mean={agg['mean']}" in md_text
        assert f"median={agg['median']}" in md_text
        assert f"min={agg['min']}" in md_text
        assert f"max={agg['max']}" in md_text
    assert f"min_coverage={summary['min_coverage']}" in md_text
    assert f"max_brier={summary['max_brier']}" in md_text

@pytest.mark.parametrize("spec,expected_seeds", [
    ("0", [0]),
    ("0-1", [0, 1]),
    ("1,0", [1, 0]),
])
def test_run_over_seed_ranges_every_documented_form(tmp_path, spec, expected_seeds):
    out_dir = tmp_path / spec.replace(",", "_")
    rc = cli_synth.main(["run", "--seeds", spec, "--out", str(out_dir)])
    assert rc in (0, 1)

    summary = json.loads((out_dir / "SUMMARY.json").read_text())
    assert summary["seeds"] == expected_seeds
    assert [row["seed"] for row in summary["per_seed"]] == expected_seeds

    md_text = (out_dir / "SUMMARY.md").read_text()
    _assert_summary_json_and_md_agree(summary, md_text)

def test_run_min_coverage_gate_failure_names_coverage_of_truth(tmp_path, capsys):
    rc = cli_synth.main([
        "run", "--seeds", "0", "--out", str(tmp_path),
        "--min-coverage", "2.0", "--max-brier", "1000.0",
    ])
    assert rc == 1
    out = capsys.readouterr().out
    assert "-> FAIL" in out
    assert "min_coverage=2.0" in out
    assert "coverage_of_truth mean=" in out

def test_run_max_brier_gate_failure_names_brier_true_only(tmp_path, capsys):
    rc = cli_synth.main([
        "run", "--seeds", "0", "--out", str(tmp_path),
        "--min-coverage", "-1.0", "--max-brier", "-1.0",
    ])
    assert rc == 1
    out = capsys.readouterr().out
    assert "-> FAIL" in out
    assert "max_brier=-1.0" in out
    assert "brier_true_only mean=" in out

def _strip_nondeterministic(obj):
    if isinstance(obj, dict):
        return {k: _strip_nondeterministic(v) for k, v in obj.items() if k not in ("run_dir", "elapsed_s")}
    if isinstance(obj, list):
        return [_strip_nondeterministic(v) for v in obj]
    return obj

def test_run_rerun_with_the_same_seeds_is_byte_identical(tmp_path):
    rc_a = cli_synth.main(["run", "--seeds", "0", "--out", str(tmp_path / "a")])
    rc_b = cli_synth.main(["run", "--seeds", "0", "--out", str(tmp_path / "b")])
    assert rc_a == rc_b

    summary_a = json.loads((tmp_path / "a" / "SUMMARY.json").read_text())
    summary_b = json.loads((tmp_path / "b" / "SUMMARY.json").read_text())
    assert _strip_nondeterministic(summary_a) == _strip_nondeterministic(summary_b)

@pytest.mark.parametrize("param,values", [("noise", "0.1,0.3"), ("exotic_rate", "0.0,0.1")])
def test_sweep_table_has_one_row_per_value_each_aggregating_every_seed(tmp_path, param, values):
    out_dir = tmp_path / param
    rc = cli_synth.main(["sweep", "--param", param, "--values", values, "--seeds", "0", "--out", str(out_dir)])
    assert rc == 0

    sweep = json.loads((out_dir / "SWEEP.json").read_text())
    value_list = [float(v) for v in values.split(",")]
    assert sweep["param"] == param
    assert sweep["seeds"] == [0]
    assert len(sweep["table"]) == len(value_list)
    for row, expected_value in zip(sweep["table"], value_list):
        assert row["param"] == param
        assert row["value"] == expected_value
        assert row["n_seeds"] == 1

def test_main_guard_runs_main_and_propagates_its_own_systemexit(monkeypatch, tmp_path):
    monkeypatch.setattr(sys, "argv", ["hte-synth", "run", "--seeds", "not-a-range", "--out", str(tmp_path)])
    with pytest.raises(SystemExit) as exc_info:
        runpy.run_module("hte.cli_synth", run_name="__main__")
    assert exc_info.value.code == 2

@pytest.mark.parametrize("spec", ["abc", "1-", "-", "1-2-3", "-5", ""])
def test_finding_2026_09_10_201_malformed_seeds_should_exit_two_with_usage(tmp_path, spec, capsys):
    with pytest.raises(SystemExit) as exc_info:
        cli_synth.main(["run", "--seeds", spec, "--out", str(tmp_path)])
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert "usage: hte-synth run" in err
    assert "--seeds" in err

def test_finding_2026_09_10_202_unknown_sweep_param_should_exit_two_with_usage(tmp_path, capsys):
    with pytest.raises(SystemExit) as exc_info:
        cli_synth.main([
            "sweep", "--param", "not_a_real_kwarg", "--values", "0,1",
            "--seeds", "0", "--out", str(tmp_path),
        ])
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert "usage: hte-synth sweep" in err
    assert "--param" in err
    assert "noise" in err
