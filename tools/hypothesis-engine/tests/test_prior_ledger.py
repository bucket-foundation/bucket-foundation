import json

from hte import prior_ledger, runner
from hte.belief import Opinion, sigmoid
from hte.concepts import Slot
from hte.corpus import fixtures as fixtures_corpus
from tests.test_runner import _fake_mode_cfg


def test_outcomes_count_only_scored_survivors_by_the_sign_of_lift():
    corpus = fixtures_corpus.build()
    from hte.generate import combinatorial_sample
    from hte.timeline import Interval
    pool = combinatorial_sample(corpus.vocab, [0], max_items=6, seed=0)
    assert pool
    h_win, h_lose, h_unscored = pool[0], pool[1], pool[2]
    opinions = {
        h_win.address: Opinion(b=0.5, d=0.0, u=0.5, a=0.5),
        h_lose.address: Opinion(b=0.0, d=0.5, u=0.5, a=0.5),
        h_unscored.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.9),
    }
    counts = prior_ledger.outcomes([h_win, h_lose, h_unscored], opinions)
    assert counts[("actor", h_win.content.actor)][0] >= 1
    assert counts[("actor", h_lose.content.actor)][1] >= 1
    assert sum(s + f for s, f in counts.values()) == 10  # two scored survivors, five slots each


def test_apply_moves_a_counted_prior_toward_the_evidence_and_leaves_the_rest(tmp_path):
    corpus = fixtures_corpus.build()
    fringe = corpus.vocab.get(Slot.ACTOR, "unverified-observer")
    before = fringe.prior_logit
    other = corpus.vocab.get(Slot.ACTOR, "alpha-team").prior_logit
    moved = prior_ledger.apply(corpus.vocab, {("actor", "unverified-observer"): (8, 0)})
    assert moved == 1
    after = corpus.vocab.get(Slot.ACTOR, "unverified-observer").prior_logit  # a fresh Concept replaced the frozen one
    assert after > before
    assert abs(sigmoid(after) - (sigmoid(before) * 4.0 + 8) / (4.0 + 8)) < 1e-9
    assert corpus.vocab.get(Slot.ACTOR, "alpha-team").prior_logit == other


def test_append_and_load_round_trip_per_corpus(tmp_path):
    path = tmp_path / "ledger.jsonl"
    n = prior_ledger.append(path, run_id="r1", corpus="c", counts={("actor", "x"): (2, 1), ("object", "y"): (0, 0)})
    assert n == 1
    prior_ledger.append(path, run_id="r2", corpus="c", counts={("actor", "x"): (1, 1)})
    prior_ledger.append(path, run_id="r3", corpus="other", counts={("actor", "x"): (9, 9)})
    counts, runs = prior_ledger.load_counts(path, corpus="c")
    assert counts == {("actor", "x"): (3, 2)} and runs == 2
    assert prior_ledger.load_counts(tmp_path / "missing.jsonl", corpus="c") == ({}, 0)


def test_campaign_appends_then_applies_the_ledger_across_two_runs(tmp_path, monkeypatch):
    ledger = tmp_path / "ledger.jsonl"
    cfg = _fake_mode_cfg(
        tmp_path, monkeypatch, corpus="production", max_hypotheses=20, combinatorial_max_items=1,
        max_time_bins=2, run_extraction=False, prior_ledger=str(ledger),
    )
    first = runner.run_campaign(cfg)
    note1 = json.loads((first.run_dir / "MANIFEST.json").read_text())["counts"]["prior_ledger"]
    assert note1["applied"] == 0 and note1["runs"] == 0 and note1["appended"] > 0
    second = runner.run_campaign(cfg)
    note2 = json.loads((second.run_dir / "MANIFEST.json").read_text())["counts"]["prior_ledger"]
    assert note2["runs"] == 1 and note2["applied"] > 0
