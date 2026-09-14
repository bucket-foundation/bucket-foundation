"""Passage-level ingest of the primary texts this repo already mirrors
under `gutenberg/`/`archive/` that carry one of `hte.corpus.sacred_
history`'s 13 traditions' own scripture, commentary, or narrative prose.
`docs/SACRED-HISTORY-TEXTS.md` is this module's own inventory, restated
as a doc: which text maps to which tradition, in what language and
edition, and which of the 13 traditions this repo's own mirror carries no
primary text for at all (7 of 13 as of this module's own first pass:
`islam`, `bahai`, `sikhism`, `jainism`, `greek`, `mesopotamian`,
`zoroastrianism`; see that doc's own "traditions with no text on disk"
table for why each one is absent).

`hte.corpus.sacred_history` reads one compiled JSON bundle (`src/data/
sacred-history.json`) with no LLM call anywhere in it, exactly the
`quantum_history`-style "the structure already states what this module
needs" case. This module is the opposite case: real, unstructured prose,
with no `figures`/`correlations`/`timeline` array to read directly, so
every `EvidenceItem` here comes from `hte.roles.extract`'s three-pass
extractor ensemble (`bkt-hte-extraction-ensemble`) instead, one call-set
per passage.

## Editions, passages, and stemma

`TEXT_RECORDS` names one edition per mapped text: an id, the tradition it
stemmas to, the file on disk, its language, a citation-quality edition
label, and the edition's own year (`None` when the source metadata this
repo mirrors names no clear one, `docs/SACRED-HISTORY-TEXTS.md`'s own
inventory table carries the same field). `_source_for` builds one
`hte.evidence.Source` per edition, `stemma_parents=[tradition]`: the
tradition's own canonical `Source` already exists under that same id in
`hte.corpus.sacred_history.ingest()`'s own `Corpus.sources`
(`_build_sources`, one `Source` per tradition), so an edition's own
`stemma_parents` entry resolves straight to it once both corpora are
merged (`sacred_history.ingest(with_texts=True)`, below), with no id
collision: an edition id (`"kjv-bible"`, `"dhammapada-muller"`, ...) never
collides with a tradition id (`"christianity"`, `"buddhism"`, ...).

`split_passages` (deterministic, paragraph-block splitting: blank-line-
delimited blocks of the file's own text, Project Gutenberg's own license
boilerplate stripped first, whitespace-collapsed, a block under
`_MIN_PASSAGE_CHARS` dropped as a lone heading or page-break artifact
rather than a real passage) gives each edition's own text a stable
`p0000`, `p0001`, ... id sequence in document order. A passage id is
stable across a re-run against the same file: this function reads no
chapter/verse numbering scheme from the source text itself (several of
this module's own editions carry no such scheme at all, `docs/SACRED-
HISTORY-TEXTS.md`'s own inventory notes which ones do), so `p<NNNN>`
naming by block order is this module's own passage-identity contract
instead.

## Fake mode and this module's own fixture

Every passage this module ever hands to `hte.roles.extract` is real prose,
never this package's own synthetic microformat line (`hte.fakellm`'s own
`_MICRO_LINE_RE`, `hte.synth.make_world`'s reading, the only shape
`hte.fakellm._extract` reads a slot value out of), so `HTE_LLM_MODE=fake`
(this module's own no-live-calls contract as of this pass) always takes
`_extract`'s own "whole-document echo, no recognizable microformat line"
branch: one `EvidenceItem` per passage, its quote the passage's own full
text verbatim, no actor/action/object/place/mechanism slot filled, no
interval, a positive stance, tier `T3`, provenance `"llm-extraction-
ensemble"` (the three ensemble passes read the identical passage text
back into the identical prompt suffix regardless of pass angle, so all
three always agree, 1.0, and escalation never fires). `tests/
test_corpus_sacred_history_texts.py`'s own 12-passage fixture
(`FIXTURE_PASSAGES`) hand-writes exactly this shape as its expected
extraction per passage, so the fake path this module's own `load()` and
`ingest_passages()` wire together is tested end to end against a
documented, reasoned-through-by-hand answer, never a value this module's
own code would otherwise be asserting against itself.

In live mode (`HTE_LLM_MODE` unset, a `claude` CLI signed in) the same
three-pass ensemble would instead read each passage's own named actor,
action (predicate), object, place, and mechanism off its prose, with a
real per-quote span, per `hte.roles.extract`'s own prompt; that
extraction is real judgment this module's own fake-mode contract does not
attempt, a separate, later, real-cost campaign's job (`docs/SACRED-
HISTORY-TEXTS.md`'s own cost estimate for what running it over every
`TEXT_RECORDS` edition would take).

## Merging into `sacred-history`

`hte.corpus.sacred_history.ingest(with_texts=True)` calls `load()` here
and folds its `Corpus` into the correlation-derived one that function
already builds: every `Source` and `EvidenceItem` from both corpora,
concatenated; the correlation corpus's own `GroundTruthEvent`s and
`RetrievalEnvelope`s carried through unchanged, since this module
contributes no ground truth of its own (no passage here is a `timeline`-
disputed event or a two-independent-kind-attested correlation, and
fake-mode extraction plants no verified retrieval manifest either); and
the one shared `Vocabulary` (`hte.corpus.sacred_history.load_vocab()`)
both corpora already read concept ids against, so a merged corpus never
carries two different vocabularies disagreeing about what a slot id
means.
"""
from __future__ import annotations

