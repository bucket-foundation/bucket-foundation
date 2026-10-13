import argparse
import json
import sys
from pathlib import Path

import numpy as np

import atlas
import claims_frontier
import embed_ablation
import embed_inputs
import forecast
import scoring
import thresholds

HERE = Path(__file__).parent
OUT = HERE / "ablation"
SEED = 20261012
BOOTSTRAPS = thresholds.BOOTSTRAPS
PERMUTATIONS = scoring.PERMUTATIONS
INPUT = "current"
PAIR_TARGET = len(atlas.EXPECTED_PAIRS)
RULE = "Switch when the AUC with undated solved rows removed rises by more than the permutation spread and every expected pair still hits."


def embeddings(spec, model, committed, variant=INPUT):
    nodes = embed_ablation.full_nodes(committed)
    texts = [embed_inputs.text_for(n, variant) for n in nodes]
    emb, fresh = embed_ablation.encode(spec, model, texts)
    return nodes, emb, fresh


def leakage_ladder(nodes, sim, n=BOOTSTRAPS):
    labels = np.array([bool(x["solved"]) for x in nodes])
    roots = thresholds.family_roots(nodes)
    levels = [("the row itself, the shipped rule", np.arange(len(nodes))), ("its variant family", thresholds.group_labels(roots))]
    for d in (0.95, 0.9):
        levels.append((f"family and near duplicates at {d}", thresholds.group_labels(roots, sim, d)))
    out = []
    for name, groups in levels:
        r, _ = thresholds.reach(sim, labels, groups)
        got = thresholds.with_interval(lambda idx: thresholds.auc(r[idx], labels[idx]), groups, n)
        out.append({"excluded": name, "groups": int(len(np.unique(groups))), "auc": got["value"], "ci95": got["ci95"]})
    return out, levels[2][1]


def time_splits(nodes, sim, groups, n=BOOTSTRAPS):
    keep = ("cutoff", "reference_solved", "tested", "solved_later", "auc", "ci95")
    out = []
    for cutoff in forecast.CUTOFFS:
        t = thresholds.time_split(nodes, sim, groups, cutoff, n)
        out.append({k: t[k] for k in keep if k in t})
    return out


def dated_rows(f, status):
    rows = []
    for r in f["rows"]:
        s = status[r["id"]]
        if r["zone"] in ("undecided", "unsampled") or (s["solved"] and s["resolved"] is None):
            continue
        rows.append((r["id"], r["reach"], s["status"] in scoring.SETTLED))
    return rows


def permutation_spread(rows, permutations=PERMUTATIONS, seed=SEED):
    reach = np.array([r[1] for r in rows])
    hit = np.array([r[2] for r in rows])
    observed = scoring.auc(reach, hit)
    rng = np.random.default_rng(seed)
    null = np.array([scoring.auc(reach, rng.permutation(hit)) for _ in range(permutations)])
    lo, hi = np.percentile(null, [2.5, 97.5])
    return {"rows": len(rows), "positives": int(hit.sum()), "auc": observed, "null_95": [float(lo), float(hi)], "spread": float((hi - lo) / 2), "p_one_sided": float((np.sum(null >= observed) + 1) / (permutations + 1))}


def paired_difference(a, b, n=BOOTSTRAPS, seed=SEED):
    left = {r[0]: r for r in a}
    shared = [(left[r[0]][1], r[1], r[2]) for r in b if r[0] in left]
    x, y, hit = (np.array(v) for v in zip(*shared))
    rng = np.random.default_rng(seed)
    draws = []
    for _ in range(n):
        idx = rng.integers(0, len(hit), len(hit))
        if hit[idx].any() and not hit[idx].all():
            draws.append(scoring.auc(y[idx], hit[idx]) - scoring.auc(x[idx], hit[idx]))
    return {"rows": len(shared), "positives": int(hit.sum()), "difference": scoring.auc(y, hit) - scoring.auc(x, hit), "ci95": thresholds.interval(draws)}


def pair_hits(spec, model):
    problems = atlas.load_problems()
    ids = [n["id"] for n in problems]
    out = []
    for variant in atlas.TEXT_VARIANTS:
        texts = [atlas.embed_text(n, variant)[0] for n in problems]
        emb, _ = embed_ablation.encode(spec, model, texts)
        for dim in spec.get("dims", (None,)):
            hits = atlas.pair_hits(ids, embed_ablation.truncated(emb, dim))
            out.append({"model": embed_ablation.label_at(spec, dim), "variant": variant, "hits": hits["hits"], "pairs": hits["pairs"], "missed": ["+".join(p) for p in hits["missed"]]})
    return out


