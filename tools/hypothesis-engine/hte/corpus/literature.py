"""Ingest the Research OS for K-12 literature corpus (PR #5,
`_intake/research-os-k12-literature/` on branch `intake/research-os-k12-
literature`, `bucket-foundation/bucket-foundation`) into an `hte.corpus.
Corpus`, so the engine's belief fusion and tournament can run over the
DOI-verified papers behind Research OS's own design decisions and
`docs/RESEARCH-OS-INTEGRATION.md`'s overlap map, the same way `hte.corpus.
production` and `hte.corpus.education_atlas` already run over a production
record and a sample education-statistics table.

One `Source` per card, keyed by the card's own DOI (`Source.id = doi`,
`docs/RESEARCH-OS-INTEGRATION.md`'s production adapter keys a source by an
opaque production id instead; a literature card already carries a stable,
globally unique identifier of its own, so reusing it needs no synthetic
slug). One `EvidenceItem` per bullet under the card's own `key_claims`
frontmatter list, read as the card's findings, rather than its
`why_it_matters` framing or its `research_questions_it_leaves_open`
caveats: `id = f"{doi}-c{i}"`.

Two loaders, one shared builder, matching `hte.corpus.production`'s own
two-loader shape:

- `load(cards_dir=None, *, ref=DEFAULT_REF)` reads card files off disk when
  `cards_dir` is given (a directory of `<branch>/<slug>.md` files, the same
  tree PR #5 ships); with no `cards_dir`, it fetches the corpus straight off
  GitHub at `ref` (default the PR's own branch) and caches it locally
  first, so a repeat call against the same `ref` needs no repeat network
  call. No card ever needs a local clone of `bucket-foundation/bucket-
  foundation`, unlike `hte.corpus.education_atlas`'s sibling-repo
  convention for `education-atlas`, since this corpus lives inside this
  same repository's own PR branch instead of a separate one.
- `load_vocab()` returns the seed vocabulary (`hte/data/vocab-literature-
  seed.json`): four consensus ACTOR roles a card's own intervention agent
  can name (tutor, teacher, system, learner), five non-consensus ACTOR
  concepts naming a fringe or contested account of what drives an
  outcome this corpus studies (a novelty rating reflecting rater
  unfamiliarity rather than real originality, unstructured AI access alone
  explaining a learning gain, raw citation count standing in for
  scientific validity, full automation safely substituting expert
  judgment, and venue prestige alone predicting replication), four ACTIONs
  (an effect's own direction), thirteen OBJECTs (the outcome measures this
  corpus's papers report on), seven PLACEs (population or setting), and
  thirty-three MECHANISMs, one per named intervention, method, or dynamic
  a card in this corpus studies.

Mapping decisions this module makes, each one a reading of what "the right
`EvidenceKind`/tier/slot" means for a corpus of DOI-verified secondary and
primary research literature rather than the K-12 production record
`hte.corpus.production` reads or the national education statistics `hte.
corpus.education_atlas` reads:

- **Tier.** By venue and DOI shape rather than the card's own `tier:`
  frontmatter field, which names Bucket's own canon-intake maturity
  (`draft`/`candidate`/`canon`), a different axis from `hte.evidence.Tier`'s
  source-reliability ladder. A DOI under the `10.48550/arxiv.` prefix (an
  unrefereed preprint) or a venue naming a working-paper series, a report-
  issuing institution (`UNESCO`, `World Bank`), or a scholarly-monograph
  platform (`Oxford Scholarship Online`, the one book-length source this
  corpus carries, a peer-reviewed but non-journal form this module reads as
  closer to a report than to a refereed journal article) reads at `T3`. A
  DOI under Nature's own `10.1038/d` prefix, the prefix Nature's news, and
  comment content uses, distinct from `10.1038/s41586-...` for its
  refereed research, reads at `T4` (one card, Stokel-Walker 2023, a Nature
  news feature rather than a refereed paper). Every other card, the
  corpus's default case, a refereed journal article, reads at `T2`.
- **Kind and method.** `_classify_method` reads a card's own title,
  `why_it_matters`, and `key_claims` text for one of four methods a card's
  own prose already names: `"meta-analysis"` (the word appears verbatim in
  every meta-analysis card this corpus carries), `"rct"` (`"RCT"`,
  `"randomized controlled trial"`, or `"randomized"`), `"survey"` (`"review"`
  or `"survey"`, catching this corpus's own review-form cards, Fortunato and
  others 2018, Wang and others 2023, Marshall and Wallace 2019, Khosravi
  and others 2022), and `"theory"` as the default for every card naming
  none of the above, an argued conceptual claim or a primary empirical
  report read as prose rather than as a statistical model's own output.
  `meta-analysis` and `rct` read as `EvidenceKind.MODEL_PRIOR` (a pooled or
  inferential statistical estimate, the same "an estimate a model produced"
  reading `hte.corpus.education_atlas`'s own docstring gives every
  observation row); `survey` and `theory` read as `EvidenceKind.TEXTUAL`
  (an ordinary prose assertion).
- **Slots.** ACTOR resolves to one of four named intervention-agent
  concepts, `tutor`, `teacher`, `system`, `learner`, the first one this
  same scoped text names (checked in that order, since a card naming both
  an AI tutor and a comparison teacher condition reads as being about the
  tutor first), or the slot's own `OTHER` placeholder when none of the
  four is named. ACTION resolves to one of `improved`/`worsened`/`mixed`/
  `no-effect` by a small positive- and negative-outcome keyword lexicon
  read against the same scoped text (`_classify_action`); a card naming
  both reads as `mixed` (Kapur 2008's own productive-failure reversal on
  procedural-fluency measures is exactly this case). OBJECT and PLACE and
  MECHANISM each resolve by a first-match keyword lexicon against the same
  text, or `OTHER` when the card names none of this module's own closed
  vocabulary. No slot value is read from an LLM call: every one of these
  four lexicons is checked once, by hand, against this corpus's own 45
  cards at the time this module was written, the same "no extraction pass
  would improve on reading the structure directly" stance `hte.corpus.
  quantum_history` and `hte.corpus.education_atlas` both take for their own
  shipped data. A later card this corpus grows to include, naming an
  intervention, mechanism, or outcome outside these lexicons, reads as
  `OTHER` on whichever slot it does not name, rather than raising: the
  open-world placeholder is exactly built for this case
  (`hte.concepts.other_concept`).
- **The scoped "findings or claims" text.** Every one of the four
  classifiers above (`_evidence_tier` excepted, which reads `venue`/`doi`
  only) reads the same joined string, `_extraction_text`, a card's own
  `title`, `why_it_matters`, and `key_claims` fields, never its
  `research_questions_it_leaves_open` or `how_it_bears_on_research_os`
  fields: those two name what a card's own findings do not yet settle, or
  how a card bears on a system neither card is about, prose this module
  reads as outside "the card's findings or claims" the slot and method
  reading is scoped to. Bloom 1984's own `research_questions_it_leaves_
  open` bullet asking "whether the two-sigma figure replicates" is the
  reason this scoping matters concretely: reading that field into the
  ground-truth check below would misread the corpus's own later
  correction of Bloom's figure (Kulik, Kulik, and Bangert-Drowns 1990) as
  Bloom's own card being the replication-backed ground truth, when the
  correcting card is.
- **Ground truth.** A card becomes one `GroundTruthEvent`, dated by its
  own publication year (`discovery_year == year`, the same simplification
  `hte.corpus.quantum_history`, `hte.corpus.education_atlas`, and `hte.
  corpus.fixtures` all make, contrasted with `hte.corpus.production`'s own
  real discovery lag), when `_classify_method` reads it as a
  `meta-analysis` (a meta-analysis is, by construction, a synthesis of
  many replicated findings into one pooled effect size) or when its own
  scoped findings text names a replication directly (`"replicat"`, a
  substring catching `"replication"`/`"replications"`/`"replicated"`,
  scoped to `why_it_matters` and `key_claims` only, per the point above).
  Three meta-analyses (Kulik, Kulik, and Bangert-Drowns 1990; Kulik and
  Fletcher 2016; VanLehn 2011) and one direct replication report (Open
  Science Collaboration 2015) become ground truth this way across the
  full 45-card corpus.
- **Stemma.** Unlike the four slot and method classifiers, stemma
  detection reads a wider span of a card's own prose than `_extraction_
  text` does, `why_it_matters`, `key_claims`, and `how_it_bears_on_
  research_os` together (`_full_card_text`), but still excludes
  `research_questions_it_leaves_open` on purpose: that field is where this
  corpus's own curator left forward pointers to a later card ("a question
  the Kulik, Kulik, and Bangert-Drowns meta-analysis in this same corpus
  takes up directly," Bloom 1984's own open-questions bullet), a curator's
  own cross-reference rather than a citation the 1984 paper itself could
  ever have made to a 1990 one. A first pass at this module read that
  field too and produced exactly that chronologically impossible edge,
  Bloom 1984 "citing" Kulik and others 1990, before this scoping fix. A
  card citing another card in this same
  corpus by its first author's own surname (a whole-word, case-sensitive
  match, since a surname capitalized mid-sentence reads as a name rather
  than an ordinary word) gains that other card's `Source` as a
  `stemma_parents` entry. Kulik, Kulik, and Bangert-Drowns 1990's own
  `why_it_matters` field, "a large-sample replication check on Bloom's
  claim," is exactly this case: it names `Source(id=<Bloom 1984's doi>)`
  as a stemma parent. Two or more cards sharing one first-author surname
  (this corpus ships two: Kulik, Kulik, and Bangert-Drowns 1990 and Kulik
  and Fletcher 2016) are a known, documented gap this simple surname match
  does not resolve: a card naming "Kulik" gains every card whose first
  author is a Kulik as a stemma parent, a false positive this module
  accepts rather than builds a full citation-parser to avoid, the same
  "no extraction pass would improve on reading the structure directly"
  tradeoff the slot lexicons make.
- **Spans.** `EvidenceSpan.doc_id` and `EvidenceItem.source_id` both carry
  the card's own DOI, matching `hte.corpus.production` and `hte.corpus.
  education_atlas`'s own doc_id-equals-source_id convention (code
  elsewhere in this package, `hte.belief`'s stemma walk among them, keys a
  cluster's sources by exactly this field). The literal file a reader
  would open to check a quote in context, unlike either of those two
  corpora's own more abstract source ids, is a real, relative path
  (`educational-methods/bloom-1984-two-sigma-problem.md`), so it is folded
  into `EvidenceSpan.locator` instead, alongside the claim's own 1-based
  line range inside that file: `"<relative_path>:key_claims[<i>] (lines
  <start>-<end>)"`. `char_start`/`char_end` are the claim's own quoted
  text's exact offsets inside that same file's raw text, offsets into
  `doc_id` in `hte.corpus.production`'s and `hte.corpus.education_atlas`'s
  own span shape but into `locator`'s own named file here, the one place
  this module's own span shape reads differently from either.
- **No general YAML parser.** Every card's frontmatter is machine-written
  in one fixed, narrow shape (a flat `key: "quoted scalar"` or `key: N`
  line, a `key:` line followed by `  - "quoted item"` list entries, or a
  `key: >` line followed by indented folded-scalar continuation lines);
  `_parse_frontmatter` reads exactly that shape line by line rather than
  depending on a general YAML parser, the same zero-dependency stance
  `hte.corpus.education_atlas` takes on Parquet (an optional `pandas` import,
  never a hard dependency this package's own `pyproject.toml` declares).
  The one escape sequence this corpus's own cards use, `\\"` inside a
  quoted scalar (Deci and Ryan 2000's own title quotes "What" and "Why"),
  is unescaped by hand; a card using a YAML escape beyond that one is
  outside this parser's own scope.
- **A leading `voice-ignore-file` comment is not frontmatter.** A card
  carrying verbatim founder material opens with one or more `<!-- ... -->`
  lines, `CLAUDE.md`'s own escape hatch for the org voice linter, before
  its own `---` frontmatter opener; `_parse_frontmatter` skips that header
  and shifts every `Claim` span's line number and char offset by its own
  length, so a span still locates the exact quote inside the file's real,
  full text.

Batches (`bkt-hte-literature-batch-two`, PR #15, "evidence on the twelve
open questions" in `_intake/research-os-k12-literature/README.md` and
`_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`).
Batch two shipped 31 new cards plus one already-drafted card folded into
the index (Bastani and others 2025), landing inside the exact same
`_intake/research-os-k12-literature/` tree PR #5's batch one already
occupies, area by area, rather than a sibling directory: PR #15 added a
fifth area, `prerequisite-knowledge-graphs`, and grew the other four.
Every batch-two card carries the identical frontmatter shape batch one's
own cards do (this module's own docstring above needed no new field, no
new scalar/list/block-scalar grammar, and no new slot-lexicon entry to
read a batch-two card: `_extraction_text`, `_classify_method`,
and the four slot lexicons already read whatever a card's title,
`why_it_matters`, and `key_claims` name, batch one's cards or batch
two's), so on GitHub, at any ref past PR #15's merge, the two batches are
already one indistinguishable tree; nothing downstream of `load_raw`
needs a "which batch" reading to score, fuse, or tournament a batch-two
card's evidence any differently from a batch-one card's.

What *does* need a "which batch" reading is provenance: `Source.batches`
(`hte.evidence.Source`) names which named card root(s) contributed a
source, so a caller building a corpus from more than one root, e.g. the
6-card batch-one fixture set (`DEFAULT_FIXTURES_DIR`) plus the 6-card
batch-two fixture set (`DEFAULT_FIXTURES_DIR_BATCH_TWO`), can tell which
root each source came from without re-reading the file tree. `cards_dir`
on `load_raw`/`load` accepts a single directory (batch one's own
call shape, kept working unchanged) or a sequence of directories, one per
named root, read and concatenated in order and tagged `"batch-1"`,
`"batch-2"`, ... by that order's own position; `DEFAULT_CARDS_DIRS`
names the canonical "both fixture batches" pair callers who want the
combined 12-card fixture corpus pass explicitly. `cards_dir=None` keeps
meaning "fetch over the network at `ref`" regardless: a caller who wants
"the real, on-disk, already-merged 82-card tree this repo's own `main`
carries past PR #15" calls `load_default()` instead, which reads that one
real local root (no batch split; the real tree has none) when this
package is running inside a checkout that has it, falling back to
`load()`'s own network fetch otherwise. `load_default` is `_CORPUS_LOADERS`'s
own zero-arg registration (`hte/cli.py`, `hte/runner.py`), the shape every
other corpus loader there already has.

A DOI appearing under more than one root (two fixture batches drawing on
the same real 82-card tree could pick the same paper twice by accident)
dedupes to the first root's own card: `_build_corpus` builds each `Source`
once, from the first cards list entry naming that DOI, and appends every
later root's own batch label onto that same `Source.batches` list rather
than re-adding its evidence a second time, so `corpus.evidence`'s own
count never double-counts a paper two roots both happen to carry.
"""
from __future__ import annotations

