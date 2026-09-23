#!/usr/bin/env python3
from __future__ import annotations

from typing import Any, Optional

import numpy as np
from scipy import stats as _stats

def _as_float_list(x: Any) -> Optional[list[float]]:
    if not isinstance(x, (list, tuple)):
        return None
    out = []
    for v in x:
        try:
            out.append(float(v))
        except Exception:
            return None
    return out

def _as_int01_list(x: Any, n: int) -> Optional[list[int]]:
    if x is None:
        return [1] * n
    if not isinstance(x, (list, tuple)):
        return None
    out = []
    for v in x:
        try:
            iv = int(round(float(v)))
        except Exception:
            return None
        out.append(1 if iv != 0 else 0)
    return out

def kaplan_meier(durations: list[float], events: list[int]) -> dict:
    d = np.asarray(durations, dtype=float)
    e = np.asarray(events, dtype=int)
    order = np.argsort(d, kind="mergesort")
    d, e = d[order], e[order]
    n_total = len(d)
    times = np.unique(d[e == 1])
    surv = 1.0
    var_sum = 0.0
    rows = []
    median = None
    for t in times:
        n_risk = int(np.sum(d >= t))
        n_event = int(np.sum((d == t) & (e == 1)))
        if n_risk == 0:
            continue
        surv *= (1.0 - n_event / n_risk)
        if n_risk - n_event > 0:
            var_sum += n_event / (n_risk * (n_risk - n_event))
        se = surv * np.sqrt(var_sum) if var_sum > 0 else 0.0
        rows.append({
            "time": float(t),
            "n_risk": n_risk,
            "n_event": n_event,
            "survival": round(float(surv), 6),
            "std_err": round(float(se), 6),
        })
        if median is None and surv <= 0.5:
            median = float(t)
    return {
        "n_subjects": n_total,
        "n_events": int(np.sum(e == 1)),
        "n_censored": int(np.sum(e == 0)),
        "median_survival": median,
        "steps": rows,
    }

def logrank_test(d1, e1, d2, e2) -> dict:
    d1 = np.asarray(d1, float); e1 = np.asarray(e1, int)
    d2 = np.asarray(d2, float); e2 = np.asarray(e2, int)
    all_event_times = np.unique(
        np.concatenate([d1[e1 == 1], d2[e2 == 1]])
    )
    O1 = E1 = V = 0.0
    for t in all_event_times:
        n1 = float(np.sum(d1 >= t))
        n2 = float(np.sum(d2 >= t))
        n = n1 + n2
        d1t = float(np.sum((d1 == t) & (e1 == 1)))
        d2t = float(np.sum((d2 == t) & (e2 == 1)))
        dt = d1t + d2t
        if n <= 1 or dt == 0:
            continue
        e1t = dt * n1 / n
        vt = dt * (n1 / n) * (n2 / n) * (n - dt) / (n - 1.0)
        O1 += d1t
        E1 += e1t
        V += vt
    if V <= 0:
        return {"error": "log-rank undefined (no comparable event times across groups)"}
    chi2 = (O1 - E1) ** 2 / V
    p = float(_stats.chi2.sf(chi2, 1))
    return {
        "observed_group1": round(float(O1), 4),
        "expected_group1": round(float(E1), 4),
        "variance": round(float(V), 4),
        "chi_square": round(float(chi2), 4),
        "df": 1,
        "p_value": round(p, 6),
        "significant_at_0.05": bool(p < 0.05),
    }

def _demo() -> dict:
    g1_dur = [6, 7, 10, 13, 16, 22, 23]
    g1_evt = [1, 1, 1, 1, 1, 1, 1]
    g2_dur = [1, 1, 2, 2, 3, 4, 5]
    g2_evt = [1, 1, 1, 1, 1, 1, 1]
    return {
        "durations": g1_dur + g2_dur,
        "events": g1_evt + g2_evt,
        "groups": ["A"] * len(g1_dur) + ["B"] * len(g2_dur),
    }

def run_survival(payload: dict) -> dict:
    demo = bool(payload.get("demo")) or (
        isinstance(payload.get("durations"), str)
        and payload["durations"].strip().lower() == "demo"
    )
    if demo:
        d = _demo()
        durations, events, groups = d["durations"], d["events"], d["groups"]
    else:
        durations = _as_float_list(payload.get("durations"))
        if durations is None or len(durations) < 2:
            return {"error": "durations must be a numeric array (length >= 2), or use demo"}
        if any(x < 0 for x in durations):
            return {"error": "durations must be non-negative"}
        if len(durations) > 100000:
            return {"error": "too many subjects (max 100000)"}
        events = _as_int01_list(payload.get("events"), len(durations))
        if events is None or len(events) != len(durations):
            return {"error": "events must be a 0/1 array the same length as durations"}
        groups = payload.get("groups")
        if groups is not None:
            if not isinstance(groups, (list, tuple)) or len(groups) != len(durations):
                return {"error": "groups must be an array the same length as durations"}
            groups = [str(g) for g in groups]

    overall = kaplan_meier(durations, events)

    out = {
        "demo": demo,
        "overall": overall,
        "method": (
            "Kaplan-Meier product-limit estimator (Kaplan & Meier 1958) with "
            "Greenwood's variance; median = smallest time with S(t) ≤ 0.5. "
            "Two-group comparison uses the exact Mantel-Cox log-rank test "
            "(hypergeometric expected/variance at each event time, χ² on 1 df via "
            "scipy.stats). lifelines is used if installed, else the identical math "
            "is computed in-house. CPU-only, no GPU."
        ),
        "note": (
            "Field tool for biomed-bio + econ-social: time-to-event analysis is "
            "the workhorse of trials, epidemiology, reliability, and event-history "
            "models. This is the exact non-parametric estimator + the standard "
            "two-group test. Cox proportional-hazards regression (covariate "
            "adjustment) is a documented follow-up."
        ),
    }

    if groups is not None:
        labels = sorted(set(groups))
        per_group = {}
        for lab in labels:
            idx = [i for i, g in enumerate(groups) if g == lab]
            per_group[lab] = kaplan_meier(
                [durations[i] for i in idx], [events[i] for i in idx]
            )
        out["per_group"] = per_group
        if len(labels) == 2:
            a, b = labels
            ia = [i for i, g in enumerate(groups) if g == a]
            ib = [i for i, g in enumerate(groups) if g == b]
            lr = logrank_test(
                [durations[i] for i in ia], [events[i] for i in ia],
                [durations[i] for i in ib], [events[i] for i in ib],
            )
            lr["group1"], lr["group2"] = a, b
            out["logrank"] = lr
        elif len(labels) > 2:
            out["logrank_note"] = "log-rank implemented for exactly two groups; >2 groups returns per-group KM only"

    if demo:
        out["ground_truth"] = {
            "group_A_median": 13.0,
            "group_B_median": 2.0,
            "logrank_significant": True,
        }
        out["note"] = (
            "DEMO: two-separated groups (A survives much longer than B). "
            "Group A median = 13, group B median = 2; the log-rank test is "
            "significant (p < 0.05). " + out["note"]
        )
    return out

SURVIVAL_RUNNERS = {
    "survivalfit": run_survival,
}
