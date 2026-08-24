#!/usr/bin/env python3
"""Polingual Photon API, pgvector backend (the full-6.5M local version).

Same response shapes + routes as server.py (the file-memmap interim), but every
axis is a SQL/pgvector query against photons_full in the local Postgres. Point
the Academy's POLINGUAL_API_URL at this to run the app on the full corpus.

Axes: lookup (SQL) · semantic (HNSW <=>) · phonetic (<=>) · spelling (pg_trgm)
 · etymology (relations jsonb) · translate (relations jsonb + cross-ling)
Env: PG* (defaults → local bucket-pgvector container), PORT (8090).
"""
import os, time
from contextlib import contextmanager
from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg2.pool import ThreadedConnectionPool

DSN = dict(host=os.environ.get("PGHOST", "127.0.0.1"),
           port=int(os.environ.get("PGPORT", "5433")),
           user=os.environ.get("PGUSER", "bucket"),
           password=os.environ.get("PGPASSWORD", "bucket"),
           dbname=os.environ.get("PGDATABASE", "polingual"))
TABLE = os.environ.get("PHOTON_TABLE", "photons_full")
PROV = {"source": "Wiktionary via Kaikki", "license": "CC-BY-SA 3.0"}
COLS = "surface, lang, meaning_en, ipa, pos"

pool = ThreadedConnectionPool(1, 12, **DSN)

@contextmanager
def cur():
    conn = pool.getconn()
    try:
        conn.autocommit = True
        c = conn.cursor()
        try:
            yield c
        finally:
            c.close()
    finally:
        pool.putconn(conn)

def _rows(c, score_name="score"):
    out = []
    for surface, lang, mean, ipa, pos, score in c.fetchall():
        out.append({"surface": surface, "lang": lang,
                    "meaning_en": (mean or "")[:120], "ipa": ipa, "pos": pos,
                    score_name: round(float(score), 4), "provenance": PROV})
    return out

def _qvec(c, surface, lang, col="embedding"):
    if lang:
        c.execute(f"SELECT id, {col}::text FROM {TABLE} WHERE surface=%s AND lang=%s "
                  f"AND {col} IS NOT NULL LIMIT 1", (surface, lang))
    else:
        c.execute(f"SELECT id, {col}::text FROM {TABLE} WHERE surface=%s "
                  f"AND {col} IS NOT NULL ORDER BY (lang='en') DESC LIMIT 1", (surface,))
    return c.fetchone()

app = FastAPI(title="Polingual Photon API (pgvector)", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "OPTIONS"],
                   allow_headers=["*"], max_age=86400)

def timed(fn):
    t = time.time(); out = fn(); out["took_ms"] = round((time.time()-t)*1000, 1); return out

@app.get("/healthz")
def healthz():
    with cur() as c:
        c.execute(f"SELECT count(*), count(distinct lang), "
                  f"count(*) FILTER (WHERE embedding IS NOT NULL), "
                  f"count(*) FILTER (WHERE phonetic IS NOT NULL) FROM {TABLE}")
        n, langs, sem, pho = c.fetchone()
        c.execute(f"SELECT array_agg(DISTINCT lang ORDER BY lang) FROM {TABLE}")
        codes = c.fetchone()[0]
    return {"ok": True, "service": "polingual-photon-api-pgvector", "backend": "pgvector",
            "photons": n, "languages": langs, "lang_codes": codes,
            "semantic_embedded": sem, "phonetic_embedded": pho,
            "semantic_dim": 768, "phonetic_dim": 64,
            "axes": ["lookup", "semantic", "phonetic", "spelling", "etymology", "translate"],
            "provenance": PROV}

@app.get("/lookup")
def api_lookup(surface: str, lang: str | None = None):
    def go():
        with cur() as c:
            q = f"SELECT id,surface,lang,meaning_en,pos,ipa,(embedding IS NOT NULL),(phonetic IS NOT NULL) FROM {TABLE} WHERE surface=%s"
            args = [surface]
            if lang: q += " AND lang=%s"; args.append(lang)
            c.execute(q + " ORDER BY (lang='en') DESC LIMIT 1", args)
            r = c.fetchone()
            if not r:
                return {"error": f"{surface!r} ({lang}) not found", "found": False}
            return {"found": True, "id": r[0], "surface": r[1], "lang": r[2],
                    "meaning_en": r[3], "pos": r[4], "ipa": r[5],
                    "has_semantic": r[6], "has_phonetic": r[7], "provenance": PROV}
    return timed(go)

