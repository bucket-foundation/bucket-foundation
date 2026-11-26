#!/usr/bin/env python3
import argparse
import csv
import json
import sys
from dataclasses import dataclass

import numpy as np
from scipy import stats

EXPERIMENT_ID = "ci14-share-v1"
ARMS = ("s50", "s70", "s90")
REFERENCE = "s70"
CONTRASTS = (("s50", "s70"), ("s90", "s70"))
A2_TOP_TIER = 6
ALPHA = 0.05
TARGET_PER_ARM = 354
COMPLETE_PER_ARM = 212
ATTRITION = 0.4
EFFECT_D = 0.3
OUTCOME_SD = 300.0
HARM_RETENTION_GAP = 0.15
HARM_CHECK_PER_ARM = 150


def fnv1a32(s):
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def stratum(tier):
    return "to-a2" if tier <= A2_TOP_TIER else "past-a2"


def assign_arm(key, tier):
    return ARMS[fnv1a32(f"{EXPERIMENT_ID}:{stratum(tier)}:{key}") % len(ARMS)]


def enrolments(session_rows):
    out = {}
    for r in sorted(session_rows, key=lambda r: r["at"]):
        arm = r.get("arm")
        if arm not in ARMS or r["device"] in out:
            continue
        if assign_arm(r["device"], r["tier"]) != arm:
            raise ValueError(f"arm {arm} does not match the hash assignment for {r['device']}")
        out[r["device"]] = {"device": r["device"], "arm": arm, "tier": r["tier"], "enrolled_at": r["at"]}
    return list(out.values())


def yes_no_known(hits, words, false_alarms, pseudowords, bank):
    h = hits / words if words else 0.0
    f = false_alarms / pseudowords if pseudowords else 0.0
    if f >= 1:
        return 0.0
    return max(0.0, min(1.0, (h - f) / (1 - f))) * bank


@dataclass
class Contrast:
    arm: str
    ref: str
    estimate: float
    se: float
    p: float
    p_holm: float
    d: float
    reject: bool


def holm(pvalues, alpha=ALPHA):
    order = np.argsort(pvalues)
    m = len(pvalues)
    adj = np.empty(m)
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvalues[i]))
        adj[i] = running
    return adj, adj <= alpha


def design(rows):
    x = []
    for r in rows:
        x.append([1.0, float(r["arm"] == "s50"), float(r["arm"] == "s90"), float(stratum(r["tier"]) == "past-a2"), float(r["baseline"])])
    return np.array(x)


def ancova(rows):
    obs = [r for r in rows if r.get("outcome") is not None]
    X = design(obs)
    y = np.array([float(r["outcome"]) for r in obs])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    dof = len(y) - X.shape[1]
    sigma2 = float(resid @ resid) / dof
    cov = sigma2 * np.linalg.inv(X.T @ X)
    return beta, cov, dof, float(np.sqrt(sigma2))


def contrasts_from(beta, cov, dof, sd, alpha=ALPHA):
    idx = {"s50": 1, "s90": 2}
    est = [float(beta[idx[a]]) for a, _ in CONTRASTS]
    se = [float(np.sqrt(cov[idx[a], idx[a]])) for a, _ in CONTRASTS]
    p = np.array([2 * stats.t.sf(abs(e / s), dof) for e, s in zip(est, se)])
    adj, rej = holm(p, alpha)
    return [Contrast(a, ref, e, s, float(pi), float(pa), e / sd, bool(r)) for (a, ref), e, s, pi, pa, r in zip(CONTRASTS, est, se, p, adj, rej)]


def primary(rows, alpha=ALPHA):
    beta, cov, dof, sd = ancova(rows)
    return contrasts_from(beta, cov, dof, sd, alpha)


def multiple_imputation(rows, m=20, seed=0, alpha=ALPHA):
    rng = np.random.default_rng(seed)
    beta, cov, dof, sd = ancova(rows)
    ests, variances = [], []
    for _ in range(m):
        b = rng.multivariate_normal(beta, cov)
        s = sd * np.sqrt(dof / rng.chisquare(dof))
        filled = []
        for r in rows:
            if r.get("outcome") is None:
                x = design([r])[0]
                r = dict(r, outcome=float(x @ b + rng.normal(0, s)))
            filled.append(r)
        bi, ci, _, _ = ancova(filled)
        ests.append([bi[1], bi[2]])
        variances.append([ci[1, 1], ci[2, 2]])
    ests, variances = np.array(ests), np.array(variances)
    qbar = ests.mean(axis=0)
    within = variances.mean(axis=0)
    between = ests.var(axis=0, ddof=1)
    total = within + (1 + 1 / m) * between
    r = (1 + 1 / m) * between / within
    nu = (m - 1) * (1 + 1 / r) ** 2
    p = np.array([2 * stats.t.sf(abs(q / np.sqrt(t)), v) for q, t, v in zip(qbar, total, nu)])
    adj, rej = holm(p, alpha)
    return [Contrast(a, ref, float(q), float(np.sqrt(t)), float(pi), float(pa), float(q) / sd, bool(rj)) for (a, ref), q, t, pi, pa, rj in zip(CONTRASTS, qbar, total, p, adj, rej)]


