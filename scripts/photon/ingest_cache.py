#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata

sys.path.insert(0, os.path.dirname(__file__))
from common import PHOTONS_DIR, DB_PATH  # noqa: E402

CACHE_DIR = os.path.join(PHOTONS_DIR, "kaikki-cache")

try:
    from wordfreq import zipf_frequency as _zipf  # type: ignore
    from wordfreq import available_languages as _wf_langs  # type: ignore
    _WF_AVAIL = set(_wf_langs().keys())
    ZIPF_OK = True
except Exception:  # pragma: no cover - graceful degrade
    _zipf = None
    _WF_AVAIL = set()
    ZIPF_OK = False

ZIPF_WEIGHT = 18.0

def zipf_score(surface: str, code: str) -> float:
    if not ZIPF_OK or code not in _WF_AVAIL:
        return 0.0
    try:
        return float(_zipf(surface, code))
    except Exception:
        return 0.0

LANGS = {
    "en": ("English.jsonl", "English"),
    "la": ("Latin.jsonl", "Latin"),
    "sa": ("Sanskrit.jsonl", "Sanskrit"),
    "ar": ("Arabic.jsonl", "Arabic"),
    "cs": ("Czech.jsonl", "Czech"),
    "de": ("German.jsonl", "German"),
    "el": ("Greek.jsonl", "Greek"),
    "es": ("Spanish.jsonl", "Spanish"),
    "fa": ("Persian.jsonl", "Persian"),
    "fi": ("Finnish.jsonl", "Finnish"),
    "fr": ("French.jsonl", "French"),
    "he": ("Hebrew.jsonl", "Hebrew"),
    "hi": ("Hindi.jsonl", "Hindi"),
    "id": ("Indonesian.jsonl", "Indonesian"),
    "it": ("Italian.jsonl", "Italian"),
    "ja": ("Japanese.jsonl", "Japanese"),
    "ko": ("Korean.jsonl", "Korean"),
    "nl": ("Dutch.jsonl", "Dutch"),
    "pl": ("Polish.jsonl", "Polish"),
    "pt": ("Portuguese.jsonl", "Portuguese"),
    "ru": ("Russian.jsonl", "Russian"),
    "sv": ("Swedish.jsonl", "Swedish"),
    "ta": ("Tamil.jsonl", "Tamil"),
    "th": ("Thai.jsonl", "Thai"),
    "tr": ("Turkish.jsonl", "Turkish"),
    "vi": ("Vietnamese.jsonl", "Vietnamese"),
    "zh": ("Chinese.jsonl", "Chinese"),
}

CORE_EN = """
water fire light dark sun moon star sky earth land sea river mountain stone sand
tree leaf root flower grass seed fruit wood
man woman child person people friend family mother father son daughter
head eye ear nose mouth tooth tongue hand foot arm leg heart blood bone skin hair
animal bird fish dog cat horse cow snake
love hate fear hope joy anger peace mind soul life death dream
eat drink sleep walk run come go see hear speak say know think feel give take
make do work play sing dance read write
big small long short high low good bad new old hot cold warm full empty
free open close near far heavy light fast slow soft hard
one two three four five six seven eight nine ten hundred thousand
day night year time hour morning evening today tomorrow yesterday
yes no not all many few more less here there now then
i you he she we they who what where when why how
red green blue yellow white black
food bread milk salt water meat egg
house door window road city country king god book word name number
time word light water free love
""".split()

POS_KEEP = {
    "noun", "verb", "adj", "adv", "name", "num", "pron", "prep", "conj",
    "det", "phrase", "intj", "particle", "article",
}

_CTRL = re.compile(r"[\x00-\x1f\x7f]")
_WS = re.compile(r"\s+")

def clean_gloss(g: str, max_chars: int = 240) -> str:
    if not g:
        return ""
    g = unicodedata.normalize("NFC", g)
    g = _CTRL.sub(" ", g)
    g = _WS.sub(" ", g).strip()
    g = g.strip(" .;").strip()
    if len(g) > max_chars:
        g = g[:max_chars].rstrip() + "…"
    return g

def primary_sense(senses):
    cleaned = []
    for s in senses:
        gl = s.get("glosses") or s.get("raw_glosses") or []
        if not gl:
            continue
        g = clean_gloss(gl[0])
        if not g:
            continue
        tags = s.get("tags") or []
        cleaned.append({"gloss": g, "tags": tags})
    if not cleaned:
        return "", [], []

    def is_formish(c):
        t = set(x.lower() for x in c["tags"])
        if t & {"form-of", "inflection", "alt-of", "obsolete", "archaic"}:
            return True
        gl = c["gloss"].lower()
        return gl.startswith(("inflection of", "alternative", "form of",
                              "ablative", "genitive", "dative", "accusative",
                              "nominative", "plural of", "feminine of",
                              "past tense", "past participle", "present participle"))

    real = [c for c in cleaned if not is_formish(c)]
    primary = real[0] if real else cleaned[0]
    return primary["gloss"], primary["tags"], cleaned

