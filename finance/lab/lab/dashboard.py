import math
from dataclasses import dataclass
from typing import Callable

import pandas as pd

from . import data

STALE_DAYS = {"daily": 10, "weekly": 21, "monthly": 75, "quarterly": 200}


class Missing(Exception):
    pass


def load(series):
    try:
        s = data.stablecoin_supply() if series == "STABLECOINS" else data.fred(series)
    except FileNotFoundError:
        raise Missing(f"{series} not in lab files")
    s = s.dropna()
    if s.empty:
        raise Missing(f"{series} has no observations")
    return s


def need(s, n):
    if len(s) < n:
        raise Missing(f"needs {n} observations, has {len(s)}")
    return s


def ago(s, days):
    past = s[s.index <= s.index[-1] - pd.Timedelta(days=days)]
    if past.empty:
        raise Missing(f"no observation {days} days back")
    return float(past.iloc[-1])


def last(s):
    return float(s.iloc[-1])


@dataclass(frozen=True)
class Row:
    section: str
    label: str
    freq: str
    basis: str
    rule: str
    read: Callable
    fmt: str = "{:.2f}"


def level(series, breach, scale=1.0):
    def read(get):
        s = get(series)
        v = last(s) * scale
        return v, s.index[-1], breach(v)
    return read


def absent(series):
    def read(get):
        raise Missing(f"{series} not in lab files")
    return read


def sofr_spread(get):
    d = ((get("SOFR") - get("IORB")) * 100).dropna()
    need(d, 5)
    return last(d), d.index[-1], bool((d.iloc[-5:] > 0).all() or last(d) > 15)


def reserves(get):
    s = need(get("WRESBAL") / 1000.0, 5)
    return last(s), s.index[-1], bool(s.iloc[-5] - last(s) >= 150 or last(s) < 2700)


def fed_assets(get):
    s = need(get("WALCL") / 1000.0, 2)
    return last(s), s.index[-1], abs(last(s) - float(s.iloc[-2])) > 50


def two_year(get):
    s = need(get("DGS2"), 2)
    return last(s), s.index[-1], abs(last(s) - float(s.iloc[-2])) >= 0.15


def term_premium(get):
    s = get("THREEFYTP10")
    return last(s), s.index[-1], last(s) - ago(s, 30) >= 0.30


def pct_change(series, periods, breach):
    def read(get):
        s = need(get(series), periods + 1)
        v = (last(s) / float(s.iloc[-1 - periods]) - 1) * 100
        return v, s.index[-1], breach(v)
    return read


def pct_since(series, days, limit):
    def read(get):
        s = get(series)
        return last(s), s.index[-1], abs(last(s) / ago(s, days) - 1) * 100 >= limit
    return read


def wti(get):
    s = need(get("DCOILWTICO"), 6)
    return last(s), s.index[-1], abs(last(s) / float(s.iloc[-6]) - 1) >= 0.10


def cfnai(get):
    s = need(get("CFNAI"), 3)
    v = float(s.iloc[-3:].mean())
    return v, s.index[-1], abs(v) > 0.70


def claims(get):
    s = need(get("ICSA"), 4)
    return last(s) / 1000.0, s.index[-1], float(s.iloc[-4:].mean()) > 250000


def payrolls(get):
    d = need(get("PAYEMS").diff().dropna(), 3)
    return last(d), d.index[-1], bool(last(d) < 0 or float(d.iloc[-3:].mean()) < 50)


def baa_spread(get):
    d = (get("BAA") - get("GS10")).dropna()
    if d.empty:
        raise Missing("BAA and GS10 share no dates")
    return last(d), d.index[-1], last(d) > 2.91


def stablecoins(get):
    s = get("STABLECOINS")
    return last(s) / 1e9, s.index[-1], last(s) / ago(s, 30) - 1 < -0.05


