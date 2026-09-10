import pytest

from hte.belief import Opinion
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval
from hte.tournament import critic_filter, run


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


def _hypothesis(vocab: Vocabulary, actor: str, mechanism: str) -> Hypothesis:
    interval = Interval(start=-7000, end=-6901)
    placement = Placement(actor=actor, action="built", object="shrine", place="site",
                           mechanism=mechanism, interval=interval)
    return Hypothesis.from_placement(placement, vocab)


def _null_judge(_a, _b, _ctx):
    return 0.5


# --------------------------------------------------------------------------
# run: Elo seeding, determinism, and outranking under a null judge
# --------------------------------------------------------------------------


def test_run_is_deterministic_under_a_fixed_seed():
    vocab = _small_vocab()
    h_high = _hypothesis(vocab, "farmers", "labor")
    h_low = _hypothesis(vocab, "aliens", "tech")
    opinions = {
        h_high.address: Opinion(b=0.85, d=0.0, u=0.15, a=0.9),
        h_low.address: Opinion(b=0.0, d=0.85, u=0.15, a=0.1),
    }
    first = run([h_high, h_low], opinions, _null_judge, seed=7)
    second = run([h_high, h_low], opinions, _null_judge, seed=7)
    assert first == second


def test_run_high_posterior_outranks_low_posterior_under_null_judge():
    vocab = _small_vocab()
    h_high = _hypothesis(vocab, "farmers", "labor")
    h_low = _hypothesis(vocab, "aliens", "tech")
    opinions = {
        h_high.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.9),  # P = 0.9
        h_low.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.1),   # P = 0.1
    }
    elos = run([h_high, h_low], opinions, _null_judge)
    assert elos[h_high.address] > elos[h_low.address]


def test_run_seeds_elo_from_projected_posterior():
    import math

    vocab = _small_vocab()
    h = _hypothesis(vocab, "farmers", "labor")
    opinions = {h.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.9)}
    # rounds=0 skips every debate round, so the returned rating is the seed alone.
    elos = run([h], opinions, _null_judge, rounds=0)
    expected = 1500.0 + 400.0 * math.log(0.9 / 0.1)
    assert elos[h.address] == pytest.approx(expected)


def test_run_unopined_hypothesis_seeds_at_neutral_elo():
    vocab = _small_vocab()
    h = _hypothesis(vocab, "farmers", "labor")
    elos = run([h], {}, _null_judge, rounds=0)
    assert elos[h.address] == pytest.approx(1500.0)


def test_run_seeds_a_positive_readable_elo_at_extreme_disbelief():
    # A survivor kept for its own high disbelief (main.tex's own worked
    # examples reach d>=0.9) projects a P near zero; the unclamped
    # affine map (base 1500, scale 400) would seed a large negative
    # rating there (confirmed on a live run: P=0.022 seeded Elo0=-18.2).
    # The widened clamp guarantees a positive floor instead.
    vocab = _small_vocab()
    h = _hypothesis(vocab, "aliens", "tech")
    opinions = {h.address: Opinion(b=0.0, d=0.97, u=0.03, a=0.1)}  # P ~= 0.003
    elos = run([h], opinions, _null_judge, rounds=0)
    assert elos[h.address] > 0.0


def test_run_seeds_a_bounded_ceiling_at_extreme_belief():
    vocab = _small_vocab()
    h = _hypothesis(vocab, "farmers", "labor")
    opinions = {h.address: Opinion(b=0.999999, d=0.0, u=0.000001, a=0.9)}  # P ~= 1.0
    elos = run([h], opinions, _null_judge, rounds=0)
    assert 0.0 < elos[h.address] < 3500.0


def test_run_odd_population_gives_the_last_hypothesis_a_bye():
    vocab = _small_vocab()
    hyps = [
        _hypothesis(vocab, "farmers", "labor"),
        _hypothesis(vocab, "aliens", "tech"),
        Hypothesis.from_placement(
            Placement(actor="farmers", action="built", object="shrine", place="site",
                      mechanism="tech", interval=Interval(start=-7000, end=-6901)),
            vocab,
        ),
    ]
    opinions = {h.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5) for h in hyps}
    # Should not raise with an odd number of hypotheses.
    elos = run(hyps, opinions, _null_judge, rounds=2)
    assert len(elos) == 3


def test_run_informative_judge_favors_the_stated_winner():
    vocab = _small_vocab()
    h_a = _hypothesis(vocab, "farmers", "labor")
    h_b = _hypothesis(vocab, "aliens", "tech")
    opinions = {h_a.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5), h_b.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5)}

    def judge_a_always_wins(a, b, _ctx):
        return 1.0 if a.address == h_a.address else 0.0

    elos = run([h_a, h_b], opinions, judge_a_always_wins, rounds=3)
    assert elos[h_a.address] > elos[h_b.address]


