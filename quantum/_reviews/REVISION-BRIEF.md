# Revision brief — cycle 1 (from the 5-reader panel)

Reviews: `_reviews/{physicist,investor,newcomer,skeptic,editor}.md`. Apply the GLOBAL
rules to every chapter; then the per-chapter fixes. Preserve all inline `<svg>` math
and `<figure>` blocks — edit only the prose around them.

## GLOBAL conventions (standardize across all 8 chapters)

1. **Self-name: "the atlas."** Never call the book "the manual," "the map," or "the
   book" in prose. (editor)
2. **Evidence tiers: plain form only.** Write `T4` in running prose, e.g. "a vendor
   claim (T4) until reproduced" or "graded T4." No brackets `[T4]`, no bold `**T4**`,
   no backslash-escapes `\[T4\]`. Sweep every variant to the plain form. (editor, skeptic)
3. **Kill node-ID codes in prose.** Remove bare parenthetical reference codes —
   `(I-cyber)`, `S-shor`, `O-scaling`, `C-advantage-survival`, `§03`, `§04` — from the
   narrative. They read like error codes. Refer to ideas by name and to other chapters
   as "Chapter 3" (spelled out). The codes stay in the reference index, not the prose.
   (investor, editor)
4. **Clean recovery-escape artifacts.** This text was recovered via HTML→markdown, so
   stray backslashes leak: fix `\<` → `<`, `\&lt;` → `<`, `\[T3\]` → `T3`, `\$…\$`,
   `\|`, literal `\-\-\-\-`, and any `####`/`------` that should be `###`. Read for
   visible backslashes and remove them. (editor, skeptic)
5. **No self-honesty narration.** Cut sentences that announce the book's own honesty —
   "the manual working as designed," "the reason the atlas can be trusted is…," "this
   chapter refused to pretend otherwise." Let the grading demonstrate it. (skeptic)
6. **State each figure's punchline in a sentence.** The SVG figures' points vanish in a
   text skim, so near each figure add one plain sentence with its takeaway (the number,
   the gap, the ranking). (investor)
7. **Chapter openers: uniform.** No italic dateline lines, no "Layer N" labels. Open
   with a plain bridge sentence from the prior chapter. Major sections `##`, subsections
   `###`, minor `####`. Chapter closers all `### Where … stands`. (editor)
8. **Style rules (hard):** no "genuinely / truly / really" as intensifiers; no
   "X, not Y" / "not X but Y" antithesis (split into clean positive sentences); no hype
   words (revolutionary/seamless/robust/boost/leverage). (editor, skeptic)

## PER-CHAPTER fixes

### Ch1 — The Physics (01-foundations/_CHAPTER.md)
- **On-ramp without dumbing down:** give each of the first ~8 concepts a one-line plain
  opening before the formal notation (state = a list of amplitudes; superposition =
  several nonzero at once; Bloch sphere = a globe of one-qubit states), THEN the math.
  (newcomer) But keep it tight — (physicist) says don't over-explain undergrad basics.
- **Expand the expert synthesis:** the contextuality = Wigner-negativity = stabilizer/
  magic "one resource, three faces" idea deserves a real paragraph, not one line. (physicist)
- **Fix physics:** Bloch-sphere rotations are `SO(3)`, with `SU(2)` its double cover
  acting on the state — the text conflates them. (physicist)
- Soften "The physics is ready" → "the core is settled; the open questions sit at the
  edges" (the measurement-problem section undercuts the flourish). (skeptic)
- Mark the information-theory back third as skippable on a first read. (newcomer)

### Ch2 — The Machines (02-hardware/_CHAPTER.md)
- Forward-gloss QEC terms used before Chapter 3 defines them: below-threshold, surface
  code, code distance, logical vs physical qubit — one clause each. (newcomer)
- Tag the Quandela single-photon-source specs as a vendor claim (T4); right now they're
  ungraded while neighbors are tagged. (skeptic)

