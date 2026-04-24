#!/usr/bin/env python3
"""
parse.py — canon activity feed event parser (bkt-feed-01)

Reads a git diff between two SHAs (or a single commit) and emits JSON Lines
events to stdout. One line per event. No external deps; stdlib only.

Event types:
  add_paper, add_figure, add_branch, add_canon_entry, add_landscape,
  update_dossier, promote, demote, retract

Usage:
  python3 tools/feed/parse.py --from <sha> --to <sha> [--pr <num>]
  python3 tools/feed/parse.py --commit <sha>
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
from typing import Iterable, Optional

CANON_PREFIX = "bucket-canon/"
LANDSCAPE_PREFIX = "research-landscape/"
FIGURES_JSON = "canon-figures/figures.json"

DOSSIER_BASENAMES = {
    "primary-papers.md", "CANON_INDEX.md", "README.md",
    "SEED.md", "DOSSIER.md",
}

BIB_ENTRY_RE = re.compile(r"^@\w+\{([^,\s]+)\s*,", re.MULTILINE)
FIELD_RE = re.compile(r"^\s*(\w+)\s*=\s*[{\"](.+?)[}\"]\s*,?\s*$", re.MULTILINE)


# ---------- git helpers ------------------------------------------------------

def git(*args: str, check: bool = True, cwd: Optional[str] = None) -> str:
    res = subprocess.run(
        ["git", *args], capture_output=True, text=True, cwd=cwd,
    )
    if check and res.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {res.stderr.strip()}")
    return res.stdout


def git_show_file(sha: str, path: str) -> Optional[str]:
    """Return file content at sha, or None if missing."""
    res = subprocess.run(
        ["git", "show", f"{sha}:{path}"], capture_output=True, text=True,
    )
    if res.returncode != 0:
        return None
    return res.stdout


def git_name_status(sha_from: str, sha_to: str) -> list[tuple[str, str, Optional[str]]]:
    """Return list of (status, path, old_path_or_None).

    status is A/M/D/R/C (for renames R contains similarity like R100 — we
    normalize to R).
    """
    out = git(
        "diff", "--name-status", "-M", "--find-renames=50%",
        f"{sha_from}..{sha_to}",
    )
    results: list[tuple[str, str, Optional[str]]] = []
    for line in out.splitlines():
        parts = line.split("\t")
        if not parts:
            continue
        status_raw = parts[0]
        status = status_raw[0]  # strip similarity suffix
        if status == "R" and len(parts) == 3:
            results.append(("R", parts[2], parts[1]))
        elif len(parts) >= 2:
            results.append((status, parts[1], None))
    return results


def git_commit_meta(sha: str) -> dict:
    out = git("show", "-s", "--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%B", sha)
    parts = out.split("\x1f", 4)
    if len(parts) < 5:
        return {"sha": sha, "author_name": "", "author_email": "",
                "iso": "", "msg": ""}
    return {
        "sha": parts[0].strip(),
        "author_name": parts[1],
        "author_email": parts[2],
        "iso": parts[3],
        "msg": parts[4],
    }


def resolve_github_handle(name: str, email: str) -> str:
    if email.endswith("@users.noreply.github.com"):
        local = email.split("@", 1)[0]
        # formats: "12345+handle" or "handle"
        if "+" in local:
            return local.split("+", 1)[1]
        return local
    # fallback: slugify name
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "unknown"


# ---------- path classification ---------------------------------------------

def classify_canon_path(path: str) -> Optional[dict]:
    """Return dict(branch, topic, basename) if path is in bucket-canon/, else None."""
    if not path.startswith(CANON_PREFIX):
        return None
    rest = path[len(CANON_PREFIX):]
    segs = rest.split("/")
    branch = segs[0] if segs else ""
    topic = segs[1] if len(segs) > 1 else ""
    basename = segs[-1]
    return {"branch": branch, "topic": topic, "basename": basename, "rest": rest}


# ---------- bibtex diffing ---------------------------------------------------

def parse_bib_entries(text: Optional[str]) -> dict[str, dict]:
    """cite_key -> {title, doi}"""
    if not text:
        return {}
    entries: dict[str, dict] = {}
    # Split into records by @TYPE{key,
    for m in BIB_ENTRY_RE.finditer(text):
        key = m.group(1)
        start = m.end()
        # find matching closing brace naively by scanning balance
        depth = 1
        i = start
        while i < len(text) and depth > 0:
            c = text[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            i += 1
        body = text[start:i - 1] if i > start else ""
        fields: dict[str, str] = {}
        for fm in FIELD_RE.finditer(body):
            fields[fm.group(1).lower()] = fm.group(2).strip()
        entries[key] = {
            "title": fields.get("title", "").strip(),
            "doi": fields.get("doi", "").strip(),
        }
    return entries


# ---------- figures.json diffing --------------------------------------------

def load_figures(text: Optional[str]) -> dict[str, dict]:
    if not text:
        return {}
    try:
        data = json.loads(text)
    except Exception:
        return {}
    out = {}
    for fig in data.get("figures", []):
        fid = fig.get("id")
        if fid:
            out[fid] = fig
    return out


# ---------- event construction ----------------------------------------------

def event_id(type_: str, path: str, sha: str, extra: str = "") -> str:
    h = hashlib.sha1()
    h.update(f"{type_}|{path}|{sha}|{extra}".encode("utf-8"))
    return h.hexdigest()[:16]


def make_event(**kw) -> dict:
    # required: type, path, commit_sha
    base = {
        "id": event_id(kw["type"], kw["path"], kw["commit_sha"], kw.get("_extra", "")),
        "type": kw["type"],
        "branch": kw.get("branch"),
        "topic": kw.get("topic"),
        "title": kw.get("title"),
        "path": kw["path"],
        "doi": kw.get("doi"),
        "author_github": kw.get("author_github"),
        "author_name": kw.get("author_name"),
        "commit_sha": kw["commit_sha"],
        "pr_number": kw.get("pr_number"),
        "timestamp": kw["timestamp"],
    }
    return base


# ---------- top-level diff processing ---------------------------------------

def process_diff(sha_from: str, sha_to: str, pr: Optional[int]) -> Iterable[dict]:
    meta = git_commit_meta(sha_to)
    author_name = meta["author_name"]
    author_gh = resolve_github_handle(meta["author_name"], meta["author_email"])
    ts = meta["iso"] or datetime.now(timezone.utc).isoformat()
    msg = meta["msg"] or ""
    short_sha = meta["sha"][:7]

    base_kw = dict(
        author_github=author_gh, author_name=author_name,
        commit_sha=short_sha, pr_number=pr, timestamp=ts,
    )

    changes = git_name_status(sha_from, sha_to)

    # Track new branches (for dedup)
    seen_branches: set[str] = set()

    # detect promote/demote via renames first
    for status, path, old_path in changes:
        if status == "R" and old_path:
            old_in_canon = old_path.startswith(CANON_PREFIX)
            old_in_land = old_path.startswith(LANDSCAPE_PREFIX)
            new_in_canon = path.startswith(CANON_PREFIX)
            new_in_land = path.startswith(LANDSCAPE_PREFIX)
            new_in_archive = "/_archive/" in path or path.endswith("/_archive")
            if old_in_land and new_in_canon:
                info = classify_canon_path(path) or {}
                yield make_event(
                    type="promote", path=path,
                    branch=info.get("branch"), topic=info.get("topic"),
                    title=os.path.basename(path),
                    _extra=old_path, **base_kw,
                )
            elif old_in_canon and (new_in_land or new_in_archive):
                info = classify_canon_path(old_path) or {}
                yield make_event(
                    type="demote", path=path,
                    branch=info.get("branch"), topic=info.get("topic"),
                    title=os.path.basename(path),
                    _extra=old_path, **base_kw,
                )

    for status, path, old_path in changes:
        # figures.json — handle separately (A or M)
        if path == FIGURES_JSON:
            old_txt = git_show_file(sha_from, path) if status != "A" else None
            new_txt = git_show_file(sha_to, path) if status != "D" else None
            old_ids = set(load_figures(old_txt).keys())
            new_figs = load_figures(new_txt)
            new_ids = set(new_figs.keys())
            for fid in sorted(new_ids - old_ids):
                fig = new_figs[fid]
                yield make_event(
                    type="add_figure", path=path,
                    branch=(fig.get("branches") or [None])[0],
                    topic=fid,
                    title=fig.get("name") or fid,
                    _extra=fid, **base_kw,
                )
            continue

        info = classify_canon_path(path)

        # Canon paths
        if info is not None:
            branch = info["branch"]
            topic = info["topic"]
            basename = info["basename"]
            rest_segs = info["rest"].split("/")

            if status == "A":
                # new branch? only emit once per branch
                if branch and branch not in seen_branches:
                    # check if branch dir is itself new (parent didn't exist at sha_from)
                    probe = git_show_file(
                        sha_from, f"{CANON_PREFIX}{branch}/README.md"
                    )
                    # also probe a common file; if none of these exist in sha_from
                    # and we see a new file inside, call it a new branch.
                    if probe is None:
                        # confirm via ls-tree
                        res = subprocess.run(
                            ["git", "ls-tree", sha_from, f"{CANON_PREFIX}{branch}"],
                            capture_output=True, text=True,
                        )
                        if not res.stdout.strip():
                            yield make_event(
                                type="add_branch",
                                path=f"{CANON_PREFIX}{branch}",
                                branch=branch, topic=None,
                                title=branch,
                                _extra=branch, **base_kw,
                            )
                            seen_branches.add(branch)
                seen_branches.add(branch)  # dedup within this run

                if basename.endswith(".bib"):
                    # new .bib file: every entry is an add_paper
                    new_txt = git_show_file(sha_to, path) or ""
                    for key, entry in parse_bib_entries(new_txt).items():
                        yield make_event(
                            type="add_paper", path=path,
                            branch=branch, topic=topic,
                            title=entry["title"] or key,
                            doi=entry["doi"] or None,
                            _extra=key, **base_kw,
                        )
                elif basename in DOSSIER_BASENAMES:
                    yield make_event(
                        type="update_dossier", path=path,
                        branch=branch, topic=topic,
                        title=basename,
                        **base_kw,
                    )
                elif basename.endswith(".md"):
                    yield make_event(
                        type="add_canon_entry", path=path,
                        branch=branch, topic=topic,
                        title=basename,
                        **base_kw,
                    )
                # other file types (images, data) — skip silently

            elif status == "M":
                if basename.endswith(".bib"):
                    old_entries = parse_bib_entries(git_show_file(sha_from, path))
                    new_entries = parse_bib_entries(git_show_file(sha_to, path))
                    for key in sorted(set(new_entries.keys()) - set(old_entries.keys())):
                        entry = new_entries[key]
                        yield make_event(
                            type="add_paper", path=path,
                            branch=branch, topic=topic,
                            title=entry["title"] or key,
                            doi=entry["doi"] or None,
                            _extra=key, **base_kw,
                        )
                elif basename in DOSSIER_BASENAMES:
                    yield make_event(
                        type="update_dossier", path=path,
                        branch=branch, topic=topic,
                        title=basename, **base_kw,
                    )

            elif status == "D":
                yield make_event(
                    type="retract", path=path,
                    branch=branch, topic=topic,
                    title=basename, **base_kw,
                )
            continue

        # Landscape paths
        if path.startswith(LANDSCAPE_PREFIX):
            if status == "A" and path.endswith(".md"):
                rest = path[len(LANDSCAPE_PREFIX):]
                yield make_event(
                    type="add_landscape", path=path,
                    branch=None, topic=None,
                    title=os.path.basename(path),
                    **base_kw,
                )
            continue


# ---------- CLI --------------------------------------------------------------

def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Canon feed event parser")
    p.add_argument("--from", dest="sha_from")
    p.add_argument("--to", dest="sha_to")
    p.add_argument("--commit", dest="commit")
    p.add_argument("--pr", dest="pr", type=int, default=None)
    args = p.parse_args(argv)

    if args.commit:
        sha_from = f"{args.commit}^"
        sha_to = args.commit
    elif args.sha_from and args.sha_to:
        sha_from = args.sha_from
        sha_to = args.sha_to
    else:
        p.error("must pass --commit SHA or --from/--to")
        return 2

    for ev in process_diff(sha_from, sha_to, args.pr):
        sys.stdout.write(json.dumps(ev, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
