from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

from ..paths import REPO

CRITIC = REPO / "docs" / "agents" / "BUCKET-CRITIC.md"
PASS_SCORE = 8.0
PASS_FLOOR = 7.0
SCORE_BLOCK = re.compile(r"\{[^{}]*\"weighted\"[^{}]*\"dimensions\"\s*:\s*\{[^{}]*\}[^{}]*\}", re.DOTALL)

def prompt(statement: str) -> str:
    rubric = CRITIC.read_text() if CRITIC.exists() else ""
    return (
        f"{rubric}\n\nScore the research statement below with this rubric. Reply with one JSON object: "
        '{"weighted": <0-10>, "dimensions": {"<name>": <0-10>}, "findings": [{"severity": '
        '"critical|high|medium|low", "issue": "...", "fix": "..."}]}.\n\n'
        f"Research statement:\n\n{statement}"
    )

def parse(text: str) -> dict:
    try:
        wrapper = json.loads(text)
        if isinstance(wrapper, dict) and isinstance(wrapper.get("result"), str):
            text = wrapper["result"]
        elif isinstance(wrapper, dict) and "weighted" in wrapper:
            return wrapper
    except json.JSONDecodeError:
        pass
    m = SCORE_BLOCK.search(text)
    if not m:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("critic reply holds no JSON score")
        return json.loads(text[start : end + 1])
    return json.loads(m.group(0))

def verdict(score: dict) -> dict:
    dims = score.get("dimensions") or {}
    findings = score.get("findings") or []
    open_high = [f for f in findings if f.get("severity") in ("critical", "high")]
    weighted = float(score["weighted"])
    passed = weighted > PASS_SCORE and all(float(v) >= PASS_FLOOR for v in dims.values()) and not open_high
    return {
        "weighted": weighted,
        "dimensions": dims,
        "findings": findings,
        "pass": passed,
        "rule": f"weighted above {PASS_SCORE}, no dimension below {PASS_FLOOR}, no open critical or high",
    }

def score(args: dict, out_dir: Path) -> dict:
    statement = Path(args["statement"]).read_text()
    (out_dir / "statement.md").write_text(statement)
    binary = os.environ.get("WORKBENCH_CLAUDE_BIN", "claude")
    argv = [binary, "-p", "--output-format", "json", "--model", args.get("model", "sonnet")]
    r = subprocess.run(argv, input=prompt(statement), capture_output=True, text=True, timeout=900, check=False)
    (out_dir / "critic-raw.txt").write_text(r.stdout)
    if r.returncode != 0:
        raise RuntimeError(f"critic exited {r.returncode}: {r.stderr.strip()[-500:]}")
    result = verdict(parse(r.stdout))
    (out_dir / "score.json").write_text(json.dumps(result, indent=1, sort_keys=True))
    return result
