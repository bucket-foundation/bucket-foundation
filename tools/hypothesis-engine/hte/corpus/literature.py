from __future__ import annotations

import hashlib
import http.client
import json
import logging
import os
import re
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from ..concepts import Slot, Vocabulary, other_id
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

logger = logging.getLogger("hte.corpus.literature")

LITERATURE_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-literature-seed.json"
DEFAULT_FIXTURES_DIR = Path(__file__).resolve().parents[1] / "data" / "literature-fixtures"
# PR #15), the same "verbatim copy, `voice-ignore-file` header prepended"
DEFAULT_FIXTURES_DIR_BATCH_TWO = Path(__file__).resolve().parents[1] / "data" / "literature-fixtures-batch-two"
DEFAULT_CARDS_DIRS: tuple[Path, ...] = (DEFAULT_FIXTURES_DIR, DEFAULT_FIXTURES_DIR_BATCH_TWO)

GITHUB_REPO = "bucket-foundation/bucket-foundation"
GITHUB_INTAKE_PATH = "_intake/research-os-k12-literature"
_REPO_ROOT = Path(__file__).resolve().parents[4]
LOCAL_INTAKE_DIR = _REPO_ROOT / GITHUB_INTAKE_PATH
DEFAULT_REF = "intake/research-os-k12-literature"
GITHUB_API_BASE = "https://api.github.com"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com"

EVIDENCE_PROVENANCE_TAG = "k12-literature"

def load_vocab() -> Vocabulary:
    return Vocabulary.load(LITERATURE_VOCAB_PATH)

@dataclass(frozen=True)
class Claim:
    text: str
    line_start: int
    line_end: int
    char_start: int
    char_end: int

@dataclass(frozen=True)
class Card:
    doi: str
    title: str
    authors: tuple[str, ...]
    year: int
    venue: str
    relative_path: str
    why_it_matters: str
    key_claims: tuple[Claim, ...]
    research_questions: tuple[str, ...]
    how_it_bears_on_research_os: str
    batch: str = "batch-1"
    doc_length: int | None = None
    doi_missing: bool = False

    @property
    def first_author_surname(self) -> str:
        first = self.authors[0] if self.authors else ""
        return first.split(",", 1)[0].strip()

# `CLAUDE.md`'s own `voice-ignore-line` escape hatch for a line the org
_QUOTED_SCALAR_RE = re.compile(r'^(\w+):\s*"(.*)"\s*(?:#.*)?$')
_BARE_SCALAR_RE = re.compile(r'^(\w+):\s*(\S+)\s*(?:#.*)?$')
_LIST_ITEM_OPEN_RE = re.compile(r'^  - "')

# `voice-ignore-file` escape hatch every shipped fixture in this corpus
_LEADING_COMMENT_LINES_RE = re.compile(r"^(?:<!--.*-->\n)+")

def _unescape(text: str) -> str:
    return text.replace('\\"', '"').replace("\\\\", "\\")

def _iter_lines_with_offsets(raw: str) -> list[tuple[int, int, str]]:
    out: list[tuple[int, int, str]] = []
    cursor = 0
    for lineno, line in enumerate(raw.splitlines(keepends=True), start=1):
        out.append((lineno, cursor, line))
        cursor += len(line)
    return out

def _split_frontmatter_fields(fm_lines: list[tuple[int, int, str]]) -> list[tuple[str, list[tuple[int, int, str]]]]:
    fields: list[tuple[str, list[tuple[int, int, str]]]] = []
    current_key: str | None = None
    current_lines: list[tuple[int, int, str]] = []
    for lineno, offset, line in fm_lines:
        stripped = line.rstrip("\n")
        if stripped == "":
            if current_key is not None:
                current_lines.append((lineno, offset, line))
            continue
        if not line[0].isspace():
            if current_key is not None:
                fields.append((current_key, current_lines))
            m = re.match(r"^(\w+):", line)
            if m is None:
                raise ValueError(f"literature adapter: unparseable frontmatter line {lineno}: {line!r}")
            current_key = m.group(1)
            current_lines = [(lineno, offset, line)]
        else:
            current_lines.append((lineno, offset, line))
    if current_key is not None:
        fields.append((current_key, current_lines))
    return fields

