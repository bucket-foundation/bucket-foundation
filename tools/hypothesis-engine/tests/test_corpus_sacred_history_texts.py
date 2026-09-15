"""`hte.corpus.sacred_history_texts`'s own tests.

`FIXTURE_PASSAGES` is 12 hand-written passages across 4 traditions
(`christianity`, `judaism`, `tao-confucian`, `buddhism`), one real prose
sentence each, never this package's own synthetic microformat line
(`hte.fakellm._MICRO_LINE_RE`). `FIXTURE_EXPECTED` hand-writes the exact
`EvidenceItem` `hte.fakellm._extract`'s own "whole-document echo, no
recognizable microformat line" branch produces for each one (see `hte.
corpus.sacred_history_texts`'s own top docstring, "Fake mode and this
module's own fixture," for why every real-prose passage takes that one
branch): every test in this file runs under `HTE_LLM_MODE=fake`
(`monkeypatch.setenv`, scoped to each test, never the ambient shell), so
this file's own assertions hold under both `env -u HTE_LLM_MODE make
test` and `HTE_LLM_MODE=fake make test` alike.
"""
from __future__ import annotations

import dataclasses
import json
import re
from pathlib import Path

import pytest

from hte.corpus import sacred_history, sacred_history_texts as sht
from hte.evidence import EvidenceKind, Stance, Tier

# (text_id, tradition) pairs the fixture draws its 12 passages from, one
# per `TEXT_RECORDS` entry's own edition, 4 distinct traditions.
_KJV = "kjv-bible"
_TALMUD = "talmud-legends-baring-gould"
_ANALECTS = "analects-legge"
_DHAMMAPADA = "dhammapada-muller"

# Real prose, hand-written for this fixture (not copied verbatim from the
# files `TEXT_RECORDS` names): three short passages per text, each
# already whitespace-collapsed to a single line so it matches `hte.
# fakellm._extract`'s own whole-document echo (`doc.strip()`) exactly,
# char-for-char, with no re-collapsing needed on this file's own side.
FIXTURE_PASSAGES: tuple[tuple[str, str, str], ...] = (
    (_KJV, "p0000", "And Noah builded an altar unto the LORD, and took of every clean beast, and of every clean fowl, and offered burnt offerings on the altar."),
    (_KJV, "p0001", "And Abraham said, My son, God will provide himself a lamb for a burnt offering: so they went both of them together."),
    (_KJV, "p0002", "And Moses stretched out his hand over the sea, and the sea returned to his strength when the morning appeared."),
    (_TALMUD, "p0000", "The legend relates that Noah wept seven days before the flood came, for the beasts of the field would not enter the ark until the waters had already begun to rise."),
    (_TALMUD, "p0001", "Abraham, say the Rabbis, was cast into the furnace of Nimrod, and the flame consumed the cords that bound him, but left his own flesh untouched."),
    (_TALMUD, "p0002", "It is written that Moses broke the first tablets when he saw the golden calf, and grief the second time knowing they were not entrusted to him alone."),
    (_ANALECTS, "p0000", "The Master said, Is it not pleasant to learn with a constant perseverance and application?"),
    (_ANALECTS, "p0001", "Confucius said, To go too far is as bad as to fall short; the superior man holds fast to the middle course."),
    (_ANALECTS, "p0002", "The Master said, When you know a thing, to hold that you know it, and when you do not know a thing, to allow that you do not know it, this is knowledge."),
    (_DHAMMAPADA, "p0000", "The Buddha said, All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts."),
    (_DHAMMAPADA, "p0001", "Hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule taught by the Buddha."),
    (_DHAMMAPADA, "p0002", "He who has attained the tranquil happiness of the Buddha's own path, that Bhikshu, calm and collected, may verily call himself happy."),
)


def _expected_item(text_id: str, passage_id: str, passage_text: str) -> dict:
    """The exact `hte.evidence.EvidenceItem` shape `hte.fakellm._extract`'s
    own whole-document echo produces for one real-prose passage, hand-
    derived from that function's own source (`hte/fakellm.py`) and `hte.
    roles.extract`'s own item-construction loop: kind `textual`, tier
    `T3`, `source_id` the edition (`text_id`, remapped by `hte.corpus.
    sacred_history_texts._passage_evidence` from the passage's own bare
    doc id), a verbatim whole-passage quote anchored at `(0, len(passage_
    text))` since every fixture passage here is written pre-collapsed
    (no leading/trailing whitespace, single interior spaces already), no
    slot filled, no interval, a positive stance, provenance `"llm-
    extraction-ensemble"` (three identical ensemble passes always agree)."""
    doc_id = f"{text_id}-{passage_id}"
    return {
        "id": f"{doc_id}-ex-0",
        "kind": EvidenceKind.TEXTUAL,
        "tier": Tier.T3,
        "source_id": text_id,
        "span_doc_id": doc_id,
        "quote": passage_text,
        "char_start": 0,
        "char_end": len(passage_text),
        "locator": "extract:0",
        "provenance": "llm-extraction-ensemble",
        "stance": Stance.POSITIVE,
    }


