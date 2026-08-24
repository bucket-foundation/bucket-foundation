#!/usr/bin/env python3
"""
query.py, Polingual multi-axis query engine over the photon substrate.

Five comparison axes on the real 45k-word data:

 semantic_topk(surface, lang) words that MEAN the same (cross-lingual)
 phonetic_topk(surface, lang) words that SOUND the same (lang-agnostic)
 spelling_topk(surface, lang) words SPELLED similarly (normalized edit dist)
 etymology(surface, lang) where a word COMES FROM (Wiktionary/Kaikki)
 translate(surface, frm, to) same meaning_en across languages + semantic
 neighbors in the target language

Cosine similarity == dot product over the L2-normalized memmapped vectors;
brute force over 45k rows is a single numpy matmul (~ms), so no ANN index is
needed at this scale.

Source: Wiktionary via Kaikki (CC-BY-SA). Etymology snippets are short and
attributed; we never reproduce long copyrighted text.

CLI:
 python3 scripts/photon/query.py semantic light en
 python3 scripts/photon/query.py phonetic gravitas en
 python3 scripts/photon/query.py spelling encyclopedia en
 python3 scripts/photon/query.py etymology gratis la
 python3 scripts/photon/query.py translate water en es
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import (  # noqa: E402
    PHOTONS_DIR, SEMANTIC_BIN, PHONETIC_BIN, SEM_DIM, PHON_DIM, open_db,
)

# kaikki lang_code -> cache filename (for etymology lookups)
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


# --------------------------------------------------------------------------- #
# Index (loaded once) #
# --------------------------------------------------------------------------- #
# When the user types a bare word with no explicit language, the headword should
# prefer the language they're most likely querying in. English first (the gloss
# lingua franca + the explorer's default), then the major Romance/Germanic langs.
DEFAULT_LANG = "en"
LANG_PREFERENCE = [
    "en", "es", "fr", "de", "it", "pt", "la", "nl", "sv", "ru", "el", "sa",
]


class PhotonIndex:
    def __init__(self):
        self.conn = open_db()
        rows = self.conn.execute(
            "SELECT rowid, id, lang, surface, meaning_en, pos, ipa, "
            "semantic_row, phonetic_row, payload FROM photons ORDER BY rowid"
        ).fetchall()
        self.rowid = np.array([r[0] for r in rows])
        self.id = [r[1] for r in rows]
        self.lang = [r[2] for r in rows]
        self.surface = [r[3] for r in rows]
        self.meaning = [r[4] for r in rows]
        self.pos = [r[5] for r in rows]
        self.ipa = [r[6] for r in rows]
        self.sem_row = [r[7] for r in rows]
        self.pho_row = [r[8] for r in rows]
        self._payload_raw = [r[9] for r in rows]
        self._payload_cache = {}
        self.n = len(rows)
        # idx within these arrays == rowid-1 (dense), so row i maps to vec row i
        self._sem = None
        self._pho = None
        # exact (lang, surface) -> array index
        self.by_key = {}
        # surface -> all candidate indices (for language-priority headword pick)
        self.by_surface = {}
        self.by_lower = {}
        for i in range(self.n):
            self.by_key.setdefault((self.lang[i], self.surface[i]), i)
            self.by_surface.setdefault(self.surface[i], []).append(i)
            self.by_lower.setdefault(self.surface[i].lower(), []).append(i)

    def payload(self, i):
        if i in self._payload_cache:
            return self._payload_cache[i]
        try:
            p = json.loads(self._payload_raw[i]) if self._payload_raw[i] else {}
        except Exception:
            p = {}
        self._payload_cache[i] = p
        return p

    def senses(self, i):
        return self.payload(i).get("senses", []) or []

    @property
    def sem(self):
        if self._sem is None:
            mm = np.memmap(SEMANTIC_BIN, dtype="float32", mode="r")
            self._sem = mm.reshape(-1, SEM_DIM)
        return self._sem

    @property
    def pho(self):
        if self._pho is None:
            mm = np.memmap(PHONETIC_BIN, dtype="float32", mode="r")
            self._pho = mm.reshape(-1, PHON_DIM)
        return self._pho

    def find(self, surface, lang=None):
        """Array index for a word, language-priority headword resolution.

 Exact (lang, surface) wins if an explicit lang is given; otherwise, among
 all photons sharing this surface, pick the one whose language is highest
 in LANG_PREFERENCE (English first). This is what stops English "light"
 from resolving to the Portuguese dietary loanword.
        """
        if lang and (lang, surface) in self.by_key:
            return self.by_key[(lang, surface)]
        cands = self.by_surface.get(surface) or self.by_lower.get((surface or "").lower())
        if not cands:
            return None
        if lang:
            for i in cands:
                if self.lang[i] == lang:
                    return i

        def rank(i):
            try:
                pref = LANG_PREFERENCE.index(self.lang[i])
            except ValueError:
                pref = len(LANG_PREFERENCE) + 1
            return (pref, -len(self.senses(i)))
        return min(cands, key=rank)


_IDX = None


def idx() -> PhotonIndex:
    global _IDX
    if _IDX is None:
        _IDX = PhotonIndex()
    return _IDX


# --------------------------------------------------------------------------- #
# Axes #
# --------------------------------------------------------------------------- #
def _cosine_topk(matrix, valid_mask, vec, k, exclude=None):
    """Brute-force cosine top-k of `vec` against rows of `matrix` (L2-normed)."""
    sims = matrix @ vec.astype("float32")
    sims = np.where(valid_mask, sims, -2.0)
    if exclude is not None:
        sims[exclude] = -2.0
    k = min(k, int(valid_mask.sum()))
    if k <= 0:
        return []
    top = np.argpartition(-sims, k)[:k]
    top = top[np.argsort(-sims[top])]
    return [(int(i), float(sims[i])) for i in top]


def _sem_valid(ix):
    m = np.zeros(ix.n, dtype=bool)
    for i in range(ix.n):
        r = ix.sem_row[i]
        if r is not None:
            m[i] = True
    return m


def _pho_valid(ix):
    m = np.zeros(ix.n, dtype=bool)
    for i in range(ix.n):
        r = ix.pho_row[i]
        if r is not None:
            m[i] = True
    return m


# Sense-noise control (the quality knobs, bkt-nhy). With the "surface: gloss"
# LaBSE embedding, true cross-lingual translations of the SAME sense land high
# (~0.55-0.90); incompatible senses (low-fat "light", "high") sit below.
SEM_MIN_COS = 0.50
SEM_REL_GAP = 0.22       # also drop hits >this far below the best hit
ONE_PER_LANG = True      # prefer the single best translation per language


def _norm_gloss(g):
    return " ".join((g or "").lower().split())[:50]


def _headword(ix, i):
    """The resolved headword: language-priority + primary-sense gloss + senses."""
    p = ix.payload(i)
    return {
        "surface": ix.surface[i], "lang": ix.lang[i], "pos": ix.pos[i],
        "ipa": ix.ipa[i],
        "meaning_en": ix.meaning[i],            # PRIMARY sense (core/illumination)
        "senses": [{"gloss": s.get("gloss"), "pos": s.get("pos"),
                    "tags": s.get("tags", [])} for s in ix.senses(i)[:6]],
        "source": "Wiktionary via Kaikki (CC-BY-SA 4.0)",
        "source_uri": p.get("provenance", {}).get("wiktionary")
                      or f"https://en.wiktionary.org/wiki/{ix.surface[i]}",
    }


def semantic_topk(surface, lang=None, k=10, cross_lingual=True,
                  min_cos=SEM_MIN_COS, one_per_lang=ONE_PER_LANG):
    """Cross-lingual 'means the same' neighbors, sense-consistent.

 Filters that cut the cross-sense noise:
 - cosine threshold (drop off-sense hits below `min_cos`) + a relative gap
 below the best hit;
 - one-per-language (one of luz/lumière/luce/Licht per language);
 - dedup near-identical glosses.
    """
    ix = idx()
    i = ix.find(surface, lang)
    if i is None or ix.sem_row[i] is None:
        return {"error": f"no semantic vector for {surface!r} ({lang})"}
    vec = ix.sem[ix.sem_row[i]]
    mask = _sem_valid(ix)
    if not cross_lingual and lang:
        for j in range(ix.n):
            if ix.lang[j] != lang:
                mask[j] = False
    raw = _cosine_topk(ix.sem, mask, vec, max(k * 6, 40), exclude=i)
    top_s = raw[0][1] if raw else 0.0
    floor = max(min_cos, top_s - SEM_REL_GAP)
    seen_lang, seen_gloss, kept = set(), set(), []
    for j, s in raw:
        if s < floor:
            break  # sorted desc
        if one_per_lang and ix.lang[j] in seen_lang:
            continue
        gkey = (ix.lang[j], _norm_gloss(ix.meaning[j]))
        if gkey in seen_gloss:
            continue
        if ix.surface[j] == surface:
            continue
        seen_lang.add(ix.lang[j])
        seen_gloss.add(gkey)
        kept.append((j, s))
        if len(kept) >= k:
            break
    out = _fmt(ix, surface, lang, kept)
    out["headword"] = _headword(ix, i)
    return out


def phonetic_topk(surface, lang=None, k=10):
    ix = idx()
    i = ix.find(surface, lang)
    if i is None or ix.pho_row[i] is None:
        return {"error": f"no phonetic vector for {surface!r} ({lang})"}
    vec = ix.pho[ix.pho_row[i]]
    mask = _pho_valid(ix)
    hits = _cosine_topk(ix.pho, mask, vec, k + 1, exclude=i)
    return _fmt(ix, surface, lang, hits[:k])


def _norm_edit(a, b):
    """Normalized Levenshtein distance in [0,1] (0 == identical)."""
    a, b = a.lower(), b.lower()
    if a == b:
        return 0.0
    la, lb = len(a), len(b)
    if la == 0 or lb == 0:
        return 1.0
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        cur = [i] + [0] * lb
        ca = a[i - 1]
        for j in range(1, lb + 1):
            cost = 0 if ca == b[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev = cur
    return prev[lb] / max(la, lb)


def spelling_topk(surface, lang=None, k=10):
    ix = idx()
    # search within same lang if given (spelling is orthography-bound), else all
    cand = range(ix.n)
    scored = []
    for j in cand:
        if lang and ix.lang[j] != lang:
            continue
        if ix.surface[j] == surface and ix.lang[j] == lang:
            continue
        d = _norm_edit(surface, ix.surface[j])
        if d < 1.0:
            scored.append((j, 1.0 - d))
    scored.sort(key=lambda x: -x[1])
    return _fmt(ix, surface, lang, scored[:k], score_name="similarity")


def etymology(surface, lang, max_chars=320):
    """Pull etymology_text from the Kaikki cache for (lang, surface).

 Source: Wiktionary via Kaikki (CC-BY-SA). Returns a short, attributed
 snippet; full entry lives at kaikki.org / en.wiktionary.org.
    """
    fn = KAIKKI.get(lang)
    if not fn:
        return {"error": f"no kaikki cache for lang {lang!r}"}
    path = os.path.join(PHOTONS_DIR, "kaikki-cache", fn)
    if not os.path.exists(path):
        return {"error": f"cache file missing: {fn}"}
    best = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            if surface not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get("word") != surface:
                continue
            et = d.get("etymology_text")
            if et:
                best = {
                    "surface": surface, "lang": lang,
                    "pos": d.get("pos"),
                    "etymology": et[:max_chars] + ("…" if len(et) > max_chars else ""),
                    "source": "Wiktionary via Kaikki (CC-BY-SA)",
                    "source_uri": f"https://en.wiktionary.org/wiki/{surface}",
                }
                break
            if best is None:  # remember a match even without etymology
                best = {"surface": surface, "lang": lang,
                        "etymology": None,
                        "source": "Wiktionary via Kaikki (CC-BY-SA)"}
    return best or {"error": f"{surface!r} ({lang}) not found in cache"}


def translate(surface, frm, to, k=8):
    """Cross-lingual translate: exact same meaning_en, then semantic neighbors
 restricted to the target language."""
    ix = idx()
    i = ix.find(surface, frm)
    if i is None:
        return {"error": f"{surface!r} not found in {frm}"}
    src_meaning = ix.meaning[i]
    # 1) exact-meaning matches in target lang (strongest signal)
    exact = []
    for j in range(ix.n):
        if ix.lang[j] == to and ix.meaning[j] == src_meaning and j != i:
            exact.append((ix.surface[j], ix.meaning[j]))
    # 2) semantic neighbors restricted to target lang
    sem = []
    if ix.sem_row[i] is not None:
        vec = ix.sem[ix.sem_row[i]]
        mask = _sem_valid(ix)
        for j in range(ix.n):
            if ix.lang[j] != to:
                mask[j] = False
        hits = _cosine_topk(ix.sem, mask, vec, k, exclude=i)
        sem = [(ix.surface[h], round(s, 3), ix.meaning[h][:60]) for h, s in hits]
    return {
        "word": surface, "from": frm, "to": to,
        "meaning_en": src_meaning[:80],
        "exact_meaning_matches": exact[:k],
        "semantic_neighbors": sem,
    }


def _fmt(ix, surface, lang, hits, score_name="score"):
    out = []
    for i, s in hits:
        out.append({
            "surface": ix.surface[i], "lang": ix.lang[i],
            "meaning_en": (ix.meaning[i] or "")[:70],
            "ipa": ix.ipa[i], score_name: round(s, 3),
        })
    return {"query": surface, "lang": lang, "results": out}


# --------------------------------------------------------------------------- #
# CLI #
# --------------------------------------------------------------------------- #
def _print(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 1
    cmd, surface = argv[1], argv[2]
    lang = argv[3] if len(argv) > 3 else None
    if cmd == "semantic":
        _print(semantic_topk(surface, lang))
    elif cmd == "phonetic":
        _print(phonetic_topk(surface, lang))
    elif cmd == "spelling":
        _print(spelling_topk(surface, lang))
    elif cmd == "etymology":
        _print(etymology(surface, lang or "en"))
    elif cmd == "translate":
        to = argv[4] if len(argv) > 4 else "es"
        _print(translate(surface, lang or "en", to))
    else:
        print(f"unknown command {cmd!r}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
