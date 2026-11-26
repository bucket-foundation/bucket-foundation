from __future__ import annotations

import csv
import json
import os
import sqlite3
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_graph import clean, entry_name  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
ROOT = "/home/gian/agfarms/bucket-foundation/_intake/root-graph"


def chain(db, lang, form):
    form = entry_name(lang, clean(form) or form)
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


def recall(path, sample="cognates.tsv"):
    db = sqlite3.connect(path)
    by = defaultdict(lambda: [0, 0])
    rows = []
    for r in csv.DictReader(open(os.path.join(DATA, sample)), delimiter="\t"):
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


FAMILY_LANGS = {"romance": ("es", "it", "pt", "fr"), "germanic": ("en", "de", "nl", "sv"),
                "slavic": ("ru", "pl", "cs", "uk")}


def translation_linkage(path):
    db = sqlite3.connect(path)
    parent = {}
    for n, p in db.execute("select node, parent from forest where parent is not null"):
        parent[n] = p
    en = {}
    for s, w in db.execute("select id, en_word from sense"):
        en[s] = w
    out = {}
    for fam, langs in FAMILY_LANGS.items():
        by = defaultdict(list)
        foreign = [l for l in langs if l != "en"]
        q = f"select t.sense, t.node from translation t join node n on n.id = t.node where n.lang in ({','.join('?' * len(foreign))})"
        for s, n in db.execute(q, foreign):
            by[s].append(n)
        if "en" in langs:
            for s in list(by):
                r = db.execute("select id from node where lang = 'en' and form = ?", (en[s],)).fetchone()
                if r:
                    by[s].append(r[0])
        hit = tot = 0
        for nodes in by.values():
            chains = []
            for n in set(nodes):
                c, x, k = set(), n, 0
                while x is not None and k < 64:
                    c.add(x)
                    x, k = parent.get(x), k + 1
                chains.append(c)
            for i in range(len(chains)):
                for j in range(i + 1, len(chains)):
                    tot += 1
                    hit += bool(chains[i] & chains[j])
        out[fam] = {"pairs": tot, "linked": hit, "share": hit / tot if tot else None}
    return out


def main():
    out = {}
    for name, f in (("v1", "graph-v1.sqlite"), ("v2", "graph.sqlite")):
        p = os.path.join(ROOT, f)
        if os.path.exists(p):
            out[name] = recall(p)
            if os.path.exists(os.path.join(DATA, "cognates_descendants.tsv")):
                out[name]["independent"] = recall(p, "cognates_descendants.tsv")
            out[name]["translation_linkage"] = translation_linkage(p)
    with open(os.path.join(DATA, "recall.json"), "w") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "pairs"} for k, v in out.items()}, indent=1), file=sys.stderr)


if __name__ == "__main__":
    main()
