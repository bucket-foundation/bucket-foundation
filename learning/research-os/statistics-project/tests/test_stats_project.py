import math
import statistics
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from scipy import stats

HERE = Path(__file__).parent.parent
sys.path.insert(0, str(HERE))
import stats_project as sp


@pytest.fixture(scope="module")
def c():
    return sp.analyse(sp.load_original())


@pytest.fixture(scope="module")
def y(c):
    return c["cleaned"][sp.Y].to_numpy(dtype=float)


def version(folder):
    parts = folder.name.split("-")
    return ("-".join(parts[:3]), int(parts[3]) if len(parts) > 3 else 1)


def latest_folder():
    return max((p for p in HERE.iterdir() if p.is_dir() and (p / "sample_50.csv").exists()), key=version)


def test_latest_folder_is_the_highest_version():
    assert version(Path("2026-10-13")) < version(Path("2026-10-13-2")) < version(Path("2026-10-13-10")) < version(Path("2026-10-14"))
    assert latest_folder().name == max((p.name for p in HERE.iterdir() if (p / "sample_50.csv").exists()), key=lambda n: version(Path(n)))


def test_one_copy_of_the_script():
    assert [p.relative_to(HERE).as_posix() for p in HERE.rglob("stats_project.py")] == ["stats_project.py"]


def test_cleaning_accounts_for_every_row(c):
    removed = sum(k for _, k in c["rule_counts"])
    assert removed + len(c["cleaned"]) == c["original_rows"]
    assert len(c["excluded"]) == removed
    assert len(c["cleaned"]) >= 100
    assert c["cleaned"]["id"].is_unique
    assert not set(c["cleaned"]["id"]) & set(c["excluded"]["id"])
    assert c["cleaned"][[sp.X, sp.Y, sp.CAT1, sp.CAT2]].notna().all().all()
    assert (c["cleaned"][sp.Y] == c["cleaned"]["resolved"] - c["cleaned"][sp.X]).all()
    assert (c["cleaned"][sp.Y] >= 0).all()


def test_category_tables_total_the_row_count(c):
    for cat in (sp.CAT1, sp.CAT2):
        f = sp.frequency(c["cleaned"][cat])
        assert f["count"].sum() == len(c["cleaned"])
        assert f["relative"].sum() == pytest.approx(1.0)
        assert len(f) >= 2
        assert f["count"].is_monotonic_decreasing


def test_grouped_table_is_equal_width_and_complete(c, y):
    t = c["grouped"]
    assert set(t["upper"] - t["lower"]) == {sp.BIN_WIDTH}
    assert (t["lower"].iloc[1:].to_numpy() == t["upper"].iloc[:-1].to_numpy()).all()
    assert t["count"].sum() == len(y)
    assert t["cumulative"].iloc[-1] == len(y)
    assert t["cumulative_relative"].iloc[-1] == pytest.approx(1.0)
    assert (t["midpoint"] == (t["lower"] + t["upper"]) / 2).all()
    assert t["lower"].iloc[0] <= y.min() and y.max() < t["upper"].iloc[-1]
    for row in t.itertuples():
        assert row.count == ((y >= row.lower) & (y < row.upper)).sum()


def test_summaries_match_independent_calculations(c, y):
    s = c["summary"]
    assert s["mean"] == pytest.approx(statistics.fmean(y))
    assert s["median"] == pytest.approx(statistics.median(y))
    assert s["variance"] == pytest.approx(statistics.variance(y))
    assert s["sd"] == pytest.approx(statistics.stdev(y))
    assert set(s["modes"]) == set(statistics.multimode(y))
    assert s["range"] == y.max() - y.min()
    assert s["iqr"] == pytest.approx(s["q3"] - s["q1"])
    assert s["q1"] <= s["median"] <= s["q3"] <= s["p90"] <= s["max"]
    assert s["fence_high"] == pytest.approx(s["q3"] + 1.5 * s["iqr"])
    assert s["fence_low"] == pytest.approx(s["q1"] - 1.5 * s["iqr"])
    flagged = c["cleaned"][(y < s["fence_low"]) | (y > s["fence_high"])]["id"].tolist()
    assert s["flagged_ids"] == flagged
    assert s["n_without"] == s["n"] - len(flagged)
    assert s["within"][1] <= s["within"][2] <= s["within"][3]
    assert s["within"][2] >= s["chebyshev_2"]
    assert s["z"] == pytest.approx((s["z_value"] - s["mean"]) / s["sd"])


