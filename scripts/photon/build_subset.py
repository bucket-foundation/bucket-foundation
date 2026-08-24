#!/usr/bin/env python3
"""
build_subset.py, bake a compact, client-side "starter tier" Polingual asset from
the full 45k-photon substrate, for the Bucket Academy word explorer.

Epic bkt-2ea / bead bkt-nhy. This is the Vercel STARTER TIER: a few-thousand-word,
~5-20 MB asset that ships in the static build so the five comparison lenses run
ENTIRELY CLIENT-SIDE (no network, offline-capable). The full 45k index + all five
axes on the Hetzner box is a later phase (POLINGUAL-PLAN.md §2/§5).

Selection signal (coreness): a built-in UNIVERSAL CORE-CONCEPT list (Swadesh /
Leipzig-Jakarta style ~200 concepts) is matched against each photon's primary
English gloss. A word is kept if its gloss leads with a core concept that is
attested in >=MIN_LANGS languages, this yields a language-balanced spine of the
most translatable, most central vocabulary, where every comparison lens is
populated. A small semantic-neighbor closure pass then pulls in the strongest
cross-lingual neighbors of the spine so the Meaning lens surfaces real cross-
lingual cognates/synonyms even when they didn't match a keyword.

Each kept word carries: surface, lang, short gloss (FIRST sense only, short
glosses, never long copyrighted definition text), pos, ipa, an int8-quantized
semantic vector (384-d) and phonetic vector (64-d), translation links (same
core concept across langs), and etymology_text where present in the Kaikki cache.

Output (idempotent) into learning/app/polingual/:
 subset.json metadata + per-word records + concept->word index + manifest
 vectors.bin int8-quantized [semantic 384 || phonetic 64] rows, row-aligned

Source: Wiktionary via Kaikki (CC-BY-SA). Attribution is REQUIRED and travels in
subset.json.attribution; only short glosses + short etymology snippets are stored.

Run: python3 scripts/photon/build_subset.py [--max-words N] [--no-etym]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import (  # noqa: E402
    PHOTONS_DIR, SEMANTIC_BIN, PHONETIC_BIN, SEM_DIM, PHON_DIM, SEM_MODEL, open_db,
)

OUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..",
                 "learning", "app", "polingual")
)
SUBSET_JSON = os.path.join(OUT_DIR, "subset.json")
VECTORS_BIN = os.path.join(OUT_DIR, "vectors.bin")

# kaikki lang_code -> cache filename (etymology lookups; mirrors query.py)
KAIKKI = {
    "akk": "Akkadian.jsonl", "ang": "Old_English.jsonl", "ar": "Arabic.jsonl",
    "cop": "Coptic.jsonl", "cs": "Czech.jsonl", "de": "German.jsonl",
    "egy": "Egyptian.jsonl", "el": "Greek.jsonl", "en": "English.jsonl",
    "es": "Spanish.jsonl", "fa": "Persian.jsonl", "fi": "Finnish.jsonl",
    "fr": "French.jsonl", "got": "Gothic.jsonl", "grc": "Ancient_Greek.jsonl",
    "he": "Hebrew.jsonl", "hi": "Hindi.jsonl", "id": "Indonesian.jsonl",
    "it": "Italian.jsonl", "ja": "Japanese.jsonl", "ko": "Korean.jsonl",
    "la": "Latin.jsonl", "nl": "Dutch.jsonl", "non": "Old_Norse.jsonl",
    "pl": "Polish.jsonl", "pt": "Portuguese.jsonl", "ru": "Russian.jsonl",
    "sa": "Sanskrit.jsonl", "sux": "Sumerian.jsonl", "sv": "Swedish.jsonl",
    "ta": "Tamil.jsonl", "th": "Thai.jsonl", "tr": "Turkish.jsonl",
    "vi": "Vietnamese.jsonl", "zh": "Chinese.jsonl",
}

LANG_NAMES = {
    "en": "English", "la": "Latin", "sa": "Sanskrit", "ar": "Arabic",
    "cs": "Czech", "de": "German", "el": "Greek", "es": "Spanish",
    "fa": "Persian", "fi": "Finnish", "fr": "French", "he": "Hebrew",
    "hi": "Hindi", "id": "Indonesian", "it": "Italian", "ja": "Japanese",
    "ko": "Korean", "nl": "Dutch", "pl": "Polish", "pt": "Portuguese",
    "ru": "Russian", "sv": "Swedish", "ta": "Tamil", "th": "Thai",
    "tr": "Turkish", "vi": "Vietnamese", "zh": "Chinese",
}

# Universal core-concept spine, a Swadesh / Leipzig-Jakarta style list of the
# concepts that exist in (nearly) every language. Public-domain word lists; we
# use the concept SET only as a selection filter.
CORE_CONCEPTS = {
    # nature / cosmos
    "water", "light", "fire", "sun", "moon", "star", "sky", "earth", "ground",
    "wind", "rain", "snow", "ice", "cloud", "lightning", "thunder", "sea",
    "ocean", "lake", "river", "mountain", "hill", "stone", "rock", "sand",
    "dust", "ash", "smoke", "gold", "silver", "iron", "salt", "metal",
    # plants / animals
    "tree", "wood", "leaf", "root", "seed", "flower", "fruit", "grass",
    "fish", "bird", "dog", "cat", "horse", "cow", "snake", "worm", "egg",
    "meat", "milk", "honey", "bread", "wine",
    # body
    "blood", "bone", "skin", "hair", "head", "eye", "ear", "nose", "mouth",
    "tooth", "tongue", "hand", "arm", "foot", "leg", "knee", "heart", "liver",
    "belly", "neck", "back", "breast",
    # people / kin
    "man", "woman", "child", "mother", "father", "person", "people", "name",
    "king", "god", "friend", "guest", "wife", "husband",
    # action / state
    "speak", "say", "see", "hear", "know", "think", "eat", "drink", "sleep",
    "die", "live", "walk", "run", "come", "go", "give", "take", "sit", "stand",
    "fall", "fly", "swim", "burn", "kill", "love", "fear", "laugh", "cry",
    "work", "play", "sing", "read", "write", "count",
    # quality
    "big", "small", "long", "short", "wide", "narrow", "thick", "thin",
    "old", "new", "young", "good", "bad", "true", "free", "heavy", "light",
    "full", "empty", "warm", "hot", "cold", "wet", "dry", "near", "far",
    "right", "left", "high", "deep", "sweet", "bitter", "sharp", "round",
    # color
    "black", "white", "red", "green", "blue", "yellow", "brown",
    # number / time / abstract
    "one", "two", "three", "four", "five", "ten", "hundred", "number",
    "day", "night", "year", "time", "death", "life", "war", "peace",
    "road", "way", "house", "door", "word", "letter", "book", "song",
    "dream", "soul", "spirit", "law", "truth",
}

# Words whose gloss starts with these are grammar/meta entries, never core.
META_LEAD = re.compile(
    r"^(alternative|synonym|misspelling|abbreviation|initialism|ellipsis|"
    r"obsolete|archaic|dated|nonstandard|plural|singular|genitive|dative|"
    r"accusative|nominative|vocative|ablative|inflection|conjugation|"
    r"feminine|masculine|neuter|romanization|transliteration|used|see|"
    r"clipping|contraction|acronym|eye dialect|standard spelling)\b"
)


def primary_gloss(meaning_en: str) -> str:
    """First sense only, lowercased, parentheticals/brackets stripped, leading
 article/'to' removed. SHORT, never the full · -joined blob."""
    if not meaning_en:
        return ""
    g = meaning_en.split(" · ")[0].strip()
    g = re.sub(r"\(.*?\)|\[.*?\]", "", g).strip()
    g = re.sub(r"^(to |the |a |an )", "", g, flags=re.I)
    return g.strip()


def short_gloss(meaning_en: str, limit: int = 90) -> str:
    """A short, display-safe gloss: first sense, truncated. We deliberately do
 NOT reproduce the long · -joined copyrighted definition text."""
    g = meaning_en.split(" · ")[0].strip() if meaning_en else ""
    if len(g) > limit:
        g = g[: limit - 1].rstrip() + "…"
    return g


def concept_for(gloss_lead_tokens, token_set):
    """Return the core concept this word leads with, or None."""
    for c in CORE_CONCEPTS & token_set:
        if c in gloss_lead_tokens:
            return c
    return None


def select_spine(conn, min_langs: int):
    """Keyword-anchored selection: keep words whose primary gloss leads with a
 core concept attested in >= min_langs languages."""
    rows = conn.execute(
        "SELECT rowid, id, lang, surface, meaning_en, pos, ipa, "
        "semantic_row, phonetic_row, provenance_uri, payload "
        "FROM photons ORDER BY rowid"
    ).fetchall()

    arrays = dict(
        lang=[r[2] for r in rows], surface=[r[3] for r in rows],
        meaning=[r[4] for r in rows], pos=[r[5] for r in rows],
        ipa=[r[6] for r in rows], sem_row=[r[7] for r in rows],
        pho_row=[r[8] for r in rows], prov_uri=[r[9] for r in rows],
        payload=[r[10] for r in rows],
        pid=[r[1] for r in rows], n=len(rows),
    )

    cand = {}                      # array_idx -> concept
    concept_langs = {}             # concept -> set(lang)
    for i, m in enumerate(arrays["meaning"]):
        p = primary_gloss(m)
        if not p or META_LEAD.match(p):
            continue
        lead = {w.lower() for w in p.split()[:4]}
        toks = set(re.findall(r"[a-z']+", p.lower()))
        c = concept_for(lead, toks)
        if c is None:
            continue
        cand[i] = c
        concept_langs.setdefault(c, set()).add(arrays["lang"][i])

    keep = [i for i, c in cand.items() if len(concept_langs[c]) >= min_langs]
    concept_of = {i: cand[i] for i in keep}

    # HARD-INCLUDE the universal core English vocabulary (bkt-nhy). The concept-
    # spine matcher checks only the gloss LEAD, so clean primary glosses like
    # "Electromagnetic radiation… visible light" (= light) or "Unconstrained"
    # (= free) get dropped even though they are THE words people type. Force the
    # core English headwords to the FRONT of keep so they always survive the
    # global max_words cap, mapped to their own concept for translate() grouping.
    keep_set = set(keep)
    core_front = []
    for i in range(arrays["n"]):
        if arrays["lang"][i] != "en":
            continue
        surf = arrays["surface"][i]
        if surf in CORE_CONCEPTS:
            concept_of[i] = surf
            if i not in keep_set:
                core_front.append(i)
                keep_set.add(i)
    keep = core_front + keep
    return keep, concept_of, arrays


def neighbor_closure(keep, arrays, max_add, sim_thresh=0.62, per_word=2):
    """Pull in the strongest CROSS-LINGUAL semantic neighbors of the spine that
 aren't already kept. Bounded by max_add."""
    if max_add <= 0:
        return []
    sem = np.memmap(SEMANTIC_BIN, dtype="float32", mode="r").reshape(-1, SEM_DIM)
    lang = arrays["lang"]
    sem_row = arrays["sem_row"]
    keep_set = set(keep)
    all_idx = [i for i in range(arrays["n"]) if sem_row[i] is not None]
    all_arr = np.array(all_idx)
    M = sem[[sem_row[i] for i in all_idx]]

    added, added_set = [], set()
    for i in keep:
        if sem_row[i] is None:
            continue
        v = sem[sem_row[i]]
        sims = M @ v
        order = np.argpartition(-sims, min(20, len(sims) - 1))[:20]
        order = order[np.argsort(-sims[order])]
        taken = 0
        for k in order:
            if taken >= per_word:
                break
            j = int(all_arr[k])
            if j == i or j in keep_set or j in added_set:
                continue
            if lang[j] == lang[i]:
                continue
            if sims[k] < sim_thresh:
                break
            added.append(j)
            added_set.add(j)
            taken += 1
            if len(added) >= max_add:
                return added
    return added


