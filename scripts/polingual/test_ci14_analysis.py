import json
from pathlib import Path

import numpy as np
import pytest

import ci14_analysis as ci

ROOT = Path(__file__).resolve().parents[2]
VECTORS = json.loads((ROOT / "src/lib/academy/input-experiment-vectors.json").read_text())
YESNO = json.loads((ROOT / "src/lib/academy/yes-no-vectors.json").read_text())


def test_hash_keys_and_assignment_match_the_app_vectors():
    for h in VECTORS["hashes"]:
        assert ci.fnv1a32(h["key"]) == h["hash"]
    for k in VECTORS["keysFor"]:
        assert ci.enrolment_key(k["account"], k["device"]) == k["key"]
    for a in VECTORS["assign"]:
        assert ci.assign_arm(a["key"]) == a["arm"]


def test_yes_no_score_matches_the_app_vectors():
    for k in YESNO["known"]:
        assert ci.yes_no_known(*k["args"]) == pytest.approx(k["known"])


def test_band_weighted_score_matches_the_app_vectors():
    b = YESNO["scoreBands"]
    sc = YESNO["score"]
    got = ci.band_weighted_known([x["hits"] for x in b], [x["words"] for x in b], sc["falseAlarms"], sc["pseudowords"])
    assert got == pytest.approx(sc["known"])
    assert sum(ci.BAND_WIDTHS) == 8000


def test_enrolment_uses_the_account_and_refuses_a_moved_arm():
    key = ci.enrolment_key("u1", "d1")
    arm = ci.assign_arm(key)
    rows = [
        {"device": "d1", "account": "u1", "at": 1, "arm": arm + "-x"},
        {"device": "d1", "account": "u1", "at": 2, "arm": arm},
        {"device": "d2", "account": "u1", "at": 3, "arm": arm},
        {"device": "d3", "account": None, "at": 4, "arm": None},
    ]
    assert ci.enrolments(rows) == [{"unit": key, "cluster": "u1", "arm": arm, "enrolled_at": 2}]
    other = next(a for a in ci.ARMS if a != arm)
    with pytest.raises(ValueError):
        ci.enrolments(rows + [{"device": "d2", "account": "u1", "at": 5, "arm": other}])


def test_holm_adjusts_in_step_down_order():
    adj, rej = ci.holm([0.01, 0.04])
    assert adj.tolist() == [0.02, 0.04] and rej.tolist() == [True, True]
    _, rej = ci.holm([0.2, 0.026])
    assert rej.tolist() == [False, False]


def test_analytic_sample_size_and_achieved_power():
    assert ci.analytic_per_arm() == (ci.COMPLETE_PER_ARM, ci.TARGET_PER_ARM)
    assert ci.achieved_power(ci.COMPLETE_PER_ARM) == pytest.approx(0.8, abs=0.01)
    assert ci.achieved_power(100) < 0.5


def test_cluster_robust_errors_widen_when_units_share_a_cluster():
    rows = ci.simulate(per_arm=200, seed=3)
    _, cov_unit, _, _, _ = ci.ols(rows)
    paired = [dict(r, cluster=f"c{i // 2}") for i, r in enumerate(rows)]
    _, cov_pair, dof, _, _ = ci.ols(paired)
    assert dof < len([r for r in rows if r["outcome"] is not None]) - 1
    assert cov_pair[1, 1] != cov_unit[1, 1]


def test_true_effects_are_recovered_and_null_effects_rarely_reject():
    res = ci.primary(ci.simulate(per_arm=600, d50=-0.4, d90=0.4, seed=11))
    assert res[0].estimate < 0 < res[1].estimate and all(c.reject for c in res)
    false = sum(any(c.reject for c in ci.complete_case(ci.simulate(per_arm=150, d50=0, d90=0, seed=500 + s))) for s in range(200))
    assert false / 200 <= 0.09


def test_primary_is_itt_over_every_enrolled_unit():
    rows = ci.simulate(per_arm=120, seed=4)
    rep = ci.report(rows)
    assert rep["enrolled"] == {a: 120 for a in ci.ARMS}
    assert sum(rep["observed"].values()) < 360
    assert len(rep["primary_itt_mi"]) == 2


def test_tipping_point_flips_once_the_shift_is_large_enough():
    rows = ci.simulate(per_arm=250, d50=-0.25, d90=0.25, seed=9)
    tp = ci.tipping_point(rows, deltas=(0.0, -2.0))
    s90 = [t for t in tp if t["arm"] == "s90"]
    assert s90[0]["flips"] == [False, False]
    assert s90[-1]["delta_sd"] == -2.0


def test_secondaries_are_holm_adjusted_together():
    sec = ci.secondary(ci.simulate(per_arm=150, seed=5))
    assert {s["test"].split(":")[0] for s in sec} == set(ci.SECONDARY)
    p = [s["p"] for s in sec]
    adj, _ = ci.holm(p)
    assert [s["p_holm"] for s in sec] == pytest.approx(adj.tolist())


def test_harm_and_cap_rules():
    big = {a: ci.HARM_CHECK_PER_ARM for a in ci.ARMS}
    assert ci.harm_stop({"s50": 0.4, "s70": 0.6, "s90": 0.58}, big)
    assert not ci.harm_stop({"s50": 0.4, "s70": 0.6, "s90": 0.58}, {a: 100 for a in ci.ARMS})
    assert ci.enrolment_state({a: ci.TARGET_PER_ARM for a in ci.ARMS}, 40) == "closed_full"
    assert ci.enrolment_state({a: 200 for a in ci.ARMS}, ci.CAP_DAYS) == "closed_cap"
    assert ci.enrolment_state({a: 200 for a in ci.ARMS}, 30) == "open"


def test_cli_round_trip(tmp_path, capsys):
    out = tmp_path / "sim.csv"
    ci.main(["simulate", "--out", str(out), "--per-arm", "60", "--seed", "2"])
    ci.main(["analyze", str(out)])
    rep = json.loads(capsys.readouterr().out)
    assert rep["enrolled"] == {a: 60 for a in ci.ARMS}
    assert [c["arm"] for c in rep["primary_itt_mi"]] == ["s50", "s90"]
