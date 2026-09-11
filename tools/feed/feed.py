#!/usr/bin/env python3
"""
feed.py, canon activity feed writer (bkt-feed-02)

Merges JSON-Lines events from stdin into the monthly ledger at
feed/YYYY-MM.json, then rewrites feed.json and feed.xml from that ledger.

The monthly files under feed/ are the durable record: every event ever
emitted, forever, append-only. feed.json and feed.xml are a derived,
rolling window over the latest MAX_EVENTS of that ledger, rebuilt fresh
on every run. `total_events` in feed.json always counts the full ledger,
not the window, so it can only grow. The `window` field on feed.json
says how many of those events the `events` array carries. A
retraction is its own ledger event (type `retract`, see parse.py); the
original event is never deleted, and a later re-add is a new event with
its own id. Nothing is ever removed from the ledger.

Commands:
 update read JSON-lines events on stdin, merge into the ledger
 rebuild --from SHA replay history from SHA..HEAD through parse.py
 validate sanity-check feed.json against the ledger

Idempotent: events with an id already in the ledger are skipped.
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

SCHEMA_VERSION = "1.1"
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
            "window": {"size": MAX_EVENTS, "returned": 0},
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


def load_full_ledger(archive_dir: Path) -> list:
    """Load every monthly archive and return the deduped union, newest first.

    This is the source of truth for total_events. feed.json only ever
    holds a rolling window, so its own on-disk state is never enough to
    compute a correct total, before or after a restart that starts from
    a fresh checkout with no prior feed.json.
    """
    if not archive_dir.exists():
        return []
    seen_ids: set = set()
    ledger: list = []
    for apath in sorted(archive_dir.glob("*.json")):
        for ev in load_archive(apath):
            eid = ev.get("id")
            if not eid or eid in seen_ids:
                continue
            seen_ids.add(eid)
            ledger.append(ev)
    ledger.sort(key=event_sort_key, reverse=True)
    return ledger


def build_feed_output(archive_dir: Path) -> dict:
    """Build the feed.json/feed.xml payload from the ledger.

    total_events counts the whole ledger. events carries only the
    latest window many of them; window says how many that is and how
    many the array holds, so a reader never has to guess.
    """
    ledger = load_full_ledger(archive_dir)
    window_events = ledger[:MAX_EVENTS]
    return {
        "schema_version": SCHEMA_VERSION,
        "generated": datetime.now(timezone.utc).isoformat(),
        "total_events": len(ledger),
        "window": {"size": MAX_EVENTS, "returned": len(window_events)},
        "events": window_events,
    }


def cmd_update(events_iter: Iterable[dict], root: Path | None = None) -> int:
    root = root or repo_root()
    paths = feed_paths(root)
    new_events = [e for e in events_iter if isinstance(e, dict) and e.get("id")]

    before_total = len(load_full_ledger(paths["archive_dir"]))
    update_archives(new_events, paths["archive_dir"])

    feed_out = build_feed_output(paths["archive_dir"])
    write_json(paths["json"], feed_out)
    paths["xml"].write_text(render_atom(feed_out), encoding="utf-8")
    added = feed_out["total_events"] - before_total
    sys.stderr.write(f"feed: +{added} events (total {feed_out['total_events']})\n")
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
            cmd_update(events, root=root)
            total += len(events)
    sys.stderr.write(f"rebuild: processed {len(commits)} commits, {total} raw events\n")
    return 0


def cmd_validate() -> int:
    root = repo_root()
    paths = feed_paths(root)
    if not paths["json"].exists():
        sys.stderr.write("validate: feed.json missing\n")
        return 1
    feed = load_feed(paths["json"])
    required_top = {"schema_version", "generated", "total_events", "window", "events"}
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

    window = feed["window"]
    if window.get("size") != MAX_EVENTS:
        sys.stderr.write(
            f"validate: window.size {window.get('size')} != MAX_EVENTS {MAX_EVENTS}\n"
        )
        return 1
    if window.get("returned") != len(feed["events"]):
        sys.stderr.write(
            f"validate: window.returned {window.get('returned')} != "
            f"len(events) {len(feed['events'])}\n"
        )
        return 1
    if feed["total_events"] < len(feed["events"]):
        sys.stderr.write("validate: total_events is smaller than the returned window\n")
        return 1

    if paths["archive_dir"].exists():
        ledger_count = len(load_full_ledger(paths["archive_dir"]))
        if ledger_count != feed["total_events"]:
            sys.stderr.write(
                f"validate: total_events {feed['total_events']} != "
                f"ledger count {ledger_count}\n"
            )
            return 1

    sys.stderr.write(
        f"validate: ok ({len(feed['events'])} of {feed['total_events']} events)\n"
    )
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
