#!/usr/bin/env python3
"""Fill photons_full.phonetic (64-d) for every row with an IPA, using the
deterministic IPA->articulatory featurizer from phonetic_build.py. CPU-only,
resumable (WHERE phonetic IS NULL AND ipa present)."""
import os, sys, time
import psycopg2
from psycopg2.extras import execute_values

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from phonetic_build import phonetic_vector  # noqa: E402

DSN = dict(host="127.0.0.1", port=5433, user="bucket", password="bucket", dbname="polingual")
BATCH = 20000

def log(*a): print("[phonetic]", *a, flush=True)

def main():
    rconn = psycopg2.connect(**DSN)
    wconn = psycopg2.connect(**DSN); wconn.autocommit = True; wcur = wconn.cursor()
    with rconn.cursor() as c0:
        c0.execute("SELECT count(*) FROM photons_full WHERE phonetic IS NULL "
                   "AND ipa IS NOT NULL AND ipa <> ''")
        total = c0.fetchone()[0]
    log("rows with IPA needing phonetic:", total)
    cur = rconn.cursor(name="pho_stream"); cur.itersize = BATCH
    cur.execute("SELECT id, ipa FROM photons_full WHERE phonetic IS NULL "
                "AND ipa IS NOT NULL AND ipa <> ''")
    done = 0; skip = 0; t0 = time.time(); tlog = t0
    while True:
        chunk = cur.fetchmany(BATCH)
        if not chunk: break
        vals = []
        for pid, ipa in chunk:
            v = phonetic_vector(ipa)
            if v is None:
                skip += 1; continue
            vals.append((pid, "[" + ",".join(f"{x:.6g}" for x in v.tolist()) + "]"))
        if vals:
            execute_values(wcur,
                "UPDATE photons_full p SET phonetic = v.vec::vector "
                "FROM (VALUES %s) AS v(id, vec) WHERE p.id = v.id",
                vals, page_size=BATCH)
        done += len(chunk)
        if time.time() - tlog > 30:
            log(f"{done}/{total} ({100*done/max(total,1):.1f}%) skip={skip}")
            tlog = time.time()
    cur.close(); rconn.close(); wconn.close()
    log(f"DONE {done} processed, {skip} no-usable-ipa, in {(time.time()-t0)/60:.1f}min")

if __name__ == "__main__":
    main()
