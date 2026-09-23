from __future__ import annotations

import string

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from hte import novelty

_GIVEN = settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])

_alnum_words = st.lists(
    st.text(alphabet=string.ascii_lowercase, min_size=1, max_size=8), min_size=1, max_size=6,
).map(lambda words: " ".join(words))

_no_token_text = st.text(alphabet=" !@#$%^&*()_+-=.,;:'\"[]{}", min_size=1, max_size=20)

def _write(root, rel_path: str, text: str) -> None:
    path = root / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

@given(canon_text=_alnum_words, query=_no_token_text)
@_GIVEN
def test_query_with_no_alnum_tokens_is_fully_novel_but_still_names_a_closest_match(tmp_path, canon_text, query):
    _write(tmp_path, "bucket-canon/a/one.md", canon_text)
    result = novelty.check_novelty(query, repo_root=tmp_path)
    assert result.score == 1.0
    assert result.closest_similarity == 0.0
    assert result.closest_path == "bucket-canon/a/one.md"
    assert result.n_compared == 1

@given(query=_alnum_words, canon_text=_no_token_text)
@_GIVEN
def test_canon_file_with_no_alnum_tokens_scores_zero_similarity_against_any_query(tmp_path, query, canon_text):
    _write(tmp_path, "bucket-canon/a/empty-tokens.md", canon_text)
    result = novelty.check_novelty(query, repo_root=tmp_path)
    assert result.closest_similarity == 0.0
    assert result.score == 1.0
    assert result.closest_path == "bucket-canon/a/empty-tokens.md"

def test_closest_path_outside_repo_root_falls_back_to_absolute_string_path(tmp_path):
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    outside = tmp_path / "outside-canon"
    _write(outside, "one.md", "alpha team sighted a comet near the outer observatory")

    result = novelty.check_novelty(
        "alpha team sighted a comet near the outer observatory",
        repo_root=repo_root, canon_dirname=str(outside),
    )

    assert result.closest_path == str(outside / "one.md")
    assert result.closest_similarity > 0.9
    assert result.n_compared == 1

@given(query=st.text(min_size=0, max_size=40), canon_text=st.text(min_size=0, max_size=40))
@_GIVEN
def test_score_and_similarity_stay_in_unit_range_over_arbitrary_text(tmp_path, query, canon_text):
    _write(tmp_path, "bucket-canon/a/one.md", canon_text)
    result = novelty.check_novelty(query, repo_root=tmp_path)
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.closest_similarity <= 1.0
    assert result.score == pytest.approx(1.0 - result.closest_similarity)
    assert result.n_compared == 1
