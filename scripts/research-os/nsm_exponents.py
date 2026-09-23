#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import node_words  # noqa: E402

REPO_ROOT = node_words.REPO_ROOT
SEED = os.path.join(REPO_ROOT, "supabase", "seed", "nsm-primes.json")
SOURCE = node_words.SOURCE
MAX_WORDS = 2
MATCHED = 0.6
FALLBACK = 0.4
THIN_FALLBACK = 0.2
THIN_LANGS = 10
ROW_COLUMNS = ["prime_id", "lang", "word", "rank", "roman", "sense", "sense_match", "confidence", "root_lang", "root_form", "root_gloss", "source", "run_id"]


def load_seed(path=SEED):
    with open(path, encoding="utf-8") as f:
        seed = json.load(f)
    primes = seed["primes"]
    ids = [p["id"] for p in primes]
    if len(set(ids)) != len(ids):
        raise ValueError("duplicate prime id in seed")
    return seed


def translation_rows(db, en_word, en_pos):
    return [dict(r) for r in db.db.execute(
        "select sense, lang, word, roman from translation where en_word = ? and en_pos = ? order by rowid", (en_word, en_pos)
    )]


def group_senses(rows, targets):
    senses = {}
    for r in rows:
        lang = node_words.LANG_ALIASES.get(r["lang"], r["lang"])
        if lang not in targets or not (r["word"] or "").strip():
            continue
        s = senses.setdefault(r["sense"] or "", {"sense": r["sense"] or "", "rows": [], "langs": set()})
        s["rows"].append(dict(r, lang=lang))
        s["langs"].add(lang)
    return list(senses.values())


def select_sense(senses, pattern):
    if not senses:
        return None, False
    rx = re.compile(pattern, re.I)
    widest = lambda ss: max(ss, key=lambda s: (len(s["langs"]), -senses.index(s)))
    hits = [s for s in senses if rx.search(s["sense"])]
    if hits:
        return widest(hits), True
    return widest(senses), False


def confidence_for(matched, langs, proxy=False):
    if matched and not proxy:
        return MATCHED
    return FALLBACK if langs >= THIN_LANGS else THIN_FALLBACK


def pick_words(sense):
    out = {}
    for r in sense["rows"]:
        words = out.setdefault(r["lang"], [])
        w = r["word"].strip()
        if len(words) < MAX_WORDS and all(x["word"] != w for x in words):
            words.append({"word": w, "roman": (r.get("roman") or "").strip()})
    return out


def english_words(prime):
    out = []
    for w in prime["english"]:
        if len(out) < MAX_WORDS and w not in out:
            out.append(w)
    return [{"word": w, "roman": ""} for w in out]


def prime_rows(prime, db, targets, run_id):
    spec = prime.get("sense")
    if not spec:
        return {"sense": None, "sense_match": None, "langs": 0}, []
    senses = group_senses(translation_rows(db, spec["en_word"], spec["en_pos"]), targets)
    chosen, matched = select_sense(senses, spec["gloss_pattern"])
    if not chosen:
        return {"sense": None, "sense_match": False, "langs": 0}, []
    conf = confidence_for(matched, len(chosen["langs"]), bool(spec.get("proxy")))
    picks = pick_words(chosen)
    if "en" in targets and "en" not in picks:
        picks["en"] = english_words(prime)
    rows = []
    for lang in sorted(picks):
        for rank, w in enumerate(picks[lang], start=1):
            resolved, _chain, (root_lang, root_form, root_gloss) = node_words.analyze_word(lang, w["word"], db)
            entry = db.entry(lang, resolved) if resolved else None
            rows.append({
                "prime_id": prime["id"], "lang": lang, "word": w["word"], "rank": rank,
                "roman": w["roman"] or (entry or {}).get("roman") or None,
                "sense": chosen["sense"], "sense_match": matched, "confidence": conf,
                "root_lang": root_lang, "root_form": root_form, "root_gloss": root_gloss or None,
                "source": SOURCE, "run_id": run_id,
            })
    return {"sense": chosen["sense"], "sense_match": matched, "langs": len(chosen["langs"])}, rows


