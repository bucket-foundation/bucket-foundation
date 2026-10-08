import json
from pathlib import Path

REQUIRED = ("id", "short", "claim", "line", "quote", "queries")


class ClaimError(Exception):
    pass


def load_claims(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    claims = data["claims"]
    seen = set()
    for c in claims:
        missing = [k for k in REQUIRED if k not in c]
        if missing:
            raise ClaimError(f"{c.get('id', '?')} lacks {missing}")
        if c["id"] in seen:
            raise ClaimError(f"duplicate id {c['id']}")
        seen.add(c["id"])
        if not 3 <= len(c["queries"]) <= 5 and len(c["queries"]) != 2:
            raise ClaimError(f"{c['id']} needs 2 to 5 queries")
    if not 8 <= len(claims) <= 12:
        raise ClaimError(f"{len(claims)} claims; expected 8 to 12")
    return claims, data.get("source", "")


def verify_quotes(claims, source_text):
    lines = source_text.splitlines()
    bad = []
    for c in claims:
        n = c["line"]
        if n > len(lines) or c["quote"] not in lines[n - 1]:
            bad.append(c["id"])
    return bad
