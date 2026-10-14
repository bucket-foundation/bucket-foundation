import argparse
import csv
import io
import json
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix, diags, identity
from scipy.linalg import cho_factor, cho_solve
from scipy.sparse.linalg import eigsh

import thresholds

sys.path.insert(0, str(Path(__file__).parent / "sources"))

import erdos_problems

HERE = Path(__file__).parent
REPO = HERE.parent.parent
NEIGHBORS = REPO / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"
ATLAS_TSV = HERE / "problems.tsv"
SOURCED_TSV = HERE / "problems-sourced.tsv"
OPENALEX = HERE / "openalex-sourced.json"
OUT = HERE / "surface"
TABLE = OUT / "table.csv"
SCHEMA = "bucket.solvability-atlas.surface-table/v1"
AS_OF = 2026
DIMS = 8
SEED = 20261013
COORDS = tuple(f"x{k + 1}" for k in range(DIMS))
TARGETS = ("years_to_resolve", "log_years", "time_open", "event", "solved_share")
POST_OUTCOME = ("posed_bound", "source", "source_class", "status", "solved", "resolved", "formal", "reach_2026", "zone", "inside", "disc_radius", "level", "openalex_works")
MAP_FEATURES = COORDS + ("theta_sin", "theta_cos", "in_degree", "sim_mean", "sim_top", "log_words")
POSED_FEATURES = ("reach_at_posed", "solved_before_posed", "posed_before_posed")
CATEGORICAL = ("branch", "form")
YEAR = ("posed",)
FIELDS = (
    ("id", "title", "branch", "kind", "form", "variant_of", "source_class", "source", "licence", "status", "solved", "formal", "level", "posed", "posed_bound", "resolved")
    + TARGETS
    + ("words", "theta")
    + MAP_FEATURES
    + POSED_FEATURES
    + ("reach_2026", "zone", "inside", "disc_radius", "openalex_works", "openalex_works_before_posed", "group")
)


def read_tsv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def formal_and_level():
    formal, level = {}, {}
    for r in read_tsv(ATLAS_TSV) + read_tsv(SOURCED_TSV):
        formal[r["id"]] = r.get("lean") or ""
        if r.get("level"):
            level[r["id"]] = int(r["level"])
    return formal, level


def adjacency(arrays):
    n = len(arrays["ids"])
    rows = np.repeat(np.arange(n), arrays["neighbour"].shape[1])
    cols = arrays["neighbour"].ravel()
    vals = arrays["similarity"].ravel()
    keep = cols >= 0
    directed = coo_matrix((vals[keep], (rows[keep], cols[keep])), shape=(n, n)).tocsr()
    return directed.maximum(directed.T).tocsr()


def spectral_coordinates(weights, dims=DIMS, seed=SEED):
    degree = np.asarray(weights.sum(1)).ravel()
    scale = diags(1.0 / np.sqrt(degree))
    normalised = scale @ weights @ scale
    start = np.random.default_rng(seed).standard_normal(weights.shape[0])
    values, vectors = eigsh(normalised, k=dims + 1, which="LA", v0=start, tol=1e-10)
    order = np.argsort(-values)[1:]
    coords = (scale @ vectors[:, order]) * values[order]
    coords = (coords - coords.mean(0)) / coords.std(0)
    flip = np.sign(coords[np.abs(coords).argmax(0), np.arange(coords.shape[1])])
    return coords * flip


def graph_kernel(weights, columns, ridge):
    degree = np.asarray(weights.sum(1)).ravel()
    scale = diags(1.0 / np.sqrt(degree))
    laplacian = (identity(weights.shape[0]) - scale @ weights @ scale).toarray()
    laplacian[np.diag_indices_from(laplacian)] += ridge
    unit = np.zeros((weights.shape[0], len(columns)))
    unit[columns, np.arange(len(columns))] = 1.0
    return cho_solve(cho_factor(laplacian, overwrite_a=True, check_finite=False), unit, check_finite=False)


