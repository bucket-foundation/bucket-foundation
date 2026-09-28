from __future__ import annotations

import subprocess

import pytest

from helix import __main__ as cli
from helix import runs
from helix.publish import PROTECTED, PublishRefused, publish
from helix.schema import load

from .conftest import FIXTURES


def git(repo, *args):
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


@pytest.fixture
def repo(tmp_path):
    r = tmp_path / "repo"
    r.mkdir()
    git(r, "init", "-q", "-b", "dev")
    git(r, "config", "user.email", "t@example.org")
    git(r, "config", "user.name", "t")
    (r / "README").write_text("x")
    git(r, "add", ".")
    git(r, "commit", "-q", "-m", "init")
    return r


@pytest.fixture
def run_dir(tmp_path):
    d, _ = runs.run(load(FIXTURES / "series.json"), tmp_path / "runs", stamp="20260101T000000Z", samples=21)
    return d


@pytest.mark.parametrize("branch", PROTECTED)
def test_refuses_protected(repo, run_dir, branch):
    git(repo, "checkout", "-q", "-B", branch)
    assert cli.main(["publish", str(run_dir), "--repo", str(repo)]) == 4


def test_refuses_detached(repo, run_dir):
    git(repo, "checkout", "-q", "--detach")
    with pytest.raises(PublishRefused, match="detached"):
        publish(run_dir, repo)


def test_refuses_dirty(repo, run_dir):
    git(repo, "checkout", "-q", "-b", "feat/ros-helix-x")
    (repo / "scratch").write_text("y")
    with pytest.raises(PublishRefused, match="dirty"):
        publish(run_dir, repo)


def test_publishes_on_feature_branch(repo, run_dir):
    git(repo, "checkout", "-q", "-b", "feat/ros-helix-x")
    head = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "HEAD"], capture_output=True, text=True, check=False
    ).stdout
    dest = publish(run_dir, repo)
    assert dest == repo / "public/helix/fixture-topics/20260101T000000Z"
    assert sorted(p.name for p in dest.iterdir()) == ["chart.svg", "manifest.json"]
    after = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "HEAD"], capture_output=True, text=True, check=False
    ).stdout
    assert head == after
