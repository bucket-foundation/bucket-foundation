# Chemistry Canon — Deep Dive (Pass 2) — 2026-05-01

Intake document. Not promoted. Builds on the first-pass sweep at
`_intake/everychem-and-chemistry-canon-sweep-2026-05-01.md` (which opened
the branch and listed the obvious primaries). This memo goes deeper on
seven sub-domains, names edition-of-record on each text, and proposes the
final folder structure. Promotion to canon proper is a separate bead.

Author: data pillar.
Method: reread of the pass-1 memo + `03-chemistry/README.md` + `09-art/README.md`
template + `MANIFESTO.md`; targeted verification of journal volumes/pages and
edition history via WebSearch (Wiley, APS, AIP, PMC, Internet Archive,
Cornell University Press, Oregon State Pauling Archive, ACS).

---

## 1. Bonding & valence — full canon stack

The bonding lineage is the spine of chemistry. Pass-1 listed Lewis 1916,
Lewis 1923, Pauling 1939/1960, and Woodward–Hoffmann 1970. That is correct
but incomplete. The full chain has thirteen load-bearing entries; eight
should promote, the rest are landscape.

### 1.1 The pre-quantum lineage (chemistry's 19th-century theory of structure)

**Jöns Jacob Berzelius — *Essai sur la théorie des proportions chimiques
et sur l'influence chimique de l'électricité*, Méquignon-Marvis, Paris,
1819.** Edition of record: the 1819 Paris first edition (PD; Bibliothèque
nationale facsimile). Mechanism: electrochemical dualism — every compound
is a binary union of an electropositive and an electronegative part,
coupled by an electrostatic affinity measurable on the voltaic pile. This
is the first *mechanism-level* theory of why atoms combine in fixed ratios,
and the first chemistry that derives bonding from a measured physical
quantity rather than postulating it. **Promote.** Bucket bar: primary
statement of a law (electrochemical affinity) by the originator. Folder:
`bonding/pre-quantum/`. Caveat: the dualistic theory was wrong about
organic compounds (overthrown by Laurent and Gerhardt's substitution
theory in the 1840s); it is canon as the *first* mechanistic bonding
theory, not as a still-correct one.

**Edward Frankland — "On a New Series of Organic Bodies Containing
Metals," *Philosophical Transactions of the Royal Society of London* 142,
417–444, 1852.** Edition of record: the *Phil. Trans.* paper itself (PD,
Royal Society digital archive). Mechanism: the concept of *combining
power* (later called valence) — that each element has a fixed number of
bonds it can form, and that organic and inorganic compounds obey the same
arithmetic. The word "valence" itself comes later (Kekulé 1858 popularizes
*Atomigkeit*; Wichelhaus 1868 introduces *Valenz*); Frankland's paper is
the first quantitative claim. **Promote.** Folder: `bonding/pre-quantum/`.

**August Kekulé — "Über die Constitution und die Metamorphosen der
chemischen Verbindungen und über die chemische Natur des Kohlenstoffs,"
*Annalen der Chemie und Pharmacie* 106, 129–159, 1858.** Companion: the
benzene papers, "Sur la constitution des substances aromatiques," *Bulletin
de la Société Chimique de Paris* (n.s.) 3, 98–110, 1865; and "Untersuchungen
über aromatische Verbindungen," *Annalen* 137, 129–196, 1866. Mechanism:
tetravalent carbon and the linkage theory of organic structure (1858); the
hexagonal ring closure of benzene (1865). The 1858 paper is the load-bearing
one — it is where carbon's valence of four and the chain hypothesis are
stated together for the first time. The 1865 benzene paper is canon for
historical priority on aromatic structure even though resonance theory
(Pauling) and MO theory (Hückel) later supplied the mechanism. Pass-1
flagged Kekulé as "cite as reference, do not promote"; this memo
**reverses that** — the 1858 *Annalen* paper meets the bar (originator,
mechanism, edition-of-record extant). The 1865/1866 benzene papers are
promoted as a single bundled entry. Folder: `bonding/pre-quantum/`.

**Archibald Scott Couper — "Sur une nouvelle théorie chimique," *Comptes
rendus hebdomadaires des séances de l'Académie des sciences* 46, 1157–1160,
1858; expanded in *Annales de Chimie et de Physique* (3rd ser.) 53, 469–489,
1858.** Mechanism: independent and near-simultaneous statement of carbon
chains and tetravalent carbon, with the first published structural formulas
using explicit bond-lines. The Kekulé/Couper priority dispute is the canonical
example of independent codiscovery in chemistry. **Promote** alongside
Kekulé 1858. Folder: `bonding/pre-quantum/`.

**Jacobus Henricus van 't Hoff** and **Joseph Achille Le Bel**, 1874 — the
two stereochemistry founding papers. Treated in §5; cross-link from
`bonding/`.

**Alfred Werner — "Beitrag zur Konstitution anorganischer Verbindungen,"
*Zeitschrift für anorganische Chemie* 3, 267–330, 1893.** Companion: the
1913 Nobel Lecture, "On the Constitution and Configuration of Higher-Order
Compounds" (Nobel Foundation, English translation in *Nobel Lectures,
Chemistry 1901–1921*, Elsevier, 1966). Mechanism: coordination theory —
metal centres have a *primary valence* (oxidation state) and a *secondary
valence* (coordination number, typically 6 or 4) that determines spatial
arrangement of ligands. This is the founding text of inorganic structural
chemistry; without it the entire later theory of d-block bonding (crystal
field, ligand field, MO) has no scaffold. Pass-1 omitted Werner. **Promote.**
Folder: `bonding/coordination/` (new sub-folder under `bonding/`). Verified
citation: Wiley DOI 10.1002/zaac.18930030136.

### 1.2 Lewis and the shared-electron-pair bond

**Gilbert Newton Lewis — "The Atom and the Molecule," *Journal of the
American Chemical Society* 38(4), 762–785, 1916.** Already in pass-1.
**Promote.**

**Gilbert Newton Lewis — *Valence and the Structure of Atoms and Molecules*,
Chemical Catalog Co., New York, 1923; Dover reprint 1966 (ISBN
0-486-61053-5).** Already in pass-1. **Promote.** Edition of record:
the 1923 first edition (the Dover reprint is the practical access copy
and is unaltered).

### 1.3 The quantum-mechanical bond

