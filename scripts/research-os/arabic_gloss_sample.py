#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import node_words  # noqa: E402
import roots_label  # noqa: E402

OUT = os.path.join(node_words.REPO_ROOT, "learning", "research-os", "arabic-gloss-labels.csv")
SEED = "arabic-root-gloss"
SIZE = 30
LABELS = ("fits", "wrong", "cannot_tell")
SCHEMA = {
    "type": "object",
    "properties": {"labels": {"type": "array", "items": {"type": "object", "properties": {
        "key": {"type": "string"}, "label": {"type": "string", "enum": list(LABELS)}, "why": {"type": "string"}}, "required": ["key", "label", "why"]}}},
    "required": ["labels"],
}

def shown_glosses(db_url):
    sql = (
        "select coalesce(json_agg(t), '[]') from (select distinct root_form, root_gloss, root_gloss_form from ("
        "select root_form, root_gloss, root_gloss_form, confidence, root_confidence, root_gloss_confidence from graph.node_words where lang = 'ar' "
        "union all select root_form, root_gloss, root_gloss_form, confidence, root_confidence, root_gloss_confidence from graph.nsm_exponents where lang = 'ar') r "
        "where confidence >= 0.5 and root_confidence >= 0.5 and root_gloss_confidence >= 0.5) t"
    )
    out = subprocess.run(["psql", db_url, "-At", "-c", sql], capture_output=True, text=True, check=True).stdout
    return json.loads(out.strip() or "[]")

def draw(rows, size=SIZE, seed=SEED):
    derived = sorted([r for r in rows if r["root_gloss_form"]], key=lambda r: r["root_form"])
    base = sorted([r for r in rows if not r["root_gloss_form"]], key=lambda r: r["root_form"])
    rng = random.Random(seed)
    rng.shuffle(base)
    picked = derived[: size // 2] + base[: size - min(len(derived), size // 2)]
    return [dict(r, key=f"g{i + 1}") for i, r in enumerate(picked)]

def prompt_for(batch):
    parts = [
        "Each item is an Arabic root and a short English meaning a program took from the Wiktionary gloss of one verb built on it.",
        "fits: the meaning gives a sense the root carries, as a dictionary of roots would state it.",
        "wrong: the meaning belongs to another root, or misstates what the root means.",
        "cannot_tell: you cannot decide.",
        "A meaning taken from a derived form (Form II to X) may add a causative, reciprocal or similar sense; judge whether it fits the root with that form named.",
    ]
    for r in batch:
        form = f" (from the Form {r['root_gloss_form']} verb)" if r["root_gloss_form"] else " (from the Form I verb)"
        parts.append(f"key {r['key']}: root {r['root_form']}, meaning \"{r['root_gloss']}\"{form}")
    return "\n".join(parts)

def label(rows, model):
    batches = [rows[i:i + 10] for i in range(0, len(rows), 10)]
    def one(b):
        text = roots_label.cached_ask(prompt_for(b), model, schema=SCHEMA)
        return {x["key"]: x["label"] for x in json.loads(text).get("labels", [])}
    out = {}
    with ThreadPoolExecutor(3) as ex:
        for part in ex.map(one, batches):
            out.update(part)
    return out

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", node_words.DEFAULT_DB_URL))
    ap.add_argument("--models", default="sonnet,opus")
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args(argv)
    rows = draw(shown_glosses(a.db_url))
    models = [roots_label.resolve(m) for m in a.models.split(",")]
    labels = {m: label(rows, m) for m in models}
    with open(a.out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["key", "root_form", "root_gloss", "form"] + models + ["both_fit"])
        for r in rows:
            got = [labels[m].get(r["key"], "") for m in models]
            w.writerow([r["key"], r["root_form"], r["root_gloss"], r["root_gloss_form"] or "I"] + got + ["yes" if all(g == "fits" for g in got) else "no"])
    fit = {m: sum(1 for r in rows if labels[m].get(r["key"]) == "fits") for m in models}
    both = sum(1 for r in rows if all(labels[m].get(r["key"]) == "fits" for m in models))
    derived = [r for r in rows if r["root_gloss_form"]]
    print(json.dumps({"sample": len(rows), "derived": len(derived), "fits_by_model": fit, "both_fit": both,
                      "both_fit_derived": sum(1 for r in derived if all(labels[m].get(r["key"]) == "fits" for m in models))}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
