# Physics Canon — Pass-2 Deep Dive — 2026-05-01

Intake document. Not promoted. Builds on `_intake/physics-canon-pass-1-2026-05-01.md` (the breadth-first sweep, 225 lines, 38 strong + 12 borderline entries, the proposed sub-fold tree). Pass-2 walks each sub-domain at the depth of `bucket-canon/03-chemistry/_intake/chemistry-canon-deep-dive-2026-05-01.md`, adjudicates the four contestable calls pass-1 deferred, and produces the cross-branch coherence map and the recommended frozen tree for pass-3.

Author: data pillar.
Method: re-read of pass-1, math pass-1 (especially §4 on von Neumann 1932), chemistry pass-3 §5.1 (the chem–physics boundary), information pass-1 §1.10 + §3.3 (quantum information cross-link); targeted citation verification via WebSearch on the load-bearing volumes (Maxwell 1865 *Phil. Trans.* 155, the three 1964 PRL papers, the Schwinger 1948 trio, the Schrödinger 1926 four-paper *Annalen* series, the Born–Heisenberg–Jordan *Z. Phys.* pair, Friedmann 1922 *Z. Phys.* 10).

The promotion-rule clauses used throughout: **c1** = primary theoretical paper or monograph by the originator; **c2** = recognized academic edition-of-record of a primary text; **c3** = discipline-standard normative reference; **c4** = experimental paper that established a fundamental constant or falsified a candidate law at the foundational level. (c4 is the physics-only fourth clause from `02-physics/README.md` §"Promotion rule"; it does not exist in the chemistry README.)

---

## 1. Sub-domain deep dives

### 1.1 Classical mechanics

**Newton 1687 — *Principia*.** The originator priority is unambiguous. The edition-of-record question pass-1 answered with Cohen-Whitman 1999 needs the reasoning written out, because three editions of the *Principia* itself (1687, 1713, 1726) have legitimate claims and three modern English translations (Motte 1729, Motte–Cajori 1934, Cohen–Whitman 1999) compete. The Cohen–Whitman case rests on three points. First, it translates the third edition of 1726, which is Newton's own last revision and contains his final corrections to the lunar theory and the third book; the Motte 1729 translation is from the second edition (1713) and the Motte–Cajori 1934 modernization silently inserts Cajori's interpolations into Motte's eighteenth-century English, which generations of historians have flagged as misleading. Second, Cohen and Whitman are working from the Koyré–Cohen variorum edition (Harvard, 1972), which is the apparatus-criticus reference for any modern Newton scholarship — every edition variant is footnoted. Third, the 370-page "Guide to the *Principia*" by Cohen that prefaces the 1999 volume is itself canon-grade Newton scholarship. The 1999 volume is the unambiguous c2 edition-of-record. Place in `classical-mechanics/`. Strong.

**Lagrange 1788 — *Mécanique analytique*.** The first-edition / second-edition question. The 1788 *Mécanique analytique* (single volume, Veuve Desaint, Paris) is Lagrange's originator statement of mechanics in generalized coordinates and the principle of virtual work; the 1811–1815 second edition (two volumes, Mme Ve Courcier, Paris) is Lagrange's own final revision, completed posthumously by Joseph Bertrand and Gaston Darboux for the Œuvres edition. The Boissonnade–Vagliente 1997 Kluwer translation (ISBN 0-7923-4349-2) translates the second edition. Pass-2 ratifies the second edition as edition-of-record on the same logic as the *Principia* third edition: the originator's own final revision wins. The 1788 first edition is cited for priority dating; the 1811–1815 text is what readers consult. Strong c1 + c2.

**Hamilton 1834/1835 — the *Phil. Trans.* pair.** Two papers, not one, and this matters. "On a General Method in Dynamics" (*Phil. Trans.* 124, 247–308, 1834) introduces the characteristic function and the principle that variations of the action determine the equations of motion; "Second Essay on a General Method in Dynamics" (*Phil. Trans.* 125, 95–144, 1835) introduces the canonical (Hamilton) equations themselves and the principal function. Modern textbooks call "the Hamilton equations" the content of the 1835 paper, but the variational principle is in the 1834 paper. Treat the two as a single bundled entry "Hamilton 1834/1835" with both citations. Edition-of-record: A. W. Conway and A. J. McConnell (eds.), *The Mathematical Papers of Sir William Rowan Hamilton, vol. II: Dynamics*, Cambridge University Press, 1940 (PD facsimiles of the *Phil. Trans.* originals with editorial notes). Strong.

