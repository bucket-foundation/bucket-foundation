import json
from common import OUT, VEC
W_BEFORE = {1,4,6,7,10,11,12,14,15,16,19,25,26,27,28,30,34,35,38,41,48,55,56,57,64,67,69,75,77,79,80,85,86,87,88,90,91,92,97,98}
W_AFTER = {7,21,27,34,57,61,73,79,86}
items = json.load(open(OUT / "audit_sample.json"))
rows = [{"lang": l, "english": w, "before": b, "after": a, "before_right": i not in W_BEFORE, "after_right": i not in W_AFTER} for i, (l, w, b, a, _) in enumerate(items)]
rep = {"kind": "model audit by Claude Opus 5.5, not a human audit", "rule": "first target word judged against the most common Wiktionary sense of the English word and its Tatoeba usage",
       "population": "en>xx first answers for 388 common and polysemous English words that differ between the frequency order and the re-ranked order", "differing": 1488, "total": 4848,
       "n": len(rows), "before_right": sum(r["before_right"] for r in rows), "after_right": sum(r["after_right"] for r in rows), "items": rows}
json.dump(rep, open(VEC / "audit_report.json", "w"), ensure_ascii=False, indent=1)
print(rep["n"], rep["before_right"], rep["after_right"])
