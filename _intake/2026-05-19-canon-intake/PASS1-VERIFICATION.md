# Canon Pass-1 Verification — 4 gap branches (03/04/06/07)

**Bead:** `bkt-epic-canon-intake` — P0 post-hotfix
**Date:** 2026-05-19
**Pillar:** Data
**Scope:** the foundational spine of `03-chemistry`, `04-information`,
`06-cosmology`, `07-mind` (biophysics + 01 + 02 already live).

## Why this document exists

The known risk on this bead is a **misresolved DOI silently landing in canon**
(last session caught a wrong Kolmogorov DOI; this session caught a wrong
Moseley DOI and a wrong periodic-law commentary — see rejections below). A
research-integrity nonprofit is destroyed by exactly one fabricated citation.
Therefore EVERY anchor DOI written to a `primary-papers.yaml` was resolved with
the live resolver and hand-checked against the *intended* foundational work
before commit. This table is the audit trail.

Verification criteria per record (all must hold):
1. DOI resolves to the **intended** title / first author / year.
2. It is the **PRIMARY / founding** work (or a flagged edition-of-record),
   NOT a review, textbook, or commentary.
3. Passes RUBRIC.md Stage-0 hard gate E1–E9.
4. `canon_score >= 70` (intake.py run with `--min-score 70`).

## Verification table (every DOI hand-checked)

