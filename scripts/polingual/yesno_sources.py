#!/usr/bin/env python3
import argparse
import gzip
import json
import sqlite3
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKS = Path.home() / "agfarms" / ".polingual-packs"
CASED_NOUNS = {"de", "lb"}
SKIP_POS = {"name", "phrase", "intj", "num", "abbrev", "symbol", "prefix", "suffix"}


def ranked(lang, photons=ROOT / "polingual" / "data" / "photons.json.gz"):
    best = {}
    for r in json.load(gzip.open(photons)):
        if r[1] != lang or len(r) < 8 or not isinstance(r[7], int) or r[7] < 1 or r[4] in SKIP_POS or (lang not in CASED_NOUNS and r[2] != r[2].lower()):
            continue
        w = r[2].strip().lower()
        if w not in best or r[7] < best[w]:
            best[w] = r[7]
    return [{"word": w, "rank": r} for w, r in sorted(best.items(), key=lambda kv: (kv[1], kv[0]))]


def forms(lang, packs=PACKS):
    src = packs / lang / f"polingual-{lang}.sqlite.zst"
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "pack.sqlite"
        subprocess.run(["zstd", "-dqf", str(src), "-o", str(db)], check=True)
        con = sqlite3.connect(db)
        out = sorted({s.strip().lower() for (s,) in con.execute("select surface from words") if s and " " not in s.strip()})
        con.close()
    return out


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("lang")
    p.add_argument("--out", required=True)
    a = p.parse_args(argv)
    Path(a.out).write_text(json.dumps({"lang": a.lang, "ranked": ranked(a.lang), "forms": forms(a.lang)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
