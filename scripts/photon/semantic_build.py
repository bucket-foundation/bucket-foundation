#!/usr/bin/env python3
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

    cur = conn.execute("SELECT MAX(rowid) FROM photons")
    max_row = cur.fetchone()[0]

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

    mm = np.memmap(SEMANTIC_BIN, dtype="float32", mode="r")

    todo = []
    for rowid, pid, meaning, surface, sem_row in photons:
        idx = rowid - 1
        already = (sem_row is not None and sem_row == idx
                   and idx * SEM_DIM < mm.shape[0]
                   and bin_norm(mm, idx) > 0.5)
        if already:
            continue
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
