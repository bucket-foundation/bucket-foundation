import gzip
import hashlib
import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.modules.setdefault("fetch", sys.modules[__name__])

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
MANIFEST = RAW / "MANIFEST.jsonl"
GATES = RAW / "GATES.jsonl"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) finance-lab/0.1"}

FRED = ["BAMLH0A0HYM2", "DGS10", "DGS3MO", "DTB3", "TB3MS", "GS10", "CPIAUCSL", "MORTGAGE30US", "CSUSHPINSA", "USSTHPI", "FEDFUNDS"]
FRENCH = {
    "ff3_monthly.zip": "F-F_Research_Data_Factors_CSV.zip",
    "ff5_monthly.zip": "F-F_Research_Data_5_Factors_2x3_CSV.zip",
    "mom_monthly.zip": "F-F_Momentum_Factor_CSV.zip",
    "ind10_monthly.zip": "10_Industry_Portfolios_CSV.zip",
}
FRENCH_BASE = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/"
SHILLER = ["https://img1.wsimg.com/blobby/go/e5e77e0b-59d1-44d9-ab25-4763ac982e53/downloads/ie_data.xls",
           "http://www.econ.yale.edu/~shiller/data/ie_data.xls"]
JST = ["https://www.macrohistory.net/app/download/9834512469/JSTdatasetR6.xlsx"]
ETFS = ["SPY", "TLT", "IEF", "SHY", "GLD", "DBC", "VNQ", "EFA", "EEM", "AGG", "LQD", "TIP", "QQQ", "IWM", "BIL"]
CRYPTO = ["BTC-USD", "ETH-USD"]
FOOTBALL = [(s, lg) for s in ["1314", "1415", "1516", "1617", "1718", "1819", "1920", "2021", "2122", "2223", "2324", "2425"] for lg in ["E0", "SP1", "D1", "I1", "F1"]]


REFRESH = False
RETRIES = 5
EXPECTED_START = {"BTC-USD": "2015-07-31", "ETH-USD": "2016-05-31"}


class FetchError(RuntimeError):
    pass


def request(url, params=None, timeout=60, sleep=time.sleep, headers=None):
    status = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, params=params, headers=headers or UA, timeout=timeout)
        except (requests.ConnectionError, requests.Timeout) as e:
            status = type(e).__name__
            sleep(min(60, 2 ** attempt))
            continue
        status = r.status_code
        if r.status_code == 200:
            return r
        if r.status_code == 429 or r.status_code >= 500:
            sleep(min(60, 2 ** attempt))
            continue
        break
    raise FetchError(f"{url} {params} status {status}")


class Throttle:
    def __init__(self, per_second):
        self.gap = 1.0 / per_second
        self.lock = threading.Lock()
        self.next = 0.0

    def wait(self):
        with self.lock:
            now = time.monotonic()
            delay = self.next - now
            self.next = max(now, self.next) + self.gap
        if delay > 0:
            time.sleep(delay)


MIN_FREE_BYTES = 5 * 1024 ** 3
RAW_CAP_BYTES = 6 * 1024 ** 3
DATASET_CAP_BYTES = 1024 ** 3
_sizes = {}


class SizeCap(FetchError):
    pass


def dir_bytes(path):
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) if path.exists() else 0


def dataset_dir(dest):
    rel = dest.relative_to(RAW).parts
    return RAW / rel[0] / rel[1] if len(rel) > 2 and rel[0] in ("polymarket", "kalshi", "sec") else RAW / rel[0]