**Walter Heitler and Fritz London — "Wechselwirkung neutraler Atome und
homöopolare Bindung nach der Quantenmechanik," *Zeitschrift für Physik*
44(6–7), 455–472, 1927.** Already in pass-1. **Promote.** Mechanism:
the first calculation showing that two neutral hydrogen atoms bind via
the antisymmetrization (exchange) of their electron wavefunctions — the
moment chemistry stops being a phenomenological discipline and becomes
derivable from physics. Edition of record: the 1927 *Z. Phys.* paper.
The 1928 follow-up by London ("Zur Quantentheorie der homöopolaren
Valenzzahlen," *Z. Phys.* 46, 455–477) extends the treatment to polyatomics
and is a candidate for inclusion as a companion entry — recommend including
it as a footnoted appendix to the 1927 paper rather than a separate canon
entry.

**Friedrich Hund — "Zur Deutung verwickelter Spektren, insbesondere der
Elemente Scandium bis Nickel," *Zeitschrift für Physik* 33, 345–371, 1925**
(the *Hund's rules* paper for atomic terms); and "Zur Deutung der
Molekelspektren," parts I–IV, *Zeitschrift für Physik* 1927–1928 (40, 742;
42, 93; 43, 805; 51, 759). Mechanism: the rules for ground-state coupling
of electron spins and orbital angular momenta in atoms and molecules — the
combinatorial backbone of every term-symbol calculation in chemistry. Edition
of record: the original *Z. Phys.* paper series. **Promote** as a bundled
"Hund 1925–1928" entry. Folder: `quantum-chemistry/`.

**Robert S. Mulliken — "The Assignment of Quantum Numbers for Electrons
in Molecules. I.," *Physical Review* 32, 186–222, 1928; II., *Phys. Rev.*
32, 761–772, 1928; III., *Phys. Rev.* 33, 730–747, 1929; "Electronic
Structures of Polyatomic Molecules and Valence," *Phys. Rev.* 40, 55–62,
1932; 41, 49–71, 1932; 41, 751–758, 1932.** Companion: Nobel Lecture,
"Spectroscopy, Molecular Orbitals, and Chemical Bonding," 1966 (Nobel
Foundation). Mechanism: molecular-orbital theory — molecular states built
from delocalized one-electron orbitals over the whole nuclear framework,
parametrized by symmetry. The MO/VB rivalry that organized 20th-century
chemistry begins here. Edition of record at the discipline-summary level:
the **1966 Nobel Lecture** is the cleanest single-document canon entry,
because Mulliken himself synthesizes the paper series. **Promote** the
Nobel Lecture as the lead entry, with the *Phys. Rev.* paper series cited
as primary sources. Folder: `quantum-chemistry/`.

**Erich Hückel — "Quantentheoretische Beiträge zum Benzolproblem. I. Die
Elektronenkonfiguration des Benzols und verwandter Verbindungen,"
*Zeitschrift für Physik* 70, 204–286, 1931; II. *Z. Phys.* 72, 310–337,
1931; III. *Z. Phys.* 76, 628–648, 1932.** Mechanism: the Hückel method
for π-electron systems in planar conjugated molecules and the (4n+2)
aromaticity rule. This is the first chemistry-side application of MO
theory that *predicts* something organic chemists could test (aromaticity
of cyclopentadienyl anion, antiaromaticity of cyclobutadiene). **Promote.**
Folder: `quantum-chemistry/` with cross-link to `bonding/`.

**Linus Pauling — *The Nature of the Chemical Bond and the Structure of
Molecules and Crystals*, Cornell University Press, Ithaca, 1939; 2nd ed.
1940; 3rd ed. 1960 (ISBN 0-8014-0333-2 hardcover; ISBN 978-0-8014-0333-0).**
Edition of record: **3rd edition, 1960**. Justification: the 1939 first
edition is the originator-tier statement of resonance theory, hybridization,
electronegativity, and the integration of valence-bond theory with structural
chemistry. The 1940 second edition is a minor revision (printer's
corrections plus an added chapter on the hydrogen bond); it is not
substantively different from the first. The 1960 third edition is a
**substantial rewrite**: it incorporates twenty years of structural data,
expands the electronegativity scale, adds the chapter on metals and the
unsynchronized resonance theory, and is the version that the next two
generations of chemists actually read (the pre-publication advance sale
was the largest in Cornell University Press history per Cornell's own
record). The 1939 edition is canon-eligible as the originator text but
the 1960 edition is the discipline's edition-of-record and is what Bucket
should hold. **Promote 1960; cite 1939 as the originator first-edition.**
Folder: `bonding/`.

**Robert B. Woodward and Roald Hoffmann — five communications in *J. Am.
Chem. Soc.* in 1965 (volume 87): "Stereochemistry of Electrocyclic
Reactions," 87, 395 (1965); "Selection Rules for Sigmatropic Reactions,"
87, 2511 (1965); "Selection Rules for Concerted Cycloaddition Reactions,"
87, 2046 (1965); "Orbital Symmetries and endo-exo Relationships in
Concerted Cycloaddition Reactions," 87, 4388 (1965); "Orbital Symmetries
and Selection Rules for Photochemical Reactions," 87, 4389 (1965).
Monograph: *The Conservation of Orbital Symmetry*, Verlag Chemie / Academic
Press, Weinheim / New York, 1970 (ISBN 3-527-25380-4); originally appeared
as a review in *Angewandte Chemie International Edition* 8, 781–853, 1969.**
Edition of record: the **1970 monograph** for the synthesis; the five 1965
*JACS* communications for the originator priority. Mechanism: pericyclic
reactions are governed by the symmetry of the participating molecular
orbitals; reactions allowed in one mode (thermal) are forbidden in the
other (photochemical), with sign and exponent given by simple counting
rules (4n+2 / 4n; suprafacial / antarafacial). The unification of a
century of organic-chemistry observations under a single symmetry
principle. **Promote** the 1970 monograph as the lead entry, with the
five 1965 *JACS* communications bundled as the originator-priority record.
Folder: `bonding/orbital-symmetry/` with cross-link to `kinetics/` and
`quantum-chemistry/`.

### 1.4 Recommended `03-chemistry/bonding/CANON_INDEX.md` draft

```
bonding/
  CANON_INDEX.md
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
    1939-pauling-nature-of-the-chemical-bond-1st.md   (originator)
    1960-pauling-nature-of-the-chemical-bond-3rd.md   (edition of record)
  orbital-symmetry/
    1965-woodward-hoffmann-jacs-bundle.md
    1970-woodward-hoffmann-conservation-orbital-symmetry.md
```

The Hückel / Hund / Mulliken / Heitler–London entries live in
`quantum-chemistry/` with hard cross-links from `bonding/`. Splitting them
across two folders keeps the bonding folder readable as the
*chemistry-side* lineage while the *quantum-side* primaries live in
`quantum-chemistry/`.

---

## 2. Thermodynamics & statistical mechanics of chemical systems

The boundary recommendation comes first because every other entry depends on it.

**Boundary rule (proposed):** Pure statistical mechanics (Maxwell, Boltzmann,
Gibbs's *Elementary Principles in Statistical Mechanics* 1902) lives in
`02-physics/statistical-mechanics/`. The *chemical* application — chemical
potential, phase rule, fugacity, activity coefficients, ionic-strength
corrections to activity, Nernst-Planck transport, and the equilibrium
formulation of chemical reactions — lives here. The single text that
straddles both is Gibbs 1875–78; it is canon in **both** branches with
the original entry in `02-physics/` and a cross-link from `03-chemistry/`.

### 2.1 The classical thermodynamics chain (mostly physics)

**Sadi Carnot — *Réflexions sur la puissance motrice du feu et sur les
machines propres à développer cette puissance*, Bachelier, Paris, 1824.**
Belongs in `02-physics/thermodynamics/`. Cite from chemistry. Do not
duplicate.

**Rudolf Clausius — "Über die bewegende Kraft der Wärme," *Annalen der
Physik* 79, 368–397 and 500–524, 1850; "Über verschiedene für die
Anwendung bequeme Formen der Hauptgleichungen der mechanischen
Wärmetheorie," *Annalen der Physik* 125, 353–400, 1865** (the paper in
which entropy is named). Belongs in `02-physics/`. Cite from chemistry.

**William Thomson (Lord Kelvin)** — temperature scale and the second law
formulation. Belongs in `02-physics/`.

**Hermann von Helmholtz — "Die Thermodynamik chemischer Vorgänge,"
*Sitzungsberichte der Königlich Preussischen Akademie der Wissenschaften
zu Berlin*, 22–39, 1882.** Mechanism: introduces the *free energy* (the
Helmholtz function A = U − TS) as the chemical-work potential, and
derives the temperature dependence of cell EMF from it (the Gibbs–Helmholtz
equation). This paper is **chemistry-side canon** because Helmholtz frames
the result as a theory of *chemical reaction*, not as a generalization of
the second law. **Promote.** Folder: `thermodynamics/`.

### 2.2 The Gibbs-centred chemistry-side canon

**Josiah Willard Gibbs — "On the Equilibrium of Heterogeneous Substances,"
*Transactions of the Connecticut Academy of Arts and Sciences* 3,
108–248 (1875–1876) and 343–524 (1877–1878).** Edition of record: *The
Scientific Papers of J. Willard Gibbs*, Vol. I: *Thermodynamics*, edited
by Henry Andrews Bumstead and Ralph Gibbs Van Name, Longmans Green & Co.,
London, 1906; Dover reprint of the two-volume set, 1961 (ISBN
0-486-60721-2 for the set). The original *Trans. Conn. Acad.* publication
is the priority-of-record but is physically inaccessible (the journal had
a print run of a few hundred copies, distributed to a list Gibbs personally
maintained). The Bumstead–Van Name edition is the universally-cited
edition-of-record and is what Bucket should mirror. Mechanism: the
chemical-potential μ_i = (∂G/∂n_i) formulation of equilibrium; the phase
rule F = C − P + 2; the Gibbs free energy as the spontaneity criterion at
constant T and P; the Gibbs–Duhem relation. Already in pass-1. **Promote.**
Folder: `thermodynamics/`.

**Jacobus Henricus van 't Hoff — *Études de dynamique chimique*, Frederik
Muller, Amsterdam, 1884.** Mechanism: the integrated form of the
equilibrium constant and its temperature dependence (the van 't Hoff
equation d ln K / dT = ΔH°/RT²); the kinetic theory of dilute solutions;
osmotic pressure as the analog of gas pressure. Van 't Hoff was the first
Nobel laureate in Chemistry (1901) for exactly this work. **Promote.**
Folder: `thermodynamics/`. Edition of record: the 1884 first edition; an
English translation by T. Ewan, *Studies in Chemical Dynamics*, Williams
& Norgate, London, 1896, exists and is acceptable for the Bucket mirror.

**Walther Nernst — "Die elektromotorische Wirksamkeit der Ionen,"
*Zeitschrift für physikalische Chemie* 4, 129–181, 1889** (the Nernst
electrode equation), and **"Über die Berechnung chemischer Gleichgewichte
aus thermischen Messungen," *Nachrichten von der Königlichen Gesellschaft
der Wissenschaften zu Göttingen, Mathematisch-Physikalische Klasse* 1,
1–40, 1906** (the Nernst heat theorem, later canonized as the Third Law).
Mechanism: the EMF of an electrochemical cell as a function of activity
of the redox couple (1889); the limit lim_{T→0} ΔS = 0 for crystalline
substances (1906). The 1906 paper is the chemistry-side priority for the
Third Law and is canon in `03-chemistry/`, with a hard cross-link to
`02-physics/thermodynamics/`. **Promote both.** Folder: `thermodynamics/`
(or `electrochemistry/` if that splits later — see §2.3).

**Gilbert Newton Lewis and Merle Randall — *Thermodynamics and the Free
Energy of Chemical Substances*, McGraw-Hill, New York, 1923; revised as
Lewis, Randall, Pitzer, Brewer, *Thermodynamics*, 2nd ed. McGraw-Hill,
1961 (ISBN 0-07-037570-7).** Edition of record: the **1923 first edition**
for originator priority on the activity / activity-coefficient framework
and the systematic tabulation of standard free energies; the **1961
second edition (Pitzer & Brewer)** for the discipline-standard reference
text. This is the textbook that *defined* chemical thermodynamics as a
practitioner discipline. Pass-1 flagged it as borderline. **This memo
recommends promotion** under condition 2 of the README (recognized
academic edition-of-record), with the load-bearing element being the
activity / activity-coefficient framework introduced here for the first
time. Folder: `thermodynamics/`. Both editions are canon-eligible; if
only one is mirrored, mirror the 1961 Pitzer–Brewer revision because it
is the version that physical chemists trained on for fifty years.

### 2.3 Electrochemistry — split or fold?

**Recommendation: do not split yet.** Nernst 1889, Nernst 1906, and Debye–
Hückel ("Zur Theorie der Elektrolyte. I. Gefrierpunktserniedrigung und
verwandte Erscheinungen," *Physikalische Zeitschrift* 24, 185–206, 1923)
are the three primaries; with three entries an `electrochemistry/`
sub-folder under `thermodynamics/` is justified, but a dedicated branch
sibling is not. Use `thermodynamics/electrochemistry/` and re-evaluate if
a fourth electrochemistry primary appears.

---

## 3. Kinetics & reaction mechanism

Pass-1 covered Arrhenius, Eyring, and Marcus. The chain is longer and
contains two textbook-tier entries (Ingold and Hammett) that pass-1
flagged but did not promote.

### 3.1 The rate-law and activation-energy chain

**Svante Arrhenius — "Über die Reaktionsgeschwindigkeit bei der Inversion
von Rohrzucker durch Säuren," *Zeitschrift für physikalische Chemie* 4,
226–248, 1889.** Already in pass-1. **Promote.** Mechanism: rate constant
k = A exp(−E_a/RT); the activation-energy concept as a thermodynamic
barrier between reactants and products. Folder: `kinetics/`.

**Max Bodenstein — chain-reaction papers in *Zeitschrift für
physikalische Chemie* 1894–1913 (the H₂/Br₂ chain mechanism, *Z. phys.
Chem.* 85, 329–397, 1913, with K. F. Lind), and the **steady-state
approximation** (Bodenstein 1913; popularized by Christiansen 1919).
Mechanism: the steady-state hypothesis [intermediate]/dt ≈ 0, the
foundational simplification of every modern kinetic mechanism. **Promote**
the 1913 H₂/Br₂ paper as the originator entry. Folder: `kinetics/`.

**Frederick Lindemann — "The Radiation Theory of Chemical Action,"
*Transactions of the Faraday Society* 17, 598–606, 1922.** Mechanism: the
Lindemann–Hinshelwood mechanism for unimolecular reactions, explaining
why "unimolecular" reactions become second-order at low pressure (the
collision activation step becomes rate-limiting). The first mechanism
that resolved the apparent paradox of unimolecular gas-phase decomposition.
**Promote.** Folder: `kinetics/`.

**Cyril Hinshelwood and Nikolay Semenov — joint Nobel 1956 lectures,
"Chemical Kinetics in Recent Years" (Hinshelwood) and "Some Problems
Relating to Chain Reactions and to the Theory of Combustion" (Semenov),
Nobel Foundation 1956.** The Nobel Lectures are the cleanest single-
document canon entries for the chain-branching theory of explosions and
combustion. The underlying papers (Semenov, *Chemical Kinetics and Chain
Reactions*, Oxford UP, 1935; Hinshelwood, *The Kinetics of Chemical
Change in Gaseous Systems*, Oxford UP, 1926, 4th ed. 1940) are the book
forms. **Promote** the joint 1956 Nobel Lectures as the bundled entry.
Folder: `kinetics/`.

**Henry Eyring — "The Activated Complex in Chemical Reactions," *Journal
of Chemical Physics* 3(2), 107–115, 1935.** Companion: M. G. Evans and
Michael Polanyi, "Some Applications of the Transition State Method to
the Calculation of Reaction Velocities, Especially in Solution,"
*Transactions of the Faraday Society* 31, 875–894, 1935. Already in
pass-1. **Promote both as a 1935 bundle.** Edition of record at the
discipline-summary level: Samuel Glasstone, Keith J. Laidler, and Henry
Eyring, *The Theory of Rate Processes*, McGraw-Hill, New York, 1941 —
the textbook that codified TST for the practitioner generation; canon-
eligible under condition 2 (recognized synthesis), recommend including
as a secondary entry alongside the 1935 originator papers. Folder:
`kinetics/`.

**RRKM theory — R. A. Marcus and O. K. Rice, "The Kinetics of the
Recombination of Methyl Radicals and Iodine Atoms," *Journal of Physical
and Colloid Chemistry* 55, 894–908, 1951; R. A. Marcus, "Unimolecular
Dissociations and Free Radical Recombination Reactions," *J. Chem. Phys.*
20, 359–364, 1952.** Mechanism: the statistical theory of unimolecular
reactions (Rice–Ramsperger–Kassel–Marcus), the modern theory of microcanonical
rate constants. **Promote** the 1952 *J. Chem. Phys.* paper as the entry.
Folder: `kinetics/`.

**Rudolph Marcus — "On the Theory of Oxidation–Reduction Reactions
Involving Electron Transfer. I.," *Journal of Chemical Physics* 24,
966–978, 1956.** Already in pass-1. **Promote.** Companion edition-of-
record at the synthesis level: the **1992 Nobel Lecture**, "Electron
Transfer Reactions in Chemistry: Theory and Experiment," Nobel Foundation
1992 / *Reviews of Modern Physics* 65, 599–610, 1993. Mechanism: outer-
sphere electron transfer rate as a function of reorganization energy λ
and driving force ΔG°; the famous *inverted region* prediction (rate
*decreases* as ΔG° becomes more negative beyond the optimum), confirmed
experimentally by Closs and Miller in 1984. Folder: `kinetics/`.

### 3.2 Physical-organic chemistry — the textbook tier

**Christopher Kelk Ingold — *Structure and Mechanism in Organic Chemistry*,
Cornell University Press, Ithaca, 1953 (1st ed., 828 pp.); 2nd ed., G.
Bell & Sons, London, 1969 (1266 pp.).** Edition of record: **2nd edition,
1969**, because it incorporates fifteen years of post-Hammond mechanistic
work and is the version subsequent generations cited. Mechanism: the
codification of physical-organic chemistry — nucleophile vs electrophile
classification, S_N1 / S_N2 / E1 / E2 mechanism notation, inductive and
resonance effects, the Hammett ρ analysis applied systematically, the
electronic theory of substitution and elimination. This is the founding
text of mechanism-based organic chemistry as a teachable discipline. The
1953 first edition originated from the Baker Lectures at Cornell.
Pass-1 did not list this. **This memo recommends promotion** under
condition 2 (recognized academic edition-of-record by the originator of
the framework). Folder: `kinetics/physical-organic/`. Concession: this
is the single most "textbook-shaped" entry in the proposed chemistry
canon; the argument for inclusion is that the *vocabulary* of organic
mechanism (the nucleophile/electrophile/E1/E2 grammar) was created here.
If Bucket is going to canonize *vocabulary-creating textbooks* (and the
Pauling, Lewis-Randall, and IUPAC Gold Book entries already implicitly
say yes), Ingold belongs.

**Louis Plack Hammett — *Physical Organic Chemistry: Reaction Rates,
Equilibria, and Mechanisms*, McGraw-Hill, New York, 1940 (1st ed., 404
pp.); 2nd ed., McGraw-Hill, New York, 1970 (420 pp.).** Companion
originator paper: "The Effect of Structure upon the Reactions of Organic
Compounds. Benzene Derivatives," *J. Am. Chem. Soc.* 59, 96–103, 1937
(the Hammett equation log(k/k₀) = ρσ). Edition of record: the **1940
first edition**, because the second edition is mostly rewriting in the
same direction; the 1937 *JACS* paper is the originator priority for the
Hammett equation and σ-constant. Mechanism: linear free-energy relationships,
ρ as a measure of reaction sensitivity to substituent electronic effects,
σ as a substituent-specific parameter. The text *named the field*
("physical organic chemistry"). **Promote** the 1937 *JACS* paper as the
originator entry and the 1940 monograph as the discipline-naming text.
Folder: `kinetics/physical-organic/`.

**Argument for inclusion of Ingold and Hammett:** Pass-1 flagged Atkins,
Cotton-Wilkinson, and March as borderline textbooks not promoted. Ingold
and Hammett are different in kind: they are *originator monographs* in
which the framework being taught was first stated by the author. That is
a qualitative difference. Atkins is a *pedagogical synthesis* of
physical chemistry; March is an *encyclopedic survey* of organic reactions;
neither author originated the framework. Ingold and Hammett pass condition 1.

**Argument against inclusion:** Both books are 400–1300 pages of detailed
mechanism — they are heavy to mirror, hard to cite by section, and
pedagogical-shaped. The conservative reading of Bucket's "small canon"
discipline argues they should be flagged as borderline-strong and
re-evaluated. **This memo recommends promotion** but flags this as the
single most contestable call in the deep dive. If the maintainer wants
to keep the canon smaller, demote both to landscape and keep only the
1937 Hammett *JACS* paper as the originator entry for LFER.

---

## 4. Periodicity & atomic structure

Pass-1 covered Mendeleev. The full chain has six entries, of which four
are clearly chemistry-side and two cross-link to physics.

**Dmitri Mendeleev** — already in pass-1; Jensen 2002 edition. **Promote.**
Add: the **Faraday Lecture, "The Periodic Law of the Chemical Elements,"
*Journal of the Chemical Society, Transactions* 55, 634–656, 1889** as a
secondary entry — Mendeleev's most lucid English-language statement of
the law and its predictive successes (gallium, scandium, germanium had
all been discovered by 1886). Folder: `periodicity/`.

**Henry Moseley — "The High-Frequency Spectra of the Elements," *Philosophical
Magazine* (Series 6) 26, 1024–1034, 1913; Part II, *Phil. Mag.* 27,
703–713, 1914.** Mechanism: X-ray spectroscopy showing that the square
root of the characteristic X-ray frequency varies linearly with a single
integer Z, which is the *atomic number* (the count of nuclear positive
charges), not the atomic weight. This is the experimental foundation of
the modern periodic table — it resolved the I/Te and Co/Ni inversions,
predicted the gaps at Z = 43 (technetium), 61 (promethium), and 75
(rhenium), and made periodicity a property of the *nucleus* rather than
of the atomic weight. Moseley was killed at Gallipoli in 1915 at age 27;
the work was unfinished. **Promote.** Folder: `periodicity/` with
cross-link to `02-physics/atomic-physics/`.

**Niels Bohr — "On the Constitution of Atoms and Molecules," *Philosophical
Magazine* (Series 6) 26: Part I, 1–25; Part II, 476–502; Part III, 857–875;
all 1913.** The chemistry-side entry is **Part III**, in which Bohr
applies his quantization to multi-electron atoms and derives the
periodic-table reasoning (electron-shell occupancy, the rare-gas
configurations as closed shells). The physics-side entries (Parts I and
II) live in `02-physics/quantum-mechanics/`. **Promote Part III** as the
chemistry-side entry. Folder: `periodicity/` with hard cross-link to
`02-physics/`.

**Wolfgang Pauli — "Über den Zusammenhang des Abschlusses der
Elektronengruppen im Atom mit der Komplexstruktur der Spektren,"
*Zeitschrift für Physik* 31, 765–783, 1925.** The exclusion principle.
**Lives in `02-physics/quantum-mechanics/`.** Cite from chemistry; do
not duplicate. The chemistry-side consequence (the (2n²) shell-occupancy
rule) flows from this paper but is presentation, not new mechanism.

**Madelung / Klechkowski rule (the (n+ℓ, n) ordering of orbital filling).**
Originator: Erwin Madelung, *Die mathematischen Hilfsmittel des
Physikers*, Springer, Berlin, 1936 (3rd ed.); independently Charles Janet
1929 and V. M. Klechkovsky 1962. The rule is empirical, not derived from
first principles, and is a presentation device. **Do not promote** to
canon; log in landscape as a useful pedagogical convention.

**IUPAC Periodic Table of the Elements** — current version-of-record:
the IUPAC periodic table dated 4 May 2022 (post-tennessine and post-
oganesson, post-2016 IUPAC element naming for Z = 113, 115, 117, 118).
**Promote** as a normative reference. Folder: `reference/iupac/`.

---

## 5. Stereochemistry & symmetry

Pass-1 covered van 't Hoff and Le Bel. The chain is longer.

**Louis Pasteur — *Recherches sur la dissymétrie moléculaire des produits
organiques naturels*, two lectures delivered to the Société Chimique de
Paris, 20 January and 3 February 1860; published as a pamphlet, Mallet-
Bachelier, Paris, 1861. Original priority paper: "Recherches sur les
relations qui peuvent exister entre la forme cristalline, la composition
chimique et le sens de la polarisation rotatoire," *Annales de Chimie et
de Physique* (3rd ser.) 24, 442–459, 1848** (the manual resolution of
sodium ammonium tartrate into d- and l-enantiomers under microscope).
Mechanism: the existence of molecular asymmetry as a physical property,
demonstrated by hand-sorting hemihedral crystals into two optically
opposite populations. The 1848 paper is the originator priority; the
1860 lectures are the synthetic edition-of-record (Pasteur's own
narrative of the 1848–1860 program). **Promote both** as a Pasteur
1848/1860 bundle. Folder: `stereochemistry/`.

**Jacobus Henricus van 't Hoff** — pass-1 entry. The original 1874
Dutch pamphlet *Voorstel tot Uitbreiding der tegenwoordig in de
Scheikunde gebruikte Structuurformules in de Ruimte* is the priority
text; the 1875 French expansion *La Chimie dans l'Espace* is the
edition-of-record. **Promote.** Folder: `stereochemistry/`.

**Joseph Achille Le Bel** — pass-1 entry. The 1874 *Bull. Soc. Chim. Fr.*
22, 337–347 paper is the priority and edition-of-record. **Promote.**

**Emil Fischer — "Ueber die Configuration des Traubenzuckers und seiner
Isomeren," *Berichte der deutschen chemischen Gesellschaft* 24, 1836–1845,
1891; "Ueber die Configuration des Traubenzuckers und seiner Isomeren.
II.," *Ber.* 24, 2683–2687, 1891.** Mechanism: the Fischer projection
notation for representing tetrahedral stereocenters in two dimensions,
and the first complete configurational assignment of the aldohexoses
(reasoning from D-glyceraldehyde — at the time arbitrarily assigned, later
confirmed by Bijvoet's 1951 X-ray analysis). The Fischer projection is
the convention every biochemistry student still uses for sugars and amino
acids. **Promote** as a 1891 bundled entry. Folder: `stereochemistry/`.
Edition of record: the original *Berichte* papers (PD).

**Robert Sidney Cahn, Christopher Kelk Ingold, Vladimir Prelog — "The
Specification of Asymmetric Configuration in Organic Chemistry,"
*Experientia* 12, 81–124, 1956**; revised and expanded as **"Specification
of Molecular Chirality," *Angewandte Chemie International Edition in
English* 5(4), 385–415, 1966** (DOI 10.1002/anie.196603851); German
parallel "Spezifikation der molekularen Chiralität," *Angewandte Chemie*
78, 413–447, 1966; final extension by Prelog and Helmchen, *Angew. Chem.
Int. Ed.* 21, 567–583, 1982. Mechanism: the R/S system for unambiguous
specification of molecular chirality, based on a priority-ranking
algorithm over substituents. The single notation that organic, inorganic,
and biological chemistry all converged on. Edition of record: the **1966
Angew. Chem. Int. Ed. paper** because it is the version that organic
chemistry actually adopted; cite the 1956 *Experientia* paper for
priority. **Promote** the 1966 paper as the lead entry. Folder:
`stereochemistry/`.

### 5.1 Group theory for chemistry — `01-mathematics` cross-link

**F. Albert Cotton — *Chemical Applications of Group Theory*, Wiley, New
York, 1963 (1st ed.); 2nd ed. 1971; 3rd ed. 1990 (ISBN 0-471-51094-7).**
Edition of record: **3rd edition, 1990**. Mechanism: the application of
discrete group theory (point groups, character tables, reducible/irreducible
representations) to molecular symmetry — selection rules in IR/Raman/UV-vis
spectroscopy, MO symmetry classification, crystal-field splitting in
coordination compounds. The text is *applied* group theory, not
*originator* group theory; the originator texts (Burnside, Weyl) live in
`01-mathematics/group-theory/`. **Recommendation: log Cotton 1990 in
landscape** and cite from `stereochemistry/`, `bonding/coordination/`, and
`quantum-chemistry/` as the practitioner reference. Do not promote — it
is a discipline-standard textbook rather than an originator statement.
This is the conservative call that pass-1 implicitly took (Cotton-Wilkinson
*Advanced Inorganic* was flagged borderline-not-promoted) and this memo
endorses.

---

## 6. Quantum chemistry & computation

The single hardest scoping decision in the chemistry canon. The
foundational papers (Schrödinger 1926, Heitler–London 1927, Born–
Oppenheimer 1927, Hohenberg–Kohn 1964, Kohn–Sham 1965) are physics
priorities. The *chemistry-side* derived papers and the computational
machinery are the question.

### 6.1 The originator chain

**Erwin Schrödinger — "Quantisierung als Eigenwertproblem," *Annalen der
Physik* (4th ser.) 79, 361–376, 489–527; 80, 437–490; 81, 109–139; all
1926.** The H atom solution is in Part I (361–376); the multi-electron
extension is implicit. **Lives in `02-physics/quantum-mechanics/`.**
Cite from chemistry.

**Walter Heitler and Fritz London 1927** — already in §1.3. Lives in
`quantum-chemistry/` (with cross-link to physics) because Heitler and
London were doing chemistry — they wanted to derive the H₂ bond, not the
abstract two-electron problem.

**Max Born and Robert Oppenheimer — "Zur Quantentheorie der Molekeln,"
*Annalen der Physik* (4th ser.) 84, 457–484, 1927.** The adiabatic
separation of nuclear and electronic motion. **Lives in
`02-physics/quantum-mechanics/`** (this is a physics paper about
molecules); cite from `quantum-chemistry/`.

### 6.2 The computational machinery

**Douglas Hartree — "The Wave Mechanics of an Atom with a Non-Coulomb
Central Field. Part I. Theory and Methods," *Proceedings of the Cambridge
Philosophical Society* 24(1), 89–110, 1928; Part II. "Some Results and
Discussion," 24(1), 111–132, 1928.** Mechanism: the self-consistent field
(SCF) iteration scheme — replace each electron's interaction with the
others by an averaged potential, solve for the orbital, recompute the
average, iterate until convergence. The originating algorithm of every
quantum-chemistry calculation done since. **Promote.** Folder:
`quantum-chemistry/computational/`.

**Vladimir Fock — "Näherungsmethode zur Lösung des quantenmechanischen
Mehrkörperproblems," *Zeitschrift für Physik* 61, 126–148, 1930.**
Mechanism: the antisymmetrization of the Hartree wavefunction (a Slater
determinant, anticipated by Slater 1929 — see next entry — but combined
with SCF first by Fock); the resulting Hartree–Fock equations are the
*correct* mean-field approximation respecting Pauli exclusion. **Promote.**
Folder: `quantum-chemistry/computational/`.

**John C. Slater — "The Theory of Complex Spectra," *Physical Review* 34(10),
1293–1322, 1929** (the Slater determinant), and **"Atomic Shielding
Constants," *Phys. Rev.* 36, 57–64, 1930** (Slater-type orbitals — STOs).
Mechanism: the Slater determinant as the antisymmetric many-electron
wavefunction; the STO basis set as the analytical-form approximation to
hydrogenic orbitals. **Promote both as a Slater 1929/1930 bundle.** Folder:
`quantum-chemistry/computational/`.

**Clemens Roothaan — "New Developments in Molecular Orbital Theory,"
*Reviews of Modern Physics* 23(2), 69–89, 1951.** Mechanism: the matrix
formulation of the Hartree–Fock equations as FC = SCε (the Roothaan
equations), which made HF tractable on the early electronic computers and
launched ab initio quantum chemistry as a numerical discipline. **Promote.**
Folder: `quantum-chemistry/computational/`.

### 6.3 Density functional theory

**Pierre Hohenberg and Walter Kohn — "Inhomogeneous Electron Gas,"
*Physical Review* 136(3B), B864–B871, 1964** (DOI 10.1103/PhysRev.136.B864).
Mechanism: two theorems. (1) The external potential v(r) is uniquely
determined (up to an additive constant) by the ground-state electron
density n(r), so the ground-state wavefunction and all observables are
functionals of n(r) alone. (2) There exists a universal functional F[n]
such that the energy E[n] = ∫v(r)n(r)dr + F[n] is minimized at the true
ground-state density. The DFT in-principle existence proof. **Originator
priority lives in `02-physics/quantum-mechanics/`** but this is a
chemistry-relevant paper canon — recommend a *cross-link entry* in
`03-chemistry/quantum-chemistry/computational/` rather than duplication.

**Walter Kohn and Lu Jeu Sham — "Self-Consistent Equations Including
Exchange and Correlation Effects," *Physical Review* 140(4A), A1133–A1138,
1965** (DOI 10.1103/PhysRev.140.A1133). Mechanism: the Kohn–Sham
construction — replace the interacting electron problem with a fictitious
non-interacting system whose density matches the true density, with all
many-body effects absorbed into an exchange-correlation functional v_xc[n].
The construction that made DFT *computable*. Like Hohenberg–Kohn, this is
a physics priority with an essential chemistry cross-link. **Cross-link.**

**Walter Kohn — Nobel Lecture, "Electronic Structure of Matter — Wave
Functions and Density Functionals," *Reviews of Modern Physics* 71(5),
1253–1266, 1999** (Nobel Prize in Chemistry 1998). The cleanest single-
document synthesis of DFT by its originator. **Promote** as the lead
entry for DFT in chemistry; this is condition 2 (recognized academic
edition-of-record) on a Nobel-awarded body of work. Folder:
`quantum-chemistry/computational/`.

**John Pople — Nobel Lecture, "Quantum Chemical Models," *Reviews of
Modern Physics* 71(5), 1267–1274, 1999** (Nobel Prize in Chemistry 1998,
shared with Kohn). Mechanism: the systematic-approximations methodology
(model chemistries — HF, MP2, MP4, CCSD(T) — and the Gaussian-program
basis-set hierarchy STO-3G → 6-31G(d) → cc-pVnZ) that made ab initio
chemistry a *predictive* tool. **Promote** alongside Kohn 1999. Folder:
`quantum-chemistry/computational/`.

### 6.4 The DFT functionals — promotion or landscape?

**Axel Becke — "Density-Functional Thermochemistry. III. The Role of
Exact Exchange," *Journal of Chemical Physics* 98(7), 5648–5652, 1993**
(DOI 10.1063/1.464913). The B3 hybrid scheme (20% exact HF exchange + 72%
Becke 88 + 8% LDA exchange; 81% LYP + 19% VWN correlation) at the heart
of the B3LYP functional.

**Chengteh Lee, Weitao Yang, Robert G. Parr — "Development of the Colle–
Salvetti Correlation-Energy Formula into a Functional of the Electron
Density," *Physical Review B* 37(2), 785–789, 1988** (the LYP correlation
functional that combines with B3 to give B3LYP).

These two papers are the **most-cited papers in physical chemistry of the
last forty years** (Becke 1993 has > 90,000 citations; LYP > 85,000;
Google Scholar via PubMed). The mechanism is *empirical functional
construction* — fitted to thermochemistry benchmarks. They are the
discipline's working tools, not foundational derivations.

**Recommendation: do not promote to canon; log in landscape as the
discipline's standard functionals.** Bucket's bar is "primary statement
of a method or principle" (the manifesto's phrasing). Becke 1993 and
LYP 1988 are *applications* of the Hohenberg–Kohn–Kohn–Sham framework
within a hybrid-functional ansatz parametrized to data — they are
foundational *as engineering*, but they are not foundational in Bucket's
sense (axiom, derivation, law). The Kohn 1999 Nobel Lecture is canon;
B3LYP is a tool. This is the cleanest place to draw the canon-vs-tool
boundary for the quantum-chemistry sub-folder.

The same boundary will need to be drawn elsewhere (e.g. CCSD(T) is a tool;
the coupled-cluster ansatz, Coester 1958 / Čížek 1966, is foundational —
**promote Čížek 1966**, *J. Chem. Phys.* 45, 4256–4266, as a separate
entry). State the rule once and apply it consistently.

---

## 7. Synthesis as foundation? + final branch design

### 7.1 Is organic synthesis a foundations branch?

**Argument for inclusion:** Synthesis is the operational realization of
chemistry. Without methodology, atoms-and-bonds theory has no contact with
the world. The canonical synthesis papers (Robinson on tropinone 1917,
Woodward on quinine 1944 / cortisone 1951 / strychnine 1954 / chlorophyll
1960 / vitamin B12 1973, Corey on ginkgolide 1988, Nicolaou on Taxol 1994)
are works of intellectual depth comparable to any theoretical paper. The
Robinson tropinone synthesis is widely taught as the first application of
*biomimetic* logic — building a molecule by emulating a hypothesized
biosynthetic route.

**Argument against inclusion:** A successful synthesis is an *application*
— a particular instance of applying known reactions in a new sequence. It
proves the target is reachable; it does not state a law. Bucket's bar
requires "primary statement of a law, principle, or mechanism." Individual
syntheses do not meet that bar. The *strategy* by which a synthesis is
designed is closer — but most synthetic papers do not articulate the
strategy as a derived principle; they exhibit it.

**The Corey exception.** E. J. Corey's *The Logic of Chemical Synthesis*,
Wiley, 1989 (with Xue-Min Cheng; ISBN 0-471-50979-5) and his **Nobel
Lecture, "The Logic of Chemical Synthesis: Multistep Synthesis of Complex
Carbogenic Molecules," *Angewandte Chemie International Edition in
English* 30(5), 455–465, 1991** (Nobel 1990) are not synthesis papers —
they are the *codification* of retrosynthetic analysis as a method:
disconnect the target into precursors by formal reverse application of
known transformations, recurse until commercially-available starting
materials are reached, then forward-synthesize. This is a *primary
statement of a method*, originator-tier, and meets Bucket's bar.

**Pass-1 flagged Corey 1989 as borderline. This memo recommends promotion
of Corey 1989 + Corey 1991 Nobel Lecture as a bundled entry under a new
sub-folder `mechanism-and-method/synthesis-logic/`.** No individual
syntheses promote. The folder's canon is the *theory of how to plan a
synthesis*, not the catalog of syntheses planned.

**Robinson's *Outline of an Electrochemical Theory of Organic Reactions*,
Institute of Chemistry, London, 1932** is canon-eligible at the same
level — it is the originator statement of the electronic-arrow notation
(curved-arrow mechanism) and the first systematic theory of electron
flow in organic reactions, predating Ingold's codification by twenty
years. **Promote** as a companion entry to Ingold 1953/1969 in
`kinetics/physical-organic/`.

### 7.2 Final proposed `03-chemistry/` folder structure

```
03-chemistry/
  README.md
  CANON_INDEX.md
  _intake/
    everychem-and-chemistry-canon-sweep-2026-05-01.md   (pass 1)
    chemistry-canon-deep-dive-2026-05-01.md             (this memo)

  atomic-theory/
    1789-lavoisier-traite-elementaire.md
    1808-1827-dalton-new-system-chemical-philosophy.md
    1811-avogadro-essai-masses-relatives.md
    1858-cannizzaro-sunto-corso-filosofia-chimica.md

  periodicity/
    1869-1871-mendeleev-periodic-law-jensen-ed-2002.md
    1889-mendeleev-faraday-lecture.md
    1913-1914-moseley-high-frequency-spectra.md
    1913-bohr-constitution-atoms-part-iii.md            (cross-link to 02-physics)
    iupac-periodic-table-2022-05-04.md                  (reference)

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
      1960-pauling-nature-of-the-chemical-bond-3rd.md   (edition of record)
    orbital-symmetry/
      1965-woodward-hoffmann-jacs-bundle.md
      1970-woodward-hoffmann-conservation-orbital-symmetry.md

  thermodynamics/
    1882-helmholtz-thermodynamik-chemischer-vorgaenge.md
    1875-1878-gibbs-equilibrium-heterogeneous-substances.md   (Bumstead-Van Name 1906 / Dover 1961)
    1884-vant-hoff-etudes-de-dynamique-chimique.md
    1923-lewis-randall-thermodynamics-1st.md
    1961-lewis-randall-pitzer-brewer-thermodynamics-2nd.md
    electrochemistry/
      1889-nernst-elektromotorische-wirksamkeit-der-ionen.md
      1906-nernst-heat-theorem.md
      1923-debye-huckel-theorie-der-elektrolyte.md

  kinetics/
    1889-arrhenius-reaktionsgeschwindigkeit.md
    1913-bodenstein-lind-h2-br2-chain.md
    1922-lindemann-radiation-theory.md
    1956-hinshelwood-semenov-nobel-lectures.md
    1935-eyring-activated-complex.md
    1935-evans-polanyi-transition-state.md
    1941-glasstone-laidler-eyring-theory-of-rate-processes.md
    1952-marcus-rrkm.md
    1956-marcus-electron-transfer-i.md
    1992-marcus-nobel-lecture.md
    physical-organic/
      1932-robinson-electrochemical-theory-organic-reactions.md
      1937-hammett-substituent-equation.md
      1940-hammett-physical-organic-chemistry-1st.md
      1953-ingold-structure-and-mechanism-1st.md
      1969-ingold-structure-and-mechanism-2nd.md       (edition of record)

  stereochemistry/
    1848-pasteur-tartrate-resolution.md
    1860-1861-pasteur-recherches-dissymetrie-moleculaire.md
    1874-vant-hoff-voorstel.md
    1875-vant-hoff-chimie-dans-lespace.md              (edition of record)
    1874-le-bel-relations-formules-atomiques.md
    1891-fischer-configuration-traubenzuckers-bundle.md
    1956-cahn-ingold-prelog-experientia.md
    1966-cahn-ingold-prelog-angew-chem-int-ed.md       (edition of record)

  quantum-chemistry/
    1925-1928-hund-z-phys-papers.md
    1927-heitler-london-h2-quantum-mechanics.md
    1928-1932-mulliken-phys-rev-bundle.md
    1931-1932-huckel-quantentheoretische-beitraege.md
    1966-mulliken-nobel-lecture.md
    computational/
      1928-hartree-scf.md
      1929-1930-slater-determinant-and-stos.md
      1930-fock-naeherungsmethode.md
      1951-roothaan-new-developments-mo-theory.md
      1964-hohenberg-kohn-inhomogeneous-electron-gas.md   (cross-link to 02-physics)
      1965-kohn-sham-self-consistent-equations.md         (cross-link to 02-physics)
      1966-cizek-coupled-cluster.md
      1999-kohn-nobel-lecture.md
      1999-pople-nobel-lecture.md

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
    databases/
      pubchem-pointer.md
      chembl-pointer.md
      cambridge-structural-database-pointer.md
      reaxys-pointer.md
```

### 7.3 Cross-link table

| Branch link | Specific cross-references |
|---|---|
| `01-mathematics/` | **Group theory** (Burnside, Weyl primaries in math; Cotton 1990 *Chemical Applications of Group Theory* sits in landscape, cited from `stereochemistry/`, `bonding/coordination/`, and `quantum-chemistry/`). **Calculus of variations** (Euler–Lagrange in math; Hartree–Fock equations are the chemistry-side variational application — cite from `quantum-chemistry/computational/`). **Linear algebra** (eigenvalue problems in math; the Roothaan FC = SCε equations and the Hückel secular determinant are the chemistry-side instances). |
| `02-physics/` | **Statistical mechanics** (Boltzmann, Gibbs 1902 in physics; chemical-potential / phase-rule formulation in chemistry — Gibbs 1875–78 is canon in **both** branches with the originator entry in physics and a cross-link from chemistry, since Gibbs himself framed it as a thermodynamics paper). **Quantum mechanics** (Schrödinger 1926, Born–Oppenheimer 1927, Pauli 1925 in physics; Heitler–London 1927, MO theory, DFT applications in chemistry). **Atomic physics** (Moseley 1913 cross-listed). **Hohenberg–Kohn 1964 and Kohn–Sham 1965 lead in physics**, cross-link from `quantum-chemistry/computational/`. |
| `04-information/` | **Shannon entropy ↔ thermodynamic entropy.** Flag the precise relationship: the Shannon entropy H = −Σ p_i log p_i (Shannon 1948) and the Gibbs entropy S = −k_B Σ p_i ln p_i (Gibbs 1902) have the *same functional form* but different physical interpretations and units (information bits vs Joules per kelvin). The Jaynes 1957 *maximum-entropy* derivation of statistical mechanics from information-theoretic axioms (E. T. Jaynes, "Information Theory and Statistical Mechanics," *Phys. Rev.* 106, 620–630, 1957) is the bridge text and is a candidate for **canon in `04-information/`** with a cross-link from `03-chemistry/thermodynamics/`. The two entropies are not the same quantity; they share the same mathematics. **Do not conflate.** This is a place where casual cross-linking would degrade the canon. |
| `05-biophysics/` | **Where chemistry becomes biology.** Default rule (per `03-chemistry/README.md`): originator-framing wins. Marcus 1956 (electron transfer) → chemistry; Mitchell 1961 (chemiosmotic coupling) → biophysics. **Enzyme kinetics**: Michaelis–Menten 1913 (*Biochem. Z.* 49, 333–369) is biophysics canon; Briggs–Haldane 1925 steady-state derivation cross-links to `03-chemistry/kinetics/`. **Protein folding thermodynamics**: Anfinsen 1961/1973 → biophysics canon; the underlying chain conformational statistics (Flory) lives in `03-chemistry/`. **Biomolecular electron transfer** uses Marcus theory directly — biophysics cites from chemistry. **Pauling on the α-helix** (*Proc. Natl. Acad. Sci. USA* 37, 205–211, 1951) is biophysics-side priority because Pauling framed it as a structural biology result; cite from chemistry. |

---

## 8. Top-5 absolute must-have entries (pass-2 ranking)

Across everything reviewed in pass-1 and pass-2, ranked by load-bearing
weight (how much downstream chemistry collapses if removed):

1. **Mendeleev 1869/1871 (Jensen ed. 2002).** The periodic law is the
   organizing principle of all chemistry. Without it nothing else has a
   filing system.
2. **Lewis 1916 + Lewis 1923 (bundle).** The shared-electron-pair bond is
   the operational vocabulary every chemist still uses, including those
   who can derive it from MO theory.
3. **Pauling 1960 (3rd ed., *Nature of the Chemical Bond*).** The
   integration of quantum mechanics with structural chemistry; the canon
   text of bonding theory for the second half of the 20th century.
4. **Gibbs 1875–78 (Bumstead–Van Name 1906 / Dover 1961, *On the
   Equilibrium of Heterogeneous Substances*).** The chemical-potential
   formulation; without it chemical thermodynamics has no foundation
   distinct from physics-side classical thermodynamics.
5. **IUPAC Gold Book (McNaught & Wilkinson 1997 + online).** The discipline's
   normative reference for terminology. Not glamorous; structurally
   indispensable. Without it cross-citation across the canon is ambiguous.

Honourable mentions (positions 6–10): Heitler–London 1927; Eyring 1935;
Marcus 1956 + 1992 Nobel Lecture; Kohn 1999 Nobel Lecture (DFT);
Cahn–Ingold–Prelog 1966.

---

## 9. Disagreements with pass-1

**Texts pass-1 wrongly excluded (this memo recommends adding):**

- **Werner 1893 + 1913 Nobel Lecture.** Pass-1 omitted Werner entirely.
  Coordination chemistry is one of the four pillars of structural
  chemistry; Werner is the originator. Cannot be omitted.
- **Kekulé 1858 *Annalen* paper** and **Couper 1858 *CR Acad. Sci.* paper.**
  Pass-1 said "cite as reference, do not promote" because resonance/MO
  theory superseded the structural claim. This is the wrong test. Kekulé
  and Couper's tetravalent-carbon-and-chain papers are originator-tier
  primaries; the fact that a later theory subsumed them does not strip
  the priority. By the same logic Newton's *Principia* would be demoted
  for being superseded by general relativity. Promote.
- **Berzelius 1819 (*Essai sur la théorie des proportions chimiques*).**
  First mechanism-level theory of bonding (electrochemical dualism),
  load-bearing for 19th-century chemistry even though wrong about
  organics. Promote as historical-priority canon under a clear flag that
  the *theory* was overturned (the *paper's status as a foundations
  text* is not).
- **Frankland 1852.** First quantitative valence claim. Promote.
- **Pasteur 1848 + 1860/1861.** Pass-1 went straight to van 't Hoff and
  Le Bel for stereochemistry. Pasteur is the originator priority for
  molecular asymmetry as a physical property. Promote.
- **Fischer 1891.** Pass-1 omitted. Fischer projection is the
  configurational notation every biochemistry student uses. Promote.
- **Cahn–Ingold–Prelog 1956 + 1966.** Pass-1 omitted. R/S notation is
  the universal stereochemistry vocabulary. Promote.
- **Moseley 1913–1914.** Pass-1 omitted. The experimental foundation of
  the modern periodic table. Promote (with cross-link to physics).
- **Helmholtz 1882, van 't Hoff 1884, Nernst 1889, Nernst 1906,
  Debye–Hückel 1923.** Pass-1 mentioned Nernst and Debye–Hückel as future
  candidates; they should promote now alongside Helmholtz and van 't Hoff
  to give thermodynamics a complete spine.
- **Lewis–Randall 1923 (and 1961 Pitzer–Brewer revision).** Pass-1
  flagged borderline; this memo recommends promotion as the originator
  monograph for the activity / activity-coefficient framework.
- **Hartree 1928, Slater 1929/1930, Fock 1930, Roothaan 1951, Čížek 1966.**
  Pass-1 noted only "Hund/Mulliken papers" and "Coulson Valence" for
  quantum chemistry. The full computational lineage needs all five.
- **Ingold 1953/1969 + Hammett 1937/1940.** Pass-1 flagged Ingold as
  "borderline, re-evaluate." This memo recommends promotion as
  originator monographs; the contestable call is acknowledged in §3.2.
- **Robinson 1932 (*Outline of an Electrochemical Theory of Organic
  Reactions*).** Pass-1 omitted. Originator priority for curved-arrow
  notation and electron-flow theory. Promote.
- **Corey 1989 + 1991 Nobel Lecture.** Pass-1 said "borderline,
  re-evaluate." This memo argues retrosynthetic analysis is a primary
  statement of a *method* and meets the bar; promote in a new
  `mechanism-and-method/synthesis-logic/` sub-folder.

**Texts pass-1 wrongly included (this memo recommends demoting or moving):**

- **Coulson, *Valence* (1952 / 1961 / 1979 McWeeny rev.).** Pass-1
  promoted via "borderline-strong, strong via Coulson" reasoning. This is
  a discipline-standard textbook, not an originator primary; Coulson did
  not originate MO theory (Hund and Mulliken did) or VB theory
  (Heitler–London and Pauling did). **Demote to landscape**, cite from
  `quantum-chemistry/` as the practitioner reference. The originator
  priorities (Hund 1925–1928, Mulliken 1928–1932 + 1966 Nobel Lecture,
  Heitler–London 1927) are sufficient; Coulson is pedagogical synthesis.
- **Cotton, *Chemical Applications of Group Theory* (3rd ed. 1990).**
  Pass-1 listed as the "load-bearing chemistry text" for spectroscopy.
  Same argument as Coulson: discipline-standard textbook applying group
  theory (originator: Burnside, Weyl in `01-mathematics/`) to molecules.
  **Demote to landscape**, cite from multiple sub-folders.
- **Becke 1993 / Lee–Yang–Parr 1988 (B3LYP component papers).** Not in
  pass-1 explicitly, but the pass-1 flagged-list said "Walter Kohn / John
  Pople / DFT corpus" was a candidate. The originator priorities
  (Hohenberg–Kohn 1964, Kohn–Sham 1965 in physics; Kohn 1999 + Pople 1999
  Nobel Lectures in chemistry) are canon. **Becke 1993 and LYP 1988 are
  tools, not foundations; landscape only.**

---

## Sources

- [Wiley — Werner 1893, Beitrag zur Konstitution anorganischer Verbindungen (Z. anorg. Chem. 3, 267)](https://onlinelibrary.wiley.com/doi/abs/10.1002/zaac.18930030136)
- [Cornell University Press — Pauling, *The Nature of the Chemical Bond*, 3rd ed.](https://www.cornellpress.cornell.edu/book/9780801403330/the-nature-of-the-chemical-bond/)
- [Internet Archive — Pauling, *The Nature of the Chemical Bond* (full text)](https://archive.org/details/natureofthechemicalbondpauling)
- [Oregon State Univ. Pauling Archive — *The Nature of the Chemical Bond: A Documentary History*](https://scarc.library.oregonstate.edu/coll/pauling/bond/index.html)
- [PMC — Critical Look at Pauling's Influence on Chemical Bonding](https://pmc.ncbi.nlm.nih.gov/articles/PMC8348226/)
- [Internet Archive — Ingold, *Structure and Mechanism in Organic Chemistry* (1st ed., 1953)](https://archive.org/details/structuremechani0000ckin)
- [Wikipedia — Christopher Kelk Ingold](https://en.wikipedia.org/wiki/Christopher_Kelk_Ingold)
- [Internet Archive — Hammett, *Physical Organic Chemistry* (1st ed., 1940)](https://archive.org/details/in.ernet.dli.2015.168388)
- [Wiley — Cahn, Ingold, Prelog, "Specification of Molecular Chirality" (Angew. Chem. Int. Ed. 5, 385, 1966)](https://onlinelibrary.wiley.com/doi/10.1002/anie.196603851)
- [Wiley — Helmchen, "50th Anniversary of the Cahn–Ingold–Prelog Specification of Molecular Chirality" (2016)](https://onlinelibrary.wiley.com/doi/10.1002/anie.201603313)
- [APS — Hohenberg & Kohn, "Inhomogeneous Electron Gas" (Phys. Rev. 136, B864, 1964)](https://link.aps.org/doi/10.1103/PhysRev.136.B864)
- [AIP — Becke, "Density-Functional Thermochemistry. III." (J. Chem. Phys. 98, 5648, 1993)](https://pubs.aip.org/aip/jcp/article/98/7/5648/842114/Density-functional-thermochemistry-III-The-role-of)
- [Nobel Foundation — Corey 1990 Nobel Lecture, "The Logic of Chemical Synthesis"](https://www.nobelprize.org/uploads/2018/06/corey-lecture.pdf)
- [Wiley — Corey, Nobel Lecture (Angew. Chem. Int. Ed. Engl. 30, 455, 1991)](https://onlinelibrary.wiley.com/doi/abs/10.1002/anie.199104553)
- [Internet Archive — Corey & Cheng, *The Logic of Chemical Synthesis* (1989)](https://ia801303.us.archive.org/25/items/Logic_of_Chemical_Synthesis_Corey_1989/Logic_of_Chemical_Synthesis_Corey_1989_text.pdf)
- [PMC — Conceptual Advances from Werner Complexes to Metal–Organic Frameworks](https://pmc.ncbi.nlm.nih.gov/articles/PMC6276034/)
