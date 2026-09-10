import json
from pathlib import Path

import pytest

from hte import publish


def _run_dir(tmp_path) -> Path:
    run_dir = tmp_path / "runs" / "camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "camp", "counts": {}}))
    (run_dir / "timeline.json").write_text("{}")
    (run_dir / "run.log").write_text("log\n")
    return run_dir


def _paper_dir(tmp_path, *, with_pdf: bool) -> Path:
    paper_dir = tmp_path / "paper"
    paper_dir.mkdir()
    (paper_dir / "main.tex").write_text(r"\documentclass{article}\begin{document}x\end{document}")
    (paper_dir / "refs.bib").write_text("")
    (paper_dir / "main.aux").write_text("scratch, excluded from publish")
    (paper_dir / ".referee-lint-tmp.md").write_text("scratch, excluded from publish")
    (paper_dir / "_llm-cache").mkdir()
    (paper_dir / "_llm-cache" / "somehash.json").write_text("{}")
    if with_pdf:
        (paper_dir / "main.pdf").write_bytes(b"%PDF-fake")
        (paper_dir / "main.log").write_text("Output written on main.pdf (3 pages, 100 bytes).\n")
    return paper_dir


def test_publish_dry_run_makes_no_git_or_rclone_call(tmp_path, monkeypatch):
    run_dir = _run_dir(tmp_path)
    paper_dir = _paper_dir(tmp_path, with_pdf=True)

    def fail(*a, **k):
        raise AssertionError("dry_run must not shell out")

    monkeypatch.setattr(publish, "_run", fail)

    result = publish.publish(run_dir, paper_dir, dry_run=True)
    assert result["dry_run"] is True
    assert result["commit_sha"] is None
    assert result["share_link"] is None
    assert result["page_count"] == 3
    assert result["pdf_exists"] is True
    assert "git add -f" in result["actions_planned"][0]
    assert any("rclone copy" in a for a in result["actions_planned"])

    published_json = json.loads((paper_dir / "PUBLISH.json").read_text())
    assert published_json["dry_run"] is True


def test_publish_excludes_scratch_files_from_the_file_list(tmp_path):
    run_dir = _run_dir(tmp_path)
    paper_dir = _paper_dir(tmp_path, with_pdf=False)

    result = publish.publish(run_dir, paper_dir, dry_run=True)
    joined = " ".join(result["files"])
    assert "main.aux" not in joined
    assert ".referee-lint-tmp.md" not in joined
    assert "_llm-cache" not in joined
    assert "main.tex" in joined
    assert "MANIFEST.json" in joined
    assert result["pdf_exists"] is False
    assert result["page_count"] is None


def test_publish_missing_manifest_raises(tmp_path):
    run_dir = tmp_path / "runs" / "camp" / "ts"
    run_dir.mkdir(parents=True)
    paper_dir = _paper_dir(tmp_path, with_pdf=False)
    with pytest.raises(publish.PublishError, match="no MANIFEST.json"):
        publish.publish(run_dir, paper_dir, dry_run=True)


def test_publish_live_mode_calls_git_and_rclone_in_order(tmp_path, monkeypatch):
    run_dir = _run_dir(tmp_path)
    paper_dir = _paper_dir(tmp_path, with_pdf=True)

    calls = []

    class FakeCompleted:
        def __init__(self, stdout):
            self.stdout = stdout

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        if cmd[:2] == ["git", "rev-parse"]:
            return FakeCompleted("abc1234\n")
        if cmd[:2] == ["rclone", "link"]:
            return FakeCompleted("https://drive.google.com/fake\n")
        return FakeCompleted("")

    monkeypatch.setattr(publish, "_run", fake_run)

    result = publish.publish(run_dir, paper_dir, dry_run=False)
    assert result["commit_sha"] == "abc1234"
    assert result["share_link"] == "https://drive.google.com/fake"
    assert calls[0][:2] == ["git", "add"]
    assert calls[1][:2] == ["git", "commit"]
    assert calls[2][:2] == ["git", "rev-parse"]
    assert calls[3][:2] == ["rclone", "mkdir"]
    assert calls[4][:2] == ["rclone", "copy"]
    assert calls[5][:2] == ["rclone", "link"]


def test_publish_live_mode_no_pdf_skips_rclone(tmp_path, monkeypatch):
    run_dir = _run_dir(tmp_path)
    paper_dir = _paper_dir(tmp_path, with_pdf=False)

    calls = []

    class FakeCompleted:
        def __init__(self, stdout):
            self.stdout = stdout

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        if cmd[:2] == ["git", "rev-parse"]:
            return FakeCompleted("abc1234\n")
        return FakeCompleted("")

    monkeypatch.setattr(publish, "_run", fake_run)

    result = publish.publish(run_dir, paper_dir, dry_run=False)
    assert result["share_link"] is None
    assert all(c[0] != "rclone" for c in calls)


def test_publish_excludes_a_decoy_publish_json_from_git_add(tmp_path, monkeypatch):
    """A `paper_dir` already carrying a `PUBLISH.json` from a prior
    attempt (a dry-run, or a live publish retried after a partial
    failure) must not have that leftover file swept into `git add -f`:
    it carries the prior attempt's own commit sha and share link, not
    this one's (PR #4 review finding, `_paper_files()` did not exclude
    `PUBLISH.json` the way it already excluded `main.log`)."""
    run_dir = _run_dir(tmp_path)
    paper_dir = _paper_dir(tmp_path, with_pdf=True)
    (paper_dir / "PUBLISH.json").write_text(
        json.dumps({"commit_sha": "decoy0000", "share_link": "https://drive.google.com/decoy"})
    )

    calls = []

    class FakeCompleted:
        def __init__(self, stdout):
            self.stdout = stdout

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        if cmd[:2] == ["git", "rev-parse"]:
            return FakeCompleted("abc1234\n")
        if cmd[:2] == ["rclone", "link"]:
            return FakeCompleted("https://drive.google.com/fake\n")
        return FakeCompleted("")

    monkeypatch.setattr(publish, "_run", fake_run)

    result = publish.publish(run_dir, paper_dir, dry_run=False)

    git_add_call = calls[0]
    assert git_add_call[:2] == ["git", "add"]
    assert not any(arg.endswith("PUBLISH.json") for arg in git_add_call), git_add_call
    assert not any("PUBLISH.json" in f for f in result["files"])


def test_mint_hook_always_raises(tmp_path):
    with pytest.raises(NotImplementedError, match="wallet key"):
        publish.mint_hook(tmp_path)
