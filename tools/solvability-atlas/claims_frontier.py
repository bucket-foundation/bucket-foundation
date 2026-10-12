import argparse
import csv
import hashlib
import json
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

import numpy as np

import claims
import forecast
import scoring
import thresholds

HERE = Path(__file__).parent
REPO = HERE.parent.parent
BATCH = "openai-math-2026-10"
RELEASED = "2026-10-06T21:58:50Z"
ANNOUNCED = "2026-10-06T12:00:00Z"
ANNOUNCED_SOURCE = "https://openai.com/news/rss.xml"
BASELINES = {
    "pre_release": {"commit": "23230e8d318eb5fae0eb1d6cf03fdd3ff6408797", "committed": "2026-10-06T04:07:51Z", "role": "the last atlas state on dev committed before the release: 7 hours 53 minutes before the announcement's feed timestamp and 17 hours 51 minutes before the repository's first commit"},
    "work_parent": {"commit": "539c4d00482fe9ad8230962acf1dcd03039755bf", "committed": "2026-10-12T20:14:19Z", "role": "the parent of the ledger and of this analysis, six days after the release"},
}
PRIMARY = "pre_release"
BASELINE = BASELINES["work_parent"]["commit"]
NEIGHBORS_PATH = "src/lib/research-os/solvability-neighbors-data.json"
PREDICTIONS_PATH = "public/papers/solvability-frontier/data/predictions.csv"


def frozen_path(name):
    return HERE / "claims" / f"baseline-{BASELINES[name]['commit'][:9]}.tsv"


FROZEN = frozen_path("work_parent")
OUT = HERE / "claims" / "frontier-2026-10.json"
TABLES = HERE / "claims" / "frontier-2026-10.tables.md"
SEED = 20261012
BOOTSTRAPS = 2000
PERMUTATIONS = scoring.PERMUTATIONS
UPPER_QUANTILE = 0.75
DUPLICATE_SIMILARITY = thresholds.DUPLICATE_SIMILARITY
CLASSES = ("close to known results", "borderline", "needs a new idea")
INSIDE = CLASSES[:2]
OUTSIDE = CLASSES[2]
COVERED = ("mathematics", "information")
ERDOS_PREFIX = "fc-erdosproblems-"
OUTCOMES = ("claimed", "claimed_formal_full")
PERMUTATION_NOTE = "The permutation p shuffles rows one by one and ignores the groups the bootstrap resamples, so it reads a little small when related rows share an outcome."
FIELDS = ("id", "branch", "kind", "status", "zone", "reach", "class", "group")


def git_show(path, commit=BASELINE):
    return subprocess.run(["git", "show", f"{commit}:{path}"], cwd=REPO, check=True, capture_output=True).stdout


def baseline_available(commit=BASELINE):
    return subprocess.run(["git", "cat-file", "-e", f"{commit}^{{commit}}"], cwd=REPO, capture_output=True).returncode == 0


def class_of(zone, reach, upper):
    if zone == "solved":
        return ""
    if zone == "unsampled":
        return "unsampled"
    if zone == "beyond":
        return OUTSIDE
    return CLASSES[0] if reach >= upper else CLASSES[1]


def union_find(n):
    link = list(range(n))

    def find(i):
        while link[i] != i:
            link[i] = link[link[i]]
            i = link[i]
        return i

    def join(i, j):
        link[find(i)] = find(j)

    return find, join


def classify(data):
    arrays = thresholds.frontier_arrays(data)
    f = thresholds.frontier(arrays)
    zone, near = f["zone"], arrays["near"]
    upper = forecast.quantile(sorted(near[zone == "reachable"].tolist()), UPPER_QUANTILE) if (zone == "reachable").any() else f["threshold"]
    nodes = arrays["nodes"]
    find, join = union_find(len(nodes))
    first = {}
    for i, root in enumerate(thresholds.family_roots(nodes)):
        if root in first:
            join(i, first[root])
        else:
            first[root] = i
    for i, j in np.argwhere((arrays["similarity"] >= DUPLICATE_SIMILARITY) & (arrays["neighbour"] >= 0)):
        join(int(i), int(arrays["neighbour"][i, j]))
    rows = []
    for i, n in enumerate(nodes):
        rows.append({"id": n["id"], "branch": n["branch"], "kind": n["kind"], "status": n["status"], "zone": str(zone[i]), "reach": round(float(near[i]), 3), "class": class_of(str(zone[i]), float(near[i]), upper), "group": nodes[find(i)]["id"]})
    return {"threshold": f["threshold"], "upper_reach": float(upper), "counts": f["counts"], "rows": rows}


