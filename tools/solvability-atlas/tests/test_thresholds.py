import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import forecast
import scoring
import thresholds as th

ATLAS = Path(__file__).parent.parent
COMMITTED = ATLAS / "thresholds" / "thresholds.json"
CACHE = Path(os.environ.get("ATLAS_CACHE", Path.home() / ".cache" / "bucket-atlas"))


@pytest.fixture(scope="module")
def data():
    return json.loads(th.NEIGHBORS.read_text())


@pytest.fixture(scope="module")
def arrays(data):
    return th.frontier_arrays(data)


@pytest.fixture(scope="module")
def committed():
    return json.loads(COMMITTED.read_text())


def test_shipped_constants_match_the_code_that_ships_them():
    ts = th.shipped_constants_in_typescript()
    assert ts == {k: th.SHIPPED[k] for k in ts}
    assert th.SHIPPED["reach_quantile"] == forecast.REACH_QUANTILE and th.SHIPPED["min_branch_solved"] == forecast.MIN_BRANCH_SOLVED
    atlas_source = (ATLAS / "atlas.py").read_text()
    assert f"{th.SHIPPED['weight_resolved']} * (r[\"resolved\"] is not None) + {th.SHIPPED['weight_formal']} * FORMAL" in atlas_source
    assert json.loads(re.search(r"^FORMAL = (\{.*\})$", atlas_source, re.M).group(1)) == th.FORMAL


def test_auc_agrees_with_the_pairwise_count():
    rng = np.random.default_rng(1)
    scores = np.round(rng.random(200), 1)
    labels = rng.random(200) < 0.4
    assert th.auc(scores, labels) == pytest.approx(scoring.auc(scores, labels))
    assert th.auc([0.5, 0.5], [True, False]) == 0.5
    assert th.auc([0.5], [True]) is None


def test_spearman_is_one_for_a_monotone_map_and_none_for_a_constant():
    assert th.spearman([1, 2, 3, 4], [10, 20, 35, 90]) == pytest.approx(1)
    assert th.spearman([1, 2, 3, 4], [4, 3, 2, 1]) == pytest.approx(-1)
    assert th.spearman([1, 2, 3], [5, 5, 5]) is None


def test_youden_tau_sits_at_the_cleanest_cut():
    scores = np.array([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9])
    labels = np.array([0, 0, 0, 0, 1, 1, 1, 1], dtype=bool)
    assert th.youden_tau(scores, labels) == 0.6
    assert th.rates_at(scores, labels, 0.6)["youden_j"] == 1


def test_fixed_fpr_tau_never_lets_in_more_open_rows_than_the_target():
    rng = np.random.default_rng(2)
    labels = rng.random(500) < 0.3
    scores = rng.random(500) + 0.2 * labels
    for target in (0.05, 0.1, 0.2):
        tau = th.fixed_fpr_tau(scores, labels, target)
        assert th.rates_at(scores, labels, tau)["fpr"] <= target
        lower = np.unique(scores)[np.searchsorted(np.unique(scores), tau) - 1]
        assert th.rates_at(scores, labels, lower)["fpr"] > target


def test_quantile_tau_is_the_shipped_quantile_rule():
    scores = np.array([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.99])
    labels = np.array([True] * 10 + [False])
    assert th.quantile_tau(scores, labels, 0.1) == forecast.quantile(sorted(scores[:10].tolist()), 0.1)


def toy_nodes():
    return [
        {"id": "p", "variant_of": None},
        {"id": "p-a", "variant_of": "p"},
        {"id": "p-a-i", "variant_of": "p-a"},
        {"id": "q", "variant_of": None},
        {"id": "q-copy", "variant_of": None},
        {"id": "r", "variant_of": "missing-parent"},
    ]


def toy_sim():
    sim = np.full((6, 6), 0.2)
    np.fill_diagonal(sim, 1.0)
    sim[0, 1] = sim[1, 0] = 0.9
    sim[3, 4] = sim[4, 3] = 0.97
    sim[0, 3] = sim[3, 0] = 0.6
    return sim