def harm_stop(retention_by_arm, enrolled_by_arm):
    if min(enrolled_by_arm.get(a, 0) for a in ARMS) < HARM_CHECK_PER_ARM:
        return False
    ref = retention_by_arm[REFERENCE]
    return any(ref - retention_by_arm[a] >= HARM_RETENTION_GAP for a in ARMS if a != REFERENCE)


def simulate(per_arm=TARGET_PER_ARM, d50=-EFFECT_D, d90=EFFECT_D, attrition=ATTRITION, seed=1):
    rng = np.random.default_rng(seed)
    rows = []
    i = 0
    counts = {a: 0 for a in ARMS}
    while min(counts.values()) < per_arm:
        key = f"sim-{seed}-{i}"
        i += 1
        tier = int(rng.integers(0, 13))
        arm = assign_arm(key, tier)
        if counts[arm] >= per_arm:
            continue
        counts[arm] += 1
        baseline = max(0.0, rng.normal(300 + 60 * tier, 150))
        shift = {"s50": d50, "s70": 0.0, "s90": d90}[arm] * OUTCOME_SD
        mean = 150 + 0.9 * baseline + 40 * (tier > A2_TOP_TIER) + shift
        outcome = float(rng.normal(mean, OUTCOME_SD))
        dropout = rng.random() < attrition * (1.2 if tier <= 2 else 0.9)
        rows.append({"device": key, "arm": arm, "tier": tier, "baseline": baseline, "outcome": None if dropout else outcome})
    return rows


def power(sims=500, per_arm=TARGET_PER_ARM, seed=7):
    hits = np.zeros(2)
    for s in range(sims):
        res = primary(simulate(per_arm=per_arm, seed=seed * 100_000 + s))
        hits += [c.reject for c in res]
    return (hits / sims).tolist()


def analytic_per_arm(d=EFFECT_D, alpha=ALPHA, power_target=0.8, comparisons=2):
    z_a = stats.norm.ppf(1 - alpha / comparisons / 2)
    z_b = stats.norm.ppf(power_target)
    complete = int(np.ceil(2 * (z_a + z_b) ** 2 / d**2))
    return complete, int(np.ceil(complete / (1 - ATTRITION)))


def report(rows):
    out = {"enrolled": {a: sum(r["arm"] == a for r in rows) for a in ARMS}, "observed": {a: sum(r["arm"] == a and r.get("outcome") is not None for r in rows) for a in ARMS}}
    out["primary"] = [c.__dict__ for c in primary(rows)]
    out["sensitivity_mi"] = [c.__dict__ for c in multiple_imputation(rows)]
    return out


def read_csv(path):
    with open(path) as f:
        return [{"device": r["device"], "arm": r["arm"], "tier": int(r["tier"]), "baseline": float(r["baseline"]), "outcome": float(r["outcome"]) if r["outcome"] else None} for r in csv.DictReader(f)]


def write_csv(rows, path):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["device", "arm", "tier", "baseline", "outcome"])
        w.writeheader()
        for r in rows:
            w.writerow({**r, "outcome": "" if r["outcome"] is None else r["outcome"]})


def main(argv=None):
    p = argparse.ArgumentParser(prog="ci14_analysis")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("simulate")
    s.add_argument("--out", required=True)
    s.add_argument("--per-arm", type=int, default=TARGET_PER_ARM)
    s.add_argument("--d50", type=float, default=-EFFECT_D)
    s.add_argument("--d90", type=float, default=EFFECT_D)
    s.add_argument("--seed", type=int, default=1)
    a = sub.add_parser("analyze")
    a.add_argument("csv")
    w = sub.add_parser("power")
    w.add_argument("--sims", type=int, default=500)
    w.add_argument("--per-arm", type=int, default=TARGET_PER_ARM)
    args = p.parse_args(argv)
    if args.cmd == "simulate":
        write_csv(simulate(args.per_arm, args.d50, args.d90, seed=args.seed), args.out)
    elif args.cmd == "analyze":
        json.dump(report(read_csv(args.csv)), sys.stdout, indent=1)
        print()
    else:
        complete, enrol = analytic_per_arm()
        json.dump({"analytic_complete_per_arm": complete, "analytic_enrol_per_arm": enrol, "simulated_power": power(args.sims, args.per_arm)}, sys.stdout, indent=1)
        print()


if __name__ == "__main__":
    main()
