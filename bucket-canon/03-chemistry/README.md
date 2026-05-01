# 03-chemistry — Canon Branch

## Scope

The chemistry canon holds **theoretical and law-level foundations** of chemistry: the atomic theory, the periodic law, chemical bonding, chemical thermodynamics, chemical kinetics and transition-state theory, electron-transfer theory, stereochemistry, molecular-orbital theory, and the discipline-standard normative references (IUPAC nomenclature, the Gold Book).

It does **NOT** hold:

- Compound monographs or pharmacology dossiers (those are outcome-tier; route to `05-biophysics/sub-outcomes/` if biological, otherwise out of scope)
- Synthesis recipes, lab protocols, or technique manuals
- Spectral databases, crystallographic databases, reaction databases (these are infrastructure; cite, do not mirror)
- Industrial process know-how
- Chemistry pedagogy textbooks below the discipline-standard tier (Atkins is borderline; March, Carey-Sundberg, Cotton-Wilkinson are borderline-strong, evaluated case-by-case)
- History-of-chemistry narrative (that belongs in `08-deep-history/`)

## Boundary with 02-physics

Chemistry sits downstream of quantum mechanics. The Schrödinger equation, the Pauli exclusion principle, and statistical mechanics are canon in `02-physics/`; their *chemical* applications (Lewis structures, valence-bond theory, MO theory, the chemical-potential formulation of equilibrium, transition-state theory) are canon here. The boundary is: the law of nature lives in physics, the law-level statement that organizes a chemical phenomenon lives in chemistry. Pauling 1939/1960 is the canonical example — the resonance and hybridization framework is a chemical theory built on physics, not a physics text.

## Boundary with 05-biophysics

Where chemistry becomes biology — enzyme kinetics, allostery, biomolecular electron transfer, protein folding thermodynamics — the primary mechanism statement may sit in either branch. Default rule: if the originator framed the result as a chemical mechanism (e.g. Marcus 1956 on electron transfer), it lives here; if the originator framed it as a biological mechanism (Mitchell 1961 on chemiosmosis), it lives in `05-biophysics/`. Cross-link rather than duplicate.

## Promotion rule

Material enters `03-chemistry/` only when one of the following holds:

1. It is a **primary theoretical text** by the originator of the framework (e.g. Lavoisier on conservation of mass, Dalton on atoms, Mendeleev on the periodic law, G. N. Lewis on the shared electron pair, Pauling on the chemical bond, Eyring on transition-state theory, Marcus on electron transfer, Woodward and Hoffmann on orbital symmetry).
2. It is a **recognized academic edition-of-record** of a primary text (e.g. Jensen ed. 2002 for Mendeleev's selected writings; the 1960 third edition for Pauling).
3. It is a **discipline-standard normative reference** (e.g. the IUPAC *Compendium of Chemical Terminology* — the Gold Book — second edition McNaught & Wilkinson 1997 plus the live online updates).

Practitioner monographs, advanced textbooks, and lab references do not promote unless they meet condition 3 by virtue of being the discipline's normative reference, not just a popular one.

## Subfolders

- `atomic-theory/` — Lavoisier, Dalton, Avogadro, the conservation laws and the molecular hypothesis
- `periodicity/` — Mendeleev (and Meyer where relevant), the periodic law and modern restatements
- `bonding/` — Lewis 1916/1923, Pauling 1939/1960, Mulliken/Hund MO papers, the resonance and orbital-symmetry frameworks (Woodward–Hoffmann)
- `thermodynamics/` — Gibbs *On the Equilibrium of Heterogeneous Substances* and the chemical-potential formulation
- `kinetics/` — Arrhenius 1889 (activation energy), Eyring 1935 (transition-state theory), Marcus 1956 (electron transfer)
- `stereochemistry/` — van 't Hoff and Le Bel 1874, Fischer projection conventions
- `quantum-chemistry/` — primary papers on molecular orbital theory (Mulliken, Hund), valence-bond theory (Heitler-London 1927), and the formal statement of the Born-Oppenheimer approximation; cross-link to `02-physics/quantum-mechanics/`
- `reference/` — IUPAC Gold Book and other normative references; database citations (PubChem, ChEMBL) live here as pointers, not mirrors

## Status

Branch opened 2026-05-01 by the chemistry sweep at `_intake/everychem-and-chemistry-canon-sweep-2026-05-01.md`. No files yet promoted. `CANON_INDEX.md` will be created on first promotion. `_intake/` is the holding area for sweep memos and pre-promotion artifacts.
