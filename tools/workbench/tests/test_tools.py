from __future__ import annotations

import json
import os
import stat
import sys

import pytest

from workbench.tools import network, statements


def test_network_map(tmp_path):
    graph = {
        "nodes": [
            {"id": "a", "title": "A", "branch": "physics"},
            {"id": "b", "title": "B", "branch": "physics"},
            {"id": "c", "title": "C", "branch": "mind"},
            {"id": "d", "title": "D", "branch": "mind"},
        ],
        "edges": [{"source": "a", "target": "b"}, {"from": "b", "to": "c"}, {"source": "a", "target": "zz"}],
    }
    g = tmp_path / "g.json"
    g.write_text(json.dumps(graph))
    out = tmp_path / "out"
    out.mkdir()
    s = network.build({"graph": str(g)}, out)
    assert s["nodes"] == 4 and s["edges"] == 2 and s["dropped_edges"] == 1
    assert s["components"] == 2 and s["largest_component"] == 3
    assert s["top_degree"][0]["id"] == "b"
    assert (out / "network.png").stat().st_size > 0
    assert set(json.loads((out / "network.json").read_text())["positions"]) == {"a", "b", "c", "d"}


def test_network_bad_file(tmp_path):
    g = tmp_path / "g.json"
    g.write_text("{}")
    with pytest.raises(TypeError, match="nodes and edges"):
        network.build({"graph": str(g)}, tmp_path)


def _fake_claude(tmp_path, reply: str, code: int = 0):
    path = tmp_path / f"claude{code}"
    path.write_text(f"#!{sys.executable}\nimport sys\nsys.stdin.read()\nprint({reply!r})\nsys.exit({code})\n")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)
    return path


@pytest.mark.parametrize(
    "score,passed",
    [
        ({"weighted": 8.4, "dimensions": {"a": 8, "b": 7.5}, "findings": []}, True),
        ({"weighted": 8.0, "dimensions": {"a": 8}, "findings": []}, False),
        ({"weighted": 9, "dimensions": {"a": 6.9}, "findings": []}, False),
        ({"weighted": 9, "dimensions": {"a": 9}, "findings": [{"severity": "high", "issue": "x"}]}, False),
    ],
)
def test_statement_verdict(score, passed):
    assert statements.verdict(score)["pass"] is passed


def test_statement_score_with_wrapper(tmp_path, monkeypatch):
    inner = json.dumps({"weighted": 8.5, "dimensions": {"clarity": 9}, "findings": []})
    reply = json.dumps({"type": "result", "result": f"Scores:\n{inner}\n"})
    monkeypatch.setenv("WORKBENCH_CLAUDE_BIN", str(_fake_claude(tmp_path, reply)))
    st = tmp_path / "s.md"
    st.write_text("We test whether X.")
    out = tmp_path / "out"
    out.mkdir()
    r = statements.score({"statement": str(st)}, out)
    assert r["pass"] and r["weighted"] == 8.5
    assert json.loads((out / "score.json").read_text())["pass"]
    assert (out / "statement.md").read_text() == "We test whether X."


def test_statement_score_failures(tmp_path, monkeypatch):
    st = tmp_path / "s.md"
    st.write_text("x")
    monkeypatch.setenv("WORKBENCH_CLAUDE_BIN", str(_fake_claude(tmp_path, "no json in this reply")))
    with pytest.raises(ValueError, match="no JSON"):
        statements.score({"statement": str(st)}, tmp_path)
    monkeypatch.setenv("WORKBENCH_CLAUDE_BIN", str(_fake_claude(tmp_path, "{}", code=2)))
    with pytest.raises(RuntimeError, match="exited 2"):
        statements.score({"statement": str(st)}, tmp_path)
    assert os.path.exists(tmp_path / "critic-raw.txt")


def test_prompt_carries_rubric():
    p = statements.prompt("S")
    assert "Research statement:\n\nS" in p and '"weighted"' in p
