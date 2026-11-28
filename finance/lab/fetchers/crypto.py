import json
import time
from datetime import datetime, timezone

import fetch

ASSETS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "LTC", "BCH", "XLM", "UNI", "AAVE", "ATOM",
          "ETC", "FIL", "NEAR", "ICP", "APT", "ARB", "OP", "SHIB", "HBAR", "ALGO", "SUI", "PEPE", "TRX", "BNB", "TON"]
COINBASE = "https://api.exchange.coinbase.com/products/{}/candles"
BINANCE = "https://data-api.binance.vision/api/v3/klines"
GRAN = {"1d": 86400, "1h": 3600}
cb_throttle = fetch.Throttle(4)
bn_throttle = fetch.Throttle(8)


def coinbase_rows(body):
    return [{"t": r[0], "low": r[1], "high": r[2], "open": r[3], "close": r[4], "volume": r[5]} for r in body]


def binance_rows(body):
    return [{"t": r[0] // 1000, "open": float(r[1]), "high": float(r[2]), "low": float(r[3]), "close": float(r[4]),
             "volume": float(r[5]), "quote_volume": float(r[7]), "trades": r[8]} for r in body]


def csv_text(rows):
    cols = list(rows[0])
    lines = ["date," + ",".join(cols)]
    for r in rows:
        lines.append(datetime.fromtimestamp(r["t"], timezone.utc).strftime("%Y-%m-%d %H:%M:%S") + "," + ",".join(str(r[c]) for c in cols))
    return "\n".join(lines) + "\n"


def dedupe(rows):
    seen = {r["t"]: r for r in rows}
    return [seen[t] for t in sorted(seen)]


def write(dest, url, rows):
    rows = dedupe(rows)
    fetch.atomic_write(dest, csv_text(rows))
    fetch.record(dest, url, len(rows), fetch.iso(rows[0]["t"]), fetch.iso(rows[-1]["t"]))
    print("ok", dest.relative_to(fetch.RAW), len(rows))


def coinbase(asset, interval, sleep=time.sleep):
    product = f"{asset}-USD"
    dest = fetch.RAW / "coinbase" / interval / f"{product}.csv"
    if fetch.skip(dest):
        return
    url = COINBASE.format(product)
    step = 300 * GRAN[interval]
    t1 = int(time.time())
    rows = []
    while True:
        cb_throttle.wait()
        params = {"granularity": GRAN[interval], "start": datetime.fromtimestamp(t1 - step, timezone.utc).isoformat(),
                  "end": datetime.fromtimestamp(t1, timezone.utc).isoformat()}
        try:
            batch = fetch.request(url, params, sleep=sleep).json()
        except fetch.FetchError as e:
            if not rows and "status 404" in str(e):
                fetch.gate("coinbase", url, f"{product} not listed")
                return
            raise
        if not batch:
            break
        rows.extend(coinbase_rows(batch))
        t1 -= step
    if rows:
        write(dest, url, rows)


def binance(asset, interval):
    symbol = f"{asset}USDT"
    dest = fetch.RAW / "binance" / interval / f"{symbol}.csv"
    if fetch.skip(dest):
        return
    rows, start = [], 0
    while True:
        bn_throttle.wait()
        try:
            batch = fetch.request(BINANCE, {"symbol": symbol, "interval": interval, "startTime": start, "limit": 1000}).json()
        except fetch.FetchError as e:
            if not rows and "status 400" in str(e):
                fetch.gate("binance", BINANCE, f"{symbol} not listed")
                return
            raise
        if not batch:
            break
        rows.extend(binance_rows(batch))
        start = batch[-1][0] + 1
        if len(batch) < 1000:
            break
    if rows:
        write(dest, f"{BINANCE}?symbol={symbol}&interval={interval}", rows)


def run():
    from concurrent.futures import ThreadPoolExecutor
    jobs = [(f, a, i) for a in ASSETS for i in ("1d", "1h") for f in (coinbase, binance)]
    with ThreadPoolExecutor(4) as pool:
        for fut in [pool.submit(f, a, i) for f, a, i in jobs]:
            try:
                fut.result()
            except fetch.FetchError as e:
                print("FAIL", e)


def stablecoin_rows(body):
    out = []
    for p in body:
        circ = p.get("totalCirculatingUSD") or p.get("totalCirculating") or {}
        out.append({"date": fetch.iso(int(p["date"])), "usd": circ.get("peggedUSD"), **{k: v for k, v in circ.items() if k != "peggedUSD"}})
    return out


def defillama():
    base = "https://stablecoins.llama.fi/"
    d = fetch.RAW / "defillama"
    dest = d / "stablecoins.json"
    if not fetch.skip(dest):
        body = fetch.request(base + "stablecoins", {"includePrices": "true"}).json()
        fetch.save(dest, base + "stablecoins", json.dumps(body), lambda b: (len(json.loads(b)["peggedAssets"]), None, None))
    coins = json.loads(dest.read_text())["peggedAssets"]
    chart = d / "stablecoincharts_all.json"
    if not fetch.skip(chart):
        body = fetch.request(base + "stablecoincharts/all").json()
        rows = stablecoin_rows(body)
        fetch.save(chart, base + "stablecoincharts/all", json.dumps(body), lambda b: (len(rows), rows[0]["date"], rows[-1]["date"]))
    for c in coins:
        out = d / "by_coin" / f"{c['id']}_{c['symbol']}.json".replace("/", "_")
        if fetch.skip(out):
            continue
        time.sleep(0.5)
        try:
            body = fetch.request(base + f"stablecoin/{c['id']}").json()
        except fetch.FetchError as e:
            print("FAIL", e)
            continue
        tokens = body.get("tokens") or []
        dates = [fetch.iso(int(t["date"])) for t in tokens if t.get("date")]
        fetch.save(out, base + f"stablecoin/{c['id']}", json.dumps(body),
                   lambda b, n=len(tokens), ds=dates: (n, min(ds) if ds else None, max(ds) if ds else None))