def check_caps(dest, size):
    import shutil
    if shutil.disk_usage(dest.parent).free - size < MIN_FREE_BYTES:
        raise SizeCap(f"disk guard: under {MIN_FREE_BYTES >> 30} GB free, refusing {dest}")
    try:
        ds = dataset_dir(dest)
    except ValueError:
        return
    if "raw" not in _sizes:
        _sizes["raw"] = dir_bytes(RAW)
    if ds not in _sizes:
        _sizes[ds] = dir_bytes(ds)
    if _sizes[ds] + size > DATASET_CAP_BYTES:
        gate(str(ds.relative_to(RAW)), str(dest), "skipped for size: dataset would pass 1 GB")
        raise SizeCap(f"{ds} over dataset cap")
    if _sizes["raw"] + size > RAW_CAP_BYTES:
        gate(str(ds.relative_to(RAW)), str(dest), "skipped for size: raw store would pass 6 GB")
        raise SizeCap("raw store over 6 GB cap")
    _sizes[ds] += size
    _sizes["raw"] += size


def atomic_write(dest, payload):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.name != "_state.json":
        check_caps(dest, len(payload))
    tmp = dest.with_name(dest.name + ".part")
    if isinstance(payload, str):
        tmp.write_text(payload)
    else:
        tmp.write_bytes(payload)
    tmp.replace(dest)


def skip(dest):
    return dest.exists() and not REFRESH


_manifest_lock = threading.Lock()


