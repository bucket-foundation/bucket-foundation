import argparse
import csv
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np

import forecast

HERE = Path(__file__).parent
REPO = HERE.parent.parent
NEIGHBORS = REPO / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"
FRONTIER_TS = REPO / "src" / "lib" / "research-os" / "solvability-frontier.ts"
OUT = HERE / "thresholds"
SEED = 20261011
BOOTSTRAPS = 2000
FOLDS = 5
DUPLICATE_SIMILARITY = 0.95
DUPLICATE_LADDER = (0.98, 0.95, 0.9)
FIXED_FPR = (0.1, 0.2)
CUTOFFS = forecast.CUTOFFS
TOP = 20
STRATUM_FLOOR = 10
CALIBRATION_BINS = 10
FORMAL = {"proved": 1.0, "partial": 0.6, "statement": 0.35, "none": 0.1}
SHIPPED = {"reach_quantile": forecast.REACH_QUANTILE, "min_branch_solved": forecast.MIN_BRANCH_SOLVED, "core_radius": 0.6, "frontier_radius": 1.0, "outer_radius": 1.5, "weight_resolved": 0.55, "weight_formal": 0.45}
QUANTILES = (0.01, 0.02, 0.05, 0.075, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5)
MIN_BRANCH = (1, 5, 10, 11, 15, 20, 25, 30, 35, 45, 60, 100)
CORE_RADII = (0.3, 0.4, 0.5, 0.6, 0.7, 0.8)
OUTER_RADII = (1.25, 1.5, 2.0)
WEIGHTS = tuple(round(0.05 * k, 2) for k in range(21))
ZONES = ("solved", "reachable", "beyond", "unsampled")
ZONE_COLOR = {"solved": "#2a78d6", "beyond": "#eb6834", "reachable": "#1baf7a", "unsampled": "#eda100"}
INK = "#0b0b0b"
MUTED = "#52514e"
SURFACE = "#fcfcfb"


def shipped_constants_in_typescript(path=FRONTIER_TS):
    text = path.read_text()
    names = {"reach_quantile": "REACH_QUANTILE", "min_branch_solved": "MIN_BRANCH_SOLVED", "core_radius": "CORE_RADIUS", "frontier_radius": "FRONTIER_RADIUS", "outer_radius": "OUTER_RADIUS"}
    return {key: float(re.search(rf"export const {name} = ([0-9.]+);", text).group(1)) for key, name in names.items()}


def average_ranks(values):
    values = np.asarray(values, dtype=float)
    _, inverse, counts = np.unique(values, return_inverse=True, return_counts=True)
    ends = np.cumsum(counts)
    return (ends - (counts - 1) / 2)[inverse]


def auc(scores, labels):
    labels = np.asarray(labels, dtype=bool)
    positives, negatives = int(labels.sum()), int((~labels).sum())
    if positives == 0 or negatives == 0:
        return None
    ranks = average_ranks(scores)
    return float((ranks[labels].sum() - positives * (positives + 1) / 2) / (positives * negatives))


def spearman(a, b):
    a, b = average_ranks(a), average_ranks(b)
    if len(a) < 3 or a.std() == 0 or b.std() == 0:
        return None
    return float(np.corrcoef(a, b)[0, 1])


def roc(scores, labels):
    scores = np.asarray(scores, dtype=float)
    labels = np.asarray(labels, dtype=bool)
    thresholds, inverse = np.unique(scores, return_inverse=True)
    positives = np.bincount(inverse, weights=labels, minlength=len(thresholds))
    negatives = np.bincount(inverse, weights=~labels, minlength=len(thresholds))
    tpr = np.cumsum(positives[::-1])[::-1] / max(1, positives.sum())
    fpr = np.cumsum(negatives[::-1])[::-1] / max(1, negatives.sum())
    return thresholds, tpr, fpr


def youden_tau(scores, labels):
    thresholds, tpr, fpr = roc(scores, labels)
    k = int(np.argmax(tpr - fpr))
    return float(thresholds[k])


def fixed_fpr_tau(scores, labels, target):
    thresholds, _, fpr = roc(scores, labels)
    allowed = np.flatnonzero(fpr <= target + 1e-12)
    return float(thresholds[allowed[0]]) if len(allowed) else float(np.nextafter(thresholds[-1], 2.0))


def quantile_tau(scores, labels, q):
    solved = sorted(np.asarray(scores, dtype=float)[np.asarray(labels, dtype=bool)].tolist())
    return float(forecast.quantile(solved, q))


def rates_at(scores, labels, tau):
    scores = np.asarray(scores, dtype=float)
    labels = np.asarray(labels, dtype=bool)
    inside = scores >= tau
    positives, negatives = labels.sum(), (~labels).sum()
    tpr = float((inside & labels).sum() / positives) if positives else None
    fpr = float((inside & ~labels).sum() / negatives) if negatives else None
    precision = float((inside & labels).sum() / inside.sum()) if inside.sum() else None
    return {"tau": float(tau), "tpr": tpr, "fpr": fpr, "precision": precision, "inside": int(inside.sum()), "youden_j": None if tpr is None or fpr is None else tpr - fpr}


def family_roots(nodes):
    parent = {n["id"]: n.get("variant_of") for n in nodes}
    roots = []
    for n in nodes:
        at, seen = n["id"], set()
        while parent.get(at) and parent[at] in parent and at not in seen:
            seen.add(at)
            at = parent[at]
        roots.append(at)
    return roots


def group_labels(roots, sim=None, duplicate=None):
    n = len(roots)
    link = list(range(n))

    def find(i):
        while link[i] != i:
            link[i] = link[link[i]]
            i = link[i]
        return i

    first = {}
    for i, r in enumerate(roots):
        if r in first:
            link[find(i)] = find(first[r])
        else:
            first[r] = i
    if duplicate is not None:
        for i, j in np.argwhere(np.triu(sim, 1) >= duplicate):
            link[find(int(i))] = find(int(j))
    return np.array([find(i) for i in range(n)])


