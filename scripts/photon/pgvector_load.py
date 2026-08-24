#!/usr/bin/env python3
"""Load the local photon substrate (sqlite + memmapped LaBSE vectors) into a
local Postgres+pgvector table, build an HNSW index, and benchmark a query.

This is the LOCAL proof of the pgvector migration path, no prod box, no shared
multi-tenant DB. Run against the bucket-pgvector docker container.

Env: PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE (defaults target the container).
"""
import os, sys, time, csv, tempfile, sqlite3
import numpy as np
import psycopg2

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PH = os.path.join(REPO, "_intake", "photons")
SQLITE = os.path.join(PH, "index.sqlite")
SEMBIN = os.path.join(PH, "semantic-vectors.f32.bin")
DIM = 768

DSN = dict(host=os.environ.get("PGHOST", "127.0.0.1"),
           port=int(os.environ.get("PGPORT", "5433")),
           user=os.environ.get("PGUSER", "bucket"),
           password=os.environ.get("PGPASSWORD", "bucket"),
           dbname=os.environ.get("PGDATABASE", "polingual"))

def log(*a):
    print("[pgload]", *a, flush=True)

def main():
    t_all = time.time()
    # memmap the semantic vectors: row i == semantic_row i
    vecs = np.memmap(SEMBIN, dtype="<f4", mode="r")
    n_vec = vecs.shape[0] // DIM
    vecs = vecs.reshape(n_vec, DIM)
    log(f"memmapped {n_vec} semantic vectors x {DIM}-d")

    db = sqlite3.connect(SQLITE)
    rows = db.execute(
        "select id,surface,lang,meaning_en,pos,ipa,semantic_row "
        "from photons where semantic_row is not null order by semantic_row"
    ).fetchall()
    log(f"sqlite: {len(rows)} rows with embeddings")

    conn = psycopg2.connect(**DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    cur.execute("DROP TABLE IF EXISTS photons")
    cur.execute(f"""
 CREATE TABLE photons (
 id text PRIMARY KEY, surface text, lang text,
 meaning_en text, pos text, ipa text,
 embedding vector({DIM})
 )""")
    log("table created")

    # Write a CSV (proper quoting) then COPY, fastest reliable bulk path.
    t = time.time()
    tmp = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False,
                                      dir=PH, newline="")
    w = csv.writer(tmp)
    for (pid, surface, lang, mean, pos, ipa, srow) in rows:
        v = vecs[srow]
        vtxt = "[" + ",".join(f"{x:.6g}" for x in v.tolist()) + "]"
        w.writerow([pid, surface, lang, mean or "", pos or "", ipa or "", vtxt])
    tmp.flush(); tmp.close()
    log(f"CSV written ({os.path.getsize(tmp.name)//1024//1024} MB) in {time.time()-t:.1f}s")

    t = time.time()
    with open(tmp.name) as f:
        cur.copy_expert(
            "COPY photons (id,surface,lang,meaning_en,pos,ipa,embedding) "
            "FROM STDIN WITH (FORMAT csv)", f)
    os.unlink(tmp.name)
    cur.execute("select count(*) from photons")
    log(f"COPY loaded {cur.fetchone()[0]} rows in {time.time()-t:.1f}s")

    # HNSW index (cosine). Bump maintenance_work_mem for a faster build.
    t = time.time()
    cur.execute("SET maintenance_work_mem = '1GB'")
    cur.execute("SET max_parallel_maintenance_workers = 4")
    cur.execute("CREATE INDEX photons_emb_hnsw ON photons "
                "USING hnsw (embedding vector_cosine_ops) "
                "WITH (m=16, ef_construction=64)")
    cur.execute("CREATE INDEX photons_lang ON photons (lang)")
    log(f"HNSW index built in {time.time()-t:.1f}s")

    cur.execute("select pg_size_pretty(pg_total_relation_size('photons'))")
    log("table+index size:", cur.fetchone()[0])

    # Benchmark: cross-lingual semantic neighbors of 'entropy' (en)
    srow = db.execute("select semantic_row from photons "
                      "where surface='entropy' and lang='en'").fetchone()[0]
    qv = "[" + ",".join(f"{x:.6g}" for x in vecs[srow].tolist()) + "]"
    cur.execute("SET hnsw.ef_search = 100")
    best = 1e9
    for _ in range(5):
        t = time.time()
        cur.execute(
            "SELECT surface,lang,meaning_en, embedding <=> %s::vector AS d "
            "FROM photons ORDER BY embedding <=> %s::vector LIMIT 8",
            (qv, qv))
        res = cur.fetchall()
        best = min(best, (time.time()-t)*1000)
    log(f"query 'entropy' neighbors  (best {best:.1f}ms over 5 runs):")
    for surface, lang, mean, d in res:
        log(f"    {1-d:+.3f}  {lang:3} {surface:24} {(mean or '')[:40]}")

    log(f"TOTAL {time.time()-t_all:.1f}s")
    conn.close()

if __name__ == "__main__":
    main()