def load_etymology(selected, arrays):
    """Stream each needed Kaikki cache file ONCE, collecting etymology_text for
 the selected (lang, surface) pairs only. Short snippets, attributed."""
    want = {}
    for i in selected:
        lg, sf = arrays["lang"][i], arrays["surface"][i]
        want.setdefault(lg, {}).setdefault(sf, i)
    etym = {}
    for lg, surf_map in want.items():
        fn = KAIKKI.get(lg)
        if not fn:
            continue
        path = os.path.join(PHOTONS_DIR, "kaikki-cache", fn)
        if not os.path.exists(path):
            continue
        remaining = dict(surf_map)
        t0 = time.time()
        with open(path, encoding="utf-8") as f:
            for line in f:
                if not remaining:
                    break
                hit = None
                for sf in remaining:
                    if sf in line:
                        hit = sf
                        break
                if hit is None:
                    continue
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                w = d.get("word")
                if w not in remaining:
                    continue
                et = d.get("etymology_text")
                if et:
                    et = et.strip()
                    if len(et) > 300:
                        et = et[:299].rstrip() + "…"
                    etym[remaining[w]] = et
                del remaining[w]
        print(f"    etym {lg:>3} ({fn}): {len(surf_map) - len(remaining)}"
              f"/{len(surf_map)}  [{time.time() - t0:.1f}s]")
    return etym


