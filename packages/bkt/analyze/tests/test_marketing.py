import io
import json
import os
import subprocess
import sys
import zipfile
from fractions import Fraction
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bkt_analyze as ba
from marketing import run
from marketing.adapters import detect
from marketing.metrics import anomalies, ratio
from marketing.parse import money_column, parse_day
from marketing.readers import ReadError, read_pdf, read_xlsx
from marketing.report import esc, markdown

FIX = Path(__file__).resolve().parent / "fixtures" / "marketing"
EXPECTED = FIX / "expected"
BOUNDED = Path(__file__).resolve().parents[1] / "marketing" / "bounded.py"
PLATFORMS = {
    "meta_ads.csv": "meta_ads", "google_ads.csv": "google_ads", "google_ads_utf16.tsv": "google_ads", "ga4.csv": "ga4",
    "shopify_orders.csv": "shopify", "stripe_payments.csv": "stripe", "hubspot_deals.csv": "hubspot", "meta_ads.xlsx": "meta_ads",
    "channel_report.pdf": "generic", "generic_eu.csv": "generic",
}


def section(*names, max_rows=ba.MAX_ROWS):
    tables = []
    for n in names:
        form, values = ba.verify(FIX / n, max_rows)
        assert values, form["errors"]
        tables.append((n, values))
    return run(tables, ba.trend_season)


def digest(m):
    def r(v):
        if isinstance(v, float):
            return round(v, 6)
        if isinstance(v, dict):
            return {k: r(x) for k, x in v.items()}
        if isinstance(v, list):
            return [r(x) for x in v]
        return v

    out = {"platforms": [s["platform"] for s in m["sources"]], "warnings": sorted(w["code"] for w in m["warnings"]), "currencies": {}}
    for cur, c in m["by_currency"].items():
        out["currencies"][cur] = r({"funnel": c["funnel"], "orders": c["orders"], "blended": c["blended"], "channels": sorted(c["channels"]),
                                    "cohorts": len(c["cohorts"].get("rows", [])), "series": sorted(c["series"])})
    return out


@pytest.mark.parametrize("name,platform", sorted(PLATFORMS.items()))
def test_adapter_detects_and_matches_expected(name, platform):
    m = section(name)
    assert m["sources"][0]["platform"] == platform
    got = digest(m)
    want_file = EXPECTED / f"{name}.json"
    if os.environ.get("UPDATE_EXPECTED"):
        EXPECTED.mkdir(exist_ok=True)
        want_file.write_text(json.dumps(got, indent=2, sort_keys=True) + "\n")
    assert got == json.loads(want_file.read_text())


def test_meta_and_shopify_join_gives_cac_roas_ltv():
    m = section("meta_ads.csv", "shopify_orders.csv")
    b = m["by_currency"]["USD"]["blended"]
    assert b["cac"] and b["cac"] > 0
    assert b["roas"] and b["roas"] > 0
    assert b["ltv_hist"] and b["ltv_hist"] > 0
    assert b["range"][0] <= b["range"][1]
    assert b["cac"] == pytest.approx(b["spend"] / b["new_customers"])


def test_single_file_cac_is_null_with_reason():
    b = section("meta_ads.csv")["by_currency"]["USD"]["blended"]
    assert b["cac"] is None and "transaction file" in b["reason"]


def test_fraction_differential_matches_float_metrics():
    m = section("meta_ads.csv", "google_ads.csv")
    form_a, va = ba.verify(FIX / "meta_ads.csv")
    form_b, vb = ba.verify(FIX / "google_ads.csv")
    spend = Fraction(0)
    clicks = Fraction(0)
    impressions = Fraction(0)
    for v in va["Amount spent (USD)"]:
        spend += Fraction(v)
    for v in vb["Cost"]:
        if not v.startswith("0") or v != "0":
            spend += Fraction(v.replace(",", ""))
    for v in va["Link clicks"] + vb["Clicks"]:
        clicks += Fraction(v.replace(",", ""))
    for v in va["Impressions"] + vb["Impr."]:
        impressions += Fraction(v.replace(",", ""))
    f = m["by_currency"]["USD"]["funnel"]
    assert f["ctr"] == pytest.approx(float(clicks / impressions), rel=1e-9)
    assert f["cpc"] == pytest.approx(float(spend / clicks), rel=1e-9)


