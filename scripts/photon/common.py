"""
common.py, shared helpers for the Polingual photon vector backbone.

Photon substrate lives at _intake/photons/:
 index.sqlite table `photons` (45,000 rows), cols incl.
 surface, lang, meaning_en, pos, ipa,
 semantic_row, phonetic_row, payload
 semantic-vectors.f32.bin N x SEM_DIM dense L2-normalized matrix
 phonetic-vectors.f32.bin N x PHON_DIM dense L2-normalized matrix

Both vector matrices are row-aligned memmaps: a photon's `semantic_row` /
`phonetic_row` is its row index. Cosine similarity == dot product because
every stored row is L2-normalized at write time.

Source data is Wiktionary via Kaikki (CC-BY-SA). Attribution is carried in
each photon's payload.provenance; we never store long copyrighted excerpts.

Build artifacts (the .f32.bin files and index.sqlite) are gitignored, this
module + the builders + query.py regenerate them deterministically.
"""
from __future__ import annotations

import os
import struct

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PHOTONS_DIR = os.path.join(REPO_ROOT, "_intake", "photons")

DB_PATH = os.path.join(PHOTONS_DIR, "index.sqlite")
SEMANTIC_BIN = os.path.join(PHOTONS_DIR, "semantic-vectors.f32.bin")
PHONETIC_BIN = os.path.join(PHOTONS_DIR, "phonetic-vectors.f32.bin")

SEM_DIM = 768            # sentence-transformers/LaBSE (cross-lingual, 109 langs)
PHON_DIM = 64            # IPA feature vector (see phonetic_build.py)
SEM_MODEL = "sentence-transformers/LaBSE"

FLOAT_SIZE = 4          # float32


def rows_in_bin(path: str, dim: int) -> int:
    """How many full `dim`-wide rows currently fit in the bin file."""
    if not os.path.exists(path):
        return 0
    return os.path.getsize(path) // (FLOAT_SIZE * dim)


def ensure_bin_capacity(path: str, dim: int, n_rows: int) -> None:
    """Grow (never shrink) a .f32.bin so it holds at least n_rows rows.

 New rows are zero-filled (norm 0) and treated as 'unfilled' by readers.
 Idempotent: a file already large enough is left untouched.
    """
    target = FLOAT_SIZE * dim * n_rows
    cur = os.path.getsize(path) if os.path.exists(path) else 0
    if cur >= target:
        return
    with open(path, "ab") as f:
        f.write(b"\x00" * (target - cur))


def write_row(path: str, dim: int, row: int, vec) -> None:
    """Write a single `dim`-float row at index `row` (random access)."""
    with open(path, "r+b") as f:
        f.seek(FLOAT_SIZE * dim * row)
        f.write(struct.pack(f"<{dim}f", *vec))


def open_db():
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn
