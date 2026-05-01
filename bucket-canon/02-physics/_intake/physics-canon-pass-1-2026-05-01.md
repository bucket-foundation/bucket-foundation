# Physics Canon — Pass-1 Sweep — 2026-05-01

Intake document. Not promoted. Opens `02-physics/` as a full canon branch under the same promotion rule used to seed `03-chemistry/` and `09-art/`. The branch did not exist before this sweep; `02-physics/README.md` and `02-physics/CANON_INDEX.md` were created alongside this file.

Author: data pillar (research sweep).

The branch is opened in part to resolve dangling cross-links from `03-chemistry/`. Chemistry pass-3 §5.1 places six items (Schrödinger 1926, Dirac 1928, Pauli 1925, Born–Oppenheimer 1927, Hohenberg–Kohn 1964, Kohn–Sham 1965) on the physics side and three statmech items (Boltzmann, Gibbs 1902, modern formulations) on the physics side. None of those entries can resolve until physics has a tree. This pass-1 builds it.

---

## 1. Inventory of candidate canon entries

Each entry: author, title, year, edition-of-record where it differs from the original, mechanism justification, sub-domain, strength (*strong* / *borderline*).

### Classical mechanics

**Isaac Newton — *Philosophiæ Naturalis Principia Mathematica*, Streater, London, 1687.** Edition of record: I. Bernard Cohen and Anne Whitman (tr.), with Julia Budenz, *The Principia: Mathematical Principles of Natural Philosophy*, University of California Press, Berkeley, 1999 (ISBN 978-0-520-08816-0). Primary statement of the three laws of motion and universal gravitation. Originator-tier, mechanism-level, foundational. **Strong.** `classical-mechanics/`.

**Joseph-Louis Lagrange — *Mécanique analytique*, Veuve Desaint, Paris, 1788; revised 2nd edition Mme Ve Courcier, Paris, 1811–1815.** Edition of record: Auguste Boissonnade and Victor N. Vagliente (tr.), *Analytical Mechanics*, Kluwer, 1997 (ISBN 0-7923-4349-2), based on the 2nd edition. Primary statement of mechanics in generalized coordinates and the principle of virtual work as the basis of dynamics. **Strong.** `classical-mechanics/`.

**William Rowan Hamilton — "On a General Method in Dynamics", *Philosophical Transactions of the Royal Society* 124, 247–308 (1834); "Second Essay on a General Method in Dynamics", *Philosophical Transactions of the Royal Society* 125, 95–144 (1835).** Edition of record: A. W. Conway and A. J. McConnell (eds.), *The Mathematical Papers of Sir William Rowan Hamilton, vol. II: Dynamics*, Cambridge University Press, 1940. Primary statement of the canonical equations and the principle of stationary action in modern form. **Strong.** `classical-mechanics/`.

**Carl Gustav Jacob Jacobi — *Vorlesungen über Dynamik*, ed. A. Clebsch, G. Reimer, Berlin, 1866 (delivered 1842–1843).** English translation: K. Balagangadharan (tr.), *Jacobi's Lectures on Dynamics*, Hindustan Book Agency, 2009 (ISBN 978-81-85931-91-3). Primary statement of the Hamilton–Jacobi equation and canonical transformations. **Strong.** `classical-mechanics/`.

**Emmy Noether — "Invariante Variationsprobleme", *Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen, Mathematisch-Physikalische Klasse* 1918, 235–257 (1918).** English edition of record: M. A. Tavel (tr.), "Invariant Variation Problems", *Transport Theory and Statistical Physics* 1(3), 183–207 (1971). Primary statement of the correspondence between continuous symmetries and conservation laws. The single most-cited theorem in modern theoretical physics; load-bearing for every gauge theory below. **Strong.** `classical-mechanics/`. (Cross-link from `01-mathematics/calculus-of-variations/`.)

### Electromagnetism

