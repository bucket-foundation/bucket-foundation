from __future__ import annotations

import os
import struct

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PHOTONS_DIR = os.path.join(REPO_ROOT, "_intake", "photons")

DB_PATH = os.path.join(PHOTONS_DIR, "index.sqlite")
SEMANTIC_BIN = os.path.join(PHOTONS_DIR, "semantic-vectors.f32.bin")
PHONETIC_BIN = os.path.join(PHOTONS_DIR, "phonetic-vectors.f32.bin")

SEM_DIM = 768
PHON_DIM = 64
SEM_MODEL = "sentence-transformers/LaBSE"

FLOAT_SIZE = 4

def rows_in_bin(path: str, dim: int) -> int:
    if not os.path.exists(path):
        return 0
    return os.path.getsize(path) // (FLOAT_SIZE * dim)

def ensure_bin_capacity(path: str, dim: int, n_rows: int) -> None:
    target = FLOAT_SIZE * dim * n_rows
    cur = os.path.getsize(path) if os.path.exists(path) else 0
    if cur >= target:
        return
    with open(path, "ab") as f:
        f.write(b"\x00" * (target - cur))

def write_row(path: str, dim: int, row: int, vec) -> None:
    with open(path, "r+b") as f:
        f.seek(FLOAT_SIZE * dim * row)
        f.write(struct.pack(f"<{dim}f", *vec))

def open_db():
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn
