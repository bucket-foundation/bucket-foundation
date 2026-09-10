"""Property/behavior tests for `hte.runner`'s pure helper functions and the
narrow error/fallback branches around them: `_unique_id`'s collision walk,
`_resolve_slot_value`'s OTHER fallback, `_time_bins_for`/`_resolve_time_binning`
on a corpus with no ground truth, `_grow_vocab` skipping a proposal naming an
unrecognized slot, `_judge_adapter`'s closure, `run_campaign`'s unknown-corpus
guard, `_first_document`'s per-corpus-name branches, `_target_blind_check`'s
corrupt-state-file fallback, and `Logger`'s echo branch. None of these need a
real `claude -p` call or a real campaign run; every LLM-backed role touched
here (`roles.unknown_unknown`, `roles.judge`) is monkeypatched to a stub.
`hte.runner` was round one's least-covered module in `tests/COVERAGE.md`
(87.7%) and untouched by `tests/swarm/`, `tests/swarm2/`, or `tests/swarm3/`.
"""
from __future__ import annotations

import json

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from tests.swarm.conftest import evidence_item

from hte import roles, runner
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.corpus import Corpus
from hte.corpus import quantum_history
from hte.timeline import Resolution, time_bin_index


def _vocab_with(slot: Slot, ids: list[str]) -> Vocabulary:
    vocab = Vocabulary()
    for i, cid in enumerate(ids):
        vocab.add(Concept(
            id=cid, slot=slot, label=cid, prior_logit=0.0,
            consensus_status=ConsensusStatus.CONSENSUS,
        ))
    return vocab


# --------------------------------------------------------------------------
# `_unique_id`: returns the base id unchanged when free, otherwise walks
# `-2`, `-3`, ... past every already-taken id, in-slot only.
# --------------------------------------------------------------------------


@given(base_id=st.text(alphabet=st.characters(whitelist_categories=("L", "N")), min_size=1, max_size=12))
@settings(max_examples=40)
def test_unique_id_returns_base_id_when_free(base_id):
    vocab = Vocabulary()
    assert runner._unique_id(vocab, Slot.ACTOR, base_id) == base_id


def test_unique_id_walks_past_a_single_collision():
    vocab = _vocab_with(Slot.ACTOR, ["planck"])
    assert runner._unique_id(vocab, Slot.ACTOR, "planck") == "planck-2"


def test_unique_id_walks_past_consecutive_collisions():
    vocab = _vocab_with(Slot.ACTOR, ["planck", "planck-2", "planck-3"])
    assert runner._unique_id(vocab, Slot.ACTOR, "planck") == "planck-4"


def test_unique_id_collision_in_one_slot_does_not_block_another_slot():
    # `planck` already taken in ACTOR must not affect the MECHANISM slot,
    # since `_unique_id`'s own walk reads `vocab.get(slot, ...)` scoped to
    # the slot it was called with.
    vocab = _vocab_with(Slot.ACTOR, ["planck"])
    assert runner._unique_id(vocab, Slot.MECHANISM, "planck") == "planck"


# --------------------------------------------------------------------------
# `_resolve_slot_value`: the value itself when it names a real concept id,
# `other_id(slot)` otherwise.
# --------------------------------------------------------------------------


def test_resolve_slot_value_returns_the_value_when_it_names_a_known_concept():
    vocab = _vocab_with(Slot.ACTOR, ["planck"])
    assert runner._resolve_slot_value(vocab, Slot.ACTOR, "planck") == "planck"


def test_resolve_slot_value_falls_back_to_other_for_an_unknown_value():
    from hte.concepts import other_id
    vocab = Vocabulary()
    assert runner._resolve_slot_value(vocab, Slot.ACTOR, "not-a-real-concept") == other_id(Slot.ACTOR)


# --------------------------------------------------------------------------
# `_time_bins_for`: a corpus with no ground truth reads back exactly one
# bin, the one `time_bin_index(2000, ...)` names, per its own fallback.
# --------------------------------------------------------------------------


def test_time_bins_for_empty_ground_truth_falls_back_to_year_2000():
    corpus = Corpus()
    bins = runner._time_bins_for(corpus, max_bins=20, span_start=1900, bin_width=10)
    assert bins == [time_bin_index(2000, 1900, 10)]


@given(n_bins=st.integers(min_value=1, max_value=30), max_bins=st.integers(min_value=1, max_value=10))
@settings(max_examples=40)
def test_time_bins_for_never_exceeds_max_bins(n_bins, max_bins):
    corpus = Corpus(ground_truth=[
        _ground_truth_event(f"g{i}", year=1900 + i) for i in range(n_bins)
    ])
    bins = runner._time_bins_for(corpus, max_bins=max_bins, span_start=1900, bin_width=1)
    assert len(bins) <= max_bins


def _ground_truth_event(gid: str, *, year: int):
    from hte.corpus import GroundTruthEvent
    return GroundTruthEvent(id=gid, label=gid, year=year, doc_id="doc-1", discovery_year=year)


# --------------------------------------------------------------------------
# `_resolve_time_binning`: an unpinned `cfg["resolution"]` over a corpus with
# no ground truth defaults to `Resolution.CENTURY` at the paper's own fixed
# span, rather than crashing on an empty `min(...)` over no intervals.
# --------------------------------------------------------------------------


def test_resolve_time_binning_empty_ground_truth_defaults_to_century():
    from hte.address import DEFAULT_SPAN_START
    from hte.timeline import RESOLUTION_WIDTH_YEARS
    corpus = Corpus()
    resolution, span_start, bin_width = runner._resolve_time_binning({"resolution": None}, corpus)
    assert resolution == Resolution.CENTURY
    assert span_start == DEFAULT_SPAN_START
    assert bin_width == RESOLUTION_WIDTH_YEARS[Resolution.CENTURY]