**Michael Faraday — *Experimental Researches in Electricity*, 3 vols., Richard and John Edward Taylor, London, 1839, 1844, 1855.** Public-domain modern reprint: Dover, 3 vols., 1965 (ISBN 0-486-21537-8). Primary observational papers on electromagnetic induction, lines of force, the field concept, and the Faraday effect (magneto-optical rotation). The field concept — that the electromagnetic field is a physical entity, not a mathematical bookkeeping device — originates here. **Strong.** `electromagnetism/`.

**James Clerk Maxwell — *A Treatise on Electricity and Magnetism*, 2 vols., Clarendon Press, Oxford, 1873.** Edition of record: third edition, ed. J. J. Thomson, Clarendon Press, Oxford, 1891 (PD; Dover reprint 1954, ISBN 0-486-60636-8 / 0-486-60637-6). Primary statement of the unified theory of the electromagnetic field, the displacement current, and the electromagnetic theory of light. The four equations in their modern vector form are due to Heaviside; the *Treatise* gives the quaternion-based originator statement. **Strong.** `electromagnetism/`.

**Oliver Heaviside — *Electromagnetic Theory*, 3 vols., The Electrician Printing and Publishing Co., London, 1893, 1899, 1912.** Public-domain reprint: Cosimo Classics / Chelsea, 1971. Primary statement of the modern vector form of Maxwell's equations and the operational calculus. The four-equations form every textbook now uses originates here, not in Maxwell. **Strong.** `electromagnetism/`.

**Hendrik Antoon Lorentz — "La théorie électromagnétique de Maxwell et son application aux corps mouvants", *Archives néerlandaises des sciences exactes et naturelles* 25, 363–552 (1892); *The Theory of Electrons and Its Applications to the Phenomena of Light and Radiant Heat*, Teubner, Leipzig, 1909 (2nd ed. 1916; Dover reprint 1952).** Primary statement of the Lorentz force law in its modern form and the electron theory of matter. **Strong.** `electromagnetism/`.

### Thermodynamics

**Sadi Carnot — *Réflexions sur la puissance motrice du feu et sur les machines propres à développer cette puissance*, Bachelier, Paris, 1824.** Edition of record: R. H. Thurston (tr.), *Reflections on the Motive Power of Fire*, Wiley, 1890; Dover reprint 1960 (ISBN 0-486-44641-7). Primary statement of the Carnot cycle and the second-law-prefiguring efficiency bound. **Strong.** `thermodynamics/`.

**Rudolf Clausius — "Über die bewegende Kraft der Wärme und die Gesetze, welche sich daraus für die Wärmelehre selbst ableiten lassen", *Annalen der Physik* 155(3), 368–397 and 155(4), 500–524 (1850); "Über verschiedene für die Anwendung bequeme Formen der Hauptgleichungen der mechanischen Wärmetheorie", *Annalen der Physik* 201(7), 353–400 (1865) [the "entropy" paper].** Primary statements of the first and second laws of thermodynamics in their modern form and the introduction of the term *entropy*. **Strong.** `thermodynamics/`.

**Hermann von Helmholtz — "Über die Erhaltung der Kraft", G. Reimer, Berlin, 1847.** Primary statement of the conservation of energy as a unified principle across mechanical, thermal, electrical, and chemical phenomena. **Strong.** `thermodynamics/`.

**Max Planck — "Über das Gesetz der Energieverteilung im Normalspectrum", *Annalen der Physik* 309(3), 553–563 (1901) [following the December 1900 Verhandlungen presentation].** Primary statement of the black-body radiation law and the introduction of the energy quantum `h`. **Strong.** `thermodynamics/` (with cross-link to `quantum-mechanics/` — debatable placement, see §4).

### Statistical mechanics

**Ludwig Boltzmann — "Weitere Studien über das Wärmegleichgewicht unter Gasmolekülen", *Sitzungsberichte der Kaiserlichen Akademie der Wissenschaften in Wien* 66, 275–370 (1872) [the H-theorem paper]; "Über die Beziehung zwischen dem zweiten Hauptsatze des mechanischen Wärmetheorie und der Wahrscheinlichkeitsrechnung respektive den Sätzen über das Wärmegleichgewicht", *Sitzungsberichte* 76, 373–435 (1877).** Primary statements of the H-theorem and the statistical interpretation of entropy `S = k log W`. **Strong.** `statistical-mechanics/`.

