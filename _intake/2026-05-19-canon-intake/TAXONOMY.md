# Bucket Canon — Branch → Concept Taxonomy (coverage target)

**Bead:** `bkt-epic-canon-intake` — P0 post-hotfix
**Date:** 2026-05-19
**Pillar:** Data
**Status:** coverage contract (the target the pipeline must converge toward)

---

## Purpose

This is the **coverage map**: for each of the 7 canon branches, the seed list of
foundational concepts that MUST have a curated `primary-papers.yaml`. Each
concept is a folder under `bucket-canon/<branch>/<concept>/`. A concept is
"covered" when its `primary-papers.yaml` holds ≥1 record that passes the
`RUBRIC.md` canon gate.

### What belongs here (thesis constraint, non-negotiable)

Canon = **foundations only**: axioms, real math, laws, principles, primary
derivations, landmark structures/measurements that *establish* a principle.

**NOT canon** (route elsewhere, never promote here):
- Outcomes / applications: longevity, disease treatment, cognition enhancement,
  clinical protocols → these are downstream; longevity has its own outcome canon.
- Transcript chunks, podcasts, blog posts, commentariat (Kruse, Peat, Huberman,
  Dinkov…) → at most ONE PARTIAL SOURCE under 05-biophysics, never the centre,
  never a `primary-papers.yaml` record on their own authority.
- Reviews/textbooks: allowed only as *landscape-adjacent edition-of-record*
  when they are the canonical statement of an axiom (e.g. Margulis 1970 book);
  flagged, not the default.

### Concept selection principle

A concept earns a slot if a domain expert teaching the foundations of that
field would refuse to call the canon complete without it. These are the
load-bearing results — the ones every later result in the branch derives from.
Pass-1 is deliberately a **defensible minimum**, not exhaustive: ~10–14 concepts
per branch, the spine. Breadth is a later pass; the spine must be right first.

Folder slug convention: lowercase, hyphenated, matches the existing
`sub-claims/<concept>` slugs where one already exists (so the search index and
the curated layer align on the same concept key).

---

## 01-mathematics  (target: 12 concepts)

The foundations of mathematics = the axiom systems and the structural /
limitative theorems every branch of math stands on.

| concept slug | foundational anchor (what the canon paper must establish) |
|---|---|
| `set-theory` | ZFC axioms — Zermelo 1908 axiomatization, Fraenkel/Skolem replacement |
| `godel` | Gödel incompleteness (1931): no consistent r.e. system proving its own consistency / capturing all arithmetic truths |
| `peano-arithmetic` | Peano/Dedekind axioms of the natural numbers; induction as primitive |
| `group-theory` | Galois theory — solvability by radicals ⇔ solvable Galois group; the birth of group theory |
| `topology` | Point-set foundation: Hausdorff's *Grundzüge* / general topology axioms |
| `category-theory` | Eilenberg–Mac Lane (1945) "General theory of natural equivalences" — categories, functors, natural transformations |
| `computability` | Turing (1936) computable numbers + the Entscheidungsproblem; Church–Turing |
| `probability-foundations` | Kolmogorov (1933) measure-theoretic axioms of probability |
| `proof-theory` | Gentzen — natural deduction / sequent calculus / consistency of arithmetic via transfinite induction |
| `number-theory` | Prime number theorem / Riemann's 1859 memoir (analytic foundation of distribution of primes) |
| `geometry-foundations` | Hilbert (1899) *Grundlagen der Geometrie* — the modern axiomatization of Euclidean geometry |
| `model-theory` | Löwenheim–Skolem / compactness — the foundational metatheorems of first-order logic |

## 02-physics  (target: 13 concepts)

Foundations = the variational principles, symmetries, and field laws from which
all of classical and modern physics is derived.

| concept slug | foundational anchor |
|---|---|
| `noether-theorem` | Noether (1918) — continuous symmetry ⇔ conservation law |
| `least-action` | Principle of stationary action (Hamilton/Lagrange); the variational backbone |
| `maxwell-electrodynamics` | Maxwell's field equations — unification of electricity, magnetism, light |
| `special-relativity` | Einstein (1905) "On the electrodynamics of moving bodies" |
| `general-relativity` | Einstein (1915/1916) field equations Gμν = 8πTμν |
| `quantum-mechanics` | Schrödinger (1926) wave equation / Heisenberg matrix mechanics |
| `quantum-field-theory` | Dirac equation (1928); QED renormalization (Feynman/Schwinger/Tomonaga/Dyson) |
| `thermodynamics` | The four laws; Carnot/Clausius entropy as a state function |
| `statistical-mechanics` | Boltzmann/Gibbs — entropy as S = k log W; the ensemble foundation |
| `standard-model` | Electroweak unification (Weinberg–Salam–Glashow); Higgs mechanism |
| `gauge-principle` | Yang–Mills (1954) non-abelian gauge theory |
| `bell-theorem` | Bell (1964) — no local hidden variables; foundational test of QM |
| `conservation-symmetry` | CPT theorem / Wigner's symmetry classification (foundational structure) |

