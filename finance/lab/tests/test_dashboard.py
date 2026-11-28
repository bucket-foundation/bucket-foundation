import numpy as np
import pandas as pd
import pytest

from lab import dashboard, data


def daily(values, end="2026-11-25"):
    return pd.Series(values, index=pd.bdate_range(end=end, periods=len(values)), dtype=float)


def getter(series):
    def get(name):
        if name not in series:
            raise dashboard.Missing(f"{name} not in lab files")
        return series[name]
    return get


def one(label, series, today="2026-11-27"):
    rows = [r for r in dashboard.ROWS if r.label == label]
    return dashboard.build(today, getter(series), rows)[0]


def test_missing_series_shows_as_missing_and_is_never_filled():
    item = one("Fed funds effective", {})
    assert item["status"] == "missing" and item["value"] is None and item["asof"] is None and "EFFR" in item["why"]
    line = dashboard.render([item])[1]
    assert "MISSING" in line and "[Sourced]" in line and "3.88" not in line
    partial = one("SOFR minus IORB, bp", {"SOFR": daily([3.9] * 10)})
    assert partial["status"] == "missing" and partial["value"] is None


def test_too_few_observations_is_missing_and_no_window_is_padded():
    short = one("SOFR minus IORB, bp", {"SOFR": daily([3.95] * 3), "IORB": daily([3.90] * 3)})
    assert short["status"] == "missing" and "needs 5 observations" in short["why"]
    young = one("Broad dollar", {"DTWEXBGS": daily([120.0] * 5)})
    assert young["status"] == "missing" and "30 days back" in young["why"]
    nan = one("VIX", {"VIXCLS": pd.Series([float("nan")], index=pd.to_datetime(["2026-11-25"]))})
    assert nan["status"] == "missing"


def test_load_drops_gaps_without_filling(monkeypatch):
    s = pd.Series([1.0, np.nan, 3.0], index=pd.to_datetime(["2026-11-23", "2026-11-24", "2026-11-25"]))
    monkeypatch.setattr(data, "fred", lambda name: s)
    assert list(dashboard.load("X")) == [1.0, 3.0]
    monkeypatch.setattr(data, "fred", lambda name: s.iloc[1:2])
    with pytest.raises(dashboard.Missing):
        dashboard.load("X")
    def gone(name):
        raise FileNotFoundError(name)
    monkeypatch.setattr(data, "fred", gone)
    with pytest.raises(dashboard.Missing, match="not in lab files"):
        dashboard.load("X")


def test_stale_reading_is_shown_with_its_date_and_not_scored():
    item = one("VIX", {"VIXCLS": daily([40.0] * 5, end="2026-10-01")})
    assert item["status"] == "stale" and item["value"] == "40.00" and item["asof"] == "2026-10-01"
    assert "STALE, not scored" in dashboard.render([item])[1]
    fresh = one("VIX", {"VIXCLS": daily([40.0] * 5)})
    assert fresh["status"] == "ALERT"


def test_alert_rules_and_house_tags():
    calm = one("SOFR minus IORB, bp", {"SOFR": daily([3.90, 3.95, 3.95, 3.95, 3.95]), "IORB": daily([3.90] * 5)})
    assert calm["status"] == "ok" and calm["value"] == "+5"
    five = one("SOFR minus IORB, bp", {"SOFR": daily([3.95] * 5), "IORB": daily([3.90] * 5)})
    spike = one("SOFR minus IORB, bp", {"SOFR": daily([3.80, 3.80, 3.80, 3.80, 4.10]), "IORB": daily([3.90] * 5)})
    assert five["status"] == "ALERT" and spike["status"] == "ALERT" and five["basis"] == "House"
    assert one("Fed funds effective", {"EFFR": daily([4.10])})["status"] == "ALERT"
    assert one("10y minus 3m", {"T10Y3M": daily([-0.1])})["status"] == "ALERT"
    assert one("2-year yield", {"DGS2": daily([4.50, 4.66])})["status"] == "ALERT"
    assert one("Reserve balances, $B", {"WRESBAL": daily([3100000, 3050000, 3000000, 2990000, 2940000])})["status"] == "ALERT"
    line = dashboard.render([five])[1]
    assert line.endswith("[House]") and "ALERT" in line


def test_summary_counts_and_lists_alerts_with_basis():
    items = dashboard.build("2026-11-27", getter({"VIXCLS": daily([40.0] * 5), "EFFR": daily([3.88])}))
    head, alerts = dashboard.summary(items)
    assert head.startswith("39 gauges: 1 ok, 1 in alert, 0 stale, 37 missing")
    assert alerts == ["VIX 40.00 on 2026-11-25: above 28.5 [Lab]"]
    assert sum(r.basis == "House" for r in dashboard.ROWS) == 28 and {r.basis for r in dashboard.ROWS} == {"House", "Sourced", "Lab"}


@pytest.mark.skipif(not (data.RAW / "fred" / "EFFR.csv").exists(), reason="raw data not fetched")
def test_rows_read_the_lab_files_and_unheld_series_stay_missing():
    items = dashboard.build("2026-11-27")
    by = {it["label"]: it for it in items}
    for label in ["Standing repo usage", "Swap line usage", "Median CPI", "GDPNow", "NY Fed recession probability"]:
        assert by[label]["status"] == "missing"
    assert by["Fed funds effective"]["value"] is not None and len(items) == 39
