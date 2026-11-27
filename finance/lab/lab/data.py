import gzip
import json
import zipfile
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
CACHE = Path(__file__).resolve().parent.parent / "data" / "cache"
ASOF = None


def clip(obj):
    if ASOF is None:
        return obj.copy()
    return obj.loc[:pd.Timestamp(ASOF)].copy()


def fred(series):
    df = pd.read_csv(RAW / "fred" / f"{series}.csv", parse_dates=[0], index_col=0, na_values=".")
    return clip(df.iloc[:, 0].astype(float).dropna())


def french(name, table=0):
    z = zipfile.ZipFile(RAW / "french" / f"{name}_monthly.zip")
    lines = z.read(z.namelist()[0]).decode("latin1").splitlines()
    blocks, cur = [], None
    for line in lines:
        cells = [c.strip() for c in line.split(",")]
        if cells and cells[0] == "" and len(cells) > 1 and any(cells[1:]):
            cur = [cells]
            blocks.append(cur)
        elif cur is not None and cells and cells[0].isdigit() and len(cells[0]) == 6:
            cur.append(cells)
        else:
            cur = None
    block = blocks[table]
    df = pd.DataFrame(block[1:], columns=["date"] + block[0][1:])
    df["date"] = pd.to_datetime(df["date"], format="%Y%m") + pd.offsets.MonthEnd(0)
    df = df.set_index("date").astype(float).replace([-99.99, -999.0], np.nan)
    return clip(df / 100.0)


def etf_prices(tickers):
    out = {}
    for t in tickers:
        df = pd.read_csv(RAW / "etf" / f"{t}.csv", parse_dates=["Date"], index_col="Date")
        out[t] = df["Close"]
    return clip(pd.DataFrame(out))


def monthly_returns(prices):
    return prices.resample("ME").last().pct_change(fill_method=None)


def tbill_monthly():
    tb = fred("TB3MS").resample("ME").last()
    return (tb / 100.0 / 12.0).shift(1)


def tbill_daily(index):
    tb = fred("DTB3").reindex(index).ffill()
    return (tb / 100.0 / 365.0).shift(1).fillna(0.0)


def crypto_daily(symbol):
    rows = json.loads((RAW / "crypto" / f"coinbase_{symbol}-USD.json").read_text())
    df = pd.DataFrame(rows, columns=["t", "low", "high", "open", "close", "volume"])
    df["t"] = pd.to_datetime(df["t"], unit="s")
    s = df.drop_duplicates("t").set_index("t").sort_index()["close"]
    return clip(s)


def shiller():
    x = pd.read_excel(RAW / "shiller" / "ie_data.xls", sheet_name="Data", skiprows=7)
    x = x[pd.to_numeric(x["Date"], errors="coerce").notna()].copy()
    d = x["Date"].astype(float)
    year = d.astype(int)
    month = ((d - year) * 100).round().astype(int)
    x.index = pd.to_datetime(dict(year=year, month=month, day=1)) + pd.offsets.MonthEnd(0)
    out = pd.DataFrame({
        "P": pd.to_numeric(x["P"], errors="coerce"),
        "D": pd.to_numeric(x["D"], errors="coerce"),
        "E": pd.to_numeric(x["E"], errors="coerce"),
        "CPI": pd.to_numeric(x["CPI"], errors="coerce"),
        "GS10": pd.to_numeric(x["Rate GS10"], errors="coerce"),
        "CAPE": pd.to_numeric(x["CAPE"], errors="coerce"),
    })
    return clip(out.sort_index())


def football():
    frames = []
    for f in sorted((RAW / "sports").glob("*.csv")):
        try:
            df = pd.read_csv(f, encoding="latin1", on_bad_lines="skip")
        except Exception:
            continue
        frames.append(df.assign(file=f.stem))
    return pd.concat(frames, ignore_index=True)


def polymarket():
    markets = json.loads((RAW / "prediction" / "polymarket_closed_markets.json").read_text())
    hist_path = RAW / "prediction" / "polymarket_price_history.json"
    hist = json.loads(hist_path.read_text()) if hist_path.exists() else {}
    return markets, hist