def _parse_scalar(field_lines: list[tuple[int, int, str]]) -> str | None:
    _, _, first_line = field_lines[0]
    m = _QUOTED_SCALAR_RE.match(first_line.rstrip("\n"))
    if m is not None:
        return _unescape(m.group(2))
    m = _BARE_SCALAR_RE.match(first_line.rstrip("\n"))
    if m is not None:
        value = m.group(2)
        return None if value == "null" else value
    raise ValueError(f"literature adapter: unparseable scalar field: {first_line!r}")

def _find_unescaped_quote(s: str, start: int = 0) -> int:
    i = start
    while True:
        idx = s.find('"', i)
        if idx == -1:
            return -1
        backslashes = 0
        j = idx - 1
        while j >= 0 and s[j] == "\\":
            backslashes += 1
            j -= 1
        if backslashes % 2 == 0:
            return idx
        i = idx + 1

def _iter_list_item_spans(field_lines: list[tuple[int, int, str]]):
    lines = field_lines[1:]
    i, n = 0, len(lines)
    while i < n:
        lineno, offset, line = lines[i]
        content = line.rstrip("\n")
        m = _LIST_ITEM_OPEN_RE.match(content)
        if m is None:
            i += 1
            continue
        open_col = m.end()
        close_idx = _find_unescaped_quote(content, open_col)
        if close_idx != -1:
            char_start, char_end = offset + open_col, offset + close_idx
            yield content[open_col:close_idx], char_start, char_end, lineno, lineno
            i += 1
            continue
        char_start = offset + open_col
        parts = [line[open_col:]]
        end_lineno = lineno
        j = i + 1
        closed = False
        while j < n:
            j_lineno, j_offset, j_line = lines[j]
            j_close_idx = _find_unescaped_quote(j_line.rstrip("\n"))
            if j_close_idx != -1:
                parts.append(j_line[:j_close_idx])
                char_end, end_lineno, closed = j_offset + j_close_idx, j_lineno, True
                j += 1
                break
            parts.append(j_line)
            end_lineno = j_lineno
            j += 1
        if not closed:
            return
        yield "".join(parts), char_start, char_end, lineno, end_lineno
        i = j

def _parse_list(field_lines: list[tuple[int, int, str]]) -> list[str]:
    return [_unescape(text) for text, *_ in _iter_list_item_spans(field_lines)]

def _parse_claims(field_lines: list[tuple[int, int, str]]) -> list[Claim]:
    return [
        Claim(text=_unescape(text), line_start=line_start, line_end=line_end, char_start=char_start, char_end=char_end)
        for text, char_start, char_end, line_start, line_end in _iter_list_item_spans(field_lines)
    ]

def _parse_block_scalar(field_lines: list[tuple[int, int, str]]) -> str:
    parts = [line.strip() for _, _, line in field_lines[1:] if line.strip()]
    return " ".join(parts)

def _normalize_for_fallback_id(text: str) -> str:
    return " ".join(text.lower().split())

def _fallback_doi(title: str, authors: tuple[str, ...], year: int) -> str:
    first_author = authors[0] if authors else ""
    normalized = "|".join((
        _normalize_for_fallback_id(title),
        _normalize_for_fallback_id(first_author),
        str(year),
    ))
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return f"nodoi:{digest}"

