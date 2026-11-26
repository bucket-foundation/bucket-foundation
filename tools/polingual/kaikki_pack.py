#!/usr/bin/env python3
import argparse
import json
import re
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import export_packs as ep

SKIP_POS = {"romanization", "character", "symbol", "punct"}
SKIP_FORM_TAGS = {"romanization", "table-tags", "inflection-template", "class", "transliteration", "error-unknown-tag"}
LATIN = re.compile(r"[A-Za-z]")
MAX_SENSES = 6
POS_MAP = {"adj": "adj", "adv": "adv", "noun": "noun", "verb": "verb", "name": "name", "num": "num", "pron": "pron",
           "prep": "prep", "postp": "postp", "det": "det", "conj": "conj", "intj": "intj", "particle": "particle"}


def entry_meaning(entry):
    out = []
    for sense in entry.get("senses") or []:
        gloss = (sense.get("glosses") or [""])[-1].strip()
        if gloss and gloss not in out:
            out.append(gloss)
    return ep.SENSE_JOIN.join(out[:MAX_SENSES])


def entry_ipa(entry):
    return next((s["ipa"] for s in entry.get("sounds") or [] if s.get("ipa")), "")


def form_rows(entry, pos):
    word = entry["word"]
    seen = set()
    for f in entry.get("forms") or []:
        form = (f.get("form") or "").strip()
        tags = set(f.get("tags") or [])
        if not form or form == word or form in seen or tags & SKIP_FORM_TAGS or LATIN.search(form) or form == "-":
            continue
        seen.add(form)
        meaning = f"form of {word}" if "canonical" in tags else f"inflection of {word}"
        yield (form, "", pos, meaning, "functional", "word", None)


def kaikki_rows(path):
    lemmas, forms = [], []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            entry = json.loads(line)
            word = (entry.get("word") or "").strip()
            pos = POS_MAP.get(entry.get("pos"), entry.get("pos") or "")
            if not word or pos in SKIP_POS or LATIN.search(word):
                continue
            meaning = entry_meaning(entry)
            if meaning:
                lemmas.append((word, entry_ipa(entry), pos, meaning, "functional", "word", None))
            forms.extend(form_rows(entry, pos))
    known = {r[0] for r in lemmas}
    return lemmas + merge_forms(r for r in forms if r[0] not in known)


def merge_forms(forms):
    by_surface = {}
    for surface, ipa, pos, meaning, tier, kind, rel in forms:
        row = by_surface.setdefault(surface, [surface, ipa, pos, [], tier, kind, rel])
        if meaning not in row[3]:
            row[3].append(meaning)
    return [(s, i, p, ep.SENSE_JOIN.join(m[:MAX_SENSES]), t, k, r) for s, i, p, m, t, k, r in by_surface.values()]


def existing_rows(pack_zst, scratch):
    db_path = Path(scratch) / "old.sqlite"
    subprocess.run(["zstd", "-dqf", str(pack_zst), "-o", str(db_path)], check=True)
    db = sqlite3.connect(db_path)
    rows = [(s, i, p, m, t, k, None) for s, i, p, m, t, k in
            db.execute("select surface, ipa, pos, meaning, tier, kind from words order by id")]
    shared = [r[0] for r in db.execute("select folded from words where shared = 1")]
    db.close()
    shared_db = Path(scratch) / "shared.sqlite"
    sd = sqlite3.connect(shared_db)
    sd.execute("create table shared(folded text primary key) without rowid")
    sd.executemany("insert or ignore into shared values (?)", [(f,) for f in shared])
    sd.commit()
    sd.close()
    return rows, shared_db


def merge(old, new):
    have = {r[0] for r in old}
    return old + [r for r in new if r[0] not in have]


def main(argv=None):
    p = argparse.ArgumentParser(description="Build or extend a Polingual word pack from a Kaikki per-language extract.")
    p.add_argument("--lang", required=True)
    p.add_argument("--kaikki", required=True, help="JSONL of Kaikki entries for this language")
    p.add_argument("--out", required=True, help="packs folder; an existing pack there is kept and extended")
    p.add_argument("--commit", default="unknown")
    a = p.parse_args(argv)
    new = kaikki_rows(a.kaikki)
    target = Path(a.out) / a.lang / ep.pack_file(a.lang)
    with tempfile.TemporaryDirectory() as tmp:
        shared_db = None
        rows = new
        if target.exists():
            old, shared_db = existing_rows(target, tmp)
            rows = merge(old, new)
            print(f"{a.lang}: kept {len(old)} rows, added {len(rows) - len(old)} from Kaikki")
        m = ep.build_pack(a.lang, rows, a.out, shared_db=shared_db, commit=a.commit, work_dir=tmp)
    print(f"{a.lang}: {m['rows']} rows, {m['bytes']} bytes")


if __name__ == "__main__":
    main()