import json
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

# `tools/hypothesis-engine/hte/corpus/literature.py` -> parents[1] is `hte/`,
# the same one-level-up-from-`corpus/` convention every other adapter's own
# `*_VOCAB_PATH` uses.
LITERATURE_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-literature-seed.json"
DEFAULT_FIXTURES_DIR = Path(__file__).resolve().parents[1] / "data" / "literature-fixtures"
# Batch two's own 6-card fixture subset (`bkt-hte-literature-batch-two`,
# PR #15), the same "verbatim copy, `voice-ignore-file` header prepended"
# convention `DEFAULT_FIXTURES_DIR` already carries for batch one.
DEFAULT_FIXTURES_DIR_BATCH_TWO = Path(__file__).resolve().parents[1] / "data" / "literature-fixtures-batch-two"
# The canonical "both batches" pair a caller wanting the combined,
# 12-card fixture corpus passes to `load`/`load_raw` as `cards_dir`; see
# this module's own top docstring, "Batches," for why this is not
# `cards_dir`'s own default (that default stays the network fetch).
DEFAULT_CARDS_DIRS: tuple[Path, ...] = (DEFAULT_FIXTURES_DIR, DEFAULT_FIXTURES_DIR_BATCH_TWO)

GITHUB_REPO = "bucket-foundation/bucket-foundation"
GITHUB_INTAKE_PATH = "_intake/research-os-k12-literature"
# `tools/hypothesis-engine/hte/corpus/literature.py` -> parents[4] is this
# repo's own root (`bucket-foundation/`): `hte/corpus` -> `hte` -> `hypothesis-
# engine` -> `tools` -> repo root. `load_default` reads this real, on-disk
# path directly, no network, when it exists (true on `main` past PR #5 and
# PR #15 both merging); see this module's own top docstring, "Batches."
_REPO_ROOT = Path(__file__).resolve().parents[4]
LOCAL_INTAKE_DIR = _REPO_ROOT / GITHUB_INTAKE_PATH
# PR #5's own branch, the ref this module was built against; GitHub deletes
# a merged PR's own source branch by this repo's default settings, so this
# exact ref 404s once PR #5 merges (it merged mid-review, in fact, while
# this module was being written: `gh pr view 5 --json state` read `MERGED`
# before this file's own last edit). `load(ref="main")` is the ref that
# keeps working after that; `DEFAULT_REF` stays this literal branch name
# regardless, matching this module's own spec'd signature.
DEFAULT_REF = "intake/research-os-k12-literature"
GITHUB_API_BASE = "https://api.github.com"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com"

EVIDENCE_PROVENANCE_TAG = "k12-literature"


def load_vocab() -> Vocabulary:
    """The K-12 literature seed vocabulary (`hte/data/vocab-literature-
    seed.json`); see this module's own top docstring for the full count and
    the five non-consensus ACTOR concepts by name."""
    return Vocabulary.load(LITERATURE_VOCAB_PATH)


# --------------------------------------------------------------------------
# Card: the lossless parse of one card file
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Claim:
    """One `key_claims` bullet, located inside its own card file: the
    claim's own text, its 1-based line range, and its exact character
    offset range, both into that card's own raw file text."""
    text: str
    line_start: int
    line_end: int
    char_start: int
    char_end: int


@dataclass(frozen=True)
class Card:
    """One literature card, parsed losslessly from its own frontmatter and
    file location; `_build_corpus` below is the lossy projection onto
    `hte.corpus.Corpus`. `batch` names which card root (position in a
    `load_raw(cards_dir=[...])` call's own list, `"batch-1"` for a single
    directory) this card was read from; see this module's own top
    docstring, "Batches.\""""
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

    @property
    def first_author_surname(self) -> str:
        """The text before the first comma in this card's own first-listed
        author (`"Bloom, Benjamin S."` -> `"Bloom"`), or the whole string
        when it carries no comma (a collective author, `"Open Science
        Collaboration"`, `"UNESCO"`)."""
        first = self.authors[0] if self.authors else ""
        return first.split(",", 1)[0].strip()


