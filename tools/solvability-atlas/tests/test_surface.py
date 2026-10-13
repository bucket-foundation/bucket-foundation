import datetime as dt
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import surface
import surface_survival as ss
import surface_table as st

ATLAS = Path(__file__).parent.parent


@pytest.fixture(scope="module")
def built():
    return st.build()


@pytest.fixture(scope="module")
def table(built):
    return st.frame(built["rows"])


@pytest.fixture(scope="module")
def ctx(table, built):
    return surface.context(table, built["weights"])


def test_one_row_per_problem(built):
    data = json.loads(st.NEIGHBORS.read_text())
    expected = [n["id"] for n in data["nodes"] if n["kind"] != "lean"]
    assert [r["id"] for r in built["rows"]] == expected
    assert len(set(expected)) == len(expected)


def test_target_counts_match_the_committed_results(built):
    carry = st.carry_counts(built["rows"])
    assert carry["years_to_resolve"] <= carry["time_open"] <= carry["rows"]
    assert carry["solved_share"] == carry["rows"]
    assert carry["time_open"] - carry["years_to_resolve"] == carry["time_open_censored"]
    committed = json.loads(surface.RESULTS.read_text())
    assert committed["carry"] == carry
    assert committed["target"]["rows"] == carry["years_to_resolve"]


def test_committed_table_matches_a_rebuild(built):
    committed = st.load()
    assert committed["id"].tolist() == [r["id"] for r in built["rows"]]
    fresh = pd.DataFrame(built["rows"])
    for name in st.COORDS + ("reach_2026", "solved_share"):
        assert np.allclose(committed[name].to_numpy(dtype=float), fresh[name].to_numpy(dtype=float), atol=1e-4)


def test_target_is_log_of_years(table):
    has = table["log_years"].notna()
    years = (table["resolved"] - table["posed"])[has]
    assert (years >= 0).all()
    assert np.allclose(np.expm1(table["log_years"][has].astype(float)), years.astype(float), atol=1e-3)


def test_feature_sets_hold_no_target_or_post_outcome_column():
    banned = set(st.TARGETS) | set(st.POST_OUTCOME)
    for name, spec in surface.FEATURE_SETS.items():
        assert not banned & (set(surface.feature_names(name)) | set(spec["coords"]))
        surface.assert_leak_free(name)
    assert "posed" not in surface.feature_names("map")
    assert not set(st.POSED_FEATURES) & set(surface.feature_names("map"))


def test_leak_guard_rejects_a_post_outcome_feature(monkeypatch):
    spec = dict(surface.FEATURE_SETS["map"])
    spec["numeric"] = spec["numeric"] + ("reach_2026",)
    monkeypatch.setitem(surface.FEATURE_SETS, "leaky", spec)
    with pytest.raises(ValueError):
        surface.assert_leak_free("leaky")


def test_coordinates_ignore_every_label():
    data = json.loads(st.NEIGHBORS.read_text())
    plain = st.build(data)
    for n in data["nodes"]:
        if n["kind"] != "lean" and n["id"] not in ("poincare",):
            n["status"] = "solved" if n["status"] != "solved" else n["status"]
            n["solved"] = True
            if n["posed"] is not None:
                n["resolved"] = n["posed"] + 7
    changed = st.build(data)
    for name in st.MAP_FEATURES:
        assert [r[name] for r in plain["rows"]] == [r[name] for r in changed["rows"]]


def test_posed_features_use_only_neighbours_resolved_before_posing(built):
    arrays = built["arrays"]
    nodes = arrays["nodes"]
    checked = 0
    for i, r in enumerate(built["rows"]):
        if r["posed"] == "":
            continue
        earlier = [nodes[j]["resolved"] for j in arrays["neighbour"][i] if j >= 0 and nodes[j]["resolved"] is not None and nodes[j]["resolved"] < r["posed"]]
        assert r["solved_before_posed"] == len(earlier)
        checked += 1
    assert checked == st.carry_counts(built["rows"])["posed"]


def test_folds_keep_a_family_together(ctx):
    fold = surface.grouped_folds(ctx.groups, surface.FOLDS, 1)
    for g in np.unique(ctx.groups):
        assert len(set(fold[ctx.groups == g])) == 1
    assert set(fold) == set(range(surface.FOLDS))


def test_temporal_split_cuts_on_posed_year(ctx):
    for cutoff in surface.CUTOFFS:
        train, test = surface.temporal_split(ctx, cutoff)
        posed = ctx.table["posed"].to_numpy(dtype=float)[ctx.labelled]
        resolved = ctx.table["resolved"].to_numpy(dtype=float)[ctx.labelled]
        assert (posed[train] < cutoff).all()
        assert (resolved[train] < cutoff).all()
        assert (posed[test] >= cutoff).all()
        assert not set(train) & set(test)


