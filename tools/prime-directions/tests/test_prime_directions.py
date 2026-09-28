from __future__ import annotations

import json
import shutil
import sqlite3
from pathlib import Path

import numpy as np
import pytest

from prime_directions import cli, clean, corpora, export, gaps, model, render
from prime_directions.corpora import Doc

TOPICS = {
    "ocean": "whale coral reef tide kelp salmon plankton trawler",
    "orbit": "rocket satellite orbit thruster payload apogee launchpad telescope",
    "grain": "wheat barley harvest tractor silo irrigation fertilizer combine",
}


def synthetic_docs(n_per_topic: int = 40, seed: int = 1, extra: dict[str, str] | None = None) -> list[Doc]:
    rng = np.random.default_rng(seed)
    topics = {**TOPICS, **(extra or {})}
    filler = "report summary result figure table method sample value".split()
    docs = []
    for name, words in topics.items():
        vocab = words.split()
        for i in range(n_per_topic):
            chosen = rng.choice(vocab, size=5, replace=False).tolist() + rng.choice(filler, size=3, replace=False).tolist()
            docs.append(Doc(f"{name}-{i}", f"{name} {i}", " ".join(chosen)))
    return docs


def fit_small(docs: list[Doc], k: int = 3, name: str = "syn") -> model.PrimeResult:
    return model.fit(name, docs, k=k, min_df=2, max_df=0.9)


def test_strip_boilerplate_removes_shared_lines_and_short_docs():
    shared = "Subscribe to our newsletter"
    docs = [Doc(str(i), f"t{i}", f"{shared}\nunique body line {i} " + "x" * 50) for i in range(20)]
    docs.append(Doc("short", "short", f"{shared}\nok"))
    kept, stats = clean.strip_boilerplate(docs, min_chars=40, max_line_docs=5)
    assert len(kept) == 20
    assert all(shared not in d.text for d in kept)
    assert stats["boilerplate_lines"] == 1
    assert stats["docs_out"] == 20


def test_scrub_drops_urls_markup_and_latex_and_keeps_dollar_amounts():
    text = "costs $5 a net and $3 a dose, see [paper](https://a.b/c) <b>x</b> $k_BT$ \\propto"
    out = clean.scrub(text)
    assert "$5 a net and $3" in out
    for gone in ("https", "<b>", "k_BT", "propto"):
        assert gone not in out


def test_line_threshold_scales_with_corpus_size():
    assert clean.line_threshold(100) == 5
    assert clean.line_threshold(15000) == 30


def test_fit_components_are_orthonormal_and_recover_topics():
    result = fit_small(synthetic_docs())
    assert result.orthogonality < 1e-4
    assert result.k == 3
    np.testing.assert_allclose(result.scores.mean(axis=0), 0, atol=1e-6)
    np.testing.assert_allclose(result.scores.std(axis=0), 1, atol=1e-6)
    tops = [set(t for t, _ in result.top_terms(k, 5)) for k in range(result.k)]
    covered = set()
    for name, words in TOPICS.items():
        if any(len(top & set(words.split())) >= 3 for top in tops):
            covered.add(name)
    assert len(covered) >= 2
    assert np.all(result.variance_ratio > 0) and result.variance_ratio.sum() < 1


def test_fit_is_deterministic_for_a_seed():
    a = fit_small(synthetic_docs())
    b = fit_small(synthetic_docs())
    np.testing.assert_allclose(a.components, b.components, atol=1e-6)


def test_fit_rejects_too_few_docs():
    with pytest.raises(ValueError):
        model.fit("tiny", synthetic_docs(n_per_topic=1), k=12)


def test_vectorize_prunes_by_document_frequency_but_keeps_full_stats():
    texts = ["alpha beta", "alpha gamma", "alpha delta", "beta gamma"]
    matrix, vocab, stats = model.vectorize(texts, min_df=2, max_df=0.7, max_features=100)
    assert set(vocab) == {"beta", "gamma"}
    assert matrix.shape == (4, 2)
    assert stats.df[stats.index["alpha"]] == 3
    assert stats.df[stats.index["delta"]] == 1


def test_tokenizer_drops_numbers():
    _, vocab, stats = model.vectorize(["episode 00 01 2024 alpha", "alpha 02 beta"], 1, 1.0, 100)
    assert all(not t[0].isdigit() for t in stats.vocab)


