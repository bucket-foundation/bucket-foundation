# Physics Canon — Pass-2 Deep Dive — 2026-05-01

Intake document. Not promoted. Successor to `physics-canon-pass-1-2026-05-01.md`. Pass-1 opened the branch with a 38-entry inventory, a proposed sub-folder tree, five explicit boundary calls, and five contestable items deferred. This memo executes the pass-2 charter: walk every sub-domain at lineage depth, adjudicate the cross-branch boundaries against the parallel pass-1 sweeps in `01-mathematics`, `04-information`, and `03-chemistry` pass-3, name the pass-1 omissions, freeze the folder tree with seeded `CANON_INDEX.md` blocks, and close with a work queue and a small set of remaining open questions.

Author: data pillar (research sweep, deep dive).

The branch promotion rule (`README.md`) and the chemistry pass-3 rule for "originator monograph vs originator paper" (chemistry pass-3 §3.1) are treated as binding. Where this memo defends a placement, it does so by literal quotation of c1 / c2 / c3 against the candidate text.

---

## 1. Sub-domain deep dives

This section walks each pass-1 sub-folder at edition-of-record + mechanism level, audits for omissions, and freezes the per-entry promotion calls. Where pass-1 was right, pass-2 ratifies; where pass-1 erred, pass-2 reverses with reasoning.

### 1.1 `classical-mechanics/`

**Galileo Galilei — *Discorsi e dimostrazioni matematiche, intorno à due nuove scienze, attenenti alla mecanica & i movimenti locali*, Lodewijk Elzevir, Leiden, 1638.** Edition of record (English): Stillman Drake (tr.), *Two New Sciences, Including Centers of Gravity and Force of Percussion*, University of Wisconsin Press, Madison, 1974; 2nd edition with new introduction, Wall & Emerson, Toronto, 1989 (ISBN 0-921332-50-0). Day Three of the *Discorsi* contains the first mathematically-stated kinematic laws: uniform motion, uniformly accelerated motion, and the parabolic trajectory of projectiles. Day Four proves the parabola from the composition of horizontal-uniform and vertical-uniformly-accelerated motion. This is the originator-tier statement of kinematics as an axiomatic theory. **Pass-1 missed this entry.** Newton's *Principia* presupposes Galileo's Day-Three results in its discussion of falling bodies (Book I, Sec. I, Lemma X scholium); Newton himself cites Galileo. Pass-2 ruling: **promote under c1.** Folder: `classical-mechanics/`. Entry key: `1638-galileo-discorsi`. The English edition of record is Drake 1974/1989; the originator language is Italian; standard scholarly citation format includes Day and Proposition number. *Discorsi* is the only Renaissance entry in the entire physics branch under the proposed tree, and that is correct — Copernicus, Kepler, and Galileo's earlier *Dialogo* (1632) are not foundation-tier under our promotion rule (Copernicus is a model rather than a law-statement; Kepler's laws are observational generalizations later derived from Newton's gravitation; the *Dialogo* is dialectical exposition, not axiomatic).

**Isaac Newton — *Philosophiæ Naturalis Principia Mathematica*, Streater, London, 1687.** Pass-1 ratified, edition of record Cohen-Whitman 1999. The 3rd edition of 1726 is the originator's final revision; Cohen-Whitman is built on it with full critical apparatus. No change.

**Joseph-Louis Lagrange — *Mécanique analytique*, 1788; 2nd ed. 1811–15.** Pass-1 ratified, edition of record Boissonnade-Vagliente 1997. Mechanism: the d'Alembert principle of virtual work elevated to the foundation of mechanics, the Euler-Lagrange equations stated for a system of generalized coordinates, the recognition that the Lagrangian `L = T − V` plays the role of a state function. The 2nd edition is the edition of record because Lagrange revised it in his last years and the revisions are substantive (notation, the addition of the variation of the action). No change.

**William Rowan Hamilton — "On a General Method in Dynamics" + "Second Essay", *Phil. Trans.* 124 (1834), 247–308; 125 (1835), 95–144.** Pass-1 ratified, edition of record Conway-McConnell 1940. Mechanism: the canonical equations `dq/dt = ∂H/∂p`, `dp/dt = −∂H/∂q`, the principal function `S(q, q₀, t)` and its role as the generator of the canonical transformation that solves the equations of motion. Hamilton's 1834-35 essays are technically dense; modern presentations follow Jacobi (next entry). The two papers are the origin. No change.

**Carl Gustav Jacob Jacobi — *Vorlesungen über Dynamik*, ed. Clebsch, 1866 (delivered 1842–43).** Pass-1 ratified, edition of record Balagangadharan 2009. Mechanism: the Hamilton-Jacobi partial differential equation `H(q, ∂S/∂q, t) + ∂S/∂t = 0`, canonical transformations as the change-of-coordinates apparatus on phase space, the integration theory of mechanics that subsumes both Lagrangian and Hamiltonian forms. Jacobi's lectures are also the source of the modern statement of the principle of least action. No change.

**Joseph Liouville — "Note sur la théorie de la variation des constantes arbitraires", *Journal de mathématiques pures et appliquées* 3, 342–349 (1838).** Originator priority for Liouville's theorem (the volume form on phase space is conserved under Hamiltonian flow), the load-bearing result behind classical statistical mechanics. **Pass-1 missed this entry.** Pass-2 ruling: **promote under c1.** Folder: `classical-mechanics/`. Entry key: `1838-liouville-phase-space-volume`. Cross-link to `statistical-mechanics/` (Gibbs 1902 uses Liouville's theorem as the foundation of the ensemble construction).

