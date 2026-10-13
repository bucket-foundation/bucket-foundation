import csv
import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

DATA = Path(os.environ.get("PI_FIT_DATA", Path.home() / ".local/share/bucket-pi-fit"))
CACHE = DATA / "openalex"
SEL = "id,display_name,topics,last_known_institutions,works_count,summary_stats"


def user_agent():
    contact = os.environ.get("PI_FIT_CONTACT")
    return f"bucket.foundation pi-fit (mailto:{contact})" if contact else "bucket.foundation pi-fit"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": user_agent()})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except OSError:
            if i == 3:
                raise
            time.sleep(2 ** i)


def cached(key, url):
    f = CACHE / f"{hashlib.sha256(key.encode()).hexdigest()[:24]}.json"
    if not f.exists():
        f.write_text(json.dumps(get(url)))
        time.sleep(0.2)
    return json.loads(f.read_text())


def profile(a, source, extra=None):
    top = (a.get("topics") or [])[:15]
    fields = sorted({t["field"]["display_name"] for t in top if t.get("field")})
    inst = a.get("last_known_institutions") or [{}]
    return {
        "id": a["id"].rsplit("/", 1)[-1], "name": a["display_name"], "source": source,
        "institution": (inst[0] or {}).get("display_name"), "field": fields[0] if fields else None,
        "fields": fields, "topics": [t["display_name"] for t in top],
        "works": a.get("works_count"), "h_index": (a.get("summary_stats") or {}).get("h_index"),
        **(extra or {}),
    }


def hints():
    f = DATA / "school_hints.json"
    return json.loads(f.read_text()) if f.exists() else {}


def resolve(results, school, pinned=None, hint_map=None):
    if pinned:
        hit = [a for a in results if a["id"].rsplit("/", 1)[-1] == pinned]
        return hit[0] if hit else None
    hint = (hint_map or {}).get(school, school).lower()
    match = [a for a in results if any(hint in ((i or {}).get("display_name") or "").lower() for i in a.get("last_known_institutions") or [])]
    return max(match, key=lambda a: a.get("works_count") or 0) if match else None


def cockpit(path):
    rows = list(csv.DictReader(open(path)))
    return {r["openalex_url"].rsplit("/", 1)[-1]: r for r in rows if r["openalex_url"]}


def network(path):
    lines = path.read_text().splitlines()[1:]
    return [dict(zip(("name", "school", "node", "openalex"), (line.split("\t") + [""] * 4)[:4])) for line in lines if line.strip()]


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    out = {}
    src = os.environ.get("PI_FIT_COCKPIT")
    meta = cockpit(Path(src)) if src else {}
    ids = sorted(meta)
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        q = urllib.parse.quote("ids.openalex:" + "|".join(chunk))
        for a in cached("|".join(chunk), f"https://api.openalex.org/authors?filter={q}&per-page=50&select={SEL}")["results"]:
            out[a["id"]] = profile(a, "cockpit", {"tier": meta[a["id"].rsplit("/", 1)[-1]].get("tier")})
    hint_map = hints()
    for n in network(DATA / "network.tsv"):
        if n["openalex"]:
            res = [cached(n["openalex"], f"https://api.openalex.org/authors/{n['openalex']}?select={SEL}")]
        else:
            res = cached("search:" + n["name"], f"https://api.openalex.org/authors?search={urllib.parse.quote(n['name'])}&per-page=25&select={SEL}")["results"]
        a = resolve(res, n["school"], n["openalex"] or None, hint_map)
        if a is None:
            print(f"skipped {n['name']}: no institution match and no pinned OpenAlex id", file=sys.stderr)
            continue
        out[a["id"]] = profile(a, "network", {"school": n["school"], "node": n["node"], "tier": "network"})
    (DATA / "pis.json").write_text(json.dumps(list(out.values())))
    print(len(out), "PIs")


if __name__ == "__main__":
    main()
