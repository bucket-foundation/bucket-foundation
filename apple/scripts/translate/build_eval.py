import hashlib, json, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_lexicon import LANGS, NO_FREQ, clean_word, freq_list, key, load_english, short_gloss, simplified

TAIL = 250


def h(s):
    return hashlib.sha1(s.encode()).hexdigest()


def main(dl, corpus, tatoeba, out):
    out.mkdir(parents=True, exist_ok=True)
    en_rank = freq_list("en", 60000)
    fwd, en_forms, heads = load_english(dl / "en.jsonl", en_rank)
    sets = json.load(open(tatoeba))
    photons = defaultdict(dict)
    allp = corpus.parent.parent.parent / "_intake/photons/all.json"
    if allp.exists():
        for p in json.load(open(allp)):
            photons[p["lang"]][key(p["surface"])] = p.get("meaning_en", "")
    for lang in LANGS:
        inv = defaultdict(set)
        for e, ws in fwd[lang].items():
            for w in ws:
                inv[key(w)].add(e)
        gloss = defaultdict(set)
        lemma = {}
        src = dl / f"kk_{lang}.jsonl"
        if src.exists():
            for line in open(src, encoding="utf-8"):
                e = json.loads(line)
                k = key(clean_word(lang, e["w"] or ""))
                if lang == "zh":
                    k = key(simplified(k))
                g = short_gloss(e.get("g") or [])
                if g:
                    gloss[k].add(g)
                if e.get("o"):
                    lemma.setdefault(k, key(clean_word(lang, e["o"][0].split(" /")[0])))

        def refs(w):
            k = key(w)
            r = set(inv.get(k, ())) | gloss.get(k, set())
            if k in photons[lang]:
                r.add(photons[lang][k].split(" · ")[0])
            if k in lemma:
                l = lemma[k]
                r |= set(inv.get(l, ())) | gloss.get(l, set())
            return sorted(r)[:12]

        top = corpus / "top1000" / f"{lang}.json"
        words = []
        if top.exists():
            for t in json.load(open(top)):
                r = set(refs(t["word"]))
                if t.get("meaning"):
                    r.add(t["meaning"])
                words.append([t["word"], sorted(r)[:12]])
        else:
            for w in sorted(photons[lang], key=h)[:1000]:
                words.append([w, refs(w)])
        seen = {key(w[0]) for w in words}
        rank = freq_list(lang, 20000) if lang not in NO_FREQ else {}
        pool = [w for w, i in rank.items() if i >= 1000 and w.isalpha() and key(w) not in seen]
        tail = [[w, refs(w)] for w in sorted(pool, key=h)[:TAIL]]
        s = sets["sets"].get(lang, {})
        json.dump({"words": words, "tail": tail, "phrases": s.get("phrase", []), "sentences": s.get("sentence", [])},
                  open(out / f"{lang}.json", "w"), ensure_ascii=False, separators=(",", ":"))
        print(lang, len(words), len(tail), sum(1 for w in words if w[1]), file=sys.stderr)
    en_words = []
    for t in json.load(open(corpus / "top1000" / "en.json")):
        w = t["word"]
        base = en_forms.get(w.lower(), w)
        m = {}
        for lang in LANGS:
            r = list(dict.fromkeys(fwd[lang].get(w, []) + fwd[lang].get(base, [])))
            if r:
                m[lang] = r[:10]
        en_words.append([w, m])
    en = sets["en"]
    pick = lambda rows: [r for r in sorted(rows, key=lambda r: h(r[0] + r[1]))][: 10 * len(LANGS)]
    json.dump({"words": en_words, "phrases": pick(en["phrase"]), "sentences": pick(en["sentence"])},
              open(out / "en.json", "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]))