P, R, I, A, C, G = "Policy and plumbing", "Rates and curve", "Inflation", "Activity and labor", "Credit and stress", "Global and dollar"
ROWS = [
    Row(P, "Fed funds effective", "daily", "Sourced", "outside 3.75 to 4.00", level("EFFR", lambda v: not 3.75 <= v <= 4.00)),
    Row(P, "SOFR minus IORB, bp", "daily", "House", "above 0 for 5 days, or above +15 once", sofr_spread, "{:+.0f}"),
    Row(P, "Standing repo usage", "daily", "House", "above $0 outside quarter end", absent("RPONTSYD")),
    Row(P, "ON RRP, $B", "daily", "House", "above 100", level("RRPONTSYD", lambda v: v > 100), "{:,.1f}"),
    Row(P, "Reserve balances, $B", "weekly", "House", "fall of 150 in 4 weeks, or below 2,700", reserves, "{:,.1f}"),
    Row(P, "TGA, $B", "weekly", "Sourced", "above the 850 end-December target", level("WTREGEN", lambda v: v > 850, 0.001), "{:,.1f}"),
    Row(P, "Swap line usage", "weekly", "House", "above $5B", absent("SWPT")),
    Row(P, "Fed total assets, $B", "weekly", "House", "weekly change above 50", fed_assets, "{:,.1f}"),
    Row(R, "2-year yield", "daily", "House", "15 bp move in a day", two_year),
    Row(R, "10-year yield", "daily", "House", "above 5.31", level("DGS10", lambda v: v > 5.31)),
    Row(R, "10y minus 3m", "daily", "Sourced", "below 0", level("T10Y3M", lambda v: v < 0)),
    Row(R, "NY Fed recession probability", "monthly", "House", "above 30%", absent("NY Fed allmonth.xls")),
    Row(R, "Term premium, 10y", "weekly", "House", "rise of 30 bp in a month", term_premium),
    Row(R, "5y5y breakeven", "daily", "House", "above 2.50 or below 1.75", level("T5YIFR", lambda v: v > 2.50 or v < 1.75)),
    Row(R, "10y TIPS real yield", "daily", "House", "above 3.00", level("DFII10", lambda v: v > 3.00)),
    Row(R, "10y and 30y auctions", "daily", "House", "bid-to-cover below 2.30", absent("TreasuryDirect auctions")),
    Row(I, "Core CPI m/m, %", "monthly", "House", "0.40 or more", pct_change("CPILFESL", 1, lambda v: v >= 0.40)),
    Row(I, "Headline CPI y/y, %", "monthly", "House", "above 4.5", pct_change("CPIAUCSL", 12, lambda v: v > 4.5)),
    Row(I, "Core PCE y/y, %", "monthly", "Sourced", "above 3.4", pct_change("PCEPILFE", 12, lambda v: v > 3.4)),
    Row(I, "Median CPI", "monthly", "House", "above 4.0", absent("MEDCPIM158SFRBCLE")),
    Row(I, "Michigan 1y expectation", "monthly", "House", "above 5.0", level("MICH", lambda v: v > 5.0), "{:.1f}"),
    Row(I, "WTI, $", "daily", "House", "10% move in 5 days", wti),
    Row(A, "Sahm rule", "monthly", "Sourced", "0.50 or more", level("SAHMREALTIME", lambda v: v >= 0.50)),
    Row(A, "CFNAI 3-month mean", "monthly", "Sourced", "below -0.70 or above +0.70", cfnai),
    Row(A, "Initial claims, k", "weekly", "House", "4-week average above 250", claims, "{:,.0f}"),
    Row(A, "Payrolls change, k", "monthly", "House", "negative, or 3-month average below 50", payrolls, "{:+,.0f}"),
    Row(A, "GDPNow", "weekly", "House", "below 0.5", absent("GDPNOW")),
    Row(A, "Smoothed recession probability, %", "monthly", "House", "above 20", level("RECPROUSM156N", lambda v: v > 20)),
    Row(C, "NFCI", "weekly", "Sourced", "above 0", level("NFCI", lambda v: v > 0), "{:+.3f}"),
    Row(C, "STLFSI4", "weekly", "Sourced", "above 0", level("STLFSI4", lambda v: v > 0), "{:+.2f}"),
    Row(C, "HY OAS", "daily", "Lab", "above 4.61", level("BAMLH0A0HYM2", lambda v: v > 4.61)),
    Row(C, "Baa minus 10y", "monthly", "Lab", "above 2.91", baa_spread),
    Row(C, "VIX", "daily", "Lab", "above 28.5", level("VIXCLS", lambda v: v > 28.5)),
    Row(C, "SLOOS C&I tightening", "quarterly", "House", "above 20", level("DRTSCILM", lambda v: v > 20), "{:.1f}"),
    Row(G, "Broad dollar", "daily", "House", "3% move in a month", pct_since("DTWEXBGS", 30, 3.0)),
    Row(G, "USD/JPY", "daily", "House", "3% move in a week", pct_since("DEXJPUS", 7, 3.0)),
    Row(G, "Foreign official Treasuries", "monthly", "House", "fall above $100B in a month", absent("TIC table 5")),
    Row(G, "Offshore USD credit", "quarterly", "House", "y/y growth above 10%", absent("BIS GLI")),
    Row(G, "Stablecoin supply, $B", "daily", "House", "30-day fall above 5%", stablecoins, "{:,.1f}"),
]


def build(today, get=load, rows=ROWS):
    out = []
    for row in rows:
        item = {"section": row.section, "label": row.label, "basis": row.basis, "rule": row.rule, "value": None, "asof": None, "status": "missing",
                "why": ""}
        try:
            value, asof, breach = row.read(get)
            if value is None or not math.isfinite(value):
                raise Missing("reading is not a number")
            age = (pd.Timestamp(today) - pd.Timestamp(asof)).days
            item.update(value=row.fmt.format(value), asof=str(asof)[:10],
                        status="stale" if age > STALE_DAYS[row.freq] else "ALERT" if breach else "ok")
        except Missing as e:
            item["why"] = str(e)
        out.append(item)
    return out


