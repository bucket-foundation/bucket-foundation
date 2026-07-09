# Cycle-2 Review — Investor / Executive

*Reviewer lens: technology investor / operating exec. Smart, busy, not a physicist. Same reader as cycle 1. I want to know where the real opportunities and real risks are, fast, and whether the revisions closed the gap between "great map" and "usable strategy."*

## Verdict

**Yes — and it moved.** Cycle 1 landed on "a superb map and a weak strategy": the investable conclusions were all in the text but never assembled anywhere I could act on, and a non-physicist who jumped to Chapter 5 hit a jargon wall with no glossary. Both of those — my two loudest complaints — are now fixed, and fixed well. The atlas has gone from a map I admired to a map with a strategy section stapled to the front of its most important chapter.

The single best change: Chapter 5 now **opens** with the 27-industry dashboard, and every row carries an "Invest read" column — Invest now (sensing) / Invest now (PQC) / Watch 2030 / Ignore, with the trap named inline (Ignore — quantum-inspired trap; Ignore — TAM trap). That is the one page I asked to be lifted to the top, and it is there, doing exactly the work I wanted. The chapter then closes with **"What this means for buyers and investors,"** four imperative paragraphs: buy the revenue that exists (sensing + PQC migration), buy the picks-and-shovels chokepoints for lower variance, price pure-play compute as a 2029–2030 option against the ~$1B of real revenue rather than the trillion-dollar decks, and discount two traps on sight. That is the capital-allocator synthesis that was missing. It reads like an IC memo, not a lecture.

The glossary is the other win. ~183 plain-language entries, and it covers essentially every term I flagged as blocking — fault tolerance, logical vs physical qubit, NISQ, PQC, QKD, HNDL, CRQC, annealing, Shor, Grover, fidelity, coherence, amplitude estimation, dequantization, TLS, dilution fridge, cryo-CMOS, Mosca's inequality, OPM/magnetometry, gravimetry, squeezed light, QAOA, VQE. Each entry also carries the graded-evidence nuance (a vendor metric is called a vendor metric; a contested advantage is called contested). This is the difference between an exec finishing Chapter 5 and bouncing off it.

Net: on trust and usefulness this was already a 9/10 and stays there; on **strategy-for-a-capital-allocator** it moved from roughly 4/10 to 7/10. What keeps it from decision-grade is one structural omission the revision did not attempt — the company/ticker roster is still scattered across prose with no consolidated matrix. Fix that and I would build a screen from this, not just cite it.

## What landed

1. **Ch5 dashboard lifted to the top, with an Invest-read column.** The 27-row matrix now opens the chapter (`### The industry map at a glance`) instead of closing it, and the intro sentence does the skim work for me: "Eight industries are investable in 2026… ten more are 2030 watches… nine are ignores." The Invest-read column is genuinely decision-useful and even flags the two economic traps per row.
2. **"What this means for buyers and investors" section exists and is imperative.** Four plays in plain voice, all grounded in analysis already in the text. This is the front-matter I asked for, delivered as a chapter closer.
3. **Glossary shipped and it covers the blockers.** ~183 entries, plain-language, honest about evidence tier. Spot-checked against my cycle-1 blocking list: near-complete coverage.
4. **Node-ID codes removed from prose.** Zero `(I-…)/(S-…)/(O-…)` hits in Ch5/Ch6. The prose now refers to ideas by name and chapters as "Chapter 3." The error-code noise is gone.
5. **FeMoco figure reconciled across chapters.** The 99,000 / 2.7M / 4M confusion is now one explained range — Alice & Bob's Oct 2025 cat-qubit estimate (~99k physical) against the 2021 Google/Lee few-million baseline, with Ch8's ~4M / 1,137-logical fuller count cross-referenced in the same sentence. Clean.
6. **DARPA QBI surfaced as an independent screen.** Ch6: "a rare public negative signal in a promotional field… one of the few credible independent screens." Exactly the due-diligence input I flagged. Being *cut* by QBI is framed as a signal — the right read.
7. **Ch6 figure punchlines now stated in sentences.** "The figure's point is that the 3x gap between these two totals is a definitional artifact"; "Patents split on a volume-versus-quality axis, and the lead flips with the denominator." A prose skimmer no longer loses the numbers to the SVGs.
8. **cuEST kept but tagged T4 in both places** (the acceptable resolution of the cycle-1 flag).
9. **The grading-reflex "four questions" still closes Ch8**, and no self-honesty narration residue survives the sweep.

