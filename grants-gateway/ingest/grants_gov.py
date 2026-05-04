"""grants.gov ingestor.

Uses the public search2 JSON endpoint (the same one grants.gov's website
uses). No auth, no API key. Free. Rate-limited politely (1 req / 0.4s).

Pulls all currently posted + forecasted opportunities (a few thousand
records). Each one is then enriched with the detail endpoint to grab
the synopsis text + eligibility + amount fields.

For volume-control we fetch the list pages, then enrich up to
DETAIL_BUDGET records per run (default 1500). Re-runs upsert and pick
up new opps idempotently.
"""
from __future__ import annotations

import time
from datetime import datetime
from typing import Iterable, List

from .db import now_iso
from .http_util import post_json

LIST_URL   = "https://api.grants.gov/v1/api/search2"
DETAIL_URL = "https://api.grants.gov/v1/api/fetchOpportunity"

PAGE_SIZE      = 100
DETAIL_BUDGET  = 500
SLEEP_LIST     = 0.3
SLEEP_DETAIL   = 0.15


def _fmt_date(s: str | None) -> str | None:
    if not s:
        return None
    # grants.gov returns "MM/DD/YYYY"
    try:
        return datetime.strptime(s, "%m/%d/%Y").date().isoformat()
    except Exception:
        return None


def _list_page(start: int) -> dict:
    body = {
        "rows": PAGE_SIZE,
        "keyword": "",
        "oppStatuses": "forecasted|posted",
        "startRecordNum": start,
    }
    return post_json(LIST_URL, body, timeout=60).get("data", {})


def _detail(opp_id: str) -> dict:
    body = {"opportunityId": int(opp_id)}
    try:
        return post_json(DETAIL_URL, body, timeout=60).get("data", {}) or {}
    except Exception:
        return {}


def _to_grant(opp: dict, detail: dict) -> dict:
    syn = detail.get("synopsis") or {}
    number   = opp.get("number") or opp.get("id")
    canon    = f"https://www.grants.gov/search-results-detail/{opp.get('id')}"
    summary  = (syn.get("synopsisDesc") or "").strip()
    eligibility = (syn.get("applicantEligibilityDesc") or syn.get("agencyContactDesc") or "").strip()
    amax = syn.get("awardCeiling")
    amin = syn.get("awardFloor")

    def _num(v):
        if v in (None, ""):
            return None
        try:
            return float(str(v).replace(",", ""))
        except Exception:
            return None

    deadline = _fmt_date(opp.get("closeDate"))
    rolling  = not bool(deadline)

    cfda = opp.get("cfdaList") or []
    topics: List[str] = []
    if opp.get("agencyCode"):
        topics.append(str(opp["agencyCode"]).lower())
    for c in cfda[:5]:
        topics.append(f"cfda:{c}")

    return {
        "id": f"grants-gov:{number}",
        "title": opp.get("title") or "(untitled)",
        "funder": opp.get("agency") or "U.S. Federal Government",
        "source": "grants.gov",
        "summary": summary[:8000],
        "eligibility": eligibility[:4000],
        "topics": topics,
        "amount_max_usd": _num(amax),
        "amount_min_usd": _num(amin),
        "deadline": deadline,
        "rolling": rolling,
        "canonical_url": canon,
        "last_seen_at": now_iso(),
    }


def fetch(detail_budget: int = DETAIL_BUDGET) -> Iterable[dict]:
    start = 1
    seen = 0
    enriched = 0
    while True:
        page = _list_page(start)
        opps = page.get("oppHits") or []
        hit_count = page.get("hitCount") or 0
        if not opps:
            break
        for opp in opps:
            opp_id = str(opp.get("id"))
            detail = {}
            if enriched < detail_budget:
                detail = _detail(opp_id)
                enriched += 1
                time.sleep(SLEEP_DETAIL)
            yield _to_grant(opp, detail)
            seen += 1
        if seen >= hit_count:
            break
        start += PAGE_SIZE
        time.sleep(SLEEP_LIST)
