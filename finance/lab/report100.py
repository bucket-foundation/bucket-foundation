import json
import math
import re
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "results"
FAMILIES = ["Equities", "ETFs and Macro", "Futures and CTA", "Technical Analysis", "Options and Volatility", "Rates", "Credit", "FX",
            "Commodities", "Crypto", "Prediction Markets", "Sports Betting"]
BENCH_LABEL = {"mkt_m": "US market", "mkt_d": "US market", "spy_m": "SPY", "spy_d": "SPY", "btc_d": "BTC", "btc_m": "BTC", "shiller_stock": "S&P"}


def pct(x, digits=1):
    return "n/a" if x is None or math.isnan(x) else f"{x * 100:.{digits}f}%"


def num(x, digits=2):
    return "n/a" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:.{digits}f}"


def first_sentence(text, limit=150):
    text = " ".join(str(text).replace("|", "/").split())
    cut = text.find(". ")
    text = text if cut < 0 else text[:cut + 1]
    return text if len(text) <= limit else text[:limit - 3].rstrip() + "..."


def paper_short(text):
    text = " ".join(str(text).replace("|", "/").split()).rstrip(".")
    m = re.match(r"^(.*?[.?]) (.+?, \d{4}(?:, .+)?)$", text)
    out = m.group(2) if m else text
    return out if len(out) <= 80 else out[:77].rstrip() + "..."


def verdict(v):
    o = v["oos"]
    if not v["price_valid"]:
        return "Indicative"
    if not v["executable"]:
        label = "Paid data" if v["needs_paid_data"] else "Published series"
        outcome = "stats pass" if v["stat_pooled"] else "stats held" if v["held_stat"] else "failed" if o is None or o["sharpe"] <= 0 else "weak"
        return f"{label}, {outcome}"
    if v["survived"]:
        return "Survived"
    if v["passes_family"]:
        return "Held, family DSR"
    if v["held_oos"]:
        return "Held"
    if o is None or o["sharpe"] <= 0:
        return "Failed"
    if v.get("bench_oos") and o["sharpe"] <= v["bench_oos"]["sharpe"]:
        return f"Trails {BENCH_LABEL[v['benchmark']]}"
    return "Weak"


def oos_cell(v):
    o = v["oos"]
    if v.get("bench_oos"):
        return f"{num(o['sharpe'])} vs {num(v['bench_oos']['sharpe'])}"
    return num(o["sharpe"])


def row(v):
    f = v["full"]
    to = num(f["turnover"], 1) + (" est" if f["turnover_estimated"] else "")
    name = f"[{v['title']}](../09-strategies/cards/{v['card']}.md)"
    split = v["split"][:7] + ("" if v["split_rule"] == "publication" else " mid")
    cells = [name, paper_short(v["paper"]), first_sentence(v["claim"]), v["cost"], f["start"][:7], pct(f["cagr"]), pct(f["vol"]), num(f["sharpe"]),
             pct(f["max_dd"], 0), to, split, num(v["is"]["sharpe"]), oos_cell(v), num(v["oos"]["t"], 1), num(v["dsr_lab"]), num(v["dsr_family"]),
             verdict(v)]
    return "| " + " | ".join(cells) + " |"


