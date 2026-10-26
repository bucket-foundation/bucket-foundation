import argparse
import math
import json
import sqlite3
from pathlib import Path

from wordfreq import get_frequency_dict

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "_intake/photons/index.sqlite"
OUT = ROOT / "learning/app/polingual/top1000"
RAW_FREQ_LANGS = {"ja", "ko", "zh"}


def rank(db: sqlite3.Connection, lang: str, n: int) -> list[dict]:
    rows = db.execute("select surface, meaning_en, pos, ipa, payload from photons where lang=?", (lang,))
    freq = get_frequency_dict(lang) if lang in RAW_FREQ_LANGS else {}
    scored = []
    for surface, meaning, pos, ipa, payload in rows:
        if not surface or surface.startswith("-") or surface.endswith("-") or surface.endswith("."):
            continue
        core = json.loads(payload).get("coreness") or {}
        zipf = core.get("zipf", 0.0)
        score = core.get("score", 0.0)
        if freq:
            zipf = round(math.log10(freq[surface] * 1e9), 2) if surface in freq else 0.0
            score = zipf * 100 + score / 100
        scored.append((score, zipf, surface, meaning, pos, ipa))
    scored.sort(key=lambda r: (-r[0], -r[1], r[2]))
    seen: set[str] = set()
    out = []
    for score, zipf, surface, meaning, pos, ipa in scored:
        if surface.lower() in seen:
            continue
        seen.add(surface.lower())
        out.append({"rank": len(out) + 1, "word": surface, "meaning": meaning, "pos": pos, "ipa": ipa, "zipf": zipf, "score": score})
        if len(out) == n:
            break
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", type=int, default=1000)
    args = ap.parse_args()
    db = sqlite3.connect(INDEX)
    OUT.mkdir(parents=True, exist_ok=True)
    summary = {}
    for (lang,) in db.execute("select distinct lang from photons order by lang").fetchall():
        words = rank(db, lang, args.n)
        (OUT / f"{lang}.json").write_text(json.dumps(words, ensure_ascii=False, indent=1))
        summary[lang] = {"count": len(words), "with_frequency": sum(1 for w in words if w["zipf"] > 0)}
    (OUT / "index.json").write_text(json.dumps(summary, indent=1))
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