# --------------------------------------------------------------------------
# frontmatter parsing (no general YAML parser; see this module's own top
# docstring, "No general YAML parser")
# --------------------------------------------------------------------------

# Every pattern below tolerates one optional trailing `  # ...` comment,
# `CLAUDE.md`'s own `voice-ignore-line` escape hatch for a line the org
# voice rules would otherwise flag (a `venue:` field whose journal name
# carries a punctuation mark the linter itself catches, annotated with a
# trailing comment on a card outside this module's own 6-card fixture
# subset). The full 45-card corpus surfaced this and caught it here before
# it shipped; the 6-card fixture subset alone never would have.
_QUOTED_SCALAR_RE = re.compile(r'^(\w+):\s*"(.*)"\s*(?:#.*)?$')
_BARE_SCALAR_RE = re.compile(r'^(\w+):\s*(\S+)\s*(?:#.*)?$')
_LIST_ITEM_RE = re.compile(r'^  - "(.*)"\s*(?:#.*)?$')

# One or more leading `<!-- ... -->` HTML-comment lines, the `CLAUDE.md`
# `voice-ignore-file` escape hatch every shipped fixture in this corpus
# carries ahead of its own `---` frontmatter opener. `.` does not match a
# newline by default, so this matches only single-line comments, the one
# shape this corpus's own cards use.
_LEADING_COMMENT_LINES_RE = re.compile(r"^(?:<!--.*-->\n)+")


