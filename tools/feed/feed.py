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
 check-cards --base REF [--head REF] list canon cards added or
     promoted between two refs and flag which have no feed event
 emit-for-cards --base REF emit the missing events check-cards
     found (base..HEAD), one command fixes the gap

Idempotent: events with an id already in the ledger are skipped.

check-cards / emit-for-cards close a gap parse.py leaves open: parse.py
walks a *commit-by-commit* diff and only recognizes a promotion via a
rename out of research-landscape/, so a card that lands as new files
under bucket-canon/ (the normal shape of a canon-intake promotion out
of _intake/) never gets an event unless a human remembers to run the
pipeline by hand. check-cards instead diffs two refs directly and
reads the served layer itself: a card is a new primary-papers.yaml
record (id-keyed) or a canon_tier change in that dossier's
CANON_INDEX.md table (DOI-keyed). Event ids come from the card's own
identity, so the same card always maps to the same event no matter
which commit or squash carried it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional
from xml.sax.saxutils import escape

SCHEMA_VERSION = "1.1"
MAX_EVENTS = 200

CANON_PREFIX = "bucket-canon/"
YAML_BASENAME = "primary-papers.yaml"
INDEX_BASENAME = "CANON_INDEX.md"
TIER_RANK = {"draft": 0, "candidate": 1, "canon": 2}


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


def _ref_ok(ref: str, root: Path) -> bool:
    res = subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"],
        capture_output=True, text=True, cwd=root,
    )
    return res.returncode == 0


def ls_tree_paths(ref: str, subpath: str, root: Path) -> list[str]:
    res = subprocess.run(
        ["git", "ls-tree", "-r", "--name-only", ref, "--", subpath],
        capture_output=True, text=True, cwd=root,
    )
    if res.returncode != 0:
        return []
    return [line for line in res.stdout.splitlines() if line.strip()]


def show_at_ref(ref: str, path: str, root: Path) -> Optional[str]:
    res = subprocess.run(
        ["git", "show", f"{ref}:{path}"], capture_output=True, text=True, cwd=root,
    )
    if res.returncode != 0:
        return None
    return res.stdout


def last_commit_touching(ref: str, path: str, root: Path) -> dict:
    res = subprocess.run(
        ["git", "log", "-1", "--format=%H%x1f%an%x1f%ae%x1f%aI", ref, "--", path],
        capture_output=True, text=True, cwd=root,
    )
    out = res.stdout.strip()
    if res.returncode != 0 or not out:
        return {}
    parts = out.split("\x1f")
    if len(parts) < 4:
        return {}
    return {"sha": parts[0], "author_name": parts[1], "author_email": parts[2], "iso": parts[3]}


def resolve_github_handle(name: str, email: str) -> str:
    # Deliberately duplicated from parse.py: the two CLIs stay independent,
    # each invoked directly, neither imports the other.
    if email.endswith("@users.noreply.github.com"):
        local = email.split("@", 1)[0]
        if "+" in local:
            return local.split("+", 1)[1]
        return local
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "unknown"


def _unquote_scalar(v: str) -> str:
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
        v = v[1:-1]
    return v


_RECORD_START_RE = re.compile(r"^-\s+id:\s*(.+?)\s*$")
_RECORD_FIELD_RE = re.compile(r"^  (\w+):\s*(.*)$")
_YAML_RECORD_FIELDS = ("title", "doi", "canon_score")


def parse_yaml_records(text: Optional[str]) -> list[dict]:
    """Pull id/title/doi/canon_score out of a primary-papers.yaml body.

    Not a general YAML parser, this repo controls the generator, so a
    small state machine over the known two-space-indented record shape
    (see any bucket-canon/**/primary-papers.yaml) is enough, and avoids
    a PyYAML dependency in a tool the CI job runs with stdlib only.
    """
    if not text:
        return []
    records: list[dict] = []
    current: Optional[dict] = None
    for line in text.splitlines():
        start = _RECORD_START_RE.match(line)
        if start:
            if current is not None:
                records.append(current)
            current = {"id": _unquote_scalar(start.group(1))}
            continue
        if current is None:
            continue
        field = _RECORD_FIELD_RE.match(line)
        if field and field.group(1) in _YAML_RECORD_FIELDS:
            current[field.group(1)] = _unquote_scalar(field.group(2))
    if current is not None:
        records.append(current)
    return records


_DOI_CELL_RE = re.compile(r"`([^`]+)`")