def test_gap_analysis_ranks_terms_unique_to_target():
    target = fit_small(synthetic_docs(extra={"forge": "anvil hammer bellows ingot smelter crucible tongs quench"}), k=4, name="target")
    other = fit_small(synthetic_docs(seed=2), name="other")
    report = gaps.analyze(target, {"other": other.term_stats}, min_df=2)
    top = {t["term"] for t in report["terms"][:8]}
    assert top <= set("anvil hammer bellows ingot smelter crucible tongs quench".split())
    assert len(top) >= 5
    assert report["components"][0]["gap"] >= report["components"][-1]["gap"]
    assert all(t["log_ratio"] > 0 for t in report["terms"])


def test_log_ratio_is_finite_for_absent_terms():
    a = model.TermStats(np.array(["x", "y"]), np.array([10, 0]), 10)
    b = model.TermStats(np.array(["z"]), np.array([4]), 20)
    lr, _, _ = gaps.log_ratio(np.array(["x", "y", "z"]), a, [b])
    assert np.all(np.isfinite(lr))
    assert lr[0] > 0 > lr[2]


def test_export_json_shape():
    result = fit_small(synthetic_docs())
    data = export.to_dict(result, top_n=4)
    assert data["schema"] == export.SCHEMA
    assert len(data["components"]) == 3
    assert len(data["components"][0]["top_terms"]) == 4
    assert len(data["docs"]) == result.shape[0]
    assert len(data["docs"][0]["scores"]) == 3
    json.dumps(data)
    assert "docs" not in export.to_dict(result, include_docs=False)


def test_render_png(tmp_path: Path):
    result = fit_small(synthetic_docs())
    out = render.render_png(result, tmp_path / "g.png", cloud=50)
    assert out.stat().st_size > 10000
    assert out.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg missing")
def test_render_mp4(tmp_path: Path):
    result = fit_small(synthetic_docs())
    info = render.render_mp4(result, tmp_path / "s.mp4", frames_per_doc=4, hold=1, size_px=240, cloud=20)
    assert info["frames"] == 3 * 5
    assert (tmp_path / "s.mp4").stat().st_size > 1000


def test_find_and_default_picks():
    result = fit_small(synthetic_docs())
    assert render.find_picks(result, ["orbit 3", "nope"]) == [result.titles.index("orbit 3")]
    picks = render.default_picks(result, n=3)
    assert len(set(picks)) == 3


def test_folder_loader_titles_and_exclusions(tmp_path: Path):
    (tmp_path / "a.md").write_text("---\ntitle: Front Title\n---\nbody")
    (tmp_path / "b.md").write_text("# Heading Title\nbody")
    (tmp_path / "c.txt").write_text("plain body")
    (tmp_path / "skip").mkdir()
    (tmp_path / "skip" / "d.md").write_text("# hidden")
    (tmp_path / "e.json").write_text("{}")
    docs = corpora.load_folder(tmp_path, exclude_dirs=("skip",))
    titles = {d.id: d.title for d in docs}
    assert titles == {"a.md": "Front Title", "b.md": "Heading Title", "c.txt": "c"}


def test_sqlite_loader_filters_and_dedupes(tmp_path: Path):
    db = tmp_path / "c.sqlite"
    con = sqlite3.connect(db)
    con.execute("create table texts(url, title, body, transcript)")
    con.executemany(
        "insert into texts values (?,?,?,?)",
        [("u1", "A", "body", None), ("u2", "A", "dup", None), ("u3/tag/x", "B", "b", None), ("u4", "", "t", None), ("u5", "C", "c", "tr")],
    )
    con.commit()
    con.close()
    docs = corpora.load_sqlite(db, exclude_id_substrings=("/tag/",))
    assert [(d.id, d.text) for d in docs] == [("u1", "body"), ("u5", "c\ntr")]


def test_json_items_loader(tmp_path: Path):
    (tmp_path / "01-x.json").write_text(json.dumps({"atoms": [{"id": "a", "title": "T", "summary": "s", "lesson": "l"}, {"id": "b"}]}))
    docs = corpora.load_json_items(tmp_path)
    assert docs == [Doc("01-x/a", "T", "s\nl")]