def kalshi():
    p = RAW / "prediction" / "kalshi_series_markets.json"
    return json.loads(p.read_text()) if p.exists() else []


def jst():
    return pd.read_stata(RAW / "jst" / "JSTdatasetR6.dta")


@lru_cache(maxsize=None)
def _french_blocks(name, digits):
    z = zipfile.ZipFile(RAW / "french" / "library" / f"{name}_CSV.zip")
    lines = z.read(z.namelist()[0]).decode("latin1").splitlines()
    blocks, cur = [], None
    for line in lines:
        cells = [c.strip() for c in line.split(",")]
        if cells and cells[0] == "" and len(cells) > 1 and any(cells[1:]):
            cur = [cells]
            blocks.append(cur)
        elif cur is not None and cells and cells[0].isdigit() and len(cells[0]) == digits:
            cur.append(cells)
        elif cur is not None and cells and cells[0].isdigit():
            cur = None
        elif cur is not None and len(cur) > 1:
            cur = None
    out = []
    for block in blocks:
        if len(block) < 2:
            continue
        df = pd.DataFrame(block[1:], columns=["date"] + block[0][1:])
        fmt = "%Y%m" if digits == 6 else "%Y%m%d"
        df["date"] = pd.to_datetime(df["date"], format=fmt)
        if digits == 6:
            df["date"] = df["date"] + pd.offsets.MonthEnd(0)
        df = df.set_index("date").astype(float)
        out.append(df.where(df > -99.0) / 100.0)
    return out


def french_lib(name, table=0, daily=False):
    return clip(_french_blocks(name, 8 if daily else 6)[table])


def ff_monthly():
    return french_lib("F-F_Research_Data_Factors")


def ff_daily():
    return french_lib("F-F_Research_Data_Factors_daily", daily=True)


def rf_monthly():
    return ff_monthly()["RF"]


def rf_daily():
    return ff_daily()["RF"]


def market_monthly():
    f = ff_monthly()
    return f["Mkt-RF"] + f["RF"]


def market_daily():
    f = ff_daily()
    return f["Mkt-RF"] + f["RF"]


def fred_frame(series):
    return pd.DataFrame({s: fred(s) for s in series})


@lru_cache(maxsize=None)
def _etf_ohlc(ticker):
    return pd.read_csv(RAW / "etf" / f"{ticker}.csv", parse_dates=["Date"], index_col="Date")


def etf_ohlc(ticker):
    return clip(_etf_ohlc(ticker))


@lru_cache(maxsize=None)
def _crypto_panel(venue, freq, field):
    out = {}
    for f in sorted((RAW / venue / freq).glob("*.csv")):
        df = pd.read_csv(f, usecols=["t", field])
        s = df.drop_duplicates("t").set_index("t")[field]
        s.index = pd.to_datetime(s.index, unit="s")
        out[f.stem.replace("USDT", "").replace("-USD", "")] = s.sort_index()
    return pd.DataFrame(out)


def crypto_panel(venue="binance", freq="1d", field="close"):
    return clip(_crypto_panel(venue, freq, field))


@lru_cache(maxsize=None)
def _stablecoin_supply():
    rows = json.loads((RAW / "defillama" / "stablecoincharts_all.json").read_text())
    s = pd.Series({pd.Timestamp(int(r["date"]), unit="s"): float(r["totalCirculatingUSD"].get("peggedUSD", np.nan)) for r in rows})
    return s.sort_index().dropna()


def stablecoin_supply():
    return clip(_stablecoin_supply())


@lru_cache(maxsize=None)
def _policy_rates():
    z = zipfile.ZipFile(RAW / "bis" / "WS_CBPOL_csv_flat.zip")
    with z.open(z.namelist()[0]) as f:
        df = pd.read_csv(f, usecols=["FREQ:Frequency", "REF_AREA:Reference area", "TIME_PERIOD:Time period or range", "OBS_VALUE:Observation Value"])
    df.columns = ["freq", "area", "period", "value"]
    df = df[df["freq"].str.startswith("M")]
    df["area"] = df["area"].str.slice(0, 2)
    df["period"] = pd.to_datetime(df["period"], format="%Y-%m") + pd.offsets.MonthEnd(0)
    return df.pivot_table(index="period", columns="area", values="value").sort_index() / 100.0


