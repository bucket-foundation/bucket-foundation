import csv
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

ATLAS = Path(__file__).resolve().parent.parent
REPO = ATLAS.parent.parent
EXISTING = ATLAS / "problems.tsv"
OUTPUT = ATLAS / "problems-sourced.tsv"
COLUMNS = ["id", "name", "branch", "level", "lean", "posed", "resolved", "market", "keywords", "status", "source", "licence"]
BRANCHES = {"mathematics", "physics", "chemistry", "information", "biophysics", "cosmology", "mind", "applied"}
USER_AGENT = "bucket-solvability-atlas/0.1 (https://bucket.foundation; gianyrox@gmail.com)"

STOPWORDS = set(
    "a an the of in on for to and or is are be with by as at from that this which it its into than then there their "
    "every any all some such does do not no if only also one two three any every each other more most many can has have "
    "let where when what how whether given set sets number numbers exists exist holds hold true false prove show see "
    "citation needed comments showed proved proof erdosproblems conjecture problem conjectured known unknown whether".split()
)


@dataclass
class Row:
    id: str
    name: str
    branch: str
    level: int
    status: str
    source: str
    licence: str
    keywords: list = field(default_factory=list)
    lean: str = "none"
    posed: str = ""
    resolved: str = ""
    market: str = ""

    def record(self):
        assert self.branch in BRANCHES, self.branch
        assert self.status in {"open", "solved"}, self.status
        assert 1 <= self.level <= 5
        return {
            "id": self.id,
            "name": self.name,
            "branch": self.branch,
            "level": str(self.level),
            "lean": self.lean,
            "posed": self.posed,
            "resolved": self.resolved,
            "market": self.market,
            "keywords": ",".join(self.keywords),
            "status": self.status,
            "source": self.source,
            "licence": self.licence,
        }


def slug(text, limit=60):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text[:limit].rstrip("-")


def normal_title(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    text = text.replace("versus", "vs")
    text = re.sub(r"\b(the|a|an|problem|conjecture|hypothesis|of|on|in|for|and|existence)\b", " ", text)
    return re.sub(r"[^a-z0-9]+", "", text)


def existing_titles():
    with EXISTING.open(encoding="utf8") as handle:
        return {normal_title(r["name"]) for r in csv.DictReader(handle, delimiter="\t")}


def fetch(url, params=None):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf8")


def wikitext(page):
    body = fetch(
        "https://en.wikipedia.org/w/api.php",
        {"action": "parse", "page": page, "prop": "wikitext", "format": "json", "formatversion": "2", "redirects": "1"},
    )
    data = json.loads(body)
    if "error" in data:
        raise RuntimeError(f"wikipedia {page}: {data['error']['code']}")
    return data["parse"]["wikitext"]


def strip_markup(text):
    text = re.sub(r"<ref[^>]*/>", "", text)
    text = re.sub(r"<ref[^>]*>.*?</ref>", "", text, flags=re.S)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    while "{{" in text:
        new = re.sub(r"\{\{[^{}]*\}\}", "", text)
        if new == text:
            break
        text = new
    text = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[https?://\S+ ([^\]]+)\]", r"\1", text)
    text = re.sub(r"'{2,}", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def wikilinks(text):
    seen = []
    for target, label in re.findall(r"\[\[([^|\]\[]+)(?:\|([^\]\[]+))?\]\]", text):
        term = (label or target).strip()
        term = re.sub(r"\s*\(.*?\)\s*$", "", term)
        if term.startswith(("File:", "Image:", "Category:")) or "#" in term and not label:
            continue
        if term and term.lower() not in {s.lower() for s in seen}:
            seen.append(term)
    return seen


def keyword_fill(keywords, text, fillers=(), floor=5, ceiling=8):
    keywords = [k for k in keywords if k][:ceiling]
    if len(keywords) >= floor:
        return keywords
    counts = {}
    for word in re.findall(r"[A-Za-z][A-Za-z-]{4,}", text):
        low = word.lower()
        if low in STOPWORDS or low in {k.lower() for k in keywords}:
            continue
        counts[low] = counts.get(low, 0) + 1
    for word, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        if len(keywords) >= floor:
            break
        keywords.append(word)
    for filler in fillers:
        if len(keywords) >= floor:
            break
        if filler.lower() not in {k.lower() for k in keywords}:
            keywords.append(filler)
    return keywords


def year_in(text):
    match = re.search(r"\b(1[5-9]\d\d|20[0-2]\d)\b", text)
    return match.group(1) if match else ""


def dedupe(rows, seen=None):
    seen = set(seen or ())
    ids = set()
    kept = []
    for row in rows:
        key = normal_title(row.name)
        if not key or key in seen:
            continue
        base = row.id
        n = 2
        while row.id in ids:
            row.id = f"{base}-{n}"
            n += 1
        seen.add(key)
        ids.add(row.id)
        kept.append(row)
    return kept


def write(rows, path=OUTPUT):
    with path.open("w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(row.record())


def read(path=OUTPUT):
    with path.open(encoding="utf8") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def report(name, rows):
    print(f"{name}: {len(rows)} rows", file=sys.stderr)