def test_weighted_group_means_equal_the_overall_mean(c, y):
    g = c["cleaned"].groupby(sp.CAT1)[sp.Y].agg(["count", "mean"])
    assert (g["count"] * g["mean"]).sum() / g["count"].sum() == pytest.approx(y.mean())


def test_grouped_estimates_come_from_midpoints(c, y):
    t = c["grouped"]
    expanded = np.repeat(t["midpoint"].to_numpy(), t["count"].to_numpy())
    assert c["grouped_mean"] == pytest.approx(expanded.mean())
    assert c["grouped_sd"] == pytest.approx(expanded.std(ddof=1))


def test_regression_matches_a_least_squares_fit(c, y):
    r = c["regression"]
    x = c["cleaned"][sp.X].to_numpy(dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    assert r["slope"] == pytest.approx(slope)
    assert r["intercept"] == pytest.approx(intercept)
    assert r["r"] == pytest.approx(np.corrcoef(x, y)[0, 1])
    assert r["r_squared"] == pytest.approx(r["r"] ** 2)
    assert r["sse"] == pytest.approx(((y - (intercept + slope * x)) ** 2).sum())
    assert r["resid"].sum() == pytest.approx(0, abs=1e-6)
    assert r["x_min"] <= r["predict_x"] <= r["x_max"]
    assert r["row_resid"] == pytest.approx(r["row_y"] - r["row_fitted"])


def test_probability_table_obeys_the_addition_rule(c):
    p = c["probability"]
    assert p["ab"] + p["a_notb"] + p["nota_b"] + p["nota_notb"] == p["n"]
    assert p["a"] == p["ab"] + p["a_notb"]
    assert p["b"] == p["ab"] + p["nota_b"]
    assert p["p_a_or_b"] == pytest.approx(p["p_a"] + p["p_b"] - p["p_ab"])
    assert p["p_a_given_b"] == pytest.approx(p["p_ab"] / p["p_b"])
    assert p["c_10_3"] == 120
    assert 0 < p["p_a"] < 1


def test_models_match_closed_forms(c):
    m = c["models"]
    p = m["p"]
    assert m["binom_k3"] == pytest.approx(120 * p ** 3 * (1 - p) ** 7)
    assert m["binom_ge1"] == pytest.approx(1 - (1 - p) ** 10)
    assert m["binom_mean"] == pytest.approx(10 * p)
    assert m["binom_sd"] == pytest.approx(math.sqrt(10 * p * (1 - p)))
    assert stats.norm.cdf(m["normal_p90"], m["mu"], m["sigma"]) == pytest.approx(0.9)
    assert m["sigma"] < c["summary"]["sd"]


def test_saved_sample_repeats_under_the_seed(c):
    again = sp.draw_sample(c["cleaned"])
    pd.testing.assert_frame_equal(again, c["sample"])
    assert len(again) == sp.SAMPLE_N
    assert again["position"].between(1, len(c["cleaned"])).all()
    lookup = c["cleaned"].set_index("id")[sp.Y]
    assert (lookup[again["id"]].to_numpy() == again[sp.Y].to_numpy()).all()
    other = sp.draw_sample(c["cleaned"], seed=sp.SEED + 99)
    assert other["position"].tolist() != again["position"].tolist()


def test_committed_sample_matches_the_seed(c):
    saved = pd.read_csv(latest_folder() / "sample_50.csv")
    assert saved["id"].tolist() == c["sample"]["id"].tolist()
    assert saved[sp.Y].tolist() == c["sample"][sp.Y].tolist()


def test_simulation_shapes_and_means(c, y):
    draws, means = c["simulation_draws"], c["simulation_means"]
    assert len(draws) == sp.SIM_GROUPS * sum(sp.SIM_SIZES)
    assert len(means) == sp.SIM_GROUPS * len(sp.SIM_SIZES)
    recomputed = draws.groupby(["size", "group"])[sp.Y].mean().reset_index()
    assert np.allclose(recomputed[sp.Y].to_numpy(), means.sort_values(["size", "group"])["mean"].to_numpy())
    again_draws, again_means = sp.simulate(c["cleaned"])
    pd.testing.assert_frame_equal(again_means, means)
    small, large = c["simulation"][5], c["simulation"][50]
    assert large["sd"] < small["sd"]
    assert large["sd"] == pytest.approx(y.std() / math.sqrt(50), rel=0.2)
    assert not set(draws[draws["size"] == 5]["position"].head(50)) == set(c["sample"]["position"])


def test_interval_and_test_agree_with_scipy(c):
    inf = c["inference"]
    values = c["sample"][sp.Y].to_numpy(dtype=float)
    t, p = stats.ttest_1samp(values, sp.MU0)
    assert inf["t"] == pytest.approx(t)
    assert inf["p"] == pytest.approx(p)
    lo, hi = stats.t.interval(0.95, len(values) - 1, loc=values.mean(), scale=stats.sem(values))
    assert inf["low"] == pytest.approx(lo)
    assert inf["high"] == pytest.approx(hi)
    assert inf["margin"] == pytest.approx(inf["t_crit"] * inf["se"])
    assert inf["df"] == sp.SAMPLE_N - 1
    assert inf["reject"] == (not inf["mu0_in_interval"])
    assert inf["contains_full_mean"] == (inf["low"] <= c["models"]["mu"] <= inf["high"])


def test_stem_plot_holds_every_value(c, y):
    rebuilt = []
    for line in c["stem"]:
        stem, leaves = line.split("|")
        rebuilt += [int(stem) * 10 + int(d) for d in leaves.strip()]
    assert sorted(rebuilt) == sorted(int(v) for v in y)


def test_twelve_required_graphs_are_registered():
    assert len(sp.REQUIRED_GRAPHS) == 12
    assert [n.split("-")[0] for n in sp.REQUIRED_GRAPHS] == [f"{k:02d}" for k in range(1, 13)]


@pytest.mark.parametrize("name", sorted(sp.GRAPH_FUNCTIONS))
def test_each_graph_function_writes_its_file(c, tmp_path, name):
    path = sp.render(name, c, tmp_path)
    assert path.parent == tmp_path
    assert path.stem == name
    assert path.stat().st_size > (200 if path.suffix == ".txt" else 3000)


def test_render_rejects_an_unknown_graph(c, tmp_path):
    with pytest.raises(KeyError):
        sp.render("14-radar", c, tmp_path)


def test_misleading_graph_truncates_and_the_corrected_one_does_not(c):
    assert sp.misleading_base(c) > 0
    assert sp.misleading_base(c) < sp.branch_counts(c).min()


def test_new_folder_never_reuses_a_name(tmp_path):
    first = sp.new_folder(tmp_path, "2026-10-13")
    second = sp.new_folder(tmp_path, "2026-10-13")
    assert first.name == "2026-10-13"
    assert second.name == "2026-10-13-2"


def test_report_holds_every_section_in_order(c):
    c = dict(c, date="2026-10-13")
    text = sp.report(c)
    order = ["section*{Abstract}", "section{Data Form}", "section{Descriptive Statistics}", "section{Inferential Statistics}", "section*{Analysis}", "section*{Conclusion}", "section*{References}"]
    positions = [text.index(o) for o in order]
    assert positions == sorted(positions)
    assert text.count("DRAFT for Gianangelo") == 3
    for k in range(1, 13):
        assert f"Graph {k}" in text