## 03-chemistry  (target: 11 concepts)

Foundations = the principles that make chemistry predictive: bonding, periodicity,
thermodynamics of reaction, rate law, equilibrium.

| concept slug | foundational anchor |
|---|---|
| `periodic-law` | Mendeleev (1869) periodic system; later Moseley (1913) atomic-number basis |
| `chemical-bond` | Lewis (1916) shared electron-pair bond; Pauling *Nature of the Chemical Bond* |
| `quantum-chemistry` | Heitler–London (1927) — H₂ bond from quantum mechanics; valence-bond birth |
| `molecular-orbital` | Mulliken/Hund MO theory; Hückel for π systems |
| `chemical-thermodynamics` | Gibbs free energy; the chemical potential as the reaction driver |
| `reaction-kinetics` | Arrhenius equation; transition-state theory (Eyring 1935) |
| `chemical-equilibrium` | Law of mass action (Guldberg–Waage); Le Chatelier |
| `acid-base` | Brønsted–Lowry / Lewis acid–base definitions |
| `electrochemistry` | Nernst equation; the electrochemical cell potential foundation |
| `catalysis` | Sabatier principle / Michaelis–Menten as the kinetic foundation of catalysis |
| `stereochemistry` | van 't Hoff–Le Bel tetrahedral carbon; chirality as a structural axiom |

## 04-information  (target: 10 concepts)

Foundations = what can be computed, communicated, compressed, and learned, and
the limits thereof.

| concept slug | foundational anchor |
|---|---|
| `shannon-information` | Shannon (1948) "A mathematical theory of communication" — entropy, channel capacity |
| `computability` | Turing (1936) — the computable, the halting problem (shared anchor w/ math) |
| `complexity-theory` | Cook (1971) NP-completeness; the P vs NP foundation |
| `algorithmic-information` | Kolmogorov/Chaitin complexity — descriptive complexity of a string |
| `coding-theory` | Hamming (1950) error-detecting/correcting codes; Shannon's noisy-channel theorem |
| `cryptography-foundations` | Diffie–Hellman (1976) public-key; the trapdoor one-way-function principle |
| `error-correction` | Reed–Solomon / LDPC — the structural codes underlying reliable channels |
| `thermodynamics-of-computation` | Landauer (1961) — erasure costs kT ln 2; Bennett reversible computation |
| `learning-theory` | Valiant (1984) PAC learning — the formal foundation of learnability |
| `information-geometry` | Fisher information / Cramér–Rao bound — the geometry of statistical estimation |

## 05-biophysics  (target: 12 concepts; 4 already curated)

Foundations of how physics constrains living matter. Kruse/commentariat are at
most ONE PARTIAL SOURCE here, never a `primary-papers.yaml` record on their own.

| concept slug | foundational anchor | status |
|---|---|---|
| `mitochondria` | Mitchell chemiosmosis (1961) — the bioenergetic axiom | **curated (30 rec)** |
| `bioelectric-lineage` | Hodgkin–Huxley (1952) membrane action-potential model | **curated (27 rec)** |
| `peptides` | Anfinsen (1973) — sequence determines structure; the folding axiom | **curated (26 rec)** |
| `melanin` | Eumelanin structure/photophysics (Meredith) — pigment biophysics | **curated (21 rec)** |
| `protein-folding` | Levinthal paradox / Anfinsen thermodynamic hypothesis | empty |
| `membrane-biophysics` | Singer–Nicolson fluid mosaic (1972); lipid bilayer energetics | empty |
| `enzyme-kinetics` | Michaelis–Menten (1913); transition-state catalysis in biology | empty |
| `photosynthesis` | Z-scheme / reaction-center charge separation (Hill, Calvin, Deisenhofer) | empty |
| `dna-structure` | Watson–Crick (1953) double helix; the structural axiom of heredity | empty |
| `allostery` | Monod–Wyman–Changeux (1965) allosteric model | empty |
| `molecular-machines` | Kinesin/myosin/ATP-synthase rotary catalysis (Boyer/Walker/Noji) | empty |
| `water-biophysics` | Hydrophobic effect (Kauzmann/Tanford) — water as a structural force | empty |

