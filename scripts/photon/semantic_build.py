#!/usr/bin/env python3
"""
semantic_build.py, semantic vectors for every photon (cross-lingual, 768-d LaBSE).

Embeds **"surface: primary-sense gloss"** (the dominant sense `meaning_en` from
ingest_cache.py, superseding the old ` · `-joined all-senses blob) with **sentence-
transformers/LaBSE** (768-d, Apache-2.0, purpose-built cross-lingual over 109
languages). "light"/"luz"/"lumière"/"Licht" land together by meaning, which is
what the translate / semantic axes need across the 27 languages.

The "surface: " prefix is load-bearing: LaBSE knows luz/Licht/amor/愛 as tokens,
so pairing the foreign surface with the English gloss pulls true translations
together far harder than the gloss alone (measured: light↔Licht 0.53→0.80,
love↔Liebe 0.19→0.64). The gloss anchors meaning; the surface anchors the word.

 - Writes _intake/photons/semantic-vectors.f32.bin (row-aligned, 768-d, L2-norm).
 - Sets photons.semantic_row = stable row index for every photon.
 - Idempotent + resumable: a row whose vector is already non-zero AND whose
 semantic_row is set is skipped. A dim change (384→768) makes every old row
 read as zero-norm, so the default run cleanly rebuilds the whole 768-d space.
 - CPU by default (the ROCm path has hung on long ST loops); pass --gpu to try
 the GPU. LaBSE is heavier, budget ~20-40 min for 45k on CPU.

Run: python3 scripts/photon/semantic_build.py # rebuild all, CPU
 python3 scripts/photon/semantic_build.py --limit 500
 python3 scripts/photon/semantic_build.py --only-missing
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import (  # noqa: E402
    DB_PATH, SEMANTIC_BIN, SEM_DIM, SEM_MODEL, FLOAT_SIZE,
    ensure_bin_capacity, open_db,
)

BATCH = 256


def fetch_photons(conn, only_missing: bool):
    cur = conn.cursor()
    # rowid gives a stable, dense ordering we reuse as the vector row index.
    if only_missing:
        cur.execute(
            "SELECT rowid, id, meaning_en, surface, semantic_row "
            "FROM photons WHERE semantic_row IS NULL ORDER BY rowid"
        )
    else:
        cur.execute(
            "SELECT rowid, id, meaning_en, surface, semantic_row "
            "FROM photons ORDER BY rowid"
        )
    return cur.fetchall()


def load_model(use_gpu: bool):
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    if not use_gpu:
        # hard-disable any accelerator so the loop can't touch ROCm
        os.environ["CUDA_VISIBLE_DEVICES"] = ""
        os.environ["HIP_VISIBLE_DEVICES"] = ""
    from sentence_transformers import SentenceTransformer
    device = "cuda" if use_gpu else "cpu"
    t = time.time()
    model = SentenceTransformer(SEM_MODEL, device=device)
    print(f"[semantic] loaded {SEM_MODEL} on {device} in {time.time()-t:.1f}s", flush=True)
    return model


def bin_norm(mm, row: int) -> float:
    v = mm[row * SEM_DIM:(row + 1) * SEM_DIM]
    return float(np.linalg.norm(v))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="cap rows (debug)")
    ap.add_argument("--only-missing", action="store_true",
                    help="only fill photons whose semantic_row IS NULL")
    ap.add_argument("--gpu", action="store_true", help="try GPU (ROCm) first")
    args = ap.parse_args()

    conn = open_db()
    photons = fetch_photons(conn, args.only_missing)
    if args.limit:
        photons = photons[:args.limit]
    if not photons:
        print("[semantic] nothing to do.")
        return 0

    # Capacity = max rowid we will touch (rowid is 1-based; store at rowid-1).
    cur = conn.execute("SELECT MAX(rowid) FROM photons")
    max_row = cur.fetchone()[0]

    # Dimensionality guard: the bin holds SEM_DIM floats/row. An old file written
    # at a DIFFERENT dim (e.g. the 384-d MiniLM space) is garbage under the new
    # 768-d LaBSE geometry. Unless we're resuming a same-dim fill (--only-missing),
    # start the bin fresh so we never mix dims.
    bin_real = os.path.realpath(SEMANTIC_BIN)
    if not args.only_missing and os.path.exists(bin_real):
        os.remove(bin_real)
        print(f"[semantic] removed stale bin (dim change -> {SEM_DIM}-d rebuild)", flush=True)
    if os.path.exists(SEMANTIC_BIN):
        sz = os.path.getsize(SEMANTIC_BIN)
        if sz % (FLOAT_SIZE * SEM_DIM) != 0:
            os.remove(os.path.realpath(SEMANTIC_BIN))
            print("[semantic] bin size not a multiple of SEM_DIM — reset", flush=True)
    ensure_bin_capacity(SEMANTIC_BIN, SEM_DIM, max_row)

    # Resume map: which rows already have a non-zero vector on disk.
    mm = np.memmap(SEMANTIC_BIN, dtype="float32", mode="r")

    todo = []
    for rowid, pid, meaning, surface, sem_row in photons:
        idx = rowid - 1
        already = (sem_row is not None and sem_row == idx
                   and idx * SEM_DIM < mm.shape[0]
                   and bin_norm(mm, idx) > 0.5)
        if already:
            continue
        # Embed "surface: primary-gloss". The surface token anchors the
        # cross-lingual signal, LaBSE knows luz/Licht/amor/愛 as tokens, so
        # pairing them with the English primary gloss pulls true translations
        # together MUCH harder than the gloss alone (measured: light↔Licht
        # 0.53→0.80, love↔Liebe 0.19→0.64).
        s = (surface or "").strip()
        g = (meaning or "").strip()
        text = f"{s}: {g}" if (s and g) else (g or s)
        todo.append((idx, pid, text))

    del mm
    print(f"[semantic] {len(photons)} candidates, {len(todo)} to embed", flush=True)
    if not todo:
        conn.close()
        return 0

    model = load_model(args.gpu)

    t0 = time.time()
    done = 0
    fh = open(SEMANTIC_BIN, "r+b")
    upd = conn.cursor()
    for b in range(0, len(todo), BATCH):
        chunk = todo[b:b + BATCH]
        texts = [t for (_, _, t) in chunk]
        emb = model.encode(
            texts, normalize_embeddings=True, convert_to_numpy=True,
            batch_size=BATCH, show_progress_bar=False,
        ).astype("float32")
        for (idx, pid, _), vec in zip(chunk, emb):
            fh.seek(FLOAT_SIZE * SEM_DIM * idx)
            fh.write(vec.tobytes())
            upd.execute("UPDATE photons SET semantic_row=? WHERE id=?", (idx, pid))
        conn.commit()
        done += len(chunk)
        if b // BATCH % 10 == 0 or done == len(todo):
            rate = done / max(time.time() - t0, 1e-9)
            print(f"[semantic] {done}/{len(todo)}  {rate:.0f} rows/s", flush=True)
    fh.close()
    conn.close()
    print(f"[semantic] done {done} rows in {time.time()-t0:.1f}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
