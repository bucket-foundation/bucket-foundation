from __future__ import annotations

import json
import os
import sqlite3
import sys
from collections import defaultdict

ROOT = os.environ.get("ROOT_GRAPH_DIR", "/home/gian/agfarms/bucket-foundation/_intake/root-graph")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
SPOT = [("es", "agua", "la", "aqua"), ("fr", "lait", "la", "lac"), ("it", "latte", "la", "lac"),
        ("es", "leche", "la", "lac"), ("de", "Wasser", "gem-pro", "*watōr")]


def chain(db, lang, form):
    r = db.execute("select id from node where lang = ? and form = ?", (lang, form)).fetchone()
    out = []
    x = r[0] if r else None
    while x is not None and len(out) < 64:
        n = db.execute("select n.lang, n.form, f.parent from node n join forest f on f.node = n.id where n.id = ?", (x,)).fetchone()
        out.append(f"{n[0]}:{n[1]}")
        x = n[2]
    return out


def main() -> None:
    db = sqlite3.connect(os.path.join(ROOT, "graph.sqlite"))
    anc = defaultdict(set)
    for lang, a in db.execute("select lang, anc from lang_closure"):
        anc[lang].add(a)
    q = """select c.lang, c.proto, p.lang, p.proto from forest f join node c on c.id = f.node
           join node p on p.id = f.parent"""
    edges = off_line = proto_child = 0
    for cl, cp, pl, pp in db.execute(q):
        edges += 1
        off_line += pl != cl and pl not in anc[cl]
        proto_child += bool(cp and not pp)
    spots = []
    for l, f, tl, tf in SPOT:
        c = chain(db, l, f)
        spots.append({"from": f"{l}:{f}", "target": f"{tl}:{tf}", "reaches": f"{tl}:{tf}" in c, "chain": c})
    out = {"forest_edges": edges, "off_line": off_line, "attested_parent_of_proto": proto_child,
           "meta": dict(db.execute("select k, v from meta")), "spot_checks": spots}
    with open(os.path.join(DATA, "forest_check.json"), "w") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
    print(json.dumps(out, indent=1, ensure_ascii=False))
    if off_line or proto_child:
        sys.exit(1)


if __name__ == "__main__":
    main()
