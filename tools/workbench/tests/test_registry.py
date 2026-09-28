from __future__ import annotations

import os
import subprocess

import pytest

from workbench import registry
from workbench.paths import REPO
from workbench.runner import render

from .conftest import make_registry, tool_doc


def test_repo_registry_loads():
    reg = registry.load()
    groups = {t.group for t in reg.tools.values()}
    assert {
        "prime_directions",
        "profile",
        "advisor",
        "network",
        "visual",
        "statements",
        "bucketmath",
        "corpus",
        "helix",
    } <= groups
    assert reg.get("advisor_review").status == "pending"
    assert reg.get("visual_render_scene").status == "pending"
    assert reg.get("helix_publish").scope == "repo"
    assert reg.get("profile_build").scope == "personal"


@pytest.mark.parametrize(
    "over,message",
    [
        ({"group": "weather"}, "unknown group"),
        ({"kind": "shell"}, "unknown kind"),
        ({"scope": "root"}, "unknown scope"),
        ({"scope": "read", "writes": "local"}, "exceeds scope"),
        ({"scope": "local", "writes": "repo"}, "exceeds scope"),
        ({"status": "pending"}, "need bead"),
        ({"command": ["python3", "{missing}"]}, "no input_schema property"),
        ({"command": ["python3", ["?nothing", "--x"]]}, "condition"),
        ({"timeout_s": 0}, "positive"),
        ({"kind": "python", "function": "nocolon"}, "module:name"),
    ],
)
def test_registry_errors(over, message):
    with pytest.raises(registry.RegistryError, match=message):
        make_registry(tool_doc(**over))


def test_duplicate_ids():
    with pytest.raises(registry.RegistryError, match="duplicate"):
        make_registry(tool_doc(), tool_doc())


def test_unknown_cap_group():
    with pytest.raises(registry.RegistryError, match="unknown group"):
        make_registry(tool_doc(), limits={"group_caps": {"weather": 1}})


@pytest.mark.skipif(
    os.environ.get("WORKBENCH_HELP_CHECK") != "1", reason="needs every tool's deps; set WORKBENCH_HELP_CHECK=1"
)
def test_live_cli_tools_answer_help(tmp_path):
    reg = registry.load()
    checked = 0
    for t in reg.tools.values():
        if t.kind != "cli" or not t.live or t.id == "bucketmath_check":
            continue
        head = []
        for part in t.command:
            if isinstance(part, list) or part.startswith("{") or part.startswith("-") and part != "-m":
                break
            head.append(part)
        argv = render(head, {}, tmp_path)
        r = subprocess.run(
            [*argv, "--help"], cwd=REPO / t.cwd, capture_output=True, text=True, timeout=120, check=False
        )
        assert r.returncode == 0, (t.id, r.stderr[-400:])
        checked += 1
    assert checked >= 8
