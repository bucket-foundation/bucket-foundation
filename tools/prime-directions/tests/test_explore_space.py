from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np

from prime_directions import explore_space, reference

ROOT = Path(__file__).resolve().parents[3]
BASIS = json.loads((ROOT / "src" / "data" / "explore" / "reference-basis.json").read_text())

BUNDLE = {
    "profiles": [
        {"openalex_id": "A1", "name": "Ada Sample", "institution": "Example University", "ror": "abc", "country": "US", "field": "Physics and Astronomy",
         "topics": ["quantum field theory", "photon statistics", "lattice models"], "links": {"openalex": "https://openalex.org/A1", "institution": "https://example.edu/ada", "mail": "ada@example.edu"},
         "orcid": "0000-0000-0000-0001", "scores": [0.1] * 64},
        {"openalex_id": "A2", "name": "Bo Sample", "institution": "Other Institute", "ror": "def", "country": "DE", "field": "Biochemistry",
         "topics": ["protein folding", "enzyme kinetics", "membrane transport"], "links": {"openalex": "https://openalex.org/A2"}, "orcid": None, "scores": [0.2] * 64},
        {"openalex_id": "A3", "name": "", "institution": "x", "field": "none", "topics": [], "links": {}},
    ],
}


def test_advisors_are_projected_on_the_reference_basis():
    data = explore_space.advisors_space(BASIS, BUNDLE)
    assert data["schema"] == explore_space.SCHEMA
    assert data["basis"] == "reference"
    assert len(data["components"]) == 12
    assert len(data["obs"]) == 2
    for o in data["obs"]:
        assert len(o["scores"]) == 12
        assert 0 <= o["coverage"] <= 1


def test_only_publishable_fields_leave_the_bundle():
    data = explore_space.advisors_space(BASIS, BUNDLE)
    text = json.dumps(data)
    assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    assert "orcid" not in text.lower() and "0000-0000" not in text
    assert "ror" not in {k for o in data["obs"] for k in o} and "abc" not in text
    assert set(data["obs"][0]["meta"]) == {"institution", "field", "country"}
    assert data["obs"][0]["links"] == ["https://openalex.org/A1", "https://example.edu/ada"]
    assert all(o["id"].startswith("p") and "A1" not in o["id"] for o in data["obs"])


def test_the_projection_matches_project_texts():
    data = explore_space.advisors_space(BASIS, BUNDLE)
    rows = explore_space.advisor_rows(BUNDLE["profiles"])
    want = reference.project_texts(BASIS, [r["text"] for r in rows])
    assert np.allclose([o["scores"] for o in data["obs"]], want, atol=5e-4)


def test_coverage_ignores_stop_words_and_unknown_terms():
    assert reference.coverage_of(BASIS, "the and of") == 0.0
    assert reference.coverage_of(BASIS, "") == 0.0
    known = BASIS["vocab"][0]
    assert reference.coverage_of(BASIS, f"the {known} zzzzqq") == 0.5


def test_the_advisor_build_is_deterministic():
    assert explore_space.advisors_space(BASIS, BUNDLE) == explore_space.advisors_space(BASIS, BUNDLE)


def test_the_committed_canon_space_matches_a_rebuild():
    sys.path.insert(0, str(ROOT / "scripts" / "canon-explorer"))
    import embed

    committed = json.loads((ROOT / "src" / "data" / "explore" / "canon.space.json").read_text())
    rebuilt = explore_space.canon_space(BASIS, embed.load_items())
    assert committed == json.loads(json.dumps(rebuilt))
    assert len(committed["obs"]) == len(embed.load_items())
    assert all("coverage" in o for o in committed["obs"])
