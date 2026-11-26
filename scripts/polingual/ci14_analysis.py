#!/usr/bin/env python3
import argparse
import csv
import json
import sys
from dataclasses import asdict, dataclass

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
CAP_DAYS = 120
TEST_DAY = 28
WINDOW_END_DAY = 35
IMPUTATIONS = 20
POWER_SIMS = 500
POWER_SEED = 7
TIPPING_DELTAS = (0.0, -0.1, -0.2, -0.3, -0.4, -0.5)
SECONDARY = ("input_hours", "retained_day28", "lapse_rate")


def fnv1a32(s):
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def stratum(tier):
    return "to-a2" if tier <= A2_TOP_TIER else "past-a2"


def enrolment_key(account, device):
    return f"acct:{account}" if account else f"dev:{device}"


def assign_arm(key):
    return ARMS[fnv1a32(f"{EXPERIMENT_ID}:{key}") % len(ARMS)]


def enrolments(session_rows):
    out = {}
    for r in sorted(session_rows, key=lambda r: r["at"]):
        arm = r.get("arm")
        if arm not in ARMS:
            continue
        key = enrolment_key(r.get("account"), r["device"])
        if key in out:
            if out[key]["arm"] != arm:
                raise ValueError(f"arm moved for {key}: {out[key]['arm']} then {arm}")
            continue
        if assign_arm(key) != arm:
            raise ValueError(f"arm {arm} does not match the hash assignment for {key}")
        out[key] = {"unit": key, "cluster": r.get("account") or key, "arm": arm, "enrolled_at": r["at"]}
    return list(out.values())


def yes_no_known(hits, words, false_alarms, pseudowords, bank=8000):
    h = hits / words if words else 0.0
    f = false_alarms / pseudowords if pseudowords else 0.0
    if f >= 1:
        return 0.0
    return max(0.0, min(1.0, (h - f) / (1 - f))) * bank


BAND_WIDTHS = (1000, 1000, 2000, 2000, 2000)


def band_weighted_known(hits_by_band, words_by_band, false_alarms, pseudowords):
    return sum(yes_no_known(h, w, false_alarms, pseudowords, width) for h, w, width in zip(hits_by_band, words_by_band, BAND_WIDTHS))


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
    pvalues = np.asarray(pvalues, dtype=float)
    order = np.argsort(pvalues)
    m = len(pvalues)
    adj = np.empty(m)
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvalues[i]))
        adj[i] = running
    return adj, adj <= alpha


def design(rows):
    return np.array([[1.0, float(r["arm"] == "s50"), float(r["arm"] == "s90"), float(r["stratum"] == "past-a2"), float(r["baseline"]), float(r.get("test_day") or TEST_DAY) - TEST_DAY] for r in rows])


def ols(rows, outcome="outcome"):
    obs = [r for r in rows if r.get(outcome) is not None]
    X = design(obs)
    y = np.array([float(r[outcome]) for r in obs])
    XtX_inv = np.linalg.inv(X.T @ X)
    beta = XtX_inv @ X.T @ y
    resid = y - X @ beta
    n, k = X.shape
    clusters = {}
    for i, r in enumerate(obs):
        clusters.setdefault(r.get("cluster") or r["unit"], []).append(i)
    g = len(clusters)
    meat = np.zeros((k, k))
    for idx in clusters.values():
        u = X[idx].T @ resid[idx]
        meat += np.outer(u, u)
    scale = (g / (g - 1)) * ((n - 1) / (n - k))
    cov = scale * XtX_inv @ meat @ XtX_inv
    sd = float(np.sqrt(resid @ resid / (n - k)))
    return beta, cov, g - 1, sd, XtX_inv


def contrasts_from(est, se, dof, sd, alpha=ALPHA):
    p = np.array([2 * stats.t.sf(abs(e / s), dof) for e, s in zip(est, se)])
    adj, rej = holm(p, alpha)
    return [Contrast(a, ref, float(e), float(s), float(pi), float(pa), float(e) / sd, bool(r)) for (a, ref), e, s, pi, pa, r in zip(CONTRASTS, est, se, p, adj, rej)]


def complete_case(rows, alpha=ALPHA):
    beta, cov, dof, sd, _ = ols(rows)
    return contrasts_from([beta[1], beta[2]], [np.sqrt(cov[1, 1]), np.sqrt(cov[2, 2])], dof, sd, alpha)


