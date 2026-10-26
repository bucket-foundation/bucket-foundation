import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUBSET = ROOT / "learning/app/polingual/subset.json"
TOP = ROOT / "learning/app/polingual/top1000"
GURMUKHI = re.compile(r"^[਀-੿]+$")
SKIP_TAGS = {"form-of", "alt-of", "obsolete", "archaic", "rare"}


def head_terms(gloss: str) -> list[str]:
    gloss = re.sub(r"\([^)]*\)", "", gloss).lower()
    return [t.strip().removeprefix("to ").removeprefix("a ").removeprefix("the ").strip() for t in re.split(r"[;,]", gloss)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kaikki", type=Path, required=True)
    ap.add_argument("--lang", default="pa")
    ap.add_argument("--name", default="Punjabi")
    a = ap.parse_args()
    subset = json.loads(SUBSET.read_text())
    concepts = set(subset["manifest"]["concepts"])
    pos_of = {w["c"]: w["p"] for w in subset["words"] if w["l"] == "en" and w.get("c")}
    rank = {w["word"]: w["rank"] for w in json.loads((TOP / f"{a.lang}.json").read_text())}
    best: dict[str, tuple[tuple, dict]] = {}
    with a.kaikki.open(encoding="utf-8") as fh:
        for line in fh:
            e = json.loads(line)
            word = e.get("word", "")
            if not GURMUKHI.match(word) or e.get("pos") in ("name", "character", "suffix", "prefix"):
                continue
            senses = [s for s in e.get("senses", []) if s.get("glosses") and not SKIP_TAGS & set(s.get("tags", []))]
            if not senses:
                continue
            for pos_i, term in enumerate(head_terms(senses[0]["glosses"][0])[:2]):
                if term not in concepts:
                    continue
                key = (pos_of.get(term) != e.get("pos"), pos_i, rank.get(word, 10**6), len(word))
                if term in best and best[term][0] <= key:
                    continue
                ipa = next((s["ipa"].strip("/[]") for s in e.get("sounds", []) if "ipa" in s), None)
                rec = {"s": word, "l": a.lang, "g": senses[0]["glosses"][0], "p": e.get("pos"), "hv": False,
                       "senses": [{"g": s["glosses"][0], "p": e.get("pos"), "t": sorted(s.get("tags", []))} for s in senses[1:5]], "c": term}
                if ipa:
                    rec["ipa"] = ipa
                if e.get("etymology_text"):
                    rec["e"] = e["etymology_text"][:300]
                best[term] = (key, rec)
    words = [w for w in subset["words"] if w["l"] != a.lang] + [rec for _, (_, rec) in sorted(best.items())]
    m = subset["manifest"]
    m["languages"] = sorted(set(m["languages"]) | {a.lang})
    m["language_names"] = dict(sorted({**m["language_names"], a.lang: a.name}.items()))
    m["words"] = len(words)
    subset["words"] = words
    SUBSET.write_text(json.dumps(subset, ensure_ascii=False, separators=(",", ":")))
    print(a.lang, len(best), "of", len(concepts), "concepts")


if __name__ == "__main__":
    main()
