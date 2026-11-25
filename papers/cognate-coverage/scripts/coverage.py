from __future__ import annotations

import itertools
import json
import os
import sqlite3
import sys
import unicodedata
from functools import lru_cache

import numpy as np
import wordfreq

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "coverage.json")
ROOTS = os.environ.get(
    "PHOTONS_ROOTS",
    os.path.join(HERE, "..", "..", "..", "_intake", "photons", "roots.sqlite"),
)
TOP_N = int(os.environ.get("TOP_N", 5000))
MAX_SET = 4
PHON_THRESHOLD = 0.25
KNOWN_N = 10000
CLOSURE_DEPTH = 8

HELD = [
    "ar", "cs", "de", "el", "en", "es", "fa", "fi", "fr", "he", "hi", "id",
    "it", "ja", "ko", "la", "nl", "pl", "pt", "ru", "sa", "sv", "ta", "th",
    "tr", "vi", "zh",
]
TARGETS = os.environ["TGT"].split(",") if os.environ.get("TGT") else [l for l in HELD if l in wordfreq.available_languages()]
WIKT = {"zh": ("cmn", "zh")}


def codes(lang: str) -> tuple[str, ...]:
    return WIKT.get(lang, (lang,))


con = sqlite3.connect(f"file:{ROOTS}?mode=ro", uri=True)


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if c.isalpha() and not unicodedata.combining(c))


def lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def phon_close(a: str, b: str) -> bool:
    a, b = fold(a), fold(b)
    if not a or not b:
        return False
    if a == b:
        return len(a) >= 3
    if min(len(a), len(b)) < 4:
        return False
    return lev(a, b) / max(len(a), len(b)) <= PHON_THRESHOLD


INHERIT = ("inh", "der", "form", "from", "root", "uder")
BORROW = ("bor", "lbor", "slbor", "ubor", "bor<unc>")


@lru_cache(maxsize=None)
def ancestors(lang: str, word: str, borrow: bool) -> frozenset:
    rels = INHERIT + (BORROW if borrow else ())
    marks = ",".join("?" * len(rels))
    seen = {(lang, word)}
    frontier = [(lang, word)]
    for _ in range(CLOSURE_DEPTH):
        nxt = []
        for l, w in frontier:
            rows = con.execute(
                f"select anc_lang, anc_form from etym where lang=? and word=? and rel in ({marks}) "
                "union select root_lang, root_form from word_root "
                "where lang=? and word=? and kind in ('proto', 'root')",
                (l, w, *rels, l, w),
            ).fetchall()
            for r in rows:
                if r[1] and r not in seen:
                    seen.add(r)
                    nxt.append(r)
        frontier = nxt
        if not frontier:
            break
    return frozenset(seen)


def key(w: str) -> str:
    d = unicodedata.normalize("NFD", w.lower())
    d = "".join(c for c in d if not unicodedata.combining(c) or c in "\u3099\u309a")
    return unicodedata.normalize("NFC", d)


@lru_cache(maxsize=None)
def lexicon(t: str) -> dict:
    table: dict = {}
    marks = ",".join("?" * len(codes(t)))
    for en_word, word, roman in con.execute(
        f"select distinct en_word, word, coalesce(nullif(roman,''), word) "
        f"from translation where lang in ({marks})",
        codes(t),
    ):
        table.setdefault(key(word), []).append((en_word, word, roman))
    return table


def concepts(t: str, w: str) -> tuple[str, list[tuple[str, str]]]:
    if t == "en":
        return w, [(w, w)]
    rows = lexicon(t).get(key(w), [])
    if not rows:
        return w, []
    return rows[0][1], [(e, r) for e, _, r in rows]


@lru_cache(maxsize=None)
def all_renderings(en_word: str) -> dict:
    out: dict = {}
    for lang, word, roman in con.execute(
        "select distinct lang, word, coalesce(nullif(roman,''), word) "
        "from translation indexed by translation_en where en_word=?",
        (en_word,),
    ):
        out.setdefault(lang, []).append((word, roman))
    return out


def renderings(s: str, en_word: str) -> list[tuple[str, str]]:
    if s == "en":
        return [(en_word, en_word)]
    table = all_renderings(en_word)
    known = known_vocab(s)
    return [
        r for c in codes(s) for r in table.get(c, [])
        if known is None or r[0].lower() in known
    ]


@lru_cache(maxsize=None)
def known_vocab(s: str) -> frozenset | None:
    if s not in wordfreq.available_languages():
        return None
    freqs = wordfreq.get_frequency_dict(s)
    return frozenset(sorted(freqs, key=lambda k: (-freqs[k], k))[:KNOWN_N])