import dataclasses
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from .. import roles
from ..evidence import EvidenceItem, EvidenceKind, Source
from . import Corpus, RetrievalEnvelope
from .sacred_history import load_vocab

_LOGGER = logging.getLogger(__name__)

# `tools/hypothesis-engine/hte/corpus/sacred_history_texts.py` -> parents[4]
# is the repo root (`bucket-foundation/`), the same climb `hte.corpus.
# sacred_history.DEFAULT_CORPUS_PATH` takes from the sibling file at the
# same directory nesting.
_REPO_ROOT = Path(__file__).resolve().parents[4]

# A fallback cache directory (fake mode never reads or writes it, per
# `hte.llm.complete`'s own documented fake-mode contract; a real,
# non-fake run of this module's own `load()` would use it as `hte.roles.
# extract`'s cache, same as every other corpus adapter's own default).
DEFAULT_CACHE_DIR = Path(__file__).resolve().parents[1] / "data" / "llm-cache-sacred-history-texts"


@dataclasses.dataclass(frozen=True)
class TextRecord:
    """One primary-text edition this module ingests (`docs/SACRED-
    HISTORY-TEXTS.md`'s own inventory table, restated as data).
    `text_id` is the edition-level `hte.evidence.Source.id`
    (`stemma_parents=[tradition]`, `_source_for`); `tradition` must
    already be a tradition id `hte.corpus.sacred_history.ingest()`'s own
    `Corpus.sources` carries (one of `src/data/sacred-history.json`'s 13)
    for `sacred_history.ingest(with_texts=True)`'s own merge to attach
    this edition to a real tradition `Source` rather than a dangling
    stemma id. `edition_year` is `None` when this repo's own mirrored
    metadata names no clear single edition year (`docs/SACRED-HISTORY-
    TEXTS.md` names which entries read `None` and why)."""
    text_id: str
    tradition: str
    path: Path
    language: str
    edition_label: str
    edition_year: int | None


# The inventory: every entry here names a `.txt` file this repo mirrors
# under `gutenberg/`/`archive/` carrying real body prose, never a
# `wikisource/` stub page naming only a translation list or a chapter
# index with no verse or paragraph text of its own (`docs/SACRED-HISTORY-
# TEXTS.md`'s own "excluded" table lists every stub this module does not
# read, and why). Six of the compiled bundle's 13 traditions are covered
# here (`christianity`, `judaism`, `tao-confucian`, `buddhism`,
# `hinduism`, `lds`); the other seven carry no primary text in this
# repo's own mirror at all as of this module's first pass.
TEXT_RECORDS: tuple[TextRecord, ...] = (
    TextRecord(
        text_id="kjv-bible", tradition="christianity",
        path=_REPO_ROOT / "gutenberg" / "PG-10-the-king-james-version-of-the-bible" / "PG-10.txt",
        language="en", edition_label="The Bible: King James Version (1611)", edition_year=1611,
    ),
    TextRecord(
        text_id="talmud-legends-baring-gould", tradition="judaism",
        path=_REPO_ROOT / "gutenberg" / "PG-72268-legends-of-old-testament-characters-from-the-talmud-and-other-sources" / "PG-72268.txt",
        language="en",
        edition_label="Baring-Gould, Legends of Old Testament Characters, from the Talmud and Other Sources (1871)",
        edition_year=1871,
    ),
    TextRecord(
        text_id="analects-legge", tradition="tao-confucian",
        path=_REPO_ROOT / "gutenberg" / "PG-3330-the-analects-of-confucius-from-the-chinese-classics" / "PG-3330.txt",
        language="en", edition_label="Legge (trans.), The Analects, The Chinese Classics vol. 1 (1861/1893)",
        edition_year=1893,
    ),
    TextRecord(
        text_id="dhammapada-muller", tradition="buddhism",
        path=_REPO_ROOT / "gutenberg" / "PG-2017-dhammapada-a-collection-of-verses-being-one-of-the-canonical-books-of-" / "PG-2017.txt",
        language="en", edition_label="Müller (trans.), The Dhammapada, Sacred Books of the East vol. 10 (1881)",
        edition_year=1881,
    ),
    TextRecord(
        text_id="bhagavadgita-schroeder", tradition="hinduism",
        path=_REPO_ROOT / "gutenberg" / "PG-33186-bhagavadgita-des-erhabenen-sang-religi-se-stimmen-der-v-lker-die-relig" / "PG-33186.txt",
        language="de", edition_label="von Schroeder (trans.), Bhagavadgita: Des Erhabenen Sang (1912)",
        edition_year=1912,
    ),
    TextRecord(
        text_id="ramayana-buck", tradition="hinduism",
        path=_REPO_ROOT / "archive" / "Ramayana_201808" / "Ramayana_djvu.txt",
        language="en", edition_label="Buck, Ramayana (1976 retelling)", edition_year=1976,
    ),
    TextRecord(
        text_id="mahabharata-complete", tradition="hinduism",
        path=_REPO_ROOT / "archive" / "the-complete-mahabharata" / "The Complete Mahabharata _djvu.txt",
        language="en", edition_label="The Complete Mahabharata (web compilation, edition year not recorded)",
        edition_year=None,
    ),
    TextRecord(
        text_id="book-of-mormon", tradition="lds",
        path=_REPO_ROOT / "gutenberg" / "PG-17-the-book-of-mormon-b-an-account-written-by-the-hand-of-mormon-upon-pla" / "PG-17.txt",
        language="en", edition_label="The Book of Mormon (1830)", edition_year=1830,
    ),
)

