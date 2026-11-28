import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "CATALOG.md"

SOURCES = {
    "polymarket": ("polymarket", "Polymarket Gamma closed markets and CLOB price history", "Polymarket API terms, no license stated"),
    "kalshi": ("kalshi", "Kalshi historical and settled markets, daily candlesticks", "Kalshi API terms, no license stated"),
    "prediction": ("legacy", "Earlier Polymarket and Kalshi samples", "Provider API terms"),
    "coinbase": ("crypto", "Coinbase Exchange daily and hourly candles, 30 assets", "Coinbase market data terms"),
    "binance": ("crypto", "Binance spot USDT klines, daily and hourly", "Binance terms of use"),
    "crypto": ("legacy", "Coinbase and Binance BTC, ETH daily JSON", "Exchange terms"),
    "crypto_yahoo": ("legacy", "Yahoo daily BTC, ETH", "Yahoo personal use"),
    "defillama": ("defillama", "DefiLlama stablecoin supply by coin, chain and total", "DefiLlama open API, no license stated"),
    "fred": ("fred", "FRED series, 214 most used, includes Case-Shiller", "Per series; S&P Case-Shiller reuse needs approval"),
    "french": ("history", "Ken French data library, every CSV zip", "Copyright Fama and French, free for research"),
    "shiller": ("history", "Shiller ie_data monthly S&P, CAPE, rates", "Free with disclaimer"),
    "jst": ("history", "Jorda-Schularick-Taylor Macrohistory R6", "CC BY-NC-SA 4.0"),
    "zillow": ("realestate", "Zillow ZHVI and ZORI CSVs", "Zillow terms of use, attribution required"),
    "fhfa": ("realestate", "FHFA house price indexes, every download", "US government, public"),
    "freddie": ("realestate", "Freddie Mac loan-level file headers", "Freddie Mac terms"),
    "worldbank": ("macro", "World Bank WDI, 40 indicators, all countries", "CC BY 4.0"),
    "imf": ("macro", "IMF SDMX: WEO, COFER, PCPS, EER, CPI, MFS_IR", "IMF terms of use"),
    "oecd": ("macro", "OECD SDMX: QNA growth, prices, unemployment, CLI, KEI, finance", "OECD terms, CC BY 4.0"),
    "bis": ("macro", "BIS bulk flat CSV, every dataset", "BIS terms of use"),
    "treasury": ("macro", "US Treasury daily par, real, bill and long-term rates", "US government, public"),
    "cftc": ("macro", "CFTC Commitments of Traders history: legacy, disaggregated, TFF", "US government, public"),
    "pinksheet": ("macro", "World Bank Pink Sheet commodity prices", "CC BY 4.0"),
    "football_data": ("sports", "football-data.co.uk results and closing odds, every league and season", "Free for personal use"),
    "sports": ("legacy", "football-data.co.uk five leagues 2013 to 2025", "Free for personal use"),
    "gpu": ("gpu", "GPU rental pricing page snapshots and Vast.ai live offers", "Provider pages, all rights reserved; snapshot for research"),
    "sec": ("sec", "SEC financial statement data sets and companyfacts bulk", "US government, public"),
    "etf": ("legacy", "Yahoo daily ETF prices", "Yahoo personal use"),
    "openap": ("openap", "Chen-Zimmermann Open Source Asset Pricing portfolios, release 2026.10", "No license on the dataset card; source repository GPL-2.0; cite Chen and Zimmermann 2022"),
}


def latest_rows():
    out = {}
    if (RAW / "MANIFEST.jsonl").exists():
        for line in (RAW / "MANIFEST.jsonl").read_text().splitlines():
            r = json.loads(line)
            out[r["file"]] = r
    return out


def latest_gates():
    out = {}
    if (RAW / "GATES.jsonl").exists():
        for line in (RAW / "GATES.jsonl").read_text().splitlines():
            r = json.loads(line)
            out[r["source"]] = r
    return out