def shares_root(t: str, w: str, s: str, f: str) -> tuple[bool, bool]:
    at = set().union(*(ancestors(c, w, True) for c in codes(t)))
    as_ = set().union(*(ancestors(c, f, False) for c in codes(s)))
    shared = at & as_
    return bool(shared), any(l != "ine-pro" for l, _ in shared)


def target_vocab(t: str):
    words, weights, forms, cons, romans = [], [], [], [], []
    total = 0.0
    freqs = wordfreq.get_frequency_dict(t)
    for w in sorted(freqs, key=lambda k: (-freqs[k], k))[:TOP_N]:
        f = freqs[w]
        total += f
        form, cs = concepts(t, w)
        if not cs:
            continue
        words.append(form)
        weights.append(f)
        cons.append(sorted({e for e, _ in cs}))
        romans.append(sorted({r for _, r in cs} | {form}))
    return words, np.array(weights), cons, romans, total


def pair_mask(t, s, words, cons, romans):
    root = np.zeros(len(words), bool)
    shallow = np.zeros(len(words), bool)
    phon = np.zeros(len(words), bool)
    for i, (w, es, rs) in enumerate(zip(words, cons, romans)):
        for e in es:
            for f, fr in renderings(s, e):
                r, sh = shares_root(t, w, s, f)
                if r:
                    root[i] = True
                if sh:
                    shallow[i] = True
                if any(phon_close(x, y) for x in rs for y in {f, fr}):
                    phon[i] = True
            if shallow[i] and phon[i]:
                break
    return root, shallow, phon


def main() -> None:
    arrays: dict = {}
    result = {"top_n": TOP_N, "phon_threshold": PHON_THRESHOLD, "targets": {}}
    for t in TARGETS:
        words, wts, cons, romans, total = target_vocab(t)
        norm = wts / wts.sum()
        masks = {}
        pairs = {}
        for s in HELD:
            if s == t:
                continue
            root, shallow, phon = pair_mask(t, s, words, cons, romans)
            m = shallow | phon
            masks[s] = m
            pairs[s] = {
                "C": float(norm @ m),
                "C_pie": float(norm @ (root | phon)),
                "C_root": float(norm @ shallow),
                "C_phon": float(norm @ phon),
            }
        others = [s for s in HELD if s != t]
        best = {}
        mean_by_size = {}
        for k in range(1, MAX_SET + 1):
            vals = []
            top = (None, -1.0)
            for S in itertools.combinations(others, k):
                m = np.logical_or.reduce([masks[s] for s in S])
                c = float(norm @ m)
                vals.append(c)
                if c > top[1]:
                    top = (S, c)
            best[str(k)] = {"set": list(top[0]), "C": top[1]}
            mean_by_size[str(k)] = float(np.mean(vals))
        greedy_log = []
        greedy, cur = [], np.zeros(len(words), bool)
        for _ in range(MAX_SET):
            s_star = max(
                (s for s in others if s not in greedy),
                key=lambda s: float(norm @ (cur | masks[s])),
            )
            gain = float(norm @ (cur | masks[s_star])) - float(norm @ cur)
            cur = cur | masks[s_star]
            greedy.append(s_star)
            greedy_log.append(
                {"add": s_star, "gain": gain, "C": float(norm @ cur)}
            )
        en_chain = []
        if t != "en":
            cur = masks["en"].copy()
            en_chain.append({"add": "en", "gain": float(norm @ cur), "C": float(norm @ cur)})
            chosen = ["en"]
            for _ in range(MAX_SET - 1):
                s_star = max(
                    (s for s in others if s not in chosen),
                    key=lambda s: float(norm @ (cur | masks[s])),
                )
                new = cur | masks[s_star]
                en_chain.append(
                    {"add": s_star, "gain": float(norm @ new) - float(norm @ cur), "C": float(norm @ new)}
                )
                cur = new
                chosen.append(s_star)
        arrays[f"{t}__weight"] = norm
        for s_, m_ in masks.items():
            arrays[f"{t}__{s_}"] = m_
        result["targets"][t] = {
            "vocab": len(words),
            "analyzable_mass": float(wts.sum() / total),
            "pairs": pairs,
            "best": best,
            "mean_by_size": mean_by_size,
            "en_chain": en_chain,
            "greedy": greedy_log,
        }
        print(t, len(words), round(pairs.get("en", {"C": 1})["C"], 3), file=sys.stderr, flush=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(result, fh, indent=1, sort_keys=True)
    np.savez_compressed(os.path.join(os.path.dirname(OUT), "masks.npz"), **arrays)


if __name__ == "__main__":
    main()