_TEXT_RECORDS_BY_ID: dict[str, TextRecord] = {r.text_id: r for r in TEXT_RECORDS}

_PG_START_RE = re.compile(r"\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE | re.DOTALL)
_PG_END_RE = re.compile(r"\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK", re.IGNORECASE)
_BLANK_LINE_RE = re.compile(r"\n\s*\n")
_MIN_PASSAGE_CHARS = 40


def _strip_gutenberg_boilerplate(raw: str) -> str:
    """`raw` with Project Gutenberg's own license header and footer
    removed, when present (`_PG_START_RE`/`_PG_END_RE`, both anchored on
    that license's own fixed `*** START/END OF ... PROJECT GUTENBERG
    EBOOK ... ***` marker lines): a no-op on a file that carries neither
    (every `archive/` edition this module reads, and any future non-
    Gutenberg addition to `TEXT_RECORDS`)."""
    start = _PG_START_RE.search(raw)
    body = raw[start.end():] if start else raw
    end = _PG_END_RE.search(body)
    return body[: end.start()] if end else body


def split_passages(text: str) -> list[tuple[str, str]]:
    """`text` (one edition's own full file content) split into `(passage_
    id, passage_text)` pairs in document order: Gutenberg boilerplate
    stripped first (`_strip_gutenberg_boilerplate`), then a blank-line-
    delimited paragraph split (`_BLANK_LINE_RE`), each block's own
    internal whitespace (line breaks, repeated spaces, a `\\r` a CRLF
    source file carries) collapsed to single spaces. A block whose
    collapsed length falls under `_MIN_PASSAGE_CHARS` is dropped: a bare
    heading, a page-break artifact, or a stray blank-adjacent line, never
    a passage carrying enough prose for `hte.roles.extract`'s own ensemble
    to read a claim out of. `passage_id` is `f"p{n:04d}"` by position
    among the KEPT blocks, `n` starting at 0: stable across a re-run
    against the same file, since neither this rule nor its own inputs
    depend on wall-clock time or iteration order beyond the file's own
    fixed byte content."""
    stripped = _strip_gutenberg_boilerplate(text)
    passages: list[tuple[str, str]] = []
    for block in _BLANK_LINE_RE.split(stripped):
        collapsed = " ".join(block.split())
        if len(collapsed) < _MIN_PASSAGE_CHARS:
            continue
        passages.append((f"p{len(passages):04d}", collapsed))
    return passages


def _source_for(record: TextRecord) -> Source:
    return Source(
        id=record.text_id, kind=EvidenceKind.TEXTUAL,
        date=str(record.edition_year) if record.edition_year is not None else None,
        stemma_parents=[record.tradition],
    )


def _passage_evidence(
    text_id: str, passage_id: str, passage_text: str, *, cache_dir: str | Path, replay_only: bool,
) -> list[EvidenceItem]:
    """One passage read through `hte.roles.extract`'s three-pass ensemble,
    every returned item's own `source_id` remapped from the passage's own
    doc id (`roles.extract`'s own reading: `source_id=doc_id`, the same
    bare id it also writes into `EvidenceSpan.doc_id`) to this passage's
    own EDITION `Source.id` (`text_id`). `roles.extract` has no notion of
    "this document belongs to that edition," only the bare `doc_id` its
    own caller hands it, echoed straight into both fields; this function
    is where that split happens: `EvidenceSpan.doc_id` stays the
    passage's own id (which passage the quote was found in, still
    readable off the returned item), `EvidenceItem.source_id` becomes the
    edition's own id (which `Source`, and so which `stemma_parents`
    entry, this item's own evidentiary weight discounts against, once
    `hte.belief.score`'s `sources=` wiring lands, per `hte.corpus.
    sacred_history`'s own top docstring, "Stemma and transmission")."""
    doc_id = f"{text_id}-{passage_id}"
    result = roles.extract(passage_text, load_vocab(), doc_id=doc_id, cache_dir=str(cache_dir), replay_only=replay_only)
    return [dataclasses.replace(item, source_id=text_id) for item in result.items]


def ingest_passages(
    passages: Sequence[tuple[str, str, str]], *, cache_dir: str | Path = DEFAULT_CACHE_DIR, replay_only: bool = False,
) -> Corpus:
    """`(text_id, passage_id, passage_text)` triples into a `Corpus`: one
    `hte.evidence.Source` per distinct `text_id` (looked up in `TEXT_
    RECORDS`; a `text_id` not registered there raises `KeyError`, since
    there would be no tradition for that edition's own `stemma_parents`
    to name), one or more `EvidenceItem`s per passage (`_passage_
    evidence`), and one fixture `RetrievalEnvelope` per distinct `text_id`
    this call reads evidence for. Takes no dependency on `load`'s
    own disk scan: `tests/test_corpus_sacred_history_texts.py`'s own
    12-passage fixture calls this directly, so a fast, deterministic unit
    test never reads a real multi-megabyte file off disk."""
    sources: dict[str, Source] = {}
    evidence: list[EvidenceItem] = []
    seen_text_ids: list[str] = []
    for text_id, passage_id, passage_text in passages:
        record = _TEXT_RECORDS_BY_ID[text_id]
        if text_id not in sources:
            sources[text_id] = _source_for(record)
            seen_text_ids.append(text_id)
        evidence.extend(_passage_evidence(text_id, passage_id, passage_text, cache_dir=cache_dir, replay_only=replay_only))

    fetched_at = datetime.now(timezone.utc).isoformat()
    provenance = [
        RetrievalEnvelope(
            retrieval_run_id="fixture-sacred-history-texts-ingest", doc_id=text_id,
            source_path=str(_TEXT_RECORDS_BY_ID[text_id].path), fetched_at=fetched_at, fixture=True,
        )
        for text_id in seen_text_ids
    ]
    return Corpus(sources=sources, evidence=evidence, ground_truth=[], provenance=provenance, vocab=load_vocab())


def load(
    records: Sequence[TextRecord] | None = None, *, cache_dir: str | Path = DEFAULT_CACHE_DIR, replay_only: bool = False,
) -> Corpus:
    """`_CORPUS_LOADERS`'s own zero-arg registration (`hte/cli.py`, `hte/
    runner.py`, `"sacred-history-texts"`): every `records` entry's own
    file (`TEXT_RECORDS` when `records` is left `None`, the real,
    complete inventory) read off disk, split into passages (`split_
    passages`), and folded through `ingest_passages`. `records` is
    exposed for a caller wanting a bounded subset (a test reading one
    small real file end to end rather than this module's own full,
    77,000-plus-passage inventory; `docs/SACRED-HISTORY-TEXTS.md`'s own
    cost estimate names the full count). Raises `FileNotFoundError` on
    the first requested record's own path missing from disk: this repo's
    own mirror moved or was never fetched, and raising here keeps this
    function from silently ingesting a partial corpus."""
    chosen = records if records is not None else TEXT_RECORDS
    triples: list[tuple[str, str, str]] = []
    for record in chosen:
        if not record.path.is_file():
            raise FileNotFoundError(f"sacred-history-texts adapter: text not found: {record.path}")
        raw = record.path.read_text(encoding="utf-8", errors="replace")
        for passage_id, passage_text in split_passages(raw):
            triples.append((record.text_id, passage_id, passage_text))
    return ingest_passages(triples, cache_dir=cache_dir, replay_only=replay_only)


__all__ = [
    "TextRecord", "TEXT_RECORDS", "split_passages", "ingest_passages", "load", "DEFAULT_CACHE_DIR",
]