def reach(sim, reference, groups):
    reference = np.asarray(reference, dtype=bool)
    ref = np.flatnonzero(reference)
    sub = sim[:, ref].copy()
    sub[groups[:, None] == groups[ref][None, :]] = -np.inf
    best = sub.argmax(1)
    value = sub[np.arange(len(sub)), best]
    return np.where(np.isfinite(value), value, np.nan), np.where(np.isfinite(value), ref[best], -1)


def bootstrap(stat, groups, n=BOOTSTRAPS, seed=SEED):
    groups = np.asarray(groups)
    order = np.argsort(groups, kind="stable")
    _, starts, counts = np.unique(groups[order], return_index=True, return_counts=True)
    members = [order[s:s + c] for s, c in zip(starts, counts)]
    rng = np.random.default_rng(seed)
    draws = []
    for _ in range(n):
        pick = rng.integers(0, len(members), len(members))
        value = stat(np.concatenate([members[k] for k in pick]))
        draws.append(np.nan if value is None else value)
    return np.asarray(draws, dtype=float)


def interval(draws):
    draws = np.asarray(draws, dtype=float)
    if np.isnan(draws).all():
        return None
    lo, hi = np.nanpercentile(draws, [2.5, 97.5], axis=0)
    return [float(lo), float(hi)]


def with_interval(stat, groups, n=BOOTSTRAPS, seed=SEED):
    return {"value": stat(np.arange(len(groups))), "ci95": interval(bootstrap(stat, groups, n, seed))}


def logistic_fit(features, labels, ridge=1e-3, steps=60):
    x = np.column_stack([np.ones(len(features)), np.asarray(features, dtype=float)])
    y = np.asarray(labels, dtype=float)
    w = np.zeros(x.shape[1])
    penalty = np.eye(x.shape[1]) * ridge
    penalty[0, 0] = 0
    for _ in range(steps):
        p = 1 / (1 + np.exp(-np.clip(x @ w, -30, 30)))
        step = np.linalg.solve((x * (p * (1 - p))[:, None]).T @ x + penalty, x.T @ (y - p) - penalty @ w)
        w = w + step
        if np.abs(step).max() < 1e-9:
            break
    return w


def logistic_predict(w, features):
    x = np.column_stack([np.ones(len(features)), np.asarray(features, dtype=float)])
    return 1 / (1 + np.exp(-np.clip(x @ w, -30, 30)))


def one_hot(values):
    levels = sorted(set(values))
    at = {v: k for k, v in enumerate(levels)}
    out = np.zeros((len(values), len(levels)))
    out[np.arange(len(values)), [at[v] for v in values]] = 1
    return out


def grouped_folds(groups, folds=FOLDS, seed=SEED):
    unique = np.unique(groups)
    rng = np.random.default_rng(seed)
    assign = dict(zip(unique.tolist(), (rng.permutation(len(unique)) % folds).tolist()))
    return np.array([assign[g] for g in groups.tolist()])


def out_of_fold(fit_predict, fold, labels):
    out = np.zeros(len(labels))
    for k in np.unique(fold):
        test = fold == k
        out[test] = fit_predict(~test, test)
    return out


def rate_model(cells, labels):
    def fit_predict(train, test):
        base = labels[train].mean()
        seen, hits = Counter(), Counter()
        for c, y in zip(cells[train], labels[train]):
            seen[c] += 1
            hits[c] += int(y)
        return np.array([(hits[c] + base) / (seen[c] + 1) for c in cells[test]])
    return fit_predict


def logistic_model(features, labels):
    def fit_predict(train, test):
        return logistic_predict(logistic_fit(features[train], labels[train]), features[test])
    return fit_predict


def calibration(scores, labels, predicted, bins=CALIBRATION_BINS):
    order = np.argsort(scores, kind="stable")
    rows = []
    for part in np.array_split(order, bins):
        rows.append({"n": int(len(part)), "reach_low": float(scores[part].min()), "reach_high": float(scores[part].max()), "mean_reach": float(scores[part].mean()), "solved_share": float(labels[part].mean()), "predicted_share": float(predicted[part].mean())})
    error = sum(r["n"] * abs(r["solved_share"] - r["predicted_share"]) for r in rows) / len(scores)
    return {"bins": rows, "expected_calibration_error": float(error)}


def source_class(source):
    if "formal-conjectures" in source:
        return "formal-conjectures"
    if "wikipedia" in source:
        return "wikipedia"
    return "other"


def source_list(source):
    if "formal-conjectures" in source:
        return "formal-conjectures"
    return source.split("#")[0].split("?")[0]


def stratum_auc(scores, labels, groups, names, n=BOOTSTRAPS):
    rows = []
    for name in sorted(set(names)):
        mask = np.array([x == name for x in names])
        positives, total = int(labels[mask].sum()), int(mask.sum())
        row = {"name": name, "rows": total, "solved": positives, "auc": None, "ci95": None, "youden_tau": None, "quantile_tau": None}
        if positives >= STRATUM_FLOOR and total - positives >= STRATUM_FLOOR:
            s, y = scores[mask], labels[mask]
            got = with_interval(lambda idx: auc(s[idx], y[idx]), groups[mask], n)
            row.update(auc=got["value"], ci95=got["ci95"], youden_tau=youden_tau(s, y), quantile_tau=quantile_tau(s, y, SHIPPED["reach_quantile"]))
        rows.append(row)
    return rows