FIXTURE_EXPECTED: tuple[dict, ...] = tuple(_expected_item(*p) for p in FIXTURE_PASSAGES)


@pytest.fixture(autouse=True)
def _fake_llm_mode(monkeypatch):
    """Every test in this file dispatches through `hte.fakellm`, scoped
    to this file alone (`monkeypatch.setenv`, undone by pytest after each
    test): correct under both `env -u HTE_LLM_MODE make test` and
    `HTE_LLM_MODE=fake make test`."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")


def test_fixture_covers_twelve_passages_across_four_traditions():
    assert len(FIXTURE_PASSAGES) == 12
    text_ids = {text_id for text_id, _, _ in FIXTURE_PASSAGES}
    assert len(text_ids) == 4
    traditions = {sht._TEXT_RECORDS_BY_ID[text_id].tradition for text_id in text_ids}
    assert traditions == {"christianity", "judaism", "tao-confucian", "buddhism"}


def test_ingest_passages_fixture_end_to_end_in_fake_mode(tmp_path):
    corpus = sht.ingest_passages(FIXTURE_PASSAGES, cache_dir=tmp_path / "llm-cache")
    assert len(corpus.evidence) == 12
    assert len(corpus.sources) == 4

    by_id = {item.id: item for item in corpus.evidence}
    for expected in FIXTURE_EXPECTED:
        item = by_id[expected["id"]]
        assert item.kind == expected["kind"]
        assert item.tier == expected["tier"]
        assert item.source_id == expected["source_id"]
        assert item.span.doc_id == expected["span_doc_id"]
        assert item.span.locator == expected["locator"]
        assert item.span.quote == expected["quote"]
        assert item.span.char_start == expected["char_start"]
        assert item.span.char_end == expected["char_end"]
        assert item.provenance == expected["provenance"]
        assert item.stance == expected["stance"]
        assert item.actor is None
        assert item.action is None
        assert item.object is None
        assert item.place is None
        assert item.mechanism is None
        assert item.interval is None


def test_ingest_passages_builds_one_source_per_edition_stemmed_to_its_tradition(tmp_path):
    corpus = sht.ingest_passages(FIXTURE_PASSAGES, cache_dir=tmp_path / "llm-cache")
    assert corpus.sources[_KJV].stemma_parents == ["christianity"]
    assert corpus.sources[_KJV].date == "1611"
    assert corpus.sources[_TALMUD].stemma_parents == ["judaism"]
    assert corpus.sources[_ANALECTS].stemma_parents == ["tao-confucian"]
    assert corpus.sources[_DHAMMAPADA].stemma_parents == ["buddhism"]


def test_ingest_passages_provenance_is_one_fixture_envelope_per_edition(tmp_path):
    corpus = sht.ingest_passages(FIXTURE_PASSAGES, cache_dir=tmp_path / "llm-cache")
    assert len(corpus.provenance) == 4
    assert {p.doc_id for p in corpus.provenance} == {_KJV, _TALMUD, _ANALECTS, _DHAMMAPADA}
    for p in corpus.provenance:
        assert p.fixture is True


def test_ingest_passages_unregistered_text_id_raises_key_error(tmp_path):
    with pytest.raises(KeyError):
        sht.ingest_passages([("not-a-real-text-id", "p0000", "some prose")], cache_dir=tmp_path / "llm-cache")


def test_ingest_passages_shares_the_sacred_history_vocab(tmp_path):
    corpus = sht.ingest_passages(FIXTURE_PASSAGES, cache_dir=tmp_path / "llm-cache")
    assert corpus.vocab.to_dict() == sacred_history.load_vocab().to_dict()


# --------------------------------------------------------------------------
# split_passages
# --------------------------------------------------------------------------

_GUTENBERG_WRAPPED = """﻿The Project Gutenberg eBook of Some Sacred Text

This eBook is for the use of anyone anywhere.

*** START OF THE PROJECT GUTENBERG EBOOK SOME SACRED TEXT ***

First passage, long enough on its own to clear the minimum length this
splitter enforces before it counts as a real passage worth keeping.

Second

Third passage, also long enough on its own to clear the minimum length
this splitter enforces before it counts as a real passage worth keeping.

