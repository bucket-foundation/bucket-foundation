"""Per-domain vocabulary induction from a corpus's own evidence.

Every corpus adapter this package ships today (`hte.corpus.quantum_history`,
`hte.corpus.production`, `hte.corpus.education_atlas`, `hte.corpus.
literature`) pairs its own hand-written `hte/data/vocab-*-seed.json` file
with a `load_vocab()` function: a human picked every concept id and label
ahead of time, and every ingestion pass validates its own extracted slot
values against that fixed list. That works when a domain's own vocabulary
is small and stable (a dozen named actors, a handful of mechanisms), and
breaks down for a domain nobody has hand-authored a seed for yet: a K-12
Research OS production about physics (`docs/PRODUCTION-SCHEMA-ALIGNMENT.md`,
"the null-slot gap on physics productions") names concepts the K-12
production adapter's own meta-vocabulary (`tier-assignment`,
`hypothesis-ranking`, ...) was never built to hold, so every one of its
slots reads `None` rather than misrepresent the claim by forcing it into
the wrong vocabulary.

`induce(corpus, ...)` is the other way to get a working `Vocabulary`: read
it off the corpus's own evidence instead of writing it by hand. Every slot
value already present on `corpus.evidence` (`hte.evidence.EvidenceItem.
actor`/`.action`/`.object`/`.place`/`.mechanism`) is either a concept id a
hand-written seed already names, or a fresh value with no home yet; this
module turns the fresh ones into real concepts with a stable, deterministic
id and a human-readable label, so a caller gets a vocabulary that already
covers everything its own corpus asserts. `corpus.ground_truth`
needs no separate reading of its own: every corpus this package ships
shares one id between a `GroundTruthEvent` and the `EvidenceItem` carrying
its own slots (`hte.corpus.production._build_corpus`'s own "the same
one-id-shared-between-both-records convention `hte.corpus.fixtures`/
`education_atlas` use," repeated at every other adapter), so a ground-truth
event's own slots are already reachable by scanning `corpus.evidence` alone.

Two ways to call it, matching `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`'s own
"wire it as the default... and as a merge step" framing:

- `induce(corpus)`, no `seed_vocab`: the default for a domain with no
  hand-written seed at all. Every slot value on file becomes a concept;
  `Vocabulary`'s own `OTHER` placeholder and this module's own five
  synthetic non-consensus actors round it out to a working vocabulary
  (`TIMELINE-AND-COMBINATORICS-SPEC.md` §2's own "`OTHER` per slot plus
  the five non-consensus actors" shape, matched here without a
  hand-written seed to copy it from).
- `induce(corpus, seed_vocab=some_domain.load_vocab())`: a merge step for
  a domain that already ships one. Every one of the seed's own concepts is
  kept, at its own id, label, prior, consensus status, and vocabulary
  index (so an address already encoded against `seed_vocab` decodes
  identically against the result); anything on `corpus.evidence` the seed
  does not already name is appended after it. `hte.corpus.production.
  _build_corpus` calls `induce()` this way now, over its own `load_vocab()`
  seed, so a Research OS production naming a concept outside that seed
  (a graph node id, `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`'s own physics
  case) still resolves instead of raising.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from .concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_id
from .corpus import Corpus

# The five concept-bearing slots a placement fills, in the same fixed order
# `hte.generate.PLACEMENT_CONCEPT_SLOTS` reads them (TIME and RELATION carry
# no concept vocabulary of their own; see `hte.concepts.Slot`'s own
# docstring).
INDUCIBLE_SLOTS: tuple[Slot, ...] = (Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM)

_EVIDENCE_SLOT_FIELDS: tuple[str, ...] = tuple(slot.value for slot in INDUCIBLE_SLOTS)

# Whether a raw slot value is already shaped like a stable concept id
# (lower-case, hyphen-separated words, `hte.corpus.education_atlas`'s own
# `polity-<iso3>` and `hte.corpus.production`'s own `target_node_id` slugs
# both already match this): such a value is kept verbatim as its own id
# rather than re-slugified into a different string, so a value that is
# ALREADY a stable id across repeated `induce()` calls (a Research OS
# `target_node_id`, say) never drifts.
_ID_SHAPED_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

_MAX_ID_LEN = 60
_MAX_LABEL_LEN = 140

# The five synthetic non-consensus ACTOR concepts `induce()` adds when
# neither a `seed_vocab` nor the corpus's own evidence already supplies
# five (`TIMELINE-AND-COMBINATORICS-SPEC.md` §2's own "OTHER per slot plus
# the five non-consensus actors" shape; `hte.synth._build_vocabulary`'s own
# `N_EXOTIC_ACTORS = 5`, alternating FRINGE/CONTESTED starting from FRINGE,
# is the precedent this list's own ordering matches). Domain-agnostic on
# purpose: unlike every hand-written seed's own five (`extraterrestrials`
# for a history corpus, `reviewer-halo-effect` for the K-12 production
# meta-vocabulary), a corpus this module induces a vocabulary for by
# definition has no hand-authored domain framing to draw a themed five
# from, so these read as generic failure modes any domain's own account
# can suffer from instead.
_GENERIC_NON_CONSENSUS_ACTORS: tuple[tuple[str, str, ConsensusStatus], ...] = (
    ("induced-unverified-single-source", "An unverified single source, no independent corroboration", ConsensusStatus.FRINGE),
    ("induced-narrative-embellishment", "A story embellished in the retelling", ConsensusStatus.CONTESTED),
    ("induced-coincidental-correlation", "A coincidental correlation mistaken for a cause", ConsensusStatus.FRINGE),
    ("induced-measurement-artifact", "A measurement or instrument artifact standing in for a real effect", ConsensusStatus.CONTESTED),
    ("induced-unidentified-actor", "An actor this corpus's own evidence never identifies", ConsensusStatus.FRINGE),
)
N_EXOTIC_ACTORS = len(_GENERIC_NON_CONSENSUS_ACTORS)


def _strip_diacritics(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in stripped if not unicodedata.combining(ch))


def stable_id(value: str) -> str:
    """A deterministic, id-shaped slug for a raw slot value: diacritics
    stripped, lower-cased, every run of characters outside `[a-z0-9]`
    collapsed to one `-`, leading/trailing `-` trimmed, and truncated to
    `_MAX_ID_LEN` characters (trimmed again in case truncation lands on a
    trailing `-`). The same `value` always slugifies to the same id, in
    this process or a later one: no randomness, no corpus-order
    dependence, matching `Vocabulary`'s own append-only, frozen-index
    contract (`hte.concepts.Vocabulary`'s own docstring) as closely as a
    freshly induced id can, short of the index itself, which depends on
    what else was added first.
    """
    folded = _strip_diacritics(value).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", folded).strip("-")
    slug = slug[:_MAX_ID_LEN].rstrip("-")
    return slug or "unlabeled"


def _looks_id_shaped(value: str) -> bool:
    return bool(_ID_SHAPED_RE.fullmatch(value))


def _humanize(id_value: str) -> str:
    """A best-effort human-readable label for an id-shaped value with no
    natural-language label of its own (`hte.corpus.production`'s own
    `target_node_id`, say): hyphens to spaces, each word capitalized.
    Not smart casing (an acronym like `usa` reads back as `Usa`); good
    enough for a value this module has no other label for at all."""
    return " ".join(word.capitalize() for word in id_value.split("-")) or id_value


def _truncate(text: str, limit: int = _MAX_LABEL_LEN) -> str:
    return text if len(text) <= limit else text[: limit - 3].rstrip() + "..."


@dataclass
class _SlotBuild:
    concepts: list[Concept]
    ids: set[str]

    def has(self, concept_id: str) -> bool:
        return concept_id in self.ids

    def add(self, concept: Concept) -> None:
        self.concepts.append(concept)
        self.ids.add(concept.id)


def _seed_slot_build(slot: Slot, seed_vocab: Vocabulary | None) -> _SlotBuild:
    """`slot`'s own starting point: every one of `seed_vocab`'s concepts
    for `slot`, in their own order (so their own vocabulary index is
    preserved once `Vocabulary.__post_init__` re-appends `OTHER`), minus
    `OTHER` itself (re-added fresh by the `Vocabulary` this module builds,
    the same way every hand-written seed file's own `OTHER` entry is
    redundant with `__post_init__` and gets overwritten by it). An empty
    build when `seed_vocab` is `None`: the no-seed default starts from
    nothing but this corpus's own evidence."""
    build = _SlotBuild(concepts=[], ids=set())
    if seed_vocab is None:
        return build
    for concept in seed_vocab.concepts(slot):
        if concept.consensus_status == ConsensusStatus.OTHER:
            continue
        build.add(concept)
    return build


def _collect_raw_values(corpus: Corpus) -> dict[Slot, list[tuple[str, int]]]:
    """`{slot: [(raw_value, count), ...]}`, in first-seen order across
    `corpus.evidence` (`ground_truth` needs no separate pass; see this
    module's own top docstring). A value equal to `slot`'s own `OTHER`
    placeholder id (`hte.concepts.other_id`, "some unnamed value asserted
    here") is skipped: it is not a new concept to induce, it is the
    open-world placeholder every `Vocabulary` already carries."""
    order: dict[Slot, list[str]] = {slot: [] for slot in INDUCIBLE_SLOTS}
    counts: dict[Slot, dict[str, int]] = {slot: {} for slot in INDUCIBLE_SLOTS}
    for item in corpus.evidence:
        for slot, field_name in zip(INDUCIBLE_SLOTS, _EVIDENCE_SLOT_FIELDS):
            value = getattr(item, field_name)
            if value is None or value == other_id(slot):
                continue
            bucket = counts[slot]
            if value not in bucket:
                order[slot].append(value)
            bucket[value] = bucket.get(value, 0) + 1
    return {slot: [(value, counts[slot][value]) for value in order[slot]] for slot in INDUCIBLE_SLOTS}


def _new_concept(slot: Slot, value: str, used_ids: set[str]) -> Concept:
    """One freshly induced concept for `value`: an already id-shaped value
    (`_looks_id_shaped`) is kept as its own id verbatim, humanized into a
    label (`_humanize`) since it carries no natural-language label of its
    own; any other value is read as a raw label, slugified into a fresh id
    (`stable_id`) and kept, truncated, as its own label. A slug collision
    (two distinct raw values slugifying to the same id, or a fresh id
    colliding with one `_looks_id_shaped` already claimed verbatim) is
    disambiguated by appending `-2`, `-3`, ... until the id is free, the
    same numbering a filesystem gives a second file of the same name."""
    if _looks_id_shaped(value):
        base_id, label = value, _humanize(value)
    else:
        base_id, label = stable_id(value), _truncate(value)
    concept_id = base_id
    suffix = 2
    while concept_id in used_ids:
        concept_id = f"{base_id}-{suffix}"
        suffix += 1
    return Concept(id=concept_id, slot=slot, label=label, prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS)


def _ensure_non_consensus_actors(build: _SlotBuild) -> None:
    """Tops `build` (the ACTOR slot only) up to `N_EXOTIC_ACTORS` non-
    consensus concepts, reusing whatever `seed_vocab` or the corpus's own
    evidence already supplied (a seed's own five, `hte.corpus.production.
    load_vocab`'s `reviewer-halo-effect` and friends, are never
    duplicated) and filling any remaining slots from `_GENERIC_NON_
    CONSENSUS_ACTORS`, in that list's own order, skipping any whose id is
    already taken (`build.has`)."""
    existing = sum(1 for c in build.concepts if c.consensus_status in (ConsensusStatus.FRINGE, ConsensusStatus.CONTESTED))
    if existing >= N_EXOTIC_ACTORS:
        return
    needed = N_EXOTIC_ACTORS - existing
    for concept_id, label, consensus_status in _GENERIC_NON_CONSENSUS_ACTORS:
        if needed <= 0:
            break
        if build.has(concept_id):
            continue
        build.add(Concept(id=concept_id, slot=Slot.ACTOR, label=label, prior_logit=-2.0, consensus_status=consensus_status))
        needed -= 1


def induce(corpus: Corpus, *, seed_vocab: Vocabulary | None = None, min_count: int = 1) -> Vocabulary:
    """A `Vocabulary` built from `corpus`'s own evidence, optionally merged
    with `seed_vocab`. See this module's own top docstring for the default
    vs. merge distinction.

    For each of the five concept-bearing slots (`INDUCIBLE_SLOTS`): start
    from `seed_vocab`'s own concepts for that slot, if given (`_seed_slot_
    build`); then walk every distinct raw value `corpus.evidence` names for
    that slot, in first-seen order, and for each one appearing at least
    `min_count` times, add it as a new concept (`_new_concept`) unless its
    own value is already a known concept id (the seed's, or one induced
    earlier in this same call). `min_count > 1` is a denoising knob: a raw
    value appearing fewer times than that is dropped rather than given its
    own concept, so an `EvidenceItem` naming it will not resolve against
    the returned vocabulary until `min_count` is lowered or the corpus's
    own evidence grows past that count; the default, `1`, drops nothing.

    `Vocabulary.__post_init__` appends the `OTHER` placeholder to every
    slot on construction, so this function never adds it itself.
    `_ensure_non_consensus_actors` tops the ACTOR slot up to `hte.synth`'s
    own `N_EXOTIC_ACTORS` (5) non-consensus concepts when neither the seed
    nor the corpus's own evidence already supplies that many, so a
    generator's own "exotic" reach (`hte.generate.from_evidence`) and a
    calibration campaign's own false-positive check (`hte.synth.
    score_against_truth`'s `exotic_false_positive_rate`) have real
    non-consensus concepts to work against even when no hand-written seed
    exists at all.
    """
    raw_values = _collect_raw_values(corpus)
    by_slot: dict[Slot, list[Concept]] = {}
    for slot in Slot:
        if slot not in INDUCIBLE_SLOTS:
            by_slot[slot] = []
            continue
        build = _seed_slot_build(slot, seed_vocab)
        for value, count in raw_values[slot]:
            if build.has(value) or count < min_count:
                continue
            build.add(_new_concept(slot, value, build.ids))
        if slot == Slot.ACTOR:
            _ensure_non_consensus_actors(build)
        by_slot[slot] = build.concepts

    alpha = dict(seed_vocab.alpha) if seed_vocab is not None else {}
    default_alpha = seed_vocab.default_alpha if seed_vocab is not None else 1.0
    return Vocabulary(by_slot=by_slot, alpha=alpha, default_alpha=default_alpha)


__all__ = ["induce", "stable_id", "INDUCIBLE_SLOTS", "N_EXOTIC_ACTORS"]
