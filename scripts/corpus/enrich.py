#!/usr/bin/env python3
import argparse
import gzip
import json
import pathlib
import re
import sqlite3

from collect import digest


def enrich(root, out):
    root, out = pathlib.Path(root), pathlib.Path(out)
    graph = json.loads((out / "graph-preview.json").read_text())
    topics = json.loads(pathlib.Path(__file__).with_name("topics.json").read_text())
    known = {x["provenance"]["url"]: x["slug"] for x in graph["nodes"]}
    fetched = {x["provenance"]["url"]: x["provenance"]["text_sha256"] for x in graph["nodes"] if x["provenance"]["fetch_state"] == "fetched"}
    db = sqlite3.connect(root / "corpus.sqlite")
    proposals = []
    refs = {}
    for topic in topics:
        slug = "topic-" + topic["slug"]
        graph["nodes"].append(dict(slug=slug, title=topic["title"], kind="concept", tier=14, branch="10-literature", summary=None, labels={"en": {"title": topic["title"]}}, provenance={"type": "curated_topic_label", "review_required": True}))
        pattern = re.compile(r"\b(?:" + "|".join(re.escape(x) for x in topic["phrases"]) + r")\b", re.I)
        for url, text in db.execute("select url,body from texts order by url"):
            if url not in fetched or digest(text) != fetched[url]:
                continue
            match = pattern.search(text)
            if match:
                graph["edges"].append(dict(fromSlug=known[url], toSlug=slug, kind="bridges", confidence=0.5, confidenceSource="inferred", provenance={"method": "literal_phrase_candidate", "review_required": True, "text_sha256": digest(text), "start": match.start(), "end": match.end(), "offset_unit": "unicode_codepoint_end_exclusive", "match": match.group(), "rule": "first_literal_phrase_v1"}))
        for target in topic.get("academy", []):
            proposals.append({"fromSlug": slug, "toSlug": target, "kind": "bridges", "review_required": True, "relation": "editorial_candidate", "endpoint_status": "existing_academy_slug_requires_live_resolution"})
    for url, raw in db.execute("select url,metadata from sources where state='fetched' order by url"):
        if url not in fetched:
            continue
        for link in json.loads(raw).get("links", []):
            target = link["url"]
            if target in known:
                continue
            refs.setdefault(target, set()).add(url)
    (out / "adjacent-references.jsonl").write_text("".join(json.dumps({"url": target, "source_urls": sorted(sources), "state": "reference_only", "relation": "observed_html_link"}, ensure_ascii=False) + "\n" for target, sources in sorted(refs.items())))
    (out / "academy-bridge-proposals.json").write_text(json.dumps(proposals, indent=2))
    graph["stats"].update(nodes=len(graph["nodes"]), edges=len(graph["edges"]), topic_nodes=len(topics), adjacent_reference_urls=len(refs))
    slugs = {n["slug"] for n in graph["nodes"]}
    if len(slugs) != len(graph["nodes"]) or any(e["fromSlug"] not in slugs or e["toSlug"] not in slugs for e in graph["edges"]):
        raise ValueError("invalid enriched graph endpoints")
    payload = json.dumps(graph, ensure_ascii=False, separators=(",", ":")).encode()
    (out / "graph-with-topics.json.gz").write_bytes(gzip.compress(payload, mtime=0))
    (out / "topic-stats.json").write_text(json.dumps(graph["stats"], indent=2))
    db.close()
    print(json.dumps(graph["stats"]))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--root", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    enrich(a.root, a.out)