def _parse_frontmatter(raw: str, relative_path: str, batch: str = "batch-1") -> Card:
    # lines before its own frontmatter, the `CLAUDE.md` `voice-ignore-file`
    header_match = _LEADING_COMMENT_LINES_RE.match(raw)
    header_len = header_match.end() if header_match else 0
    header_lines = raw.count("\n", 0, header_len)
    body = raw[header_len:]
    if not body.startswith("---\n"):
        raise ValueError(f"literature adapter: {relative_path} has no frontmatter opening `---`")
    end = raw.find("\n---\n", header_len + 4)
    if end < 0:
        raise ValueError(f"literature adapter: {relative_path} has no frontmatter closing `---`")
    fm_text = raw[header_len + 4:end]
    fm_lines = _iter_lines_with_offsets(fm_text)
    fm_lines = [(lineno + header_lines + 1, offset + header_len + 4, line) for lineno, offset, line in fm_lines]
    fields = dict(_split_frontmatter_fields(fm_lines))

    try:
        title = _parse_scalar(fields["title"]) or ""
        authors = tuple(_parse_list(fields["authors"]))
        year_str = _parse_scalar(fields["year"]) or "0"
        year = int(year_str)
        venue = _parse_scalar(fields["venue"]) or ""
        doi_field = fields.get("doi")
        doi = (_parse_scalar(doi_field) or "") if doi_field is not None else ""
        why_it_matters = _parse_block_scalar(fields["why_it_matters"])
        key_claims = tuple(_parse_claims(fields["key_claims"]))
        research_questions = tuple(_parse_list(fields.get("research_questions_it_leaves_open", [("", 0, "")])))
        how_it_bears = _parse_block_scalar(fields["how_it_bears_on_research_os"])
    except KeyError as exc:
        raise ValueError(f"literature adapter: {relative_path} carries no {exc.args[0]!r} field") from exc
    except ValueError as exc:
        message = str(exc)
        prefix = "literature adapter: "
        if message.startswith(prefix):
            message = message[len(prefix):]
        raise ValueError(f"literature adapter: {relative_path}: {message}") from exc

    doi_missing = not doi
    if doi_missing:
        doi = _fallback_doi(title, authors, year)
    if not key_claims:
        raise ValueError(f"literature adapter: {relative_path} carries no key_claims")

    return Card(
        doi=doi, title=title, authors=authors, year=year, venue=venue,
        relative_path=relative_path, why_it_matters=why_it_matters, key_claims=key_claims,
        research_questions=research_questions, how_it_bears_on_research_os=how_it_bears,
        batch=batch, doc_length=len(raw), doi_missing=doi_missing,
    )

def _parse_card_file(path: Path, root: Path, batch: str = "batch-1") -> Card:
    raw = path.read_text()
    relative_path = str(path.relative_to(root)).replace(os.sep, "/")
    return _parse_frontmatter(raw, relative_path, batch)

_PREPRINT_DOI_PREFIX = "10.48550/arxiv."
_COMMENTARY_DOI_PREFIX = "10.1038/d"
_REPORT_OR_BOOK_VENUE_KEYWORDS = ("working paper", "unesco", "world bank", "scholarship online")

def _evidence_tier(card: Card) -> Tier:
    if card.doi_missing:
        return Tier.T4
    doi_lower = card.doi.lower()
    venue_lower = card.venue.lower()
    if doi_lower.startswith(_PREPRINT_DOI_PREFIX):
        return Tier.T3
    if any(keyword in venue_lower for keyword in _REPORT_OR_BOOK_VENUE_KEYWORDS):
        return Tier.T3
    if doi_lower.startswith(_COMMENTARY_DOI_PREFIX):
        return Tier.T4
    return Tier.T2

def _extraction_text(card: Card) -> str:
    claims_text = " ".join(claim.text for claim in card.key_claims)
    return f"{card.title} {card.why_it_matters} {claims_text}"

def _full_card_text(card: Card) -> str:
    return " ".join([_extraction_text(card), card.how_it_bears_on_research_os])

_METHOD_RCT_RE = re.compile(r"\brct\b|randomi[sz]ed controlled trial|randomi[sz]ed\b")

def _classify_method(text: str) -> str:
    lowered = text.lower()
    if "meta-analysis" in lowered:
        return "meta-analysis"
    if _METHOD_RCT_RE.search(lowered):
        return "rct"
    if "review" in lowered or "survey" in lowered:
        return "survey"
    return "theory"

_MODEL_INFERENCE_METHODS = frozenset({"meta-analysis", "rct"})

def _evidence_kind(method: str) -> EvidenceKind:
    return EvidenceKind.MODEL_PRIOR if method in _MODEL_INFERENCE_METHODS else EvidenceKind.TEXTUAL