def test_test_rows_cannot_change_a_prediction(ctx):
    train, test = surface.temporal_split(ctx, 1990)
    y = ctx.y.copy()
    scrambled = y.copy()
    scrambled[test] = 99.0
    for name, fs in surface.entries():
        if name == "gp":
            continue
        assert np.allclose(surface.predict(name, fs, ctx, train, test, y), surface.predict(name, fs, ctx, train, test, scrambled))


def test_models_recover_a_planted_surface(ctx):
    planted = 2.0 + 1.5 * np.tanh(ctx.coords["map"][:, 0]) + 0.8 * ctx.coords["map"][:, 1]
    fold = surface.grouped_folds(ctx.groups, surface.FOLDS, 3)
    for name, floor in (("linear", 0.5), ("gp", 0.5), ("gbt", 0.5), ("graph", 0.3)):
        score = surface.r_squared(planted, surface.out_of_fold(name, "map", ctx, planted, fold))
        assert score > floor, name
    assert surface.r_squared(planted, surface.out_of_fold("mean", "map", ctx, planted, fold)) <= 0


def test_shuffled_target_scores_at_or_below_zero(ctx):
    shuffled = np.random.default_rng(5).permutation(ctx.y)
    fold = surface.grouped_folds(ctx.groups, surface.FOLDS, 5)
    for name in ("linear", "graph"):
        assert surface.r_squared(shuffled, surface.out_of_fold(name, "map", ctx, shuffled, fold)) < 0.1


def test_r_squared_matches_its_definition():
    y = np.array([1.0, 2.0, 3.0, 4.0])
    assert surface.r_squared(y, y) == 1.0
    assert surface.r_squared(y, np.full(4, 2.5)) == 0.0
    assert surface.r_squared(y, y[::-1]) == pytest.approx(-3.0)


def test_surface_function_repeats_and_covers_every_row(table, built):
    a = surface.frontier_surface(table, built["weights"], model="graph")
    b = surface.frontier_surface(table, built["weights"], model="graph")
    assert np.array_equal(a.values, b.values)
    assert a.ids == table["id"].tolist()
    assert np.isfinite(a.values).all()
    assert len(a.trained_on) == int(table["log_years"].notna().sum())
    assert a.predict(a.ids[:3]).tolist() == a.values[:3].tolist()
    assert a.values.std() > 0


def test_surface_cutoff_drops_later_rows(table, built):
    s = surface.frontier_surface(table, built["weights"], model="graph", cutoff=2010)
    resolved = table.set_index("id")["resolved"]
    assert (resolved[s.trained_on] < 2010).all()
    assert s.params["cutoff"] == 2010


def test_surface_rejects_an_unknown_model(table, built):
    with pytest.raises(ValueError):
        surface.frontier_surface(table, built["weights"], model="circle")


def test_render_writes_a_new_folder_each_time(table, built, tmp_path):
    s = surface.frontier_surface(table, built["weights"], model="graph")
    now = dt.datetime(2026, 10, 13, 12, 0, 0, tzinfo=dt.timezone.utc)
    first = surface.render("frontier-surface-map", s, table, tmp_path, now)
    second = surface.render("frontier-surface-map", s, table, tmp_path, now)
    assert first != second
    assert first.parent.name == "2026-10-13"
    for folder in (first, second):
        assert (folder / "frontier-surface-map.png").stat().st_size > 10000
        manifest = json.loads((folder / "manifest.json").read_text())
        assert manifest["surface"]["params"] == s.params
        assert manifest["function"] == "surface.render_surface_map"


def test_render_registry_rejects_an_unknown_name(table, built, tmp_path):
    s = surface.frontier_surface(table, built["weights"], model="graph")
    with pytest.raises(KeyError):
        surface.render("polygon", s, table, tmp_path)


def test_committed_results_report_every_model_and_baseline():
    result = json.loads(surface.RESULTS.read_text())
    names = {surface.label(n, fs) for n, fs in surface.entries()}
    assert set(result["cross_validation"]["scores"]) == names
    assert result["cross_validation"]["repeats"] == surface.REPEATS
    assert len(result["temporal"]) >= 5
    for block in [result["cross_validation"], *result["temporal"].values()]:
        for name, s in block["scores"].items():
            assert s["r2_interval"][0] <= s["r2_interval"][1]
    for cutoff, block in result["temporal"].items():
        assert block["test_rows"] >= surface.MIN_TEST_ROWS
        for model in surface.MODELS:
            gain = block["scores"][f"{model}:map_year"]["r2_minus_year"]
            assert gain["interval"][0] <= gain["interval"][1]
            assert gain["value"] == pytest.approx(block["scores"][f"{model}:map_year"]["r2"] - block["scores"]["year"]["r2"])
    assert result["surface"]["params"]["model"] == surface.SURFACE_DEFAULT


