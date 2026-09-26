#!/usr/bin/env python3
import argparse
import json
import pathlib

from collect import Collector, digest, stamp


def ingest(root, config):
    c = Collector(root, config)
    report = []
    for folder in sorted((c.root / "youtube").glob("*")):
        if not folder.is_dir():
            continue
        if not (folder / "transcript.vtt").exists() or not (folder / "metadata.json").exists():
            report.append({"id": folder.name, "state": "missing_captions"})
            continue
        source = json.loads((folder / "metadata.json").read_text())
        url = "https://www.youtube.com/watch?v=" + source["id"]
        raw = (folder / "transcript.vtt").read_bytes()
        text = (folder / "transcript.txt").read_text()
        revision = digest(raw)
        relative = pathlib.Path("raw") / digest(url) / revision
        target = c.root / relative
        target.mkdir(parents=True, exist_ok=True)
        (target / "response.bin").write_bytes(raw)
        (target / "text.txt").write_text(text)
        (target / "transcript.txt").write_text(text)
        meta = dict(url=url, final_url=url, title=source.get("title", source["id"]), fetched_at=stamp(), source_id=digest(url), revision_sha256=revision, text_sha256=digest(text), bytes=len(raw), text_characters=len(text), transcript_characters=len(text), content_type="text/vtt", extraction_version="agf-yt-vtt", offset_unit="unicode_codepoint_end_exclusive", raw_path=str(relative), rights_status="unreviewed_local_only", selector="agf-yt", links=[], caption_origin="YouTube provided captions; automatic/manual status unverified", youtube_metadata_sha256=digest((folder / "metadata.json").read_bytes()), published_date=source.get("upload_date"), channel=source.get("channel"))
        previous = c.db.execute("select state,metadata from sources where url=?", (url,)).fetchone()
        if previous and previous[0] == "withdrawn":
            report.append({"id": source["id"], "state": "withdrawn"})
            continue
        if previous and json.loads(previous[1]).get("revision_sha256") == revision:
            meta["fetched_at"] = json.loads(previous[1])["fetched_at"]
        (target / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
        c.db.execute("insert into sources values (?,?,?,?) on conflict(url) do update set state=excluded.state,metadata=excluded.metadata", (url, "youtube", "fetched", json.dumps(meta, ensure_ascii=False)))
        c.db.execute("delete from texts where url=?", (url,))
        c.db.execute("insert into texts values (?,?,?,?)", (url, meta["title"], text, text))
        c.db.commit()
        report.append({"id": source["id"], "url": url, "title": meta["title"], "state": "fetched", "caption_sha256": revision, "characters": len(text), "caption_origin": meta["caption_origin"]})
    c.db.close()
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--root", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    report = ingest(a.root, json.loads(pathlib.Path(__file__).with_name("sources.json").read_text()))
    pathlib.Path(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({"youtube_sources": len(report), "fetched": sum(x["state"] == "fetched" for x in report)}))
