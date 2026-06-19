#!/usr/bin/env python3
"""
research-tools — Tier-1 RAG / agent / data tools (REAL logic, no GPU)
=====================================================================

This module implements the genuinely FUNCTIONAL backend for the T1 ship-now
tools from docs/research-tools/02-tool-roadmap.md §3. They are pure
full-stack + data + agent tools: no GPU, no model weights, no subprocess to a
sibling repo. Each runs real logic against real public data:

    PaperRadar       — personalized recent-paper feed from the live OpenAlex API
    GrantDraft       — funder/grant finder + specific-aims drafter grounded in
                       real awarded grants (research-atlas NSF corpus, OpenAlex
                       fallback)
    MethodsMatcher   — "which method (and which of OUR tools) answers this?"
                       grounded in the OpenAlex methods literature
    ReviewGuard      — cross-paper supporting-vs-contradicting evidence finder
                       over an OpenAlex paper set

Design rules that make this REAL and not a stub:
  * Live HTTP to OpenAlex (https://api.openalex.org, polite pool via
    ?mailto=gianyrox@gmail.com). No key needed.
  * Every external call is cached on disk (TOOLS_CACHE_DIR, default
    ~/.cache/bucket-research-tools) so re-runs and tests are fast + offline-able.
  * Graceful fallback: if the network is unavailable, the functions return a
    structured `degraded` envelope instead of raising — the gateway turns that
    into a normal (non-crashing) result so the UI is never stranded.
  * Pure functions for all ranking / scoring / matching logic so they can be
    unit-tested with fixtures and ZERO network (see tests/).

The gateway (gateway.py) imports `run_<tool>(payload) -> dict` from here and
wraps the dict in the v1 job-result envelope. These functions return the
`output` payload only; the gateway owns job lifecycle + provenance.

TODO(deploy): the OpenAlex client uses the public anonymous pool. On the box,
set OPENALEX_MAILTO from a secret and (optionally) front it with a small Redis
cache shared across workers instead of the per-process disk cache. Neither
blocks the logic here.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

# --- config ----------------------------------------------------------------
OPENALEX = "https://api.openalex.org"
MAILTO = os.environ.get("OPENALEX_MAILTO", "gianyrox@gmail.com")
USER_AGENT = f"bucket-research-tools/1.0 (mailto:{MAILTO})"
HTTP_TIMEOUT_S = float(os.environ.get("TOOLS_HTTP_TIMEOUT_S", "12"))
CACHE_DIR = Path(
    os.environ.get("TOOLS_CACHE_DIR", str(Path.home() / ".cache" / "bucket-research-tools"))
)
CACHE_TTL_S = float(os.environ.get("TOOLS_CACHE_TTL_S", str(7 * 24 * 3600)))
# Set TOOLS_OFFLINE=1 to forbid network entirely (tests rely on cache/fixtures).
OFFLINE = os.environ.get("TOOLS_OFFLINE", "") in ("1", "true", "yes")
# research-atlas raw NSF corpus (real awarded grants), read-only.
ATLAS_DIR = Path(
    os.environ.get("RESEARCH_ATLAS_DIR", str(Path.home() / "agfarms" / "research-atlas"))
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- cached HTTP GET (JSON) -------------------------------------------------
class NetworkUnavailable(Exception):
    """Raised internally when a live fetch is needed but cannot be made."""


def _cache_path(url: str) -> Path:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:32]
    return CACHE_DIR / f"{h}.json"


def cached_get_json(url: str, *, ttl_s: float = CACHE_TTL_S) -> Any:
    """GET a URL, returning parsed JSON. Disk-cached by URL.

    Order of resolution:
      1. fresh cache hit  -> return cached
      2. OFFLINE/network  -> stale cache hit if any, else NetworkUnavailable
      3. live fetch       -> store + return; on failure fall back to stale cache
    """
    cp = _cache_path(url)
    fresh = None
    stale = None
    if cp.exists():
        try:
            blob = json.loads(cp.read_text())
            age = time.time() - blob.get("_fetched_at", 0)
            if age <= ttl_s:
                fresh = blob.get("body")
            stale = blob.get("body")
        except Exception:
            fresh = stale = None
    if fresh is not None:
        return fresh
    if OFFLINE:
        if stale is not None:
            return stale
        raise NetworkUnavailable(f"offline and no cache for {url}")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cp.write_text(json.dumps({"_fetched_at": time.time(), "url": url, "body": body}))
        return body
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
        if stale is not None:
            return stale
        raise NetworkUnavailable(str(e))


# --- OpenAlex helpers -------------------------------------------------------
def _oa_url(path: str, params: dict[str, Any]) -> str:
    params = {**params, "mailto": MAILTO}
    return f"{OPENALEX}{path}?" + urllib.parse.urlencode(params, safe=":,")


def reconstruct_abstract(inv: Optional[dict[str, list[int]]]) -> str:
    """Rebuild OpenAlex abstract from its inverted index. Pure function."""
    if not inv:
        return ""
    positions: list[tuple[int, str]] = []
    for word, idxs in inv.items():
        for i in idxs:
            positions.append((i, word))
    positions.sort(key=lambda t: t[0])
    return " ".join(w for _, w in positions)


def normalize_work(w: dict) -> dict:
    """Flatten an OpenAlex work into the fields our tools use. Pure function."""
    loc = w.get("primary_location") or {}
    src = loc.get("source") or {}
    authors = [
        (a.get("author") or {}).get("display_name", "")
        for a in (w.get("authorships") or [])
    ]
    return {
        "id": w.get("id", ""),
        "title": w.get("title") or w.get("display_name") or "(untitled)",
        "abstract": reconstruct_abstract(w.get("abstract_inverted_index")),
        "publication_date": w.get("publication_date") or "",
        "publication_year": w.get("publication_year"),
        "cited_by_count": int(w.get("cited_by_count") or 0),
        "venue": src.get("display_name") or "",
        "is_oa": bool((w.get("open_access") or {}).get("is_oa")),
        "oa_url": (w.get("open_access") or {}).get("oa_url")
        or loc.get("landing_page_url")
        or w.get("doi")
        or "",
        "doi": w.get("doi") or "",
        "authors": [a for a in authors if a],
        "concepts": [c.get("display_name", "") for c in (w.get("concepts") or [])][:6],
        # specific concepts only (level >= 2): drops root noise like
        # "Biology"/"Chemistry" (level 0) so method mining stays meaningful.
        "specific_concepts": [
            c.get("display_name", "")
            for c in (w.get("concepts") or [])
            if (c.get("level") or 0) >= 2 and (c.get("score") or 0) >= 0.2
        ][:8],
    }


def search_works(
    query: str,
    *,
    per_page: int = 25,
    from_date: Optional[str] = None,
    sort: Optional[str] = None,
    extra_filters: Optional[list[str]] = None,
) -> list[dict]:
    """Live OpenAlex search → normalized works. Cached. Raises NetworkUnavailable
    only if there is no live network AND no cache."""
    filters = [f"title_and_abstract.search:{query}"] if query else []
    if from_date:
        filters.append(f"from_publication_date:{from_date}")
    if extra_filters:
        filters.extend(extra_filters)
    params: dict[str, Any] = {"per-page": max(1, min(per_page, 50))}
    if filters:
        params["filter"] = ",".join(filters)
    if sort:
        params["sort"] = sort
    body = cached_get_json(_oa_url("/works", params))
    return [normalize_work(w) for w in body.get("results", [])]


# ===========================================================================
# Shared text utilities (pure)
# ===========================================================================
_STOP = set(
    "the a an of to in for and or on with by from as is are was were be been being "
    "this that these those at into over under between within across via using used "
    "we our their its it they he she his her can may might will would should could "
    "study studies paper papers result results method methods approach data model "
    "models analysis show shows shown found find using based new novel".split()
)
_WORD = re.compile(r"[a-zA-Z][a-zA-Z\-]{2,}")
# extra interrogative/filler words to drop when building a SEARCH query (not when
# scoring overlap — there we keep more signal).
_QUERY_DROP = set(
    "how what which why when where who does do did how-to predict identify "
    "find determine measure best should many much most given any some".split()
)


def search_query(text: str) -> str:
    """Turn a natural-language question into a clean OpenAlex keyword query.
    Strips punctuation (OpenAlex rejects '?'), stopwords, and interrogatives.
    Pure function."""
    toks = [t for t in tokenize(text) if t not in _QUERY_DROP]
    # keep order, dedupe, cap length so the search filter stays well-formed
    seen: set[str] = set()
    out: list[str] = []
    for t in toks:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return " ".join(out[:10]) or re.sub(r"[^A-Za-z0-9 ]", " ", text).strip()


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _WORD.findall(text or "") if t.lower() not in _STOP]


def keyword_set(text: str) -> set[str]:
    return set(tokenize(text))


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def cosine_counts(a: dict[str, int], b: dict[str, int]) -> float:
    if not a or not b:
        return 0.0
    keys = set(a) & set(b)
    dot = sum(a[k] * b[k] for k in keys)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def term_counts(text: str) -> dict[str, int]:
    c: dict[str, int] = {}
    for t in tokenize(text):
        c[t] = c.get(t, 0) + 1
    return c


# ===========================================================================
# 1. PaperRadar — personalized recent-paper feed
# ===========================================================================
def _years_since(date_str: str) -> float:
    try:
        d = datetime.fromisoformat(date_str)
    except Exception:
        return 99.0
    delta = datetime.now(timezone.utc) - d.replace(tzinfo=timezone.utc)
    return max(delta.days / 365.25, 0.0)


def score_paper_radar(work: dict, interest_tokens: set[str], now_year: int) -> dict:
    """Score one work for a researcher's interests. Pure function.

    relevance  = jaccard(title+abstract+concepts tokens, interest tokens)
    recency    = exp(-age_years / 1.5)               (newer = higher)
    velocity   = citations / max(age_years, 0.25)    (citation velocity)
    score      = 0.5*relevance + 0.3*recency + 0.2*norm(velocity)
    """
    text = f"{work.get('title','')} {work.get('abstract','')} {' '.join(work.get('concepts',[]))}"
    rel = jaccard(keyword_set(text), interest_tokens)
    age = _years_since(work.get("publication_date", "")) or (
        max(now_year - (work.get("publication_year") or now_year), 0) + 0.5
    )
    recency = math.exp(-age / 1.5)
    velocity = work.get("cited_by_count", 0) / max(age, 0.25)
    vel_norm = velocity / (velocity + 5.0)  # squashes to (0,1), 5 cites/yr ~ 0.5
    score = 0.5 * rel + 0.3 * recency + 0.2 * vel_norm
    return {
        "relevance": round(rel, 4),
        "recency": round(recency, 4),
        "citation_velocity": round(velocity, 2),
        "score": round(score, 4),
    }


def _why_it_matters(work: dict, interest_tokens: set[str]) -> str:
    text = f"{work.get('title','')} {work.get('abstract','')} {' '.join(work.get('concepts',[]))}"
    overlap = sorted(keyword_set(text) & interest_tokens)
    if overlap:
        topics = ", ".join(overlap[:5])
        rel = f"matches your interests in {topics}"
    else:
        rel = "topically adjacent to your stated interests"
    vel = work.get("cited_by_count", 0)
    age = _years_since(work.get("publication_date", ""))
    if age < 1.5 and vel >= 5:
        traj = "and is already accumulating citations fast for its age"
    elif age < 1.5:
        traj = "and is very recent"
    elif vel >= 20:
        traj = "and is highly cited"
    else:
        traj = "with steady uptake"
    return f"This {rel} {traj}."


def run_paper_radar(payload: dict) -> dict:
    """payload: { interests: str (comma/line topics), since_days?: int, limit?: int }"""
    interests = (payload.get("interests") or "").strip()
    if len(interests) < 3:
        return {"error": "interests required (a few topics/keywords)"}
    since_days = int(payload.get("since_days") or 540)
    limit = max(1, min(int(payload.get("limit") or 12), 25))
    topics = [t.strip() for t in re.split(r"[,\n;]", interests) if t.strip()]
    interest_tokens = keyword_set(interests)
    from_date = (datetime.now(timezone.utc).date().fromordinal(
        datetime.now(timezone.utc).date().toordinal() - since_days
    )).isoformat()

    now_year = datetime.now(timezone.utc).year
    pool: dict[str, dict] = {}
    degraded = False
    # Query OpenAlex per topic (most-recent first) and merge; cap topics queried.
    for topic in topics[:4] or [interests]:
        try:
            works = search_works(
                search_query(topic), per_page=20, from_date=from_date, sort="publication_date:desc"
            )
        except NetworkUnavailable:
            degraded = True
            continue
        for w in works:
            pool[w["id"] or w["title"]] = w
    if not pool and degraded:
        return {
            "degraded": True,
            "interests": topics,
            "message": "OpenAlex is unreachable and no cached results exist for these topics.",
            "feed": [],
        }

    ranked = []
    for w in pool.values():
        s = score_paper_radar(w, interest_tokens, now_year)
        ranked.append({**w, **s, "why_it_matters": _why_it_matters(w, interest_tokens)})
    ranked.sort(key=lambda r: r["score"], reverse=True)
    feed = ranked[:limit]

    return {
        "interests": topics,
        "since": from_date,
        "considered": len(pool),
        "degraded": degraded,
        "feed": [
            {
                "title": r["title"],
                "authors": r["authors"][:4],
                "venue": r["venue"],
                "publication_date": r["publication_date"],
                "cited_by_count": r["cited_by_count"],
                "citation_velocity": r["citation_velocity"],
                "score": r["score"],
                "relevance": r["relevance"],
                "recency": r["recency"],
                "url": r["oa_url"],
                "open_access": r["is_oa"],
                "why_it_matters": r["why_it_matters"],
            }
            for r in feed
        ],
    }


# ===========================================================================
# 2. GrantDraft — funder/grant finder + specific-aims drafter
# ===========================================================================
def _iter_atlas_nsf_awards() -> Iterable[dict]:
    """Yield real awarded NSF grants from the research-atlas raw corpus.
    Read-only; stdlib json only (no parquet/pandas dependency)."""
    nsf_dir = ATLAS_DIR / "data" / "raw" / "nsf"
    if not nsf_dir.is_dir():
        return
    for fp in sorted(nsf_dir.glob("*.json")):
        try:
            d = json.loads(fp.read_text())
        except Exception:
            continue
        for a in (d.get("response", {}) or {}).get("award", []) or []:
            yield a


def _grant_record(a: dict) -> dict:
    amt = a.get("fundsObligatedAmt") or a.get("estimatedTotalAmt") or "0"
    try:
        amount = float(amt)
    except Exception:
        amount = 0.0
    pi = " ".join(x for x in [a.get("piFirstName"), a.get("piLastName")] if x).strip()
    return {
        "id": a.get("id", ""),
        "title": a.get("title", ""),
        "abstract": a.get("abstractText", "") or "",
        "amount_usd": amount,
        "pi": pi or a.get("pdPIName", ""),
        "org": a.get("awardeeName", ""),
        "program": a.get("fundProgramName", ""),
        "start_date": a.get("startDate", ""),
        "agency": a.get("agency", "NSF"),
        "url": f"https://www.nsf.gov/awardsearch/showAward?AWD_ID={a.get('id','')}",
    }


def rank_grants(topic: str, grants: list[dict], limit: int = 8) -> list[dict]:
    """Rank real awarded grants by relevance to a topic. Pure function."""
    q = term_counts(topic)
    scored = []
    for g in grants:
        text = f"{g.get('title','')} {g.get('abstract','')} {g.get('program','')}"
        rel = cosine_counts(q, term_counts(text))
        if rel <= 0:
            continue
        scored.append({**g, "relevance": round(rel, 4)})
    scored.sort(key=lambda g: (g["relevance"], g["amount_usd"]), reverse=True)
    return scored[:limit]


def draft_specific_aims(topic: str, grants: list[dict]) -> list[dict]:
    """Draft specific-aims bullets GROUNDED in real awarded grants. Pure function.

    Each aim is anchored to a real funded program/grant so the draft is
    defensible ("aligned with NSF award #X, program Y") rather than generic."""
    aims: list[dict] = []
    verbs = [
        "Characterize the molecular determinants of",
        "Develop a quantitative, predictive model of",
        "Validate, in a controlled system, the mechanism of",
    ]
    # NSF title boilerplate that is not a science anchor.
    _boiler = {"career", "collaborative", "research", "rui", "eager", "rapid",
               "conference", "workshop", "doctoral", "dissertation", "support",
               "award", "project", "study", "investigation", "towards", "toward"}
    for i, g in enumerate(grants[:3]):
        # Pull a concrete noun-phrase signal from the grant's own language.
        topic_toks = keyword_set(topic)
        toks = [
            tk for tk in tokenize(g.get("title", ""))
            if tk not in topic_toks and tk not in _boiler
        ]
        anchor = toks[0] if toks else "the target system"
        verb = verbs[i % len(verbs)]
        aims.append(
            {
                "aim": f"Aim {i+1}",
                "text": (
                    f"{verb} {topic}, focusing on {anchor}. "
                    f"This builds on funded work such as \"{g.get('title','')}\" "
                    f"({g.get('agency','NSF')}, {g.get('program','')}, "
                    f"${int(g.get('amount_usd',0)):,}), extending it toward an "
                    f"open mechanistic question the prior award leaves unresolved."
                ),
                "grounded_in": {
                    "title": g.get("title", ""),
                    "program": g.get("program", ""),
                    "amount_usd": g.get("amount_usd", 0),
                    "url": g.get("url", ""),
                },
            }
        )
    if not aims:
        aims.append(
            {
                "aim": "Aim 1",
                "text": (
                    f"Establish the foundational measurements needed to study {topic}. "
                    "No closely-matched awarded grant was found in the corpus; consider "
                    "framing this as a high-risk/high-reward exploratory aim."
                ),
                "grounded_in": None,
            }
        )
    return aims


def run_grant_draft(payload: dict) -> dict:
    """payload: { topic: str, limit?: int }
    Funder/grant finder grounded in real NSF awards (research-atlas), with an
    OpenAlex literature fallback when the atlas corpus is unavailable."""
    topic = (payload.get("topic") or "").strip()
    if len(topic) < 4:
        return {"error": "topic required"}
    limit = max(1, min(int(payload.get("limit") or 8), 15))

    grants = [_grant_record(a) for a in _iter_atlas_nsf_awards()]
    source = "research-atlas/nsf"
    degraded = False
    if not grants:
        # Fallback: OpenAlex funded/grant-bearing works for the topic.
        source = "openalex"
        try:
            works = search_works(search_query(topic), per_page=25, sort="cited_by_count:desc")
            grants = [
                {
                    "id": w["id"],
                    "title": w["title"],
                    "abstract": w["abstract"],
                    "amount_usd": 0.0,
                    "pi": (w["authors"] or [""])[0],
                    "org": w["venue"],
                    "program": "",
                    "start_date": w["publication_date"],
                    "agency": "literature",
                    "url": w["oa_url"],
                }
                for w in works
            ]
        except NetworkUnavailable:
            degraded = True
            grants = []

    ranked = rank_grants(topic, grants, limit=limit)
    aims = draft_specific_aims(topic, ranked)

    # Aggregate funder picture from the matched grants.
    funders: dict[str, dict] = {}
    for g in ranked:
        key = g.get("program") or g.get("agency", "?")
        f = funders.setdefault(key, {"program": key, "agency": g.get("agency", ""), "n": 0, "total_usd": 0.0})
        f["n"] += 1
        f["total_usd"] += g.get("amount_usd", 0.0)
    top_funders = sorted(funders.values(), key=lambda f: (f["n"], f["total_usd"]), reverse=True)[:5]

    return {
        "topic": topic,
        "source": source,
        "degraded": degraded,
        "matched_grants": [
            {
                "title": g["title"],
                "pi": g["pi"],
                "org": g["org"],
                "program": g["program"],
                "amount_usd": g["amount_usd"],
                "agency": g["agency"],
                "relevance": g["relevance"],
                "url": g["url"],
            }
            for g in ranked
        ],
        "top_funders": top_funders,
        "specific_aims": aims,
    }


# ===========================================================================
# 3. MethodsMatcher — which method (+ which of OUR tools) answers this?
# ===========================================================================
# OUR tool catalog, with the question-shapes each one answers. The matcher maps
# a research question to methods grounded in the literature AND to a Bucket tool.
OUR_TOOLS: list[dict] = [
    {
        "slug": "stabilitydesigner",
        "name": "StabilityDesigner",
        "answers": "predict the stability effect (ΔΔG) of point mutations in a protein",
        "signals": ["stability", "mutation", "ddg", "thermostability", "fold", "protein", "destabilize", "stabilize", "variant"],
    },
    {
        "slug": "proteinscout",
        "name": "ProteinScout",
        "answers": "per-residue biophysics — disorder, flexibility, functional/allosteric residues",
        "signals": ["residue", "allosteric", "disorder", "flexibility", "binding", "site", "conservation", "domain", "structure"],
    },
    {
        "slug": "trajmine",
        "name": "TrajMine",
        "answers": "extract metastable states / transition kinetics from an MD trajectory (Markov state model)",
        "signals": ["dynamics", "trajectory", "md", "conformational", "kinetics", "transition", "markov", "metastable", "folding", "simulation"],
    },
    {
        "slug": "screenserver",
        "name": "ScreenServer",
        "answers": "screen a ligand library against a target (docking + affinity)",
        "signals": ["docking", "ligand", "screen", "affinity", "drug", "inhibitor", "binding", "compound", "smiles", "virtual"],
    },
    {
        "slug": "patchseqml",
        "name": "PatchSeqML",
        "answers": "auto-analyze patch-clamp electrophysiology — events, kinetics, IV curves",
        "signals": ["patch", "clamp", "electrophysiology", "current", "channel", "sweep", "voltage", "conductance", "ephys", "membrane"],
    },
    {
        "slug": "cryotriage",
        "name": "CryoTriage",
        "answers": "triage cryo-EM session quality (CTF / motion / ice / defocus)",
        "signals": ["cryo", "cryo-em", "micrograph", "ctf", "particle", "defocus", "motion", "ice"],
    },
    {
        "slug": "labbrain",
        "name": "LabBrain",
        "answers": "ask a literature corpus a question and get citation-grounded answers",
        "signals": ["literature", "review", "summarize", "papers", "corpus", "question", "what", "evidence"],
    },
]


def _expand_tokens(text: str) -> set[str]:
    """Token set robust to hyphens and simple plurals, for signal matching."""
    base = keyword_set(text)
    out: set[str] = set(base)
    for t in base:
        out.update(t.split("-"))  # patch-clamp -> patch, clamp
        if t.endswith("s") and len(t) > 4:
            out.add(t[:-1])  # currents -> current, recordings? -> recording
        if t.endswith("ies") and len(t) > 5:
            out.add(t[:-3] + "y")
    return {x for x in out if len(x) >= 2}


def match_our_tools(question: str) -> list[dict]:
    """Score each Bucket tool against the question. Pure function."""
    q = _expand_tokens(question)
    out = []
    for t in OUR_TOOLS:
        sig = set(t["signals"])
        hits = sorted(q & sig)
        if not hits:
            continue
        score = len(hits) / math.sqrt(len(sig))
        out.append({"slug": t["slug"], "name": t["name"], "answers": t["answers"],
                    "matched_signals": hits, "score": round(score, 4)})
    out.sort(key=lambda x: x["score"], reverse=True)
    return out


def derive_methods_from_literature(works: list[dict], question: str) -> list[dict]:
    """Mine recurring method-like concepts from the literature for the question.
    Pure function over already-fetched works."""
    q = keyword_set(question)
    concept_freq: dict[str, int] = {}
    concept_cites: dict[str, int] = {}
    for w in works:
        for c in w.get("specific_concepts") or w.get("concepts", []):
            cl = c.lower()
            if cl in q:  # skip the question's own topic words
                continue
            concept_freq[c] = concept_freq.get(c, 0) + 1
            concept_cites[c] = concept_cites.get(c, 0) + w.get("cited_by_count", 0)
    ranked = sorted(
        concept_freq.items(),
        key=lambda kv: (kv[1], concept_cites.get(kv[0], 0)),
        reverse=True,
    )
    return [
        {"method": name, "papers_in_set": n, "total_citations": concept_cites.get(name, 0)}
        for name, n in ranked[:8]
    ]


def run_methods_matcher(payload: dict) -> dict:
    """payload: { question: str }"""
    question = (payload.get("question") or "").strip()
    if len(question) < 8:
        return {"error": "ask a research question (>= 8 chars)"}

    tools = match_our_tools(question)
    degraded = False
    try:
        works = search_works(search_query(question), per_page=25, sort="cited_by_count:desc")
    except NetworkUnavailable:
        degraded = True
        works = []
    methods = derive_methods_from_literature(works, question)
    exemplars = [
        {"title": w["title"], "venue": w["venue"], "year": w["publication_year"],
         "cited_by_count": w["cited_by_count"], "url": w["oa_url"]}
        for w in works[:5]
    ]

    recommendation = (
        f"For \"{question}\", the literature most often applies: "
        + ", ".join(m["method"] for m in methods[:3])
        + "." if methods else
        "No dominant method emerged from the literature; consider a literature scan first."
    )
    if tools:
        recommendation += (
            f" On Bucket, run {tools[0]['name']} — it {tools[0]['answers']}."
        )

    return {
        "question": question,
        "degraded": degraded,
        "recommended_methods": methods,
        "our_tools": tools,
        "exemplar_papers": exemplars,
        "recommendation": recommendation,
    }


# ===========================================================================
# 4. ReviewGuard — cross-paper supporting vs contradicting evidence
# ===========================================================================
# Lexicon-driven stance detection. Not an LLM/NLI model (none available
# offline), but a real, deterministic, sentence-level signal: it locates the
# sentences in each paper's abstract that mention the claim's key terms, then
# scores their polarity against the claim's own polarity. Transparent and
# testable; the gateway labels it accordingly.
_NEG_CUES = {
    "no", "not", "non", "without", "fail", "failed", "fails", "unable", "lack",
    "lacks", "lacking", "absence", "absent", "negligible", "insignificant",
    "unchanged", "unaffected", "contradict", "contradicts", "contrary",
    "however", "whereas", "although", "despite", "challenge", "challenges",
    "refute", "refutes", "disprove", "inconsistent", "contrast", "but",
    "decrease", "decreased", "decreases", "reduce", "reduced", "reduces",
    "loss", "lower", "lowered", "impair", "impaired", "block", "blocked",
    "inhibit", "inhibited", "suppress", "suppressed", "prevent", "prevented",
}
_POS_CUES = {
    "increase", "increased", "increases", "enhance", "enhanced", "enhances",
    "promote", "promoted", "promotes", "activate", "activated", "induce",
    "induced", "induces", "support", "supports", "supported", "confirm",
    "confirms", "confirmed", "consistent", "demonstrate", "demonstrated",
    "show", "shows", "shown", "establish", "established", "significant",
    "significantly", "associated", "correlate", "correlated", "elevated",
    "improve", "improved", "improves", "gain", "higher", "upregulate",
}
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _claim_polarity(claim: str) -> int:
    toks = set(tokenize(claim)) | set(re.findall(r"[a-z]+", claim.lower()))
    pos = len(toks & _POS_CUES)
    neg = len(toks & _NEG_CUES)
    return 1 if pos >= neg else -1


def stance_for_paper(claim: str, claim_terms: set[str], claim_pol: int, work: dict) -> dict:
    """Decide whether a paper supports / contradicts / is-neutral on the claim.
    Pure function. Returns stance + the evidence sentence + scores."""
    text = f"{work.get('title','')}. {work.get('abstract','')}"
    sentences = [s for s in _SENT_SPLIT.split(text) if s.strip()]
    best = None
    best_overlap = 0
    for s in sentences:
        st = keyword_set(s)
        ov = len(st & claim_terms)
        if ov > best_overlap:
            best_overlap, best = ov, s
    if not best or best_overlap == 0:
        return {"stance": "off-topic", "overlap": 0, "evidence": "", "confidence": 0.0}

    stoks = set(re.findall(r"[a-z]+", best.lower()))
    s_pos = len(stoks & _POS_CUES)
    s_neg = len(stoks & _NEG_CUES)
    sent_pol = 1 if s_pos >= s_neg else -1
    polarity_agree = sent_pol == claim_pol
    # Confidence rises with term overlap and cue signal.
    cue_signal = (s_pos + s_neg) / (len(stoks) or 1)
    confidence = round(min(1.0, 0.25 + 0.15 * best_overlap + cue_signal), 3)
    if s_pos == 0 and s_neg == 0:
        stance = "neutral"
    else:
        stance = "supports" if polarity_agree else "contradicts"
    return {
        "stance": stance,
        "overlap": best_overlap,
        "evidence": best.strip()[:400],
        "sentence_polarity": sent_pol,
        "confidence": confidence,
    }


def run_review_guard(payload: dict) -> dict:
    """payload: { claim: str, papers?: [str ids/titles], limit?: int }

    If `papers` is omitted, ReviewGuard pulls a candidate set from OpenAlex on
    the claim's terms, then runs stance detection over each."""
    claim = (payload.get("claim") or "").strip()
    if len(claim) < 8:
        return {"error": "claim required (>= 8 chars)"}
    limit = max(2, min(int(payload.get("limit") or 12), 25))
    claim_terms = keyword_set(claim)
    claim_pol = _claim_polarity(claim)

    degraded = False
    works: list[dict] = []
    provided = [p.strip() for p in (payload.get("papers") or []) if str(p).strip()]
    if provided:
        # Resolve each provided id/title against OpenAlex (cached).
        for p in provided[:limit]:
            try:
                if p.lower().startswith(("w", "https://openalex.org/w")):
                    wid = p.rsplit("/", 1)[-1]
                    body = cached_get_json(_oa_url(f"/works/{wid}", {}))
                    works.append(normalize_work(body))
                else:
                    hits = search_works(p, per_page=1)
                    if hits:
                        works.append(hits[0])
            except NetworkUnavailable:
                degraded = True
    else:
        try:
            works = search_works(search_query(claim), per_page=limit, sort="cited_by_count:desc")
        except NetworkUnavailable:
            degraded = True

    rows = []
    for w in works:
        st = stance_for_paper(claim, claim_terms, claim_pol, w)
        if st["stance"] == "off-topic":
            continue
        rows.append({
            "title": w["title"],
            "venue": w["venue"],
            "year": w["publication_year"],
            "cited_by_count": w["cited_by_count"],
            "url": w["oa_url"],
            **st,
        })
    rows.sort(key=lambda r: (r["confidence"], r["overlap"]), reverse=True)

    support = [r for r in rows if r["stance"] == "supports"]
    contra = [r for r in rows if r["stance"] == "contradicts"]
    neutral = [r for r in rows if r["stance"] == "neutral"]
    if not rows:
        verdict = "no on-topic evidence found"
    elif contra and support:
        verdict = "CONTESTED — both supporting and contradicting evidence exist"
    elif contra:
        verdict = "predominantly CONTRADICTED by the retrieved set"
    elif support:
        verdict = "predominantly SUPPORTED by the retrieved set"
    else:
        verdict = "discussed but inconclusive (neutral mentions only)"

    return {
        "claim": claim,
        "claim_polarity": "positive" if claim_pol > 0 else "negative",
        "degraded": degraded,
        "verdict": verdict,
        "counts": {"supports": len(support), "contradicts": len(contra), "neutral": len(neutral)},
        "supporting": support,
        "contradicting": contra,
        "neutral": neutral,
        "note": (
            "Stance is from deterministic sentence-level cue analysis over abstracts "
            "(transparent, not an LLM). Treat as triage, then read the cited sentences."
        ),
    }