_EFFECT_SIZE_MARKERS: tuple[str, ...] = (
    "standard deviation", " sd ", "percentile", "percent", "%", "effect size",
    "cohen's d", "hedges", "odds ratio", "correlation", "confidence interval",
)

def _has_effect_size(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in _EFFECT_SIZE_MARKERS) and any(ch.isdigit() for ch in text)

def _is_ground_truth(method: str, text: str) -> bool:
    if method == "meta-analysis":
        return True
    return "replicat" in text.lower() and _has_effect_size(text)

def _corroborated_dois(cards: list[Card]) -> set[str]:
    groups: dict[tuple[str, str], list[Card]] = {}
    for card in cards:
        text = _extraction_text(card)
        obj = _detect_object(text)
        mech = _detect_mechanism(text)
        if obj == other_id(Slot.OBJECT):
            continue
        groups.setdefault((mech, obj), []).append(card)
    corroborated: set[str] = set()
    for group in groups.values():
        if len({c.first_author_surname for c in group}) >= 2:
            corroborated.update(c.doi for c in group)
    return corroborated

_ACTOR_LEXICON: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("tutor", ("tutor", "tutoring")),
    ("teacher", ("teacher",)),
    ("system", ("ai system", "the model", "chatbot", "robot scientist", "large language model", " llm ", "algorithm", "ai tool")),
    ("learner", ("student", "learner")),
)

_MECHANISM_LEXICON: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("retrieval-practice", ("retrieval practice", "testing effect", "repeated testing")),
    ("mastery-learning", ("mastery learning", "mastery-based feedback")),
    ("self-explanation", ("self-explanation", "self-explain")),
    ("knowledge-tracing", ("knowledge tracing",)),
    ("productive-failure", ("productive failure",)),
    ("self-determination", ("self-determination", "intrinsic motivation", "autonomy, competence")),
    ("curiosity-driven-learning", ("curiosity",)),
    ("gamification", ("gamification", "leaderboard")),
    ("far-transfer", ("far transfer", "transfer taxonomy")),
    ("learning-trajectories", ("learning trajector",)),
    ("item-response-theory", ("item response theory", "classical test theory")),
    ("skill-decay-automation", ("ironies of automation", "skill decay", "loses proficiency")),
    ("cognitive-offloading", ("cognitive offloading", "transactive memory", "look up")),
    ("mixed-initiative-interaction", ("mixed-initiative", "mixed initiative")),
    ("information-foraging", ("information foraging", "information scent")),
    ("spatial-hypertext", ("spatial hypertext",)),
    ("intelligent-tutoring", ("intelligent tutoring", "step-based", "tutor copilot", "ai tutor", "ai tutoring")),
    ("literature-based-discovery", ("undiscovered public knowledge", "literature-based discovery")),
    ("citation-trend-prediction", ("predicting research trends", "trend prediction")),
    ("division-of-cognitive-labor", ("division of cognitive labor", "burden of knowledge")),
    ("replication", ("reproducib", "replicat")),
    ("team-size-disruption", ("team size", "small teams disrupt", "large teams develop")),
    ("credit-allocation", ("matthew effect",)),
    ("program-search", ("program search", "funsearch", "evolutionary loop")),
    ("autonomous-experimentation", ("autonomous chemical research", "coscientist", "robotic lab")),
    ("protein-structure-prediction", ("protein structure", "alphafold")),
    ("automated-paper-generation", ("ai scientist", "automated open-ended scientific discovery")),
    ("systematic-review-automation", ("systematic review automation", "screening-assistance")),
    ("research-assessment", ("course-based undergraduate research", "cure assessment")),
    ("scientific-understanding", ("scientific understanding",)),
    ("authorship-attribution", ("listed as author", "authorship")),
    ("research-idea-generation", ("novel research ideas", "generate novel")),
    ("bibliometric-indexing", ("openalex", "index of scholarly works")),
)

