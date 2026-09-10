"""Ingest the `education-atlas` sample tables, its two synthesis docs, and
this repo's own local education content mirror into an `hte.corpus.Corpus`,
so K-12 education research arriving through Bucket's education work can run
through the same engine loop `hte.corpus.quantum_history` and `hte.corpus.
fixtures` already feed.

`education-atlas` (GitHub `bucket-foundation/education-atlas`, a sibling
repo this one does not vendor) ships `data/processed/sample/` as four
Parquet tables, `country` (25 sample countries), `indicator` (30 indicators),
`observation` (one row per country x indicator x year, ~4.3k rows over
2010-2024), and `problem` (one scored country x level x indicator problem
profile per row, gap/trend/severity against an SDG-4 benchmark), plus
`docs/EDUCATION_PROBLEMS.md` and `docs/REFORM_THESIS.md`, its quantitative
problem atlas and its reform argument in prose. This repo's own
`src/content/education/*.md` mirrors some of that prose locally for the
bucket.foundation site.

Mapping decisions this module makes, each one a reading of what "the
right `EvidenceKind`/tier/slot" means for a corpus of national education
statistics rather than the ancient-history or quantum-history prose
`hte.corpus.quantum_history` and `hte.corpus.fixtures` were built against:

- **Kind.** Every observation and problem row becomes `EvidenceKind.
  MODEL_PRIOR`. None of the nine kinds `hte.evidence.EvidenceKind` names
  is "a modeled or survey-estimated national statistic" outright; a World
  Bank EdStats rate, a PISA IRT-scaled score, and an OWID long-run series
  are each the output of an estimation methodology instead of a direct
  material trace or a primary textual assertion, so `MODEL_PRIOR` (defined
  upstream for an LLM's own trained recall) is this adapter's own
  extension of that kind's meaning to a second sense, "an estimate a
  model produced," the closest of the nine to what these rows are. Every
  doc paragraph (`EDUCATION_PROBLEMS.md`, `REFORM_THESIS.md`, and this
  repo's own local mirror) becomes `EvidenceKind.TEXTUAL`, an ordinary
  prose assertion, matching `hte.corpus.quantum_history`'s own reading of
  its milestone and claim bullets.
- **Tier.** By source: World Bank and UNESCO UIS observations at `T2`,
  OWID at `T3`, PISA (`oecd_pisa`) at `T2`, fixed by this module's own
  brief rather than derived from anything in the sample data itself. A
  problem-profile ground-truth item, one step more computed than its own
  underlying observations (`problem.severity`/`gap`/`trend_slope` are
  themselves derived from the same T2/T3 rows), sits at `T3`, matching
  `hte.corpus.quantum_history`'s own `_CHAPTER.md` precedent (a chapter-
  level synthesis with no per-claim tier of its own reads at `T3`). A doc
  paragraph reads at `T4`.
- **Slots.** ACTOR is the observed country's own polity concept
  (`polity-<iso3>`, "the education system of <country>"), distinct from
  the generic ministries/teachers/families/NGOs/funders actors the shipped
  vocabulary also carries (those exist for a doc paragraph naming one of
  them without naming a country, and for the generator's own combinatorial
  reach beyond what any one row asserts). ACTION is one of `improved`/
  `worsened`/`stagnant`, read off the indicator's own trend within its
  country (`_classify_direction` below, method and threshold documented
  there). OBJECT is the indicator's own concept (`<code>` lower-cased,
  dots to hyphens). PLACE is the country's own place concept
  (`country-<iso3>`), a second, distinct vocabulary entry from its ACTOR
  polity concept in the same slot family the way `hte.corpus.
  quantum_history`'s actors and places never collide either. MECHANISM
  defaults to `OTHER` (the slot's own open-world placeholder, an explicit
  "some unnamed mechanism operates" reading, distinct from `None`'s
  "nothing here asserts a mechanism at all") unless a doc paragraph
  names both that country and one of this module's seven mechanism
  causes in the same paragraph (`_detect_mechanism` below), in which case every observation
  and problem-profile item for that country carries the named mechanism
  instead. A doc paragraph's own EvidenceItem always reads ACTOR/ACTION/
  MECHANISM as `OTHER`; only its PLACE and OBJECT resolve to a specific
  concept, and only when that paragraph's own text names a sample
  country or indicator (`_detect_country`/`_detect_indicator` below).
- **Ground truth.** Every problem-profile row whose `severity` is at or
  above `SEVERITY_EVENT_THRESHOLD` (50.0, the midpoint of `problem.
  severity`'s own shipped 0-100 scale) is a dated event at its own
  `latest_year`, with an `EvidenceItem` alongside it carrying the same
  slots (`GroundTruthEvent` itself has no slot fields; the paired
  `EvidenceItem`, sharing its id, is what `hte.calibrate`'s holdout reads
  for a placement candidate, the same one-id-shared-between-both-records
  shape `hte.corpus.quantum_history`'s own milestone bullets use).
  `discovery_year` is read equal to the event's own year, this module's
  own documented simplification, matching both shipped corpora
  (`GroundTruthEvent.discovery_year`'s own docstring).
- **Stemma.** `data/MANIFEST.json` (the atlas's own published-table
  ledger) carries only each table's flat list of contributing `source`
  names, no per-indicator lineage field; it does not, today, say which
  OWID series derives from which World Bank or UIS one. The one such
  relationship the atlas documents anywhere is its own OWID connector's
  module docstring (`edu/connectors/owid.py`): the long-run mean-years-of-
  schooling series "complements the WB enrollment/completion flow." This
  module reads that documented relationship as its stemma rule, since
  the manifest itself states none: an OWID `Source` for a country whose observation rows
  also produced a World Bank `Source` for that same country carries that
  World Bank source as its one stemma parent (`_OWID_DOCUMENTED_ORIGIN_
  SOURCE` below); every other source pair carries none, since nothing
  else in the atlas states a cross-source origin. A local doc that
  mirrors one of the two atlas docs verbatim (this repo's own
  `EDUCATION_PROBLEMS.md`/`REFORM_THESIS.md` copies do, byte for byte, as
  of this module's own writing) carries that atlas doc as its stemma
  parent instead, a real textual-tradition mirror rather than a
  fabricated one.
- **No LLM call.** Every slot this module fills is read off the sample's
  own structured columns or off simple keyword/substring matching against
  a paragraph's own text, matching `hte.corpus.quantum_history`'s own
  "no extraction pass would improve on reading the structure directly"
  stance; this corpus's own structure (a typed row, or a named country
  and a named cause in the same paragraph) is exactly that kind of
  structure.
- **Pandas is optional, Parquet is not.** `data/processed/sample/` ships
  its four tables as `.parquet` only, a binary columnar format with no
  pure-stdlib decoder; a `pandas`-less environment cannot read them at
  all by any means this module provides. `_read_table` below still
  defines a stdlib-only fallback, reading a `<table>.csv` sibling next to
  the `.parquet` file if a caller has placed one there, since a future
  atlas release (or a caller's own export) might ship one; against the
  atlas's real, current, parquet-only sample, that fallback raises a
  `RuntimeError` naming this exact limit rather than returning a
  silently empty corpus.
"""
from __future__ import annotations