def posed_features(arrays):
    nodes = arrays["nodes"]
    posed = np.array([n["posed"] if n["posed"] is not None else np.nan for n in nodes], dtype=float)
    resolved = np.array([n["resolved"] if n["resolved"] is not None else np.nan for n in nodes], dtype=float)
    reach = np.full(len(nodes), np.nan)
    solved_before = np.full(len(nodes), np.nan)
    posed_before = np.full(len(nodes), np.nan)
    for i in np.flatnonzero(~np.isnan(posed)):
        near = arrays["neighbour"][i]
        ok = near >= 0
        earlier = ok & (resolved[np.maximum(near, 0)] < posed[i])
        solved_before[i] = earlier.sum()
        posed_before[i] = (ok & (posed[np.maximum(near, 0)] < posed[i])).sum()
        sims = arrays["similarity"][i]
        reach[i] = sims[earlier].max() if earlier.any() else sims[ok].min()
    return reach, solved_before, posed_before


def disc_radius(zone, reach, tau, solved_floor, floor):
    def span(value, lo, hi):
        return 0.0 if hi == lo else min(1.0, max(0.0, (value - lo) / (hi - lo)))

    core, edge, outer = thresholds.SHIPPED["core_radius"], thresholds.SHIPPED["frontier_radius"], thresholds.SHIPPED["outer_radius"]
    if zone == "solved":
        return core * (1 - span(reach, solved_floor, 1))
    if zone == "reachable":
        return core + (edge - core) * (1 - span(reach, tau, 1))
    if zone == "unsampled":
        return edge + (outer - edge) * (1 - span(reach, floor, 1))
    return edge + (outer - edge) * (1 - span(reach, floor, tau))


def zones(arrays):
    solved, near, branch = arrays["solved"], arrays["near"], arrays["branch"]
    tau = thresholds.frontier(arrays)["threshold"]
    per_branch = Counter(branch[solved].tolist())
    sampled = np.array([per_branch.get(b, 0) >= thresholds.SHIPPED["min_branch_solved"] for b in branch.tolist()])
    zone = np.where(solved, "solved", np.where(~sampled, "unsampled", np.where(near >= tau, "reachable", "beyond")))
    floor = min(tau, float(near.min()))
    solved_floor = float(near[solved].min())
    radius = np.array([disc_radius(z, r, tau, solved_floor, floor) for z, r in zip(zone.tolist(), near.tolist())])
    return zone, radius, tau


def openalex_counts():
    if not OPENALEX.exists():
        return {}
    return json.loads(OPENALEX.read_text())["rows"]


def with_bound_years(nodes, years):
    out = []
    for n in nodes:
        fill = years.get(n["id"], {})
        posed = fill.get("posed") if n["posed"] is None else None
        resolved = fill.get("resolved") if n["resolved"] is None and n["solved"] else None
        out.append({**n, "posed": n["posed"] if posed is None else posed, "resolved": n["resolved"] if resolved is None else resolved, "posed_bound": int(posed is not None)})
    return out