| concept | DOI | resolved → (author, year, title) | intended foundational work | primary? | score | VERIFIED |
|---|---|---|---|---|---|---|
| 03-chemistry/periodic-law | `10.1080/14786441308635052` | Moseley H.G.J. 1913, "The high-frequency spectra of the elements" (Phil. Mag.) | Moseley atomic-number basis of the periodic law | yes (primary measurement) | 80 | **Y** |
| 03-chemistry/chemical-bond | `10.1021/ja02261a002` | Lewis G.N. 1916, "The Atom and the Molecule" (JACS) | Lewis shared electron-pair bond | yes | 70 | **Y** |
| 03-chemistry/chemical-bond | `10.1021/ja01355a027` | Pauling L. 1931, "The Nature of the Chemical Bond…" (JACS) | Pauling resonance/hybridization (primary paper, not the 1939 book) | yes | 70 | **Y** |
| 03-chemistry/quantum-chemistry | `10.1007/BF01397394` | Heitler W. & London F. 1927, "Wechselwirkung neutraler Atome und homöopolare Bindung nach der Quantenmechanik" | Heitler–London H₂ bond from QM; birth of valence-bond theory | yes | 70 | **Y** |
| 03-chemistry/reaction-kinetics | `10.1063/1.1749604` | Eyring H. 1935, "The Activated Complex in Chemical Reactions" (J. Chem. Phys.) | Eyring transition-state theory | yes | 70 | **Y** |
| 03-chemistry/reaction-kinetics | `10.1063/1.1742723` | Marcus R.A. 1956, "On the Theory of Oxidation-Reduction Reactions Involving Electron Transfer. I" | Marcus electron-transfer theory | yes | 70 | **Y** |
| 04-information/shannon-information | `10.1002/j.1538-7305.1948.tb01338.x` | Shannon C.E. 1948, "A Mathematical Theory of Communication" (BSTJ) | founding paper of information theory | yes | 70 | **Y** |
| 04-information/complexity-theory | `10.1145/800157.805047` | Cook S. 1971, "The complexity of theorem-proving procedures" | NP-completeness / P vs NP foundation | yes | 80 | **Y** |
| 04-information/complexity-theory | `10.1080/00207166808803030` | Kolmogorov A.N. 1968, "Three approaches to the quantitative definition of information" | algorithmic / descriptive complexity | yes | 70 | **Y** |
| 04-information/thermodynamics-of-computation | `10.1147/rd.53.0183` | Landauer R. 1961, "Irreversibility and Heat Generation in the Computing Process" | Landauer's principle (kT ln 2 erasure cost) | yes | 70 | **Y** |
| 04-information/coding-theory | `10.1002/j.1538-7305.1950.tb00463.x` | Hamming R.W. 1950, "Error Detecting and Error Correcting Codes" (BSTJ) | founding error-correcting code construction | yes | 80 | **Y** |
| 06-cosmology/friedmann-equations | `10.1007/BF01332580` | Friedmann A. 1922, "Über die Krümmung des Raumes" | expanding/dynamical solutions of the Einstein field equations | yes | 70 | **Y** |
| 06-cosmology/hubble-law | `10.1073/pnas.15.3.168` | Hubble E. 1929, "A relation between distance and radial velocity among extra-galactic nebulae" (PNAS) | first observational evidence of cosmic expansion | yes | 95 | **Y** |
| 06-cosmology/cmb | `10.1086/148307` | Penzias A.A. & Wilson R.W. 1965, "A Measurement of Excess Antenna Temperature at 4080 Mc/s." (ApJ) | discovery of the cosmic microwave background | yes | 70 | **Y** |
| 06-cosmology/dark-energy | `10.1086/300499` | Riess A.G. et al. 1998, "Observational Evidence from Supernovae for an Accelerating Universe and a Cosmological Constant" | founding measurement of cosmic acceleration | yes | 80 | **Y** |
| 06-cosmology/dark-energy | `10.1086/307221` | Perlmutter S. et al. 1999, "Measurements of Ω and Λ from 42 High-Redshift Supernovae" | independent confirming SCP measurement | yes | 80 | **Y** |
| 07-mind/hebbian-plasticity | `10.1113/jphysiol.1973.sp010273` | Bliss T.V.P. & Lømo T. 1973, "Long-lasting potentiation of synaptic transmission in the dentate area of the anaesthetized rabbit" (J. Physiol.) | primary experimental demonstration of LTP (empirical foundation of the Hebbian axiom) | yes | 80 | **Y** |
| 07-mind/hebbian-plasticity | `10.4324/9781410612403` | Hebb D.O. 1949 (Routledge edition-of-record), "The Organization of Behavior" | originating theoretical statement of the Hebbian postulate | edition-of-record (book; flagged landscape-adjacent per RUBRIC) | 70 | **Y** |
| 07-mind/predictive-coding | `10.1038/4580` | Rao R.P.N. & Ballard D.H. 1999, "Predictive coding in the visual cortex…" (Nat. Neurosci.) | founding computational statement of predictive coding | yes | 85 | **Y** |
| 07-mind/memory-systems | `10.1136/jnnp.20.1.11` | Scoville W.B. & Milner B. 1957, "Loss of recent memory after bilateral hippocampal lesions" (JNNP) | patient H.M.; founding declarative/procedural dissociation | yes | 80 | **Y** |
| 07-mind/reinforcement-learning | `10.1126/science.275.5306.1593` | Schultz W., Dayan P. & Montague P.R. 1997, "A Neural Substrate of Prediction and Reward" (Science) | dopamine reward-prediction-error; TD-learning↔neural bridge | yes | 85 | **Y** |

**21/21 records hand-verified Y.** Every concept folder has ≥1 CANON record at
score ≥ 70 with `gate == canon`.

## Anchors REJECTED during verification (the integrity catches)

