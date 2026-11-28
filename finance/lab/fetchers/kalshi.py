from datetime import datetime

import fetch

BASE = "https://api.elections.kalshi.com/trade-api/v2/"
CANDLE_MIN_VOLUME = 10_000
throttle = fetch.Throttle(8)
KEEP = ["ticker", "event_ticker", "title", "yes_sub_title", "no_sub_title", "market_type", "status", "result",
        "open_time", "close_time", "settlement_ts", "expiration_value", "settlement_value_dollars", "last_price_dollars",
        "previous_price_dollars", "volume_fp", "open_interest_fp", "notional_value_dollars", "strike_type", "floor_strike",
        "cap_strike", "rules_primary", "occurrence_datetime", "created_time"]


def slim(m):
    return {k: m[k] for k in KEEP if k in m}


def parse_page(body):
    return [slim(m) for m in body.get("markets", [])], body.get("cursor") or None


def close_date(m):
    return m.get("close_time")


def pager(path, extra):
    def pages(cursor):
        while True:
            params = {"limit": 1000, "mve_filter": "exclude", **extra}
            if cursor:
                params["cursor"] = cursor
            throttle.wait()
            rows, cursor = parse_page(fetch.request(BASE + path, params).json())
            yield rows, cursor
            if cursor is None:
                return
    return pages


def markets():
    fetch.paginate(fetch.RAW / "kalshi" / "historical_markets", BASE + "historical/markets?mve_filter=exclude",
                   pager("historical/markets", {}), close_date, shard_rows=100000)
    fetch.paginate(fetch.RAW / "kalshi" / "settled_markets", BASE + "markets?status=settled&mve_filter=exclude",
                   pager("markets", {"status": "settled"}), close_date, shard_rows=100000)


def load(sub):
    out = []
    for f in sorted((fetch.RAW / "kalshi" / sub).glob("part-*.jsonl.gz")):
        out.extend(fetch.read_jsonl_gz(f))
    return out


def ts(s):
    return int(datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp())


def volume(m):
    try:
        return float(m.get("volume_fp") or 0)
    except (TypeError, ValueError):
        return 0.0


def parse_candles(ticker, body):
    out = []
    for c in body.get("candlesticks", []):
        price = c.get("price") or {}
        out.append({"ticker": ticker, "t": c.get("end_period_ts"), "open": price.get("open_dollars", price.get("open")),
                    "high": price.get("high_dollars", price.get("high")), "low": price.get("low_dollars", price.get("low")),
                    "close": price.get("close_dollars", price.get("close")), "volume": c.get("volume_fp", c.get("volume")),
                    "open_interest": c.get("open_interest_fp", c.get("open_interest"))})
    return out


def candle_worker(item):
    m, historical = item
    t0, t1 = ts(m["open_time"]), ts(m["close_time"])
    params = {"start_ts": t0, "end_ts": t1 + 86400, "period_interval": 1440}
    if historical:
        url = BASE + f"historical/markets/{m['ticker']}/candlesticks"
    else:
        url = BASE + f"series/{m['event_ticker'].split('-')[0]}/markets/{m['ticker']}/candlesticks"
    throttle.wait()
    try:
        return parse_candles(m["ticker"], fetch.request(url, params, timeout=30).json())
    except fetch.FetchError:
        return []


def candle_date(row):
    return fetch.iso(row["t"]) if row.get("t") else None


def candles():
    items = [(m, True) for m in load("historical_markets") if volume(m) >= CANDLE_MIN_VOLUME]
    items += [(m, False) for m in load("settled_markets") if volume(m) >= CANDLE_MIN_VOLUME]
    items.sort(key=lambda x: x[0]["ticker"])
    fetch.fan_out(fetch.RAW / "kalshi" / "candles_daily", BASE + "{historical/,series/S/}markets/T/candlesticks?period_interval=1440",
                  items, candle_worker, candle_date)


def run():
    markets()
    candles()