import csv
import os
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from ..concepts import Slot, Vocabulary, other_id
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

try:
    import pandas as pd
    _HAVE_PANDAS = True
except ImportError:  # pragma: no cover - exercised only in a pandas-less environment
    pd = None  # type: ignore[assignment]
    _HAVE_PANDAS = False

# `tools/hypothesis-engine/hte/corpus/education_atlas.py` -> parents[1] is
# `hte/`, matching `hte.concepts.SEED_VOCAB_PATH`'s own `Path(__file__).
# parent / "data"` convention one level down from a `corpus/` submodule.
EDUCATION_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-education-seed.json"

# `education-atlas` is a sibling repo, cloned next to this one, outside
# this repo's own tree; there is no `parents[N]` path to it the way
# `hte.corpus.quantum_history.DEFAULT_CORPUS_DIR` reaches `quantum/07-
# history` inside this repo. `parents[4]` is this repo's own root
# (`bucket-foundation/`, the same depth `quantum_history.
# DEFAULT_CORPUS_DIR` climbs to).
_REPO_ROOT = Path(__file__).resolve().parents[4]


def _resolve_education_atlas_root() -> Path | None:
    """The `education-atlas` sibling checkout's own repo root, or `None`
    when none of the three candidates below can be found: this repo's
    own clone layout varies (a worktree, a fork checked out somewhere
    other than `~/agfarms/bucket-foundation`), so `~/agfarms/education-
    atlas` is one convention this org follows, one candidate among
    three rather than a guarantee.

    Checked in order: `$EDUCATION_ATLAS_DIR` (an explicit override,
    trusted at whatever path it names; `load()`'s own `FileNotFoundError`
    is what checks the sample subdirectory underneath it once read, the
    same contract an explicit `sample_dir` argument already carries);
    then `../education-atlas` relative to this repo's own root (a
    sibling checkout inside whatever parent directory this repo itself
    was cloned into); then `~/agfarms/education-atlas` (this org's own
    default convention, `CLAUDE.md`'s "Most venture folders" note), each
    of the latter two checked for existence before it is returned."""
    env = os.environ.get("EDUCATION_ATLAS_DIR")
    if env:
        return Path(env)
    for candidate in (_REPO_ROOT.parent / "education-atlas", Path.home() / "agfarms" / "education-atlas"):
        if candidate.is_dir():
            return candidate
    return None