**Josiah Willard Gibbs — *Elementary Principles in Statistical Mechanics: Developed with Especial Reference to the Rational Foundation of Thermodynamics*, Charles Scribner's Sons, New York, 1902.** PD reprint: Dover, 1960 (ISBN 0-486-78995-0). Primary statement of the ensemble formulation. The text every modern statistical mechanics is built on. **Strong.** `statistical-mechanics/`.

**Albert Einstein — "Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung von in ruhenden Flüssigkeiten suspendierten Teilchen", *Annalen der Physik* 322(8), 549–560 (1905) [the Brownian-motion paper].** Primary statement linking molecular reality to observable diffusion — the empirical wedge for the atomic hypothesis. **Strong.** `statistical-mechanics/` (alternatively the Annus Mirabilis bundle in `relativity/special/`).

**Lars Onsager — "Reciprocal Relations in Irreversible Processes. I", *Physical Review* 37(4), 405–426 (1931); "II", *Physical Review* 38(12), 2265–2279 (1931).** Primary statement of the reciprocal relations of non-equilibrium thermodynamics. **Strong.** `statistical-mechanics/`.

### Special and general relativity

**Albert Einstein — *Annalen der Physik* 1905 trio: "Über einen die Erzeugung und Verwandlung des Lichtes betreffenden heuristischen Gesichtspunkt", 322(6), 132–148 [photoelectric]; "Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung…", 322(8), 549–560 [Brownian]; "Zur Elektrodynamik bewegter Körper", 322(10), 891–921 [special relativity]; "Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig?", 323(13), 639–641 [E = mc²].** The Annus Mirabilis bundle. Strong as four separate entries. **Strong.** `relativity/special/` (special-relativity papers) plus cross-listings as noted above.

**Hermann Minkowski — "Raum und Zeit", *Jahresbericht der Deutschen Mathematiker-Vereinigung* 18, 75–88 (1909).** Primary statement of the four-dimensional spacetime formulation of special relativity. **Strong.** `relativity/special/`.

**Albert Einstein — "Die Feldgleichungen der Gravitation", *Sitzungsberichte der Preussischen Akademie der Wissenschaften zu Berlin* 1915, 844–847 (25 November 1915); "Die Grundlage der allgemeinen Relativitätstheorie", *Annalen der Physik* 354(7), 769–822 (1916).** The field equations and the 1916 review. **Strong.** `relativity/general/`.

**David Hilbert — "Die Grundlagen der Physik. (Erste Mitteilung)", *Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen, Mathematisch-Physikalische Klasse* 1915, 395–407 (presented 20 November 1915, published 1916).** Parallel variational derivation of the Einstein field equations. The priority dispute is settled in Einstein's favour for the physical theory; Hilbert's variational route is canon for the action principle. **Strong.** `relativity/general/`.

**Karl Schwarzschild — "Über das Gravitationsfeld eines Massenpunktes nach der Einsteinschen Theorie", *Sitzungsberichte der Königlich Preussischen Akademie der Wissenschaften zu Berlin* 1916, 189–196 (1916).** First exact solution of Einstein's field equations. **Strong.** `relativity/general/`.

### Quantum mechanics

**Werner Heisenberg — "Über quantentheoretische Umdeutung kinematischer und mechanischer Beziehungen", *Zeitschrift für Physik* 33, 879–893 (1925).** Primary statement of matrix mechanics. **Strong.** `quantum-mechanics/`.

**Max Born, Werner Heisenberg and Pascual Jordan — "Zur Quantenmechanik II", *Zeitschrift für Physik* 35, 557–615 (1926) [the *Dreimännerarbeit*; Born–Jordan "Zur Quantenmechanik", *Zeitschrift für Physik* 34, 858–888 (1925) is the predecessor].** Primary statement of matrix-mechanics formalism. **Strong.** `quantum-mechanics/`.

