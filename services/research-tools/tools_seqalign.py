#!/usr/bin/env python3
from __future__ import annotations

import re
from typing import Optional

_B62_ORDER = "ARNDCQEGHILKMFPSTWYVBZX*"
_B62_ROWS = [
    [ 4, -1, -2, -2,  0, -1, -1,  0, -2, -1, -1, -1, -1, -2, -1,  1,  0, -3, -2,  0, -2, -1,  0, -4],
    [-1,  5,  0, -2, -3,  1,  0, -2,  0, -3, -2,  2, -1, -3, -2, -1, -1, -3, -2, -3, -1,  0, -1, -4],
    [-2,  0,  6,  1, -3,  0,  0,  0,  1, -3, -3,  0, -2, -3, -2,  1,  0, -4, -2, -3,  3,  0, -1, -4],
    [-2, -2,  1,  6, -3,  0,  2, -1, -1, -3, -4, -1, -3, -3, -1,  0, -1, -4, -3, -3,  4,  1, -1, -4],
    [ 0, -3, -3, -3,  9, -3, -4, -3, -3, -1, -1, -3, -1, -2, -3, -1, -1, -2, -2, -1, -3, -3, -2, -4],
    [-1,  1,  0,  0, -3,  5,  2, -2,  0, -3, -2,  1,  0, -3, -1,  0, -1, -2, -1, -2,  0,  3, -1, -4],
    [-1,  0,  0,  2, -4,  2,  5, -2,  0, -3, -3,  1, -2, -3, -1,  0, -1, -3, -2, -2,  1,  4, -1, -4],
    [ 0, -2,  0, -1, -3, -2, -2,  6, -2, -4, -4, -2, -3, -3, -2,  0, -2, -2, -3, -3, -1, -2, -1, -4],
    [-2,  0,  1, -1, -3,  0,  0, -2,  8, -3, -3, -1, -2, -1, -2, -1, -2, -2,  2, -3,  0,  0, -1, -4],
    [-1, -3, -3, -3, -1, -3, -3, -4, -3,  4,  2, -3,  1,  0, -3, -2, -1, -3, -1,  3, -3, -3, -1, -4],
    [-1, -2, -3, -4, -1, -2, -3, -4, -3,  2,  4, -2,  2,  0, -3, -2, -1, -2, -1,  1, -4, -3, -1, -4],
    [-1,  2,  0, -1, -3,  1,  1, -2, -1, -3, -2,  5, -1, -3, -1,  0, -1, -3, -2, -2,  0,  1, -1, -4],
    [-1, -1, -2, -3, -1,  0, -2, -3, -2,  1,  2, -1,  5,  0, -2, -1, -1, -1, -1,  1, -3, -1, -1, -4],
    [-2, -3, -3, -3, -2, -3, -3, -3, -1,  0,  0, -3,  0,  6, -4, -2, -2,  1,  3, -1, -3, -3, -1, -4],
    [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4,  7, -1, -1, -4, -3, -2, -2, -1, -2, -4],
    [ 1, -1,  1,  0, -1,  0,  0,  0, -1, -2, -2,  0, -1, -2, -1,  4,  1, -3, -2, -2,  0,  0,  0, -4],
    [ 0, -1,  0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1,  1,  5, -2, -2,  0, -1, -1,  0, -4],
    [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1,  1, -4, -3, -2, 11,  2, -3, -4, -3, -2, -4],
    [-2, -2, -2, -3, -2, -1, -2, -3,  2, -1, -1, -2, -1,  3, -3, -2, -2,  2,  7, -1, -3, -2, -1, -4],
    [ 0, -3, -3, -3, -1, -2, -2, -3, -3,  3,  1, -2,  1, -1, -2, -2,  0, -3, -1,  4, -3, -2, -1, -4],
    [-2, -1,  3,  4, -3,  0,  1, -1,  0, -3, -4,  0, -3, -3, -2,  0, -1, -4, -3, -3,  4,  1, -1, -4],
    [-1,  0,  0,  1, -3,  3,  4, -2,  0, -3, -3,  1, -1, -3, -1,  0, -1, -3, -2, -2,  1,  4, -1, -4],
    [ 0, -1, -1, -1, -2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -2,  0,  0, -2, -1, -1, -1, -1, -1, -4],
    [-4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4,  1],
]
_B62_INDEX = {c: i for i, c in enumerate(_B62_ORDER)}
BLOSUM62: dict[tuple[str, str], int] = {}
for _i, _a in enumerate(_B62_ORDER):
    for _j, _b in enumerate(_B62_ORDER):
        BLOSUM62[(_a, _b)] = _B62_ROWS[_i][_j]

