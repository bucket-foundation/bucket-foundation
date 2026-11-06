import bz2, json, re, sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from tatoeba_sets import ISO3, UNSPACED, rows

PER = 200
MIN_COUNT = 5
TOKEN = re.compile(r"[^\W\d_]+(?:'[^\W\d_]+)?", re.UNICODE)


def en_tokens(s):
    return set(t.lower() for t in TOKEN.findall(s))


def l_tokens(lang, s):
    s = s.lower().replace("ς", "σ")
    return set(TOKEN.findall(s))


def main(src, corpus, out_dir):
    src, corpus, out_dir = Path(src), Path(corpus), Path(out_dir)
    eng = {r[0]: r[2] for r in rows(src / "eng_sentences.tsv.bz2") if len(r) >= 3}
    for lang, iso in ISO3.items():
        sp, lp, top = src / f"{iso}_sentences.tsv.bz2", src / f"{iso}-eng_links.tsv.bz2", corpus / "top1000" / f"{lang}.json"
        fixture = out_dir / f"{lang}.json"
        if not (sp.exists() and lp.exists() and top.exists() and fixture.exists()):
            continue
        text = {r[0]: r[2] for r in rows(sp) if len(r) >= 3}
        pairs = {}
        for r in rows(lp):
            if len(r) >= 2 and r[0] in text and r[1] in eng and r[0] not in pairs:
                pairs[r[0]] = eng[r[1]]
        words = [t["word"] for t in json.load(open(top))]
        wanted = {w.lower(): w for w in words}
        cw, ce, cwe = Counter(), Counter(), Counter()
        for sid, en in pairs.items():
            s = text[sid]
            ets = en_tokens(en)
            ce.update(ets)
            if lang in UNSPACED:
                low = s.lower()
                present = {w for w in wanted if w in low}
            else:
                present = l_tokens(lang, s) & wanted.keys()
            cw.update(present)
            for w in present:
                for e in ets:
                    cwe[(w, e)] += 1
        by_word = {}
        for (w, e), c in cwe.items():
            if c >= 2:
                by_word.setdefault(w, []).append((2 * c / (cw[w] + ce[e]), e))
        aligned = []
        for w in words:
            k = w.lower()
            if cw[k] < MIN_COUNT or k not in by_word:
                continue
            best = [e for _, e in sorted(by_word[k], reverse=True)[:3]]
            aligned.append([w, best])
            if len(aligned) == PER:
                break
        data = json.load(open(fixture))
        data["aligned"] = aligned
        json.dump(data, open(fixture, "w"), ensure_ascii=False, separators=(",", ":"))
        print(lang, len(pairs), len(aligned), aligned[:3], file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:4])
