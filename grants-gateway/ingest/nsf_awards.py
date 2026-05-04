"""NSF Awards ingestor (research.gov public awards search API).

GET https://api.nsf.gov/services/v1/awards.json
Returns up to 25 records / page; use offset to paginate.
"""
from __future__ import annotations

import time
import urllib.parse
from datetime import datetime, timedelta
from typing import Iterable, List

from .db import now_iso
from .http_util import get_json

BASE = "https://api.nsf.gov/services/v1/awards.json"
FIELDS = ",".join([
    "id","title","abstractText","fundsObligatedAmt","startDate","expDate",
    "awardeeName","piFirstName","piLastName","fundProgramName","agency",
    "primaryProgram","cfdaNumber",
])
PAGE = 25
MAX_RECORDS = 2_000
SLEEP = 0.2


def _to_grant(r: dict) -> dict:
    aid = r.get("id")
    title = r.get("title") or "(untitled NSF award)"
    abstract = r.get("abstractText") or ""
    pi = f"{r.get('piFirstName','')} {r.get('piLastName','')}".strip()
    awardee = r.get("awardeeName") or ""
    program = r.get("fundProgramName") or r.get("primaryProgram") or ""

    amt = r.get("fundsObligatedAmt")
    try:
        amt_n = float(amt) if amt not in (None, "") else None
    except Exception:
        amt_n = None

    def _d(s):
        if not s: return None
        try:
            return datetime.strptime(s,"%m/%d/%Y").date().isoformat()
        except Exception:
            return None

    eligibility = ""
    if awardee:
        eligibility = f"Awarded to {awardee}"
        if pi:
            eligibility += f" (PI: {pi})"

    topics: List[str] = []
    if program:
        topics.append(program.lower())
    if r.get("cfdaNumber"):
        topics.append(f"cfda:{r['cfdaNumber']}")

    return {
        "id": f"nsf-awards:{aid}",
        "title": title[:1000],
        "funder": f"NSF / {program}" if program else "NSF",
        "source": "nsf-awards",
        "summary": abstract[:8000],
        "eligibility": eligibility,
        "topics": topics,
        "amount_max_usd": amt_n,
        "amount_min_usd": amt_n,
        "deadline": _d(r.get("expDate")),
        "rolling": False,
        "canonical_url": f"https://www.nsf.gov/awardsearch/showAward?AWD_ID={aid}",
        "last_seen_at": now_iso(),
    }


def fetch(max_records: int = MAX_RECORDS) -> Iterable[dict]:
    start = (datetime.utcnow() - timedelta(days=365 * 3)).strftime("%m/%d/%Y")
    offset = 1
    yielded = 0
    while yielded < max_records:
        params = {
            "dateStart": start,
            "offset": offset,
            "rpp": PAGE,
            "printFields": FIELDS,
        }
        url = BASE + "?" + urllib.parse.urlencode(params)
        try:
            resp = get_json(url, timeout=60)
        except Exception:
            break
        awards = (resp.get("response") or {}).get("award") or []
        if not awards:
            break
        for a in awards:
            yield _to_grant(a)
            yielded += 1
            if yielded >= max_records:
                break
        offset += PAGE
        time.sleep(SLEEP)
