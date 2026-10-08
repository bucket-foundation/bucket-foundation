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


ROW_SCHEMA = "bucket.solvability-atlas.records/v1"
ROW_ZONES = {"solved", "reachable", "beyond", "unsampled"}
ROW_CODINGS = {"settled", "advanced", "open"}
ROW_STATUSES = {"solved", "partial", "open"}
ROW_FIELDS = {
    "id": str, "title": str, "branch": str, "form": str, "variant_of": (str, type(None)), "status": str, "coding": str,
    "posed": (int, type(None)), "resolved": (int, type(None)), "posed_evidence": str, "statement": str, "source": str,
    "licence": str, "statement_source": str, "status_source": str, "keywords": list, "market": list, "zone": str,
    "reach": (int, float), "radius": (int, float), "theta": (int, float), "pc": list, "near_solved": list, "near_open": list,
}


def row_errors(data):
    out = []
    if data.get("schema") != ROW_SCHEMA:
        out.append(f"schema is {data.get('schema')}")
    rows = data.get("rows")
    if not isinstance(rows, list) or not rows:
        return out + ["rows missing"]
    seen = set()
    for i, r in enumerate(rows):
        tag = f"rows[{i}]"
        for k, t in ROW_FIELDS.items():
            if k not in r:
                out.append(f"{tag} missing {k}")
            elif not isinstance(r[k], t):
                out.append(f"{tag} {k} has type {type(r[k]).__name__}")
        if out and any(m.startswith(tag) for m in out):
            continue
        if r["id"] in seen:
            out.append(f"{tag} duplicate id {r['id']}")
        seen.add(r["id"])
        if r["zone"] not in ROW_ZONES:
            out.append(f"{tag} zone {r['zone']}")
        if r["status"] not in ROW_STATUSES or r["coding"] not in ROW_CODINGS:
            out.append(f"{tag} status or coding")
        if (r["status"] == "solved") != (r["zone"] == "solved"):
            out.append(f"{tag} zone disagrees with status")
        if len(r["pc"]) != 3:
            out.append(f"{tag} needs three loadings")
        if r["resolved"] is not None and r["posed"] is not None and r["resolved"] < r["posed"]:
            out.append(f"{tag} resolved before posed")
        if not 0 <= r["reach"] <= 1 or not 0 <= r["radius"] <= 1.5:
            out.append(f"{tag} reach or radius out of range")
        for key in ("near_solved", "near_open"):
            for j, s in r[key]:
                if not (isinstance(j, int) and 0 <= j < len(rows) and -1 <= s <= 1):
                    out.append(f"{tag} {key} entry {j}")
        if r["status"] == "solved" and r["near_open"] and any(rows[j]["zone"] == "solved" for j, _ in r["near_open"]):
            out.append(f"{tag} open neighbour is solved")
        if any(rows[j]["zone"] != "solved" for j, _ in r["near_solved"]):
            out.append(f"{tag} solved neighbour is not solved")
        if r["id"] == "" or not r["title"]:
            out.append(f"{tag} empty id or title")
    return out