### Ch3 — From Qubit to Answer (03-stack-algorithms/_CHAPTER.md)
- Mark the complexity-theory paragraph (BQP/BPP) skippable on a first read. (newcomer)
- Fix "T-count and T-depth, not raw gate count" antithesis → positive sentence. (editor)
- Standardize tier typography (this chapter is fine; just confirm plain form).

### Ch4 — Beyond Computing (04-adjacent-tech/_CHAPTER.md)
- Remove "genuinely" and "truly quantum." (editor)
- Fix antitheses: "reimbursement, not physics"; "physics — not technology"; "not just …
  technical." → clean positive sentences. (editor, skeptic)
- **Grading fix:** Kómár et al., Nat. Phys. 2014 is a single refereed proposal → T2, not
  T1. (physicist)
- Split the over-stuffed A-pnt and squeezed-light em-dash paragraphs. (editor)

### Ch5 — The Industry Map (05-industries/_CHAPTER.md)
- **Verify or cut "NVIDIA cuEST."** No such public product exists (cuQuantum, cuLitho,
  CUDA-Q do). It appears twice as a 50× claim. If it can't be sourced, cut it; if kept,
  tag T4 in both places. (physicist, skeptic)
- **Move the 27-industry table up** to open the chapter as a dashboard, and add an
  invest-now / watch-2030 / ignore read per row. (investor)
- **Reconcile the FeMoco number** with Chapter 8: the 2021 Google baseline reads 2.7M
  physical qubits here and ~4M in Ch8; the same molecule shows 99,000 / 2.7M / 4M across
  chapters. Verify the real figures (2021 Lee/Google ≈ few-million physical qubits;
  Alice & Bob cat-qubit estimate ≈ 99k) and use them consistently, cross-referencing Ch8. (skeptic)
- Drop the stray "Layer 4" dateline; fix the escaped `\[T3\]` rendering. (editor)
- **Add a closing section "What this means for buyers and investors"** — 3–5 short
  imperative paragraphs gathering the conclusions already in the text: near-term revenue
  is sensing + PQC migration; the lower-variance play is the supply-chain chokepoints
  (fridges, helium-3, diamond, detectors); pure-play compute is a 2029–2030 option priced
  on ~$1B of real revenue; the two traps are TAM double-counting and quantum-inspired
  conflation. (investor)

### Ch6 — Money, Nations, and Standards (06-ecosystem-geopolitics/_CHAPTER.md)
- State each data-figure's punchline in a sentence (the dollar-ladder, the $3.9B-vs-$12.6B
  VC split, the patent volume-vs-quality figure). (investor)
- Split the over-stuffed valuation em-dash sentence. (editor)

### Ch7 — How We Got Here (07-history/_CHAPTER.md)
- **Fix the real error:** the transmon (Yale, 2007) was not co-authored by Martinis, and
  the 2025 Nobel was for the 1984 macroscopic-quantum-tunneling work (Clarke, Devoret,
  Martinis) — the chapter's own Nobel section says this correctly, so the transmon line
  is an internal contradiction. Correct the attribution and include Clarke. (physicist)

### Ch8 — The Honest Frontier (08-frontier-open/_CHAPTER.md)
- **Give Hossenfelder a real paragraph.** She gets one dismissive sentence while Kalai
  gets a full fair page — the biggest fairness gap in the book, and her hype critique is
  corroborated by the book's own advantage scorecard. State her position at strength. (skeptic)
- Where the chapter adopts "Aaronson's posture" on the skeptic's probability, flag it as
  an explicit editorial judgment rather than a neutral finding. (skeptic)
- Remove "really" from the heading. (editor)
- Reconcile the FeMoco number with Chapter 5 (see Ch5). (skeptic)

## Output
Edit only your one `_CHAPTER.md`. Keep every `<svg>`/`<figure>` block. Report: what you
changed, and confirm the global sweeps (self-name, tier form, node codes, escapes) are done.
