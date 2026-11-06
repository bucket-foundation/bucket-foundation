import hashlib, json, sys
sys.path.insert(0, ".")
import regression
from common import LANGS, OUT, candidates
cand = candidates(); order = json.load(open(OUT / "order.json"))
words = regression.common_words() + regression.POLY
items = []
for lang in LANGS:
    rev = {d["w"]: d["e"] for d in cand[lang] if d["k"].startswith("=")}
    for w in words:
        if w not in rev or not rev[w]:
            continue
        b = rev[w][0]; a = order[lang].get("=" + w, rev[w])[0]
        if a != b:
            items.append((hashlib.sha1(f"{lang}:{w}".encode()).hexdigest(), lang, w, b, a, rev[w][:6]))
items.sort()
print(len(items), "differing of", sum(1 for l in LANGS for d in cand[l] if d["k"].startswith("=") and d["w"] in set(words)))
json.dump([i[1:] for i in items[:100]], open(OUT / "audit_sample.json", "w"), ensure_ascii=False)
for i, it in enumerate(items[:100]):
    print(i, it[1], it[2], "| before:", it[3], "| after:", it[4], "| list:", it[5])