def test_family_roots_follow_the_variant_chain():
    assert th.family_roots(toy_nodes()) == ["p", "p", "p", "q", "q-copy", "r"]


def test_groups_merge_families_and_near_duplicates():
    roots = th.family_roots(toy_nodes())
    family = th.group_labels(roots)
    assert family[0] == family[1] == family[2] and family[3] != family[4]
    merged = th.group_labels(roots, toy_sim(), 0.95)
    assert merged[3] == merged[4] and merged[0] != merged[3]
    assert len(set(merged.tolist())) == 3


def test_reach_never_reads_the_row_itself_its_family_or_its_duplicate():
    sim = toy_sim()
    solved = np.array([True, True, False, True, True, False])
    alone, _ = th.reach(sim, solved, np.arange(6))
    assert alone[0] == 0.9 and alone[3] == 0.97
    groups = th.group_labels(th.family_roots(toy_nodes()), sim, 0.95)
    held, nearest = th.reach(sim, solved, groups)
    assert held[0] == 0.6 and nearest[0] == 3
    assert held[3] == 0.6 and nearest[3] == 0
    assert all(groups[i] != groups[j] for i, j in enumerate(nearest.tolist()))


def test_reach_is_missing_when_no_solved_row_sits_outside_the_group():
    sim = toy_sim()
    held, nearest = th.reach(sim, np.array([True, True, False, False, False, False]), th.group_labels(th.family_roots(toy_nodes())))
    assert np.isnan(held[0]) and nearest[0] == -1 and held[3] == 0.6


def test_bootstrap_repeats_and_resamples_whole_groups():
    groups = np.array([0, 0, 1, 1, 2, 2, 3, 3])
    seen = []

    def stat(idx):
        seen.append(idx)
        return float(idx.mean())

    a = th.bootstrap(stat, groups, n=30, seed=5)
    b = th.bootstrap(lambda idx: float(idx.mean()), groups, n=30, seed=5)
    assert a.tolist() == b.tolist()
    for idx in seen:
        counts = np.bincount(idx, minlength=8)
        assert all(counts[2 * g] == counts[2 * g + 1] for g in range(4))
    lo, hi = th.interval(a)
    assert lo <= hi


def test_logistic_fit_recovers_a_known_slope():
    rng = np.random.default_rng(3)
    x = rng.normal(size=4000)
    y = rng.random(4000) < 1 / (1 + np.exp(-(0.5 + 2 * x)))
    w = th.logistic_fit(x[:, None], y, ridge=1e-6)
    assert w[0] == pytest.approx(0.5, abs=0.15) and w[1] == pytest.approx(2, abs=0.2)
    p = th.logistic_predict(w, x[:, None])
    assert p.mean() == pytest.approx(y.mean(), abs=0.01)


def test_grouped_folds_keep_a_group_in_one_fold():
    groups = np.repeat(np.arange(40), 3)
    fold = th.grouped_folds(groups, folds=5, seed=1)
    assert all(len(set(fold[groups == g].tolist())) == 1 for g in range(40))
    assert set(fold.tolist()) == {0, 1, 2, 3, 4}


def test_out_of_fold_rate_model_never_sees_the_test_labels():
    cells = np.array(["a"] * 4 + ["b"] * 4)
    labels = np.array([1, 1, 1, 1, 0, 0, 0, 0], dtype=float)
    fold = np.array([0, 0, 1, 1, 0, 0, 1, 1])
    flipped = labels.copy()
    out = th.out_of_fold(th.rate_model(cells, labels), fold, labels)
    flipped[fold == 0] = 1 - flipped[fold == 0]
    again = th.out_of_fold(th.rate_model(cells, flipped), fold, flipped)
    assert out[fold == 1].tolist() != again[fold == 1].tolist()
    assert out[0] == pytest.approx((2 + 0.5) / 3)


