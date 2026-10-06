import argparse
import csv
import datetime as dt
import glob
import hashlib
import os
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

import record_schema

HERE = Path(__file__).parent
REPO = HERE.parent.parent
CACHE = HERE / "cache"
RECORDS = HERE / "records"
MAILTO = "gianyrox@gmail.com"
OPENALEX_KEY = os.environ.get("OPENALEX_API_KEY", "")
AGENT = f"bucket-solvability-atlas/1.0 (mailto:{MAILTO})"
OPENALEX = "https://api.openalex.org"
WIKI = "https://en.wikipedia.org/api/rest_v1/page"
ARXIV = "http://export.arxiv.org/api/query"
LICENCE = {"api.openalex.org": "CC0-1.0", "en.wikipedia.org": "CC-BY-SA-4.0", "export.arxiv.org": "arXiv API terms, metadata CC0-1.0"}
INTERVAL = {"api.openalex.org": 0.12, "en.wikipedia.org": 0.25, "export.arxiv.org": 3.0}
KEY_WORKS = 25
TOP_PEOPLE = 15
SURVEY = re.compile(r"\b(survey|review|progress|overview|status|open problems|perspective)\b", re.I)
YEAR = re.compile(r"\b(1[5-9]\d\d|20\d\d)\b")
TAG = re.compile(r"<[^>]+>")
INFOBOX_ROW = re.compile(r"<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>", re.S)
BOLD = re.compile(r"<b[^>]*>(.*?)</b>", re.S)
last_call = {}


class BudgetExhausted(RuntimeError):
    pass


def today():
    return dt.date.today().isoformat()


def fetch(url, offline=False):
    key = CACHE / (hashlib.sha256(url.encode()).hexdigest() + ".json")
    if key.exists():
        return json.load(open(key))
    if offline:
        return {"url": url, "status": 0, "body": "", "retrieved": today()}
    host = urllib.parse.urlparse(url).netloc
    wait = INTERVAL.get(host, 1.0) - (time.monotonic() - last_call.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    headers = {"User-Agent": AGENT, "Accept": "application/json, text/html, application/atom+xml"}
    if host == "api.openalex.org" and OPENALEX_KEY:
        headers["Authorization"] = "Bearer " + OPENALEX_KEY
    req = urllib.request.Request(url, headers=headers)
    reason = None
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                entry = {"url": url, "status": resp.status, "body": resp.read().decode("utf-8", "replace"), "retrieved": today()}
            break
        except urllib.error.HTTPError as e:
            if e.code in (404, 400) or 300 <= e.code < 400:
                entry = {"url": url, "status": e.code, "body": "", "retrieved": today()}
                break
            if e.code == 429 and int(e.headers.get("Retry-After", "0") or 0) > 300:
                raise BudgetExhausted(f"{host} budget used up, retry after {e.headers.get('Retry-After')} s")
            if e.code == 429 or e.code >= 500:
                reason = f"HTTP {e.code}"
                time.sleep(2 ** attempt * 2)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            reason = repr(e)
            time.sleep(2 ** attempt * 2)
    else:
        raise RuntimeError(f"gave up on {url}: {reason}")
    last_call[host] = time.monotonic()
    CACHE.mkdir(exist_ok=True)
    json.dump(entry, open(key, "w"))
    return entry


def source(entry):
    host = urllib.parse.urlparse(entry["url"]).netloc
    return {"url": entry["url"], "licence": LICENCE.get(host, "unknown"), "retrieved": entry["retrieved"]}


def load_tsv(name):
    return list(csv.DictReader(open(HERE / name), delimiter="\t"))


def load_problems():
    rows = load_tsv("problems.tsv")
    desc = {r["id"]: r["description"] for r in load_tsv("descriptions.tsv")}
    formal = {r["id"]: r for r in load_tsv("formal_sources.tsv")}
    src = {r["id"]: r for r in load_tsv("records/sources.tsv")}
    for r in rows:
        r["level"] = int(r["level"])
        r["posed"] = int(r["posed"])
        r["resolved"] = int(r["resolved"]) if r["resolved"] else None
        r["keywords"] = [k.strip() for k in r["keywords"].split(",")]
        r["market"] = [m for m in r["market"].split(";") if m != "none"]
        r["description"] = desc.get(r["id"], "")
        r["formal_source"] = formal.get(r["id"])
        r["wikipedia"] = src.get(r["id"], {}).get("wikipedia", "")
        r["query"] = src.get(r["id"], {}).get("query") or r["name"]
    return rows


budget = {"openalex": None}


def openalex_fetch(url, offline):
    if budget["openalex"]:
        return {"url": url, "status": 0, "body": "", "retrieved": today()}
    try:
        return fetch(url, offline)
    except BudgetExhausted as e:
        budget["openalex"] = str(e)
        print(str(e), file=sys.stderr)
        return {"url": url, "status": 0, "body": "", "retrieved": today()}


def openalex_works(q, offline):
    params = {"filter": f'title_and_abstract.search:"{q}"', "sort": "cited_by_count:desc", "per-page": KEY_WORKS, "select": "id,title,publication_year,cited_by_count,doi,authorships,primary_topic", "mailto": MAILTO}
    e = openalex_fetch(f"{OPENALEX}/works?{urllib.parse.urlencode(params)}", offline)
    return (json.loads(e["body"]).get("results", []) if e["status"] == 200 else []), e


def openalex_activity(q, offline):
    params = {"filter": f'title_and_abstract.search:"{q}"', "group_by": "publication_year", "mailto": MAILTO}
    e = openalex_fetch(f"{OPENALEX}/works?{urllib.parse.urlencode(params)}", offline)
    by_year = {}
    if e["status"] == 200:
        for g in json.loads(e["body"]).get("group_by", []):
            if g["key"].isdigit():
                by_year[g["key"]] = int(g["count"])
    return dict(sorted(by_year.items())), e


def wikipedia(title, offline):
    if not title:
        return None, None, [], []
    quoted = urllib.parse.quote(title.replace(" ", "_"), safe="")
    s = fetch(f"{WIKI}/summary/{quoted}", offline)
    h = fetch(f"{WIKI}/html/{quoted}", offline)
    summary = json.loads(s["body"]) if s["status"] == 200 else None
    return summary, s, infobox(h["body"]) if h["status"] == 200 else [], lead_aliases(h["body"]) if h["status"] == 200 else []


def clean(fragment):
    return html.unescape(TAG.sub(" ", re.sub(r"<(sup|style)[^>]*>.*?</\1>", "", fragment, flags=re.S))).replace("\xa0", " ").strip()


def infobox(page):
    m = re.search(r'<table[^>]*class="[^"]*infobox[^"]*"[^>]*>(.*?)</table>', page, re.S)
    if not m:
        return []
    rows = []
    for th, td in INFOBOX_ROW.findall(m.group(1)):
        label, value = clean(th), re.sub(r"\s+", " ", clean(td))
        if label and value and len(label) < 40:
            rows.append((label, value[:300]))
    return rows


def lead_aliases(page):
    m = re.search(r"<p[^>]*>(?:(?!</p>).)*?<b[^>]*>.*?</p>", page, re.S)
    if not m:
        return []
    out = []
    for b in BOLD.findall(m.group(0)):
        t = clean(b)
        if 2 < len(t) < 80 and t not in out:
            out.append(t)
    return out


def arxiv_total(q, offline):
    params = {"search_query": f'all:"{q}"', "max_results": 1}
    e = fetch(f"{ARXIV}?{urllib.parse.urlencode(params)}", offline)
    m = re.search(r"<opensearch:totalResults[^>]*>(\d+)<", e["body"])
    return (int(m.group(1)) if m else None), e


def role_of(w, p):
    y = w.get("publication_year")
    if SURVEY.search(w.get("title") or ""):
        return "survey"
    if p["resolved"] and y and abs(y - p["resolved"]) <= 1:
        return "resolved"
    if y and y <= p["posed"] + 5:
        return "posed"
    return "partial"


def key_works(works, p, src):
    out = []
    for w in works:
        if not w.get("title"):
            continue
        out.append({"openalex": w["id"].rsplit("/", 1)[-1], "title": w["title"], "year": w.get("publication_year"), "cited_by_count": int(w.get("cited_by_count") or 0), "doi": w.get("doi"), "role": role_of(w, p), "source": src})
    return out


def people_orgs(works, src):
    people, orgs = Counter(), Counter()
    pid, oid = {}, {}
    for w in works:
        seen_orgs = set()
        for a in w.get("authorships", []):
            au = a.get("author") or {}
            if au.get("display_name"):
                people[au["display_name"]] += 1
                pid[au["display_name"]] = (au.get("id") or "").rsplit("/", 1)[-1] or None
            for inst in a.get("institutions", []):
                if inst.get("display_name") and inst["display_name"] not in seen_orgs:
                    seen_orgs.add(inst["display_name"])
                    orgs[inst["display_name"]] += 1
                    oid[inst["display_name"]] = (inst.get("id") or "").rsplit("/", 1)[-1] or None
    ppl = [{"openalex": pid[n], "name": n, "works": c, "source": src} for n, c in people.most_common(TOP_PEOPLE)]
    org = [{"openalex": oid[n], "name": n, "works": c, "source": src} for n, c in orgs.most_common(TOP_PEOPLE)]
    return ppl, org


def industries(p, works):
    sub = Counter((w.get("primary_topic") or {}).get("subfield", {}).get("display_name", "") for w in works)
    sub.pop("", None)
    return list(dict.fromkeys(p["market"] + [s.lower() for s, _ in sub.most_common(3)]))


def related(p, problems):
    kw = {k.lower() for k in p["keywords"]}
    out = []
    for q in problems:
        if q["id"] == p["id"]:
            continue
        shared = sorted(kw & {k.lower() for k in q["keywords"]})
        markets = sorted(set(p["market"]) & set(q["market"]))
        score = 2 * len(shared) + len(markets) + 0.5 * (q["branch"] == p["branch"])
        if shared or markets:
            why = "; ".join(filter(None, ["shared keywords: " + ", ".join(shared) if shared else "", "shared markets: " + ", ".join(markets) if markets else "", "same branch" if q["branch"] == p["branch"] else ""]))
            out.append((score, q["id"], why))
    return [{"id": i, "why": w} for _, i, w in sorted(out, key=lambda t: (-t[0], t[1]))[:5]]


def history(p, rows, wiki_url):
    ev = [{"year": p["posed"], "event": "posed", "source": "problems.tsv"}]
    if p["resolved"]:
        ev.append({"year": p["resolved"], "event": "resolved", "source": "problems.tsv"})
    by = {label[:-3].lower(): value for label, value in rows if label.lower().endswith(" by")}
    for label, value in rows:
        m = YEAR.search(value)
        if not m or label.lower() == "field":
            continue
        prefix = label[:-3].lower() if label.lower().endswith(" in") else None
        who = by.get(prefix)
        event = f"{prefix} by {who}" if prefix and who else f"{label.lower()}: {value}"
        ev.append({"year": int(m.group(1)), "event": event, "source": wiki_url})
    return sorted(ev, key=lambda e: (e["year"], e["event"]))


def repo_titles():
    titles = []
    for f in glob.glob(str(REPO / "openalex-fanout" / "*" / "work.json")):
        try:
            w = json.load(open(f))
        except ValueError:
            continue
        titles.append(("openalex-fanout", w["id"].rsplit("/", 1)[-1], w.get("title") or "", "openalex-fanout/" + Path(f).parent.name))
    for f in glob.glob(str(REPO / "pubmed" / "*" / "metadata.json")):
        try:
            w = json.load(open(f))
        except ValueError:
            continue
        titles.append(("pubmed", "PMID" + str(w.get("pmid")), w.get("title") or "", "pubmed/" + Path(f).parent.name))
    titles += atlas_titles()
    return titles


def atlas_titles():
    manifest = REPO / "src" / "data" / "research-atlas-manifest.json"
    if not manifest.exists():
        return []
    base = REPO.parent / "research-atlas"
    out = []
    try:
        import pyarrow.parquet as pq
    except ImportError:
        return []
    for d in json.load(open(manifest)).get("datasets", []):
        path = base / d["path"]
        if d["table"] not in ("work", "ranking_corpus_sample") or not path.exists():
            continue
        t = pq.read_table(path).to_pylist()
        for r in t:
            out.append(("research-atlas", str(r.get("atlas_id") or r.get("work_id")), r.get("title") or "", "research-atlas:" + d["path"]))
    return out


def mentions(p, aliases, titles):
    phrases = {s.lower() for s in [p["name"], *aliases] if len(s) >= 8}
    out = []
    for corpus, wid, title, src in titles:
        low = title.lower()
        if any(ph in low for ph in phrases):
            out.append({"corpus": corpus, "id": wid, "title": title, "source": src})
    return out[:20]


def build(p, problems, titles, offline):
    sources = []
    summary, s_entry, rows, lead = wikipedia(p["wikipedia"], offline)
    wiki_url = None
    statement = {"text": p["description"], "source": "descriptions.tsv"}
    aliases = []
    if summary:
        wiki_url = summary.get("content_urls", {}).get("desktop", {}).get("page") or s_entry["url"]
        sources.append(source(s_entry) | {"url": wiki_url})
        text = (summary.get("extract") or "").strip()
        if text:
            statement = {"text": text, "source": wiki_url}
        aliases = [a for a in [summary.get("title", "")] + lead if a and a.lower() != p["name"].lower()]
        aliases = list(dict.fromkeys(aliases))
    works, w_entry = openalex_works(p["query"], offline)
    if w_entry["status"]:
        sources.append(source(w_entry))
    by_year, a_entry = openalex_activity(p["query"], offline)
    if a_entry["status"]:
        sources.append(source(a_entry))
    arx, x_entry = arxiv_total(p["query"], offline)
    if x_entry["status"]:
        sources.append(source(x_entry))
    ppl, org = people_orgs(works, w_entry["url"])
    f = p["formal_source"]
    rec = {
        "schema": record_schema.SCHEMA, "id": p["id"], "title": p["name"], "statement": statement, "aliases": aliases,
        "branch": p["branch"], "level": p["level"], "industries": industries(p, works), "posed": p["posed"], "resolved": p["resolved"],
        "history": history(p, rows, wiki_url or "wikipedia"), "key_works": key_works(works, p, w_entry["url"]),
        "activity": {"openalex_by_year": by_year, "openalex_total": sum(by_year.values()), "arxiv_total": arx, "source": a_entry["url"] + (" ; " + x_entry["url"] if arx is not None else "")},
        "people": ppl, "organizations": org, "related": related(p, problems), "repo_mentions": mentions(p, aliases, titles),
        "formal": {"status": p["lean"], "source": f["source"] if f else None, "url": f["url"] if f else None},
        "sources": sources, "retrieved": today(),
    }
    return record_schema.validate(rec)


def has_openalex(rec):
    return any("api.openalex.org" in s["url"] for s in rec["sources"])


def index(records):
    lines = ["# Problem records", "", f"{len(records)} records, built {today()} by `records.py`. Counts are what each source returned.", "",
             "| id | title | statement from | aliases | history | key works | top citations | activity years | OpenAlex works | arXiv | people | orgs | repo mentions |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in records:
        top = max((w["cited_by_count"] for w in r["key_works"]), default=0)
        st = "wikipedia" if "wikipedia.org" in (r["statement"]["source"] or "") else r["statement"]["source"]
        lines.append(f"| {r['id']} | {r['title']} | {st} | {len(r['aliases'])} | {len(r['history'])} | {len(r['key_works'])} | {top} | {len(r['activity']['openalex_by_year'])} | {r['activity']['openalex_total']} | {r['activity']['arxiv_total'] if r['activity']['arxiv_total'] is not None else ''} | {len(r['people'])} | {len(r['organizations'])} | {len(r['repo_mentions'])} |")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--retry-empty", action="store_true")
    a = ap.parse_args()
    problems = load_problems()
    todo = [p for p in problems if a.only is None or p["id"] in a.only]
    RECORDS.mkdir(exist_ok=True)
    titles = repo_titles()
    done = 0
    for p in todo:
        path = RECORDS / f"{p['id']}.json"
        if path.exists() and not a.force and not (a.retry_empty and not has_openalex(json.load(open(path)))):
            continue
        if a.limit is not None and done >= a.limit:
            break
        rec = build(p, problems, titles, a.offline)
        json.dump(rec, open(path, "w"), indent=1, ensure_ascii=False)
        done += 1
        print(p["id"], len(rec["key_works"]), rec["activity"]["openalex_total"], file=sys.stderr)
    records = [json.load(open(RECORDS / f"{p['id']}.json")) for p in problems if (RECORDS / f"{p['id']}.json").exists()]
    (RECORDS / "INDEX.md").write_text(index(records))
    missing = [r["id"] for r in records if not has_openalex(r)]
    print(f"{done} built, {len(records)} records on disk, {len(missing)} without OpenAlex data" + (": rerun with --retry-empty once the budget resets" if missing else ""))


if __name__ == "__main__":
    main()