_EDUCATION_ATLAS_ROOT = _resolve_education_atlas_root()
# `None` when no sibling checkout was found anywhere above: `load()`'s
# own `_resolve_sample_dir` still honors an explicit `sample_dir`
# argument or `EDUCATION_ATLAS_SAMPLE_DIR` even then, and raises a named
# `FileNotFoundError` rather than an `AttributeError` on `None` if a
# caller falls all the way through to this default with neither set.
DEFAULT_SAMPLE_DIR: Path | None = (
    _EDUCATION_ATLAS_ROOT / "data" / "processed" / "sample" if _EDUCATION_ATLAS_ROOT is not None else None
)

# This repo's own local mirror of the atlas's education content
# (`src/content/education/*.md`, non-recursive: the three top-level docs,
# not the `deep/`/`foundations/`/`landscape/` subdirectories, per the
# literal glob this module was asked to read).
LOCAL_EDUCATION_CONTENT_DIR = _REPO_ROOT / "src" / "content" / "education"

_ATLAS_DOC_NAMES = ("EDUCATION_PROBLEMS.md", "REFORM_THESIS.md")

TIER_BY_DATASET: dict[str, Tier] = {
    "worldbank": Tier.T2,
    "unesco": Tier.T2,
    "owid": Tier.T3,
    "oecd_pisa": Tier.T2,
}
DOC_TIER = Tier.T4
PROBLEM_TIER = Tier.T3

# `problem.severity` ships already normalized to a 0-100 scale; 50.0 is
# that scale's own midpoint, read as "more than half-severe" rather than
# a value fit to produce any particular event count. It happens to clear
# 125 of the sample's 638 problem rows, well past this module's own
# floor of at least 20 (`tests/test_corpus_education_atlas.py`).
SEVERITY_EVENT_THRESHOLD = 50.0

# A country-indicator series' own trend direction (`_classify_direction`)
# reads as `"stagnant"` unless the endpoint-to-endpoint slope clears this
# fraction of the series' own current-value scale per year; below it, a
# real-valued series' own noise is indistinguishable from a real move at
# the resolution this sample's own yearly rows carry.
TREND_EPSILON = 0.005

# `edu/connectors/owid.py`'s own module docstring, the atlas's one stated
# cross-source lineage relationship (`data/MANIFEST.json` states none);
# see this module's own top docstring, "Stemma," above.
_OWID_DOCUMENTED_ORIGIN_DATASET = "worldbank"

# The seven MECHANISM causes `_detect_mechanism` reads a doc paragraph
# against, each a short keyword list rather than a single label, since a
# cause shows up in flowing prose ("underfunded," "a teacher shortage")
# more than as its own vocabulary label verbatim.
MECHANISM_KEYWORDS: dict[str, tuple[str, ...]] = {
    "funding": ("underfund", "financing crisis", "% of gdp", "government expenditure", "education spending"),
    "teacher-supply": ("teacher shortage", "trained teachers", "pupil-teacher ratio", "teacher supply"),
    "curriculum": ("curriculum",),
    "language-of-instruction": ("language of instruction", "mother tongue", "medium of instruction"),
    "conflict": ("conflict", "displaced", "refugee", "war-affected", "armed conflict"),
    "pandemic-closure": ("pandemic", "covid", "school closure", "school closures"),
    "measurement-change": ("revised methodology", "methodology change", "data revision", "rebasing"),
}