def _unescape(text: str) -> str:
    """The one YAML escape this corpus's own cards use, `\\"` for an
    embedded double quote (Deci and Ryan 2000's own title). Not a general
    YAML unescape; see this module's own top docstring."""
    return text.replace('\\"', '"').replace("\\\\", "\\")


def _iter_lines_with_offsets(raw: str) -> list[tuple[int, int, str]]:
    """`(1-based line number, char offset of this line's own first
    character, line text including its own trailing newline)` for every
    line in `raw`."""
    out: list[tuple[int, int, str]] = []
    cursor = 0
    for lineno, line in enumerate(raw.splitlines(keepends=True), start=1):
        out.append((lineno, cursor, line))
        cursor += len(line)
    return out


def _split_frontmatter_fields(fm_lines: list[tuple[int, int, str]]) -> list[tuple[str, list[tuple[int, int, str]]]]:
    """Group frontmatter lines into `(key, [its own lines])` chunks: a
    line with no leading whitespace opens a new field; every line starting
    with whitespace, or a blank line, belongs to the field before it."""
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
    """A `key: "value"` or `key: value` field's own value, `None` for
    `key: null`."""
    _, _, first_line = field_lines[0]
    m = _QUOTED_SCALAR_RE.match(first_line.rstrip("\n"))
    if m is not None:
        return _unescape(m.group(2))
    m = _BARE_SCALAR_RE.match(first_line.rstrip("\n"))
    if m is not None:
        value = m.group(2)
        return None if value == "null" else value
    raise ValueError(f"literature adapter: unparseable scalar field: {first_line!r}")


def _parse_list(field_lines: list[tuple[int, int, str]]) -> list[str]:
    """A `key:` field's own `  - "item"` entries, in file order."""
    items: list[str] = []
    for _, _, line in field_lines[1:]:
        m = _LIST_ITEM_RE.match(line.rstrip("\n"))
        if m is not None:
            items.append(_unescape(m.group(1)))
    return items


def _parse_claims(field_lines: list[tuple[int, int, str]]) -> list[Claim]:
    """A `key_claims:` field's own `  - "claim text"` entries, each
    located by its own 1-based line number and exact character offset
    range for the quoted text alone (not the surrounding `  - "`/`"`
    markup)."""
    claims: list[Claim] = []
    for lineno, offset, line in field_lines[1:]:
        m = _LIST_ITEM_RE.match(line.rstrip("\n"))
        if m is None:
            continue
        text = _unescape(m.group(1))
        char_start = offset + m.start(1)
        char_end = offset + m.end(1)
        claims.append(Claim(text=text, line_start=lineno, line_end=lineno, char_start=char_start, char_end=char_end))
    return claims


def _parse_block_scalar(field_lines: list[tuple[int, int, str]]) -> str:
    """A `key: >` field's own folded-scalar continuation lines, each
    stripped of its own two-space indent and joined with a single space,
    matching YAML's own folded-scalar fold rule."""
    parts = [line.strip() for _, _, line in field_lines[1:] if line.strip()]
    return " ".join(parts)


