import argparse, json, pathlib
import numpy as np
from backtest import auc, git, interval, permutation_p, snapshot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--dates", nargs="+", default=["2025-09-01", "2025-12-01", "2026-03-01", "2026-06-01"])
    ap.add_argument("--out", default="backtest")
    ap.add_argument("--head", default="HEAD")
    a = ap.parse_args()
    head = git(a.repo, "rev-parse", a.head).decode().strip()
    commits = [git(a.repo, "rev-list", "-1", f"--before={d}", a.head).decode().strip() for d in a.dates] + [head]
    labels = a.dates + [git(a.repo, "show", "-s", "--format=%cs", head).decode().strip()]
    snaps = [snapshot(a.repo, c) for c in commits]
    rng = np.random.default_rng(0)
    out = []
    for k in range(1, len(snaps) - 1):
        before, now, after = snaps[k - 1], snaps[k], snaps[k + 1]
        recent = {}
        for pid, r in now.items():
            if r["status"] == "solved" and before.get(pid, {}).get("status") == "open":
                recent[r["file"]] = recent.get(r["file"], 0) + 1
        ids = [p for p, r in now.items() if r["status"] == "open" and p in after]
        x = np.array([recent.get(now[p]["file"], 0) for p in ids], float)
        y = np.array([after[p]["status"] == "solved" for p in ids])
        hot = x > 0
        out.append({"window": f"{labels[k]} to {labels[k + 1]}", "prior_window": f"{labels[k - 1]} to {labels[k]}", "tracked": len(ids), "solved_later": int(y.sum()),
                    "base_rate": round(float(y.mean()), 4), "with_recent_sibling": int(hot.sum()), "rate_with": round(float(y[hot].mean()), 4) if hot.any() else None,
                    "rate_without": round(float(y[~hot].mean()), 4), "auc": round(auc(x, y), 3), "auc_ci95": interval(x, y, rng), "p_permutation": permutation_p(x, y, rng)})
        print(json.dumps(out[-1]))
    json.dump(out, open(pathlib.Path(a.out) / "momentum.json", "w"), indent=1)


if __name__ == "__main__":
    main()
