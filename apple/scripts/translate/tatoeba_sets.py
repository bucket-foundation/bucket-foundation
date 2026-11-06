import bz2, csv, hashlib, json, sys
from pathlib import Path

ISO3 = {"es": "spa", "fr": "fra", "it": "ita", "pt": "por", "de": "deu", "nl": "nld", "sv": "swe", "pl": "pol", "fi": "fin",
        "ru": "rus", "el": "ell", "ar": "ara", "hi": "hin", "ja": "jpn", "zh": "cmn", "ko": "kor", "he": "heb", "fa": "pes",
        "tr": "tur", "cs": "ces", "id": "ind", "vi": "vie", "th": "tha", "ta": "tam", "la": "lat", "grc": "grc", "sa": "san", "ang": "ang"}
UNSPACED = {"ja", "zh", "th"}
PER = 100

def rows(path):
    with bz2.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            yield line.rstrip("\n").split("\t")

def size(lang, text):
    if lang in UNSPACED:
        n = sum(1 for c in text if c.isalnum())
        return "phrase" if 2 <= n <= 4 else "sentence" if 5 <= n <= 14 else None
    n = len([t for t in text.split() if any(c.isalnum() for c in t)])
    return "phrase" if 2 <= n <= 3 else "sentence" if 4 <= n <= 8 else None

def key(sid):
    return hashlib.sha1(sid.encode()).hexdigest()

def main(src, out):
    src = Path(src)
    eng = {r[0]: r[2] for r in rows(src / "eng_sentences.tsv.bz2") if len(r) >= 3}
    sets = {}
    en_side = {"phrase": [], "sentence": []}
    for lang, iso in ISO3.items():
        sp, lp = src / f"{iso}_sentences.tsv.bz2", src / f"{iso}-eng_links.tsv.bz2"
        if not sp.exists() or not lp.exists():
            continue
        text = {r[0]: r[2] for r in rows(sp) if len(r) >= 3}
        refs = {}
        for r in rows(lp):
            if len(r) >= 2 and r[0] in text and r[1] in eng:
                refs.setdefault(r[0], []).append(eng[r[1]])
        picked = {"phrase": [], "sentence": []}
        seen = set()
        for sid in sorted(refs, key=key):
            t = text[sid]
            kind = size(lang, t)
            if not kind or len(picked[kind]) >= PER or t.lower() in seen:
                continue
            seen.add(t.lower())
            picked[kind].append([t, sorted(set(refs[sid]))[:6]])
            for e in refs[sid][:1]:
                ek = size("en", e)
                if ek:
                    en_side[ek].append([e, lang, t])
        sets[lang] = picked
        print(lang, len(refs), {k: len(v) for k, v in picked.items()}, file=sys.stderr)
    json.dump({"sets": sets, "en": en_side}, open(out, "w"), ensure_ascii=False)

main(sys.argv[1], sys.argv[2])
