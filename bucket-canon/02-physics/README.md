# 02-physics — Canon Branch

## Scope

The physics canon holds **law-level and principle-level foundations** of physics: the primary papers and originator monographs that state the laws of motion, electromagnetism, thermodynamics, statistical mechanics, special and general relativity, quantum mechanics, quantum field theory, the Standard Model, and the canonical condensed-matter and renormalization-group results. It also holds the experimental papers that establish fundamental constants and the discipline-standard normative reference works (CODATA, the SI brochure) where those works are the authoritative source.

It does **NOT** hold:

- Engineering applications (circuit design, materials processing, propulsion, instrumentation handbooks)
- Popularizations (Feynman *Six Easy Pieces*, *A Brief History of Time*, *The Elegant Universe*)
- Biographies of physicists
- History-of-physics narrative (that belongs in `08-deep-history/`)
- Pedagogical textbooks below the discipline-standard tier (Halliday-Resnick, Griffiths, Jackson are landscape, not canon — see §"Contestable" calls in pass-1)
- Review articles that summarize without originating

## Boundary with 01-mathematics

The mathematical machinery used by physics — Hilbert spaces, operator theory, calculus of variations, differential geometry, Lie groups, fibre bundles — is canon in `01-mathematics/`. Physics papers that *apply* that machinery to a physical law are canon here. The boundary case is the originator paper that states a *new* mathematical structure in service of a physical theory: Noether 1918 and Dirac 1928 invent mathematical structure that survives outside physics, and they are canon here (originator-framing wins) with a cross-link from math.

## Boundary with 03-chemistry

Chemistry sits downstream of quantum mechanics. The Schrödinger equation, the Pauli exclusion principle, the Born–Oppenheimer separation, density-functional theorems, and the statistical mechanics of indistinguishable particles are canon here. Their *chemical* applications — Lewis structures, valence-bond theory, molecular-orbital theory in the Heitler–London / Hund / Mulliken / Coulson lineage, transition-state theory, electron-transfer theory — are canon in `03-chemistry/`. The chemistry pass-3 synthesis (`bucket-canon/03-chemistry/_intake/chemistry-canon-pass-3-synthesis-2026-05-01.md` §5.1) gives the operational rule that this branch ratifies on the physics side.

## Boundary with 06-cosmology

The field equations of general relativity and the renormalization-group methods that underwrite modern cosmological perturbation theory are canon here. Specific cosmological models (FLRW metric as a model of the universe, inflation models, the ΛCDM concordance model, recombination physics, BBN abundances) are canon in `06-cosmology/`. Friedmann 1922 is the boundary case — the metric is GR applied; it lives in cosmology, cross-linked here.

## Promotion rule

Material enters `02-physics/` only when one of the following holds:

1. It is a **primary theoretical paper or monograph** by the originator of the law, principle, or framework (Newton on the laws of motion, Maxwell on the electromagnetic field, Boltzmann on the H-theorem, Einstein on relativity, Heisenberg on matrix mechanics, Schrödinger on wave mechanics, Dirac on the relativistic electron, Yang and Mills on non-abelian gauge theory, Bardeen-Cooper-Schrieffer on superconductivity, Wilson on the renormalization group).
2. It is a **recognized academic edition-of-record** of a primary text (Cohen-Whitman 1999 for the *Principia*, the *Annalen der Physik* facsimiles for the 1905 Einstein papers, the Pauli-edited *Handbuch* articles where authoritative).
3. It is a **discipline-standard normative reference** (CODATA recommended values of the fundamental physical constants, the SI brochure from the BIPM, the Particle Data Group's *Review of Particle Physics*).
4. It is an **experimental paper that established a fundamental constant or falsified a candidate law at the foundational level** (Michelson-Morley 1887, Millikan oil-drop, Davisson-Germer 1927, Wu et al. 1957). The promotion of these is contestable in pass-2; see the pass-1 memo.

Practitioner monographs (Jackson *Classical Electrodynamics*, Sakurai *Modern Quantum Mechanics*, Peskin-Schroeder, Weinberg's *Quantum Theory of Fields*) and pedagogical textbooks do not promote unless they meet condition 3 by virtue of being the discipline's normative reference, not by virtue of being widely assigned.

## Subfolders (proposed; pass-2 will ratify)

The branch root holds only `README.md` and `CANON_INDEX.md` until pass-2. The proposed sub-folder map (full justification in `_intake/physics-canon-pass-1-2026-05-01.md` §2):

- `classical-mechanics/` — Newton, Lagrange, Hamilton, Jacobi, Noether
- `electromagnetism/` — Faraday, Maxwell, Heaviside, Lorentz
- `thermodynamics/` — Carnot, Clausius, Kelvin, Helmholtz, Planck
- `statistical-mechanics/` — Boltzmann, Gibbs, Einstein (Brownian), Onsager, Wilson (RG)
- `relativity/special/` — Einstein 1905, Minkowski 1908
- `relativity/general/` — Einstein 1915–1916, Hilbert 1915, Schwarzschild 1916
- `quantum-mechanics/` — Heisenberg, Born-Heisenberg-Jordan, Schrödinger, Dirac, Born, von Neumann
- `quantum-field-theory/` — Tomonaga-Schwinger-Feynman, Yang-Mills, Higgs, Englert-Brout
- `particle-physics/` — Glashow-Weinberg-Salam, Gross-Wilczek-Politzer, PDG reference
- `condensed-matter/` — BCS, Anderson localization, Wilson RG
- `reference/` — CODATA, BIPM SI brochure, PDG *Review of Particle Physics*

## Status

Branch opened 2026-05-01 by the physics pass-1 sweep at `_intake/physics-canon-pass-1-2026-05-01.md`. No files yet promoted. `CANON_INDEX.md` is seeded with the rows pass-1 identifies as *strong*; per-entry stubs are written progressively under each sub-folder once pass-2 ratifies the tree. `_intake/` is the holding area for sweep memos and pre-promotion artifacts. Cross-links from `03-chemistry/` (Schrödinger, Pauli, Born-Oppenheimer, Hohenberg-Kohn, Kohn-Sham, Gibbs/Boltzmann statmech) currently dangle and are resolved by pass-2 once the entries are placed.
