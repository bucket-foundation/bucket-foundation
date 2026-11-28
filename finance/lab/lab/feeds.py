import io
import re
from datetime import date, datetime, timezone

import pandas as pd
import requests

from . import data

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) finance-lab/0.1"}
KALSHI = "https://api.elections.kalshi.com/trade-api/v2/"
MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August",
                                      "September", "October", "November", "December"], 1)}


def _get(url, timeout=25, **kw):
    r = requests.get(url, headers=UA, timeout=timeout, **kw)
    r.raise_for_status()
    return r


def yahoo_daily(symbol, rng="2y"):
    j = _get(f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}", params={"range": rng, "interval": "1d"}).json()
    res = j["chart"]["result"][0]
    idx = pd.to_datetime(res["timestamp"], unit="s").normalize()
    close = res["indicators"]["quote"][0]["close"]
    return pd.Series(close, index=idx, name=symbol).dropna()


def stooq_daily(symbol):
    text = _get("https://stooq.com/q/d/l/", params={"s": symbol, "i": "d"}).text
    df = pd.read_csv(io.StringIO(text), parse_dates=["Date"], index_col="Date")
    return df["Close"].dropna()


def price_series(yahoo_symbol, stooq_symbol=None):
    try:
        return yahoo_daily(yahoo_symbol), "Yahoo"
    except Exception as e:
        if not stooq_symbol:
            raise
        try:
            return stooq_daily(stooq_symbol), "Stooq"
        except Exception:
            raise e


def coinbase_daily(product="BTC-USD"):
    rows = _get(f"https://api.exchange.coinbase.com/products/{product}/candles", params={"granularity": 86400}).json()
    df = pd.DataFrame(rows, columns=["t", "low", "high", "open", "close", "volume"])
    df["t"] = pd.to_datetime(df["t"], unit="s")
    s = df.drop_duplicates("t").set_index("t").sort_index()["close"].astype(float)
    today = pd.Timestamp(datetime.now(timezone.utc).date())
    return s[s.index < today]


def fred_series(series):
    try:
        text = _get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}", timeout=15).text
        df = pd.read_csv(io.StringIO(text), parse_dates=[0], index_col=0, na_values=".")
        return df.iloc[:, 0].astype(float).dropna(), "FRED live"
    except Exception:
        return data.fred(series), "FRED cached in lab/data/raw"


def kalshi_event_markets(series):
    j = _get(KALSHI + "events", params={"series_ticker": series, "status": "open", "with_nested_markets": "true", "limit": 10}).json()
    return j.get("events", [])


def kalshi_markets(max_close_ts, limit=1000):
    out, cursor = [], None
    while len(out) < limit:
        params = {"status": "open", "max_close_ts": max_close_ts, "limit": 1000, "mve_filter": "exclude"}
        if cursor:
            params["cursor"] = cursor
        j = _get(KALSHI + "markets", params=params).json()
        out += j.get("markets", [])
        cursor = j.get("cursor")
        if not cursor:
            break
    return out


def kalshi_market(ticker):
    return _get(KALSHI + f"markets/{ticker}").json()["market"]


def polymarket_top(limit=8):
    return _get("https://gamma-api.polymarket.com/markets",
                params={"limit": limit, "active": "true", "closed": "false", "order": "volume24hr", "ascending": "false"}).json()


def parse_fomc(html):
    out = []
    for block in re.split(r'<h4><a id="\d+">', html)[1:]:
        m = re.match(r"(\d{4}) FOMC", block)
        if not m:
            continue
        year = int(m.group(1))
        for month, days in re.findall(r'fomc-meeting__month[^>]*><strong>([A-Za-z/]+)</strong>.*?fomc-meeting__date[^>]*>([^<]+)<', block, re.S):
            month = month.split("/")[-1]
            dm = re.match(r"(\d+)(?:-(\d+))?", days.strip())
            if month not in MONTHS or not dm or "notation" in days:
                continue
            last = int(dm.group(2) or dm.group(1))
            out.append({"date": date(year, MONTHS[month], last), "sep": "*" in days})
    return sorted(out, key=lambda x: x["date"])


def fomc_meetings():
    html = _get("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm").text
    return parse_fomc(html)


def parse_bls_ics(text, keyword="Consumer Price Index"):
    out = []
    for ev in text.split("BEGIN:VEVENT")[1:]:
        if keyword not in ev:
            continue
        m = re.search(r"DTSTART[^:]*:(\d{8})", ev)
        if m:
            out.append(datetime.strptime(m.group(1), "%Y%m%d").date())
    return sorted(out)


def cpi_dates():
    try:
        text = _get("https://www.bls.gov/schedule/news_release/bls.ics").text
        dates = parse_bls_ics(text)
        if dates:
            return dates, "BLS release calendar"
    except Exception:
        pass
    dates = []
    for ev in kalshi_event_markets("KXCPI"):
        closes = [m.get("close_time") for m in ev.get("markets", []) if m.get("close_time")]
        if closes:
            dates.append(pd.Timestamp(min(closes)).tz_convert("America/New_York").date())
    return sorted(set(dates)), "BLS blocked automated fetch; dates from Kalshi KXCPI market close times"