def policy_rates():
    return clip(_policy_rates())


FX_SERIES = {"BR": ("DEXBZUS", True), "CA": ("DEXCAUS", True), "CN": ("DEXCHUS", True), "IN": ("DEXINUS", True),
             "JP": ("DEXJPUS", True), "KR": ("DEXKOUS", True), "MX": ("DEXMXUS", True), "CH": ("DEXSZUS", True),
             "XM": ("DEXUSEU", False), "GB": ("DEXUSUK", False)}


def fx_spot_monthly():
    out = {}
    for area, (series, invert) in FX_SERIES.items():
        s = fred(series)
        out[area] = (1.0 / s if invert else s).resample("ME").last()
    return pd.DataFrame(out)


@lru_cache(maxsize=None)
def _wdi(indicator):
    rows = json.loads((RAW / "worldbank" / f"{indicator}.json").read_text())[1]
    df = pd.DataFrame([{"iso": r["countryiso3code"], "year": int(r["date"]), "value": r["value"]} for r in rows if r["value"] is not None])
    out = df.pivot_table(index="year", columns="iso", values="value")
    out.index = pd.to_datetime(out.index.astype(str) + "-12-31")
    return out


def wdi(indicator):
    return clip(_wdi(indicator))


@lru_cache(maxsize=None)
def _pinksheet():
    x = pd.read_excel(RAW / "pinksheet" / "CMO-Historical-Data-Monthly.xlsx", sheet_name="Monthly Prices", header=None)
    names = x.iloc[4, 1:].astype(str).str.strip().str.replace("*", "", regex=False).str.strip()
    body = x.iloc[6:].copy()
    body = body[body.iloc[:, 0].astype(str).str.match(r"^\d{4}M\d{2}$")]
    idx = pd.to_datetime(body.iloc[:, 0].str.replace("M", "-"), format="%Y-%m") + pd.offsets.MonthEnd(0)
    df = body.iloc[:, 1:].apply(pd.to_numeric, errors="coerce")
    df.columns = names.values
    df.index = idx
    return df


def pinksheet():
    return clip(_pinksheet())


@lru_cache(maxsize=None)
def _jst_panel(col):
    j = jst()
    out = j.pivot_table(index="year", columns="iso", values=col)
    out.index = pd.to_datetime(out.index.astype(int).astype(str) + "-12-31")
    return out


def jst_panel(col):
    return clip(_jst_panel(col))


@lru_cache(maxsize=None)
def _openap_ls():
    df = pd.read_parquet(RAW / "openap" / "PredictorLSretWide.parquet")
    df["date"] = pd.to_datetime(df["date"]) + pd.offsets.MonthEnd(0)
    return df.set_index("date").sort_index() / 100.0


def openap_ls():
    return clip(_openap_ls())


@lru_cache(maxsize=None)
def openap_doc():
    d = pd.read_csv(RAW / "openap" / "SignalDoc.csv", encoding="latin1")
    return d.set_index("Acronym")


@lru_cache(maxsize=None)
def openap_summary():
    return pd.read_excel(RAW / "openap" / "PredictorSummary.xlsx", sheet_name="full")


KALSHI_COLS = ["ticker", "event", "close", "p_prev", "p_last", "won", "volume"]


def build_kalshi_cache():
    rows = []
    for f in sorted((RAW / "kalshi" / "historical_markets").glob("part-*.jsonl.gz")):
        with gzip.open(f, "rt") as g:
            for line in g:
                if '"result": "yes"' not in line and '"result": "no"' not in line:
                    continue
                m = json.loads(line)
                if m.get("market_type") != "binary" or m.get("mve_collection_ticker"):
                    continue
                try:
                    vol = float(m.get("volume_fp") or 0)
                    p_prev = float(m.get("previous_price_dollars") or 0)
                    p_last = float(m.get("last_price_dollars") or 0)
                except ValueError:
                    continue
                if vol < 100:
                    continue
                rows.append((m["ticker"], m["event_ticker"], m["close_time"], p_prev, p_last, 1.0 if m["result"] == "yes" else 0.0, vol))
    df = pd.DataFrame(rows, columns=KALSHI_COLS).drop_duplicates("ticker")
    df["close"] = pd.to_datetime(df["close"], utc=True, format="ISO8601").dt.tz_localize(None)
    CACHE.mkdir(parents=True, exist_ok=True)
    tmp = CACHE / "kalshi_history.parquet.part"
    df.to_parquet(tmp)
    tmp.replace(CACHE / "kalshi_history.parquet")
    return df