**Erwin Schrödinger — *Annalen der Physik* 1926 series: "Quantisierung als Eigenwertproblem (Erste Mitteilung)", 384(4), 361–376; "(Zweite Mitteilung)", 384(6), 489–527; "(Dritte Mitteilung)", 385(13), 437–490; "(Vierte Mitteilung)", 386(18), 109–139.** Primary statement of wave mechanics. **Strong.** `quantum-mechanics/`.

**Max Born — "Zur Quantenmechanik der Stossvorgänge", *Zeitschrift für Physik* 37, 863–867 (1926); follow-up 38, 803–827 (1926).** Primary statement of the probability interpretation of the wave function. **Strong.** `quantum-mechanics/`.

**Paul A. M. Dirac — "The Quantum Theory of the Electron", *Proceedings of the Royal Society A* 117, 610–624 (1928) and 118, 351–361 (1928).** Primary statement of the relativistic electron equation. **Strong.** `quantum-mechanics/`.

**Paul A. M. Dirac — *The Principles of Quantum Mechanics*, Clarendon Press, Oxford, 1930.** Edition of record: 4th edition (revised), 1958 (ISBN 0-19-852011-5). Originator monograph; bra-ket notation, transformation theory, the canonical quantum-mechanics text. **Strong** (under condition 1 of the promotion rule — Dirac is the originator of the formalism the book systematizes; see Contestable §4). `quantum-mechanics/`.

**John von Neumann — *Mathematische Grundlagen der Quantenmechanik*, Springer, Berlin, 1932.** English edition of record: Robert T. Beyer (tr.), *Mathematical Foundations of Quantum Mechanics*, Princeton University Press, 1955 (revised ed. by Nicholas A. Wheeler, 2018, ISBN 978-0-691-17856-1). Originator-monograph for the Hilbert-space axiomatization, the projection postulate, and the von Neumann measurement scheme. **Strong.** `quantum-mechanics/` (cross-link from `01-mathematics/operator-theory/`).

**Wolfgang Pauli — "Über den Zusammenhang des Abschlusses der Elektronengruppen im Atom mit der Komplexstruktur der Spektren", *Zeitschrift für Physik* 31, 765–783 (1925).** Primary statement of the exclusion principle. **Strong.** `quantum-mechanics/` (cross-linked from `03-chemistry/periodicity/`).

**Max Born and J. Robert Oppenheimer — "Zur Quantentheorie der Molekeln", *Annalen der Physik* 389(20), 457–484 (1927).** Primary statement of the adiabatic separation of electronic and nuclear motion. **Strong.** `quantum-mechanics/` (cross-linked from `03-chemistry/quantum-chemistry/`).

### Quantum field theory and gauge theory

**Sin-Itiro Tomonaga — "On a Relativistically Invariant Formulation of the Quantum Theory of Wave Fields", *Progress of Theoretical Physics* 1(2), 27–42 (1946).** **Julian Schwinger — "Quantum Electrodynamics. I. A Covariant Formulation", *Physical Review* 74(10), 1439–1461 (1948).** **Richard P. Feynman — "Space-Time Approach to Quantum Electrodynamics", *Physical Review* 76(6), 769–789 (1949).** **Freeman J. Dyson — "The Radiation Theories of Tomonaga, Schwinger, and Feynman", *Physical Review* 75(3), 486–502 (1949).** Primary statement of renormalized QED; the joint 1965 Nobel papers plus Dyson's unification. **Strong** (as a four-paper set). `quantum-field-theory/`.

**Chen-Ning Yang and Robert L. Mills — "Conservation of Isotopic Spin and Isotopic Gauge Invariance", *Physical Review* 96(1), 191–195 (1954).** Primary statement of non-abelian gauge theory. **Strong.** `quantum-field-theory/`.

**Peter W. Higgs — "Broken Symmetries and the Masses of Gauge Bosons", *Physical Review Letters* 13(16), 508–509 (1964).** **François Englert and Robert Brout — "Broken Symmetry and the Mass of Gauge Vector Mesons", *Physical Review Letters* 13(9), 321–323 (1964).** Primary statements of the Higgs mechanism. **Strong** (paired). `quantum-field-theory/`.

