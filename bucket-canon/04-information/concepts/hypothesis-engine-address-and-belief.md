# Concept node: Hypothesis Address Space and Subjective-Logic Belief

> **Type:** primary-method. A canon concept node, distinct from a figure card.
> **Branch:** 04-information · **Cross:** 01-mathematics (combinatorics, unique
> factorization), 08-deep-history (the corpus this method scores)
> **Added:** 2026-09-10, first contribution pass
> **Source:** `papers/history-hypothesis-engine/main.tex` ("A Hypothesis Engine
> over History: Combinatorial Generation, Subjective-Logic Belief, and
> Structural Unknowns," Dichio, Bucket Foundation, 2026-09-09), Lean
> formalization at `papers/history-hypothesis-engine/lean/Bucket/`, design
> specs at `_intake/hypothesis-engine/`
> **Reference implementation:** `tools/hypothesis-engine/` (package `hte`)
> **Zenodo DOI:** [10.5281/zenodo.22694649](https://doi.org/10.5281/zenodo.22694649)
> (v1.0.0, minted 2026-09-10, design paper and Lean sources)

This is the first **primary-method** node under 04-information: a combinatorial
address scheme plus an evidence-fusion belief calculus, both stated and Lean-
proved, in place of one more claim card extracted from a transcript. The PDF
and Lean sources stay in `papers/` and `papers/.../lean/`; this card is the
canon-side pointer, per the sidecar-manifest convention in `PROTOCOL.md` §4:
the artifact lives at its source path, the card records provenance and
carries the primary derivations into the branch index.

## 1. Statement of the method

Every hypothesis about a historical claim, an actor did some action, on some
object, at some place, in some time bin, by some mechanism, addresses a point
in a fixed combinatorial space instead of a free-text guess. The address is a
Gödel-style encoding: fix the first six primes (2, 3, 5, 7, 11, 13) to the six
slots in order and take the product of `prime_slot ^ (vocab_index + 1)` across
slots (`Bucket.Address.encode`). The fundamental theorem of arithmetic makes
two distinct slot-index tuples land on two distinct addresses, so the space is
enumerable and collision-free by construction rather than by convention.

Each address carries a posterior belief instead of one point score. The belief
is a subjective-logic opinion, `(b, d, u, a)`, belief mass, disbelief mass,
uncertainty mass, and a base rate, built from evidence counts by
`Bucket.Belief.fromEvidence`. A hypothesis nobody has examined reads as high
uncertainty; a hypothesis actively contradicted reads as high disbelief. The
two are different numbers, so a reader can tell an unexamined hypothesis apart
from a refuted one, which a single point-credence score cannot do.

A structural-unknowns layer estimates what the address space's own evidence
has not yet covered, an unnamed concept, an unexcavated interval, using
Good-Turing missing-mass and the Chao1 species-richness estimator
(`Bucket.Unknowns`), so the model's blind spots sit inside the address space
instead of a footnote added after the fact.

## 2. Why this is primary-method tier

By the canon's own test, a contribution is foundation-tier when it states an
axiom, a law, a primary derivation, or, as here, a primary method: a
reusable formal construction with its own proved properties, the way Shannon's
coding theorems or Dempster-Shafer evidence combination are primary methods
inside 04-information's existing scope of information theory, coding theory,
and learning and complexity. This method is not an application of a law from
elsewhere; it derives its own injectivity, normalization, and totality
theorems, proved in Lean 4 against no external assumption beyond core Lean and
its own definitions.

Any specific run of the engine, a scored timeline over the quantum-history
corpus or the education-atlas corpus, is outcome-tier: an application of the
method to a dataset. The method itself, the address scheme and the belief
calculus, is what belongs in canon.

## 3. Key derivations

| Lean file | Statement | Status |
|---|---|---|
| `Bucket/Address.lean` | `encode_injective_bounded`: distinct slot tuples give distinct addresses, proved by exhaustive decision for bounded vocabulary size | proved |
| `Bucket/Address.lean` | `encode_injective`: the same injectivity for an arbitrary vocabulary size | stated, `sorry`, needs Mathlib's `Nat.factorization` |
| `Bucket/Belief.lean` | `sum_eq_one`: an opinion's belief, disbelief, and uncertainty mass sum to exactly one | proved |
| `Bucket/Belief.lean` | `project_mem_unit`: the projected probability `b + a·u` stays in `[0, 1]` | proved |
| `Bucket/Belief.lean` | `u_eq_one_of_no_evidence`: zero evidence forces uncertainty mass to one | proved |
| `Bucket/Timeline.lean` | `relate_total`: every pair of intervals gets exactly one of the thirteen Allen relations | proved |
| `Bucket/Timeline.lean` | `relate_converse_before_after`, `relate_converse_meets_metBy`: converse-relation pairs match, up to one degenerate instant-on-instant case | proved |
| `Bucket/Unknowns.lean` | `missingMass_le_one`: the Good-Turing missing-mass estimate never exceeds one | proved |
| `Bucket/Unknowns.lean` | `chao1_ge_sObs`: the Chao1 richness estimator never reports fewer species than were observed | proved |

`lake build` (Lean 4.33.1, Lake 5.0.0) passes all six files with the one
disclosed `sorry` above; see `papers/history-hypothesis-engine/REVIEW-2026-09-09.md`
for the full referee pass and rebuild transcript.

## 4. Reference implementation and downstream runs

`tools/hypothesis-engine/` (`hte`) implements every module above in Python,
plus the generator, tournament, and calibration layers the Lean side leaves
out of scope (`tools/hypothesis-engine/README.md`). Two corpora have run
through it so far:

- `quantum-history`, the `quantum/07-history` corpus, with a published
  6-page campaign report and calibration run at
  `tools/hypothesis-engine/runs/quantum-history/20260910T085020Z/`.
- `education-atlas`, the sibling repo's sample tables, a second corpus
  adapter proving the method is not corpus-specific
  (`tools/hypothesis-engine/hte/corpus/education_atlas.py`).

## 5. Status

- **Method:** primary, Lean-verified where stated above, one disclosed gap
  (`encode_injective`'s general case).
- **Not yet in canon:** the campaign runs themselves (outcome-tier, scored
  timelines over a corpus) and the generator/tournament/evolver layers, which
  have no Lean counterpart by design (`tools/hypothesis-engine/README.md`,
  "Design notes for the next agent").
