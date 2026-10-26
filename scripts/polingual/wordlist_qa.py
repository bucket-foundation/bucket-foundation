import argparse
import json
import random
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOP = ROOT / "learning/app/polingual/top1000"
SAMPLE = 50
SEED = 2026

INFLECTION = re.compile(
    r"^(inflection of|alternative (form|spelling) of|(\w+ )*(singular|plural|participle|gerund|form|tense|case|imperative|infinitive|comparative|superlative|diminutive|transliteration|abbreviation|misspelling|romanization|contraction|initialism|acronym|synonym|clipping|ellipsis) of\b|^The name of the |[\w/ -]*(of|for) \S+ ?\(.*\):?$|.*\bof \S+:$)",
    re.I,
)
GRAMMAR_LEAD = re.compile(
    r"^((nominative|accusative|dative|genitive|vocative|instrumental|locative|ablative|prepositional|partitive|first|second|third|first-person|second-person|third-person|singular|plural|dual|past|present|future|masculine|feminine|neuter|animate|inanimate|definite|indefinite|short|long|strong|weak|mixed|polite|informal|formal|perfective|imperfective|active|passive|separable|verbal|construct|possessive|oblique|direct|and|or|[/,-])[ /,-]*)+.*\bof\b",
    re.I,
)
PROPER = re.compile(r"\b(surname|given name|a city|a town|a village|a river|a country|a province|a state of|capital of|a region of|female given|male given|a district|placename|place name)\b", re.I)
PROPER_POS = {"name", "proper noun", "propn"}
JUNK_POS = {"character", "symbol", "punct", "affix", "suffix", "prefix", "romanization", "syllable", "letter"}
DIGIT = re.compile(r"\d")
LATIN_LANGS = {"cs", "de", "en", "es", "fi", "fr", "id", "it", "la", "nl", "pl", "pt", "sv", "tr", "vi"}


def fold(word: str) -> str:
    return unicodedata.normalize("NFC", word).casefold()


def defects(row: dict, lang: str) -> list[str]:
    word, gloss, pos = row["word"], (row.get("meaning") or "").strip(), (row.get("pos") or "").lower()
    out = []
    if DIGIT.search(word) or pos in JUNK_POS or (lang in LATIN_LANGS and len(word) == 1 and word.lower() not in {"a", "e", "i", "o", "y", "u", "w", "z", "à", "é", "è", "å", "ä", "ö"}):
        out.append("junk")
    if pos in PROPER_POS or PROPER.search(gloss) or re.match(r"^(Al|El)-[A-Z]", gloss) or (lang in LATIN_LANGS - {"de"} and word[:1].isupper() and word != word.upper()):
        out.append("proper")
    if not gloss or INFLECTION.match(gloss) or GRAMMAR_LEAD.match(gloss) or len(gloss) > 200:
        out.append("gloss")
    return out


def audit(lang: str, words: list[dict]) -> dict:
    seen: dict[str, int] = {}
    dupes = set()
    for w in words:
        key = fold(w["word"])
        if key in seen:
            dupes.add(w["rank"])
        seen.setdefault(key, w["rank"])
    sample = random.Random(f"{SEED}:{lang}").sample(words, min(SAMPLE, len(words)))
    flagged = []
    for w in sample:
        kinds = defects(w, lang) + (["duplicate"] if w["rank"] in dupes else [])
        if kinds:
            flagged.append({"rank": w["rank"], "word": w["word"], "meaning": w.get("meaning"), "defects": kinds})
    full = sum(1 for w in words if defects(w, lang) or w["rank"] in dupes)
    return {"sample": len(sample), "defects": len(flagged), "rate": round(len(flagged) / len(sample), 2), "full_list_flagged": full, "flagged": flagged}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=TOP / "qa-report.json")
    a = ap.parse_args()
    report = {}
    for path in sorted(TOP.glob("[a-z][a-z].json")):
        report[path.stem] = audit(path.stem, json.loads(path.read_text()))
    a.out.write_text(json.dumps(report, ensure_ascii=False, indent=1))
    for lang, r in report.items():
        print(lang, r["defects"], "/", r["sample"], "full", r["full_list_flagged"])


if __name__ == "__main__":
    main()
