import argparse
import bz2
import json
import unicodedata
from collections import Counter
from pathlib import Path

import regex
from wordfreq import available_languages, top_n_list

ROOT = Path(__file__).resolve().parents[2]
TOP = ROOT / "learning/app/polingual/top1000"
SOURCES = ROOT / "learning/app/polingual/sources"
OUT = ROOT / "learning/app/polingual/phrases"
TATOEBA = {
    "ar": "ara", "cs": "ces", "de": "deu", "el": "ell", "en": "eng", "es": "spa", "fa": "pes", "fi": "fin", "fr": "fra",
    "he": "heb", "hi": "hin", "id": "ind", "it": "ita", "ja": "jpn", "ko": "kor", "la": "lat", "nl": "nld", "pl": "pol",
    "pt": "por", "ru": "rus", "sa": "san", "sv": "swe", "ta": "tam", "th": "tha", "tr": "tur", "vi": "vie", "zh": "cmn", "pa": "pan",
}
KAIKKI_NAMES = {"sa": "Sanskrit", "pa": "Punjabi", "ta": "Tamil", "th": "Thai"}
NO_SPACE = {"zh", "ja", "th"}
SCRIPT = {"pa": regex.compile(r"\p{Gurmukhi}"), "sa": regex.compile(r"\p{Devanagari}"), "ta": regex.compile(r"\p{Tamil}"), "th": regex.compile(r"\p{Thai}")}
TOKEN = regex.compile(r"[\p{L}\p{M}\p{N}'’]+")
BANDS = ((500, "A1"), (1500, "A2"), (4000, "B1"))
TARGET = 300
RELAXED_B1 = 50000
PER_BAND = 100
UNOWNED = "\\N"
TATOEBA_LICENSE = "CC-BY 2.0 FR"
KAIKKI_LICENSE = "CC-BY-SA 4.0"


def norm(s: str) -> str:
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s.lower()) if c not in "̄̆"))


