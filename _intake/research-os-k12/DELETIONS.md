# Research OS for K-12, Deletions Log

Every place Phase 0 build work replaced existing copy, with the original text
kept verbatim below. No file is ever deleted outright; this log exists so a
replaced sentence is never actually lost. See also
`learning/research-os/CHANGE-LEDGER.md`, PR #3's own ledger for the same
convention.

## 2026-09-10, `src/app/research-os/page.tsx`

**Reason.** The system review (`RESEARCH-OS-K12-SYSTEM-REVIEW.md` sections 8
and 12) recommends `02-physics`, grades 3-5, the "why is the sky blue" path as
the Phase 0 slice, and section 11 lists the choice of slice as an open
question only the founder can answer ("Is `02-physics` grades 3-5 ... the
right Phase 0 slice, or does a different branch or a different question
better demonstrate the product?"). PR #3's own `learning/research-os/PLAN.md`
section 8 answered that open question differently, picking the history of
quantum physics, grades 9-12, as its Phase 0 scope. This build (Phase 0
prototype: graph schema, seed data, routing, workspace) was scoped by the
orchestrating task to follow the system review's explicit recommendation, not
PLAN.md's choice, so the shipped code is the sky-is-blue path. The site page's
status paragraph named the quantum-history slice as what Phase 0 "covers,"
which no longer matched the code once this build landed; the paragraph was
updated to describe the path this PR ships and to flag the slice choice as
still open, rather than silently overwriting PLAN.md's own decision.

`learning/research-os/PLAN.md` itself is untouched by this PR; its Phase 0
row (quantum-history) stands as the record of that planning decision. The
review's section 11 open question is still open: which slice best
demonstrates the product is a founder call, not one this PR makes for good.

**Original text, replaced in the "§ status" paragraph:**

> Design, iteration 1, September 2026. Phase 0 covers the history of
> quantum physics for grades 9 to 12, the corpus the hypothesis engine
> already reads. The plan, the learner-state model, the production
> schema, the vendor and data-source map, and the funding and people map
> are public in the repository under `learning/research-os/` and
> `_intake/research-os-k12/`. Pilot classrooms, a pre-registered study of
> the four-tool constraint, and a state-validation paper come before any
> wider release.
