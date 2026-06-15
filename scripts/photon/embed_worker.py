#!/usr/bin/env python3
"""Parallel CPU embed worker — runs ALONGSIDE the main GPU embed_full.py without
pausing it. Each worker owns a disjoint hash partition of the still-NULL rows and
scans DESC (the main job scans ASC), so they fill from opposite ends and barely
overlap. Resumable. Stop them once NULL count hits 0.

  embed_worker.py --slots 4 --slot 0 [--order desc] [--threads 3]
"""
import os, sys, time, argparse

ap = argparse.ArgumentParser()
ap.add_argument("--slots", type=int, required=True)
ap.add_argument("--slot", type=int, required=True)
ap.add_argument("--order", default="desc", choices=["asc", "desc"])
ap.add_argument("--threads", type=int, default=3)
ap.add_argument("--batch", type=int, default=2048)
A = ap.parse_args()

# force CPU + bound threads BEFORE importing torch (GPU VRAM is full)
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["HIP_VISIBLE_DEVICES"] = ""
os.environ["OMP_NUM_THREADS"] = str(A.threads)
os.environ["MKL_NUM_THREADS"] = str(A.threads)

import psycopg2
from psycopg2.extras import execute_values

DSN = dict(host="127.0.0.1", port=5433, user="bucket", password="bucket", dbname="polingual")

def log(*a): print(f"[w{A.slot}]", *a, flush=True)

def main():
    import torch; torch.set_num_threads(A.threads)
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("sentence-transformers/LaBSE", device="cpu")
    log("cpu model loaded, threads", A.threads)

    rconn = psycopg2.connect(**DSN)
    wconn = psycopg2.connect(**DSN); wconn.autocommit = True; wcur = wconn.cursor()
    direction = "DESC" if A.order == "desc" else "ASC"
    cur = rconn.cursor(name=f"w{A.slot}_stream"); cur.itersize = A.batch
    cur.execute(
        "SELECT id, coalesce(nullif(meaning_en,''), surface) FROM photons_full "
        "WHERE embedding IS NULL AND mod(abs(hashtext(id)), %s) = %s "
        f"ORDER BY id {direction}", (A.slots, A.slot))
    done = 0; t0 = time.time(); tlog = t0
    while True:
        chunk = cur.fetchmany(A.batch)
        if not chunk: break
        ids = [r[0] for r in chunk]; texts = [r[1] or "" for r in chunk]
        emb = model.encode(texts, batch_size=128, normalize_embeddings=True,
                           show_progress_bar=False, convert_to_numpy=True)
        vals = [(ids[i], "[" + ",".join(f"{x:.6g}" for x in emb[i].tolist()) + "]")
                for i in range(len(ids))]
        execute_values(wcur,
            "UPDATE photons_full p SET embedding = v.emb::vector "
            "FROM (VALUES %s) AS v(id, emb) WHERE p.id = v.id AND p.embedding IS NULL",
            vals, page_size=A.batch)
        done += len(ids)
        if time.time() - tlog > 30:
            log(f"{done} done  {done/(time.time()-t0):.0f}/s")
            tlog = time.time()
    cur.close(); rconn.close(); wconn.close()
    log(f"DONE {done} in {(time.time()-t0)/60:.1f}min")

if __name__ == "__main__":
    main()
