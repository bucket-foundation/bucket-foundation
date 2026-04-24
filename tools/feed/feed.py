#!/usr/bin/env python3
"""
feed.py — canon activity feed writer (bkt-feed-02)

Merges JSON-Lines events from stdin into feed.json, monthly archives at
feed/YYYY-MM.json, and an Atom 1.0 file at feed.xml.

Commands:
  update              read JSON-lines events on stdin, merge into feed
  rebuild --from SHA  replay history from SHA..HEAD through parse.py
  validate            sanity-check feed.json

Idempotent: events with an id already in the feed are skipped.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from xml.sax.saxutils import escape

SCHEMA_VERSION = "1.0"
MAX_EVENTS = 200


def repo_root() -> Path:
    env = os.environ.get("BUCKET_FEED_ROOT")
    if env:
        return Path(env).resolve()
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return Path(out)
    except Exception:
        return Path.cwd()


def feed_paths(root: Path) -> dict:
    return {
        "json": root / "feed.json",
        "xml": root / "feed.xml",
        "archive_dir": root / "feed",
    }


def load_feed(path: Path) -> dict:
    if not path.exists():
        return {
            "schema_version": SCHEMA_VERSION,
            "generated": datetime.now(timezone.utc).isoformat(),
            "total_events": 0,
            "events": [],
        }
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_archive(path: Path) -> list:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except Exception:
            return []
    if isinstance(data, dict):
        return data.get("events", [])
    return data


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def event_month(ev: dict) -> str:
    ts = ev.get("timestamp") or ""
    # accept ISO; fallback to "unknown"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m")
    except Exception:
        return "unknown"


def event_sort_key(ev: dict):
    return ev.get("timestamp") or ""


def render_atom(feed: dict, root_url: str = "https://bucket.foundation") -> str:
    updated = feed.get("generated") or datetime.now(timezone.utc).isoformat()
    lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom">',
        f"  <title>Bucket Canon Activity</title>",
        f'  <link href="{root_url}/feed.xml" rel="self"/>',
        f'  <link href="{root_url}/"/>',
        f"  <id>{root_url}/feed</id>",
        f"  <updated>{escape(updated)}</updated>",
    ]
    for ev in feed.get("events", []):
        eid = ev.get("id") or ""
        title = ev.get("title") or ev.get("type") or "event"
        ts = ev.get("timestamp") or updated
        author = ev.get("author_github") or ev.get("author_name") or "unknown"
        summary = (
            f"{ev.get('type')} · {ev.get('branch') or ''}/{ev.get('topic') or ''} · "
            f"{ev.get('path') or ''}"
        )
        lines += [
            "  <entry>",
            f"    <id>urn:bucket:event:{escape(eid)}</id>",
            f"    <title>{escape(str(title))}</title>",
            f"    <updated>{escape(ts)}</updated>",
            f"    <author><name>{escape(author)}</name></author>",
            f"    <summary>{escape(summary)}</summary>",
            "  </entry>",
        ]
    lines.append("</feed>")
    return "\n".join(lines) + "\n"


def merge_events(existing: list, new_events: list) -> tuple[list, int]:
    """Return (merged, added_count). Newest first. Dedup by id."""
    seen_ids = {e.get("id") for e in existing if e.get("id")}
    added = 0
    merged = list(existing)
    for ev in new_events:
        eid = ev.get("id")
        if not eid or eid in seen_ids:
            continue
        seen_ids.add(eid)
        merged.append(ev)
        added += 1
    merged.sort(key=event_sort_key, reverse=True)
    return merged, added


def update_archives(new_events: list, archive_dir: Path) -> None:
    """Append new events to monthly archives, deduped."""
    by_month: dict[str, list] = {}
    for ev in new_events:
        by_month.setdefault(event_month(ev), []).append(ev)
    for month, evs in by_month.items():
        apath = archive_dir / f"{month}.json"
        existing = load_archive(apath)
        merged, _added = merge_events(existing, evs)
        write_json(apath, {
            "schema_version": SCHEMA_VERSION,
            "month": month,
            "total_events": len(merged),
            "events": merged,
        })


def cmd_update(events_iter: Iterable[dict]) -> int:
    root = repo_root()
    paths = feed_paths(root)
    feed = load_feed(paths["json"])
    new_events = [e for e in events_iter if isinstance(e, dict) and e.get("id")]

    all_existing = feed.get("events", [])
    merged_all, added = merge_events(all_existing, new_events)

    # Update archives using the superset of new events that were actually added
    added_ids = {e["id"] for e in merged_all} - {
        e.get("id") for e in all_existing
    }
    actually_added = [e for e in new_events if e.get("id") in added_ids]
    update_archives(actually_added, paths["archive_dir"])

    # Keep only most recent MAX_EVENTS in feed.json
    feed_display = merged_all[:MAX_EVENTS]
    feed_out = {
        "schema_version": SCHEMA_VERSION,
        "generated": datetime.now(timezone.utc).isoformat(),
        "total_events": len(merged_all),
        "events": feed_display,
    }
    write_json(paths["json"], feed_out)
    paths["xml"].write_text(render_atom(feed_out), encoding="utf-8")
    sys.stderr.write(f"feed: +{added} events (total {len(merged_all)})\n")
    return 0


def read_stdin_events() -> list[dict]:
    events = []
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except Exception as e:
            sys.stderr.write(f"warn: skip malformed event: {e}\n")
    return events


def cmd_rebuild(sha_from: str) -> int:
    root = repo_root()
    # Enumerate commits sha_from..HEAD in chronological order
    out = subprocess.run(
        ["git", "rev-list", "--reverse", f"{sha_from}..HEAD"],
        capture_output=True, text=True, check=True, cwd=root,
    ).stdout
    commits = [c.strip() for c in out.splitlines() if c.strip()]
    if not commits:
        sys.stderr.write("rebuild: no commits in range\n")
        return 0

    # Reset feed (rebuild from scratch)
    paths = feed_paths(root)
    if paths["json"].exists():
        paths["json"].unlink()
    if paths["xml"].exists():
        paths["xml"].unlink()
    if paths["archive_dir"].exists():
        for p in paths["archive_dir"].glob("*.json"):
            p.unlink()

    parse_script = root / "tools" / "feed" / "parse.py"
    total = 0
    for sha in commits:
        res = subprocess.run(
            [sys.executable, str(parse_script), "--commit", sha],
            capture_output=True, text=True, cwd=root,
        )
        if res.returncode != 0:
            sys.stderr.write(f"parse failed for {sha}: {res.stderr}\n")
            continue
        events = []
        for line in res.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except Exception:
                pass
        if events:
            # Use cmd_update logic by temp-injecting
            _apply_events(root, events)
            total += len(events)
    sys.stderr.write(f"rebuild: processed {len(commits)} commits, {total} raw events\n")
    return 0


def _apply_events(root: Path, events: list[dict]) -> None:
    paths = feed_paths(root)
    feed = load_feed(paths["json"])
    merged, _ = merge_events(feed.get("events", []), events)
    added_ids = {e["id"] for e in merged} - {
        e.get("id") for e in feed.get("events", [])
    }
    actually_added = [e for e in events if e.get("id") in added_ids]
    update_archives(actually_added, paths["archive_dir"])
    feed_out = {
        "schema_version": SCHEMA_VERSION,
        "generated": datetime.now(timezone.utc).isoformat(),
        "total_events": len(merged),
        "events": merged[:MAX_EVENTS],
    }
    write_json(paths["json"], feed_out)
    paths["xml"].write_text(render_atom(feed_out), encoding="utf-8")


def cmd_validate() -> int:
    root = repo_root()
    paths = feed_paths(root)
    if not paths["json"].exists():
        sys.stderr.write("validate: feed.json missing\n")
        return 1
    feed = load_feed(paths["json"])
    required_top = {"schema_version", "generated", "total_events", "events"}
    missing = required_top - set(feed.keys())
    if missing:
        sys.stderr.write(f"validate: missing keys {missing}\n")
        return 1
    required_event = {"id", "type", "path", "commit_sha", "timestamp"}
    seen = set()
    for ev in feed["events"]:
        if not isinstance(ev, dict):
            sys.stderr.write("validate: non-dict event\n")
            return 1
        m = required_event - set(ev.keys())
        if m:
            sys.stderr.write(f"validate: event missing keys {m}\n")
            return 1
        if ev["id"] in seen:
            sys.stderr.write(f"validate: duplicate event id {ev['id']}\n")
            return 1
        seen.add(ev["id"])
    sys.stderr.write(f"validate: ok ({len(feed['events'])} events)\n")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("update")
    r = sub.add_parser("rebuild")
    r.add_argument("--from", dest="sha_from", required=True)
    sub.add_parser("validate")
    args = p.parse_args(argv)

    if args.cmd == "update":
        return cmd_update(read_stdin_events())
    if args.cmd == "rebuild":
        return cmd_rebuild(args.sha_from)
    if args.cmd == "validate":
        return cmd_validate()
    return 2


if __name__ == "__main__":
    sys.exit(main())