def parse_canon_index_tiers(text: Optional[str]) -> dict[str, str]:
    """DOI (lowercased, no backticks) -> tier, from a CANON_INDEX.md table.

    Only the common `| Title | DOI | canon_score | tier | ... |` shape is
    read. A handful of older chemistry dossiers use a bibkey-based table
    with no DOI/tier columns; canon_tier tracking does not apply there,
    so they contribute nothing (not an error).
    """
    if not text:
        return {}
    lines = text.splitlines()
    header_idx = None
    cols: list[str] = []
    for i, line in enumerate(lines):
        if "|" not in line:
            continue
        cells = [c.strip().lower() for c in line.strip().strip("|").split("|")]
        if "doi" in cells and "tier" in cells:
            cols = cells
            header_idx = i
            break
    if header_idx is None:
        return {}
    doi_i = cols.index("doi")
    tier_i = cols.index("tier")
    out: dict[str, str] = {}
    for line in lines[header_idx + 1:]:
        if "|" not in line:
            break
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) <= max(doi_i, tier_i):
            continue
        if cells[0] and set(cells[0]) <= {"-", ":"}:
            continue  # markdown header separator row
        m = _DOI_CELL_RE.search(cells[doi_i])
        doi = (m.group(1) if m else cells[doi_i]).strip().lower()
        tier = cells[tier_i].strip()
        if doi and tier:
            out[doi] = tier
    return out


def dossier_files_at(ref: str, root: Path) -> dict[str, dict[str, str]]:
    """dossier dir -> {"yaml": path, "index": path} for every bucket-canon
    dossier at this ref that has a primary-papers.yaml or CANON_INDEX.md."""
    dossiers: dict[str, dict[str, str]] = {}
    for f in ls_tree_paths(ref, CANON_PREFIX, root):
        base = os.path.basename(f)
        if base not in (YAML_BASENAME, INDEX_BASENAME):
            continue
        d = os.path.dirname(f)
        key = "yaml" if base == YAML_BASENAME else "index"
        dossiers.setdefault(d, {})[key] = f
    return dossiers


def _tier_rank(tier: str) -> int:
    return TIER_RANK.get(tier.strip().lower(), -1)


def find_cards(root: Path, base: str, head: str) -> list[dict]:
    """Canon cards added or promoted between base and head.

    A card is either a new primary-papers.yaml record (id-keyed, event
    type add_paper) or a canon_tier change for a record that exists at
    both refs (DOI-keyed against the dossier's CANON_INDEX.md table,
    event type promote or demote by tier rank). Sorted deterministically
    by dossier path, then key, so output and event order are stable.
    """
    dossiers_base = dossier_files_at(base, root)
    dossiers_head = dossier_files_at(head, root)
    cards: list[dict] = []

    for dpath in sorted(set(dossiers_base) | set(dossiers_head)):
        rest = dpath[len(CANON_PREFIX):] if dpath.startswith(CANON_PREFIX) else dpath
        segs = rest.split("/")
        branch = segs[0] if segs and segs[0] else None
        topic = segs[1] if len(segs) > 1 and segs[1] else None

        yaml_head = dossiers_head.get(dpath, {}).get("yaml")
        yaml_base = dossiers_base.get(dpath, {}).get("yaml")
        recs_head = parse_yaml_records(show_at_ref(head, yaml_head, root)) if yaml_head else []
        recs_base = parse_yaml_records(show_at_ref(base, yaml_base, root)) if yaml_base else []
        base_by_id = {r["id"]: r for r in recs_base if r.get("id")}

        index_head = dossiers_head.get(dpath, {}).get("index")
        index_base = dossiers_base.get(dpath, {}).get("index")
        tiers_head = parse_canon_index_tiers(show_at_ref(head, index_head, root)) if index_head else {}
        tiers_base = parse_canon_index_tiers(show_at_ref(base, index_base, root)) if index_base else {}

        for r in sorted(recs_head, key=lambda r: r.get("id") or ""):
            rid = r.get("id")
            if not rid:
                continue
            doi = (r.get("doi") or "").strip().lower()

            if rid not in base_by_id:
                cards.append({
                    "card_type": "add_paper",
                    "path": yaml_head,
                    "branch": branch, "topic": topic,
                    "title": r.get("title") or rid,
                    "doi": r.get("doi"),
                    "key": rid,
                    "detail": f"new record {rid} ({r.get('title') or 'untitled'}) in {yaml_head}",
                })
                continue

            if not doi:
                continue
            tier_head = tiers_head.get(doi)
            tier_base = tiers_base.get(doi)
            if tier_head and tier_base and tier_head.lower() != tier_base.lower():
                card_type = "demote" if _tier_rank(tier_head) < _tier_rank(tier_base) else "promote"
                cards.append({
                    "card_type": card_type,
                    "path": index_head,
                    "branch": branch, "topic": topic,
                    "title": r.get("title") or rid,
                    "doi": r.get("doi"),
                    "key": f"{rid}|tier|{tier_base}->{tier_head}",
                    "detail": f"{rid} canon_tier {tier_base} -> {tier_head} in {index_head}",
                })
    return cards