def one_model(spec, committed, status, n, permutations):
    model = embed_ablation.load(spec)
    nodes, emb, fresh = embeddings(spec, model, committed)
    result = {"model": spec["name"], "revision": spec["revision"], "fresh_embeddings": fresh, "dims": {}, "pair_hits": pair_hits(spec, model)}
    dated = {}
    for dim in spec.get("dims", (None,)):
        label = embed_ablation.label_at(spec, dim)
        e = embed_ablation.truncated(emb, dim)
        problem = np.array([x["kind"] != "lean" for x in nodes])
        kept = [{**x, "source": x.get("source", "tools/solvability-atlas/problems.tsv")} for x in nodes if x["kind"] != "lean"]
        sim = e[problem] @ e[problem].T
        ladder, groups = leakage_ladder(kept, sim, n)
        data = embed_ablation.data_for(nodes, e, committed, spec["name"], spec["revision"])
        f = forecast.forecast(data, embed_ablation.CUTOFF, built="2026-10-08")
        scored = scoring.score_forecast(f, status, permutations)
        dated[label] = dated_rows(f, status)
        october = claims_frontier.run(data, label, n, permutations)
        result["dims"][label] = {
            "dimensions": int(e.shape[1]), "leakage_ladder": ladder, "time_split": time_splits(kept, sim, groups, n),
            "forecast_2021": {"threshold": f["threshold"], "auc": scored["auc"], "auc_undated_removed": scored["undatedRemoved"]["auc"], "all": scored["all"], "undated_removed": scored["undatedRemoved"]["all"]},
            "permutation": permutation_spread(dated[label], permutations),
            "frontier": {k: october[k] for k in ("threshold", "upper_reach", "counts")},
            "october": {k: {o: {x: t[x] for x in ("rows", "claimed", "classes", "inside", "outside", "inside_minus_outside", "top_class_minus_outside", "permutation_p", "reach_auc")} for o, t in v.items()} for k, v in october["tables"].items() if k in ("covered_branches", "erdos")},
        }
    return result, dated


def verdict(base, other, hits):
    gain = other["forecast_2021"]["auc_undated_removed"] - base["forecast_2021"]["auc_undated_removed"]
    spread = max(base["permutation"]["spread"], other["permutation"]["spread"])
    return {"gain_undated_removed": gain, "permutation_spread": spread, "pair_hits": hits, "pair_target": PAIR_TARGET, "switch": bool(gain > spread and hits == PAIR_TARGET)}


def compare(labels, n=BOOTSTRAPS, permutations=PERMUTATIONS):
    committed = embed_ablation.base_data()
    status = {x["id"]: {"status": x["status"], "solved": x["solved"], "resolved": x["resolved"]} for x in committed["nodes"]}
    models, dated = {}, {}
    for label in labels:
        models[label], rows = one_model(embed_ablation.spec_of(label), committed, status, n, permutations)
        dated.update(rows)
    base_label = labels[0]
    base = models[base_label]["dims"][base_label]
    default_text = atlas.DEFAULT_TEXT
    verdicts, differences = {}, {}
    for label in labels[1:]:
        for name, d in models[label]["dims"].items():
            hits = next(h["hits"] for h in models[label]["pair_hits"] if h["model"] == name and h["variant"] == default_text)
            verdicts[name] = verdict(base, d, hits)
            differences[name] = paired_difference(dated[base_label], dated[name], n)
    return {"schema": "bucket.solvability-atlas.embedding-compare/v1", "seed": SEED, "bootstraps": n, "permutations": permutations, "input": INPUT, "rule": RULE, "baseline": base_label, "models": models, "paired_auc_difference": differences, "verdict": verdicts}


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="*", default=["bge-small-en-v1.5", "embeddinggemma-2"])
    parser.add_argument("--out", type=Path, default=OUT / "embeddinggemma-2.json")
    args = parser.parse_args(argv)
    result = thresholds.rounded(compare(args.labels))
    args.out.write_text(json.dumps(result, indent=1) + "\n")
    print(json.dumps({"verdict": result["verdict"], "paired": result["paired_auc_difference"]}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
