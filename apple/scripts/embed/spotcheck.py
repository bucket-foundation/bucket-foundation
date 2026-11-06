import hashlib, json, sys
import regression
from common import LANGS, OUT, VEC, candidates

audit = json.load(open(VEC / "audit_report.json"))
items = audit["items"]
def outcome(r):
    if r["before_right"] and r["after_right"]:
        return "both_right"
    if not r["before_right"] and not r["after_right"]:
        return "both_wrong"
    return "win" if r["after_right"] else "loss"
by = {}
for r in items:
    by.setdefault(outcome(r), []).append(r)
pick = by.get("loss", []) + by.get("both_wrong", []) + by.get("win", [])[:12] + by.get("both_right", [])[:4]
cand = candidates(); order = json.load(open(OUT / "order.json"))
words = regression.common_words() + regression.POLY
same = []
for lang in LANGS:
    rev = {d["w"]: d["e"] for d in cand[lang] if d["k"].startswith("=")}
    for w in words:
        if rev.get(w) and order[lang].get("=" + w, rev[w])[:1] == rev[w][:1]:
            same.append((hashlib.sha1(f"{lang}:{w}".encode()).hexdigest(), lang, w, rev[w][0]))
same.sort()
rows = [(r["lang"], r["english"], r["before"], r["after"], outcome(r), "yes" if r["before_right"] else "no", "yes" if r["after_right"] else "no") for r in pick]
rows += [(l, w, f, f, "unchanged", "", "") for _, l, w, f in same[: 30 - len(rows)]]
out = sys.argv[1]
with open(out, "w", encoding="utf-8") as f:
    f.write("lang\tenglish\tbefore\tafter\tmodel_outcome\tmodel_before_right\tmodel_after_right\thuman_before_right\thuman_after_right\thuman_note\n")
    for r in rows:
        f.write("\t".join(r) + "\t\t\t\n")
print(len(rows), {k: len(v) for k, v in by.items()}, [(r["lang"], r["english"], r["before"], r["after"]) for r in by.get("loss", [])])