# ===========================================================================
# 5. QuantumBioRAG — claim-strength RAG for quantum-biology / biophysics claims
# ===========================================================================
# Quantum biology is a high-signal-to-noise field: the literature mixes rigorous
# results with hype. QuantumBioRAG retrieves the live OpenAlex evidence for a
# claim, then scores SUPPORT STRENGTH (not just "does a paper mention it") and
# CONSENSUS, with citeable sources. It reuses the deterministic stance detector
# (stance_for_paper) — supports/contradicts/neutral — and adds an evidence-
# quality weighting (venue uptake via citations + recency + on-topic overlap) so
# a well-supported, well-cited, replicated claim scores higher than a fringe one.

# A small domain vocabulary used to (a) detect whether a claim is in-scope for
# quantum biology and (b) bias retrieval toward the right corpus.
_QBIO_TERMS = {
    "quantum", "coherence", "coherent", "tunneling", "tunnelling", "entanglement",
    "spin", "radical", "pair", "magnetoreception", "cryptochrome", "photosynthesis",
    "exciton", "fmo", "vibronic", "decoherence", "proton", "olfaction", "enzyme",
    "biophoton", "superposition", "qubit", "nontrivial", "phonon", "isotope",
}


def evidence_strength(work: dict, claim_terms: set[str], now_year: int) -> float:
    """Per-paper evidence weight for claim-strength scoring. Pure function.

    Combines on-topic overlap, citation uptake (log-damped), and recency. A
    highly-cited, on-topic, recent paper carries more evidentiary weight than a
    fringe, uncited mention — this is what separates evidence from hype.
    """
    text = f"{work.get('title','')} {work.get('abstract','')} {' '.join(work.get('concepts',[]))}"
    overlap = jaccard(keyword_set(text), claim_terms)
    cites = work.get("cited_by_count", 0)
    uptake = math.log1p(cites) / math.log1p(200.0)  # ~1.0 at 200 cites
    age = max(now_year - (work.get("publication_year") or now_year), 0)
    recency = math.exp(-age / 8.0)  # gentle: old landmark papers still count
    return round(min(1.0, 0.5 * overlap + 0.35 * min(uptake, 1.0) + 0.15 * recency), 4)