def record(path, url, rows=None, start=None, end=None, license=None):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    row = {"file": str(path.relative_to(RAW)), "url": url, "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "sha256": digest, "bytes": path.stat().st_size, "rows": rows, "start": start, "end": end}
    if license:
        row["license"] = license
    with _manifest_lock, MANIFEST.open("a") as f:
        f.write(json.dumps(row) + "\n")


def gate(source, url, reason):
    GATES.parent.mkdir(parents=True, exist_ok=True)
    row = {"source": source, "url": url, "reason": reason, "date": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    with _manifest_lock, GATES.open("a") as f:
        f.write(json.dumps(row) + "\n")
    print("GATE", source, reason, file=sys.stderr)


def span(values):
    vals = sorted(str(v)[:10] for v in values if v not in (None, "", "nan", "NaT"))
    return (vals[0], vals[-1]) if vals else (None, None)


def iso(ts, ms=False):
    return datetime.fromtimestamp(ts / 1000 if ms else ts, timezone.utc).date().isoformat()


def save(dest, url, payload, parse=None, license=None):
    atomic_write(dest, payload)
    rows = start = end = None
    if parse is not None:
        rows, start, end = parse(dest.read_bytes())
    record(dest, url, rows, start, end, license)
    print("ok", dest.relative_to(RAW), rows if rows is not None else "", start or "", end or "")


def write_jsonl_gz(dest, url, rows, date_key=None):
    payload = gzip.compress("".join(json.dumps(r) + "\n" for r in rows).encode(), 6)
    atomic_write(dest, payload)
    start, end = span(date_key(r) for r in rows) if date_key else (None, None)
    record(dest, url, len(rows), start, end)
    print("ok", dest.relative_to(RAW), len(rows), start or "", end or "")


def read_jsonl_gz(path):
    with gzip.open(path, "rt") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_state(path):
    return json.loads(path.read_text()) if path.exists() else {}


def save_state(path, state):
    atomic_write(path, json.dumps(state))


def part(directory, i):
    return directory / f"part-{i:05d}.jsonl.gz"


def reset(directory):
    for f in directory.glob("part-*.jsonl.gz"):
        f.unlink()
    state = directory / "_state.json"
    if state.exists():
        state.unlink()


def paginate(directory, url, pages, date_key=None, shard_rows=50000):
    directory.mkdir(parents=True, exist_ok=True)
    state_path = directory / "_state.json"
    state = load_state(state_path)
    if state.get("done") and REFRESH:
        reset(directory)
        state = {}
    if state.get("done"):
        return state
    cursor, shard, buf = state.get("cursor"), state.get("shard", 0), []
    for rows, cursor in pages(cursor):
        buf.extend(rows)
        if len(buf) >= shard_rows or cursor is None:
            if buf:
                write_jsonl_gz(part(directory, shard), url, buf, date_key)
                shard += 1
                buf = []
            save_state(state_path, {"cursor": cursor, "shard": shard, "done": cursor is None})
        if cursor is None:
            break
    if buf:
        write_jsonl_gz(part(directory, shard), url, buf, date_key)
        shard += 1
    state = {"cursor": None, "shard": shard, "done": True}
    save_state(state_path, state)
    return state


def fan_out(directory, url, items, worker, date_key=None, shard_size=1000, threads=6):
    from concurrent.futures import ThreadPoolExecutor
    directory.mkdir(parents=True, exist_ok=True)
    if REFRESH:
        reset(directory)
    with ThreadPoolExecutor(threads) as pool:
        for i in range(0, len(items), shard_size):
            dest = part(directory, i // shard_size)
            if dest.exists():
                continue
            rows = []
            for out in pool.map(worker, items[i:i + shard_size]):
                rows.extend(out)
            write_jsonl_gz(dest, url, rows, date_key)


def get(url, dest, parse=None, current=False, license=None, **kw):
    if skip(dest) and not current:
        return True
    try:
        r = request(url, **kw)
    except (FetchError, requests.RequestException) as e:
        print("FAIL", url, e, file=sys.stderr)
        return False
    save(dest, url, r.content, parse, license)
    return True


def get_first(urls, dest, parse=None):
    return any(get(u, dest, parse) for u in urls)


def write_json(dest, url, obj):
    atomic_write(dest, json.dumps(obj))
    record(dest, url)
    print("ok", dest.relative_to(RAW))


def fetch_yahoo(tickers, sub):
    import yfinance as yf
    for t in tickers:
        dest = RAW / sub / f"{t}.csv"
        if skip(dest):
            continue
        df = yf.download(t, period="max", interval="1d", auto_adjust=True, progress=False)
        if df.empty:
            raise FetchError(f"yahoo {t} empty")
        if hasattr(df.columns, "levels"):
            df.columns = df.columns.get_level_values(0)
        atomic_write(dest, df.to_csv())
        record(dest, f"yfinance:{t}")
        print("ok", dest.relative_to(RAW))


def fetch_coinbase(product, sleep=time.sleep):
    dest = RAW / "crypto" / f"coinbase_{product}.json"
    if skip(dest):
        return
    url = f"https://api.exchange.coinbase.com/products/{product}/candles"
    end = datetime.now(timezone.utc)
    rows = []
    step = 300 * 86400
    t1 = int(end.timestamp())
    while True:
        t0 = t1 - step
        params = {"granularity": 86400, "start": datetime.fromtimestamp(t0, timezone.utc).isoformat(),
                  "end": datetime.fromtimestamp(t1, timezone.utc).isoformat()}
        batch = request(url, params, sleep=sleep).json()
        if not batch:
            break
        rows.extend(batch)
        t1 = t0
        sleep(0.3)
    validate_start(product, rows)
    write_json(dest, url, rows)


def validate_start(product, rows):
    if not rows:
        raise FetchError(f"coinbase {product} returned no rows")
    first = datetime.fromtimestamp(min(r[0] for r in rows), timezone.utc).date().isoformat()
    want = EXPECTED_START.get(product)
    if want and first > want:
        raise FetchError(f"coinbase {product} starts {first}, expected on or before {want}")


def fetch_binance(symbol):
    dest = RAW / "crypto" / f"binance_{symbol}.json"
    if skip(dest):
        return
    url = "https://data-api.binance.vision/api/v3/klines"
    rows, start = [], 0
    while True:
        batch = request(url, {"symbol": symbol, "interval": "1d", "startTime": start, "limit": 1000}).json()
        if not batch:
            break
        rows.extend(batch)
        start = batch[-1][0] + 1
        if len(batch) < 1000:
            break
    if not rows:
        raise FetchError(f"{url} returned no rows")
    write_json(dest, url, rows)


def fetch_polymarket(pages=40):
    dest = RAW / "prediction" / "polymarket_closed_markets.json"
    if skip(dest):
        return
    url = "https://gamma-api.polymarket.com/markets"
    rows = []
    for i in range(pages):
        batch = request(url, {"closed": "true", "limit": 500, "offset": i * 500, "order": "volumeNum", "ascending": "false"}).json()
        if not batch:
            break
        rows.extend(batch)
    if not rows:
        raise FetchError(f"{url} returned no rows")
    write_json(dest, url, rows)


def fetch_polymarket_history(n=1500):
    src = RAW / "prediction" / "polymarket_closed_markets.json"
    dest = RAW / "prediction" / "polymarket_price_history.json"
    if skip(dest) or not src.exists():
        return
    markets = json.loads(src.read_text())
    url = "https://clob.polymarket.com/prices-history"
    out = {}
    for m in markets[:n]:
        try:
            toks = json.loads(m.get("clobTokenIds") or "[]")
        except Exception:
            continue
        if not toks:
            continue
        out[m["id"]] = request(url, {"market": toks[0], "interval": "max", "fidelity": 1440}, timeout=30).json().get("history", [])
    write_json(dest, url, out)


KALSHI_SERIES = ["KXNFLGAME", "KXMLBGAME", "KXNBAGAME", "KXNHLGAME", "KXNCAAFGAME", "KXEPLGAME", "KXHIGHNY", "KXHIGHCHI",
                 "KXHIGHMIA", "KXHIGHLAX", "KXHIGHAUS", "KXHIGHDEN", "KXFED", "KXINXU", "KXCPI", "KXGDP"]
KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2/"


def fetch_kalshi(pages=10, sleep=time.sleep):
    dest = RAW / "prediction" / "kalshi_series_markets.json"
    if skip(dest):
        return
    rows = []
    for series in KALSHI_SERIES:
        for path, extra in [("historical/markets", {}), ("markets", {"status": "settled"})]:
            cursor = None
            for _ in range(pages):
                params = {"limit": 1000, "series_ticker": series, **extra}
                if cursor:
                    params["cursor"] = cursor
                j = request(KALSHI_BASE + path, params, sleep=sleep).json()
                rows.extend(j.get("markets", []))
                cursor = j.get("cursor")
                if not cursor:
                    break
                sleep(0.2)
    if not rows:
        raise FetchError("kalshi returned no rows")
    write_json(dest, KALSHI_BASE + "{historical/markets,markets}?series_ticker=" + ",".join(KALSHI_SERIES), rows)


def legacy():
    for s in FRED:
        get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={s}", RAW / "fred" / f"{s}.csv")
    for name, f in FRENCH.items():
        get(FRENCH_BASE + f, RAW / "french" / name)
    get_first(SHILLER, RAW / "shiller" / "ie_data.xls")
    fetch_yahoo(ETFS, "etf")
    fetch_yahoo(CRYPTO, "crypto_yahoo")
    fetch_coinbase("BTC-USD")
    fetch_coinbase("ETH-USD")
    fetch_binance("BTCUSDT")
    fetch_binance("ETHUSDT")
    fetch_polymarket()
    fetch_polymarket_history()
    fetch_kalshi()
    for s, lg in FOOTBALL:
        get(f"https://www.football-data.co.uk/mmz4281/{s}/{lg}.csv", RAW / "sports" / f"{lg}_{s}.csv")


def sources():
    from fetchers import REGISTRY
    return {"legacy": legacy, **REGISTRY}


def main(argv=None):
    global REFRESH
    args = sys.argv[1:] if argv is None else argv
    REFRESH = "--refresh" in args
    only = next((a.split("=", 1)[1].split(",") for a in args if a.startswith("--only=")), None)
    if "--list" in args:
        print("\n".join(sources()))
        return 0
    failed = []
    for name, fn in sources().items():
        if only and name not in only:
            continue
        print("==", name)
        try:
            fn()
        except (FetchError, requests.RequestException, ValueError, KeyError) as e:
            failed.append(name)
            print("FAIL", name, e, file=sys.stderr)
    if failed:
        print("failed:", ",".join(failed), file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
