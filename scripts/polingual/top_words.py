import argparse
import json
import math
import re
import sqlite3
import unicodedata
from pathlib import Path

from wordfreq import get_frequency_dict, zipf_frequency

from wordlist_qa import defects, fold

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "_intake/photons/index.sqlite"
OUT = ROOT / "learning/app/polingual/top1000"
SOURCES = ROOT / "learning/app/polingual/sources"
CEDICT_LINE = re.compile(r"^(\S+) (\S+) \[([^\]]+)\] /(.*)/$")
KAIKKI_NAMES = {"th": "Thai", "sa": "Sanskrit", "pa": "Punjabi"}
SCRIPTS = {
    "zh": re.compile(r"^[㐀-䶿一-鿿]+$"),
    "th": re.compile(r"^[฀-๿]+$"),
    "sa": re.compile(r"^[ऀ-ॿ]+$"),
    "pa": re.compile(r"^[਀-੿]+$"),
}
SKIP_POS = {"name", "character", "symbol", "suffix", "prefix", "affix", "romanization", "syllable", "punct"}
RAW_FREQ_LANGS = {"ja", "ko"}
BAD_TAGS = {"form-of", "alt-of", "obsolete", "archaic", "dialectal", "literary", "Classical-Chinese", "rare", "abbreviation"}
BAD_GLOSS = ("Lenition", "Alternative", "Used in transcription", "Only used in", "Surname", "a surname", "Short for")
BANDS = ((400, "A1"), (750, "A2"), (1000, "B1"))

SOURCE_INFO = {
    "zh": {"name": "wordfreq zh", "url": "https://github.com/rspeer/wordfreq", "license": "CC-BY-SA 4.0", "glosses": "CC-CEDICT, https://www.mdbg.net/chinese/dictionary?page=cc-cedict, CC-BY-SA 4.0"},
    "th": {"name": "FrequencyWords th 2018, OpenSubtitles", "url": "https://github.com/hermitdave/FrequencyWords", "license": "CC-BY-SA 4.0"},
    "la": {"name": "Dickinson College Commentaries Latin Core Vocabulary", "url": "https://dcc.dickinson.edu/latin-core-list1", "license": "CC-BY-SA"},
    "sa": {"name": "Digital Corpus of Sanskrit, lemma counts", "url": "https://github.com/OliverHellwig/sanskrit", "license": "CC-BY 4.0"},
    "pa": {"name": "Punjabi Wikipedia token counts", "url": "https://dumps.wikimedia.org/pawiki/", "license": "CC-BY-SA 4.0"},
}
DEFAULT_SOURCE = {"name": "wordfreq", "url": "https://github.com/rspeer/wordfreq", "license": "CC-BY-SA 4.0"}
GLOSS_SOURCE = {"name": "Wiktionary via Kaikki", "url": "https://kaikki.org", "license": "CC-BY-SA 4.0"}


def band_of(rank: int) -> str:
    return next((level for limit, level in BANDS if rank <= limit), "B1")


def strip_accents(s: str) -> str:
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if c not in "̀́́"))


def strip_macrons(s: str) -> str:
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if c not in "̄̆"))


def kaikki_entries(path: Path, lang: str, wanted: set[str] | None) -> dict[str, dict]:
    script = SCRIPTS[lang]
    out: dict[str, dict] = {}
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            e = json.loads(line)
            word = e.get("word", "")
            if (e.get("pos") in SKIP_POS and not (lang == "zh" and e.get("pos") == "character")) or not script.match(word):
                continue
            if lang == "sa":
                romans = [strip_accents(f["form"]) for f in e.get("forms", []) if "romanization" in f.get("tags", [])]
                keys = romans[:1]
            else:
                keys = [word]
            for key in keys:
                if wanted is not None and key not in wanted:
                    continue
                senses = [s for s in e.get("senses", []) if s.get("glosses") and not BAD_TAGS & set(s.get("tags", [])) and not s["glosses"][0].startswith(BAD_GLOSS)]
                mandarin = [s for s in senses if "Mandarin" in s.get("tags", [])]
                if not senses:
                    continue
                prev = out.get(key)
                if prev and not (lang == "zh" and mandarin and not prev["mandarin"]):
                    continue
                gloss = (mandarin or senses)[0]["glosses"][0]
                ipa = next((s["ipa"] for s in e.get("sounds", []) if "ipa" in s), None)
                out[key] = {"word": word, "meaning": gloss, "pos": e.get("pos"), "ipa": ipa, "mandarin": bool(mandarin)}
    return out