@lru_cache(maxsize=None)
def _kalshi_history():
    p = CACHE / "kalshi_history.parquet"
    df = pd.read_parquet(p) if p.exists() else build_kalshi_cache()
    return df.sort_values("close").reset_index(drop=True)


def clip_events(df, col):
    if ASOF is None:
        return df.copy()
    return df[df[col] <= pd.Timestamp(ASOF)].copy()


def kalshi_history():
    return clip_events(_kalshi_history(), "close")


@lru_cache(maxsize=None)
def _polymarket_paths():
    markets, hist = polymarket()
    rows = []
    for m in markets:
        h = hist.get(m["id"]) or []
        try:
            prices = [float(x) for x in json.loads(m.get("outcomePrices") or "[]")]
        except ValueError:
            continue
        if len(prices) != 2 or max(prices) < 0.99 or len(h) < 10:
            continue
        s = pd.Series({pd.Timestamp(x["t"], unit="s"): float(x["p"]) for x in h}).sort_index()
        rows.append({"id": m["id"], "end": s.index[-1], "won": 1.0 if prices[0] >= 0.99 else 0.0, "path": s})
    return pd.DataFrame(rows)


def polymarket_paths():
    return clip_events(_polymarket_paths(), "end")


@lru_cache(maxsize=None)
def _football_all():
    frames = []
    files = sorted((RAW / "football_data" / "mmz4281").glob("*/*.csv")) + sorted((RAW / "sports").glob("*.csv"))
    seen = set()
    for f in files:
        key = (f.parent.name, f.stem) if f.parent.name != "sports" else (f.stem.split("_")[1], f.stem.split("_")[0])
        if key in seen:
            continue
        seen.add(key)
        try:
            df = pd.read_csv(f, encoding="latin1", on_bad_lines="skip")
        except (pd.errors.ParserError, pd.errors.EmptyDataError, UnicodeDecodeError):
            continue
        if "Date" not in df or "FTR" not in df:
            continue
        df = df.dropna(subset=["Date", "FTR"]).copy()
        d = pd.to_datetime(df["Date"], format="%d/%m/%Y", errors="coerce")
        d = d.fillna(pd.to_datetime(df["Date"], format="%d/%m/%y", errors="coerce"))
        df["date"] = d
        df["season"], df["league"] = key
        first = pd.Timestamp(year=2000 + int(key[0][:2]), month=7, day=1)
        frames.append(df[(df["date"] >= first) & (df["date"] <= first + pd.DateOffset(months=14))])
    raw = pd.concat(frames, ignore_index=True)
    cols = {c: raw[c] for c in ["date", "season", "league", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]}
    for side in "HDA":
        for ours, old, new in [("max", "BbMx", "Max"), ("avg", "BbAv", "Avg")]:
            a = pd.to_numeric(raw[f"{old}{side}"], errors="coerce") if f"{old}{side}" in raw else pd.Series(np.nan, index=raw.index)
            b = pd.to_numeric(raw[f"{new}{side}"], errors="coerce") if f"{new}{side}" in raw else pd.Series(np.nan, index=raw.index)
            cols[f"{ours}_{side}"] = a.fillna(b)
        for book in ("B365", "PS", "PSC"):
            if f"{book}{side}" in raw:
                cols[f"{book}{side}"] = pd.to_numeric(raw[f"{book}{side}"], errors="coerce")
    return pd.DataFrame(cols).sort_values("date").reset_index(drop=True)


def football_all():
    return clip_events(_football_all(), "date")
