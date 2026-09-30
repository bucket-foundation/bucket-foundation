from __future__ import annotations

import json

import numpy as np
import pytest

from helix.adapters import corpus, damodaran, profiles, table
from helix.schema import SeriesError

from .conftest import FIXTURES

INDUSTRIES = ["Software", "Utilities"]
SRC = {"title": "t", "url": "local:x", "retrieved": "2026-09-28", "license": "CC0"}


def test_damodaran_market_cap_default():
    s = damodaran.load(FIXTURES / "damodaran.csv", INDUSTRIES, "2026-09-28")
    assert s.kind == "markets"
    assert np.allclose(s.shares[0], [0.75, 0.25])
    assert s.source["license"] == damodaran.LICENSE
    assert "adamodar" in s.source["url"]


def test_damodaran_revenue_optional():
    s = damodaran.load(FIXTURES / "damodaran.csv", INDUSTRIES, "2026-09-28", measure="revenue")
    assert np.allclose(s.shares[0], [0.4, 0.6])


def test_damodaran_holds_shares_only():
    s = damodaran.load(FIXTURES / "damodaran.csv", INDUSTRIES, "2026-09-28")
    assert np.allclose(s.raw.sum(axis=1), 1.0)


def _csv(tmp_path, text):
    p = tmp_path / "d.csv"
    p.write_text(text)
    return p


@pytest.mark.parametrize(
    "text,code",
    [
        ("industry,market_cap\nSoftware,1\n", "E_SCHEMA"),
        ("year,industry,market_cap\n2022,Software,-5\n2022,Utilities,1\n", "E_NEG"),
        ("year,industry,market_cap\n2022,Mining,5\n", "E_KEYS"),
        ("year,industry,market_cap\n2022,Software,abc\n", "E_NONFINITE"),
        ("year,industry,market_cap\n2022,Software,0\n2023,Software,1\n", "E_ZERO_SUM"),
    ],
)
def test_damodaran_errors(tmp_path, text, code):
    with pytest.raises(SeriesError) as exc:
        damodaran.load(_csv(tmp_path, text), INDUSTRIES, "2026-09-28")
    assert exc.value.code == code


def test_damodaran_unknown_measure():
    with pytest.raises(SeriesError) as exc:
        damodaran.load(FIXTURES / "damodaran.csv", INDUSTRIES, "2026-09-28", measure="ebitda")
    assert exc.value.code == "E_SCHEMA"


def test_profiles_drop_empty_slices_and_record_them():
    s = profiles.load(FIXTURES / "profile-timeline.json", "P", "p", SRC)
    assert s.dropped == ("2024",)
    assert len(s.t) == 3
    assert s.t[1] == pytest.approx(2025.5)


def test_profiles_mismatched_branches(tmp_path):
    p = tmp_path / "p.json"
    p.write_text(
        json.dumps([{"timestamp": "2023", "branches": {"a": 1, "b": 1}}, {"timestamp": "2024", "branches": {"a": 1}}])
    )
    with pytest.raises(SeriesError) as exc:
        profiles.load(p, "P", "p", SRC)
    assert exc.value.code == "E_KEYS"


def test_profiles_bad_time(tmp_path):
    p = tmp_path / "p.json"
    p.write_text(
        json.dumps(
            [{"timestamp": "soon", "branches": {"a": 1, "b": 1}}, {"timestamp": "2024", "branches": {"a": 1, "b": 2}}]
        )
    )
    with pytest.raises(SeriesError) as exc:
        profiles.load(p, "P", "p", SRC)
    assert exc.value.code == "E_NONFINITE"


def test_corpus_counts_known_tags_per_year():
    s = corpus.load(FIXTURES / "corpus.jsonl", ["optics", "spin"], "C", "c", SRC)
    assert list(s.t) == [2021.0, 2022.0]
    assert s.raw.tolist() == [[2.0, 1.0], [1.0, 1.0]]


def test_corpus_bad_line(tmp_path):
    p = tmp_path / "c.jsonl"
    p.write_text("{not json}\n")
    with pytest.raises(SeriesError) as exc:
        corpus.load(p, ["a", "b"], "C", "c", SRC)
    assert exc.value.code == "E_SCHEMA"


def test_table_rows(tmp_path, doc):
    rows = [{"t": sl["t"], "prime": k, "value": v} for sl in doc["slices"] for k, v in sl["weights"].items()]
    meta = {k: v for k, v in doc.items() if k != "slices"} | {"kind": "longtermism", "rows": rows}
    p = tmp_path / "t.json"
    p.write_text(json.dumps(meta))
    assert table.load(p).kind == "longtermism"


def test_table_bad_row(tmp_path, doc):
    meta = {k: v for k, v in doc.items() if k != "slices"} | {"rows": [{"t": 1}]}
    p = tmp_path / "t.json"
    p.write_text(json.dumps(meta))
    with pytest.raises(SeriesError) as exc:
        table.load(p)
    assert exc.value.code == "E_SCHEMA"