_YEAR_RE = re.compile(r"(?<!\d)(19[5-9]\d|20[0-3]\d)(?!\d)")


# --------------------------------------------------------------------------
# small text helpers
# --------------------------------------------------------------------------


def _normalize(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in stripped if not unicodedata.combining(ch)).lower()


def _country_place_id(country_code: str) -> str:
    return f"country-{country_code.lower()}"


def _country_polity_id(country_code: str) -> str:
    return f"polity-{country_code.lower()}"


def _indicator_object_id(indicator_code: str) -> str:
    return indicator_code.lower().replace(".", "-")


def load_vocab() -> Vocabulary:
    """The K-12 education seed vocabulary (`hte/data/vocab-education-
    seed.json`): a polity ACTOR and a place PLACE concept per sample
    country, an OBJECT concept per sample indicator, the three trend-
    direction ACTION concepts `_classify_direction` names, and the seven
    MECHANISM causes `_detect_mechanism` looks for, plus five generic
    non-country actors and five non-consensus actors a doc paragraph can
    still name without naming a specific country's own polity."""
    return Vocabulary.load(EDUCATION_VOCAB_PATH)


# --------------------------------------------------------------------------
# table loading (`bkt-hte-...`: pandas preferred, stdlib CSV fallback)
# --------------------------------------------------------------------------


def _read_table(sample_dir: Path, name: str) -> list[dict[str, Any]]:
    """One of the four sample tables (`country`, `indicator`, `observation`,
    `problem`) as a list of plain dicts, one per row. See this module's own
    top docstring, "Pandas is optional, Parquet is not," for why the
    no-pandas fallback below cannot read the atlas's real shipped data."""
    parquet_path = sample_dir / f"{name}.parquet"
    if _HAVE_PANDAS:
        if not parquet_path.is_file():
            raise FileNotFoundError(f"education-atlas sample table not found: {parquet_path}")
        return pd.read_parquet(parquet_path).to_dict("records")

    csv_path = sample_dir / f"{name}.csv"
    if csv_path.is_file():
        with csv_path.open(newline="") as f:
            return list(csv.DictReader(f))
    raise RuntimeError(
        "pandas is not installed, and no CSV mirror was found at "
        f"{csv_path}. The education-atlas sample ships its four tables as "
        "`.parquet` only, a binary columnar format with no pure-stdlib "
        "decoder, so this stdlib-only fallback cannot read the atlas's "
        "real shipped data. Install pandas (with pyarrow or fastparquet) "
        f"to load the shipped sample, or place a `{name}.csv` mirror of "
        f"the same rows next to {parquet_path} first."
    )


def _resolve_sample_dir(sample_dir: str | Path | None) -> Path:
    if sample_dir is not None:
        return Path(sample_dir)
    env = os.environ.get("EDUCATION_ATLAS_SAMPLE_DIR")
    if env:
        return Path(env)
    if DEFAULT_SAMPLE_DIR is None:
        raise FileNotFoundError(
            "education-atlas checkout not found; set EDUCATION_ATLAS_DIR (the repo root) "
            "or EDUCATION_ATLAS_SAMPLE_DIR (the sample directory directly), or clone the "
            "sibling repo to ../education-atlas or ~/agfarms/education-atlas"
        )
    return DEFAULT_SAMPLE_DIR


def _atlas_docs_dir(sample_dir: Path) -> Path:
    """`<atlas repo root>/docs`, three levels above `data/processed/
    sample` the way `sample_dir` itself is always shaped."""
    return sample_dir.resolve().parents[2] / "docs"


def _local_doc_paths() -> list[Path]:
    if not LOCAL_EDUCATION_CONTENT_DIR.is_dir():
        return []
    return sorted(LOCAL_EDUCATION_CONTENT_DIR.glob("*.md"))


# --------------------------------------------------------------------------
# trend direction (ACTION)
# --------------------------------------------------------------------------


