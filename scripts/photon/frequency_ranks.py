#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
from typing import Iterable, Iterator

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PACKS_DIR = os.environ.get("POLINGUAL_PACKS")
SHIPPED = os.path.join(REPO_ROOT, "polingual", "data", "photons.json.gz")
MANIFEST = os.path.join(REPO_ROOT, "polingual", "data", "frequency-manifest.json")
OUT_DIR = os.path.join(REPO_ROOT, "_intake", "polingual-frequency")

WORDFREQ_LICENCE = "CC-BY-SA 4.0"
WORDFREQ_URL = "https://github.com/rspeer/wordfreq"
HERMITDAVE_LICENCE = "CC-BY-SA 4.0"
HERMITDAVE_URL = "https://github.com/hermitdave/FrequencyWords"

HERMITDAVE_LANGS = {"th": "2018/th/th_50k.txt"}

SUBTLEX_NOTE = (
    "SUBTLEX lists (SUBTLEX-US, -UK, -NL, -DE, -ESP, -PL, -CH, -GR) were checked and not used: "
    "none carries a licence that grants redistribution of derived ranks, and every language they "
    "cover already has a wordfreq list."
)

FORM_WORDS = (
    "plural|singular|participle|form|forms|inflection|person|feminine|masculine|neuter|genitive|dative|"
    "accusative|nominative|vocative|instrumental|locative|ablative|partitive|essive|illative|elative|"
    "inessive|adessive|allative|translative|comparative|superlative|gerund|imperative|infinitive|"
    "preterite|past|present|future|subjunctive|conditional|indicative|imperfect|perfect|pluperfect|"
    "aorist|optative|diminutive|augmentative|definite|indefinite|possessive|spelling|romanization|"
    "contraction|abbreviation|apocopic|obsolete|archaic|alternative|nonstandard|misspelling|clipping"
)
FORM_OF = re.compile(r"\b(?:" + FORM_WORDS + r")\b[^;:]*?\bof ([^,;:()]+?)\s*(?:\([^)]*\))?\s*$", re.IGNORECASE)


def fold(s: str) -> str:
    return unicodedata.normalize("NFC", s.strip()).casefold()


def lemma_of(meaning: str) -> str | None:
    m = FORM_OF.search(meaning.strip().rstrip("."))
    return m.group(1).strip("\"'“”«»") if m else None


def ranks_from_counts(pairs: Iterable[tuple[str, float]]) -> dict[str, int]:
    best: dict[str, float] = {}
    for word, freq in pairs:
        k = fold(word)
        if k and freq > best.get(k, -1.0):
            best[k] = freq
    order = sorted(best.items(), key=lambda kv: (-kv[1], kv[0]))
    return {w: i + 1 for i, (w, _) in enumerate(order)}


COMPOUND_SPLIT = re.compile(r"[-\s]+")


def compound_rank(s: str, rank: dict[str, int]) -> int | None:
    parts = [p for p in COMPOUND_SPLIT.split(s) if p]
    if len(parts) < 2:
        return None
    ranks = [rank.get(p) for p in parts]
    return None if any(r is None for r in ranks) else max(ranks)


def lemma_ranks(surfaces: Iterable[tuple[str, str | None]], rank: dict[str, int]) -> dict[str, tuple[int | None, str, int | None, bool]]:
    lemma_for: dict[str, str] = {}
    group_best: dict[str, tuple[int, bool]] = {}
    own: dict[str, tuple[int | None, bool]] = {}
    for surface, lemma in surfaces:
        s = fold(surface)
        lem = fold(lemma) if lemma else s
        if s not in lemma_for or (lemma_for[s] == s and lem != s):
            lemma_for[s] = lem
        if s not in own:
            direct = rank.get(s)
            own[s] = (direct, False) if direct is not None else (compound_rank(s, rank), True)
        r, derived = own[s]
        if r is None:
            continue
        for key in {s, lem}:
            if (r, derived) < group_best.get(key, (1 << 62, True)):
                group_best[key] = (r, derived)
    out: dict[str, tuple[int | None, str, int | None, bool]] = {}
    for s, lem in lemma_for.items():
        best = group_best.get(lem)
        out[s] = (own[s][0], lem, best[0] if best else None, bool(best and best[1]))
    return out


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def wordfreq_source(lang: str) -> dict | None:
    import importlib.metadata
    import wordfreq

    for wl in ("large", "small"):
        path = wordfreq.available_languages(wl).get(lang)
        if path:
            freqs = wordfreq.get_frequency_dict(lang, wl)
            return {
                "name": f"wordfreq {importlib.metadata.version('wordfreq')} {wl}",
                "url": WORDFREQ_URL,
                "licence": WORDFREQ_LICENCE,
                "file": os.path.basename(path),
                "sha256": sha256_file(path),
                "pairs": freqs.items(),
            }
    return None


def hermitdave_source(lang: str, hd_dir: str | None) -> dict | None:
    rel = HERMITDAVE_LANGS.get(lang)
    if not rel or not hd_dir:
        return None
    path = os.path.join(hd_dir, os.path.basename(rel))
    if not os.path.exists(path):
        return None

    def pairs() -> Iterator[tuple[str, float]]:
        with open(path, encoding="utf-8") as f:
            for line in f:
                parts = line.rstrip("\n").rsplit(" ", 1)
                if len(parts) == 2 and parts[1].isdigit():
                    yield parts[0], float(parts[1])

    return {
        "name": "Hermit Dave FrequencyWords OpenSubtitles 2018",
        "url": f"{HERMITDAVE_URL}/blob/master/content/{rel}",
        "licence": HERMITDAVE_LICENCE,
        "file": os.path.basename(path),
        "sha256": sha256_file(path),
        "pairs": pairs(),
    }


