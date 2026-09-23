import json
import sys
from pathlib import Path

import pytest

from bucket_eval.graph import Work

FIXTURES = Path(__file__).parent / "fixtures"

@pytest.fixture
def tiny():
    doc = json.loads((FIXTURES / "tiny.json").read_text())
    works = [Work(w["year"], tuple(w["topics"]), w["field"]) for w in doc["works"]]
    fields = {int(k): v for k, v in doc["fields"].items()}
    return works, fields

def pytest_terminal_summary(terminalreporter):
    for module in list(sys.modules.values()):
        for message in getattr(module, "PARITY_SKIPS", []) if getattr(module, "__name__", "").endswith("test_curveball") else []:
            terminalreporter.write_sep("!", message, red=True, bold=True)