def _classify_direction(slope: float, direction: str, current_value: float) -> str:
    """`"improved"`/`"worsened"`/`"stagnant"` for one endpoint-to-endpoint
    yearly `slope` (last observed value minus first, divided by the
    number of years spanned; `problem.trend_slope` directly, for a
    ground-truth item), read against the indicator's own stated
    `direction` (`indicator.direction`: `"higher_better"`, `"lower_
    better"`, or `"target_one"`, a gender-parity-style indicator whose
    ideal value is exactly 1.0) and its own current value (used only to
    scale the stagnation threshold, and, for `target_one`, to read which
    side of 1.0 the series sits on).

    `TREND_EPSILON` (0.5% of `abs(current_value)` per year, floored at
    `1e-6` to stay finite at a current value of exactly zero) is the
    threshold below which a slope reads as noise rather than a real
    move; an unlisted `direction` code defaults to the `"higher_better"`
    reading, and a `target_one` series sitting exactly at 1.0 that still
    moves reads as `"worsened"` (any move away from the exact target is
    one, regardless of which side it moves toward)."""
    eps = TREND_EPSILON * max(abs(current_value), 1e-6)
    if abs(slope) <= eps:
        return "stagnant"
    if direction == "lower_better":
        improved = slope < 0
    elif direction == "target_one":
        improved = (current_value < 1.0 and slope > 0) or (current_value > 1.0 and slope < 0)
    else:
        improved = slope > 0
    return "improved" if improved else "worsened"


def _trend_directions(
    observation_rows: list[dict[str, Any]],
    indicator_by_code: dict[str, dict[str, Any]],
) -> dict[tuple[str, str], str]:
    """`{(country_code, indicator_code) -> action}` off each group's own
    first and last observed year in `observation_rows` (already sorted by
    year within the group here); a group with only one observed year
    reads as `"stagnant"` (no trend evidence)."""
    by_group: dict[tuple[str, str], list[tuple[int, float]]] = {}
    for row in observation_rows:
        key = (str(row["country_code"]), str(row["indicator_code"]))
        by_group.setdefault(key, []).append((int(row["year"]), float(row["value"])))

    directions: dict[tuple[str, str], str] = {}
    for key, points in by_group.items():
        points.sort()
        first_year, first_value = points[0]
        last_year, last_value = points[-1]
        if last_year == first_year:
            directions[key] = "stagnant"
            continue
        slope = (last_value - first_value) / (last_year - first_year)
        direction = str(indicator_by_code.get(key[1], {}).get("direction", "higher_better"))
        directions[key] = _classify_direction(slope, direction, last_value)
    return directions


# --------------------------------------------------------------------------
# doc paragraph detection (PLACE / OBJECT / mechanism causes)
# --------------------------------------------------------------------------


def _detect_country(text: str, country_by_code: dict[str, dict[str, Any]]) -> tuple[str | None, str | None]:
    """`(place_concept_id, country_code)` for the longest sample-country
    name found as a whole word in `text` (case- and accent-insensitive),
    or `(None, None)` when no sample country is named."""
    lowered = _normalize(text)
    best: tuple[int, str, str] | None = None
    for code, row in country_by_code.items():
        name = str(row["name"])
        pattern = r"\b" + re.escape(_normalize(name)) + r"\b"
        if re.search(pattern, lowered) and (best is None or len(name) > best[0]):
            best = (len(name), _country_place_id(code), code)
    return (best[1], best[2]) if best else (None, None)


def _detect_indicator(text: str, indicator_by_code: dict[str, dict[str, Any]]) -> str | None:
    """The OBJECT concept id of the sample indicator `text` names, tried
    first by its own literal code (case-sensitive, since a doc cites one
    verbatim in backticks, `` `SE.LPV.PRIM` ``) and falling back to the
    longest indicator name found as a substring (case-insensitive), or
    `None` when neither names one."""
    for code in indicator_by_code:
        if code in text:
            return _indicator_object_id(code)
    lowered = _normalize(text)
    best: tuple[int, str] | None = None
    for code, row in indicator_by_code.items():
        name = _normalize(str(row["name"]))
        if name and name in lowered and (best is None or len(name) > best[0]):
            best = (len(name), _indicator_object_id(code))
    return best[1] if best else None


def _detect_mechanism(text: str) -> str | None:
    """The first `MECHANISM_KEYWORDS` entry whose own keyword list has a
    hit in `text` (case- and accent-insensitive), or `None`."""
    lowered = _normalize(text)
    for mechanism_id, keywords in MECHANISM_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return mechanism_id
    return None


