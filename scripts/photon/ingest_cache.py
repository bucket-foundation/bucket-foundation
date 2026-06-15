#!/usr/bin/env python3
"""
ingest_cache.py — rebuild index.sqlite from the raw Kaikki cache with CLEAN,
sense-aware glosses (the data-quality fix for the Polingual word explorer).

WHY THIS EXISTS
---------------
The first-pass index.sqlite was built from a lossy bulk extract: `meaning_en`
was a ` · `-joined blob of ALL senses, the primary sense was not distinguished,
core English vocabulary (light, water, …) was missing, and Kaikki's structured
`senses[]`/`translations[]` were discarded. Embedding that blob blurs the
cross-lingual centroid, which is exactly why looking up English "light" returned
the Portuguese dietary loanword and a low-fat / light-weight / soft-drink mix.

This script re-derives the photon subset DIRECTLY from `kaikki-cache/*.jsonl`,
keeping:
  - `meaning_en`  = the PRIMARY sense's gloss (first sense, lightly cleaned),
                    NOT the joined blob. This is what gets LaBSE-embedded.
  - `payload.senses`        = up to N structured senses (gloss + tags + pos),
                              so the client/lookup can group + label by sense.
  - `payload.translations`  = Kaikki `translations[]` (lang/code/word/sense),
                              the explicit cross-lingual truth.
  - guaranteed CORE vocabulary per language (Swadesh-ish seed list) so the
    common words a learner actually types are always present and correct.

Selection per language = a commonness signal. Two ingredients, combined:
  1. word-frequency (the everyday-word signal). `wordfreq` (MIT, 24 of our 27
     langs incl. all Academy langs) gives a Zipf score in [0,8]: gold=5.2,
     entropy=3.3, gene=4.4 vs quux=0.0. This is the DOMINANT term, because it
     is the only signal that doesn't depend on Kaikki's spotty structured data.
  2. a Kaikki-structure proxy: (#translations across senses + top-level) +
     3*(#senses). Common words carry many senses and many translation edges.
Combined: score = 18*zipf + n_trans + 3*n_senses + core_bonus + short_bonus.

WHY zipf was added (2026-06-15, bead "expand to ~200k common words"): the live
45k slice MISSED everyday words — gold/iron/energy/gene/planet/ocean. Root
cause: this dump stores translations UNDER each sense (`senses[].translations`),
not at the top-level `entry.translations` the old proxy read, so gold scored
n_trans=0 → rank 4066, entropy 12290, gene 54227. We now (a) count sense-level
translations too, and (b) weight by real corpus frequency. wordfreq is OPTIONAL:
if unavailable the zipf term is 0 and we fall back to the structure proxy.
For the 3 langs without wordfreq (la/sa/th — classical/low-resource) the proxy
alone is used, which is appropriate (Latin/Sanskrit have no everyday corpus).

Output: a FRESH index.sqlite with the SAME schema the rest of the backbone
reads (query.py / semantic_build.py / build_subset.py), plus the richer payload.
Idempotent: rebuilds deterministically from the cache; writes to a temp DB then
atomically swaps so a half-run never corrupts the live index.

Source: Wiktionary via Kaikki (CC-BY-SA 4.0). Short glosses only; canonical
URLs back to en.wiktionary.org. No long copyrighted text stored.

Run:  python3 scripts/photon/ingest_cache.py                 # all langs, default caps
      python3 scripts/photon/ingest_cache.py --per-lang 1500 --en 3000
      python3 scripts/photon/ingest_cache.py --langs en,es,fr,de --per-lang 800
"""
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

# --- word-frequency coreness signal (optional; the everyday-word ranker) ----
# wordfreq (MIT) ships Zipf-scale corpus frequencies for 40+ langs. It is the
# single most reliable "is this an everyday word" signal and does not depend on
# Kaikki's inconsistent structured fields. If it's not installed, ZIPF_OK=False
# and the score falls back to the translations+senses structure proxy.
try:
    from wordfreq import zipf_frequency as _zipf  # type: ignore
    from wordfreq import available_languages as _wf_langs  # type: ignore
    _WF_AVAIL = set(_wf_langs().keys())
    ZIPF_OK = True
except Exception:  # pragma: no cover - graceful degrade
    _zipf = None
    _WF_AVAIL = set()
    ZIPF_OK = False

# weight on the Zipf term. Zipf is [0,8]; ×18 puts a Zipf-5 everyday word
# (gold/water/light ~ 90 pts) on par with a 60-translation Kaikki headword,
# and well above obscure forms. Tuned so gold/entropy/iron/gene clear typical
# per-lang caps while genuine junk (Zipf 0) stays out.
ZIPF_WEIGHT = 18.0


def zipf_score(surface: str, code: str) -> float:
    """Corpus Zipf frequency for (surface, lang), or 0.0 if unavailable.

    Falls back to 0 for langs wordfreq doesn't cover (la/sa/th) and when the
    library isn't installed — the structure proxy still ranks those langs.
    """
    if not ZIPF_OK or code not in _WF_AVAIL:
        return 0.0
    try:
        return float(_zipf(surface, code))
    except Exception:
        return 0.0

# kaikki lang_code -> (cache filename, source_uri lang slug)
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

# A compact universal-core seed (Swadesh / Leipzig-Jakarta flavored). These are
# the words a learner is most likely to type into the explorer; we hard-include
# their entries (when present) so the headword is always the right, core word.
# Given in ENGLISH; for non-English langs we still rely on the commonness proxy
# (their own high-translation words bubble up), but the English core guarantees
# light/water/love/free/etc. exist with the correct primary sense.
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
    # drop trailing wiki cruft sometimes left in glosses
    g = g.strip(" .;").strip()
    if len(g) > max_chars:
        g = g[:max_chars].rstrip() + "…"
    return g


