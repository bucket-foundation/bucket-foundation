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