**Henri Poincaré — *Les Méthodes nouvelles de la mécanique céleste*, 3 vols., Gauthier-Villars, Paris, 1892, 1893, 1899.** Edition of record: Daniel L. Goroff (ed./tr.), *New Methods of Celestial Mechanics*, AIP Press, History of Modern Physics 13, 1993, 3 vols. (ISBN 1-56396-117-2). Originator-tier for the geometric theory of dynamical systems: integral invariants, Poincaré recurrence, the homoclinic tangle, the proof of non-integrability of the three-body problem in general. The substrate of every modern non-linear-dynamics result. **Pass-1 missed this entry.** Pass-2 ruling: **promote under c1.** Folder: `classical-mechanics/`. Entry key: `1892-poincare-methodes-nouvelles`. Boundary call: this is also the origin of qualitative theory of differential equations, which `01-mathematics/` may want to cross-link from. Default placement physics on originator-framing (Poincaré's stated motivation is celestial mechanics).

**Emmy Noether — "Invariante Variationsprobleme", *Nachr. Ges. Wiss. Göttingen* 1918, 235–257.** Pass-1 placed in physics, cross-link from math. Pass-2 adjudicated definitively in §2 below. No change.

### 1.2 `electromagnetism/`

**Michael Faraday — *Experimental Researches in Electricity*, 3 vols., 1839, 1844, 1855.** Pass-1 ratified, Dover reprint 1965. Mechanism: the field concept introduced as a physical entity (lines of force are real, not mathematical bookkeeping); electromagnetic induction; the Faraday effect (magneto-optical rotation, the first experimental link between optics and electromagnetism). No change.

**James Clerk Maxwell — *A Treatise on Electricity and Magnetism*, 2 vols., Clarendon Press, Oxford, 1873.** Pass-1 named the 3rd edition (Thomson, 1891) as edition of record. Pass-2 verifies: the editions are 1st 1873 (Maxwell's lifetime), 2nd 1881 (W. D. Niven, posthumous, with Maxwell's last revisions through Chapter IX of Volume II), 3rd 1891 (J. J. Thomson, with Thomson's editorial additions clearly demarcated). The 2nd edition contains Maxwell's last word on the originator content; the 3rd edition is the most complete and the standard cited edition because Thomson's annotations are the connective tissue between Maxwell's quaternion treatment and the Heaviside vector form that succeeded it. **Pass-2 ruling: edition of record is the 3rd edition (1891), Dover reprint 1954.** This matches pass-1; the verification is recorded for pass-3 binding.

**Oliver Heaviside — *Electromagnetic Theory*, 3 vols., 1893, 1899, 1912.** Pass-1 ratified. Mechanism: the modern four-equation vector form of Maxwell's equations (Maxwell wrote 20 equations in quaternion form; Heaviside compressed them to four in vector form, the form every textbook now teaches). The operational calculus (which became the Laplace transform method in the 20th century) is also originator-tier here. Pass-2 adds: the Heaviside vector form first appears in *Phil. Mag.* (5th ser.) 35, 360–366 (1893), "On the Forces, Stresses, and Fluxes of Energy in the Electromagnetic Field"; the *Electromagnetic Theory* 3-volume monograph systematizes it. Under the chemistry pass-3 rule for originator monograph vs originator paper, the *Phil. Mag.* paper is the originator paper, the monograph the c1 systematization with load-bearing additions (the operational calculus is in the monograph, not the paper). Pass-2 ruling: **promote both — the 1893 *Phil. Mag.* paper as the originator priority for the vector form, the 3-volume monograph as the originator monograph under c1 (load-bearing addition: the operational calculus).** Pass-1 promoted only the monograph. Pass-2 adds the priority paper.

**Hendrik Antoon Lorentz — *Theory of Electrons*, 1909.** Pass-1 ratified, Teubner 2nd ed. 1916, Dover 1952 reprint. Mechanism: the Lorentz force law `F = q(E + v × B)` in its modern form, the electron theory of matter (Lorentz electrons as the source of all material electromagnetic phenomena), the local-time transformation that became the Lorentz transformation. The 1892 *Archives néerlandaises* paper is the originator-priority companion. Pass-2 ruling: keep both as pass-1 had them.

### 1.3 `thermodynamics/`

**Sadi Carnot — *Réflexions sur la puissance motrice du feu*, 1824.** Pass-1 ratified, Dover 1960. Mechanism: the Carnot cycle, the proof that no heat engine operating between two reservoirs can exceed the efficiency `η = 1 − T_cold / T_hot`. Originator priority for the second law. No change.

**Rudolf Clausius — 1850 + 1865 *Annalen* papers.** Pass-1 ratified. Mechanism: 1850 paper states the first and second laws in modern form (`dU = δQ − δW`; heat flows spontaneously from hot to cold); 1865 paper introduces the entropy function as a state function with `dS ≥ δQ/T` for any process. The word "entropy" is coined in the 1865 paper, p. 390. No change.

**Hermann von Helmholtz — *Über die Erhaltung der Kraft*, G. Reimer, Berlin, 1847.** Pass-1 ratified. Mechanism: conservation of energy stated as a unifying principle across mechanical, thermal, electrical, magnetic, and chemical phenomena. **Pass-2 cross-link addition:** This text is also originator-tier for the energy-conservation framing in physiology and biophysics — Helmholtz was a physiologist by training and his 1847 essay is in part a response to the question of whether vital force violates energy conservation. Cross-link to `05-biophysics/` when that branch opens. The chemistry side already takes Helmholtz 1882 (free energy) as canon; the 1847 essay is the upstream physics statement.

**Max Planck — *Ann. Phys.* 309(3), 553–563 (1901).** Pass-1 ratified with a placement note ("debatable placement, see §4"). Pass-2 settles: **the entry stays in `thermodynamics/` with a cross-link to `quantum-mechanics/`.** Reasoning: Planck's 1901 paper is a thermodynamic derivation of the black-body spectrum from Boltzmann statistics applied to oscillators, with the quantum hypothesis introduced as a *constraint* needed to make the Boltzmann counting yield a finite answer. The QM character of `h` is recognized only retrospectively (Einstein 1905 photoelectric paper is the first paper to take `h` seriously as a quantum). Originator-framing rule: Planck's framing is thermodynamic; place there. Pass-1 was right to flag, pass-2 settles the call.

### 1.4 `statistical-mechanics/`

**Ludwig Boltzmann — 1872 H-theorem + 1877 entropy paper.** Pass-1 ratified. Pass-2 adds: **Ludwig Boltzmann — *Vorlesungen über Gastheorie*, 2 vols., J. A. Barth, Leipzig, 1896 + 1898.** English edition of record: Stephen G. Brush (tr.), *Lectures on Gas Theory*, University of California Press, Berkeley, 1964; Dover reprint 1995 (ISBN 0-486-68455-5). Mechanism: the originator monograph systematization of kinetic theory and statistical mechanics, with the H-theorem, the Maxwell-Boltzmann distribution derived from molecular collisions, the equation of state derivation, and the response to Loschmidt's reversibility paradox and Zermelo's recurrence paradox. Under the chemistry pass-3 rule, the *Vorlesungen* contains a load-bearing element no single Boltzmann paper contains: the unified response to the reversibility and recurrence objections, which is the philosophical foundation of statistical mechanics as a discipline. Pass-2 ruling: **promote *Vorlesungen über Gastheorie* under c1 as originator monograph.** Folder: `statistical-mechanics/`. Entry key: `1896-1898-boltzmann-vorlesungen-gastheorie`. **Pass-1 missed this.**

**Josiah Willard Gibbs — *Elementary Principles in Statistical Mechanics*, 1902.** Pass-1 ratified, Dover 1960. No change.

**Albert Einstein — Brownian motion, *Ann. Phys.* 322(8), 549–560 (1905).** Pass-1 placed in `statistical-mechanics/` with alternate placement in the relativity Annus Mirabilis bundle. Pass-2 settles: **primary entry in `statistical-mechanics/`, listed-also in the Annus Mirabilis bundle in `relativity/special/`.** Originator-framing wins; the Brownian-motion paper is statistical mechanics, not relativity.

**Lars Onsager — 1931 reciprocal relations papers.** Pass-1 ratified. Pass-2 adds: **Lars Onsager — "Crystal Statistics. I. A Two-Dimensional Model with an Order-Disorder Transition", *Physical Review* 65(3-4), 117–149 (1944).** Mechanism: the exact analytic solution of the 2D Ising model in zero field, the first non-trivial exactly-solved statistical-mechanics model with a phase transition. Foundation for the modern theory of critical phenomena (Wilson RG sits downstream). Under c1 directly. Pass-2 ruling: **promote.** Folder: `statistical-mechanics/`. Entry key: `1944-onsager-2d-ising`. **Pass-1 missed this.**

**Tsung-Dao Lee and Chen-Ning Yang — "Statistical Theory of Equations of State and Phase Transitions. I. Theory of Condensation" + "II. Lattice Gas and Ising Model", *Physical Review* 87(3), 404–409 + 410–419 (1952).** The Lee-Yang circle theorem; the rigorous theory of phase transitions in terms of zeros of the partition function. Foundation-tier. **Pass-1 missed this.** Pass-2 ruling: **promote under c1.** Folder: `statistical-mechanics/`. Entry key: `1952-yang-lee-phase-transitions`.

**Ryogo Kubo — "Statistical-Mechanical Theory of Irreversible Processes. I. General Theory and Simple Applications to Magnetic and Conduction Problems", *Journal of the Physical Society of Japan* 12(6), 570–586 (1957).** The fluctuation-dissipation theorem in its modern Kubo formulation, the Kubo formula for linear response. Foundation-tier in non-equilibrium statistical mechanics. Pass-2 ruling: **promote under c1.** Folder: `statistical-mechanics/`. Entry key: `1957-kubo-fluctuation-dissipation`. **Pass-1 missed this.** Cross-link to `condensed-matter/`.

### 1.5 `relativity/special/`

**Albert Einstein — 1905 *Annalen* trio (photoelectric, Brownian, special relativity, E=mc²).** Pass-1 ratified. Pass-2: bundle stays as four entries with internal cross-links; the Brownian-motion paper's primary placement is `statistical-mechanics/` per §1.4 above; the photoelectric paper's primary placement is `quantum-mechanics/` (Einstein's introduction of the light quantum), with cross-link from `thermodynamics/` (Stark-Einstein photoequivalence law per chemistry pass-3 §4.4). The two strictly-special-relativity papers (322(10) and 323(13)) are the canonical entries here.

**Hermann Minkowski — "Raum und Zeit", 1909.** Pass-1 ratified. Mechanism: the four-dimensional spacetime formulation of special relativity, the metric `ds² = c²dt² − dx² − dy² − dz²`, the recognition that the Lorentz transformation is a rotation in spacetime. The lecture is brief; the full development is in Minkowski's earlier 1908 Göttingen paper "Die Grundgleichungen für die elektromagnetischen Vorgänge in bewegten Körpern", *Nachr. Ges. Wiss. Göttingen, Math.-Phys. Kl.*, 1908, 53–111. Pass-2 ruling: promote both. The 1908 paper is the technical originator; the 1909 lecture is the conceptual originator and the standard citation. Entry keys: `1908-minkowski-grundgleichungen` and `1909-minkowski-raum-und-zeit`.

### 1.6 `relativity/general/`

**Einstein — 1915 + 1916 papers.** Pass-1 ratified. The November 1915 paper "Die Feldgleichungen der Gravitation" is the originator-priority statement; the 1916 *Annalen der Physik* review is the synthesized exposition. Both are c1 by the originator. No change.

**Hilbert — "Die Grundlagen der Physik (Erste Mitteilung)", 1915.** Pass-1 ratified with the priority note (Einstein wins for the physical theory; Hilbert wins for the variational route). The Einstein-Hilbert action `S = ∫ R √(−g) d⁴x` is the canonical statement of the variational principle for GR and is named after both. No change.

**Karl Schwarzschild — 1916.** Pass-1 ratified. The first exact non-trivial solution of Einstein's field equations; the Schwarzschild radius `r_s = 2GM/c²` as the locus of the event horizon. No change.

**Pass-2 additions to `relativity/general/`:**

**Roy P. Kerr — "Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics", *Physical Review Letters* 11(5), 237–238 (1963).** The Kerr metric — the rotating-black-hole solution. Foundation-tier; every astrophysical black hole is described by Kerr (or Kerr-Newman). Pass-2 ruling: **promote under c1.** Entry key: `1963-kerr-rotating-black-hole`.

**Roger Penrose — "Gravitational Collapse and Space-Time Singularities", *Physical Review Letters* 14(3), 57–59 (1965).** The first singularity theorem: gravitational collapse to a closed trapped surface implies a spacetime singularity, independent of symmetry assumptions. Originator priority for the modern theory of singularities and the global-geometric methods in GR. Pass-2 ruling: **promote under c1.** Entry key: `1965-penrose-singularity-theorem`. Cross-link to subsequent Hawking-Penrose 1970 work.

**Jacob D. Bekenstein — "Black Holes and Entropy", *Physical Review D* 7(8), 2333–2346 (1973).** Originator priority for black-hole entropy proportional to horizon area. Pass-2 ruling: **promote under c1.** Entry key: `1973-bekenstein-black-hole-entropy`.

**Stephen W. Hawking — "Particle Creation by Black Holes", *Communications in Mathematical Physics* 43(3), 199–220 (1975).** Originator priority for Hawking radiation; black holes radiate thermally at temperature `T = ℏc³ / (8π G M k_B)`. Pass-2 ruling: **promote under c1.** Entry key: `1975-hawking-particle-creation`. The Bekenstein-Hawking pair is foundation for black-hole thermodynamics and the holographic principle that follows. **The omission of black-hole thermodynamics from pass-1 is the single most significant omission in the pass-1 sweep — see §6.**

### 1.7 `quantum-mechanics/`

**Heisenberg 1925; Born-Heisenberg-Jordan 1925-26; Schrödinger 1926; Born 1926; Dirac 1928; Pauli 1925; Born-Oppenheimer 1927; Dirac monograph 1958; von Neumann 1932.** Pass-1 ratified all nine. Pass-2 verifies the Schrödinger four-paper sequence in `Annalen der Physik` 384 + 385 + 386 (1926) — the four installments are:

- "Quantisierung als Eigenwertproblem (Erste Mitteilung)", *Ann. Phys.* (4) 79 = vol. 384, no. 4, 361–376 (received 27 January 1926)
- "Quantisierung als Eigenwertproblem (Zweite Mitteilung)", *Ann. Phys.* (4) 79 = vol. 384, no. 6, 489–527 (received 23 February 1926)
- "Quantisierung als Eigenwertproblem (Dritte Mitteilung): Störungstheorie, mit Anwendung auf den Starkeffekt der Balmerlinien", *Ann. Phys.* (4) 80 = vol. 385, no. 13, 437–490 (received 10 May 1926)
- "Quantisierung als Eigenwertproblem (Vierte Mitteilung)", *Ann. Phys.* (4) 81 = vol. 386, no. 18, 109–139 (received 21 June 1926)

The four-paper sequence is canonically cited as a unit. Edition of record: facsimile in *Annalen der Physik*; English translation in J. F. Shearer (tr.), *Collected Papers on Wave Mechanics*, Blackie & Son, London, 1928 (reprinted with additions Chelsea, New York, 1982, ISBN 0-8284-0269-8).

**Pass-2 additions to `quantum-mechanics/`:**

**Werner Heisenberg — "Über den anschaulichen Inhalt der quantentheoretischen Kinematik und Mechanik", *Zeitschrift für Physik* 43(3-4), 172–198 (1927).** The uncertainty principle. Originator-priority paper; the inequality `Δx Δp ≳ ℏ` is stated here for the first time, with Heisenberg's microscope thought-experiment. Pass-2 ruling: **promote under c1.** Entry key: `1927-heisenberg-uncertainty`. **Pass-1 missed this entry, which is itself startling — the uncertainty principle is among the five most-cited results in 20th-century physics.**

**Niels Bohr — "The Quantum Postulate and the Recent Development of Atomic Theory", *Nature* 121(3050) Supplement, 580–590 (14 April 1928), expanded from the Como lecture of 16 September 1927.** The Como lecture; originator statement of complementarity. Pass-2 ruling: **borderline c1.** Argument for: the foundational interpretive framework that defines the Copenhagen position. Argument against: not a derivation, a philosophical-foundational lecture. Pass-2 lean: **promote under c1 with a "foundations" tag** — it occupies the same role for QM that Bohr's earlier 1913 trilogy did for atomic structure (which we should also consider — see below). Entry key: `1928-bohr-como-complementarity`. Pass-3 ratifies.

**Niels Bohr — "On the Constitution of Atoms and Molecules", *Philosophical Magazine* (6) 26, 1–25, 476–502, 857–875 (1913).** The Bohr model of the atom. Originator priority for quantization of angular momentum, the Bohr radius, the Rydberg formula derivation. Pass-2 ruling: **promote under c1.** Entry key: `1913-bohr-trilogy`. **Pass-1 missed this entry.** A canon without the Bohr trilogy is missing the bridge between Planck 1901 and Heisenberg/Schrödinger 1925-26.

**Louis de Broglie — "Recherches sur la théorie des quanta", thesis, Paris, 1924; published *Annales de Physique* (10) 3, 22–128 (1925).** The de Broglie wavelength `λ = h/p` and the matter-wave hypothesis. Originator priority. Pass-2 ruling: **promote under c1.** Entry key: `1924-de-broglie-thesis`. **Pass-1 missed this entry.** Also a candidate for promotion as an "experimental" companion: Davisson-Germer 1927 (electron diffraction confirms de Broglie), pass-1 contestable §4.5 — pass-2 ruling on Davisson-Germer in §4 below.

### 1.8 `quantum-field-theory/`

**Tomonaga-Schwinger-Feynman-Dyson set.** Pass-1 ratified. Pass-2 verifies the four citations and adds two priors:

**Paul A. M. Dirac — "The Quantum Theory of the Emission and Absorption of Radiation", *Proceedings of the Royal Society A* 114(767), 243–265 (1927).** Originator priority for the quantization of the radiation field; the first paper of QFT proper. Pass-2 ruling: **promote under c1.** Entry key: `1927-dirac-radiation-field`. **Pass-1 missed this entry.** Without it, the QED renormalization papers of 1946-49 have no upstream anchor.

**Wolfgang Pauli and Victor F. Weisskopf — "Über die Quantisierung der skalaren relativistischen Wellengleichung", *Helvetica Physica Acta* 7, 709–731 (1934).** Quantization of the Klein-Gordon field; the proof that scalar fields can be consistently quantized as bosons (Pauli's "anti-Dirac paper", written in part to demonstrate that the negative-probability problem of the Klein-Gordon equation dissolves in second quantization). Pass-2 ruling: **promote under c1.** Entry key: `1934-pauli-weisskopf-klein-gordon-quantization`.

**Hans A. Bethe — "The Electromagnetic Shift of Energy Levels", *Physical Review* 72(4), 339–341 (1947).** The first calculation of the Lamb shift; Bethe's non-relativistic renormalization estimate that agreed with Lamb-Retherford 1947 measurement. The single paper that opened the path to modern renormalization. Pass-2 ruling: **promote under c1.** Entry key: `1947-bethe-lamb-shift`.

**Richard P. Feynman — "Space-Time Approach to Non-Relativistic Quantum Mechanics", *Reviews of Modern Physics* 20(2), 367–387 (1948).** The path-integral formulation. Pass-1 mentioned this in the Feynman-Lectures contestable §4.3 ("Feynman 1948 RMP path-integral paper promoted separately") but did not list it in §1. Pass-2 explicitly ratifies that promotion. Entry key: `1948-feynman-path-integral`. Folder: `quantum-field-theory/` (it is non-relativistic in derivation but is the substrate of all modern path-integral QFT).

**Yang-Mills 1954.** Pass-1 ratified. No change.

**Higgs 1964 + Englert-Brout 1964.** Pass-1 ratified. Pass-2 adds the third 1964 paper — **G. S. Guralnik, C. R. Hagen, T. W. B. Kibble — "Global Conservation Laws and Massless Particles", *Physical Review Letters* 13(20), 585–587 (1964).** The full triplet (Englert-Brout, Higgs, Guralnik-Hagen-Kibble) is the originator set; the 2010 J. J. Sakurai Prize was awarded jointly to all six authors. Pass-2 ruling: **promote the Guralnik-Hagen-Kibble paper alongside the other two as a single canon entry "1964 Higgs mechanism papers".** Entry key: `1964-higgs-mechanism-trilogy`.

**Pass-2 additions to `quantum-field-theory/`:**

**Gerard 't Hooft — "Renormalization of Massless Yang-Mills Fields", *Nuclear Physics B* 33(1), 173–199 (1971); "Renormalizable Lagrangians for Massive Yang-Mills Fields", *Nuclear Physics B* 35(1), 167–188 (1971).** The proof that non-abelian gauge theories with spontaneously broken symmetry are renormalizable; the keystone that made the Glashow-Weinberg-Salam model a falsifiable theory rather than a sketch. Pass-2 ruling: **promote both papers under c1 as a paired entry.** Entry key: `1971-t-hooft-renormalization-non-abelian`. **Pass-1 missed this.** Without 't Hooft 1971, the electroweak unification papers in `particle-physics/` lack their renormalization warranty.

### 1.9 `particle-physics/`

**Glashow 1961 + Weinberg 1967 + Salam 1968.** Pass-1 ratified. No change.

**Gross-Wilczek 1973 + Politzer 1973.** Pass-1 ratified. No change.

**Pass-2 additions:**

**Nicola Cabibbo — "Unitary Symmetry and Leptonic Decays", *Physical Review Letters* 10(12), 531–533 (1963).** The Cabibbo angle; the first quark-mixing parameter. Pass-2 ruling: **promote under c1.** Entry key: `1963-cabibbo-mixing-angle`.

**Makoto Kobayashi and Toshihide Maskawa — "CP-Violation in the Renormalizable Theory of Weak Interaction", *Progress of Theoretical Physics* 49(2), 652–657 (1973).** The CKM matrix; the prediction that three quark generations are required for CP violation in the Standard Model. Pass-2 ruling: **promote under c1.** Entry key: `1973-kobayashi-maskawa-ckm`. The Cabibbo-Kobayashi-Maskawa pair is foundation for all flavor physics.

**Particle Data Group — *Review of Particle Physics*, biennial.** Pass-1 placed in `reference/`. Pass-2 ratifies under chemistry pass-3 §3.4 c3 rule: PDG is published, maintained, and formally adopted by the international high-energy physics community as the authoritative compilation; it satisfies "normative means standards-body adoption" cleanly. No change.

### 1.10 `condensed-matter/`

**Bardeen-Cooper-Schrieffer 1957; Anderson 1958; Wilson 1971/1975.** Pass-1 ratified. Pass-2 adds:

**Felix Bloch — "Über die Quantenmechanik der Elektronen in Kristallgittern", *Zeitschrift für Physik* 52(7-8), 555–600 (1928).** Bloch's theorem and the band-theory foundation of solid-state physics. Pass-2 ruling: **promote under c1.** Entry key: `1928-bloch-band-theory`. **Pass-1 missed this.**

**Lev D. Landau — "Theory of Phase Transitions. Part I", *Physikalische Zeitschrift der Sowjetunion* 11, 26–47 (1937).** Landau's order-parameter theory of phase transitions. Foundation for Ginzburg-Landau (next entry) and for the modern theory of broken-symmetry phases. Pass-2 ruling: **promote under c1.** Entry key: `1937-landau-phase-transitions`.

**Lev D. Landau — "On the Theory of the Dispersion of Magnetic Permeability in Ferromagnetic Bodies" + Landau damping in *Journal of Physics (USSR)* 10, 25–34 (1946) "On the Vibrations of the Electronic Plasma".** Pass-1 named "Landau damping 1946" as a carve-out from Landau-Lifshitz. Pass-2 verifies the citation: J. Phys. (USSR) 10, 25 (1946). Pass-2 ruling: **promote under c1.** Entry key: `1946-landau-plasma-damping`.

**Vitaly L. Ginzburg and Lev D. Landau — "On the Theory of Superconductivity", *Zhurnal Eksperimental'noi i Teoreticheskoi Fiziki* 20, 1064 (1950).** The Ginzburg-Landau theory of superconductivity (phenomenological, predating BCS but containing the order parameter and the coherence length). Pass-2 ruling: **promote under c1.** Entry key: `1950-ginzburg-landau-superconductivity`.

**Lev D. Landau — "The Theory of a Fermi Liquid", *ZhETF* 30, 1058–1064 (1956); English in *Soviet Physics JETP* 3, 920–925 (1957).** Landau Fermi-liquid theory. Pass-2 ruling: **promote under c1.** Entry key: `1957-landau-fermi-liquid`. The four Landau primary-paper carve-outs (1937 phase transitions, 1946 plasma damping, 1950 Ginzburg-Landau, 1957 Fermi-liquid) are the named-author primaries that justify keeping the *Course* in landscape per pass-1 §4.1, ratified in §4 below.

**Robert B. Laughlin — "Anomalous Quantum Hall Effect: An Incompressible Quantum Fluid with Fractionally Charged Excitations", *Physical Review Letters* 50(18), 1395–1398 (1983).** The Laughlin wavefunction; foundation for the fractional quantum Hall effect. Pass-2 ruling: **promote under c1.** Entry key: `1983-laughlin-fqhe`. **Pass-1 missed this.**

**Klaus von Klitzing, G. Dorda, M. Pepper — "New Method for High-Accuracy Determination of the Fine-Structure Constant Based on Quantized Hall Resistance", *Physical Review Letters* 45(6), 494–497 (1980).** The integer quantum Hall effect; the experimental discovery underlying both Laughlin 1983 and the modern resistance standard. Pass-2 ruling: **promote under c1 (also fits c4 — experimental foundation paper).** Entry key: `1980-von-klitzing-iqhe`.

**John M. Kosterlitz and David J. Thouless — "Ordering, metastability and phase transitions in two-dimensional systems", *Journal of Physics C* 6, 1181–1203 (1973).** The Kosterlitz-Thouless topological phase transition. Foundation for the modern theory of topological phases of matter. Pass-2 ruling: **promote under c1.** Entry key: `1973-kosterlitz-thouless`. **Pass-1 missed this.**

**Michael V. Berry — "Quantal Phase Factors Accompanying Adiabatic Changes", *Proceedings of the Royal Society A* 392(1802), 45–57 (1984).** The Berry phase; the geometric phase that accompanies adiabatic transport in parameter space. Foundation for topological band theory and modern condensed-matter geometry. Pass-2 ruling: **promote under c1.** Entry key: `1984-berry-geometric-phase`. Cross-link to `quantum-mechanics/`.

### 1.11 `quantum-mechanics/foundations/` — new sub-fold

The sub-folder `quantum-mechanics/foundations/` is opened to hold (a) the Bohr Como lecture, (b) Bell's theorem and successors, (c) the EPR paper. Pass-2 ruling: **open the sub-folder.**

**Albert Einstein, Boris Podolsky, Nathan Rosen — "Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?", *Physical Review* 47(10), 777–780 (1935).** The EPR paper. Originator priority for the entanglement question and the framing of QM completeness. Pass-2 ruling: **promote under c1.** Entry key: `1935-epr`.

**John S. Bell — "On the Einstein Podolsky Rosen Paradox", *Physics* (Long Island City, N.Y.) 1(3), 195–200 (1964).** Bell's theorem. Originator priority for the experimentally testable distinction between local hidden-variable theories and quantum mechanics. The placement question is adjudicated in §5 below; pass-2 places Bell in `02-physics/quantum-mechanics/foundations/` with a cross-link to `04-information/quantum-information/`. Entry key: `1964-bell-theorem`.

**Alain Aspect, Jean Dalibard, Gérard Roger — "Experimental Test of Bell's Inequalities Using Time-Varying Analyzers", *Physical Review Letters* 49(25), 1804–1807 (1982).** The first loophole-closing Bell test. Pass-2 ruling: **promote under c4.** Entry key: `1982-aspect-bell-test`.

### 1.12 `experimental/` — answer to pass-1 §4.5

Pass-1 contemplated a separate `experimental/` sub-fold and leaned "mix in." Pass-2 settles: **mix in.** Reasoning: chemistry pass-3 placed Bragg & Bragg 1913 in `crystallography/` rather than spinning a separate experimental fold; the precedent should hold. Specific placements:

- Michelson-Morley 1887 → `relativity/special/` (the null result that motivated the special-relativity papers; cross-link to `electromagnetism/` because pre-1905 framing was about the aether and EM).
- Davisson-Germer 1927 → `quantum-mechanics/` (next to the de Broglie 1924 thesis it confirmed).
- Wu et al. 1957 → `particle-physics/` (the parity-violation experiment that set the stage for the V-A theory of weak interactions).
- Lamb-Retherford 1947 → `quantum-field-theory/` (next to Bethe 1947 which calculated it).
- COBE Mather et al. 1990; WMAP Bennett et al. 2003; Planck collaboration 2018 → all `06-cosmology/observational/` when that branch opens. Not physics canon.

Pass-2 ruling: **no separate `experimental/` sub-fold.** Each experimental foundation paper sits next to the theoretical paper it tests.

---

## 2. Adjudication: Noether 1918

Pass-1 placed Noether 1918 in `02-physics/classical-mechanics/` with cross-link from `01-mathematics/calculus-of-variations/`. The mathematics pass-1 inventory does not list Noether 1918 separately (mathematics §1.4 lists Noether's 1921 *Idealtheorie* paper as the algebra entry, which is correct and distinct). The mathematics-side claim on Noether 1918 is implicit, not explicit — it would arrive in math pass-2 as a contestable.

The physics-side argument was given in pass-1 §5: Noether wrote the paper at Hilbert's and Klein's request specifically to clarify energy conservation in general relativity; the originator framing is unambiguously physics; every downstream physics use rests on it. The mathematics-side argument is also given in pass-1 §5: the paper is a result in the calculus of variations and Lie theory, and would be canon in mathematics even if no physicist had ever read it.

Pass-2 ruling: **stay in physics, cross-link from math.** The deciding clause is the README §"Boundary with 01-mathematics" literal text:

> "The boundary case is the originator paper that states a *new* mathematical structure in service of a physical theory: Noether 1918 and Dirac 1928 invent mathematical structure that survives outside physics, and they are canon here (originator-framing wins) with a cross-link from math."

The physics README's promotion rule is the binding text. Noether 1918 is named explicitly in the README as physics with a math cross-link. The pass-2 ruling is to ratify the README, not to revisit it. If math pass-2 contests, the resolution is a maintainer-level call referencing the README; pass-2 of physics holds.

Operational consequence: the canonical entry stub `02-physics/classical-mechanics/1918-noether-invariante-variationsprobleme.md` is the load-bearing artifact; `01-mathematics/calculus-of-variations/_cross-links/1918-noether-physics.md` is a one-line pointer file.

---

## 3. Adjudication: von Neumann 1932

Pass-1 placed *Mathematische Grundlagen der Quantenmechanik* in `02-physics/quantum-mechanics/` with cross-link from `01-mathematics/operator-theory/`. The mathematics pass-1 inventory §1.10 lists von Neumann 1932 with the explicit annotation "Default placement: `02-physics/quantum-mechanics/`. Cross-ref into `functional-analysis/`. Pass-2 may overturn the default placement." Mathematics pass-1 §4.5 names this as one of the contestable items: "Von Neumann 1932 default placement — is mathematics correct, not physics?"

The physics-side argument: the title and stated motivation are physical (the book is about the foundations of quantum mechanics, not about Hilbert spaces in general); the chapters are organized around physical content (the projection postulate, the measurement problem, the impossibility proof against hidden variables); the originator framing is unambiguously physics; the book is the canonical citation for the Hilbert-space axiomatization of QM.

The mathematics-side argument: the operator-theoretic apparatus that the book builds (the spectral theorem for unbounded self-adjoint operators in particular) is reused outside physics and is the canonical reference for that apparatus; Reed-Simon (mathematics pass-1 §3 placed Reed-Simon firmly on the math side) builds on the von Neumann substrate; the spectral theorem chapter is canonical for functional analysis in a way that does not depend on its physical context.

Pass-2 ruling: **stay in physics, cross-link from math.** The deciding considerations:

1. Originator-framing rule (README): von Neumann's stated motivation and the book's title are physical. The framing wins under the existing rule.
2. The chemistry pass-3 §3.1 monograph rule: an originator monograph promotes under c1 only when the monograph contains a load-bearing element that the originator paper does not contain. Von Neumann published several quantum-mechanics papers in the late 1920s (notably *Math. Annalen* 102, 49 (1929), "Allgemeine Eigenwerttheorie Hermitescher Funktionaloperatoren"). The 1932 monograph contains the projection postulate, the no-hidden-variables proof (later overturned by Bell), and the measurement scheme — load-bearing physics content not in any single paper. The monograph promotes under c1 *as a physics monograph*. Reading the rule from the math side: the spectral theorem is in *Math. Annalen* 102, 49 (1929), which mathematicians can cite directly. The math-side monograph entry would not pass the chemistry pass-3 §3.1 rule because the load-bearing math content is in the 1929 paper.
3. Practical: physics readers cite *Mathematische Grundlagen* by name; mathematicians cite specific theorems by chapter and verse. The canonical citation pattern matches physics-side primary placement.

Operational consequence: `02-physics/quantum-mechanics/1932-von-neumann-mathematische-grundlagen.md` is the load-bearing artifact; `01-mathematics/operator-theory/_cross-links/1932-von-neumann-physics.md` is a one-line pointer; the von Neumann *Math. Annalen* 102 (1929) paper is a separate `01-mathematics/operator-theory/` entry on the math side, not duplicated in physics.

---

## 4. Adjudication: Landau-Lifshitz, MTW, Wald, Jackson, Sakurai, Peskin-Schroeder, Weinberg

Pass-1 §4.1 leaned landscape for Landau-Lifshitz with named primary-paper carve-outs. Pass-2 tests this against the chemistry pass-3 c3 rule (literal text):

> "A monograph by a non-originator does not promote under any condition unless it satisfies c3 (discipline-standard normative reference) — and 'normative' means published, maintained, or formally adopted by a standards body (IUPAC, NIST, IUCr) or by professional consensus equivalent to a standards body. Popularity is not normativity."

Landau-Lifshitz is by an originator (Landau is c1-eligible for at least four named results). The relevant rule is the chemistry pass-3 §3.1 originator-monograph rule: promote under c1 only if the monograph contains a load-bearing element not in any originator paper.

For Landau-Lifshitz:
- *Mechanics* (vol. 1) — synthesizes Lagrangian/Hamiltonian mechanics; no load-bearing originator content. Landscape.
- *Classical Theory of Fields* (vol. 2) — synthesizes special and general relativity; no load-bearing originator content not already in Einstein's papers. Landscape.
- *Quantum Mechanics* (vol. 3) — Landau is not the originator of QM; this volume is a synthesis. Landscape.
- *Statistical Physics* (vol. 5) — contains the Landau theory of phase transitions, but that originator content is in Landau 1937 (already promoted in §1.10 above). The volume itself is synthesis. Landscape.
- Etc.

Pass-2 ruling: **Landau-Lifshitz is landscape across all 10 volumes**, with the four Landau primary-paper carve-outs (1937 phase transitions, 1946 plasma damping, 1950 Ginzburg-Landau, 1957 Fermi-liquid) promoted as separate entries in `condensed-matter/` and `statistical-mechanics/`.

By the same rule:
- **Misner-Thorne-Wheeler 1973** — synthesis, originator content (Wheeler's contributions to ADM, the Wheeler-DeWitt equation, the wormhole geometry) is in primary papers. Landscape. Wheeler-DeWitt 1967 (DeWitt, "Quantum Theory of Gravity. I. The Canonical Theory", *Phys. Rev.* 160, 1113) is a candidate for separate promotion in `relativity/general/quantum-gravity/` if pass-3 opens that sub-fold.
- **Wald 1984** — synthesis, no originator content. Landscape.
- **Jackson, *Classical Electrodynamics*** — pedagogical synthesis, not originator (Jackson is not the originator of any canon-tier EM result). Landscape.
- **Sakurai, *Modern Quantum Mechanics*** — pedagogical synthesis. Landscape.
- **Peskin-Schroeder, *An Introduction to Quantum Field Theory*** — pedagogical synthesis. Landscape.
- **Goldstein, *Classical Mechanics*** — pedagogical synthesis. Landscape.
- **Reif, *Fundamentals of Statistical and Thermal Physics*** — pedagogical synthesis. Landscape.
- **Pathria, *Statistical Mechanics*** — pedagogical synthesis. Landscape.
- **Mandl-Shaw, *Quantum Field Theory*** — pedagogical synthesis. Landscape.
- **Feynman-Leighton-Sands, *Lectures*** — pedagogical synthesis by an originator. The chemistry pass-3 §3.1 rule asks: does the monograph contain a load-bearing element not in originator papers? Vol. III's path-integral exposition is partly originator material, but the load-bearing path-integral content is in Feynman's 1948 *RMP* paper. Landscape, with the 1948 *RMP* paper promoted separately.
- **Weinberg, *The Quantum Theory of Fields*, vols. I-III, 1995-2000** — Weinberg is the originator of significant electroweak content (1967 electroweak paper, already canon). Vol. II (1996) contains the modern systematic treatment of effective field theory and the renormalization-group analysis of EFT. Weinberg's 1979 *Physica A* paper "Phenomenological Lagrangians" is the originator priority for chiral perturbation theory; the 1996 Vol. II treatment is the originator monograph systematization. Pass-2 ruling: **Weinberg vols. I-III stay landscape; the 1979 Weinberg "Phenomenological Lagrangians" paper is a separate candidate for `quantum-field-theory/` promotion (deferred to pass-3).**

CODATA + PDG promotion: pass-2 ratifies both as clean c3 admits. CODATA is the BIPM/CIPM-adopted authoritative source for fundamental physical constants; PDG is the international high-energy-physics community's authoritative compilation. Both satisfy "published, maintained, or formally adopted by a standards body" by literal reading of the chemistry pass-3 c3 text. The BIPM SI brochure is the third c3 admission. No others.

`02-physics/_landscape/textbooks.md` registry (pass-2 freeze):

```
# Physics — Landscape Textbooks Registry
# Discipline-standard textbooks that do NOT promote to canon.
# Per chemistry pass-3 §3.1 + §3.4: pedagogical synthesis ≠ canon.

## Classical mechanics
- Goldstein, Poole, Safko — Classical Mechanics (3rd ed., Addison-Wesley, 2002)
- Landau-Lifshitz vol. 1 — Mechanics (3rd ed., Pergamon, 1976)
- Arnold — Mathematical Methods of Classical Mechanics (2nd ed., Springer GTM 60, 1989)
- Marion-Thornton — Classical Dynamics (5th ed., Brooks/Cole, 2003)

## Electromagnetism
- Jackson — Classical Electrodynamics (3rd ed., Wiley, 1998)
- Griffiths — Introduction to Electrodynamics (4th ed., Cambridge, 2017)
- Landau-Lifshitz vol. 2 — Classical Theory of Fields (4th ed., Pergamon, 1975)

## Thermodynamics & statistical mechanics
- Reif — Fundamentals of Statistical and Thermal Physics (McGraw-Hill, 1965)
- Pathria-Beale — Statistical Mechanics (4th ed., Academic, 2021)
- Huang — Statistical Mechanics (2nd ed., Wiley, 1987)
- Landau-Lifshitz vol. 5 — Statistical Physics Part 1 (3rd ed., Pergamon, 1980)
- Callen — Thermodynamics and an Introduction to Thermostatistics (2nd ed., Wiley, 1985)

## Quantum mechanics
- Sakurai-Napolitano — Modern Quantum Mechanics (3rd ed., Cambridge, 2020)
- Griffiths-Schroeter — Introduction to Quantum Mechanics (3rd ed., Cambridge, 2018)
- Cohen-Tannoudji, Diu, Laloë — Quantum Mechanics (2nd ed., Wiley-VCH, 2020)
- Landau-Lifshitz vol. 3 — Quantum Mechanics: Non-Relativistic Theory (3rd ed., Pergamon, 1977)
- Messiah — Quantum Mechanics (Dover reprint, 1999)

## Relativity
- Misner-Thorne-Wheeler — Gravitation (W. H. Freeman, 1973; Princeton reprint 2017)
- Wald — General Relativity (Univ. Chicago Press, 1984)
- Carroll — Spacetime and Geometry (Cambridge, 2019)
- Weinberg — Gravitation and Cosmology (Wiley, 1972)
- Hawking-Ellis — The Large Scale Structure of Space-Time (Cambridge, 1973)

## Quantum field theory
- Peskin-Schroeder — An Introduction to Quantum Field Theory (Westview, 1995)
- Weinberg — The Quantum Theory of Fields, vols. I-III (Cambridge, 1995-2000)
- Mandl-Shaw — Quantum Field Theory (2nd ed., Wiley, 2010)
- Srednicki — Quantum Field Theory (Cambridge, 2007)
- Schwartz — Quantum Field Theory and the Standard Model (Cambridge, 2014)

## Condensed matter
- Ashcroft-Mermin — Solid State Physics (Holt, 1976)
- Kittel — Introduction to Solid State Physics (8th ed., Wiley, 2005)
- Anderson — Basic Notions of Condensed Matter Physics (Benjamin/Cummings, 1984)

## Feynman
- Feynman-Leighton-Sands — The Feynman Lectures on Physics, 3 vols. (Addison-Wesley, 1963-1965)
```

This registry is closed under the chemistry pass-3 c3 rule. Additions require a maintainer-level decision and a documented argument that the candidate satisfies one of the four promotion conditions — not that it is "important" or "widely assigned."

---

## 5. Cross-branch coherence audit

### 5.1 Physics ↔ chemistry

Chemistry pass-3 §5.1 fixed the operational rule with a five-row test-case table. Pass-2 of physics audits each row:

| Text | pass-3 chem placement | physics placement | Coherent? |
|---|---|---|---|
| Pauling 1960 *Nature of the Chemical Bond* | chemistry (canon) | not physics | yes — chemical-bonding framework |
| Hohenberg-Kohn 1964 | physics, cross-link from chemistry | `02-physics/quantum-mechanics/` | **must add** — pass-1 omitted |
| Heitler-London 1927 | chemistry (canon) | not physics | yes |
| Bragg & Bragg 1913 | chemistry, cross-link from physics | not physics primary | yes |
| Bloch 1946 / Purcell 1946 (NMR) | physics | **must add to `02-physics/condensed-matter/` or new `experimental/` sub-fold** | gap |

**Pass-2 additions to close coherence:**

**Pierre Hohenberg and Walter Kohn — "Inhomogeneous Electron Gas", *Physical Review* 136(3B), B864–B871 (1964).** The two Hohenberg-Kohn theorems: (i) the ground-state external potential is a unique functional of the ground-state density; (ii) the density that minimizes the energy functional is the exact ground-state density. Pass-2 ruling: **promote under c1 in `02-physics/quantum-mechanics/`, cross-link to `03-chemistry/quantum-chemistry/`.** Entry key: `1964-hohenberg-kohn-dft`.

**Walter Kohn and Lu Jeu Sham — "Self-Consistent Equations Including Exchange and Correlation Effects", *Physical Review* 140(4A), A1133–A1138 (1965).** The Kohn-Sham equations; the practical computational scheme that turned DFT from a theorem into a method. Pass-2 ruling: **promote under c1 in `02-physics/quantum-mechanics/`, cross-link to `03-chemistry/quantum-chemistry/`.** Entry key: `1965-kohn-sham`.

**Felix Bloch — "Nuclear Induction", *Physical Review* 70(7-8), 460–474 (1946); Edward M. Purcell, H. C. Torrey, R. V. Pound — "Resonance Absorption by Nuclear Magnetic Moments in a Solid", *Physical Review* 69(1-2), 37–38 (1946).** The two independent NMR discovery papers. Pass-2 ruling: **promote both under c1 (also c4) in `02-physics/condensed-matter/` as a paired entry.** Entry key: `1946-bloch-purcell-nmr`. Cross-link to `03-chemistry/spectroscopy/` (where Bloch-Purcell are not promoted because chemistry pass-3 §4.5 placed spectroscopic effects on the physics side).

**No physics-pass-1 entries should migrate to chemistry.** Pass-1 §3 already kept Schrödinger 1926, Dirac 1928, Pauli 1925, Born-Oppenheimer 1927 on the physics side — chemistry pass-3 §5.1 ratifies. Pass-2 audit: clean.

### 5.2 Physics ↔ information

The Shannon-Gibbs entropy boundary is bound by chemistry pass-3 §5.4 and information pass-1 §3.1. Both bind the Gibbs entropy to physics, the Shannon entropy to information, with no silent identification. Pass-2 of physics ratifies and adds the stub-writing rule:

**Stub-writing rule (physics canon).** Every `02-physics/statistical-mechanics/` entry that mentions "entropy" specifies Gibbs/Boltzmann/thermodynamic entropy explicitly with units (J/K). The physics canon does not silently identify Gibbs entropy with Shannon entropy. Jaynes 1957 is canon in `04-information/`, not physics; the physics side cross-links from `statistical-mechanics/`.

Bell 1964 placement: information pass-1 §1.10 names "BB84, Shor, Deutsch, Feynman, Holevo if promoted" as `04-information/quantum-information/` and adds: "The physics of the substrate (decoherence, the measurement problem, canonical quantization) lives in `02-physics/quantum-mechanics/`." Bell 1964 is a measurement-problem result — it tests whether QM can be replaced by a local hidden-variable theory. Originator-framing: Bell wrote it as a physics paper (the journal *Physics* is now defunct but was a physics journal in 1964). Pass-2 ruling: **Bell 1964 lives in `02-physics/quantum-mechanics/foundations/`, cross-linked from `04-information/quantum-information/`.** The Aspect 1982 experimental test (§1.11 above) lives next to Bell. The Clauser-Horne-Shimony-Holt 1969 inequality (Clauser, Horne, Shimony, Holt, *Phys. Rev. Lett.* 23, 880) is also a candidate for promotion in the same sub-fold; pass-3 should add.

The downstream quantum-information results (BB84, Shor, Deutsch, Feynman 1982 simulation paper) stay in `04-information/quantum-information/` per information pass-1.

### 5.3 Physics ↔ cosmology

`06-cosmology/` does not yet exist as a branch. Pass-2 records the boundaries that will bind when it opens:

- **Friedmann 1922** "Über die Krümmung des Raumes", *Z. Phys.* 10, 377–386 → cosmology (specific cosmological model derived from GR). Cross-link from `02-physics/relativity/general/`.
- **Lemaître 1927** "Un Univers homogène de masse constante…", *Annales de la Société Scientifique de Bruxelles* A47, 49–59 → cosmology.
- **Hubble 1929** "A Relation Between Distance and Radial Velocity Among Extra-Galactic Nebulae", *PNAS* 15, 168–173 → cosmology.
- **Alpher, Bethe, Gamow 1948** "The Origin of Chemical Elements", *Phys. Rev.* 73, 803 → cosmology (BBN).
- **Penzias-Wilson 1965** "A Measurement of Excess Antenna Temperature at 4080 Mc/s", *Astrophys. J.* 142, 419 → cosmology (CMB discovery).
- **Guth 1981** "Inflationary universe: A possible solution to the horizon and flatness problems", *Phys. Rev. D* 23, 347 → cosmology (inflation).
- **Perlmutter 1999** *Astrophys. J.* 517, 565 + Riess 1998 *Astron. J.* 116, 1009 → cosmology (dark energy).
- **COBE Mather 1990, WMAP Bennett 2003, Planck collaboration 2018** → cosmology (observational).

The cosmological-constant question is delicate. Einstein 1917 ("Kosmologische Betrachtungen zur allgemeinen Relativitätstheorie", *Sitzungsber. Preuss. Akad.*) introduces Λ; the framing is physical/cosmological and should sit in cosmology when that branch opens, not in physics. Pass-2 ruling: **Einstein 1917 → cosmology, cross-link from `02-physics/relativity/general/`.**

**No physics-pass-1 entries are at risk of migrating to cosmology.** The GR field equations (Einstein 1915, Hilbert 1915) are physics canon under the README boundary rule.

### 5.4 Physics ↔ biophysics

Boundary cases where physics borders biophysics:

- **Photosynthesis quantum coherence** (Engel et al. 2007 *Nature* 446, 782; Collini et al. 2010 *Nature* 463, 644) → biophysics. The physics is well-established; the originator framing is biological.
- **Single-molecule force spectroscopy** (Smith-Finzi-Bustamante 1992 *Science* 258, 1122) → biophysics. The instrumentation is physics; the originator framing is the response of a biomolecule to force.
- **Fluctuation-dissipation in biophysical systems** (Onsager 1931 is the upstream physics primary, already canon §1.4). Biophysical applications cross-link.
- **Helmholtz 1847 *Erhaltung der Kraft*** (already canon in `thermodynamics/` per §1.3) — cross-link to `05-biophysics/` because the essay is in part a physiological argument.

Pass-2 ruling: **no physics-pass-1 entries migrate to biophysics**; cross-links open as biophysics matures.

---

## 6. What pass-1 missed

This section consolidates the pass-2 additions, ranked by load-bearing-ness. The list is closed for pass-2; pass-3 may add but should not subtract without explicit reasoning.

**Tier A — must-add omissions:**

1. **Bekenstein 1973 + Hawking 1975 black-hole thermodynamics.** This is the largest single pass-1 miss. Black-hole thermodynamics is foundation for the holographic principle, AdS/CFT, the information paradox, and the modern conversation between gravity and quantum mechanics. Pass-1 listed neither.
2. **Bohr 1913 trilogy.** A QM canon without Bohr 1913 is structurally incomplete — it is the bridge between Planck 1901 and Heisenberg 1925.
3. **Heisenberg 1927 uncertainty paper.** Among the five most-cited results in 20th-century physics, omitted from pass-1.
4. **Dirac 1927 radiation-field paper.** The first QFT paper; without it the 1946-49 renormalization papers are unanchored.
5. **'t Hooft 1971 renormalization of non-abelian gauge theories.** The keystone that made the electroweak model a falsifiable theory.
6. **Bloch 1928 band theory.** The foundation of all modern condensed-matter physics.
7. **Hohenberg-Kohn 1964 + Kohn-Sham 1965 DFT.** Cross-link target from chemistry pass-3 §5.1; pass-1 left it dangling.

**Tier B — important additions:**

8. **Galileo 1638 *Discorsi*.** Originator of kinematics; Newton presupposes it.
9. **Liouville 1838 phase-space theorem.** Foundation of Hamiltonian flow and statistical mechanics.
10. **Poincaré 1892-99 *Méthodes nouvelles*.** Foundation of dynamical systems theory and the geometric theory of mechanics.
11. **Boltzmann *Vorlesungen über Gastheorie* 1896-98.** Originator monograph for statistical mechanics; passes the pass-3 §3.1 rule.
12. **Onsager 1944 2D Ising solution.** Foundation for critical phenomena.
13. **Yang-Lee 1952 phase transitions.** Rigorous theory of phase transitions in terms of partition-function zeros.
14. **Kubo 1957 fluctuation-dissipation.** Foundation of non-equilibrium statistical mechanics.
15. **Bell 1964 + EPR 1935.** The foundations-of-QM canon.
16. **Cabibbo 1963 + Kobayashi-Maskawa 1973.** Foundation of flavor physics.
17. **Kosterlitz-Thouless 1973.** Foundation of topological phases.
18. **Berry 1984 geometric phase.** Foundation of topological band theory.
19. **Laughlin 1983 + von Klitzing 1980 quantum Hall.** Foundation for the modern resistance standard and topological matter.
20. **Bloch-Purcell 1946 NMR.** Cross-link target from chemistry; pass-1 left it implicit.
21. **Kerr 1963 + Penrose 1965 singularity theorem.** Modern GR canon.
22. **Bethe 1947 Lamb-shift renormalization.** Originator paper for renormalization as a physical scheme.
23. **Pauli-Weisskopf 1934 scalar-field quantization.** Bridges Klein-Gordon equation to QFT.
24. **Guralnik-Hagen-Kibble 1964.** Third Higgs-mechanism paper; canonical with Higgs and Englert-Brout.
25. **Feynman 1948 path-integral *RMP*.** Pass-1 mentioned in §4.3 but did not list in §1; pass-2 ratifies its promotion.
26. **Heaviside 1893 *Phil. Mag.* paper.** Originator priority for the vector form of Maxwell's equations.

**Tier C — borderline or framework-level:**

27. **Anderson 1972 "More Is Different", *Science* 177, 393.** Originator framework on emergence. Borderline c1 — it is a position paper, not a derivation, but it states a foundation-tier claim about the structure of physics that has organized condensed-matter and complexity arguments for fifty years. Pass-2 lean: **promote under c1** with a "foundations" tag in `condensed-matter/foundations/`. Pass-3 ratifies.
28. **Anderson-Higgs 1962-63 lattice papers** (Anderson, "Plasmons, Gauge Invariance, and Mass", *Phys. Rev.* 130, 439; Higgs's earlier 1964 *Phys. Lett.* 12, 132 paper). The pre-history of the Higgs mechanism on the condensed-matter side. Pass-2 lean: **promote Anderson 1963 alongside the 1964 Higgs trilogy.**
29. **Lamb-Retherford 1947** "Fine Structure of the Hydrogen Atom by a Microwave Method", *Phys. Rev.* 72, 241. Experimental foundation for renormalization. Promote under c4 in `quantum-field-theory/`.
30. **Stern-Gerlach 1922** "Der experimentelle Nachweis der Richtungsquantelung im Magnetfeld", *Z. Phys.* 9, 349. Experimental foundation for quantum spin. Promote under c4 in `quantum-mechanics/`.

---

## 7. Final folder tree (frozen for pass-3 ratification)

```
02-physics/
  README.md
  CANON_INDEX.md
  _intake/
    physics-canon-pass-1-2026-05-01.md
    physics-canon-deep-dive-2026-05-01.md          (this file)
  _landscape/
    textbooks.md                                    (per §4 above)

  classical-mechanics/
    1638-galileo-discorsi.md
    1687-newton-principia.md
    1788-lagrange-mecanique-analytique.md
    1834-1835-hamilton-general-method.md
    1838-liouville-phase-space-volume.md
    1866-jacobi-vorlesungen-uber-dynamik.md
    1892-poincare-methodes-nouvelles.md
    1918-noether-invariante-variationsprobleme.md

  electromagnetism/
    1839-1855-faraday-experimental-researches.md
    1873-maxwell-treatise.md
    1893-heaviside-phil-mag-vector-form.md
    1893-1912-heaviside-electromagnetic-theory.md
    1909-lorentz-theory-of-electrons.md

  thermodynamics/
    1824-carnot-reflexions.md
    1847-helmholtz-erhaltung-der-kraft.md
    1850-1865-clausius-thermodynamics-papers.md
    1901-planck-blackbody.md

  statistical-mechanics/
    1872-1877-boltzmann-h-theorem-entropy.md
    1896-1898-boltzmann-vorlesungen-gastheorie.md
    1902-gibbs-elementary-principles.md
    1905-einstein-brownian.md
    1931-onsager-reciprocal-relations.md
    1944-onsager-2d-ising.md
    1952-yang-lee-phase-transitions.md
    1957-kubo-fluctuation-dissipation.md

  relativity/
    special/
      1887-michelson-morley.md
      1905-einstein-special-relativity.md
      1905-einstein-e-mc-squared.md
      1908-minkowski-grundgleichungen.md
      1909-minkowski-raum-und-zeit.md
    general/
      1915-einstein-feldgleichungen.md
      1915-hilbert-grundlagen-der-physik.md
      1916-einstein-grundlage.md
      1916-schwarzschild-massenpunkt.md
      1963-kerr-rotating-black-hole.md
      1965-penrose-singularity-theorem.md
      1973-bekenstein-black-hole-entropy.md
      1975-hawking-particle-creation.md

  quantum-mechanics/
    1913-bohr-trilogy.md
    1922-stern-gerlach.md
    1924-de-broglie-thesis.md
    1925-heisenberg-umdeutung.md
    1925-pauli-exclusion.md
    1926-born-heisenberg-jordan-dreimannerarbeit.md
    1926-schrödinger-quantisierung-eigenwertproblem.md
    1926-born-probability.md
    1927-born-oppenheimer.md
    1927-davisson-germer.md
    1927-heisenberg-uncertainty.md
    1928-dirac-relativistic-electron.md
    1932-von-neumann-mathematische-grundlagen.md
    1958-dirac-principles-of-qm-4ed.md
    1964-hohenberg-kohn-dft.md
    1965-kohn-sham.md
    foundations/
      1928-bohr-como-complementarity.md
      1935-epr.md
      1964-bell-theorem.md
      1982-aspect-bell-test.md

  quantum-field-theory/
    1927-dirac-radiation-field.md
    1934-pauli-weisskopf-klein-gordon-quantization.md
    1946-1949-tomonaga-schwinger-feynman-dyson-qed.md
    1947-bethe-lamb-shift.md
    1947-lamb-retherford-fine-structure.md
    1948-feynman-path-integral.md
    1954-yang-mills.md
    1964-higgs-mechanism-trilogy.md
    1971-t-hooft-renormalization-non-abelian.md

  particle-physics/
    1957-wu-parity-violation.md
    1961-1968-glashow-weinberg-salam-electroweak.md
    1963-cabibbo-mixing-angle.md
    1973-gross-wilczek-politzer-asymptotic-freedom.md
    1973-kobayashi-maskawa-ckm.md

  condensed-matter/
    1928-bloch-band-theory.md
    1937-landau-phase-transitions.md
    1946-bloch-purcell-nmr.md
    1946-landau-plasma-damping.md
    1950-ginzburg-landau-superconductivity.md
    1957-bardeen-cooper-schrieffer.md
    1957-landau-fermi-liquid.md
    1958-anderson-localization.md
    1971-1975-wilson-renormalization-group.md
    1973-kosterlitz-thouless.md
    1980-von-klitzing-iqhe.md
    1983-laughlin-fqhe.md
    1984-berry-geometric-phase.md
    foundations/
      1972-anderson-more-is-different.md

  reference/
    bipm-si-brochure-9th-ed.md
    codata-fundamental-constants.md
    pdg-review-of-particle-physics.md
```

### Seeded `CANON_INDEX.md` blocks (additions beyond pass-1)

The pass-1 `CANON_INDEX.md` seeded entries 1–42. The pass-2 additions, numbered continuing from 42:

```
### classical-mechanics/ (additions)
| # | Author / Title | Year | Edition of record | Justification |
|---|---|---|---|---|
| 43 | Galileo — Discorsi e dimostrazioni matematiche…due nuove scienze | 1638 | Drake tr., Wisconsin 1974; Wall & Emerson 1989 | Originator of kinematics; uniform & uniformly accelerated motion; parabolic trajectory |
| 44 | Liouville — Note sur la théorie de la variation des constantes arbitraires | J. math. pures appl. 3, 342 (1838) | journal facsimile | Liouville's theorem (phase-space volume conservation) |
| 45 | Poincaré — Les Méthodes nouvelles de la mécanique céleste, 3 vols. | 1892, 1893, 1899 | Goroff ed./tr., AIP HMP 13, 1993 | Geometric theory of dynamical systems; non-integrability |

### electromagnetism/ (additions)
| 46 | Heaviside — On the Forces, Stresses, and Fluxes of Energy in the Electromagnetic Field | Phil. Mag. (5) 35, 360 (1893) | journal facsimile | Originator priority for vector form of Maxwell's equations |

### statistical-mechanics/ (additions)
| 47 | Boltzmann — Vorlesungen über Gastheorie, 2 vols. | 1896, 1898 | Brush tr., UC Press 1964; Dover 1995 | Originator monograph; H-theorem, Maxwell-Boltzmann distribution, response to reversibility & recurrence paradoxes |
| 48 | Onsager — Crystal Statistics. I. A Two-Dimensional Model with an Order-Disorder Transition | Phys. Rev. 65, 117 (1944) | journal facsimile | Exact solution of 2D Ising model |
| 49 | Yang & Lee — Statistical Theory of Equations of State and Phase Transitions, I + II | Phys. Rev. 87, 404 + 410 (1952) | journal facsimiles | Lee-Yang circle theorem; rigorous theory of phase transitions |
| 50 | Kubo — Statistical-Mechanical Theory of Irreversible Processes. I | J. Phys. Soc. Japan 12, 570 (1957) | journal facsimile | Fluctuation-dissipation theorem; Kubo formula |

### relativity/special/ (additions)
| 51 | Michelson & Morley — On the Relative Motion of the Earth and the Luminiferous Ether | Am. J. Sci. (3) 34, 333 (1887) | journal facsimile | Null result; experimental foundation of special relativity (c4) |
| 52 | Minkowski — Die Grundgleichungen für die elektromagnetischen Vorgänge in bewegten Körpern | Nachr. Ges. Wiss. Göttingen 1908, 53 | journal facsimile | Technical originator of 4-D spacetime |

### relativity/general/ (additions)
| 53 | Kerr — Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics | Phys. Rev. Lett. 11, 237 (1963) | journal facsimile | Kerr metric (rotating black hole) |
| 54 | Penrose — Gravitational Collapse and Space-Time Singularities | Phys. Rev. Lett. 14, 57 (1965) | journal facsimile | First singularity theorem |
| 55 | Bekenstein — Black Holes and Entropy | Phys. Rev. D 7, 2333 (1973) | journal facsimile | Black-hole entropy ∝ horizon area |
| 56 | Hawking — Particle Creation by Black Holes | Comm. Math. Phys. 43, 199 (1975) | journal facsimile | Hawking radiation; black-hole thermodynamics |

### quantum-mechanics/ (additions)
| 57 | Bohr — On the Constitution of Atoms and Molecules (the trilogy) | Phil. Mag. (6) 26, 1 + 476 + 857 (1913) | journal facsimiles | Quantization of angular momentum; Bohr model |
| 58 | Stern & Gerlach — Der experimentelle Nachweis der Richtungsquantelung im Magnetfeld | Z. Phys. 9, 349 (1922) | journal facsimile | Experimental foundation for spin quantization (c4) |
| 59 | de Broglie — Recherches sur la théorie des quanta | thesis Paris 1924; Ann. Phys. (10) 3, 22 (1925) | published thesis | Matter-wave hypothesis; λ = h/p |
| 60 | Heisenberg — Über den anschaulichen Inhalt der quantentheoretischen Kinematik und Mechanik | Z. Phys. 43, 172 (1927) | journal facsimile | Uncertainty principle |
| 61 | Davisson & Germer — Diffraction of Electrons by a Crystal of Nickel | Phys. Rev. 30, 705 (1927) | journal facsimile | Experimental confirmation of de Broglie (c4) |
| 62 | Hohenberg & Kohn — Inhomogeneous Electron Gas | Phys. Rev. 136, B864 (1964) | journal facsimile | DFT theorems |
| 63 | Kohn & Sham — Self-Consistent Equations Including Exchange and Correlation Effects | Phys. Rev. 140, A1133 (1965) | journal facsimile | Kohn-Sham scheme |

### quantum-mechanics/foundations/ (new sub-fold)
| 64 | Bohr — The Quantum Postulate (Como lecture) | Nature 121 Suppl. 580 (1928) | journal facsimile | Complementarity |
| 65 | Einstein, Podolsky & Rosen — Can Quantum-Mechanical Description of Physical Reality Be Considered Complete? | Phys. Rev. 47, 777 (1935) | journal facsimile | EPR; entanglement framing |
| 66 | Bell — On the Einstein Podolsky Rosen Paradox | Physics 1, 195 (1964) | journal facsimile | Bell inequality |
| 67 | Aspect, Dalibard & Roger — Experimental Test of Bell's Inequalities Using Time-Varying Analyzers | Phys. Rev. Lett. 49, 1804 (1982) | journal facsimile | First loophole-closing Bell test (c4) |

### quantum-field-theory/ (additions)
| 68 | Dirac — The Quantum Theory of the Emission and Absorption of Radiation | Proc. Roy. Soc. A 114, 243 (1927) | journal facsimile | First quantization of the radiation field |
| 69 | Pauli & Weisskopf — Über die Quantisierung der skalaren relativistischen Wellengleichung | Helv. Phys. Acta 7, 709 (1934) | journal facsimile | Klein-Gordon field quantization |
| 70 | Bethe — The Electromagnetic Shift of Energy Levels | Phys. Rev. 72, 339 (1947) | journal facsimile | Lamb-shift renormalization estimate |
| 71 | Lamb & Retherford — Fine Structure of the Hydrogen Atom by a Microwave Method | Phys. Rev. 72, 241 (1947) | journal facsimile | Experimental observation of Lamb shift (c4) |
| 72 | Feynman — Space-Time Approach to Non-Relativistic Quantum Mechanics | Rev. Mod. Phys. 20, 367 (1948) | journal facsimile | Path-integral formulation |
| 73 | Higgs / Englert-Brout / Guralnik-Hagen-Kibble — 1964 Higgs trilogy | Phys. Rev. Lett. 13, 508 + 321 + 585 (1964) | journal facsimiles | Higgs mechanism (full triplet) |
| 74 | 't Hooft — Renormalization of Massless Yang-Mills Fields + Renormalizable Lagrangians for Massive Yang-Mills Fields | Nucl. Phys. B 33, 173 + B 35, 167 (1971) | journal facsimiles | Renormalizability of non-abelian gauge theories |

### particle-physics/ (additions)
| 75 | Wu, Ambler, Hayward, Hoppes & Hudson — Experimental Test of Parity Conservation in Beta Decay | Phys. Rev. 105, 1413 (1957) | journal facsimile | Parity violation in weak interactions (c4) |
| 76 | Cabibbo — Unitary Symmetry and Leptonic Decays | Phys. Rev. Lett. 10, 531 (1963) | journal facsimile | Cabibbo angle |
| 77 | Kobayashi & Maskawa — CP-Violation in the Renormalizable Theory of Weak Interaction | Prog. Theor. Phys. 49, 652 (1973) | journal facsimile | CKM matrix; three-generation prediction |

### condensed-matter/ (additions)
| 78 | Bloch — Über die Quantenmechanik der Elektronen in Kristallgittern | Z. Phys. 52, 555 (1928) | journal facsimile | Bloch's theorem; band theory |
| 79 | Landau — Theory of Phase Transitions, Part I | Phys. Z. Sowjetunion 11, 26 (1937) | journal facsimile | Order-parameter theory |
| 80 | Bloch — Nuclear Induction; Purcell, Torrey & Pound — Resonance Absorption by Nuclear Magnetic Moments in a Solid | Phys. Rev. 70, 460; 69, 37 (1946) | journal facsimiles | NMR discovery (paired) |
| 81 | Landau — On the Vibrations of the Electronic Plasma | J. Phys. (USSR) 10, 25 (1946) | journal facsimile | Landau damping |
| 82 | Ginzburg & Landau — On the Theory of Superconductivity | ZhETF 20, 1064 (1950) | journal facsimile | Ginzburg-Landau theory |
| 83 | Landau — The Theory of a Fermi Liquid | ZhETF 30, 1058 (1956); Sov. Phys. JETP 3, 920 (1957) | journal facsimile | Fermi-liquid theory |
| 84 | Kosterlitz & Thouless — Ordering, metastability and phase transitions in two-dimensional systems | J. Phys. C 6, 1181 (1973) | journal facsimile | Topological phase transitions |
| 85 | von Klitzing, Dorda & Pepper — New Method for High-Accuracy Determination of the Fine-Structure Constant Based on Quantized Hall Resistance | Phys. Rev. Lett. 45, 494 (1980) | journal facsimile | Integer quantum Hall (c4) |
| 86 | Laughlin — Anomalous Quantum Hall Effect: An Incompressible Quantum Fluid with Fractionally Charged Excitations | Phys. Rev. Lett. 50, 1395 (1983) | journal facsimile | Laughlin wavefunction; FQHE |
| 87 | Berry — Quantal Phase Factors Accompanying Adiabatic Changes | Proc. Roy. Soc. A 392, 45 (1984) | journal facsimile | Geometric phase |

### condensed-matter/foundations/ (new sub-fold)
| 88 | Anderson — More Is Different | Science 177, 393 (1972) | journal facsimile | Originator framework on emergence (c1, foundations tag) |
```

Total inventory after pass-2: **88 entries** (42 from pass-1 + 46 added). Tier counts: ~80 strong c1; ~6 strong c4; 3 strong c3 (CODATA, BIPM SI, PDG).

---

## 8. Work queue + open questions

### 8.1 Work queue (ordered for next-session execution)

**Phase A — folder scaffolding (mechanical, do first):**
- A1. `mkdir -p` every sub-folder in §7 tree, including `quantum-mechanics/foundations/`, `condensed-matter/foundations/`, `_landscape/`.
- A2. Create empty `.gitkeep` files in each sub-folder so the tree commits.
- A3. Drop `_landscape/textbooks.md` per §4 verbatim.

**Phase B — promotion of pass-2 additions (the 46 new entries):**
- B1. For each entry in §7 seeded `CANON_INDEX.md` blocks numbered 43–88, write the per-entry stub `.md` file with: header (author/title/year/edition-of-record), one-paragraph mechanism justification, one-paragraph cross-link map, and the source-URL line.
- B2. Verify edition-of-record DOIs and journal facsimile URLs.
- B3. Place each stub in its sub-folder per the §7 tree.

**Phase C — `CANON_INDEX.md` regeneration:**
- C1. Update the master `02-physics/CANON_INDEX.md` with all 88 entries.
- C2. Generate per-sub-folder `CANON_INDEX.md` files (each lists only that sub-folder's entries).

**Phase D — cross-link verification (last):**
- D1. Resolve the `03-chemistry/` cross-links (Schrödinger, Pauli, Born-Oppenheimer, Hohenberg-Kohn, Kohn-Sham, Gibbs/Boltzmann statmech) — they no longer dangle.
- D2. Resolve the `01-mathematics/` cross-links (Noether 1918, von Neumann 1932, calculus-of-variations, operator-theory).
- D3. Resolve the `04-information/` cross-links (Shannon-Gibbs entropy stub-writing rule, Bell 1964 placement, Jaynes 1957 cross-link).
- D4. Pre-stage `06-cosmology/` and `05-biophysics/` cross-link targets per §5.3 and §5.4 (record in a `CROSS_LINKS.md` even though those branches don't exist yet).
- D5. Write the binding `02-physics/CROSS_LINKS.md` document.

**Phase E — pass-3 (synthesis):**
- E1. Adjudicate the §8.2 open questions below.
- E2. Issue final pass-3 ratification of the §7 tree.
- E3. Migrate any items from `_intake/` to the live tree as they ratify.

### 8.2 Open questions for pass-3

Five items pass-2 deliberately leaves open. Each is a maintainer-level call.

1. **Anderson 1972 "More Is Different" — c1 with a foundations tag, or landscape?** Pass-2 leaned promote with a tag. The argument against: it is a position paper, not a derivation. The argument for: the chemistry pass-3 §3.4 c3 rule does not apply (Anderson is not writing a normative reference); the c1 rule does apply if "originator of a framework" counts, and emergence-as-a-framework is the load-bearing claim. Pass-3 must decide whether "framework originator" counts as c1 or whether c1 is reserved for derivations and theorems. If yes to the former, the same question opens for several borderline framework papers (Kuhn 1962 *Structure of Scientific Revolutions* — but that is `08-deep-history/` and not physics canon under any reading; Wilson 1982 Nobel lecture — borderline). Recommendation: **promote Anderson 1972 with the explicit "framework, not derivation" tag**, and bind the rule for future framework papers in pass-3.

2. **Should `relativity/general/` open a `quantum-gravity/` sub-fold?** The candidates are DeWitt 1967 ("Quantum Theory of Gravity. I. The Canonical Theory", *Phys. Rev.* 160, 1113) and Ashtekar 1986 ("New Variables for Classical and Quantum Gravity", *Phys. Rev. Lett.* 57, 2244). The string-theory canon is a separate question (Polyakov 1981, Green-Schwarz 1984, Witten 1995 M-theory) and a major decision — pass-2 does not have the depth to call. Pass-3 should decide whether (a) a `quantum-gravity/` sub-fold opens with DeWitt + Ashtekar as primaries, (b) the string-theory primaries promote at all, or (c) both deferred to a later pass.

3. **The `experimental/` sub-fold question — settled in §1.12 but worth a re-test.** Pass-2 mixed experimental papers into theory sub-folders following the chemistry pass-3 precedent. The cohort is now 8 experimental entries (Michelson-Morley, Davisson-Germer, Wu, Lamb-Retherford, Stern-Gerlach, Aspect, von Klitzing, Bloch-Purcell). At what cohort size does a separate `experimental/` sub-fold become justified? Pass-3 should set a binding threshold (recommendation: 15 entries) and keep the current dispersion until then.

4. **Weinberg 1979 "Phenomenological Lagrangians" promotion.** Pass-2 deferred. The argument for promotion: originator priority for chiral perturbation theory, the systematic effective-field-theory framework that organizes low-energy QCD. The argument against: the EFT framework is more clearly attributed to Wilson's 1971 RG papers (already canon); Weinberg 1979 is the application of the RG to chiral dynamics, not the originator of EFT itself. Pass-3 should call. Recommendation: **promote** as `quantum-field-theory/1979-weinberg-phenomenological-lagrangians.md`.

5. **The cosmological-constant / dark-energy primary placement — physics or cosmology?** Einstein 1917 introduces Λ; the modern dark-energy papers (Perlmutter 1999, Riess 1998) measure it. Pass-2 placed all in cosmology with cross-links from physics. The contestable claim: Λ is a parameter in the GR field equations and arguably belongs in `02-physics/relativity/general/` as a physics parameter, with cosmology cross-linking. Pass-3 should ratify the §5.3 ruling or reverse. Recommendation: **ratify §5.3** — Λ as a parameter is in physics implicitly (Einstein 1915 field equations admit it), but the originator framing of the dark-energy program is cosmological.

---

## Sources used in this pass

- [Springer / *Annalen der Physik* — Schrödinger 1926 four-paper sequence](https://onlinelibrary.wiley.com/journal/15213889)
- [Royal Society — Dirac 1927 *Proc. Roy. Soc. A* 114, 243 (PD)](https://royalsocietypublishing.org/doi/10.1098/rspa.1927.0039)
- [Royal Society — Dirac 1928 *Proc. Roy. Soc. A* 117, 610 (PD)](https://royalsocietypublishing.org/doi/10.1098/rspa.1928.0023)
- [Bekenstein 1973 *Phys. Rev. D* 7, 2333](https://journals.aps.org/prd/abstract/10.1103/PhysRevD.7.2333)
- [Hawking 1975 *Comm. Math. Phys.* 43, 199](https://link.springer.com/article/10.1007/BF02345020)
- ['t Hooft 1971 *Nucl. Phys. B* 35, 167](https://www.sciencedirect.com/science/article/pii/0550321371901395)
- [Bell 1964 *Physics* 1, 195 (PD scan)](https://cds.cern.ch/record/111654/files/vol1p195-200_001.pdf)
- [EPR 1935 *Phys. Rev.* 47, 777](https://journals.aps.org/pr/abstract/10.1103/PhysRev.47.777)
- [Onsager 1944 *Phys. Rev.* 65, 117](https://journals.aps.org/pr/abstract/10.1103/PhysRev.65.117)
- [Yang-Lee 1952 *Phys. Rev.* 87, 404 + 410](https://journals.aps.org/pr/abstract/10.1103/PhysRev.87.404)
- [Kubo 1957 *J. Phys. Soc. Japan* 12, 570](https://journals.jps.jp/doi/10.1143/JPSJ.12.570)
- [Kerr 1963 *Phys. Rev. Lett.* 11, 237](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.11.237)
- [Penrose 1965 *Phys. Rev. Lett.* 14, 57](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.14.57)
- [Hohenberg-Kohn 1964 *Phys. Rev.* 136, B864](https://journals.aps.org/pr/abstract/10.1103/PhysRev.136.B864)
- [Kohn-Sham 1965 *Phys. Rev.* 140, A1133](https://journals.aps.org/pr/abstract/10.1103/PhysRev.140.A1133)
- [Berry 1984 *Proc. Roy. Soc. A* 392, 45](https://royalsocietypublishing.org/doi/10.1098/rspa.1984.0023)
- [Kosterlitz-Thouless 1973 *J. Phys. C* 6, 1181](https://iopscience.iop.org/article/10.1088/0022-3719/6/7/010)
- [Laughlin 1983 *Phys. Rev. Lett.* 50, 1395](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.50.1395)
- [Anderson 1972 *Science* 177, 393](https://www.science.org/doi/10.1126/science.177.4047.393)
- [Stillman Drake 1974 / Wall & Emerson 1989 — Galileo *Two New Sciences*](https://wallandemerson.com/)

End of pass-2 deep dive.