def _parse_frontmatter(raw: str, relative_path: str, batch: str = "batch-1") -> Card:
    # A card is free to open with one or more `<!-- ... -->` HTML-comment
    # lines before its own frontmatter, the `CLAUDE.md` `voice-ignore-file`
    # escape hatch every one of this corpus's shipped fixtures carries
    # (verbatim founder material the org voice linter would otherwise
    # flag). `header_len`/`header_lines` are that header's own char length
    # and line count, `0` for a card with no header at all, so the offset
    # math below still lands on `raw`'s real line numbers and char offsets
    # whether or not a header is present.
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
    # `_iter_lines_with_offsets` line numbers and char offsets are both
    # relative to `fm_text`, sliced past any leading comment header plus
    # the opening `"---\n"` line; shift the line number by `header_lines +
    # 1` (that opening line is the file's own line `header_lines + 1`) and
    # the char offset by `header_len + 4` (the header's own length plus
    # that opening line's own length), so `Claim.line_start`/`line_end`/
    # `char_start`/`char_end` all land on `raw`, the file's own full text,
    # its own local slice left behind.
    fm_lines = [(lineno + header_lines + 1, offset + header_len + 4, line) for lineno, offset, line in fm_lines]
    fields = dict(_split_frontmatter_fields(fm_lines))

    # Every required-field read below is a bare dict subscript (a missing
    # `authors:`/`venue:`/... field) or a bare `int()` call (a non-numeric
    # `year:`), neither of which names `relative_path` on its own; with a
    # corpus already at 45 cards and growing, one malformed card's own
    # bare `KeyError: 'authors'`/`ValueError: invalid literal for int()...`
    # gives no indication of which file to fix. This `try/except` adds
    # that context uniformly, the same convention the explicit `raise
    # ValueError` checks around it already follow (`"has no frontmatter
    # opening"`, `"carries no doi"`, ...).
    try:
        title = _parse_scalar(fields["title"]) or ""
        authors = tuple(_parse_list(fields["authors"]))
        year_str = _parse_scalar(fields["year"]) or "0"
        year = int(year_str)
        venue = _parse_scalar(fields["venue"]) or ""
        doi = _parse_scalar(fields["doi"]) or ""
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

    if not doi:
        raise ValueError(f"literature adapter: {relative_path} carries no doi")
    if not key_claims:
        raise ValueError(f"literature adapter: {relative_path} carries no key_claims")

    return Card(
        doi=doi, title=title, authors=authors, year=year, venue=venue,
        relative_path=relative_path, why_it_matters=why_it_matters, key_claims=key_claims,
        research_questions=research_questions, how_it_bears_on_research_os=how_it_bears,
        batch=batch,
    )


def _parse_card_file(path: Path, root: Path, batch: str = "batch-1") -> Card:
    raw = path.read_text()
    relative_path = str(path.relative_to(root)).replace(os.sep, "/")
    return _parse_frontmatter(raw, relative_path, batch)


# --------------------------------------------------------------------------
# classification: tier, method, kind, ground truth, slots (see this
# module's own top docstring, "Mapping decisions this module makes")
# --------------------------------------------------------------------------

_PREPRINT_DOI_PREFIX = "10.48550/arxiv."
_COMMENTARY_DOI_PREFIX = "10.1038/d"
_REPORT_OR_BOOK_VENUE_KEYWORDS = ("working paper", "unesco", "world bank", "scholarship online")


def _evidence_tier(card: Card) -> Tier:
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
    """The scoped "findings or claims" text every slot and method
    classifier below reads: a card's own title, `why_it_matters`, and
    `key_claims`, never its open questions or its Research-OS framing.
    See this module's own top docstring, "The scoped findings or claims
    text.\""""
    claims_text = " ".join(claim.text for claim in card.key_claims)
    return f"{card.title} {card.why_it_matters} {claims_text}"


def _full_card_text(card: Card) -> str:
    """`_extraction_text` plus `how_it_bears_on_research_os`, for stemma
    detection only (`_detect_stemma_parents`). `research_questions_it_
    leaves_open` is excluded on purpose: see this module's own top
    docstring, "Stemma," for the chronologically impossible stemma edge
    reading that field produced."""
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


def _is_ground_truth(method: str, text: str) -> bool:
    return method == "meta-analysis" or "replicat" in text.lower()


# Ordered `(concept_id, keywords)` lexicons: the first entry whose keyword
# list has a hit wins. Each list is checked, by hand, against this
# corpus's own 45 cards; see this module's own top docstring, "Slots."
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
    # "k-12" itself is excluded: every card's `how_it_bears_on_research_os`
    # names the product "Research OS for K-12," and that phrase already
    # leaks into a few cards' own `why_it_matters` (Bloom 1984's own text
    # names "Research OS for K-12's five-state ladder" without Bloom's own
    # studies being about a K-12 population at all); "secondary school" and
    # "elementary school" name an actual study population instead of a
    # product, so they stay.
    ("low-resource-school-system", ("sub-saharan africa", "nigeria", "low-resource")),
    ("k12-classroom", ("secondary school", "elementary school")),
    ("undergraduate-classroom", ("undergraduate", "college")),
    ("classroom-setting", ("classroom", "class session", "in-class", "within-class")),
    ("industrial-control-room", ("industrial", "automation", "operator")),
    ("research-community", ("researchers", "scientists", "physicists")),
    ("laboratory-study", ("laboratory", "lab study", "participants")),
)

