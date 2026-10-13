import argparse, collections, difflib, json, pathlib, re
from backtest import git, snapshot, PAT, ROOT

FIELDS = "\x1f"
RECORD = "\x1e"


BODY_END = re.compile(r"\n(?:/--|@\[|theorem |lemma |def |end |namespace |open |variable |section |noncomputable |abbrev |instance |structure |inductive |private |protected )")


def blocks(text):
    out = {}
    for m in PAT.finditer(text):
        tail = text[m.end():]
        stop = BODY_END.search(tail)
        body = tail[:stop.start()] if stop else tail
        out[m["name"]] = {"status": m["st"], "tags": " ".join(m["tags"].split()), "doc": (m["doc"] or "").strip(), "sorry": bool(re.search(r"\bsorry\b", re.sub(r"answer\(sorry\)", "", body)))}
    return out


def blob(repo, commit, path):
    try:
        return git(repo, "show", f"{commit}:{ROOT}{path}").decode(errors="ignore")
    except Exception:
        return ""


def render(b):
    if b is None:
        return []
    return b["doc"].split("\n") + [f"@[category research {b['status']}{b['tags']}]"]


def summarize(out):
    raw = {r["id"]: r for r in map(json.loads, (out / "retags-raw.jsonl").read_text().splitlines())}
    rows = [json.loads(l) for l in (out / "retags.jsonl").read_text().splitlines()]
    count = collections.Counter
    by_collection = collections.defaultdict(count)
    for r in rows:
        by_collection[r["collection"]][r["class"]] += 1
    bucket = lambda y: "none" if y is None else ("2025_or_later" if y >= 2025 else "before_2025")
    by_year = collections.defaultdict(count)
    for r in rows:
        by_year[bucket(r["cited_year"])][r["class"]] += 1
    hosts = count(h for r in rows for h in r["proof_hosts"])
    summary = {
        "problems": len(rows),
        "commits": len({r["commit"] for r in rows}),
        "authors": len({r["author"] for r in rows}),
        "by_class": dict(count(r["class"] for r in rows).most_common()),
        "by_collection": {c: dict(v) for c, v in sorted(by_collection.items(), key=lambda kv: -sum(kv[1].values()))},
        "by_cited_year": {k: dict(v) for k, v in by_year.items()},
        "formal_proof_added_in_retag_commit": sum(r["formal_proof_added"] for r in rows),
        "formal_proof_at_head": sum(raw[r["id"]]["formal_proof_at_head"] for r in rows),
        "proof_in_repo_without_link": sum(r["proof_in_repo"] for r in rows),
        "by_proof_host": dict(hosts.most_common()),
        "by_proof_kind": dict(count(k for r in rows for k in r["proof_kind"]).most_common()),
        "by_class_with_proof_link": dict(count(r["class"] for r in rows if r["formal_proof_added"])),
        "ai_attributed": {
            "named_in_docstring_diff_or_link": sum(r["ai_in_text"] for r in rows),
            "named_in_commit_body": sum(r["ai_in_body"] for r in rows),
            "either": sum(r["ai_in_text"] or r["ai_in_body"] for r in rows),
            "by_class_either": dict(count(r["class"] for r in rows if r["ai_in_text"] or r["ai_in_body"])),
        },
    }
    (out / "retags-summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps(summary["by_class"]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--summarize", action="store_true")
    ap.add_argument("--repo")
    ap.add_argument("--head", default="HEAD")
    ap.add_argument("--before", default="2026-09-01")
    ap.add_argument("--out", default="backtest")
    a = ap.parse_args()
    if a.summarize:
        return summarize(pathlib.Path(a.out))
    head = git(a.repo, "rev-parse", a.head).decode().strip()
    base = git(a.repo, "rev-list", "-1", f"--before={a.before}", head).decode().strip()
    start, end = snapshot(a.repo, base), snapshot(a.repo, head)
    ids = sorted(p for p, r in start.items() if r["status"] == "open" and p in end and end[p]["status"] == "solved")
    byfile = {}
    for p in ids:
        byfile.setdefault(start[p]["file"], []).append(p.split("::", 1)[1])
    rows = []
    for path, names in sorted(byfile.items()):
        log = git(a.repo, "log", "--reverse", "--no-merges", f"--format=%H{FIELDS}%cs{FIELDS}%an{FIELDS}%s{FIELDS}%b{RECORD}", f"{base}..{head}", "--", ROOT + path).decode(errors="ignore")
        commits = [r.strip("\n").split(FIELDS) for r in log.split(RECORD) if r.strip()]
        prev = {n: blocks(blob(a.repo, base, path)).get(n) for n in names}
        for sha, date, author, subject, body in commits:
            cur_blocks = blocks(blob(a.repo, sha, path))
            parent_text = None
            for n in names:
                cur = cur_blocks.get(n)
                before = prev[n]
                if cur and before and before["status"] == "open" and cur["status"] == "solved":
                    diff = [l for l in difflib.unified_diff(render(before), render(cur), lineterm="", n=0) if not l.startswith(("---", "+++", "@@"))]
                    rows.append({"id": f"{path}::{n}", "collection": path.split("/")[0], "file": path, "commit": sha[:9], "date": date, "author": author,
                                 "subject": subject, "body": body.strip()[:1500], "diff": diff, "doc_after": cur["doc"], "tags_after": cur["tags"],
                                 "sorry_before": before["sorry"], "sorry_after": cur["sorry"], "formal_proof_at_head": end[f"{path}::{n}"]["lean_proof"]})
                    prev[n] = cur
                elif cur:
                    prev[n] = cur
    found = {r["id"] for r in rows}
    for p in ids:
        if p not in found:
            rows.append({"id": p, "collection": start[p]["collection"], "file": start[p]["file"], "commit": None, "date": None, "author": None, "subject": None, "body": "", "diff": [], "doc_after": end[p]["text"], "tags_after": "", "sorry_before": None, "sorry_after": None, "formal_proof_at_head": end[p]["lean_proof"]})
    rows.sort(key=lambda r: r["id"])
    out = pathlib.Path(a.out)
    out.mkdir(exist_ok=True)
    (out / "retags-raw.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    print(json.dumps({"base": base[:9], "head": head[:9], "retagged": len(ids), "attributed": sum(r["commit"] is not None for r in rows)}))


if __name__ == "__main__":
    main()
