import re, sys, unicodedata, zlib
from pathlib import Path
from common import LANGS, eval_set

PUNCT = " .,!?¡¿;:\"'«»“”()[]-–—…"


def key(s):
    return s.lower().strip().strip(PUNCT).replace("’", "'").replace("ς", "σ")


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", key(s)) if not unicodedata.combining(c))


def load(path):
    entries, exact, loose = [], {}, {}
    for line in zlib.decompress(Path(path).read_bytes(), -15).decode().split("\n"):
        c = line.split("\t")
        if len(c) < 2 or not c[0] or c[0].startswith("="):
            continue
        if c[1].startswith(">"):
            e = (c[0], [], None, c[1][1:])
        else:
            e = (c[0], [x for x in c[1].split("|") if x], c[2] if len(c) > 2 and c[2] else None, None)
        exact.setdefault(key(e[0]), []).append(len(entries))
        loose.setdefault(fold(e[0]), []).append(len(entries))
        entries.append(e)
    return entries, exact, loose


def meaning(e):
    return "; ".join(e[1][:3]) if e[1] else e[2]


def answer(lex, q):
    entries, exact, loose = lex
    def resolve(ids):
        out = []
        for i in ids:
            e = entries[i]
            if e[3]:
                out += [entries[j] for j in exact.get(key(e[3]), []) if not entries[j][3]]
            else:
                out.append(e)
        return out
    k = key(q)
    for ids in (exact.get(k), loose.get(fold(q))):
        if ids:
            hits = [entries[i] for i in ids if not entries[i][3]] or resolve(ids)
            for h in hits:
                m = meaning(h)
                if m:
                    return m
    return None


def norm(s):
    s = re.sub(r"\([^)]*\)", " ", s.lower())
    s = re.sub(r"[^\w' ]", " ", s)
    w = s.split()
    while w and w[0] in ("to", "a", "an", "the") and len(w) > 1:
        w.pop(0)
    return " ".join(w)


def senses(s):
    return [x for x in (norm(p) for p in re.split(r"[;,/·]", s)) if x]


def stem(w):
    for suf in ("ing", "ed", "es", "s"):
        if len(w) > len(suf) + 2 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def aligned_ok(ans, refs):
    r = {stem(x.lower()) for x in refs}
    toks = [stem(t) for s in senses(ans) for t in s.split()]
    return any(t in r for t in toks)


def score(lexdir, part=None):
    res = {}
    for lang in LANGS:
        p = Path(lexdir) / f"{lang}.tsv.z"
        ev = eval_set(lang)
        rows = ev.get("aligned", [])
        if part is not None:
            rows = rows[part::2]
        if not p.exists() or not rows:
            continue
        lex = load(p)
        n = right = answered = 0
        for w, refs in rows:
            n += 1
            a = answer(lex, w)
            if a:
                answered += 1
                right += aligned_ok(a, refs)
        res[lang] = (n, answered, right)
    return res


def table(res):
    tot = [0, 0, 0]
    for lang, (n, a, r) in res.items():
        tot = [tot[0] + n, tot[1] + a, tot[2] + r]
    return tot[2] / max(tot[1], 1), tot[1] / max(tot[0], 1)


if __name__ == "__main__":
    part = None if len(sys.argv) < 3 else int(sys.argv[2])
    res = score(sys.argv[1], part)
    for lang, (n, a, r) in res.items():
        print(f"{lang:4} {a/n*100:5.1f} {r/max(a,1)*100:5.1f}")
    print("all", *[round(x * 100, 1) for x in table(res)])
