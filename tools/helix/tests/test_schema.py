from __future__ import annotations

import json

import numpy as np
import pytest

from helix.schema import SeriesError, load, to_doc, validate

from .conftest import FIXTURES

def test_round_trip(doc):
    s = validate(doc)
    assert s.K == 3
    assert to_doc(validate(to_doc(s))) == to_doc(s)
    assert np.allclose(s.shares.sum(axis=1), 1.0)

def test_default_omega_spans_one_turn(doc):
    del doc["omega"]
    s = validate(doc)
    assert s.omega_or_default() == pytest.approx(1 / 4)

def _set(doc, path, value):
    target = doc
    for key in path[:-1]:
        target = target[key]
    if value is KeyError:
        del target[path[-1]]
    else:
        target[path[-1]] = value

CASES = [
    ("E_SCHEMA", ("schema",), "helix.series/v0"),
    ("E_SCHEMA", ("slug",), "Bad Slug"),
    ("E_SCHEMA", ("time_unit",), "fortnight"),
    ("E_SCHEMA", ("slices",), []),
    ("E_KIND", ("kind",), "weather"),
    ("E_PRIMES", ("primes",), ["optics"]),
    ("E_PRIMES", ("primes",), ["optics", "optics", "spin"]),
    ("E_ORDER", ("slices", 1, "t"), 2019),
    ("E_KEYS", ("slices", 0, "weights", "water"), KeyError),
    ("E_NEG", ("slices", 0, "weights", "spin"), -1),
    ("E_ZERO_SUM", ("slices", 0, "weights"), {"optics": 0, "spin": 0, "water": 0}),
    ("E_NONFINITE", ("slices", 0, "weights", "optics"), float("nan")),
    ("E_NONFINITE", ("omega",), "fast"),
    ("E_SOURCE", ("source", "license"), KeyError),
]

@pytest.mark.parametrize("code,path,value", CASES)
def test_validation_errors(doc, code, path, value):
    _set(doc, path, value)
    with pytest.raises(SeriesError) as exc:
        validate(doc)
    assert exc.value.code == code
    assert exc.value.path.startswith("$")

def test_csv_needs_sidecar(tmp_path):
    p = tmp_path / "s.csv"
    p.write_text("t,prime,value\n2020,a,1\n2021,a,1\n")
    with pytest.raises(SeriesError) as exc:
        load(p)
    assert exc.value.code == "E_SCHEMA"

def test_csv_loads_with_sidecar(tmp_path, doc):
    rows = ["t,prime,value"]
    for sl in doc["slices"]:
        rows += [f"{sl['t']},{k},{v}" for k, v in sl["weights"].items()]
    (tmp_path / "s.csv").write_text("\n".join(rows) + "\n")
    meta = {k: v for k, v in doc.items() if k != "slices"}
    (tmp_path / "s.meta.json").write_text(json.dumps(meta))
    assert np.allclose(load(tmp_path / "s.csv").raw, validate(doc).raw)

def test_fixture_file_loads():
    assert load(FIXTURES / "series.json").slug == "fixture-topics"
