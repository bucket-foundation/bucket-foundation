"""Property tests over `hte.export`: `timeline_views`'s JSON round trip
and `write_views`'s output stability across repeated calls."""
from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

from hypothesis import given
from hypothesis import strategies as st

from hte.belief import Opinion
from hte.export import timeline_views, write_views
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval

DEFAULT_SPAN_START = -20_000
DEFAULT_BIN_WIDTH = 100


def _placement_hypothesis(address: int, *, actor="a", action="b", obj="c", place="d", mechanism="e", start=0) -> Hypothesis:
    p = Placement(actor=actor, action=action, object=obj, place=place, mechanism=mechanism, interval=Interval(start, start))
    return Hypothesis(address=address, content=p)


@given(
    st.lists(st.integers(min_value=1, max_value=5000), min_size=0, max_size=6, unique=True),
    st.integers(min_value=DEFAULT_SPAN_START, max_value=DEFAULT_SPAN_START + 2000),
)
def test_timeline_views_json_round_trips_through_json_dumps(addresses, start):
    hyps = [_placement_hypothesis(a, start=start) for a in addresses]
    opinions = {a: Opinion(b=0.1, d=0.1, u=0.8, a=0.5) for a in addresses}
    elos = {a: 1500.0 for a in addresses}
    tbin = (start - DEFAULT_SPAN_START) // DEFAULT_BIN_WIDTH
    views = timeline_views(hyps, opinions, elos, [tbin])
    dumped = json.dumps(views)
    assert json.loads(dumped) == views


def test_timeline_views_handles_empty_input():
    views = timeline_views([], {}, {}, [])
    assert views == {"bins": [], "event_views": [], "pair_views": []}
    assert json.loads(json.dumps(views)) == views


def test_write_views_output_is_stable_across_two_calls(tmp_path):
    hyps = [_placement_hypothesis(1), _placement_hypothesis(2)]
    opinions = {1: Opinion(b=0.2, d=0.1, u=0.7, a=0.4), 2: Opinion(b=0.5, d=0.0, u=0.5, a=0.6)}
    elos = {1: 1520.3, 2: 1490.1}
    views = timeline_views(hyps, opinions, elos, [tbin_of(0)])

    out1 = tmp_path / "run1"
    out2 = tmp_path / "run2"
    write_views(views, out1)
    write_views(views, out2)

    assert (out1 / "timeline.json").read_text() == (out2 / "timeline.json").read_text()
    assert (out1 / "TIMELINE.md").read_text() == (out2 / "TIMELINE.md").read_text()


def test_write_views_rewriting_the_same_dir_is_stable():
    hyps = [_placement_hypothesis(3)]
    opinions = {3: Opinion(b=0.3, d=0.2, u=0.5, a=0.5)}
    elos = {3: 1500.0}
    views = timeline_views(hyps, opinions, elos, [tbin_of(0)])

    tmp = tempfile.mkdtemp()
    try:
        write_views(views, tmp)
        first = (Path(tmp) / "timeline.json").read_text()
        write_views(views, tmp)
        second = (Path(tmp) / "timeline.json").read_text()
        assert first == second
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def tbin_of(start: int) -> int:
    return (start - DEFAULT_SPAN_START) // DEFAULT_BIN_WIDTH


def test_rank_key_sorts_unscored_hypotheses_after_scored_ones_at_the_same_tier():
    from hte.export import _rank_key

    scored = _placement_hypothesis(1)
    unscored = _placement_hypothesis(2)
    opinions = {1: Opinion(b=0.9, d=0.0, u=0.1, a=0.5)}
    elos = {1: 1600.0}
    key_scored = _rank_key(scored, opinions, elos)
    key_unscored = _rank_key(unscored, opinions, elos)
    assert key_scored > key_unscored


def test_event_views_groups_placements_sharing_object_and_place():
    h1 = _placement_hypothesis(1, obj="pyramid", place="giza")
    h2 = _placement_hypothesis(2, obj="pyramid", place="giza")
    h3 = _placement_hypothesis(3, obj="ziggurat", place="ur")
    opinions = {1: Opinion(b=0.6, d=0.0, u=0.4, a=0.5), 2: Opinion(b=0.3, d=0.0, u=0.7, a=0.5), 3: Opinion(b=0.5, d=0.0, u=0.5, a=0.5)}
    elos = {1: 1500.0, 2: 1450.0, 3: 1400.0}
    views = timeline_views([h1, h2, h3], opinions, elos, [tbin_of(0)])
    events = {(e["event"]["object"], e["event"]["place"]): e["competing_placements"] for e in views["event_views"]}
    assert set(events[("pyramid", "giza")]) == {h1.short_id, h2.short_id}
    assert events[("ziggurat", "ur")] == [h3.short_id]
