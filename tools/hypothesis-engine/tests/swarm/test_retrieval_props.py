"""Property tests over `hte.retrieval`: fixture mode never touches the
network, and the `forbidden_urls` gate blocks a live call before any
socket opens."""
from __future__ import annotations

import shutil
import socket
import tempfile
from pathlib import Path
from unittest import mock

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte import retrieval

hostname_labels = st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=1, max_size=10)


# --------------------------------------------------------------------------
# Fixture mode never opens a socket
# --------------------------------------------------------------------------


def test_retrieve_fixture_mode_never_opens_a_socket(tmp_path, monkeypatch):
    def fail_socket(*a, **k):
        raise AssertionError("fixture mode must never open a socket")

    monkeypatch.setattr(socket, "socket", fail_socket)
    envelope, run = retrieval.retrieve(
        mode="fixture", campaign="camp", out_dir=tmp_path / "run", fixture_name="quantum-decoherence-review",
    )
    assert run.mode == "fixture"
    assert envelope is not None


@given(fixture_name=st.sampled_from(retrieval.list_fixtures()))
def test_every_shipped_fixture_loads_with_no_socket_call(fixture_name):
    def fail_socket(*a, **k):
        raise AssertionError("fixture mode must never open a socket")

    tmp = tempfile.mkdtemp()
    try:
        with mock.patch.object(socket, "socket", fail_socket):
            envelope, run = retrieval.retrieve(
                mode="fixture", campaign="camp", out_dir=Path(tmp) / f"run-{fixture_name}", fixture_name=fixture_name,
            )
        assert run.fixture_name == fixture_name
        assert run.payment_required is False
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# --------------------------------------------------------------------------
# forbidden_urls: any pattern matching the gateway host blocks the call
# before urlopen (and therefore before any socket) runs
# --------------------------------------------------------------------------


@given(hostname_labels, hostname_labels)
def test_is_forbidden_matches_exact_host_with_no_wildcard(sub, domain):
    host = f"{sub}.{domain}.com"
    assert retrieval.is_forbidden(f"https://{host}/path", [host])


@given(hostname_labels, hostname_labels)
def test_is_forbidden_wildcard_matches_any_subdomain_of_the_suffix(sub, domain):
    pattern = f"*.{domain}.com"
    assert retrieval.is_forbidden(f"https://{sub}.{domain}.com/x", [pattern])


@given(hostname_labels)
def test_is_forbidden_returns_false_when_no_pattern_matches(host):
    assert not retrieval.is_forbidden(f"https://{host}.example.org/x", ["*.prod.example.com"])


@given(sub=hostname_labels, domain=hostname_labels)
def test_retrieve_live_mode_honors_forbidden_urls_before_any_socket_call(sub, domain):
    host = f"{sub}.{domain}.com"
    pattern = f"*.{domain}.com"

    def fail_socket(*a, **k):
        raise AssertionError("a forbidden URL must never reach the point of opening a socket")

    tmp = tempfile.mkdtemp()
    try:
        with mock.patch.object(socket, "socket", fail_socket):
            with pytest.raises(retrieval.ForbiddenURLError):
                retrieval.retrieve(
                    mode="live", campaign="camp", out_dir=Path(tmp) / "run", query="q",
                    gateway_url=f"https://{host}", forbidden_patterns=[pattern],
                )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_load_forbidden_patterns_missing_file_contributes_nothing(tmp_path, monkeypatch):
    # Isolated from this machine's own ~/agfarms/.nucleus/config.json and
    # any ./.nucleus/config.json in the real working tree: both default
    # lookup paths are redirected under tmp_path, where neither file
    # exists, so only the (also-missing) extra_paths entry is in play.
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(retrieval.Path, "home", classmethod(lambda cls: tmp_path / "no-such-home"))
    patterns = retrieval.load_forbidden_patterns(extra_paths=[tmp_path / "no-such-config.json"])
    assert patterns == []


def test_load_forbidden_patterns_reads_extra_path_first(tmp_path, monkeypatch):
    import json

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(retrieval.Path, "home", classmethod(lambda cls: tmp_path / "no-such-home"))
    config = tmp_path / "config.json"
    config.write_text(json.dumps({"forbidden_urls": ["*.blocked.example.com"]}))
    patterns = retrieval.load_forbidden_patterns(extra_paths=[config])
    assert "*.blocked.example.com" in patterns
