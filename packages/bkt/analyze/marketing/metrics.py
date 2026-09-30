from __future__ import annotations

import datetime as dt
from collections import defaultdict
from typing import Callable

import numpy as np

MAD_SCALE = 1.4826
ANOMALY_Z = 3.5
WEEKDAY_MIN_DAYS = 28
COHORT_MONTHS = 12
TOP_CAMPAIGNS = 20


def ratio(num: float | None, den: float | None) -> float | None:
    if num is None or den is None or den == 0:
        return None
    return num / den


def total(rows: list[dict], f: str) -> float | None:
    vals = [r[f] for r in rows if r.get(f) is not None]
    return float(sum(vals)) if vals else None


def funnel(rows: list[dict]) -> dict:
    t = {f: total(rows, f) for f in ("spend", "impressions", "clicks", "conversions", "revenue", "sessions")}
    return {**t, "ctr": ratio(t["clicks"], t["impressions"]), "cpc": ratio(t["spend"], t["clicks"]),
            "cpa": ratio(t["spend"], t["conversions"]), "roas": ratio(t["revenue"], t["spend"])}


def grouped(rows: list[dict], key: str) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        out[r.get(key) or "unattributed"].append(r)
    return dict(out)


def channel_mix(ad: list[dict]) -> dict:
    groups = grouped(ad, "channel")
    spend = {k: total(v, "spend") or 0.0 for k, v in groups.items()}
    whole = sum(spend.values())
    out = {}
    for k, v in sorted(groups.items(), key=lambda kv: -spend[kv[0]]):
        out[k] = {**funnel(v), "share": ratio(spend[k], whole)}
    return out


def campaigns(ad: list[dict]) -> list[dict]:
    groups = grouped(ad, "campaign")
    rows = [{"campaign": k, **funnel(v)} for k, v in groups.items()]
    rows.sort(key=lambda r: -(r["spend"] or 0.0))
    return rows[:TOP_CAMPAIGNS]


def month_of(day: str) -> str:
    return day[:7]


def months_between(a: str, b: str) -> int:
    return (int(b[:4]) - int(a[:4])) * 12 + int(b[5:7]) - int(a[5:7])


def customers(txn: list[dict]) -> dict:
    dated = [t for t in txn if t["date"] and t["revenue"] is not None]
    first: dict[str, str] = {}
    revenue: dict[str, float] = defaultdict(float)
    for t in sorted(dated, key=lambda t: t["date"]):
        first.setdefault(t["customer"], t["date"])
        revenue[t["customer"]] += t["revenue"]
    return {"first": first, "revenue": dict(revenue), "rows": dated}


def cohorts(cust: dict) -> dict:
    first_month = {c: month_of(d) for c, d in cust["first"].items()}
    active: dict[str, list[set]] = defaultdict(lambda: [set() for _ in range(COHORT_MONTHS)])
    for t in cust["rows"]:
        m0 = first_month[t["customer"]]
        k = months_between(m0, month_of(t["date"]))
        if 0 <= k < COHORT_MONTHS:
            active[m0][k].add(t["customer"])
    out = []
    for m0 in sorted(active):
        size = len(active[m0][0])
        out.append({"cohort": m0, "customers": size, "retention": [ratio(len(s), size) for s in active[m0]]})
    return {"months": COHORT_MONTHS, "rows": out}


def attribution(txn: list[dict]) -> dict:
    with_channel = [t for t in txn if t.get("channel") and t["revenue"] is not None and t["date"]]
    if not with_channel:
        return {"skipped": "no transaction file carries a channel column"}
    paths: dict[str, list[str]] = defaultdict(list)
    value: dict[str, float] = defaultdict(float)
    for t in sorted(with_channel, key=lambda t: t["date"]):
        p = paths[t["customer"]]
        if not p or p[-1] != t["channel"]:
            p.append(t["channel"])
        value[t["customer"]] += t["revenue"]
    last: dict[str, float] = defaultdict(float)
    linear: dict[str, float] = defaultdict(float)
    for c, p in paths.items():
        last[p[-1]] += value[c]
        for ch in p:
            linear[ch] += value[c] / len(p)
    return {"model": "customer paths from the channel on each order; a heuristic, no causal claim",
            "customers": len(paths), "revenue": float(sum(value.values())),
            "last_touch": dict(sorted(last.items(), key=lambda kv: -kv[1])), "linear": dict(sorted(linear.items(), key=lambda kv: -kv[1]))}


def step_of(dates: list[str]) -> str:
    ds = sorted({dt.date.fromisoformat(d) for d in dates})
    if len(ds) < 2:
        return "day"
    gap = float(np.median(np.diff([d.toordinal() for d in ds])))
    return "month" if gap >= 28 else "week" if gap >= 7 else "day"


def periods(start: dt.date, end: dt.date, step: str) -> list[str]:
    if step == "month":
        out, y, m = [], start.year, start.month
        while (y, m) <= (end.year, end.month):
            out.append(f"{y:04d}-{m:02d}")
            y, m = (y + 1, 1) if m == 12 else (y, m + 1)
        return out
    n = 7 if step == "week" else 1
    return [(start + dt.timedelta(days=i)).isoformat() for i in range(0, (end - start).days + 1, n)]