def run_quantum_bio_rag(payload: dict) -> dict:
    """payload: { claim: str, limit?: int }

    Claim-strength RAG over the live quantum-biology literature. Retrieves real
    OpenAlex evidence, scores support strength + consensus with a deterministic
    stance + evidence-quality model, and cites sources. Evidence, not hype.
    """
    claim = (payload.get("claim") or "").strip()
    if len(claim) < 8:
        return {"error": "state a quantum-biology claim (>= 8 chars)"}
    limit = max(3, min(int(payload.get("limit") or 15), 30))
    claim_terms = keyword_set(claim)
    claim_pol = _claim_polarity(claim)
    now_year = datetime.now(timezone.utc).year

    # is the claim plausibly in quantum-biology scope? (informational, not a gate)
    in_scope = bool(claim_terms & _QBIO_TERMS)
    # bias retrieval toward the domain when the claim itself is sparse on QB terms
    query = search_query(claim)
    if not in_scope:
        query = (query + " quantum biology").strip()

    degraded = False
    works: list[dict] = []
    try:
        works = search_works(query, per_page=limit, sort="cited_by_count:desc")
    except NetworkUnavailable:
        degraded = True

    rows: list[dict] = []
    for w in works:
        st = stance_for_paper(claim, claim_terms, claim_pol, w)
        if st["stance"] == "off-topic":
            continue
        strength = evidence_strength(w, claim_terms, now_year)
        rows.append({
            "title": w["title"],
            "venue": w["venue"],
            "year": w["publication_year"],
            "cited_by_count": w["cited_by_count"],
            "url": w["oa_url"],
            "stance": st["stance"],
            "evidence": st["evidence"],
            "stance_confidence": st["confidence"],
            "evidence_strength": strength,
        })
    rows.sort(key=lambda r: (r["evidence_strength"], r["cited_by_count"]), reverse=True)

    support = [r for r in rows if r["stance"] == "supports"]
    contra = [r for r in rows if r["stance"] == "contradicts"]
    neutral = [r for r in rows if r["stance"] == "neutral"]

    # weighted support / consensus: weight each paper by its evidence strength.
    w_sup = sum(r["evidence_strength"] for r in support)
    w_con = sum(r["evidence_strength"] for r in contra)
    w_tot = w_sup + w_con
    support_score = round(w_sup / w_tot, 3) if w_tot > 0 else 0.0
    # consensus = how lopsided the weighted evidence is (1 = unanimous one way)
    consensus = round(abs(w_sup - w_con) / w_tot, 3) if w_tot > 0 else 0.0

    if not rows:
        verdict = "no on-topic evidence retrieved"
        strength_label = "none"
    elif w_tot == 0:
        verdict = "discussed but only neutral mentions — inconclusive"
        strength_label = "weak"
    elif support_score >= 0.75 and consensus >= 0.5:
        verdict = "WELL-SUPPORTED by the retrieved literature"
        strength_label = "strong"
    elif support_score >= 0.55:
        verdict = "LEANS SUPPORTED, but with notable dissent or thin evidence"
        strength_label = "moderate"
    elif support_score <= 0.25:
        verdict = "POORLY SUPPORTED / largely contradicted — treat as hype until replicated"
        strength_label = "weak"
    else:
        verdict = "CONTESTED — supporting and contradicting evidence are balanced"
        strength_label = "contested"

    return {
        "method": "claim-strength RAG over live OpenAlex (evidence-weighted stance + consensus)",
        "claim": claim,
        "in_quantum_biology_scope": in_scope,
        "claim_polarity": "positive" if claim_pol > 0 else "negative",
        "degraded": degraded,
        "verdict": verdict,
        "support_strength": strength_label,
        "support_score": support_score,        # weighted fraction supporting (0..1)
        "consensus": consensus,                # 0 = split, 1 = unanimous
        "counts": {"supports": len(support), "contradicts": len(contra), "neutral": len(neutral)},
        "top_supporting": support[:6],
        "top_contradicting": contra[:6],
        "neutral": neutral[:4],
        "note": (
            "Support strength weights each paper by on-topic overlap, citation "
            "uptake, and recency, so a replicated, well-cited result outweighs a "
            "fringe mention. Stance is deterministic sentence-level cue analysis "
            "(transparent, not an LLM). This separates evidence from hype — but it "
            "is triage: read the cited sentences before concluding."
        ),
    }


# Registry the gateway imports.
RAG_RUNNERS = {
    "paperradar": run_paper_radar,
    "grantdraft": run_grant_draft,
    "methodsmatcher": run_methods_matcher,
    "reviewguard": run_review_guard,
    "quantumbiorag": run_quantum_bio_rag,
}