**Jacobi 1866 — *Vorlesungen über Dynamik*.** Edited by A. Clebsch from Jacobi's 1842–1843 Königsberg lectures and published posthumously by G. Reimer, Berlin, 1866. The lecture format complicates originator-edition reasoning: Jacobi delivered the lectures in 1842–43, the priority date for the Hamilton–Jacobi equation and canonical transformations; Clebsch's edited 1866 text is the only c2 edition-of-record because Jacobi never published the material himself. The English translation by K. Balagangadharan (*Jacobi's Lectures on Dynamics*, Hindustan Book Agency, 2009) is the working English access point. Strong c1 (priority 1842–43, edition-of-record 1866).

**Noether 1918 — "Invariante Variationsprobleme".** The full mechanism, written out, because the cross-branch coherence map below references this entry from math, physics, and information. Noether proves two theorems. The first: every continuous global symmetry of an action functional yields a conserved current, with the current expressed as a contraction of the field gradient with the symmetry-generating vector field. The second: every continuous *local* (gauge) symmetry yields a relation among the equations of motion (a Bianchi-type identity), not a new conservation law — which is why gauge symmetries do not "double-count" energies. The proof is a clean variational calculation: vary the action, separate the boundary term from the bulk term, demand vanishing on shell. The paper appeared in the *Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen, Mathematisch-Physikalische Klasse* 1918, 235–257; Tavel's English translation appeared in *Transport Theory and Statistical Physics* 1(3), 183–207 (1971). The dual-primary discussion: a defensible reading places the paper in math (it is a theorem about variational problems, the proof is calculus of variations, it would be canon in math even if no physicist had ever read it) and a defensible reading places it in physics (Hilbert and Klein commissioned it specifically to clarify energy conservation in general relativity, every downstream physics use rests on it, the originator framing is unambiguously physical). Pass-1 placed it in physics with a math cross-link; pass-2 ratifies, on the originator-framing rule that math itself uses (math pass-1 §3 mathematics-vs-physics: "Default rule: a text belongs to mathematics if it can be read without reference to a physical phenomenon. Newton's *Principia* fails this test."). Noether 1918 fails the test the same way: the abstract says it generalizes work of Hamel, Herglotz, and Lorentz on the variational form of physical conservation laws. Strong c1, physics primary, math cross-link.

### 1.2 Electromagnetism

**Faraday — *Experimental Researches in Electricity*, 30 papers in *Phil. Trans.*, 1831–1855, collected as a 3-volume set 1839/1844/1855.** Pass-1 listed the collected edition; pass-2 identifies the load-bearing five papers within it. Series I ("On the Induction of Electric Currents", *Phil. Trans.* 122, 125–162, 1832) — the discovery of electromagnetic induction. Series VII ("Identity of Electricities Derived from Different Sources", *Phil. Trans.* 123, 23–54, 1833) — establishing that frictional, voltaic, and induced electricity are the same physical entity. Series XI ("On Induction", *Phil. Trans.* 128, 1–40, 1838) — introducing lines of force as physically real, not bookkeeping. Series XIX ("On the Magnetization of Light and the Illumination of Magnetic Lines of Force", *Phil. Trans.* 136, 1–20, 1846) — the Faraday effect, the first demonstration that light is an electromagnetic phenomenon. Series XXVIII ("On Lines of Magnetic Force; Their Definite Character", *Phil. Trans.* 142, 25–56, 1852) — the field concept made fully explicit. The other 25 series in the *Researches* are mechanism-tier observational reports that reinforce these five but do not introduce new originator content; they are bundled inside the c2 edition-of-record (Dover 3-vol. reprint 1965, ISBN 0-486-21537-8) without separate canonical entries. Strong c1 for the 1831–1855 corpus, with the five-paper spine flagged in the entry stub for downstream citation.

**Maxwell 1865 — *Phil. Trans.* 155, 459–512, "A Dynamical Theory of the Electromagnetic Field."** This is the paper that *predates* the *Treatise* by eight years and is the originator priority for the unified electromagnetic field theory and the displacement current. Pass-1 listed the 1873 *Treatise* as the canonical entry; pass-2 corrects this. The 1865 paper is the originator paper — read to the Royal Society on 8 December 1864, peer-reviewed by William Thomson, approved 15 June 1865. The *Treatise* is the c2 edition-of-record monograph. **Promote both, with the 1865 paper as priority and the *Treatise* as the comprehensive synthesis.** Pass-2 corrects pass-1.

**Maxwell 1873/1881/1891 — *A Treatise on Electricity and Magnetism*, the edition-of-record question.** Three editions: 1873 1st (Maxwell), 1881 2nd (W. D. Niven, after Maxwell's 1879 death; revised through page 9, vol. II), 1891 3rd (J. J. Thomson, more extensive revisions). Pass-1 picked the 1891 third edition; pass-2 ratifies, with reasoning. The 1881 edition is half-revised (Niven completed only the early chapters before going to other work); the 1891 third edition is the complete posthumous edition with Thomson's editorial apparatus, and is what the Dover 1954 reprint (ISBN 0-486-60636-8 / 0-486-60637-6, 2 vols.) reproduces. The same originator-edition logic the Lagrange and Newton entries use applies in reverse here: Maxwell did not live to revise, so the *most-completely-revised posthumous edition* by an originator-adjacent editor (Thomson, who would shortly co-author the discovery of the electron) is the c2 edition-of-record. Strong c2.

**Heaviside 1893–1912 — *Electromagnetic Theory*, 3 vols.** Edition-of-record: the original Electrician Printing and Publishing Co. printing, with the standard Cosimo Classics / Chelsea reprint 1971 as the working PD access point. Heaviside's contribution that pass-1 understated: the four-equation form of Maxwell's equations every modern textbook uses originates here, not in Maxwell. The *Treatise* uses quaternions; Heaviside reformulated the entire field theory in three-vector divergence-and-curl form, eliminated the magnetic vector potential where it was a bookkeeping artifact, and produced the operational calculus along the way. The originator priority for "div E = ρ/ε₀ etc. as a coupled-PDE system" is Heaviside, not Maxwell. Strong c1 for the vector reformulation.

**Lorentz 1892/1895/1909.** Pass-1 listed Lorentz 1892 (the *Archives néerlandaises* paper) and the 1909 *Theory of Electrons* (Teubner, Leipzig; Dover reprint 1952). Pass-2 adds Lorentz 1895 — *Versuch einer Theorie der electrischen und optischen Erscheinungen in bewegten Körpern* (E. J. Brill, Leiden, 1895) — as the originator priority for the local-time transformation that Einstein 1905 will later incorporate. The Lorentz force law in modern form first appears in the 1892 paper; the electron theory of matter in 1895 and 1909. Bundle as a single "Lorentz 1892/1895/1909" entry with internal-citation flags. Strong c1.

**Larmor 1900 — *Aether and Matter*, Cambridge University Press, 1900.** Originator priority for the Larmor precession and the time-transformation that Lorentz 1904 and Einstein 1905 will sharpen. Pass-1 omitted; pass-2 lean is **borderline-strong**. Argument for promotion: independent priority for the time-dilation form. Argument against: the *aether* framing is a discarded substrate; the originator priority belongs to Lorentz on the published-record-of-corrections. Pass-2 ratifies pass-1's implicit omission — Larmor 1900 is **landscape**, not canon, with a citation pointer from the Lorentz entry stub. The text that survives is the Larmor formula for radiated power from an accelerating charge, which is a derivation, not a foundation.

### 1.3 Thermodynamics

**Carnot 1824 + Clapeyron 1834.** Carnot's *Réflexions sur la puissance motrice du feu* (Bachelier, Paris, 1824) is the originator priority for the Carnot cycle and the second-law-prefiguring efficiency bound. Clapeyron 1834 ("Mémoire sur la puissance motrice de la chaleur", *Journal de l'École polytechnique* 14, 153–190) is the recovery and mathematical formalization of Carnot — Carnot died in 1832 and his 1824 monograph went unread for a decade until Clapeyron rediscovered it and translated the verbal arguments into the (P, V) diagram every modern textbook uses. **Promote both as a bundled entry.** Carnot is c1 priority; Clapeyron is c1 for the diagrammatic form and the Clapeyron equation (`dP/dT = L/(TΔV)`), which is the originator priority for phase-equilibrium thermodynamics. Edition-of-record: Carnot R. H. Thurston tr. (Wiley 1890, Dover reprint 1960, ISBN 0-486-44641-7); Clapeyron facsimile via *Journal de l'École polytechnique* (PD).

**Clausius 1850/1854/1865 — which is the entropy paper proper?** The 1850 paper ("Über die bewegende Kraft der Wärme...", *Annalen der Physik* 155(3), 368–397 and 155(4), 500–524) is the originator statement of the second law in modern form ("heat does not pass spontaneously from a colder body to a hotter") and the conjoined first law for closed cycles. The 1854 paper ("Über eine veränderte Form des zweiten Hauptsatzes...", *Ann. Phys.* 169(12), 481–506) introduces the *equivalence-value* of a transformation, `∫ dQ/T`, which is the integral now called entropy but Clausius did not yet name it. The 1865 paper ("Über verschiedene für die Anwendung bequeme Formen der Hauptgleichungen...", *Ann. Phys.* 201(7), 353–400) is where Clausius coins the word *entropy* (from τροπή, transformation, paralleling *energy*) and gives the closing line "Die Entropie der Welt strebt einem Maximum zu." All three are originator priority on different mechanism-level statements. **Promote as a bundled three-paper entry "Clausius 1850/1854/1865"** with the 1865 paper flagged as the entropy-naming priority. Strong c1.

**Kelvin 1851/1852.** William Thomson, "On the Dynamical Theory of Heat" (*Trans. Roy. Soc. Edinburgh* 20, 261–298, 1851; continuations 1852). Originator priority for the Kelvin form of the second law ("no process whose only effect is to convert heat from a single reservoir entirely into work") and for the absolute thermodynamic temperature scale. Pass-1 omitted. Pass-2 lean: **promote** as a bundled entry. Kelvin's form is the form most modern textbooks introduce *first*, before Clausius's form, and the equivalence of the two forms is itself a foundational result. Strong c1.

**Helmholtz 1847 — *Über die Erhaltung der Kraft*.** Already strong in pass-1. Pass-2 ratifies. The originator priority for the conservation of energy as a *unified* principle across mechanical, thermal, electrical, and chemical phenomena. The 19th-century discipline-formation moment when "force" (*Kraft*, in the older sense Helmholtz uses) became "energy" in the modern sense. Strong c1.

**Gibbs 1875–78 — "On the Equilibrium of Heterogeneous Substances", *Trans. Connecticut Acad.* 3, 108–248 (1875–76) and 343–524 (1877–78).** Already canon in chemistry pass-3 §5.1 as the chemistry-thermodynamics primary. The physics-side question pass-2 must answer: does Gibbs 1875–78 also enter `02-physics/thermodynamics/`? **No.** Cross-link from physics to chemistry. The reason is the chemistry pass-3 §5.1 boundary rule: chemical-potential, activity-coefficient, phase-rule, electrolyte solution, equilibrium-constant treatments → chemistry. Gibbs 1875–78 is the originator paper for chemical potential and the phase rule; it is chemistry-side. The Gibbs entry that is physics-side is Gibbs 1902 *Elementary Principles in Statistical Mechanics* (see §1.4). Two Gibbs entries, one each branch, no duplication, with cross-links from each side.

**Planck 1901 — *Ann. Phys.* 309(3), 553–563.** Pass-1 placed it in `thermodynamics/` and flagged the cross-link to `quantum-mechanics/`. Pass-2 reverses: the 14 December 1900 *Verhandlungen der Deutschen Physikalischen Gesellschaft* presentation and the 1901 *Annalen* paper are the originator priority for the *quantum hypothesis* (`E = hν`) — a quantum-mechanics result, not a thermodynamic one. The black-body radiation law itself is the empirical input; the quantization of oscillator energies is the foundational claim. Place in `quantum-mechanics/early-quantum/` (a new sub-fold the Bohr-1913-trilogy and de-Broglie-1924 entries also use; see §1.6). Cross-link from thermodynamics. Strong c1 in QM.

### 1.4 Statistical mechanics

**Boltzmann 1872 + 1877.** Two papers, both canon. The 1872 H-theorem paper ("Weitere Studien über das Wärmegleichgewicht unter Gasmolekülen", *Sitzungsberichte der Kaiserlichen Akademie der Wissenschaften in Wien* 66, 275–370) is the originator priority for the H-theorem and the irreversibility-from-reversibility argument. The 1877 paper ("Über die Beziehung zwischen dem zweiten Hauptsatze...", *Sitzungsberichte* 76, 373–435) is the originator priority for `S = k log W` (Boltzmann did not write `k`; Planck introduced the constant). The 1877 result is what is engraved on Boltzmann's tombstone. Promote as a bundled "Boltzmann 1872/1877" entry. Strong c1.

**Maxwell 1860 — "Illustrations of the Dynamical Theory of Gases", *Phil. Mag.* 19, 19–32 and 20, 21–37 (1860).** Pass-1 omitted; this is a load-bearing miss. The Maxwell distribution of molecular velocities is the originator priority for *probability-distribution-over-microstates* as a physics object — six years before Boltzmann's 1866 paper that builds on it. Promote. Strong c1, `statistical-mechanics/`.

**Gibbs 1902 — *Elementary Principles in Statistical Mechanics*, Charles Scribner's Sons, New York, 1902 (Dover reprint 1960).** Already strong in pass-1. The originator priority for the ensemble formulation (microcanonical, canonical, grand canonical) and the operational definition of an ensemble average. Strong c1.

**Einstein 1905 — Brownian motion paper, *Ann. Phys.* 322(8), 549–560.** Pass-1 placed it in statistical mechanics with an alternative listing in the Annus Mirabilis bundle. Pass-2 chooses: **statistical mechanics primary, with cross-citation from `relativity/special/`** as part of the 1905 Einstein bundle. The mechanism is statmech: connecting molecular reality (the diffusion constant `D = k_B T / (6πηa)`) to observable Brownian motion via Stokes drag. The Annus Mirabilis bundling is a presentation choice, not a placement choice. Strong c1 in statmech.

**Onsager 1931.** Already canon in pass-1. The reciprocal relations as the originator priority for non-equilibrium thermodynamics. Strong.

### 1.5 Relativity

**Einstein 1905 *Annalen* trio — adjudicate which paper is the SR originator.** Pass-1 listed all four 1905 Einstein papers (photoelectric, Brownian, SR, E=mc²) as separate strong entries. Pass-2 ratifies and resolves the SR question. The originator priority for special relativity is "Zur Elektrodynamik bewegter Körper", *Ann. Phys.* 322(10), 891–921 (received 30 June 1905), which states the two postulates (relativity of inertial frames + invariance of `c`) and derives the Lorentz transformations from them. The companion "Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig?", *Ann. Phys.* 323(13), 639–641 (received 27 September 1905), is the originator priority for `E = mc²` as a separate result. Both promote. The photoelectric paper ("Über einen die Erzeugung und Verwandlung des Lichtes betreffenden heuristischen Gesichtspunkt", *Ann. Phys.* 322(6), 132–148) is the originator priority for the *photon hypothesis* and is QM-side, not relativity-side; it is the paper that won Einstein the 1921 Nobel. Pass-2 places the photoelectric paper in `quantum-mechanics/early-quantum/` (alongside Planck 1901). The Brownian paper is statmech-side (§1.4). Final placement of the 1905 Einstein corpus: SR + E=mc² in `relativity/special/`, photoelectric in `quantum-mechanics/early-quantum/`, Brownian in `statistical-mechanics/`, with cross-links from each to the others under a meta-entry "Einstein 1905 — the Annus Mirabilis bundle" that lives at the `02-physics/` root in `_intake/cross-cutting-bundles.md` (a new file pass-3 will create).

**Minkowski 1908/1909.** The originator priority for the four-dimensional spacetime formulation. Pass-1 cited the *Jahresbericht der Deutschen Mathematiker-Vereinigung* 18, 75–88 (1909) lecture "Raum und Zeit" delivered in Cologne 21 September 1908. Pass-2 adds the earlier Minkowski 1908 paper "Die Grundgleichungen für die elektromagnetischen Vorgänge in bewegten Körpern" (*Nachr. Ges. Wiss. Göttingen* 1908, 53–111), which is the priority for the tensorial formulation of Maxwell's equations. Promote both as a bundled "Minkowski 1908/1909" entry. Strong c1.

**Einstein 1915 + 1916 — the Hilbert priority question.** Detailed adjudication in §4 below. Headline: Einstein has originator priority for the *physical theory*, Hilbert has originator priority for the *variational route* to the field equations. Both promote. Place Einstein 1915 ("Die Feldgleichungen der Gravitation", *Sitzungsberichte der Preussischen Akademie* 1915, 844–847, 25 November 1915) and Einstein 1916 ("Die Grundlage der allgemeinen Relativitätstheorie", *Ann. Phys.* 354(7), 769–822) as a bundled entry in `relativity/general/`; place Hilbert 1915 ("Die Grundlagen der Physik", *Nachr. Ges. Wiss. Göttingen* 1915, 395–407, presented 20 November 1915) as a separate entry in the same sub-fold. Strong c1 each.

**Schwarzschild 1916.** First exact solution of Einstein's field equations. The exact-solution result is canon (it is the originator priority for the Schwarzschild metric, the Schwarzschild radius, and the classical-tests precursor for the perihelion of Mercury and light bending). Strong c1.

### 1.6 Quantum mechanics

**Planck 1901 + Einstein 1905 photoelectric + Bohr 1913 trilogy + de Broglie 1924** — the early-quantum sub-fold opened above (§1.3, §1.5). The Bohr 1913 trilogy is "On the Constitution of Atoms and Molecules", *Phil. Mag.* (6) 26: Part I (151), 1–25; Part II (153), 476–502; Part III (155), 857–875 — three papers, single bundled entry. Promote. The de Broglie 1924 thesis is *Recherches sur la théorie des quanta* (Université de Paris, defended 25 November 1924; published *Ann. Phys.* (10) 3, 22–128, 1925); the originator priority for matter waves. Promote.

**Heisenberg 1925 — *Z. Phys.* 33, 879–893.** "Über quantentheoretische Umdeutung kinematischer und mechanischer Beziehungen." The originator priority for matrix mechanics. Already strong in pass-1.

**Born–Heisenberg–Jordan 1925/1926 — the *Z. Phys.* pair.** Two papers. Born and Jordan, "Zur Quantenmechanik" (*Z. Phys.* 34, 858–888, 1925) is the predecessor; Born, Heisenberg, and Jordan, "Zur Quantenmechanik II" (*Z. Phys.* 35, 557–615, 1926) is the *Dreimännerarbeit* that completes the matrix-mechanics formalism. Promote both as a bundled entry. The 1925 Born–Jordan paper introduces the canonical commutation relation `[q, p] = iħ` in matrix form; the 1926 three-author paper completes the formalism with the transformation theory. Strong c1.

**Schrödinger 1926 — four *Annalen* papers.** Pass-1 listed the series. Pass-2 picks the originator-paper resolution: the *first* paper of the series, "Quantisierung als Eigenwertproblem (Erste Mitteilung)" (*Ann. Phys.* 384(4), 361–376, 1926), is the originator priority for wave mechanics. The *second* (*Ann. Phys.* 384(6), 489–527) extends the method; the *third* (*Ann. Phys.* 385(13), 437–490) proves the equivalence of wave mechanics and matrix mechanics — itself a foundational result; the *fourth* (*Ann. Phys.* 386(18), 109–139) gives the time-dependent equation `iħ ∂ψ/∂t = Hψ`. The fourth paper is what every modern textbook calls "the Schrödinger equation"; the first paper introduces what the textbooks now call the time-independent equation. Both ends of the series matter. Promote as a bundled four-paper entry with the first and fourth flagged as the load-bearing originator papers and the third flagged as the wave-matrix equivalence proof. Strong c1.

**Born 1926 — the probability interpretation.** "Zur Quantenmechanik der Stossvorgänge" (*Z. Phys.* 37, 863–867, 1926) is the originator priority for the probability interpretation of `|ψ|²`; the follow-up (*Z. Phys.* 38, 803–827, 1926) extends to scattering. Promote. Strong c1.

**Heisenberg 1927 — uncertainty.** "Über den anschaulichen Inhalt der quantentheoretischen Kinematik und Mechanik" (*Z. Phys.* 43, 172–198, 1927). The originator priority for the uncertainty relations `ΔxΔp ≥ ħ/2`. Pass-1 omitted. **Promote.** Strong c1.

**Dirac 1928 + 1930 monograph (4th ed. 1958).** Two-paper relativistic-electron sequence: "The Quantum Theory of the Electron" (*Proc. Roy. Soc. A* 117, 610–624, 1928) and "The Quantum Theory of the Electron. Part II" (*Proc. Roy. Soc. A* 118, 351–361, 1928). The originator priority for the Dirac equation, spin as a relativistic consequence, and antimatter (predicted in the second paper, before the positron was found). The 1930 monograph *The Principles of Quantum Mechanics* (Clarendon, Oxford), fourth edition revised 1958 (ISBN 0-19-852011-5), is the originator-monograph c1 — see §4.4 of pass-1 and the chemistry-pass-3 precedent for Pauling 1960. Promote both. Strong c1 + c1 (monograph).

**Pauli 1925 — exclusion.** Already canon in pass-1. The originator priority for the exclusion principle as a many-electron postulate, `Z. Phys.` 31, 765–783. Cross-linked from `03-chemistry/periodicity/`. Strong c1.

**von Neumann 1932.** Detailed adjudication in §2 below. Headline: physics-side primary, math-side cross-link. Strong c1.

**Born–Oppenheimer 1927.** Already canon in pass-1, cross-linked from `03-chemistry/quantum-chemistry/`. Strong c1.

### 1.7 QED and QFT

**Tomonaga 1946 — "On a Relativistically Invariant Formulation of the Quantum Theory of Wave Fields", *Prog. Theor. Phys.* 1(2), 27–42.** Originator priority for the covariant formulation of QED. The 1946 date is the Japanese-language originator priority; the *Progress of Theoretical Physics* English version is itself the c2 edition-of-record (Tomonaga's own translation). Strong c1.

**Schwinger 1948 — three papers.** "Quantum Electrodynamics. I. A Covariant Formulation" (*Phys. Rev.* 74(10), 1439–1461, 1948); "II. Vacuum Polarization and Self-Energy" (*Phys. Rev.* 75(4), 651–679, 1949); "III. The Electromagnetic Properties of the Electron — Radiative Corrections to Scattering" (*Phys. Rev.* 76(6), 790–817, 1949). Originator priority for renormalized QED in covariant form. The three-paper sequence is canon as a bundle. Strong c1.

**Feynman 1949 — three papers.** "Theory of Positrons" (*Phys. Rev.* 76(6), 749–759); "Space-Time Approach to Quantum Electrodynamics" (*Phys. Rev.* 76(6), 769–789); "Mathematical Formulation of the Quantum Theory of Electromagnetic Interaction" (*Phys. Rev.* 80(3), 440–457, 1950). Originator priority for the diagrammatic approach to QED. The 1948 *Reviews of Modern Physics* paper "Space-Time Approach to Non-Relativistic Quantum Mechanics" (*Rev. Mod. Phys.* 20(2), 367–387) is the path-integral originator and is also canon — promote separately as a bundled-with entry. Strong c1.

**Dyson 1949 — "The Radiation Theories of Tomonaga, Schwinger, and Feynman", *Phys. Rev.* 75(3), 486–502.** The equivalence proof that unified the three approaches. Originator priority for the Dyson series and the renormalization-program formalization. Strong c1, no contest. The companion paper "The S Matrix in Quantum Electrodynamics" (*Phys. Rev.* 75(11), 1736–1755, 1949) is the originator priority for the S-matrix expansion and the operator-product handling that survives intact in modern textbook QFT; bundle the two Dyson 1949 papers as a single entry. The reason Dyson promotes alongside Tomonaga/Schwinger/Feynman rather than as derivative synthesis: the unification *is* the canonical content. Without Dyson there is no single QED, only three formalisms. The Schwinger–Feynman equivalence in particular was unobvious — Schwinger's covariant operator approach and Feynman's diagrammatic approach look nothing alike on the page — and the proof of equivalence is mechanism-tier originator content. The chemistry-pass-2 precedent for this kind of unification-as-canon is the Roothaan 1951 entry: a paper that makes earlier originator content (Hartree, Slater, Fock) computationally executable promotes on its own terms, not as derivative.

**Yang–Mills 1954 — *Phys. Rev.* 96(1), 191–195.** Originator priority for non-abelian gauge theory. Strong c1.

**Higgs 1964 + Englert–Brout 1964 + Guralnik–Hagen–Kibble 1964 — the multi-author question, adjudicated in §5.** Three independent papers in the same year. Headline: promote all three as a single bundled entry "1964 PRL Higgs-mechanism trio" with each paper individually citable. The Brout–Englert paper (*Phys. Rev. Lett.* 13(9), 321–323, received 26 June 1964, published 31 August 1964) is the priority by submission date; the Higgs paper (*Phys. Rev. Lett.* 13(16), 508–509, received 31 August 1964, published 19 October 1964) is independent; the Guralnik–Hagen–Kibble paper (*Phys. Rev. Lett.* 13(20), 585–587, received 12 October 1964, published 16 November 1964) is the third independent derivation, with the cleanest treatment of the Goldstone-boson absorption. PRL named the trio its "1964 milestone papers" in 2008. Strong c1 as a bundled entry.

### 1.8 Particle physics and the Standard Model

**Glashow 1961 — *Nucl. Phys.* 22(4), 579–588, "Partial-Symmetries of Weak Interactions."** Originator priority for the SU(2)×U(1) electroweak gauge structure. Strong c1.

**Weinberg 1967 — *Phys. Rev. Lett.* 19(21), 1264–1266, "A Model of Leptons."** Originator priority for the electroweak unification with Higgs mechanism applied to leptons. The 2½-page paper that won the 1979 Nobel for Weinberg, Salam, and Glashow. Strong c1.

**Salam 1968 — in N. Svartholm (ed.), *Elementary Particle Theory: Relativistic Groups and Analyticity (Proc. 8th Nobel Symposium)*, Almqvist & Wiksell, Stockholm, 367–377.** Independent originator priority for the same model, presented at the Lerum 1968 conference. Strong c1.

**Gross–Wilczek 1973 + Politzer 1973 — *Phys. Rev. Lett.* 30(26), 1343–1346 and 30(26), 1346–1349.** The asymptotic-freedom papers, back-to-back in the same PRL issue (25 June 1973). Joint Nobel 2004. Promote as a bundled entry. Strong c1.

**PDG *Review of Particle Physics* — most recent: R. L. Workman et al., *Phys. Rev. D* 110, 030001 (2024).** Discipline-standard normative reference. Strong c3 in `reference/`.

### 1.9 Condensed matter

**BCS 1957 — Bardeen, Cooper, Schrieffer, "Theory of Superconductivity", *Phys. Rev.* 108(5), 1175–1204.** Originator priority for the BCS theory. Strong c1.

**Anderson 1958 — *Phys. Rev.* 109(5), 1492–1505, "Absence of Diffusion in Certain Random Lattices."** Originator priority for Anderson localization — the demonstration that disorder above a critical threshold suppresses electron diffusion entirely, the substrate for the modern understanding of metal–insulator transitions and the precursor to scaling theories of localization (Abrahams–Anderson–Licciardello–Ramakrishnan 1979 is the four-author follow-up; pass-2 lean is **landscape**, not canon, because the originator priority for *localization itself* is the 1958 paper and the 1979 paper is the scaling formulation). The Anderson 1958 paper also has independent originator standing as the first physics application of what would later be called *random-matrix theory* in the disordered-systems context. Strong c1.

**Anderson 1972 — "More Is Different", *Science* 177(4047), 393–396.** Pass-1 omitted; pass-2 lean is **landscape, not canon**, because the paper is a perspective essay, not a primary theoretical result. The emergence-and-hierarchy argument is foundational *in spirit* but the README's promotion rule for c1 wants a "primary theoretical paper or monograph by the originator of the law, principle, or framework"; the 1972 essay is a programmatic statement, not a derivation. The chemistry-pass-2 precedent is Cotton 1990 (omitted from canon despite Cotton's stature) on the same logic. Cite from the Anderson 1958 entry stub as a forward-pointer to the philosophical position; do not promote.

**Wilson 1971/1975 — RG.** Pass-1 listed the *Phys. Rev. B* 4(9) pair (3174–3183 and 3184–3205, 1971) and the *Rev. Mod. Phys.* 47(4), 773–840 (1975) Kondo-problem paper. Pass-2 ratifies. The 1971 papers are the originator priority for the modern RG; the 1975 paper is the originator priority for the numerical RG and the Kondo solution. Bundle as "Wilson 1971/1975 RG". Strong c1. Cross-link to `quantum-field-theory/` (RG underwrites the Wilsonian view of QFT itself).

**Ginzburg–Landau 1950 — V. L. Ginzburg and L. D. Landau, "K teorii sverkhprovodimosti", *Zh. Eksp. Teor. Fiz.* 20, 1064–1082 (1950); English translation in D. ter Haar (ed.), *Collected Papers of L. D. Landau*, Pergamon, 1965.** Pass-1 flagged this as a Landau-Lifshitz carve-out. Pass-2 promotes. Originator priority for the macroscopic order-parameter theory of superconductivity, the precursor and macroscopic complement to BCS. Strong c1.

**Landau 1957 Fermi-liquid theory — L. D. Landau, "The Theory of a Fermi Liquid", *Zh. Eksp. Teor. Fiz.* 30, 1058–1064 (1956); English translation *Sov. Phys. JETP* 3, 920–925 (1957).** Pass-1 carve-out. Pass-2 promotes. Originator priority for the quasiparticle concept that organizes essentially all metal physics. The companion papers "Oscillations in a Fermi Liquid" (*Zh. Eksp. Teor. Fiz.* 32, 59–66, 1957; English in *Sov. Phys. JETP* 5, 101) and "On the Theory of a Fermi Liquid" (*Zh. Eksp. Teor. Fiz.* 35, 97–103, 1958; English in *Sov. Phys. JETP* 8, 70) extend the framework to zero-sound and to interaction-vertex calculations and bundle into the same entry. The Landau Fermi-liquid framework is the substrate for *every* later refinement (Luttinger liquids, non-Fermi liquids, marginal Fermi liquids, the Hertz–Millis theory of quantum criticality); without it the modern condensed-matter vocabulary does not exist. The reason this clears the README c1 bar where Landau–Lifshitz *Course* does not (per pass-1 §4.1 honest take): the originator content is in the 1957 *JETP* paper, not in the textbook — Landau himself wrote no monograph on Fermi-liquid theory. Strong c1.

**Kosterlitz–Thouless 1973 — J. M. Kosterlitz and D. J. Thouless, "Ordering, Metastability and Phase Transitions in Two-Dimensional Systems", *J. Phys. C* 6(7), 1181–1203 (1973).** Pass-1 omitted. Pass-2 promotes. Originator priority for the topological phase transition (BKT transition) in 2D systems and the vortex-unbinding mechanism. Joint Nobel 2016 (with Haldane). The earlier Berezinskii 1971 paper (*Zh. Eksp. Teor. Fiz.* 61, 1144) is the independent priority on the Russian side; bundle as "Berezinskii 1971 + Kosterlitz–Thouless 1973 BKT transition", same multi-author pattern as Higgs §5. Strong c1.

**Haldane 1983 — F. D. M. Haldane, "Continuum Dynamics of the 1-D Heisenberg Antiferromagnet" (*Phys. Lett. A* 93(9), 464–468) and "Nonlinear Field Theory of Large-Spin Heisenberg Antiferromagnets" (*Phys. Rev. Lett.* 50(15), 1153–1156).** Pass-1 omitted. Pass-2 lean is **borderline-strong**. The Haldane gap and the integer-vs-half-integer-spin distinction are originator priority for topological phases of matter in 1D, and the work is the conceptual predecessor of every later topological-insulator framework (the 2005–2008 Kane–Mele, Bernevig–Hughes–Zhang papers). The argument against canon promotion at the same level as BCS or Anderson 1958: the topological-phases program is mid-stream, not closed; the canonical formulation is still being written. Pass-2 lean: **promote with a "framework still consolidating" note in the entry stub**, on the same logic chemistry-pass-3 used for pericyclic / orbital symmetry. Strong-borderline c1.

### 1.10 Cosmology cross-link

The candidates pass-1 flagged for `06-cosmology/`: Friedmann 1922 ("Über die Krümmung des Raumes", *Z. Phys.* 10, 377–386); Lemaître 1927 ("Un Univers homogène de masse constante et de rayon croissant rendant compte de la vitesse radiale des nébuleuses extra-galactiques", *Annales de la Société Scientifique de Bruxelles* A 47, 49–59); Hubble 1929 ("A Relation between Distance and Radial Velocity among Extra-Galactic Nebulae", *Proc. Natl. Acad. Sci.* 15, 168–173); Penzias–Wilson 1965 ("A Measurement of Excess Antenna Temperature at 4080 Mc/s", *Astrophys. J.* 142, 419–421).

**Pass-2 decision: cosmology-primary, physics cross-link.** None of the four enter `02-physics/`. Friedmann 1922 is the FLRW metric (a cosmological model); Lemaître 1927 is the expanding-universe solution and the originator priority for what is mis-called Hubble's law; Hubble 1929 is the observational confirmation; Penzias–Wilson 1965 is the CMB discovery. All four are cosmology-primary by the chemistry-pass-3 §5 originator-framing rule. The `06-cosmology/` branch is not yet open; pass-2 flags these four as the seed entries for that branch. The `02-physics/relativity/general/` Einstein 1915/1916 entry stub will cite Friedmann 1922 as the first physical solution beyond Schwarzschild, with a forward-pointer to `06-cosmology/`.

---

## 2. Adjudicating von Neumann 1932 from the physics side

The math pass-1 §4.5 flagged the question; chemistry already cross-links from `03-chemistry/quantum-chemistry/`; physics pass-1 placed the canonical entry here. Pass-2 ratifies physics primary, math cross-link, and writes out the reasoning so pass-3 has a binding argument.

The text. *Mathematische Grundlagen der Quantenmechanik*, Springer, Berlin, 1932; English ed. R. T. Beyer (tr.), *Mathematical Foundations of Quantum Mechanics*, Princeton University Press, 1955; revised 2018 ed. by N. A. Wheeler (ISBN 978-0-691-17856-1). The book builds, in a single sweep, four foundational structures: (a) the Hilbert-space axiomatization of QM, including the resolution of the equivalence between Heisenberg matrix mechanics (`l²`) and Schrödinger wave mechanics (`L²(ℝ³)`) as a unitary equivalence between two realizations of the same separable Hilbert space; (b) the spectral theorem for unbounded self-adjoint operators (the version Stone proved independently in 1932); (c) the projection postulate and the von Neumann measurement scheme, with the type-I-vs-type-II measurement distinction; (d) the density-matrix formalism and the introduction of the trace as the operational expectation-value functional.

The argument for math primary. Items (a) and (b) are pure mathematics. The Hilbert-space axiomatization, once stated, is independent of any physical content — it is a chapter of functional analysis. The spectral theorem for unbounded self-adjoint operators is a result in operator theory that has standalone uses in PDE theory and ergodic theory; it would be canon in math even if no physicist had ever read it.

The argument for physics primary. Items (c) and (d) are physics. The projection postulate is a *physical* postulate about what happens to a quantum state under measurement; the density matrix is a physical object that encodes mixed states of a physical system. The book's explanandum is the foundations of *quantum mechanics*; the title says so. The originator framing is unambiguously physics — the introduction explicitly motivates the abstract Hilbert-space axiomatization as a *unification* of Heisenberg and Schrödinger, both physical theories. Items (a) and (b) are means; items (c) and (d) are ends.

**Decision: physics primary, math cross-link.** Same call math pass-1 §3 made by the originator-framing rule (the test: "a text belongs to mathematics if it can be read without reference to a physical phenomenon"). Von Neumann 1932 fails the test — the entire structure is built to axiomatize a physical theory. The Hilbert-space machinery has independent mathematical life, but that is what cross-links are for: math holds a cross-link entry in `01-mathematics/functional-analysis/` pointing to `02-physics/quantum-mechanics/von-neumann-1932/`, and the entry stub in functional analysis explicitly notes "operator-theory machinery in service of a physical axiomatization; see also Banach 1932 *Théorie des opérations linéaires* for the contemporaneous pure-math originator monograph."

The decision is symmetric with the chemistry-pass-3 §5.1 boundary rule for Hohenberg–Kohn 1964 (physics primary, chemistry cross-link, because the originator framing is "two abstract theorems on density functionals, not specific to chemistry") inverted — same machinery, different originator framing. Both readings of "originator framing" are consistent with the README. Strong c1 in physics, no canonical entry in math (cross-link only).

---

## 3. Adjudicating experimental-primary papers

Pass-1 §4.5 flagged Michelson–Morley 1887, Davisson–Germer 1927, Wu et al. 1957, and the cosmological observations (COBE, WMAP, Planck) as candidates for promotion under c4 ("experimental paper that established a fundamental constant or falsified a candidate law at the foundational level"). Pass-1 lean was "mix in" — bundle each experimental paper with the theory paper it tested, on the chemistry-pass-3 precedent that placed Bragg & Bragg 1913 in `03-chemistry/crystallography/` rather than a separate experimental fold.

Pass-2 ratifies the "mix in" decision and writes the operational rule. There are two operational moves: bundling and sub-foldering.

The bundling rule. Each c4 experimental paper is promoted as a *separate entry* (not as a footnote to the theory paper) but lives in the *same sub-fold* as the theory paper it tested. Michelson–Morley 1887 (*American Journal of Science* (3) 34, 333–345) → `relativity/special/` alongside Einstein 1905, with the entry stub flagging that the null result is the experimental priority for the absence of a luminiferous aether and predates the theory by 18 years (originator priority on a falsification, not on a confirmation). Davisson–Germer 1927 (*Phys. Rev.* 30(6), 705–740) → `quantum-mechanics/early-quantum/` alongside de Broglie 1924, as the experimental confirmation of matter waves. Wu et al. 1957 (*Phys. Rev.* 105(4), 1413–1415) → `particle-physics/` (in a new sub-fold `weak-interactions/` that holds the Lee–Yang 1956 theory paper alongside) — the experimental priority for parity violation. Millikan oil-drop 1913 (*Phys. Rev.* (2) 2, 109–143) → `electromagnetism/` cross-linked to `reference/` (it established the elementary charge as a fundamental constant and is the historical origin of the CODATA-tracked value of `e`).

The sub-fold rule. **No dedicated `experimental/` sub-fold.** Reasoning: (a) the chemistry-branch precedent placed Bragg & Bragg 1913 in `crystallography/` not `experimental/`; (b) the cohort is small (4–6 experimental papers in the entire branch), not large enough to justify a separate house; (c) bundling experimental and theoretical primaries by topic preserves the reader's mental model — the user looking for "the special-relativity foundation papers" wants Michelson–Morley alongside Einstein 1905, not in two separate folds. The cost is that the sub-folds become topic-mixed (theory + experiment); the benefit is that the topic stays coherent.

The cosmological-observations cohort. Pass-1 already correctly identified that COBE (Mather et al. 1990, *Astrophys. J. Lett.* 354, L37; Smoot et al. 1992, *Astrophys. J. Lett.* 396, L1), WMAP (Bennett et al. 2003, *Astrophys. J. Suppl.* 148, 1), and Planck collaboration 2018 (*Astron. Astrophys.* 641, A6) belong in `06-cosmology/observational/`, not here. Penzias–Wilson 1965 likewise. Pass-2 ratifies — they do not enter `02-physics/`.

**Final placement of c4 experimental papers in `02-physics/`:** Michelson–Morley 1887 in `relativity/special/`; Davisson–Germer 1927 in `quantum-mechanics/early-quantum/`; Wu et al. 1957 in `particle-physics/weak-interactions/`; Millikan 1913 in `electromagnetism/` (with reference/ cross-link). No dedicated experimental sub-fold.

---

## 4. Adjudicating the Hilbert/Einstein 1915 priority question

The facts. Einstein presented "Die Feldgleichungen der Gravitation" to the Prussian Academy on 25 November 1915 (*Sitzungsberichte der Preussischen Akademie* 1915, 844–847); Hilbert presented "Die Grundlagen der Physik" to the Göttingen Royal Society on 20 November 1915 (*Nachr. Ges. Wiss. Göttingen* 1915, 395–407, published 1916). On submission date, Hilbert is five days earlier; on print-publication date the question is murkier because of typesetting differences. Both derived the field equations for the gravitational metric, sourced by a stress-energy tensor, with the Einstein tensor `G_μν = R_μν - ½ g_μν R` on the left side. Hilbert's derivation was variational, from an action principle (the first explicit use of what is now called the Einstein-Hilbert action `S = ∫ R √-g d⁴x`); Einstein's derivation was a long path through the equivalence principle, the requirement of general covariance, and the Bianchi identities.

The 1997 Corry–Renn–Stachel paper ("Belated Decision in the Hilbert–Einstein Priority Dispute", *Science* 278, 1270–1273) examined the printer's proofs of Hilbert's paper and showed that the proof Hilbert submitted on 20 November contained the action principle but did *not* contain the field equations in the explicit form `G_μν = κ T_μν`; that form was added by Hilbert in a December revision, after Einstein's 25 November announcement. The print version of Hilbert's paper as published in 1916 contains the equations in the post-Einstein form, but the 20 November submission did not. This resolves the priority dispute: Einstein has originator priority for the *physical theory* and the explicit field equations; Hilbert has originator priority for the *variational route* and the Einstein–Hilbert action.

**Decision.** Promote both. Einstein 1915 (the 25 November short paper) and Einstein 1916 (the long *Annalen* review) form one bundled entry "Einstein 1915/1916 GR" in `relativity/general/`. Hilbert 1915 is a separate entry "Hilbert 1915 — Variational Foundations of GR" in the same sub-fold, with the entry stub explicitly citing Corry–Renn–Stachel 1997 and noting that the variational route is independent originator priority but the field equations as such are Einstein's. The general-relativity sub-fold thus holds three primary entries (Einstein, Hilbert, Schwarzschild) with no priority hedge — both Einstein and Hilbert get full c1 promotion on different mechanism-level claims.

This is the same pattern the Higgs trio uses (§5): multiple independent originators with different mechanism-level priorities all promote, with the entry stubs disambiguating. The pattern matters because Bucket's promotion rule favours originator priority but does not assume single originators — when two researchers independently arrive at adjacent results, both are originators on the parts they originated.

---

## 5. Adjudicating the Higgs 1964 multi-author problem

The three papers. Englert and Brout, "Broken Symmetry and the Mass of Gauge Vector Mesons" (*Phys. Rev. Lett.* 13(9), 321–323, received 26 June 1964, published 31 August 1964); Higgs, "Broken Symmetries and the Masses of Gauge Bosons" (*Phys. Rev. Lett.* 13(16), 508–509, received 31 August 1964, published 19 October 1964); Guralnik, Hagen, and Kibble, "Global Conservation Laws and Massless Particles" (*Phys. Rev. Lett.* 13(20), 585–587, received 12 October 1964, published 16 November 1964). Three independent derivations of the same mechanism, in the same journal, in the same calendar year, by six authors who had not coordinated.

The disambiguating content. Brout–Englert (1) state the mechanism in terms of a complex scalar field with a Mexican-hat potential coupled to gauge bosons, give a one-loop graphical demonstration that the gauge boson acquires mass, and do *not* explicitly identify the surviving massive scalar (the "Higgs boson"). Higgs (2) is the originator priority for the surviving massive scalar — the third paragraph of the two-page note explicitly identifies the residual mode as a physical particle. Guralnik–Hagen–Kibble (3) is the originator priority for the *gauge-invariant* derivation that shows how the would-be Goldstone boson is absorbed into the longitudinal polarization of the gauge boson — the cleanest treatment of the mechanism's compatibility with the Goldstone theorem. The three papers are independent on submission date; the citations between them in print are post-hoc additions in proof. The 2013 Nobel was awarded to Englert and Higgs; Brout had died in 2011; Guralnik, Hagen, and Kibble received the J. J. Sakurai Prize 2010 for the same work.

**Decision.** Promote all three as a single bundled entry "1964 PRL Higgs-mechanism trio" in `quantum-field-theory/`, with each paper individually citable in the entry stub and each cohort's mechanism-level priority disambiguated in the stub:

- Brout–Englert 1964: priority for the gauge-boson-mass mechanism in a relativistic gauge theory with a complex scalar
- Higgs 1964: priority for the explicit identification of the massive scalar (the "Higgs boson")
- Guralnik–Hagen–Kibble 1964: priority for the gauge-invariant derivation showing Goldstone-boson absorption

The PRL bundle is the right organizational unit because the three papers are conventionally cited together and the 50th-anniversary 2008 PRL "milestone papers" designation made the bundling official from PRL's side. A single Higgs entry with the other two as co-citations would systematically under-cite Brout–Englert (the priority by submission date) and Guralnik–Hagen–Kibble (the cleanest derivation). All three originators get full c1 promotion on different mechanism-level priorities, in the same pattern as Einstein/Hilbert §4 above.

The same bundling logic will apply downstream when `quantum-field-theory/` opens up its sub-folds: Glashow 1961 + Weinberg 1967 + Salam 1968 is also a multi-author bundle with the three papers individually citable.

---

## 6. Cross-branch coherence map

Every cross-link in and out of `02-physics/`, exhaustive. Pass-3 will produce the binding `CROSS_LINKS.md`; this is the source of truth pass-3 inherits.

**Out of `02-physics/` → into `01-mathematics/`:**

| Physics entry | Math sub-fold | Reason |
|---|---|---|
| `classical-mechanics/noether-1918` | `calculus-of-variations/` | The proof is a result in calculus of variations; math holds a cross-link, not the canonical entry |
| `quantum-mechanics/von-neumann-1932` | `functional-analysis/` | Operator-theory and Hilbert-space machinery; math cross-link only (see §2) |
| `relativity/general/einstein-1915` | `differential-geometry/` | Uses Riemann 1854/1868 and Ricci–Levi-Civita 1900 |
| `quantum-field-theory/yang-mills-1954` | `differential-geometry/fibre-bundles/` | Non-abelian gauge theory is fibre-bundle theory in modern language |
| `condensed-matter/wilson-rg-1971/1975` | (no canonical math cross-link) | The RG fixed-point machinery is physics-originator |

**Out of `02-physics/` → into `03-chemistry/`:**

| Physics entry | Chemistry sub-fold | Reason |
|---|---|---|
| `quantum-mechanics/schrödinger-1926` | `quantum-chemistry/` | Schrödinger equation as substrate for VB and MO theory |
| `quantum-mechanics/dirac-1928` | `quantum-chemistry/` | Spin-orbit coupling, relativistic effects in heavy atoms |
| `quantum-mechanics/pauli-1925` | `periodicity/` | Exclusion principle and the periodic table |
| `quantum-mechanics/born-oppenheimer-1927` | `quantum-chemistry/` | Adiabatic separation underlies all of computational chemistry |
| `statistical-mechanics/boltzmann-1872/1877` | `thermodynamics/` | Microscopic foundation of chemical thermodynamics |
| `statistical-mechanics/gibbs-1902` | `thermodynamics/` | Ensemble formulation; chemistry-side primary is Gibbs 1875–78 |
| `electromagnetism/maxwell-1865/treatise-1891` | `spectroscopy/` | Light as electromagnetic radiation underwrites all of spectroscopy |
| `quantum-mechanics/early-quantum/bohr-1913` | `periodicity/` | Atomic-shell structure as the originator priority for the modern periodic table |

**Out of `02-physics/` → into `04-information/`:**

| Physics entry | Information sub-fold | Reason |
|---|---|---|
| `quantum-mechanics/von-neumann-1932` | `quantum-information/` | Density-matrix formalism and projection postulate are quantum-information substrate |
| `statistical-mechanics/boltzmann-1872/1877` | `information-theory/` | Gibbs/Boltzmann entropy non-conflation with Shannon entropy (info pass-1 §3.1, chem pass-3 §5.4) |
| `statistical-mechanics/gibbs-1902` | `information-theory/` | Same |

**Out of `02-physics/` → into `05-biophysics/`:** none direct. The Schrödinger 1944 *What Is Life?* monograph is biophysics-side under the originator-framing rule. Mitchell 1961 chemiosmosis is biophysics-side (chemistry pass-3 §5.3).

**Out of `02-physics/` → into `06-cosmology/`:**

| Physics entry | Cosmology sub-fold | Reason |
|---|---|---|
| `relativity/general/einstein-1915` | (cosmology root) | Field equations as the substrate for FLRW |
| `relativity/general/schwarzschild-1916` | `black-holes/` | First exact solution; underwrites Schwarzschild-radius classical tests |
| `quantum-field-theory/yang-mills-1954` | `inflation-and-particle-cosmology/` | Gauge theories underwrite inflation models |

The cosmology branch is not yet open; pass-2 flags Friedmann 1922, Lemaître 1927, Hubble 1929, Penzias–Wilson 1965 as the seed entries (§1.10).

**Out of `02-physics/` → into `07-mind/`:** none. The "physics of consciousness" literature (Penrose, Hameroff, etc.) is landscape, not canon, and does not enter either branch.

**Into `02-physics/` from `01-mathematics/`:**

| Math entry | Physics sub-fold receiving the cross-link | Reason |
|---|---|---|
| `differential-geometry/riemann-1854/1868` | `relativity/general/` | Manifolds, metric, sectional curvature |
| `differential-geometry/ricci-levi-civita-1900` | `relativity/general/` | The tensor calculus Einstein used |
| `analysis/lebesgue-1902` | `quantum-mechanics/` | `L²` measure-theoretic substrate |
| `functional-analysis/banach-1932` | `quantum-mechanics/` | Banach-space substrate; companion to von Neumann 1932 |
| `algebra/lie-groups` (when opened) | `quantum-field-theory/yang-mills-1954` | SU(N) groups |

**Into `02-physics/` from `03-chemistry/`:** none direct (chemistry is downstream of QM, not upstream). The chemistry primaries cite physics; physics does not cite chemistry primaries.

**Into `02-physics/` from `04-information/`:**

| Information entry | Physics sub-fold | Reason |
|---|---|---|
| `quantum-information/feynman-1982` | `quantum-mechanics/` | "Simulating Physics with Computers" — the originator priority for quantum simulation |
| `quantum-information/deutsch-1985` | `quantum-mechanics/` | Quantum Turing machine; substrate-borrowing |
| `information-theory/jaynes-1957` | `statistical-mechanics/` | Information-theoretic statmech as bridge text (info pass-1, chem pass-3 §5.4) |

The Jaynes 1957 placement is information-primary (per chem pass-3 §5.4) with a physics cross-link; the originator framing is information-theoretic.

**Into `02-physics/` from `06-cosmology/` (when opened):**

| Cosmology entry | Physics sub-fold | Reason |
|---|---|---|
| `friedmann-1922` | `relativity/general/` | First non-Schwarzschild exact-solution family |
| `cmb/penzias-wilson-1965` | (none — c4 experimental but cosmology-framed; no physics cross-link needed) | |

Total cross-link count: **17 outgoing, 7 incoming**. Pass-3 produces the binding `CROSS_LINKS.md` from this table.

---

## 7. Recommended frozen tree for pass-3

Pass-1 §2 proposed the tree; pass-2 modifies four things and freezes the result for pass-3 ratification.

Modifications relative to pass-1 §2:

- (M1) Add `quantum-mechanics/early-quantum/` as a sub-fold for Planck 1901, Einstein 1905 photoelectric, Bohr 1913, de Broglie 1924, Davisson–Germer 1927. Reasoning: pass-1 listed these in `thermodynamics/` (Planck) and `relativity/special/` (Einstein 1905 trio) and in flat `quantum-mechanics/` (Bohr, de Broglie); pass-2 §1.3, §1.5, §1.6 collects them as the early-quantum cohort, and the sub-fold is justified by the dependency structure (Planck → Einstein → Bohr → de Broglie → Heisenberg/Schrödinger).
- (M2) Add `particle-physics/weak-interactions/` as a sub-fold for Lee–Yang 1956 + Wu et al. 1957. Reasoning: pass-2 §3 promotes Wu 1957 as a c4 experimental primary and bundles it with Lee–Yang 1956 (the theory paper, *Phys. Rev.* 104(1), 254–258); a dedicated sub-fold cleanly separates parity-violation from electroweak-unification.
- (M3) `relativity/general/` holds three primary entries (Einstein 1915/1916, Hilbert 1915, Schwarzschild 1916), with the priority resolution from §4 in the entry stubs. No additional sub-fold structure needed.
- (M4) Move Planck 1901 from `thermodynamics/` to `quantum-mechanics/early-quantum/`. The thermodynamics-branch citation pointer is preserved in the thermodynamics sub-fold's `CROSS_LINKS.md`.

Frozen tree:

```
02-physics/
  README.md
  CANON_INDEX.md
  CROSS_LINKS.md                                     (pass-3 produces from §6)
  _intake/
    physics-canon-pass-1-2026-05-01.md
    physics-canon-pass-2-2026-05-01.md               (this file)
    cross-cutting-bundles.md                         (pass-3; "Einstein 1905 Annus Mirabilis", "1964 PRL Higgs trio")
  classical-mechanics/                               Newton 1687, Lagrange 1788/1811, Hamilton 1834/1835,
                                                     Jacobi 1866, Noether 1918
  electromagnetism/                                  Faraday 1831–1855, Maxwell 1865 + Treatise 1891,
                                                     Heaviside 1893–1912, Lorentz 1892/1895/1909,
                                                     Millikan 1913 (c4)
  thermodynamics/                                    Carnot 1824 + Clapeyron 1834, Clausius 1850/1854/1865,
                                                     Kelvin 1851/1852, Helmholtz 1847
                                                     (Gibbs 1875–78 cross-link from chemistry)
  statistical-mechanics/                             Maxwell 1860, Boltzmann 1872/1877,
                                                     Gibbs 1902, Einstein 1905 (Brownian), Onsager 1931
  relativity/
    special/                                         Einstein 1905 (Zur Elektrodynamik + E=mc²),
                                                     Minkowski 1908/1909, Michelson–Morley 1887 (c4)
    general/                                         Einstein 1915 + 1916, Hilbert 1915, Schwarzschild 1916
                                                     (Friedmann 1922 cross-link from cosmology)
  quantum-mechanics/
    early-quantum/                                   Planck 1901, Einstein 1905 (photoelectric),
                                                     Bohr 1913 trilogy, de Broglie 1924,
                                                     Davisson–Germer 1927 (c4)
    (root)                                           Heisenberg 1925, Born–Heisenberg–Jordan 1925/1926,
                                                     Schrödinger 1926 (4 papers), Born 1926,
                                                     Heisenberg 1927 (uncertainty), Pauli 1925,
                                                     Born–Oppenheimer 1927, Dirac 1928 + monograph 1958,
                                                     von Neumann 1932
  quantum-field-theory/                              Tomonaga 1946, Schwinger 1948 trio,
                                                     Feynman 1948 (path integral) + 1949 trio,
                                                     Dyson 1949, Yang–Mills 1954,
                                                     1964 PRL Higgs-mechanism trio
                                                     (Brout–Englert + Higgs + Guralnik–Hagen–Kibble)
  particle-physics/
    electroweak/                                     Glashow 1961, Weinberg 1967, Salam 1968
    qcd/                                             Gross–Wilczek 1973 + Politzer 1973
    weak-interactions/                               Lee–Yang 1956, Wu et al. 1957 (c4)
  condensed-matter/                                  BCS 1957, Anderson 1958, Wilson 1971/1975 RG,
                                                     Ginzburg–Landau 1950, Landau 1957 (Fermi liquid)
  reference/                                         CODATA 2022 (Tiesinga et al. 2024),
                                                     BIPM SI 9th ed. 2019, PDG Workman et al. 2024
  _landscape/
    textbooks.md                                     Landau–Lifshitz, MTW, Wald, Sakurai,
                                                     Jackson, Griffiths, Peskin–Schroeder, Weinberg QFT,
                                                     Halliday–Resnick, Feynman Lectures
```

Total canon entries in the frozen tree: approximately **52 primary entries** (38 strong from pass-1 + 14 added by pass-2: Maxwell 1865, Maxwell 1860 distribution, Kelvin 1851/1852, Carnot–Clapeyron paired, Bohr 1913, de Broglie 1924, Heisenberg 1927, Feynman 1948 path integral, Guralnik–Hagen–Kibble 1964, Ginzburg–Landau 1950, Landau 1957, Lee–Yang 1956, Wu 1957, Millikan 1913) plus **3 c3 reference entries** (CODATA, BIPM, PDG).

Pass-3 will: (a) seed `CANON_INDEX.md` with the row-per-entry that pass-1 already started; (b) write `CROSS_LINKS.md` from §6; (c) write `cross-cutting-bundles.md` for the Einstein 1905 Annus Mirabilis and 1964 PRL Higgs trio; (d) write per-entry stubs at the rate the maintainer can sustain (chemistry pass-3 wrote 12 in one session as the cadence reference); (e) close pass-2's open contestable items if any remain (none flagged).

---

## 8. Reference-works deep dive

**CODATA 2022 — Tiesinga, Mohr, Newell, Taylor, *Rev. Mod. Phys.* 96, 025002 (2024).** The c3 mechanism is the same as IUPAC Gold Book in chemistry: a discipline-standard normative reference with an unambiguous custodial body (CODATA Task Group on Fundamental Constants, established 1969) and a published-on-fixed-cadence revision schedule (every four years since 1998; CODATA 1998, 2002, 2006, 2010, 2014, 2018, 2022). The 2022 adjustment is the post-redefinition reference (the SI redefinition of 20 May 2019 fixed `h`, `e`, `k_B`, `N_A` to exact values, so the CODATA values for those constants are now defined exactly and the recommended-values table tracks the *measured* derived constants — the gravitational constant `G`, the proton-electron mass ratio, the fine-structure constant `α`). Promote the 2024 *Rev. Mod. Phys.* paper as the c3 entry-of-record; entry stub flags that subsequent CODATA adjustments supersede automatically.

**BIPM SI brochure 9th edition (2019) plus updates.** International Bureau of Weights and Measures, *The International System of Units (SI)*, Sèvres, 2019. The c3 normative reference for the unit system itself. The 9th edition is the *post-redefinition* edition; the 8th edition (2006/2014 corrections) is now historical. Promote the 9th edition; entry stub notes the redefinition mechanism.

**PDG *Review of Particle Physics* — Workman et al. 2024, *Phys. Rev. D* 110, 030001 + the live online version at pdg.lbl.gov.** Discipline-standard normative reference for particle properties, decay modes, cross-sections, the Standard Model parameter table, and the master review articles on every active sub-field. Biennial cadence in *Phys. Rev. D* (even years) with continuous online updates between print editions. The c3 mechanism is identical to CODATA. Promote.

**Why these three and not more.** Pass-2 considered four other candidates and rejected each. The IAU resolutions on astronomical constants (e.g. the 2015 redefinition of the astronomical unit) are landscape-tier — they are normative for astronomy, not for physics-as-a-discipline, and `06-cosmology/reference/` will hold them when that branch opens. The IUPAP recommendations on symbols and units for physical quantities are landscape-tier — they are advisory, not custodial. The NIST Atomic Spectra Database and the LAMP ATOMIC database are working data resources, not normative references; cite as pointers under `electromagnetism/spectroscopy/` cross-link, not promote. The Particle Data Group's *Review of Particle Physics* already absorbs everything the PDB-equivalents in other sub-fields would normatively contain.

The reference sub-fold thus holds exactly three primary entries — CODATA 2022, BIPM SI 9th, PDG Workman 2024 — paralleling the chemistry-pass-3 reference sub-fold's exactly-one entry (IUPAC Gold Book). The discipline-asymmetry (physics needs three, chemistry needs one) reflects the fact that physics is the discipline whose subject matter includes *the units and constants of measurement themselves*; chemistry inherits its units from physics and only needs to standardize its naming and notation conventions.

---

## 9. Borderline / under-contest re-adjudications

Pass-1 §4 listed five contested calls. Pass-2 closes each.

**4.1 Landau–Lifshitz *Course of Theoretical Physics*.** Pass-1 lean: landscape with named carve-outs. Pass-2 ratifies. The carve-outs Pass-2 promoted: Ginzburg–Landau 1950 (§1.9), Landau 1957 Fermi-liquid (§1.9). Carve-outs pass-2 considered and rejected: Landau damping 1946 (originator content is the linearized-Vlasov-equation analysis; promote-as-entry would require Landau's *Zh. Eksp. Teor. Fiz.* 16, 574, 1946 paper, which is borderline c1 because the result was anticipated by Vlasov 1938 and the priority is contested — pass-2 lean: **landscape**). Landau levels 1930 (originator content is the Landau-level quantization of cyclotron motion; promote-as-entry would require *Z. Phys.* 64, 629, 1930; pass-2 lean: **borderline-strong**, with promotion deferred to pass-3 maintainer call because the result is a special-case derivation rather than a foundation-tier framework). The *Course* itself stays in `_landscape/textbooks.md`.

**4.2 MTW *Gravitation* (1973).** Pass-1 lean: landscape. Pass-2 ratifies. The Wheeler originator content (geometrodynamics, the wormhole metric, the ADM formulation co-authored with Arnowitt and Deser) is in primary papers that promote separately: ADM 1962 ("The Dynamics of General Relativity", in L. Witten ed., *Gravitation: An Introduction to Current Research*, Wiley, New York, 227–265) is borderline-strong c1, deferred to pass-3 maintainer call. The MTW textbook itself is landscape.

**4.3 Feynman *Lectures on Physics* (1963–1965).** Pass-1 lean: landscape. Pass-2 ratifies. Feynman's path-integral originator paper (1948, *Rev. Mod. Phys.* 20(2), 367–387) is promoted under `quantum-field-theory/` (§1.7); the *Lectures* themselves are pedagogical synthesis. The argument that Vol. III contains originator path-integral exposition is correct but the originator priority is the 1948 RMP paper, not the lecture. Lectures stay in `_landscape/textbooks.md`.

**4.4 Dirac *Principles of Quantum Mechanics* (1958, 4th ed.).** Pass-1 lean: canon. Pass-2 ratifies, on the chemistry-pass-3 §3.1 precedent for Pauling 1960. The originator-monograph-by-the-originator pattern promotes — the bra-ket notation, the transformation theory, and the Dirac delta are originator content first systematized in this book.

**4.5 Experimental foundation papers — adjudicated in §3 above.** Mix-in confirmed.

Two new contestable items pass-2 introduces and resolves:

**4.6 Path-integral originator monograph: Feynman–Hibbs *Quantum Mechanics and Path Integrals* (McGraw-Hill, 1965; Dover emended ed. 2010, ISBN 978-0-486-47722-0).** Pass-2 lean: **landscape**, not canon. The originator content is in Feynman 1948 *RMP*; the textbook is the systematized exposition by an originator (parallel to the Dirac monograph case but failing it on one axis: Feynman wrote the originator paper and the textbook restates it pedagogically without adding new mechanism-tier content, whereas Dirac's monograph extends the originator content beyond the 1925–28 papers). Cite from the Feynman 1948 RMP entry stub; do not promote.

**4.7 The Schrödinger 1944 *What Is Life?* monograph.** Pass-2 lean: **biophysics-side, not physics-side**. Originator framing per chem pass-3 §5.3 rule: Schrödinger framed the result as a question about biology (the chromosome as an aperiodic crystal, negative entropy as the thermodynamic substrate of life), not as a physics derivation. `05-biophysics/` will hold the canonical entry once that branch opens.

---

## 10. Honest take

**Top-7 must-have entries from the physics canon as a whole.** Newton 1687 *Principia* (Cohen-Whitman 1999); Maxwell 1865 + *Treatise* 1891; Einstein 1905 special relativity ("Zur Elektrodynamik bewegter Körper"); Einstein 1915/1916 GR field equations; Heisenberg 1925 + Schrödinger 1926 (treated as the founding pair of QM, since picking one over the other would be tendentious); Dirac 1928 (the relativistic electron and antimatter prediction); Noether 1918. If forced to a single eighth pick: the BCS 1957 paper, because it is the founding example of the *modern* condensed-matter program — collective behaviour of many degrees of freedom organized by a symmetry-breaking order parameter — and because it is the cleanest demonstration that one can write down an effective Hamiltonian for an interacting many-body system and solve it exactly enough to predict experimental quantities (the energy gap, the critical temperature, the Meissner effect).

**Hardest boundary call resolved in pass-2: Planck 1901.** The thermodynamics-vs-quantum-mechanics placement is harder than it looks. The 1900 *Verhandlungen* paper is unambiguously a thermodynamics paper — Planck was trying to derive the Wien displacement law from thermodynamic principles and stumbled on the quantum hypothesis as an interpolation device he did not at the time take seriously as physics. The 1901 *Annalen* paper sharpens the result but still framings it as a derivation of the radiation law. Einstein's 1905 photoelectric paper is the first time the quantum hypothesis is treated as physical fact, not as a calculational device. The pass-2 placement of Planck 1901 in `quantum-mechanics/early-quantum/` is on the *downstream-use* test: the entire downstream literature treats Planck 1901 as the originator priority for `E = hν`, and the entry should sit where its readers will look. The thermodynamics-side reading is preserved as a cross-link.

**Hardest call still open after pass-2: Friedmann 1922 placement.** Pass-2 §1.10 places it in `06-cosmology/`, cross-linked from `02-physics/relativity/general/`. The defensible alternative is the inverse: place in physics with a cosmology cross-link, on the grounds that it is a primary result *in general relativity* (the first non-Schwarzschild exact-solution family) and that the cosmological-model interpretation is downstream. Pass-2 chose cosmology-primary on the chemistry-pass-3 §5.3 originator-framing rule (Friedmann's 1922 abstract explicitly framed the result as a cosmological model), but the call is genuinely contestable and pass-3 may reverse if the cosmology branch is not yet ready to open at the same time.

**The physics canon is older than the other six branches on average.** Median publication year of pass-2's promoted primary entries is approximately 1928 (the Dirac equation, Born–Oppenheimer, the Heisenberg uncertainty paper, the Pauli exclusion paper bracketing it). Median for chemistry pass-3's canon is approximately 1923 (Lewis–Randall, Brønsted, Lowry, Lewis acid-base). Median for information pass-1's canon is approximately 1948 (Shannon). The implication for Bucket's "build the past" thesis: the physics canon is the densest and oldest layer, with most of the foundation work done in a single 60-year window (1865 Maxwell to 1932 von Neumann) and the post-1950 work increasingly *building on* that foundation rather than replacing it. The exceptions — the 1964 Higgs trio, the 1973 Gross–Wilczek/Politzer asymptotic-freedom papers, the 1971/1975 Wilson RG, the 1957 BCS — are the post-war Standard-Model and condensed-matter consolidation, the second wave. Bucket's intake pipeline should expect to find very few canon-tier physics primaries from the post-2000 era; the pre-2000 physics canon is almost completely closed.

**The one place pass-2 thinks it might be wrong.** The early-quantum sub-fold (§1.6, M1) bundles Planck 1901, Einstein 1905 photoelectric, Bohr 1913, de Broglie 1924, and Davisson–Germer 1927 as a coherent cohort. The argument for is dependency-structure (each builds on the prior) and pedagogy (every QM textbook teaches them in this order). The argument against is that these five papers are written in five different formal frameworks (thermodynamics, light quanta, Bohr atom postulates, matter waves, electron diffraction) and a sub-fold that mixes all five may make the user's mental model worse, not better. The chemistry-branch parallel (Lavoisier + Dalton + Avogadro all sit in `chemistry/foundations/` despite formal heterogeneity) supports the bundling. Pass-3 may revisit if the maintainer feels the sub-fold is overloaded.

---

## Sources used in this pass

- [Royal Society — Maxwell 1865, *A Dynamical Theory of the Electromagnetic Field*, *Phil. Trans.* 155, 459–512](https://royalsocietypublishing.org/doi/10.1098/rstl.1865.0008)
- [APS — Guralnik, Hagen, Kibble 1964, *Phys. Rev. Lett.* 13, 585–587](https://link.aps.org/doi/10.1103/PhysRevLett.13.585)
- [Royal Society — commentary on Maxwell 1865 by Forfar and Pritchard](https://royalsocietypublishing.org/doi/10.1098/rsta.2014.0473)
- [Imperial College — note on the 1964 PRL symmetry-breaking papers and the J. J. Sakurai Prize](https://www.imperial.ac.uk/news/38514/imperial-physicists-ground-breaking-work-1960s/)
- [Cohen-Whitman 1999 *Principia* — UC Press catalog (cited in pass-1)](https://www.ucpress.edu/book/9780520088177/the-principia)