def test_registry_and_unknown_kind(tmp_path: Path):
    reg = tmp_path / "r.json"
    reg.write_text(json.dumps({"corpora": {"x": {"kind": "nope", "path": str(tmp_path), "clean": {"min_chars": 1}}}}))
    spec = corpora.load_registry(reg)["x"]
    assert spec.clean == {"min_chars": 1} and not spec.private
    with pytest.raises(corpora.CorpusError):
        corpora.load(spec)


def test_shipped_registry_marks_kruse_private():
    specs = corpora.load_registry()
    assert specs["kruse"].private
    assert not specs["80k"].private


def test_private_out_must_leave_repo(tmp_path: Path):
    repo = tmp_path / "repo"
    repo.mkdir()
    with pytest.raises(cli.PrivacyError):
        cli.check_private_out(None, [repo])
    with pytest.raises(cli.PrivacyError):
        cli.check_private_out(repo / "out", [repo])
    assert cli.check_private_out(tmp_path / "elsewhere", [repo]) == tmp_path / "elsewhere"


def _write_corpus(root: Path, name: str, docs: list[Doc]) -> None:
    folder = root / name
    folder.mkdir(parents=True)
    for d in docs:
        (folder / f"{d.id}.md").write_text(f"# {d.title}\n{d.text}\n")


def test_cli_run_end_to_end_keeps_private_outputs_apart(tmp_path: Path, monkeypatch):
    data = tmp_path / "data"
    _write_corpus(data, "pub", synthetic_docs())
    _write_corpus(data, "pub2", synthetic_docs(seed=3, extra={"forge": "anvil hammer bellows ingot smelter crucible tongs quench"}))
    _write_corpus(data, "priv", synthetic_docs(seed=4, extra={"cave": "stalactite bat guano torch rope helmet lantern cavern"}))
    reg = tmp_path / "reg.json"
    reg.write_text(json.dumps({"corpora": {
        "pub": {"kind": "folder", "path": "pub", "clean": {"min_chars": 10}},
        "pub2": {"kind": "folder", "path": "pub2", "clean": {"min_chars": 10}},
        "priv": {"kind": "folder", "path": "priv", "private": True, "clean": {"min_chars": 10}},
    }}))
    monkeypatch.setenv("PRIME_DATA_ROOT", str(data))
    out, private = tmp_path / "out", tmp_path / "private"
    code = cli.main(["--registry", str(reg), "run", "--all", "--out", str(out), "--private-out", str(private),
                     "--k", "3", "--min-df", "2", "--max-df", "0.9", "--gaps", "--cloud", "20"])
    assert code == 0
    assert (out / "pub" / "prime.json").exists() and (out / "pub" / "prime.png").exists()
    assert (private / "priv" / "prime.json").exists()
    assert not (out / "priv").exists()
    public_gaps = json.loads((out / "pub2" / "gaps.json").read_text())
    assert public_gaps["compared_with"] == ["pub"]
    assert "priv" in json.loads((private / "pub2" / "gaps-all.json").read_text())["compared_with"]
    summary = json.loads((out / "summary.json").read_text())
    assert set(summary["corpora"]) == {"pub", "pub2"}
    assert "priv" not in (out / "summary.json").read_text()
    assert {"anvil", "hammer"} & set(summary["corpora"]["pub2"]["gap_terms"])
    assert set(json.loads((private / "summary.json").read_text())["corpora"]) == {"pub", "pub2", "priv"}


def test_cli_refuses_private_without_out(tmp_path: Path, monkeypatch, capsys):
    reg = tmp_path / "reg.json"
    reg.write_text(json.dumps({"corpora": {"priv": {"kind": "folder", "path": str(tmp_path), "private": True}}}))
    assert cli.main(["--registry", str(reg), "run", "priv", "--out", str(tmp_path / "o")]) == 2
    assert "private" in capsys.readouterr().err


def test_cli_reports_failures(tmp_path: Path):
    reg = tmp_path / "reg.json"
    reg.write_text(json.dumps({"corpora": {"gone": {"kind": "folder", "path": str(tmp_path / "missing")}}}))
    assert cli.main(["--registry", str(reg), "run", "gone", "--out", str(tmp_path / "o")]) == 1
    assert "gone" in json.loads((tmp_path / "o" / "summary.json").read_text())["failures"]
