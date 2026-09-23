#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import nsm_exponents  # noqa: E402

PREFIXES = ("se ", "si ", "le ", "la ", "il ", "lo ")
SUFFIXES = (" de", " à", " di", " a", " da")
CHARTS = os.path.join(nsm_exponents.REPO_ROOT, "supabase", "seed", "nsm-chart-exponents.json")

def norm(s):
    s = unicodedata.normalize("NFC", (s or "").lower()).replace("’", "'").replace("...", "…")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn" or c in "̌́̀̂̈̊")
    s = re.sub(r"\s*…\s*", "…", unicodedata.normalize("NFC", s))
    return re.sub(r"\s+", " ", s).strip()

def forms(chart_value):
    out = set()
    for allolex in chart_value.split("~"):
        a = allolex.strip()
        if not a:
            continue
        out.add(norm(re.sub(r"[()]", "", a)))
        out.add(norm(re.sub(r"\([^)]*\)", "", a)))
        for part in a.split("/"):
            out.add(norm(re.sub(r"\([^)]*\)", "", part)))
    return {g for f in out if f for g in word_forms(f)}

def word_forms(word):
    w = norm(word)
    out = {w, norm(re.sub(r"\([^)]*\)", "", word))}
    for f in list(out):
        for pre in PREFIXES:
            if f.startswith(pre):
                out.add(f[len(pre):])
        for suf in SUFFIXES:
            if f.endswith(suf):
                out.add(f[: -len(suf)])
    return {f for f in out if f}

def matches(word, chart_value):
    if not word:
        return False
    return bool(word_forms(word) & forms(chart_value))

def first_exponents(db_url, lang):
    sql = (
        "select coalesce(json_object_agg(prime_id, json_build_object('word', word, 'confidence', confidence)), '{}'::json) "
        f"from graph.nsm_exponents where rank = 1 and lang = '{lang}'"
    )
    out = subprocess.run(["psql", db_url, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], check=True, capture_output=True, text=True).stdout
    return json.loads(out.strip() or "{}")

def check(seed, chart, ours):
    by_cat = {}
    misses = []
    for p in seed["primes"]:
        cat = by_cat.setdefault(p["category"], {"n": 0, "match": 0, "missing": 0})
        cat["n"] += 1
        got = ours.get(p["id"])
        if not got:
            cat["missing"] += 1
            misses.append({"prime": p["id"], "ours": None, "chart": chart[p["id"]]})
        elif matches(got["word"], chart[p["id"]]):
            cat["match"] += 1
        else:
            misses.append({"prime": p["id"], "ours": got["word"], "chart": chart[p["id"]]})
    return by_cat, misses

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--charts", default=CHARTS)
    ap.add_argument("--seed", default=nsm_exponents.SEED)
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", nsm_exponents.node_words.DEFAULT_DB_URL))
    a = ap.parse_args(argv)
    seed = nsm_exponents.load_seed(a.seed)
    with open(a.charts, encoding="utf-8") as f:
        charts = json.load(f)
    for lang, c in charts["charts"].items():
        by_cat, misses = check(seed, c["exponents"], first_exponents(a.db_url, lang))
        n = sum(v["n"] for v in by_cat.values())
        m = sum(v["match"] for v in by_cat.values())
        e = sum(v["missing"] for v in by_cat.values())
        print(f"{lang} n {n} match {m} no exponent {e} miss {n - m - e}  ({c['title']})")
        for cat, v in by_cat.items():
            if v["match"] < v["n"]:
                print(f"   {cat}: {v['match']}/{v['n']}")
        for x in misses:
            print("   miss", json.dumps(x, ensure_ascii=False))
    for lang, why in charts.get("unreachable", {}).items():
        print(f"{lang} not checked: {why}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
