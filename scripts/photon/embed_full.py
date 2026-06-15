#!/usr/bin/env python3
"""Embed every photons_full row that still lacks a semantic vector, on the local
GPU, and write the LaBSE-768 vector back. Resumable: operates on WHERE embedding
IS NULL via a server-side cursor, so a re-run continues where it stopped.

Run in the background; build the HNSW index separately once this reaches 0 NULLs.
"""
import os, sys, time
import numpy as np
import psycopg2
from psycopg2.extras import execute_values

DIM = 768
BATCH_READ = 8192          # rows pulled from the cursor per round
ENC_BATCH = 256            # GPU encode batch
DSN = dict(host="127.0.0.1", port=5433, user="bucket", password="bucket", dbname="polingual")

def log(*a):
    print("[embed]", *a, flush=True)

def main():
    import torch
    from sentence_transformers import SentenceTransformer
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    model = SentenceTransformer("sentence-transformers/LaBSE", device=dev)
    log("device:", dev, "| model loaded")

    rconn = psycopg2.connect(**DSN)
    wconn = psycopg2.connect(**DSN); wconn.autocommit = True
    wcur = wconn.cursor()

    # total remaining (for progress %)
    with rconn.cursor() as c0:
        c0.execute("SELECT count(*) FROM photons_full WHERE embedding IS NULL")
        total = c0.fetchone()[0]
    log(f"rows to embed: {total}")
    if total == 0:
        log("nothing to do"); return

    cur = rconn.cursor(name="embed_stream")   # server-side cursor (snapshot)
    cur.itersize = BATCH_READ
    cur.execute("SELECT id, coalesce(nullif(meaning_en,''), surface) "
                "FROM photons_full WHERE embedding IS NULL ORDER BY id")

    done = 0; t0 = time.time(); tlog = t0
    while True:
        chunk = cur.fetchmany(BATCH_READ)
        if not chunk:
            break
        ids = [r[0] for r in chunk]
        texts = [r[1] or "" for r in chunk]
        emb = model.encode(texts, batch_size=ENC_BATCH, normalize_embeddings=True,
                           show_progress_bar=False, convert_to_numpy=True)
        vals = [(ids[i], "[" + ",".join(f"{x:.6g}" for x in emb[i].tolist()) + "]")
                for i in range(len(ids))]
        execute_values(wcur,
            "UPDATE photons_full p SET embedding = v.emb::vector "
            "FROM (VALUES %s) AS v(id, emb) WHERE p.id = v.id",
            vals, page_size=BATCH_READ)
        done += len(ids)
        if time.time() - tlog > 30:
            rate = done / (time.time() - t0)
            eta = (total - done) / rate / 3600 if rate else 0
            log(f"{done}/{total} ({100*done/total:.1f}%)  {rate:.0f}/s  ETA {eta:.1f}h")
            tlog = time.time()
    cur.close(); rconn.close()
    log(f"DONE embedded {done} in {(time.time()-t0)/3600:.2f}h")

    # sanity
    with wconn.cursor() as c:
        c.execute("SELECT count(*) FROM photons_full WHERE embedding IS NULL")
        log("remaining NULL embeddings:", c.fetchone()[0])
    wconn.close()

if __name__ == "__main__":
    main()
