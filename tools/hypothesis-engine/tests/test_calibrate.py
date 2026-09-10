from hte import calibrate
from hte.belief import Constants
from hte.corpus import fixtures


def test_holdout_by_discovery_date_splits_correctly():
    corpus = fixtures.build()
    pre, post = calibrate.holdout_by_discovery_date(corpus.ground_truth, 1960)
    assert all(g.discovery_year < 1960 for g in pre)
    assert all(g.discovery_year >= 1960 for g in post)
    assert len(pre) + len(post) == len(corpus.ground_truth)


def test_run_holdout_scores_split_worthy_sources_only():
    corpus = fixtures.build()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1960)
    doc_ids = {p["doc_id"] for p in result["predictions"]}
    assert doc_ids == {"doc-alpha", "doc-gamma"}  # doc-beta sits entirely after 1960
    assert result["n_sources"] == 2
    assert result["brier_score"] is not None
    assert 0.0 <= result["brier_score"] <= 1.0


def test_run_holdout_predicts_higher_for_corroborated_source():
    corpus = fixtures.build()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1960)
    by_doc = {p["doc_id"]: p for p in result["predictions"]}
    assert by_doc["doc-alpha"]["observed"] == 1.0
    assert by_doc["doc-gamma"]["observed"] == 0.0
    # doc-alpha's pre-cutoff evidence is higher-tier than doc-gamma's, so its
    # predicted probability should read higher too.
    assert by_doc["doc-alpha"]["predicted"] > by_doc["doc-gamma"]["predicted"]


def test_calibration_curve_bins_predictions():
    predictions = [{"predicted": 0.05, "observed": 0.0}, {"predicted": 0.95, "observed": 1.0}]
    curve = calibrate.calibration_curve(predictions, n_bins=10)
    assert len(curve) == 10
    assert curve[0]["count"] == 1
    assert curve[-1]["count"] == 1
    assert curve[5]["count"] == 0
    assert curve[5]["mean_predicted"] is None


def test_brier_score_matches_hand_computation():
    score = calibrate.brier_score([0.8, 0.2], [1.0, 0.0])
    assert abs(score - ((0.8 - 1.0) ** 2 + (0.2 - 0.0) ** 2) / 2) < 1e-12


def test_brier_score_empty_is_none():
    assert calibrate.brier_score([], []) is None


def test_fit_constants_returns_best_and_all_results():
    corpus = fixtures.build()
    grid = {"W": [1.0, 2.0, 4.0], "lam": [0.25, 0.5]}
    fit = calibrate.fit_constants(corpus, grid, cutoff_years=1960)
    assert fit["best"] is not None
    assert len(fit["results"]) == 3 * 2 * 1  # W x lam x default tier_scale
    assert fit["results"][0]["brier_score"] <= fit["results"][-1]["brier_score"]


def test_fit_constants_excludes_mu_from_grid():
    corpus = fixtures.build()
    fit = calibrate.fit_constants(corpus, {"W": [2.0]}, cutoff_years=1960)
    assert "mu" not in fit["best"]


def test_write_calibration_produces_files(tmp_path):
    corpus = fixtures.build()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1960)
    calibrate.write_calibration(result, tmp_path)
    assert (tmp_path / "calibration.json").is_file()
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "Brier score" in md
    assert "doc-alpha" in md