def cross_section(nodes, sim, n=BOOTSTRAPS):
    labels = np.array([bool(x["solved"]) for x in nodes])
    roots = family_roots(nodes)
    levels = [("self excluded only, the shipped rule", np.arange(len(nodes)))]
    levels.append(("variant family excluded", group_labels(roots)))
    for d in DUPLICATE_LADDER:
        levels.append((f"family and near duplicates at {d} excluded", group_labels(roots, sim, d)))
    primary = f"family and near duplicates at {DUPLICATE_SIMILARITY} excluded"
    ladder = []
    for name, groups in levels:
        r, _ = reach(sim, labels, groups)
        got = with_interval(lambda idx: auc(r[idx], labels[idx]), groups, n)
        ladder.append({"rule": name, "groups": int(len(np.unique(groups))), "auc": got["value"], "ci95": got["ci95"], "primary": name == primary})
    groups = dict(levels)[primary]
    r, _ = reach(sim, labels, groups)
    branch = [x["branch"] for x in nodes]
    source = [source_class(x["source"]) for x in nodes]
    kind = ["variant" if x["kind"] == "variant" else "top-level" for x in nodes]
    cell = np.array([f"{b}|{source_list(x['source'])}|{k}" for b, x, k in zip(branch, nodes, kind)])
    fold = grouped_folds(groups)
    cells_hot = one_hot(cell.tolist())
    predictions = {
        "branch base rate": out_of_fold(rate_model(np.array(branch), labels), fold, labels),
        "branch, source and kind base rate": out_of_fold(rate_model(cell, labels), fold, labels),
        "reach alone": out_of_fold(logistic_model(r[:, None], labels), fold, labels),
        "branch, source and kind plus reach": out_of_fold(logistic_model(np.column_stack([cells_hot, r]), labels), fold, labels),
    }
    models = []
    for name, p in predictions.items():
        got = with_interval(lambda idx: auc(p[idx], labels[idx]), groups, n)
        models.append({"model": name, "auc": got["value"], "ci95": got["ci95"], "brier": float(np.mean((p - labels) ** 2))})
    full, base = predictions["branch, source and kind plus reach"], predictions["branch, source and kind base rate"]
    gain = with_interval(lambda idx: auc(full[idx], labels[idx]) - auc(base[idx], labels[idx]), groups, n)
    over_branch = with_interval(lambda idx: auc(r[idx], labels[idx]) - auc(predictions["branch base rate"][idx], labels[idx]), groups, n)
    held_out = []
    for b in sorted(set(branch)):
        test = np.array([x == b for x in branch])
        tau = youden_tau(r[~test], labels[~test])
        at = rates_at(r[test], labels[test], tau)
        held_out.append({"branch": b, "rows": int(test.sum()), "solved": int(labels[test].sum()), "auc": auc(r[test], labels[test]), "train_tau": tau, "tpr": at["tpr"], "fpr": at["fpr"]})
    derived = {"youden": {**rates_at(r, labels, youden_tau(r, labels)), "ci95": interval(bootstrap(lambda idx: youden_tau(r[idx], labels[idx]), groups, n))}}
    for target in FIXED_FPR:
        derived[f"fixed_fpr_{target}"] = {**rates_at(r, labels, fixed_fpr_tau(r, labels, target)), "ci95": interval(bootstrap(lambda idx: fixed_fpr_tau(r[idx], labels[idx], target), groups, n))}
    derived["quantile_rule"] = {**rates_at(r, labels, quantile_tau(r, labels, SHIPPED["reach_quantile"])), "ci95": interval(bootstrap(lambda idx: quantile_tau(r[idx], labels[idx], SHIPPED["reach_quantile"]), groups, n))}
    return {
        "rows": len(nodes),
        "solved": int(labels.sum()),
        "duplicate_similarity": DUPLICATE_SIMILARITY,
        "groups": int(len(np.unique(groups))),
        "rows_in_a_shared_group": int(sum(c for c in Counter(groups.tolist()).values() if c > 1)),
        "leakage_ladder": ladder,
        "by_branch": stratum_auc(r, labels, groups, branch, n),
        "by_source": stratum_auc(r, labels, groups, source, n),
        "by_kind": stratum_auc(r, labels, groups, kind, n),
        "models": models,
        "gain_over_branch_source_kind": gain,
        "gain_of_reach_over_branch_base_rate": over_branch,
        "leave_one_branch_out": held_out,
        "calibration": calibration(r, labels, predictions["reach alone"]),
        "derived_tau": derived,
        "reach": r,
        "groups_array": groups,
        "labels": labels,
    }


def time_split(nodes, sim, groups, cutoff, n=BOOTSTRAPS):
    roles = [forecast.eligible(x, cutoff) for x in nodes]
    reference = np.array([a for a, _ in roles])
    tested = np.array([b for _, b in roles])
    labels = np.array([bool(x["solved"]) for x in nodes])
    undated = np.array([bool(x["solved"]) and x["resolved"] is None for x in nodes])
    r, _ = reach(sim, reference, groups)
    dated = tested & ~undated & ~np.isnan(r)
    everything = tested & ~np.isnan(r)
    branch = np.array([x["branch"] for x in nodes])
    known = reference | tested
    branch_rate = np.array([reference[known & (branch == b)].mean() if (known & (branch == b)).any() else 0.0 for b in branch])
    source = np.array([source_list(x["source"]) for x in nodes])
    source_rate_of = {v: reference[known & (source == v)].mean() for v in set(source[known].tolist())}
    source_rate = np.array([source_rate_of.get(v, 0.0) for v in source.tolist()])
    snapshot_scores = np.concatenate([r[reference & ~np.isnan(r)], r[everything]])
    snapshot_labels = np.concatenate([np.ones(int((reference & ~np.isnan(r)).sum()), dtype=bool), np.zeros(int(everything.sum()), dtype=bool)])
    taus = {"youden": youden_tau(snapshot_scores, snapshot_labels), "quantile_rule": quantile_tau(snapshot_scores, snapshot_labels, SHIPPED["reach_quantile"])}
    for target in FIXED_FPR:
        taus[f"fixed_fpr_{target}"] = fixed_fpr_tau(snapshot_scores, snapshot_labels, target)
    s, y, g = r[dated], labels[dated], groups[dated]
    b = branch_rate[dated]
    u = source_rate[dated]
    by_source = Counter(source[dated].tolist())
    later_by_source = Counter(source[dated][y].tolist())
    return {
        "cutoff": cutoff,
        "reference_solved": int(reference.sum()),
        "tested": int(everything.sum()),
        "tested_dated": int(dated.sum()),
        "solved_later": int(y.sum()),
        "undated_solved_removed": int((tested & undated).sum()),
        "auc": with_interval(lambda idx: auc(s[idx], y[idx]), g, n),
        "auc_with_undated": auc(r[everything], labels[everything]),
        "branch_base_rate_auc": with_interval(lambda idx: auc(b[idx], y[idx]), g, n),
        "gain_over_branch_base_rate": with_interval(lambda idx: None if auc(s[idx], y[idx]) is None else auc(s[idx], y[idx]) - auc(b[idx], y[idx]), g, n),
        "source_base_rate_auc": with_interval(lambda idx: auc(u[idx], y[idx]), g, n),
        "gain_over_source_base_rate": with_interval(lambda idx: None if auc(s[idx], y[idx]) is None else auc(s[idx], y[idx]) - auc(u[idx], y[idx]), g, n),
        "sources": [{"source": k, "tested": v, "solved_later": later_by_source.get(k, 0)} for k, v in by_source.most_common()],
        "train_tau": {name: rates_at(s, y, tau) for name, tau in taus.items()},
    }


