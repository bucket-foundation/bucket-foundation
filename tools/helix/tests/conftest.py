from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def doc() -> dict:
    return copy.deepcopy(json.loads((FIXTURES / "series.json").read_text()))
