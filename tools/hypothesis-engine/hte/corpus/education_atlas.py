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

EDUCATION_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-education-seed.json"

_REPO_ROOT = Path(__file__).resolve().parents[4]

def _resolve_education_atlas_root() -> Path | None:
    env = os.environ.get("EDUCATION_ATLAS_DIR")
    if env:
        return Path(env)
    for candidate in (_REPO_ROOT.parent / "education-atlas", Path.home() / "agfarms" / "education-atlas"):
        if candidate.is_dir():
            return candidate
    return None

_EDUCATION_ATLAS_ROOT = _resolve_education_atlas_root()
DEFAULT_SAMPLE_DIR: Path | None = (
    _EDUCATION_ATLAS_ROOT / "data" / "processed" / "sample" if _EDUCATION_ATLAS_ROOT is not None else None
)

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

SEVERITY_EVENT_THRESHOLD = 50.0

TREND_EPSILON = 0.005

_OWID_DOCUMENTED_ORIGIN_DATASET = "worldbank"

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
    return Vocabulary.load(EDUCATION_VOCAB_PATH)

def _read_table(sample_dir: Path, name: str) -> list[dict[str, Any]]:
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
    return sample_dir.resolve().parents[2] / "docs"

def _local_doc_paths() -> list[Path]:
    if not LOCAL_EDUCATION_CONTENT_DIR.is_dir():
        return []
    return sorted(LOCAL_EDUCATION_CONTENT_DIR.glob("*.md"))

def _classify_direction(slope: float, direction: str, current_value: float) -> str:
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

def _detect_country(text: str, country_by_code: dict[str, dict[str, Any]]) -> tuple[str | None, str | None]:
    lowered = _normalize(text)
    best: tuple[int, str, str] | None = None
    for code, row in country_by_code.items():
        name = str(row["name"])
        pattern = r"\b" + re.escape(_normalize(name)) + r"\b"
        if re.search(pattern, lowered) and (best is None or len(name) > best[0]):
            best = (len(name), _country_place_id(code), code)
    return (best[1], best[2]) if best else (None, None)

def _detect_indicator(text: str, indicator_by_code: dict[str, dict[str, Any]]) -> str | None:
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
    lowered = _normalize(text)
    for mechanism_id, keywords in MECHANISM_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return mechanism_id
    return None

def _extract_year_interval(text: str) -> Interval | None:
    years = [int(y) for y in _YEAR_RE.findall(text)]
    return Interval(start=min(years), end=max(years)) if years else None

def _paragraphs_with_spans(raw: str) -> list[tuple[str, int, int]]:
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
                span=EvidenceSpan(doc_id=slug, locator=f"paragraph:{i}", quote=quote, char_start=start, char_end=end, doc_length=len(raw)),
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

def load(
    sample_dir: str | Path | None = None,
    *,
    countries: Iterable[str] | None = None,
    levels: Iterable[str] | None = None,
    years: tuple[int, int] = (2000, 2024),
) -> Corpus:
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
            span=EvidenceSpan(doc_id=source_id, locator=f"row:{i}", quote=quote, char_start=0, char_end=len(quote), doc_length=len(quote)),
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
        slope = float(slope_raw) if slope_raw is not None and slope_raw == slope_raw else 0.0
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
            span=EvidenceSpan(doc_id=problem_source_id, locator=f"problem:{row['problem_id']}", quote=quote, char_start=0, char_end=len(quote), doc_length=len(quote)),
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
