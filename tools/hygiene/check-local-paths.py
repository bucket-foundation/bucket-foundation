#!/usr/bin/env python3
"""check-local-paths.py: block new /home/<user> absolute paths in tracked text files.

A machine-specific absolute path (/home/gian/..., /home/giany/..., /home/alice/...)
checked into a public repo leaks local usernames and directory layout, and
breaks for every other contributor who clones the repo to a different path.
This check catches new instances before they land; it does not rewrite
anything.

Usage:
  check-local-paths.py --staged          # pre-commit: only staged files (git diff --cached)
  check-local-paths.py --all             # full repo: every tracked text file
  check-local-paths.py FILE [FILE ...]   # explicit file list (used by the fixture test)

Exit code 0 = clean, 1 = one or more forbidden paths found.

Allowlist: tools/hygiene/.local-path-allowlist, one repo-relative path per
line, '#' comments and blank lines ignored. A listed file is skipped in
full, for the backup/log/systemd files and the narrative docs flagged in
learning/research-os/compliance/REPO-HYGIENE-2026-09-11.md, where the
existing /home/<user> text is generated data, history, or a description
of this policy. Adding a new file to the allowlist is a deliberate,
reviewed exception.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(
    subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True
    ).stdout.strip()
)
ALLOWLIST_PATH = REPO_ROOT / "tools" / "hygiene" / ".local-path-allowlist"

# Matches /home/<user>/... for any username on any machine.
# The (?<!\w) guard rejects a URL path segment that contains the
# literal text "/home/" (e.g. https://iai.tv/home/speakers-and-authors/...,
# https://persee.fr/web/revues/home/prescript/...), common across this
# repo's scraped bibliographic corpora (archaeology/, openalex*/, arxiv/,
# yt/, blog/, pubmed/), and still matches a real absolute path, always
# preceded by whitespace, a quote, a shell operator, or the start of the
# line, never by a word character from a domain name.
PATH_RE = re.compile(r"(?<!\w)/home/[A-Za-z0-9_][A-Za-z0-9_.-]*(?:/[^\s\"'`)]*)?")


def load_allowlist() -> set[str]:
    if not ALLOWLIST_PATH.exists():
        return set()
    entries = set()
    for line in ALLOWLIST_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        entries.add(line)
    return entries


def staged_files() -> list[str]:
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        capture_output=True, text=True, check=True, cwd=REPO_ROOT,
    ).stdout
    return [line for line in out.splitlines() if line]


def all_tracked_files() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files"], capture_output=True, text=True, check=True, cwd=REPO_ROOT,
    ).stdout
    return [line for line in out.splitlines() if line]


def read_text(rel_path: str) -> str | None:
    """Return file text, or None if the file is missing/binary."""
    p = REPO_ROOT / rel_path
    if not p.is_file():
        return None
    try:
        return p.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def check_files(paths: list[str], allowlist: set[str]) -> int:
    hits = 0
    for rel_path in paths:
        if rel_path in allowlist:
            continue
        text = read_text(rel_path)
        if text is None:
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            m = PATH_RE.search(line)
            if m:
                print(f"{rel_path}:{lineno}: forbidden local path: {m.group(0)}")
                hits += 1
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--staged", action="store_true", help="check only staged files")
    ap.add_argument("--all", action="store_true", help="check every tracked file")
    ap.add_argument("files", nargs="*", help="explicit file list (repo-relative)")
    args = ap.parse_args()

    allowlist = load_allowlist()

    if args.files:
        paths = args.files
    elif args.all:
        paths = all_tracked_files()
    else:
        paths = staged_files()

    hits = check_files(paths, allowlist)
    if hits:
        print(
            f"\n{hits} forbidden local path(s) found.\n"
            "  rewrite:        use ~/... , $HOME/..., a repo-relative path, or\n"
            "                  os.path.expanduser(...) / Path.home() / __file__ in code\n"
            "  known exception: add the repo-relative path to\n"
            f"                  {ALLOWLIST_PATH.relative_to(REPO_ROOT)} with a one-line reason\n",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
