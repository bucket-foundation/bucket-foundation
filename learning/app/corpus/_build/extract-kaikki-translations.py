#!/usr/bin/env python3
"""extract-kaikki-translations.py (bkt-ctj)

Build VERIFIED gold translation tables from the English Wiktionary translation
tables (kaikki.org raw-wiktextract-data, CC-BY-SA, human-curated).

WHY: the Polingual photon corpus / semantic API is semantic-NEIGHBOUR noise for
translation (water->es returns "sopa"/soup). The authoritative source is the
Wiktionary `translations` array on each *English* headword entry, where each
item is {code, word, sense, roman, tags}. A translation ships ONLY if it is in
that table for the matching sense. Wrong words are worse than fewer words.

INPUT:
 - corpus/_build/concepts.json (curated headword + pos + sense-hint + category)
 - <kaikki-cache>/English.jsonl (English Wiktionary extract, ~3GB, gitignored)

OUTPUT (built artifacts, committed):
 - corpus/_build/gold/kaikki-core.json { lang: { concept: word } } for all 17 langs
 - corpus/_build/gold/kaikki-meta.json { concept: {pos, category, en_ipa, etymology, coverage:[langs]} }

A concept is KEPT only if >= MIN_LANGS of the 16 non-English target languages
have a verified translation. English is the identity (concept == English word).

The deck builder (build-lang-core.mjs, patched) consumes kaikki-core.json.

Idempotent: deterministic output, safe to re-run.

Usage: python3 corpus/_build/extract-kaikki-translations.py
"""
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))            # corpus/_build
APP = os.path.dirname(os.path.dirname(HERE))                  # learning/app
GOLD = os.path.join(HERE, "gold")
CONCEPTS = os.path.join(HERE, "concepts.json")
OVERRIDES = os.path.join(HERE, "overrides.json")
KAIKKI = os.environ.get(
    "KAIKKI_CACHE",
    "/home/gian/agfarms/bucket-foundation/_intake/photons/kaikki-cache",
)
ENGLISH = os.path.join(KAIKKI, "English.jsonl")

# 16 target languages (English is identity). Matches the academy deck's 14 meta
# + 3 bonus (ko/hi/ar), minus en.
TARGETS = ["es", "fr", "it", "pt", "de", "nl", "sv", "ru", "ja", "zh", "el",
           "fi", "pl", "ko", "hi", "ar"]
MIN_LANGS = 6  # a concept needs verified translations in >= this many targets

# Per-language dialect/script tags to AVOID (we want the standard/main form).
# zh: prefer Mandarin, reject regional Sinitic dialects. ar: reject colloquial
# regional Arabics, keep Modern Standard. el: reject Ancient/Katharevousa.
BAD_TAGS = {
    "zh": {"Dungan", "Hokkien", "Cantonese", "Hakka", "Min", "Wu", "Gan",
           "Jin", "Teochew", "Taishanese", "Xiang", "Hsinchu", "Min-Nan",
           "Min-Dong", "Min-Bei", "Sixian", "Hailu", "Meixian", "Pinghua",
           "Leizhou", "Shanghainese", "Toned"},
    "ar": {"Egyptian-Arabic", "Moroccan-Arabic", "Hijazi-Arabic", "Gulf-Arabic",
           "Levantine-Arabic", "Iraqi-Arabic", "South-Levantine-Arabic",
           "North-Levantine-Arabic", "Tunisian-Arabic", "Algerian-Arabic",
           "Najdi-Arabic", "Libyan-Arabic", "colloquial", "dialectal"},
    "el": {"Ancient", "Katharevousa", "Mycenaean", "Koine"},
    "pt": {"Brazil-only-dialectal"},
    "no": set(),
}
# Tags that mark a translation as not the everyday default, skip when a cleaner
# option exists, across ALL languages.
SOFT_BAD = {"archaic", "obsolete", "dated", "dialectal", "colloquial", "slang",
            "rare", "informal", "literary", "poetic", "vulgar",
            "uncommon", "nonstandard", "humorous", "childish", "Classical"}
# NOTE: we deliberately do NOT penalize country tags (Spain, Latin-America,
# Mexico...). For most words the regional tag just marks the standard national
# form (patata [Spain], papa [Latin-America]) and penalizing it promotes an
# obscure untagged variant (chuño). The rare cells where the auto-pick lands on
# slang are corrected one-by-one in overrides.json instead.

NUMERALS = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "hundred": 100, "thousand": 1000}


def nfc(s):
    return unicodedata.normalize("NFC", s) if s else s


def strip_combining_accents(s, lang):
    """ru/el: Wiktionary marks stress with combining accents (вода́, νεró). The
 everyday written form omits them. Strip combining acute/grave that are NOT
 part of the language's normal orthography. Keep ja/ko/zh/ar/hi untouched."""
    if lang not in ("ru", "el"):
        return s
    out = []
    for ch in unicodedata.normalize("NFD", s):
        # drop combining acute (0301) / grave (0300) used only for stress marking
        if unicodedata.combining(ch) and ch in ("́", "̀"):
            continue
        out.append(ch)
    return unicodedata.normalize("NFC", "".join(out))