# --------------------------------------------------------------------------
# run: judge_batch (the throughput wiring hook, `bkt-hte-throughput`)
# --------------------------------------------------------------------------


def test_run_with_judge_batch_matches_run_with_the_equivalent_single_judge():
    """A `judge_batch` that just maps `judge` over its own pairs must
    produce the identical Elo ratings a plain per-pair `judge` call
    would, round for round: `run`'s own math does not change, only how
    the scores reach it."""
    vocab = _small_vocab()
    h_a = _hypothesis(vocab, "farmers", "labor")
    h_b = _hypothesis(vocab, "aliens", "tech")
    opinions = {h_a.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5), h_b.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5)}

    def judge_a_always_wins(a, b, _ctx):
        return 1.0 if a.address == h_a.address else 0.0

    def batch(pairs):
        return [judge_a_always_wins(a, b, ctx) for a, b, ctx in pairs]

    without_batch = run([h_a, h_b], opinions, judge_a_always_wins, rounds=3)
    with_batch = run([h_a, h_b], opinions, judge_a_always_wins, rounds=3, judge_batch=batch)
    assert with_batch == without_batch


def test_run_with_judge_batch_calls_it_once_per_round_not_once_per_pair():
    vocab = _small_vocab()
    hyps = [
        _hypothesis(vocab, "farmers", "labor"),
        _hypothesis(vocab, "aliens", "tech"),
        _hypothesis(vocab, "farmers", "tech"),
        _hypothesis(vocab, "aliens", "labor"),
    ]
    opinions = {h.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5) for h in hyps}
    calls = []

    def batch(pairs):
        calls.append(len(pairs))
        return [0.5] * len(pairs)

    run(hyps, opinions, _null_judge, rounds=3, judge_batch=batch)
    # 4 hypotheses -> 2 pairs a round, one `judge_batch` call per round.
    assert calls == [2, 2, 2]


def test_run_with_judge_batch_and_an_odd_population_still_pairs_and_byes_correctly():
    vocab = _small_vocab()
    hyps = [
        _hypothesis(vocab, "farmers", "labor"),
        _hypothesis(vocab, "aliens", "tech"),
        _hypothesis(vocab, "farmers", "tech"),
    ]
    opinions = {h.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5) for h in hyps}
    calls = []

    def batch(pairs):
        calls.append(len(pairs))
        return [0.5] * len(pairs)

    # 3 hypotheses -> 1 pair plus a bye every round, so `judge_batch` is
    # still called once a round, with exactly one pair each time.
    elos = run(hyps, opinions, _null_judge, rounds=2, judge_batch=batch)
    assert len(elos) == 3
    assert calls == [1, 1]


def test_run_with_judge_batch_and_a_single_hypothesis_never_calls_it():
    vocab = _small_vocab()
    hyps = [_hypothesis(vocab, "farmers", "labor")]
    opinions = {h.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5) for h in hyps}

    def batch(_pairs):
        raise AssertionError("judge_batch must not be called for a round with zero pairs")

    # A lone hypothesis is a bye every round; must not raise.
    elos = run(hyps, opinions, _null_judge, rounds=2, judge_batch=batch)
    assert len(elos) == 1


# --------------------------------------------------------------------------
# critic_filter
# --------------------------------------------------------------------------


def test_critic_filter_drops_rejected_hypotheses():
    vocab = _small_vocab()
    h_keep = _hypothesis(vocab, "farmers", "labor")
    h_drop = _hypothesis(vocab, "aliens", "tech")

    def critic(h, _as_dict):
        return {"reject": h.address == h_drop.address, "reason": "not attested"}

    survivors = critic_filter([h_keep, h_drop], critic)
    assert [h.address for h, _report in survivors] == [h_keep.address]


def test_critic_filter_passes_the_hypothesis_dict_alongside_the_object():
    vocab = _small_vocab()
    h = _hypothesis(vocab, "farmers", "labor")
    seen = {}

    def critic(h_obj, h_dict):
        seen["dict"] = h_dict
        return {"reject": False}

    critic_filter([h], critic)
    assert seen["dict"] == h.to_dict()


def test_critic_filter_returns_report_alongside_survivor():
    vocab = _small_vocab()
    h = _hypothesis(vocab, "farmers", "labor")

    def critic(_h, _d):
        return {"reject": False, "note": "kept"}

    [(survivor, report)] = critic_filter([h], critic)
    assert survivor is h
    assert report == {"reject": False, "note": "kept"}


def test_critic_filter_defaults_missing_reject_key_to_kept():
    vocab = _small_vocab()
    h = _hypothesis(vocab, "farmers", "labor")
    survivors = critic_filter([h], lambda _h, _d: {})
    assert len(survivors) == 1