def frontier_arrays(data):
    nodes = [x for x in data["nodes"] if x["kind"] != "lean"]
    at = {x["id"]: i for i, x in enumerate(nodes)}
    solved_ids = {x["id"] for x in nodes if x["solved"]}
    k = max(len(x["n"]) for x in nodes)
    neighbour = np.full((len(nodes), k), -1)
    similarity = np.full((len(nodes), k), -1.0)
    near = np.zeros(len(nodes))
    for i, x in enumerate(nodes):
        best = -1.0
        stored = x.get("solved_nearest")
        if stored and stored["id"] != x["id"] and stored["id"] in solved_ids:
            best = stored["sim"]
        for c, (j, s) in enumerate(zip(x["n"], x["s"])):
            other = data["ids"][j]
            if other in at and other != x["id"]:
                neighbour[i, c] = at[other]
                similarity[i, c] = s
                if other in solved_ids and s > best:
                    best = s
        if best < 0:
            raise ValueError(f"{x['id']} has no solved neighbour in the data")
        near[i] = best
    return {
        "nodes": nodes,
        "ids": [x["id"] for x in nodes],
        "solved": np.array([bool(x["solved"]) for x in nodes]),
        "branch": np.array([x["branch"] for x in nodes]),
        "top_level": np.array([x["kind"] != "variant" for x in nodes]),
        "theta": np.array([x["theta"] for x in nodes]),
        "neighbour": neighbour,
        "similarity": similarity,
        "near": near,
    }


def frontier(arrays, q=SHIPPED["reach_quantile"], min_branch=SHIPPED["min_branch_solved"], threshold=None):
    solved, near, branch = arrays["solved"], arrays["near"], arrays["branch"]
    solved_reach = sorted(near[solved].tolist())
    tau = threshold if threshold is not None else forecast.quantile(solved_reach, q)
    per_branch = Counter(branch[solved].tolist())
    sampled = np.array([per_branch.get(b, 0) >= min_branch for b in branch.tolist()])
    zone = np.where(solved, "solved", np.where(~sampled, "unsampled", np.where(near >= tau, "reachable", "beyond")))
    beyond = (zone == "beyond") & arrays["top_level"]
    pulled = (arrays["neighbour"] >= 0) & (arrays["similarity"] >= tau) & beyond[np.maximum(arrays["neighbour"], 0)]
    can_pull = ((zone == "reachable") | (zone == "beyond")) & arrays["top_level"]
    growth = np.where(can_pull, pulled.sum(1), 0) + beyond
    counts = {z: int((zone == z).sum()) for z in ZONES}
    branches = {}
    for b in sorted(set(branch.tolist())):
        m = branch == b
        branches[b] = {"total": int(m.sum()), **{z: int((zone[m] == z).sum()) for z in ZONES}}
    ids = arrays["ids"]
    growth_order = sorted(np.flatnonzero(beyond).tolist(), key=lambda i: (-growth[i], near[i], ids[i]))
    open_sampled = np.flatnonzero((zone == "reachable") | (zone == "beyond")).tolist()
    edge_order = sorted(open_sampled, key=lambda i: (abs(near[i] - tau), ids[i]))
    return {
        "threshold": float(tau),
        "counts": counts,
        "inside": counts["solved"] + counts["reachable"],
        "outside": counts["beyond"] + counts["unsampled"],
        "branches": branches,
        "zone": zone,
        "growth_top": [ids[i] for i in growth_order[:TOP]],
        "edge_top": [ids[i] for i in edge_order[:TOP]],
        "solved_reach_min": float(solved_reach[0]),
        "floor": float(min(tau, near.min())),
    }


def reachable_share(f):
    return {b: c["reachable"] / (c["reachable"] + c["beyond"]) for b, c in f["branches"].items() if c["reachable"] + c["beyond"] > 0}