def test_ratio_is_null_exactly_when_denominator_is_zero():
    assert ratio(1.0, 0.0) is None
    assert ratio(None, 2.0) is None
    assert ratio(0.0, 2.0) == 0.0


def test_cohort_retention_bounds_and_mix_sums_to_one():
    c = section("meta_ads.csv", "google_ads.csv", "shopify_orders.csv")["by_currency"]["USD"]
    for row in c["cohorts"]["rows"]:
        assert row["retention"][0] == 1.0
        assert all(x is None or 0.0 <= x <= 1.0 for x in row["retention"])
    assert sum(v["share"] for v in c["channels"].values()) == pytest.approx(1.0, abs=1e-9)


def test_attribution_conserves_revenue():
    a = section("shopify_orders.csv")["by_currency"]["USD"]["attribution"]
    assert sum(a["last_touch"].values()) == pytest.approx(a["revenue"], rel=1e-9)
    assert sum(a["linear"].values()) == pytest.approx(a["revenue"], rel=1e-9)
    assert "heuristic" in a["model"]


def test_anomaly_flags_injected_spike_only():
    rng = np.random.default_rng(1)
    y = 100 + rng.normal(0, 5, 60)
    y[41] = 400
    days = [f"2026-01-{i:02d}" for i in range(60)]
    hits = anomalies(days, y)["days"]
    assert [h["date"] for h in hits] == ["2026-01-41"]
    assert "skipped" in anomalies(days, np.full(60, 50.0))
    meta = section("meta_ads.csv")["by_currency"]["USD"]["series"]["spend"]["anomalies"]["days"]
    assert [d["date"] for d in meta] == ["2026-02-11"]


def test_monthly_data_keeps_its_grain():
    tables = [("m.csv", {"month": [f"2025-{m:02d}-01" for m in range(1, 13)], "spend": [str(100 + m) for m in range(12)], "clicks": [str(10 * m) for m in range(12)]})]
    s = run(tables, ba.trend_season)["by_currency"]["unknown"]["series"]["spend"]
    assert s["step"] == "month" and s["periods"] == 12 and s["zero_filled"] == 0
    assert s["trend"]["slope"] == pytest.approx(1.0)


def test_season_finds_weekly_cycle_in_ga4_sessions():
    s = section("ga4.csv")["by_currency"]["unknown"]["series"]["sessions"]
    assert s["season"]["lag"] == 7
    assert s["weekday"]["sat"] > s["weekday"]["wed"]


def test_eu_numbers_utf16_and_offsets():
    col, _, warn = money_column(["1.234,50", "2.000,00", "15,25"])
    assert col == [1234.5, 2000.0, 15.25] and warn is None
    col, cur, _ = money_column(["$1,234.50", "(12.00)", "USD 3"])
    assert col == [1234.5, -12.0, 3.0] and cur == "USD"
    assert money_column(["abc", "1.2.3,4,5"])[2] == "W_NUMBER_FORMAT"
    assert parse_day("2026-01-01 23:30:00 -0500") == "2026-01-02"
    assert parse_day("Jan 5, 2026") == "2026-01-05"
    assert parse_day("20260105") == "2026-01-05"
    eu = section("generic_eu.csv")["by_currency"]["unknown"]["funnel"]
    assert eu["spend"] == pytest.approx(sum(1000 + i * 37.5 for i in range(21)))
    form, _ = ba.verify(FIX / "google_ads_utf16.tsv")
    assert form["format"] == "tsv" and form["rows"] == 40


def test_preamble_and_footer_rows():
    form, _ = ba.verify(FIX / "google_ads.csv")
    assert "W_PREAMBLE" in {w["code"] for w in form["warnings"]}
    assert "W_FOOTER_ROWS" in {w["code"] for w in section("google_ads.csv")["warnings"]}
    form, _ = ba.verify(FIX / "ga4.csv")
    assert form["columns"][0]["name"] == "Date"


