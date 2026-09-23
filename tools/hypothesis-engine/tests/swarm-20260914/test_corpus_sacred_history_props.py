from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte.corpus.sacred_history import (
    _add_stemma_parent,
    _build_sources,
    _correlation_interval,
    _locate,
    _tradition_spans,
)
from hte.evidence import Source, EvidenceKind
from hte.timeline import UncertaintyKind

def test_locate_raises_valueerror_when_needle_not_found():
    with pytest.raises(ValueError, match="not found verbatim"):
        _locate("the quick brown fox", "a needle nowhere in this text")

@given(st.text(min_size=1, max_size=40).filter(lambda s: s.strip()))
def test_locate_finds_a_needle_present_verbatim(needle):
    raw = f"prefix-before {needle} suffix-after"
    start, end = _locate(raw, needle)
    assert raw[start:end] == needle
    assert 0 <= start < end <= len(raw)

def test_tradition_spans_skips_events_with_no_year():
    timeline = [
        {"year": None, "traditions": ["judaism"]},
        {"year": 500, "traditions": ["judaism"]},
    ]
    spans, anchored = _tradition_spans(timeline)
    assert spans["judaism"] == (500, 500)
    assert "judaism" not in anchored

@given(st.integers(min_value=-3000, max_value=3000), st.integers(min_value=-3000, max_value=3000))
def test_tradition_spans_widens_to_min_and_max_across_dated_events(y1, y2):
    timeline = [
        {"year": y1, "traditions": ["islam"]},
        {"year": y2, "traditions": ["islam"]},
    ]
    spans, anchored = _tradition_spans(timeline)
    lo, hi = spans["islam"]
    assert lo == min(y1, y2)
    assert hi == max(y1, y2)
    assert "islam" not in anchored

def test_tradition_spans_falls_back_to_external_anchor_when_never_dated():
    spans, anchored = _tradition_spans(timeline=[])
    assert anchored == frozenset({"mesopotamian", "greek"})
    assert spans["mesopotamian"] == (-1200, -1200)
    assert spans["greek"] == (-700, -700)

def test_correlation_interval_only_a_known_reads_as_anchor():
    interval, is_overlap, rule = _correlation_interval((100, 200), None)
    assert interval.start == 100 and interval.end == 200
    assert interval.uncertainty.kind == UncertaintyKind.UNIFORM
    assert is_overlap is None
    assert rule == "anchor"

def test_correlation_interval_only_b_known_reads_as_anchor():
    interval, is_overlap, rule = _correlation_interval(None, (-50, 50))
    assert interval.start == -50 and interval.end == 50
    assert is_overlap is None
    assert rule == "anchor"

def test_correlation_interval_neither_known_is_all_none():
    assert _correlation_interval(None, None) == (None, None, None)

@given(st.integers(min_value=-2000, max_value=0), st.integers(min_value=0, max_value=2000))
def test_correlation_interval_single_span_is_returned_verbatim_regardless_of_side(lo, hi):
    interval, is_overlap, rule = _correlation_interval((lo, hi), None)
    assert (interval.start, interval.end) == (lo, hi)
    assert rule == "anchor"
    interval2, is_overlap2, rule2 = _correlation_interval(None, (lo, hi))
    assert (interval2.start, interval2.end) == (lo, hi)
    assert rule2 == "anchor"

def _sources(*ids: str) -> dict[str, Source]:
    return {tid: Source(id=tid, kind=EvidenceKind.TEXTUAL, date=None) for tid in ids}

def test_build_sources_skips_correlation_missing_side_a_tradition():
    sources = _build_sources(["judaism", "islam"], {}, [
        {"sideA": {}, "sideB": {"tradition": "islam"}},
    ])
    assert sources["judaism"].stemma_parents == []
    assert sources["islam"].stemma_parents == []

def test_build_sources_skips_correlation_missing_side_b_tradition():
    sources = _build_sources(["judaism", "islam"], {}, [
        {"sideA": {"tradition": "judaism"}, "sideB": {}},
    ])
    assert sources["judaism"].stemma_parents == []
    assert sources["islam"].stemma_parents == []

def test_build_sources_skips_correlation_with_identical_traditions_on_both_sides():
    sources = _build_sources(["judaism"], {}, [
        {"sideA": {"tradition": "judaism"}, "sideB": {"tradition": "judaism"}},
    ])
    assert sources["judaism"].stemma_parents == []

def test_build_sources_skips_correlation_naming_a_tradition_not_in_the_corpus():
    sources = _build_sources(["judaism"], {}, [
        {"sideA": {"tradition": "judaism"}, "sideB": {"tradition": "atlantis"}},
    ])
    assert sources["judaism"].stemma_parents == []

def test_build_sources_directed_a_to_b_adds_a_single_directed_edge():
    sources = _build_sources(["judaism", "christianity"], {}, [
        {"sideA": {"tradition": "judaism"}, "sideB": {"tradition": "christianity"}, "direction": "a→b"},
    ])
    assert sources["christianity"].stemma_parents == ["judaism"]
    assert sources["judaism"].stemma_parents == []

def test_build_sources_directed_b_to_a_adds_a_single_directed_edge():
    sources = _build_sources(["judaism", "christianity"], {}, [
        {"sideA": {"tradition": "judaism"}, "sideB": {"tradition": "christianity"}, "direction": "b→a"},
    ])
    assert sources["judaism"].stemma_parents == ["christianity"]
    assert sources["christianity"].stemma_parents == []

def test_build_sources_undirected_falls_back_to_mutual_pair():
    sources = _build_sources(["judaism", "christianity"], {}, [
        {"sideA": {"tradition": "judaism"}, "sideB": {"tradition": "christianity"}, "direction": "undirected"},
    ])
    assert sources["christianity"].stemma_parents == ["judaism"]
    assert sources["judaism"].stemma_parents == ["christianity"]

def test_add_stemma_parent_is_idempotent():
    source = Source(id="a", kind=EvidenceKind.TEXTUAL, date=None)
    _add_stemma_parent(source, "b")
    _add_stemma_parent(source, "b")
    assert source.stemma_parents == ["b"]
