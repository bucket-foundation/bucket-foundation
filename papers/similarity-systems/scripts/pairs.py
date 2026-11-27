from __future__ import annotations

import json
import os
import random
import sqlite3
import unicodedata
from collections import Counter
from functools import lru_cache

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTONS = os.environ.get("PHOTONS_DIR", os.path.join(HERE, "..", "..", "..", "_intake", "photons"))
OUT = os.path.join(HERE, "..", "data", "pairs.npz")
SEED = 20261125
CAP = 2000
CLOSURE_DEPTH = 8
LANGS = [
    "ar", "cs", "de", "el", "es", "fa", "fi", "fr", "he", "hi", "id", "it", "ja",
    "ko", "la", "nl", "pl", "pt", "ru", "sa", "sv", "ta", "th", "tr", "vi", "zh",
]
CROSS = [("es", "pt"), ("es", "it"), ("fr", "it"), ("de", "nl"), ("de", "sv"), ("ru", "pl")]
WIKT = {"zh": ("cmn", "zh")}
INHERIT = ("inh", "der", "form", "from", "root", "uder")
BORROW = ("bor", "lbor")

index = sqlite3.connect(f"file:{PHOTONS}/index.sqlite?mode=ro", uri=True)
roots = sqlite3.connect(f"file:{PHOTONS}/roots.sqlite?mode=ro", uri=True)


def codes(lang: str) -> tuple[str, ...]:
    return WIKT.get(lang, (lang,))


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if c.isalpha() and not unicodedata.combining(c))


def latin(s: str) -> bool:
    letters = [c for c in s if c.isalpha()]
    return bool(letters) and all("LATIN" in unicodedata.name(c, "") for c in letters)


@lru_cache(maxsize=None)
def photon(lang: str, word: str):
    row = index.execute(
        "select semantic_row, phonetic_row, ipa from photons where lang=? and surface=? limit 1",
        (lang, word),
    ).fetchone()
    return row


@lru_cache(maxsize=None)
def roman(lang: str, word: str) -> str:
    if latin(word):
        return fold(word)
    for code in codes(lang):
        row = roots.execute(
            "select roman from word where lang=? and word=? and roman<>'' limit 1", (code, word)
        ).fetchone()
        if row:
            return fold(row[0])
    return ""


@lru_cache(maxsize=None)
def has_etym(lang: str, word: str) -> bool:
    return any(
        roots.execute("select 1 from etym where lang=? and word=? limit 1", (c, word)).fetchone()
        for c in codes(lang)
    )


@lru_cache(maxsize=None)
def ancestors(lang: str, word: str, borrow: bool = True) -> frozenset:
    rels = INHERIT + (BORROW if borrow else ())
    marks = ",".join("?" * len(rels))
    start = {(c, word) for c in codes(lang)}
    seen = set(start)
    frontier = list(start)
    for _ in range(CLOSURE_DEPTH):
        nxt = []
        for l, w in frontier:
            rows = roots.execute(
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


def single(w: str) -> bool:
    return bool(w) and " " not in w.strip() and "-" not in w.strip("-") and len(w) <= 30


def en_pairs(lang: str) -> list[tuple[str, str, str]]:
    marks = ",".join("?" * len(codes(lang)))
    rows = roots.execute(
        f"select distinct en_word, sense, word from translation where lang in ({marks})", codes(lang)
    ).fetchall()
    out = []
    for en, sense, w in rows:
        w = w.strip()
        if single(en) and single(w) and photon("en", en) and photon(lang, w):
            out.append((en, sense or "", w))
    return out


def lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def prefix(a: str, b: str) -> int:
    n = 0
    for x, y in zip(a, b):
        if x != y:
            break
        n += 1
    return n


def trigrams(s: str) -> set:
    p = f"^{s}$"
    return {p[i : i + 3] for i in range(len(p) - 2)}


def subword(a: str, b: str) -> tuple[float, float, float]:
    ca, cb = Counter(a), Counter(b)
    letter = 2 * sum((ca & cb).values()) / (len(a) + len(b))
    affix = max(prefix(a, b), prefix(a[::-1], b[::-1])) / max(len(a), len(b))
    ta, tb = trigrams(a), trigrams(b)
    ngram = len(ta & tb) / len(ta | tb)
    return letter, affix, ngram


def main() -> None:
    rng = random.Random(SEED)
    lexicon = {lang: en_pairs(lang) for lang in LANGS}
    groups: list[tuple[str, list[tuple[str, str, str, str]]]] = []
    for lang in LANGS:
        rows = [("en", en, lang, w) for en, _, w in lexicon[lang]]
        rows = sorted(set(rows))
        groups.append((f"en-{lang}", rng.sample(rows, min(CAP, len(rows)))))
    for a, b in CROSS:
        by_sense: dict[tuple[str, str], list[str]] = {}
        for en, sense, w in lexicon[b]:
            by_sense.setdefault((en, sense), []).append(w)
        rows = sorted({(a, wa, b, wb) for en, sense, wa in lexicon[a] for wb in by_sense.get((en, sense), [])})
        groups.append((f"{a}-{b}", rng.sample(rows, min(CAP, len(rows)))))

    sem = np.memmap(os.path.join(PHOTONS, "semantic-vectors.f32.bin"), dtype=np.float32, mode="r").reshape(-1, 768)
    pho = np.memmap(os.path.join(PHOTONS, "phonetic-vectors.f32.bin"), dtype=np.float32, mode="r").reshape(-1, 64)

    def cos(m, i, j) -> float:
        u, v = np.asarray(m[i], dtype=np.float64), np.asarray(m[j], dtype=np.float64)
        nu, nv = np.linalg.norm(u), np.linalg.norm(v)
        return float(u @ v / (nu * nv)) if nu > 0 and nv > 0 else float("nan")

    cols: dict[str, list] = {k: [] for k in ("group", "M", "P", "S", "letter", "affix", "ngram", "cognate", "inherited")}
    for gid, (name, rows) in enumerate(groups):
        for la, wa, lb, wb in rows:
            pa, pb = photon(la, wa), photon(lb, wb)
            m = cos(sem, pa[0], pb[0])
            p = cos(pho, pa[1], pb[1]) if pa[2] and pb[2] and pa[1] is not None and pb[1] is not None else float("nan")
            ra, rb = roman(la, wa), roman(lb, wb)
            if ra and rb:
                s = 1 - lev(ra, rb) / max(len(ra), len(rb))
                letter, affix, ngram = subword(ra, rb)
            else:
                s = letter = affix = ngram = float("nan")
            if has_etym(la, wa) and has_etym(lb, wb):
                c = float(bool(ancestors(la, wa) & ancestors(lb, wb)))
                h = float(bool(ancestors(la, wa, False) & ancestors(lb, wb, False)))
            else:
                c = h = float("nan")
            for k, v in zip(cols, (gid, m, p, s, letter, affix, ngram, c, h)):
                cols[k].append(v)
        print(name, len(rows), flush=True)
    np.savez_compressed(
        OUT,
        names=np.array([g[0] for g in groups]),
        **{k: np.array(v, dtype=np.int32 if k == "group" else np.float64) for k, v in cols.items()},
    )
    print(json.dumps({"pairs": len(cols["M"])}))


if __name__ == "__main__":
    main()