def build(data=None, years=None):
    data = data or json.loads(NEIGHBORS.read_text())
    arrays = thresholds.frontier_arrays(data)
    arrays["nodes"] = with_bound_years(arrays["nodes"], erdos_problems.bound_years() if years is None else years)
    nodes = arrays["nodes"]
    weights = adjacency(arrays)
    coords = spectral_coordinates(weights)
    reach_posed, solved_before, posed_before = posed_features(arrays)
    zone, radius, tau = zones(arrays)
    formal, level = formal_and_level()
    works = openalex_counts()
    in_degree = np.bincount(arrays["neighbour"][arrays["neighbour"] >= 0], minlength=len(nodes))
    usable = arrays["neighbour"] >= 0
    solved_near = usable & arrays["solved"][np.maximum(arrays["neighbour"], 0)]
    groups = thresholds.group_labels(thresholds.family_roots(nodes))
    rows = []
    for i, n in enumerate(nodes):
        posed, resolved = n["posed"], n["resolved"]
        dated = posed is not None and resolved is not None and resolved >= posed
        years = resolved - posed if dated else None
        sims = arrays["similarity"][i][usable[i]]
        activity = works.get(n["id"])
        before = None
        if activity and posed is not None:
            before = sum(v for y, v in activity["by_year"].items() if int(y) < posed)
        row = {
            "id": n["id"],
            "title": n["title"],
            "branch": n["branch"],
            "kind": n["kind"],
            "form": n["form"],
            "variant_of": n["variant_of"] or "",
            "source_class": thresholds.source_class(n["source"]),
            "source": n["source"],
            "licence": n["licence"],
            "status": n["status"],
            "solved": int(bool(n["solved"])),
            "formal": formal.get(n["id"], ""),
            "level": level.get(n["id"], ""),
            "posed": "" if posed is None else posed,
            "posed_bound": n["posed_bound"],
            "resolved": "" if resolved is None else resolved,
            "years_to_resolve": "" if years is None else years,
            "log_years": "" if years is None else round(math.log1p(years), 6),
            "time_open": "" if posed is None else (years if dated else AS_OF - posed),
            "event": "" if posed is None else int(dated),
            "solved_share": round(float(solved_near[i].sum() / usable[i].sum()), 6),
            "words": n["words"],
            "theta": n["theta"],
            "theta_sin": round(math.sin(n["theta"]), 6),
            "theta_cos": round(math.cos(n["theta"]), 6),
            "in_degree": int(in_degree[i]),
            "sim_mean": round(float(sims.mean()), 6),
            "sim_top": round(float(sims.max()), 6),
            "log_words": round(math.log1p(n["words"]), 6),
            "reach_at_posed": "" if np.isnan(reach_posed[i]) else round(float(reach_posed[i]), 6),
            "solved_before_posed": "" if np.isnan(solved_before[i]) else int(solved_before[i]),
            "posed_before_posed": "" if np.isnan(posed_before[i]) else int(posed_before[i]),
            "reach_2026": round(float(arrays["near"][i]), 6),
            "zone": zone[i],
            "inside": int(zone[i] in ("solved", "reachable")),
            "disc_radius": round(float(radius[i]), 6),
            "openalex_works": "" if not activity else activity["works_total"],
            "openalex_works_before_posed": "" if before is None else before,
            "group": int(groups[i]),
        }
        for k, name in enumerate(COORDS):
            row[name] = round(float(coords[i, k]), 6)
        rows.append(row)
    return {"rows": rows, "weights": weights, "threshold": tau, "arrays": arrays}


def carry_counts(rows):
    has = lambda r, k: r[k] != ""
    return {
        "rows": len(rows),
        "years_to_resolve": sum(has(r, "years_to_resolve") for r in rows),
        "time_open": sum(has(r, "time_open") for r in rows),
        "time_open_censored": sum(has(r, "time_open") and r["event"] == 0 for r in rows),
        "solved_share": sum(has(r, "solved_share") for r in rows),
        "level": sum(has(r, "level") for r in rows),
        "formal": sum(has(r, "formal") for r in rows),
        "posed": sum(has(r, "posed") for r in rows),
        "resolved": sum(has(r, "resolved") for r in rows),
        "openalex_works": sum(has(r, "openalex_works") for r in rows),
        "openalex_works_and_years_to_resolve": sum(has(r, "openalex_works") and has(r, "years_to_resolve") for r in rows),
    }


def write(rows, path=TABLE):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def load(path=TABLE):
    import pandas as pd

    return pd.read_csv(path, keep_default_na=False, na_values=[""])


def frame(rows):
    buffer = io.StringIO()
    w = csv.DictWriter(buffer, fieldnames=FIELDS, lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    buffer.seek(0)
    return load(buffer)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=TABLE)
    args = parser.parse_args()
    built = build()
    write(built["rows"], args.out)
    print(json.dumps({"schema": SCHEMA, "table": str(args.out.relative_to(REPO)), "carry": carry_counts(built["rows"]), "threshold": built["threshold"]}, indent=1))


if __name__ == "__main__":
    main()
