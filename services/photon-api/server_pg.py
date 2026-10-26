#!/usr/bin/env python3
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

STATEMENT_TIMEOUT_MS = int(os.environ.get("POLINGUAL_STATEMENT_TIMEOUT_MS", "3000"))
MAX_K = 50
MAX_TERMS = 5
MAX_QUERY_CHARS = 100
MAX_IPA_CHARS = 64
MAX_TARGETS = 29
IPA_STRIP = "/[]ˈˌ.ː "
IPA_NORM = f"translate(coalesce(ipa,''), '{IPA_STRIP}', '')"

INDEX_DDL = [
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    f"CREATE INDEX IF NOT EXISTS {TABLE}_meaning_trgm ON {TABLE} USING gin (lower(meaning_en) gin_trgm_ops)",
    f"CREATE INDEX IF NOT EXISTS {TABLE}_ipa_norm_trgm ON {TABLE} USING gin (({IPA_NORM}) gin_trgm_ops) WHERE ipa IS NOT NULL",
]

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

@contextmanager
def txn(similarity=None):
    conn = pool.getconn()
    try:
        conn.autocommit = False
        c = conn.cursor()
        try:
            c.execute("SET LOCAL statement_timeout = %s", (STATEMENT_TIMEOUT_MS,))
            if similarity is not None:
                c.execute("SET LOCAL pg_trgm.similarity_threshold = %s", (similarity,))
            yield c
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            c.close()
    finally:
        conn.autocommit = True
        pool.putconn(conn)

def ensure_indexes():
    with cur() as c:
        for ddl in INDEX_DDL:
            c.execute(ddl)

def _cap_k(k):
    return min(max(int(k), 1), MAX_K)

app = FastAPI(title="Polingual Photon API (pgvector)", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "OPTIONS"],
                   allow_headers=["*"], max_age=86400)

from psycopg2.errors import QueryCanceled  # noqa: E402

@app.exception_handler(QueryCanceled)
def _query_timeout(request: Request, exc: QueryCanceled):
    return JSONResponse({"error": "query_timeout", "timeout_ms": STATEMENT_TIMEOUT_MS}, status_code=503)

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
        with txn() as c:
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
        with txn() as c:
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
        with txn() as c:
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
        with txn(similarity=0.3) as c:
            q = (f"SELECT {COLS}, similarity(lower(surface), %s) AS score FROM {TABLE} "
                 f"WHERE lower(surface) %% %s AND lower(surface) <> %s")
            args = [sl, sl, sl]
            if lang: q += " AND lang=%s"; args.append(lang)
            q += " ORDER BY score DESC LIMIT %s"; args.append(min(max(k,1),50))
            c.execute(q, args)
            return {"query": surface, "lang": lang, "results": _rows(c), "axis": "spelling"}
    return timed(go)

@app.get("/etymology")
def api_etymology(surface: str, lang: str = "en"):
    def go():
        with txn() as c:
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
    def go():
        with txn() as c:
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


FAVORITE_LANGS = [c.strip() for c in os.environ.get(
    "POLINGUAL_FAVORITES", "es,fr,de,it,pt,ja,zh,ar,he,ru").split(",") if c.strip()]

@app.on_event("startup")
def _startup():
    if os.environ.get("POLINGUAL_ENSURE_INDEXES", "1") == "1":
        ensure_indexes()

def _known_langs(c):
    c.execute(f"SELECT array_agg(DISTINCT lang ORDER BY lang) FROM {TABLE}")
    return c.fetchone()[0] or []

def resolve_targets(known, to, frm):
    if not to or to == "favorites":
        wanted = FAVORITE_LANGS
    elif to == "all":
        wanted = known
    else:
        wanted = [x.strip() for x in to.split(",") if x.strip()]
    ks = set(known)
    return [x for x in dict.fromkeys(wanted) if x in ks and x != frm][:MAX_TARGETS]

def meaning_terms(q):
    return [t.replace("%", "").replace("_", "") for t in (q or "").lower()[:MAX_QUERY_CHARS].split()
            if t.replace("%", "").replace("_", "")][:MAX_TERMS]

def ipa_key(ipa):
    return "".join(ch for ch in (ipa or "")[:MAX_IPA_CHARS] if ch not in IPA_STRIP)

@app.get("/translate/many")
def api_translate_many(surface: str, to: str | None = None,
                       frm: str = Query("en", alias="from"), k: int = 3):
    def go():
        with txn() as c:
            known = _known_langs(c)
            qv = _qvec(c, surface, frm, "embedding")
            if not qv:
                return {"error": f"{surface!r} not found in {frm}", "found": False,
                        "word": surface, "from": frm, "translations": []}
            qid, vtxt = qv
            rows = []
            for lang in resolve_targets(known, to, frm):
                c.execute(f"SELECT {COLS}, 1-(embedding <=> %s::vector) AS score FROM {TABLE} "
                          f"WHERE embedding IS NOT NULL AND lang=%s AND id<>%s "
                          f"ORDER BY embedding <=> %s::vector LIMIT %s",
                          (vtxt, lang, qid, vtxt, min(max(k, 1), 10)))
                res = _rows(c)
                rows.append({"lang": lang, "match": "semantic" if res else "none",
                             "results": res})
            scope = "all" if to == "all" else ("favorites" if not to or to == "favorites" else "custom")
            return {"axis": "translate_many", "found": True, "word": surface, "from": frm,
                    "scope": scope, "available_langs": known, "translations": rows,
                    "provenance": PROV}
    return timed(go)

@app.get("/search/meaning")
def api_meaning(q: str, lang: str | None = None, k: int = 10):
    def go():
        terms = meaning_terms(q)
        if not terms:
            return {"query": q, "lang": lang, "results": [], "axis": "meaning"}
        with txn() as c:
            where = " AND ".join(["lower(meaning_en) LIKE %s"] * len(terms))
            args = [f"%{t}%" for t in terms]
            sql = (f"SELECT {COLS}, 1.0/(1+length(meaning_en)/80.0) AS score FROM {TABLE} "
                   f"WHERE {where}")
            if lang: sql += " AND lang=%s"; args.append(lang)
            sql += " ORDER BY score DESC, surface LIMIT %s"; args.append(_cap_k(k))
            c.execute(sql, args)
            return {"query": q, "lang": lang, "results": _rows(c), "axis": "meaning"}
    return timed(go)

@app.get("/search/phonetic")
def api_phonetic_search(ipa: str, lang: str | None = None, k: int = 10):
    def go():
        key = ipa_key(ipa)
        if not key:
            return {"query": ipa, "lang": lang, "results": [], "axis": "phonetic_search"}
        with txn(similarity=0.3) as c:
            sql = (f"SELECT {COLS}, similarity({IPA_NORM}, %s) AS score FROM {TABLE} "
                   f"WHERE ipa IS NOT NULL AND {IPA_NORM} %% %s")
            args = [key, key]
            if lang: sql += " AND lang=%s"; args.append(lang)
            sql += " ORDER BY score DESC LIMIT %s"; args.append(_cap_k(k))
            c.execute(sql, args)
            return {"query": ipa, "lang": lang, "results": _rows(c, "similarity"),
                    "axis": "phonetic_search"}
    return timed(go)
