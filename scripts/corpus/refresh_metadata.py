#!/usr/bin/env python3
import argparse
import json
import pathlib
import sqlite3
import urllib.parse

from bs4 import BeautifulSoup

from collect import canonical


def refresh(root):
    root = pathlib.Path(root)
    db = sqlite3.connect(root / "corpus.sqlite", timeout=30)
    ids = dict(db.execute("select url,rowid from texts"))
    changed = []
    rows = db.execute("select url,metadata from sources where state='fetched'").fetchall()
    for url, serialized in rows:
        meta = json.loads(serialized)
        if "html" not in meta["content_type"]:
            continue
        folder = root / meta["raw_path"]
        raw = (folder / "response.bin").read_bytes()
        end = raw.lower().find(b"</head>")
        head = BeautifulSoup(raw[:end+7] if end >= 0 else raw[:262144], "html.parser")
        og = head.select_one('meta[property="og:title"][content]')
        link = head.select_one('link[rel="canonical"][href]')
        old = meta["title"]
        if og:
            meta["title"] = og["content"]
        if link:
            try:
                meta["publisher_canonical_url"] = canonical(urllib.parse.urljoin(meta["final_url"], link["href"]))
            except (ValueError, UnicodeError):
                pass
        meta["metadata_version"] = "publisher-head-v2"
        updated = db.execute("update sources set metadata=? where url=? and state='fetched'", (json.dumps(meta, ensure_ascii=False), url))
        if updated.rowcount:
            if old != meta["title"] and url in ids:
                db.execute("update texts set title=? where rowid=?", (meta["title"], ids[url]))
                changed.append({"url": url, "previous_title": old, "publisher_title": meta["title"]})
            (folder / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        db.commit()
    db.close()
    return changed


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--root", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    result = refresh(a.root)
    pathlib.Path(a.out).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps({"publisher_titles_updated": len(result)}))