def _extract_year_interval(text: str) -> Interval | None:
    """The min/max of every 1950-2039 year `text` names, as a point or
    span `Interval`, or `None` when it names no such year."""
    years = [int(y) for y in _YEAR_RE.findall(text)]
    return Interval(start=min(years), end=max(years)) if years else None


def _paragraphs_with_spans(raw: str) -> list[tuple[str, int, int]]:
    """`raw` split on blank lines into `(quote, char_start, char_end)`
    triples, one per paragraph-sized block (at least 40 characters,
    skipping a block that opens with a heading marker, a Markdown table
    row, or a code fence, none of which reads as flowing prose worth its
    own `EvidenceItem`). Every returned `quote` is verbatim, locatable at
    its own `char_start:char_end` in `raw` (`hte.corpus.quantum_history`'s
    own `_locate` does the same for its bullets)."""
    blocks = re.split(r"\n\s*\n", raw)
    out: list[tuple[str, int, int]] = []
    cursor = 0
    for block in blocks:
        stripped = block.strip()
        if len(stripped) < 40 or stripped.startswith(("#", "|", "```", ">")):
            continue
        idx = raw.find(stripped, cursor)
        if idx < 0:
            idx = raw.find(stripped)
        if idx < 0:
            continue
        out.append((stripped, idx, idx + len(stripped)))
        cursor = idx + len(stripped)
    return out


def _ingest_docs(
    sample_dir: Path,
    country_by_code: dict[str, dict[str, Any]],
    indicator_by_code: dict[str, dict[str, Any]],
) -> tuple[dict[str, Source], list[EvidenceItem], list[RetrievalEnvelope], dict[str, str]]:
    """The two atlas docs plus this repo's own local education content
    mirror (`LOCAL_EDUCATION_CONTENT_DIR`), each as a `Source` and a list
    of paragraph `EvidenceItem`s, plus `{country_code -> mechanism_id}`
    for every country a paragraph names alongside one of `MECHANISM_
    KEYWORDS`' causes (this module's own "MECHANISM = OTHER unless the
    docs name a cause" rule, applied at the country level: the first
    cause named for a country stands for that whole country, since these
    docs argue about a country's education system as a whole rather than
    naming a cause per indicator)."""
    sources: dict[str, Source] = {}
    evidence: list[EvidenceItem] = []
    provenance: list[RetrievalEnvelope] = []
    mechanism_by_country: dict[str, str] = {}
    fetched_at = datetime.now(timezone.utc).isoformat()

    atlas_dir = _atlas_docs_dir(sample_dir)
    doc_specs: list[tuple[str, Path]] = []
    atlas_slugs: set[str] = set()
    for name in _ATLAS_DOC_NAMES:
        path = atlas_dir / name
        if path.is_file():
            slug = f"atlas-{Path(name).stem}"
            doc_specs.append((slug, path))
            atlas_slugs.add(slug)
    for path in _local_doc_paths():
        doc_specs.append((f"local-{path.stem}", path))

    for slug, path in doc_specs:
        raw = path.read_text()
        stemma_parents: list[str] = []
        if slug.startswith("local-"):
            mirrored_atlas_slug = f"atlas-{slug[len('local-'):]}"
            if mirrored_atlas_slug in atlas_slugs:
                stemma_parents = [mirrored_atlas_slug]

        sources[slug] = Source(id=slug, kind=EvidenceKind.TEXTUAL, date=None, stemma_parents=stemma_parents)
        provenance.append(RetrievalEnvelope(
            retrieval_run_id="fixture-education-atlas-ingest", doc_id=slug, source_path=str(path),
            fetched_at=fetched_at, fixture=True, citation_count=None, lineage_count=len(stemma_parents),
        ))

        for i, (quote, start, end) in enumerate(_paragraphs_with_spans(raw)):
            place_id, country_code = _detect_country(quote, country_by_code)
            object_id = _detect_indicator(quote, indicator_by_code)
            evidence.append(EvidenceItem(
                id=f"{slug}-p{i}", kind=EvidenceKind.TEXTUAL, tier=DOC_TIER, source_id=slug,
                span=EvidenceSpan(doc_id=slug, locator=f"paragraph:{i}", quote=quote, char_start=start, char_end=end),
                provenance="education-atlas-doc-paragraph",
                actor=other_id(Slot.ACTOR),
                action=other_id(Slot.ACTION),
                object=object_id if object_id is not None else other_id(Slot.OBJECT),
                place=place_id if place_id is not None else other_id(Slot.PLACE),
                mechanism=other_id(Slot.MECHANISM),
                interval=_extract_year_interval(quote),
                stance=Stance.POSITIVE,
            ))
            if country_code is not None and country_code not in mechanism_by_country:
                mechanism_id = _detect_mechanism(quote)
                if mechanism_id is not None:
                    mechanism_by_country[country_code] = mechanism_id

    return sources, evidence, provenance, mechanism_by_country


