import json
from pathlib import Path

import numpy as np
import pytest

import ci14_analysis as ci

ROOT = Path(__file__).resolve().parents[2]
VECTORS = json.loads((ROOT / "src/lib/academy/input-experiment-vectors.json").read_text())


def test_hash_and_assignment_match_the_app_vectors():
    for h in VECTORS["hashes"]:
        assert ci.fnv1a32(h["key"]) == h["hash"]
    for a in VECTORS["assign"]:
        assert ci.assign_arm(a["key"], a["tier"]) == a["arm"]


def test_enrolment_is_the_first_filled_session_and_checks_the_hash():
    key = "user-1"
    arm = ci.assign_arm(key, 2)
    rows = [
        {"device": key, "tier": 2, "at": 1, "arm": arm + "-x"},
        {"device": key, "tier": 2, "at": 2, "arm": arm},
        {"device": key, "tier": 2, "at": 3, "arm": arm},
        {"device": "other", "tier": 2, "at": 4, "arm": None},
    ]
    assert ci.enrolments(rows) == [{"device": key, "arm": arm, "tier": 2, "enrolled_at": 2}]
    wrong = next(a for a in ci.ARMS if a != arm)
    with pytest.raises(ValueError):
        ci.enrolments([{"device": key, "tier": 2, "at": 1, "arm": wrong}])


def test_holm_adjusts_in_step_down_order():
    adj, rej = ci.holm(np.array([0.01, 0.04]))
    assert adj.tolist() == [0.02, 0.04]
    assert rej.tolist() == [True, True]
    adj, rej = ci.holm(np.array([0.03, 0.02]))
    assert adj.tolist() == [0.04, 0.04]
    assert rej.tolist() == [True, True]
    _, rej = ci.holm(np.array([0.2, 0.026]))
    assert rej.tolist() == [False, False]


def test_yes_no_score_corrects_for_pseudoword_false_alarms():
    assert ci.yes_no_known(40, 50, 0, 20, 5000) == 4000
    assert ci.yes_no_known(40, 50, 10, 20, 5000) == pytest.approx(3000)
    assert ci.yes_no_known(10, 50, 20, 20, 5000) == 0


def test_analytic_sample_size_matches_the_plan():
    assert ci.analytic_per_arm() == (ci.COMPLETE_PER_ARM, ci.TARGET_PER_ARM)


def test_simulation_fills_every_arm_and_drops_about_the_planned_share():
    rows = ci.simulate(per_arm=200, seed=3)
    assert {a: sum(r["arm"] == a for r in rows) for a in ci.ARMS} == {a: 200 for a in ci.ARMS}
    lost = sum(r["outcome"] is None for r in rows) / len(rows)
    assert 0.3 < lost < 0.5


def test_true_effects_are_recovered_and_null_effects_rarely_reject():
    res = ci.primary(ci.simulate(per_arm=600, d50=-0.4, d90=0.4, seed=11))
    assert res[0].estimate < 0 < res[1].estimate and all(c.reject for c in res)
    false = sum(any(c.reject for c in ci.primary(ci.simulate(per_arm=150, d50=0, d90=0, attrition=0.4, seed=500 + s))) for s in range(200))
    assert false / 200 <= 0.09


def test_multiple_imputation_agrees_in_direction_with_the_primary():
    rows = ci.simulate(per_arm=300, seed=5)
    p, mi = ci.primary(rows), ci.multiple_imputation(rows, m=10, seed=1)
    for a, b in zip(p, mi):
        assert np.sign(a.estimate) == np.sign(b.estimate)
        assert b.se > 0


def test_harm_rule_waits_for_the_check_size_then_stops_on_a_large_retention_gap():
    small = {a: 100 for a in ci.ARMS}
    big = {a: ci.HARM_CHECK_PER_ARM for a in ci.ARMS}
    gap = {"s50": 0.4, "s70": 0.6, "s90": 0.58}
    assert not ci.harm_stop(gap, small)
    assert ci.harm_stop(gap, big)
    assert not ci.harm_stop({"s50": 0.5, "s70": 0.6, "s90": 0.6}, big)


def test_cli_round_trip(tmp_path, capsys):
    out = tmp_path / "sim.csv"
    ci.main(["simulate", "--out", str(out), "--per-arm", "60", "--seed", "2"])
    ci.main(["analyze", str(out)])
    rep = json.loads(capsys.readouterr().out)
    assert rep["enrolled"] == {a: 60 for a in ci.ARMS}
    assert [c["arm"] for c in rep["primary"]] == ["s50", "s90"]