def pack_rows(lang: str, packs_dir: str, tmp: str) -> Iterator[tuple[str, str]]:
    src = os.path.join(packs_dir, lang, f"polingual-{lang}.sqlite.zst")
    db = os.path.join(tmp, f"{lang}.sqlite")
    subprocess.run(["zstd", "-q", "-f", "-d", src, "-o", db], check=True)
    try:
        con = sqlite3.connect(db)
        for surface, meaning in con.execute("select surface, meaning from words order by id"):
            yield surface, meaning
        con.close()
    finally:
        os.remove(db)


def write_table(path: str, table: dict[str, tuple[int | None, str, int | None, bool]]) -> str:
    buf = io.StringIO()
    buf.write("folded\tsurface_rank\tlemma\tlemma_rank\tderived\n")
    for s in sorted(table):
        sr, lem, lr, derived = table[s]
        buf.write(f"{s}\t{'' if sr is None else sr}\t{lem}\t{'' if lr is None else lr}\t{int(derived)}\n")
    data = buf.getvalue().encode("utf-8")
    with open(path, "wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0, filename="") as gz:
        gz.write(data)
    return hashlib.sha256(data).hexdigest()


def dump_shipped(rows: list) -> bytes:
    data = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode="wb", mtime=0, filename="", compresslevel=9) as gz:
        gz.write(data)
    return out.getvalue()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--packs", default=PACKS_DIR)
    ap.add_argument("--shipped", default=SHIPPED)
    ap.add_argument("--manifest", default=MANIFEST)
    ap.add_argument("--out", default=OUT_DIR)
    ap.add_argument("--hermitdave", default=None)
    ap.add_argument("--langs", default="")
    args = ap.parse_args()
    if not args.packs:
        ap.error("pass --packs or set POLINGUAL_PACKS")

    os.makedirs(args.out, exist_ok=True)
    langs = sorted(d for d in os.listdir(args.packs) if os.path.isdir(os.path.join(args.packs, d)))
    if args.langs:
        langs = [l for l in langs if l in set(args.langs.split(","))]

    shipped = json.loads(gzip.open(args.shipped).read())
    by_lang: dict[str, list] = {}
    for r in shipped:
        by_lang.setdefault(r[1], []).append(r)

    manifest = {"field": "freq_rank", "column": 7, "derived_field": "freq_derived", "derived_column": 8, "derived_meaning": "1 marks a rank taken from a compound's rarest part; treat it as an upper bound on frequency", "rule": "rank of the lemma group: the best rank among the lemma and every pack entry whose meaning names it as a form; an unlisted compound of hyphen or space separated parts takes its rarest part's rank and is marked derived", "subtlex": SUBTLEX_NOTE, "languages": {}}
    with tempfile.TemporaryDirectory(dir=args.out) as tmp:
        for lang in langs:
            src = wordfreq_source(lang) or hermitdave_source(lang, args.hermitdave)
            entry: dict = {"pack_rows": 0, "shipped": len(by_lang.get(lang, []))}
            if src is None:
                entry.update({"source": None, "reason": "no frequency list with a redistributable licence covers this language"})
                for r in by_lang.get(lang, []):
                    r[7:] = [None, 0]
                manifest["languages"][lang] = entry
                print(lang, "no source", file=sys.stderr)
                continue
            rank = ranks_from_counts(src["pairs"])
            n = 0

            def surfaces() -> Iterator[tuple[str, str | None]]:
                nonlocal n
                for surface, meaning in pack_rows(lang, args.packs, tmp):
                    n += 1
                    yield surface, lemma_of(meaning)

            table = lemma_ranks(surfaces(), rank)
            table_sha = write_table(os.path.join(args.out, f"{lang}.tsv.gz"), table)
            shipped_rows = by_lang.get(lang, [])
            hit_surface = hit_lemma = hit_derived = 0
            for r in shipped_rows:
                t = table.get(fold(r[2]))
                sr = rank.get(fold(r[2]))
                lr = t[2] if t else sr
                hit_derived += bool(t and t[3])
                hit_surface += sr is not None
                hit_lemma += lr is not None
                r[7:] = [lr, int(bool(t and t[3]))]
            entry.update({
                "source": src["name"], "source_url": src["url"], "licence": src["licence"],
                "source_file": src["file"], "source_sha256": src["sha256"], "source_words": len(rank),
                "pack_rows": n, "pack_surfaces": len(table),
                "pack_ranked": sum(1 for v in table.values() if v[2] is not None),
                "table_sha256": table_sha,
                "shipped_ranked": hit_lemma,
                "shipped_surface_ranked": hit_surface,
                "shipped_compound_derived": hit_derived,
                "coverage": round(hit_lemma / len(shipped_rows), 4) if shipped_rows else None,
            })
            manifest["languages"][lang] = entry
            print(lang, entry["source"], entry.get("coverage"), file=sys.stderr)
            del table, rank

    for r in shipped:
        if len(r) < 9:
            r[7:] = [r[7] if len(r) > 7 else None, 0]
    blob = dump_shipped(shipped)
    with open(args.shipped, "wb") as f:
        f.write(blob)
    manifest["shipped_sha256"] = hashlib.sha256(blob).hexdigest()
    with open(args.manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