def test_resolve_time_binning_pinned_resolution_ignores_empty_ground_truth():
    from hte.address import DEFAULT_SPAN_START
    from hte.timeline import RESOLUTION_WIDTH_YEARS
    corpus = Corpus()
    resolution, span_start, bin_width = runner._resolve_time_binning({"resolution": "decade"}, corpus)
    assert resolution == Resolution.DECADE
    assert span_start == DEFAULT_SPAN_START
    assert bin_width == RESOLUTION_WIDTH_YEARS[Resolution.DECADE]


# --------------------------------------------------------------------------
# `_grow_vocab`: a proposal naming a slot string `Slot(...)` cannot parse is
# skipped (logged, not raised); every other proposal in the same response is
# still added.
# --------------------------------------------------------------------------


def test_grow_vocab_skips_a_proposal_with_an_unrecognized_slot(tmp_path, monkeypatch):
    def fake_unknown_unknown(vocab, evidence, *, cache_dir, replay_only):
        return {"proposals": [
            {"slot": "not-a-real-slot", "label": "Bogus", "rationale": "should be skipped"},
            {"slot": "actor", "label": "Real Actor", "rationale": "should be added"},
        ]}

    monkeypatch.setattr(runner.roles, "unknown_unknown", fake_unknown_unknown)
    vocab = Vocabulary()
    logger = runner.Logger(tmp_path / "run.log")

    added = runner._grow_vocab(vocab, [evidence_item("e1")], cache_dir=str(tmp_path), replay_only=False, logger=logger)

    assert len(added) == 1
    assert added[0]["label"] == "Real Actor"
    log_text = (tmp_path / "run.log").read_text()
    assert "unrecognized slot" in log_text


# --------------------------------------------------------------------------
# `_judge_adapter`: the returned closure forwards to `roles.judge` with the
# adapter's own `cache_dir`/`replay_only` and returns its value unchanged.
# --------------------------------------------------------------------------


def test_judge_adapter_forwards_to_roles_judge(monkeypatch):
    calls = []

    def fake_judge(a, b, context, *, cache_dir, replay_only):
        calls.append((a, b, context, cache_dir, replay_only))
        return 0.73

    monkeypatch.setattr(runner.roles, "judge", fake_judge)
    judge = runner._judge_adapter("some-cache-dir", True)

    result = judge("hyp-a", "hyp-b", {"opinions": {}})

    assert result == 0.73
    assert calls == [("hyp-a", "hyp-b", {"opinions": {}}, "some-cache-dir", True)]


# --------------------------------------------------------------------------
# `run_campaign`: an unregistered corpus name raises `ValueError` naming the
# registered set, before any corpus load or LLM call is attempted.
# --------------------------------------------------------------------------


def test_run_campaign_raises_value_error_for_an_unknown_corpus(tmp_path):
    with pytest.raises(ValueError, match="unknown corpus"):
        runner.run_campaign({"corpus": "not-a-registered-corpus", "out_dir": str(tmp_path)})


# --------------------------------------------------------------------------
# `_first_document`: per-corpus-name branches. `quantum-history` reads its
# own `_CHAPTER.md`'s first two paragraphs off disk; any name this function
# does not special-case (including a real, registered corpus like
# `education-atlas`) returns `None` rather than guessing a document shape.
# --------------------------------------------------------------------------


def test_first_document_quantum_history_reads_first_two_paragraphs_of_the_chapter():
    chapter = quantum_history.DEFAULT_CORPUS_DIR / "_CHAPTER.md"
    assert chapter.is_file(), "this test needs the real quantum/07-history/_CHAPTER.md fixture"
    expected_paragraphs = chapter.read_text().split("\n\n")[:2]

    result = runner._first_document("quantum-history", Corpus())

    assert result == ("_CHAPTER", "\n\n".join(expected_paragraphs))


def test_first_document_returns_none_for_a_name_it_does_not_special_case():
    assert runner._first_document("education-atlas", Corpus()) is None
    assert runner._first_document("not-a-real-corpus-name", Corpus()) is None


# --------------------------------------------------------------------------
# `_target_blind_check`: a corrupt (non-JSON) state file falls back to
# `prior_rate=None` (steady, first-run reading) rather than raising, and
# overwrites the file with this run's own valid rate.
# --------------------------------------------------------------------------


def test_target_blind_check_corrupt_state_file_falls_back_to_no_prior_rate(tmp_path):
    campaign_dir = tmp_path / "camp"
    campaign_dir.mkdir()
    state_path = campaign_dir / "_target_blind.json"
    state_path.write_text("{not valid json")

    result = runner._target_blind_check({"out_dir": str(tmp_path), "campaign": "camp"}, [], Vocabulary())

    assert result["prior_rate"] is None
    assert result["steady"] is True
    assert result["first_run"] is True
    # the corrupt file is overwritten with this run's own valid state
    assert json.loads(state_path.read_text())["rate"] == 0.0


# --------------------------------------------------------------------------
# `Logger`: `echo=True` prints the same line it appends to `run.log`.
# --------------------------------------------------------------------------


def test_logger_echo_prints_the_logged_line(tmp_path, capsys):
    logger = runner.Logger(tmp_path / "run.log", echo=True)
    logger.log("hello from the test swarm")

    captured = capsys.readouterr()
    assert "hello from the test swarm" in captured.out
    assert "hello from the test swarm" in (tmp_path / "run.log").read_text()


def test_logger_no_echo_prints_nothing(tmp_path, capsys):
    logger = runner.Logger(tmp_path / "run.log", echo=False)
    logger.log("silent line")

    captured = capsys.readouterr()
    assert captured.out == ""
    assert "silent line" in (tmp_path / "run.log").read_text()
