"""Property tests for `hte.predict`, the prediction register (PR #87,
merged 2026-09-14). `tests/test_predict.py` already covers `register`/
`resolve` end to end over a real `synth_run` campaign fixture; this file
adds the swarm's own generated-input pass over the module's smaller, pure
helpers that file's fixed examples never isolate on their own: id
determinism, the meta/dict round trips `resolve` depends on to rebuild a
placement or sequence from the ledger alone, the ledger's append-only and
dedup contract, and `_replay_vocab_growth`'s id-collision guard.
"""
from __future__ import annotations

from pathlib import Path

from hypothesis import given, settings
from hypothesis import strategies as st

from hte import predict
from hte.address import SlotTuple, encode_indices, encode_sequence_indices
from hte.belief import Opinion
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.hypothesis import Placement
from hte.timeline import Interval

# --------------------------------------------------------------------------
# Strategies
# --------------------------------------------------------------------------

_TOKEN = st.text(min_size=1, max_size=8, alphabet=st.characters(min_codepoint=97, max_codepoint=122))
_ISO_MADE_AT = st.just("2026-09-14T00:00:00+00:00")

_SLOT_TUPLE = st.builds(
    SlotTuple,
    actor=st.integers(min_value=0, max_value=20), action=st.integers(min_value=0, max_value=20),
    object=st.integers(min_value=0, max_value=20), place=st.integers(min_value=0, max_value=20),
    time_bin=st.integers(min_value=0, max_value=20), mechanism=st.integers(min_value=0, max_value=20),
)

_INTERVAL = st.builds(
    lambda a, b: Interval(start=min(a, b), end=max(a, b)),
    st.integers(min_value=-5000, max_value=5000), st.integers(min_value=-5000, max_value=5000),
)

_PLACEMENT = st.builds(
    Placement,
    actor=st.one_of(st.none(), _TOKEN), action=st.one_of(st.none(), _TOKEN),
    object=st.one_of(st.none(), _TOKEN), place=st.one_of(st.none(), _TOKEN),
    mechanism=st.one_of(st.none(), _TOKEN), interval=_INTERVAL,
)

_OPINION = st.builds(
    Opinion,
    b=st.floats(min_value=0, max_value=1, allow_nan=False),
    d=st.floats(min_value=0, max_value=1, allow_nan=False),
    u=st.floats(min_value=0, max_value=1, allow_nan=False),
    a=st.floats(min_value=0, max_value=1, allow_nan=False),
)

_PREDICTION = st.builds(
    predict.Prediction,
    id=_TOKEN, kind=st.sampled_from(["claim", "discovery", "sequence"]),
    made_at=_ISO_MADE_AT, resolves_at=st.just("2027-09-14T00:00:00+00:00"),
    statement=st.text(min_size=0, max_size=30),
    P=st.floats(min_value=0, max_value=1, allow_nan=False), u=st.floats(min_value=0, max_value=1, allow_nan=False),
    a=st.floats(min_value=0, max_value=1, allow_nan=False),
    evidence_ids=st.lists(_TOKEN, max_size=3), run_id=_TOKEN,
    artifact_version=st.one_of(st.none(), _TOKEN), profile_spread=st.one_of(st.none(), st.floats(min_value=0, max_value=1, allow_nan=False)),
    envelope=st.just({}), meta=st.just({}),
)


# --------------------------------------------------------------------------
# _prediction_id
# --------------------------------------------------------------------------


@given(kind=st.sampled_from(["claim", "discovery", "sequence"]), run_id=_TOKEN, natural_key=_TOKEN, made_at=_TOKEN)
@settings(max_examples=40)
def test_prediction_id_is_deterministic(kind, run_id, natural_key, made_at):
    first = predict._prediction_id(kind, run_id, natural_key, made_at)
    second = predict._prediction_id(kind, run_id, natural_key, made_at)
    assert first == second
    assert len(first) == 16
    int(first, 16)  # every character is a hex digit


@given(kind=st.sampled_from(["claim", "discovery", "sequence"]), run_id=_TOKEN, made_at=_TOKEN, a=_TOKEN, b=_TOKEN)
@settings(max_examples=40)
def test_prediction_id_changes_with_natural_key(kind, run_id, made_at, a, b):
    if a == b:
        return
    assert predict._prediction_id(kind, run_id, a, made_at) != predict._prediction_id(kind, run_id, b, made_at)