def multiple_imputation(rows, m=IMPUTATIONS, seed=0, alpha=ALPHA, delta=0.0, delta_arm=None):
    rng = np.random.default_rng(seed)
    beta, _, _, sd, XtX_inv = ols(rows)
    n_obs = sum(r.get("outcome") is not None for r in rows)
    dof_fit = n_obs - len(beta)
    ests, variances, dofs = [], [], []
    for _ in range(m):
        s = sd * np.sqrt(dof_fit / rng.chisquare(dof_fit))
        b = rng.multivariate_normal(beta, s**2 * XtX_inv)
        filled = []
        for r in rows:
            if r.get("outcome") is None:
                shift = delta * OUTCOME_SD if delta_arm is None or r["arm"] == delta_arm else 0.0
                r = dict(r, test_day=TEST_DAY, outcome=float(design([dict(r, test_day=TEST_DAY)])[0] @ b + rng.normal(0, s) + shift))
            filled.append(r)
        bi, ci, dof, _, _ = ols(filled)
        ests.append([bi[1], bi[2]])
        variances.append([ci[1, 1], ci[2, 2]])
        dofs.append(dof)
    ests, variances = np.array(ests), np.array(variances)
    qbar = ests.mean(axis=0)
    within = variances.mean(axis=0)
    between = ests.var(axis=0, ddof=1)
    total = within + (1 + 1 / m) * between
    r = (1 + 1 / m) * between / within
    nu_old = (m - 1) * (1 + 1 / r) ** 2
    nu_com = min(dofs)
    nu_obs = (nu_com + 1) / (nu_com + 3) * nu_com * (1 - (1 + 1 / m) * between / total)
    nu = 1 / (1 / nu_old + 1 / nu_obs)
    p = np.array([2 * stats.t.sf(abs(q / np.sqrt(t)), v) for q, t, v in zip(qbar, total, nu)])
    adj, rej = holm(p, alpha)
    return [Contrast(a, ref, float(q), float(np.sqrt(t)), float(pi), float(pa), float(q) / sd, bool(rj)) for (a, ref), q, t, pi, pa, rj in zip(CONTRASTS, qbar, total, p, adj, rej)]


def primary(rows, alpha=ALPHA, seed=0):
    return multiple_imputation(rows, seed=seed, alpha=alpha)


def tipping_point(rows, deltas=TIPPING_DELTAS, seed=0):
    out = []
    base = [c.reject for c in primary(rows, seed=seed)]
    for arm in ("s50", "s90"):
        for d in deltas:
            signed = d if arm == "s90" else -d
            res = multiple_imputation(rows, seed=seed, delta=signed, delta_arm=arm)
            out.append({"arm": arm, "delta_sd": signed, "reject": [c.reject for c in res], "flips": [c.reject != b for c, b in zip(res, base)]})
    return out


def secondary(rows, alpha=ALPHA):
    est, se, p, names = [], [], [], []
    for name in SECONDARY:
        sub = [dict(r, outcome=r.get(name)) for r in rows if r.get(name) is not None]
        if len(sub) < 10:
            continue
        beta, cov, dof, _, _ = ols(sub)
        for k, arm in ((1, "s50"), (2, "s90")):
            names.append(f"{name}:{arm}")
            est.append(float(beta[k]))
            se.append(float(np.sqrt(cov[k, k])))
            p.append(float(2 * stats.t.sf(abs(beta[k] / np.sqrt(cov[k, k])), dof)))
    adj, rej = holm(p, alpha) if p else (np.array([]), np.array([]))
    return [{"test": n, "estimate": e, "se": s, "p": pi, "p_holm": float(pa), "reject": bool(r)} for n, e, s, pi, pa, r in zip(names, est, se, p, adj, rej)]


def harm_stop(retention_by_arm, enrolled_by_arm):
    if min(enrolled_by_arm.get(a, 0) for a in ARMS) < HARM_CHECK_PER_ARM:
        return False
    ref = retention_by_arm[REFERENCE]
    return any(ref - retention_by_arm[a] >= HARM_RETENTION_GAP for a in ARMS if a != REFERENCE)


def enrolment_state(enrolled_by_arm, days_open):
    if min(enrolled_by_arm.get(a, 0) for a in ARMS) >= TARGET_PER_ARM:
        return "closed_full"
    if days_open >= CAP_DAYS:
        return "closed_cap"
    return "open"


def analytic_per_arm(d=EFFECT_D, alpha=ALPHA, power_target=0.8, comparisons=2, attrition=ATTRITION):
    z_a = stats.norm.ppf(1 - alpha / comparisons / 2)
    z_b = stats.norm.ppf(power_target)
    complete = int(np.ceil(2 * (z_a + z_b) ** 2 / d**2))
    return complete, int(np.ceil(complete / (1 - attrition)))