@pytest.fixture(scope="module")
def frame(table):
    return ss.survival_frame(table)


def test_survival_frame_counts(frame, table):
    posed = table["posed"].notna()
    undated = posed & (table["solved"] == 1) & table["resolved"].isna()
    assert len(frame["time"]) == int(posed.sum() - undated.sum())
    assert frame["dropped_undated_solved"] == int(undated.sum())
    assert int(frame["event"].sum()) == int(table["log_years"].notna().sum())
    assert (frame["time"] >= 0).all()
    assert (frame["time"][~frame["event"]] == frame["follow_up"][~frame["event"]]).all()


def test_status_known_at_a_cutoff_ignores_later_resolutions(frame):
    cutoff = 1990
    rows, time, event = ss.known_at(frame, cutoff)
    assert (frame["posed"][rows] < cutoff).all()
    assert (frame["resolved"][rows][event] < cutoff).all()
    assert (time[~event] == cutoff - frame["posed"][rows][~event]).all()
    changed = dict(frame)
    changed["resolved"] = np.where(frame["resolved"] >= cutoff, frame["resolved"] + 11, frame["resolved"])
    rows2, time2, event2 = ss.known_at(changed, cutoff)
    assert (rows == rows2).all() and (time == time2).all() and (event == event2).all()


def test_concordance_within_source_ignores_pairs_across_sources():
    time = np.array([1.0, 2.0, 10.0, 20.0])
    event = np.array([True, True, True, True])
    source = np.array([0, 0, 1, 1])
    across_only = np.array([4.0, 3.0, 9.0, 8.0])
    assert ss.concordance_within(time, event, across_only, source) == 1.0
    assert ss.concordance_within(time, event, -across_only, source) == 0.0
    mixed = np.array([1.0, 2.0, 9.0, 8.0])
    assert ss.concordance_within(time, event, mixed, source) == 0.5
    assert ss.concordance(time, event, mixed) < 0.5


def test_brier_scores_only_rows_with_full_follow_up():
    toy = {"follow_up": np.array([60.0, 60.0, 5.0]), "event": np.array([True, False, False]), "time": np.array([8.0, 60.0, 5.0])}
    rows = np.arange(3)
    perfect = np.array([[1.0, 1.0, 1.0], [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]])
    assert ss.brier(toy, rows, perfect) == [0.0, 0.0, 0.0]
    assert ss.brier(toy, rows, 1 - perfect) == [1.0, 1.0, 1.0]


def test_survival_models_recover_a_planted_hazard():
    rng = np.random.default_rng(3)
    x = rng.standard_normal((300, 3))
    time = rng.exponential(np.exp(-1.5 * x[:, 0]) * 20)
    event = time < 40
    time = np.minimum(time, 40)
    for family in ss.FAMILIES:
        model = ss.fit(family, x[:200], time[:200], event[:200])
        assert ss.concordance(time[200:], event[200:], model.predict(x[200:])) > 0.7
        probability = ss.event_probability(model, x[200:])
        assert ((probability >= 0) & (probability <= 1)).all()
        assert (np.diff(probability, axis=1) >= -1e-9).all()


def test_committed_survival_results_carry_the_gain_over_posed_year():
    result = json.loads(surface.RESULTS.read_text())["survival"]
    cv = result["cross_validation"]
    assert cv["events"] + cv["censored"] == cv["rows"]
    for block in [cv, *result["temporal"].values()]:
        for family in ss.FAMILIES:
            g = block["gain_over_posed_year"][family]
            for key in ("concordance_gain", "within_source_gain", "brier_gain"):
                lo, hi = g[f"{key}_interval"]
                assert lo <= hi
            assert g["concordance_gain"] == pytest.approx(block["scores"][f"{family}:map_year"]["concordance"] - block["scores"][f"{family}:year"]["concordance"])
    assert len(result["temporal"]) >= 5
    mixed = cv["mixed_sources"]
    assert mixed["rows"] == result["source_mix"]["rows_in_mixed_sources"]
    assert mixed["events"] == result["source_mix"]["events_in_mixed_sources"]
    assert mixed["sources"] == result["source_mix"]["mixed_sources"]
    for family in ss.FAMILIES:
        lo, hi = mixed["gain_over_posed_year"][family]["within_source_gain_interval"]
        assert lo <= hi


def test_mixed_rows_come_from_lists_with_both_outcomes(frame):
    rows = ss.mixed_rows(frame)
    for s in np.unique(frame["source"][rows]):
        events = frame["event"][frame["source"] == s]
        assert events.any() and not events.all()
    outside = np.setdiff1d(np.arange(len(frame["time"])), rows)
    for s in np.unique(frame["source"][outside]):
        events = frame["event"][frame["source"] == s]
        assert events.all() or not events.any()
