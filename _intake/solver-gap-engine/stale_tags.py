import argparse, collections, json, pathlib, re
import yaml
from backtest import PAT, git, snapshot

RESOLVED = {"proved", "disproved", "solved", "proved (Lean)", "disproved (Lean)", "solved (Lean)", "independent"}
HALF = {"not provable", "not disprovable"}
CHECKABLE = {"falsifiable", "decidable", "verifiable"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--head", default="HEAD")
    ap.add_argument("--database", required=True)
    ap.add_argument("--out", default="backtest")
    a = ap.parse_args()
    head = git(a.repo, "rev-parse", a.head).decode().strip()
    rows = snapshot(a.repo, head)
    db = {int(p["number"]): p for p in yaml.safe_load(open(pathlib.Path(a.database) / "data/problems.yaml"))}
    files = collections.defaultdict(dict)
    for pid, r in rows.items():
        m = re.fullmatch(r"ErdosProblems/(\d+)\.lean", r["file"])
        if m:
            files[int(m[1])][pid.split("::")[1]] = r
    stale, ahead, agree_open, agree_resolved, checkable, missing, half = [], [], 0, 0, [], 0, 0
    for n, theorems in sorted(files.items()):
        main_rows = {k: r for k, r in theorems.items() if ".variants." not in k}
        if not main_rows or n not in db:
            missing += 1
            continue
        state = db[n]["status"]["state"]
        if state in HALF:
            half += 1
            continue
        fc_open = [k for k, r in main_rows.items() if r["status"] == "open"]
        fc_all_open = len(fc_open) == len(main_rows)
        fc_all_solved = not fc_open
        row = {"number": n, "database_state": state, "database_updated": db[n]["status"].get("last_update"), "open_theorems": fc_open,
               "main_theorems": len(main_rows), "url": f"https://www.erdosproblems.com/{n}"}
        text = git(a.repo, "show", f"{head}:FormalConjectures/ErdosProblems/{n}.lean").decode(errors="ignore")
        row["proof_repositories"] = sorted({repo for m in PAT.finditer(text) if m["name"] in main_rows
                                            for repo in re.findall(r'formal_proof using \w+ at\s+"https://github\.com/([^/]+/[^/]+)/', m["tags"])})
        if state in RESOLVED and fc_all_open:
            stale.append(row)
        elif state not in RESOLVED and fc_all_solved:
            ahead.append(row)
        elif state in RESOLVED:
            agree_resolved += 1
        else:
            agree_open += 1
        if state in CHECKABLE and fc_open:
            checkable.append(row)
    out = {"head": head[:8], "database_commit": git(a.database, "rev-parse", "--short", "HEAD").decode().strip(),
           "database_date": git(a.database, "show", "-s", "--format=%cs", "HEAD").decode().strip(),
           "erdos_files": len(files), "compared": len(files) - missing - half, "not_compared": missing, "half_settled_excluded": half, "agree_open_or_partial": agree_open, "agree_resolved_or_partial": agree_resolved,
           "stale_open_upstream": len(stale), "stale_by_state": dict(collections.Counter(r["database_state"] for r in stale).most_common()),
           "upstream_solved_database_open": len(ahead), "ahead_by_state": dict(collections.Counter(r["database_state"] for r in ahead).most_common()),
           "ahead_with_formal_proof_link": sum(bool(r["proof_repositories"]) for r in ahead),
           "ahead_by_repository": dict(collections.Counter(x for r in ahead for x in r["proof_repositories"]).most_common()),
           "checkable_and_open": len(checkable), "stale": stale, "ahead": ahead, "checkable": checkable}
    json.dump(out, open(pathlib.Path(a.out) / "stale-tags.json", "w"), indent=1)
    print(json.dumps({k: v for k, v in out.items() if k not in ("stale", "ahead", "checkable")}, indent=1))


if __name__ == "__main__":
    main()