def primary_sense(senses):
    """Return (gloss, tags, all_clean_senses) — primary sense first.

    Kaikki orders senses with the core/most-common sense first. We skip pure
    form-of / inflection / obsolete senses when picking the PRIMARY so the
    headword is the real word, not "ablative singular of …".
    """
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
    """Yield every translations[] list in the entry.

    Kaikki dumps are inconsistent: some put translations at the TOP level
    (`entry.translations`), others (this English dump) nest them under each
    sense (`entry.senses[].translations`). Reading only the top level made the
    old ranker blind to a word's true cross-lingual weight (gold scored 0).
    """
    top = entry.get("translations")
    if top:
        yield top
    for s in entry.get("senses", []) or []:
        st = s.get("translations")
        if st:
            yield st


def extract_translations(entry, cap=60):
    """Merge translations from BOTH the top level and every sense, deduped by
    (code, word). The dedup makes `n_trans` a faithful count of distinct
    cross-lingual targets regardless of where the dump stored them."""
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


# POS priority for the DOMINANT sense of an ambiguous concrete word. Nouns name
# the thing ("light" = illumination); we prefer them as the headword sense over
# adjective/adverb readings ("light" = not heavy). Translation count is the
# strongest signal (the illumination noun has 170, the adj has ~0), POS priority
# is the tie-breaker.
POS_PRIORITY = {
    "noun": 5, "verb": 4, "name": 3, "adj": 2, "num": 2, "pron": 2,
    "adv": 1, "prep": 1, "conj": 1, "det": 1, "phrase": 1, "intj": 1,
    "particle": 1, "article": 1,
}


def merge_surface(agg, surface, pos, d, core_set, is_en):
    """Accumulate one POS entry for a surface into the per-surface aggregate.

    Keeps every POS entry's senses (so the explorer can group/label by sense),
    and tracks which POS entry is DOMINANT (most translations, then POS
    priority) — its primary sense becomes the headword `meaning_en`.
    """
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
    """Pick the dominant POS entry as headword; merge all senses + translations."""
    entries = a["entries"]
    # dominant = (most translations, then POS priority, then most senses)
    dom = max(entries, key=lambda e: (
        len(e["translations"]), POS_PRIORITY.get(e["pos"], 0), len(e["senses"])))
    # merge senses across POS, dominant first, dedup by gloss prefix
    seen_g, merged_senses = set(), []
    for e in [dom] + [x for x in entries if x is not dom]:
        for s in e["senses"]:
            key = s["gloss"][:60].lower()
            if key in seen_g:
                continue
            seen_g.add(key)
            merged_senses.append({"gloss": s["gloss"], "tags": s["tags"], "pos": e["pos"]})
    # union of translations (dominant entry's first), dedup by (code, word)
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
    # everyday-word signal (dominant): real corpus frequency.
    z = zipf_score(rec["surface"], code)
    sc = ZIPF_WEIGHT * z
    # Kaikki-structure proxy (now counts sense-level translations too).
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
    """Ingest one language. `pin_surfaces` = surfaces to HARD-INCLUDE for this
    language (the translation targets of core English words, so cross-lingual
    demos always have real targets like Licht/lumière/luce to land on)."""
    pin_surfaces = pin_surfaces or set()
    fn, slug = LANGS[code]
    path = os.path.join(CACHE_DIR, fn)
    if not os.path.exists(path):
        print(f"[ingest] {code}: cache file missing ({fn}) — skip", flush=True)
        return [], {}
    source_uri = (f"https://kaikki.org/dictionary/{slug}/"
                  f"kaikki.org-dictionary-{slug}.jsonl")
    is_en = (code == "en")
    agg = {}  # surface -> aggregate of POS entries
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
            r["_score"] += 500000  # hard-include core-translation targets
    records.sort(key=lambda r: -r["_score"])
    kept = records[:per_lang]
    # harvest translation targets of CORE_EN words (only meaningful for English)
    core_targets = {}  # code -> set(surface)
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
    # Defaults sized for the ~200k common-word interim index (2026-06-15).
    # 20k EN + 26×~7k other + classical bump ≈ 200k after small-lang shortfall.
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

    # Pass 1: English first, so we can harvest the translation targets of the
    # CORE words (Licht/lumière/luce/φως …) and hard-include them in every other
    # language — guaranteeing the cross-lingual demos land on real targets.
    all_records = []
    pins = {}  # lang code -> set(surface)
    if "en" in langs:
        kept, core_targets = ingest_lang("en", args.en, core_set)
        all_records.extend(("en", r) for r in kept)
        pins = core_targets

    # Pass 2: the rest, with pins applied.
    for code in langs:
        if code == "en":
            continue
        cap = args.big if code in ("la", "sa") else args.per_lang
        kept, _ = ingest_lang(code, cap, core_set, pin_surfaces=pins.get(code, set()))
        all_records.extend((code, r) for r in kept)

    # Resolve symlink so we write THROUGH it to the real (gitignored) file,
    # never clobbering the link itself.
    real_db = os.path.realpath(DB_PATH)
    tmp = real_db + ".tmp"
    n = build_db(all_records, tmp)
    # atomic swap
    os.replace(tmp, real_db)
    for ext in ("-wal", "-shm"):
        if os.path.exists(tmp + ext):
            os.replace(tmp + ext, real_db + ext)
    print(f"\n[ingest] wrote {n} photons -> {real_db}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