def freeze(path=FROZEN, commit=BASELINE):
    blob = git_show(NEIGHBORS_PATH, commit)
    result = classify(json.loads(blob))
    with open(path, "w", newline="", encoding="utf8") as fh:
        w = csv.DictWriter(fh, FIELDS, delimiter="\t", lineterminator="\n")
        w.writeheader()
        w.writerows(result["rows"])
    return {"commit": commit, "neighbours_sha256": hashlib.sha256(blob).hexdigest(), "threshold": result["threshold"], "upper_reach": result["upper_reach"], "counts": result["counts"]}


def load_frozen(path=FROZEN):
    rows = list(csv.DictReader(open(path, encoding="utf8"), delimiter="\t"))
    for r in rows:
        r["reach"] = float(r["reach"])
    return rows


def outcomes(entries):
    settling = [e for e in entries if claims.settles(e) and e["confirmation"] is None]
    return {
        "claimed": {e["id"] for e in settling},
        "claimed_formal_full": {e["id"] for e in settling if e["formal"]["scope"] == "full"},
        "family": {e["id"]: f"{e['batch']}:{e['family']}" for e in settling},
    }


def merge_claim_families(rows, family):
    by_family = {}
    out = []
    for r in rows:
        key = family.get(r["id"])
        group = by_family.setdefault(key, r["group"]) if key else r["group"]
        out.append(group)
    remap = {}
    for r, g in zip(rows, out):
        if g != r["group"]:
            remap[r["group"]] = g
    return np.array([remap.get(g, g) for g in out])


def rate(mask, hit):
    def stat(idx):
        n = int(mask[idx].sum())
        return None if n == 0 else float((hit[idx] & mask[idx]).sum()) / n

    return stat


def wilson(k, n, z=1.959964):
    if n == 0:
        return None
    p = k / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / (1 + z * z / n)
    return [max(0.0, centre - half), min(1.0, centre + half)]


def cell(mask, hit, groups, n):
    stat = rate(mask, hit)
    value = stat(np.arange(len(mask)))
    rows, hits = int(mask.sum()), int((mask & hit).sum())
    return {"rows": rows, "claimed": hits, "rate": value, "ci95": thresholds.interval(thresholds.bootstrap(stat, groups, n, SEED)), "wilson95": wilson(hits, rows)}


def table(rows, hit_ids, groups, n=BOOTSTRAPS, permutations=PERMUTATIONS):
    cls = np.array([r["class"] for r in rows])
    reach = np.array([r["reach"] for r in rows])
    hit = np.array([r["id"] in hit_ids for r in rows])
    inside = np.isin(cls, INSIDE)
    outside = cls == OUTSIDE
    everything = inside | outside
    r_in, r_out, r_top = rate(inside, hit), rate(outside, hit), rate(cls == CLASSES[0], hit)

    def difference(a, b):
        def stat(idx):
            x, y = a(idx), b(idx)
            return None if x is None or y is None else x - y

        return stat

    def auc(idx):
        return thresholds.auc(reach[idx], hit[idx]) if hit[idx].any() and not hit[idx].all() else None

    full = np.arange(len(rows))
    diff, top_diff = difference(r_in, r_out), difference(r_top, r_out)

    def gap(stat, a, b):
        estimable = bool((hit & a).any() and (hit & b).any())
        return {"value": stat(full), "ci95": thresholds.interval(thresholds.bootstrap(stat, groups, n, SEED)) if estimable else None, "estimable": estimable}

    rate_in, rate_out = r_in(full), r_out(full)
    p = None
    if inside.any() and outside.any():
        p = scoring.round4(scoring.permutation_p(hit[inside].tolist(), hit[outside].tolist(), permutations, scoring.SEED))
    return {
        "rows": int(everything.sum()),
        "claimed": int((hit & everything).sum()),
        "groups": int(len(set(groups[everything].tolist()))),
        "claimed_groups": int(len(set(groups[hit & everything].tolist()))),
        "classes": {c: cell(cls == c, hit, groups, n) for c in CLASSES},
        "inside": cell(inside, hit, groups, n),
        "outside": cell(outside, hit, groups, n),
        "inside_minus_outside": gap(diff, inside, outside),
        "top_class_minus_outside": gap(top_diff, cls == CLASSES[0], outside),
        "ratio": None if not rate_out or rate_in is None else rate_in / rate_out,
        "permutation_p": p,
        "reach_auc": {"value": auc(full), "ci95": thresholds.interval(thresholds.bootstrap(auc, groups, n, SEED))},
    }


