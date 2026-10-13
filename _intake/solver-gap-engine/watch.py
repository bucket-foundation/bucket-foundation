import argparse, datetime, hashlib, json, os, pathlib, re, subprocess, sys, urllib.request
from backtest import PAT, git, snapshot

UPSTREAM = "https://github.com/google-deepmind/formal-conjectures"


def slug(pid):
    name = re.sub(r"[^a-z0-9]+", "-", pid.split("::")[1].lower()).strip("-")[:56].strip("-")
    return f"{name}-{hashlib.sha1(pid.encode()).hexdigest()[:6]}"


def changes(before, after):
    solved = [p for p, r in after.items() if r["status"] == "solved" and before.get(p, {}).get("status") == "open"]
    reopened = [p for p, r in after.items() if r["status"] == "open" and before.get(p, {}).get("status") == "solved"]
    added_open = [p for p, r in after.items() if r["status"] == "open" and p not in before]
    return solved, reopened, added_open


def status_at(repo, commit, path, name):
    try:
        text = git(repo, "show", f"{commit}:{path}").decode(errors="ignore")
    except subprocess.CalledProcessError:
        return None
    return next((m["st"] for m in PAT.finditer(text) if m["name"] == name), None)


def flip_commit(repo, old, new, pid):
    path, name = "FormalConjectures/" + pid.split("::")[0], pid.split("::")[1]
    log = [l.split() for l in git(repo, "log", "--reverse", "--format=%H %cs", f"{old}..{new}", "--", path).decode().split("\n") if l]
    return next(((c, day) for c, day in log if status_at(repo, c, path, name) == "solved"), (new, ""))


def sentence_cut(text, limit=300):
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("? "))
    return cut[:end + 1] if end > 80 else cut.rsplit(" ", 1)[0]


def entry(repo, old, new, pid, row, before_row, today):
    commit, day = flip_commit(repo, old, new, pid)
    name = pid.split("::")[1]
    return {"id": f"fc-solved-{slug(pid)}", "kind": "generation", "category": "generation", "date": day or today, "source": "own", "machine_generated": True,
            "title": f"Upstream marked solved: {name}"[:120],
            "claim": f"formal-conjectures tagged {name} solved. Docstring while it was tagged open: {sentence_cut(before_row['text'])}",
            "tool": "solver-gap-engine watch.py", "run_id": f"fc-{old[:8]}-{new[:8]}", "state": "candidate",
            "score": {"value": 1 if row["lean_proof"] else 0, "meaning": "1 when the upstream tag carries a formal-proof link; the proof was not read here"},
            "evidence": [f"{UPSTREAM}/commit/{commit}", f"{UPSTREAM}/blob/{new}/FormalConjectures/{pid.split('::')[0]}"]}


def post(url, token, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.status


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--state", required=True)
    ap.add_argument("--outbox", required=True)
    ap.add_argument("--since")
    ap.add_argument("--no-fetch", action="store_true")
    a = ap.parse_args()
    state_path, outbox = pathlib.Path(a.state), pathlib.Path(a.outbox)
    outbox.mkdir(parents=True, exist_ok=True)
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    if not a.no_fetch:
        git(a.repo, "fetch", "--quiet", "origin", "+refs/heads/*:refs/heads/*")
    new = git(a.repo, "rev-parse", "HEAD").decode().strip()
    old = a.since and git(a.repo, "rev-parse", a.since).decode().strip() or state.get("last")
    today = datetime.date.today().isoformat()
    if not old:
        state_path.write_text(json.dumps({"last": new, "runs": []}, indent=1))
        print(json.dumps({"initialised_at": new[:8]}))
        return
    before, after = snapshot(a.repo, old), snapshot(a.repo, new)
    solved, reopened, added_open = changes(before, after)
    url, token = os.environ.get("BUCKET_WHATS_NEW_URL"), os.environ.get("BUCKET_WHATS_NEW_TOKEN")
    if bool(url) != bool(token):
        print("BUCKET_WHATS_NEW_URL and BUCKET_WHATS_NEW_TOKEN must both be set to post; staging only", file=sys.stderr)
    staged = posted = failed = 0
    pending = {json.loads(f.read_text())["id"]: f for f in outbox.glob("fc-solved-*.json") if "posted_at" not in json.loads(f.read_text())}
    for pid in solved:
        body = entry(a.repo, old, new, pid, after[pid], before[pid], today)
        target = outbox / f"{body['id']}.json"
        pending.pop(body["id"], None)
        if target.exists() and ("posted_at" in json.loads(target.read_text()) or not (url and token)):
            continue
        if url and token:
            try:
                post(url, token, body)
                body["posted_at"] = today
                posted += 1
            except OSError as err:
                body["post_error"] = str(err)[:200]
                failed += 1
        target.write_text(json.dumps(body, indent=1))
        staged += 1
    run = {"date": today, "from": old[:8], "to": new[:8], "solved": len(solved), "with_formal_proof_link": sum(after[p]["lean_proof"] for p in solved),
           "reopened": len(reopened), "new_open": len(added_open), "open_total": sum(r["status"] == "open" for r in after.values()),
           "staged": staged, "posted": posted, "post_failed": failed}
    if url and token:
        for target in pending.values():
            body = {k: v for k, v in json.loads(target.read_text()).items() if k != "post_error"}
            try:
                post(url, token, body)
                body["posted_at"] = today
                posted += 1
            except OSError as err:
                body["post_error"] = str(err)[:200]
                failed += 1
            target.write_text(json.dumps(body, indent=1))
    run["posted"], run["post_failed"] = posted, failed
    state_path.write_text(json.dumps({"last": old if failed else new, "runs": (state.get("runs", []) + [run])[-400:]}, indent=1))
    print(json.dumps(run))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
