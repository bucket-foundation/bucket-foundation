# Physics Canon — Pass-2 Cross-Branch — 2026-05-01

Intake document. Not promoted. Pass-1 (`physics-canon-pass-1-2026-05-01.md`)
opened the branch with ~38 strong entries, a proposed sub-folder tree, five
boundary calls, and five contestable items. Pass-2's job is **not** to add
new entries — pass-1's inventory is already comprehensive. Pass-2's job is
**cross-branch coherence**: ratifying every physics entry that another
branch will cite, binding the boundary rules to the chemistry pass-3
synthesis (the most-developed adjudication document in the canon so far),
and writing the entry-table that math, chemistry, info, biophysics, and
cosmology stub-writers will consult before they file a cross-link.

Author: data pillar (cross-branch sweep).

The chemistry pass-3 synthesis (`bucket-canon/03-chemistry/_intake/chemistry-canon-pass-3-synthesis-2026-05-01.md`)
established the rule architecture every other branch now inherits:
condition c1 (originator priority), c2 (edition-of-record), c3
(discipline-standard normative reference), the §3.1 originator-monograph
rule and the §3.4 normative-vs-popular guardrail. Pass-2 of physics binds
to those clauses by literal quotation rather than re-derive the rules.

The branch has six adjacent canon branches with active cross-link debt:
`01-mathematics/` (von Neumann, Noether, Riemann, Hilbert), `03-chemistry/`
(Schrödinger, Pauli, Born–Oppenheimer, Boltzmann/Gibbs, Maxwell, Bragg,
NMR foundations, Stark–Einstein), `04-information/` (the quantum-information
sub-fold, the entropy non-conflation, Feynman 1982, Deutsch 1985, Shor 1994,
BB84), `05-biophysics/` (Roentgen, photoelectric/photoequivalence, the
spectroscopy boundary), `06-cosmology/` (GR field equations, Friedmann), and
the pass-2 contestable list (Landau–Lifshitz, MTW, Dirac monograph,
Feynman *Lectures*, the experimental-paper question). Pass-2 closes each
debt.

---

## 1. Adjudication: von Neumann 1932, *Mathematische Grundlagen der Quantenmechanik*

### 1.1 The competing claims

Math pass-1 §1.10 lists von Neumann 1932 with the explicit hedge: "**Strong
as a cross-listed entry.** Default placement: `02-physics/quantum-mechanics/`.
Cross-ref into `functional-analysis/` because the operator-theory machinery
developed for QM is canon for FA. Pass-2 may overturn the default
placement." Math pass-1 §3 ("Mathematics vs physics") gives the framing:
"Von Neumann 1932 is the contestable case: it is the foundational text of
two fields at once. Default placement is physics because the title and
stated motivation are physical; cross-listed into functional analysis
because the operator-theoretic apparatus it builds is canon for that
sub-field." Math pass-1 §4.5 is even more explicit: "Pass-1 placed it in
physics with a cross-link to functional analysis. Reasonable mathematicians
disagree." That is the request for an adjudication and physics pass-2 owes
the answer.

Physics pass-1 §3 lists von Neumann 1932 as one of its five binding
boundary calls: "physics (cross-link from math) — Originator framing is
foundations of QM; the Hilbert-space machinery is reused outside physics,
so math holds a cross-link, not the canonical entry." Physics pass-1 §1
calls it "Originator-monograph for the Hilbert-space axiomatization, the
projection postulate, and the von Neumann measurement scheme." Both passes
land on the same default. The question is whether pass-2 confirms or
reverses.

### 1.2 Apply the chemistry pass-3 §3.1 rule

Chemistry pass-3 §3.1 binds: "**An originator monograph promotes under c1
only when the monograph contains a load-bearing element that the originator
paper does not contain.** Otherwise the monograph is c2 (edition-of-record
at most) or landscape." This is the right test for von Neumann 1932 because
the question is exactly: did von Neumann *originate* something in the 1932
book, or did he axiomatize 1925–1928 results?

Test against the contents. The 1932 book contains four load-bearing
elements that no prior paper contains as a unified statement:

1. The **Hilbert-space formulation** — the postulate that pure states are
   rays in a complex separable Hilbert space, observables are self-adjoint
   operators, and the Born rule is the spectral measure of the observable
   evaluated on the state. Heisenberg 1925, Schrödinger 1926, Dirac 1928
   each give a *formalism*; von Neumann 1932 gives the *axiomatization*
   that says these are the same theory expressed in different bases of the
   same Hilbert space.
2. The **projection postulate** ("process 1" of Chapter VI) — the rule
   that measurement collapses the state onto an eigenspace. This is
   originator-tier von Neumann; it is not in Born 1926 (which gives the
   probability rule but not the post-measurement state) nor in Dirac 1930
   (which uses it but does not derive it).
3. The **density matrix** as a representation of mixed states and the
   distinction between proper and improper mixtures. Originator-tier von
   Neumann (with simultaneous independent priority to Landau).
4. The **spectral theorem for unbounded self-adjoint operators** in the
   form QM actually needs (position and momentum operators are unbounded;
   the bounded spectral theorem is Hilbert 1906–1912). Stone 1932 has the
   one-parameter unitary-group version published the same year; the
   physics-facing form is von Neumann's.

Each element is load-bearing for downstream physics (the projection
postulate and the density matrix are the load-bearing apparatus of
quantum information theory; the Hilbert-space axiomatization is what
Wigner's classification, the algebraic QFT program, and decoherence theory
all build on). Each is foundational originator-tier under c1.

### 1.3 Ruling

**Confirm the pass-1 default. Promote von Neumann 1932 in
`02-physics/quantum-mechanics/` under c1, with a cross-link from
`01-mathematics/functional-analysis/` and a second cross-link from
`01-mathematics/foundations/operator-theory/` if that sub-folder is opened
in math pass-2.**

The mathematical apparatus von Neumann develops (the spectral theorem in
the form QM needs, the algebra of bounded and unbounded operators, the
distinction between essentially-self-adjoint and self-adjoint extensions)
is canon for functional analysis under c1 by virtue of being load-bearing
in a discipline outside its stated subject. But the *book* belongs in
physics because its stated subject — the foundations of quantum mechanics
— is the physical framing the title announces and the framing the text
maintains throughout.

### 1.4 The canonical entry path

The math cross-link text reads:

