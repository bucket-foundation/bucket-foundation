# Mathematics Canon — Pass-2 Deep Dive — 2026-05-01

Intake document. Not promoted. Pass-2 follows the pass-1 sweep at
`mathematics-canon-pass-1-2026-05-01.md` and the parallel pass-1 sweeps in
`02-physics/` and `04-information/` from the same day. Where pass-1 left
load-bearing calls open, pass-2 picks a side. Where the four-branch system
exposes a cross-link, pass-2 adjudicates the placement against the README's
literal promotion rule and the chemistry pass-3 §3.4 normative-vs-popular
clause that the physics pass-1 explicitly imported.

Author: data pillar, cross-branch coherence sweep.

Method: literal-quotation tests against the math README's three promotion
conditions; explicit acknowledgement of the chemistry pass-3 boundary
binding ratified by physics pass-1; no new domains opened that pass-1 did
not flag (that is pass-3 work). The sweep does, however, surface seven
candidate canon entries that pass-1 omitted, each tested against the
promotion rule independently rather than imported.

Pass-2 is consciously narrow. The four newly-opened canon branches
(`01-mathematics/`, `02-physics/`, `04-information/`, plus the biophysics
pass-1 `05-biophysics/`) generated a small number of cross-listed primaries
that, if not adjudicated together in a single document, will drift apart as
the branches grow. This pass exists to prevent that drift.

---

## 1. Von Neumann 1932, *Mathematische Grundlagen der Quantenmechanik* — final placement

### 1.1 The text

John von Neumann, *Mathematische Grundlagen der Quantenmechanik*,
Grundlehren der mathematischen Wissenschaften XXXVIII, Julius Springer,
Berlin, 1932 (xii + 262 pp). English edition of record: Robert T. Beyer
(tr.), *Mathematical Foundations of Quantum Mechanics*, Investigations in
Physics 2, Princeton University Press, 1955, with the new edition edited by
Nicholas A. Wheeler, Princeton University Press, 2018, ISBN
978-0-691-17856-1. The 1932 German edition is the originator text; the
1955 Beyer translation is the citable English-language edition; the 2018
Wheeler revision corrects translation infelicities and sets the
contemporary citation form.

### 1.2 The pass-1 default

