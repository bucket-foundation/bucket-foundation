#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import glob
import json
import os
import re
import sqlite3
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import node_words  # noqa: E402

REPO_ROOT = node_words.REPO_ROOT
BRONZE = os.path.join(REPO_ROOT, "_intake", "clics4")
SILVER = os.path.join(BRONZE, "nsm-clics.sqlite")
MAPPING = os.path.join(REPO_ROOT, "supabase", "seed", "nsm-concepticon.json")
SOURCE = "CLICS 4 v1.0, Tjuka, Forkel, Rzymski and List 2026, doi:10.5281/zenodo.16900179, CC BY 4.0"
MIN_FAMILIES = 3
THRESHOLDS = (2, 3, 4)
COLEX_CAP = 0.7
ISO = {
    "en": "eng", "he": "heb", "ar": "arb", "zh": "cmn", "la": "lat", "grc": "grc", "sux": "sux", "el": "ell",
    "fa": "pes", "hi": "hin", "ta": "tam", "ja": "jpn", "ko": "kor", "ru": "rus", "de": "deu", "fr": "fra",
    "es": "spa", "it": "ita", "pt": "por", "nl": "nld", "sv": "swe", "pl": "pol", "cs": "ces", "tr": "tur",
    "fi": "fin", "id": "ind", "th": "tha", "vi": "vie",
}
SPLIT = re.compile(r"\s*[;,/]\s*")

def default_cldf():
    found = sorted(glob.glob(os.path.join(BRONZE, "clics-clics4-*", "cldf")))
    return found[-1] if found else os.path.join(BRONZE, "cldf")

def csv_rows(cldf, name):
    csv.field_size_limit(10**9)
    with open(os.path.join(cldf, name), encoding="utf-8", newline="") as f:
        yield from csv.DictReader(f)

def load_mapping(path=MAPPING):
    with open(path, encoding="utf-8") as f:
        m = json.load(f)
    concept_prime = {}
    for pid, spec in m["primes"].items():
        for c in spec["concepts"]:
            if c["id"] in concept_prime:
                raise ValueError(f"Concepticon {c['id']} maps to two primes")
            concept_prime[c["id"]] = pid
    return concept_prime, m

def form_keys(form, value):
    keys = set()
    for text in [form or ""] + SPLIT.split(value or ""):
        k = node_words.word_key(text.strip())
        if k:
            keys.add(k)
    return keys

def read_cldf(cldf, concept_prime, iso=ISO):
    code_of = {v: k for k, v in iso.items()}
    varieties = {}
    for r in csv_rows(cldf, "languages.csv"):
        lang = code_of.get(r["ISO639P3code"])
        if lang:
            varieties[r["ID"]] = (lang, r["Glottocode"])
    concept, by_gloss = {}, {}
    for r in csv_rows(cldf, "concepts.csv"):
        pid = concept_prime.get(r["Concepticon_ID"])
        if pid:
            concept[r["ID"]] = pid
            by_gloss[r["Concepticon_Gloss"]] = pid
    forms = {}
    for r in csv_rows(cldf, "forms.csv"):
        v = varieties.get(r["Language_ID"])
        pid = concept.get(r["Parameter_ID"])
        if not v or not pid:
            continue
        forms.setdefault((v[1], pid), []).append((r["Form"], r["Value"]))
    ours = {g for _l, g in varieties.values()}
    lang_of = {g: l for l, g in varieties.values()}
    pairs = []
    for r in csv_rows(cldf, "colexifications.csv"):
        a = by_gloss.get(r["Source_Concept"]) or concept.get(r["Source_Concept"])
        b = by_gloss.get(r["Target_Concept"]) or concept.get(r["Target_Concept"])
        if not a or not b or a == b:
            continue
        a, b = sorted((a, b))
        for g in set(r["Languages"].split()) & ours:
            pairs.append({"prime_a": a, "prime_b": b, "lang": lang_of[g], "glottocode": g, "family_count": int(r["Family_Count"] or 0)})
    return pairs, forms

def shared_form(forms, glottocode, a, b):
    fa, fb = forms.get((glottocode, a), []), forms.get((glottocode, b), [])
    for form_a, value_a in fa:
        ka = form_keys(form_a, value_a)
        for form_b, value_b in fb:
            common = ka & form_keys(form_b, value_b)
            if common:
                return (value_a or form_a).split(";")[0].strip() or form_a, common
    return None, set()

def silver(pairs, forms, path=SILVER):
    rows = {}
    for p in pairs:
        key = (p["prime_a"], p["prime_b"], p["lang"])
        form, keys = shared_form(forms, p["glottocode"], p["prime_a"], p["prime_b"])
        prior = rows.get(key)
        if prior and (prior["keys"] or not keys) and prior["family_count"] >= p["family_count"]:
            continue
        rows[key] = dict(p, form=form, keys=sorted(keys))
    if path:
        if os.path.exists(path):
            os.unlink(path)
        db = sqlite3.connect(path)
        with db:
            db.execute("create table colex (prime_a text, prime_b text, lang text, glottocode text, form text, keys text, family_count integer, primary key (prime_a, prime_b, lang))")
            db.execute("create table form (glottocode text, prime text, form text, value text)")
            db.executemany("insert into colex values (?,?,?,?,?,?,?)", [(r["prime_a"], r["prime_b"], r["lang"], r["glottocode"], r["form"], json.dumps(r["keys"], ensure_ascii=False), r["family_count"]) for r in rows.values()])
            db.executemany("insert into form values (?,?,?,?)", [(g, pid, f, v) for (g, pid), fs in forms.items() for f, v in fs])
        db.close()
    return sorted(rows.values(), key=lambda r: (r["prime_a"], r["prime_b"], r["lang"]))

