from __future__ import annotations

import datetime
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from ..datasets.common import GB, REPO, disk_job, require_free
from .store import EVOLUTION_DATA

ENDOFLIFE_API = "https://endoflife.date/api/v1"
ENDOFLIFE_CATEGORIES = ("os", "lang")
QLEVER = os.environ.get("EVOLUTION_QLEVER_ENDPOINT") or "https://qlever.dev/api/wikidata"
CADENCE = {"endoflife": datetime.timedelta(hours=20), "wikidata": datetime.timedelta(days=6, hours=20)}
TRANSIENT = 1 * GB
IMPORTER = Path("scripts") / "research-os" / "evolution" / "import-live.ts"
ATTEMPTS = 3

Http = Callable[[str, bytes | None], bytes]

PREFIXES = (
    "PREFIX wd: <http://www.wikidata.org/entity/> "
    "PREFIX wdt: <http://www.wikidata.org/prop/direct/> "
    "PREFIX p: <http://www.wikidata.org/prop/> "
    "PREFIX ps: <http://www.wikidata.org/prop/statement/> "
    "PREFIX psv: <http://www.wikidata.org/prop/statement/value/> "
    "PREFIX pqv: <http://www.wikidata.org/prop/qualifier/value/> "
    "PREFIX wikibase: <http://wikiba.se/ontology#> "
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> "
)
TREE = '{ ?item wdt:P31/wdt:P279* wd:Q9143 . BIND("language" AS ?class) } UNION { ?item wdt:P31/wdt:P279* wd:Q9135 . BIND("os" AS ?class) }'
QUERIES = {
    "items": PREFIXES + "SELECT ?item ?class ?label WHERE { " + TREE + ' OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) = "en") } }',
    "inception": PREFIXES + "SELECT ?item ?time ?precision WHERE { " + TREE + " ?item p:P571/psv:P571 ?tv . ?tv wikibase:timeValue ?time ; wikibase:timePrecision ?precision }",
    "versions": PREFIXES + "SELECT ?item ?version ?time ?precision WHERE { " + TREE + " ?item p:P348 ?st . ?st ps:P348 ?version . ?st pqv:P577 ?tv . ?tv wikibase:timeValue ?time ; wikibase:timePrecision ?precision }",
    "links": PREFIXES + "SELECT ?item ?prop ?target WHERE { " + TREE + " { ?item wdt:P144 ?target . BIND(\"based_on\" AS ?prop) } UNION { ?item wdt:P737 ?target . BIND(\"influenced_by\" AS ?prop) } }",
}

def http(url: str, data: bytes | None = None) -> bytes:
    headers = {"User-Agent": "bucket-foundation-evolution-live/1", "Accept": "application/json, application/sparql-results+json"}
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.read()

def with_retries(get: Http, url: str, data: bytes | None = None, attempts: int = ATTEMPTS, pause: Callable[[float], None] = time.sleep) -> bytes:
    for n in range(1, attempts + 1):
        try:
            return get(url, data)
        except Exception:
            if n == attempts:
                raise
            pause(30.0 * n)
    raise AssertionError("unreachable")