### Particle physics and the Standard Model

**Sheldon L. Glashow — "Partial-Symmetries of Weak Interactions", *Nuclear Physics* 22(4), 579–588 (1961).** **Steven Weinberg — "A Model of Leptons", *Physical Review Letters* 19(21), 1264–1266 (1967).** **Abdus Salam — "Weak and Electromagnetic Interactions", in N. Svartholm (ed.), *Elementary Particle Theory: Relativistic Groups and Analyticity (Proc. 8th Nobel Symposium)*, Almqvist & Wiksell, Stockholm, 1968, 367–377.** Primary statements of the electroweak unification. **Strong** (paired). `particle-physics/`.

**David J. Gross and Frank Wilczek — "Ultraviolet Behavior of Non-Abelian Gauge Theories", *Physical Review Letters* 30(26), 1343–1346 (1973).** **H. David Politzer — "Reliable Perturbative Results for Strong Interactions?", *Physical Review Letters* 30(26), 1346–1349 (1973).** Primary statements of asymptotic freedom in QCD. **Strong** (paired). `particle-physics/`.

**Particle Data Group — *Review of Particle Physics*, biennial in *Physical Review D* (most recent: R. L. Workman et al., *Phys. Rev. D* 110, 030001 (2024); subsequent updates online at pdg.lbl.gov).** Discipline-standard normative reference. **Strong** under condition 3. `reference/`.

### Condensed matter and renormalization group

**John Bardeen, Leon N. Cooper and J. Robert Schrieffer — "Theory of Superconductivity", *Physical Review* 108(5), 1175–1204 (1957).** Primary statement of BCS theory. **Strong.** `condensed-matter/`.

**Philip W. Anderson — "Absence of Diffusion in Certain Random Lattices", *Physical Review* 109(5), 1492–1505 (1958).** Primary statement of localization. **Strong.** `condensed-matter/`.

**Kenneth G. Wilson — "Renormalization Group and Critical Phenomena. I. Renormalization Group and the Kadanoff Scaling Picture", *Physical Review B* 4(9), 3174–3183 (1971); "II. Phase-Space Cell Analysis of Critical Behavior", *Physical Review B* 4(9), 3184–3205 (1971); "The Renormalization Group: Critical Phenomena and the Kondo Problem", *Reviews of Modern Physics* 47(4), 773–840 (1975).** Primary statements of the modern renormalization group. **Strong.** `condensed-matter/` (cross-link to `quantum-field-theory/`).

### Reference works

**Codata recommended values of the fundamental physical constants (2022 adjustment): Eite Tiesinga, Peter J. Mohr, David B. Newell and Barry N. Taylor, *Reviews of Modern Physics* 96, 025002 (2024).** Discipline-standard. **Strong.** `reference/`.

**International Bureau of Weights and Measures — *The International System of Units (SI)*, 9th edition, BIPM, Sèvres, 2019 (with updated minor corrections through the current edition; online at bipm.org).** Discipline-standard. **Strong.** `reference/`.

### Borderline / under contest (see §4)

- Landau-Lifshitz *Course of Theoretical Physics* (10 vols., Pergamon / Butterworth-Heinemann, 1958–1981, multiple revised editions). Borderline as canon vs landscape.
- Misner, Thorne and Wheeler, *Gravitation*, W. H. Freeman, 1973 (reprint Princeton, 2017). Borderline.
- Robert M. Wald, *General Relativity*, University of Chicago Press, 1984. Borderline.
- Steven Weinberg, *The Quantum Theory of Fields*, vols. I–III, Cambridge University Press, 1995–2000. Borderline (Weinberg as originator of significant electroweak material — promotion eligible under condition 1 if framed narrowly to those chapters).
- Feynman, Leighton and Sands, *The Feynman Lectures on Physics*, 3 vols., Addison-Wesley, 1963–1965. Borderline; pedagogical synthesis by an originator.
- Michelson and Morley 1887 (*American Journal of Science* 34, 333–345), Davisson and Germer 1927 (*Physical Review* 30, 705–740), Wu et al. 1957 (*Physical Review* 105, 1413–1415). Borderline as *experimental* foundation papers; see §4.

