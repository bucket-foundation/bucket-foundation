# Cycle-2 Review — Quantum Physicist

## Verdict: yes, it improved — and the four flagged fixes all landed

The revision is a clear net gain. Every one of the four accuracy/rigor items I raised in cycle 1 was fixed correctly, and the contextuality synthesis is now one of the strongest passages in the book rather than a one-line gesture. The global-sweep hygiene (plain tier form, node-ID codes removed, escape artifacts gone) is genuinely clean — I could not find a single `[T4]`, `**T4**`, `\[T3\]`, or `(I-cyber)`-style code left in any of the eight chapters.

Two things dropped in quality, both from *incomplete* execution of an otherwise-correct instruction: the "cuEST" product got dressed up instead of verified-or-cut, and the FeMoco cross-chapter reconciliation only half-landed and now contradicts itself across three chapters. One real physics-terminology error survives untouched in Chapter 3 (element distinctness). None of this rises to a wrong-core-physics problem; the substrate remains accurate to graduate-seminar standard. This is a short cleanup pass away from shippable.

---

## Fixes that landed

1. **Ch7 — transmon / 2025 Nobel (my cycle-1 #1). Fixed, cleanly.** The offending line is gone. It now reads: "The transmon is built on a Josephson junction, the same device whose 1984–85 macroscopic-quantum-tunneling experiments later earned Clarke, Devoret, and Martinis the 2025 Nobel." Martinis is no longer a phantom transmon co-author, Clarke is restored as the third laureate, the prize is correctly attributed to the 1984–85 MQT work, and it is now internally consistent with the Nobel-spine paragraph ("macroscopic quantum tunneling in Josephson-junction circuits to Clarke, Devoret, and Martinis (2025)"). The "eighteen years later" implication is dropped.

2. **Ch1 — SO(3)/SU(2) (my cycle-1 #5). Fixed, and better than my suggested wording.** "The rotation of the sphere is an element of SO(3); the gate acting on the state vector is an element of SU(2), the double cover of SO(3), which is why a 360° turn of the sphere leaves the state with a minus sign and only a 720° turn brings it back." The double-cover is correct, and the −1-phase-on-360° detail is exactly right (SO(3) identity ↔ −I in SU(2)).

3. **Ch4 — Kómár regrade (my cycle-1 #3). Fixed.** "networking clocks into a shared GHZ state to reach Heisenberg-limited timekeeping (Kómár et al., Nat. Phys. 2014, T2 theory)." A single refereed proposal is now T2, not T1.

4. **Ch1 — contextuality = Wigner-negativity = stabilizer/magic synthesis (my cycle-1 #4, the expansion half). Landed, and strong.** It now runs across two passages ("The deeper no-go structure" and "The classical-simulability boundary") and states the unification carefully: "these are three views of one fact … one resource wearing three faces." Crucially it gets the rigor right — the *exact* identity is restricted to odd prime dimension ("In odd prime dimension the identification is exact: the non-negative discrete Wigner functions are precisely the stabilizer states"), and the qubit case is explicitly flagged as open ("The qubit case is subtler and still being sharpened"). That is the correct statement of the Gross/Veitch/Howard/Delfosse picture. This is the single best-improved paragraph in the atlas.

Also landed (non-physics but confirmed): Ch8 Hossenfelder now gets a full-strength paragraph ("her case deserves stating at full strength"); the Aaronson-posture call is explicitly flagged as editorial ("the atlas makes an editorial call rather than reporting a neutral finding"); Ch2 forward-glosses below-threshold / surface code / logical-vs-physical inline and tags the Quandela source specs "(a vendor spec, T4)"; Ch5's 27-industry dashboard opens the chapter with an Invest-read column and closes with "What this means for buyers and investors"; the "really" heading is gone (the one surviving "really" is the in-scare-quotes `what the wavefunction "really" meant` in Ch7 history — correct usage, leave it).

---

## Regressions introduced by the revision

**R1 — "NVIDIA cuEST" got a fabricated pedigree instead of a verify-or-cut (Ch5).** My cycle-1 note said this product name looks fabricated (NVIDIA ships cuQuantum, cuLitho, cuPQC, CUDA-Q — not "cuEST") and to verify or remove it. The revision did neither. It kept both occurrences, tagged them T4, and *added invented specificity*: line 97 now calls it "a CUDA-X electronic-structure library launched for chip-materials work" reporting "up to ~50x faster calculations for adopters including TSMC," and line 139 repeats "cuEST (~50x faster materials chemistry)." Dressing an unverifiable/likely-nonexistent product in a plausible CUDA-X description and a named customer makes it read *more* authoritative while still being uncitable. A T4 tag legitimizes rather than quarantines it. This is the highest-value remaining fix: confirm the real tool (if the source meant cuQuantum/CUDA-Q-accelerated DFT, name it) or cut the specific 50× claim.

**R2 — the FeMoco reconciliation half-landed and now contradicts itself across three chapters.** The brief asked Ch5 and Ch8 to agree. They now share the 2.7M and 99,000 figures, but the reconciliation left a live inconsistency:
- **Ch8** (line 77): "a 2021 Google study (Lee et al.) put the physical-qubit cost at **~2.7M**, which Alice & Bob's 2025 cat-qubit estimate cut about 27× to ~99,000."
- **Ch5** (line 131): "That **2.7M** baseline … the same estimate **Chapter 8 puts at ~4M physical qubits** and ~1,137 logical qubits."
- **Ch3** (line 53, in rendered math): FeMoco "sits near **~4M** physical qubits and days of runtime."

So Ch5 tells the reader Chapter 8 says ~4M, but Chapter 8 actually says 2.7M — and Ch3 independently says ~4M. The number the reconciliation was supposed to settle is still split 2.7M vs 4M, and Ch5's cross-reference now misstates its sibling chapter. Pick one physical-qubit figure (Lee et al. 2021 report a range; state it once with the citation), make Ch3/Ch5/Ch8 agree, and fix the "Chapter 8 puts at ~4M" clause.

---

## New top-5 (the next tier of accuracy/rigor)

1. **cuEST — verify the real product or cut it, and strip the invented "CUDA-X electronic-structure library / TSMC adopter" description (Ch5, both occurrences).** See R1. This is the one item most likely to embarrass the atlas with a working engineer, because it is a checkable claim that probably does not check out.

2. **Reconcile FeMoco to a single physical-qubit number across Ch3, Ch5, Ch8, and fix Ch5's misattribution of "~4M" to Chapter 8.** See R2.

3. **Ch3 — "element distinctness in O(N^{2/3}) queries — a super-quadratic improvement" is wrong; it is a *sub*-quadratic speedup.** Classical is Θ(N), quantum is Θ(N^{2/3}), so the speedup factor is N^{1/3} — an exponent of 1/3, less than the 1/2 of a quadratic speedup. Ambainis's walk is optimal, but the improvement is sub-quadratic, not super-quadratic. Either drop "super-quadratic" or reword to "a sub-quadratic but provably optimal speedup." This is the only surviving flat-out-wrong physics statement I found.

4. **Willow's publication year is inconsistent: "Nature 2024" (Ch3) vs "Nature 2025" (Ch2, Ch7, Ch8).** The below-threshold paper went online Dec 2024, print 2025 — both are defensible, but the atlas contradicts itself. Standardize to one form (e.g., "Nature, 2024 online / 2025 print") everywhere.

5. **Citation-integrity sweep on the precise-looking arXiv identifiers, plus one grammar artifact.** The atlas cites many exact-but-unverifiable IDs (Ch8 arXiv:2604.15427, 2601.08068, 2605.19854; Ch4 arXiv:2604.10243; Ch2 has a suspicious near-duplicate pair — Helios "arXiv:2511.05465" and TLS-mapping "arXiv:2511.05365"). A physicist who tries to pull one of these and fails discounts everything around it. Either confirm they resolve or frame the forward-dated ones as illustrative preprints. And a small artifact the antithesis-rewrite introduced in Ch3 line 11: "…where quantum hardness lives, and **The** true currency of a fault-tolerant resource estimate…" — mid-sentence capital T.

---

## Notes that are not defects

- My cycle-1 #4 also asked to *trim* the undergraduate exposition in Ch1/Ch3 by ~30%. The revision did the opposite at the basic end — it *added* plain-language one-liners ("a quantum state is a list of numbers," "a qubit is the two-outcome case") to serve the newcomer reader, while separately expanding the expert synthesis. That is a defensible resolution of competing panel feedback; I flag it only so it is a known, deliberate choice rather than an oversight. The physics is untouched and the "safe to skip on a first read" markers now guide the expert past the on-ramp.
- Ch1 "detectors 45° apart" for the CHSH optimum is **fine** and should be left — on the Bloch sphere the optimal measurement directions are separated by 45° (the 22.5° figure is the halved *polarizer* angle). No change needed.
- The Ch2/Ch5/Ch8 D-Wave spin-glass, Quantum Echoes, and below-threshold-QEC treatments are consistent across chapters and correctly graded (contested / live / T2). No cross-chapter drift there.
- Physics accuracy in Ch1–Ch4 remains excellent: Gleason (dim ≥ 3), Tsirelson 2√2, Naimark/Stinespring, no-cloning fidelity 5/6, Holevo, strong subadditivity → data-processing → CKW monogamy, Hudson's theorem, superconducting/ion/atom/cat modality physics, Heisenberg vs SQL scaling, SIKE's 2022 collapse — all still correct.
