import math

import numpy as np
import pandas as pd
import pytest

from lab import data, leakage, trials
from lab.backtest import run
from lab.strategies.common import expanding_forecast

pytestmark = pytest.mark.skipif(not (data.RAW / "openap" / "PredictorLSretWide.parquet").exists(), reason="raw data not fetched")

ALL = trials.load_all()
NEW = sorted(k for k, t in ALL.items() if t.origin == "new")
SAMPLED = sorted(k for k, t in ALL.items() if t.origin == "chen-zimmermann" and t.reported)[:5] + sorted(k for k, t in ALL.items() if t.origin == "legacy")


@pytest.mark.parametrize("trial_id", NEW + SAMPLED)
def test_past_returns_and_weights_do_not_change_when_later_data_is_removed(trial_id):
    t = ALL[trial_id]
    gap, n = leakage.max_gap(t.fn, t.ppy, calendar_only=trial_id in leakage.CALENDAR_ONLY)
    assert n > 0
    assert gap < 1e-9


def leaky_full_sample_mean():
    mkt = data.market_monthly()
    w = (mkt > mkt.mean()).astype(float).to_frame("a")
    return run(w, mkt.to_frame("a"), 0.0)


def leaky_peek_next_month():
    mkt = data.market_monthly()
    w = (mkt.shift(-1) > 0).astype(float).dropna().to_frame("a")
    return run(w, mkt.to_frame("a"), 0.0)


def leaky_fit_on_all_targets():
    mkt = data.market_monthly()
    fwd = mkt.rolling(12).sum().shift(-12)
    x = mkt.rolling(12).sum()
    df = pd.DataFrame({"x": x, "y": fwd}).dropna()
    slope, intercept = np.polyfit(df["x"], df["y"], 1)
    w = ((intercept + slope * x) > df["y"].mean()).astype(float).to_frame("a")
    return run(w, mkt.to_frame("a"), 0.0)


@pytest.mark.parametrize("leaky", [leaky_full_sample_mean, leaky_peek_next_month, leaky_fit_on_all_targets])
def test_checker_catches_known_leaks(leaky):
    gap, n = leakage.max_gap(leaky, 12)
    assert n > 0 and gap > 1e-6


def test_clip_cuts_every_loader_at_asof(monkeypatch):
    monkeypatch.setattr(data, "ASOF", "1999-12-31")
    cut = pd.Timestamp("1999-12-31")
    for frame in [data.ff_monthly(), data.ff_daily(), data.etf_prices(["SPY"]), data.fred("DGS10"), data.shiller(), data.openap_ls(),
                  data.fx_spot_monthly(), data.policy_rates(), data.pinksheet(), data.jst_panel("eq_tr"), data.wdi("FP.CPI.TOTL"),
                  data.french_lib("49_Industry_Portfolios")]:
        assert frame.index.max() <= cut
    assert (data.football_all()["date"] <= cut).all()
    assert data.kalshi_history().empty and data.polymarket_paths().empty and data.crypto_panel().empty


def test_expanding_forecast_never_reads_unrealized_targets():
    rng = np.random.default_rng(0)
    idx = pd.date_range("2000-01-31", periods=200, freq="ME")
    x = pd.DataFrame({"x": rng.normal(size=200)}, index=idx)
    y = pd.Series(2.0 * x["x"].to_numpy() + rng.normal(scale=0.1, size=200), index=idx)
    base = expanding_forecast(x, y, 12, min_obs=24)
    for i in [60, 120, 199]:
        poisoned = y.copy()
        poisoned.iloc[i - 11:] = 1e6
        assert expanding_forecast(x, poisoned, 12, min_obs=24).iloc[i] == pytest.approx(base.iloc[i])
        leaking = y.copy()
        leaking.iloc[i - 12] = 1e6
        assert not math.isclose(expanding_forecast(x, leaking, 12, min_obs=24).iloc[i], base.iloc[i])
    assert base.iloc[:35].isna().all()
    assert base.dropna().corr(2.0 * x["x"].reindex(base.dropna().index)) > 0.99