# --------------------------------------------------------------------------
# _confidence
# --------------------------------------------------------------------------


@given(opinion=_OPINION)
@settings(max_examples=40)
def test_confidence_is_the_absolute_gap_between_projection_and_prior(opinion):
    assert predict._confidence(opinion) == abs(opinion.project() - opinion.a)


@given(opinion=_OPINION)
@settings(max_examples=40)
def test_confidence_is_never_negative(opinion):
    assert predict._confidence(opinion) >= 0.0


@given(a=st.floats(min_value=0, max_value=1, allow_nan=False))
@settings(max_examples=40)
def test_confidence_is_zero_for_an_unexamined_hypothesis(a):
    """`u=1, b=0, d=0` is `hte.belief.Opinion`'s own no-evidence reading
    (`Opinion.from_evidence`'s docstring): projection lands exactly on the
    prior, so the confidence gate correctly reads zero and never admits an
    untouched hypothesis into the claim register."""
    opinion = Opinion(b=0.0, d=0.0, u=1.0, a=a)
    assert predict._confidence(opinion) == 0.0


# --------------------------------------------------------------------------
# _member_addresses
# --------------------------------------------------------------------------


@given(first=_SLOT_TUPLE, relation_index=st.integers(min_value=0, max_value=12), second=_SLOT_TUPLE)
@settings(max_examples=40)
def test_member_addresses_recovers_both_placement_addresses(first, relation_index, second):
    seq_address = encode_sequence_indices(first, relation_index, second)
    recovered_first, recovered_second = predict._member_addresses(seq_address)
    assert recovered_first == encode_indices(first)
    assert recovered_second == encode_indices(second)


# --------------------------------------------------------------------------
# _placement_meta / _placement_from_meta
# --------------------------------------------------------------------------


@given(placement=_PLACEMENT)
@settings(max_examples=40)
def test_placement_meta_round_trips(placement):
    rebuilt = predict._placement_from_meta(predict._placement_meta(placement))
    assert rebuilt.actor == placement.actor
    assert rebuilt.action == placement.action
    assert rebuilt.object == placement.object
    assert rebuilt.place == placement.place
    assert rebuilt.mechanism == placement.mechanism
    assert rebuilt.interval.start == placement.interval.start
    assert rebuilt.interval.end == placement.interval.end


# --------------------------------------------------------------------------
# Prediction.to_dict / from_dict
# --------------------------------------------------------------------------


@given(prediction=_PREDICTION)
@settings(max_examples=40)
def test_prediction_to_dict_from_dict_round_trips(prediction):
    rebuilt = predict.Prediction.from_dict(prediction.to_dict())
    assert rebuilt.to_dict() == prediction.to_dict()


# --------------------------------------------------------------------------
# _resolves_at_date
# --------------------------------------------------------------------------


@given(
    year=st.integers(min_value=1000, max_value=9999), month=st.integers(min_value=1, max_value=12),
    day=st.integers(min_value=1, max_value=28), hour=st.integers(min_value=0, max_value=23),
)
@settings(max_examples=40)
def test_resolves_at_date_keeps_only_the_calendar_date(year, month, day, hour):
    date_part = f"{year:04d}-{month:02d}-{day:02d}"
    iso = f"{date_part}T{hour:02d}:00:00+00:00"
    assert predict._resolves_at_date(iso) == date_part


# --------------------------------------------------------------------------
# load_ledger / _append_ledger
# --------------------------------------------------------------------------


def test_load_ledger_reads_nothing_from_an_absent_file(tmp_path):
    assert predict.load_ledger(tmp_path / "does-not-exist" / "ledger.jsonl") == []


@given(predictions=st.lists(_PREDICTION, min_size=1, max_size=6, unique_by=lambda p: p.id))
@settings(max_examples=40)
def test_append_ledger_is_idempotent_on_a_repeat_call(tmp_path_factory, predictions):
    path = Path(tmp_path_factory.mktemp("ledger")) / "ledger.jsonl"
    first_added = predict._append_ledger(predictions, path)
    assert [p.id for p in first_added] == [p.id for p in predictions]
    on_disk_after_first = predict.load_ledger(path)

    second_added = predict._append_ledger(predictions, path)
    assert second_added == []
    on_disk_after_second = predict.load_ledger(path)
    assert [p.to_dict() for p in on_disk_after_second] == [p.to_dict() for p in on_disk_after_first]


