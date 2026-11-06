import json, re, sys, unicodedata
from collections import Counter
from pathlib import Path
from common import LANGS, OUT, ROOT, VEC, candidates

sys.path.insert(0, str(Path(__file__).parent.parent / "translate"))
from tatoeba_sets import ISO3, UNSPACED, rows

POLY = ["good", "right", "light", "fair", "well", "kind", "mean", "bank", "play", "run"]
TOKEN = re.compile(r"[\w']+", re.UNICODE)


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if not unicodedata.combining(c))


def grams(lang, s):
    s = fold(s)
    if lang in UNSPACED:
        t = [c for c in s if c.isalnum()]
        return {"".join(t[i:i + n]) for n in (1, 2, 3) for i in range(len(t) - n + 1)}
    return set(TOKEN.findall(s))


def gold(targets):
    src = ROOT / "tatoeba"
    eng = {r[0]: r[2] for r in rows(src / "eng_sentences.tsv.bz2") if len(r) >= 3}
    out = {}
    for lang, iso in ISO3.items():
        sp, lp = src / f"{iso}_sentences.tsv.bz2", src / f"{iso}-eng_links.tsv.bz2"
        if not sp.exists() or not lp.exists() or lang not in LANGS:
            continue
        text = {r[0]: r[2] for r in rows(sp) if len(r) >= 3}
        ce, cf, cj = Counter(), Counter(), Counter()
        for r in rows(lp):
            if len(r) < 2 or r[0] not in text or r[1] not in eng:
                continue
            et = set(TOKEN.findall(eng[r[1]].lower()))
            ft = grams(lang, text[r[0]])
            cf.update(ft)
            for t in targets:
                if t in et:
                    ce[t] += 1
                    for f in ft:
                        cj[(t, f)] += 1
        g = {}
        for t in targets:
            sc = sorted(((2 * c / (ce[t] + cf[f]), f) for (tt, f), c in cj.items() if tt == t and c >= 3), reverse=True)
            if ce[t] >= 5 and sc:
                g[t] = [f for _, f in sc[:3]]
        out[lang] = g
        print(lang, {t: g.get(t) for t in POLY[:3]}, file=sys.stderr, flush=True)
    return out


def ok(lang, ans, refs):
    a = fold(ans)
    if lang in UNSPACED:
        return any(r in a or a in r for r in refs)
    return any(a == r or (len(a) >= 4 and len(r) >= 4 and a[:4] == r[:4]) for r in refs)


def score(cand, order, g, words):
    res = {}
    for lang in LANGS:
        rev = {d["w"]: d["e"] for d in cand.get(lang, []) if d["k"].startswith("=")}
        o = order.get(lang, {}) if order else {}
        n = r = 0
        detail = {}
        for t in words:
            refs = g.get(lang, {}).get(t)
            if not refs or t not in rev:
                continue
            base_fwd = [x for x in rev[t]]
            lst = o.get("=" + t, base_fwd) if order else base_fwd
            if not lst:
                continue
            n += 1
            hit = ok(lang, lst[0], refs)
            r += hit
            detail[t] = [lst[0], hit]
        res[lang] = {"n": n, "right": r, "detail": detail}
    return res


def common_words():
    top = [w for w in json.load(open(ROOT / "repo/apple/Shared/Corpus/top1000/en.json"))][:400]
    return [t["word"].lower() for t in top if t["word"].isalpha() and len(t["word"]) > 2 and t["word"].lower() not in POLY]


def main():
    cand = candidates()
    common = common_words()
    gpath = OUT / "en_gold.json"
    if gpath.exists():
        g = json.load(open(gpath))
    else:
        g = gold(sorted(set(POLY + common)))
        json.dump(g, open(gpath, "w"), ensure_ascii=False)
    base_cand = json.load(open(OUT / "candidates_base.json")) if (OUT / "candidates_base.json").exists() else cand
    order = json.load(open(OUT / "order.json"))
    report = {}
    for name, ws in (("polysemous", POLY), ("common", common), ("common_test", common[1::2])):
        b, a = score(base_cand, None, g, ws), score(cand, order, g, ws)
        report[name] = {"before": b, "after": a}
        tb = sum(x["right"] for x in b.values()), sum(x["n"] for x in b.values())
        ta = sum(x["right"] for x in a.values()), sum(x["n"] for x in a.values())
        print(name, "before", tb, "after", ta)
    json.dump(report, open(VEC / "regression_report.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
