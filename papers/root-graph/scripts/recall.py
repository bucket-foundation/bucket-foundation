from __future__ import annotations

import csv
import json
import os
import sqlite3
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
ROOT = "/home/gian/agfarms/bucket-foundation/_intake/root-graph"


def chain(db, lang, form):
    r = db.execute("select id from node where lang = ? and form = ?", (lang, form)).fetchone()
    if not r:
        return None
    out, x = {}, r[0]
    for d in range(64):
        if x is None:
            break
        out[x] = d
        p = db.execute("select parent from forest where node = ?", (x,)).fetchone()
        x = p[0] if p else None
    return out


def recall(path):
    db = sqlite3.connect(path)
    by = defaultdict(lambda: [0, 0])
    rows = []
    for r in csv.DictReader(open(os.path.join(DATA, "cognates.tsv")), delimiter="\t"):
        a, b = chain(db, r["lang_a"], r["form_a"]), chain(db, r["lang_b"], r["form_b"])
        common = sorted(set(a or {}) & set(b or {}), key=lambda x: a[x]) if a and b else []
        hit = bool(common)
        dist = a[common[0]] + b[common[0]] if hit else None
        lca = db.execute("select lang, form from node where id = ?", (common[0],)).fetchone() if hit else None
        by[r["family"]][0] += hit
        by[r["family"]][1] += 1
        rows.append({**r, "linked": hit, "distance": dist, "lca": "|".join(lca) if lca else None})
    total = sum(h for h, _ in by.values()), sum(n for _, n in by.values())
    return {"recall": total[0] / total[1], "n": total[1],
            "by_family": {f: {"linked": h, "n": n, "recall": h / n} for f, (h, n) in by.items()}, "pairs": rows}


def main():
    out = {name: recall(os.path.join(ROOT, f)) for name, f in (("v1", "graph-v1.sqlite"), ("v2", "graph.sqlite"))
           if os.path.exists(os.path.join(ROOT, f))}
    with open(os.path.join(DATA, "recall.json"), "w") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "pairs"} for k, v in out.items()}, indent=1), file=sys.stderr)


if __name__ == "__main__":
    main()
