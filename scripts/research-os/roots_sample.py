#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import node_words  # noqa: E402

REPO_ROOT = node_words.REPO_ROOT
SAMPLE = os.path.join(REPO_ROOT, "learning", "research-os", "roots-v2-sample.csv")
FOUNDER = os.path.join(REPO_ROOT, "learning", "research-os", "roots-v2-labels-founder.csv")
FAMILY = {
    "en": "germanic", "de": "germanic", "nl": "germanic", "sv": "germanic", "ang": "germanic", "got": "germanic", "non": "germanic",
    "fr": "romance", "es": "romance", "pt": "romance", "it": "romance", "la": "italic-greek", "grc": "italic-greek", "el": "italic-greek",
    "ru": "slavic", "pl": "slavic", "cs": "slavic", "hi": "indo-iranian", "fa": "indo-iranian", "sa": "indo-iranian",
    "he": "semitic", "ar": "semitic", "akk": "semitic", "zh": "east-asian", "ja": "east-asian", "ko": "east-asian",
    "fi": "other", "tr": "other", "id": "other", "th": "other", "vi": "other", "ta": "other", "cop": "other", "egy": "other", "sux": "other",
}
COLUMNS = ["key", "table", "lang", "word", "roman", "sense", "root_lang", "root_form", "root_gloss", "confidence", "root_confidence", "row"]

def fetch(db_url, sql):
    out = subprocess.run(["psql", db_url, "-At", "-v", "ON_ERROR_STOP=1", "-c", f"select coalesce(json_agg(t), '[]'::json) from ({sql}) t"], check=True, capture_output=True, text=True).stdout
    return json.loads(out.strip() or "[]")

def shown_rows(db_url, hide_below=node_words.HIDE_BELOW):
    nw = fetch(db_url, (
        "select 'nw:' || id::text as key, 'nw|' || node_id::text || '|' || lang || '|' || word as row, 'node_words' as \"table\", lang, word, roman, coalesce(nullif(gloss, ''), sense) as sense, "
        "root_lang, root_form, root_gloss, confidence, null::real as root_confidence from graph.node_words "
        f"where root_form is not null and confidence >= {hide_below} order by id"
    ))
    nsm = fetch(db_url, (
        "select 'nsm:' || prime_id || '|' || lang || '|' || word as key, 'nsm|' || prime_id || '|' || lang || '|' || word as row, 'nsm_exponents' as \"table\", lang, word, roman, sense, "
        "root_lang, root_form, root_gloss, confidence, root_confidence from graph.nsm_exponents "
        f"where root_form is not null and confidence >= {hide_below} and root_confidence >= {hide_below} order by prime_id, lang, word"
    ))
    return nw, nsm

def stratified(rows, n, rnd):
    by = {}
    for r in rows:
        by.setdefault(FAMILY.get(r["lang"], "other"), []).append(r)
    fams = sorted(by)
    quota = {f: 1 for f in fams}
    rest = n - len(fams)
    total = sum(len(v) for v in by.values())
    for f in fams:
        quota[f] += int(rest * len(by[f]) / total)
    left = n - sum(quota.values())
    for f in sorted(fams, key=lambda f: -len(by[f]))[:left]:
        quota[f] += 1
    out = []
    for f in fams:
        pool = by[f][:]
        rnd.shuffle(pool)
        out.extend(pool[: quota[f]])
    return out

def distinct(rows):
    seen, out = set(), []
    for r in rows:
        k = (r["lang"], r["word"], r["root_lang"], r["root_form"])
        if k not in seen:
            seen.add(k)
            out.append(r)
    return out

def draw(nw, nsm, seed, n_nw=80, n_nsm=40):
    rnd = random.Random(seed)
    first = stratified(distinct(nw), n_nw, rnd)
    taken = {(r["lang"], r["word"], r["root_lang"], r["root_form"]) for r in first}
    return first + stratified([r for r in distinct(nsm) if (r["lang"], r["word"], r["root_lang"], r["root_form"]) not in taken], n_nsm, rnd)

def write_csv(path, rows, columns):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: ("" if r.get(c) is None else r.get(c)) for c in columns})

def read_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", node_words.DEFAULT_DB_URL))
    ap.add_argument("--seed", default="roots-v2")
    ap.add_argument("--out", default=SAMPLE)
    ap.add_argument("--founder", default=FOUNDER)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)
    if os.path.exists(a.out) and not a.force:
        raise SystemExit(f"{a.out} is frozen; pass --force to draw again")
    nw, nsm = shown_rows(a.db_url)
    rows = draw(nw, nsm, a.seed)
    write_csv(a.out, rows, COLUMNS)
    write_csv(a.founder, [dict(r, label="", note="") for r in rows], ["key", "table", "lang", "word", "sense", "root_lang", "root_form", "root_gloss", "label", "note"])
    fams = {}
    for r in rows:
        fams[FAMILY.get(r["lang"], "other")] = fams.get(FAMILY.get(r["lang"], "other"), 0) + 1
    print(f"shown roots: node_words {len(nw)}, nsm_exponents {len(nsm)}; sample {len(rows)} by family {json.dumps(fams, sort_keys=True)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
