#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import node_words  # noqa: E402
import roots_sample  # noqa: E402

REPO_ROOT = node_words.REPO_ROOT
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ingest", "out", "roots-label-cache")
LABELS = ("correct", "wrong_homograph", "wrong_gloss", "cannot_tell")
BATCH = 10
SCHEMA = {
    "type": "object",
    "properties": {"labels": {"type": "array", "items": {"type": "object", "properties": {
        "key": {"type": "string"}, "label": {"type": "string", "enum": list(LABELS)}, "why": {"type": "string"}}, "required": ["key", "label", "why"]}}},
    "required": ["labels"],
}

def ask(prompt, model, timeout=300, schema=None):
    env = dict(os.environ)
    env.pop("ANTHROPIC_API_KEY", None)
    argv = ["claude", "-p", prompt, "--model", model, "--setting-sources", "", "--output-format", "json", "--json-schema", json.dumps(schema or SCHEMA),
            "--tools", "", "--no-session-persistence", "--strict-mcp-config"]
    r = subprocess.run(argv, env=env, capture_output=True, text=True, timeout=timeout)
    env_out = json.loads(r.stdout or "{}")
    if r.returncode != 0 or env_out.get("is_error"):
        raise RuntimeError(f"claude -p exited {r.returncode}: {(r.stderr or r.stdout)[:200]}")
    usage = env_out.get("modelUsage") or {}
    model_id = max(usage.items(), key=lambda kv: (kv[1] or {}).get("outputTokens", 0))[0] if usage else model
    text = json.dumps(env_out["structured_output"]) if env_out.get("structured_output") else str(env_out.get("result") or "")
    return text, model_id

def resolve(alias):
    _t, model_id = ask("Reply with the JSON {\"labels\": []}.", alias, 120)
    if alias not in model_id:
        raise SystemExit(f"alias {alias} resolved to {model_id}; refusing to label under the wrong model")
    return model_id

def evidence(db, row):
    lines = []
    for e in db.db.execute("select pos, ety, gloss, senses from word where lang = ? and word = ? order by ety, pos", (row["lang"], row["word"])):
        lines.append(f"entry ety {e['ety']} {e['pos']}: {(e['gloss'] or '')[:120]} | senses: {(e['senses'] or '')[:200]}")
    for s in db.db.execute("select ety, rel, anc_lang, anc_form, anc_gloss from etym where lang = ? and word = ? order by ety, ord limit 12", (row["lang"], row["word"])):
        lines.append(f"etymology ety {s['ety']}: {s['rel']} {s['anc_lang']} {s['anc_form']} \"{s['anc_gloss'] or ''}\"")
    return lines[:16]

def prompt_for(batch, db):
    parts = [
        "Each item is a word with the meaning it was taken in and the root a program assigned to it from Wiktionary. Judge the root.",
        "correct: the root is an ancestor or root of this word in this meaning, and the root gloss fits that root.",
        "wrong_homograph: the root belongs to another word spelled the same way, or to another etymology of it.",
        "wrong_gloss: the root is right and its gloss describes something else.",
        "cannot_tell: the evidence does not decide it.",
        "Use the Wiktionary lines given and what you know of the language. Answer one label per key.",
    ]
    for r in batch:
        parts.append("")
        parts.append(f"key {r['key']}: {node_words.LANG_ALIASES.get(r['lang'], r['lang'])} word {r['word']}{' (' + r['roman'] + ')' if r.get('roman') else ''}, meaning \"{r['sense'][:160]}\"")
        parts.append(f"assigned root: {r['root_lang']} {r['root_form']} \"{r['root_gloss']}\"")
        parts.extend("  " + x for x in evidence(db, r))
    return "\n".join(parts)

def cached_ask(prompt, model, schema=None):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, hashlib.sha256(f"{model}\n{prompt}".encode()).hexdigest()[:16] + ".json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read()
    text, got = ask(prompt, model, schema=schema)
    if got != model:
        raise RuntimeError(f"answered by {got}, expected {model}")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return text

def label_rows(rows, db, model, workers=6):
    batches = [rows[i:i + BATCH] for i in range(0, len(rows), BATCH)]
    prompts = [prompt_for(b, db) for b in batches]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        texts = list(pool.map(lambda p: cached_ask(p, model), prompts))
    out = {}
    for batch, text in zip(batches, texts):
        keys = {r["key"] for r in batch}
        for item in json.loads(text).get("labels", []):
            if item.get("key") in keys and item.get("label") in LABELS:
                out[item["key"]] = item["label"]
    return out

def kappa(a, b):
    keys = sorted(set(a) & set(b))
    n = len(keys)
    if n == 0:
        return float("nan")
    po = sum(1 for k in keys if a[k] == b[k]) / n
    pe = sum((sum(1 for k in keys if a[k] == c) / n) * (sum(1 for k in keys if b[k] == c) / n) for c in LABELS)
    return (po - pe) / (1 - pe) if pe < 1 else 1.0

def consensus(a, b, key):
    la, lb = a.get(key), b.get(key)
    if la is None or lb is None or la != lb:
        return None
    return la

def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (p, max(0.0, c - m), min(1.0, c + m))

def precision(labels):
    counted = [x for x in labels if x in LABELS and x != "cannot_tell"]
    k = sum(1 for x in counted if x == "correct")
    return k, len(counted), wilson(k, len(counted))

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", default=roots_sample.SAMPLE)
    ap.add_argument("--roots", default=node_words.ROOTS_DB)
    ap.add_argument("--out", default=os.path.join(REPO_ROOT, "learning", "research-os", "roots-v2-labels-models.csv"))
    ap.add_argument("--models", default="sonnet,haiku")
    a = ap.parse_args(argv)
    rows = roots_sample.read_csv(a.sample)
    db = node_words.Roots(a.roots)
    ids = [resolve(m) for m in a.models.split(",")]
    labs = [label_rows(rows, db, m) for m in ids]
    out = []
    for r in rows:
        out.append({"key": r["key"], "lang": r["lang"], "word": r["word"], "root_form": r["root_form"], ids[0]: labs[0].get(r["key"], ""), ids[1]: labs[1].get(r["key"], ""), "consensus": consensus(labs[0], labs[1], r["key"]) or ""})
    roots_sample.write_csv(a.out, out, ["key", "lang", "word", "root_form", ids[0], ids[1], "consensus"])
    k = kappa(labs[0], labs[1])
    agreed = [x["consensus"] for x in out if x["consensus"]]
    c, n, (p, lo, hi) = precision(agreed)
    print(f"models {ids}; labeled {len(labs[0])} and {len(labs[1])}; agree on {len(agreed)} of {len(rows)}; kappa {k:.2f}")
    print(f"provisional precision {c}/{n} = {p:.2f}, 95% {lo:.2f}..{hi:.2f}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
