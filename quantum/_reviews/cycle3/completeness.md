# Cycle 3 — Completeness / convergence review

*Acquiring-editor final read. Scope: whole book — preface, 8 chapters (read past
inline-SVG math), the map, and all appendices (SCHEMA, CONFLICTS, GLOSSARY,
MATH-PRIMER, LAB-TRACK), plus the auto-assembled apparatus in the built manual
(arXiv sweep, node reference index, topic index).*

---

## VERDICT: **SHIP.**

This is a finished, publishable book. It delivers on the promise its preface
makes — a graded research-and-industry map that reads as both a map and a
textbook — and it delivers on it completely, not partially. I found **no
material defects**. What remains is cosmetic and optional; none of it should
hold the book.

The convergence test is met: three revision cycles have driven this from "great
content" to a coherent whole. Every cycle-3-flagged material item is fixed in the
current text (verified below). Continuing to iterate would be infinite polish,
not material work.

---

## Why it clears the bar (the holistic call)

- **The preface's promises are all kept.** It advertises: two ways in (read-through
  vs. map), a uniform evidence-grading method, a conflict register kept as
  first-class objects, an evidence index of recent preprints, a glossary, and a
  node reference index keying every citation anchor back to the map. All exist and
  are populated in the assembled manual as Appendices A–H (grading method A,
  conflict register B, arXiv preprint sweep C, glossary D, math primer E, lab track
  F, node reference index G with 184 graded cards, topic index H). The lettered
  cross-references inside the text (e.g. "glossary in Appendix D", glossary's "see
  Appendix A" for grading) resolve correctly.
- **The grading discipline is genuinely load-bearing, not decorative.** T1–T6
  tiers travel with claims across all eight chapters; vendor numbers are held at
  T4 until reproduced; "advantage/supremacy" is contested-by-default with a
  classical-counterattack note; national-dollar figures are flagged for
  double-counting. The conflict register (15 objects) is cross-linked and each
  entry carries a "resolves when" falsification condition.
- **It is internally consistent on the numbers that recur.** The cross-chapter
  figures that would betray a seam are reconciled deliberately: FeMoco
  (~4M physical / ~2,100 logical Google 2021 → ~99k cat-qubit estimate, 27× cut
  against the 2.7M baseline) matches across Ch3, Ch5, Ch8; RSA-2048 (~20M 2019 →
  <1M 2025) matches across Ch3/4/6/8; the 96-logical-qubit record (QuEra, Jan 2026)
  and the 48-logical 2024 Bluvstein result are stated consistently across Ch2/5/7/8.
- **The textbook apparatus is complete and uniform.** Every chapter has learning
  objectives, a "Where X stands" synthesis, a key-takeaways box, tiered exercises,
  and curated further reading. The math primer and lab track give the CS/eng reader
  a formalism floor and a runnable, repo-backed lab sequence.
- **No placeholders, TODOs, TK/TBD markers, or empty sections** anywhere in the
  chapters, cards, appendices, or map. Node coverage is 184/184 depth-complete;
  the honest "thin nodes" (I-gov, I-retail, I-media) are flagged as thin in the
  text itself rather than hidden.
- **Previously-flagged material bugs are fixed.** The cycle-3 number bug
  (Ch8 "94 logical qubits at 2:1", impossible on Helios's 98 physical qubits) now
  reads correctly as 48 error-corrected logical qubits plus a separate 94-qubit
  GHZ *state*. The PsiQuantum valuation-vs-raise cell, the Quantinuum raise figure,
  the Pasqal QBI-stage claim, and the QuEra 2024 date were all corrected.

## MATERIAL items (must-fix before shipping)

**None.** The book is complete and coherent as a whole; no missing piece a reader
would notice, no structural gap, no internal contradiction, no unfulfilled preface
promise.

## Cosmetic / would-be-nice (ALL OPTIONAL — do not block ship)

1. **GRI odds rounding is inconsistent between two chapters.** Ch6 rounds the
   Global Risk Institute figure to "~25% by 2030"; Ch8 and CONFLICTS.md keep the
   exact "~22.7% by 2030." Same source, both defensible; harmonizing to one form
   (exact or rounded) would be tidier. Purely cosmetic.
2. **Quantinuum IPO tense across sections.** Ch6's money-cycle says "filing for a
   Nasdaq IPO" while the Ch5 company table shows it completed (QNT, Jun 2026). Both
   were true at different points in H1 2026 (S-1 → June pricing); the prior
   fact-check already ruled this "not an error." Optional tense harmonization.
3. **Node-card `Status:` labels vary** ("depth-complete", "depth", "deepened
   (cycle 3)", "deepened (cycle 3, new node)"). These are internal metadata on the
   raw reference-index cards, invisible as prose; normalizing the label string is
   housekeeping, not reader-facing.
4. **Intentional cross-chapter motif repetition** ("picks and shovels", "an
   estimate is not a machine", "find the denominator"). Reads as deliberate
   throughlines; flagged only so it's a conscious choice. Leave as-is.

---

*Bottom line: this is the most current, most honest, best-graded survey of the
quantum field I have read, and it is done. Ship it. The cosmetic list can be
swept in a copyedit pass or left for a second printing; none of it is load-bearing.*