# "lower " carries a trailing space on purpose: "lower-resource" (a study
# population's own name, UNESCO 2025's why_it_matters) is not this corpus's
# own reading of a worsened effect the way "showed lower intrinsic
# motivation" (Hanus and Fox 2015) is; the space excludes the hyphenated
# compound without a general parser.
_WORSENED_KEYWORDS = ("lower ", "undermine", "reversed", "worse", "decreased", "disapprove", "loses proficiency", "degrades", "less likely to remember", "fabricat")
_IMPROVED_KEYWORDS = ("improved", "increase", "raised", "outperform", "higher", "gains", "more novel", "more durable", "successfully produced", "outperformed")


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
    """This card's own stemma parents: every other loaded card whose
    first-author surname appears, whole-word, in this card's own full
    prose. See this module's own top docstring, "Stemma," for the known
    surname-collision limitation this accepts."""
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


# --------------------------------------------------------------------------
# corpus projection
# --------------------------------------------------------------------------


def _build_corpus(cards: list[Card]) -> Corpus:
    vocab = load_vocab()

    surnames_to_dois: dict[str, list[str]] = {}
    for card in cards:
        surnames_to_dois.setdefault(card.first_author_surname, []).append(card.doi)

    sources: dict[str, Source] = {}
    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []
    provenance: list[RetrievalEnvelope] = []
    fetched_at = datetime.now(timezone.utc).isoformat()

    for card in cards:
        if card.doi in sources:
            # A DOI already seen under an earlier root's own card: dedupe to
            # that first card's Source/evidence/ground-truth/provenance, and
            # fold only this root's own batch label onto the existing
            # Source.batches list. See this module's own top docstring,
            # "Batches," for why a later root's own duplicate never adds a
            # second copy of the same paper's evidence.
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
            stemma_parents=stemma_parents, batches=[card.batch],
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

        first_item_id: str | None = None
        for i, claim in enumerate(card.key_claims):
            item_id = f"{card.doi}-c{i}"
            evidence.append(EvidenceItem(
                id=item_id, kind=kind, tier=tier, source_id=card.doi,
                span=EvidenceSpan(
                    doc_id=card.doi,
                    locator=f"{card.relative_path}:key_claims[{i}] (lines {claim.line_start}-{claim.line_end})",
                    quote=claim.text, char_start=claim.char_start, char_end=claim.char_end,
                ),
                provenance=EVIDENCE_PROVENANCE_TAG,
                actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
                interval=interval, stance=Stance.POSITIVE,
            ))
            if first_item_id is None:
                first_item_id = item_id

        if _is_ground_truth(method, findings_text) and first_item_id is not None:
            ground_truth.append(GroundTruthEvent(
                id=first_item_id, label=_truncate(card.title), year=card.year,
                doc_id=card.doi, discovery_year=card.year,
            ))

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=vocab)


# --------------------------------------------------------------------------
# local loading
# --------------------------------------------------------------------------


def _iter_card_paths(directory: Path) -> list[Path]:
    return sorted(p for p in directory.rglob("*.md") if p.name != "README.md")


# --------------------------------------------------------------------------
# network fetch (only reached when a caller passes no `cards_dir`; see this
# module's own top docstring)
# --------------------------------------------------------------------------


def _cache_dir_for_ref(ref: str) -> Path:
    """Where a live fetch caches card files: `$LITERATURE_CARDS_DIR` if
    set, matching `hte.corpus.production`'s own `PRODUCTION_FIXTURES_DIR`
    convention, else a ref-scoped directory under the platform temp dir.
    No specific session's own scratchpad is hard-coded into this module;
    `tempfile.gettempdir()` is the portable equivalent every caller gets
    for free, on every machine this package runs on."""
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
    """Every `.md` card path under `_intake/research-os-k12-literature/` at
    `ref`, `README.md` excluded, via GitHub's own recursive git-trees API
    (one request lists the whole corpus, rather than one request per
    branch directory)."""
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/git/trees/{ref}?recursive=1"
    request = urllib.request.Request(url, headers=_github_headers())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            tree = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
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
    """One card's own raw text at `ref`, wrapped the same way
    `_fetch_card_paths` wraps its own `urlopen` call: a network blip here
    (card 30 of 45, say) raises a `RuntimeError` naming `path` and `ref`,
    not a bare, low-level `urllib` exception naming neither."""
    url = f"{GITHUB_RAW_BASE}/{GITHUB_REPO}/{ref}/{path}"
    request = urllib.request.Request(url, headers=_github_headers())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"literature adapter: could not fetch {path!r} at ref {ref!r}: {exc}") from exc