def csv_stats(body):
    lines = [l for l in body.decode("utf-8", "replace").splitlines()[1:] if l[:4].isdigit()]
    return len(lines), (lines[0][:10] if lines else None), (lines[-1][:10] if lines else None)


def json_stats(body):
    data = json.loads(body)
    if isinstance(data, list) and data and isinstance(data[0], list):
        ts = [r[0] for r in data]
        ms = ts[0] > 10 ** 11
        from fetch import iso
        return len(data), iso(min(ts), ms), iso(max(ts), ms)
    return (len(data) if isinstance(data, (list, dict)) else None), None, None


def infer(rel, path):
    sys.path.insert(0, str(ROOT))
    from fetchers import fred, history, sports
    top = rel.split("/")[0]
    body = path.read_bytes()
    try:
        if top == "fred":
            return fred.parse_csv(body)
        if top == "french":
            return history.parse_french_zip(body)
        if top in ("sports", "football_data"):
            return sports.parse_matches(body)
        if path.suffix == ".dta":
            return history.parse_jst_dta(body)
        if path.suffix == ".xls" and top == "shiller":
            return history.parse_shiller(body)
        if path.suffix == ".csv":
            return csv_stats(body)
        if path.suffix == ".json":
            return json_stats(body)
    except Exception as e:
        print("infer failed", rel, e, file=sys.stderr)
    return None, None, None


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def summarize(rows):
    groups = defaultdict(lambda: {"files": 0, "rows": 0, "bytes": 0, "start": None, "end": None, "unknown": 0})
    for f in RAW.rglob("*"):
        if not f.is_file() or f.name.startswith("_") or f.suffix == ".part" or f.parent == RAW:
            continue
        rel = str(f.relative_to(RAW))
        g = groups[rel.split("/")[0]]
        g["files"] += 1
        g["bytes"] += f.stat().st_size
        m = rows.get(rel, {})
        if m.get("rows") is None:
            n, a, b = infer(rel, f)
            m = {**m, "rows": n, "start": m.get("start") or a, "end": m.get("end") or b}
        if m.get("rows") is None:
            g["unknown"] += 1
        else:
            g["rows"] += m["rows"]
        for k, better in (("start", min), ("end", max)):
            v = m.get(k)
            if v:
                g[k] = v if g[k] is None else better(g[k], v)
    return groups


def render(groups, gates):
    lines = ["# Data Catalog", "", "Generated by `python catalog.py` from `data/raw/MANIFEST.jsonl` and `data/raw/GATES.jsonl`. "
             "Every file has a manifest row with url, fetch date, sha256, rows and date range. Refresh a source with "
             "`python fetch.py --only=<name>`; add `--refresh` to refetch files already on disk.", "",
             "| Directory | Source | Rows | Span | Files | Size | Refresh | License |", "|---|---|---|---|---|---|---|---|"]
    for d in sorted(groups):
        g = groups[d]
        name, desc, lic = SOURCES.get(d, ("?", d, "n/s"))
        rows = f"{g['rows']:,}" + (f" plus {g['unknown']} files uncounted" if g["unknown"] else "")
        span = f"{g['start']} to {g['end']}" if g["start"] else "n/s"
        cmd = f"`python fetch.py --only={name}`"
        lines.append(f"| `{d}` | {desc} | {rows} | {span} | {g['files']} | {human(g['bytes'])} | {cmd} | {lic} |")
    lines += ["", "## Gated Sources", "", "Logged by `fetch.py`; nothing behind a login was fetched.", "",
              "| Source | URL | Reason | Logged |", "|---|---|---|---|"]
    for s in sorted(gates):
        r = gates[s]
        lines.append(f"| {s} | {r['url']} | {r['reason']} | {r['date'][:10]} |")
    return "\n".join(lines) + "\n"


def main():
    OUT.write_text(render(summarize(latest_rows()), latest_gates()))
    print(OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