def dump(doc: Any) -> bytes:
    return (json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")

def endoflife_files(get: Http) -> dict[str, bytes]:
    listing = json.loads(with_retries(get, f"{ENDOFLIFE_API}/products"))
    names = sorted(p["name"] for p in listing["result"] if p.get("category") in ENDOFLIFE_CATEGORIES)
    out: dict[str, bytes] = {}
    for name in names:
        product = json.loads(with_retries(get, f"{ENDOFLIFE_API}/products/{urllib.parse.quote(name)}"))["result"]
        releases = [{"name": r["name"], "releaseDate": r.get("releaseDate")} for r in product.get("releases", [])]
        body = json.dumps({"result": {"name": product["name"], "releases": releases}}, ensure_ascii=False, indent=1) + "\n"
        out[f"endoflife/products/{name}.json"] = body.encode("utf-8")
    return out

def edtf(time_value: str, precision: int) -> str | None:
    if not time_value or time_value[0] == "-":
        return None
    day = time_value.lstrip("+")[:10]
    if precision >= 11:
        return day
    if precision == 10:
        return day[:7]
    if precision == 9:
        return day[:4]
    return None

def _bindings(raw: bytes) -> list[dict[str, str]]:
    doc = json.loads(raw)
    return [{k: v["value"] for k, v in b.items()} for b in doc["results"]["bindings"]]

def _qid(uri: str) -> str | None:
    tail = uri.rsplit("/", 1)[-1]
    return tail if tail.startswith("Q") and tail[1:].isdigit() else None

def wikidata_rows(results: dict[str, list[dict[str, str]]]) -> list[dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for b in results["items"]:
        qid = _qid(b["item"])
        if not qid:
            continue
        row = rows.setdefault(qid, {"id": qid, "label": None, "classes": set()})
        row["classes"].add(b["class"])
        if b.get("label") and (row["label"] is None or b["label"] < row["label"]):
            row["label"] = b["label"]
    for b in results["inception"]:
        qid = _qid(b["item"])
        date = edtf(b["time"], int(b["precision"])) if qid in rows else None
        if date and ("inception" not in rows[qid] or date < rows[qid]["inception"]):
            rows[qid]["inception"] = date
    for b in results["versions"]:
        qid = _qid(b["item"])
        date = edtf(b["time"], int(b["precision"])) if qid in rows else None
        if date:
            rows[qid].setdefault("versions", set()).add((b["version"], date))
    for b in results["links"]:
        qid, target = _qid(b["item"]), _qid(b["target"])
        if qid in rows and target and target != qid:
            rows[qid].setdefault(b["prop"], set()).add(target)
    out = []
    for qid in sorted(rows, key=lambda q: int(q[1:])):
        r = rows[qid]
        row: dict[str, Any] = {"id": qid, "label": r["label"] or qid, "class": "os" if "os" in r["classes"] else "language"}
        if "inception" in r:
            row["inception"] = r["inception"]
        if r.get("versions"):
            row["versions"] = [{"v": v, "date": d} for v, d in sorted(r["versions"], key=lambda x: (x[1], x[0]))]
        for key in ("based_on", "influenced_by"):
            if r.get(key):
                row[key] = sorted(r[key], key=lambda q: int(q[1:]))
        out.append(row)
    return out

def wikidata_files(get: Http, endpoint: str = QLEVER) -> dict[str, bytes]:
    results = {name: _bindings(with_retries(get, endpoint, urllib.parse.urlencode({"query": q}).encode())) for name, q in QUERIES.items()}
    body = b"".join(dump(r) for r in wikidata_rows(results))
    return {"wikidata/software/software.jsonl": body}

FEEDS: dict[str, Callable[[Http], dict[str, bytes]]] = {"endoflife": endoflife_files, "wikidata": wikidata_files}

@dataclass
class RunReport:
    started: str
    due: list[str]
    feeds: dict[str, dict[str, Any]] = field(default_factory=dict)
    imported: dict[str, Any] | None = None
    manifest: str | None = None

    @property
    def changed(self) -> list[str]:
        return [c["path"] for f in self.feeds.values() for c in f.get("changed", [])]

def runs_dir(data: Path) -> Path:
    return data / "live" / "runs"

def last_fetch(data: Path) -> dict[str, datetime.datetime]:
    seen: dict[str, datetime.datetime] = {}
    folder = runs_dir(data)
    if not folder.exists():
        return seen
    for path in sorted(folder.glob("*.json")):
        doc = json.loads(path.read_text())
        at = datetime.datetime.fromisoformat(doc["started"])
        for name in doc.get("feeds", {}):
            seen[name] = max(seen.get(name, at), at)
    return seen

def due_feeds(data: Path, now: datetime.datetime, force: bool = False) -> list[str]:
    if force:
        return sorted(FEEDS)
    seen = last_fetch(data)
    return [name for name in sorted(FEEDS) if name not in seen or now - seen[name] >= CADENCE[name]]

def _write(path: Path, body: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".part")
    tmp.write_bytes(body)
    tmp.rename(path)

def stage(data: Path, files: dict[str, bytes], dry_run: bool) -> dict[str, Any]:
    changed, unchanged = [], 0
    for rel, body in sorted(files.items()):
        path = data / rel
        if path.exists() and path.read_bytes() == body:
            unchanged += 1
            continue
        changed.append({"path": f"_intake/evolution/{rel}", "sha256": hashlib.sha256(body).hexdigest(), "bytes": len(body)})
        if not dry_run:
            _write(path, body)
    return {"files": len(files), "unchanged": unchanged, "changed": changed}

def import_command(repo: Path, paths: list[str]) -> list[str] | None:
    custom = os.environ.get("EVOLUTION_IMPORT_CMD")
    if custom:
        return custom.split() + paths
    if not (repo / IMPORTER).exists():
        return None
    return ["npx", "ts-node", "--compiler-options", '{"module":"commonjs"}', str(IMPORTER), *paths]

def run_import(repo: Path, paths: list[str], runner: Callable[..., subprocess.CompletedProcess] = subprocess.run) -> dict[str, Any]:
    cmd = import_command(repo, paths)
    if cmd is None:
        return {"status": "skipped", "reason": f"{IMPORTER} is absent from {repo.name}; bronze stays staged for the next run"}
    env = {**os.environ, "EVOLUTION_BATCH_PROMOTION": "off"}
    done = runner(cmd, cwd=repo, env=env, capture_output=True, text=True)
    if done.returncode != 0:
        raise RuntimeError(f"importer exited {done.returncode}: {(done.stderr or '')[-400:]}")
    return {"status": "ok", "files": len(paths)}

def pending_imports(data: Path) -> list[str]:
    folder = runs_dir(data)
    pending: dict[str, None] = {}
    if not folder.exists():
        return []
    for path in sorted(folder.glob("*.json")):
        doc = json.loads(path.read_text())
        changed = [c["path"] for f in doc.get("feeds", {}).values() for c in f.get("changed", [])]
        if (doc.get("imported") or {}).get("status") == "ok":
            pending.clear()
        else:
            for p in changed:
                pending[p] = None
    return list(pending)

def run(
    data: Path = EVOLUTION_DATA,
    repo: Path = REPO,
    get: Http = http,
    now: Callable[[], datetime.datetime] = lambda: datetime.datetime.now(datetime.timezone.utc),
    dry_run: bool = False,
    force: bool = False,
    runner: Callable[..., subprocess.CompletedProcess] = subprocess.run,
    need: int | None = None,
) -> RunReport:
    started = now()
    due = due_feeds(data, started, force)
    report = RunReport(started=started.isoformat(), due=due)
    if not due:
        return report
    fetched = {name: FEEDS[name](get) for name in due}
    if dry_run:
        report.feeds = {name: stage(data, files, dry_run=True) for name, files in fetched.items()}
        return report
    with disk_job(data):
        require_free(data, TRANSIENT, need=need)
        report.feeds = {name: stage(data, files, dry_run=False) for name, files in fetched.items()}
        paths = list(dict.fromkeys(pending_imports(data) + report.changed))
        failure: Exception | None = None
        try:
            report.imported = run_import(repo, paths, runner) if paths else {"status": "nothing"}
        except Exception as err:
            failure = err
            report.imported = {"status": "failed", "error": str(err)[-400:]}
        stamp = started.strftime("%Y-%m-%dT%H%M%SZ")
        path = runs_dir(data) / f"{stamp}.json"
        _write(path, (json.dumps({"started": report.started, "feeds": report.feeds, "imported": report.imported}, indent=2, sort_keys=True) + "\n").encode())
        report.manifest = str(path)
        if failure is not None:
            raise failure
    return report

def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(prog="python -m bucket_eval.evolution.live")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args(argv)
    try:
        report = run(dry_run=args.dry_run, force=args.force)
    except Exception as err:
        print(f"evolution-live: failed: {type(err).__name__}: {err}", file=sys.stderr)
        return 1
    summary = {name: {"files": f["files"], "changed": len(f["changed"])} for name, f in report.feeds.items()}
    print(json.dumps({"due": report.due, "feeds": summary, "imported": report.imported, "manifest": report.manifest, "dry_run": args.dry_run}))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
