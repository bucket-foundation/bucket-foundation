#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import random
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import node_words  # noqa: E402
import roots_label  # noqa: E402
import roots_sample  # noqa: E402

REPO_ROOT = node_words.REPO_ROOT
MODEL_LABELS = os.path.join(REPO_ROOT, "learning", "research-os", "roots-v2-labels-models.csv")
AFTER_LABELS = os.path.join(REPO_ROOT, "learning", "research-os", "roots-v2-labels-after.csv")
BAND_OUT = os.path.join(REPO_ROOT, "learning", "research-os", "roots-v2-bands.json")
BAND_SCHEMA = {
    "type": "object",
    "properties": {"labels": {"type": "array", "items": {"type": "object", "properties": {
        "key": {"type": "string"}, "label": {"type": "string", "enum": ["right", "wrong", "cannot_tell"]}, "why": {"type": "string"}}, "required": ["key", "label", "why"]}}},
    "required": ["labels"],
}

def after_rows(db_url, hide_below=node_words.HIDE_BELOW):
    nw = roots_sample.fetch(db_url, (
        "select 'nw|' || node_id::text || '|' || lang || '|' || word as row, confidence, root_confidence, root_lang, root_form, root_gloss, root_source "
        "from graph.node_words"
    ))
    nsm = roots_sample.fetch(db_url, (
        "select 'nsm|' || prime_id || '|' || lang || '|' || word as row, confidence, root_confidence, root_lang, root_form, root_gloss, root_source "
        "from graph.nsm_exponents"
    ))
    return {r["row"]: r for r in nw + nsm}

def classify(sample_row, after, hide_below=node_words.HIDE_BELOW):
    a = after.get(sample_row["row"])
    if not a or not a["root_form"] or a["confidence"] < hide_below or a["root_confidence"] < hide_below:
        return "hidden", a
    if (a["root_lang"], a["root_form"]) != (sample_row["root_lang"], sample_row["root_form"]):
        return "changed", a
    return "same", a

def score(sample, frozen, after, relabel):
    out = {"hidden": {}, "same": {}, "changed": {}}
    labels_after = []
    for r in sample:
        kind, _a = classify(r, after)
        lab = frozen.get(r["key"]) or "disagree"
        if kind == "changed":
            lab = relabel.get(r["key"]) or "disagree"
        out[kind][lab] = out[kind].get(lab, 0) + 1
        if kind != "hidden" and lab in roots_label.LABELS:
            labels_after.append(lab)
    return out, labels_after

def band(c):
    return "below 0.5" if c < node_words.HIDE_BELOW else ("0.5 to 0.75" if c < node_words.UNCERTAIN_BELOW else "0.75 and above")

def band_rows(rows, seed, per=25):
    rnd = random.Random(seed)
    by = {}
    for r in rows:
        by.setdefault(band(r["confidence"]), []).append(r)
    out = []
    for b in sorted(by):
        pool = sorted(by[b], key=lambda r: (r["node_id"], r["lang"], r["word"]))
        rnd.shuffle(pool)
        out.extend(dict(r, band=b) for r in pool[:per])
    return [dict(r, key=f"w{i}") for i, r in enumerate(out)]

def band_prompt(batch):
    parts = ["Each item is a word offered as the translation of an English term in the sense given. Answer right when the word means that term in that sense in its language, wrong when it does not, cannot_tell when you do not know."]
    for r in batch:
        parts.append(f"key {r['key']}: English \"{r['en_term']}\" in the sense \"{(r['sense'] or '')[:140]}\"; {r['lang']} word {r['word']} (dictionary gloss \"{(r['gloss'] or '')[:120]}\")")
    return "\n".join(parts)

def band_labels(rows, model, workers=6):
    batches = [rows[i:i + roots_label.BATCH] for i in range(0, len(rows), roots_label.BATCH)]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        texts = list(pool.map(lambda b: roots_label.cached_ask(band_prompt(b), model, BAND_SCHEMA), batches))
    out = {}
    for batch, text in zip(batches, texts):
        keys = {r["key"] for r in batch}
        for item in json.loads(text).get("labels", []):
            if item.get("key") in keys:
                out[item["key"]] = item.get("label")
    return out

def band_report(rows, labs):
    rep = {}
    for r in rows:
        la, lb = labs[0].get(r["key"]), labs[1].get(r["key"])
        b = rep.setdefault(r["band"], {"n": 0, "right": 0, "wrong": 0, "disagree": 0})
        b["n"] += 1
        if la != lb or la not in ("right", "wrong"):
            b["disagree"] += 1
        else:
            b[la] += 1
    return rep

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", node_words.DEFAULT_DB_URL))
    ap.add_argument("--roots", default=node_words.ROOTS_DB)
    ap.add_argument("--models", default="sonnet,haiku")
    ap.add_argument("--bands-before", default="")
    a = ap.parse_args(argv)
    sample = roots_sample.read_csv(roots_sample.SAMPLE)
    labels = roots_sample.read_csv(MODEL_LABELS)
    frozen = {r["key"]: r["consensus"] for r in labels if r["consensus"]}
    after = after_rows(a.db_url)
    ids = [roots_label.resolve(m) for m in a.models.split(",")]
    db = node_words.Roots(a.roots)
    changed = []
    for r in sample:
        kind, row = classify(r, after)
        if kind == "changed":
            changed.append(dict(r, root_lang=row["root_lang"], root_form=row["root_form"], root_gloss=row["root_gloss"] or ""))
    relabs = [roots_label.label_rows(changed, db, m) for m in ids]
    relabel = {r["key"]: roots_label.consensus(relabs[0], relabs[1], r["key"]) for r in changed}
    roots_sample.write_csv(AFTER_LABELS, [dict(r, **{ids[0]: relabs[0].get(r["key"], ""), ids[1]: relabs[1].get(r["key"], ""), "consensus": relabel.get(r["key"]) or ""}) for r in changed],
                           ["key", "lang", "word", "root_lang", "root_form", "root_gloss", ids[0], ids[1], "consensus"])
    split, after_labs = score(sample, frozen, after, relabel)
    before = roots_label.precision(list(frozen.values()))
    after_p = roots_label.precision(after_labs)
    print(json.dumps({"split": split, "changed": len(changed)}, sort_keys=True))
    print(f"provisional precision before {before[0]}/{before[1]} = {before[2][0]:.2f} ({before[2][1]:.2f}..{before[2][2]:.2f}); after {after_p[0]}/{after_p[1]} = {after_p[2][0]:.2f} ({after_p[2][1]:.2f}..{after_p[2][2]:.2f})")
    if a.bands_before:
        with open(a.bands_before, encoding="utf-8") as f:
            before_rows = json.load(f)
        now = roots_sample.fetch(a.db_url, "select node_id::text as node_id, lang, word, gloss, sense, en_term, confidence from graph.node_words")
        result = {}
        for name, rows in (("before", before_rows), ("after", now)):
            picked = band_rows(rows, "roots-v2-bands")
            labs = [band_labels(picked, m) for m in ids]
            result[name] = band_report(picked, labs)
        with open(BAND_OUT, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, sort_keys=True)
            f.write("\n")
        print(json.dumps(result, sort_keys=True))
    return 0

if __name__ == "__main__":
    sys.exit(main())