def _clean(s: Optional[str]) -> str:
    s = (s or "").strip()
    if s.startswith(">"):
        s = "".join(s.splitlines()[1:])
    return re.sub(r"[^A-Za-z*]", "", s).upper()

def _score_fn(matrix: str, match: int, mismatch: int):
    if matrix == "blosum62":
        def s(a: str, b: str) -> int:
            v = BLOSUM62.get((a, b))
            if v is None:
                v = BLOSUM62.get((a, "X"), BLOSUM62.get(("X", b), mismatch))
            return int(v)
        return s
    def s(a: str, b: str) -> int:
        return match if a == b else mismatch
    return s

def needleman_wunsch(a: str, b: str, score, gap: int):
    m, n = len(a), len(b)
    H = [[0] * (n + 1) for _ in range(m + 1)]
    T = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        H[i][0] = i * gap
        T[i][0] = 1
    for j in range(1, n + 1):
        H[0][j] = j * gap
        T[0][j] = 2
    for i in range(1, m + 1):
        ai = a[i - 1]
        for j in range(1, n + 1):
            diag = H[i - 1][j - 1] + score(ai, b[j - 1])
            up = H[i - 1][j] + gap
            left = H[i][j - 1] + gap
            best = diag
            ptr = 0
            if up > best:
                best, ptr = up, 1
            if left > best:
                best, ptr = left, 2
            H[i][j] = best
            T[i][j] = ptr
    i, j = m, n
    al_a, al_b = [], []
    while i > 0 or j > 0:
        ptr = T[i][j]
        if i > 0 and j > 0 and ptr == 0:
            al_a.append(a[i - 1]); al_b.append(b[j - 1]); i -= 1; j -= 1
        elif i > 0 and (ptr == 1 or j == 0):
            al_a.append(a[i - 1]); al_b.append("-"); i -= 1
        else:
            al_a.append("-"); al_b.append(b[j - 1]); j -= 1
    return "".join(reversed(al_a)), "".join(reversed(al_b)), H[m][n]

def smith_waterman(a: str, b: str, score, gap: int):
    m, n = len(a), len(b)
    H = [[0] * (n + 1) for _ in range(m + 1)]
    T = [[0] * (n + 1) for _ in range(m + 1)]
    best_val, best_i, best_j = 0, 0, 0
    for i in range(1, m + 1):
        ai = a[i - 1]
        for j in range(1, n + 1):
            diag = H[i - 1][j - 1] + score(ai, b[j - 1])
            up = H[i - 1][j] + gap
            left = H[i][j - 1] + gap
            best = 0
            ptr = 0
            if diag > best:
                best, ptr = diag, 1
            if up > best:
                best, ptr = up, 2
            if left > best:
                best, ptr = left, 3
            H[i][j] = best
            T[i][j] = ptr
            if best > best_val:
                best_val, best_i, best_j = best, i, j
    i, j = best_i, best_j
    al_a, al_b = [], []
    while i > 0 and j > 0 and T[i][j] != 0:
        ptr = T[i][j]
        if ptr == 1:
            al_a.append(a[i - 1]); al_b.append(b[j - 1]); i -= 1; j -= 1
        elif ptr == 2:
            al_a.append(a[i - 1]); al_b.append("-"); i -= 1
        else:
            al_a.append("-"); al_b.append(b[j - 1]); j -= 1
    return "".join(reversed(al_a)), "".join(reversed(al_b)), best_val

def _alignment_stats(al_a: str, al_b: str) -> dict:
    matches = mismatches = gaps = 0
    for x, y in zip(al_a, al_b):
        if x == "-" or y == "-":
            gaps += 1
        elif x == y:
            matches += 1
        else:
            mismatches += 1
    length = len(al_a)
    aligned_cols = matches + mismatches
    pid = (100.0 * matches / aligned_cols) if aligned_cols else 0.0
    return {
        "alignment_length": length,
        "matches": matches,
        "mismatches": mismatches,
        "gaps": gaps,
        "percent_identity": round(pid, 2),
    }

