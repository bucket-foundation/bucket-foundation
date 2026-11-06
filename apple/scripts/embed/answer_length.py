import json
import pyeval
from common import LANGS, ROOT, OUT, VEC
for name, d in (("before", ROOT / "lexicon"), ("after", OUT / "rerank")):
    n = r1 = toks = ra = 0
    for lang in LANGS:
        rows = pyeval.eval_set(lang).get("aligned", [])
        if not rows or not (d / f"{lang}.tsv.z").exists(): continue
        lex = pyeval.load(d / f"{lang}.tsv.z")
        for w, refs in rows:
            a = pyeval.answer(lex, w)
            if not a: continue
            n += 1; ra += pyeval.aligned_ok(a, refs)
            first = a.split(";")[0]
            r1 += pyeval.aligned_ok(first, refs)
            toks += len(a.split())
    print(name, n, round(ra / n * 100, 1), "first-sense", round(r1 / n * 100, 1), "tokens", round(toks / n, 2))