def subsets(rows):
    scored = [r for r in rows if r["class"] in CLASSES]
    top = [r for r in scored if r["kind"] != "variant"]
    covered = [r for r in top if r["branch"] in COVERED]
    return {
        "covered_branches": covered,
        "all_sampled_branches": top,
        "erdos": [r for r in covered if r["id"].startswith(ERDOS_PREFIX)],
        "not_erdos": [r for r in covered if not r["id"].startswith(ERDOS_PREFIX)],
        "covered_with_variants": [r for r in scored if r["branch"] in COVERED],
    }


def analyse(rows, entries, n=BOOTSTRAPS, permutations=PERMUTATIONS):
    o = outcomes(entries)
    known = {r["id"]: r for r in rows}
    result = {"unsolved_rows": sum(1 for r in rows if r["zone"] != "solved"), "claimed_rows": {}, "tables": {}}
    for name in OUTCOMES:
        ids = o[name]
        result["claimed_rows"][name] = {
            "all": len(ids),
            "already_solved_in_baseline": sorted(i for i in ids if known[i]["zone"] == "solved"),
            "variants": sum(1 for i in ids if known[i]["kind"] == "variant"),
            "unsampled": sum(1 for i in ids if known[i]["class"] == "unsampled"),
            "by_class": dict(Counter(known[i]["class"] for i in ids if known[i]["kind"] != "variant")),
            "by_branch": dict(Counter(known[i]["branch"] for i in ids)),
        }
    for label, part in subsets(rows).items():
        groups = merge_claim_families(part, o["family"])
        result["tables"][label] = {name: table(part, o[name], groups, n, permutations) for name in OUTCOMES}
    return result


def pct(x, digits=1):
    return "" if x is None else f"{100 * x:.{digits}f}%"


def span(ci, digits=1):
    return "" if ci is None else f"{100 * ci[0]:.{digits}f} to {100 * ci[1]:.{digits}f}"


def markdown_table(t):
    lines = ["| Class before the batch | Open rows | Claimed | Rate | 95% interval |", "|---|---|---|---|---|"]
    for name, c in [(k, t["classes"][k]) for k in CLASSES] + [("inside the frontier", t["inside"]), ("outside the frontier", t["outside"])]:
        lines.append(f"| {name} | {c['rows']} | {c['claimed']} | {pct(c['rate'])} | {span(c['ci95']) if c['claimed'] else span(c['wilson95']) + ', Wilson'} |")
    d, top, a = t["inside_minus_outside"], t["top_class_minus_outside"], t["reach_auc"]
    points = lambda v: "" if v["value"] is None else f"{100 * v['value']:+.1f} points, {span(v['ci95']) if v['estimable'] else 'no interval while a cell holds no claimed row'}"
    lines += ["", f"Inside minus outside: {points(d)}. Top class minus outside: {points(top)}. Permutation p {t['permutation_p']}. Reach AUC {'' if a['value'] is None else round(a['value'], 3)}, {'' if a['ci95'] is None else f'{a['ci95'][0]:.3f} to {a['ci95'][1]:.3f}'}. {t['claimed_groups']} claimed groups in {t['groups']}."]
    return "\n".join(lines)