def pick_ipa(entry):
    for s in entry.get("sounds", []) or []:
        ipa = s.get("ipa")
        if ipa:
            return ipa.strip()
    return ""

def _iter_translation_blocks(entry):
    top = entry.get("translations")
    if top:
        yield top
    for s in entry.get("senses", []) or []:
        st = s.get("translations")
        if st:
            yield st

def extract_translations(entry, cap=60):
    out = []
    seen = set()
    for block in _iter_translation_blocks(entry):
        for t in block:
            w = t.get("word")
            code = t.get("code") or t.get("lang_code")
            if not w or not code:
                continue
            key = (code, w)
            if key in seen:
                continue
            seen.add(key)
            out.append({
                "code": code,
                "lang": t.get("lang") or code,
                "word": w,
                "sense": t.get("sense") or "",
                "roman": t.get("roman") or "",
            })
            if len(out) >= cap:
                return out
    return out

POS_PRIORITY = {
    "noun": 5, "verb": 4, "name": 3, "adj": 2, "num": 2, "pron": 2,
    "adv": 1, "prep": 1, "conj": 1, "det": 1, "phrase": 1, "intj": 1,
    "particle": 1, "article": 1,
}

def merge_surface(agg, surface, pos, d, core_set, is_en):
    gloss, tags, senses_clean = primary_sense(d.get("senses", []))
    if not gloss:
        return
    trans = extract_translations(d)
    entry = {
        "pos": pos, "gloss": gloss, "tags": tags,
        "ipa": pick_ipa(d), "senses": senses_clean, "translations": trans,
    }
    a = agg.get(surface)
    if a is None:
        a = {"surface": surface, "entries": [], "core": is_en and surface in core_set}
        agg[surface] = a
    a["entries"].append(entry)

def finalize_surface(a, source_uri):
    entries = a["entries"]
    dom = max(entries, key=lambda e: (
        len(e["translations"]), POS_PRIORITY.get(e["pos"], 0), len(e["senses"])))
    seen_g, merged_senses = set(), []
    for e in [dom] + [x for x in entries if x is not dom]:
        for s in e["senses"]:
            key = s["gloss"][:60].lower()
            if key in seen_g:
                continue
            seen_g.add(key)
            merged_senses.append({"gloss": s["gloss"], "tags": s["tags"], "pos": e["pos"]})
    seen_t, merged_tr = set(), []
    for e in [dom] + [x for x in entries if x is not dom]:
        for t in e["translations"]:
            k = (t["code"], t["word"])
            if k in seen_t:
                continue
            seen_t.add(k)
            merged_tr.append(t)
    surface = a["surface"]
    return {
        "surface": surface,
        "pos": dom["pos"],
        "meaning_en": dom["gloss"],
        "tags": dom["tags"],
        "ipa": dom["ipa"],
        "senses": merged_senses[:10],
        "translations": merged_tr[:60],
        "n_trans": len(merged_tr),
        "source_uri": source_uri,
        "wiktionary": f"https://en.wiktionary.org/wiki/{surface}",
    }

def rank_score(rec, core, code):
    z = zipf_score(rec["surface"], code)
    sc = ZIPF_WEIGHT * z
    sc += rec["n_trans"] + 3 * len(rec["senses"])
    if core:
        sc += 100000
    if 1 <= len(rec["surface"]) <= 12:
        sc += 5
    if " " in rec["surface"]:
        sc -= 10
    rec["_zipf"] = round(z, 2)
    return sc

def ingest_lang(code, per_lang, core_set, pin_surfaces=None):
    pin_surfaces = pin_surfaces or set()
    fn, slug = LANGS[code]
    path = os.path.join(CACHE_DIR, fn)
    if not os.path.exists(path):
        print(f"[ingest] {code}: cache file missing ({fn}) — skip", flush=True)
        return [], {}
    source_uri = (f"https://kaikki.org/dictionary/{slug}/"
                  f"kaikki.org-dictionary-{slug}.jsonl")
    is_en = (code == "en")
    agg = {}
    seen = 0
    t0 = time.time()
    with open(path, encoding="utf-8") as f:
        for line in f:
            seen += 1
            if '"senses"' not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get("lang_code") and d["lang_code"] != code:
                continue
            surface = d.get("word")
            pos = d.get("pos")
            if not surface or pos not in POS_KEEP:
                continue
            merge_surface(agg, surface, pos, d, core_set, is_en)
    records = [finalize_surface(a, source_uri) for a in agg.values() if a["entries"]]
    for r in records:
        pinned = r["surface"] in pin_surfaces
        r["_score"] = rank_score(r, is_en and r["surface"] in core_set, code)
        if pinned:
            r["_score"] += 500000
    records.sort(key=lambda r: -r["_score"])
    kept = records[:per_lang]
    core_targets = {}
    if is_en:
        for r in kept:
            if r["surface"] in core_set:
                for t in r["translations"]:
                    core_targets.setdefault(t["code"], set()).add(t["word"])
    dt = time.time() - t0
    ncore = sum(1 for r in kept if r["surface"] in core_set) if is_en else 0
    npin = sum(1 for r in kept if r["surface"] in pin_surfaces)
    print(f"[ingest] {code}: scanned {seen} lines, {len(agg)} surfaces, "
          f"kept {len(kept)} (core={ncore} pinned={npin}) in {dt:.1f}s", flush=True)
    return kept, core_targets