| candidate DOI | claimed | actually resolved to | action |
|---|---|---|---|
| `10.1080/14786441308635055` | Moseley 1913 high-frequency spectra (for periodic-law) | "The electrical resistance of mixtures of xylol and alcohol", Norman 1913, 1 citation — **wrong paper, misattributed Phil. Mag. DOI** | REJECTED; replaced with verified Moseley DOI `10.1080/14786441308635052` |
| (search) Mendeleev periodic law | Mendeleev 1869 primary | "The Periodic Table and a Missed Nobel Prize" 2012, 7 cites — a modern commentary book, NOT primary | REJECTED; periodic-law anchored on Moseley 1913 (modern foundational statement, DOI-resolvable; Mendeleev 1869 has no gate-passing DOI — documented, not faked) |
| (search) Mendeleev German | Mendeleev Atomgewichten | "Über numerische Beziehungen…" Carey 1896 — wrong author, wrong work | REJECTED |
| `10.1070/RC1969v038n01ABEH001775` | (periodic-law candidate) | failed to resolve (no record returned) | REJECTED (not used) |
| `10.1093/mnras/91.5.483` | Lemaître 1931 expansion (widening for friedmann-equations) | correct paper, but `canon_score 65 < 70` floor | **gate-rejected automatically** by intake.py — Friedmann anchor itself passed at 70, so the concept still has a solid CANON record; the optional widening was correctly dropped, not force-fitted |
| (search) Bliss-Lømo LTP | Bliss-Lømo 1973 primary | first hit was a 2007 review ("Synaptic Plasticity: Multiple Forms…") | REJECTED that hit; resolved the true 1973 J. Physiol. primary DOI `10.1113/jphysiol.1973.sp010273` directly instead |

The verification step caught **6 distinct ways a wrong/weak source could have
entered canon** — 3 misresolutions, 1 dead DOI, 1 review-instead-of-primary, 1
correctly gate-rejected widening. This is the class of error called out as the
known risk for this bead; the gate + hand-check stopped all six.

## Honest coverage assessment

| branch | spine concepts seeded | CANON records | genuinely citeable now? |
|---|---|---|---|
| 03-chemistry | periodic-law, chemical-bond, quantum-chemistry, reaction-kinetics | 6 | **Yes — citeable.** Bonding (Lewis+Pauling), QM bond (Heitler–London), kinetics (Eyring+Marcus), periodic law (Moseley) are the load-bearing chemical foundations. Thin spots: chemical-thermodynamics (Gibbs) and equilibrium (mass action) not yet seeded — pass-2. |
| 04-information | shannon-information, complexity-theory, thermodynamics-of-computation, coding-theory | 5 | **Yes — citeable.** Shannon + Cook + Landauer + Hamming + Kolmogorov are the spine of information/computation foundations. Turing 1936 already lives under 01-mathematics/computability (shared anchor — not duplicated here, correct). |
| 06-cosmology | friedmann-equations, hubble-law, cmb, dark-energy | 5 | **Yes — citeable.** Friedmann + Hubble + Penzias–Wilson + Riess + Perlmutter is the observational+theoretical spine of modern cosmology. Thin spots: inflation (Guth) and BBN not yet seeded — pass-2. |
| 07-mind | hebbian-plasticity, predictive-coding, memory-systems, reinforcement-learning | 5 | **Yes — citeable.** Bliss–Lømo + Hebb + Rao–Ballard + Scoville–Milner + Schultz are principled, derivable, non-pop foundations. action-potential anchor (Hodgkin–Huxley) already lives under 05-biophysics (shared — not duplicated, correct). Thin spots: neuron-doctrine (Cajal, pre-DOI) and global-workspace not yet seeded — pass-2. |

**Verdict:** all 4 gap branches are now **genuinely citeable at pass-1 spine
level** — each serves real, hand-verified primary foundations across the
thesis, not stubs. They are NOT yet exhaustive (pass-1 is a defensible minimum
by design — see TAXONOMY.md). The honest gap: ~3–4 more spine concepts per
branch remain for full pass-1 (thermodynamics/equilibrium in chem, inflation/BBN
in cosmology, neuron-doctrine/global-workspace in mind) — these are pre-DOI or
book-tier and need the same careful per-DOI verification, deferred to pass-2.
No branch is "thin" in the sense of having a stub — every seeded concept
resolves to a verified founding paper.

## Reproducibility

```bash
# any concept, idempotent, free APIs, no wallet:
python3 tools/canon-pipeline/intake.py bucket-canon/<NN-branch>/<concept> --min-score 70
```
Re-running converges (stable `bkt-sha1(doi)` ids, 7-day cache). A seeded DOI
that fails the gate is reported and NOT written — the seed list is intent, the
gate is authority (RUBRIC.md §Stage-3).