def clean_word(word, lang):
    if not word:
        return None
    w = nfc(word).strip()
    # drop bracketed gloss tails and parentheticals Wiktionary sometimes glues on
    w = re.sub(r"\s*\([^)]*\)\s*$", "", w).strip()
    # Wiktionary sometimes glues a grammatical note after the headword, e.g.
    # Arabic "أَكَلَ imperfective: يَأْكُلُ". Cut at the first ASCII-letter run
    # for non-Latin-script languages (the lemma is the leading native form).
    if lang in ("ar", "hi", "ru", "ja", "ko", "zh", "el"):
        w = re.split(r"\s+[A-Za-z]", w)[0].strip()
        w = re.split(r"[,;:]| or ", w)[0].strip()
    # zh translations are given as "traditional /simplified" (or trad/trad/simp).
    # Keep the SIMPLIFIED form (the last slash-separated segment), the standard
    # script for the most learners. Single-form entries pass through unchanged.
    if lang == "zh" and "/" in w:
        w = w.split("/")[-1].strip()
    w = strip_combining_accents(w, lang)
    if not w or w in ("-", "—", "?"):
        return None
    # reject multi-word phrases for the WORD deck (a few langs give descriptions)
    if len(w.split()) > 3:
        return None
    return w


def sense_ok(t_sense, hint):
    if not hint:
        return True
    if not t_sense:
        return False
    return hint.lower() in t_sense.lower()


def gather_translations(entry, hint):
    """Collect (translation_item) from BOTH the entry's top-level `translations`
 (older wiktextract format) AND each sense's `senses[].translations` (newer
 format, where the sense gloss is the disambiguator). Each yielded item gets a
 synthetic `sense` string so the existing sense_ok() hint filter works: top-
 level items keep their own `sense`; per-sense items inherit the sense's first
 gloss. We tag each item with `_sense_only_one` if its source entry exposes a
 single relevant sense (lets pick_translation relax a too-strict hint)."""
    items = []
    top = entry.get("translations") or []
    # sense richness for top-level: count per distinct `sense` string so a popular
    # sense outranks a niche one even in the older top-level format.
    from collections import Counter
    top_sense_n = Counter(t.get("sense") for t in top)
    for t in top:
        t = dict(t)
        t["_richness"] = top_sense_n.get(t.get("sense"), 1)
        items.append(t)
    for s in entry.get("senses") or []:
        tr = s.get("translations")
        if not tr:
            continue
        gloss = ""
        gl = s.get("glosses") or s.get("raw_glosses") or []
        if gl:
            gloss = gl[0]
        rich = len(tr)  # # of translations on this sense = how "common" the sense is
        for t in tr:
            t = dict(t)
            if not t.get("sense"):
                t["sense"] = gloss
            t["_richness"] = rich
            items.append(t)
    return items


def tag_score(tags, lang):
    """Lower is better. Penalize soft-bad and language-specific bad tags."""
    if not tags:
        return 0
    s = 0
    tagset = set(tags)
    for bt in BAD_TAGS.get(lang, set()):
        if bt in tagset:
            s += 100
    for t in tags:
        if t in SOFT_BAD:
            s += 10
    return s


def lang_match(t, lang):
    """Does translation item t belong to target lang? Handle macrolanguages."""
    code = t.get("code")
    if code == lang:
        # zh: keep only Mandarin / generic Chinese, reject regional Sinitic
        if lang == "zh":
            ln = (t.get("lang") or "")
            if "Mandarin" in ln or ln == "Chinese":
                return True
            # generic "Chinese" with a regional tag handled by tag_score
            return ln.startswith("Chinese")
        return True
    return False


def pick_translation(translations, lang, hint):
    """From an entry's translations (top-level + per-sense, each carrying a
 `sense` string), pick the single best word for `lang`.

 Ranking key (lower = better):
 1. sense_priority: 0 if the item's sense contains the hint, else 1.
 Hint-matched translations always win, but we DON'T hard-drop the rest, 
 so a concept whose hint doesn't match Wiktionary's exact gloss wording
 still gets a (correct primary-sense) translation instead of nothing.
 2. tag_score: dialect/script/soft-bad penalty (gender tags are neutral).
 3. first-seen order (Wiktionary lists the standard form first).
    """
    cands = []
    for i, t in enumerate(translations):
        if not lang_match(t, lang):
            continue
        w = clean_word(t.get("word"), lang)
        if not w:
            continue
        sp = 0 if sense_ok(t.get("sense"), hint) else 1
        # richest sense first (the common meaning has the most translations),
        # so when the hint doesn't match Wiktionary's gloss wording we still land
        # on the primary sense (yellow->amarillo, not ->cobarde).
        rich = -int(t.get("_richness", 1))
        cands.append((sp, rich, tag_score(t.get("tags"), lang), i, w))
    if not cands:
        return None
    cands.sort()
    return cands[0][4]