> Note: Kruse-favored topics (deuterium depletion, ELF/bioelectric coupling, light) already
> exist as *flagged contested* entries inside the curated mitochondria dossier — that is the
> correct containment: present with an explicit flag, not the headline, not their own axiom.

## 06-cosmology  (target: 10 concepts)

Foundations of the universe at large scale. (The existing on-disk branch slug is
`06-cosmology`; the asteroid/extinction sub-claims there are misfiled outcomes and
should NOT seed canon concepts.)

| concept slug | foundational anchor |
|---|---|
| `friedmann-equations` | Friedmann (1922) expanding-universe solutions of GR |
| `hubble-law` | Hubble (1929) — recession velocity ∝ distance; expansion |
| `cmb` | Penzias–Wilson (1965) discovery of the cosmic microwave background |
| `big-bang-nucleosynthesis` | Alpher–Bethe–Gamow / primordial abundance derivation |
| `inflation` | Guth (1981) inflationary universe — horizon/flatness resolution |
| `dark-matter` | Rubin–Ford (1970) galaxy rotation curves; Zwicky virial mass |
| `dark-energy` | Riess 1998 / Perlmutter 1999 — accelerating expansion (Type Ia SNe) |
| `lcdm-concordance` | WMAP/Planck parameter determination — the standard cosmological model |
| `structure-formation` | Press–Schechter / gravitational-instability foundation |
| `cosmological-principle` | FLRW metric / homogeneity-isotropy as the founding postulate |

## 07-mind  (target: 11 concepts)

Foundations of cognition/perception as principled, derivable structure — NOT
self-help, NOT pop neuroscience, NOT outcome (cognition enhancement is downstream).

| concept slug | foundational anchor |
|---|---|
| `neuron-doctrine` | Cajal — the neuron as the discrete signaling unit |
| `action-potential` | Hodgkin–Huxley (1952) — quantitative membrane excitability (shared w/ biophysics) |
| `hebbian-plasticity` | Hebb (1949) — cells that fire together wire together; the learning axiom |
| `predictive-coding` | Rao–Ballard (1999) / free-energy principle — perception as inference |
| `bayesian-brain` | Helmholtz unconscious inference → Bayesian perception formalism |
| `information-theory-of-perception` | Barlow efficient-coding / redundancy-reduction hypothesis |
| `attention` | Treisman feature-integration / Posner spatial-attention foundation |
| `memory-systems` | Scoville–Milner (1957, H.M.) — declarative vs procedural dissociation |
| `reinforcement-learning` | Rescorla–Wagner / Sutton–Barto TD learning; dopamine RPE (Schultz 1997) |
| `binding-problem` | Neural synchrony / temporal binding hypothesis (von der Malsburg, Singer) |
| `global-workspace` | Baars / Dehaene–Changeux global neuronal workspace (consciousness foundation) |

---

## Coverage scorecard (as of 2026-05-19)

| Branch | concepts in target | curated (≥1 canon rec) | seeded this bead |
|---|---|---|---|
| 01-mathematics | 12 | 0 | **5 (golden seed)** |
| 02-physics | 13 | 0 | **5 (golden seed)** |
| 03-chemistry | 11 | 0 | 0 |
| 04-information | 10 | 0 | 0 |
| 05-biophysics | 12 | 4 (pre-existing) | 0 |
| 06-cosmology | 10 | 0 | 0 |
| 07-mind | 11 | 0 | 0 |
| **total** | **79** | **4** | **+10** |

`08-deep-history`, `09-art`, `09-sacred-texts` exist on disk but are **NOT canon
branches** per the thesis (7 branches only). They are out of scope for this
contract; do not seed `primary-papers.yaml` there. (Tracked separately — likely
archive/relabel, not a Data-pillar decision.)

## Convergence definition

The pipeline has "covered" a branch when every concept slug above has a
`primary-papers.yaml` with ≥1 record at `canon_score ≥ 70` AND
`gate == "canon"` per `RUBRIC.md`. Full 7-branch coverage = 79 concepts, each
with a hand-checkable seed `queries.txt`. See `SOURCING.md` for how each
concept's queries.txt is built and `RUBRIC.md` for the pass/fail gate.
