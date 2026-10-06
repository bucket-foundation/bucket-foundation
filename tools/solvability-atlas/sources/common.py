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
COLUMNS = ["id", "name", "branch", "level", "lean", "posed", "resolved", "market", "keywords", "status", "source", "licence", "statement", "statement_source", "status_source"]
BRANCHES = {"mathematics", "physics", "chemistry", "information", "biophysics", "cosmology", "mind", "applied"}
USER_AGENT = "bucket-solvability-atlas/0.1 (https://bucket.foundation; gianyrox@gmail.com)"

# voice-ignore-next 20
STOPWORDS = set(
    """a an the of in on for to and or is are be with by as at from that this which it its into than then there their
    every any all some such does do not no if only also one two three each other more most many can has have had
    let where when what how whether given set sets number numbers exists exist holds hold true false prove show see
    citation needed comments showed proved proof erdosproblems conjecture conjectured problem known unknown
    according especially particular particularly whether these those would could should between within without
    about after before under while first second third least much same very over even still being been doing made
    make makes takes taking given called following example results result shows paper answer question note notes
    always finitely infinitely possible generally general version case cases hence thus therefore since because
    although though however whose whom they them we our you your his her him she he was were will shall may might
    must done here must said says say like just both either neither nor yet around along among across upon
    und der die das ist nicht eine einer einen einem eines sich auch oder mit von zu den dem des fuer auf dass wird
    werden sind ueber nach wie bei aus noch nur kann wenn als alle durch man hat haben zur zum dieser diese dieses
    jeder jede jedes sowie bzw aufeinander bemerkung bemerkungen beweis satz ueber unter wieder immer dann
    dans pour avec cette sont sous tout tous toute toutes meme plus aussi leur leurs ainsi donc dont entre etre
    soit ont est une des les que qui sur par pas nous vous elle ils elles cela ceci celui celle
    lean mathlib theorem lemma sorry statement formal formalization formalisation variant variants
    solved solve solves solution cannot need needs claim part parts small large sufficiently constant contain contains
    toward slightly closely recurring whether trivial nontrivial asymptotically positive negative finite infinite
    integer integers function functions exists existence unique uniquely arbitrary arbitrarily""".split()
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
    statement: str = ""
    statement_source: str = ""
    status_source: str = ""

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
            "statement": clean_cell(self.statement),
            "statement_source": self.statement_source,
            "status_source": self.status_source,
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
    text = re.sub(r"\{\{[^{}]*$", "", text)
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


def clean_cell(text):
    return re.sub(r"\s+", " ", text).strip()


def ascii_fold(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()


WORD = r"[^\W\d_][^\W\d_]*(?:-[^\W\d_]+)*"


def is_stopword(token):
    folded = ascii_fold(token)
    return folded in STOPWORDS or len(folded) < 4 or not re.fullmatch(r"[a-z][a-z-]*", folded)


def nounish(token):
    folded = ascii_fold(token)
    return not is_stopword(token) and not re.search(r"(ing|ly|ed)$", folded) and not re.search(r"[a-z][A-Z]", token)


def good_phrase(phrase):
    words = phrase.split()
    return bool(words) and not is_stopword(words[0]) and not is_stopword(words[-1]) and all(re.fullmatch(WORD, w) or w.lower() in {"of", "and"} for w in words)


def keywords_from(statement, candidates=(), ceiling=8):
    text = re.sub(r"\$[^$]*\$|`[^`]*`|\[[A-Za-z]+\d+[a-z]?\]", " ", statement)
    low = text.lower()
    picked = []
    for phrase in candidates:
        phrase = phrase.strip()
        if good_phrase(phrase) and phrase.lower() in low and phrase.lower() not in {p.lower() for p in picked}:
            picked.append(phrase)
    words = re.findall(WORD, text)
    counts = {}
    for i, word in enumerate(words):
        if not nounish(word):
            continue
        counts[word.lower()] = counts.get(word.lower(), 0) + 1
        if i + 1 < len(words) and nounish(words[i + 1]):
            bigram = f"{word} {words[i + 1]}".lower()
            counts[bigram] = counts.get(bigram, 0) + 2
    for phrase, _ in sorted(counts.items(), key=lambda kv: (-kv[1], -len(kv[0].split()), kv[0])):
        if len(picked) >= ceiling:
            break
        if any(phrase == p.lower() or phrase in p.lower() for p in picked):
            continue
        picked.append(phrase)
    return picked[:ceiling]


YEAR = r"(1[6-9]\d\d|20[0-2]\d)"
POSED = re.compile(r"\b(posed|asked|proposed|conjectured|formulated|stated|introduced|raised|suggested|first studied)\b[^.?]{0,50}?\b" + YEAR + r"\b", re.I)
RESOLVED = re.compile(r"\b(solved|proved|proven|resolved|disproved|settled|established|answered|shown|showed|confirmed|refuted|completed)\b[^.?]{0,60}?\b" + YEAR + r"\b", re.I)
HEAD_YEAR = re.compile(r"^.{0,90}?\(" + YEAR + r"\)")
SPAN = re.compile(r"\(" + YEAR + r"\s*[-\u2013\u2014]\s*" + YEAR + r"\)")
CREDIT = re.compile(r"\([^()]*?,\s*" + YEAR + r"[^()]{0,40}\)")


def in_range(match):
    return match.group(match.lastindex) if match and 1600 <= int(match.group(match.lastindex)) <= 2026 else ""


def posed_year(text):
    span = SPAN.search(text)
    if span:
        return span.group(1)
    return in_range(POSED.search(text) or HEAD_YEAR.search(text))


def resolved_year(text):
    span = SPAN.search(text)
    if span:
        return span.group(2)
    return in_range(RESOLVED.search(text) or CREDIT.search(text))


def first_sentence(text, limit=140):
    text = clean_cell(text)
    match = re.match(r"(.+?[.?!])(?:\s|$)", text)
    sentence = match.group(1) if match else text
    if len(sentence) <= limit:
        return sentence.rstrip(".")
    return ""


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