def _ensure_cards_cached(ref: str) -> Path:
    """Every card at `ref` cached under `_cache_dir_for_ref(ref)`, its own
    raw content fetched only for a path not already on disk there: a
    second `load()` call against the same `ref` and cache directory still
    re-lists the tree (cheap, and the only way to notice a card PR #5 adds
    later), but re-fetches no raw file content, the same idempotent-resume
    convention `agf-figma pull` documents for its own frame exports.

    Each fetch writes through a temp path and an atomic `rename` before a
    cache entry is considered complete, the same convention `hte.llm.
    _write_cache` already uses for its own cache: a process killed mid-
    write (disk full, SIGKILL, Ctrl-C) leaves at most a `.tmp` file next
    to `dest`, never a truncated `dest` itself that `dest.is_file()`
    would then treat as a permanent, valid cache hit on every later
    `load()` call against this same cache directory."""
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
    """`cards_dir` read as a list of card roots: `None` fetches (and
    caches) the single network root at `ref`; a bare path or string is one
    root (batch one's own call shape, kept working unchanged); anything
    else is read as an already-iterable sequence of roots, one per named
    batch, in that sequence's own order. See this module's own top
    docstring, "Batches.\""""
    if cards_dir is None:
        return [_ensure_cards_cached(ref)]
    if isinstance(cards_dir, (str, Path)):
        return [Path(cards_dir)]
    return [Path(root) for root in cards_dir]


def load_raw(
    cards_dir: str | Path | Sequence[str | Path] | None = None,
    *, ref: str = DEFAULT_REF,
) -> list[Card]:
    """Every `Card` across every root in `cards_dir`, parsed losslessly and
    returned in root order then path order within each root. `cards_dir`
    is a single directory of `<branch>/<slug>.md` files (PR #5's own tree
    shape, one root, tagged `"batch-1"`), a sequence of such directories
    (one root per named batch, tagged `"batch-1"`/`"batch-2"`/... by
    position; `DEFAULT_CARDS_DIRS` is the canonical "both fixture batches"
    pair), or `None` (fetch the single network root at `ref` on GitHub,
    cached first by `_ensure_cards_cached`, tagged `"batch-1"`). No
    filtering and no cross-root dedup; that is `load`'s own job on the way
    to a `Corpus`, and this corpus, unlike `hte.corpus.production`'s
    review ladder, has no maturity gate of its own to filter on: every
    card PR #5 or PR #15 ships already carries a checked DOI."""
    roots = _normalize_roots(cards_dir, ref)
    cards: list[Card] = []
    for batch_index, directory in enumerate(roots, start=1):
        if not directory.is_dir():
            raise FileNotFoundError(f"literature adapter: cards directory not found: {directory}")
        paths = _iter_card_paths(directory)
        if not paths:
            raise FileNotFoundError(f"literature adapter: no card files found under {directory}")
        batch = f"batch-{batch_index}"
        cards.extend(_parse_card_file(path, directory, batch) for path in paths)
    return cards


def load(
    cards_dir: str | Path | Sequence[str | Path] | None = None,
    *, ref: str = DEFAULT_REF,
) -> Corpus:
    """The literature corpus as a `Corpus`: `load_raw(cards_dir, ref=ref)`
    projected onto `hte.corpus.Corpus` by `_build_corpus`, which dedupes a
    DOI shared by more than one root down to its first root's own card
    (folding every later root's own batch label onto that same `Source`
    instead). See this module's own top docstring for the full `Source`/
    `EvidenceItem`/`GroundTruthEvent`/stemma mapping."""
    return _build_corpus(load_raw(cards_dir, ref=ref))


def load_default() -> Corpus:
    """`_CORPUS_LOADERS`'s own zero-arg registration (`hte/cli.py`,
    `hte/runner.py`), the shape every other corpus loader there already
    has: `load(DEFAULT_CARDS_DIRS)`, both fixture batches combined (12
    cards, no network, deterministic).

    This does *not* read the real, on-disk `LOCAL_INTAKE_DIR` tree (82
    cards past PR #15): that tree carries a gap this module does not yet
    handle, three educational-methods cards a later, separate pass (bead
    `ros-02`, "Framework mapping papers") added with `doi: null` plus an
    `isbn`/ERIC-id field instead of a DOI (Anderson and Krathwohl 2001,
    Perkins 1993, Wiske 1998; `_intake/research-os-k12-literature/README.
    md`'s own "canon-intake promotions" section names the same three
    non-DOI records). `_parse_frontmatter` requires a real `doi:` and
    raises on a `null` one, so `load(LOCAL_INTAKE_DIR)` fails on those
    three cards today; giving every non-DOI source a stable fallback id
    (an `isbn:`-prefixed slug, say) is real, separate follow-up work this
    pass does not take on, since it touches `Source.id`/`EvidenceItem.
    source_id`/`GroundTruthEvent.doc_id`'s own DOI-shaped id convention
    everywhere in this module, not just batch two's own cards."""
    return load(DEFAULT_CARDS_DIRS)


__all__ = [
    "Card", "Claim",
    "load_vocab", "load_raw", "load", "load_default",
    "LITERATURE_VOCAB_PATH", "DEFAULT_FIXTURES_DIR", "DEFAULT_FIXTURES_DIR_BATCH_TWO",
    "DEFAULT_CARDS_DIRS", "LOCAL_INTAKE_DIR", "EVIDENCE_PROVENANCE_TAG",
    "GITHUB_REPO", "GITHUB_INTAKE_PATH", "DEFAULT_REF",
]