_OBJECT_LEXICON: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("test-score", ("test score", "examination score", "post-test", "academic performance")),
    ("retention", ("retention", "durable", "long-term memory")),
    ("transfer", ("transfer",)),
    ("motivation", ("motivation",)),
    ("engagement", ("engagement", "satisfaction")),
    ("mastery", ("mastery",)),
    ("learning-gain", ("learning gain", "learning progress", "proficiency")),
    ("novelty", ("novelty", "novel research ideas")),
    ("replication-rate", ("replication rate", "reproducibility")),
    ("prediction-accuracy", ("accuracy", "predicted")),
    ("citation-credit", ("credit", "authorship")),
    ("disruption-index", ("disrupt",)),
    ("structure-accuracy", ("structure prediction", "protein structure")),
)

_PLACE_LEXICON: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("low-resource-school-system", ("sub-saharan africa", "nigeria", "low-resource")),
    ("k12-classroom", ("secondary school", "elementary school")),
    ("undergraduate-classroom", ("undergraduate", "college")),
    ("classroom-setting", ("classroom", "class session", "in-class", "within-class")),
    ("industrial-control-room", ("industrial", "automation", "operator")),
    ("research-community", ("researchers", "scientists", "physicists")),
    ("laboratory-study", ("laboratory", "lab study", "participants")),
)

_WORSENED_KEYWORDS = ("lower ", "undermine", "reversed", "worse", "decreased", "disapprove", "loses proficiency", "degrades", "less likely to remember", "fabricat")
_IMPROVED_KEYWORDS = ("improved", "increase", "raised", "outperform", "higher", "gains", "more novel", "more durable", "went on to produce", "outperformed")

def _first_match(text: str, lexicon: tuple[tuple[str, tuple[str, ...]], ...]) -> str | None:
    lowered = text.lower()
    for concept_id, keywords in lexicon:
        if any(keyword in lowered for keyword in keywords):
            return concept_id
    return None

def _detect_actor(text: str) -> str:
    return _first_match(text, _ACTOR_LEXICON) or other_id(Slot.ACTOR)

def _detect_mechanism(text: str) -> str:
    return _first_match(text, _MECHANISM_LEXICON) or other_id(Slot.MECHANISM)

def _detect_object(text: str) -> str:
    return _first_match(text, _OBJECT_LEXICON) or other_id(Slot.OBJECT)

def _detect_place(text: str) -> str:
    return _first_match(text, _PLACE_LEXICON) or other_id(Slot.PLACE)

def _classify_action(text: str) -> str:
    lowered = text.lower()
    worsened = any(keyword in lowered for keyword in _WORSENED_KEYWORDS)
    improved = any(keyword in lowered for keyword in _IMPROVED_KEYWORDS)
    if worsened and improved:
        return "mixed"
    if worsened:
        return "worsened"
    if improved:
        return "improved"
    return "no-effect"

_SURNAME_CACHE_MIN_LEN = 3

def _detect_stemma_parents(card: Card, surnames_to_dois: dict[str, list[str]]) -> list[str]:
    text = _full_card_text(card)
    parents: list[str] = []
    for surname, dois in surnames_to_dois.items():
        if len(surname) < _SURNAME_CACHE_MIN_LEN:
            continue
        pattern = r"\b" + re.escape(surname) + r"\b"
        if re.search(pattern, text):
            for doi in dois:
                if doi != card.doi and doi not in parents:
                    parents.append(doi)
    return parents

def _truncate(text: str, limit: int = 140) -> str:
    return text if len(text) <= limit else text[: limit - 3].rstrip() + "..."