def quantize_int8(vec, scale=127.0):
    """L2-normed float vector in [-1,1] -> int8. Reconstruct as v/127."""
    q = np.clip(np.round(np.asarray(vec, dtype="float32") * scale), -127, 127)
    return q.astype(np.int8)


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-langs", type=int, default=4)
    ap.add_argument("--max-words", type=int, default=4500)
    ap.add_argument("--no-etym", action="store_true")
    args = ap.parse_args(argv[1:])

    os.makedirs(OUT_DIR, exist_ok=True)
    conn = open_db()

    print("== selecting core spine ==")
    keep, concept_of, arrays = select_spine(conn, args.min_langs)
    print(f"  spine: {len(keep)} words across "
          f"{len({arrays['lang'][i] for i in keep})} languages, "
          f"{len(set(concept_of.values()))} concepts")

    budget = max(0, args.max_words - len(keep))
    added = neighbor_closure(keep, arrays, max_add=budget)
    print(f"  + neighbor closure: {len(added)} cross-lingual neighbors")

    selected = list(dict.fromkeys(keep + added))
    if len(selected) > args.max_words:
        selected = selected[: args.max_words]
    print(f"  total selected: {len(selected)}")

    langs_present = sorted({arrays["lang"][i] for i in selected})

    etym = {}
    if not args.no_etym:
        print("== etymology (streamed Kaikki pass) ==")
        etym = load_etymology(selected, arrays)
        print(f"  etymology found for {len(etym)}/{len(selected)} words")

    print("== assembling records + int8 vectors ==")
    sem = np.memmap(SEMANTIC_BIN, dtype="float32", mode="r").reshape(-1, SEM_DIM)
    pho = np.memmap(PHONETIC_BIN, dtype="float32", mode="r").reshape(-1, PHON_DIM)

    sub_pos = {idx: k for k, idx in enumerate(selected)}
    concept_members = {}
    for i in selected:
        c = concept_of.get(i)
        if c:
            concept_members.setdefault(c, []).append(sub_pos[i])

    words, vec_rows = [], []
    for i in selected:
        si = arrays["sem_row"][i]
        pi = arrays["pho_row"][i]
        sv = quantize_int8(sem[si]) if si is not None else np.zeros(SEM_DIM, np.int8)
        pv = quantize_int8(pho[pi]) if pi is not None else np.zeros(PHON_DIM, np.int8)
        vec_rows.append(np.concatenate([sv, pv]))
        rec = {
            "s": arrays["surface"][i],
            "l": arrays["lang"][i],
            "g": short_gloss(arrays["meaning"][i]),
            "p": arrays["pos"][i] or "",
            "ipa": (arrays["ipa"][i] or "").strip("/ "),
            "hv": pi is not None,
        }
        # additional structured senses (gloss + pos + tags) so the explorer can
        # show "this is the CORE sense" and label others (bkt-nhy).
        try:
            pl = json.loads(arrays["payload"][i]) if arrays["payload"][i] else {}
        except Exception:
            pl = {}
        sn = pl.get("senses", []) or []
        if len(sn) > 1:
            rec["senses"] = [{"g": s.get("gloss"), "p": s.get("pos"),
                              "t": s.get("tags", [])} for s in sn[1:5]]
        c = concept_of.get(i)
        if c:
            rec["c"] = c
        if i in etym:
            rec["e"] = etym[i]
        words.append(rec)

    vec_mat = np.stack(vec_rows).astype(np.int8)
    vec_mat.tofile(VECTORS_BIN)

    concept_index = {c: rows for c, rows in concept_members.items()
                     if len(rows) > 1}

    manifest = {
        "version": 1,
        "built_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "tier": "starter",
        "note": ("Starter tier baked for client-side use in Bucket Academy. "
                 "The full 45k-word index across all 27 languages runs on the "
                 "Hetzner box in a later phase (see POLINGUAL-PLAN.md)."),
        "words": len(words),
        "languages": langs_present,
        "language_names": {l: LANG_NAMES.get(l, l) for l in langs_present},
        "concepts": sorted(concept_index.keys()),
        "sem_dim": SEM_DIM,
        "phon_dim": PHON_DIM,
        "model": SEM_MODEL,
        "vec_quant": "int8 (value = stored/127); rows are [semantic||phonetic], "
                     "row-aligned with words[]",
        "vectors_bin": "vectors.bin",
        # quality knobs for the client's MEANING lens (bkt-nhy), keep in sync
        # with scripts/photon/query.py SEM_MIN_COS / SEM_REL_GAP / LANG_PREFERENCE.
        "default_lang": "en",
        "lang_preference": ["en", "es", "fr", "de", "it", "pt", "la", "nl",
                            "sv", "ru", "el", "sa"],
        "min_cos": 0.50,
        "rel_gap": 0.22,
    }
    attribution = {
        "data": "Wiktionary via Kaikki (kaikki.org)",
        "license": "CC-BY-SA 3.0",
        "credit": "Definitions, IPA & etymology from Wiktionary, CC-BY-SA. "
                  "Short glosses only; full entries at en.wiktionary.org.",
        "source_url": "https://kaikki.org",
        "wiktionary_url": "https://en.wiktionary.org",
    }

    out = {
        "manifest": manifest,
        "attribution": attribution,
        "concept_index": concept_index,
        "words": words,
    }
    with open(SUBSET_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    js_sz = os.path.getsize(SUBSET_JSON)
    vb_sz = os.path.getsize(VECTORS_BIN)
    from collections import Counter
    per_lang = Counter(w["l"] for w in words)
    print("\n== built ==")
    print(f"  {SUBSET_JSON}  {js_sz/1e6:.2f} MB")
    print(f"  {VECTORS_BIN}  {vb_sz/1e6:.2f} MB")
    print(f"  total asset: {(js_sz + vb_sz)/1e6:.2f} MB")
    print(f"  words: {len(words)}   languages: {len(langs_present)}   "
          f"concepts: {len(concept_index)}")
    print(f"  with ipa: {sum(1 for w in words if w['ipa'])}   "
          f"with phonetic vec: {sum(1 for w in words if w['hv'])}   "
          f"with etymology: {sum(1 for w in words if 'e' in w)}")
    print("  per-lang:", dict(per_lang.most_common()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
