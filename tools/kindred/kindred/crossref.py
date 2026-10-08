import hashlib
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from .errors import QuotaSpent

BASE = "https://api.crossref.org/works"
SELECT = "DOI,title,author,issued,abstract,is-referenced-by-count"


def query_url(query, per_page=25):
    params = {"query": query, "filter": "has-abstract:true", "rows": per_page, "select": SELECT}
    return f"{BASE}?{urllib.parse.urlencode(params)}"


def strip_markup(text):
    once = html.unescape(re.sub(r"<[^>]+>", " ", text))
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", once)).strip()


def clean_abstract(text):
    text = strip_markup(text or "")
    return re.sub(r"^Abstract\s*", "", text)


def work_record(item):
    people = [" ".join(p for p in (a.get("given"), a.get("family")) if p) for a in item.get("author") or []]
    people = [p for p in people if p]
    authors = ", ".join(people[:3]) + (" et al." if len(people) > 3 else "")
    parts = (item.get("issued") or {}).get("date-parts") or [[None]]
    doi = item.get("DOI", "")
    return {
        "id": f"doi:{doi.lower()}",
        "title": strip_markup((item.get("title") or [""])[0]),
        "year": parts[0][0],
        "authors": authors,
        "cited_by": item.get("is-referenced-by-count", 0),
        "url": f"https://doi.org/{doi}" if doi else "",
        "abstract": clean_abstract(item.get("abstract")),
    }


class Client:
    def __init__(self, cache_dir, pause=1.0, opener=None):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.pause = pause
        self.spent = 0
        self.opener = opener or self._open

    def _open(self, url):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "bucket-kindred/1"}), timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 429:
                raise QuotaSpent("Crossref answered 429") from None
            raise RuntimeError(f"Crossref answered {err.code}") from None

    def search(self, query, per_page=25):
        url = query_url(query, per_page)
        path = self.cache_dir / (hashlib.sha1(url.encode()).hexdigest() + ".json")
        if path.exists():
            body = json.loads(path.read_text(encoding="utf-8"))["body"]
        else:
            body = self.opener(url)
            self.spent += 1
            path.write_text(json.dumps({"url": url, "body": body}), encoding="utf-8")
            time.sleep(self.pause)
        return [w for w in (work_record(i) for i in body["message"]["items"]) if w["abstract"]]