def achieved_power(complete_per_arm, d=EFFECT_D, alpha=ALPHA, comparisons=2):
    z_a = stats.norm.ppf(1 - alpha / comparisons / 2)
    return float(stats.norm.cdf(d * np.sqrt(complete_per_arm / 2) - z_a))


def simulate(per_arm=TARGET_PER_ARM, d50=-EFFECT_D, d90=EFFECT_D, attrition=ATTRITION, seed=1, devices_per_account=1.15):
    rng = np.random.default_rng(seed)
    rows = []
    i = 0
    counts = {a: 0 for a in ARMS}
    while min(counts.values()) < per_arm:
        account = f"sim-{seed}-{i}"
        i += 1
        tier = int(rng.integers(0, 13))
        s = stratum(tier)
        key = enrolment_key(account, None)
        arm = assign_arm(key)
        if counts[arm] >= per_arm:
            continue
        counts[arm] += 1
        baseline = max(0.0, rng.normal(300 + 60 * tier, 150))
        shift = {"s50": d50, "s70": 0.0, "s90": d90}[arm] * OUTCOME_SD
        test_day = int(rng.integers(TEST_DAY, WINDOW_END_DAY + 1))
        mean = 150 + 0.9 * baseline + 40 * (s == "past-a2") + 5 * (test_day - TEST_DAY) + shift
        outcome = float(rng.normal(mean, OUTCOME_SD))
        dropout = rng.random() < attrition * (1.2 if tier <= 2 else 0.9)
        share = {"s50": 0.5, "s70": 0.7, "s90": 0.9}[arm]
        rows.append({
            "unit": key, "cluster": account, "arm": arm, "stratum": s, "baseline": baseline,
            "test_day": None if dropout else test_day, "outcome": None if dropout else outcome,
            "input_hours": float(max(0.0, rng.normal(6 * share, 1.5))),
            "retained_day28": float(not dropout),
            "lapse_rate": None if dropout else float(np.clip(rng.normal(0.12, 0.04), 0, 1)),
        })
    return rows


def power(sims=POWER_SIMS, per_arm=TARGET_PER_ARM, seed=POWER_SEED):
    hits = np.zeros(2)
    for s in range(sims):
        res = complete_case(simulate(per_arm=per_arm, seed=seed * 100_000 + s))
        hits += [c.reject for c in res]
    return (hits / sims).tolist()


def report(rows, seed=0):
    out = {
        "enrolled": {a: sum(r["arm"] == a for r in rows) for a in ARMS},
        "observed": {a: sum(r["arm"] == a and r.get("outcome") is not None for r in rows) for a in ARMS},
        "primary_itt_mi": [asdict(c) for c in primary(rows, seed=seed)],
        "sensitivity_complete_case": [asdict(c) for c in complete_case(rows)],
        "tipping_point": tipping_point(rows, seed=seed),
        "secondary_holm": secondary(rows),
    }
    complete = min(out["observed"].values())
    out["achieved_power_d03"] = achieved_power(complete) if complete else 0.0
    return out


FIELDS = ["unit", "cluster", "arm", "stratum", "baseline", "test_day", "outcome", *SECONDARY]


def read_csv(path):
    def num(v):
        return float(v) if v not in ("", None) else None

    with open(path) as f:
        return [{"unit": r["unit"], "cluster": r["cluster"], "arm": r["arm"], "stratum": r["stratum"], "baseline": float(r["baseline"]), "test_day": num(r["test_day"]), "outcome": num(r["outcome"]), **{k: num(r[k]) for k in SECONDARY}} for r in csv.DictReader(f)]


def write_csv(rows, path):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: "" if r.get(k) is None else r[k] for k in FIELDS})


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
    a.add_argument("--seed", type=int, default=0)
    w = sub.add_parser("power")
    w.add_argument("--sims", type=int, default=POWER_SIMS)
    w.add_argument("--per-arm", type=int, default=TARGET_PER_ARM)
    w.add_argument("--seed", type=int, default=POWER_SEED)
    args = p.parse_args(argv)
    if args.cmd == "simulate":
        write_csv(simulate(args.per_arm, args.d50, args.d90, seed=args.seed), args.out)
    elif args.cmd == "analyze":
        json.dump(report(read_csv(args.csv), seed=args.seed), sys.stdout, indent=1)
        print()
    else:
        complete, enrol = analytic_per_arm()
        json.dump({"analytic_complete_per_arm": complete, "analytic_enrol_per_arm": enrol, "sims": args.sims, "seed": args.seed, "simulated_power": power(args.sims, args.per_arm, args.seed)}, sys.stdout, indent=1)
        print()


if __name__ == "__main__":
    main()