def exponent_keys(e):
    keys = {node_words.word_key(e["word"])}
    if e.get("roman"):
        keys.add(node_words.word_key(e["roman"]))
    return {k for k in keys if k}

def plan(colex, exponents, min_families=MIN_FAMILIES):
    by_cell = {}
    for e in exponents:
        by_cell.setdefault((e["prime_id"], e["lang"]), []).append(e)
    lowered = {}
    out = []
    for c in colex:
        keys = set(c["keys"])
        rows_a = [e for e in by_cell.get((c["prime_a"], c["lang"]), []) if exponent_keys(e) & keys]
        rows_b = [e for e in by_cell.get((c["prime_b"], c["lang"]), []) if exponent_keys(e) & keys]
        matched = bool(keys) and bool(rows_a) and bool(rows_b)
        counted = c["family_count"] >= min_families
        out.append(dict(c, matched=matched, counted=counted))
        if not (matched and counted):
            continue
        for rows, other in ((rows_a, c["prime_b"]), (rows_b, c["prime_a"])):
            for e in rows:
                k = (e["prime_id"], e["lang"], e["word"])
                entry = lowered.setdefault(k, {"row": e, "with": set()})
                entry["with"].add(other)
    return out, lowered

def base_confidence(e):
    return e["confidence_before"] if e.get("confidence_before") is not None else e["confidence"]

def threshold_report(colex, exponents, uncertain_below, thresholds=THRESHOLDS):
    out = {}
    for t in thresholds:
        rows, lowered = plan(colex, exponents, t)
        pairs = {(r["prime_a"], r["prime_b"]) for r in rows if r["counted"] and r["matched"]}
        made = [v for v in lowered.values() if base_confidence(v["row"]) >= uncertain_below]
        out[t] = {
            "counted_pairs": len({(r["prime_a"], r["prime_b"]) for r in rows if r["counted"]}),
            "counted_cells": sum(1 for r in rows if r["counted"]),
            "pairs": len(pairs),
            "cells": sum(1 for r in rows if r["counted"] and r["matched"]),
            "exponents": len(lowered),
            "made_uncertain": len(made),
        }
    return out

def lit(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (list, tuple)):
        return ("array[" + ",".join(lit(x) for x in v) + "]::text[]") if v else "null"
    return "'" + str(v).replace("'", "''") + "'"

def build_sql(rows, lowered, run_id):
    out = ["\\set ON_ERROR_STOP 1", "begin;",
           "update graph.nsm_exponents set confidence = confidence_before where confidence_before is not null;",
           "update graph.nsm_exponents set confidence_before = null, colex_with = null where confidence_before is not null or colex_with is not null;",
           "delete from graph.nsm_colex;"]
    for r in rows:
        vals = [r["prime_a"], r["prime_b"], r["lang"], r["glottocode"], r["form"] or "?", r["family_count"], r["counted"], r["matched"], SOURCE, run_id]
        out.append("insert into graph.nsm_colex (prime_a, prime_b, lang, glottocode, form, family_count, counted, matched, source, run_id) values (" + ", ".join(lit(v) for v in vals) + ");")
    for (pid, lang, word), v in sorted(lowered.items()):
        out.append(
            f"update graph.nsm_exponents set confidence_before = confidence, confidence = least(confidence, {COLEX_CAP}), colex_with = {lit(sorted(v['with']))} "
            f"where prime_id = {lit(pid)} and lang = {lit(lang)} and word = {lit(word)};"
        )
    out.append("commit;")
    return "\n".join(out) + "\n"

def fetch_exponents(db_url):
    sql = "select coalesce(json_agg(t), '[]'::json) from (select prime_id, lang, word, roman, confidence, confidence_before from graph.nsm_exponents) t"
    out = subprocess.run(["psql", db_url, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], check=True, capture_output=True, text=True).stdout
    return json.loads(out.strip() or "[]")

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--cldf", default=None)
    ap.add_argument("--silver", default=SILVER)
    ap.add_argument("--mapping", default=MAPPING)
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", node_words.DEFAULT_DB_URL))
    ap.add_argument("--min-families", type=int, default=MIN_FAMILIES)
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args(argv)
    cldf = a.cldf or default_cldf()
    if not os.path.exists(os.path.join(cldf, "forms.csv")):
        raise SystemExit(f"no unpacked CLICS CLDF at {cldf}: unzip clics4-v1.0.zip and its cldf/*.csv.zip files first")
    concept_prime, _m = load_mapping(a.mapping)
    pairs, forms = read_cldf(cldf, concept_prime)
    colex = silver(pairs, forms, a.silver)
    exponents = fetch_exponents(a.db_url)
    rows, lowered = plan(colex, exponents, a.min_families)
    print(f"cells {len(colex)} pairs {len({(r['prime_a'], r['prime_b']) for r in colex})} languages {len({r['lang'] for r in colex})} with a shared form {sum(1 for r in colex if r['keys'])}")
    print("thresholds", json.dumps(threshold_report(colex, exponents, node_words.UNCERTAIN_BELOW)))
    print(f"at {a.min_families} families: counted {sum(1 for r in rows if r['counted'])}, matched {sum(1 for r in rows if r['counted'] and r['matched'])}, exponents lowered {len(lowered)}")
    for (pid, lang, word), v in sorted(lowered.items()):
        print(f"   {pid} {lang} {word} with {','.join(sorted(v['with']))} {base_confidence(v['row'])} -> {min(base_confidence(v['row']), COLEX_CAP)}")
    if a.apply:
        run_id = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        subprocess.run(["psql", a.db_url, "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"], input=build_sql(rows, lowered, run_id), text=True, check=True)
        print("written", run_id)
    else:
        print("dry run, pass --apply to write")
    return 0

if __name__ == "__main__":
    sys.exit(main())
