"""USAspending.gov ingestor (federal award history).

Uses the public spending_by_award endpoint. We pull the top research-grant
awards (award_type_codes = "02","03","04","05" = grants) for the last 3
fiscal years, capped to MAX_RECORDS to keep the corpus reasonable.
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta
from typing import Iterable, List

from .db import now_iso
from .http_util import post_json

URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
PAGE = 100
MAX_RECORDS = 5_000
SLEEP = 0.3


def _to_grant(r: dict) -> dict:
    award_id = r.get("Award ID") or r.get("generated_internal_id") or r.get("internal_id")
    title    = r.get("Award Description") or r.get("Description") or "(USASpending award)"
    funder   = r.get("Awarding Agency") or "U.S. Federal Government"
    sub      = r.get("Awarding Sub Agency")
    if sub:
        funder = f"{funder} / {sub}"
    recipient = r.get("Recipient Name") or ""
    amt = r.get("Award Amount")
    try:
        amt_n = float(amt) if amt not in (None, "") else None
    except Exception:
        amt_n = None

    def _d(s):
        if not s: return None
        try:
            return datetime.fromisoformat(s).date().isoformat()
        except Exception:
            return None

    end = _d(r.get("End Date") or r.get("Period of Performance End Date"))

    eligibility = f"Awarded to {recipient}" if recipient else ""
    topics: List[str] = []
    if r.get("CFDA Number"):
        topics.append(f"cfda:{r['CFDA Number']}")
    iid = r.get("generated_internal_id") or r.get("internal_id")
    canonical = f"https://www.usaspending.gov/award/{iid}" if iid else "https://www.usaspending.gov/"

    return {
        "id": f"usaspending:{award_id}",
        "title": str(title)[:1000],
        "funder": funder,
        "source": "usaspending",
        "summary": str(title)[:4000],
        "eligibility": eligibility,
        "topics": topics,
        "amount_max_usd": amt_n,
        "amount_min_usd": amt_n,
        "deadline": end,
        "rolling": False,
        "canonical_url": canonical,
        "last_seen_at": now_iso(),
    }


def fetch(max_records: int = MAX_RECORDS) -> Iterable[dict]:
    end_dt = datetime.utcnow().date()
    start_dt = end_dt - timedelta(days=365 * 3)
    fields = [
        "Award ID","Recipient Name","Award Amount","Description",
        "Awarding Agency","Awarding Sub Agency","Award Type",
        "Start Date","End Date","CFDA Number","generated_internal_id",
    ]
    page = 1
    yielded = 0
    while yielded < max_records:
        body = {
            "filters": {
                "time_period": [{"start_date": start_dt.isoformat(), "end_date": end_dt.isoformat()}],
                "award_type_codes": ["02","03","04","05"],
            },
            "fields": fields,
            "page": page,
            "limit": PAGE,
            "sort": "Award Amount",
            "order": "desc",
        }
        try:
            resp = post_json(URL, body, timeout=120)
        except Exception:
            break
        results = resp.get("results") or []
        if not results:
            break
        for r in results:
            yield _to_grant(r)
            yielded += 1
            if yielded >= max_records:
                break
        if not (resp.get("page_metadata") or {}).get("hasNext"):
            break
        page += 1
        time.sleep(SLEEP)
