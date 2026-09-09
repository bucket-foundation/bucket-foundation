# History Hypothesis Engine: Lean formalization

Minimal Lake project backing the History Hypothesis Engine paper, per
`papers/PAPER-STANDARDS.md`'s Lean rule. Every definition the paper's
Preliminaries states has a Lean 4 counterpart here; every lemma the body
states is either proved or left `sorry` with a `TODO:` comment naming the
gap.

## Build

```bash
export PATH="$HOME/.elan/bin:$PATH"   # elan-installed Lean 4.33.1 / Lake 5.0.0
cd papers/history-hypothesis-engine/lean
lake build
```

`lake build` runs with no network access: the project depends on core
Lean 4 only (no Mathlib), so `lake-manifest.json` lists no packages.
`lean-toolchain` pins `leanprover/lean4:v4.33.1` to match the rest of this
repository's papers.

From the paper's own directory, `make lean` runs the same build.

## Modules

| Module | Contents | Status |
|---|---|---|
| `Bucket/Timeline.lean` | `Interval`, `Uncertainty`, `AllenRelation`, `relate` | see below |
| `Bucket/Concept.lean` | `Slot`, `ConsensusStatus`, `Concept`, `Vocabulary` | see below |
| `Bucket/Hypothesis.lean` | `Placement`, `Sequence` | data only, no theorems |
| `Bucket/Address.lean` | `SlotTuple`, `encode` | see below |
| `Bucket/Belief.lean` | `Opinion`, `OpinionQ`, `fromEvidence`, `project`, `fuse` | see below |
| `Bucket/Unknowns.lean` | `missingMass`, `chao1` | see below |
| `Bucket.lean` | imports all six | (no theorems, import only) |

### Theorems

| Theorem | Module | Status |
|---|---|---|
| `relate_total` | Timeline | proved |
| `relate_before_iff` | Timeline | proved |
| `relate_after_iff` | Timeline | proved |
| `relate_meets_iff` | Timeline | proved |
| `relate_metBy_iff` | Timeline | proved |
| `relate_converse_before_after` | Timeline | proved, unconditional |
| `relate_converse_meets_metBy` | Timeline | proved, one non-degeneracy hypothesis (see note below) |
| `lookup_other_succeeds` | Concept | proved |
| `encode_injective` | Address | `sorry`, needs Mathlib's `Nat.factorization` (or an equivalent unique-factorization development), unavailable in this Mathlib-free build |
| `encode_injective_bounded` | Address | proved, for tuples with every index below 2 |
| `sum_eq_one` | Belief | proved (`OpinionQ`) |
| `project_mem_unit` | Belief | proved (`OpinionQ`) |
| `u_eq_one_of_no_evidence` | Belief | proved (`OpinionQ`) |
| `missingMass_le_one` | Unknowns | proved |
| `chao1_ge_sObs` | Unknowns | proved |

One `sorry`, in `Bucket/Address.lean`, on `encode_injective`. The TODO
comment above it names the exact gap: the general injectivity argument
("equal addresses force equal per-prime exponents force equal tuples")
needs unique prime factorization, which this build does not carry without
Mathlib. `encode_injective_bounded`, in the same file, proves the same
fact in full for small, fixed vocabulary sizes (every slot index below 2)
by direct computation, as the concrete sanity check that the scheme is
sound.

**`relate_converse_meets_metBy`'s hypothesis.** `meets` and `metBy` share
a boundary check (`a.stop = b.start` versus `b.stop = a.start`), and
`relate` decides `meets` before `metBy` whenever both checks would fire
at once. Both checks fire together exactly when `a` and `b` are the same
zero-length instant (`a.start = a.stop = b.start = b.stop`), the one case
where the tie-break makes `relate a b = meets` and `relate b a = meets`
both true, not `meets`/`metBy`. The theorem's hypothesis, "at least one of
the two intervals has positive length," rules out exactly that one
degenerate case; every non-degenerate pair of intervals satisfies the
plain converse.

### Mathlib

Not used. `lake-manifest.json` lists no packages, matching the paper
template. The one place a proof would benefit from it is flagged above.
