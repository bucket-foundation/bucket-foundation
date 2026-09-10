"""Property tests over `hte.publish`: `dry_run=True` never shells out to
git or rclone, over a swarm of run/paper directory shapes."""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from unittest import mock

from hypothesis import given
from hypothesis import strategies as st

from hte import publish

campaign_names = st.text(alphabet="abcdefghijklmnopqrstuvwxyz-", min_size=1, max_size=20)
extra_run_artifacts = st.lists(
    # MANIFEST.json is excluded: _make_run_dir already writes it with real
    # JSON content below, and this list stands for the OTHER artifact
    # files a run directory may or may not carry alongside it.
    st.sampled_from(["timeline.json", "TIMELINE.md", "calibration.json", "CALIBRATION.md", "self-report.json", "run.log"]),
    min_size=0, max_size=6, unique=True,
)
has_pdf_st = st.booleans()


def _make_run_dir(root: Path, campaign: str, extra: list[str]) -> Path:
    run_dir = root / "runs" / campaign / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": campaign, "counts": {}}))
    for name in extra:
        (run_dir / name).write_text("x")
    return run_dir


def _make_paper_dir(root: Path, *, with_pdf: bool) -> Path:
    paper_dir = root / "paper"
    paper_dir.mkdir()
    (paper_dir / "main.tex").write_text(r"\documentclass{article}\begin{document}x\end{document}")
    (paper_dir / "refs.bib").write_text("")
    if with_pdf:
        (paper_dir / "main.pdf").write_bytes(b"%PDF-fake")
    return paper_dir


@given(campaign_names, extra_run_artifacts, has_pdf_st)
def test_publish_dry_run_never_calls_subprocess_run(campaign, extra, with_pdf):
    tmp = tempfile.mkdtemp()

    def fail_run(cmd, **kwargs):
        raise AssertionError(f"dry_run=True must never shell out, attempted: {cmd}")

    try:
        run_dir = _make_run_dir(Path(tmp), campaign, extra)
        paper_dir = _make_paper_dir(Path(tmp), with_pdf=with_pdf)
        with mock.patch.object(subprocess, "run", fail_run):
            result = publish.publish(run_dir, paper_dir, dry_run=True)
        assert result["dry_run"] is True
        assert result["commit_sha"] is None
        assert result["share_link"] is None
        assert (paper_dir / "PUBLISH.json").is_file()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_publish_dry_run_never_calls_publish_module_run_helper():
    """A second, independent guard on the same property: `publish._run`
    (the module's own thin subprocess.run wrapper) is monkeypatched
    directly, in case `publish.py` ever routes a git/rclone call through
    something other than the top-level `subprocess.run` re-export."""
    tmp = tempfile.mkdtemp()

    def fail(*a, **k):
        raise AssertionError("dry_run=True must never call publish._run")

    try:
        run_dir = _make_run_dir(Path(tmp), "camp", ["timeline.json"])
        paper_dir = _make_paper_dir(Path(tmp), with_pdf=True)
        with mock.patch.object(publish, "_run", fail):
            publish.publish(run_dir, paper_dir, dry_run=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