def daily(rows: list[dict], f: str) -> tuple[list[str], np.ndarray, int, str]:
    dated = [r for r in rows if r.get("date") and r.get(f) is not None]
    if not dated:
        return [], np.array([]), 0, "day"
    step = step_of([r["date"] for r in dated])
    start = dt.date.fromisoformat(min(r["date"] for r in dated))
    end = dt.date.fromisoformat(max(r["date"] for r in dated))
    keys = periods(start, end, step)
    by: dict[str, float] = defaultdict(float)
    for r in dated:
        d = dt.date.fromisoformat(r["date"])
        k = r["date"][:7] if step == "month" else (start + dt.timedelta(days=7 * ((d - start).days // 7))).isoformat() if step == "week" else r["date"]
        by[k] += r[f]
    filled = sum(1 for k in keys if k not in by)
    return keys, np.array([by.get(k, 0.0) for k in keys], dtype=float), filled, step


def anomalies(days: list[str], y: np.ndarray) -> dict:
    if len(y) < 7:
        return {"skipped": "needs 7 periods"}
    med = float(np.median(y))
    mad = float(np.median(np.abs(y - med)))
    if mad == 0:
        return {"skipped": "median absolute deviation is zero", "median": med}
    z = np.abs(y - med) / (MAD_SCALE * mad)
    hits = np.where(z > ANOMALY_Z)[0]
    return {"method": "median-MAD z", "cutoff": ANOMALY_Z, "median": med, "mad": mad,
            "days": [{"date": days[i], "value": float(y[i]), "z": float(z[i])} for i in hits[:50]]}


def weekday_profile(days: list[str], y: np.ndarray) -> dict | None:
    if len(y) < WEEKDAY_MIN_DAYS or y.mean() == 0 or len(days[0]) != 10:
        return None
    wd = np.array([dt.date.fromisoformat(d).weekday() for d in days])
    mean = float(y.mean())
    names = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
    return {names[k]: float(y[wd == k].mean() / mean) for k in range(7)}


def series(rows: list[dict], f: str, trend: Callable) -> dict | None:
    days, y, filled, step = daily(rows, f)
    if len(days) < 3:
        return None
    t = np.arange(len(days), dtype=float)
    ts = trend(t, y)
    return {"start": days[0], "end": days[-1], "step": step, "periods": len(days), "zero_filled": filled, "total": float(y.sum()),
            "trend": {k: ts[k] for k in ("slope", "intercept", "r2", "direction")}, "slope_unit": f"per {step}",
            "season": ts["season"], "acf_bound": ts["acf_bound"], "weekday": weekday_profile(days, y) if step == "day" else None,
            "anomalies": anomalies(days, y)}


def blended(ad: list[dict], txn: list[dict], cust: dict) -> dict:
    ad_days = [r["date"] for r in ad if r["date"] and r.get("spend") is not None]
    txn_days = [t["date"] for t in cust["rows"]]
    out: dict = {"ltv_hist": ratio(sum(cust["revenue"].values()) if cust["revenue"] else None, float(len(cust["revenue"])) if cust["revenue"] else None),
                 "ltv_window": [min(txn_days), max(txn_days)] if txn_days else None}
    if not ad_days or not txn_days:
        missing = "an ad spend file" if not ad_days else "a transaction file"
        return {**out, "cac": None, "roas": None, "range": None, "reason": f"CAC and blended ROAS need {missing} in the same analysis"}
    lo, hi = max(min(ad_days), min(txn_days)), min(max(ad_days), max(txn_days))
    if lo > hi:
        return {**out, "cac": None, "roas": None, "range": None, "reason": "the ad and transaction files share no dates"}
    spend = sum(r["spend"] for r in ad if r["date"] and lo <= r["date"] <= hi and r.get("spend") is not None)
    revenue = sum(t["revenue"] for t in cust["rows"] if lo <= t["date"] <= hi)
    new = sum(1 for d in cust["first"].values() if lo <= d <= hi)
    return {**out, "range": [lo, hi], "spend": spend, "revenue": revenue, "new_customers": new,
            "cac": ratio(spend, float(new)), "roas": ratio(revenue, spend)}


def compute(ad: list[dict], txn: list[dict], trend: Callable) -> dict:
    cust = customers(txn)
    out: dict = {
        "ad_rows": len(ad), "transactions": len(txn),
        "funnel": funnel(ad) if ad else None,
        "channels": channel_mix(ad) if ad else {},
        "campaigns": campaigns(ad) if ad else [],
        "orders": {"count": len(cust["rows"]), "customers": len(cust["first"]), "revenue": total(cust["rows"], "revenue")} if txn else None,
        "blended": blended(ad, txn, cust),
        "cohorts": cohorts(cust) if cust["rows"] else {"skipped": "no dated transactions"},
        "attribution": attribution(txn) if txn else {"skipped": "no transaction file"},
        "series": {},
    }
    for label, rows, f in (("spend", ad, "spend"), ("conversions", ad, "conversions"), ("sessions", ad, "sessions"), ("revenue", txn or ad, "revenue")):
        s = series(rows, f, trend)
        if s:
            out["series"][label] = s
    return out