def card_event_id(card_type: str, path: str, key: str) -> str:
    """Event id for a card, derived from its own identity (type, dossier
    path, id or doi/transition key), never from a commit sha. That is
    what makes check-cards's match idempotent across rebases and
    squashes: the same card always resolves to the same event id no
    matter which commit or PR carried it.
    """
    h = hashlib.sha1()
    h.update(f"card|{card_type}|{path}|{key}".encode("utf-8"))
    return h.hexdigest()[:16]


def build_card_event(card: dict, root: Path, head: str, pr_number: Optional[int] = None) -> dict:
    meta = last_commit_touching(head, card["path"], root) if card.get("path") else {}
    author_name = meta.get("author_name") or None
    author_gh = (
        resolve_github_handle(author_name or "", meta.get("author_email", ""))
        if meta else None
    )
    commit_sha = (meta.get("sha") or "")[:7] or None
    timestamp = meta.get("iso") or datetime.now(timezone.utc).isoformat()
    return {
        "id": card_event_id(card["card_type"], card["path"], card["key"]),
        "type": card["card_type"],
        "branch": card.get("branch"),
        "topic": card.get("topic"),
        "title": card.get("title"),
        "path": card.get("path"),
        "doi": card.get("doi"),
        "author_github": author_gh,
        "author_name": author_name,
        "commit_sha": commit_sha,
        "pr_number": pr_number,
        "timestamp": timestamp,
    }


def cmd_check_cards(base: str, head: str, root: Optional[Path] = None) -> int:
    root = root or repo_root()
    if not _ref_ok(base, root):
        sys.stderr.write(f"check-cards: base ref does not resolve: {base}\n")
        return 2
    if not _ref_ok(head, root):
        sys.stderr.write(f"check-cards: head ref does not resolve: {head}\n")
        return 2

    paths = feed_paths(root)
    ledger_ids = {e.get("id") for e in load_full_ledger(paths["archive_dir"]) if e.get("id")}

    cards = find_cards(root, base, head)
    if not cards:
        sys.stderr.write(f"check-cards: no canon cards between {base}..{head}\n")
        return 0

    missing = []
    for card in cards:
        eid = card_event_id(card["card_type"], card["path"], card["key"])
        status = "ok"
        if eid not in ledger_ids:
            status = "missing"
            missing.append(card)
        sys.stderr.write(f"check-cards: [{status}] {card['card_type']} {card['detail']}\n")

    if not missing:
        sys.stderr.write(f"check-cards: ok ({len(cards)} card(s), all have feed events)\n")
        return 0

    sys.stderr.write(
        f"check-cards: {len(missing)} of {len(cards)} card(s) have no feed event\n"
        f"check-cards: fix with:\n"
        f"  python3 tools/feed/feed.py emit-for-cards --base {base}\n"
    )
    return 1


def cmd_emit_for_cards(base: str, root: Optional[Path] = None) -> int:
    root = root or repo_root()
    head = "HEAD"
    if not _ref_ok(base, root):
        sys.stderr.write(f"emit-for-cards: base ref does not resolve: {base}\n")
        return 2

    paths = feed_paths(root)
    ledger_ids = {e.get("id") for e in load_full_ledger(paths["archive_dir"]) if e.get("id")}

    cards = find_cards(root, base, head)
    events = []
    for card in cards:
        eid = card_event_id(card["card_type"], card["path"], card["key"])
        if eid in ledger_ids:
            continue
        events.append(build_card_event(card, root, head))

    if not events:
        sys.stderr.write(
            f"emit-for-cards: nothing to do, every card between {base}..{head} "
            "already has a feed event\n"
        )
        return 0

    return cmd_update(events, root=root)


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("update")
    r = sub.add_parser("rebuild")
    r.add_argument("--from", dest="sha_from", required=True)
    sub.add_parser("validate")
    cc = sub.add_parser("check-cards")
    cc.add_argument("--base", required=True)
    cc.add_argument("--head", default="HEAD")
    ec = sub.add_parser("emit-for-cards")
    ec.add_argument("--base", required=True)
    args = p.parse_args(argv)

    if args.cmd == "update":
        return cmd_update(read_stdin_events())
    if args.cmd == "rebuild":
        return cmd_rebuild(args.sha_from)
    if args.cmd == "validate":
        return cmd_validate()
    if args.cmd == "check-cards":
        return cmd_check_cards(args.base, args.head)
    if args.cmd == "emit-for-cards":
        return cmd_emit_for_cards(args.base)
    return 2


if __name__ == "__main__":
    sys.exit(main())