Total inventory: **~38 strong** primary entries plus a dozen borderline entries to be ratified or rejected in pass-2.

---

## 2. Sub-domain map and proposed folder tree

```
02-physics/
  README.md
  CANON_INDEX.md
  _intake/
    physics-canon-pass-1-2026-05-01.md       (this file)
  classical-mechanics/                       (Newton, Lagrange, Hamilton, Jacobi, Noether)
  electromagnetism/                          (Faraday, Maxwell, Heaviside, Lorentz)
  thermodynamics/                            (Carnot, Clausius, Helmholtz, Planck)
  statistical-mechanics/                     (Boltzmann, Gibbs 1902, Einstein-Brownian, Onsager)
  relativity/
    special/                                 (Einstein 1905 trio, Minkowski 1909)
    general/                                 (Einstein 1915–1916, Hilbert 1915, Schwarzschild 1916)
  quantum-mechanics/
    (Heisenberg 1925, BHJ 1926, Schrödinger 1926, Born 1926, Dirac 1928, Pauli 1925,
     Born–Oppenheimer 1927, Dirac monograph 1958, von Neumann 1932)
  quantum-field-theory/                      (Tomonaga–Schwinger–Feynman–Dyson, Yang–Mills, Higgs, Englert–Brout)
  particle-physics/                          (Glashow, Weinberg, Salam, Gross–Wilczek, Politzer; PDG → reference/)
  condensed-matter/                          (BCS, Anderson 1958, Wilson RG)
  reference/                                 (CODATA, BIPM SI, PDG Review)
  _landscape/
    textbooks.md                             (Jackson, Sakurai, Griffiths, Peskin–Schroeder, Halliday–Resnick…)
```

The `relativity/` two-fold split mirrors the chemistry pass-3 pattern of grouping closely related sub-folders (`thermodynamics/electrochemistry/` etc.). One alternative considered was a flat `relativity/` with file-level naming; the two-fold won because special and general relativity have distinct boundary cases (special ↔ classical EM via Minkowski; general ↔ cosmology via Friedmann) and each will accumulate its own cross-link table.

Cross-link map (preliminary — pass-2 produces the binding `CROSS_LINKS.md`):

- `classical-mechanics/noether-1918` ↔ `01-mathematics/calculus-of-variations/`
- `quantum-mechanics/von-neumann-1932` ↔ `01-mathematics/operator-theory/`
- `quantum-mechanics/pauli-1925` ↔ `03-chemistry/periodicity/`
- `quantum-mechanics/born-oppenheimer-1927` ↔ `03-chemistry/quantum-chemistry/`
- `quantum-mechanics/schrödinger-1926` ↔ `03-chemistry/quantum-chemistry/`
- `quantum-mechanics/dirac-1928` ↔ `03-chemistry/quantum-chemistry/`
- `statistical-mechanics/boltzmann` and `statistical-mechanics/gibbs-1902` ↔ `03-chemistry/thermodynamics/`
- `relativity/general/einstein-1915` ↔ `06-cosmology/` (Friedmann derivations)
- `quantum-field-theory/yang-mills-1954` ↔ `particle-physics/electroweak`
- `condensed-matter/wilson-rg` ↔ `quantum-field-theory/`

---

## 3. Boundary calls — explicit

The README gives the principle. Pass-1 fixes five specific test cases.

