import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).parent
REPO = HERE.parent.parent
NEIGHBORS = REPO / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"
FORECASTS = HERE / "forecasts"
CUTOFFS = (2005, 2015, 2021)
REACH_QUANTILE = 0.1
MIN_BRANCH_SOLVED = 10
SCHEMA = "bucket.solvability-atlas.forecast/v1"


def quantile(sorted_values, q):
    return sorted_values[min(len(sorted_values) - 1, max(0, int(q * len(sorted_values))))]


def reach_against(node, ids, solved):
    best = -1.0
    for j, s in zip(node["n"], node["s"]):
        other = ids[j]
        if other != node["id"] and other in solved and s > best:
            best = s
    stored = node.get("solved_nearest")
    if stored and stored["id"] != node["id"] and stored["id"] in solved and stored["sim"] > best:
        best = stored["sim"]
    if best >= 0:
        return best, False
    return (node["s"][-1] if node["s"] else 0.0), True


def eligible(node, cutoff):
    posed = node.get("posed")
    resolved = node.get("resolved")
    is_solved = bool(node["solved"]) and resolved is not None and resolved <= cutoff and (posed is None or posed <= cutoff)
    is_tested = not is_solved and posed is not None and posed <= cutoff
    return is_solved, is_tested


def forecast(data, cutoff, built=None, min_branch_solved=MIN_BRANCH_SOLVED):
    nodes = [n for n in data["nodes"] if n["kind"] != "lean"]
    roles = {}
    for n in nodes:
        is_solved, is_tested = eligible(n, cutoff)
        if is_solved:
            roles[n["id"]] = "solved"
        elif is_tested:
            roles[n["id"]] = "tested"
    solved = {i for i, r in roles.items() if r == "solved"}
    if len(solved) < 2:
        raise ValueError(f"cutoff {cutoff} leaves fewer than two solved problems")
    by_id = {n["id"]: n for n in nodes}
    solved_reach = [reach_against(by_id[i], data["ids"], solved) for i in sorted(solved)]
    decided = sorted(r for r, bounded in solved_reach if not bounded)
    if len(decided) < 2:
        raise ValueError(f"cutoff {cutoff} leaves fewer than two solved problems with a solved neighbour")
    threshold = quantile(decided, REACH_QUANTILE)
    per_branch = {}
    for i in solved:
        per_branch[by_id[i]["branch"]] = per_branch.get(by_id[i]["branch"], 0) + 1
    rows = []
    for i in sorted(i for i, r in roles.items() if r == "tested"):
        n = by_id[i]
        reach, bounded = reach_against(n, data["ids"], solved)
        if per_branch.get(n["branch"], 0) < min_branch_solved:
            zone = "unsampled"
        elif not bounded and reach >= threshold:
            zone = "inside"
        elif bounded and reach >= threshold:
            zone = "undecided"
        else:
            zone = "outside"
        rows.append({"id": i, "branch": n["branch"], "posed": n["posed"], "words": n.get("words", len(n["title"].split())), "reach": reach, "bounded": bounded, "zone": zone})
    digest = hashlib.sha256(json.dumps(sorted(roles.items()), separators=(",", ":")).encode()).hexdigest()
    return {
        "schema": SCHEMA,
        "cutoff": cutoff,
        "built": built or dt.date.today().isoformat(),
        "model": data["model"],
        "revision": data["revision"],
        "k": data["k"],
        "input_hash": digest,
        "solved": len(solved),
        "threshold_bounded": sum(1 for _, bounded in solved_reach if bounded),
        "threshold": threshold,
        "rows": rows,
    }


def write(data, cutoff, out=FORECASTS, built=None):
    out.mkdir(parents=True, exist_ok=True)
    result = forecast(data, cutoff, built)
    path = out / f"{cutoff}.json"
    path.write_text(json.dumps(result, indent=1) + "\n")
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("cutoffs", nargs="*", type=int, default=list(CUTOFFS))
    parser.add_argument("--data", type=Path, default=NEIGHBORS)
    parser.add_argument("--out", type=Path, default=FORECASTS)
    args = parser.parse_args()
    data = json.loads(args.data.read_text())
    for c in args.cutoffs:
        print(write(data, c, args.out))


if __name__ == "__main__":
    main()
