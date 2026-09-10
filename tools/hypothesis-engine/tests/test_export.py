import json

from hte.address import time_bin_index
from hte.belief import Opinion
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.export import timeline_views, write_views
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.timeline import AllenRelation, Interval


def _small_vocab() -> Vocabulary:
    vocab = Vocabulary()
    vocab.add(Concept("farmers", Slot.ACTOR, "Farmers", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("aliens", Slot.ACTOR, "Aliens", -4.0, ConsensusStatus.FRINGE))
    vocab.add(Concept("built", Slot.ACTION, "Built", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("shrine", Slot.OBJECT, "Shrine", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("site", Slot.PLACE, "Site", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("labor", Slot.MECHANISM, "Labor", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("tech", Slot.MECHANISM, "Tech", -2.5, ConsensusStatus.FRINGE))
    return vocab


def _interval() -> Interval:
    return Interval(start=-7000, end=-6901)


def _fixture(vocab: Vocabulary):
    farmers = Placement(actor="farmers", action="built", object="shrine", place="site",
                         mechanism="labor", interval=_interval())
    aliens = Placement(actor="aliens", action="built", object="shrine", place="site",
                        mechanism="tech", interval=_interval())
    h_farmers = Hypothesis.from_placement(farmers, vocab)
    h_aliens = Hypothesis.from_placement(aliens, vocab)
    seq = Sequence(first=farmers, relation=AllenRelation.BEFORE, second=aliens)
    h_seq = Hypothesis.from_sequence(seq, vocab)

    opinions = {
        h_farmers.address: Opinion(b=0.9, d=0.0, u=0.1, a=0.9),
        h_aliens.address: Opinion(b=0.0, d=0.9, u=0.1, a=0.1),
        h_seq.address: Opinion(b=0.5, d=0.0, u=0.5, a=0.5),
    }
    elos = {h_farmers.address: 1800.0, h_aliens.address: 1200.0, h_seq.address: 1500.0}
    return h_farmers, h_aliens, h_seq, opinions, elos


def test_timeline_views_bins_are_ranked_by_posterior():
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)

    views = timeline_views([h_farmers, h_aliens, h_seq], opinions, elos, [tbin])
    [bin_view] = views["bins"]
    assert bin_view["time_bin"]["index"] == tbin
    ranked_ids = [entry["hypothesis_id"] for entry in bin_view["ranked_hypotheses"]]
    assert ranked_ids == [h_farmers.short_id, h_aliens.short_id]  # sequence excluded from bin views
    assert bin_view["ranked_hypotheses"][0]["posterior"] > bin_view["ranked_hypotheses"][1]["posterior"]


def test_timeline_views_bin_caps_at_top_k():
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)
    views = timeline_views([h_farmers, h_aliens, h_seq], opinions, elos, [tbin], top_k=1)
    assert len(views["bins"][0]["ranked_hypotheses"]) == 1


def test_timeline_views_event_view_groups_by_object_and_place():
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    views = timeline_views([h_farmers, h_aliens, h_seq], opinions, elos, [])
    [event] = views["event_views"]
    assert event["event"] == {"object": "shrine", "place": "site"}
    assert set(event["competing_placements"]) == {h_farmers.short_id, h_aliens.short_id}


def test_timeline_views_pair_view_lists_competing_sequences():
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    views = timeline_views([h_farmers, h_aliens, h_seq], opinions, elos, [])
    [pair] = views["pair_views"]
    assert pair["pair"]["first"] == {"object": "shrine", "place": "site"}
    assert pair["pair"]["second"] == {"object": "shrine", "place": "site"}
    [seq_entry] = pair["competing_sequences"]
    assert seq_entry["relation"] == "before"


def test_timeline_views_handles_missing_opinion_and_elo():
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)
    # No opinion/elo at all: should not raise, and posterior/elo read None.
    views = timeline_views([h_farmers], {}, {}, [tbin])
    entry = views["bins"][0]["ranked_hypotheses"][0]
    assert entry["posterior"] is None
    assert entry["elo"] is None


def test_write_views_round_trips_through_json(tmp_path):
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)
    views = timeline_views([h_farmers, h_aliens, h_seq], opinions, elos, [tbin])

    write_views(views, tmp_path)
    loaded = json.loads((tmp_path / "timeline.json").read_text())
    assert loaded == views


def test_write_views_writes_a_markdown_table(tmp_path):
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)
    views = timeline_views([h_farmers, h_aliens, h_seq], opinions, elos, [tbin])

    write_views(views, tmp_path)
    text = (tmp_path / "TIMELINE.md").read_text()
    assert "# Timeline" in text
    assert h_farmers.short_id in text
    assert "before" in text


def test_write_views_creates_out_dir(tmp_path):
    nested = tmp_path / "a" / "b"
    write_views({"bins": [], "event_views": [], "pair_views": []}, nested)
    assert (nested / "timeline.json").exists()
    assert (nested / "TIMELINE.md").exists()


def test_timeline_views_bin_label_defaults_to_str_index_with_no_bin_labels():
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)
    views = timeline_views([h_farmers, h_aliens, h_seq], opinions, elos, [tbin])
    assert views["bins"][0]["time_bin"]["label"] == str(tbin)


def test_timeline_views_bin_label_uses_the_given_map():
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)
    views = timeline_views(
        [h_farmers, h_aliens, h_seq], opinions, elos, [tbin],
        bin_labels={tbin: "1900s"},
    )
    assert views["bins"][0]["time_bin"]["label"] == "1900s"
    assert views["bins"][0]["time_bin"]["index"] == tbin  # index stays alongside the label


def test_write_views_renders_the_bin_label_when_given(tmp_path):
    vocab = _small_vocab()
    h_farmers, h_aliens, h_seq, opinions, elos = _fixture(vocab)
    tbin = time_bin_index(_interval().start)
    views = timeline_views(
        [h_farmers, h_aliens, h_seq], opinions, elos, [tbin],
        bin_labels={tbin: "1900s"},
    )
    write_views(views, tmp_path)
    text = (tmp_path / "TIMELINE.md").read_text()
    assert "## Time bin 1900s" in text


def test_timeline_views_bin_membership_respects_custom_span_and_width():
    vocab = _small_vocab()
    # A placement dated 1905, addressed under a decade-wide, 1900-anchored
    # axis instead of the module's own century/-20000 default.
    placement = Placement(actor="farmers", action="built", object="shrine", place="site",
                           mechanism="labor", interval=Interval(start=1905, end=1905))
    h = Hypothesis.from_placement(placement, vocab, span_start=1900, bin_width=10)
    tbin = time_bin_index(1905, 1900, 10)
    views = timeline_views([h], {}, {}, [tbin], span_start=1900, bin_width=10)
    assert len(views["bins"][0]["ranked_hypotheses"]) == 1
    assert views["bins"][0]["ranked_hypotheses"][0]["hypothesis_id"] == h.short_id
