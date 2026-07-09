# Review — Newcomer / Student (Cycle 2)

*Reviewer persona: motivated undergrad / self-learner, technically curious, no prior quantum mechanics. Re-read straight through, chapters 01→08, after the cycle-1 revisions. Read the Preface first, treated inline `<svg>` math as rendered, checked the glossary on unfamiliar terms.*

## Verdict

**Yes — a motivated newcomer can now learn from this.** The four fixes I asked for in cycle 1 all landed, and they landed well. The Preface is a real front door: it says what the book is, how to read it, how the grading works, and who each part is for, all in plain language. Chapter 1 is no longer a wall — every core concept now opens with a one-sentence plain-English statement before the formal notation, the Bloch sphere leads with the globe picture, and the graduate-level back third is explicitly flagged skippable. The evidence tiers are defined on the first page instead of four chapters in. The QEC vocabulary that ambushed me in Chapter 2 (below-threshold, surface code, code distance, logical qubit) is now forward-glossed inline the first time it appears. The 182-term glossary catches the large majority of the jargon that stopped me last time.

The difficulty cliff is gone. What remains are second-tier stumbles: a handful of the most basic measurement words (observable, eigenvalue) are still used cold and are the notable gap the glossary *doesn't* cover; two dense mid-Chapter-1 sections sit just outside the "skippable" flag; and the reader is never actually told the glossary exists as a lookup tool. These are cheap to close and none of them re-erect the wall. This is now a book a determined beginner finishes.

## What landed (cycle-1 issues → resolved)

1. **Front door exists and works.** `00-map/_PREFACE.md` opens with "What this is / How to read it / How the grading works / Who it's for / A note on honesty." The "Who it's for → newcomer" paragraph tells a beginner to read straight through and points them to Chapter 7 for the story first. This is exactly the on-ramp cycle 1 said was missing.

2. **Chapter 1 is now learnable.** Each early concept gets a plain lead sentence: "a quantum state is a list of numbers — one amplitude for each outcome"; "Superposition is several of those amplitudes being nonzero at once. Measurement is what happens when you look, and it collapses that spread to a single outcome"; "a qubit is the two-outcome case — one amplitude for 0 and one for 1"; "Some pairs of quantities cannot both be sharp at once; pin one down and the other spreads out"; entanglement as "a joint state that neither one holds on its own." The Bloch sphere now leads with "a point on a globe of one-qubit states" and defers SU(2)/SO(3) to a follow-on sentence. The formal version follows each plain one, so rigor is preserved.

3. **Evidence tiers moved to page 1.** The Preface's "How the grading works" defines T1–T6 in plain words, and the glossary repeats it. I no longer read "T4" as a mystery label for four chapters.

4. **Chapter 2 forward-glosses QEC.** The Willow paragraph now reads "below-threshold meaning that making the error-correcting code larger drives its error rate down, and a surface code being the leading 2D grid of physical qubits that together protect one logical qubit... code distance (the grid's size, which sets how many errors the code can catch)... the distance-7 logical qubit — one protected qubit built from many physical ones." Every term I flagged is glossed in place.

5. **Deep cuts are signposted.** Chapter 1's information-theory / simulability / physics-under-machines block is marked "the reference layer; a first read can skip ahead to the measurement problem and come back." Chapter 3's complexity-theory paragraph opens "(safe to skip on a first read)." Both were the exact spots I drowned in.

6. **Glossary catches most blockers.** State vector, amplitude, Hilbert space, Born rule, density matrix, Bloch sphere, decoherence, coherence time T1/T2, POVM, Naimark, Clifford+T, stabilizer/magic, threshold, surface code, logical qubit, NISQ, fault tolerance, qRAM, squeezing, SQL/Heisenberg — all present, all in beginner language, all with chapter cross-refs and honest grading notes.

## Regressions