def _build_corpus(cards: list[Card]) -> Corpus:
    vocab = load_vocab()

    surnames_to_dois: dict[str, list[str]] = {}
    for card in cards:
        surnames_to_dois.setdefault(card.first_author_surname, []).append(card.doi)

    seen_dois: set[str] = set()
    deduped_cards: list[Card] = []
    for card in cards:
        if card.doi in seen_dois:
            continue
        seen_dois.add(card.doi)
        deduped_cards.append(card)
    corroborated = _corroborated_dois(deduped_cards)

    sources: dict[str, Source] = {}
    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []
    provenance: list[RetrievalEnvelope] = []
    fetched_at = datetime.now(timezone.utc).isoformat()

    for card in cards:
        if card.doi in sources:
            if card.batch not in sources[card.doi].batches:
                sources[card.doi].batches.append(card.batch)
            continue

        tier = _evidence_tier(card)
        findings_text = _extraction_text(card)
        method = _classify_method(findings_text)
        kind = _evidence_kind(method)
        stemma_parents = _detect_stemma_parents(card, surnames_to_dois)

        sources[card.doi] = Source(
            id=card.doi, kind=kind, date=str(card.year),
            stemma_parents=stemma_parents, batches=[card.batch], authors=list(card.authors),
        )
        provenance.append(RetrievalEnvelope(
            retrieval_run_id=f"literature-adapter-file-ingest-{card.batch}", doc_id=card.doi,
            source_path=card.relative_path, fetched_at=fetched_at, fixture=True,
            citation_count=len(card.key_claims), lineage_count=len(stemma_parents),
        ))

        actor = _detect_actor(findings_text)
        action = _classify_action(findings_text)
        obj = _detect_object(findings_text)
        place = _detect_place(findings_text)
        mechanism = _detect_mechanism(findings_text)
        interval = Interval(start=card.year, end=card.year)

        views: dict[str, float] = {}
        if card.doi_missing:
            views["doi_missing"] = True  # type: ignore[assignment]

        first_item_id: str | None = None
        for i, claim in enumerate(card.key_claims):
            item_id = f"{card.doi}-c{i}"
            evidence.append(EvidenceItem(
                id=item_id, kind=kind, tier=tier, source_id=card.doi,
                span=EvidenceSpan(
                    doc_id=card.doi,
                    locator=f"{card.relative_path}:key_claims[{i}] (lines {claim.line_start}-{claim.line_end})",
                    quote=claim.text, char_start=claim.char_start, char_end=claim.char_end,
                    doc_length=card.doc_length,
                ),
                provenance=EVIDENCE_PROVENANCE_TAG,
                actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
                interval=interval, stance=Stance.POSITIVE,
                views=dict(views),
            ))
            if first_item_id is None:
                first_item_id = item_id

        if (_is_ground_truth(method, findings_text) or card.doi in corroborated) and first_item_id is not None:
            ground_truth.append(GroundTruthEvent(
                id=first_item_id, label=_truncate(card.title), year=card.year,
                doc_id=card.doi, discovery_year=card.year,
            ))

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=vocab)

def _iter_card_paths(directory: Path) -> list[Path]:
    return sorted(p for p in directory.rglob("*.md") if p.name != "README.md")

def _cache_dir_for_ref(ref: str) -> Path:
    env = os.environ.get("LITERATURE_CARDS_DIR")
    if env:
        return Path(env)
    return Path(tempfile.gettempdir()) / "hte-literature-cards" / ref.replace("/", "-")

def _github_headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "hte-literature-adapter"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers

def _fetch_card_paths(ref: str) -> list[str]:
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/git/trees/{ref}?recursive=1"
    request = urllib.request.Request(url, headers=_github_headers())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            tree = json.loads(response.read().decode("utf-8"))
    except (OSError, http.client.HTTPException, json.JSONDecodeError) as exc:
        raise RuntimeError(
            f"literature adapter: could not list {GITHUB_INTAKE_PATH!r} at ref {ref!r}: {exc}"
        ) from exc
    prefix = GITHUB_INTAKE_PATH + "/"
    return sorted(
        entry["path"] for entry in tree.get("tree", [])
        if entry.get("type") == "blob"
        and entry["path"].startswith(prefix)
        and entry["path"].endswith(".md")
        and not entry["path"].endswith("/README.md")
    )

def _fetch_card_text(path: str, ref: str) -> str:
    url = f"{GITHUB_RAW_BASE}/{GITHUB_REPO}/{ref}/{path}"
    request = urllib.request.Request(url, headers=_github_headers())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"literature adapter: could not fetch {path!r} at ref {ref!r}: {exc}") from exc