def cedict_entries(path: Path) -> dict[str, dict]:
    best: dict[str, tuple[int, dict]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = CEDICT_LINE.match(line)
        if not m:
            continue
        _, simp, pinyin, defs = m.groups()
        senses = [d for d in defs.split("/") if d and not d.startswith(("surname ", "variant of", "old variant", "used in ", "see "))]
        if not senses or pinyin[:1].isupper():
            continue
        prev = best.get(simp)
        if prev and prev[0] >= len(senses):
            continue
        best[simp] = (len(senses), {"word": simp, "meaning": "; ".join(senses[:3]), "pos": None, "ipa": None, "pinyin": pinyin})
    return {k: v for k, (_, v) in best.items()}


def clean(row: dict, lang: str, senses: list[str]) -> dict | None:
    kinds = defects(row, lang)
    if "junk" in kinds or "proper" in kinds:
        return None
    if "gloss" not in kinds:
        return row
    for gloss in senses:
        fixed = {**row, "meaning": gloss}
        if not defects(fixed, lang):
            return fixed
    return None


MIN_SENSE_ZIPF = 4.0
MIN_AGREEMENT = 200.0
AGREEMENT_MARGIN = 2.0
STRIP_MARKS = re.compile(r"[\u0300-\u036f\u064b-\u065f\u0670\u0591-\u05c7]")
GLOSS_WORD = re.compile(r"[a-z]+(?:[ -][a-z]+)*")


def gloss_pins() -> dict[tuple[str, str], str]:
    path = SOURCES / "gloss_pins.tsv"
    if not path.exists():
        return {}
    rows = [line.split("\t") for line in path.read_text(encoding="utf-8").splitlines()[1:] if line]
    return {(lang, word): gloss for lang, word, gloss in rows}


PINS = gloss_pins()


def strip_marks(word: str) -> str:
    return unicodedata.normalize("NFC", STRIP_MARKS.sub("", unicodedata.normalize("NFD", word))).casefold()


def translation_votes(db: sqlite3.Connection) -> dict[tuple[str, str], dict[str, float]]:
    en_freq = get_frequency_dict("en")
    votes: dict[tuple[str, str], dict[str, float]] = {}
    for head, payload in db.execute("select surface, payload from photons where lang='en'"):
        table = json.loads(payload).get("translations") or []
        by_sense: dict[str, set[str]] = {}
        for t in table:
            by_sense.setdefault(t.get("sense") or "", set()).add(t.get("code"))
        zipf = math.log10(en_freq.get(head.lower(), 1e-9) * 1e9) if en_freq.get(head.lower()) else 0.0
        for t in table:
            if not t.get("word") or not t.get("code"):
                continue
            weight = zipf * len(by_sense[t.get("sense") or ""])
            slot = votes.setdefault((t["code"], strip_marks(t["word"])), {})
            slot[head.lower()] = max(slot.get(head.lower(), 0.0), weight)
    return votes


def sense_terms(gloss: str) -> list[str]:
    text = re.sub(r"\([^)]*\)", " ", gloss.lower())
    return [m for part in re.split(r"[;,]", text) for m in [part.strip().removeprefix("to ").removeprefix("a ").removeprefix("an ").removeprefix("the ").strip()] if m]


def sense_score(gloss: str, votes: dict[str, float]) -> float:
    terms = set(sense_terms(gloss))
    return sum(w for head, w in votes.items() if head in terms)


def head_zipf(gloss: str) -> float:
    terms = sense_terms(gloss)
    return zipf_frequency(terms[0], "en") if terms else 0.0


def agreed_sense(current: str, senses: list[str], votes: dict[str, float]) -> str | None:
    if not votes or sense_score(current or "", votes) > 0:
        return None
    scored = sorted(((sense_score(g, votes), g) for g in senses), key=lambda x: -x[0])
    if not scored or scored[0][0] < MIN_AGREEMENT:
        return None
    best_score, best = scored[0]
    runner_up = next((sc for sc, g in scored[1:] if sc > 0 and g != best), 0.0)
    if runner_up * AGREEMENT_MARGIN > best_score:
        return None
    if head_zipf(best) < max(MIN_SENSE_ZIPF, head_zipf(current or "")):
        return None
    return best


def index_rows(db: sqlite3.Connection, lang: str) -> dict[str, dict]:
    rows = db.execute("select surface, meaning_en, pos, ipa from photons where lang=?", (lang,))
    return {s: {"word": s, "meaning": m, "pos": p, "ipa": i} for s, m, p, i in rows}


def read_tsv(name: str) -> list[list[str]]:
    return [line.split("\t") for line in (SOURCES / name).read_text(encoding="utf-8").splitlines()]


def candidates(lang: str) -> list[tuple[str, float, dict]]:
    if lang == "zh":
        return [(w, f, {}) for w, f in get_frequency_dict("zh").items()][:20000]
    if lang == "th":
        return [(w, float(c), {}) for w, c in read_tsv("th_opensubtitles.tsv")]
    if lang == "sa":
        return [(w, float(c), {}) for w, c in read_tsv("sa_dcs_lemmas.tsv")]
    if lang == "pa":
        return [(w, float(c), {}) for w, c in read_tsv("pa_wikipedia.tsv")]
    if lang == "la":
        out = []
        for rank, head, meaning, pos in read_tsv("la_dcc_core.tsv"):
            first = head.split()[0].rstrip(",")
            out.append((strip_macrons(first), 1.0 / int(rank), {"headword": head, "meaning": meaning, "pos": pos.split(":")[0].lower()}))
        return out
    raise KeyError(lang)


def zipf_of(count: float, total: float) -> float:
    return round(math.log10(count / total * 1e9), 2) if count > 0 else 0.0


def rank_sourced(db: sqlite3.Connection, lang: str, n: int, kaikki: Path | None, cedict: Path | None) -> list[dict]:
    cands = candidates(lang)
    total = sum(c for _, c, _ in cands) if lang != "zh" else 1.0
    idx = index_rows(db, lang)
    lex: dict[str, dict] = cedict_entries(cedict) if lang == "zh" and cedict else {}
    if lang in KAIKKI_NAMES and kaikki:
        lex = kaikki_entries(kaikki / f"kaikki.org-dictionary-{KAIKKI_NAMES[lang]}.jsonl", lang, {w for w, _, _ in cands})
    out: list[dict] = []
    seen: set[str] = set()
    for word, count, extra in cands:
        entry = lex.get(word) or idx.get(word)
        if lang == "zh" and entry and word in idx and entry.get("ipa") is None:
            entry = {**entry, "ipa": idx[word]["ipa"]}
        if lang == "la":
            base = idx.get(word) or {"word": word, "ipa": None, "meaning": None}
            entry = {**base, **{k: v for k, v in extra.items() if v}, "word": word}
        if not entry or not entry.get("meaning") or fold(entry["word"]) in seen or not clean(entry, lang, []):
            continue
        if lang in SCRIPTS and not SCRIPTS[lang].match(entry["word"]):
            continue
        seen.add(fold(entry["word"]))
        rank = len(out) + 1
        zipf = zipf_of(count, total) if lang not in ("la",) else 0.0
        row = {"rank": rank, "word": entry["word"], "meaning": entry["meaning"], "pos": entry["pos"], "ipa": entry.get("ipa"), "zipf": zipf, "band": band_of(rank)}
        if lang == "sa":
            row["iast"] = word
        if entry.get("pinyin"):
            row["pinyin"] = entry["pinyin"]
        if "headword" in entry:
            row["headword"] = entry["headword"]
        out.append(row)
        if len(out) == n:
            break
    if len(out) < n and lang == "la":
        for row in rank_index(db, lang, n * 2):
            if fold(row["word"]) not in seen and len(out) < n:
                seen.add(fold(row["word"]))
                out.append({**row, "rank": len(out) + 1, "band": band_of(len(out) + 1), "source": "index"})
    return out


def rank_index(db: sqlite3.Connection, lang: str, n: int, votes: dict | None = None) -> list[dict]:
    rows = db.execute("select surface, meaning_en, pos, ipa, payload from photons where lang=?", (lang,))
    freq = get_frequency_dict(lang) if lang in RAW_FREQ_LANGS else {}
    scored = []
    for surface, meaning, pos, ipa, payload in rows:
        if not surface or surface.startswith("-") or surface.endswith("-") or surface.endswith("."):
            continue
        core = json.loads(payload).get("coreness") or {}
        zipf, score = core.get("zipf", 0.0), core.get("score", 0.0)
        if freq:
            zipf = round(math.log10(freq[surface] * 1e9), 2) if surface in freq else 0.0
            score = zipf * 100 + score / 100
        senses = [x.get("gloss") for x in json.loads(payload).get("senses") or [] if x.get("gloss")]
        scored.append((score, zipf, surface, meaning, pos, ipa, senses))
    scored.sort(key=lambda r: (-r[0], -r[1], r[2]))
    seen: set[str] = set()
    out = []
    for score, zipf, surface, meaning, pos, ipa, senses in scored:
        if fold(surface) in seen:
            continue
        agreed = PINS.get((lang, surface)) or (agreed_sense(meaning, senses, votes.get((lang, strip_marks(surface)), {})) if votes else None)
        row = clean({"word": surface, "meaning": agreed or meaning, "pos": pos}, lang, senses)
        if not row:
            continue
        seen.add(fold(surface))
        rank = len(out) + 1
        out.append({"rank": rank, "word": surface, "meaning": row["meaning"], "pos": pos, "ipa": ipa, "zipf": zipf, "score": score, "band": band_of(rank)})
        if len(out) == n:
            break
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", type=int, default=1000)
    ap.add_argument("--kaikki", type=Path)
    ap.add_argument("--cedict", type=Path)
    ap.add_argument("--only", nargs="*")
    args = ap.parse_args()
    db = sqlite3.connect(INDEX)
    OUT.mkdir(parents=True, exist_ok=True)
    langs = [l for (l,) in db.execute("select distinct lang from photons order by lang")] + ["pa"]
    index_path = OUT / "index.json"
    summary = json.loads(index_path.read_text()) if index_path.exists() and args.only else {}
    votes = translation_votes(db)
    for lang in args.only or langs:
        words = rank_sourced(db, lang, args.n, args.kaikki, args.cedict) if lang in SOURCE_INFO else rank_index(db, lang, args.n, votes)
        (OUT / f"{lang}.json").write_text(json.dumps(words, ensure_ascii=False, indent=1))
        summary[lang] = {
            "count": len(words),
            "with_frequency": sum(1 for w in words if w["zipf"] > 0 or lang == "la"),
            "frequency_source": SOURCE_INFO.get(lang, DEFAULT_SOURCE),
            "gloss_source": GLOSS_SOURCE,
            "band": {lvl: sum(1 for w in words if w["band"] == lvl) for _, lvl in BANDS},
        }
    (OUT / "index.json").write_text(json.dumps(dict(sorted(summary.items())), ensure_ascii=False, indent=1))
    print(json.dumps({k: v["count"] for k, v in summary.items()}))


if __name__ == "__main__":
    main()
