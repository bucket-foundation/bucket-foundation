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
BRONZE = os.path.join(REPO_ROOT, "_intake", "cjkvi-ids")
BABELSTONE = os.path.join(BRONZE, "babelstone-IDS.TXT")
UNIHAN = os.path.join(BRONZE, "unihan", "Unihan_Readings.txt")
SOURCE = "BabelStone IDS, Andrew West, IDS.TXT 2025-06-27"
DECOMPOSITION_LICENSE = "none claimed: BabelStone IDS waives copyright and asks no attribution"
LICENSES = {"wiktionary-zh": "CC BY-SA 4.0", "wiktionary-ja": "CC BY-SA 4.0", "unihan": "Unicode-3.0"}
AGREE = 0.9
UNCHECKED = 0.6
IDC = set(chr(c) for c in range(0x2FF0, 0x2FFC)) | set("⿼⿽⿾⿿㇯")
CJK_RE = re.compile(r"^[㐀-鿿豈-﫿\U00020000-\U0003134f]+$")
VARIANT = {
    "𥫗": "竹", "⺮": "竹", "訁": "言", "讠": "言", "扌": "手", "龵": "手", "氵": "水", "氺": "水", "亻": "人", "⺅": "人", "𠆢": "人",
    "忄": "心", "⺗": "心", "灬": "火", "艹": "艸", "⺿": "艸", "⻌": "辵", "⻍": "辵", "辶": "辵", "⺆": "冂", "犭": "犬", "礻": "示",
    "衤": "衣", "钅": "金", "釒": "金", "饣": "食", "飠": "食", "纟": "糸", "糹": "糸", "⺼": "月", "⺝": "月", "罒": "网", "⺲": "网",
    "刂": "刀", "⺈": "刀", "⺊": "卜", "㇒": "丿", "⺌": "小", "⺍": "小", "𡭔": "小", "⻊": "足", "𧾷": "足", "⺧": "牛", "牜": "牛",
    "⺩": "玉", "阝": "阜", "⻖": "阜", "⻏": "邑", "爫": "爪", "⺤": "爪", "⺁": "厂", "⺄": "乙", "乚": "乙", "⺀": "八", "丷": "八",
}

def clean_ids(seq):
    s = re.sub(r"\$?\([^)]*\)$", "", seq.strip()).strip("^$")
    return re.sub(r"\[[^\]]*\]", "", s)

def load_babelstone(path=BABELSTONE):
    out = {}
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            if line.startswith("#"):
                continue
            p = line.rstrip("\r\n").split("\t")
            if len(p) >= 3 and p[1]:
                out[p[1]] = clean_ids(p[2])
    return out

def components(char, ids):
    if not ids:
        return []
    return [c for c in ids if c not in IDC and c != char and c not in "{}0123456789" and not ("①" <= c <= "⓿")]

def normalized(parts):
    return sorted(VARIANT.get(c, c) for c in parts)

def load_unihan(path=UNIHAN):
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("U+") and "\tkDefinition\t" in line:
                code, _k, text = line.rstrip("\n").split("\t", 2)
                out[chr(int(code[2:], 16))] = text
    return out

def meaning(db, unihan, comp):
    for lang, name in (("zh", "wiktionary-zh"), ("ja", "wiktionary-ja")):
        g = ((db.entry(lang, comp) or {}).get("gloss") or "").strip()
        if g and not node_words.is_form_gloss(g):
            return g, name
    if comp in unihan:
        return unihan[comp], "unihan"
    return None, None