HEAD = ("| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |\n"
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")


def scorecard(rows):
    lines = ["| Family | Strategies | Indicative | Published series or paid data | Median IS Sharpe | Median OOS Sharpe | OOS t of 2 or more | Held | Survived |",
             "|---|---|---|---|---|---|---|---|---|"]
    for fam in FAMILIES + ["All"]:
        items = [v for v in rows if fam == "All" or v["family"] == fam]
        live = [v for v in items if v["price_valid"]]
        if not items:
            continue
        med_is = float(np.median([v["is"]["sharpe"] for v in live])) if live else float("nan")
        med_oos = float(np.median([v["oos"]["sharpe"] for v in live])) if live else float("nan")
        lines.append(f"| {fam} | {len(items)} | {len(items) - len(live)} | {sum(v['price_valid'] and not v['executable'] for v in items)} | {num(med_is)} | {num(med_oos)} | {sum(v['oos']['t'] >= 2 for v in live)} | "
                     f"{sum(v['held_oos'] for v in items)} | {sum(v['survived'] for v in items)} |")
    return "\n".join(lines)


def listing(items):
    if not items:
        return "None."
    out = []
    for v in sorted(items, key=lambda v: -v["oos"]["t"]):
        f, o = v["full"], v["oos"]
        bench = f" against {num(v['bench_oos']['sharpe'])} for {BENCH_LABEL[v['benchmark']]}" if v.get("bench_oos") else ""
        out.append(f"- **{v['title']}**, `{v['id']}`: OOS Sharpe {num(o['sharpe'])}{bench}, OOS t {num(o['t'], 1)}, DSR pooled {num(v['dsr_lab'])}, DSR family {num(v['dsr_family'])}, "
                   f"full-sample Sharpe {num(f['sharpe'])}, CAGR {pct(f['cagr'])}, max drawdown {pct(f['max_dd'], 0)}. {NOTES.get(v['id'], '')}".rstrip())
    return "\n".join(out)


NOTES = {
    "surebets": "After the stale-quote filter, the 1% minimum edge and the 50% haircut. The snapshot cannot show that the best prices were live at the same moment.",
    "cz_smileslope": "Chen-Zimmermann equal-weight long-short returns less a 30 bps haircut. The lab holds no option data and never built the signal.",
    "kalshi_favorites": "Prices are last trades over 11 weeks; see Limits.",
    "kalshi_near_certain": "Prices are last trades over 11 weeks; see Limits.",
    "commodity_momentum": "Spot prices with no futures roll.",
    "fed_model": "Built on Shiller monthly average prices.",
}


TESTS = 0


def legacy_table(rows):
    picks = [("legacy_crypto_trend_BTC_sma50", "BTC SMA 50", 0.98), ("legacy_crypto_trend_ETH_sma50", "ETH SMA 50", 0.95),
             ("legacy_crypto_trend_BTC_sma100", "BTC SMA 100", 0.93), ("legacy_sixty_forty_rebal_3m", "60/40, 3-month rebalance", 0.44)]
    by_id = {v["id"]: v for v in rows}
    lines = ["| Earlier trial | Sharpe | DSR, 44 trials | DSR pooled | DSR family | Family trials |", "|---|---|---|---|---|---|"]
    for key, label, old in picks:
        v = by_id[key]
        lines.append(f"| {label} | {num(v['full']['sharpe'])} | {num(old)} | {num(v['dsr_lab'])} | {num(v['dsr_family'])} | {v['family_trials']} |")
    return "\n".join(lines)


def family_table(summary):
    lines = ["| Asset class | Trials | Tradable | Variance of annual Sharpe | Expected best zero-edge Sharpe |", "|---|---|---|---|---|"]
    for name in FAMILIES:
        f = summary["families"].get(name)
        if f:
            lines.append(f"| {name} | {f['n_trials']} | {f['n_tradable']} | {num(f['sr_ann_var'], 3)} | {num(f['expected_max_sharpe_ann'])} |")
    lines.append(f"| Pooled | {summary['n_trials']} | n/a | {num(summary['sr_ann_var_executable'], 3)} | {num(summary['expected_max_sharpe_ann'])} |")
    return "\n".join(lines)


def build(prose):
    rows = [json.loads(p.read_text()) for p in sorted((OUT / "trials").glob("*.json"))]
    summary = json.loads((OUT / "summary.json").read_text())
    rep = [v for v in rows if v["reported"]]
    cz = [v for v in rep if v["origin"] == "chen-zimmermann"]
    all_cz = [v for v in rows if v["origin"] == "chen-zimmermann"]
    facts = {
        "n_trials": summary["n_trials"], "n_cz": summary["by_origin"]["chen-zimmermann"], "n_legacy": summary["by_origin"]["legacy"],
        "n_new": summary["by_origin"]["new"], "var": num(summary["sr_ann_var_executable"]), "var_all": num(summary["sr_ann_var_all"], 1),
        "emax": num(summary["expected_max_sharpe_ann"]), "n_survived": sum(v["survived"] for v in rep), "n_held": sum(v["held_oos"] and not v["survived"] and not v["passes_family"] for v in rep),
        "n_failed": sum(v["oos"]["sharpe"] <= 0 for v in rep), "n_positive": sum(v["oos"]["sharpe"] > 0 for v in rep),
        "cz_is": num(float(np.median([v["is"]["sharpe"] for v in cz]))), "cz_oos": num(float(np.median([v["oos"]["sharpe"] for v in cz]))),
        "cz_t2": sum(v["oos"]["t"] >= 2 for v in cz), "cz_min_t": num(min(v["meta"]["insample_t"] for v in cz), 1),
        "n_mid": sum(v["split_rule"] == "midpoint" for v in rep),
        "scorecard": scorecard(rep), "n_reported_failed_or_weak": sum(not v["held_oos"] and v["executable"] for v in rep),
        "n_trail": sum(verdict(v).startswith("Trails") for v in rep), "n_weak": sum(verdict(v) == "Weak" for v in rep),
        "n_indicative": sum(not v["price_valid"] for v in rep),
        "n_published": sum(v["price_valid"] and not v["executable"] for v in rep), "n_paid": sum(v["needs_paid_data"] for v in rep),
        "n_tradable": sum(v["executable"] for v in rep),
        "n_pub_pass": sum(v["stat_pooled"] and not v["executable"] for v in rep), "n_pub_held": sum(v["held_stat"] and not v["stat_pooled"] and not v["executable"] for v in rep),
        "published_pass": listing([v for v in rep if v["held_stat"] and not v["executable"]]), "n_failed_exec": sum(verdict(v) == "Failed" for v in rep),
        "family_table": family_table(summary), "passes_family": listing([v for v in rep if v["passes_family"] and not v["survived"]]),
        "n_family": sum(v["passes_family"] and not v["survived"] for v in rep),
        "all_is": num(float(np.median([v["is"]["sharpe"] for v in all_cz]))), "all_oos": num(float(np.median([v["oos"]["sharpe"] for v in all_cz]))),
        "all_t2": sum(v["oos"]["t"] >= 2 for v in all_cz), "n_all_cz": len(all_cz), "n_rest": sum(not v["reported"] for v in all_cz),
        "rest_is": num(float(np.median([v["is"]["sharpe"] for v in all_cz if not v["reported"]]))),
        "rest_oos": num(float(np.median([v["oos"]["sharpe"] for v in all_cz if not v["reported"]]))),
        "legacy": legacy_table(rows), "n_tests": TESTS,
        "survived": listing([v for v in rep if v["survived"]]),
        "held": listing([v for v in rep if v["held_oos"] and not v["survived"] and not v["passes_family"]]),
        "indicative": listing([v for v in rep if not v["price_valid"]]),
    }
    tables = []
    for fam in FAMILIES:
        items = sorted([v for v in rep if v["family"] == fam], key=lambda v: (v["origin"] != "new", v["title"]))
        if items:
            tables.append(f"### {fam}\n\n{HEAD}\n" + "\n".join(row(v) for v in items))
    facts["tables"] = "\n\n".join(tables)
    hand = sorted([v for v in rep if v["origin"] == "new"], key=lambda v: (FAMILIES.index(v["family"]), v["title"]))
    facts["construction"] = "\n".join(["| Strategy | Function | Asset | Rule and data |", "|---|---|---|---|"] +
                                      [f"| {v['title']} | `{v['id']}` | {v['asset']} | {v['note'] or 'Card rule as written'} |" for v in hand])
    return prose.format(**facts), facts


def main():
    import sys
    global TESTS
    TESTS = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    prose = (ROOT / "results100.template.md").read_text()
    text, _ = build(prose)
    (ROOT / "RESULTS-100.md").write_text(text)
    print(len(text.splitlines()), "lines")


if __name__ == "__main__":
    main()
