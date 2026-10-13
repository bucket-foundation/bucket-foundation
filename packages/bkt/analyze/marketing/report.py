from __future__ import annotations

import re

UNSAFE = re.compile(r"([\\`*_\[\]<>|])")


def esc(v) -> str:
    s = str(v).replace("\n", " ").replace("\r", " ")
    return UNSAFE.sub(r"\\\1", s)


def num(v, pct: bool = False) -> str:
    if v is None:
        return "-"
    if pct:
        return f"{100 * v:.2f}%"
    return f"{v:,.2f}" if abs(v) < 1e15 else f"{v:.4g}"


def markdown(m: dict) -> list[str]:
    L = ["", "## Marketing", ""]
    L += [f"- `{esc(s['file'])}`: {esc(s['platform'] or 'no marketing columns found')}" + (f", {s['grain']} rows {s['rows']}" if s.get("grain") else "") for s in m["sources"]]
    for w in m["warnings"]:
        L.append(f"- `{w['code']}` {esc(w['where'])}: {esc(w['message'])}")
    L.append(f"- Dates: {m['date_rule']}.")
    for cur, r in m["by_currency"].items():
        L += ["", f"### Currency {esc(cur)}", ""]
        f = r["funnel"]
        if f:
            L += [f"Spend {num(f['spend'])}, impressions {num(f['impressions'])}, clicks {num(f['clicks'])}, conversions {num(f['conversions'])}, platform revenue {num(f['revenue'])}.",
                  f"CTR {num(f['ctr'], True)} {m['citations']['ctr']}, CPC {num(f['cpc'])} {m['citations']['cpc']}, CPA {num(f['cpa'])} {m['citations']['cpa']}, ROAS {num(f['roas'])} {m['citations']['roas']}.", ""]
        if r["channels"]:
            L += ["| channel | spend | share | CTR | CPA | ROAS |", "|---|---|---|---|---|---|"]
            L += [f"| {esc(k)} | {num(v['spend'])} | {num(v['share'], True)} | {num(v['ctr'], True)} | {num(v['cpa'])} | {num(v['roas'])} |" for k, v in r["channels"].items()]
            L.append(f"Shares sum to one {m['citations']['share']}.")
        b = r["blended"]
        L += ["", f"Blended CAC {num(b.get('cac'))} {m['citations']['cac']}, blended ROAS {num(b.get('roas'))}, historical LTV {num(b.get('ltv_hist'))} {m['citations']['ltv_hist']}"
              + (f" over {b['ltv_window'][0]} to {b['ltv_window'][1]}" if b.get("ltv_window") else "") + "."]
        if b.get("reason"):
            L.append(esc(b["reason"]) + ".")
        c = r["cohorts"]
        if "rows" in c and c["rows"]:
            L += ["", f"Cohort retention by first-order month {m['citations']['retention']}:", ""]
            L += [f"- {c_['cohort']} ({c_['customers']}): " + " ".join(num(x, True) for x in c_["retention"][:6]) for c_ in c["rows"][:24]]
        a = r["attribution"]
        if "last_touch" in a:
            L += ["", f"Attribution, {esc(a['model'])} {m['citations']['last_touch']} {m['citations']['linear']}:", ""]
            L += [f"- {esc(k)}: last touch {num(v)}, linear {num(a['linear'].get(k))}" for k, v in a["last_touch"].items()]
        for label, s in r["series"].items():
            season = f"lag {s['season']['lag']} {s['step']}s" if s["season"] else "none"
            an = s["anomalies"]
            flagged = len(an.get("days", [])) if "days" in an else an.get("skipped")
            L.append(f"- {label}: {s['start']} to {s['end']}, slope {num(s['trend']['slope'])} {s['slope_unit']}, r2 {num(s['trend']['r2'])}, season {season}, anomalies {flagged}")
    return L
