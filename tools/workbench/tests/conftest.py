from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from workbench import auth, registry
from workbench.runner import Scheduler
from workbench.service import Workbench

FIXTURES = Path(__file__).parent / "fixtures"
FOUNDER = "founder@example.org"
STAFF = "staff@example.org"


@pytest.fixture(autouse=True)
def data_home(tmp_path, monkeypatch):
    home = tmp_path / "data"
    monkeypatch.setenv("BUCKET_DATA_HOME", str(home))
    monkeypatch.setenv("BUCKET_FOUNDER_EMAIL", FOUNDER)
    monkeypatch.delenv("BUCKET_WORKBENCH_TOKEN", raising=False)
    return home


def tool_doc(**over) -> dict:
    base = {
        "id": "echo",
        "group": "helix",
        "kind": "cli",
        "title": "Echo",
        "description": "echo",
        "scope": "local",
        "writes": "local",
        "timeout_s": 30,
        "status": "live",
        "cwd": ".",
        "command": ["python3", "-c", "import sys; print(sys.argv[1:])", "{word}", ["--n", "{n}"], ["?loud", "--loud"]],
        "input_schema": {
            "type": "object",
            "properties": {
                "word": {"type": "string"},
                "n": {"type": "integer", "minimum": 0, "maximum": 9},
                "loud": {"type": "boolean"},
            },
            "required": ["word"],
        },
    }
    base.update(over)
    return base


def make_registry(*tools, limits=None) -> registry.Registry:
    return registry.parse({"schema": registry.SCHEMA, "limits": limits or {}, "tools": list(tools)})


def sleeper(tool_id="sleep", group="helix", secs=5, scope="local", writes="local"):
    return tool_doc(
        id=tool_id,
        group=group,
        scope=scope,
        writes=writes,
        command=["python3", "-c", f"import time; time.sleep({secs})"],
        input_schema={"type": "object", "properties": {}},
    )


class NullCadence:
    configured = False

    def tools(self):
        return []

    def call(self, name, args):
        from workbench.cadence import CadenceUnavailable

        raise CadenceUnavailable("not configured")


@pytest.fixture
def bench(tmp_path):
    reg = make_registry(
        tool_doc(),
        tool_doc(id="pub", scope="repo", writes="repo"),
        tool_doc(id="mine", group="profile", scope="personal", writes="local"),
        tool_doc(id="look", scope="read", writes="none"),
        tool_doc(id="later", status="pending", bead="bkt-x", blocked_by="PR #1"),
    )
    return Workbench(reg, Scheduler(reg), cadence=NullCadence(), audit_path=tmp_path / "audit.jsonl")


def staff():
    return auth.principal(STAFF)


def founder():
    return auth.principal(FOUNDER)


def audit_lines(bench) -> list[dict]:
    return [json.loads(x) for x in bench.audit_path.read_text().splitlines()]


def python() -> str:
    return sys.executable