## Regressions

None material. One cosmetic note: escaped `\$` before dollar figures persists in Ch5 (e.g. lines 55, 150, 161). In the MathJax-rendered HTML this is the correct escape to print a literal `$`, so it renders fine; it only looks odd in raw markdown. Not worth a pass on its own.

## The next tier — what would make this decision-grade

The revision brief deliberately scoped a subset of cycle 1 (table move + buyers section + glossary + code cleanup). It executed that subset cleanly. The following cycle-1 asks were not attempted and are what stand between "I'd cite it" and "I'd build a position from it":

1. **No company/ticker matrix — the biggest remaining gap.** Ch6 contains zero tables. IonQ, Rigetti, D-Wave, Quantinuum, PsiQuantum, IQM, Pasqal, QuEra, Alice & Bob, SandboxAQ, Q-CTRL are still met one at a time across three chapters. The valuation shocks (IonQ P/S in the 800s, the SPAC cohort, the H1-2026 exits) live only in Ch6/Ch8 prose. One consolidated table — name / public or private / modality / near-term revenue source / valuation flag — is the single highest-value addition left. Anchor DARPA QBI's ~20 evaluated companies to it as the independent-screen column.

2. **The synthesis lives only in Ch5.** Ch6 (money, nations, standards) still ends on the "auditor's reflex" — good framing, but it is diagnosis, not positioning. An investor who opens at Ch6 gets no allocation read. Echo the four-play synthesis at the front of the atlas (Preface) or at the close of Ch6/Ch8 so the strategy is not stranded in one chapter.

3. **Promote the two portable tools to the front.** Ch8's four-questions checklist and Ch5's two economic-distortion traps (TAM double-counting; quantum-inspired conflation) are the reader's operating manual. They are still buried at the ends of their chapters. A one-box version in the Preface would let a busy reader carry the method in before the detail.

4. **No time-horizon / scenario read for the hardware race.** The honest refrain is "no modality wins." True, but a capital allocator still needs the if/then: if superconducting hits the wiring wall, who benefits; if neutral atoms' logical-qubit lead holds, who; if topological ever works, it resets every roadmap. Chapter 2 has the pieces and never assembles the scenarios.

5. **A few glossary gaps for the skimmer.** QUBO appears three times in the Ch5 dashboard and prose and is undefined, while its siblings QAOA and VQE are glossed — add it. TAM and CAGR are also absent; define TAM in one line as "a forecast of what vendors might one day sell, not revenue," since the atlas's own thesis is that these numbers are inflated.

6. **No per-chapter escape hatch.** Ch1 and Ch3 still open straight into physics with no "the physics is settled, so it is not where your risk lives — skip to 2, 5, 6, 8" box at the top. The Preface's "Who it's for" covers this at the book level, but a physicist-depth chapter still needs a one-line exit for an exec.

## New top-5 (highest-value edits for cycle 3)

1. **Add one company/ticker matrix** spanning Ch2/Ch5/Ch6: name / public-or-private / modality / near-term revenue source / valuation flag / DARPA-QBI status. This is the one thing that turns the atlas into a screen.
2. **Echo the four-play buyers-and-investors synthesis at the front of the atlas** (Preface) and at the close of Ch6, so the strategy is not stranded in Chapter 5.
3. **Promote the operating manual to the Preface** — Ch8's four-questions headline test plus Ch5's two economic traps, as a single boxed front-matter tool.
4. **Add a "scenarios and who wins each" read to the hardware race** in Ch2 (superconducting wiring wall / neutral-atom logical lead / topological reset), with a rough time-horizon per branch.
5. **Close the glossary gaps** — QUBO, TAM (as "forecast, not revenue"), CAGR — and add a one-line "investor's takeaway / skip-to" box at the top of Ch1 and Ch3.
