import json

import fetch

GAMMA = "https://gamma-api.polymarket.com/markets/keyset"
CLOB = "https://clob.polymarket.com/prices-history"
DROP = {"image", "icon", "twitterCardImage", "mailchimpTag"}
DAILY_MIN_VOLUME = 10_000
HOURLY_MIN_VOLUME = 5_000_000
WINDOW = 900_000
throttle = fetch.Throttle(8)


def slim(market):
    return {k: v for k, v in market.items() if k not in DROP}


def parse_page(body):
    return [slim(m) for m in body.get("markets", [])], body.get("next_cursor") or None


def market_date(m):
    return m.get("closedTime") or m.get("endDateIso") or m.get("endDate")


def tokens(m):
    try:
        return json.loads(m.get("clobTokenIds") or "[]")
    except (TypeError, ValueError):
        return []


def parse_history(market_id, token, body):
    return [{"id": market_id, "token": token, "t": p["t"], "p": p["p"]} for p in body.get("history", [])]


def point_date(row):
    return fetch.iso(row["t"])


def pages(cursor):
    while True:
        params = {"closed": "true", "limit": 100}
        if cursor:
            params["after_cursor"] = cursor
        rows, cursor = parse_page(fetch.request(GAMMA, params, timeout=60).json())
        yield rows, cursor
        if cursor is None:
            return
        fetch.time.sleep(0.25)


def markets():
    fetch.paginate(fetch.RAW / "polymarket" / "markets", GAMMA + "?closed=true", pages, market_date)


def load_markets():
    out = []
    for f in sorted((fetch.RAW / "polymarket" / "markets").glob("part-*.jsonl.gz")):
        out.extend(fetch.read_jsonl_gz(f))
    return out


def volume(m):
    try:
        return float(m.get("volumeNum") or m.get("volume") or 0)
    except (TypeError, ValueError):
        return 0.0


def daily_worker(m):
    toks = tokens(m)
    if not toks:
        return []
    throttle.wait()
    try:
        body = fetch.request(CLOB, {"market": toks[0], "interval": "max", "fidelity": 1440}, timeout=30).json()
    except fetch.FetchError:
        return []
    return parse_history(m["id"], toks[0], body)


def hourly_worker(m):
    toks = tokens(m)
    if not toks:
        return []
    daily = daily_worker(m)
    if not daily:
        return []
    t0, t1 = daily[0]["t"] - 86400, daily[-1]["t"] + 86400
    out = []
    while t0 < t1:
        throttle.wait()
        try:
            body = fetch.request(CLOB, {"market": toks[0], "startTs": t0, "endTs": min(t1, t0 + WINDOW), "fidelity": 60}, timeout=30).json()
        except fetch.FetchError:
            body = {}
        out.extend(parse_history(m["id"], toks[0], body))
        t0 += WINDOW
    return out


def selected(min_volume):
    ms = [m for m in load_markets() if volume(m) >= min_volume and tokens(m)]
    return sorted(ms, key=lambda m: int(m["id"]))


def prices_daily():
    fetch.fan_out(fetch.RAW / "polymarket" / "prices_daily", CLOB + "?interval=max&fidelity=1440",
                  selected(DAILY_MIN_VOLUME), daily_worker, point_date)


def prices_hourly():
    fetch.fan_out(fetch.RAW / "polymarket" / "prices_hourly", CLOB + "?fidelity=60",
                  selected(HOURLY_MIN_VOLUME), hourly_worker, point_date, shard_size=200)


def run():
    markets()
    prices_daily()
    prices_hourly()
