# Revision brief — cycle 2 (from the 7-reader panel: 5 re-reviews + engineer + policy)

Cycle 1 landed cleanly (all re-reviewers confirmed the fixes, no structural regressions).
Cycle 2 is mostly ADDITIVE — decision tools, a practitioner layer, glossary top-ups — plus
a few real fact fixes. Reviews in `_reviews/cycle2/`. Preserve every inline `<svg>`/`<figure>`.

## GROUND TRUTH (verified this round — do not re-litigate)
- **cuEST is REAL.** NVIDIA cuEST (CUDA Electronic Structure Theory), launched March 2026,
  CUDA-X library, ~55× speedup, adopters TSMC/Samsung/Applied Materials/Synopsys. KEEP it in
  Ch5, tagged T4. Do NOT cut it; the description is accurate.
- **FeMoco — use these numbers consistently in Ch3, Ch5, AND Ch8:** the 2021 Google/Lee
  estimate ≈ **4 million physical qubits (~2,100 logical)**; Alice & Bob's 2025 cat-qubit
  estimate ≈ **99,000 physical qubits**, a **27× cut against a 2.7-million-qubit baseline**
  they benchmarked. State it the SAME way in all three chapters and make cross-references
  agree (Ch5 currently says "Chapter 8 puts it at ~4M" while Ch8 says ~2.7M — fix so both
  read: 2021 headline ~4M; A&B 99k = 27× vs a 2.7M configuration).
- **Willow QEC paper = Nature 2024** ("Quantum error correction below the surface code
  threshold"). Standardize any "Nature 2025" for Willow to 2024.

## GLOBAL fixes (small)
1. Trim residual self-referential voice everywhere: "the atlas insists," "the grades are the
   point," "the grading reflex," and any "this manual/the manual grades…". (skeptic, editor)
2. Ch8 closer: "Where quantum stands, 2026" → "Where quantum stands" (match the other seven). (editor)
3. Reference cards already swept for bracket tiers + self-name (done). Chapters are clean.

## PER-CHAPTER

### Ch1 — The Physics
- Define **observable** and **eigenvalue/eigenstate** inline at first use in the measurement
  section (one clause each) — the most basic measurement words, still cold. (newcomer)
- Move the "skippable on a first read" flag EARLIER — before the Kochen–Specker/PBR no-go
  block and the Lindblad/purification section, which are dense and currently unmarked. (newcomer)
- Trim the closer: it repeats "the core" ×3 and "open questions at the edges" ×2 in adjacent
  sentences — one clean statement. (editor)

### Ch2 — The Machines
- Add a short **"scenarios: who wins each, and when"** read to the modality race — a rough
  time-horizon per branch (superconducting/ion/neutral-atom/photonic/silicon) and the
  conditions under which each leads. (investor)
- Name connectivity concretely: **heavy-hex vs square grid**, and tie heavy-hex's
  surface-code unsuitability to IBM's qLDPC pivot. (engineer)
- One paragraph naming the **characterization toolkit** (randomized benchmarking, interleaved/
  mirror RB, gate-set tomography) and the operational truth that devices drift and recalibrate
  daily. (engineer)

### Ch3 — From Qubit to Answer (heaviest additive)
- **Fix the error:** element distinctness `$O(N^{2/3})$` is a **sub-quadratic** speedup
  (an `$N^{1/3}$` factor over classical `$O(N)$`), NOT "super-quadratic." (physicist)
- Standardize Willow to **Nature 2024**.
- Reconcile the FeMoco number (see GROUND TRUTH).
- **Add a practitioner layer** (the engineer's core ask — the chapter maps from altitude and
  omits the daily surface). Keep it tight, 3–4 short subsections or a box:
  - **Transpilation reality:** layout against the live calibration map, routing/SWAP cost,
    stochastic `optimization_level=3` (transpile-N-keep-best), dynamical-decoupling/twirling
    passes — the "2× depth ≈ one hardware generation" line needs this behind it.
  - **SDK reality (box):** Qiskit 1.0 break, primitives V1→V2 (Sampler/Estimator, not
    `execute()`), OpenPulse largely closed on new hardware, ZNE/PEC/DD now exposed as a
    `resilience_level` knob rather than only research techniques.
  - **Demo → running system:** hybrid wall-clock is dominated by queue + submission latency;
    Runtime **sessions** make iterative VQE feasible; **dynamic circuits with real-time
    feedforward** (OpenQASM 3 control flow) are the construct under QEC, not just physics.
  - **Real error model:** replace the depolarizing cartoon with one paragraph on coherent
    errors, crosstalk/ZZ, leakage, non-Markovian drift, correlated bursts — and cross-link
    Kalai's correlated-noise argument (Chapter 8) as the daily phenomenon it also is.

### Ch4 — Beyond Computing
- Add a one-page **"PQC migration: what to do and when" decision box** — the ingredients are
  scattered across the chapter: inventory cryptography → prioritize by data shelf-life against
  Mosca's inequality → build crypto-agility → deploy hybrid (classical + ML-KEM) → hit the
  2030/2031 CNSA-2.0 deadlines. Gather them into one boxed sequence. (policy)
- Split the 251-word "Two cross-cutting resources…" (QRNG / certified randomness / squeezed
  light / quantum memories) em-dash block into shorter sentences. (editor)

### Ch5 — The Industry Map
- Add a **company / ticker matrix** (a table): company · public/private (ticker if public) ·
  modality or segment · near-term revenue source · valuation flag · DARPA-QBI stage where
  relevant. Span the notable names from Ch2/5/6. This is the one thing that makes it
  decision-grade. (investor)
- Reconcile FeMoco (see GROUND TRUTH); fix the "Chapter 8 puts it at ~4M" line to agree.
- cuEST is REAL — keep it (see GROUND TRUTH).
- De-duplicate the five "genuine"s in the chapter (vary or cut). (skeptic)

### Ch6 — Money, Nations, and Standards
- Add a **comparative national-strategy scorecard** (matrix): country · headline pledge ·
  estimated real spend · instrument model (grants / procurement / equity / HPC) · modality
  specialization · key weakness — across US/China/EU/UK plus the rest in the "others" tier. (policy)
- Add a **"which policy lever buys what"** comparison: DARPA QBI (vendor-neutral filter) vs UK
  ProQure (demand-pull) vs US equity stakes vs EuroHPC (multi-modality hedge) as instruments
  with tradeoffs. (policy)
- **Reconcile the CRQC timeline** with the glossary and Chapter 8: state one consistent read
  (~2030 ± 3, roughly 50% by 2035) and note the range honestly. (policy, physicist)
- State the **supply-chain reshoring priority** explicitly — dilution refrigerators / helium-3
  / diamond as the binding chokepoint. (policy)

### Ch8 — The Honest Frontier
- Reconcile FeMoco (see GROUND TRUTH).
- Trim the residual self-referential voice ("the atlas insists," "the grading reflex," etc.). (skeptic)
- Add one clause noting Kalai's correlated-noise argument is also a **daily practitioner
  phenomenon** (crosstalk, leakage, drift), not only an abstract scaling dispute. (engineer)
- Confirm the CRQC number matches Ch6 + the glossary.

## Output
Edit only your one `_CHAPTER.md`. Preserve every `<svg>`/`<figure>`. New tables/boxes are
plain markdown. Report: what you added/changed + confirm FeMoco/Willow consistency where relevant.