def overlap(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a | b else 1.0


def compare(f, base):
    mine, theirs = reachable_share(f), reachable_share(base)
    shared = sorted(set(mine) & set(theirs))
    return {
        "threshold": f["threshold"],
        "inside": f["inside"],
        "outside": f["outside"],
        **f["counts"],
        "rows_changing_zone": int((f["zone"] != base["zone"]).sum()),
        "branches_ranked": len(shared),
        "branch_rank_correlation": spearman([mine[b] for b in shared], [theirs[b] for b in shared]),
        "growth_top_overlap": overlap(f["growth_top"], base["growth_top"]),
        "growth_top_kept": len(set(f["growth_top"]) & set(base["growth_top"])),
        "edge_top_overlap": overlap(f["edge_top"], base["edge_top"]),
        "edge_top_kept": len(set(f["edge_top"]) & set(base["edge_top"])),
        "unsampled_branches": sorted(b for b, c in f["branches"].items() if c["unsampled"] > 0),
    }


def span(value, low, high):
    if high == low:
        return np.zeros_like(np.asarray(value, dtype=float))
    return np.clip((np.asarray(value, dtype=float) - low) / (high - low), 0, 1)


def piecewise_radius(f, near, core=SHIPPED["core_radius"], front=SHIPPED["frontier_radius"], outer=SHIPPED["outer_radius"]):
    zone, tau, floor = f["zone"], f["threshold"], f["floor"]
    solved = core * (1 - span(near, f["solved_reach_min"], 1))
    reachable = core + (front - core) * (1 - span(near, tau, 1))
    unsampled = front + (outer - front) * (1 - span(near, floor, 1))
    beyond = front + (outer - front) * (1 - span(near, floor, tau))
    return np.where(zone == "solved", solved, np.where(zone == "reachable", reachable, np.where(zone == "unsampled", unsampled, beyond)))


def linear_radius(near):
    return 1 - np.asarray(near, dtype=float)


def inverted_pairs(radius, near, sample=200000, seed=SEED):
    rng = np.random.default_rng(seed)
    i, j = rng.integers(0, len(near), sample), rng.integers(0, len(near), sample)
    keep = near[i] != near[j]
    wrong = np.sign(radius[i] - radius[j]) == np.sign(near[i] - near[j])
    return float((wrong & keep & (radius[i] != radius[j])).sum() / keep.sum())


def sensitivity(arrays):
    base = frontier(arrays)
    near = arrays["near"]
    radii = []
    for core in CORE_RADII:
        for outer in OUTER_RADII:
            radius = piecewise_radius(base, near, core=core, outer=outer)
            radii.append({"core_radius": core, "outer_radius": outer, "rank_correlation_with_distance": spearman(radius, 1 - near), "inverted_pair_share": inverted_pairs(radius, near), "disc_area_inside_frontier": (SHIPPED["frontier_radius"] / outer) ** 2, "disc_area_core": (core / outer) ** 2, "rows_changing_zone": 0})
    linear = linear_radius(near)
    return {
        "baseline": {k: v for k, v in compare(base, base).items()},
        "baseline_branches": base["branches"],
        "baseline_growth_top": base["growth_top"],
        "baseline_edge_top": base["edge_top"],
        "reach_quantile": [{"reach_quantile": q, **compare(frontier(arrays, q=q), base)} for q in QUANTILES],
        "min_branch_solved": [{"min_branch_solved": m, **compare(frontier(arrays, min_branch=m), base)} for m in MIN_BRANCH],
        "radii": radii,
        "linear_radius": {"rank_correlation_with_distance": spearman(linear, 1 - near), "inverted_pair_share": inverted_pairs(linear, near), "frontier_radius": 1 - base["threshold"], "largest_radius": float(linear.max())},
    }


def load_score_rows():
    rows = []
    for r in csv.DictReader(open(HERE / "problems.tsv"), delimiter="\t"):
        rows.append({"id": r["id"], "branch": r["branch"], "resolved": bool(r["resolved"]), "lean": r["lean"], "set": "atlas"})
    for r in csv.DictReader(open(HERE / "problems-sourced.tsv"), delimiter="\t"):
        rows.append({"id": r["id"], "branch": r["branch"], "resolved": r["status"] == "solved", "lean": r["lean"], "set": "sourced"})
    return rows


def solvability(resolved, formal, weight):
    return weight * np.asarray(resolved, dtype=float) + (1 - weight) * np.asarray(formal, dtype=float)


def weight_breakpoints(formal=FORMAL):
    cells = [(r, f) for r in (0.0, 1.0) for f in sorted(set(formal.values()))]
    points = set()
    for r1, f1 in cells:
        for r2, f2 in cells:
            bottom = (r1 - r2) + (f2 - f1)
            if (r1, f1) < (r2, f2) and abs(bottom) > 1e-12:
                w = (f2 - f1) / bottom
                if 1e-9 < w < 1 - 1e-9:
                    points.add(round(w, 6))
    return sorted(points)


def weights(rows):
    resolved = np.array([r["resolved"] for r in rows], dtype=float)
    formal = np.array([FORMAL[r["lean"]] for r in rows])
    branch = [r["branch"] for r in rows]
    names = sorted(set(branch))
    masks = {b: np.array([x == b for x in branch]) for b in names}
    base = solvability(resolved, formal, SHIPPED["weight_resolved"])
    base_branch = [base[masks[b]].mean() for b in names]
    sweep = []
    for w in WEIGHTS:
        score = solvability(resolved, formal, w)
        sweep.append({"weight_resolved": w, "row_rank_correlation": spearman(score, base), "branch_rank_correlation": spearman([score[masks[b]].mean() for b in names], base_branch), "distinct_scores": int(len(np.unique(np.round(score, 9))))})
    points = weight_breakpoints()
    below = max([p for p in points if p < SHIPPED["weight_resolved"]], default=0.0)
    above = min([p for p in points if p > SHIPPED["weight_resolved"]], default=1.0)
    table = {lean: {"rows": int((formal == value).sum()), "solved": int(resolved[formal == value].sum())} for lean, value in FORMAL.items()}
    fit = logistic_fit(formal[:, None], resolved)
    return {
        "rows": len(rows),
        "sweep": sweep,
        "breakpoints": points,
        "order_stable_interval": [below, above],
        "formal_by_solved": table,
        "logistic_solved_on_formal": {"intercept": float(fit[0]), "coefficient": float(fit[1]), "auc_formal_alone": auc(formal, resolved.astype(bool))},
        "verdict": "declared default",
    }


def load_embeddings(ids):
    saved = sys.argv
    sys.argv = saved[:1]
    try:
        import atlas
    finally:
        sys.argv = saved
    nodes = [x for x in atlas.full_nodes(atlas.load_problems(), atlas.load_bucketmath()) if x["kind"] != "lean"]
    if [x["id"] for x in nodes] != ids:
        raise ValueError("the neighbour file and the problem tables list different rows; rerun build.sh")
    texts = [atlas.full_text(x)[0] for x in nodes]
    keys_path = atlas.CACHE / "keys.json"
    cached = set(json.load(open(keys_path))) if keys_path.exists() else set()
    model = None
    if any(atlas.text_key(t) not in cached for t in texts):
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(atlas.MODEL, revision=atlas.MODEL_REVISION)
    emb, _ = atlas.cached_encode(model, texts)
    return emb, texts


def embedding_check(arrays, sim):
    top = np.where(np.eye(len(sim), dtype=bool), -2, sim).max(1)
    stored = arrays["similarity"].max(1)
    return {"rows": len(sim), "top_similarity_disagreements_over_0.0015": int((np.abs(top - stored) > 0.0015).sum())}


def rounded(value, digits=4):
    if isinstance(value, dict):
        return {k: rounded(v, digits) for k, v in value.items() if not isinstance(v, np.ndarray)}
    if isinstance(value, (list, tuple)):
        return [rounded(v, digits) for v in value]
    if isinstance(value, (float, np.floating)):
        return None if math.isnan(value) else round(float(value), digits)
    if isinstance(value, np.integer):
        return int(value)
    return value


def analyse(data, sim, texts=None, n=BOOTSTRAPS):
    arrays = frontier_arrays(data)
    nodes = arrays["nodes"]
    cross = cross_section(nodes, sim, n)
    groups = cross["groups_array"]
    result = {
        "schema": "bucket.solvability-atlas.thresholds/v1",
        "model": data.get("model"),
        "revision": data.get("revision"),
        "seed": SEED,
        "bootstraps": n,
        "shipped": SHIPPED,
        "embedding_check": embedding_check(arrays, sim),
        "identical_texts": None if texts is None else len(texts) - len(set(texts)),
        "dated": {"solved": int(arrays["solved"].sum()), "solved_with_year": sum(1 for x in nodes if x["solved"] and x["resolved"] is not None), "open_with_posed_year": sum(1 for x in nodes if not x["solved"] and x.get("posed") is not None)},
        "sensitivity": sensitivity(arrays),
        "cross_section": cross,
        "time_split": [time_split(nodes, sim, groups, c, n) for c in CUTOFFS],
        "weights": weights(load_score_rows()),
    }
    shipped_tau = result["sensitivity"]["baseline"]["threshold"]
    result["cross_section"]["derived_tau"]["shipped"] = rates_at(cross["reach"], cross["labels"], shipped_tau)
    base = frontier(arrays)
    result["proposed"] = {
        "tau_youden": compare(frontier(arrays, threshold=round(result["cross_section"]["derived_tau"]["youden"]["tau"], 3)), base),
        "tau_fixed_fpr_0.1": compare(frontier(arrays, threshold=round(result["cross_section"]["derived_tau"]["fixed_fpr_0.1"]["tau"], 3)), base),
        "min_branch_solved_20": compare(frontier(arrays, min_branch=20), base),
    }
    return result, arrays, cross


def style(ax):
    ax.set_facecolor(SURFACE)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(MUTED)
        ax.spines[side].set_linewidth(0.6)
    ax.tick_params(colors=MUTED, labelsize=8, length=3, width=0.6)
    ax.grid(True, color="#e4e3df", lw=0.5)
    ax.set_axisbelow(True)


def disc(ax, radius, theta, zone, rings, title, limit):
    from matplotlib.patches import Circle

    ax.set_facecolor(SURFACE)
    for z in ("unsampled", "beyond", "reachable", "solved"):
        m = zone == z
        ax.scatter(radius[m] * np.cos(theta[m]), -radius[m] * np.sin(theta[m]), s=3, c=ZONE_COLOR[z], alpha=0.55, lw=0, label=f"{z} ({int(m.sum()):,})")
    for value, label, dash in rings:
        ax.add_patch(Circle((0, 0), value, fill=False, ec=INK, lw=0.9, ls=dash))
        ax.annotate(label, (0, value), xytext=(0, 3), textcoords="offset points", ha="center", fontsize=7.5, color=INK)
    ax.set_xlim(-limit, limit)
    ax.set_ylim(-limit, limit)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    for side in ax.spines.values():
        side.set_visible(False)
    ax.set_title(title, fontsize=10, color=INK, loc="left")


def figures(result, arrays, cross, out):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    base = frontier(arrays)
    near, theta, zone = arrays["near"], arrays["theta"], base["zone"]
    tau = base["threshold"]
    fig, axes = plt.subplots(1, 2, figsize=(13, 6.8), facecolor=SURFACE)
    disc(axes[0], piecewise_radius(base, near), theta, zone, [(SHIPPED["core_radius"], "core 0.6", (0, (2, 3))), (SHIPPED["frontier_radius"], f"frontier 1.0, reach {tau:.3f}", "solid"), (SHIPPED["outer_radius"], "outer 1.5", (0, (2, 5)))], "Shipped: piecewise radius, one band per zone", 1.6)
    linear = linear_radius(near)
    disc(axes[1], linear, theta, zone, [(1 - tau, f"reach {tau:.3f}", "solid"), (0.1, "0.9", (0, (2, 5))), (0.3, "0.7", (0, (2, 5))), (0.5, "reach 0.5", (0, (2, 5)))], "Linear: radius = 1 - reach, centre at reach 1", 0.52)
    axes[1].legend(loc="lower right", fontsize=8, frameon=False, markerscale=4)
    fig.tight_layout()
    fig.savefig(out / "frontier-linear-vs-piecewise.png", dpi=110)
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5.2), facecolor=SURFACE)
    thresholds, tpr, fpr = roc(cross["reach"], cross["labels"])
    style(axes[0])
    axes[0].plot(fpr, tpr, color=ZONE_COLOR["solved"], lw=2, label=f"reach, AUC {next(r['auc'] for r in result['cross_section']['leakage_ladder'] if r['primary']):.3f}")
    axes[0].plot([0, 1], [0, 1], color=MUTED, lw=1, ls=(0, (3, 3)), label="chance")
    marks = [("Youden", "youden", "o"), ("10% false positives", "fixed_fpr_0.1", "s"), ("shipped", "shipped", "^")]
    for label, key, marker in marks:
        d = result["cross_section"]["derived_tau"][key]
        axes[0].scatter([d["fpr"]], [d["tpr"]], s=46, marker=marker, color=INK, zorder=3, label=f"{label}: reach {d['tau']:.3f}")
    axes[0].set_xlabel("share of open problems inside", fontsize=9, color=MUTED)
    axes[0].set_ylabel("share of solved problems inside", fontsize=9, color=MUTED)
    axes[0].set_title("ROC, full set, families and near duplicates held out", fontsize=10, color=INK, loc="left")
    axes[0].legend(fontsize=8, frameon=False, loc="lower right")
    style(axes[1])
    bins = result["cross_section"]["calibration"]["bins"]
    axes[1].plot([b["mean_reach"] for b in bins], [b["solved_share"] for b in bins], color=ZONE_COLOR["solved"], lw=2, marker="o", ms=6, label="observed solved share")
    axes[1].plot([b["mean_reach"] for b in bins], [b["predicted_share"] for b in bins], color=ZONE_COLOR["beyond"], lw=2, marker="s", ms=5, label="out-of-fold logistic prediction")
    axes[1].axhline(result["cross_section"]["solved"] / result["cross_section"]["rows"], color=MUTED, lw=1, ls=(0, (3, 3)), label="base rate")
    axes[1].set_xlabel("mean reach in decile", fontsize=9, color=MUTED)
    axes[1].set_ylabel("share solved", fontsize=9, color=MUTED)
    axes[1].set_ylim(0, 1)
    axes[1].set_title("Calibration by reach decile", fontsize=10, color=INK, loc="left")
    axes[1].legend(fontsize=8, frameon=False, loc="upper left")
    fig.tight_layout()
    fig.savefig(out / "roc-calibration.png", dpi=110)
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(12, 4.6), facecolor=SURFACE)
    for ax, rows, key, title in ((axes[0], result["sensitivity"]["reach_quantile"], "reach_quantile", "Zone counts by reach quantile"), (axes[1], result["sensitivity"]["min_branch_solved"], "min_branch_solved", "Zone counts by minimum solved per branch")):
        style(ax)
        for z in ("reachable", "beyond", "unsampled"):
            ax.plot([r[key] for r in rows], [r[z] for r in rows], color=ZONE_COLOR[z], lw=2, marker="o", ms=4, label=z)
        ax.axvline(SHIPPED[key], color=INK, lw=0.8, ls=(0, (3, 3)))
        ax.annotate("shipped", (SHIPPED[key], ax.get_ylim()[1]), xytext=(4, -10), textcoords="offset points", fontsize=8, color=INK)
        ax.set_xlabel(key.replace("_", " "), fontsize=9, color=MUTED)
        ax.set_ylabel("open problems", fontsize=9, color=MUTED)
        ax.set_title(title, fontsize=10, color=INK, loc="left")
        ax.legend(fontsize=8, frameon=False)
    fig.tight_layout()
    fig.savefig(out / "sensitivity.png", dpi=110)
    plt.close(fig)