| Text | Side | Reason |
|------|------|--------|
| von Neumann 1932, *Mathematische Grundlagen* | physics (cross-link from math) | Originator framing is foundations of QM; the Hilbert-space machinery is reused outside physics, so math holds a cross-link, not the canonical entry. |
| Reed and Simon, *Methods of Modern Mathematical Physics*, 4 vols., Academic Press, 1972–1979 | math | Pure operator theory and functional analysis. Not a physics canon entry. |
| Sakurai, *Modern Quantum Mechanics*, Addison-Wesley, 1994 (rev. ed. Napolitano 2017) | landscape | Pedagogical synthesis, no originator status. Appears in `_landscape/textbooks.md`, not promoted. |
| Friedmann 1922, "Über die Krümmung des Raumes", *Z. Phys.* 10, 377–386 | cosmology | Specific cosmological model derived from GR. Cross-link from `02-physics/relativity/general/`. |
| Mitchell 1961, "Coupling of Phosphorylation to Electron and Hydrogen Transfer by a Chemi-Osmotic Type of Mechanism", *Nature* 191, 144–148 | biophysics | Originator framing is biology. Not physics. |

Operational rules ratified by pass-1:

- **Pure quantum-mechanical postulates and derivations → physics.** Schrödinger 1926, Dirac 1928, Pauli 1925, Born–Oppenheimer 1927, Hohenberg–Kohn 1964, Kohn–Sham 1965 all sit in `02-physics/quantum-mechanics/`.
- **Many-electron methods designed for chemical bonding → chemistry.** Heitler–London 1927, Hund, Mulliken, Hückel, Hartree–Fock–Roothaan, Čížek all sit in `03-chemistry/quantum-chemistry/`.
- **Statistical mechanics of N indistinguishable particles → physics.** Boltzmann, Gibbs 1902, modern formulations.
- **Chemical-potential / phase-rule / electrolyte / equilibrium-constant treatments → chemistry.**
- **Cosmological models (FLRW, inflation, ΛCDM, BBN) → cosmology.** GR field equations stay in physics.
- **Pure mathematics of QM (Hilbert spaces, operator theory, calculus of variations) → math.** Originator papers that *invent* mathematical structure inside a physical theory (Noether 1918, Dirac 1928) are physics canon with a math cross-link.

---

## 4. Contestable calls — for pass-2

Five questions pass-1 deliberately does not resolve. Each gets a structured argument both ways. Pass-2 picks a side; pass-3 makes it binding.

**4.1 Landau-Lifshitz, *Course of Theoretical Physics* (10 vols., 1958–1981).** Argument for canon: it is the discipline-standard reference at advanced level, comparable in normative weight to IUPAC's role in chemistry; volumes 2 (*Classical Theory of Fields*) and 5 (*Statistical Physics*) are the working reference for entire generations of theorists. Argument against: it is pedagogical synthesis, not originator. Landau is an originator (Ginzburg–Landau theory, Landau Fermi-liquid theory, Landau levels) but the *Course* is encyclopedic, not a primary statement. The pass-1 lean is **landscape**, with the standalone Landau primary papers (Ginzburg–Landau 1950, Landau 1957 Fermi liquid) eligible for separate promotion in `condensed-matter/`. The honest take below.

