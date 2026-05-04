"""NIH RePORTER ingestor.

Public REST API: https://api.reporter.nih.gov/
Awards over the last 3 fiscal years, capped to MAX_RECORDS.
"""
from __future__ import annotations

import time
from datetime import datetime
from typing import Iterable, List

from .db import now_iso
from .http_util import post_json

URL = "https://api.reporter.nih.gov/v2/projects/search"

PAGE_SIZE   = 500
MAX_RECORDS = 10_000
SLEEP       = 0.3


def _to_grant(p: dict) -> dict:
    project_num = p.get("project_num") or p.get("core_project_num") or p.get("appl_id")
    appl_id     = p.get("appl_id")
    org         = p.get("organization") or {}
    pi_list     = p.get("principal_investigators") or []
    pi_name     = ""
    if pi_list:
        pi = pi_list[0]
        pi_name = f"{pi.get('first_name','')} {pi.get('last_name','')}".strip()

    ic_funds = p.get("agency_ic_fundings") or []
    funder   = "NIH"
    if ic_funds:
        funder = f"NIH / {ic_funds[0].get('name') or ic_funds[0].get('abbreviation') or 'IC'}"

    award_amt = p.get("award_amount")
    start = p.get("project_start_date")
    end   = p.get("project_end_date")

    summary_parts = [
        p.get("abstract_text") or "",
        p.get("project_title") or "",
    ]
    summary = "\n\n".join([s for s in summary_parts if s])[:8000]

    cats = p.get("spending_categories") or []
    topics: List[str] = []
    if isinstance(cats, list):
        for c in cats[:8]:
            if isinstance(c, dict) and c.get("name"):
                topics.append(str(c["name"]).lower())
            elif isinstance(c, str):
                topics.append(c.lower())
    if p.get("activity_code"):
        topics.append(f"activity:{p['activity_code']}")

    eligibility = ""
    if org.get("org_name"):
        eligibility = f"Awarded to {org.get('org_name')}"
        if pi_name:
            eligibility += f" (PI: {pi_name})"

    canonical = f"https://reporter.nih.gov/project-details/{appl_id}" if appl_id else "https://reporter.nih.gov/"

    def _date(s):
        if not s:
            return None
        try:
            return datetime.fromisoformat(s.replace("Z","")).date().isoformat()
        except Exception:
            return None

    return {
        "id": f"nih-reporter:{appl_id}",
        "title": (p.get("project_title") or "(untitled NIH award)")[:1000],
        "funder": funder,
        "source": "nih-reporter",
        "summary": summary,
        "eligibility": eligibility,
        "topics": topics,
        "amount_max_usd": float(award_amt) if award_amt is not None else None,
        "amount_min_usd": float(award_amt) if award_amt is not None else None,
        "deadline": _date(end),
        "rolling": False,
        "canonical_url": canonical,
        "last_seen_at": now_iso(),
    }


def fetch(max_records: int = MAX_RECORDS) -> Iterable[dict]:
    this_year = datetime.utcnow().year
    fiscal_years = [this_year, this_year - 1, this_year - 2]

    offset = 0
    yielded = 0
    while yielded < max_records:
        body = {
            "criteria": {"fiscal_years": fiscal_years},
            "limit": PAGE_SIZE,
            "offset": offset,
            "sort_field": "appl_id",
            "sort_order": "desc",
        }
        resp = post_json(URL, body, timeout=120)
        results = resp.get("results") or []
        if not results:
            break
        for r in results:
            yield _to_grant(r)
            yielded += 1
            if yielded >= max_records:
                break
        # NIH RePORTER caps offset at 14_999 — paginate via an iter token
        offset += len(results)
        if offset >= 14_999:
            # NIH cap; we got all we can from this offset path
            break
        time.sleep(SLEEP)