def _ensure_cards_cached(ref: str) -> Path:
    cache_dir = _cache_dir_for_ref(ref)
    for path in _fetch_card_paths(ref):
        relative = path[len(GITHUB_INTAKE_PATH) + 1:]
        dest = cache_dir / relative
        if dest.is_file():
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".tmp")
        tmp.write_text(_fetch_card_text(path, ref))
        tmp.replace(dest)
    return cache_dir

def _normalize_roots(cards_dir: str | Path | Sequence[str | Path] | None, ref: str) -> list[Path]:
    if cards_dir is None:
        return [_ensure_cards_cached(ref)]
    if isinstance(cards_dir, (str, Path)):
        return [Path(cards_dir)]
    return [Path(root) for root in cards_dir]

_BATCH_ROOT_RE = re.compile(r"^\s*Batch root:\s*`([^`]+)`\s*$", re.MULTILINE)

def _declared_batch_subfolders(card_root: Path) -> list[Path]:
    readme = card_root / "README.md"
    if not readme.is_file():
        return []
    text = readme.read_text(encoding="utf-8")
    found: list[Path] = []
    for rel in _BATCH_ROOT_RE.findall(text):
        candidate = (card_root / rel).resolve()
        if candidate.is_dir():
            found.append(candidate)
    return found

def discover_card_roots(base: str | Path | None = None) -> list[Path]:
    root = Path(base) if base is not None else _REPO_ROOT
    intake = root / "_intake"
    if not intake.is_dir():
        return []
    discovered: list[Path] = []
    for candidate in sorted(p for p in intake.glob("research-os-k12-literature*") if p.is_dir()):
        discovered.append(candidate)
        discovered.extend(_declared_batch_subfolders(candidate))
    return discovered

def load_raw(
    cards_dir: str | Path | Sequence[str | Path] | None = None,
    *, ref: str = DEFAULT_REF,
) -> list[Card]:
    roots = _normalize_roots(cards_dir, ref)
    cards: list[Card] = []
    for batch_index, directory in enumerate(roots, start=1):
        if not directory.is_dir():
            raise FileNotFoundError(f"literature adapter: cards directory not found: {directory}")
        paths = _iter_card_paths(directory)
        if not paths:
            raise FileNotFoundError(f"literature adapter: no card files found under {directory}")
        nested_roots = [r for r in roots if r != directory and r.is_relative_to(directory)]
        if nested_roots:
            paths = [p for p in paths if not any(p.is_relative_to(nested) for nested in nested_roots)]
        batch = f"batch-{batch_index}"
        cards.extend(_parse_card_file(path, directory, batch) for path in paths)

    degraded = [card for card in cards if card.doi_missing]
    if degraded:
        logger.warning(
            "hte.corpus.literature: load_raw: skipped_or_degraded: %d of %d card(s) carry no doi "
            "and loaded under a nodoi: fallback id, tier capped at T4 until a real doi is added: %s",
            len(degraded), len(cards), ", ".join(sorted(card.relative_path for card in degraded)),
        )
    return cards

def load(
    cards_dir: str | Path | Sequence[str | Path] | None = None,
    *, ref: str = DEFAULT_REF,
) -> Corpus:
    if cards_dir is None:
        discovered = discover_card_roots()
        if discovered:
            cards_dir = discovered
    return _build_corpus(load_raw(cards_dir, ref=ref))

def load_default() -> Corpus:
    return load(DEFAULT_CARDS_DIRS)

__all__ = [
    "Card", "Claim",
    "load_vocab", "load_raw", "load", "load_default", "discover_card_roots",
    "LITERATURE_VOCAB_PATH", "DEFAULT_FIXTURES_DIR", "DEFAULT_FIXTURES_DIR_BATCH_TWO",
    "DEFAULT_CARDS_DIRS", "LOCAL_INTAKE_DIR", "EVIDENCE_PROVENANCE_TAG",
    "GITHUB_REPO", "GITHUB_INTAKE_PATH", "DEFAULT_REF",
]
