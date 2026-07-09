# Revision brief — cycle 3 (fact-check + flow + course-instructor)

Cycle 2's content is sound (fact-check: "remarkably so"). Cycle 3 = small fact fixes,
flow de-duplication + two number bugs, and the **pedagogical apparatus** that turns the
book into a real course text. Reviews in `_reviews/cycle3/`. Preserve every `<svg>`/`<figure>`.

## GLOBAL — add the same pedagogical apparatus to EVERY chapter (instructor's #1–#4 asks)
Add these four elements to your `_CHAPTER.md`, in the book's voice (plain, declarative,
no hype, no "not X but Y", never "genuinely"):

1. **Learning objectives** — right after the chapter's opening bridge, a short block:
   `**Learning objectives.** After this chapter you can …` then 4–6 bullet outcomes.
2. **Key takeaways** — just before the closing `### Where … stands` section, a boxed
   blockquote: `> **Key takeaways**` then 4–6 one-line bullets (the "Where X stands"
   prose is your raw material — distill, don't repeat verbatim).
3. **Exercises and discussion** — a `### Exercises and discussion` section near the end,
   4–6 items tiered for a mixed cohort: a derivation/physics item, a resource-estimation/
   complexity item for CS, a spec-reading/trade-off item for engineers, and 1–2 seminar
   prompts (draw the seminar prompts from the conflict register where relevant).
4. **Further reading** — a `### Further reading` section, 4–6 curated primary sources
   (papers, reviews, standards) with one-line "why." Real, verifiable references only.

## FACT fixes (fact-check)
- **Ch5** — PsiQuantum row: "~$6B+ raise" is the wrong category. Fix to match Chapter 6:
  ~$6B pre-money / $7B post-money valuation; ~$2B total raised (incl. $1B Series E, Sep 2025).
  Put the valuation in the valuation-flag cell, not "raise."
- **Ch5** — Pasqal DARPA-QBI "Stage A": unverifiable (not in the named cohort). Soften to
  "not in the named QBI cohort" or drop the stage claim for Pasqal.
- **Ch6** — Quantinuum "$839M" raise → "~$600–800M upsized round at a $10B pre-money
  valuation" (the $10B is right; the $839M is over-precise).
- **Ch6** — GRI "22.7% by 2030" → "~25% by 2030" (keep "~50% by 2035").

## FLOW fixes (flow review)
- **Ch2** — collapse the double conclusion: "Where the hardware stands" and the new
  "Scenarios" section give the modality verdict twice (four times counting the table and
  final paragraph). Merge Scenarios INTO the closing synthesis, and delete the second
  verbatim "reproduced five" list (Willow, Helios, QuEra, Diraq/imec, SQC).
- **Ch4** — de-duplicate the PQC-migration box against its lead-in prose. Six facts (SIKE
  2022, Chrome/Firefox/Cloudflare hybrid default, FIPS 203/204/205 Aug 2024, CNSA
  2027/2030/2035, the Mosca window, "inventory is the bottleneck") are each stated twice
  within one screen. Keep the box as the action sequence; state each fact once in the prose
  and let the box reference it.
- **Ch5** — cut the duplicated "two traps" (TAM double-counting + quantum-inspired): keep
  the version in the investor section; reduce the "Where the industry stands" instance to a
  one-line pointer.
- **Ch6** — after the "which policy lever buys what" instrument table, stop re-explaining
  the levers in full prose (DARPA QBI is explained three times total, counting Ch5's table).
  Keep the table as the definition; trim the later prose to what the table doesn't cover.
- **Ch8 — NUMBER BUG:** "Quantinuum 94 logical qubits at roughly 2:1" is wrong and
  impossible on Helios's 98 physical qubits. It is **48 error-corrected logical qubits (2:1)**,
  plus a separate **94-qubit GHZ state** (a state, not 94 logical qubits). Fix to match Ch3/Ch7.
- **Ch2 / Ch7** — reconcile the QuEra 48-logical-qubit date: it is **Nature 2024**
  (Bluvstein et al.); make both chapters say the same (the 96-logical result is Jan 2026).

## NEW APPENDICES (instructor #2 and #5) — handled by a separate agent, not the chapter agents
- **Math primer** (`evidence/MATH-PRIMER.md`) — bra-ket notation, complex amplitudes,
  inner products, unitaries, density matrices, the Lindblad equation — a short "linear
  algebra over ℂ you need" that CS/eng students can fall back to.
- **Lab track** (`evidence/LAB-TRACK.md`) — a graded lab sequence built on the existing
  `reference-impl/` (CHSH value, Grover on 3 qubits, surface-code qubit counting, the
  cosine-kernel overlap / swap test), each lab mapping to a runnable command in the repo.

## Output
Chapter agents: edit only your one `_CHAPTER.md`; add the 4 apparatus elements + your fact/
flow fixes. Preserve every `<svg>`/`<figure>`. Report what you added.