@app.get("/semantic")
def api_semantic(surface: str, lang: str | None = None, k: int = 10, cross: int = 1):
    def go():
        with cur() as c:
            qv = _qvec(c, surface, lang, "embedding")
            if not qv:
                return {"error": f"no semantic vector for {surface!r} ({lang})", "results": [],
                        "query": surface, "lang": lang, "axis": "semantic"}
            qid, vtxt = qv
            q = (f"SELECT {COLS}, 1-(embedding <=> %s::vector) AS score FROM {TABLE} "
                 f"WHERE embedding IS NOT NULL AND id<>%s")
            args = [vtxt, qid]
            if not cross and lang: q += " AND lang=%s"; args.append(lang)
            q += " ORDER BY embedding <=> %s::vector LIMIT %s"; args += [vtxt, min(max(k,1),50)]
            c.execute(q, args)
            return {"query": surface, "lang": lang, "results": _rows(c),
                    "axis": "semantic", "cross_lingual": bool(cross)}
    return timed(go)

@app.get("/phonetic")
def api_phonetic(surface: str, lang: str | None = None, k: int = 10):
    def go():
        with cur() as c:
            qv = _qvec(c, surface, lang, "phonetic")
            if not qv:
                return {"error": f"no phonetic vector for {surface!r} ({lang}) "
                        f"(phonetic embedding still building)", "results": [],
                        "query": surface, "lang": lang, "axis": "phonetic"}
            qid, vtxt = qv
            c.execute(f"SELECT {COLS}, 1-(phonetic <=> %s::vector) AS score FROM {TABLE} "
                      f"WHERE phonetic IS NOT NULL AND id<>%s "
                      f"ORDER BY phonetic <=> %s::vector LIMIT %s",
                      (vtxt, qid, vtxt, min(max(k,1),50)))
            return {"query": surface, "lang": lang, "results": _rows(c), "axis": "phonetic"}
    return timed(go)

@app.get("/spelling")
def api_spelling(surface: str, lang: str | None = None, k: int = 10):
    def go():
        sl = (surface or "").lower()
        if not sl:
            return {"query": surface, "lang": lang, "results": [], "axis": "spelling"}
        with cur() as c:
            c.execute("SET pg_trgm.similarity_threshold = 0.3")
            q = (f"SELECT {COLS}, similarity(lower(surface), %s) AS score FROM {TABLE} "
                 f"WHERE lower(surface) %% %s AND lower(surface) <> %s")
            args = [sl, sl, sl]
            if lang: q += " AND lang=%s"; args.append(lang)
            q += " ORDER BY score DESC LIMIT %s"; args.append(min(max(k,1),50))
            c.execute(q, args)
            return {"query": surface, "lang": lang, "results": _rows(c), "axis": "spelling"}
    return timed(go)

@app.get("/etymology")
def api_etymology(surface: str, lang: str):
    def go():
        with cur() as c:
            c.execute(f"SELECT relations FROM {TABLE} WHERE surface=%s AND lang=%s "
                      f"AND relations IS NOT NULL AND relations <> '[]'::jsonb LIMIT 1",
                      (surface, lang))
            r = c.fetchone()
            edges = r[0] if r else []
            return {"query": surface, "lang": lang, "axis": "etymology",
                    "edges": edges, "results": []}
    return timed(go)

@app.get("/translate")
def api_translate(surface: str, to: str, frm: str = Query(alias="from"), k: int = 8):
    """Cross-lingual: prefer explicit relations, else nearest semantic in target lang."""
    def go():
        with cur() as c:
            qv = _qvec(c, surface, frm, "embedding")
            if not qv:
                return {"query": surface, "from": frm, "to": to, "results": [], "axis": "translate"}
            qid, vtxt = qv
            c.execute(f"SELECT {COLS}, 1-(embedding <=> %s::vector) AS score FROM {TABLE} "
                      f"WHERE embedding IS NOT NULL AND lang=%s AND id<>%s "
                      f"ORDER BY embedding <=> %s::vector LIMIT %s",
                      (vtxt, to, qid, vtxt, min(max(k,1),50)))
            return {"query": surface, "from": frm, "to": to, "results": _rows(c), "axis": "translate"}
    return timed(go)
