from __future__ import annotations

import csv
import json
import os
import sqlite3
import sys

import numpy as np

ROOT = os.environ.get("ROOT_GRAPH_DIR", "/home/gian/agfarms/bucket-foundation/_intake/root-graph")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")


def main() -> None:
    db = sqlite3.connect(os.path.join(ROOT, "graph.sqlite"))
    n = db.execute("select max(id) + 1 from node").fetchone()[0]
    langs = np.empty(n, object)
    proto = np.zeros(n, np.int8)
    for i, lang, p in db.execute("select id, lang, proto from node"):
        langs[i] = sys.intern(lang)
        proto[i] = p
    depth = np.zeros(n, np.int32)
    root = np.zeros(n, np.int64)
    for i, d, r in db.execute("select node, depth, root from forest"):
        depth[i] = d
        root[i] = r
    per: dict[str, dict] = {}
    seen = np.zeros(n, bool)
    for node, cls in db.execute("select node, cls from lexeme"):
        lang = langs[node]
        s = per.setdefault(lang, {"lexemes": 0, "inh": 0, "bor": 0, "der": 0, "cal": 0, "af": 0, "none": 0,
                                  "depth_sum": 0, "depth_max": 0, "rooted": 0})
        if not seen[node]:
            seen[node] = True
            s["lexemes"] += 1
            s["depth_sum"] += int(depth[node])
            s["depth_max"] = max(s["depth_max"], int(depth[node]))
            s["rooted"] += int(depth[node] > 0)
        s[cls or "none"] += 1
    edges = {}
    for lang, rel, c in db.execute("select n.lang, e.rel, count(*) from edge e join node n on n.id = e.src group by 1, 2"):
        edges.setdefault(lang, {})[rel] = c
    fam: dict[str, dict] = {}
    for lang, s in per.items():
        s["mean_depth"] = s["depth_sum"] / max(s["lexemes"], 1)
        s.update({f"edges_{k}": v for k, v in edges.get(lang, {}).items()})
    mask = seen & (depth > 0)
    for i in np.flatnonzero(mask):
        f = langs[root[i]]
        e = fam.setdefault(f, {"lexemes": 0, "languages": set(), "depth_sum": 0})
        e["lexemes"] += 1
        e["languages"].add(langs[i])
        e["depth_sum"] += int(depth[i])
    fam_rows = [{"family_root_lang": f, "lexemes": e["lexemes"], "languages": len(e["languages"]),
                 "mean_depth": e["depth_sum"] / e["lexemes"]} for f, e in fam.items()]
    fam_rows.sort(key=lambda r: -r["lexemes"])
    lang_rows = sorted(({"lang": k, **{a: b for a, b in v.items() if a != "depth_sum"}} for k, v in per.items()),
                       key=lambda r: -r["lexemes"])
    keys = sorted({k for r in lang_rows for k in r}, key=lambda k: (k != "lang", k))
    with open(os.path.join(ROOT, "stats_lang.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, keys)
        w.writeheader()
        w.writerows(lang_rows)
    with open(os.path.join(ROOT, "stats_family.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, list(fam_rows[0]))
        w.writeheader()
        w.writerows(fam_rows)
    meta = dict(db.execute("select k, v from meta"))
    rel_counts = dict(db.execute("select rel, count(*) from edge group by rel"))
    summary = {
        "entries": int(meta["entries"]),
        "cycle_cuts": int(meta["cycle_cuts"]),
        "nodes": int(n),
        "reconstructed_nodes": int(proto.sum()),
        "languages_with_lexemes": len(per),
        "languages_any_node": int(len(set(langs))),
        "edges": rel_counts,
        "forest_roots_with_children": len(fam),
        "max_depth": int(depth.max()),
        "top_families": fam_rows[:25],
        "top_languages": [{k: r.get(k) for k in ("lang", "lexemes", "inh", "bor", "der", "cal", "af", "none", "mean_depth", "depth_max")}
                          for r in lang_rows[:40]],
    }
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "summary.json"), "w") as fh:
        json.dump(summary, fh, indent=1, ensure_ascii=False)
    print(json.dumps({k: v for k, v in summary.items() if not k.startswith("top")}, indent=1), file=sys.stderr)


if __name__ == "__main__":
    main()