def render(items):
    lines, section = [], None
    for it in items:
        if it["section"] != section:
            section = it["section"]
            lines.append(f"{section}:")
        tag = f"[{it['basis']}]"
        if it["status"] == "missing":
            lines.append(f"  {it['label']}: MISSING, {it['why']}. Alert rule {it['rule']} {tag}")
        else:
            mark = {"ok": "ok", "ALERT": "ALERT", "stale": "STALE, not scored"}[it["status"]]
            lines.append(f"  {it['label']}: {it['value']} on {it['asof']}, {mark}. Alert rule {it['rule']} {tag}")
    return lines


def summary(items):
    alerts = [it for it in items if it["status"] == "ALERT"]
    counts = {k: sum(it["status"] == k for it in items) for k in ("ok", "ALERT", "stale", "missing")}
    head = (f"{len(items)} gauges: {counts['ok']} ok, {counts['ALERT']} in alert, {counts['stale']} stale, {counts['missing']} missing. "
            f"House thresholds are working levels with no source. No gauge changes a position.")
    return head, [f"{it['label']} {it['value']} on {it['asof']}: {it['rule']} [{it['basis']}]" for it in alerts]


PLAIN = {
    "Fed funds effective": "The Fed's overnight rate is {value}%, outside the range the Fed set, a sign it is losing its grip on short-term rates.",
    "SOFR minus IORB, bp": "Banks are paying more to borrow overnight than the Fed pays them, a sign cash is tight.",
    "ON RRP, $B": "Money funds parked more than $100 billion at the Fed overnight, a sign spare cash is piling up.",
    "Reserve balances, $B": "Cash that banks hold at the Fed is low or falling fast at ${value} billion, which has come before funding scares.",
    "TGA, $B": "The Treasury is sitting on ${value} billion of cash, above its own target, which pulls money out of the banking system.",
    "Fed total assets, $B": "The Fed's balance sheet moved more than $50 billion in a week, so it is adding or draining money faster than usual.",
    "2-year yield": "The 2-year Treasury rate jumped in one day to {value}%, so markets changed their mind about the Fed.",
    "10-year yield": "The 10-year Treasury rate is {value}%, above its October peak, which raises mortgage and loan costs.",
    "10y minus 3m": "Long-term rates fell below short-term rates, a pattern that has come before recessions.",
    "Term premium, 10y": "Investors want more extra pay to hold long bonds than a month ago, which pushes long-term rates up.",
    "5y5y breakeven": "Markets expect long-run inflation of {value}%, outside the comfortable zone around 2%.",
    "10y TIPS real yield": "Rates after inflation are {value}%, above 3%, which weighs on stocks, gold and housing.",
    "Core CPI m/m, %": "Prices outside food and energy rose {value}% in a month, fast enough to keep the Fed from cutting rates.",
    "Headline CPI y/y, %": "Prices are up {value}% from a year ago, above 4.5%, so cash and bonds lose buying power faster.",
    "Core PCE y/y, %": "The Fed's preferred inflation measure is {value}%, above the Fed's own forecast, which argues for higher rates.",
    "Michigan 1y expectation": "Households expect {value}% inflation over the next year, above 5%, which can feed into wages and prices.",
    "WTI, $": "Oil moved more than 10% in a week to ${value} a barrel, which feeds into gas prices and inflation.",
    "Sahm rule": "Unemployment has risen enough to trip a rule that marked the start of past recessions.",
    "CFNAI 3-month mean": "A broad index of US activity reads {value}, far from normal, which points to a sharp turn in growth.",
    "Initial claims, k": "New unemployment claims average more than 250,000 a week, a sign layoffs are rising.",
    "Payrolls change, k": "Job growth stalled: the economy changed by {value} thousand jobs last month.",
    "Smoothed recession probability, %": "A model puts the chance the US is in recession at {value}%.",
    "NFCI": "Borrowing is harder than average by the Chicago Fed's measure, which slows spending and hiring.",
    "STLFSI4": "Financial stress is above normal by the St. Louis Fed's measure.",
    "HY OAS": "Risky companies pay {value} points more than the government to borrow, the most in three years, a sign lenders are nervous.",
    "Baa minus 10y": "Mid-grade companies pay {value} points more than the government to borrow, a gap this wide shows up in 1 month of 10.",
    "VIX": "The stock market's fear gauge is {value}, a level reached on 1 day in 10, so expect bigger daily swings.",
    "SLOOS C&I tightening": "Many more banks are tightening business loans, which slows company spending.",
    "Broad dollar": "The dollar moved more than 3% in a month, which shifts import prices and the value of foreign earnings.",
    "USD/JPY": "The yen moved more than 3% against the dollar in a week, a move that has shaken global markets before.",
    "Stablecoin supply, $B": "The supply of dollar coins used in crypto fell more than 5% in a month to ${value} billion, a sign money is leaving crypto.",
}


def plain(items):
    return [PLAIN[it["label"]].format(value=it["value"].lstrip("+")) for it in items if it["status"] == "ALERT"]
