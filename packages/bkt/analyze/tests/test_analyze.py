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


def test_rank_ties_average():
    assert ba.rank(np.array([3.0, 1, 3, 2])).tolist() == [2.5, 0, 2.5, 1]


def test_rank_scales():
    x = np.random.default_rng(0).integers(0, 1000, 200_000).astype(float)
    r = ba.rank(x)
    assert r.min() >= 0 and r.max() <= len(x) - 1


def test_underscore_numbers_rejected():
    assert ba.parse_number("1_000") is None
    assert ba.parse_number("1,000") == 1000


def test_non_utf8(tmp_path):
    p = tmp_path / "latin.csv"
    p.write_bytes("a,b\n1,caf\xe9\n".encode("latin-1"))
    form, _ = ba.verify(p)
    assert not form["ok"] and "not UTF-8" in form["errors"][0]["message"]


def test_quoted_newlines(tmp_path):
    p = tmp_path / "q.csv"
    p.write_text('id,note,v\n1,"two\nlines",3\n2,"x",4\n')
    form, values = ba.verify(p)
    assert form["ok"] and form["rows"] == 2
    assert values["note"][0] == "two\nlines"


def test_max_rows_cap(tmp_path):
    p = tmp_path / "big.csv"
    p.write_text("v,w\n" + "".join(f"{i},{i * 2}\n" for i in range(5000)))
    form, values = ba.verify(p, max_rows=100)
    assert form["rows"] == 100 and form["truncated"]
    assert "W_TRUNCATED" in codes(form, "warnings")


def test_season_needs_regular_index_and_bound():
    t = np.arange(48, dtype=float)
    y = np.sin(2 * np.pi * t / 12)
    assert ba.trend_season(t, y)["season"]["lag"] == 12
    jitter = t.copy()
    jitter[5] += 0.6
    assert ba.trend_season(jitter, y)["season"] is None
    weak = 0.05 * np.sin(2 * np.pi * t / 12) + np.where(t % 2 == 0, 1.0, -1.0)
    s = ba.trend_season(t, weak)["season"]
    assert s is None or s["lag"] == 2
    short = np.arange(20, dtype=float)
    assert ba.trend_season(short, np.sin(2 * np.pi * short / 12))["season"] is None


def test_listwise_warning(tmp_path):
    p = tmp_path / "sparse.csv"
    p.write_text("a,b\n" + "".join(f"{i},{'' if i % 2 else i}\n" for i in range(20)))
    form, values = ba.verify(p)
    a = ba.analyze(form, values)
    assert any(w["code"] == "W_LISTWISE" for w in a["warnings"])


def test_report_dirs_private(tmp_path):
    root = tmp_path / "r"
    ba.main([str(FIX / "yearly.json"), "--out", str(root), "--no-helix"])
    assert root.stat().st_mode & 0o777 == 0o700
    assert next(root.iterdir()).stat().st_mode & 0o777 == 0o700
