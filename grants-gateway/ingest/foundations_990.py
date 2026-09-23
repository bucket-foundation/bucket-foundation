from __future__ import annotations

import time
from typing import Iterable, List

from .db import now_iso
from .http_util import get_json

TARGET_FOUNDATIONS = [
    ("Bill & Melinda Gates Foundation",                  "562618866"),
    ("Robert Wood Johnson Foundation",                   "226029397"),
    ("The Andrew W. Mellon Foundation",                  "131879954"),
    ("Alfred P. Sloan Foundation",                       "131623877"),
    ("John Templeton Foundation",                        "237646502"),
    ("Simons Foundation",                                "137185376"),
    ("John S. and James L. Knight Foundation",           "650464177"),
    ("The David and Lucile Packard Foundation",          "770005477"),
    ("Howard Hughes Medical Institute",                  "591491411"),
    ("Gordon and Betty Moore Foundation",                "311612270"),
    ("Chan Zuckerberg Initiative Foundation",            "812301428"),
    ("Wellcome Trust",                                   "980165281"),
]

PP_URL = "https://projects.propublica.org/nonprofits/api/v2/organizations/{ein}.json"
SLEEP = 0.6

def _flt(v):
    try:
        return float(v) if v not in (None, "") else None
    except Exception:
        return None

def _to_grant(name: str, ein: str, filing: dict) -> dict | None:
    yr = filing.get("tax_prd_yr") or filing.get("tax_prd")
    if not yr:
        return None
    formtype = filing.get("formtype")
    if formtype not in (0, 2):
        return None
    grants_paid = _flt(filing.get("grntspaidoutdir") or filing.get("totnoncashgrnts") or filing.get("contriprgmsrvcs"))
    total_revenue = _flt(filing.get("totrevenue"))

    pdf = filing.get("pdf_url") or f"https://projects.propublica.org/nonprofits/organizations/{ein}"

    summary = (
        f"{name} — IRS Form 990{'-PF' if formtype==2 else ''} filing for tax year {yr}. "
        f"Total revenue: ${total_revenue:,.0f}. " if total_revenue else ""
    )
    if grants_paid:
        summary += f"Total grants paid: ${grants_paid:,.0f}."
    summary += " Per-grant detail requires Schedule B; see PDF."

    return {
        "id": f"irs-990pf:{ein}:{yr}",
        "title": f"{name} — {yr} grants program",
        "funder": name,
        "source": "irs-990pf",
        "summary": summary,
        "eligibility": "Varies by program area — see foundation website. This row is a "
                       "filing-level summary; Schedule B required for per-grant terms.",
        "topics": ["foundation", "private-foundation", "philanthropy"],
        "amount_max_usd": grants_paid,
        "amount_min_usd": None,
        "deadline": None,
        "rolling": True,
        "canonical_url": pdf,
        "last_seen_at": now_iso(),
    }

def fetch() -> Iterable[dict]:
    for name, ein in TARGET_FOUNDATIONS:
        try:
            resp = get_json(PP_URL.format(ein=ein), timeout=60)
        except Exception as e:
            print(f"  [990] skip {name} ({ein}): {e}")
            continue
        filings = resp.get("filings_with_data") or []
        for f in filings[:3]:
            row = _to_grant(name, ein, f)
            if row:
                yield row
        time.sleep(SLEEP)
