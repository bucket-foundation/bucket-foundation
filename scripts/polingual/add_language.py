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
    freq_file = ROOT / f"learning/app/polingual/sources/{a.lang}_wikipedia.tsv"
    rank = {line.split("\t")[0]: i for i, line in enumerate(freq_file.read_text(encoding="utf-8").splitlines())}
    override_file = ROOT / f"learning/app/polingual/sources/{a.lang}_overrides.tsv"
    overrides = dict(line.split("\t") for line in override_file.read_text(encoding="utf-8").splitlines()) if override_file.exists() else {}
    forced: dict[str, dict] = {}
    best: dict[str, tuple[tuple, dict]] = {}
    with a.kaikki.open(encoding="utf-8") as fh:
        for line in fh:
            e = json.loads(line)
            word = e.get("word", "")
            if not GURMUKHI.match(word) or e.get("pos") in ("character", "suffix", "prefix"):
                continue
            senses = [s for s in e.get("senses", []) if s.get("glosses") and not SKIP_TAGS & set(s.get("tags", []))]
            for concept, chosen in overrides.items():
                if chosen == word and concept not in forced:
                    gloss = next((s["glosses"][0] for s in e.get("senses", []) if concept in head_terms(s["glosses"][0])), concept)
                    forced[concept] = {"s": word, "l": a.lang, "g": gloss, "p": e.get("pos"), "hv": False, "senses": [], "c": concept}
            if not senses or e.get("pos") in ("name",):
                continue
            for pos_i, term in enumerate(head_terms(senses[0]["glosses"][0])[:2]):
                if term not in concepts:
                    continue
                key = (pos_of.get(term) != e.get("pos"), word not in rank, pos_i, rank.get(word, 10**6), len(word))
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
    chosen = {c: rec for c, (_, rec) in best.items() if c not in overrides}
    chosen.update(forced)
    words = [w for w in subset["words"] if w["l"] != a.lang] + [chosen[c] for c in sorted(chosen)]
    m = subset["manifest"]
    m["languages"] = sorted(set(m["languages"]) | {a.lang})
    m["language_names"] = dict(sorted({**m["language_names"], a.lang: a.name}.items()))
    m["words"] = len(words)
    subset["words"] = words
    subset["attribution"]["license"] = "CC-BY-SA 4.0"
    m["preview"] = sorted(set(m.get("preview", [])) | {a.lang})
    SUBSET.write_text(json.dumps(subset, ensure_ascii=False, separators=(",", ":")))
    print(a.lang, len(chosen), "of", len(concepts), "concepts,", len(forced), "from overrides")


if __name__ == "__main__":
    main()
