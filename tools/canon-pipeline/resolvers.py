"""Resolvers for OpenAlex, Crossref, PubMed, arXiv, bioRxiv.

All functions are defensive: they return None on failure, never raise out.
Network calls go through _get() which caches and respects Retry-After.
"""
from __future__ import annotations
import re
import time
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any, Optional

import requests

try:
    from . import cache  # type: ignore
except ImportError:
    import cache  # type: ignore

UA = "BucketCanonPipeline/0.1 (mailto:gianyrox@gmail.com)"
EMAIL = "gianyrox@gmail.com"
TIMEOUT = 30


def _get(url: str, params: Optional[dict] = None, accept_json: bool = True) -> Optional[Any]:
    cached = cache.get(url, params)
    if cached is not None:
        return cached
    backoff = 2
    for attempt in range(4):
        try:
            r = requests.get(url, params=params, headers={"User-Agent": UA, "Accept": "application/json" if accept_json else "*/*"}, timeout=TIMEOUT)
        except requests.RequestException:
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue
        if r.status_code == 429:
            ra = int(r.headers.get("Retry-After", backoff) or backoff)
            time.sleep(min(ra, 60))
            backoff = min(backoff * 2, 60)
            continue
        if r.status_code >= 500:
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue
        if r.status_code >= 400:
            return None
        data = r.json() if accept_json else r.text
        cache.put(url, data, params)
        return data
    return None


# ---------- OpenAlex ----------

def openalex_by_doi(doi: str) -> Optional[dict]:
    doi = _normalize_doi(doi)
    if not doi:
        return None
    return _get(f"https://api.openalex.org/works/doi:{doi}", {"mailto": EMAIL})


def openalex_search(query: str) -> Optional[dict]:
    data = _get("https://api.openalex.org/works", {"search": query, "mailto": EMAIL, "per-page": 5})
    if not data or not data.get("results"):
        return None
    return data["results"][0]


# ---------- Crossref ----------

def crossref_by_doi(doi: str) -> Optional[dict]:
    doi = _normalize_doi(doi)
    if not doi:
        return None
    data = _get(f"https://api.crossref.org/works/{urllib.parse.quote(doi, safe='')}", {"mailto": EMAIL})
    if data and data.get("status") == "ok":
        return data.get("message")
    return None


def crossref_search(query: str) -> Optional[dict]:
    data = _get("https://api.crossref.org/works", {"query": query, "rows": 5, "mailto": EMAIL})
    if not data:
        return None
    items = (data.get("message") or {}).get("items") or []
    return items[0] if items else None


# ---------- PubMed ----------

def pubmed_by_pmid(pmid: str) -> Optional[dict]:
    pmid = pmid.replace("pmid:", "").strip()
    data = _get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
                {"db": "pubmed", "id": pmid, "retmode": "json"})
    if not data:
        return None
    res = (data.get("result") or {}).get(pmid)
    return res


def pubmed_doi_for_pmid(pmid: str) -> Optional[str]:
    rec = pubmed_by_pmid(pmid)
    if not rec:
        return None
    for aid in rec.get("articleids", []) or []:
        if aid.get("idtype") == "doi":
            return aid.get("value")
    return None


def pubmed_search(query: str) -> Optional[str]:
    data = _get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
                {"db": "pubmed", "term": query, "retmode": "json", "retmax": 1})
    if not data:
        return None
    ids = (data.get("esearchresult") or {}).get("idlist") or []
    return ids[0] if ids else None


# ---------- arXiv ----------

def arxiv_by_id(aid: str) -> Optional[dict]:
    aid = aid.replace("arxiv:", "").strip()
    text = _get("http://export.arxiv.org/api/query", {"id_list": aid}, accept_json=False)
    if not text:
        return None
    return _parse_arxiv_atom(text)


def arxiv_search(query: str) -> Optional[dict]:
    text = _get("http://export.arxiv.org/api/query", {"search_query": f"all:{query}", "max_results": 1}, accept_json=False)
    if not text:
        return None
    return _parse_arxiv_atom(text)


def _parse_arxiv_atom(text: str) -> Optional[dict]:
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return None
    ns = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
    entry = root.find("a:entry", ns)
    if entry is None:
        return None
    def t(tag):
        el = entry.find(f"a:{tag}", ns)
        return el.text.strip() if el is not None and el.text else None
    authors = [a.find("a:name", ns).text for a in entry.findall("a:author", ns) if a.find("a:name", ns) is not None]
    doi_el = entry.find("arxiv:doi", ns)
    return {
        "id": t("id"),
        "title": (t("title") or "").replace("\n", " ").strip(),
        "summary": t("summary"),
        "published": t("published"),
        "authors": authors,
        "doi": doi_el.text if doi_el is not None else None,
    }


# ---------- bioRxiv ----------

def biorxiv_by_doi(doi: str) -> Optional[dict]:
    doi = _normalize_doi(doi)
    if not doi:
        return None
    data = _get(f"https://api.biorxiv.org/details/biorxiv/{doi}")
    if not data:
        return None
    coll = data.get("collection") or []
    return coll[-1] if coll else None


# ---------- helpers ----------

_DOI_RE = re.compile(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.IGNORECASE)


def _normalize_doi(s: str) -> Optional[str]:
    if not s:
        return None
    s = s.strip()
    s = s.replace("doi:", "").replace("https://doi.org/", "").replace("http://doi.org/", "")
    m = _DOI_RE.search(s)
    return m.group(0) if m else None


def classify_input(s: str) -> tuple[str, str]:
    s = s.strip()
    low = s.lower()
    if low.startswith("arxiv:"):
        return ("arxiv", s.split(":", 1)[1])
    if low.startswith("pmid:"):
        return ("pmid", s.split(":", 1)[1])
    doi = _normalize_doi(s)
    if doi:
        return ("doi", doi)
    if re.fullmatch(r"\d{1,9}", s):
        return ("pmid", s)
    if re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", s):
        return ("arxiv", s)
    return ("query", s)
