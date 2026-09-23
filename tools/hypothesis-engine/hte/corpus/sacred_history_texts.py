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

_REPO_ROOT = Path(__file__).resolve().parents[4]

DEFAULT_CACHE_DIR = Path(__file__).resolve().parents[1] / "data" / "llm-cache-sacred-history-texts"

@dataclasses.dataclass(frozen=True)
class TextRecord:
    text_id: str
    tradition: str
    path: Path
    language: str
    edition_label: str
    edition_year: int | None

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
    TextRecord(
        text_id="quran-rodwell", tradition="islam",
        path=_REPO_ROOT / "gutenberg" / "PG-2800-the-koran-al-quran-rodwell" / "PG-2800.txt",
        language="en", edition_label="Rodwell (trans.), The Koran (Al-Qur'an), 2nd ed. (1876)",
        edition_year=1876,
    ),
    TextRecord(
        text_id="hesiod-homeric-hymns-evelyn-white", tradition="greek",
        path=_REPO_ROOT / "gutenberg" / "PG-348-hesiod-the-homeric-hymns-and-homerica" / "PG-348.txt",
        language="en",
        edition_label="Evelyn-White (trans.), Hesiod, the Homeric Hymns, and Homerica (Loeb Classical Library, 1914)",
        edition_year=1914,
    ),
    TextRecord(
        text_id="avesta-vendidad-darmesteter", tradition="zoroastrianism",
        path=_REPO_ROOT / "archive" / "india.history.resource.85791" / "85791_djvu.txt",
        language="en",
        edition_label="Darmesteter (trans.), The Zend-Avesta Part I: The Vendidad, Sacred Books of the East vol. IV (1880)",
        edition_year=1880,
    ),
    TextRecord(
        text_id="avesta-part2-darmesteter", tradition="zoroastrianism",
        path=_REPO_ROOT / "archive" / "wg923" / "WG923-1883 -The Sacred Books of East - Vol 23 of 50 - Zoroastrianism-Zend Avesta -Part 2 of 3_djvu.txt",
        language="en",
        edition_label="Darmesteter (trans.), The Zend-Avesta Part II, Sacred Books of the East vol. XXIII (1883)",
        edition_year=1883,
    ),
    TextRecord(
        text_id="avesta-part3-mills", tradition="zoroastrianism",
        path=_REPO_ROOT / "archive" / "wg931" / "WG931-1887 -The Sacred Books of East - Vol 31 of 50 -Zoroastrianism-Zend Avesta -Part 3 of 3_djvu.txt",
        language="en",
        edition_label="Mills (trans.), The Zend-Avesta Part III (Yasna, Visparad, Afrinagan, Gahs), Sacred Books of the East vol. XXXI (1887)",
        edition_year=1887,
    ),
    TextRecord(
        text_id="gilgamesh-thompson", tradition="mesopotamian",
        path=_REPO_ROOT / "archive" / "thompson-1928-gilgamesh" / "Thompson_1928_Gilgamesh_djvu.txt",
        language="en",
        edition_label="Thompson, The Epic of Gilgamish: Text, Transliteration, and Notes (London, 1928)",
        edition_year=1928,
    ),
    TextRecord(
        text_id="enuma-elish-king", tradition="mesopotamian",
        path=_REPO_ROOT / "archive" / "the-seven-tablets-of-creation.-vol.-1" / "The seven tablets of creation. Vol. 1_djvu.txt",
        language="en",
        edition_label="King, The Seven Tablets of Creation, or the Babylonian and Assyrian Legends Concerning the Creation of the World and of Mankind, Vol. I (1902)",
        edition_year=1902,
    ),
    TextRecord(
        text_id="jaina-sutras-part1-jacobi", tradition="jainism",
        path=_REPO_ROOT / "archive" / "in.ernet.dli.2015.37732" / "2015.37732.Jaina-Sutras--Pt-1_djvu.txt",
        language="en",
        edition_label="Jacobi (trans.), Jaina Sutras Part I (Akaranga Sutra, Kalpa Sutra), Sacred Books of the East vol. XXII (1884)",
        edition_year=1884,
    ),
    TextRecord(
        text_id="jaina-sutras-part2-jacobi", tradition="jainism",
        path=_REPO_ROOT / "archive" / "mlbd.gainasutraspart20000vol-45.unse" / "mlbd.gainasutraspart20000vol-45.unse_djvu.txt",
        language="en",
        edition_label="Jacobi (trans.), Jaina Sutras Part II (Uttaradhyayana Sutra, Sutrakritanga Sutra), Sacred Books of the East vol. XLV (1895)",
        edition_year=1895,
    ),
    TextRecord(
        text_id="sikh-religion-vol1-macauliffe", tradition="sikhism",
        path=_REPO_ROOT / "archive" / "in.ernet.dli.2015.45269" / "2015.45269.The-Sikh-Religion--Vol1_djvu.txt",
        language="en",
        edition_label="Macauliffe, The Sikh Religion: Its Gurus, Sacred Writings and Authors, Vol. I (Oxford, Clarendon Press, 1909)",
        edition_year=1909,
    ),
    TextRecord(
        text_id="kitab-i-iqan-ali-kuli-khan", tradition="bahai",
        path=_REPO_ROOT / "archive" / "dli.ministry.10422" / "E01069_The_Book_of_Ighan_djvu.txt",
        language="en",
        edition_label="Baha'u'llah (Ali Kuli Khan, trans.), The Book of Ighan (Kitab-i-Iqan), 3rd ed. (Bahai Publishing Society, Chicago, 1915)",
        edition_year=1915,
    ),
)

_TEXT_RECORDS_BY_ID: dict[str, TextRecord] = {r.text_id: r for r in TEXT_RECORDS}

_PG_START_RE = re.compile(r"\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE | re.DOTALL)
_PG_END_RE = re.compile(r"\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK", re.IGNORECASE)
_BLANK_LINE_RE = re.compile(r"\n\s*\n")
_MIN_PASSAGE_CHARS = 40

def _strip_gutenberg_boilerplate(raw: str) -> str:
    start = _PG_START_RE.search(raw)
    body = raw[start.end():] if start else raw
    end = _PG_END_RE.search(body)
    return body[: end.start()] if end else body

def split_passages(text: str) -> list[tuple[str, str]]:
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
    doc_id = f"{text_id}-{passage_id}"
    result = roles.extract(passage_text, load_vocab(), doc_id=doc_id, cache_dir=str(cache_dir), replay_only=replay_only)
    return [dataclasses.replace(item, source_id=text_id) for item in result.items]

def ingest_passages(
    passages: Sequence[tuple[str, str, str]], *, cache_dir: str | Path = DEFAULT_CACHE_DIR, replay_only: bool = False,
) -> Corpus:
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

SLICE_ONE_PATH = Path(__file__).resolve().parents[1] / "data" / "sacred-history-texts-slice-1-corpus.json"

def load_slice_one() -> Corpus:
    return Corpus.load(SLICE_ONE_PATH)