def test_time_split_reference_holds_only_rows_solved_by_the_cutoff():
    nodes = [
        {"id": "a", "variant_of": None, "branch": "m", "source": "s", "solved": True, "resolved": 1950, "posed": 1900},
        {"id": "b", "variant_of": None, "branch": "m", "source": "s", "solved": True, "resolved": 1990, "posed": 1900},
        {"id": "c", "variant_of": None, "branch": "m", "source": "s", "solved": True, "resolved": 2010, "posed": 1980},
        {"id": "d", "variant_of": None, "branch": "m", "source": "s", "solved": False, "resolved": None, "posed": 1970},
        {"id": "e", "variant_of": None, "branch": "m", "source": "s", "solved": True, "resolved": None, "posed": 1970},
        {"id": "f", "variant_of": None, "branch": "m", "source": "s", "solved": False, "resolved": None, "posed": 2015},
    ]
    sim = np.full((6, 6), 0.3)
    np.fill_diagonal(sim, 1)
    sim[2, 0] = sim[0, 2] = 0.9
    sim[2, 5] = sim[5, 2] = 0.99
    out = th.time_split(nodes, sim, np.arange(6), 2000, n=5)
    assert out["reference_solved"] == 2 and out["tested"] == 3 and out["tested_dated"] == 2
    assert out["solved_later"] == 1 and out["undated_solved_removed"] == 1
    assert out["auc"]["value"] == 1.0


def test_frontier_counts_cover_every_row(arrays):
    f = th.frontier(arrays)
    assert sum(f["counts"].values()) == len(arrays["ids"])
    assert f["inside"] + f["outside"] == len(arrays["ids"])
    assert f["threshold"] == forecast.quantile(sorted(arrays["near"][arrays["solved"]].tolist()), forecast.REACH_QUANTILE)
    assert len(f["growth_top"]) == th.TOP and len(set(f["growth_top"])) == th.TOP


def test_a_higher_quantile_never_grows_the_inside(arrays):
    inside = [th.frontier(arrays, q=q)["inside"] for q in th.QUANTILES]
    assert inside == sorted(inside, reverse=True)


def test_a_higher_branch_minimum_never_shrinks_the_unsampled_zone(arrays):
    unsampled = [th.frontier(arrays, min_branch=m)["counts"]["unsampled"] for m in th.MIN_BRANCH]
    assert unsampled == sorted(unsampled)


def test_piecewise_radius_keeps_each_zone_in_its_band(arrays):
    f = th.frontier(arrays)
    radius = th.piecewise_radius(f, arrays["near"])
    core, front, outer = th.SHIPPED["core_radius"], th.SHIPPED["frontier_radius"], th.SHIPPED["outer_radius"]
    assert radius[f["zone"] == "solved"].max() <= core
    assert core <= radius[f["zone"] == "reachable"].min() and radius[f["zone"] == "reachable"].max() <= front
    assert front <= radius[f["zone"] == "beyond"].min() and radius.max() <= outer


def test_linear_radius_orders_every_pair_by_reach(arrays):
    radius = th.linear_radius(arrays["near"])
    assert th.spearman(radius, 1 - arrays["near"]) == pytest.approx(1)
    assert th.inverted_pairs(radius, arrays["near"], sample=5000) == 0
    assert th.linear_radius(np.array([1.0]))[0] == 0


def test_weight_breakpoints_bracket_the_shipped_weight():
    points = th.weight_breakpoints()
    assert 0.9 / 1.9 == pytest.approx(max(points), abs=1e-5)
    resolved = np.array([1, 1, 1, 1, 0, 0, 0, 0])
    formal = np.array(sorted(th.FORMAL.values()) * 2)
    orders = {tuple(np.argsort(th.solvability(resolved, formal, w), kind="stable").tolist()) for w in (0.48, 0.55, 0.7, 0.99)}
    assert len(orders) == 1
    assert tuple(np.argsort(th.solvability(resolved, formal, 0.45), kind="stable").tolist()) not in orders


def test_weight_rows_cover_both_tables():
    rows = th.load_score_rows()
    assert len({r["id"] for r in rows}) == len(rows)
    assert {r["set"] for r in rows} == {"atlas", "sourced"}
    assert all(r["lean"] in th.FORMAL for r in rows)