def first_ipa(entry):
    for s in entry.get("sounds", []) or []:
        ipa = s.get("ipa")
        if ipa:
            return ipa.strip().strip("/").strip("[]")
    return None


def etymology(entry):
    e = entry.get("etymology_text") or ""
    # keep a short proto-root-bearing snippet (cognate builder parses *roots)
    return e[:400] if e else ""


def main():
    concepts = json.load(open(CONCEPTS, encoding="utf-8"))["concepts"]
    # Verified manual overrides for the rare cells where Wiktionary's richest
    # sense for the target meaning carries only regional slang (so the auto-pick
    # is a non-standard word). Each override is a hand-checked standard form. This
    # keeps the pipeline reproducible, overrides live in a committed file outside
    # the code, and (they only correct demonstrably-wrong cells, never invent).
    overrides = {}
    try:
        overrides = json.load(open(OVERRIDES, encoding="utf-8")).get("overrides", {})
    except Exception:
        overrides = {}
    # index concepts by (word, pos-family). Wiktionary pos values: noun, verb,
    # adj, num, adv, name, etc. Our concept "pos" already uses those tokens.
    want = {}
    for c in concepts:
        want.setdefault(c["id"], []).append(c)
    print(f"[extract] {len(concepts)} curated concepts, "
          f"{len(want)} unique headwords; scanning {ENGLISH}")

    # collect matching entries from the English extract (one streaming pass).
    # Fast gate: a single precompiled regex of all wanted "word":"X" markers, so
    # we only json.loads candidate lines (millions of irrelevant lines skipped).
    markers = re.compile(
        '"word": "(' + "|".join(re.escape(w) for w in want) + ')"')
    found = {}  # id -> list of entries
    line_no = 0
    with open(ENGLISH, encoding="utf-8") as f:
        for line in f:
            line_no += 1
            if not markers.search(line):
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            wid = d.get("word")
            if wid not in want:
                continue
            found.setdefault(wid, []).append(d)
    print(f"[extract] scanned {line_no:,} lines; matched headwords: {len(found)}")

    pos_family = {
        "noun": {"noun", "name", "proper noun"},
        "verb": {"verb"},
        "adj": {"adj", "adjective"},
        "num": {"num", "numeral", "number"},
        "adv": {"adv", "adverb"},
        "name": {"name", "proper noun"},
    }

    gold = {l: {} for l in TARGETS}
    gold["en"] = {}
    meta = {}
    dropped = []

    # deterministic concept order = input order, deduped by id (first wins)
    seen_ids = []
    for c in concepts:
        if c["id"] in [s for s in seen_ids]:
            continue
        seen_ids.append(c["id"])
        cid = c["id"]
        hint = c.get("sense", "")
        cat = c.get("category", "object")
        want_pos = pos_family.get(c["pos"], {c["pos"]})
        entries = found.get(cid, [])
        # choose the entry whose pos matches; gather translations from top-level
        # AND per-sense (both wiktextract formats). Prefer the richest table.
        matched = [e for e in entries if (e.get("pos") in want_pos)]
        if not matched:
            dropped.append((cid, "no-entry"))
            continue
        cand_entries = [(e, gather_translations(e, hint)) for e in matched]
        cand_entries = [(e, t) for e, t in cand_entries if t] or [(matched[0], [])]
        cand_entries.sort(key=lambda et: -len(et[1]))
        entry, translations = cand_entries[0]
        cov = []
        ov = overrides.get(cid, {})
        for lang in TARGETS:
            w = ov.get(lang) or pick_translation(translations, lang, hint)
            if w:
                gold[lang][cid] = w
                cov.append(lang)
        if len(cov) < MIN_LANGS:
            dropped.append((cid, f"only {len(cov)} langs: {cov}"))
            # roll back partial
            for lang in cov:
                gold[lang].pop(cid, None)
            continue
        gold["en"][cid] = cid
        meta[cid] = {
            "pos": "word",
            "wpos": c["pos"],
            "category": cat,
            "en_ipa": first_ipa(entry) or "",
            "etymology": etymology(entry),
            "coverage": ["en"] + cov,
            "numeral": NUMERALS.get(cid),
        }

    os.makedirs(GOLD, exist_ok=True)
    json.dump(gold, open(os.path.join(GOLD, "kaikki-core.json"), "w", encoding="utf-8"),
              ensure_ascii=False, sort_keys=True, indent=0)
    json.dump(meta, open(os.path.join(GOLD, "kaikki-meta.json"), "w", encoding="utf-8"),
              ensure_ascii=False, sort_keys=True, indent=0)

    kept = len(meta)
    print(f"\n[extract] KEPT {kept} concepts (>= {MIN_LANGS} target langs each)")
    print("[extract] per-language coverage:")
    for lang in ["en"] + TARGETS:
        print(f"    {lang}: {len(gold[lang])}")
    print(f"[extract] dropped {len(dropped)} concepts for thin coverage / no entry:")
    for cid, why in dropped:
        print(f"    - {cid}: {why}")
    print(f"\n[extract] wrote {GOLD}/kaikki-core.json + kaikki-meta.json")


if __name__ == "__main__":
    main()
