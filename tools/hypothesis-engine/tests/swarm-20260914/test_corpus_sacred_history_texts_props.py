"""Property tests for `hte.corpus.sacred_history_texts`'s two pure,
disk-free helpers, `split_passages` and `_strip_gutenberg_boilerplate`.

`tests/test_corpus_sacred_history_texts.py` already exercises both against
hand-picked examples (a Gutenberg-wrapped fixture, a CRLF fixture, a
no-markers fixture); this file generalizes the same invariants across
generated input via Hypothesis, since `split_passages` is the one pure
function in this module worth a property swarm (`ingest_passages`/`load`
both need either a real extraction call or a real file on disk, neither a
good fit for generated input). No defect found; coverage-only, matching
round four's own precedent for a module whose pinned tests already cover
the interesting edge cases by hand.

Every generated paragraph excludes `*` (so it can never accidentally
assemble a `*** START/END ... ***` marker of its own) and `\r`/`\n` (so a
paragraph never introduces an extra block boundary on its own; blocks are
built explicitly via `"\\n\\n".join(...)` instead), keeping every property
below about `split_passages`' own block-and-filter logic rather than about
what counts as a paragraph boundary in the first place.
"""
from __future__ import annotations

from hypothesis import given, strategies as st

from hte.corpus.sacred_history_texts import (
    _MIN_PASSAGE_CHARS,
    _strip_gutenberg_boilerplate,
    split_passages,
)

_PARAGRAPH_CHARS = st.characters(blacklist_categories=("Cs",), blacklist_characters="*\r\n")
_PARAGRAPH_TEXT = st.text(alphabet=_PARAGRAPH_CHARS, min_size=0, max_size=120)


def _collapsed(text: str) -> str:
    return " ".join(text.split())


@given(st.lists(_PARAGRAPH_TEXT, min_size=0, max_size=8))
def test_every_kept_passage_clears_the_minimum_length(paragraphs):
    raw = "\n\n".join(paragraphs)
    for _, text in split_passages(raw):
        assert len(text) >= _MIN_PASSAGE_CHARS


@given(st.lists(_PARAGRAPH_TEXT, min_size=0, max_size=8))
def test_passage_ids_are_sequential_from_zero_in_document_order(paragraphs):
    raw = "\n\n".join(paragraphs)
    ids = [pid for pid, _ in split_passages(raw)]
    assert ids == [f"p{i:04d}" for i in range(len(ids))]


@given(st.lists(_PARAGRAPH_TEXT, min_size=0, max_size=8))
def test_no_kept_passage_carries_a_newline_carriage_return_or_double_space(paragraphs):
    raw = "\n\n".join(paragraphs)
    for _, text in split_passages(raw):
        assert "\n" not in text
        assert "\r" not in text
        assert "  " not in text


@given(st.lists(_PARAGRAPH_TEXT, min_size=0, max_size=8))
def test_no_kept_passage_has_leading_or_trailing_whitespace(paragraphs):
    raw = "\n\n".join(paragraphs)
    for _, text in split_passages(raw):
        assert text == text.strip()


@given(st.lists(_PARAGRAPH_TEXT, min_size=0, max_size=8))
def test_passage_count_matches_paragraphs_clearing_the_floor(paragraphs):
    raw = "\n\n".join(paragraphs)
    expected = sum(1 for p in paragraphs if len(_collapsed(p)) >= _MIN_PASSAGE_CHARS)
    assert len(split_passages(raw)) == expected


@given(st.lists(_PARAGRAPH_TEXT, min_size=1, max_size=8))
def test_split_passages_is_deterministic_across_repeated_calls(paragraphs):
    raw = "\n\n".join(paragraphs)
    assert split_passages(raw) == split_passages(raw)


@given(st.text(alphabet=_PARAGRAPH_CHARS, min_size=0, max_size=500))
def test_strip_gutenberg_boilerplate_is_a_noop_without_markers(text):
    assert _strip_gutenberg_boilerplate(text) == text


_PREFIX_SENTINEL = "PREFIX-SENTINEL-TEXT"
_SUFFIX_SENTINEL = "SUFFIX-SENTINEL-TEXT"


@given(body=st.text(alphabet=_PARAGRAPH_CHARS, min_size=0, max_size=200))
def test_strip_gutenberg_boilerplate_keeps_the_body_and_drops_the_wrapper(body):
    wrapped = (
        f"{_PREFIX_SENTINEL}\n"
        "*** START OF THE PROJECT GUTENBERG EBOOK X ***\n"
        f"{body}\n"
        "*** END OF THE PROJECT GUTENBERG EBOOK X ***\n"
        f"{_SUFFIX_SENTINEL}"
    )
    stripped = _strip_gutenberg_boilerplate(wrapped)
    assert _PREFIX_SENTINEL not in stripped
    assert _SUFFIX_SENTINEL not in stripped
    assert "GUTENBERG" not in stripped
    assert body in stripped