def test_committed_numbers_match_the_committed_neighbour_data(arrays, committed):
    assert committed["shipped"] == th.SHIPPED
    base = th.frontier(arrays)
    kept = committed["sensitivity"]["baseline"]
    assert kept["threshold"] == round(base["threshold"], 4)
    assert kept["inside"] == base["inside"] and kept["outside"] == base["outside"]
    assert committed["sensitivity"]["baseline_growth_top"] == base["growth_top"]
    assert committed["cross_section"]["rows"] == len(arrays["ids"])
    assert committed["cross_section"]["solved"] == int(arrays["solved"].sum())
    again = json.loads(json.dumps(th.rounded(th.sensitivity(arrays))))
    assert again == committed["sensitivity"]
    assert json.loads(json.dumps(th.rounded(th.weights(th.load_score_rows())))) == committed["weights"]


def test_committed_tables_are_the_render_of_the_committed_numbers(committed):
    text = (ATLAS / "thresholds" / "tables.md").read_text()
    assert text == th.tables(committed)
    assert "nan" not in text


def test_committed_intervals_hold_their_point_estimates(committed):
    for row in committed["cross_section"]["leakage_ladder"]:
        assert row["ci95"][0] <= row["auc"] <= row["ci95"][1]
    for name, d in committed["cross_section"]["derived_tau"].items():
        if d.get("ci95"):
            assert d["ci95"][0] <= d["tau"] <= d["ci95"][1], name


def test_headline_tau_values_are_pinned(committed):
    derived = committed["cross_section"]["derived_tau"]
    assert {k: round(v["tau"], 3) for k, v in derived.items()} == {"youden": 0.832, "fixed_fpr_0.1": 0.861, "fixed_fpr_0.2": 0.843, "quantile_rule": 0.752, "shipped": 0.762}
    assert round(derived["youden"]["youden_j"], 3) == 0.254
    held = committed["cross_section"]["held_out_branch_tau"]
    taus = {b["branch"]: round(b["tau"], 3) for b in held["branches"]}
    assert taus.pop("mathematics") == 0.697 and set(taus.values()) == {0.832}
    assert round(held["pooled"]["youden_j"]["value"], 3) == 0.141
    assert held["pooled"]["youden_j"]["ci95"][1] < derived["youden"]["youden_j"]


def test_held_out_branch_tau_never_reads_the_held_out_branch():
    rng = np.random.default_rng(4)
    branch = np.array(["a"] * 200 + ["b"] * 200)
    labels = rng.random(400) < 0.5
    scores = rng.random(400) + 0.3 * labels
    out = th.held_out_branch_tau(scores, labels, branch, np.arange(400), n=5)
    assert out["branches"][0]["tau"] == th.youden_tau(scores[200:], labels[200:])
    assert out["branches"][1]["tau"] == th.youden_tau(scores[:200], labels[:200])
    moved = scores.copy()
    moved[:200] = 1 - moved[:200]
    assert th.held_out_branch_tau(moved, labels, branch, np.arange(400), n=5)["branches"][0]["tau"] == out["branches"][0]["tau"]


@pytest.mark.skipif(not (CACHE / "vectors.npy").exists(), reason="needs the embedding cache that build.sh fills")
def test_the_classifier_numbers_repeat_from_the_embedding_cache(data, committed):
    ids = [x["id"] for x in data["nodes"] if x["kind"] != "lean"]
    emb, texts = th.load_embeddings(ids)
    result, _, _ = th.analyse(data, emb @ emb.T, texts, n=committed["bootstraps"] if os.environ.get("ATLAS_FULL_REPEAT") else 10)
    again = json.loads(json.dumps(th.rounded(result)))
    assert [r["auc"] for r in again["cross_section"]["leakage_ladder"]] == [r["auc"] for r in committed["cross_section"]["leakage_ladder"]]
    assert {k: v["tau"] for k, v in again["cross_section"]["derived_tau"].items()} == {k: v["tau"] for k, v in committed["cross_section"]["derived_tau"].items()}
    assert [t["auc"]["value"] for t in again["time_split"]] == [t["auc"]["value"] for t in committed["time_split"]]
    assert again["cross_section"]["calibration"] == committed["cross_section"]["calibration"]
    if os.environ.get("ATLAS_FULL_REPEAT"):
        assert again == committed
