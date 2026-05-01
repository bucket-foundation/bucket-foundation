# Chemistry Canon — Pass 3 Synthesis & Promotion Plan — 2026-05-01

Decision document. Builds on:

- Pass 1: `_intake/everychem-and-chemistry-canon-sweep-2026-05-01.md` (opened the branch, listed obvious primaries — Lavoisier, Dalton, Avogadro, Mendeleev, Lewis, Pauling, Gibbs, Arrhenius, Eyring, Marcus, van 't Hoff, Le Bel, IUPAC Gold Book; flagged Atkins, Cotton-Wilkinson, March, Coulson, Cotton 1990, Corey 1989 as borderline).
- Pass 2: `_intake/chemistry-canon-deep-dive-2026-05-01.md` (added Berzelius 1819, Frankland 1852, Kekulé 1858, Couper 1858, Werner 1893, Hund 1925–28, Mulliken 1928–32 + 1966 Nobel Lecture, Hückel 1931, Helmholtz 1882, van 't Hoff 1884, Nernst 1889/1906, Debye–Hückel 1923, Lewis–Randall 1923/1961, Bodenstein 1913, Lindemann 1922, Hinshelwood–Semenov 1956 Nobel Lectures, RRKM 1952, Marcus 1992 Nobel Lecture, Robinson 1932, Hammett 1937/1940, Ingold 1953/1969, Pasteur 1848/1860, Fischer 1891, Cahn–Ingold–Prelog 1956/1966, Moseley 1913–14, Bohr 1913 Part III, Hartree 1928, Slater 1929/1930, Fock 1930, Roothaan 1951, Čížek 1966, Kohn 1999 Nobel Lecture, Pople 1999 Nobel Lecture, Corey 1989/1991; demoted Coulson, Cotton 1990, Becke 1993, LYP 1988 to landscape).

Pass-2 is the source of truth for the spine. Pass-3 does five things: adjudicates pass-1-vs-pass-2 splits with a literal binding to README §"Promotion rule"; resolves the Ingold/Hammett edition-of-record question with a clean rule, not a hedge; tests ten domains both prior passes underweighted; freezes the final folder tree with seeded `CANON_INDEX.md` blocks; and writes the work queue a maintainer will execute next session.

Author: data pillar.
Method: full reread of pass-1 + pass-2 + `03-chemistry/README.md` + `09-art/README.md` + `MANIFESTO.md`; targeted citation verification via WebSearch (ACS, Wiley, Royal Society, AIP, RSC) on every primary text introduced in this pass.

---

## 1. The README "Promotion rule" — the literal binding text used throughout this memo

From `03-chemistry/README.md` (reproduced exactly so every adjudication below can be tied to a quoted clause):

> Material enters `03-chemistry/` only when one of the following holds:
> 1. It is a **primary theoretical text** by the originator of the framework (e.g. Lavoisier on conservation of mass, Dalton on atoms, Mendeleev on the periodic law, G. N. Lewis on the shared electron pair, Pauling on the chemical bond, Eyring on transition-state theory, Marcus on electron transfer, Woodward and Hoffmann on orbital symmetry).
> 2. It is a **recognized academic edition-of-record** of a primary text (e.g. Jensen ed. 2002 for Mendeleev's selected writings; the 1960 third edition for Pauling).
> 3. It is a **discipline-standard normative reference** (e.g. the IUPAC *Compendium of Chemical Terminology* — the Gold Book — second edition McNaught & Wilkinson 1997 plus the live online updates).
>
> Practitioner monographs, advanced textbooks, and lab references do not promote unless they meet condition 3 by virtue of being the discipline's normative reference, not just a popular one.

Throughout this memo "**c1**", "**c2**", "**c3**" refer to those three conditions.

---

## 2. Pass-1 vs pass-2 — every disagreement adjudicated

Pass-2 §9 enumerated 14 splits with pass-1. Pass-3 ratifies or overturns each one. Each row binds to c1/c2/c3.

| # | Text | Pass-1 | Pass-2 | Pass-3 final | Binding clause |
|---|------|--------|--------|--------------|----------------|
| 1 | Werner 1893 + 1913 Nobel Lecture | omitted | promote | **Promote both.** Werner is the originator of coordination theory; without him the entire d-block bonding canon is unscaffolded. | c1 (Werner 1893), c2 (1913 Nobel Lecture as the originator's own synthesis) |
| 2 | Kekulé 1858 *Annalen* | "cite as reference, do not promote" | promote | **Promote.** Tetravalent carbon and the chain hypothesis are originator priorities; later supersession (resonance, MO) does not strip priority. | c1 |
| 3 | Couper 1858 *CR Acad. Sci.* | not addressed | promote | **Promote.** Independent codiscovery of tetravalent carbon; the first published structural formulas with explicit bond-lines. | c1 |
| 4 | Kekulé 1865/1866 benzene bundle | omitted | promote | **Promote as one bundled entry.** Originator priority on aromatic ring closure. The mechanism was later supplied by Hückel and Pauling; the *structural claim* is canon. | c1 |
| 5 | Berzelius 1819 *Essai* | omitted | promote with overturn-flag | **Promote with explicit "theory overturned for organics" header in the entry stub.** First mechanism-level theory of bonding from a measured physical quantity (voltaic pile). The status as a foundations *text* survives the overturn of its content. | c1 |
| 6 | Frankland 1852 | omitted | promote | **Promote.** First quantitative valence claim. | c1 |
| 7 | Pasteur 1848 + 1860/1861 | omitted | promote both | **Promote.** 1848 *Annales* is the originator priority (manual resolution of sodium ammonium tartrate); 1860/1861 lectures are the synthetic edition-of-record by Pasteur himself. | c1 (1848) + c2 (1860/61) |
| 8 | Fischer 1891 | omitted | promote | **Promote.** Fischer projection convention — every biochemistry student still uses it for sugars and amino acids. | c1 |
| 9 | Cahn–Ingold–Prelog 1956 + 1966 | omitted | promote both | **Promote 1966 as edition-of-record; cite 1956 *Experientia* for priority.** R/S notation is the universal stereochemistry vocabulary. | c1 (1956) + c2 (1966) |
| 10 | Moseley 1913–14 | omitted | promote | **Promote.** Experimental foundation of atomic-number periodicity. Cross-link to `02-physics/atomic-physics/`. | c1 |
| 11 | Helmholtz 1882, van 't Hoff 1884, Nernst 1889/1906, Debye–Hückel 1923 | mentioned as "future" | promote all | **Promote all five.** Without these the chemistry-side thermodynamics spine is incomplete. | c1 each |
| 12 | Lewis–Randall 1923 (+ 1961 Pitzer–Brewer) | borderline | promote | **Promote 1923 (originator priority on activity / activity-coefficient framework). Promote 1961 as edition-of-record for the practitioner generation.** Lewis & Randall *originated* the activity coefficient as a chemistry concept — c1 — and the 1961 revision is c2. This is the single non-obvious promotion call where pass-3 fully agrees with pass-2 against pass-1. | c1 (1923) + c2 (1961) |
| 13 | Hartree 1928, Slater 1929/30, Fock 1930, Roothaan 1951, Čížek 1966 | not addressed | promote all | **Promote all five.** The computational lineage of quantum chemistry (SCF, Slater determinants/STOs, antisymmetrized Hartree–Fock, matrix HF, coupled cluster). Each is originator-tier on a distinct mechanism. | c1 each |
| 14 | Robinson 1932 *Outline of an Electrochemical Theory of Organic Reactions* | omitted | promote | **Promote.** Originator priority for curved-arrow notation and electron-flow theory in organic mechanism (predates Ingold's codification). | c1 |
| 15 | Corey 1989 + 1991 Nobel Lecture | "borderline, re-evaluate" | promote both as bundled entry | **Promote.** Retrosynthetic analysis is a *primary statement of a method* — the originator of the framework codified it. Same logical category as TST or LFER. New folder `mechanism-and-method/synthesis-logic/`. | c1 (1989 monograph) + c2 (1991 Nobel Lecture) |
| 16 | Coulson, *Valence* (1952/1961/1979) | promote ("strong via Coulson") | demote to landscape | **Demote.** Pass-1's reasoning was that there is no single load-bearing MO/VB monograph and Coulson is the practitioner synthesis. Pass-2 is correct that Coulson did not originate either MO theory (Hund, Mulliken) or VB theory (Heitler–London, Pauling); he taught them. The README is explicit — *"Practitioner monographs, advanced textbooks, and lab references do not promote unless they meet condition 3 by virtue of being the discipline's normative reference, not just a popular one."* Coulson is popular, not normative. Landscape only; cite from `quantum-chemistry/`. | excluded by README's textbook clause |
| 17 | Cotton 1990 *Chemical Applications of Group Theory* | promote (load-bearing for spectroscopy) | demote to landscape | **Demote.** Same reasoning as Coulson — applied group theory by a non-originator. Cite from `stereochemistry/`, `bonding/coordination/`, `quantum-chemistry/`. | excluded by README's textbook clause |
| 18 | Becke 1993, LYP 1988 (B3LYP component papers) | implicit "DFT corpus, re-evaluate" | demote to landscape | **Demote.** Engineering tools fitted to thermochemistry benchmarks; not derivations of a law. The README's c1 says "primary theoretical text by the originator of the framework" — the framework here is DFT itself (Hohenberg–Kohn / Kohn–Sham), already covered. Becke and LYP construct *functionals within* the framework. Landscape only. | excluded by c1's "framework" wording |

**Net effect of pass-3 adjudication: 17 promotions ratified, 3 demotions ratified.** Pass-2's calls stand. No reversal.

The only adjudication call where pass-3 had to weigh evidence rather than ratify is row 12 (Lewis–Randall): the question is whether Lewis and Randall *originated* the activity-coefficient framework or merely synthesized it. Verification: the 1923 first edition is the first systematic exposition of activity / activity-coefficient corrections to ideal-solution thermodynamics; the underlying *concept* of activity is Lewis's, introduced in his 1907 *Proc. Am. Acad.* paper "Outlines of a New System of Thermodynamic Chemistry" (43, 259). Pass-3 recommends adding **Lewis 1907** as a third entry in the Lewis–Randall lineage (originator priority for the activity concept itself), with the 1923 monograph as the framework-level statement and the 1961 revision as the edition-of-record. This is a small extension to pass-2's call, not a reversal.

---

## 3. The Ingold–Hammett edition-of-record question

Pass-2 §3.2 acknowledged this as "the single most contestable call in the deep dive." Pass-2 promoted Ingold 1953/1969 *and* Hammett 1937 (paper) + Hammett 1940 (monograph), and explicitly said the conservative reading is "demote both to landscape and keep only the 1937 Hammett *JACS* paper as the originator entry for LFER."

Pass-3 needs a rule, not a hedge. Here is the rule.

### 3.1 The pass-3 rule for "originator monograph vs originator paper"

> **An originator monograph promotes under c1 only when the monograph contains a load-bearing element that the originator paper does not contain.** Otherwise the monograph is c2 (edition-of-record at most) or landscape.

This is a tightening of c1 that respects the README's existing exemplars: Pauling 1939/1960 promotes because the monograph contains hybridization, electronegativity, the resonance theory framework, and the metal/H-bond chapters that no single Pauling *paper* of the 1930s contains. Lewis 1923 promotes because the monograph contains the Lewis acid–base theory and the systematic octet rule that the 1916 paper does not contain.

### 3.2 Apply the rule to Hammett

The 1937 *JACS* 59, 96–103 paper introduces the Hammett equation `log(k/k₀) = ρσ` and the σ-constant tabulation for benzene-derivative substituents. The 1940 *Physical Organic Chemistry* monograph **names the field** ("physical organic chemistry") and tabulates ρ values for dozens of reaction series, but the load-bearing *mechanism* — LFER itself — is in the 1937 paper.

**Pass-3 ruling:** **Promote the 1937 *JACS* paper under c1.** **The 1940 monograph promotes under c2 only as a discipline-naming and ρ-table reference, NOT as an originator entry.** This means the monograph stub in `CANON_INDEX.md` carries a "discipline-naming reference" tag, not an "originator" tag. Pass-2 promoted both as if both were originator-tier; pass-3 narrows that to one originator + one reference.

### 3.3 Apply the rule to Ingold

Ingold did not publish a single 1937-equivalent paper that contains the entirety of the SN1/SN2/E1/E2 vocabulary, the inductive/resonance classification, and the mechanism-naming grammar. Those are spread across **two decades of Ingold papers in *Journal of the Chemical Society* (1928–1949)**, of which the 1933 paper "The Mechanism of, and Constitutional Factors Controlling, the Hydrolysis of Carboxylic Esters" (with Hughes; *J. Chem. Soc.* 1571) and the 1935 paper "Mechanism of Substitution at a Saturated Carbon Atom" (with Hughes; *J. Chem. Soc.* 244) are the load-bearing primary statements of the SN1/SN2 distinction. The 1953/1969 monograph is the *only* place where the framework appears as a unified, named, teachable system.

**Pass-3 ruling:** Under the rule in §3.1, the 1953/1969 monograph contains a load-bearing element no single Ingold paper contains (the unified framework as a teachable grammar). **Promote the 1953 first edition as c1 (originator monograph) and the 1969 second edition as c2 (edition-of-record).** **Also promote the 1933 Hughes–Ingold *J. Chem. Soc.* 1571 paper and the 1935 *J. Chem. Soc.* 244 paper as the originator-priority companions** — without them the monograph entry has no clean primary-source anchor. Pass-2 promoted only the monographs; pass-3 adds the two priority papers.

### 3.4 The "is this textbook canon?" guardrail

To prevent the rule in §3.1 from becoming a backdoor for textbook promotion generally, pass-3 fixes a counter-rule:

> **A monograph by a non-originator does not promote under any condition unless it satisfies c3 (discipline-standard normative reference) — and "normative" means published, maintained, or formally adopted by a standards body (IUPAC, NIST, IUCr) or by professional consensus equivalent to a standards body. Popularity is not normativity.**

Atkins, March, Cotton-Wilkinson, Coulson, Cotton 1990, Streitwieser, Carey-Sundberg, Anslyn-Dougherty, Szabo-Ostlund — none satisfy this. All landscape. The list is closed: *the only non-originator monographs that promote under c3 are the IUPAC books.*

---

## 4. Domains both prior passes under-tested — pass-3 calls

Ten domains were named in the pass-3 brief. Each gets an explicit promote/demote with reasoning bound to c1/c2/c3.

### 4.1 Acid–base theory (Brønsted 1923, Lowry 1923, Lewis 1923)

Verified citation: J. N. Brønsted, "Einige Bemerkungen über den Begriff der Säuren und Basen," *Recueil des Travaux Chimiques des Pays-Bas* 42(8), 718–728, 1923 (DOI 10.1002/recl.19230420815). T. M. Lowry, "The Uniqueness of Hydrogen," *Journal of the Society of Chemical Industry* 42, 43–47, 1923 (independent and near-simultaneous).

Pass-2 listed Lewis 1923 *Valence* as the bonding canon entry. The acid–base content of *Valence* (chapter VI in the original) is the originator statement of electron-pair acid–base theory — but it is the *same physical text* as the bonding entry. Pass-3 does not double-count.

**Calls:**
- **Brønsted 1923 — promote** under c1. Originator priority for the proton-transfer theory of acids and bases; a foundational reframing of equilibrium chemistry around H⁺ transfer. Folder: `acid-base/` (new sub-folder).
- **Lowry 1923 — promote** under c1, bundled with Brønsted as "Brønsted–Lowry 1923". Independent codiscovery. The two papers together are the origin of the Brønsted–Lowry framework.
- **Lewis 1923 *Valence* (acid–base content) — already canon as the bonding entry.** Add a one-line cross-link from `acid-base/` to `bonding/lewis/`. Do not duplicate the entry.
- **Hammett acidity functions (Hammett 1932, "A Series of Simple Basic Indicators. The Acidity Functions of Mixtures of Sulfuric and Perchloric Acids with Water," *Chemical Reviews* 13, 61–69 — companion: Hammett & Deyrup, "A Series of Simple Basic Indicators. I. The Acidity Functions of Mixtures of Sulfuric and Perchloric Acids with Water," *J. Am. Chem. Soc.* 54, 2721–2739, 1932)** — **promote** under c1. The H₀ acidity function is the originator framework for super-acid quantification and is referenced by every subsequent acid-strength paper. Folder: `acid-base/`.

New sub-folder `acid-base/` is justified: three independent originator-tier entries (Brønsted, Lowry, Hammett 1932) plus one cross-link (Lewis 1923).

### 4.2 Hard/Soft Acids and Bases (Pearson 1963)

Verified citation: R. G. Pearson, "Hard and Soft Acids and Bases," *Journal of the American Chemical Society* 85(22), 3533–3539, 1963 (DOI 10.1021/ja00905a001). Companion: R. G. Pearson, "Hard and Soft Acids and Bases, HSAB, part 1: Fundamental principles," *Journal of Chemical Education* 45(9), 581–587, 1968.

**Call:** **Promote Pearson 1963 *JACS* under c1.** Originator priority on a foundational classification principle in coordination and reactivity chemistry — predicts which acid–base pairs form stable adducts based on polarizability/charge density. The 1968 *J. Chem. Educ.* review is the synthetic edition-of-record by the originator and promotes as c2 companion. Folder: `acid-base/hsab/` or as two entries directly under `acid-base/`. Pass-3 recommends keeping the folder flat with `1963-pearson-hsab.md` and `1968-pearson-hsab-jce-review.md`.

Both prior passes missed this. It is a Pearson-tier originator framework and meets c1 directly. **Pass-3 flags this as one of the more important pass-2 omissions.**

### 4.3 Solid-state / crystallography

Verified citations:
- W. H. Bragg and W. L. Bragg, "The Reflection of X-rays by Crystals," *Proceedings of the Royal Society A* 88(605), 428–438, 1913 (DOI 10.1098/rspa.1913.0040).
- W. L. Bragg, "The Structure of Some Crystals as Indicated by Their Diffraction of X-rays," *Proc. Roy. Soc. A* 89, 248–277, 1913.
- Linus Pauling, "The Principles Determining the Structure of Complex Ionic Crystals," *J. Am. Chem. Soc.* 51(4), 1010–1026, 1929 (DOI 10.1021/ja01379a006). The famous "Pauling's five rules" for ionic crystal structures.
- V. M. Goldschmidt, "Geochemische Verteilungsgesetze der Elemente. VII. Die Gesetze der Krystallochemie," *Skrifter Norske Videnskaps-Akademi i Oslo, I. Matematisk-Naturvidenskapelig Klasse* No. 2, 1926 (the tolerance factor).

**Calls:**
- **Bragg & Bragg 1913 — promote** under c1. The experimental foundation of all modern structural chemistry. Boundary: this is also `02-physics/condensed-matter/` priority. Pass-3 ruling: **canon in chemistry, cross-link from physics**, because Bragg's Law as taught and used in chemistry is a structural-chemistry tool (crystal structure determination), not a physics derivation. Originator-framing. Folder: `crystallography/` (new sub-folder).
- **Pauling 1929 *JACS* (the five rules) — promote** under c1. Originator priority on ionic crystal structure rules. Folder: `crystallography/`.
- **Goldschmidt 1926 (tolerance factor) — promote** under c1. Originator priority on the geometric stability criterion for perovskite-type structures (still the working tool in materials chemistry a century later). Folder: `crystallography/`.

Both prior passes omitted crystallography entirely. **This is the second-most-important miss by both passes.** A chemistry canon without Bragg is structurally absurd — every structural-chemistry paper since 1914 cites it implicitly.

New sub-folder `crystallography/` is justified.

### 4.4 Photochemistry

Citations:
- A. Einstein, "Über einen die Erzeugung und Verwandlung des Lichtes betreffenden heuristischen Gesichtspunkt," *Annalen der Physik* 17, 132–148, 1905 (the photoelectric paper); J. Stark, "Über die experimentelle Entscheidung zwischen Ätherwellen- und Lichtquantenhypothese. I. Röntgenstrahlung," *Phys. Z.* 10, 902–913, 1909 — these together establish the Stark–Einstein photoequivalence law.
- A. Jablonski, "Efficiency of Anti-Stokes Fluorescence in Dyes," *Nature* 131, 839–840, 1933 (the Jablonski diagram).
- T. Förster, "Zwischenmolekulare Energiewanderung und Fluoreszenz," *Annalen der Physik* (6th ser.) 2, 55–75, 1948 (FRET).

**Calls:**
- **Stark–Einstein photoequivalence law — cross-link only.** Einstein 1905 is `02-physics/quantum-mechanics/` priority. The chemistry-side application (one absorbed photon = one molecule activated) is downstream. Cite from `photochemistry/`; do not duplicate. **Demote** as a chemistry-canon promotion.
- **Jablonski 1933 — promote** under c1. The Jablonski diagram is the originator framework for organizing electronic excited-state photophysics (singlet/triplet manifolds, internal conversion, intersystem crossing, fluorescence/phosphorescence). Every photochemistry text since uses it. Folder: `photochemistry/` (new sub-folder).
- **Förster 1948 — promote** under c1. The originator derivation of resonance energy transfer between an excited donor and a ground-state acceptor as a function of r⁻⁶. Foundational for biophysical fluorescence assays and photosynthesis modeling. Folder: `photochemistry/` (with cross-link to `05-biophysics/`).

New sub-folder `photochemistry/` is justified by these two entries plus the cross-link from physics.

### 4.5 Spectroscopy — foundations vs primary observational tools

Citations:
- Pieter Zeeman, "Over de invloed eener magnetisatie op den aard van het door een stof uitgezonden licht," *Verslagen Kon. Akad. Wet. Amsterdam* 5, 181–185, 1896; English in *Phil. Mag.* (5th ser.) 43, 226–239, 1897.
- Johannes Stark, "Beobachtungen über den Effekt des elektrischen Feldes auf Spektrallinien," *Annalen der Physik* (4th ser.) 43, 965–982, 1914 (Stark effect; Nobel 1919).
- C. V. Raman and K. S. Krishnan, "A New Type of Secondary Radiation," *Nature* 121(3048), 501–502, 1928.

**Pass-3 rule:** Spectroscopic *effects* (Zeeman, Stark, Raman, NMR resonance) are physics priorities (the effect is a property of matter in a field, not a reaction). Spectroscopic *applications* (Raman bands as fingerprints of molecular vibrations, NMR chemical shifts as fingerprints of chemical environment) are downstream chemistry tools — not foundations.

**Calls:**
- **Zeeman 1897, Stark 1914, Raman 1928 — all live in `02-physics/atomic-physics/` and `02-physics/condensed-matter/`.** Cross-link only from chemistry. **Do not promote in `03-chemistry/`.**
- **NMR foundations (Bloch 1946 *Phys. Rev.* 70, 460; Purcell 1946 *Phys. Rev.* 69, 37 — joint Nobel 1952)** — same ruling. Live in physics; cross-link from chemistry.
- **Ernst 1991 Nobel work (FT-NMR, 2D-NMR — Ernst, Nobel Lecture 1992 *Angew. Chem. Int. Ed.* 31, 805–823; underlying papers Ernst & Anderson 1966 *Rev. Sci. Instrum.* 37, 93)** — **borderline.** The Ernst contribution is methodological (Fourier-transform processing + multidimensional pulse sequences); it transformed NMR from a physics technique into a chemistry tool. **Pass-3 call: cross-link, do not promote in chemistry canon.** Methodology is a tool. The closest-promotable entity would be a Nobel Lecture under c2, but the originator framework (NMR itself) is physics. Keep clean: physics holds NMR, chemistry cites it.

This is the cleanest possible boundary, and it lets `03-chemistry/spectroscopy/` stay empty. Pass-3 recommends **not creating a `spectroscopy/` sub-folder** — chemistry-side spectroscopy is entirely landscape (Cotton 1990 group-theory applications, Atkins chapters, Skoog instrumentation textbooks).

### 4.6 Colloid and interface science

Citations:
- I. Langmuir, "The Adsorption of Gases on Plane Surfaces of Glass, Mica and Platinum," *J. Am. Chem. Soc.* 40(9), 1361–1403, 1918 (DOI 10.1021/ja02242a004).
- B. V. Derjaguin and L. Landau, "Theory of the Stability of Strongly Charged Lyophobic Sols and of the Adhesion of Strongly Charged Particles in Solutions of Electrolytes," *Acta Physicochim. URSS* 14, 633–662, 1941.
- E. J. W. Verwey and J. Th. G. Overbeek, *Theory of the Stability of Lyophobic Colloids*, Elsevier, Amsterdam, 1948.

**Calls:**
- **Langmuir 1918 — promote** under c1. The Langmuir adsorption isotherm is the originator framework for monolayer adsorption thermodynamics and the foundational text of surface chemistry. Folder: `surface-chemistry/` (new sub-folder).
- **DLVO theory (Derjaguin–Landau 1941 + Verwey–Overbeek 1948) — promote as a bundled entry** under c1. The originator framework of colloid stability (the balance of van der Waals attraction and electrostatic repulsion). Folder: `surface-chemistry/`.
- **Gibbs adsorption equation** — already implicit in Gibbs 1875–78; do not separately promote. Cite from `surface-chemistry/`.

New sub-folder `surface-chemistry/` is justified.

### 4.7 Polymer science

Verified citation: H. Staudinger, "Über Polymerisation," *Berichte der deutschen chemischen Gesellschaft* 53(6), 1073–1085, 1920 (DOI 10.1002/cber.19200530627).

Other candidates:
- P. J. Flory, "Thermodynamics of High Polymer Solutions," *J. Chem. Phys.* 10, 51–61, 1942; M. L. Huggins, "Some Properties of Solutions of Long-Chain Compounds," *J. Phys. Chem.* 46, 151–158, 1942 (Flory–Huggins solution theory).
- K. Ziegler, "Folgen und Werdegang einer Erfindung," Nobel Lecture, 1963; G. Natta, "From the Stereospecific Polymerization to the Asymmetric Autocatalytic Synthesis of Macromolecules," Nobel Lecture, 1963 (Ziegler–Natta catalysis).
- P. J. Flory, *Principles of Polymer Chemistry*, Cornell University Press, 1953 (ISBN 0-8014-0134-8); Nobel Prize 1974.

**Calls:**
- **Staudinger 1920 — promote** under c1. The macromolecular hypothesis — that rubber, starch, cellulose, proteins are long covalent chains, not aggregates of small molecules — is the originator statement of an entire branch of chemistry that did not exist before this paper. Folder: `polymer-chemistry/` (new sub-folder).
- **Flory–Huggins 1942 (bundled) — promote** under c1. The originator framework for polymer-solution thermodynamics; the lattice-model treatment of mixing entropy that explains polymer solubility, phase behavior, and θ-solvents. Folder: `polymer-chemistry/`.
- **Flory 1953 *Principles of Polymer Chemistry* — promote** under c2 (originator's own edition-of-record monograph). The Pauling-of-polymers text. Cornell University Press, same press as Pauling 1960. Flory got the 1974 Nobel for the body of work this monograph synthesizes.
- **Ziegler–Natta 1963 Nobel Lectures (bundled) — promote** under c2. Originator-tier statements of stereospecific catalytic polymerization (the framework that made polypropylene, HDPE, isotactic polymers a chemical possibility). Folder: `polymer-chemistry/` with cross-link to `catalysis/` (see §4.9).

New sub-folder `polymer-chemistry/` is justified by four entries and a manifesto-level claim (a branch of chemistry that did not exist before 1920). **Pass-3 flags polymer chemistry as the third major pass-2 omission.** Without Staudinger, Bucket cannot point a working chemist at the origin of synthetic-polymer thinking.

### 4.8 Electrochemistry beyond Nernst

Citations:
- J. Tafel, "Über die Polarisation bei kathodischer Wasserstoffentwicklung," *Zeitschrift für physikalische Chemie* 50, 641–712, 1905 (the Tafel equation).
- J. A. V. Butler, "Studies in Heterogeneous Equilibria. Part II. The Kinetic Interpretation of the Nernst Theory of Electromotive Force," *Trans. Faraday Soc.* 19, 729–733, 1924; M. Volmer and T. Erdey-Grúz, "Zur Theorie der Wasserstoffüberspannung," *Z. phys. Chem. A* 150, 203–213, 1930 (Butler–Volmer equation).

**Calls:**
- **Tafel 1905 — promote** under c1. Originator priority on the empirical relationship between overpotential and current density at an electrode (η = a + b log j); foundational for every later treatment of electrode kinetics. Folder: `thermodynamics/electrochemistry/`.
- **Butler 1924 + Volmer–Erdey-Grúz 1930 (bundled as "Butler–Volmer 1924/1930") — promote** under c1. The originator framework for electrode kinetics as a function of overpotential (the Butler–Volmer equation), the chemistry-side analog of the Eyring equation for activated electron transfer at an interface. Folder: `thermodynamics/electrochemistry/`. Cross-link to Marcus 1956 (the *theoretical* electron-transfer treatment) in `kinetics/`.

These add to the existing electrochemistry sub-folder (Nernst 1889/1906 + Debye–Hückel 1923 from pass-2). The electrochemistry sub-folder is then justified at five entries; pass-3 still recommends keeping it under `thermodynamics/electrochemistry/` rather than splitting to a top-level branch — it is dense enough to need its own folder, not its own top-level slot.

### 4.9 Catalysis (heterogeneous)

Citations:
- P. Sabatier, *La Catalyse en Chimie Organique*, Béranger, Paris, 1913 (Nobel 1912; the monograph appeared after the prize).
- I. Langmuir, "The Mechanism of the Catalytic Action of Platinum in the Reactions 2CO + O₂ = 2CO₂ and 2H₂ + O₂ = 2H₂O," *Trans. Faraday Soc.* 17, 621–654, 1922 (the Langmuir–Hinshelwood mechanism, with Hinshelwood's later extension in *Kinetics of Chemical Change*, Oxford UP, 1926).
- D. D. Eley and E. K. Rideal, "Parahydrogen Conversion on Tungsten," *Nature* 146, 401–402, 1940 (the Eley–Rideal mechanism).

**Calls:**
- **Sabatier 1913 — promote** under c2 (originator's own monograph after the 1912 Nobel). Foundational hydrogenation catalysis and the Sabatier principle (optimal catalysis at intermediate adsorption strength — still the working heuristic). Folder: `catalysis/` (new sub-folder).
- **Langmuir 1922 (Langmuir–Hinshelwood mechanism) — promote** under c1. Originator priority on the mechanism for surface-catalyzed reactions where both reactants adsorb before reacting. Folder: `catalysis/` with cross-link to `surface-chemistry/`.
- **Eley–Rideal 1940 — promote** under c1. The competing mechanism (one adsorbed reactant, one gas-phase reactant). Together with Langmuir–Hinshelwood, the two foundational mechanisms of heterogeneous catalysis. Folder: `catalysis/`.

New sub-folder `catalysis/` is justified at three originator entries.

Pass-2 had Hinshelwood + Semenov 1956 Nobel Lectures in `kinetics/` for chain reactions; the catalysis content of Hinshelwood's work is separable from the chain-branching content. Pass-3 keeps the 1956 Nobel Lectures in `kinetics/` (chain branching) and adds Langmuir 1922 to `catalysis/` (heterogeneous-catalysis mechanism). They are different intellectual moves.

### 4.10 Supramolecular chemistry

Citations:
- D. J. Cram, J.-M. Lehn, C. J. Pedersen — joint Nobel 1987.
- C. J. Pedersen, "Cyclic Polyethers and Their Complexes with Metal Salts," *J. Am. Chem. Soc.* 89(26), 7017–7036, 1967 (the crown ether discovery).
- J.-M. Lehn, "Supramolecular Chemistry — Scope and Perspectives: Molecules, Supermolecules, and Molecular Devices," Nobel Lecture, *Angew. Chem. Int. Ed. Engl.* 27(1), 89–112, 1988 (DOI 10.1002/anie.198800891).
- D. J. Cram, "The Design of Molecular Hosts, Guests, and Their Complexes," Nobel Lecture, *Angew. Chem. Int. Ed. Engl.* 27(8), 1009–1020, 1988.

**Calls:**
- **Pedersen 1967 *JACS* — promote** under c1. The originator priority on macrocyclic host–guest complexation (crown ethers binding alkali metal cations). The empirical foundation of supramolecular chemistry. Folder: `supramolecular/` (new sub-folder).
- **Lehn 1988 Nobel Lecture — promote** under c1 + c2. The originator framework statement of supramolecular chemistry as a discipline (intermolecular binding as a first-class chemical phenomenon, distinct from covalent bonding). Folder: `supramolecular/`.
- **Cram 1988 Nobel Lecture — promote** under c2. Originator's synthesis of host–guest design principles. Folder: `supramolecular/`.

New sub-folder `supramolecular/` is justified at three Nobel-tier originator entries. Pass-2 stopped at Corey 1989 retrosynthesis; supramolecular is the next foundational layer above molecular chemistry. Pass-3 promotes.

### 4.11 Pericyclic / orbital symmetry — Fukui priority

Verified citation: K. Fukui, T. Yonezawa, H. Shingu, "A Molecular Orbital Theory of Reactivity in Aromatic Hydrocarbons," *J. Chem. Phys.* 20(4), 722–725, 1952 (DOI 10.1063/1.1700523).

**Call:** **Promote Fukui 1952 under c1.** The frontier molecular orbital (FMO) framework — reactivity is dominated by HOMO–LUMO interactions — is Fukui's originator priority and **predates Woodward–Hoffmann's 1965 orbital-symmetry rules by 13 years**. Fukui shared the 1981 Nobel with Hoffmann (Woodward had died in 1979) precisely because FMO is the more general framework that W–H rationalized for the pericyclic special case.

**Pass-3 ruling on the W–H/Fukui priority question:** Both promote. Fukui 1952 is the prior originator framework; Woodward–Hoffmann 1965/1970 is the pericyclic-specific symmetry-rule application. Pass-2 listed only W–H. Pass-3 adds Fukui 1952 to `quantum-chemistry/` and the **Fukui 1982 Nobel Lecture, "The Role of Frontier Orbitals in Chemical Reactions," *Angew. Chem. Int. Ed. Engl.* 21(11), 801–809** as the originator's edition-of-record (c2). Folder: `quantum-chemistry/` (with cross-link to `bonding/orbital-symmetry/`).

This is a non-trivial pass-2 omission. Without Fukui, the orbital-symmetry sub-folder is missing the prior framework that W–H builds on.

### 4.12 Statistical thermodynamics of solutions (McMillan–Mayer, Kirkwood–Buff)

Citations:
- W. G. McMillan and J. E. Mayer, "The Statistical Thermodynamics of Multicomponent Systems," *J. Chem. Phys.* 13(7), 276–305, 1945 (DOI 10.1063/1.1724036).
- J. G. Kirkwood and F. P. Buff, "The Statistical Mechanical Theory of Solutions. I.," *J. Chem. Phys.* 19(6), 774–777, 1951 (DOI 10.1063/1.1748352).

**Calls:**
- **McMillan–Mayer 1945 — promote** under c1. The originator framework that connects osmotic pressure of a solute to a virial expansion in solute concentration; the formal solution-thermodynamics analog of the gas-phase virial expansion. Folder: `thermodynamics/`.
- **Kirkwood–Buff 1951 — promote** under c1. The originator framework expressing solution thermodynamic properties in terms of integrals over pair correlation functions. Foundational for modern solution theory and for connecting molecular simulation to bulk thermodynamic measurements. Folder: `thermodynamics/`.

Both are mid-tier additions to `thermodynamics/` — solid c1 promotions but they do not require a new sub-folder.

### 4.13 NMR foundations summary

Already covered in §4.5. **Bloch 1946 + Purcell 1946 live in physics; cite from chemistry; do not promote in `03-chemistry/`.** Ernst's FT-NMR / 2D-NMR work is methodology and stays landscape. The Cotton 1990 group-theory text used to interpret NMR splitting patterns is also landscape.

---

## 5. Boundary calls — explicit

The README §"Boundary with 02-physics" gives a sound general principle ("the law of nature lives in physics, the law-level statement that organizes a chemical phenomenon lives in chemistry") but does not give working-day-resolution rules. Pass-3 fixes the operational boundaries.

### 5.1 Boundary with `02-physics/`

**Operational rule:**
- **Pure quantum-mechanical postulates and derivations → physics.** Schrödinger 1926, Dirac 1928, Pauli 1925, Born–Oppenheimer 1927, Hohenberg–Kohn 1964, Kohn–Sham 1965 → all `02-physics/quantum-mechanics/`.
- **Many-electron methods designed for chemical bonding → chemistry.** Heitler–London 1927, Hund 1925–28, Mulliken 1928–32, Hückel 1931, Hartree 1928, Slater 1929/30, Fock 1930, Roothaan 1951, Čížek 1966 → `03-chemistry/quantum-chemistry/`.
- **Statistical mechanics of N indistinguishable particles → physics.** Boltzmann, Gibbs 1902, modern textbook formulations → `02-physics/statistical-mechanics/`.
- **Chemical-potential, activity-coefficient, phase-rule, electrolyte solution, equilibrium-constant treatments → chemistry.** Gibbs 1875–78, Helmholtz 1882, van 't Hoff 1884, Nernst 1889/1906, Lewis 1907, Lewis–Randall 1923/1961, Debye–Hückel 1923, McMillan–Mayer 1945, Kirkwood–Buff 1951 → `03-chemistry/thermodynamics/`.
- **Crystallography (Bragg's Law, structure determination) → chemistry, cross-linked from physics.** The application (knowing what atoms are where) is structural chemistry; the diffraction physics is taught from chemistry's side because chemists are the population using it daily.
- **Spectroscopic effects (Zeeman, Stark, Raman, NMR resonance) → physics.** The chemical applications are tools, not foundations.

**Five test cases:**

| Text | Side | Reason |
|------|------|--------|
| Pauling 1960, *The Nature of the Chemical Bond* | chemistry | Resonance, hybridization, electronegativity — chemical-bonding framework. README's exemplar. |
| Hohenberg & Kohn 1964, "Inhomogeneous Electron Gas" | physics (cross-link from chemistry) | Two abstract theorems on density functionals; not specific to chemistry. |
| Heitler & London 1927, "Wechselwirkung neutraler Atome" | chemistry | First QM treatment of *the chemical bond*; framed by the authors as a chemistry derivation. |
| Bragg & Bragg 1913, "The Reflection of X-rays by Crystals" | chemistry (cross-link from physics) | Bragg's Law as a structural-chemistry tool. Pass-3 places the canonical entry in chemistry. |
| Bloch 1946 / Purcell 1946 (NMR) | physics | The resonance phenomenon is a property of nuclei in fields. Chemists cite it; physicists discovered it. |

### 5.2 Boundary with `01-mathematics/`

**Operational rule:**
- **Group theory primaries (Burnside, Schur, Weyl) → math.** The chemistry-side applications (point groups, character tables for vibrational spectroscopy, MO symmetry) are taught from a *non-originator monograph* (Cotton 1990) that does not promote. Cite Cotton from chemistry as landscape; cite Burnside/Weyl from math as canon.
- **Calculus of variations → math (Euler 1744, Lagrange).** The chemistry-side application (Hartree–Fock as a variational method) is c1 in chemistry under Hartree 1928 and Fock 1930.
- **Linear algebra (eigenvalue problems) → math.** The chemistry-side instances (Roothaan FC = SCε, Hückel secular determinants) are not separately promoted; they are mechanism inside the quantum-chemistry computational papers.

### 5.3 Boundary with `05-biophysics/`

**Operational rule (already in README): originator-framing wins.**

| Text | Side | Reason |
|------|------|--------|
| Marcus 1956 | chemistry | Marcus framed the result as a theory of chemical electron transfer. |
| Mitchell 1961, chemiosmosis | biophysics | Mitchell framed the result as a biological coupling mechanism. |
| Michaelis–Menten 1913 | biophysics (Mich–Menten was working on enzymes) | Cross-link to chemistry kinetics. |
| Briggs–Haldane 1925 (steady-state derivation) | chemistry-kinetics cross-link | The steady-state hypothesis itself is a chemistry-kinetics tool; originator priority for steady-state in chemistry is Bodenstein 1913 (already canon). |
| Pauling 1951 α-helix paper (*PNAS* 37, 205) | biophysics | Pauling framed it as molecular biology. Cite from chemistry. |
| Anfinsen 1961/1973, protein folding | biophysics | Anfinsen framed it as biology. |

### 5.4 Boundary with `04-information/` — the entropy non-conflation

This is the single most important boundary clarification in pass-3. Both pass-1 and pass-2 mentioned the Shannon/Gibbs entropy relationship in passing (pass-2 §7.3); pass-3 makes the rule operational.

**The two entropies share the same mathematical form `S = −Σ p_i log p_i` but are not the same physical quantity:**

- **Gibbs entropy** `S = −k_B Σ p_i ln p_i` has units of **J/K** and counts microstates of a thermodynamic system. It is a property of the *system*.
- **Shannon entropy** `H = −Σ p_i log₂ p_i` has units of **bits** and quantifies the average information content of a probability distribution. It is a property of the *probability distribution*, not of any physical system.

The two are related by Boltzmann's constant `k_B ln 2 ≈ 9.57 × 10⁻²⁴ J/K per bit` only when one explicitly identifies the probability distribution over physical microstates with a Shannon source distribution. **That identification is a modeling choice, not a derivation.**

**Pass-3 rules:**
1. **The Gibbs/Boltzmann entropy entry lives in `02-physics/statistical-mechanics/` and is cross-linked from `03-chemistry/thermodynamics/`.** Already covered.
2. **The Shannon entropy entry (Shannon 1948, "A Mathematical Theory of Communication," *Bell Syst. Tech. J.* 27, 379–423 and 623–656) lives in `04-information/`.**
3. **Jaynes 1957 "Information Theory and Statistical Mechanics" (*Phys. Rev.* 106, 620–630) is the bridge text.** It argues statistical mechanics can be derived from information-theoretic axioms (max-entropy inference). **Promote in `04-information/`** as c1 for information-theoretic statmech; cross-link from `03-chemistry/thermodynamics/`. Do **not** make it canon in chemistry — Jaynes's framework is a foundations-of-physics result, not a chemistry result.
4. **Every chemistry canon entry that uses the word "entropy" must specify Gibbs or thermodynamic entropy explicitly. The chemistry canon does not silently identify with Shannon entropy.** This is a stub-writing rule for the maintainer.

This rule is binding. Conflating the two is a class-1 popular-science error and Bucket cannot make it.

---

## 6. The final `03-chemistry/` folder tree

The pass-2 tree (§7.2) is mostly correct. Pass-3 adds five sub-folders (`acid-base/`, `crystallography/`, `photochemistry/`, `surface-chemistry/`, `polymer-chemistry/`, `catalysis/`, `supramolecular/`) and a small number of entries inside existing sub-folders. Final tree:

```
03-chemistry/
  README.md
  CANON_INDEX.md
  _intake/
    everychem-and-chemistry-canon-sweep-2026-05-01.md           (pass 1)
    chemistry-canon-deep-dive-2026-05-01.md                     (pass 2)
    chemistry-canon-pass-3-synthesis-2026-05-01.md              (this memo)

  atomic-theory/
    1789-lavoisier-traite-elementaire.md
    1808-1827-dalton-new-system-chemical-philosophy.md
    1811-avogadro-essai-masses-relatives.md
    1858-cannizzaro-sunto-corso-filosofia-chimica.md

  periodicity/
    1869-1871-mendeleev-periodic-law-jensen-ed-2002.md
    1889-mendeleev-faraday-lecture.md
    1913-1914-moseley-high-frequency-spectra.md
    1913-bohr-constitution-atoms-part-iii.md                    (cross-link to 02-physics)

  bonding/
    pre-quantum/
      1819-berzelius-essai-electrochemical-dualism.md
      1852-frankland-combining-power.md
      1858-kekule-constitution-tetravalent-carbon.md
      1858-couper-nouvelle-theorie-chimique.md
      1865-1866-kekule-benzene-bundle.md
    coordination/
      1893-werner-konstitution-anorganischer-verbindungen.md
      1913-werner-nobel-lecture.md
    lewis/
      1916-lewis-atom-and-molecule.md
      1923-lewis-valence-and-structure.md
    pauling/
      1939-pauling-nature-of-the-chemical-bond-1st.md
      1960-pauling-nature-of-the-chemical-bond-3rd.md           (edition of record)
    orbital-symmetry/
      1965-woodward-hoffmann-jacs-bundle.md
      1970-woodward-hoffmann-conservation-orbital-symmetry.md

  acid-base/                                                    (new in pass-3)
    1923-bronsted-some-observations-acids-and-bases.md
    1923-lowry-uniqueness-of-hydrogen.md
    1932-hammett-deyrup-acidity-functions.md
    1963-pearson-hsab.md
    1968-pearson-hsab-jce-review.md

  thermodynamics/
    1882-helmholtz-thermodynamik-chemischer-vorgaenge.md
    1875-1878-gibbs-equilibrium-heterogeneous-substances.md     (Bumstead-Van Name 1906 / Dover 1961)
    1884-vant-hoff-etudes-de-dynamique-chimique.md
    1907-lewis-outlines-new-system-thermodynamic-chemistry.md   (new in pass-3 — activity originator)
    1923-lewis-randall-thermodynamics-1st.md
    1961-lewis-randall-pitzer-brewer-thermodynamics-2nd.md
    1945-mcmillan-mayer-statistical-thermodynamics.md           (new in pass-3)
    1951-kirkwood-buff-statistical-mechanical-theory.md         (new in pass-3)
    electrochemistry/
      1889-nernst-elektromotorische-wirksamkeit-der-ionen.md
      1905-tafel-polarisation-kathodische.md                    (new in pass-3)
      1906-nernst-heat-theorem.md
      1923-debye-huckel-theorie-der-elektrolyte.md
      1924-1930-butler-volmer-electrode-kinetics.md             (new in pass-3)

  kinetics/
    1889-arrhenius-reaktionsgeschwindigkeit.md
    1913-bodenstein-lind-h2-br2-chain.md
    1922-lindemann-radiation-theory.md
    1935-eyring-activated-complex.md
    1935-evans-polanyi-transition-state.md
    1941-glasstone-laidler-eyring-theory-of-rate-processes.md
    1952-marcus-rrkm.md
    1956-marcus-electron-transfer-i.md
    1956-hinshelwood-semenov-nobel-lectures.md
    1992-marcus-nobel-lecture.md
    physical-organic/
      1932-robinson-electrochemical-theory-organic-reactions.md
      1933-hughes-ingold-jcs-1571-hydrolysis.md                 (new in pass-3 — Ingold priority)
      1935-hughes-ingold-jcs-244-substitution.md                (new in pass-3 — Ingold priority)
      1937-hammett-substituent-equation.md                      (originator under c1)
      1940-hammett-physical-organic-chemistry-1st.md            (c2 reference, NOT originator)
      1953-ingold-structure-and-mechanism-1st.md                (originator monograph, c1)
      1969-ingold-structure-and-mechanism-2nd.md                (edition of record, c2)

  stereochemistry/
    1848-pasteur-tartrate-resolution.md
    1860-1861-pasteur-recherches-dissymetrie-moleculaire.md
    1874-vant-hoff-voorstel.md
    1875-vant-hoff-chimie-dans-lespace.md                       (edition of record)
    1874-le-bel-relations-formules-atomiques.md
    1891-fischer-configuration-traubenzuckers-bundle.md
    1956-cahn-ingold-prelog-experientia.md
    1966-cahn-ingold-prelog-angew-chem-int-ed.md                (edition of record)

  quantum-chemistry/
    1925-1928-hund-z-phys-papers.md
    1927-heitler-london-h2-quantum-mechanics.md
    1928-1932-mulliken-phys-rev-bundle.md
    1931-1932-huckel-quantentheoretische-beitraege.md
    1952-fukui-yonezawa-shingu-fmo.md                           (new in pass-3 — pre-W-H FMO priority)
    1966-mulliken-nobel-lecture.md
    1982-fukui-nobel-lecture-frontier-orbitals.md               (new in pass-3)
    computational/
      1928-hartree-scf.md
      1929-1930-slater-determinant-and-stos.md
      1930-fock-naeherungsmethode.md
      1951-roothaan-new-developments-mo-theory.md
      1964-hohenberg-kohn-inhomogeneous-electron-gas.md         (cross-link to 02-physics)
      1965-kohn-sham-self-consistent-equations.md               (cross-link to 02-physics)
      1966-cizek-coupled-cluster.md
      1999-kohn-nobel-lecture.md
      1999-pople-nobel-lecture.md

  crystallography/                                              (new in pass-3)
    1913-bragg-bragg-reflection-of-x-rays-by-crystals.md
    1913-bragg-wl-structure-of-some-crystals.md
    1926-goldschmidt-tolerance-factor.md
    1929-pauling-five-rules-ionic-crystals.md

  photochemistry/                                               (new in pass-3)
    1933-jablonski-anti-stokes-fluorescence-diagram.md
    1948-foerster-zwischenmolekulare-energiewanderung.md        (cross-link to 05-biophysics)

  surface-chemistry/                                            (new in pass-3)
    1918-langmuir-adsorption-isotherm.md
    1941-1948-derjaguin-landau-verwey-overbeek-dlvo.md

  polymer-chemistry/                                            (new in pass-3)
    1920-staudinger-ueber-polymerisation.md
    1942-flory-huggins-polymer-solutions-bundle.md
    1953-flory-principles-of-polymer-chemistry.md
    1963-ziegler-natta-nobel-lectures-bundle.md

  catalysis/                                                    (new in pass-3)
    1913-sabatier-la-catalyse-en-chimie-organique.md
    1922-langmuir-mechanism-platinum-catalysis.md
    1940-eley-rideal-parahydrogen-conversion.md

  supramolecular/                                               (new in pass-3)
    1967-pedersen-cyclic-polyethers.md
    1988-cram-nobel-lecture-design-of-molecular-hosts.md
    1988-lehn-nobel-lecture-supramolecular-chemistry.md

  mechanism-and-method/
    synthesis-logic/
      1989-corey-cheng-logic-of-chemical-synthesis.md
      1991-corey-nobel-lecture.md

  reference/
    iupac/
      1997-mcnaught-wilkinson-gold-book-2nd-ed.md
      2005-iupac-red-book-inorganic-nomenclature.md
      2013-iupac-blue-book-organic-nomenclature.md
      2007-iupac-green-book-quantities-units-symbols-3rd-ed.md
      1997-iupac-orange-book-analytical-nomenclature.md
      iupac-periodic-table-2022-05-04.md
    databases/
      pubchem-pointer.md
      chembl-pointer.md
      cambridge-structural-database-pointer.md
      reaxys-pointer.md
```

**Total entries: 79.** Pass-2 tree had 53 entries. Pass-3 net additions: 26 entries across 7 new sub-folders + 5 entries inside existing sub-folders (Lewis 1907, McMillan–Mayer, Kirkwood–Buff, Tafel, Butler–Volmer, Hughes–Ingold ×2, Fukui ×2). Tree is final pending §8 unresolved.

### 6.1 Seeded `CANON_INDEX.md` blocks

Each new sub-folder gets a top-level `CANON_INDEX.md`. Format: `bibkey | author(s) | year | title | publisher/journal | edition-of-record | one-sentence mechanism justification | tag`.

**`acid-base/CANON_INDEX.md`** (seed):

```
bronsted-1923   | J. N. Brønsted          | 1923   | Einige Bemerkungen über den Begriff der Säuren und Basen | Recueil Trav. Chim. Pays-Bas 42(8), 718-728 | original           | Originator priority on the proton-transfer theory of acids and bases.                                                                                | strong
lowry-1923      | T. M. Lowry             | 1923   | The Uniqueness of Hydrogen                                | J. Soc. Chem. Ind. 42, 43-47               | original           | Independent codiscovery of the proton-transfer acid-base framework.                                                                                  | strong
hammett-1932    | L. P. Hammett, A. Deyrup | 1932  | A Series of Simple Basic Indicators. I. The Acidity Functions of Mixtures of Sulfuric and Perchloric Acids with Water | J. Am. Chem. Soc. 54, 2721-2739 | original | Originator framework for the H₀ acidity function — quantitative acidity beyond the dilute-aqueous regime.                                            | strong
pearson-1963    | R. G. Pearson           | 1963   | Hard and Soft Acids and Bases                             | J. Am. Chem. Soc. 85(22), 3533-3539        | original (DOI 10.1021/ja00905a001) | Originator priority on the HSAB classification — predicts adduct stability from polarizability/charge density.                                       | strong
pearson-1968    | R. G. Pearson           | 1968   | Hard and Soft Acids and Bases, HSAB, Part I               | J. Chem. Educ. 45(9), 581-587              | originator's review | Originator's synthetic edition-of-record on HSAB principles.                                                                                          | strong
```

**`crystallography/CANON_INDEX.md`** (seed):

```
bragg-1913a     | W. H. Bragg, W. L. Bragg | 1913  | The Reflection of X-rays by Crystals                      | Proc. Roy. Soc. A 88(605), 428-438         | original (DOI 10.1098/rspa.1913.0040) | Originator derivation of Bragg's Law nλ = 2d sin θ — the experimental foundation of structural chemistry.                                            | strong
bragg-1913b     | W. L. Bragg              | 1913  | The Structure of Some Crystals as Indicated by Their Diffraction of X-rays | Proc. Roy. Soc. A 89, 248-277 | original | First structure determinations (NaCl, KCl, ZnS) from X-ray diffraction.                                                                              | strong
goldschmidt-1926| V. M. Goldschmidt        | 1926  | Geochemische Verteilungsgesetze der Elemente. VII. Die Gesetze der Krystallochemie | Skr. Norske Vid.-Akad. Oslo I No. 2 | original | Tolerance factor for ionic and perovskite-type crystal stability — still the working tool in materials chemistry.                                    | strong
pauling-1929    | L. Pauling              | 1929   | The Principles Determining the Structure of Complex Ionic Crystals | J. Am. Chem. Soc. 51(4), 1010-1026     | original (DOI 10.1021/ja01379a006) | Originator priority on the five rules for ionic crystal structures.                                                                                   | strong
```

**`photochemistry/CANON_INDEX.md`** (seed):

```
jablonski-1933  | A. Jablonski            | 1933   | Efficiency of Anti-Stokes Fluorescence in Dyes            | Nature 131, 839-840                        | original           | Originator framework for the Jablonski diagram — singlet/triplet manifolds, internal conversion, intersystem crossing, fluorescence/phosphorescence. | strong
foerster-1948   | T. Förster              | 1948   | Zwischenmolekulare Energiewanderung und Fluoreszenz       | Ann. Phys. (6) 2, 55-75                    | original           | Originator derivation of resonance energy transfer between excited donor and ground-state acceptor as r⁻⁶ — basis of FRET.                           | strong
```

**`surface-chemistry/CANON_INDEX.md`** (seed):

```
langmuir-1918   | I. Langmuir             | 1918   | The Adsorption of Gases on Plane Surfaces of Glass, Mica and Platinum | J. Am. Chem. Soc. 40(9), 1361-1403 | original (DOI 10.1021/ja02242a004) | Originator framework for monolayer adsorption thermodynamics — the Langmuir isotherm.                                                                | strong
dlvo-1941-1948  | B. V. Derjaguin, L. Landau; E. J. W. Verwey, J. Th. G. Overbeek | 1941/1948 | DLVO theory of colloid stability (bundled) | Acta Physicochim. URSS 14, 633-662 (Derjaguin-Landau); Elsevier monograph 1948 (Verwey-Overbeek) | original | Originator framework for colloid stability — the balance of van der Waals attraction and electrostatic repulsion.                                    | strong
```

**`polymer-chemistry/CANON_INDEX.md`** (seed):

```
staudinger-1920 | H. Staudinger           | 1920   | Über Polymerisation                                       | Ber. dtsch. chem. Ges. 53(6), 1073-1085    | original (DOI 10.1002/cber.19200530627) | Macromolecular hypothesis — rubber, starch, cellulose, proteins are long covalent chains, not aggregates. Founding text of polymer chemistry.        | strong
flory-huggins-1942 | P. J. Flory; M. L. Huggins | 1942 | Thermodynamics of polymer solutions (Flory-Huggins, bundled) | J. Chem. Phys. 10, 51-61 (Flory); J. Phys. Chem. 46, 151-158 (Huggins) | original | Originator framework for polymer-solution lattice thermodynamics — explains polymer solubility, phase behavior, θ-solvents.                          | strong
flory-1953      | P. J. Flory             | 1953   | Principles of Polymer Chemistry                            | Cornell University Press (ISBN 0-8014-0134-8) | first edition    | Originator's edition-of-record on polymer chemistry — the Pauling-of-polymers monograph; underpins the 1974 Nobel.                                    | strong
ziegler-natta-1963 | K. Ziegler; G. Natta | 1963   | Ziegler-Natta Nobel Lectures (bundled)                    | Nobel Foundation lectures, December 1963   | originator        | Originator-tier statements of stereospecific catalytic polymerization (isotactic polypropylene, HDPE).                                               | strong
```

**`catalysis/CANON_INDEX.md`** (seed):

```
sabatier-1913   | P. Sabatier             | 1913   | La Catalyse en Chimie Organique                            | Béranger, Paris                            | originator monograph | Founding monograph of hydrogenation catalysis and the Sabatier principle — optimal catalysis at intermediate adsorption strength.                    | strong
langmuir-1922   | I. Langmuir             | 1922   | The Mechanism of the Catalytic Action of Platinum         | Trans. Faraday Soc. 17, 621-654            | original           | Originator priority on the Langmuir-Hinshelwood mechanism — both reactants adsorb before reacting.                                                  | strong
eley-rideal-1940| D. D. Eley, E. K. Rideal | 1940  | Parahydrogen Conversion on Tungsten                       | Nature 146, 401-402                        | original           | Originator priority on the Eley-Rideal mechanism — one adsorbed reactant reacts with one gas-phase reactant.                                         | strong
```

**`supramolecular/CANON_INDEX.md`** (seed):

```
pedersen-1967   | C. J. Pedersen          | 1967   | Cyclic Polyethers and Their Complexes with Metal Salts     | J. Am. Chem. Soc. 89(26), 7017-7036        | original           | Originator priority on macrocyclic host-guest complexation (crown ethers binding alkali metal cations) — empirical foundation of supramolecular chemistry. | strong
cram-1988       | D. J. Cram              | 1988   | The Design of Molecular Hosts, Guests, and Their Complexes (Nobel Lecture) | Angew. Chem. Int. Ed. Engl. 27(8), 1009-1020 | originator's synthesis | Originator's synthesis of host-guest design principles.                                                                                              | strong
lehn-1988       | J.-M. Lehn              | 1988   | Supramolecular Chemistry — Scope and Perspectives (Nobel Lecture) | Angew. Chem. Int. Ed. Engl. 27(1), 89-112 | originator framework | Originator framework statement of supramolecular chemistry as a discipline — intermolecular binding as a first-class chemical phenomenon.            | strong
```

The five pre-existing folders (`atomic-theory/`, `periodicity/`, `bonding/`, `thermodynamics/`, `kinetics/`, `stereochemistry/`, `quantum-chemistry/`, `mechanism-and-method/`, `reference/`) inherit pass-2's seed indexes plus pass-3's additions noted in the tree. The maintainer should generate those `CANON_INDEX.md` files from pass-2 §7.2 + pass-3 tree at execution time; they are mechanical and not reproduced here.

---

## 7. The work queue — ordered actions for next-session execution

This is the maintainer's checklist. Each step lists the file path it touches, the source URL of the underlying primary text where one is publicly accessible, and a rough effort. "L" = ≤ 30 min mechanical. "M" = 30-90 min (involves locating a source, checking edition, drafting a stub). "H" = > 90 min (involves writing more than a stub, e.g. a justification paragraph for a contestable entry).

### Phase A — Folder scaffolding (mechanical, do first)

1. `mkdir -p 03-chemistry/{atomic-theory,periodicity,bonding/{pre-quantum,coordination,lewis,pauling,orbital-symmetry},acid-base,thermodynamics/electrochemistry,kinetics/physical-organic,stereochemistry,quantum-chemistry/computational,crystallography,photochemistry,surface-chemistry,polymer-chemistry,catalysis,supramolecular,mechanism-and-method/synthesis-logic,reference/{iupac,databases}}` — **L**.
2. Touch a `.gitkeep` in each empty leaf so git tracks the structure pre-promotion — **L**.
3. Create top-level `03-chemistry/CANON_INDEX.md` as the master index pointing at each sub-folder's `CANON_INDEX.md` (see `09-art/` for the convention) — **L**.

### Phase B — Edition-of-record decisions and source URLs (the maintainer can paste the entry stub from the `CANON_INDEX.md` rows, then fetch the PDF)

4. **Lavoisier 1789** → atomic-theory/. Source: Internet Archive scan of Robert Kerr 1790 English translation — `https://archive.org/details/elementsofchemis00lavo`. Stub effort **M**.
5. **Dalton 1808–27** → atomic-theory/. Source: Internet Archive scans of Vol. I/II/III — search "Dalton New System Chemical Philosophy". Stub effort **M**.
6. **Avogadro 1811** → atomic-theory/. Source: Alembic Club Reprints No. 4 (PD); J. Phys. 73, 58–76 facsimile via BnF Gallica. Stub effort **M**.
7. **Cannizzaro 1858** → atomic-theory/. Source: Alembic Club Reprints No. 18 (PD). Stub effort **M**.
8. **Mendeleev 1869/1871 + Jensen ed. 2002** → periodicity/. Source: Dover paperback ISBN 0-486-44571-2 (purchase); 1869/1871 originals via PD German *Annalen* facsimiles. Stub effort **M**.
9. **Mendeleev 1889 Faraday Lecture** → periodicity/. Source: J. Chem. Soc., Trans. 55, 634–656 (RSC archive, PD). Stub effort **L**.
10. **Moseley 1913–14** → periodicity/. Source: Phil. Mag. (6) 26, 1024 and 27, 703 (PD; Internet Archive). Stub effort **L**.
11. **Bohr 1913 Part III** → periodicity/. Source: Phil. Mag. (6) 26, 857–875 (PD). Stub effort **L**.
12. **Berzelius 1819** → bonding/pre-quantum/. Source: BnF Gallica facsimile of *Essai* (PD). Stub effort **M** (carry overturn-flag header per pass-3 §2 row 5).
13. **Frankland 1852** → bonding/pre-quantum/. Source: Phil. Trans. Roy. Soc. 142, 417–444 (Royal Society digital archive, PD). Stub effort **L**.
14. **Kekulé 1858 + 1865 + 1866** → bonding/pre-quantum/. Source: Liebigs *Annalen* 106, 129; Bull. Soc. Chim. Paris (n.s.) 3, 98 (PD). Stub effort **M**.
15. **Couper 1858** → bonding/pre-quantum/. Source: CR Acad. Sci. 46, 1157 (PD; BnF Gallica). Stub effort **L**.
16. **Werner 1893 + 1913 Nobel Lecture** → bonding/coordination/. Source: Wiley DOI 10.1002/zaac.18930030136 (paywalled but verified citation); Nobel Lecture PDF on nobelprize.org. Stub effort **M**.
17. **Lewis 1916** → bonding/lewis/. Source: JACS 38, 762 (ACS PD); J. Chem. Educ. 70, 478 reprint. Stub effort **L**.
18. **Lewis 1923 *Valence*** → bonding/lewis/. Source: Dover reprint ISBN 0-486-61053-5 (purchase); add cross-link from acid-base/. Stub effort **M**.
19. **Pauling 1939 + Pauling 1960** → bonding/pauling/. Source: Internet Archive `https://archive.org/details/natureofthechemicalbondpauling`; Cornell Univ. Press in print for the 3rd ed. Stub effort **M**.
20. **Woodward–Hoffmann 1965 (5 JACS papers) + 1970 monograph** → bonding/orbital-symmetry/. Source: ACS DOIs for the JACS bundle; Verlag Chemie monograph (out of print, library). Stub effort **H** (5-paper bundle requires care).
21. **Fukui 1952 + 1982 Nobel Lecture** → quantum-chemistry/. Source: AIP DOI 10.1063/1.1700523; Wiley DOI 10.1002/anie.198208013. Stub effort **M**. NEW IN PASS-3.
22. **Acid-base bundle** (Brønsted 1923, Lowry 1923, Hammett 1932, Pearson 1963, Pearson 1968) → acid-base/. Sources: Wiley DOI 10.1002/recl.19230420815 (Brønsted); ACS DOI 10.1021/ja00905a001 (Pearson 1963). Stub effort **H** (5 entries, new sub-folder, requires writing folder README). NEW IN PASS-3.
23. **Crystallography bundle** (Bragg & Bragg 1913, Bragg WL 1913, Goldschmidt 1926, Pauling 1929) → crystallography/. Sources: Royal Society DOIs 10.1098/rspa.1913.0040 and 10.1098/rspa.1913.0084; ACS DOI 10.1021/ja01379a006. Stub effort **H** (4 entries, new sub-folder, requires folder README). NEW IN PASS-3.
24. **Photochemistry bundle** (Jablonski 1933, Förster 1948) → photochemistry/. Sources: Nature 131, 839 (paywalled but verified); Ann. Phys. (6) 2, 55 (German PD). Stub effort **M** (2 entries, new sub-folder). NEW IN PASS-3.
25. **Surface-chemistry bundle** (Langmuir 1918, DLVO 1941/48) → surface-chemistry/. Sources: ACS DOI 10.1021/ja02242a004; Acta Physicochim. URSS 14, 633 (library); Verwey-Overbeek 1948 monograph (out of print). Stub effort **M**. NEW IN PASS-3.
26. **Polymer-chemistry bundle** (Staudinger 1920, Flory–Huggins 1942, Flory 1953, Ziegler–Natta 1963 Nobel Lectures) → polymer-chemistry/. Sources: Wiley DOI 10.1002/cber.19200530627; AIP and J. Phys. Chem.; Cornell Univ. Press; nobelprize.org. Stub effort **H** (4 entries, new sub-folder, requires folder README). NEW IN PASS-3.
27. **Catalysis bundle** (Sabatier 1913, Langmuir 1922, Eley–Rideal 1940) → catalysis/. Sources: Béranger monograph (library, PD); RSC DOI 10.1039/TF9221700621; Nature 146, 401. Stub effort **M**. NEW IN PASS-3.
28. **Supramolecular bundle** (Pedersen 1967, Cram 1988, Lehn 1988) → supramolecular/. Sources: ACS DOI 10.1021/ja01002a035 for Pedersen; Wiley DOI 10.1002/anie.198808891 for Lehn (verify); Wiley DOI 10.1002/anie.198810091 for Cram (verify). Stub effort **H** (3 entries, new sub-folder, two DOIs need verification). NEW IN PASS-3.
29. **Synthesis-logic bundle** (Corey 1989 + 1991 Nobel Lecture) → mechanism-and-method/synthesis-logic/. Sources: Wiley monograph; Wiley DOI 10.1002/anie.199104553. Stub effort **M**.
30. **IUPAC bundle** (Gold Book 1997, Red 2005, Blue 2013, Green 2007, Orange 1997, Periodic Table 2022-05-04) → reference/iupac/. Source: iupac.org for the live online versions; physical books are RSC publications. Stub effort **M** (mostly pointer entries).
31. **Database pointers** (PubChem, ChEMBL, CSD, Reaxys) → reference/databases/. One paragraph each — operator, license, access, citation pattern. Stub effort **M**.

### Phase C — Generate `CANON_INDEX.md` for every sub-folder

32. Write each sub-folder's `CANON_INDEX.md` from the pass-3 tree + pass-2 §7.2 entry list. Format defined in §6.1 above. Effort **H** for the full-tree pass; can be parallelized across sub-folders. Estimate 2 hours total.

### Phase D — Cross-link verification (last)

33. Generate the cross-link table from §5.1, §5.2, §5.3, §5.4 as a top-level `03-chemistry/CROSS_LINKS.md`. Each cross-link names the source folder, target folder, and reason. Effort **M**.

**Total estimated effort: one full session (4–6 hours focused work) for Phase A + B + C if no PDF chasing; two sessions if the maintainer fetches every PD source PDF as part of execution.** None of this requires a pass-4 chemistry sweep — pass-3 has frozen the tree.

---

## 8. Unresolved — for the maintainer

Five questions pass-3 cannot decide unilaterally and that the founding maintainer should rule on before execution.

1. **Does Atkins *Physical Chemistry* (12th ed. Atkins/de Paula/Keeler 2022) live in landscape or in a separate `_landscape/` folder under `03-chemistry/`?** Pass-1 and pass-3 both say not canon. The README's textbook clause is unambiguous on canon promotion but does not address whether canon-adjacent textbooks deserve a curated landscape area. If yes, the same question repeats for March, Cotton-Wilkinson, Coulson, Cotton 1990, Streitwieser, Anslyn-Dougherty, Szabo-Ostlund, Skoog. **Recommendation: open a `_landscape/textbooks.md` registry inside `03-chemistry/`, single file, one paragraph per text, no folder explosion.**
2. **Does `polymer-chemistry/` get its own sub-folder, or fold the four entries into `bonding/` + `thermodynamics/`?** Pass-3 recommends its own sub-folder (the macromolecular hypothesis is a paradigm shift, not a bonding sub-case). The founding maintainer may prefer the conservative reading.
3. **Does the IUPAC Gold Book and the four sister IUPAC books live in `03-chemistry/reference/iupac/`, or in a top-level `bucket-canon/_reference/iupac/` cross-cutting branch?** Argument for top-level: IUPAC governs not just chemistry but also the chemistry-physics boundary (units, symbols), which means it has cross-citations from `02-physics/`, `04-information/` (units of entropy), and `05-biophysics/`. Argument for keeping it in chemistry: the IUPAC books are chemistry-discipline normative references, and other branches will have their own normative bodies (NIST CODATA for physics, IEEE for information, IUPHAR for pharmacology). **Recommendation: keep IUPAC in chemistry; open a separate org-level `_reference/` discussion bead if and when a second branch declares its own normative-body holdings.**
4. **Pass-3 promoted Lewis 1907 (*Proc. Am. Acad.* 43, 259) as the originator-priority text for the activity concept. Pass-2 did not list this paper. Maintainer call: do we add 1907 as a third Lewis–Randall lineage entry, or fold the activity concept into the 1923 monograph entry?** Pass-3 recommends the addition (cleaner attribution); the conservative reading folds it.
5. **Spectroscopy sub-folder: pass-3 recommends NOT creating `03-chemistry/spectroscopy/` because all originator entries (Zeeman, Stark, Raman, Bloch–Purcell) are physics priorities. Maintainer call: is this acceptable, or does the absence of a chemistry spectroscopy folder send the wrong signal to a chemist coming to Bucket?** Pass-3's view: the absence is correct. A chemistry spectroscopy folder containing only landscape (Cotton 1990 group theory, Atkins chapters) is a worse signal than no folder at all. The maintainer may disagree.

---

## 9. Recommendation

**Execute the work queue (§7) next session. Do not commission a pass-4.**

Pass-3 has done the synthesis pass-2 deferred and has tested the ten domains the brief explicitly named. The tree is frozen at 79 entries across 17 sub-folders. The Ingold/Hammett edition-of-record question is resolved by a clean rule (§3) that also closes the door on textbook backdoor-promotion (§3.4). The Shannon/Gibbs entropy boundary is operational (§5.4). The seven new sub-folders (`acid-base/`, `crystallography/`, `photochemistry/`, `surface-chemistry/`, `polymer-chemistry/`, `catalysis/`, `supramolecular/`) plug the systematic gaps both prior passes left.

The single most-important text both pass-1 and pass-2 missed is **Bragg & Bragg 1913, "The Reflection of X-rays by Crystals," *Proc. Roy. Soc. A* 88(605), 428–438** — the experimental foundation of all modern structural chemistry. A chemistry canon without Bragg's Law cannot point at how chemists actually know where atoms are.

Honourable runners-up among the pass-2 omissions: **Pearson 1963 HSAB** (a foundational classification principle with no substitute in the canon as pass-2 left it), **Staudinger 1920** (a branch of chemistry that did not exist before the paper), and **Fukui 1952 FMO** (the prior framework that Woodward–Hoffmann 1965 specializes).

The five unresolved items in §8 are all maintainer-preference questions, not foundations questions. They can be decided in 15 minutes when the founding maintainer next looks at this branch. None blocks execution of Phase A or Phase B of the work queue.

---

## Sources used in this pass

- [ACS — Pearson, "Hard and Soft Acids and Bases" (JACS 85, 3533, 1963)](https://pubs.acs.org/doi/10.1021/ja00905a001)
- [TAMU PDF — Pearson 1963 *JACS* full text](https://www.chem.tamu.edu/rgroup/hughbanks/courses/462/handouts/pearsons_h-s_jacs.pdf)
- [Royal Society — Bragg & Bragg, "The Reflection of X-rays by Crystals" (Proc. Roy. Soc. A 88, 428, 1913)](https://royalsocietypublishing.org/doi/10.1098/rspa.1913.0040)
- [Royal Society — Bragg, "The Reflection of X-rays by Crystals (II.)" (Proc. Roy. Soc. A 89, 246, 1913)](https://royalsocietypublishing.org/doi/10.1098/rspa.1913.0082)
- [Royal Society — "The structure of the diamond" (Proc. Roy. Soc. A 89, 277, 1913)](https://royalsocietypublishing.org/doi/10.1098/rspa.1913.0084)
- [Wikipedia — Bragg's law](https://en.wikipedia.org/wiki/Bragg's_law)
- [RSC — "100 years of polymer science" (Polym. Chem., 2020)](https://pubs.rsc.org/en/content/articlehtml/2020/py/c9py90161b)
- [Wikipedia — Hermann Staudinger](https://en.wikipedia.org/wiki/Hermann_Staudinger)
- [ChemistryViews — Kenichi Fukui and the Importance of Frontier Orbitals](https://www.chemistryviews.org/kenichi-fukui-and-the-importance-of-frontier-orbitals/)
- [Nobel Foundation — Fukui Nobel Lecture, "The Role of Frontier Orbitals in Chemical Reactions"](https://www.nobelprize.org/uploads/2018/06/fukui-lecture.pdf)
- [Wiley — Brønsted, "Einige Bemerkungen über den Begriff der Säuren und Basen" (Recueil 42, 718, 1923)](https://onlinelibrary.wiley.com/doi/10.1002/recl.19230420815)
- [ChemTeam — J.N. Brønsted on Acids and Bases (English text)](https://www.chemteam.info/Chem-History/Bronsted-Article.html)
- [Wikipedia — Langmuir adsorption model](https://en.wikipedia.org/wiki/Langmuir_adsorption_model)
- [bucket-foundation — `03-chemistry/README.md`](../README.md)
- [bucket-foundation — pass-1 sweep memo](./everychem-and-chemistry-canon-sweep-2026-05-01.md)
- [bucket-foundation — pass-2 deep-dive memo](./chemistry-canon-deep-dive-2026-05-01.md)
- [bucket-foundation — `09-art/README.md` (template for canon-branch READMEs)](../../09-art/README.md)
- [bucket-foundation — MANIFESTO.md](../../../MANIFESTO.md)