@given(
    first_batch=st.lists(_PREDICTION, min_size=1, max_size=4, unique_by=lambda p: p.id),
    second_batch=st.lists(_PREDICTION, min_size=1, max_size=4, unique_by=lambda p: p.id),
)
@settings(max_examples=40)
def test_append_ledger_never_rewrites_an_existing_entrys_own_line(tmp_path_factory, first_batch, second_batch):
    """`_append_ledger`'s own docstring: a second call never alters an
    earlier entry's content, only ever adds lines after it."""
    ids_already_used = {p.id for p in first_batch}
    second_batch = [p for p in second_batch if p.id not in ids_already_used]
    path = Path(tmp_path_factory.mktemp("ledger")) / "ledger.jsonl"
    predict._append_ledger(first_batch, path)
    text_before = path.read_text(encoding="utf-8")

    predict._append_ledger(second_batch, path)
    text_after = path.read_text(encoding="utf-8")
    assert text_after.startswith(text_before)


# --------------------------------------------------------------------------
# _label
# --------------------------------------------------------------------------


def test_label_reads_unset_for_none():
    vocab = Vocabulary()
    assert predict._label(vocab, Slot.ACTOR, None) == "(unset)"


def test_label_falls_back_to_the_bare_id_when_the_concept_is_unknown():
    vocab = Vocabulary()
    assert predict._label(vocab, Slot.ACTOR, "no-such-concept") == "no-such-concept"


def test_label_reads_the_concepts_own_label_when_present():
    vocab = Vocabulary()
    vocab.add(Concept(id="c1", slot=Slot.ACTOR, label="A Real Label", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    assert predict._label(vocab, Slot.ACTOR, "c1") == "A Real Label"


# --------------------------------------------------------------------------
# _replay_vocab_growth
# --------------------------------------------------------------------------


@given(concept_id=_TOKEN, label=st.text(min_size=0, max_size=10))
@settings(max_examples=40)
def test_replay_vocab_growth_adds_a_new_concept_exactly_once(concept_id, label):
    vocab = Vocabulary()
    growth = [{"slot": Slot.ACTOR.value, "id": concept_id, "label": label}]
    predict._replay_vocab_growth(vocab, growth)
    assert vocab.get(Slot.ACTOR, concept_id) is not None

    # A second replay of the identical growth list must not raise
    # `Vocabulary.add`'s own duplicate-id ValueError.
    predict._replay_vocab_growth(vocab, growth)
    assert len([c for c in vocab.concepts(Slot.ACTOR) if c.id == concept_id]) == 1


def test_replay_vocab_growth_skips_an_entry_naming_no_valid_slot():
    vocab = Vocabulary()
    predict._replay_vocab_growth(vocab, [{"slot": "NOT-A-REAL-SLOT", "id": "x"}])
    for slot in Slot:
        assert vocab.get(slot, "x") is None


# --------------------------------------------------------------------------
# _envelope / _cite_block
# --------------------------------------------------------------------------


def test_cite_block_costs_the_reader_nothing():
    block = predict._cite_block()
    assert block["reader_owes"] == 0
    assert block["price_usd"] == 0


@given(pred_id=_TOKEN, run_id=_TOKEN, statement=st.text(max_size=20))
@settings(max_examples=40)
def test_envelope_marks_an_unresolved_forecast_as_requiring_no_action(pred_id, run_id, statement):
    env = predict._envelope(
        pred_id=pred_id, kind="claim", run_id=run_id, statement=statement,
        made_at="2026-09-14T00:00:00+00:00", resolves_at="2027-09-14T00:00:00+00:00",
        P=0.5, u=0.5, a=0.5, profile_spread=None, evidence_ids=[],
    )
    assert env["agent_action_required"] is False
    assert env["payment_required_from_you"] is False
    assert env["receipt"]["status"] == "forecast_registered_not_yet_resolved"
    assert env["receipt"]["price_usd"] == 0
    assert env["citation"]["type"] == "prediction"
