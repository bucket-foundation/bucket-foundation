from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from prime_directions import reference

COMMITTED = Path(__file__).resolve().parents[3] / "src" / "data" / "explore" / "reference-basis.json"

FIELDS = {
    "physics": "quantum photon electron field energy particle wave spin lattice",
    "biology": "cell protein gene enzyme membrane mitochondria tissue organism",
    "economics": "market price inflation trade currency labor wage demand supply",
    "history": "empire dynasty war treaty archive manuscript colonial revolution",
}


def synthetic_basis() -> list[dict]:
    rows = []
    for name, words in FIELDS.items():
        terms = words.split()
        for i in range(30):
            rows.append({"id": f"{name}{i}", "name": f"{name} {i}", "field": name, "text": " ".join(terms[(i + j) % len(terms)] for j in range(6))})
    return rows


def test_components_follow_the_sign_convention():
    data = reference.build_reference_basis(synthetic_basis(), k=4, min_df=2, max_df=0.9, max_features=200)
    vt = np.array(data["loadings"])
    for row in vt:
        assert row[int(np.argmax(np.abs(row)))] > 0
    assert data["sign_convention"] == reference.SIGN_CONVENTION


def test_the_build_is_deterministic():
    a = reference.build_reference_basis(synthetic_basis(), k=4, min_df=2, max_df=0.9, max_features=200)
    b = reference.build_reference_basis(synthetic_basis(), k=4, min_df=2, max_df=0.9, max_features=200)
    assert a == b


def test_projecting_twice_gives_identical_scores():
    data = reference.build_reference_basis(synthetic_basis(), k=4, min_df=2, max_df=0.9, max_features=200)
    texts = ["quantum photon wave", "market price trade", "protein gene cell"]
    assert np.array_equal(reference.project_texts(data, texts), reference.project_texts(data, texts))


def test_basis_documents_score_near_zero_on_average():
    rows = synthetic_basis()
    data = reference.build_reference_basis(rows, k=4, min_df=2, max_df=0.9, max_features=200)
    scores = reference.project_texts(data, [r["text"] for r in rows])
    assert np.allclose(scores.mean(axis=0), 0, atol=1e-6)
    assert np.allclose(scores.std(axis=0), 1, atol=1e-6)


def test_committed_basis_shape_and_signs():
    data = json.loads(COMMITTED.read_text())
    assert data["schema"] == reference.BASIS_SCHEMA
    k, v = len(data["components"]), len(data["vocab"])
    assert k == 12
    assert len(data["idf"]) == v
    assert all(len(r) == v for r in data["loadings"])
    for row in np.array(data["loadings"]):
        assert row[int(np.argmax(np.abs(row)))] > 0


def test_committed_projection_golden_matches_python():
    root = COMMITTED.parents[3]
    data = json.loads(COMMITTED.read_text())
    golden = json.loads((root / "tests" / "fixtures" / "reference-projection.golden.json").read_text())
    got = reference.project_texts(data, golden["texts"])
    assert np.allclose(got, np.array(golden["scores"]), atol=1e-5)