def rows_for(chars, bs, db, unihan, run_id):
    out = []
    for ch in sorted(chars):
        ids = bs.get(ch)
        parts = components(ch, ids)
        if not parts:
            continue
        wik = [r["root_form"] for r in db.word_roots("zh", ch) if r["kind"] == "component"]
        agrees = (normalized(parts) == normalized(wik)) if wik else None
        conf = AGREE if agrees else UNCHECKED
        for i, comp in enumerate(parts, start=1):
            text, src = meaning(db, unihan, comp)
            out.append({
                "char": ch, "ord": i, "component": comp, "meaning": text, "meaning_source": src, "ids": ids, "source": SOURCE,
                "confidence": conf, "agrees_with_wiktionary": agrees, "decomposition_license": DECOMPOSITION_LICENSE,
                "meaning_license": LICENSES.get(src), "run_id": run_id, "wiktionary": bool(wik),
            })
    return out

def shown_chars(db_url):
    sql = ("select coalesce(json_agg(t), '[]'::json) from (select 'nw' as tbl, word, confidence from graph.node_words where lang in ('zh','ja') "
           "union all select 'nsm', word, confidence from graph.nsm_exponents where lang in ('zh','ja')) t")
    out = subprocess.run(["psql", db_url, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], check=True, capture_output=True, text=True).stdout
    return json.loads(out.strip() or "[]")

def go_count(words, bs, db, hide_below=node_words.HIDE_BELOW):
    shown = [w for w in words if w["confidence"] >= hide_below]
    gain = {"nw": 0, "nsm": 0}
    for w in shown:
        if not CJK_RE.match(w["word"]):
            continue
        if any(components(ch, bs.get(ch)) and not [r for r in db.word_roots("zh", ch) if r["kind"] == "component"] for ch in w["word"]):
            gain[w["tbl"]] += 1
    return len(shown), gain

COLUMNS = ["char", "ord", "component", "meaning", "meaning_source", "ids", "source", "confidence", "agrees_with_wiktionary", "decomposition_license", "meaning_license", "run_id"]

def lit(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

def build_sql(rows):
    out = ["\\set ON_ERROR_STOP 1", "begin;", "delete from graph.han_components;"]
    for r in rows:
        out.append("insert into graph.han_components (" + ", ".join(COLUMNS) + ") values (" + ", ".join(lit(r[c]) for c in COLUMNS) + ");")
    out.append("commit;")
    return "\n".join(out) + "\n"

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--roots", default=node_words.ROOTS_DB)
    ap.add_argument("--ids", default=BABELSTONE)
    ap.add_argument("--unihan", default=UNIHAN)
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", node_words.DEFAULT_DB_URL))
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args(argv)
    if not os.path.exists(a.ids):
        raise SystemExit(f"no BabelStone IDS.TXT at {a.ids}")
    db = node_words.Roots(a.roots)
    bs = load_babelstone(a.ids)
    unihan = load_unihan(a.unihan)
    words = shown_chars(a.db_url)
    chars = {ch for w in words if CJK_RE.match(w["word"]) for ch in w["word"]}
    run_id = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    rows = rows_for(chars, bs, db, unihan, run_id)
    shown, gain = go_count(words, bs, db)
    per_char = {}
    for r in rows:
        per_char[r["char"]] = r
    bands = {"0.9 agrees": sum(1 for r in per_char.values() if r["agrees_with_wiktionary"] is True),
             "0.6 disagrees": sum(1 for r in per_char.values() if r["agrees_with_wiktionary"] is False),
             "0.6 unchecked": sum(1 for r in per_char.values() if r["agrees_with_wiktionary"] is None)}
    print(f"characters {len(chars)} decomposed {len(per_char)} component rows {len(rows)}")
    print("characters by band", json.dumps(bands))
    print("meanings", json.dumps({k: sum(1 for r in rows if r["meaning_source"] == k) for k in ("wiktionary-zh", "wiktionary-ja", "unihan", None)}))
    print(f"go: shown zh and ja rows {shown}, gaining {json.dumps(gain)}, {100 * sum(gain.values()) / max(shown, 1):.1f}%")
    if a.apply:
        subprocess.run(["psql", a.db_url, "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"], input=build_sql(rows), text=True, check=True)
        print("written", run_id)
    else:
        print("dry run, pass --apply to write")
    return 0

if __name__ == "__main__":
    sys.exit(main())