def cell(value, digits=3):
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    if isinstance(value, list):
        return ", ".join(str(v) for v in value) if value and isinstance(value[0], str) else f"{value[0]:.{digits}f} to {value[1]:.{digits}f}"
    return f"{value:,}" if isinstance(value, int) else str(value)


def table(headers, rows):
    lines = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    lines += ["| " + " | ".join(cell(v) for v in row) + " |" for row in rows]
    return "\n".join(lines)


def tables(r):
    s, c = r["sensitivity"], r["cross_section"]
    sweep_cols = ["threshold", "inside", "outside", "reachable", "beyond", "unsampled", "rows_changing_zone", "branch_rank_correlation", "growth_top_kept", "edge_top_kept"]
    sweep_head = ["tau", "inside", "outside", "reachable", "beyond", "unsampled", "rows changing zone", "branch rank correlation", f"growth top {TOP} kept", f"edge top {TOP} kept"]
    parts = ["# Threshold Tables", "", "Written by `python3 thresholds.py`. Every figure in `THRESHOLDS.md` comes from `thresholds.json`, which holds the same numbers.", ""]
    parts += ["## Reach Quantile Sweep", "", table(["quantile", *sweep_head], [[x["reach_quantile"], *[x[k] for k in sweep_cols]] for x in s["reach_quantile"]]), ""]
    parts += ["## Minimum Solved Per Branch Sweep", "", table(["minimum", *sweep_head, "unsampled branches"], [[x["min_branch_solved"], *[x[k] for k in sweep_cols], x["unsampled_branches"] or "none"] for x in s["min_branch_solved"]]), ""]
    parts += ["## Ring Radius Sweep", "", table(["core", "outer", "rank correlation of radius with 1 - reach", "inverted pair share", "disc area inside frontier", "disc area in core", "rows changing zone"], [[x["core_radius"], x["outer_radius"], x["rank_correlation_with_distance"], x["inverted_pair_share"], x["disc_area_inside_frontier"], x["disc_area_core"], x["rows_changing_zone"]] for x in s["radii"]]), ""]
    parts += ["## Score Weight Sweep", "", table(["weight on resolved", "row rank correlation", "branch rank correlation", "distinct scores"], [[x["weight_resolved"], x["row_rank_correlation"], x["branch_rank_correlation"], x["distinct_scores"]] for x in r["weights"]["sweep"]]), ""]
    w = r["weights"]
    parts += ["## Score Weight Breakpoints", "", table(["weights on resolved where two score cells tie", "interval around the shipped weight with one fixed order"], [[", ".join(f"{p:.3f}" for p in w["breakpoints"]), w["order_stable_interval"]]]), ""]
    parts += ["## Formal Status By Solved", "", table(["formal status", "rows", "solved"], [[k, v["rows"], v["solved"]] for k, v in r["weights"]["formal_by_solved"].items()]), ""]
    parts += ["## Leakage Ladder", "", table(["neighbour rule", "groups", "ROC AUC", "95% interval"], [[x["rule"], x["groups"], x["auc"], x["ci95"]] for x in c["leakage_ladder"]]), ""]
    parts += ["## Models Under Grouped Cross-Validation", "", table(["model", "ROC AUC", "95% interval", "Brier score"], [[x["model"], x["auc"], x["ci95"], x["brier"]] for x in c["models"]]), ""]
    parts += ["## AUC Gains", "", table(["comparison", "AUC gain", "95% interval"], [["reach over branch base rate", c["gain_of_reach_over_branch_base_rate"]["value"], c["gain_of_reach_over_branch_base_rate"]["ci95"]], ["reach added to branch, source and kind", c["gain_over_branch_source_kind"]["value"], c["gain_over_branch_source_kind"]["ci95"]]]), ""]
    for title, key in (("AUC Within Branch", "by_branch"), ("AUC Within Source", "by_source"), ("AUC Within Kind", "by_kind")):
        parts += [f"## {title}", "", table(["stratum", "rows", "solved", "ROC AUC", "95% interval", "Youden tau", "quantile rule tau"], [[x["name"], x["rows"], x["solved"], x["auc"], x["ci95"], x["youden_tau"], x["quantile_tau"]] for x in c[key]]), ""]
    parts += ["## Leave One Branch Out", "", table(["held-out branch", "rows", "solved", "ROC AUC", "tau from the other branches", "solved inside", "open inside"], [[x["branch"], x["rows"], x["solved"], x["auc"], x["train_tau"], x["tpr"], x["fpr"]] for x in c["leave_one_branch_out"]]), ""]
    parts += ["## Calibration", "", table(["decile", "rows", "reach from", "reach to", "mean reach", "solved share", "predicted share"], [[k + 1, b["n"], b["reach_low"], b["reach_high"], b["mean_reach"], b["solved_share"], b["predicted_share"]] for k, b in enumerate(c["calibration"]["bins"])]), ""]
    parts += ["## Derived Tau", "", table(["criterion", "tau", "95% interval", "solved inside", "open inside", "Youden J", "precision"], [[k, v["tau"], v.get("ci95"), v["tpr"], v["fpr"], v["youden_j"], v["precision"]] for k, v in c["derived_tau"].items()]), ""]
    parts += ["## Shipped Frontier At Proposed Values", "", table(["proposal", *sweep_head], [[k, *[v[c] for c in sweep_cols]] for k, v in r["proposed"].items()]), ""]
    parts += ["## Time Split", "", table(["cutoff", "solved by cutoff", "tested, dated", "solved later", "ROC AUC", "95% interval", "branch base rate AUC", "95% interval", "AUC gain", "95% interval", "AUC with undated rows"], [[str(t["cutoff"]), t["reference_solved"], t["tested_dated"], t["solved_later"], t["auc"]["value"], t["auc"]["ci95"], t["branch_base_rate_auc"]["value"], t["branch_base_rate_auc"]["ci95"], t["gain_over_branch_base_rate"]["value"], t["gain_over_branch_base_rate"]["ci95"], t["auc_with_undated"]] for t in r["time_split"]]), ""]
    parts += ["## Time Split Against Source Base Rate", "", table(["cutoff", "source base rate AUC", "95% interval", "AUC gain of reach", "95% interval"], [[str(t["cutoff"]), t["source_base_rate_auc"]["value"], t["source_base_rate_auc"]["ci95"], t["gain_over_source_base_rate"]["value"], t["gain_over_source_base_rate"]["ci95"]] for t in r["time_split"]]), ""]
    parts += ["## Time Split Sources", "", table(["cutoff", "source list", "tested", "solved later"], [[str(t["cutoff"]), x["source"], x["tested"], x["solved_later"]] for t in r["time_split"] for x in t["sources"][:8]]), ""]
    rows = [[str(t["cutoff"]), k, v["tau"], v["tpr"], v["fpr"], v["precision"], v["inside"]] for t in r["time_split"] for k, v in t["train_tau"].items()]
    parts += ["## Time Split Tau", "", "Tau is picked from the snapshot at the cutoff and scored on the dated rows that were open then.", "", table(["cutoff", "criterion", "tau", "later solved inside", "still open inside", "precision", "rows inside"], rows), ""]
    return "\n".join(parts)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=NEIGHBORS)
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument("--bootstraps", type=int, default=BOOTSTRAPS)
    parser.add_argument("--no-figures", action="store_true")
    args = parser.parse_args()
    data = json.loads(args.data.read_text())
    ids = [x["id"] for x in data["nodes"] if x["kind"] != "lean"]
    emb, texts = load_embeddings(ids)
    result, arrays, cross = analyse(data, emb @ emb.T, texts, args.bootstraps)
    args.out.mkdir(parents=True, exist_ok=True)
    clean = rounded(result)
    (args.out / "thresholds.json").write_text(json.dumps(clean, indent=1) + "\n")
    (args.out / "tables.md").write_text(tables(clean))
    if not args.no_figures:
        figures(clean, arrays, cross, args.out)
    print(args.out / "thresholds.json")


if __name__ == "__main__":
    main()