# --------------------------------------------------------------------------
# main entry point
# --------------------------------------------------------------------------


def load(
    sample_dir: str | Path | None = None,
    *,
    countries: Iterable[str] | None = None,
    levels: Iterable[str] | None = None,
    years: tuple[int, int] = (2000, 2024),
) -> Corpus:
    """The education-atlas sample as a `Corpus`: a `Source` per (dataset,
    country) pair present in the filtered observations, plus one shared
    `Source` for the problem-profile ground truth and one per ingested
    doc; an `EvidenceItem` per observation row and per severity-flagged
    problem row (`SEVERITY_EVENT_THRESHOLD`); a `GroundTruthEvent` per
    flagged problem row; and every doc/local-content paragraph as a
    textual `EvidenceItem` (see this module's own top docstring for the
    full mapping).

    `countries` (ISO3 codes, case-insensitive) and `levels` (`indicator.
    level`/`observation.level` values, e.g. `"primary"`, exact match)
    restrict which sample rows are read; `None` (the default for both)
    reads every sample country or level. `years` restricts observation
    rows to `observation.year` and problem rows to `problem.latest_year`,
    both inclusive; the default `(2000, 2024)` covers the shipped
    sample's own full 2010-2024 span. None of the three filters restricts
    which doc/local-content paragraphs are ingested: the qualitative
    narrative is the same document regardless of which quantitative slice
    a caller is holding out, and splitting it per country or year would
    need a real extraction pass this module does not build.

    Raises `FileNotFoundError` if the resolved `sample_dir` is not a
    directory, rather than returning a silently empty corpus."""
    directory = _resolve_sample_dir(sample_dir)
    if not directory.is_dir():
        raise FileNotFoundError(f"education-atlas sample directory not found: {directory}")

    country_rows = _read_table(directory, "country")
    indicator_rows = _read_table(directory, "indicator")
    observation_rows = _read_table(directory, "observation")
    problem_rows = _read_table(directory, "problem")

    if countries is not None:
        wanted_countries = {c.upper() for c in countries}
        country_rows = [r for r in country_rows if str(r["country_code"]) in wanted_countries]
    country_by_code = {str(r["country_code"]): r for r in country_rows}
    kept_country_codes = set(country_by_code)

    indicator_by_code = {str(r["indicator_code"]): r for r in indicator_rows}
    level_set = {str(level) for level in levels} if levels is not None else None
    year_lo, year_hi = years

    def _kept(row: dict[str, Any], year_field: str) -> bool:
        if str(row["country_code"]) not in kept_country_codes:
            return False
        if level_set is not None and str(row["level"]) not in level_set:
            return False
        return year_lo <= int(row[year_field]) <= year_hi

    observation_rows = [r for r in observation_rows if _kept(r, "year")]
    problem_rows = [r for r in problem_rows if _kept(r, "latest_year")]

    vocab = load_vocab()
    sources, evidence, provenance, mechanism_by_country = _ingest_docs(directory, country_by_code, indicator_by_code)
    ground_truth: list[GroundTruthEvent] = []
    fetched_at = datetime.now(timezone.utc).isoformat()

    dataset_country_pairs = sorted({(str(r["source"]), str(r["country_code"])) for r in observation_rows})
    pair_set = set(dataset_country_pairs)
    for dataset, code in dataset_country_pairs:
        source_id = f"{dataset}-{code}"
        stemma_parents: list[str] = []
        if dataset == "owid" and (_OWID_DOCUMENTED_ORIGIN_DATASET, code) in pair_set:
            stemma_parents = [f"{_OWID_DOCUMENTED_ORIGIN_DATASET}-{code}"]
        sources[source_id] = Source(id=source_id, kind=EvidenceKind.MODEL_PRIOR, date=None, stemma_parents=stemma_parents)
        provenance.append(RetrievalEnvelope(
            retrieval_run_id="fixture-education-atlas-ingest", doc_id=source_id,
            source_path=str(directory / "observation.parquet"), fetched_at=fetched_at,
            fixture=True, citation_count=None, lineage_count=len(stemma_parents),
        ))

    action_by_group = _trend_directions(observation_rows, indicator_by_code)
    for i, row in enumerate(observation_rows):
        code = str(row["country_code"])
        indicator_code = str(row["indicator_code"])
        dataset = str(row["source"])
        year = int(row["year"])
        value = float(row["value"])
        source_id = f"{dataset}-{code}"
        quote = f"{code} {indicator_code} {year}: {value} {row['unit']} ({dataset}, obs_id={row['obs_id']})"
        evidence.append(EvidenceItem(
            id=f"obs-{row['obs_id']}", kind=EvidenceKind.MODEL_PRIOR,
            tier=TIER_BY_DATASET.get(dataset, Tier.T4), source_id=source_id,
            span=EvidenceSpan(doc_id=source_id, locator=f"row:{i}", quote=quote, char_start=0, char_end=len(quote)),
            provenance="education-atlas-observation",
            actor=_country_polity_id(code),
            action=action_by_group.get((code, indicator_code), "stagnant"),
            object=_indicator_object_id(indicator_code),
            place=_country_place_id(code),
            mechanism=mechanism_by_country.get(code, other_id(Slot.MECHANISM)),
            interval=Interval(start=year, end=year),
            stance=Stance.POSITIVE,
        ))

    problem_source_id = "education-atlas-problem-profiles"
    flagged_problems = [r for r in problem_rows if float(r["severity"]) >= SEVERITY_EVENT_THRESHOLD]
    if flagged_problems:
        sources[problem_source_id] = Source(id=problem_source_id, kind=EvidenceKind.MODEL_PRIOR, date=None, stemma_parents=[])
        provenance.append(RetrievalEnvelope(
            retrieval_run_id="fixture-education-atlas-ingest", doc_id=problem_source_id,
            source_path=str(directory / "problem.parquet"), fetched_at=fetched_at,
            fixture=True, citation_count=None, lineage_count=0,
        ))
    for row in flagged_problems:
        code = str(row["country_code"])
        indicator_code = str(row["indicator_code"])
        year = int(row["latest_year"])
        severity = float(row["severity"])
        latest_value = float(row["latest_value"])
        direction = str(indicator_by_code.get(indicator_code, {}).get("direction", "higher_better"))
        slope_raw = row.get("trend_slope")
        slope = float(slope_raw) if slope_raw is not None and slope_raw == slope_raw else 0.0  # nan != nan
        action = _classify_direction(slope, direction, latest_value)
        country_name = str(country_by_code.get(code, {}).get("name", code))
        indicator_name = str(indicator_by_code.get(indicator_code, {}).get("name", indicator_code))
        quote = (
            f"{code} {indicator_code} severity={severity:.1f} latest_year={year} "
            f"latest_value={latest_value} benchmark={row['benchmark']} "
            f"trend_slope={row.get('trend_slope')} flags={row.get('flags')} "
            f"(problem_id={row['problem_id']})"
        )
        event_id = f"problem-{row['problem_id']}"
        ground_truth.append(GroundTruthEvent(
            id=event_id, label=f"{country_name}: {indicator_name} crossed severity {severity:.1f} in {year}",
            year=year, doc_id=problem_source_id, discovery_year=year,
        ))
        evidence.append(EvidenceItem(
            id=event_id, kind=EvidenceKind.MODEL_PRIOR, tier=PROBLEM_TIER, source_id=problem_source_id,
            span=EvidenceSpan(doc_id=problem_source_id, locator=f"problem:{row['problem_id']}", quote=quote, char_start=0, char_end=len(quote)),
            provenance="education-atlas-problem-ground-truth",
            actor=_country_polity_id(code),
            action=action,
            object=_indicator_object_id(indicator_code),
            place=_country_place_id(code),
            mechanism=mechanism_by_country.get(code, other_id(Slot.MECHANISM)),
            interval=Interval(start=year, end=year),
            stance=Stance.POSITIVE,
        ))

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=vocab)


__all__ = ["load", "load_vocab", "DEFAULT_SAMPLE_DIR", "EDUCATION_VOCAB_PATH", "SEVERITY_EVENT_THRESHOLD"]
