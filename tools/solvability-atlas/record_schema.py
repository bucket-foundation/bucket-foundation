SCHEMA = "bucket.solvability-atlas.record/v1"
BRANCHES = {"mathematics", "physics", "chemistry", "information", "biophysics", "cosmology", "mind"}
ROLES = {"posed", "partial", "resolved", "survey"}
FORMAL = {"none", "statement", "partial", "proved"}
QUALITY = {"full", "partial", "weak", "empty"}
EMBED_WORKS = 8
TOP = {
    "schema": str, "id": str, "title": str, "statement": dict, "aliases": list, "branch": str, "level": int,
    "industries": list, "posed": int, "resolved": (int, type(None)), "history": list, "key_works": list,
    "key_works_considered": int, "key_works_dropped": dict, "activity": dict, "people": list, "organizations": list, "related": list, "repo_mentions": list,
    "formal": dict, "sources": list, "retrieved": str, "quality": dict,
}


def errors(r):
    out = []
    if not isinstance(r, dict):
        return ["record is not an object"]
    for k, t in TOP.items():
        if k not in r:
            out.append(f"missing {k}")
        elif not isinstance(r[k], t):
            out.append(f"{k} has type {type(r[k]).__name__}")
    if out:
        return out
    if r["schema"] != SCHEMA:
        out.append(f"schema is {r['schema']}")
    if r["branch"] not in BRANCHES:
        out.append(f"branch {r['branch']}")
    if not 1 <= r["level"] <= 5:
        out.append(f"level {r['level']}")
    if r["resolved"] is not None and r["resolved"] < r["posed"]:
        out.append("resolved before posed")
    st = r["statement"]
    out += [f"statement {m}" for m in keys(st, {"text": str, "source": (str, type(None)), "licence": str, "attribution": dict})]
    if st.get("text") and st.get("source") is None:
        out.append("statement text without source")
    if isinstance(st.get("attribution"), dict):
        out += [f"statement attribution {m}" for m in keys(st["attribution"], {"title": str, "url": str})]
    for i, e in enumerate(r["history"]):
        out += [f"history[{i}] {m}" for m in keys(e, {"year": int, "event": str, "source": str})]
    for i, w in enumerate(r["key_works"]):
        out += [f"key_works[{i}] {m}" for m in keys(w, {"openalex": str, "title": str, "year": (int, type(None)), "cited_by_count": int, "doi": (str, type(None)), "role": str, "relevance": int, "in_embedding": bool, "source": str})]
        if isinstance(w, dict) and w.get("role") not in ROLES:
            out.append(f"key_works[{i}] role {w.get('role')}")
    a = r["activity"]
    out += [f"activity {m}" for m in keys(a, {"openalex_by_year": dict, "openalex_total": int, "arxiv_total": (int, type(None)), "source": str})]
    if isinstance(a.get("openalex_by_year"), dict):
        for y, c in a["openalex_by_year"].items():
            if not (y.isdigit() and isinstance(c, int) and c >= 0):
                out.append(f"activity year {y}")
    for i, p in enumerate(r["people"]):
        out += [f"people[{i}] {m}" for m in keys(p, {"openalex": (str, type(None)), "name": str, "works": int, "source": str})]
    for i, o in enumerate(r["organizations"]):
        out += [f"organizations[{i}] {m}" for m in keys(o, {"openalex": (str, type(None)), "name": str, "works": int, "source": str})]
    for i, x in enumerate(r["related"]):
        out += [f"related[{i}] {m}" for m in keys(x, {"id": str, "why": str})]
        if isinstance(x, dict) and x.get("id") == r["id"]:
            out.append(f"related[{i}] points at itself")
    for i, m_ in enumerate(r["repo_mentions"]):
        out += [f"repo_mentions[{i}] {m}" for m in keys(m_, {"corpus": str, "id": str, "title": str, "source": str})]
    out += [f"formal {m}" for m in keys(r["formal"], {"status": str, "source": (str, type(None)), "url": (str, type(None))})]
    if r["formal"].get("status") not in FORMAL:
        out.append(f"formal status {r['formal'].get('status')}")
    if sum(1 for w in r["key_works"] if isinstance(w, dict) and w.get("in_embedding")) > EMBED_WORKS:
        out.append(f"more than {EMBED_WORKS} works marked for embedding")
    if len({k for w in r["key_works"] if isinstance(w, dict) for k in [w.get("title", "").lower()]}) != len(r["key_works"]):
        out.append("duplicate key work titles")
    out += [f"quality {m}" for m in keys(r["quality"], {"status": str, "reason": str})]
    if r["quality"].get("status") not in QUALITY:
        out.append(f"quality status {r['quality'].get('status')}")
    for s in r["sources"]:
        if isinstance(s, dict) and "mailto" in s.get("url", ""):
            out.append("source url carries a mailto address")
    for i, s in enumerate(r["sources"]):
        out += [f"sources[{i}] {m}" for m in keys(s, {"url": str, "licence": str, "retrieved": str})]
    return out


def keys(obj, spec):
    if not isinstance(obj, dict):
        return ["is not an object"]
    out = []
    for k, t in spec.items():
        if k not in obj:
            out.append(f"missing {k}")
        elif not isinstance(obj[k], t):
            out.append(f"{k} has type {type(obj[k]).__name__}")
    return out


def validate(r):
    e = errors(r)
    if e:
        raise ValueError("; ".join(e))
    return r
