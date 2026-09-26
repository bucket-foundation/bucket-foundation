#!/usr/bin/env python3
import argparse
import collections
import hashlib
import json
import pathlib
import sqlite3


def verify(root):
    root = pathlib.Path(root)
    db = sqlite3.connect(root / "corpus.sqlite")
    db.execute("begin")
    indexed_hashes = collections.defaultdict(list)
    for url, body in db.execute("select url,body from texts"):
        indexed_hashes[url].append(hashlib.sha256(body.encode()).hexdigest())
    errors = []
    revisions = collections.Counter()
    selectors = collections.Counter()
    fetched = 0
    transcript_count = 0
    for url, state, raw in db.execute("select url,state,metadata from sources order by url"):
        if state != "fetched":
            continue
        fetched += 1
        m = json.loads(raw)
        path = root / m["raw_path"]
        for file, expected in (("response.bin", m["revision_sha256"]), ("text.txt", m["text_sha256"])):
            if not (path / file).is_file() or hashlib.sha256((path / file).read_bytes()).hexdigest() != expected:
                errors.append({"url": url, "error": "hash mismatch", "file": file})
        if m["transcript_characters"]:
            transcript_count += 1
            if len((path / "transcript.txt").read_text()) != m["transcript_characters"]:
                errors.append({"url": url, "error": "transcript length mismatch"})
        revisions[m["revision_sha256"]] += 1
        selectors[m["selector"]] += 1
        indexed = indexed_hashes[url]
        if len(indexed) != 1 or indexed[0] != m["text_sha256"]:
            errors.append({"url": url, "error": "index mismatch"})
    states = dict(db.execute("select state,count(*) from sources group by state"))
    total = db.execute("select count(*) from sources").fetchone()[0]
    if sum(states.values()) != total:
        errors.append({"error": "coverage partition mismatch"})
    report = {"checked_fetched_urls": fetched, "unique_raw_revisions": len(revisions), "duplicate_raw_revisions": fetched-len(revisions), "transcript_urls": transcript_count, "selectors": dict(selectors), "states": states, "discovered_total": total, "errors": errors}
    db.close()
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--root", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    report = verify(a.root)
    pathlib.Path(a.out).write_text(json.dumps(report, indent=2))
    print(json.dumps(report))
    raise SystemExit(bool(report["errors"]))