*** END OF THE PROJECT GUTENBERG EBOOK SOME SACRED TEXT ***

This is licensing boilerplate that must never survive into a passage.
"""


def test_split_passages_strips_gutenberg_boilerplate_and_drops_short_blocks():
    passages = sht.split_passages(_GUTENBERG_WRAPPED)
    texts = [text for _, text in passages]
    assert "Second" not in texts  # too short (< _MIN_PASSAGE_CHARS), dropped
    assert not any("Project Gutenberg" in t for t in texts)
    assert not any("licensing boilerplate" in t for t in texts)
    assert len(passages) == 2
    assert passages[0][1].startswith("First passage")
    assert passages[1][1].startswith("Third passage")


def test_split_passages_ids_are_deterministic_and_in_document_order():
    passages = sht.split_passages(_GUTENBERG_WRAPPED)
    assert [pid for pid, _ in passages] == ["p0000", "p0001"]


def test_split_passages_collapses_internal_whitespace_and_crlf():
    raw = "*** START OF THE PROJECT GUTENBERG EBOOK X ***\r\n\r\nLine one\r\nline two   with  extra   spaces, long enough to clear the floor.\r\n\r\n*** END OF THE PROJECT GUTENBERG EBOOK X ***"
    [(_, text)] = sht.split_passages(raw)
    assert "\n" not in text
    assert "\r" not in text
    assert "  " not in text
    assert text.startswith("Line one line two with extra spaces")


def test_split_passages_is_a_noop_on_a_file_with_no_gutenberg_markers():
    raw = "A first paragraph, long enough on its own to clear the minimum passage length this splitter enforces.\n\nA second paragraph, also long enough on its own to clear that same floor."
    passages = sht.split_passages(raw)
    assert len(passages) == 2


# --------------------------------------------------------------------------
# TEXT_RECORDS inventory
# --------------------------------------------------------------------------

def test_text_records_paths_exist_on_disk():
    for record in sht.TEXT_RECORDS:
        assert record.path.is_file(), f"missing from disk: {record.path}"


def test_text_records_ids_are_unique():
    ids = [r.text_id for r in sht.TEXT_RECORDS]
    assert len(ids) == len(set(ids))


def test_text_records_traditions_are_real_sacred_history_traditions():
    data = json.loads(sacred_history.DEFAULT_CORPUS_PATH.read_text(encoding="utf-8"))
    real_traditions = set(data["traditions"])
    for record in sht.TEXT_RECORDS:
        assert record.tradition in real_traditions


def test_text_records_cover_all_thirteen_traditions():
    data = json.loads(sacred_history.DEFAULT_CORPUS_PATH.read_text(encoding="utf-8"))
    traditions = {r.tradition for r in sht.TEXT_RECORDS}
    assert traditions == set(data["traditions"])
    assert len(traditions) == 13


# --------------------------------------------------------------------------
# text-acquisition pass: the eleven editions that filled the seven
# traditions this module's first pass carried no primary text for at
# all (`docs/SACRED-HISTORY-TEXTS.md`'s own "Text-acquisition pass"
# section). Each test below reads one real edition off disk, asserts
# `split_passages()`'s own passage count is the exact, deterministic
# figure this doc's own density table already reports (a regression
# guard: a byte-identical file re-splits to the same count every run,
# `split_passages`'s own contract), and asserts at least one of those
# passages names a corpus figure unique to that edition's tradition
# under a plain-text, case-insensitive regex, the same cheap-proxy
# check the density table's own methodology note describes. Several of
# these editions spell a figure differently from `sacred-history.json`'s
# own `label`: a 19th/20th-century transliteration rather than the
# corpus's own normalized form. The regex for each test matches that
# edition's own attested spelling instead, named in a comment.
# --------------------------------------------------------------------------

def _passages_of(text_id: str) -> tuple[tuple[str, str], ...]:
    record = sht._TEXT_RECORDS_BY_ID[text_id]
    raw = record.path.read_text(encoding="utf-8", errors="replace")
    return tuple(sht.split_passages(raw))


def _assert_figure_attested(passages: tuple[tuple[str, str], ...], pattern: str) -> None:
    rx = re.compile(r"\b(?:" + pattern + r")\b", re.IGNORECASE)
    assert any(rx.search(text) for _, text in passages)


def test_quran_rodwell_passage_count_and_muhammad_attested():
    passages = _passages_of("quran-rodwell")
    assert len(passages) == 6741
    _assert_figure_attested(passages, r"Muhammad")


def test_hesiod_homeric_hymns_passage_count_and_deucalion_attested():
    passages = _passages_of("hesiod-homeric-hymns-evelyn-white")
    assert len(passages) == 1357
    _assert_figure_attested(passages, r"Deucalion")


def test_avesta_vendidad_darmesteter_passage_count_and_zoroaster_attested():
    passages = _passages_of("avesta-vendidad-darmesteter")
    assert len(passages) == 2763
    _assert_figure_attested(passages, r"Zoroaster|Zarathustra")


def test_avesta_part2_darmesteter_passage_count_and_zoroaster_attested():
    passages = _passages_of("avesta-part2-darmesteter")
    assert len(passages) == 4591
    _assert_figure_attested(passages, r"Zoroaster|Zarathustra")


def test_avesta_part3_mills_passage_count_and_zoroaster_attested():
    passages = _passages_of("avesta-part3-mills")
    assert len(passages) == 3769
    _assert_figure_attested(passages, r"Zoroaster|Zarathustra")


def test_gilgamesh_thompson_passage_count_and_gilgamesh_and_utnapishtim_attested():
    passages = _passages_of("gilgamesh-thompson")
    assert len(passages) == 680
    # This edition's own spelling ("Gilgamish", "Uta-Napishtim"), not
    # `sacred-history.json`'s own labels ("Gilgamesh", "Utnapishtim");
    # see this doc's own density-table note on 1928 transliteration.
    _assert_figure_attested(passages, r"Gilgamish")
    _assert_figure_attested(passages, r"Uta-Napishtim")


def test_enuma_elish_king_passage_count_and_gilgamesh_attested():
    passages = _passages_of("enuma-elish-king")
    assert len(passages) == 3198
    # A different Mesopotamian myth cycle from the Gilgamesh epic
    # (Marduk's own creation epic); attestation is thin (4 passages) but
    # nonzero even under the wider "Gilgamish or Gilgamesh" pattern.
    _assert_figure_attested(passages, r"Gilgamish|Gilgamesh")


def test_jaina_sutras_part1_jacobi_passage_count_and_mahavira_attested():
    passages = _passages_of("jaina-sutras-part1-jacobi")
    assert len(passages) == 2323
    _assert_figure_attested(passages, r"Mahavira")


def test_jaina_sutras_part2_jacobi_passage_count_and_mahavira_attested():
    passages = _passages_of("jaina-sutras-part2-jacobi")
    assert len(passages) == 4301
    _assert_figure_attested(passages, r"Mahavira")


def test_sikh_religion_vol1_macauliffe_passage_count_and_guru_nanak_attested():
    passages = _passages_of("sikh-religion-vol1-macauliffe")
    assert len(passages) == 6456
    # This edition's own spelling ("Nanak") is the bare given name,
    # narrower than the figure's full label ("Guru Nanak"): "Guru" is a
    # title Macauliffe also gives to the other Sikh Gurus this same
    # volume names, so the bare given name is the more specific signal.
    _assert_figure_attested(passages, r"Nanak")


def test_kitab_i_iqan_ali_kuli_khan_passage_count_and_bahaullah_attested():
    passages = _passages_of("kitab-i-iqan-ali-kuli-khan")
    assert len(passages) == 532
    # OCR renders the curly apostrophes in "Bahá'u'lláh" inconsistently;
    # `.?` tolerates zero or one apostrophe-like character per gap.
    _assert_figure_attested(passages, r"Baha.?u.?llah|Bahaullah")


# --------------------------------------------------------------------------
# load() against one real, small file end to end
# --------------------------------------------------------------------------

def test_load_against_one_real_small_record_end_to_end():
    dhammapada = sht._TEXT_RECORDS_BY_ID["dhammapada-muller"]
    corpus = sht.load(records=(dhammapada,))
    assert list(corpus.sources) == ["dhammapada-muller"]
    assert corpus.sources["dhammapada-muller"].stemma_parents == ["buddhism"]
    assert len(corpus.evidence) > 0
    for item in corpus.evidence:
        assert item.source_id == "dhammapada-muller"


def test_load_missing_file_raises(tmp_path):
    missing = dataclasses.replace(sht.TEXT_RECORDS[0], path=tmp_path / "no-such-file.txt")
    with pytest.raises(FileNotFoundError):
        sht.load(records=(missing,))


# --------------------------------------------------------------------------
# registration
# --------------------------------------------------------------------------

def test_sacred_history_texts_registered_in_cli_and_runner_loaders():
    from hte.cli import _CORPUS_LOADERS as cli_loaders
    from hte.runner import _CORPUS_LOADERS as runner_loaders

    assert cli_loaders["sacred-history-texts"] is sht.load
    assert runner_loaders["sacred-history-texts"] is sht.load
