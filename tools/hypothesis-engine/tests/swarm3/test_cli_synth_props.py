"""Round three of the property swarm (`bkt-hte-test-swarm`), `hte/
cli_synth.py` (24.1% covered per `tests/COVERAGE.md`, the least-covered
file in this package, uncovered lines 51-59, 64-65, 72-82, 84-89, 93, 150,
189-192, 202-206, 214-223, 227-234, 238-239, 241, 245-248, 250-254,
258-261, 265, 277-280, 282-283, 287-291, 293-299, 308-314, 318-319,
323-324, 326-331, 333-338, 340, 344-346, 350).

Every real campaign this file runs is in fake mode
(`tests/swarm3/conftest.py`'s own autouse `fake_llm_mode` fixture) and
never spawns a subprocess (that file's autouse `no_real_subprocess`
fixture); `hte-synth run`/`sweep` have no CLI flag of their own to shrink
`hte.synth.SMALL_WORLD_KWARGS` or `_campaign_config`'s fixed generation
settings, so every one-seed campaign below costs its own real ~1-2s
(measured empirically, `hte.cli_synth.run_one_seed` against
`SMALL_WORLD_KWARGS`), kept to the minimum seed/value count each
assertion needs.

Two defects turned up while writing this file's own coverage
sweep, both filed in `tests/swarm/FINDINGS-2026-09-10.md` (Round three
section) and pinned
below with `pytest.mark.xfail(strict=True, ...)`: a malformed `--seeds`
spec and an unregistered `--param` name both propagate a raw
`ValueError`/`TypeError` out of `main()` instead of the clean
`SystemExit(2)` + usage message every other bad-input path in this
package's own CLIs (`hte/cli.py`'s `--corpus` choices, say) gives.
"""
from __future__ import annotations

import json
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest

from hte import cli_synth


# ---------------------------------------------------------------------------
# `_parse_seed_range` / `_parse_values`: pure functions, every documented
# form plus the malformed inputs that raise (the low-level parser's own
# `ValueError` is expected and correct here; FINDING-2026-09-10-201 below
# is that `main()` does not catch it and turn it into a clean exit(2)).
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("spec,expected", [
    ("0-4", [0, 1, 2, 3, 4]),
    ("0,3,7", [0, 3, 7]),
    ("5", [5]),
    ("0-4,10,12-14", [0, 1, 2, 3, 4, 10, 12, 13, 14]),
    ("3-0", [3, 2, 1, 0]),          # reversed range, descending step
    ("0,0,1,1,0", [0, 1]),          # duplicates dropped, first-seen order kept
    (" 2 , 4 ", [2, 4]),            # whitespace around comma-separated parts stripped
])
def test_parse_seed_range_every_documented_form(spec, expected):
    assert cli_synth._parse_seed_range(spec) == expected


@pytest.mark.parametrize("spec", ["abc", "1-", "-", "1-2-3", "1.5", "1, x"])
def test_parse_seed_range_malformed_spec_raises_value_error(spec):
    """`_parse_seed_range` itself has no usage-message contract of its
    own: it is an internal helper below the argparse entry point, and a
    malformed spec raises `ValueError` here as expected. The defect this
    round files sits one layer up: `main()` never catches it
    (`test_finding_2026_09_10_201...` below)."""
    with pytest.raises(ValueError):
        cli_synth._parse_seed_range(spec)


def test_parse_values_every_documented_form():
    assert cli_synth._parse_values("0,0.1,0.2,0.4") == [0.0, 0.1, 0.2, 0.4]
    assert cli_synth._parse_values("5") == [5.0]
    assert cli_synth._parse_values(" -1.5 , 2 ") == [-1.5, 2.0]


def test_parse_values_malformed_spec_raises_value_error():
    with pytest.raises(ValueError):
        cli_synth._parse_values("not-a-number")


# ---------------------------------------------------------------------------
# `run`: every documented `--seeds` form through the argparse entry point,
# SUMMARY.json/.md agreement, min-coverage/max-brier gates, byte-identical
# reruns.
# ---------------------------------------------------------------------------


def _assert_summary_json_and_md_agree(summary: dict, md_text: str) -> None:
    """Every number `_write_summary_md` interpolates from `summary`
    appears, formatted the identical way, in the rendered Markdown:
    `elapsed_s` is rounded to two decimals in the per-seed table
    (`f"{...:.2f}"`), every other field is `str()`-formatted with no
    rounding, matching `_write_summary_md`'s own f-strings exactly."""
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
    assert rc in (0, 1)  # the default gate may or may not pass; only seed handling is under test here

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
    """Recursively drops `run_dir` (its own path carries a wall-clock
    timestamp) and `elapsed_s` (wall-clock duration): the two fields
    `tests/campaigns/test_random_campaigns.py::
    test_same_seed_twice_gives_identical_summary_entries` already
    excludes from its own "byte-identical" claim, applied here at every
    nesting depth of `SUMMARY.json`'s own dict/list shape."""
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


# ---------------------------------------------------------------------------
# `sweep`: each documented `--param` over two values, table rows == values
# (each row itself aggregating `len(seeds)` seeds).
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# The `if __name__ == "__main__":` guard (line 350): executed in-process
# via `runpy.run_module`, riding the same fast, no-real-campaign malformed
# input `test_finding_2026_09_10_201...` below exercises, rather than
# paying for a real ~2s campaign just to cover one line.
# ---------------------------------------------------------------------------


def test_main_guard_runs_main_and_propagates_its_own_systemexit(monkeypatch, tmp_path):
    """Post-FINDING-2026-09-10-201 fix: a malformed `--seeds` spec exits 2
    through `argparse`'s own `error()`, raising `SystemExit`. `main()`
    propagates that `SystemExit` out through the `if __name__ ==
    "__main__":` guard exactly as it would any other `argparse` usage
    error."""
    monkeypatch.setattr(sys, "argv", ["hte-synth", "run", "--seeds", "not-a-range", "--out", str(tmp_path)])
    with pytest.raises(SystemExit) as exc_info:
        runpy.run_module("hte.cli_synth", run_name="__main__")
    assert exc_info.value.code == 2


# ---------------------------------------------------------------------------
# FINDING-2026-09-10-201 / -202 (`tests/swarm/FINDINGS-2026-09-10.md`,
# Round three section, both RESOLVED):
# a malformed --seeds spec or an unregistered --param name exits 2 with a
# usage message, the same contract every other bad-CLI-input path in this
# package follows (`hte/cli.py`'s own `--corpus` choices), rather than
# raising a raw ValueError/TypeError out of main(). `_cmd_run`/`_cmd_sweep`
# now catch `_parse_seed_range`'s own `ValueError` and call the owning
# subparser's `error()` (threaded in via `set_defaults(parser=...)` in
# `build_parser`, so the usage line names the right subcommand); `_cmd_
# sweep` validates `--param` against `_make_world_param_names()` (`hte.
# synth.make_world`'s live keyword-argument list) before ever reaching
# `run_one_seed`.
# ---------------------------------------------------------------------------


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
    assert "noise" in err  # a registered param name, named in the usage message