def read_detailed(path: Path) -> dict[int, tuple[str, str]]:
    out = {}
    with bz2.open(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 4:
                out[int(parts[0])] = (parts[2], parts[3])
    return out


def frequency_ranks(lang: str, corpus: list[str]) -> dict[str, int]:
    if lang in available_languages():
        return {w: i + 1 for i, w in enumerate(top_n_list(lang, 50000))}
    named = {"th": "th_opensubtitles.tsv", "pa": "pa_wikipedia.tsv"}
    if lang in named:
        rows = (SOURCES / named[lang]).read_text(encoding="utf-8").splitlines()
        return {norm(r.split("\t")[0]): i + 1 for i, r in enumerate(rows)}
    counts = Counter(norm(t) for text in corpus for t in TOKEN.findall(text))
    return {w: i + 1 for i, (w, _) in enumerate(counts.most_common())}


def tokens(lang: str, text: str, vocab: set[str]) -> list[str]:
    if lang not in NO_SPACE:
        return [norm(t) for t in TOKEN.findall(text)]
    out = []
    for chunk in TOKEN.findall(text):
        i = 0
        while i < len(chunk):
            for size in range(min(6, len(chunk) - i), 0, -1):
                piece = chunk[i : i + size]
                if piece in vocab or size == 1:
                    out.append(piece)
                    i += size
                    break
    return out


def band(rank: int, b1_limit: int) -> str | None:
    if rank <= BANDS[1][0]:
        return next(lvl for limit, lvl in BANDS if rank <= limit)
    return "B1" if rank <= b1_limit else None


def kaikki_examples(path: Path, lang: str) -> list[dict]:
    script = SCRIPT[lang]
    out = []
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if '"examples"' not in line:
                continue
            e = json.loads(line)
            for s in e.get("senses", []):
                for x in s.get("examples", []):
                    text, eng = x.get("text", ""), x.get("english") or x.get("translation")
                    if eng and script.search(text) and not regex.search(r"\p{Arabic}|\p{Latin}", text):
                        out.append({"text": text.strip(), "english": eng.strip(), "source": "wiktionary", "license": KAIKKI_LICENSE,
                                    "url": f"https://en.wiktionary.org/wiki/{e['word']}", "author": "Wiktionary contributors"})
    return out


def select(lang: str, cands: list[dict], ranks: dict[str, int], vocab: set[str], b1_limit: int = BANDS[2][0]) -> list[dict]:
    scored = []
    seen: set[str] = set()
    for c in cands:
        key = norm(c["text"])
        if key in seen or norm(c["english"]) in seen:
            continue
        toks = tokens(lang, c["text"], vocab)
        length = len(c["text"]) if lang in NO_SPACE else len(toks)
        if not any(regex.search(r"\p{L}", t) for t in toks) or regex.search("[\u0951\u0952]", c["text"]) or not (2 <= length <= (16 if lang in NO_SPACE else 8)):
            continue
        hardest = max(ranks.get(t, 10**6) if not t.isdigit() else 1 for t in toks)
        level = band(hardest, b1_limit)
        if not level:
            continue
        seen.update((key, norm(c["english"])))
        scored.append((hardest, length, {**c, "band": level, "hardest_rank": hardest}))
    scored.sort(key=lambda r: (r[0], r[1]))
    picked: list[dict] = []
    for _, lvl in BANDS:
        picked += [c for _, _, c in scored if c["band"] == lvl][:PER_BAND]
    if len(picked) < TARGET:
        ids = {id(c) for c in picked}
        picked += [c for _, _, c in scored if id(c) not in ids][: TARGET - len(picked)]
    order = {lvl: i for i, (_, lvl) in enumerate(BANDS)}
    picked.sort(key=lambda c: (order[c["band"]], c["hardest_rank"]))
    return picked[:TARGET]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tatoeba", type=Path, required=True)
    ap.add_argument("--kaikki", type=Path)
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    langs = a.only or list(TATOEBA)
    eng = read_detailed(a.tatoeba / "eng_sentences_detailed.tsv.bz2")
    target: dict[str, dict[int, tuple[str, str]]] = {l: read_detailed(a.tatoeba / f"{TATOEBA[l]}_sentences_detailed.tsv.bz2") for l in langs if l != "en"}
    owner = {sid: l for l, rows in target.items() for sid in rows}
    pairs: dict[int, int] = {}
    en_pairs: dict[int, int] = {}
    with (a.tatoeba / "links.csv").open(encoding="utf-8") as fh:
        for line in fh:
            s, _, t = line.partition("\t")
            s, t = int(s), int(t)
            if s in owner and t in eng and s not in pairs and eng[t][1] != UNOWNED:
                pairs[s] = t
            elif "en" in langs and s in eng and t in eng and s not in en_pairs and t != s and eng[t][1] != UNOWNED:
                en_pairs[s] = t
    OUT.mkdir(parents=True, exist_ok=True)
    index_path = OUT / "index.json"
    summary = json.loads(index_path.read_text()) if index_path.exists() and a.only else {}
    for lang in langs:
        cands = []
        if lang == "en":
            rows = {sid: eng[sid] for sid in en_pairs}
        else:
            rows = {sid: target[lang][sid] for sid in pairs if owner[sid] == lang}
        for sid, (text, user) in rows.items():
            eid = sid if lang == "en" else pairs[sid]
            if UNOWNED in (user, eng[eid][1]):
                continue
            cands.append({"text": text, "english": eng[eid][0] if lang != "en" else text, "source": "tatoeba", "license": TATOEBA_LICENSE,
                          "url": f"https://tatoeba.org/en/sentences/show/{sid}", "author": user,
                          "english_url": f"https://tatoeba.org/en/sentences/show/{eid}", "english_author": eng[eid][1]})
        if lang in KAIKKI_NAMES and a.kaikki and len(cands) < TARGET * 2:
            cands += kaikki_examples(a.kaikki / f"kaikki.org-dictionary-{KAIKKI_NAMES[lang]}.jsonl", lang)
        top = json.loads((TOP / f"{lang}.json").read_text())
        vocab = {w["word"] for w in top} | set(top_n_list(lang, 20000) if lang in available_languages() else [])
        ranks = frequency_ranks(lang, [c["text"] for c in cands])
        picked = select(lang, cands, ranks, vocab)
        if len(picked) < TARGET:
            picked = select(lang, cands, ranks, vocab, RELAXED_B1)
        (OUT / f"{lang}.json").write_text(json.dumps(picked, ensure_ascii=False, indent=1))
        summary[lang] = {"count": len(picked), "tatoeba": sum(1 for p in picked if p["source"] == "tatoeba"),
                         "wiktionary": sum(1 for p in picked if p["source"] == "wiktionary"),
                         "band": {lvl: sum(1 for p in picked if p["band"] == lvl) for _, lvl in BANDS}}
        print(lang, summary[lang])
    index_path.write_text(json.dumps(dict(sorted(summary.items())), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
