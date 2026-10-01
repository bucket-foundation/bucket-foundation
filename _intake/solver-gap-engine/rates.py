import argparse, collections, json, pathlib
from backtest import git, snapshot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--head", default="HEAD")
    ap.add_argument("--dates", nargs="+", default=["2025-09-01", "2025-12-01", "2026-03-01", "2026-06-01", "2026-09-01"])
    ap.add_argument("--out", default="backtest")
    a = ap.parse_args()
    head = git(a.repo, "rev-parse", a.head).decode().strip()
    commits = [git(a.repo, "rev-list", "-1", f"--before={d}", head).decode().strip() for d in a.dates] + [head]
    labels = a.dates + [git(a.repo, "show", "-s", "--format=%cs", head).decode().strip()]
    snaps = [snapshot(a.repo, c) for c in commits]
    out = []
    for k in range(len(snaps) - 1):
        start, end = snaps[k], snaps[k + 1]
        opened = [p for p, r in start.items() if r["status"] == "open"]
        tracked = [p for p in opened if p in end]
        solved = [p for p in tracked if end[p]["status"] == "solved"]
        out.append({"window": f"{labels[k]} to {labels[k + 1]}", "open_at_start": len(opened), "tracked": len(tracked), "solved": len(solved),
                    "rate": round(len(solved) / len(tracked), 4), "with_lean_proof": sum(end[p]["lean_proof"] for p in solved),
                    "by_collection": dict(collections.Counter(start[p]["collection"] for p in solved).most_common())})
        print(json.dumps(out[-1]))
    log = git(a.repo, "log", f"--since={a.dates[-1]}", "--format=#C#%h %cs %an", "-p", "-U0", head, "--", "FormalConjectures").decode(errors="ignore")
    removed, added, meta, commit = collections.Counter(), collections.Counter(), {}, None
    for line in log.split("\n"):
        if line.startswith("#C#"):
            commit = line[3:].split()[0]
            meta[commit] = line[3:].split(" ", 2)
        elif line.startswith("-") and "category research open" in line:
            removed[commit] += 1
        elif line.startswith("+") and "category research solved" in line:
            added[commit] += 1
    flips = {c: min(removed[c], added[c]) for c in meta if min(removed[c], added[c]) > 0}
    authors = collections.Counter()
    for c, n in flips.items():
        authors[meta[c][2]] += n
    last = {"since": a.dates[-1], "commits_with_a_flip": len(flips), "largest_commit": max(flips.values()), "days_with_a_flip": len({meta[c][1] for c in flips}), "authors": len(authors)}
    print(json.dumps(last))
    json.dump({"head": head[:8], "windows": out, "last_window_commits": last}, open(pathlib.Path(a.out) / "resolution-rate.json", "w"), indent=1)


if __name__ == "__main__":
    main()
