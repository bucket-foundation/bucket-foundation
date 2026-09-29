import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bkt_analyze as ba

FIX = Path(__file__).resolve().parent / "fixtures"


def codes(report, kind="errors"):
    return {e["code"] for e in report[kind]}


@pytest.mark.parametrize("name,fmt", [("monthly.csv", "csv"), ("monthly.tsv", "tsv"), ("yearly.json", "json"), ("small.parquet", "parquet")])
def test_formats_pass(name, fmt):
    form, _ = ba.verify(FIX / name)
    assert form["format"] == fmt
    assert form["ok"], form["errors"]
    assert form["time_index"] is not None


def test_schema_types_and_units():
    form, _ = ba.verify(FIX / "monthly.csv")
    cols = {c["name"]: c for c in form["columns"]}
    assert cols["month"]["type"] == "datetime"
    assert cols["sales (USD)"]["unit"] == "USD"
    assert cols["temp_c"]["unit"] == "degC"
    assert cols["visits"]["type"] == "integer"
    assert cols["region"]["type"] == "string"
    assert form["time_index"] == {"column": "month", "kind": "datetime"}
    assert form["numeric"] == ["sales (USD)", "visits", "temp_c"]


@pytest.mark.parametrize(
    "name,code",
    [("ragged.csv", "E_RAGGED"), ("broken.json", "E_READ"), ("no_numeric.csv", "E_NO_NUMERIC"), ("dup_header.csv", "E_DUP_COLUMN"), ("empty.csv", "E_READ")],
)
def test_malformed_fail(name, code):
    form, _ = ba.verify(FIX / name)
    assert not form["ok"]
    assert code in codes(form)


def test_messy_warnings():
    form, _ = ba.verify(FIX / "messy.csv")
    assert form["ok"]
    assert {"W_MISSING", "W_DUP_ROWS", "W_TIME_DUP"} <= codes(form, "warnings")
    assert form["duplicates"] == 1


def test_hard_error_stops_without_force(tmp_path):
    assert ba.main([str(FIX / "ragged.csv"), "--out", str(tmp_path), "--no-helix"]) == 2
    rep = json.loads(next(tmp_path.glob("*/report.json")).read_text())
    assert "analysis" not in rep
    assert "FAIL" in next(tmp_path.glob("*/report.md")).read_text()


def test_force_runs_past_soft_hard_errors(tmp_path):
    assert ba.main([str(FIX / "ragged.csv"), "--out", str(tmp_path), "--no-helix", "--force"]) == 0
    rep = json.loads(next(tmp_path.glob("*/report.json")).read_text())
    assert rep["analysis"]["summary"]["a"]["n"] == 3


def test_force_cannot_analyze_unreadable(tmp_path):
    assert ba.main([str(FIX / "broken.json"), "--out", str(tmp_path), "--force"]) == 2


def test_full_suite(tmp_path):
    assert ba.main([str(FIX / "monthly.csv"), "--out", str(tmp_path), "--no-helix", "--date", "2026-01-02"]) == 0
    d = tmp_path / "monthly-2026-01-02"
    rep = json.loads((d / "report.json").read_text())
    a = rep["analysis"]
    assert a["summary"]["visits"]["min"] == 200
    assert a["correlations"]["top_pairs"][0]["a"] == "sales (USD)"
    assert a["correlations"]["top_pairs"][0]["pearson"] > 0.8
    assert a["pca"]["orthogonality_error"] < 1e-9
    assert abs(sum(c["variance_ratio"] for c in a["pca"]["components"]) - 1) < 1e-9
    assert a["trends"]["visits"]["direction"] == "up"
    assert a["trends"]["temp_c"]["season"]["lag"] == 12
    assert any(r["row"] == 20 for r in a["trends"]["sales (USD)"]["residuals"]["largest"][:2])
    md = (d / "report.md").read_text()
    for h in ("## Form", "## Summary", "## Distributions", "## Correlations", "## Prime Directions", "## Trend and Seasonality", "## Outliers", "## Residuals", "## Helix"):
        assert h in md


def test_same_day_runs_get_new_dirs(tmp_path):
    for _ in range(2):
        ba.main([str(FIX / "yearly.json"), "--out", str(tmp_path), "--no-helix", "--date", "2026-01-02"])
    assert sorted(p.name for p in tmp_path.iterdir()) == ["yearly-2026-01-02", "yearly-2026-01-02-2"]


def test_outliers_flag_spike():
    x = np.array([1.0, 2, 3, 2, 1, 2, 3, 50])
    o = ba.outliers(x)
    assert o["iqr_rows"] == [7]


def test_helix_doc_shape():
    form, values = ba.verify(FIX / "yearly.json")
    doc, why = ba.helix_doc(form, values, "Yearly", "2026-01-02")
    assert why == ""
    assert doc["time_unit"] == "year"
    assert doc["primes"] == ["a", "b", "c"]
    assert len(doc["rows"]) == 30


def test_helix_skips_without_time():
    form, values = ba.verify(FIX / "ragged.csv")
    doc, why = ba.helix_doc(form, values, "r", "2026-01-02")
    assert doc is None and "time" in why


@pytest.mark.skipif(not (ba.HELIX_DIR / "helix/__main__.py").is_file(), reason="helix not in tree")
def test_helix_runs(tmp_path):
    pytest.importorskip("matplotlib")
    assert ba.main([str(FIX / "yearly.json"), "--out", str(tmp_path)]) == 0
    rep = json.loads(next(tmp_path.glob("*/report.json")).read_text())
    assert rep["helix"]["status"] == "ok", rep["helix"]
    assert "manifest.json" in rep["helix"]["files"]
