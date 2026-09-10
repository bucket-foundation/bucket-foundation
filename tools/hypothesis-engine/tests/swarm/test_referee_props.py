"""Property tests over `hte.referee`'s pure mechanical checks: section
order, bare-`\\ref` counting and fixing, and bibliography DOI/arXiv
coverage. No LLM call and no `make pdf` build in this file (both are
exercised end to end, replay-only, by `tests/test_referee.py` already);
these tests stay cheap and pure."""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from hypothesis import given
from hypothesis import strategies as st

from hte import referee

section_lists = st.lists(st.sampled_from(referee.EXPECTED_SECTION_ORDER), min_size=0, max_size=9)


def _tex_with_sections(names: list[str]) -> str:
    return "".join(f"\\section{{{n.title()}}}\n" for n in names)


def _with_tmp_bib(text: str):
    tmp = tempfile.mkdtemp()
    path = Path(tmp) / "refs.bib"
    path.write_text(text)
    return tmp, path


# --------------------------------------------------------------------------
# check_section_order
# --------------------------------------------------------------------------


def test_check_section_order_accepts_the_exact_expected_order():
    tex = _tex_with_sections(referee.EXPECTED_SECTION_ORDER)
    assert referee.check_section_order(tex)["ok"] is True


@given(section_lists)
def test_check_section_order_ok_iff_exact_match(names):
    tex = _tex_with_sections(names)
    result = referee.check_section_order(tex)
    expected_ok = [n.lower() for n in names] == [s.lower() for s in referee.EXPECTED_SECTION_ORDER]
    assert result["ok"] == expected_ok


def test_check_section_order_ignores_content_after_appendix():
    tex = _tex_with_sections(referee.EXPECTED_SECTION_ORDER) + "\\appendix\n\\section{Glossary}\n"
    result = referee.check_section_order(tex)
    assert result["ok"] is True
    assert "glossary" not in result["found"]


def test_check_section_order_is_deterministic():
    tex = _tex_with_sections(["introduction", "results"])
    assert referee.check_section_order(tex) == referee.check_section_order(tex)


# --------------------------------------------------------------------------
# check_bare_ref / fix_bare_ref
# --------------------------------------------------------------------------


ref_labels = st.text(alphabet="abcdefghijklmnop:-", min_size=1, max_size=10)


@given(st.lists(ref_labels, min_size=0, max_size=8), st.lists(ref_labels, min_size=0, max_size=8))
def test_check_bare_ref_count_matches_number_of_bare_refs(bare_labels, cref_labels):
    tex = "".join(f"\\ref{{{l}}} " for l in bare_labels) + "".join(f"\\Cref{{{l}}} " for l in cref_labels)
    result = referee.check_bare_ref(tex)
    assert result["count"] == len(bare_labels)
    assert result["ok"] == (len(bare_labels) == 0)


@given(st.lists(ref_labels, min_size=0, max_size=8), st.lists(ref_labels, min_size=0, max_size=8))
def test_fix_bare_ref_leaves_zero_bare_refs_and_preserves_every_cref(bare_labels, cref_labels):
    tex = "".join(f"\\ref{{{l}}} " for l in bare_labels) + "".join(f"\\Cref{{{l}}} " for l in cref_labels)
    fixed = referee.fix_bare_ref(tex)
    assert referee.check_bare_ref(fixed)["ok"] is True
    assert fixed.count("\\Cref{") == len(bare_labels) + len(cref_labels)


@given(st.lists(ref_labels, min_size=0, max_size=8))
def test_fix_bare_ref_is_idempotent(labels):
    tex = "".join(f"\\ref{{{l}}} " for l in labels)
    once = referee.fix_bare_ref(tex)
    twice = referee.fix_bare_ref(once)
    assert once == twice


def test_fix_bare_ref_does_not_touch_text_with_no_bare_ref():
    tex = "No references here, just \\Cref{sec:a} and \\autocite{x}."
    assert referee.fix_bare_ref(tex) == tex


# --------------------------------------------------------------------------
# check_bibliography
# --------------------------------------------------------------------------


def _bib_entry(key: str, *, doi: str | None = None, eprint: str | None = None, note: str | None = None) -> str:
    fields = []
    if doi:
        fields.append(f"  doi = {{{doi}}},\n")
    if eprint:
        fields.append(f"  eprint = {{{eprint}}},\n")
    if note:
        fields.append(f"  note = {{{note}}},\n")
    return f"@article{{{key},\n  author = {{Someone}},\n" + "".join(fields) + "}\n"


bib_keys = st.text(alphabet="abcdefghijklmnop", min_size=3, max_size=10)


@given(bib_keys)
def test_check_bibliography_entry_with_doi_is_never_a_problem(key):
    tmp, path = _with_tmp_bib(_bib_entry(key, doi="10.1000/x"))
    try:
        result = referee.check_bibliography(path)
        assert result["ok"] is True
        assert result["problems"] == []
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@given(bib_keys)
def test_check_bibliography_entry_with_eprint_is_never_a_problem(key):
    tmp, path = _with_tmp_bib(_bib_entry(key, eprint="2101.00001"))
    try:
        result = referee.check_bibliography(path)
        assert result["ok"] is True
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@given(bib_keys)
def test_check_bibliography_undocumented_entry_with_neither_is_a_problem(key):
    tmp, path = _with_tmp_bib(_bib_entry(key))
    try:
        result = referee.check_bibliography(path)
        assert result["ok"] is False
        assert key in result["problems"]
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@given(bib_keys)
def test_check_bibliography_documented_exception_is_not_a_problem(key):
    tmp, path = _with_tmp_bib(_bib_entry(key, note="Unpublished manuscript, no DOI or arXiv id."))
    try:
        result = referee.check_bibliography(path)
        assert result["ok"] is True
        assert key in result["documented_exceptions"]
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@given(st.lists(bib_keys, min_size=0, max_size=5, unique=True))
def test_check_bibliography_n_entries_matches_count(keys):
    tmp, path = _with_tmp_bib("".join(_bib_entry(k, doi="10.1/x") for k in keys))
    try:
        result = referee.check_bibliography(path)
        assert result["n_entries"] == len(keys)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_check_bibliography_missing_file_is_empty_and_ok():
    assert referee.check_bibliography(Path("/no/such/refs.bib")) == {
        "ok": True, "problems": [], "documented_exceptions": [], "n_entries": 0,
    }