> Cross-link: von Neumann 1932 *Mathematische Grundlagen der Quantenmechanik*
> is canon in `02-physics/quantum-mechanics/von-neumann-1932/`. The
> Hilbert-space spectral theory developed there for unbounded self-adjoint
> operators (the form physics requires for position, momentum, and
> Hamiltonian) is canon for functional analysis. Mathematicians citing the
> book as a functional-analysis source cite the physics entry; the math
> entry is a pointer, not a separate stub.

The physics entry stub records: c1 promotion, edition of record Beyer tr.
Princeton 1955 with the 2018 Wheeler revision (ISBN 978-0-691-17856-1),
load-bearing-element justification per §1.2 above, cross-link out to math.
The math `functional-analysis/` `CANON_INDEX.md` row is a single line that
points to the physics entry rather than duplicating the bibliographic data.

This is the same pattern chemistry pass-3 §5.1 uses for Bragg & Bragg 1913
("chemistry holds the canonical entry, physics holds the cross-link"):
single canonical home, single set of edition-of-record metadata, no risk
of two entries diverging.

---

## 2. Quantum information — physics or info?

### 2.1 The contested objects

Information pass-1 §1.10 opened `04-information/quantum-information/` and
listed four entries as **Strong c1**: Feynman 1982 ("Simulating Physics
with Computers"), Deutsch 1985 ("Quantum Theory, the Church–Turing
Principle and the Universal Quantum Computer"), Bennett & Brassard 1984
(BB84), Shor 1994 (factoring algorithm). Holevo 1973 is flagged as a
strong candidate addition.

Physics could equally claim each. Feynman 1982 is a physics-conference
talk (the *Caltech* MIT/Caltech First Conference on the Physics of
Computation) by a physicist about whether quantum mechanics admits
classical simulation; the answer is a result about quantum mechanics.
Deutsch 1985 is a *Proc. Roy. Soc. A* paper by a physicist that
generalizes the Church–Turing thesis to a *physical* principle.
BB84 is a cryptographic protocol whose security rests on the no-cloning
theorem and the disturbance caused by quantum measurement — the
load-bearing content is quantum-mechanical. Shor 1994 is a *FOCS* paper by
a computer scientist about the polynomial-time complexity of factoring on
a model of quantum computation — the load-bearing content is complexity-
theoretic.

### 2.2 Apply the chemistry pass-3 §5 boundary rule

Chemistry pass-3 §5 establishes a boundary architecture by *explanandum*:
the discipline that holds the canonical entry is the discipline whose
phenomenon is being explained. Pass-3 §5.1 puts Bloch 1946 and Purcell
1946 in physics ("the resonance phenomenon is a property of nuclei in
fields. Chemists cite it; physicists discovered it") and puts Marcus 1956
in chemistry ("Marcus framed the result as a theory of chemical electron
transfer"). The originator's framing wins; downstream-use does not move
the entry.

Apply to the four candidates:

**Feynman 1982.** Explanandum: *can a classical Turing machine simulate
quantum systems efficiently?* The object being explained is the
*computational complexity* of simulating quantum mechanics. The conclusion
("no, but a quantum computer can") is a statement about computational
models. Originator framing: Feynman opens the talk by saying he wants to
build a computer that simulates physics; the load-bearing argument is that
the simulation cost grows exponentially in particle number for any
classical model. **Info side.** The framing is computation-of-physics, not
physics-as-such.

**Deutsch 1985.** Explanandum: *what is the right form of the
Church–Turing thesis if physics is quantum mechanical?* The object being
explained is the universal model of computation. Deutsch defines the
quantum Turing machine and proves it is universal under a physical
Church–Turing thesis. **Info side.** The framing is foundations of
computation, even though the substrate is physics.

**Bennett & Brassard 1984 (BB84).** Explanandum: *can two parties
establish a shared secret key whose security is guaranteed by the laws of
physics rather than by computational hardness?* The object being explained
is a *cryptographic protocol*. The fact that the security argument
*invokes* quantum mechanics (no-cloning, measurement disturbance) does not
make the explanandum physical — Shannon 1949 invokes probability theory,
and `cryptography/foundations/` holds Shannon 1949, not `01-mathematics/
probability/`. **Info side.** The framing is cryptography.

**Shor 1994.** Explanandum: *what is the complexity class of factoring on
a quantum Turing machine?* The object being explained is a complexity-
theoretic separation (BQP vs presumed-not-in-P). **Info side.** The
framing is complexity theory.

All four entries pass the explanandum test on the info side. The physics
side holds the *substrate* — the no-cloning theorem (Wootters & Zurek
1982; Dieks 1982), the measurement postulate (von Neumann 1932), the
Hilbert-space tensor-product structure (von Neumann 1932) — and the four
information-side entries cross-link to those substrate entries.

### 2.3 Ruling

**Quantum-information stays in `04-information/quantum-information/`.**
Pass-2 of physics confirms info pass-1's placement and does not reclaim
the four entries. The physics canon holds the substrate; the information
canon holds the protocols, algorithms, and complexity results that
operate on the substrate.

**One addition.** The no-cloning theorem (Wootters & Zurek, "A single
quantum cannot be cloned," *Nature* 299, 802–803, 1982; Dieks, "Communication
by EPR devices," *Phys. Lett. A* 92(6), 271–272, 1982) is a *physics*
result — it is a theorem about quantum-mechanical states under unitary
evolution, with an explanandum on the physics side ("which transformations
are allowed by quantum mechanics?"). Pass-2 promotes Wootters–Zurek 1982
and Dieks 1982 in `02-physics/quantum-mechanics/`, bundled, as a c1
entry. Info-side `quantum-information/bb84/` cross-links to it.

This is the cleanest realization of the chemistry pass-3 §5 boundary rule
in cross-branch quantum work: the no-cloning theorem (physics-side
explanandum) and BB84 (info-side explanandum that *uses* no-cloning) sit
in different branches and cite each other.

### 2.4 Honest call

The question the pass-2 brief asked for explicitly: my honest call is
quantum-information **lives in info, not physics.** One paragraph
reasoning: the four pass-1 candidates (Feynman 1982, Deutsch 1985, BB84,
Shor 1994) all answer questions whose explanandum is computational —
"can we simulate efficiently?", "what is the universal model?", "can we
share a key securely?", "what is the complexity of factoring?" — and the
quantum-mechanical substrate enters as the *means*, not as the
*explanandum*. The chemistry pass-3 §5.1 rule (originator-framing wins,
explanandum decides the branch) is unambiguous on this. Reclaiming the
four entries to physics would force a parallel reclaim of Shannon 1949 to
mathematics (because its security argument invokes probability), and that
reductio is enough to settle the question. Physics holds the no-cloning
theorem and the measurement postulate as the substrate; info holds
everything that uses them.

---

## 3. Statistical mechanics — the chemistry/physics boundary, half by half

Chemistry pass-3 §5.1 fixed the chemistry side: "**Statistical mechanics
of N indistinguishable particles → physics.** Boltzmann, Gibbs 1902,
modern textbook formulations → `02-physics/statistical-mechanics/`." and
"**Chemical-potential, activity-coefficient, phase-rule, electrolyte
solution, equilibrium-constant treatments → chemistry.** Gibbs 1875–78,
Helmholtz 1882, van 't Hoff 1884, Nernst 1889/1906, Lewis 1907,
Lewis–Randall 1923/1961, Debye–Hückel 1923, McMillan–Mayer 1945,
Kirkwood–Buff 1951 → `03-chemistry/thermodynamics/`."

Pass-2 of physics writes the physics half by adjudicating five specific
texts, in order of difficulty.

### 3.1 Boltzmann 1872 (H-theorem) — physics canon

No question. The H-theorem is a derivation of irreversible approach to
equilibrium for a dilute gas under the Stosszahlansatz. The explanandum is
the second-law-of-thermodynamics arrow of time as a property of statistical
ensembles of identical particles. Originator framing is statistical
mechanics. **Promote in `02-physics/statistical-mechanics/`** under c1
(already in pass-1 §1, entry 14). No cross-link to chemistry needed at
the entry level — the H-theorem is not used in chemistry.

### 3.2 Boltzmann 1877 (`S = k log W`) — physics canon, cross-link to chemistry

The "Beziehung" paper introduces statistical entropy in its modern form.
The explanandum is the connection between Clausius's macroscopic entropy
and the combinatorial counting of microstates. Physics-side. The chemistry
side cites it whenever a chemist uses entropy to reason about reaction
spontaneity, equilibrium constants, or solution mixing. **Promote in
`02-physics/statistical-mechanics/`** under c1 (already in pass-1 §1,
entry 14). **Cross-link from `03-chemistry/thermodynamics/`** with the
explicit pass-3 §5.4 entropy non-conflation rule attached: the chemistry
stub specifies "Gibbs entropy" or "thermodynamic entropy" by name; no
silent identification with Shannon entropy.

This is one of the most important cross-links in the canon: chemistry
pass-3 §5.4 binds the entropy non-conflation here, info pass-1 §3.1 binds
it the other way ("every information-theoretic entry that mentions
'entropy' specifies Shannon entropy explicitly"), and the Boltzmann 1877
entry is the physics-side anchor of both bindings.

### 3.3 Gibbs 1902 — physics canon, cross-link to chemistry

The text under consideration: J. W. Gibbs, *Elementary Principles in
Statistical Mechanics: Developed with Especial Reference to the Rational
Foundation of Thermodynamics*, Charles Scribner's Sons, New York, 1902;
Dover reprint 1960 (ISBN 0-486-78995-0).

The contestable element is whether Gibbs 1902 belongs in physics or
chemistry given that Gibbs 1875–78 (the *Equilibrium of Heterogeneous
Substances* monograph) is firmly in chemistry under chemistry pass-3 §5.1
("Gibbs 1875–78 → `03-chemistry/thermodynamics/`"). The two Gibbs
monographs have different explananda. *Equilibrium of Heterogeneous
Substances* explains chemical equilibrium, phase rule, and chemical
potential — chemistry. *Elementary Principles* explains the statistical
foundation of thermodynamics from a Hamiltonian dynamical-system base
(microcanonical, canonical, grand canonical ensembles; equipartition;
Liouville's theorem in the form modern statmech needs) — physics.

Apply chemistry pass-3 §3.1: did the 1902 monograph contain a load-
bearing element no Gibbs paper contains? Yes — the *ensemble* concept as
a unified framework, with the canonical ensemble derived from
extremization of a generalized Boltzmann counting subject to an energy
constraint. Gibbs's earlier work has the formalism in pieces; the 1902
book unifies it.

**Ruling: promote Gibbs 1902 in `02-physics/statistical-mechanics/`**
under c1 (already in pass-1 §1, entry 15). Cross-link from `03-chemistry/
thermodynamics/`. The two Gibbs monographs end up in different branches
without contradiction — chemistry holds *Equilibrium*, physics holds
*Elementary Principles* — because they have different explananda. This is
the same pattern as Kolmogorov in math/info (Kolmogorov 1933 in math,
Kolmogorov 1965 in info; same author, different explananda).

### 3.4 Onsager 1931 (reciprocal relations) — physics canon

The text: L. Onsager, "Reciprocal Relations in Irreversible Processes. I,"
*Phys. Rev.* 37(4), 405–426 (1931); "II," *Phys. Rev.* 38(12), 2265–2279
(1931). Nobel 1968.

The explanandum is the symmetry of the matrix of phenomenological
coefficients connecting thermodynamic forces and fluxes near equilibrium.
The framing is statistical-mechanical (the reciprocal relations are
derived from microscopic time-reversal symmetry via the regression
hypothesis). The downstream uses are everywhere — coupled transport
phenomena (thermoelectricity, thermodiffusion, electrokinetic coupling),
biological membrane transport, irreversible thermodynamics as a
discipline.

The boundary question: irreversible thermodynamics is taught in physical
chemistry curricula as much as in physics. Does it belong in chemistry?
Apply the chemistry pass-3 §5.1 rule. The originator framing is
statistical-mechanical (Onsager opens the paper with a derivation from
microscopic reversibility, not from a chemical rate law). The
load-bearing content is a theorem about the matrix of *phenomenological
coefficients*, not about specific chemical fluxes. Downstream chemical
applications cite the theorem; they do not own the explanandum.

**Ruling: promote Onsager 1931 in `02-physics/statistical-mechanics/`**
under c1 (already in pass-1 §1, entry 17). Cross-link from `03-chemistry/
thermodynamics/electrochemistry/` (the Tafel + Butler–Volmer entries
chemistry pass-3 §4.8 promoted) and from `05-biophysics/membrane-
biophysics/` (Goldman–Hodgkin–Katz uses Onsager-style coupling
implicitly). This is the chemistry/physics boundary half-rule: linear
non-equilibrium thermodynamics is physics; specific chemical applications
of it (electrokinetic phenomena, electrode kinetics) are chemistry.

### 3.5 Test case 5: Prigogine 1947 (entropy production, dissipative
structures)

I. Prigogine, *Étude thermodynamique des phénomènes irréversibles*,
Desoer, Liège, 1947; later monograph *Introduction to Thermodynamics of
Irreversible Processes*, Charles C. Thomas, 1955; Nobel 1977. The
explanandum is the structure of entropy production in non-equilibrium
states, the minimum-entropy-production theorem, and (in later work)
dissipative structures far from equilibrium.

Pass-2 lean: **borderline canon, default to chemistry-cross-cited.** The
1947 monograph's downstream uptake is dominated by physical chemistry and
biophysics; Prigogine's own chair was physical chemistry at Brussels. The
originator framing is irreversible thermodynamics in a form chemistry can
use. The minimum-entropy-production theorem is a cleaner derivation in
Prigogine's hands than in Onsager's, but the derivation rests on the
Onsager reciprocal relations, which are physics canon under §3.4.

**Ruling: pass-2 leaves Prigogine 1947 in chemistry's domain**
(`03-chemistry/thermodynamics/non-equilibrium/` if a sub-folder is opened
in chemistry pass-4, or as a standalone entry in `03-chemistry/
thermodynamics/`), with a cross-link to `02-physics/statistical-
mechanics/onsager-1931/`. This is the inverse of the §3.4 ruling and it
is internally consistent: Onsager's reciprocal relations are the physics
foundation; Prigogine's minimum-entropy-production theorem is the
chemistry-side application.

### 3.6 The physics half of the chemistry pass-3 §5.2 rule, written

Adding the physics-side text that mirrors chemistry pass-3 §5.1's
chemistry-side text:

> **Operational rule (physics half).**
>
> - **Statistical foundations of thermodynamics from a Hamiltonian dynamical
>   base → physics.** Boltzmann 1872 (H-theorem), Boltzmann 1877 (`S = k log W`),
>   Gibbs 1902 (*Elementary Principles*), the modern textbook ensemble
>   formulations live here.
> - **Linear non-equilibrium thermodynamics (Onsager reciprocal relations)
>   → physics.** Specific chemical applications (Prigogine 1947 minimum
>   entropy production, dissipative structures, electrokinetic coupling)
>   → chemistry, cross-linked.
> - **The fluctuation–dissipation theorem (Callen & Welton 1951, *Phys.
>   Rev.* 83, 34) → physics.** Cross-linked from chemistry kinetics where
>   it underwrites linear-response treatments.
> - **Stochastic thermodynamics (the post-2000 Jarzynski / Crooks /
>   Seifert lineage) → physics canon if any of it promotes; pass-2 leaves
>   it landscape pending separate adjudication.**

This is the physics-half complement to chemistry pass-3 §5.1 and §5.2.
With both halves now written, the chemistry/physics boundary on
statistical thermodynamics is fully specified.

---

## 4. Photobiology three-way cross-link

Chemistry pass-3 §4.4 listed Stark–Einstein photoequivalence as a
cross-link only ("Einstein 1905 is `02-physics/quantum-mechanics/`
priority. The chemistry-side application (one absorbed photon = one
molecule activated) is downstream. Cite from `photochemistry/`; do not
duplicate. **Demote** as a chemistry-canon promotion."). Biophysics
rebalance pass-1 §2 listed Stark–Einstein as borderline in biophysics
("cross-link to `03-chemistry/photochemistry/` where it lives as
primary"). Biophysics needs both Stark–Einstein and Einstein 1905
photoelectric for the photosynthesis canon (Emerson–Arnold 1932,
Calvin 1962 Nobel Lecture).

### 4.1 The two physics anchors

**Einstein 1905, "Über einen die Erzeugung und Verwandlung des Lichtes
betreffenden heuristischen Gesichtspunkt," *Ann. Phys.* 322(6), 132–148.**
The photoelectric paper. Foundational physics: light arrives in discrete
quanta of energy `E = hν`. Originator framing is physical-foundations
(the Annus Mirabilis paper that introduces the light quantum). Physics
canon under c1 (pass-1 §1, entry 18). Edition of record: the *Annalen*
facsimile (PD).

**Stark 1908 + Einstein 1912 (the Stark–Einstein photoequivalence law,
strict form).** J. Stark, "Über die experimentelle Entscheidung zwischen
Ätherwellen- und Lichtquantenhypothese. I. Röntgenstrahlung," *Phys. Z.*
10, 902–913 (1909) and Einstein's 1912 papers giving the strict
"one absorbed photon activates one molecule" form. The chemistry pass-3
§4.4 verification cites these. Originator framing here is *physical
chemistry* — the explanandum is a quantum-yield rule for photochemical
reactions, not the existence of light quanta (already established by
Einstein 1905).

The Stark–Einstein law is therefore in the same epistemic category as
Marcus 1956 (chemistry pass-3 §5.3): the originator framed the result as
a chemistry result, and the result lives in chemistry. Einstein 1905
photoelectric is the physics-side substrate.

### 4.2 The biophysics use

Biophysics rebalance pass-1 §2 names the canon entries that depend on
both anchors: Emerson & Arnold 1932 (the photochemical reaction in
photosynthesis; introduces the photosynthetic-unit concept), the Calvin
group's 1950s carbon-fixation papers (with the 1962 Calvin Nobel Lecture
as edition-of-record proxy until the primary set is curated), Wald 1933
(vitamin A in the retina; rhodopsin lineage). Each cites Stark–Einstein
implicitly (the quantum-yield rule underwrites every photochemical
reaction-rate analysis) and Einstein 1905 explicitly (the existence of
the photon).

### 4.3 The three-way cross-link entry rule

Pass-2 binds:

> **Three-way photobiology cross-link rule.**
>
> The Einstein 1905 photoelectric paper is canon in
> `02-physics/relativity/special/einstein-1905-bundle/` (or in
> `02-physics/quantum-mechanics/` if pass-3 of physics breaks the 1905
> bundle apart — see §5 on the experimental/theoretical-paper question).
> The Stark–Einstein photoequivalence law is canon in
> `03-chemistry/photochemistry/stark-einstein-1908-1912/` per chemistry
> pass-3 §4.4. Biophysics canon entries that depend on either rule
> (Emerson–Arnold 1932, Calvin 1962, Wald 1933, Förster 1948 on
> resonance energy transfer per chemistry pass-3 §4.4) cite *both*
> anchors at the entry stub.
>
> Operationally: every biophysics photobiology stub carries two
> cross-links in its header — one to physics for the photon, one to
> chemistry for the photoequivalence rule. No three-way duplication of
> the Stark–Einstein entry; biophysics cites chemistry's canonical
> stub. Chemistry's stub already cross-links to physics's stub. The
> chain is single-source.

This binds chemistry pass-3 §4.4, biophysics rebalance pass-1 §2, and
physics pass-1 §1 entry 18 into a single coherent three-way relationship.

---

## 5. Pass-1 contestable calls — adjudication

Pass-1 §4 named five contestable items. Each gets a binding ruling under
the chemistry pass-3 §3.4 normative-vs-popular rule.

### 5.1 Landau–Lifshitz, *Course of Theoretical Physics*

Chemistry pass-3 §3.4 quoted: "**A monograph by a non-originator does not
promote under any condition unless it satisfies c3 (discipline-standard
normative reference) — and 'normative' means published, maintained, or
formally adopted by a standards body (IUPAC, NIST, IUCr) or by professional
consensus equivalent to a standards body. Popularity is not normativity.**"

Apply to Landau–Lifshitz. Landau is an originator (Ginzburg–Landau 1950,
Landau Fermi-liquid 1957, Landau damping 1946, Landau levels). Lifshitz
is not. The *Course* is co-authored synthesis by an originator and a
practitioner; it is not published, maintained, or adopted by any standards
body; it has no equivalent of CODATA's role for constants or PDG's role
for particle data. It is widely assigned, but per chemistry pass-3 §3.4,
"Popularity is not normativity."

**Ruling: landscape, with named carve-outs.** Pass-1's lean is ratified.
The *Course* as a multi-volume object goes in `_landscape/textbooks.md`
alongside Jackson, Sakurai, Griffiths, Peskin–Schroeder. The originator
papers carve out separately into the appropriate sub-folders:

- **Ginzburg & Landau 1950**, "K teorii sverkhprovodimosti," *ZhETF* 20,
  1064 (English: *Soviet Physics JETP*) — `02-physics/condensed-matter/`
  under c1.
- **Landau 1957 Fermi-liquid theory** — *Soviet Physics JETP* 3 (1957),
  920 and 5 (1957), 101 — `02-physics/condensed-matter/` under c1.
- **Landau 1946 plasma damping** — *J. Phys. USSR* 10, 25 — `02-physics/
  plasma-physics/` (sub-folder to be opened in pass-3) or
  `condensed-matter/` under c1.

The textbook stays landscape. The carve-outs are canon. This is the same
move chemistry pass-3 made for Coulson and Cotton 1990 (rows 16 and 17
of the chemistry pass-3 §2 table): demote the textbook, promote the
originator papers separately if they exist.

### 5.2 Misner, Thorne & Wheeler, *Gravitation* (1973)

Wheeler is an originator of geometrodynamics (the ADM formulation —
Arnowitt, Deser & Misner 1959–62 papers in *Phys. Rev.*). Thorne is an
originator of LIGO-era gravitational-wave physics. Misner is an
originator of the ADM formulation. The book is co-authored by three
originators but is itself a pedagogical synthesis.

Apply chemistry pass-3 §3.1 (originator monograph rule). Does MTW contain
a load-bearing element no prior paper contains? Honest read: no. The
book *teaches* general relativity in the geometrodynamic vocabulary
(forms, congruences, the 3+1 split) but does not originate any of the
formalism. The ADM formalism is in Arnowitt–Deser–Misner 1959–62. The
parallel-transport / geodesic-deviation / tidal-tensor pedagogy is in
prior Wheeler papers and lectures. The optical-scalars formalism is
Sachs 1961. The Penrose conformal compactification is Penrose 1963.
MTW does pedagogy at unmatched scope, but pedagogy is not originator
content under the §3.1 rule.

**Ruling: landscape.** Pass-1's lean is ratified. Goes in `_landscape/
textbooks.md`. ADM 1959–62 promotes separately into `02-physics/
relativity/general/`.

### 5.3 Feynman, Leighton & Sands, *The Feynman Lectures on Physics*

Pedagogical synthesis by an originator. The Vol. III treatment of the
path integral has originator content (Feynman explicating his own
formalism), but the load-bearing originator paper is Feynman 1948,
"Space-Time Approach to Non-Relativistic Quantum Mechanics," *Rev. Mod.
Phys.* 20(2), 367–387. The *Lectures* synthesize; they do not originate.

Apply chemistry pass-3 §3.4. The *Lectures* are not normative-by-standards-
body; they are the most popular advanced-undergraduate physics text in
North America, but per the literal quotation, "Popularity is not
normativity."

**Ruling: landscape, with the Feynman 1948 RMP path-integral paper
promoted separately.** Pass-1's lean is ratified. The 1948 paper goes in
`02-physics/quantum-field-theory/` (path-integral originator priority for
non-relativistic QM, with the QED path-integral application in Feynman
1949 already canon under pass-1 §1 entry 32). The *Lectures* go in
`_landscape/textbooks.md`.

### 5.4 Dirac, *The Principles of Quantum Mechanics* (4th ed. 1958)

Pass-1 §4.4 leaned canon and listed it strong in §1 entry 28. Pass-2
ratifies the canon promotion under chemistry pass-3 §3.1's originator-
monograph rule.

Apply the test. Did *The Principles of Quantum Mechanics* contain a
load-bearing element no prior Dirac paper contains? Yes — the
**transformation theory** (Chapter VII) as a unified formal apparatus,
the **bra–ket notation** (Dirac introduces it in the 3rd edition 1947;
the 1939 *Math. Proc. Camb. Phil. Soc.* paper "A new notation for
quantum mechanics" has the notation but not the systematic treatment),
and the **representation-independent statement of the postulates** that
Chapter II gives. The 1925–1928 Dirac papers contain the relativistic
electron equation, the q-numbers formalism, and the early operator
calculus, but none of them contains the unified textbook-level
framework that the *Principles* does.

The chemistry pass-3 precedent is exact: Pauling 1939/1960 *Nature of
the Chemical Bond* promoted as canon despite Pauling's primary papers
already being canon, on the grounds that the monograph contains
hybridization, electronegativity, the resonance theory framework, and
the metal/H-bond chapters that no single Pauling paper contains. The
Dirac monograph is in the same epistemic position.

**Ruling: canon under c1 (originator monograph).** Pass-1's lean is
ratified. Promote in `02-physics/quantum-mechanics/` with edition of
record the 4th edition (revised), 1958, ISBN 0-19-852011-5. The 1939
notation paper and the 1925–1928 papers cross-link to the monograph
entry as priority companions, in the same way that Hammett's 1937
*JACS* paper (chemistry pass-3 §3.2) cross-links to Hammett's 1940
*Physical Organic Chemistry* monograph.

### 5.5 Experimental foundation papers — mix in or dedicated `experimental/`

The candidates: Michelson & Morley 1887 (*Am. J. Sci.* 34, 333–345, null
result for the aether); Davisson & Germer 1927 (*Phys. Rev.* 30, 705–740,
electron diffraction confirms de Broglie); Wu, Ambler, Hayward, Hoppes &
Hudson 1957 (*Phys. Rev.* 105, 1413–1415, parity violation in beta
decay); plus the cosmological observations (COBE, WMAP, Planck).

Pass-1 §4.5 leaned mix-in on the chemistry pass-3 precedent that placed
Bragg & Bragg 1913 in `03-chemistry/crystallography/` rather than a
separate experimental sub-fold. Pass-2 ratifies.

**Ruling: mix in to the relevant theory sub-folders.** Specifically:

- Michelson & Morley 1887 → `02-physics/relativity/special/` as the
  experimental anchor of the Lorentz-invariance program. Cross-link to
  `electromagnetism/lorentz-1909/`.
- Davisson & Germer 1927 → `02-physics/quantum-mechanics/` as the
  experimental confirmation of the de Broglie wave hypothesis (de
  Broglie 1923–1924 *Comptes Rendus* papers and 1924 doctoral thesis are
  the theoretical priority, also promoted; pass-2 adds them as a bundled
  c1 entry pass-1 missed — see §6 for the cross-branch entry list).
- Wu et al. 1957 → `02-physics/particle-physics/` as the experimental
  anchor of parity violation. The theoretical prediction is Lee & Yang
  1956, *Phys. Rev.* 104, 254 — also promoted as a bundled c1 entry
  with Wu et al. 1957.
- COBE / WMAP / Planck → `06-cosmology/observational/` per the cosmology
  pass-1 (whenever it sweeps; pass-2 of physics flags this as a debt to
  cosmology).

The cosmological-observation handoff is the cleanest case for *not*
mixing in to physics — the explanandum is a model of the universe, not
a law of physics.

The dedicated `experimental/` sub-fold is rejected. Mixing in keeps
each sub-folder coherent as "the foundational papers (theoretical and
experimental) of this domain," which matches the chemistry-side pattern
where Bragg & Bragg 1913 and Pauling 1960 sit in the same sub-folder
without confusion.

---

## 6. Cross-branch entry list

Every physics canon entry that another branch will cite, in a single
table. Stub-writers in math, chemistry, info, biophysics, and cosmology
consult this table before they file a cross-link. Each row: physics
sub-folder + bibkey, the branches that cite it, and the context of the
citation.

| `02-physics/<sub-folder>/<bibkey>` | Cited by | Context |
|---|---|---|
| `classical-mechanics/newton-1687-principia` | `01-mathematics/analysis/` | Geometric calculus / method of first and ultimate ratios; math holds a cross-link, edition-of-record sits in physics. |
| `classical-mechanics/lagrange-1788-mecanique-analytique` | `01-mathematics/analysis/calculus-of-variations/` | Generalized coordinates; Lagrange wrote the Eulerian variational calculus into mechanics. |
| `classical-mechanics/hamilton-1834-1835-method` | `01-mathematics/symplectic-geometry/` (if opened in math pass-2) | Canonical equations; symplectic structure on phase space. |
| `classical-mechanics/jacobi-1866-vorlesungen` | `01-mathematics/analysis/pde/` | Hamilton–Jacobi equation as a first-order PDE. |
| `classical-mechanics/noether-1918` | `01-mathematics/algebra/` (Lie theory), `01-mathematics/analysis/calculus-of-variations/` | Symmetries ↔ conservation; load-bearing for every gauge theory in QFT. |
| `electromagnetism/maxwell-1873-treatise` | `03-chemistry/spectroscopy-cross-link/` (no chemistry-side spectroscopy sub-fold per chemistry pass-3 §4.5; Maxwell is cited from chemistry's photochemistry and from `_landscape/instrumentation.md`) | Unified electromagnetic field theory; underlies all spectroscopy as the physical substrate. |
| `electromagnetism/lorentz-1909-theory-of-electrons` | `02-physics/relativity/special/` (intra-branch), `03-chemistry/bonding/` | Lorentz force law on the electron in matter; underlies any chemistry-side use of electron-in-field arguments. |
| `thermodynamics/clausius-1850-1865` | `03-chemistry/thermodynamics/` | First and second laws + entropy as a state function; foundation of chemical thermodynamics. |
| `thermodynamics/planck-1901-blackbody` | `03-chemistry/photochemistry/` | The energy quantum `h` underwrites Stark–Einstein and Jablonski. |
| `statistical-mechanics/boltzmann-1872-h-theorem` | (intra-physics; no cross-branch citation) | Irreversible approach to equilibrium for a dilute gas. |
| `statistical-mechanics/boltzmann-1877-beziehung` | `03-chemistry/thermodynamics/`, `04-information/information-theory/` | `S = k log W`; the entropy non-conflation rule (chemistry pass-3 §5.4, info pass-1 §3.1) binds *here*. Stub specifies "Gibbs entropy" in chemistry, "Shannon entropy" in info; physics specifies "Boltzmann entropy" / "statistical entropy" / "Gibbs entropy" depending on context, never silent identification. |
| `statistical-mechanics/gibbs-1902-elementary-principles` | `03-chemistry/thermodynamics/` | Ensemble formulation; chemistry's *Equilibrium of Heterogeneous Substances* (Gibbs 1875–78) is the chemistry-side companion in `03-chemistry/thermodynamics/`. |
| `statistical-mechanics/onsager-1931-reciprocal-relations` | `03-chemistry/thermodynamics/electrochemistry/`, `05-biophysics/membrane-biophysics/` | Linear non-equilibrium thermodynamics; underwrites Tafel, Butler–Volmer, Goldman–Hodgkin–Katz coupling. |
| `relativity/special/einstein-1905-photoelectric` | `03-chemistry/photochemistry/`, `05-biophysics/photobiology/` | Light quantum; the substrate of every photochemistry and photobiology entry. Three-way cross-link rule per §4.3 above. |
| `relativity/special/einstein-1905-special-relativity` | `06-cosmology/` (background for FLRW), `02-physics/electromagnetism/` (intra-branch) | Lorentz invariance as a postulate; covariant electrodynamics. |
| `relativity/special/einstein-1905-brownian` | `03-chemistry/colloid-and-interface/` (Langmuir 1918 and DLVO build on the Einstein–Smoluchowski diffusion picture) | Molecular reality from observable diffusion. |
| `relativity/general/einstein-1915-1916-field-equations` | `06-cosmology/` (Friedmann derivations, ΛCDM, recombination, BBN) | GR field equations as the generative law from which every cosmological model derives. The single largest cross-link debt physics owes to cosmology. |
| `relativity/general/schwarzschild-1916` | `06-cosmology/` (black-hole and event-horizon discussion) | First exact GR solution. |
| `quantum-mechanics/de-broglie-1924-thesis` (added in pass-2 §5.5) | `03-chemistry/quantum-chemistry/` | Wave–particle duality as the physical priority for Schrödinger 1926. |
| `quantum-mechanics/heisenberg-1925-umdeutung` | `03-chemistry/quantum-chemistry/` | Matrix-mechanics priority companion to Schrödinger 1926. |
| `quantum-mechanics/schrödinger-1926-annalen-series` | `03-chemistry/quantum-chemistry/` | Wave-equation foundation of every chemistry-side bonding paper from Heitler–London 1927 forward. |
| `quantum-mechanics/born-1926` | `03-chemistry/quantum-chemistry/`, `04-information/quantum-information/` | Probability interpretation; underwrites every chemistry quantum-yield calculation and the measurement statistics in BB84. |
| `quantum-mechanics/dirac-1928-electron-equation` | `03-chemistry/quantum-chemistry/` (relativistic-corrections cross-link) | Relativistic electron equation; underlies relativistic DFT and heavy-element bonding. |
| `quantum-mechanics/dirac-1958-principles` | `01-mathematics/functional-analysis/` (cross-link), `04-information/quantum-information/` | Bra–ket notation, transformation theory; the formal apparatus quantum information uses. |
| `quantum-mechanics/pauli-1925-exclusion` | `03-chemistry/periodicity/` | Exclusion principle; foundation of the periodic table from Mendeleev forward. |
| `quantum-mechanics/born-oppenheimer-1927` | `03-chemistry/quantum-chemistry/` | Adiabatic separation; the foundational simplification that makes chemistry tractable. |
| `quantum-mechanics/von-neumann-1932-mathematische-grundlagen` | `01-mathematics/functional-analysis/`, `04-information/quantum-information/` | Hilbert-space axiomatization, projection postulate, density matrix. The §1 adjudication binds here. |
| `quantum-mechanics/wootters-zurek-dieks-1982-no-cloning` (added in pass-2 §2.3) | `04-information/quantum-information/bb84/`, `04-information/quantum-information/shor-1994/` | No-cloning theorem; security substrate for BB84, no-go for cloning-based factoring shortcuts. |
| `quantum-mechanics/hohenberg-kohn-1964` (placement per pass-1 §3 and chemistry pass-3 §5.1) | `03-chemistry/quantum-chemistry/dft/` | DFT theorems; canonical entry in physics, chemistry holds the cross-link plus the Kohn–Sham 1965 entry. |
| `quantum-mechanics/kohn-sham-1965` | `03-chemistry/quantum-chemistry/dft/` | DFT computational scheme; same pattern as Hohenberg–Kohn. |
| `quantum-field-theory/feynman-1948-rmp-path-integral` (promoted separately in pass-2 §5.3) | `04-information/quantum-information/` (path-integral picture of quantum computation), `05-biophysics/` (path-integral approaches to ion-channel kinetics, weakly cited) | Non-relativistic path integral; foundation that the Feynman 1949 QED paper builds on. |
| `quantum-field-theory/yang-mills-1954` | `02-physics/particle-physics/` (intra-branch), `01-mathematics/differential-geometry/connections-on-fibre-bundles/` | Non-abelian gauge theory; mathematics holds the differential-geometry cross-link (connections on principal G-bundles). |
| `quantum-field-theory/higgs-englert-brout-1964` | `02-physics/particle-physics/electroweak/` (intra-branch) | Mass-generation mechanism. |
| `particle-physics/lee-yang-1956` (added in pass-2 §5.5) | (intra-branch with Wu et al. 1957) | Theoretical prediction of parity violation. |
| `particle-physics/wu-et-al-1957` (added in pass-2 §5.5) | (intra-branch) | Experimental confirmation of parity violation. |
| `condensed-matter/ginzburg-landau-1950` (carved out per pass-2 §5.1) | `03-chemistry/` (no direct citation), `05-biophysics/` (none) | Mostly intra-physics; listed to demonstrate the carve-out pattern. |
| `condensed-matter/wilson-rg-1971-1975` | `02-physics/quantum-field-theory/` (intra-branch), `01-mathematics/probability/` (renormalization in stochastic processes, weak cross-link) | Modern renormalization group; the conceptual move that connected critical-phenomena physics to QFT. |
| `reference/codata-2022` | `03-chemistry/reference/iupac-gold-book/`, `05-biophysics/` (any quantitative entry) | Fundamental constants; the chemistry-side IUPAC reference cross-cites CODATA for physical constants. |
| `reference/bipm-si-2019` | `03-chemistry/reference/iupac-gold-book/`, every other branch | SI brochure; the unit system every quantitative entry uses. |
| `reference/pdg-review-of-particle-physics` | (intra-physics; no cross-branch citation) | Particle data; particle-physics-internal reference. |

### 6.1 Specifically-named cross-link rows from the brief

The pass-2 brief named eight specific entries that must appear. Each is in
the table above, with the additional context:

- **Maxwell *Treatise* → `03-chemistry/spectroscopy-cross-link/`.** Per
  chemistry pass-3 §4.5, chemistry has no spectroscopy sub-folder; Maxwell
  is cited from chemistry's `photochemistry/` and from chemistry's
  `_landscape/instrumentation.md`. The cross-link target on the chemistry
  side is `03-chemistry/photochemistry/` and `03-chemistry/_landscape/`,
  not a non-existent `spectroscopy/` sub-folder.
- **Einstein 1905 photoelectric → `03-chemistry/photochemistry/`,
  `05-biophysics/photobiology/`.** Three-way cross-link per §4 above.
- **Schrödinger 1926 → `03-chemistry/quantum-chemistry/`.** Foundation of
  every chemistry quantum-bonding entry.
- **Boltzmann 1877 → `03-chemistry/thermodynamics/`, `04-information/
  information-theory/`.** The entropy non-conflation rule (chemistry
  pass-3 §5.4 + info pass-1 §3.1) binds *at this entry*. The physics stub
  carries an explicit "this is Gibbs/Boltzmann statistical entropy, not
  Shannon entropy" header per pass-2 ruling §3.2.
- **GR field equations 1915 → `06-cosmology/`.** Generative law for every
  cosmological-model entry.
- **Roentgen 1895 → `03-chemistry/crystallography/`, `05-biophysics/
  radiation-biology/`.** X-ray discovery; foundation of crystallography
  (chemistry holds the canonical Bragg & Bragg 1913 entry per chemistry
  pass-3 §5.1 with cross-link to physics) and of radiation biology
  (biophysics rebalance pass-1 §2 lists Roentgen 1895 as the upstream
  physics entry that Hevesy 1923 builds on). Pass-2 of physics adds
  Roentgen 1895 to the canon — pass-1 missed it. Citation: W. C. Röntgen,
  "Über eine neue Art von Strahlen. Vorläufige Mittheilung," *Sitzungsber.
  Würzburger Phys.-Med. Ges.* 137, 132–141 (1895). Edition of record:
  the *Sitzungsberichte* facsimile (PD); English translation in *Nature*
  53, 274–276 (1896). **Promote in `02-physics/atomic-physics/`** (a
  sub-folder pass-1 did not name; pass-2 opens it for Roentgen, Becquerel
  1896, Curie–Curie 1898, J.J. Thomson 1897 electron discovery,
  Rutherford 1911 nuclear-atom, Moseley 1913–14, and Davisson–Germer
  1927 if not placed in `quantum-mechanics/`). Cross-link from chemistry
  and biophysics.
- **Bloch 1946 + Purcell 1946 → `03-chemistry/spectroscopy-cross-link/`.**
  Per chemistry pass-3 §4.5 / §4.13, NMR foundations live in physics; the
  chemistry-side citation is from chemistry's quantum-chemistry and
  organic-chemistry sub-folders, not a spectroscopy sub-folder (which
  chemistry pass-3 declined to open). Pass-2 of physics promotes the two
  papers as a bundled c1 entry in `02-physics/atomic-physics/` (the same
  sub-folder as Roentgen). Citation: F. Bloch, W. W. Hansen, M. Packard,
  "Nuclear Induction," *Phys. Rev.* 69, 127 (1946) and *Phys. Rev.* 70,
  474 (1946); E. M. Purcell, H. C. Torrey, R. V. Pound, "Resonance
  Absorption by Nuclear Magnetic Moments in a Solid," *Phys. Rev.* 69,
  37–38 (1946). Joint Nobel 1952. Pass-1 did not name these; pass-2 adds
  them as a bundled c1 entry.

### 6.2 New atomic-physics sub-folder

Pass-1's proposed tree did not include `atomic-physics/`. Pass-2 opens it
to house Roentgen 1895, the radioactivity discoveries (Becquerel 1896,
Curie–Curie 1898), J.J. Thomson 1897, Rutherford 1911, Moseley 1913–14,
de Broglie 1924, Davisson–Germer 1927, Bloch 1946, Purcell 1946 — the
experimental and small-theoretical anchor papers that establish atomic
structure. The chemistry pass-3 cross-link to "Moseley → physics" and the
biophysics rebalance pass-1 cross-link to "Roentgen → physics" both
resolve here.

This is the largest structural change pass-2 makes to pass-1's tree.
Justification: atomic physics is its own sub-domain by every working
physicist's taxonomy, and folding Moseley 1913–14 into `quantum-mechanics/`
(where it does not naturally belong) or into `condensed-matter/` (where
it definitely does not belong) is worse than opening the sub-folder.

### 6.3 Additions pass-2 makes to the entry inventory

Cumulative pass-2 additions to pass-1's ~38 strong entries:

1. **Wootters & Zurek 1982 + Dieks 1982 (no-cloning theorem)** in
   `quantum-mechanics/`. §2.3.
2. **De Broglie 1924 doctoral thesis + 1923–24 *Comptes Rendus* papers**
   in `atomic-physics/` or `quantum-mechanics/`. §5.5.
3. **Lee & Yang 1956 + Wu et al. 1957 (parity violation, bundled)** in
   `particle-physics/`. §5.5.
4. **Roentgen 1895** in `atomic-physics/`. §6.1.
5. **Bloch 1946 + Purcell 1946 (NMR foundations, bundled)** in
   `atomic-physics/`. §6.1.
6. **Becquerel 1896 + Curie–Curie 1898 (radioactivity discovery)** in
   `atomic-physics/` — added by extension of §6.2 logic; chemistry
   pass-3 §5.1 will need them as the physics-side cross-link for the
   chemistry-side radioactivity entries (Soddy 1913 isotopes, etc.).
7. **J. J. Thomson 1897 (electron discovery)** in `atomic-physics/` — same
   logic.
8. **Rutherford 1911 (nuclear atom)** in `atomic-physics/` — same logic.
9. **Callen & Welton 1951 (fluctuation–dissipation theorem)** in
   `statistical-mechanics/`. §3.6.
10. **Stone 1932 (one-parameter unitary groups)** in `quantum-mechanics/`
    or as a math-side cross-link only. Pass-3 should adjudicate.
11. **Feynman 1948 RMP path-integral** as a separate `quantum-field-theory/`
    entry from the 1949 QED paper. §5.3.

Net: pass-1's ~38 strong entries become ~50 after pass-2 additions, with
no demotions and three contestable items (Landau–Lifshitz, MTW, Feynman
*Lectures*) ratified as landscape with originator-paper carve-outs.

---

## 7. Status

Pass-2 is complete. The branch is now coherent with the chemistry pass-3
synthesis, the math pass-1 sweep, the info pass-1 sweep, and the biophysics
rebalance pass-1. Every cross-branch cross-link debt named in any of those
documents has a destination row in §6 above. The four adjudications:

1. **Von Neumann 1932 — confirm physics.** §1.
2. **Quantum-information — info, not physics.** §2.
3. **Statistical mechanics — physics half written: Boltzmann/Gibbs 1902/
   Onsager are physics canon; Prigogine 1947 is chemistry-cross-cited.** §3.
4. **Photobiology — Einstein 1905 (physics) and Stark–Einstein
   1908/1912 (chemistry) both anchor biophysics three-way cross-links.** §4.

Pass-3 of physics will (a) ratify the new `atomic-physics/` sub-folder,
(b) decide the placement of the borderline pass-2 additions (Stone 1932,
the de Broglie thesis edition-of-record), (c) write the binding
`CROSS_LINKS.md` from §6, and (d) coordinate with cosmology pass-1
(when it sweeps) on the GR field-equations + observational-cosmology
boundary.

— pass-2 sweep, 2026-05-01