TITLES = {"covered_branches": "Mathematics And Information", "all_sampled_branches": "All Sampled Branches", "erdos": "Erdős Rows", "not_erdos": "Rows Outside The Erdős List", "covered_with_variants": "Variants Included"}
OUTCOME_TITLE = {"claimed": "every claim of the full problem", "claimed_formal_full": "claims with a Lean statement of the full problem"}


BASELINE_TITLE = {"pre_release": "Baseline Before The Release", "work_parent": "Baseline At The Parent Of This Work"}


def markdown(result):
    parts = []
    for base, tables in ([(b, r["tables"]) for b, r in result["baselines"].items()] if "baselines" in result else [(None, result["tables"])]):
        if base:
            b = result["baselines"][base]
            parts.append(f"# {BASELINE_TITLE[base]}\n\nCommit `{b['commit'][:9]}`, committed {b['committed']}: {b['role']}. {b['rows']} rows.\n")
        for label, title in TITLES.items():
            for name in OUTCOMES:
                parts.append(f"## {title}: {OUTCOME_TITLE[name]}\n\n{markdown_table(tables[label][name])}\n")
    return "\n".join(parts)


def run_baseline(name, entries, n, permutations):
    rows = load_frozen(frozen_path(name))
    known = {r["id"] for r in rows}
    present = [e for e in entries if e["id"] in known]
    return {**BASELINES[name], "frozen": str(frozen_path(name).relative_to(REPO)), "rows": len(rows), "ledger_rows_absent": sorted({e["id"] for e in entries} - known), **analyse(rows, present, n, permutations)}


def run(data=None, label=None, n=BOOTSTRAPS, permutations=PERMUTATIONS):
    entries = claims.entries()
    if data is None:
        baselines = {name: run_baseline(name, entries, n, permutations) for name in BASELINES}
        lead = baselines[PRIMARY]
        return {"schema": "bucket.solvability-atlas.claims-frontier/v2", "batch": BATCH, "released": RELEASED, "announced": ANNOUNCED, "announced_source": ANNOUNCED_SOURCE, "seed": SEED, "bootstraps": n, "permutations": permutations, "duplicate_similarity": DUPLICATE_SIMILARITY, "covered_branches": list(COVERED), "permutation_note": PERMUTATION_NOTE, "primary": PRIMARY, "baselines": baselines, "claimed_rows": lead["claimed_rows"], "tables": lead["tables"]}
    else:
        classified = classify(data)
        rows = classified["rows"]
        meta = {"embedding": label, "model": data.get("model"), "revision": data.get("revision"), "threshold": classified["threshold"], "upper_reach": classified["upper_reach"], "counts": classified["counts"]}
    result = analyse(rows, entries, n, permutations)
    return {"schema": "bucket.solvability-atlas.claims-frontier/v1", "batch": BATCH, "seed": SEED, "bootstraps": n, "permutations": permutations, "duplicate_similarity": DUPLICATE_SIMILARITY, "covered_branches": list(COVERED), **meta, **result}


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--freeze", action="store_true")
    parser.add_argument("--data", type=Path)
    parser.add_argument("--label")
    args = parser.parse_args(argv)
    if args.freeze:
        print(json.dumps({name: freeze(frozen_path(name), b["commit"]) for name, b in BASELINES.items()}))
        return 0
    if args.data:
        if not args.label:
            raise SystemExit("--data needs --label")
        result = run(json.loads(args.data.read_text()), args.label)
        out, tables = OUT.with_name(f"frontier-2026-10-{args.label}.json"), TABLES.with_name(f"frontier-2026-10-{args.label}.tables.md")
    else:
        result = run()
        with tempfile.TemporaryDirectory() as scratch:
            for name, b in BASELINES.items():
                if baseline_available(b["commit"]):
                    result["baselines"][name]["frontier"] = freeze(Path(scratch) / f"{name}.tsv", b["commit"])
        out, tables = OUT, TABLES
    out.write_text(json.dumps(result, indent=1) + "\n")
    tables.write_text(markdown(result))
    print(markdown(result))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
