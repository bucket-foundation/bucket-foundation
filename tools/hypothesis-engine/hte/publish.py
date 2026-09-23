from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

from . import artifacts as artifacts_mod

REPO_ROOT = Path(__file__).resolve().parents[3]
GDRIVE_BASE = "gdrive:AGFarms/Nucleus/bucket-foundation/papers"

_RUN_ARTIFACT_NAMES = [
    "MANIFEST.json", "timeline.json", "TIMELINE.md",
    "calibration.json", "CALIBRATION.md", "self-report.json", "run.log",
]
_PAGE_COUNT_RE = re.compile(r"Output written on \S+\.pdf \((\d+) pages?")
_SKIP_NAMES = {".referee-lint-tmp.md", "PUBLISH.json", "STAGE.json", "PIPELINE.json"}

class PublishError(RuntimeError):
    pass

def _run(cmd: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, cwd=cwd or REPO_ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace", check=True,
    )

def _run_artifact_files(run_dir: Path) -> list[Path]:
    return [run_dir / n for n in _RUN_ARTIFACT_NAMES if (run_dir / n).is_file()]

def _paper_files(paper_dir: Path) -> list[Path]:
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
    raise NotImplementedError(
        "mint_hook: Story Protocol minting needs the founder's own wallet key; "
        "this pipeline never holds one. Mint by hand from "
        f"{Path(paper_dir) / 'main.pdf'} once the founder reviews it."
    )

def publish(run_dir: str | Path, paper_dir: str | Path, *, dry_run: bool = True) -> dict[str, Any]:
    run_dir = Path(run_dir)
    paper_dir = Path(paper_dir)
    try:
        manifest = artifacts_mod.load_manifest(run_dir)
    except FileNotFoundError:
        raise PublishError(f"no MANIFEST.json under {run_dir}; nothing to publish") from None
    campaign = manifest.campaign
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