def _looks_protein(s: str) -> bool:
    return bool(set(s) - set("ACGTUN"))

def run_seqalign(payload: dict) -> dict:
    raw_a = payload.get("seq_a")
    demo = isinstance(raw_a, str) and raw_a.strip().lower() == "demo"

    if demo:
        seq_a = "HEAGAWGHEE"
        seq_b = "PAWHEAE"
        mode = "global"
        matrix = "blosum62"
    else:
        seq_a = _clean(raw_a)
        seq_b = _clean(payload.get("seq_b"))
        if len(seq_a) < 1 or len(seq_b) < 1:
            return {"error": 'provide two sequences (seq_a, seq_b), or "demo"'}
        if len(seq_a) > 3000 or len(seq_b) > 3000:
            return {"error": "sequences too long (max 3000 residues each for the exact DP)"}
        mode = (payload.get("mode") or "global").strip().lower()
        if mode not in ("global", "local"):
            return {"error": 'mode must be "global" or "local"'}
        matrix = (payload.get("matrix") or "auto").strip().lower()
        if matrix == "auto":
            matrix = "blosum62" if (_looks_protein(seq_a) or _looks_protein(seq_b)) else "identity"
        if matrix not in ("blosum62", "identity"):
            return {"error": 'matrix must be "blosum62", "identity", or "auto"'}

    try:
        match = int(payload.get("match", 1))
        mismatch = int(payload.get("mismatch", -1))
    except Exception:
        match, mismatch = 1, -1
    default_gap = -10 if matrix == "blosum62" else -1
    try:
        gap = int(payload.get("gap")) if payload.get("gap") is not None else default_gap
    except Exception:
        gap = default_gap
    if gap > 0:
        gap = -gap

    score = _score_fn(matrix, match, mismatch)
    if mode == "global":
        al_a, al_b, sc = needleman_wunsch(seq_a, seq_b, score, gap)
    else:
        al_a, al_b, sc = smith_waterman(seq_a, seq_b, score, gap)

    stats = _alignment_stats(al_a, al_b)
    midline = []
    for x, y in zip(al_a, al_b):
        if x == "-" or y == "-":
            midline.append(" ")
        elif x == y:
            midline.append("|")
        elif matrix == "blosum62" and BLOSUM62.get((x, y), -1) > 0:
            midline.append(":")
        else:
            midline.append(".")
    out = {
        "demo": demo,
        "mode": mode,
        "algorithm": "Needleman-Wunsch (global)" if mode == "global" else "Smith-Waterman (local)",
        "matrix": matrix,
        "gap_penalty": gap,
        "seq_a_length": len(seq_a),
        "seq_b_length": len(seq_b),
        "score": int(sc),
        "aligned_a": al_a,
        "aligned_b": al_b,
        "midline": "".join(midline),
        **stats,
        "method": (
            "Exact dynamic programming. Global = Needleman-Wunsch (1970): "
            "full-length DP with linear gap penalty and a traceback from the "
            "bottom-right cell. Local = Smith-Waterman (1981): the same "
            "recurrence clamped at 0, traceback from the matrix maximum. Protein "
            "scoring uses the real BLOSUM62 matrix (Henikoff & Henikoff 1992); "
            "nucleotide scoring uses an identity matrix. CPU-only, no heuristics."
        ),
        "note": (
            "Field tool for biomed-bio (the largest field): pairwise alignment is "
            "the bedrock of every sequence pipeline. This is the exact optimal "
            "alignment (not a BLAST/minimap heuristic), so it is O(m·n), capped at "
            "3000 residues per sequence. Multiple alignment + affine (open/extend) "
            "gap penalties are a documented follow-up."
        ),
    }
    if demo:
        out["note"] = (
            "DEMO: HEAGAWGHEE vs PAWHEAE, the classic Durbin et al. global "
            "alignment example, scored with BLOSUM62. " + out["note"]
        )
    return out

SEQALIGN_RUNNERS = {
    "seqalign": run_seqalign,
}