**None found.** I checked the newcomer-facing chapters for the cycle-1 global sweeps and they held:
- No "X, not Y" / "not just X but Y" antithesis in prose (sampled across all 8 files).
- No "genuinely / truly / really" intensifiers — the only "really" is inside a John Clauser quotation in Chapter 7, which is correct to keep.
- No node-ID error-codes (`(I-cyber)`, `§04`) leaking into prose.
- The added plain-language sentences are accurate and introduce no new errors; the globe-first Bloch rewrite reads naturally.

## New top-5 (where a beginner still stumbles)

1. **"Observable" and "eigenvalue" are still used cold — and the glossary doesn't catch them.** Chapter 1's measurement section says "Measuring an observable `A` returns one of its eigenvalues." The plain lead-in ("Measurement is what happens when you look") softens the approach, but these two words — the most basic measurement vocabulary in all of QM — are neither glossed in the prose nor present as glossary entries. This is the single biggest residual: a true newcomer stops on exactly the sentence cycle 1 flagged. Fix: a half-clause gloss ("an observable — any quantity you can measure — returns one of its eigenvalues, the allowed readings") or two glossary entries.

2. **The reader is never told the glossary exists as a lookup tool, or where it is.** The Preface names "a glossary" only inside the appendix list; nothing says "hit a word you don't know → look it up in `evidence/GLOSSARY.md`." The glossary is the safety net that makes the prose's inevitable un-glossed terms survivable, but a beginner won't reach for a net they don't know is there. Fix: one line in the Preface's "How to read it" pointing to the glossary by name and path.

3. **Two dense Chapter-1 sections sit just *before* the skippable flag, unmarked.** The "reference layer, skip ahead" signpost starts at "The accounting: quantum information theory." But "The deeper no-go structure" (Kochen–Specker, PBR, contextuality) and the open-systems formalism (Lindblad, purification/Stinespring) come earlier and are just as graduate-dense, with no "optional on first read" marker. A beginner reading in order hits Kochen–Specker at full strength and mistakes "I'm lost here" for "I can't do this book." Fix: move the skip marker earlier, or add a second one before the no-go section.

4. **The T1/T2 name-clash is still unflagged anywhere.** Coherence times T1/T2 and evidence tiers T1/T2 collide, and they land in the *same cells* of Chapter 2's comparison table. The glossary has both entries but neither cross-warns, and the Preface doesn't mention it. This is the cheapest fix in the book: one parenthetical in each of the two glossary entries ("not the evidence tier of the same name"). Cycle 1 asked for it; still open.

5. **The Preface leads "How to read it" with "Start with the Map."** For the fragile reader — the newcomer — the first how-to instruction sends them into the densest reference artifact in the book (the ideal-state map, which itself says it's "not a front-to-back read"). The later "Who it's for → newcomer" paragraph correctly says "read straight through," so the signal is mixed rather than wrong. Fix: one clause telling beginners to skip the map and start at Chapter 1; the map is for orientation, not first contact.

## Still-undefined terms (used in prose, absent from the glossary)

*Ordered by how load-bearing for a beginner. These are the residual gaps — most of the cycle-1 list is now covered.*

- **Observable** — any quantity you can measure (energy, spin direction). Used in Ch1 measurement; no gloss, no glossary entry. *(highest priority — see top-5 #1)*
- **Eigenvalue / eigenstate** — the possible values a measurement can return / the states that give one definite value. Used throughout Ch1 and inside "phase estimation reads an eigenvalue" in Ch3; no glossary entry.
- **Unitary** — a reversible quantum operation; every gate is one. Used in Ch1 (no-cloning proof) and freely in Ch3; no glossary entry.
- **QUBO** — a standard way to phrase an optimization problem for annealers/QAOA. Used in Ch3/Ch5; VQE and QAOA are glossed but QUBO is not.
- **Normalized** — scaled so the probabilities add to 1. Used in Ch1's superposition axiom; inferable from the plain lead sentence, lower priority.
- **Pure vs mixed state** — folded into the "Density matrix" entry ("also covers mixed states") rather than standalone; adequate, but a beginner scanning for "mixed state" won't find a headword.

Everything else a first-time reader meets is either glossed in the prose on first use or has a clean glossary entry. The gap is now small and specific.
