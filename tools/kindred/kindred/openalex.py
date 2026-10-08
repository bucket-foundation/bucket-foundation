import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from .errors import QuotaSpent

BASE = "https://api.openalex.org"
SECRET_PARAMS = ("mailto", "api_key")
MAX_REQUESTS = 200
MAX_WAIT = 120


FIELDS = "id,doi,title,publication_year,cited_by_count,authorships,abstract_inverted_index"


def strip_url(url):
    parts = urllib.parse.urlsplit(url)
    query = [(k, v) for k, v in urllib.parse.parse_qsl(parts.query, keep_blank_values=True) if k not in SECRET_PARAMS]
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), ""))


def works_url(query, per_page=25):
    params = {
        "search": query,
        "filter": "has_abstract:true,type:article|preprint|book|book-chapter|review",
        "sort": "cited_by_count:desc",
        "per-page": per_page,
        "select": FIELDS,
    }
    return f"{BASE}/works?{urllib.parse.urlencode(params)}"


def reconstruct_abstract(inverted):
    if not inverted:
        return ""
    slots = {}
    for word, positions in inverted.items():
        for p in positions:
            slots[p] = word
    return " ".join(slots[i] for i in sorted(slots))


def author_names(work, limit=3):
    names = [a["author"]["display_name"] for a in work.get("authorships") or [] if a.get("author", {}).get("display_name")]
    if len(names) > limit:
        return ", ".join(names[:limit]) + " et al."
    return ", ".join(names)


def work_record(work):
    doi = work.get("doi")
    return {
        "id": work["id"],
        "title": work.get("title") or "",
        "year": work.get("publication_year"),
        "authors": author_names(work),
        "cited_by": work.get("cited_by_count", 0),
        "url": doi or work["id"],
        "abstract": reconstruct_abstract(work.get("abstract_inverted_index")),
    }


class Client:
    def __init__(self, cache_dir, budget=MAX_REQUESTS, pause=1.0, opener=None):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.budget = budget
        self.pause = pause
        self.spent = 0
        self.opener = opener or self._open

    def cache_path(self, url):
        return self.cache_dir / (hashlib.sha1(strip_url(url).encode()).hexdigest() + ".json")

    def _open(self, url):
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "bucket-kindred/1"}), timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))

    def secrets(self):
        out = {}
        if os.environ.get("OPENALEX_API_KEY"):
            out["api_key"] = os.environ["OPENALEX_API_KEY"]
        if os.environ.get("OPENALEX_MAILTO"):
            out["mailto"] = os.environ["OPENALEX_MAILTO"]
        return out

    def fetch_with_retry(self, signed, attempts=4):
        for attempt in range(attempts):
            if self.spent >= self.budget:
                raise RuntimeError(f"request budget of {self.budget} spent")
            self.spent += 1
            try:
                return self.opener(signed)
            except urllib.error.HTTPError as err:
                if err.code != 429 or attempt == attempts - 1:
                    raise RuntimeError(f"OpenAlex answered {err.code}") from None
                wait = float(err.headers.get("Retry-After") or 8 * (attempt + 1))
                if wait > MAX_WAIT:
                    raise QuotaSpent(f"OpenAlex quota is spent; it resets in {int(wait)} s") from None
                time.sleep(wait)

    def get(self, url):
        path = self.cache_path(url)
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))["body"]
        if self.spent >= self.budget:
            raise RuntimeError(f"request budget of {self.budget} spent")
        sep = "&" if "?" in url else "?"
        signed = url + sep + urllib.parse.urlencode(self.secrets())
        body = self.fetch_with_retry(signed)
        path.write_text(json.dumps({"url": strip_url(url), "body": body}), encoding="utf-8")
        time.sleep(self.pause)
        return body

    def search(self, query, per_page=25):
        body = self.get(works_url(query, per_page))
        return [work_record(w) for w in body.get("results", [])]