def lit(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, list):
        return "array[" + ",".join(lit(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def prime_sql(prime, ord_, meta):
    spec = prime.get("sense") or {}
    vals = [prime["id"], prime["label"], prime["category"], prime["english"], ord_, spec.get("en_word"), spec.get("en_pos"), meta["sense"], meta["sense_match"]]
    return (
        "insert into graph.nsm_primes (id, label, category, english, ord, en_word, en_pos, sense, sense_match) values ("
        + ", ".join(lit(v) for v in vals)
        + ") on conflict (id) do update set label = excluded.label, category = excluded.category, english = excluded.english, ord = excluded.ord,"
        " en_word = excluded.en_word, en_pos = excluded.en_pos, sense = excluded.sense, sense_match = excluded.sense_match;"
    )


def build_sql(seed_primes, results):
    ids = [p["id"] for p in seed_primes]
    out = ["\\set ON_ERROR_STOP 1", "begin;"]
    out.append("delete from graph.nsm_primes where id not in (" + ", ".join(lit(i) for i in ids) + ");")
    out.append("update graph.nsm_primes set ord = ord + 100 where ord <= 100;")
    for i, p in enumerate(seed_primes, start=1):
        out.append(prime_sql(p, i, results[p["id"]][0]))
    out.append("commit;")
    for p in seed_primes:
        rows = results[p["id"]][1]
        out.append("begin;")
        out.append(f"delete from graph.nsm_exponents where prime_id = {lit(p['id'])};")
        for r in rows:
            out.append("insert into graph.nsm_exponents (" + ", ".join(ROW_COLUMNS) + ") values (" + ", ".join(lit(r[c]) for c in ROW_COLUMNS) + ");")
        out.append("commit;")
    return "\n".join(out) + "\n"


def apply_sql(db_url, sql):
    subprocess.run(["psql", db_url, "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"], input=sql, text=True, check=True)


def run(seed, db, targets, run_id):
    results = {}
    for p in seed["primes"]:
        results[p["id"]] = prime_rows(p, db, targets, run_id)
    return results


def report(seed, results):
    rows = [r for _m, rs in results.values() for r in rs]
    by_lang = {}
    for r in rows:
        by_lang[r["lang"]] = by_lang.get(r["lang"], 0) + 1
    no_lookup = [p["id"] for p in seed["primes"] if results[p["id"]][0]["sense_match"] is None]
    no_match = [p["id"] for p in seed["primes"] if results[p["id"]][0]["sense_match"] is False]
    print(f"primes {len(seed['primes'])} with exponents {sum(1 for _m, rs in results.values() if rs)} rows {len(rows)}")
    print("rows by lang", dict(sorted(by_lang.items(), key=lambda x: (-x[1], x[0]))))
    print("rows by confidence", dict(sorted({c: sum(1 for r in rows if r["confidence"] == c) for c in {r["confidence"] for r in rows}}.items())))
    print("with root", sum(1 for r in rows if r["root_form"]), "with root gloss", sum(1 for r in rows if r["root_gloss"]))
    print("no sense match", no_match)
    print("no wiktionary lookup", no_lookup)
    return {"rows": len(rows), "by_lang": by_lang, "no_match": no_match, "no_lookup": no_lookup}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--roots", default=node_words.ROOTS_DB)
    ap.add_argument("--seed", default=SEED)
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", node_words.DEFAULT_DB_URL))
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--show", default="")
    a = ap.parse_args(argv)
    seed = load_seed(a.seed)
    db = node_words.Roots(a.roots)
    targets = set(db.langs)
    run_id = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    results = run(seed, db, targets, run_id)
    report(seed, results)
    if a.show:
        meta, rows = results[a.show]
        print(json.dumps(meta, ensure_ascii=False))
        for r in rows:
            print(json.dumps({k: r[k] for k in ("lang", "word", "rank", "roman", "confidence", "root_lang", "root_form", "root_gloss")}, ensure_ascii=False))
    if a.apply:
        apply_sql(a.db_url, build_sql(seed["primes"], results))
        print("written", run_id)
    else:
        print("dry run, pass --apply to write")
    return 0


if __name__ == "__main__":
    sys.exit(main())
