import json
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