Math pass-1 §1.10 defaulted the placement to `02-physics/quantum-mechanics/`
and asked pass-2 to re-adjudicate. Physics pass-1 §1 listed it in
`quantum-mechanics/` and reaffirmed the default in §3 ("originator framing
is foundations of QM; the Hilbert-space machinery is reused outside
physics, so math holds a cross-link, not the canonical entry").

### 1.3 The literal test

The math README's promotion rule, condition 1, reads (literal quotation):

> It is a **primary theoretical text** by the originator of the framework
> (e.g. Cantor on transfinite sets, Dedekind on the real numbers, Hilbert
> on the foundations of geometry, Noether on ring ideals, Kolmogorov on
> the axioms of probability, Eilenberg and Mac Lane on natural
> transformations).

The candidate framework here is *the spectral theory of unbounded
self-adjoint operators on a separable Hilbert space*. Von Neumann is the
originator of that framework. The 1932 monograph contains: the abstract
definition of a Hilbert space (collected from Hilbert, Riesz, and his own
earlier work into a single axiomatic treatment); the spectral theorem for
unbounded self-adjoint operators in its modern form; the projection-valued
measure formalism; the introduction of the density matrix and the trace
class; the von Neumann measurement postulate as a mathematical statement
about projections.

The Hilbert-space framework is, in fact, foundation-level for *functional
analysis*, not just for QM. The spectral theorem for unbounded self-adjoint
operators is a pure-mathematics result; it is taught in functional-analysis
graduate courses with no quantum-mechanical motivation; it is the core of
operator theory after 1932; it appears as the cornerstone of every modern
operator-theory monograph (Reed–Simon, Conway, Halmos, Birman–Solomyak).

Apply the test. Does the 1932 text "explain" a physical phenomenon? No —
the explananda are mathematical objects (operators, measures, projections,
trace functionals). Does it use physical motivation? Yes — the *occasion*
of the work is to put quantum mechanics on a rigorous footing. The
explananda are mathematical; the occasion is physical.

### 1.4 The chemistry pass-3 §3.1 monograph rule, applied

Chemistry pass-3 §3.1 set this rule (binding across branches because pass-1
math §"hardest boundary call" and physics pass-1 §3 both carry forward the
same logic):

> An originator monograph promotes under c1 only when the monograph
> contains a load-bearing element that the originator paper does not
> contain.

Von Neumann's 1927–1929 papers in *Mathematische Annalen* and the
*Göttinger Nachrichten* (the "Hilbert-space" trilogy and the early
spectral-theory papers) contain the abstract Hilbert-space axioms and the
spectral-resolution machinery in mathematician's form. The 1932 monograph
contains, additionally: the projection-postulate formulation of
measurement, the density-matrix formalism, the introduction of the trace
norm and trace class, the no-hidden-variables argument (chapter IV), and
the synthetic statement of the Hilbert-space axioms as a unified
foundational system. Most of those *additional* elements have a physics
explanandum (measurement, mixed states, hidden variables). The
*mathematical* additions in the monograph that are not in the prior
papers — the trace class as a mathematical object, the projection
calculus as a unified system — are real, but they do not carry the
monograph alone.

### 1.5 Final call

**Dual-primary placement.**

- Primary entry in `02-physics/quantum-mechanics/` (originator monograph
  for the Hilbert-space formulation of QM, the projection postulate, the
  density matrix, the no-hidden-variables argument). This honors the
  physics pass-1 §3 placement.
- Primary entry in `01-mathematics/functional-analysis/` (originator
  monograph for the unified spectral theory of unbounded self-adjoint
  operators as a foundational system in operator theory, with the trace
  class as a mathematical object).
- Each branch holds a stub with a one-line cross-reference to the other.
  The bibliographic record (citation key, ISBN, editions) lives in
  `_shared/cross-listed/von-neumann-1932.md` to prevent metadata drift.

The reasoning: this is not a dual cross-link (one canonical, one
reference). The operator-theory community treats the 1932 monograph as a
primary source the same way the QM community does. The chemistry-branch
precedent for dual-primary is Lewis 1923 *Valence* (acid–base content
cross-listed without duplication into `acid-base/`); pass-2 extends the
pattern to a full second-branch promotion because functional analysis is
not a sub-folder of physics and cannot inherit by cross-link the way
acid–base inherits inside chemistry.

### 1.6 Same rule, three companions

**Hilbert and Courant — *Methoden der mathematischen Physik*, Band I,
Julius Springer, Berlin, 1924 (xiii + 450 pp); Band II, Julius Springer,
Berlin, 1937 (xvi + 549 pp).** English edition of record: *Methods of
Mathematical Physics*, vols. I and II, Interscience, New York, 1953 and
1962 (Wiley reprint, ISBN 0-471-50447-5 / 0-471-50439-4). Pass-1 §"what
pass-2 expects pass-2 to test" §6 flagged this. Apply the same rule.

The candidate framework: *the eigenvalue problem for partial differential
operators with applications to mathematical physics*. The originators of
the various pieces of that framework (Hilbert on integral equations and
quadratic forms; Courant on conformal mapping and Dirichlet's principle)
are real; the monograph synthesizes their work and a great deal of
contemporary material. The synthesis is encyclopedic, in the chemistry
pass-3 §3.4 sense — "popular, not normative." Hilbert's primary papers on
integral equations (1904–1910 *Göttinger Nachrichten*) carry his
originator priority on their own. The monograph adds organization, not
load-bearing new mathematics that the primaries lack.

**Call: landscape.** *Methoden* sits in `_landscape/textbooks.md` with a
note that Hilbert's 1904–1910 integral-equations papers and Courant's
*Dirichlet's Principle, Conformal Mapping, and Minimal Surfaces*
(Interscience 1950) — also landscape — are the originator-side primaries
to consult. This is consistent with the physics pass-1 §4.1 ruling on
Landau–Lifshitz.

**Hermann Weyl — *Gruppentheorie und Quantenmechanik*, S. Hirzel, Leipzig,
1928; 2nd revised edition Hirzel 1931.** English edition of record: H. P.
Robertson (tr.), *The Theory of Groups and Quantum Mechanics*, Methuen,
London, 1931, based on the 2nd German edition (Dover reprint 1950, ISBN
0-486-60269-9). The candidate framework: the systematic application of
group representations (continuous and finite) to quantum-mechanical
systems.

Weyl is the originator of the representation-theoretic framework as
applied to QM. The monograph contains material not in his primary papers:
the systematic treatment of the unitary representation theory of the
rotation group as it applies to atomic spectra, the spinor formalism in
its didactic form, the unified treatment of permutation symmetry and the
exclusion principle. Most of the *novel* mathematical content (the
representation theory of compact Lie groups) is in Weyl's 1925–1926
*Mathematische Zeitschrift* papers ("Theorie der Darstellung kontinuierlicher
halb-einfacher Gruppen durch lineare Transformationen, I/II/III", *Math.
Z.* 23, 271–309; 24, 328–376, 377–395, 789–791); the 1928 monograph
applies that machinery rather than originating it.

**Call: physics primary, math cross-link.** Place in
`02-physics/quantum-mechanics/` as the originator monograph for the
group-theoretic formulation of QM. Cross-link from
`01-mathematics/algebra/representation-theory/` (a sub-folder pass-3 may
need to open) to Weyl's 1925–1926 *Math. Z.* trilogy, which is the math
primary for the representation-theory framework. The 1928 monograph does
*not* dual-promote the way von Neumann 1932 does, because the
mathematical originator content lives in the 1925–1926 papers, not the
1928 book.

**George W. Mackey — *Mathematical Foundations of Quantum Mechanics*, W.
A. Benjamin, New York, 1963 (xi + 137 pp).** Reissued with corrections by
Dover, 2004, ISBN 0-486-43517-2.

The candidate framework: the imprimitivity-theorem-based reformulation of
QM, building on Mackey's 1949 *Proc. Nat. Acad. Sci.* paper "A Theorem of
Stone and von Neumann" (35, 537–545) and the 1952–1958 series on
induced representations.

This is a synthetic monograph by an originator of one specific
framework-level element (the imprimitivity theorem and its application to
the canonical commutation relations). The originator content is in
Mackey's primary papers; the 1963 monograph is a slim 137-page
synthesis. Apply pass-3 §3.1: the monograph does not contain
load-bearing new mathematics that Mackey's primary papers lack.

**Call: landscape.** Mackey 1963 sits in `_landscape/textbooks.md` with a
pointer to Mackey's 1949 *PNAS* paper and the *Annals of Mathematics*
1952 induced-representation paper ("Induced Representations of Locally
Compact Groups, I", 55, 101–139), which are the originator primaries.
The 1963 monograph is celebrated and useful but, by the chemistry pass-3
§3.1 monograph rule, does not promote.

---

## 2. Noether 1918 from the math side

### 2.1 The text

Emmy Noether, "Invariante Variationsprobleme", *Nachrichten von der
Gesellschaft der Wissenschaften zu Göttingen, Mathematisch-Physikalische
Klasse* 1918, 235–257 (presented 26 July 1918). English translation of
record: M. A. Tavel, "Invariant Variation Problems", *Transport Theory and
Statistical Physics* 1(3), 183–207 (1971), reprinted with new translator's
notes by Yvette Kosmann-Schwarzbach in *The Noether Theorems: Invariance
and Conservation Laws in the Twentieth Century*, Sources and Studies in
the History of Mathematics and Physical Sciences, Springer, 2011, ISBN
978-0-387-87867-6 (English translation pp. 3–22; Kosmann-Schwarzbach's
historical apparatus is itself a citable scholarly object).

### 2.2 The physics pass-1 placement

Physics pass-1 §1 placed Noether 1918 in `02-physics/classical-mechanics/`
and §5 ("Hardest boundary call vs `01-mathematics/`") explicitly defended
the placement on originator-framing grounds: "Noether wrote it at Hilbert
and Klein's request specifically to clarify energy conservation in general
relativity; the originator framing is unambiguously physics; every
downstream physics use rests on it." Physics pass-1 closed: "A defensible
pass-2 reversal is possible."

### 2.3 The literal test, math side

The math README's promotion rule condition 1 requires a primary
theoretical text by the originator of a framework. The candidate framework
math-side: *the correspondence between continuous symmetries of a
variational problem and conserved quantities*. The 1918 paper proves two
theorems. Theorem I states the correspondence for finite-dimensional
symmetry groups (the conservation-law theorem now universally called
"Noether's theorem"). Theorem II states a different correspondence for
infinite-dimensional symmetry groups (improper conservation laws — the
"second Noether theorem", load-bearing for gauge theory, less famous).
Both are theorems in the calculus of variations.

The framework — "Noether's theorems on variational problems" — is canon
in the calculus of variations and Lie theory independent of any physics
application. Working mathematicians cite the 1918 paper for the
variational result, not for any physical claim. The 2011 Kosmann-Schwarzbach
volume frames the work as a contribution to mathematics; the 1971 Tavel
translation appeared in a physics journal because that was where the
audience was, not because the content is physics.

Apply the dual-primary test from §1.5: does the 1918 paper, *read without
any physical reference*, prove a foundation-level mathematical theorem in
the calculus of variations? Yes — both theorems do. Would it be canon-tier
in `01-mathematics/calculus-of-variations/` even if no physicist had ever
read it? Yes.

### 2.4 Final call

**Dual-primary placement, parallel to von Neumann 1932.**

- Primary entry in `02-physics/classical-mechanics/` (originator paper
  for the symmetry-conservation correspondence as the foundation of every
  gauge theory, per physics pass-1 §1).
- Primary entry in `01-mathematics/analysis/calculus-of-variations/` (a
  sub-folder under `analysis/` that pass-3 should open; originator paper
  for the two Noether theorems on variational problems with continuous
  symmetry groups).
- Shared citation record at `_shared/cross-listed/noether-1918.md`. Both
  branch stubs link to it.

This adjudicates physics pass-1's open question. The "originator framing
is unambiguously physics" claim from physics pass-1 §5 is true about
*motivation* but not about *content*. The Hilbert-Klein request is
historical context; the 1918 paper itself is a calculus-of-variations
paper from beginning to end. Mathematicians do not cite Noether 1918 by
cross-link; they cite it as primary. The canon must reflect that.

---

## 3. Bourbaki *Éléments de mathématique*

### 3.1 The text

Nicolas Bourbaki (collective pseudonym), *Éléments de mathématique*,
Hermann (Paris, 1939–1980), continued by Masson (Paris, 1980s) and Springer
(Berlin / Heidelberg, 2000s onward). The series comprises ten books across
roughly forty chapters: *Théorie des ensembles* (1939–1957), *Algèbre*
(1942–1980), *Topologie générale* (1940–1958), *Fonctions d'une variable
réelle* (1949–1976), *Espaces vectoriels topologiques* (1953–1955),
*Intégration* (1952–1969), *Algèbre commutative* (1961–1985), *Variétés
différentielles et analytiques* (1967–1971), *Groupes et algèbres de Lie*
(1960–1982), *Théories spectrales* (1967–). Multiple revised editions and
ongoing supplements.

### 3.2 The pass-1 lean

Math pass-1 §1.12 leaned "include under c3, parallel to the IUPAC Gold
Book." Pass-1 §4.1 explicitly named Bourbaki as the single hardest call in
the inventory and asked pass-2 to adjudicate.

### 3.3 The chemistry pass-3 §3.4 binding rule

Chemistry pass-3 §3.4 (literal quotation, ratified across branches by
physics pass-1 §4.1's adoption of the same rule against Landau–Lifshitz):

> A monograph by a non-originator does not promote under any condition
> unless it satisfies c3 (discipline-standard normative reference) — and
> "normative" means published, maintained, or formally adopted by a
> standards body (IUPAC, NIST, IUCr) or by professional consensus
> equivalent to a standards body. Popularity is not normativity.

The IUPAC Gold Book is normative because IUPAC is a standards body. CODATA
is normative because the CODATA Task Group on Fundamental Constants is a
standards body. The Particle Data Group's *Review of Particle Physics* is
normative because the PDG is a standards body. The BIPM SI brochure is
normative because the BIPM is a standards body.

### 3.4 Apply the rule

Bourbaki has no standards body. The collective is a self-organized French
mathematical society with a rotating membership and no formal
mathematical-community mandate. The International Mathematical Union does
not adopt Bourbaki notation. The American Mathematical Society does not
endorse the *Éléments*. Mathematics has no equivalent of IUPAC. When a
paper says "the empty set ∅", the notation is Bourbaki's, but no standards
body fixed it; it propagated by use.

The pass-1 lean ("parallel to IUPAC") fails the literal test. IUPAC is a
standards body; Bourbaki is a celebrated authorial collective. Bourbaki
has the *influence* of a standards body but not the *status*. The
chemistry pass-3 §3.4 rule explicitly disqualifies that distinction:
"popularity is not normativity."

### 3.5 Final call

**Landscape.** Bourbaki *Éléments de mathématique* moves to
`01-mathematics/_landscape/textbooks.md` (or a parallel
`_landscape/series.md` for multi-volume serials). The seven volumes most
load-bearing for downstream canon work — *Théorie des ensembles*,
*Algèbre* (chapters 1–3), *Topologie générale*, *Espaces vectoriels
topologiques*, *Intégration*, *Algèbre commutative*, *Groupes et algèbres
de Lie* — are named explicitly in the landscape file as the practitioner's
working reference, with the originator primaries they synthesize as the
canon entries to cite.

The reasoning is *exactly* the chemistry-branch reasoning that demoted
Cotton 1990 and Coulson 1952 (chemistry pass-3 rows 16 and 17). Both were
celebrated, load-bearing for pedagogy, by non-originators, and lacked
standards-body backing. Both moved to landscape. Bourbaki gets the same
treatment.

This decision retires the entire `reference/` sub-folder under
`01-mathematics/` for normative purposes. The `reference/` slot
re-purposes to *pointer files* (OEIS, arXiv, MathSciNet, zbMATH) that are
infrastructure, not canon. There is no math-discipline standards-body
text — that is a real fact about the discipline, not a gap in the canon.

The single most consequential downstream effect: the math README's
condition 3 (discipline-standard normative reference) has *zero qualifying
texts in mathematics*. Pass-3 should consider whether to retain condition
3 in the math README at all, or to mark it explicitly inapplicable. The
recommendation here is to retain it (the slot is defined symmetrically
across branches; mathematics simply has no current occupant) and add a
README note that no mathematical work currently meets the
standards-body criterion.

---

## 4. Church 1936 from the math side

### 4.1 The text

Alonzo Church, "An Unsolvable Problem of Elementary Number Theory",
*American Journal of Mathematics* 58(2), 345–363 (April 1936),
doi:10.2307/2371045. Companion paper: "A Note on the Entscheidungsproblem",
*Journal of Symbolic Logic* 1(1), 40–41 (March 1936); correction *J.
Symb. Logic* 1(3), 101–102.

### 4.2 The info pass-1 placement

Info pass-1 §1.1 placed Church 1936 in `04-information/computation/` as a
strong c1 entry. Info pass-1 §3.2 ("Turing / Church / Gödel — when does
01-mathematics hand off") explicitly used the *downstream-use test*: "The
lambda calculus is a formal system in the mathematical-logic tradition,
but its uptake and downstream development are computational. Pass-1
places it here by the *downstream-use* test; pass-2 may reverse."

### 4.3 The literal test, math side

The math README's promotion rule condition 1 requires the originator's
primary statement of a framework. The candidate framework: *the lambda
calculus as a formal system for the foundations of mathematics*. The 1936
*AJM* paper introduces the λ-conversion calculus, proves the
Church–Rosser confluence theorem (with Rosser, *Trans. AMS* 39, 1936),
defines λ-definability as the formal notion of effective calculability,
and proves the unsolvability of a specific number-theoretic problem.

Two distinct uses of the lambda calculus run from this paper. (a) As a
*model of computation* — the framework that, paired with Turing 1936,
fixed the modern notion of effective procedure. (b) As a *formal system
of mathematical logic* — Church's original program, continued in his 1940
"A Formulation of the Simple Theory of Types" (*J. Symb. Logic* 5(2),
56–68), and the foundation of the typed-lambda-calculus tradition that
runs through Curry, Howard, Martin-Löf, Coquand, and the constructive
type-theory branch of the foundations community.

The math README's boundary rule (literal quotation from the README,
boundary-with-04 section):

> Turing 1936 ("On Computable Numbers") and Church 1936 (lambda calculus)
> are primaries of `04-information/`. They are cross-referenced here
> under `foundations/computation-cross-link/` because the decision
> problem is a problem of mathematical logic.

The README pre-binds the placement. But the README also pre-binds the
question pass-2 is asking: is the lambda calculus a primary statement of
a mathematical-logic system independent of its computational uptake?

### 4.4 The honest answer

Yes — the typed-lambda-calculus tradition (Church 1940 → Curry-Howard
1958/1969 → Martin-Löf 1972/1984 → Coquand-Huet 1988 → HoTT 2013) is the
foundational tradition that makes the lambda calculus a math-foundations
object, not just a computation object. *In that tradition, Church 1936 is
read as a foundational paper of mathematical logic, not as a paper about
computation.*

But — and this is decisive — the 1936 *AJM* paper itself proves the
unsolvability result via λ-definability as a model of computation. The
*formal-logic* uses of lambda are downstream (1940 onward); the
*computation* use is in the 1936 paper itself. The dual-primary case
would require that the 1936 paper carry both readings. It doesn't quite —
the typed and constructive uses require the 1940 simple-theory-of-types
paper to anchor them. Church 1940 is the math-logic primary; Church 1936
is the computation primary.

### 4.5 Final call

**Accept the info pass-1 placement.** Church 1936 *AJM* sits in
`04-information/computation/` as primary. Cross-link from
`01-mathematics/foundations/computation-cross-link/` per the math README.
**Promote Church 1940 *J. Symb. Logic* "A Formulation of the Simple
Theory of Types" as a math-side canon entry under
`01-mathematics/foundations/`** — pass-1 missed it. The 1940 paper is the
originator statement of simple type theory and the founding text of the
typed-lambda-calculus tradition that the foundations community now works
in. The two Church papers split the way the two Kolmogorov contributions
split (Kolmogorov 1933 → math, Kolmogorov 1965 → information): same
author, two papers, two distinct foundations.

This honors the info pass-1 §3.2 downstream-use test for the 1936 paper
without losing the math-logic content that Church kept developing for
four more years. Pass-3 should add Church 1940 as a new entry in the
math `CANON_INDEX.md`.

---

## 5. Pass-1 self-critique — what got missed

Each entry: include / exclude / borderline, with reasoning bound to the
README's three conditions.

### 5.1 Felix Klein — "Vergleichende Betrachtungen über neuere geometrische Forschungen", *Erlanger Antrittsrede*, A. Deichert, Erlangen, 1872

The Erlangen Program. The classification of geometries by their
invariance group. English translation: Mellen W. Haskell, "A Comparative
Review of Recent Researches in Geometry", *Bulletin of the New York
Mathematical Society* 2(10), 215–249 (1893).

Apply condition 1: is this a primary theoretical text by the originator
of a framework? Yes — Klein originated the geometric-classification-by-
symmetry-group framework, which became one of the most consequential
unifying ideas in 19th-century mathematics, the precursor to the
group-theoretic foundations of differential geometry, and the conceptual
substrate of modern Lie-theoretic differential geometry.

**Include.** `01-mathematics/geometry/`. Cross-link to
`differential-geometry/` (the program is the conceptual lineage of
Cartan's moving-frame method, already canon per pass-1 §1.8).

### 5.2 Paul J. Cohen — *PNAS* 1963 / 1964 papers on the independence of the continuum hypothesis

Verified citations: P. J. Cohen, "The Independence of the Continuum
Hypothesis", *Proceedings of the National Academy of Sciences USA* 50(6),
1143–1148 (December 1963); "The Independence of the Continuum Hypothesis,
II", *PNAS* 51(1), 105–110 (January 1964). Companion monograph: *Set
Theory and the Continuum Hypothesis*, W. A. Benjamin, New York, 1966
(reissued Dover 2008, ISBN 978-0-486-46921-8).

Apply condition 1: primary theoretical text by the originator of a
framework. Yes — Cohen originated the forcing technique and proved the
independence of CH (and AC) from ZF set theory. With Gödel 1938
(consistency of CH and AC with ZF, in *PNAS* 24, 556–557) the
independence-of-CH problem closes. Pass-1 promoted Gödel 1931
(incompleteness) and Zermelo 1908 (axiomatization) but missed both
Gödel 1938 *and* Cohen 1963/1964.

**Include both, as the foundations triple completion.**

- Gödel 1938 — `01-mathematics/foundations/` — c1 — consistency of CH +
  AC with ZF.
- Cohen 1963/1964 *PNAS* pair — `01-mathematics/foundations/` — c1 — the
  forcing technique and the independence of CH + AC from ZF.
- Cohen 1966 monograph — c2 edition-of-record under the chemistry pass-3
  §3.1 rule (the monograph contains the systematic forcing exposition
  that the *PNAS* notes lack), promotes alongside the 1963/1964 papers.

This is the most important pass-1 omission caught in this sweep.

### 5.3 Grothendieck — *Éléments de géométrie algébrique* (EGA) and *Séminaire de géométrie algébrique du Bois Marie* (SGA)

EGA: Alexander Grothendieck, with Jean Dieudonné, *Éléments de géométrie
algébrique*, *Publications mathématiques de l'IHÉS*, 4 (1960), 8 (1961),
11 (1961), 17 (1963), 20 (1964), 24 (1965), 28 (1966), 32 (1967). SGA:
seven seminars 1960–1969 (SGA 1 through SGA 7), published in *Lecture
Notes in Mathematics* (Springer) and rebooted in *Documents
mathématiques* (SMF, 2003 onward). Pass-1 §"what pass-2 expects pass-2 to
test" §3 explicitly flagged this and asked pass-2 to adjudicate.

Apply condition 1. Grothendieck is the originator of the
scheme-theoretic foundations of algebraic geometry (relative point of
view, sheaves on sites, étale cohomology). EGA is the systematic primary
exposition by the originator. SGA is the originator's seminar series — a
collection of primary papers, not a textbook synthesis.

The complication: EGA is famously unfinished (chapter V was never
published; many promised chapters never appeared), and the texts are in
working-document form. The chemistry pass-3 §3.1 rule applies — does the
monograph contain load-bearing material the originator papers do not?
Yes — the relative-point-of-view formalism, the systematic functor-of-
points framework, the cohomological foundations are all in EGA in their
load-bearing form, not in any prior Grothendieck paper. SGA 4 (with M.
Artin and J.-L. Verdier, on étale cohomology, *LNM* 269, 270, 305,
1972–1973) is the originator statement of étale cohomology.

**Include both.** Open `01-mathematics/algebraic-geometry/` (a new
sub-folder). EGA promotes as primary under c1. SGA 1, SGA 4, SGA 6
promote as primary papers under c1 (each contains originator material on
a distinct framework: SGA 1 on the étale fundamental group, SGA 4 on
étale cohomology, SGA 6 on K-theory and intersection theory). The other
SGA volumes promote case-by-case in pass-3. Hartshorne 1977 *Algebraic
Geometry* (Springer GTM 52, ISBN 0-387-90244-9) is landscape — it is the
discipline-standard textbook but not normative in the standards-body
sense, and Hartshorne is not the originator.

### 5.4 Atiyah and Singer — index theorem, *Bull. AMS* 69 (1963)

Verified citations: M. F. Atiyah and I. M. Singer, "The Index of Elliptic
Operators on Compact Manifolds", *Bulletin of the American Mathematical
Society* 69(3), 422–433 (May 1963); the systematic *Annals of
Mathematics* series I–V: I (Atiyah-Singer, *Ann. Math.* 87, 484–530,
1968); II (Atiyah-Segal, 87, 531–545); III (Atiyah-Singer, 87, 546–604);
IV (Atiyah-Singer, 93, 119–138, 1971); V (Atiyah-Singer, 93, 139–149).

Apply condition 1. Originator-tier statement of the index theorem — one
of the most consequential 20th-century theorems, with cross-branch reach
into physics (anomalies, instantons, supersymmetric quantum mechanics,
the Witten index) and topology (K-theory, characteristic classes).

**Include.** `01-mathematics/topology/` or, if pass-3 opens it,
`01-mathematics/global-analysis/`. Cross-link to
`02-physics/quantum-field-theory/` (anomalies) and
`01-mathematics/differential-geometry/` (characteristic classes via
Chern–Weil).

### 5.5 Atle Selberg — trace formula, 1956

Verified citation: A. Selberg, "Harmonic Analysis and Discontinuous
Groups in Weakly Symmetric Riemannian Spaces with Applications to
Dirichlet Series", *Journal of the Indian Mathematical Society* (N.S.)
20, 47–87 (1956).

Apply condition 1. Originator statement of the Selberg trace formula —
the bridge object between number theory (the spectral side encodes
Dirichlet L-function data) and spectral theory of Laplacians on
locally-symmetric spaces. Foundational for the Langlands program (Arthur–
Selberg trace formula in the relative setting).

**Include — borderline.** The 1956 paper is the originator priority, but
the framework as it now exists (Langlands–Arthur) is built from a much
larger corpus (Jacquet-Langlands 1970 *LNM* 114; Langlands 1970
"Problems in the Theory of Automorphic Forms"; Arthur 1978-1989 trace
formula series). Pass-3 should decide whether to promote Selberg 1956
alone, or to bundle it with one or two of the foundational Langlands
papers as a "automorphic foundations" entry under
`01-mathematics/number-theory/`. Pass-2 lean: promote Selberg 1956 alone
under c1, defer the Langlands-papers question to a future pass.

### 5.6 Smale, Thurston, Perelman — geometric topology

- **Stephen Smale — "Generalized Poincaré's Conjecture in Dimensions
  Greater Than Four", *Annals of Mathematics* 74(2), 391–406 (1961).**
  Originator of the h-cobordism theorem and the high-dimensional
  Poincaré conjecture. **Include** under c1, `01-mathematics/topology/`.
- **William P. Thurston — "Three-Dimensional Manifolds, Kleinian Groups
  and Hyperbolic Geometry", *Bulletin of the American Mathematical
  Society* (N.S.) 6(3), 357–381 (1982); *The Geometry and Topology of
  Three-Manifolds*, Princeton lecture notes 1978–1981 (revised edition
  edited by Steven P. Kerckhoff, AMS, in progress; the original
  mimeographed notes are widely cited as "Thurston's notes").**
  Originator of the geometrization framework. **Include** under c1, with
  the *Bull. AMS* paper as the citable primary and the Princeton notes
  as the systematic edition-of-record. `01-mathematics/topology/` (or a
  new `01-mathematics/geometric-topology/` if pass-3 chooses to split).
- **Grigori Perelman — "The Entropy Formula for the Ricci Flow and Its
  Geometric Applications", arXiv:math/0211159 (11 November 2002);
  "Ricci Flow with Surgery on Three-Manifolds", arXiv:math/0303109 (10
  March 2003); "Finite Extinction Time for the Solutions to the Ricci
  Flow on Certain Three-Manifolds", arXiv:math/0307245 (17 July 2003).**
  Three preprints, never formally journal-published; resolution of the
  geometrization conjecture (and therefore the Poincaré conjecture).
  **Include** under c1, `01-mathematics/topology/` or
  `01-mathematics/differential-geometry/` (Ricci flow). The
  edition-of-record question is unusual — the preprints themselves are
  the canonical text, with three independent expository write-ups
  (Kleiner-Lott *Geom. Topol.* 12, 2008, 2587–2855; Cao-Zhu *Asian J.
  Math.* 10, 2006, 165–492; Morgan-Tian *Clay Math. Monogr.* 3, AMS
  2007). Pass-3 should pick Kleiner-Lott as the discipline-standard
  expository edition-of-record (most cited; most accessible) and the
  three arXiv preprints as the originator-priority texts.

All three are pass-1 omissions. Geometric topology as a sub-folder is
load-bearing enough to deserve its own slot; pass-3 may want to split
`topology/` into `point-set/`, `algebraic/`, and `geometric/`.

### 5.7 F. William Lawvere — functorial semantics

Verified citation: F. W. Lawvere, "Functorial Semantics of Algebraic
Theories", *Proceedings of the National Academy of Sciences USA* 50(5),
869–872 (November 1963); the full thesis "Functorial Semantics of
Algebraic Theories", Columbia University, 1963 (republished as a
*Reprints in Theory and Applications of Categories* 5, 2004,
http://www.tac.mta.ca/tac/reprints/articles/5/tr5abs.html); "Elementary
Theory of the Category of Sets", *PNAS* 52(6), 1506–1511 (December 1964).

Apply condition 1. Originator priority for two distinct frameworks:
(a) functorial semantics — the categorical reformulation of universal
algebra; (b) ETCS — the elementary theory of the category of sets, the
first axiomatization of set theory in categorical language and the
seed of the topos-theoretic foundations program.

**Include.** `01-mathematics/category-theory/` for the 1963 thesis
(c1) and `01-mathematics/foundations/` for the 1964 ETCS paper (c1 —
this is a foundations-of-mathematics paper, not just a category-theory
paper). Both are pass-1 omissions. Eilenberg-Mac Lane 1945 is the
category-theory founding paper; Lawvere 1963/1964 is where category
theory becomes a foundations program. The two are different objects.

### 5.8 Voevodsky and Homotopy Type Theory

Univalent Foundations Program, *Homotopy Type Theory: Univalent
Foundations of Mathematics*, Institute for Advanced Study, Princeton,
2013 (PD; https://homotopytypetheory.org/book/). Vladimir Voevodsky's
prior papers: "A Very Short Note on Homotopy Lambda Calculus" (2006,
unpublished); "Univalent Foundations Project" (2010, NSF grant
proposal). Voevodsky's earlier *originator* canon work is in
motivic cohomology (Voevodsky 1996 "Triangulated Category of Motives
over a Field", arXiv:math/9908135 and the Bloch-Kato conjecture proof
in *Pub. IHÉS* 98, 2003, 59–104, and 112, 2010, 1–99).

Apply the README rule. The 2013 *HoTT Book* is a community-authored
collective text; it is by-design not single-author primary, and
Voevodsky himself never published a foundational journal paper on
univalent foundations. The framework is real (constructive
foundations of mathematics in homotopy-theoretic terms, with
Voevodsky's univalence axiom as the load-bearing addition to
Martin-Löf type theory) but the textual primary is unsettled.

**Borderline — do not promote in pass-2 or pass-3.** Wait until the
foundations community settles on a primary text. Voevodsky's *motivic*
work (arXiv:math/9908135, *Pub. IHÉS* 2003 + 2010) is canon-tier on
its own and **should be promoted** under
`01-mathematics/algebraic-geometry/` or
`01-mathematics/topology/algebraic/`. Univalent foundations / HoTT
should be revisited in 2030+ when (a) Voevodsky's posthumous papers
have a definitive edition and (b) the proof-assistant uptake (Coq's
HoTT library, Lean's Mathlib, Agda's HoTT-Agda) has either consolidated
into a shared foundational core or splintered into separable
traditions.

### 5.9 Summary of pass-1 omissions to add

| # | Entry | Branch / sub-folder | Promotion condition |
|---|-------|---------------------|---------------------|
| 1 | Klein 1872 *Erlanger Programm* | `geometry/` | c1 |
| 2 | Gödel 1938 *PNAS* (consistency of CH+AC with ZF) | `foundations/` | c1 |
| 3 | Cohen 1963/1964 *PNAS* (independence of CH from ZF) | `foundations/` | c1 |
| 4 | Cohen 1966 *Set Theory and the Continuum Hypothesis* | `foundations/` | c2 |
| 5 | Grothendieck-Dieudonné EGA (1960–1967) | new `algebraic-geometry/` | c1 |
| 6 | Grothendieck SGA 1, SGA 4, SGA 6 | `algebraic-geometry/` | c1 each |
| 7 | Atiyah-Singer 1963 *Bull. AMS* + 1968–1971 *Ann. Math.* I-V | `topology/` (or new `global-analysis/`) | c1 |
| 8 | Selberg 1956 trace formula | `number-theory/` | c1 (borderline; pass-3 to confirm) |
| 9 | Smale 1961 *Ann. Math.* (high-dim Poincaré) | `topology/` | c1 |
| 10 | Thurston 1982 *Bull. AMS* + Princeton notes | `topology/geometric/` | c1 |
| 11 | Perelman 2002–2003 arXiv trio + Kleiner-Lott 2008 | `topology/` or `differential-geometry/` | c1 |
| 12 | Lawvere 1963 thesis (functorial semantics) | `category-theory/` | c1 |
| 13 | Lawvere 1964 ETCS *PNAS* | `foundations/` | c1 |
| 14 | Church 1940 simple theory of types | `foundations/` | c1 |
| 15 | Voevodsky 1996/2003/2010 motivic cohomology | `algebraic-geometry/` | c1 |
| 16 | Weyl 1925-1926 *Math. Z.* representation-theory trilogy | new `algebra/representation-theory/` | c1 |

The list adds **16 entries** to the pass-1 inventory. Combined with
the dual-primary von Neumann 1932 and Noether 1918 placements (§§1–2),
the math branch's primary inventory grows from pass-1's ~26 strong
entries to roughly 42 strong entries. Pass-3 should freeze the tree
against the expanded list, not the pass-1 list.

The **single most important pass-1 omission**, by load-bearing-ness,
is **Cohen 1963/1964** plus the Gödel 1938 companion. Pass-1 promoted
Gödel 1931 and Zermelo 1908 but stopped at the 1931 paper. The
foundations canon without Cohen-Gödel-on-CH is missing the *closure*
of the foundations program. Without it, a reader gets the
incompleteness phenomenon (Gödel 1931) and the axiomatic system
(Zermelo 1908; ZF/ZFC) but not the demonstration that the most famous
open question in 20th-century set theory is independent of the
axioms. The independence of CH is the canonical example *of what
incompleteness looks like in a real foundational question*. Omitting
it leaves the foundations sub-folder structurally incomplete.

---

## 6. Cross-branch coherence map

Every math entry cited as a cross-link FROM another branch must have a
row here. Conversely, every cross-link FROM math INTO another branch
must be acknowledged on the math side. This is the consistency check.

### 6.1 Cross-links FROM other branches INTO math

Source: physics pass-1 §2 cross-link map; info pass-1 §3 boundary calls;
biophysics pass-1 (see report-back below for the read-back); chemistry
pass-3 §5.

| From branch / sub-folder | Math target | Reason |
|--------------------------|-------------|--------|
| `02-physics/classical-mechanics/noether-1918` | `01-mathematics/analysis/calculus-of-variations/` (new sub-folder) | Dual-primary per §2; calculus-of-variations content of Noether 1918 is canon math-side |
| `02-physics/quantum-mechanics/von-neumann-1932` | `01-mathematics/functional-analysis/` | Dual-primary per §1; spectral-theory content is canon math-side |
| `02-physics/quantum-mechanics/dirac-1928` | `01-mathematics/algebra/clifford-algebras/` (proposed) | Dirac equation requires the Dirac/Clifford algebra; pass-3 should decide whether to open the sub-folder or absorb into `algebra/` |
| `02-physics/quantum-mechanics/weyl-1928` (*Gruppentheorie*) | `01-mathematics/algebra/representation-theory/` (new) → Weyl 1925-1926 *Math. Z.* trilogy | Per §1.6; the math-side originator is the *Math. Z.* trilogy, not the 1928 monograph |
| `02-physics/relativity/general/einstein-1915` | `01-mathematics/differential-geometry/` (Riemann 1854/1868 + Ricci-Levi-Civita 1900) | Tensor calculus pre-existed GR; cross-link is from physics back into math, not duplicative |
| `02-physics/condensed-matter/wilson-rg` | `01-mathematics/analysis/` (functional integration; renormalization as a mathematical operation) | Soft cross-link; no specific math primary required |
| `04-information/computation/turing-1936` | `01-mathematics/foundations/computation-cross-link/` | Per math README; primary stays in info |
| `04-information/computation/church-1936` | `01-mathematics/foundations/computation-cross-link/` | Per §4; primary stays in info; companion Church 1940 promotes math-side |
| `04-information/algorithmic-information/kolmogorov-1965` | `01-mathematics/probability/` (cross-link to Kolmogorov 1933) | Same author, two foundations; per info pass-1 §3.4 |
| `04-information/information-theory/shannon-1948` | `01-mathematics/probability/` (measure-theoretic apparatus inherited) | Per info pass-1 §3.1 |
| `03-chemistry/spectroscopy/cotton-1990` | `01-mathematics/algebra/representation-theory/` → Burnside, Weyl 1925-1926 | Cotton 1990 is landscape per chemistry pass-3 row 17; the math primaries it depends on are canon |
| `05-biophysics/` (any entry depending on dynamical systems) | `01-mathematics/analysis/dynamical-systems/` | Soft cross-link; pass-3 to specify when biophysics promotes Smale-Hirsch or Strogatz lineage |

### 6.2 Cross-links FROM math INTO other branches

| Math source | Target branch / sub-folder | Reason |
|-------------|----------------------------|--------|
| `01-mathematics/foundations/godel-1931` | `04-information/computation/` | Incompleteness as the metamathematical companion to undecidability |
| `01-mathematics/probability/kolmogorov-1933` | `04-information/information-theory/` (Shannon inherits) | Measure-theoretic substrate of all information theory |
| `01-mathematics/probability/kolmogorov-1933` | `02-physics/statistical-mechanics/` | Probability axioms underlying statistical-mechanical ensembles |
| `01-mathematics/algebra/galois`, `algebra/cayley`, `algebra/noether-1921` | `03-chemistry/crystallography/` (point groups) | Group theory underlies crystallographic classification |
| `01-mathematics/algebra/representation-theory/weyl-1925-1926` | `03-chemistry/spectroscopy/` | Selection rules from representation theory |
| `01-mathematics/differential-geometry/riemann-1854-1868` | `02-physics/relativity/general/` | Manifold + metric tensor as substrate of GR |
| `01-mathematics/differential-geometry/ricci-levi-civita-1900` | `02-physics/relativity/general/` | Tensor-calculus apparatus Einstein used |
| `01-mathematics/category-theory/eilenberg-mac-lane-1945` | `04-information/computation/` (categorical semantics; Lawvere) and `02-physics/quantum-field-theory/` (TQFT, monoidal categories) | Cross-cutting structural language |
| `01-mathematics/foundations/lawvere-1964-etcs` | `04-information/computation/` (topos-theoretic foundations of computation) | Foundational alternative to ZFC in computation |
| `01-mathematics/topology/atiyah-singer-1963` | `02-physics/quantum-field-theory/` | Index theorem underlies anomaly calculations and instanton counting |
| `01-mathematics/analysis/calculus-of-variations/noether-1918` | `02-physics/classical-mechanics/` | Per §2; dual-primary |

### 6.3 Coherence check — open issues

Three cross-link issues this sweep surfaced that pass-3 must resolve:

1. **`01-mathematics/algebra/representation-theory/` is not a pass-1
   sub-folder.** Burnside, Weyl 1925-1926 *Math. Z.* trilogy, and the
   downstream chemistry/physics dependencies require it. Pass-3 should
   open it as a sibling to `algebra/`. Burnside 1897 *Theory of Groups
   of Finite Order* (Cambridge University Press, 2nd ed. 1911; Dover
   reprint 1955) is the originator monograph for finite group
   representation theory and should promote alongside.

2. **`01-mathematics/analysis/calculus-of-variations/` is not a pass-1
   sub-folder.** Required by Noether 1918 dual-primary placement.
   Originator entries: Euler 1744 *Methodus inveniendi lineas curvas
   maximi minimive proprietate gaudentes* (Lausanne et Genevæ, Marcum-
   Michaelem Bousquet) and Lagrange's *Mécanique analytique* are both
   foundational, but Euler's 1744 monograph is the originator priority
   for the calculus of variations as a mathematical discipline. Pass-3
   should open the sub-folder and promote Euler 1744 + Noether 1918
   together.

3. **`01-mathematics/algebraic-geometry/` is not a pass-1 sub-folder.**
   Required by §5.3 (Grothendieck) and §5.8 (Voevodsky motivic). Pass-3
   should open it. The originator chain to consider: Riemann 1857
   "Theorie der Abel'schen Functionen" (*J. reine angew. Math.* 54,
   115–155); Hilbert *Nullstellensatz* (1893 *Math. Ann.* 42); Zariski
   1944 + 1947 papers in *Bull. AMS* and *Trans. AMS*; Weil 1946
   *Foundations of Algebraic Geometry* (AMS Colloquium Publications);
   Serre 1955 "Faisceaux algébriques cohérents" (*Ann. Math.* 61);
   Grothendieck-Dieudonné EGA + SGA. The full inventory is pass-3 work,
   not pass-2.

---

## 7. Recommended frozen tree for pass-3 to consider

Same shape as chemistry pass-3 §6. Pass-3 may modify, but this is the
inventory pass-2 endorses for freeze.

```
01-mathematics/
  README.md                           (revise: add §3.4 normative-
                                      vs-popular note; mark condition 3
                                      as having no current occupants)
  CANON_INDEX.md                      (binding manifest)
  CROSS_LINKS.md                      (binding cross-link table per §6)
  _intake/
    mathematics-canon-pass-1-2026-05-01.md
    mathematics-canon-pass-2-2026-05-01.md       (this file)
  _shared/
    cross-listed/
      von-neumann-1932.md             (shared metadata for §1 dual-primary)
      noether-1918.md                 (shared metadata for §2 dual-primary)
  foundations/
    cantor-1874-1891.md
    frege-1879-1884.md
    russell-whitehead-1910-1913.md    (borderline-strong per pass-1 §4)
    zermelo-1904-1908.md
    fraenkel-skolem-zfc.md            (Jech 2003 as edition-of-record)
    godel-1931.md
    godel-1938.md                     (NEW per §5.2)
    cohen-1963-1964.md                (NEW per §5.2)
    cohen-1966-monograph.md           (NEW per §5.2, c2)
    church-1940-simple-types.md       (NEW per §4 / §5.7)
    lawvere-1964-etcs.md              (NEW per §5.7)
    computation-cross-link/
      turing-1936.md                  (cross-link only; primary in 04)
      church-1936.md                  (cross-link only; primary in 04)
  number-theory/
    gauss-1801.md
    riemann-1859.md
    dedekind-1872-1888.md
    dirichlet-dedekind-vorlesungen.md  (borderline per pass-1 §4)
    selberg-1956.md                    (NEW per §5.5; borderline)
  analysis/
    cauchy-1821.md
    weierstrass-werke.md               (pass-3 to pick volumes)
    lebesgue-1902.md
    stieltjes-1894-1895.md
    caratheodory-1914-1918.md
    calculus-of-variations/            (NEW sub-folder per §6.3)
      euler-1744.md
      noether-1918.md                  (dual-primary per §2)
  algebra/
    galois-1846.md
    cayley-1854.md
    noether-1921-idealtheorie.md
    representation-theory/             (NEW sub-folder per §6.3)
      burnside-1897.md
      weyl-1925-1926-mathz.md          (NEW per §5.9 row 16)
    clifford-algebras/                 (proposed; pass-3 may absorb into
                                       algebra/ flat)
  geometry/
    euclid-elements-heath-ed.md
    hilbert-1899-grundlagen.md
    klein-1872-erlanger-programm.md    (NEW per §5.1)
  topology/
    poincare-1895-1904.md
    hausdorff-1914.md
    smale-1961.md                      (NEW per §5.6)
    geometric/                         (proposed sub-fold)
      thurston-1982-bullams.md         (NEW per §5.6)
      thurston-princeton-notes.md      (NEW per §5.6)
      perelman-2002-2003-arxiv.md      (NEW per §5.6)
      perelman-kleiner-lott-eor.md     (NEW per §5.6, c2)
    atiyah-singer-1963-bullams.md      (NEW per §5.4)
    atiyah-singer-1968-1971-annmath.md (NEW per §5.4)
  differential-geometry/
    riemann-1854-1868.md
    ricci-levi-civita-1900.md
    cartan-1928-lecons.md
  algebraic-geometry/                  (NEW sub-folder per §6.3)
    riemann-1857-abelschen.md          (pass-3 to confirm)
    hilbert-1893-nullstellensatz.md    (pass-3 to confirm)
    zariski-1944-1947.md               (pass-3 to confirm)
    weil-1946-foundations.md           (pass-3 to confirm)
    serre-1955-fac.md                  (pass-3 to confirm)
    grothendieck-dieudonne-ega.md      (NEW per §5.3)
    grothendieck-sga-1.md              (NEW per §5.3)
    grothendieck-sga-4.md              (NEW per §5.3)
    grothendieck-sga-6.md              (NEW per §5.3)
    voevodsky-1996-2003-2010-motivic.md (NEW per §5.8)
  probability/
    kolmogorov-1933.md
  functional-analysis/
    banach-1932.md
    von-neumann-1932.md                (dual-primary per §1)
  category-theory/
    eilenberg-mac-lane-1945.md
    mac-lane-1971-cwm.md               (c2 edition-of-record)
    lawvere-1963-functorial-semantics.md (NEW per §5.7)
  reference/
    pointers/
      oeis.md
      arxiv.md
      mathsciNet.md
      zbmath.md
    (NO normative monograph occupants per §3 — Bourbaki demoted)
  _landscape/
    textbooks.md                       (Spivak, Rudin, Munkres, Dummit-
                                       Foote, Hatcher, Hartshorne 1977,
                                       Coulson, Sakurai)
    series.md                          (Bourbaki *Éléments* per §3;
                                       Landau-Lifshitz cross-ref to
                                       physics pass-1 §4.1)
```

Tree size: roughly 13 sub-folders (up from pass-1's 11), 4 new
sub-folders opened (`representation-theory/`, `calculus-of-variations/`,
`geometric/` under `topology/`, `algebraic-geometry/`), 16 new entries
promoted, 1 monograph series demoted, 2 dual-primary cross-listings
formalized, 1 README revision required.

---

## Report-back to dispatcher

**File**: `/home/gian/agfarms/bucket-foundation/bucket-canon/01-mathematics/_intake/mathematics-canon-pass-2-2026-05-01.md`
**Line count**: ~720 lines (within the 600-800 target).

**Final calls:**

(a) **Von Neumann 1932 placement**: dual-primary. Canon entry in
`02-physics/quantum-mechanics/` AND in
`01-mathematics/functional-analysis/`. Shared metadata file under
`_shared/cross-listed/`. Reasoning at §1; the chemistry pass-3 §3.1
monograph rule licences the operator-theory load-bearing content, and
working mathematicians cite it as primary (not by cross-link) the same
way physicists do.

(b) **Bourbaki c3 status**: rejected. Demoted to landscape. Reasoning at
§3; the chemistry pass-3 §3.4 normative-vs-popular rule (binding across
branches per physics pass-1 §4.1's adoption) requires standards-body
backing for c3 promotion; Bourbaki is a self-organized authorial
collective without standards-body status. Mathematics has no current c3
occupant; the README should mark this explicitly.

(c) **Church 1936 placement**: accept the info pass-1 placement in
`04-information/computation/`. Reasoning at §4; the 1936 *AJM* paper
proves its unsolvability result via λ-definability as a model of
computation, not as a formal-logic system. The math-foundations content
of Church's program is in the 1940 *J. Symb. Logic* simple-theory-of-
types paper, which pass-1 missed and which pass-2 promotes math-side
under c1.

(d) **Most important pass-1 omission**: **Cohen 1963/1964 *PNAS* on the
independence of the continuum hypothesis** (with Gödel 1938 *PNAS*
consistency companion and Cohen 1966 monograph as edition-of-record).
Pass-1 promoted Gödel 1931 and Zermelo 1908 but stopped at the
incompleteness paper, leaving the foundations sub-folder structurally
incomplete: a reader gets the axiomatic system (ZF/ZFC) and the
incompleteness phenomenon (Gödel 1931) but not the demonstration that
the most famous open question in 20th-century set theory is
independent of the axioms. Cohen's forcing technique is also a
framework-level mathematical contribution that is foundational for
modern set theory in its own right. This is a clean pass-1 omission,
not a borderline call.

Two further structural calls worth flagging to pass-3: (i) Noether
1918 also dual-primaries math-side at `analysis/calculus-of-variations/`
(reverses physics pass-1's open question); (ii) sixteen new entries are
promoted total (§5.9), and four new sub-folders open
(`algebra/representation-theory/`, `analysis/calculus-of-variations/`,
`topology/geometric/`, `algebraic-geometry/`).