def test_shopify_line_items_and_statuses():
    m = section("shopify_orders.csv")
    o = m["by_currency"]["USD"]["orders"]
    rows = list(__import__("csv").reader(open(FIX / "shopify_orders.csv")))[1:]
    paid = {r[0] for r in rows if r[2] in ("paid", "partially_refunded")}
    assert o["count"] == len(paid)
    assert "W_STATUS_EXCLUDED" in {w["code"] for w in m["warnings"]}


def test_row_cap_truncates_while_reading():
    form, values = ba.verify(FIX / "meta_ads.csv", max_rows=10)
    assert form["rows"] == 10 and form["truncated"]


def test_xlsx_reads_cached_values_and_never_runs_formulas():
    header, body, warns, _ = read_xlsx(FIX / "meta_ads.xlsx", 1000)
    assert header[0] == "Campaign name"
    last = body[-1]
    assert last[0] == "Formula Check"
    assert last[1] == "2026-01-30"
    assert last[2] == 12.5
    assert last[3] is None
    assert last[4].startswith("=HYPERLINK")
    assert {w["code"] for w in warns} == {"W_FORMULA_UNCACHED"}
    assert body[0][1] == "2026-01-01"


def zip_with(parts: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for k, v in parts.items():
            zf.writestr(k, v)
    return buf.getvalue()


def base_parts() -> dict[str, bytes]:
    with zipfile.ZipFile(FIX / "meta_ads.xlsx") as zf:
        return {n: zf.read(n) for n in zf.namelist()}


@pytest.mark.parametrize(
    "mutate,code",
    [
        (lambda p: {**p, "xl/vbaProject.bin": b"x"}, "E_XLSX_MACRO"),
        (lambda p: {**p, "xl/worksheets/sheet1.xml": b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]><worksheet/>'}, "E_XLSX_DOCTYPE"),
        (lambda p: {**p, "xl/worksheets/sheet1.xml": b"<worksheet>" + b" " * (70 << 20) + b"</worksheet>"}, "E_XLSX_TOO_LARGE"),
        (lambda p: {k: v for k, v in p.items() if k != "[Content_Types].xml"}, "E_XLSX_TYPE"),
        (lambda p: {**p, "xl/worksheets/sheet1.xml": '<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE x [<!ENTITY a "a">]><worksheet/>'.encode("utf-16")}, "E_XLSX_ENCODING"),
        (lambda p: {**{f"pad/{i}": b"" for i in range(2001)}, **p}, "E_XLSX_TOO_LARGE"),
    ],
)
def test_hostile_workbooks_refused(tmp_path, mutate, code):
    f = tmp_path / "bad.xlsx"
    f.write_bytes(zip_with(mutate(base_parts())))
    with pytest.raises(ReadError) as e:
        read_xlsx(f, 100)
    assert e.value.code == code


def test_wrong_magic_refused(tmp_path):
    for ext, body in ((".xlsx", b"a,b\n1,2\n"), (".pdf", b"a,b\n1,2\n"), (".parquet", b"a,b\n1,2\n"), (".csv", b"a,b\x00\x00\x00\n")):
        f = tmp_path / f"x{ext}"
        f.write_bytes(body)
        form, _ = ba.verify(f)
        assert not form["ok"]
        assert any("E_MAGIC" in e["message"] or "E_" in e["message"] for e in form["errors"]), (ext, form["errors"])


def test_pdf_table_parses():
    header, body, warns, _ = read_pdf(FIX / "channel_report.pdf", 1000)
    assert header == ["Date", "Channel", "Spend", "Clicks", "Conversions"]
    assert len(body) == 28
    assert body[0] == ["2026-01-01", "Paid Search", "120.00", "360", "6"]
    assert "W_PDF_EXTRACTED" in {w["code"] for w in warns}


def test_pdf_without_table_refused(tmp_path):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from make_marketing_fixtures import write_pdf

    f = tmp_path / "prose.pdf"
    write_pdf(f, ["one line of prose", "another line"])
    with pytest.raises(ReadError) as e:
        read_pdf(f, 10)
    assert e.value.code == "E_PDF_NO_TABLE"


def test_markdown_escapes_user_values():
    assert esc("<script>alert(1)</script>") == "\\<script\\>alert(1)\\</script\\>"
    assert esc("a|b") == "a\\|b"
    tables = [("x.csv", {"date": ["2026-01-01", "2026-01-02"], "campaign": ["<script>alert(1)</script>", "=HYPERLINK(\"x\")"],
                         "channel": ["a|b", "c"], "spend": ["1", "2"], "clicks": ["3", "4"]})]
    md = "\n".join(markdown(run(tables, ba.trend_season)))
    assert "<script>" not in md
    assert "a\\|b" in md


def test_quiet_errors_emit_code_only(tmp_path, capsys, monkeypatch):
    f = tmp_path / "secret.csv"
    f.write_text("date,spend,clicks\n2026-01-01,1,2\n")

    def boom(*a, **k):
        raise RuntimeError("MARKER-VALUE-123")

    monkeypatch.setattr(ba, "verify", boom)
    code = ba.main([str(f), "--out", str(tmp_path), "--quiet-errors"])
    out = capsys.readouterr()
    assert code == 4
    assert "MARKER" not in out.out + out.err
    assert json.loads(out.out)["error"] == "E_INTERNAL"


def test_marketing_off_and_on_flags(tmp_path):
    assert ba.main([str(FIX / "meta_ads.csv"), "--out", str(tmp_path / "a"), "--no-helix", "--marketing", "off"]) == 0
    rep = json.loads(next((tmp_path / "a").glob("*/report.json")).read_text())
    assert "marketing" not in rep
    code = ba.main([str(FIX.parent / "yearly.json"), "--out", str(tmp_path / "b"), "--no-helix", "--marketing", "on"])
    rep = json.loads(next((tmp_path / "b").glob("*/report.json")).read_text())
    assert code == 0
    assert rep["marketing"]["warnings"][0]["code"] == "E_NO_MARKETING"


def test_multi_file_report_and_markdown(tmp_path):
    assert ba.main([str(FIX / "meta_ads.csv"), str(FIX / "shopify_orders.csv"), "--out", str(tmp_path), "--no-helix"]) == 0
    d = next(tmp_path.glob("*"))
    rep = json.loads((d / "report.json").read_text())
    assert [s["platform"] for s in rep["marketing"]["sources"]] == ["meta_ads", "shopify"]
    assert rep["marketing"]["files"][0]["format"] == "csv"
    md = (d / "report.md").read_text()
    assert "## Marketing" in md and "[bm:BucketMath.Marketing.cpa_mul]" in md


def test_too_many_files_refused(tmp_path):
    with pytest.raises(SystemExit):
        ba.main([str(FIX / "meta_ads.csv")] * 9 + ["--out", str(tmp_path)])


@pytest.mark.parametrize("name", ["meta_ads.xlsx", "channel_report.pdf", "../small.parquet", "meta_ads.csv"])
def test_bounded_runner_handles_every_format(tmp_path, name):
    p = subprocess.run([sys.executable, str(BOUNDED), str(FIX / name), "--no-helix", "--marketing", "auto", "--out", str(tmp_path)],
                       capture_output=True, text=True, timeout=120)
    assert p.returncode in (0, 2), p.stdout[-500:]
    rep = json.loads(p.stdout.strip().splitlines()[-1])
    assert "error" not in rep
    assert rep["form"]["format"] in ("xlsx", "pdf", "parquet", "csv")


def test_detect_scores_prefer_specific_adapter():
    a, mapping, _ = detect(["Campaign", "Day", "Cost", "Impr.", "Clicks", "Conversions", "Conv. value"])
    assert a.platform == "google_ads" and mapping["impressions"] == "Impr."
    a, _, _ = detect(["foo", "bar"])
    assert a is None


def test_fft_acf_matches_direct_sum():
    x = np.random.default_rng(3).normal(size=301)
    d = x - x.mean()
    direct = [float((d[:-k] * d[k:]).sum() / (d**2).sum()) for k in range(1, 151)]
    assert np.allclose(ba.acf(x, 150), direct, atol=1e-12)
