"""Open-access PDF fetcher. OA only, no paywall bypass, no Sci-Hub."""
from __future__ import annotations
from pathlib import Path
from typing import Optional

import requests

try:
    from . import cache, resolvers  # type: ignore
except ImportError:
    import cache  # type: ignore
    import resolvers  # type: ignore

UA = resolvers.UA
EMAIL = resolvers.EMAIL


def unpaywall(doi: str) -> Optional[dict]:
    doi = resolvers._normalize_doi(doi)
    if not doi:
        return None
    return resolvers._get(f"https://api.unpaywall.org/v2/{doi}", {"email": EMAIL})


def best_oa_url(doi: str) -> Optional[dict]:
    """Return {url, license, repository, version} from Unpaywall if OA."""
    data = unpaywall(doi)
    if not data or not data.get("is_oa"):
        return None
    best = data.get("best_oa_location") or {}
    if not best.get("url_for_pdf") and not best.get("url"):
        return None
    return {
        "url": best.get("url_for_pdf") or best.get("url"),
        "license": best.get("license"),
        "repository": best.get("repository_institution") or best.get("host_type"),
        "version": best.get("version"),
    }


def fetch_pdf(url: str, dest: Path) -> bool:
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=60, allow_redirects=True)
    except requests.RequestException:
        return False
    if r.status_code != 200:
        return False
    ctype = r.headers.get("Content-Type", "").lower()
    if "pdf" not in ctype and not r.content.startswith(b"%PDF"):
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(r.content)
    return True
