"""`publish`: commit one campaign run's artifacts and its paper, and
mirror the built PDF to Google Drive.

Follows `~/agfarms/CLAUDE.md`'s Cloud Share pattern (`rclone` to
`gdrive:AGFarms/Nucleus/<area>/<project>/`, never `/tmp`, never a `zip`)
and its own commit rules (a new commit on the current branch, no
`--amend`, no force push, conventional-commits message). `hte/runs/` is
this package's own `.gitignore` entry, so this module force-adds the
handful of top-level artifact files one run produced
(`hte.runner.run_campaign`'s own layout) instead of the whole `runs/`
tree, which would also pull in `_llm-cache/` and every other campaign's
own files.

Never pushes, and never mints: `mint_hook` below is the one step this
module deliberately does not implement, minting a Story Protocol IP NFT
needs the founder's own wallet key, which this pipeline does not hold
and must not be handed (`~/agfarms/CLAUDE.md`'s Viatika/x402 integration
architecture keeps wallet signing at the vendor or the founder, never
inside an agent's own process).
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
GDRIVE_BASE = "gdrive:AGFarms/Nucleus/bucket-foundation/papers"

_RUN_ARTIFACT_NAMES = [
    "MANIFEST.json", "timeline.json", "TIMELINE.md",
    "calibration.json", "CALIBRATION.md", "self-report.json", "run.log",
]
_PAGE_COUNT_RE = re.compile(r"Output written on \S+\.pdf \((\d+) pages?")
_SKIP_NAMES = {".referee-lint-tmp.md"}


class PublishError(RuntimeError):
    """Base class for every error this module raises."""


def _run(cmd: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, cwd=cwd or REPO_ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace", check=True,
    )


def _run_artifact_files(run_dir: Path) -> list[Path]:
    """Every top-level artifact `run_dir` wrote, of the names
    `hte.runner.run_campaign` is known to produce. A run that disabled
    calibration, say, has fewer of these; nothing here assumes every
    name is present."""
    return [run_dir / n for n in _RUN_ARTIFACT_NAMES if (run_dir / n).is_file()]


def _paper_files(paper_dir: Path) -> list[Path]:
    """Every file under `paper_dir`, excluding this pipeline's own
    scratch files (`_llm-cache/`, the referee's temp lint copy) and
    LaTeX's own build byproducts that add no reviewable content
    (`.aux`/`.log`/`.bcf`/`.blg`/`.out`/`.run.xml`): the paper's source,
    its figures, its bibliography, and the built PDF and REVIEW.md are
    what a reviewer, or a later `git log`, needs."""
    if not paper_dir.is_dir():
        return []
    skip_suffixes = {".aux", ".bcf", ".blg", ".out", ".synctex.gz", ".toc"}
    out = []
    for p in sorted(paper_dir.rglob("*")):
        if not p.is_file():
            continue
        if "_llm-cache" in p.parts:
            continue
        if p.name in _SKIP_NAMES or p.name.startswith(".referee-lint-tmp"):
            continue
        if p.suffix in skip_suffixes or p.name == "main.log" or p.name == "main.run.xml":
            continue
        out.append(p)
    return out


def _relative_to_repo(path: Path) -> str:
    """`path`, relative to `REPO_ROOT` when it lives under it (the
    normal case: `git add` reads a path relative to the repo it runs
    in), or its own absolute string otherwise (a caller pointing this
    module at a run or paper directory outside this repository, tests
    included, still gets a usable, unambiguous path back rather than a
    crash)."""
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(REPO_ROOT))
    except ValueError:
        return str(resolved)


def _page_count(paper_dir: Path) -> int | None:
    log_path = paper_dir / "main.log"
    if not log_path.is_file():
        return None
    match = None
    for match in _PAGE_COUNT_RE.finditer(log_path.read_text(errors="replace")):
        pass
    return int(match.group(1)) if match else None


def _commit_message(campaign: str, run_id: str, page_count: int | None) -> str:
    pages = f", {page_count} pages" if page_count else ""
    return (
        f"docs(hte): publish {campaign} campaign report ({run_id}{pages})\n\n"
        "Automated hte.pipeline run: emit_paper + referee, no human edit to any "
        "hypothesis, evidence item, score, or paper section."
    )


def mint_hook(paper_dir: str | Path) -> None:
    """Where a future publish step would mint this paper's Story
    Protocol IP NFT (bucket.foundation's own `publish` terminal action,
    `~/agfarms/bucket-foundation/CLAUDE.md`'s Canon thesis section).
    Deliberately unimplemented: minting signs a transaction with the
    founder's own wallet key, which this automated pipeline never holds.
    Mint by hand, from the founder's own machine, against
    `<paper_dir>/main.pdf`, once the founder has reviewed it."""
    raise NotImplementedError(
        "mint_hook: Story Protocol minting needs the founder's own wallet key; "
        "this pipeline never holds one. Mint by hand from "
        f"{Path(paper_dir) / 'main.pdf'} once the founder reviews it."
    )


def publish(run_dir: str | Path, paper_dir: str | Path, *, dry_run: bool = True) -> dict[str, Any]:
    """Commits `run_dir`'s own top-level artifact files and every
    reviewable file under `paper_dir` on the current branch, then
    mirrors `paper_dir/main.pdf` to `gdrive:AGFarms/Nucleus/bucket-
    foundation/papers/<campaign>/<run_id>/` via `rclone` and records the
    share link. Writes `paper_dir/PUBLISH.json` either way.

    `dry_run=True` (the default) runs no git or rclone command at all:
    it computes the exact file list and commit message, and returns them
    under `"actions_planned"`, so a caller can review the plan before
    anything touches the working tree or a network call goes out.
    """
    run_dir = Path(run_dir)
    paper_dir = Path(paper_dir)
    manifest_path = run_dir / "MANIFEST.json"
    if not manifest_path.is_file():
        raise PublishError(f"no MANIFEST.json under {run_dir}; nothing to publish")
    manifest = json.loads(manifest_path.read_text())
    campaign = manifest["campaign"]
    run_id = run_dir.name

    pdf_path = paper_dir / "main.pdf"
    page_count = _page_count(paper_dir)

    all_files = _run_artifact_files(run_dir) + _paper_files(paper_dir)
    rel_files = [_relative_to_repo(p) for p in all_files]
    message = _commit_message(campaign, run_id, page_count)
    gdrive_dir = f"{GDRIVE_BASE}/{campaign}/{run_id}"

    result: dict[str, Any] = {
        "campaign": campaign, "run_id": run_id, "dry_run": dry_run,
        "commit_message": message, "files": rel_files,
        "gdrive_remote_dir": gdrive_dir, "pdf_exists": pdf_path.is_file(),
        "page_count": page_count, "commit_sha": None, "share_link": None,
    }

    if dry_run:
        result["actions_planned"] = [
            f"git add -f {' '.join(rel_files)}" if rel_files else "git add -f (no files found, nothing to add)",
            "git commit -m <commit_message above>",
            f"rclone mkdir {gdrive_dir!r}",
            f"rclone copy {str(pdf_path)!r} {gdrive_dir + '/'!r}" if pdf_path.is_file() else "(no main.pdf built; nothing to mirror)",
            f"rclone link {gdrive_dir!r}",
        ]
        (paper_dir / "PUBLISH.json").write_text(json.dumps(result, indent=2))
        return result

    if not rel_files:
        raise PublishError("nothing to publish: no run artifact or paper file found on disk")

    _run(["git", "add", "-f", *rel_files])
    commit = _run(["git", "commit", "-m", message])
    sha = _run(["git", "rev-parse", "--short", "HEAD"]).stdout.strip()
    result["commit_sha"] = sha
    result["commit_output"] = commit.stdout

    if pdf_path.is_file():
        _run(["rclone", "mkdir", gdrive_dir])
        _run(["rclone", "copy", str(pdf_path), f"{gdrive_dir}/"])
        link = _run(["rclone", "link", gdrive_dir])
        result["share_link"] = link.stdout.strip()

    (paper_dir / "PUBLISH.json").write_text(json.dumps(result, indent=2))
    return result


__all__ = ["publish", "mint_hook", "PublishError"]
