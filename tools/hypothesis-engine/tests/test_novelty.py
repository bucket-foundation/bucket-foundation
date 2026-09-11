"""`hte.novelty.check_novelty`: lexical novelty against `bucket-canon/`
(`bkt-hte-novelty-check`, `PLAN.md` section 10's diversity concern). Every
test builds its own fake `<repo_root>/bucket-canon/` tree under
`tmp_path`, never reads the real one.
"""
from __future__ import annotations

from hte import novelty


def _write(root, rel_path: str, text: str) -> None:
    path = root / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_no_canon_directory_reads_as_fully_novel_with_no_closest_match(tmp_path):
    result = novelty.check_novelty("alpha team sighted a comet", repo_root=tmp_path)
    assert result.score == 1.0
    assert result.closest_path is None
    assert result.closest_similarity == 0.0
    assert result.closest_bucket is None
    assert result.n_compared == 0


def test_empty_canon_directory_reads_as_fully_novel(tmp_path):
    (tmp_path / "bucket-canon").mkdir()
    result = novelty.check_novelty("alpha team sighted a comet", repo_root=tmp_path)
    assert result.score == 1.0
    assert result.closest_path is None
    assert result.n_compared == 0


def test_near_duplicate_scores_low_novelty_and_names_the_match(tmp_path):
    _write(
        tmp_path, "bucket-canon/02-physics/some-dossier/claim.md",
        "The alpha team sighted a comet near the outer observatory in 1962.",
    )
    result = novelty.check_novelty("the alpha team sighted a comet near the outer observatory", repo_root=tmp_path)
    assert result.closest_path == "bucket-canon/02-physics/some-dossier/claim.md"
    assert result.closest_bucket == "canon"
    assert result.closest_similarity > 0.5
    assert result.score < 0.5
    assert result.n_compared == 1


def test_unrelated_material_scores_high_novelty(tmp_path):
    _write(tmp_path, "bucket-canon/01-mathematics/axiom.md", "The reals form a complete ordered field.")
    result = novelty.check_novelty("beta team recorded a lunar eclipse in the highlands", repo_root=tmp_path)
    assert result.closest_path == "bucket-canon/01-mathematics/axiom.md"
    assert result.score > 0.8


def test_hypotheses_subtree_reads_as_engine_bucket_not_canon(tmp_path):
    _write(
        tmp_path, "bucket-canon/07-mind/hypotheses/h1.md",
        "The alpha team sighted a comet near the outer observatory in 1962.",
    )
    result = novelty.check_novelty("the alpha team sighted a comet near the outer observatory", repo_root=tmp_path)
    assert result.closest_bucket == "engine"


def test_closer_of_two_matches_wins_deterministically(tmp_path):
    _write(tmp_path, "bucket-canon/a/near.md", "alpha team sighted a comet near the outer observatory")
    _write(tmp_path, "bucket-canon/b/far.md", "a lunar eclipse over the highlands at midnight")
    result = novelty.check_novelty("alpha team sighted a comet near the outer observatory", repo_root=tmp_path)
    assert result.closest_path == "bucket-canon/a/near.md"
    assert result.n_compared == 2


def test_unreadable_file_is_skipped_not_fatal(tmp_path, monkeypatch):
    _write(tmp_path, "bucket-canon/a/one.md", "alpha team sighted a comet")
    real_read_text = novelty.Path.read_text

    def flaky_read_text(self, *args, **kwargs):
        if self.name == "one.md":
            raise OSError("simulated unreadable file")
        return real_read_text(self, *args, **kwargs)

    monkeypatch.setattr(novelty.Path, "read_text", flaky_read_text)
    result = novelty.check_novelty("alpha team sighted a comet", repo_root=tmp_path)
    assert result.n_compared == 1
    assert result.closest_path is None  # the only file present was skipped


def test_score_is_one_minus_similarity(tmp_path):
    _write(tmp_path, "bucket-canon/a/one.md", "alpha team sighted a comet near the outer observatory")
    result = novelty.check_novelty("alpha team sighted a comet near the outer observatory", repo_root=tmp_path)
    assert result.score == 1.0 - result.closest_similarity