def build_db(records, db_path):
    import sqlite3
    if os.path.exists(db_path):
        os.remove(db_path)
    for ext in ("-wal", "-shm"):
        if os.path.exists(db_path + ext):
            os.remove(db_path + ext)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
 CREATE TABLE photons (
 id TEXT PRIMARY KEY,
 kind TEXT, lang TEXT, surface TEXT,
 meaning_en TEXT, tier TEXT, branch_csv TEXT,
 pos TEXT, ipa TEXT,
 semantic_row INTEGER, phonetic_row INTEGER,
 provenance_source TEXT, provenance_uri TEXT,
 captured_at TEXT, payload TEXT
 )
    """)
    captured = time.strftime("%Y-%m-%dT%H:%M:%S")
    rows = []
    for code, rec in records:
        pid = f"photon:word:{code}:{rec['surface']}"
        payload = {
            "id": pid, "kind": "word", "lang": code, "surface": rec["surface"],
            "meaning_en": rec["meaning_en"], "tier": "functional",
            "branch": ["10-linguistics"], "pos": rec["pos"], "ipa": rec["ipa"],
            "tags": rec["tags"],
            "senses": rec["senses"],
            "translations": rec["translations"],
            "provenance": {
                "source": "kaikki",
                "source_uri": rec["source_uri"],
                "wiktionary": rec["wiktionary"],
                "license": "CC-BY-SA 4.0",
                "captured_at": captured,
            },
            "relations": [],
            "coreness": {
                "zipf": rec.get("_zipf", 0.0),
                "n_trans": rec.get("n_trans", 0),
                "n_senses": len(rec.get("senses", [])),
                "score": rec.get("_score", 0),
            },
        }
        rows.append((
            pid, "word", code, rec["surface"], rec["meaning_en"], "functional",
            "10-linguistics", rec["pos"], rec["ipa"], None, None,
            "kaikki", rec["source_uri"], captured,
            json.dumps(payload, ensure_ascii=False),
        ))
    conn.executemany(
        "INSERT OR REPLACE INTO photons (id,kind,lang,surface,meaning_en,tier,"
        "branch_csv,pos,ipa,semantic_row,phonetic_row,provenance_source,"
        "provenance_uri,captured_at,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        rows,
    )
    conn.execute("CREATE INDEX idx_lang_surface ON photons(lang,surface)")
    conn.execute("CREATE INDEX idx_surface ON photons(surface)")
    conn.commit()
    n = conn.execute("SELECT COUNT(*) FROM photons").fetchone()[0]
    conn.close()
    return n

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-lang", type=int, default=7000)
    ap.add_argument("--en", type=int, default=20000)
    ap.add_argument("--big", type=int, default=8000,
                    help="cap for la/sa (classical langs Bucket favors)")
    ap.add_argument("--langs", default="",
                    help="comma list to restrict (default: all in LANGS)")
    args = ap.parse_args()

    if ZIPF_OK:
        print(f"[ingest] wordfreq ACTIVE — Zipf coreness on "
              f"{len(_WF_AVAIL)} langs (weight {ZIPF_WEIGHT})", flush=True)
    else:
        print("[ingest] wordfreq NOT installed — falling back to "
              "translations+senses proxy only (pip install wordfreq)", flush=True)

    core_set = set(CORE_EN)
    langs = args.langs.split(",") if args.langs else list(LANGS.keys())
    langs = [l for l in langs if l in LANGS]

    all_records = []
    pins = {}
    if "en" in langs:
        kept, core_targets = ingest_lang("en", args.en, core_set)
        all_records.extend(("en", r) for r in kept)
        pins = core_targets

    for code in langs:
        if code == "en":
            continue
        cap = args.big if code in ("la", "sa") else args.per_lang
        kept, _ = ingest_lang(code, cap, core_set, pin_surfaces=pins.get(code, set()))
        all_records.extend((code, r) for r in kept)

    real_db = os.path.realpath(DB_PATH)
    tmp = real_db + ".tmp"
    n = build_db(all_records, tmp)
    os.replace(tmp, real_db)
    for ext in ("-wal", "-shm"):
        if os.path.exists(tmp + ext):
            os.replace(tmp + ext, real_db + ext)
    print(f"\n[ingest] wrote {n} photons -> {real_db}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