**4.2 Misner, Thorne and Wheeler, *Gravitation* (1973).** Argument for canon: it is the standard reference for general relativity for two generations; Wheeler is an originator of geometrodynamics. Argument against: pedagogical synthesis; the originator content (Wheeler's contributions to ADM, the wormhole geometry) is in primary papers that promote separately. Pass-1 lean: **landscape**, with Wald 1984 as the more austere alternative for the same role and also landscape.

**4.3 Feynman, Leighton and Sands, *The Feynman Lectures on Physics* (1963–1965).** Argument for canon: pedagogical synthesis by an originator (Feynman) at the height of his powers, with novel physical-intuition arguments (the path-integral exposition in Vol. III is partly originator material). Argument against: not a primary statement; the originator content is in Feynman's RMP papers. Pass-1 lean: **landscape**, with the original Feynman path-integral paper (*Reviews of Modern Physics* 20(2), 367–387, 1948) promoted separately under `quantum-field-theory/`.

**4.4 Dirac, *The Principles of Quantum Mechanics* (1958, 4th ed.).** Argument for canon: Dirac is the originator of the formalism (transformation theory, bra-ket notation) and the book is the originator monograph. Argument against: the originator content is in his 1925–1928 papers; the book systematizes. The chemistry-branch precedent (Pauling 1960 *Nature of the Chemical Bond* promoted as canon under condition 1) supports promotion. Pass-1 lean: **canon**, listed strong in §1; flagged here only because the rule for "originator monograph vs originator paper" is the same that chemistry pass-3 §3.1 had to settle (and settled in favour of monograph promotion for Pauling). Pass-2 ratifies.

**4.5 Experimental foundation papers vs a dedicated `experimental/` sub-fold.** The candidates: Michelson and Morley 1887 (null result for the aether), Davisson and Germer 1927 (electron diffraction confirms de Broglie), Wu, Ambler, Hayward, Hoppes and Hudson 1957 (parity violation in beta decay, *Phys. Rev.* 105, 1413), and the cosmological observations (COBE Mather et al. 1990; WMAP Bennett et al. 2003; Planck collaboration 2018). Argument for keeping in the theory branch: these papers established or falsified specific theoretical content; they are foundation-level *because* of the theory. Argument for a dedicated `experimental/` sub-fold: the cohort is large enough to justify its own house, and mixing them in with theory papers makes the theory sub-folders inconsistent (most theory sub-folders contain only theory papers). Pass-1 lean: **mix in**, on the chemistry-pass-3 precedent that placed Bragg & Bragg 1913 in `03-chemistry/crystallography/` rather than a separate experimental fold. The cosmological observations belong in `06-cosmology/observational/`, not here.

---

## 5. Honest take

**Top-5 must-have entries.** Newton *Principia* (Cohen-Whitman 1999); Maxwell *Treatise* (3rd ed. 1891); Einstein 1905 special-relativity paper; Einstein 1915 field-equations paper; Heisenberg 1925 + the Schrödinger 1926 four-paper series, treated as the founding pair of quantum mechanics. If forced to a single fifth pick over the QM pair, Noether 1918 — its reach across every gauge theory below makes it the most cited foundation in modern theoretical physics.

**Hardest boundary call vs `01-mathematics/`.** Noether 1918. The paper is a theorem about variational problems with a clean mathematical statement that makes sense outside any physical context. Mathematicians cite it as a result in the calculus of variations and Lie theory; physicists cite it as the conservation-law generator for every gauge symmetry. The argument for math: the proof is a result in the calculus of variations and would be canon there even if no physicist had ever read it. The argument for physics: Noether wrote it at Hilbert and Klein's request specifically to clarify energy conservation in general relativity; the originator framing is unambiguously physics; every downstream physics use rests on it; Tavel's 1971 English translation appeared in *Transport Theory and Statistical Physics*. Pass-1 places it in physics and cross-links from math, on the originator-framing rule. A defensible pass-2 reversal is possible.

**Landau-Lifshitz: canon or landscape?** Honest take: **landscape, with named carve-outs.** The *Course* is encyclopedic, not primary. It is the working reference of the discipline, not its originator statement. The chemistry branch made the parallel call against Cotton 1990 *Chemical Applications of Group Theory* despite Cotton's stature, and the precedent should hold. The carve-out: where Landau is the originator (Ginzburg–Landau 1950 superconductor theory; Landau 1957 Fermi-liquid theory; Landau-Placzek peak; Landau damping 1946), promote the primary papers in `condensed-matter/` or `statistical-mechanics/`, not the textbook chapters. The textbook itself goes in `_landscape/textbooks.md` alongside Jackson, Griffiths, Sakurai, and Peskin-Schroeder. This keeps the rule that *normative discipline-standard reference* in the promotion rule means *normative*, like IUPAC and CODATA — not *most-assigned*. The landscape file is where a researcher learns what the working library looks like; the canon is where they learn what the foundations are. Conflating the two is the chemistry-branch error pass-3 spent a section unwinding (`_landscape/textbooks.md` exists for exactly this reason). Physics inherits the rule.

Sources used in this pass:

- [Noether 1918, "Invariante Variationsprobleme"](https://eudml.org/doc/59024)
- [Born, Heisenberg, Jordan 1926, "Zur Quantenmechanik II"](https://link.springer.com/article/10.1007/BF01379806)
