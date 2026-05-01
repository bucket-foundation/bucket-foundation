# Mathematics Canon Pass-2 — Cross-Branch Coherence — 2026-05-01

Intake document. Not promoted. Pass-1 (`mathematics-canon-pass-1-2026-05-01.md`)
opened the branch breadth-first and deliberately deferred a small set of
boundary calls into pass-2. In the same 24 hours, three sibling branches
shipped their own pass-1 sweeps (`02-physics/_intake/physics-canon-pass-1`,
`04-information/_intake/information-canon-pass-1`, and the chemistry
pass-3 synthesis) and each touched calls that mathematics had floating.
This pass closes the cross-branch interface. It does **not** reopen any
math-internal entry that pass-1 already settled; it adjudicates only the
boundary between `01-mathematics/` and the other six canon branches.

Author: data pillar (cross-branch coherence sweep).
Method: read pass-1 of math, physics, info side-by-side; inherit the
chemistry pass-3 §3 rule architecture by literal quotation; adjudicate the
four floating calls; build the cross-branch citation table; surface the
math entries pass-1 missed because it was breadth-first.

The chemistry pass-3 synthesis is the architecturally senior document for
the entire canon. Three of its rules apply across every branch:

> **An originator monograph promotes under c1 only when the monograph
> contains a load-bearing element that the originator paper does not
> contain. Otherwise the monograph is c2 (edition-of-record at most) or
> landscape.** (chemistry pass-3 §3.1)

> **A monograph by a non-originator does not promote under any condition
> unless it satisfies c3 (discipline-standard normative reference) — and
> "normative" means published, maintained, or formally adopted by a
> standards body (IUPAC, NIST, IUCr) or by professional consensus
> equivalent to a standards body. Popularity is not normativity.**
> (chemistry pass-3 §3.4)

> **Originator-framing.** (chemistry pass-3 §4.3, applied to Bragg 1913 to
> place it on the chemistry side despite being also a physics result —
> "Originator-framing.")

These three rules are the spine of every adjudication below.

---

## 1. Adjudication — von Neumann, *Mathematische Grundlagen der Quantenmechanik*, Springer, Berlin, 1932

### 1.1 The state of the call entering pass-2

Math pass-1 §1.10 placed it in `02-physics/quantum-mechanics/` by default,
with a cross-reference back to `01-mathematics/functional-analysis/`,
flagged for pass-2 reversal. Physics pass-1 §1 (under "Quantum mechanics")
listed it as **Strong** in `02-physics/quantum-mechanics/` and described
it as the "Originator-monograph for the Hilbert-space axiomatization, the
projection postulate, and the von Neumann measurement scheme,"
cross-linked from `01-mathematics/operator-theory/`. Both branches
converged independently on the same placement. Physics pass-1 §3 made it
the first row of its boundary-calls table:

> "von Neumann 1932, *Mathematische Grundlagen* | physics (cross-link
> from math) | Originator framing is foundations of QM; the Hilbert-space
> machinery is reused outside physics, so math holds a cross-link, not the
> canonical entry."

### 1.2 The pass-2 ruling

**Binding: canonical entry sits in `02-physics/quantum-mechanics/`.
`01-mathematics/functional-analysis/` holds a cross-link only.** The
ruling rests on chemistry pass-3 §3.1 read backwards. Chemistry pass-3 §3.1
says an originator monograph promotes under c1 only when it contains a
load-bearing element the originator paper does not. Von Neumann 1932 is
exactly such a monograph: the spectral theorem for unbounded self-adjoint
operators, the projection postulate, the von Neumann measurement scheme,
and the density matrix are all in the 1932 book and are not in any
single prior von Neumann paper. So the monograph promotes under c1. The
question is *to which branch*. Because the load-bearing elements are all
about the **physical interpretation of QM** (measurement, the postulate
on collapse, the density matrix as a representation of mixed quantum
states), the originator-framing test (chemistry pass-3 §4.3) lands the
entry in physics. Functional analysis inherits the operator-theoretic
machinery as a downstream user, exactly the way `03-chemistry/quantum-
chemistry/` inherits Schrödinger 1926. The functional-analysis cross-link
text is bound below.

### 1.3 The generalizing rule

> **Originator-monograph cross-branch placement rule (pass-2).** When
> an originator monograph contains load-bearing material that no
> originator paper contains, and that load-bearing material is itself
> framed in the language of one branch but builds machinery used in
> another, the canonical entry sits in the framing branch. The
> downstream branch holds a cross-link, not the entry.

This is the chemistry pass-3 §4.3 originator-framing rule, lifted out of
the Bragg 1913 specifics and stated generally. It applies to:

- **Hilbert and Bernays, *Grundlagen der Mathematik* I (1934) and II
  (1939), Springer.** The Hilbert-Bernays book is the originator monograph
  for the proof-theoretic program (the second volume contains the
  Hilbert-Bernays derivability conditions, the formal arithmetisation of
  syntax, and the second incompleteness theorem in its modern statement).
  Originator-framing is unambiguously mathematical logic. Canonical entry
  in `01-mathematics/foundations/`. No cross-link to information unless
  pass-3 of information opens a `meta-mathematics/` sub-fold; pass-1 of
  information did not.
- **Weyl, *Gruppentheorie und Quantenmechanik*, Hirzel, Leipzig, 1928 (2nd
  ed. 1931; English tr. H. P. Robertson, *The Theory of Groups and Quantum
  Mechanics*, Methuen 1931, Dover reprint 1950).** Originator monograph
  for the group-representation treatment of QM. Two load-bearing elements
  the prior Weyl papers do not contain: the systematic spinor-rotation
  treatment, and the symmetric-group / Young-tableau treatment of
  identical particles. Originator-framing is split — Weyl's stated
  motivation is QM, but the apparatus is group representation theory and
  is reused throughout chemistry (point groups, selection rules) and
  particle physics (SU(2), SU(3)). **Pass-2 ruling: canonical entry sits
  in `02-physics/quantum-mechanics/` with cross-links from
  `01-mathematics/algebra/` and `03-chemistry/spectroscopy/`.** Same logic
  as von Neumann 1932.
- **Hilbert and Courant, *Methoden der mathematischen Physik* I, Springer
  1924; II, Springer 1937.** This is the symmetric case to von Neumann
  1932. The framing is mathematical (it is a mathematics textbook for
  physicists, not a physics monograph using mathematics), the
  load-bearing material is functional analysis and PDE theory, and there
  is no single Hilbert paper that contains the Courant-developed PDE
  apparatus. **Pass-2 ruling: canonical entry sits in
  `01-mathematics/functional-analysis/` with cross-link from
  `02-physics/`.** Pass-1 of math listed it borderline; pass-2 promotes.

### 1.4 The cross-link entry text (binding)

To be placed under `01-mathematics/functional-analysis/CANON_INDEX.md`:

> **von Neumann, J. (1932).** *Mathematische Grundlagen der
> Quantenmechanik.* Springer, Berlin. **Cross-link.** Canonical entry in
> `02-physics/quantum-mechanics/von-neumann-1932.md`. Cited from
> `01-mathematics/functional-analysis/` for the spectral theorem for
> unbounded self-adjoint operators (Ch. II §§5–10) and the trace-class
> / Hilbert-Schmidt operator framework (Ch. IV §§2–3), both of which
> are originator-tier statements with no prior paper of record.
> English edition-of-record: Robert T. Beyer (tr.), *Mathematical
> Foundations of Quantum Mechanics*, Princeton University Press, 1955;
> revised ed. ed. Nicholas A. Wheeler, Princeton, 2018, ISBN
> 978-0-691-17856-1.

---

## 2. Adjudication — Church 1936, "An Unsolvable Problem of Elementary Number Theory," *American Journal of Mathematics* 58, 345–363

### 2.1 The state of the call entering pass-2

Math pass-1 §1.6 placed Church 1936 as primary in `04-information/`, with
cross-link from `01-mathematics/foundations/computation-cross-link/`.
Information pass-1 §1.1 listed Church 1936 as **Strong c1** in
`04-information/computation/`, with cross-citation from
`01-mathematics/foundations/`. Information pass-1 §3.2 explicitly stated
the test:

> "Church 1936 → here, with cross-link from `01-mathematics/foundations/`.
> The lambda calculus is a formal system in the mathematical-logic
> tradition, but its uptake and downstream development are computational.
> Pass-1 places it here by the *downstream-use* test; pass-2 may reverse."

Two branches converge on the same placement, on the same test, both
flagging it as overturnable.

### 2.2 The pass-2 ruling

**Binding: canonical entry sits in `04-information/computation/`.
`01-mathematics/foundations/` holds a cross-link.** The downstream-use
test is the right test, and Church 1936 passes it the same way Turing
1936 does.

The argument for reversal is real and deserves a paragraph. Church 1936
proves that no general recursive function decides the question whether
two lambda-terms are equivalent. The proof object is a result in
mathematical logic — specifically, an undecidability result for a formal
system. Read in 1936 it is a sibling of Gödel 1931. Yet the historical
trajectory diverges sharply: Gödel's incompleteness flowed into
proof-theory (Gentzen, Kleene's *Introduction to Metamathematics*, the
ordinal-analysis program), while Church's lambda calculus flowed into
the design of programming languages (LISP, ML, Haskell), denotational
semantics (Scott-Strachey), type theory (Martin-Löf, Coquand), and
ultimately the Curry-Howard correspondence. Every modern citation of
Church 1936 in a non-historical paper is in a computer-science or
type-theory venue, not a mathematical-logic venue.

Test against chemistry pass-3 §3.1: an originator paper does not need a
monograph to promote, and Church 1936 is unambiguously originator-tier
under c1. The question is which branch holds the c1 entry. The branch is
fixed by where the originator-framing landed downstream, which is the
same rule applied to von Neumann 1932 in §1 above. Downstream framing
for Church 1936 is computational. Math holds the cross-link.

This also disposes of the Gödel 1931 / Church 1936 / Turing 1936 trio
cleanly:

| Paper | Canonical branch | Cross-linked from |
|---|---|---|
| Gödel 1931 | `01-mathematics/foundations/` | `04-information/computation/` |
| Church 1936 | `04-information/computation/` | `01-mathematics/foundations/` |
| Turing 1936 | `04-information/computation/` | `01-mathematics/foundations/` |
| Post 1936 | `04-information/computation/` | `01-mathematics/foundations/` |

Information pass-1 §3.2 already binds Gödel 1931 to math and Turing 1936
to information; pass-2 of math ratifies and adds Church 1936 and Post 1936
to the same row.

### 2.3 The cross-link entry text (binding)

To be placed under `01-mathematics/foundations/CANON_INDEX.md`:

> **Church, A. (1936).** "An Unsolvable Problem of Elementary Number
> Theory." *American Journal of Mathematics* 58, 345–363.
> doi:10.2307/2371045. **Cross-link.** Canonical entry in
> `04-information/computation/church-1936.md`. Cited from
> `01-mathematics/foundations/` because the proof of unsolvability for
> the lambda-equivalence problem is, read in its 1936 context, an
> undecidability result for a formal system in the tradition of Gödel
> 1931. Downstream use is computational, which is why the canonical
> entry sits in information, not here. Companion: Church, A. (1936),
> "A Note on the Entscheidungsproblem," *J. Symbolic Logic* 1, 40–41
> with corrigendum 101–102 — the explicit statement of Church's
> theorem.

The companion *J. Symbolic Logic* note is added because pass-1 of
information did not name it and it is the cleaner statement of Church's
theorem proper. Pass-3 of information should add it.

---

## 3. Adjudication — Noether 1918, "Invariante Variationsprobleme"

### 3.1 The state of the call entering pass-2

Physics pass-1 §1 placed Noether 1918 in `02-physics/classical-mechanics/`
as **Strong**, "the single most-cited theorem in modern theoretical
physics; load-bearing for every gauge theory below," with a parenthetical
"(Cross-link from `01-mathematics/calculus-of-variations/`.)" Math pass-1
did not address Noether 1918 at all — it appears nowhere in the inventory
or boundary calls. This is a pass-1 omission of math, caught here.
Physics pass-1 §5 made it the headline of its honest take:

> "Hardest boundary call vs `01-mathematics/`. Noether 1918... The
> argument for math: the proof is a result in the calculus of variations
> and would be canon there even if no physicist had ever read it. The
> argument for physics: Noether wrote it at Hilbert and Klein's request
> specifically to clarify energy conservation in general relativity; the
> originator framing is unambiguously physics."

### 3.2 The pass-2 ruling

**Binding: canonical entry sits in `02-physics/classical-mechanics/` (per
physics pass-1). `01-mathematics/` holds a cross-link from a sub-folder
to be opened in pass-3, provisionally `01-mathematics/analysis/calculus-
of-variations/` or `01-mathematics/algebra/lie-theory/` — the entry
itself spans both, see below.** Math pass-1 left calculus of variations
folded inside `analysis/`; pass-3 should split it out as a sibling
sub-folder, because Noether 1918, Euler *Methodus inveniendi* 1744, and
Lagrange *Mécanique analytique* 1788 (the variational chapters) all
belong in one place.

The ruling rests on the same originator-framing rule used for von Neumann
1932 and Church 1936. Hilbert and Klein commissioned the paper to settle
a problem in general relativity (the apparent failure of energy
conservation in GR's diffeomorphism-invariant action). The English
edition-of-record is the M. A. Tavel 1971 translation in *Transport
Theory and Statistical Physics* 1(3), 183–207 — a physics journal. Every
gauge theory in modern physics rests on it. Originator-framing is
physics; the load-bearing downstream use is physics; the canonical entry
is physics.

The mathematics cross-link is non-trivial and should be substantive,
because the *theorem itself* is a clean statement in the calculus of
variations and Lie theory and would be canon in math even with no
physical motivation. The cross-link text is bound below.

### 3.3 The generalizing rule

> **The "theorem in pure math that physics needs" vs "theorem written
> for physics but cited as pure math" rule (pass-2).** A theorem
> belongs to mathematics canonically if its originator-framing is
> mathematical and its first downstream uses are mathematical, even if
> a physical use later dominates citation count. A theorem belongs to
> physics canonically if its originator-framing is physical *and* it
> was commissioned, motivated, or published in a physics venue, even
> if its statement is purely mathematical.

Applied to specific cases:

- **Noether 1918** → physics. Commissioned by Hilbert/Klein for GR.
  Published in the *Mathematisch-Physikalische Klasse*. Originator-framing
  physical.
- **Stokes' theorem (modern Cartan form, in *Sur certaines expressions
  différentielles* 1899)** → math. Originator-framing mathematical,
  downstream uses mathematical and physical roughly evenly.
- **Atiyah-Singer 1963 index theorem** → math. Atiyah and Singer's *Bull.
  AMS* 69, 422–433 (1963) is in a math journal, the originator-framing is
  the index of an elliptic operator on a compact manifold, and the
  physical applications (anomalies, instantons) are downstream by 15+
  years. See §6 below.
- **Riemann 1854/1868** → math. Originator-framing is "the hypotheses on
  which geometry rests"; the physical application via Einstein 1915 is
  downstream by 60 years. Math pass-1 placed it correctly.

### 3.4 The cross-link entry text (binding)

To be placed under `01-mathematics/analysis/calculus-of-variations/
CANON_INDEX.md` once that sub-folder opens in pass-3:

> **Noether, E. (1918).** "Invariante Variationsprobleme."
> *Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen,
> Mathematisch-Physikalische Klasse* 1918, 235–257. **Cross-link.**
> Canonical entry in `02-physics/classical-mechanics/noether-1918.md`.
> Cited from `01-mathematics/analysis/calculus-of-variations/` because
> the two theorems of the paper are clean statements about Lie-group
> actions on the configuration space of a variational problem and are
> independent of any physical interpretation. The first theorem is the
> originator statement of the symmetry-conservation correspondence for
> finite-dimensional Lie groups; the second theorem treats infinite-
> dimensional Lie groups and is the originator statement that
> diffeomorphism invariance produces identities (Bianchi-type) rather
> than conservation laws. English edition-of-record: M. A. Tavel (tr.),
> "Invariant Variation Problems," *Transport Theory and Statistical
> Physics* 1(3), 183–207, 1971.

---

## 4. Adjudication — Bourbaki, *Éléments de mathématique*, Hermann (later Masson, then Springer), Paris, 1939–

### 4.1 The state of the call entering pass-2

Math pass-1 §1.12 listed Bourbaki as the most contestable call in the
inventory:

> "The contestable claim is whether Bourbaki is normative reference
> (condition 3 of the promotion rule) or landscape monograph series
> (extensive but not authoritative). The case for canon inclusion: no
> other text or author re-fixed the basic mathematical vocabulary at
> comparable scope; the only parallel object across the canon is the
> IUPAC Gold Book, which we are promoting as canon under condition 3.
> **Strong if promoted under condition 3.** Pass-2 should adjudicate."

Math pass-1 §4 ranked it as the single hardest call in the inventory and
asked pass-2 to "poll discipline citation patterns: do mathematicians
cite Bourbaki the way chemists cite the Gold Book (as the unambiguous
authority for a definition or notation)?"

### 4.2 Inherit the chemistry pass-3 §3.4 rule by literal quotation

Chemistry pass-3 §3.4 settled the parallel question for chemistry. Quoted
in full:

> "**A monograph by a non-originator does not promote under any
> condition unless it satisfies c3 (discipline-standard normative
> reference) — and 'normative' means published, maintained, or formally
> adopted by a standards body (IUPAC, NIST, IUCr) or by professional
> consensus equivalent to a standards body. Popularity is not normativity.**
> Atkins, March, Cotton-Wilkinson, Coulson, Cotton 1990, Streitwieser,
> Carey-Sundberg, Anslyn-Dougherty, Szabo-Ostlund — none satisfy this.
> All landscape. The list is closed: *the only non-originator monographs
> that promote under c3 are the IUPAC books.*"

### 4.3 Apply the rule to Bourbaki

Bourbaki is a collective pseudonym, not a single non-originator. The
collective contains originators (Weil, Cartan, Eilenberg in his Bourbaki
period, Dieudonné, Serre, Grothendieck briefly), but the *Éléments* is
not their primary work — each member's primary work appears under the
member's own name (Weil's algebraic-geometry papers, Eilenberg-Mac Lane
1945, Cartan's seminars, Serre's *FAC* and *GAGA*, Grothendieck's EGA).
So the *Éléments* is a non-originator monograph in the sense of pass-3
§3.4: it does not contain originator-priority material that is unavailable
elsewhere under the originators' own names.

The c3 test is then the only available promotion path. Chemistry pass-3
§3.4 says c3 means "published, maintained, or formally adopted by a
standards body (IUPAC, NIST, IUCr) or by professional consensus
equivalent to a standards body." There is no mathematics standards body.
The closest analogues are:

- The **International Mathematical Union** (IMU). The IMU does not
  publish a normative reference. It administers prizes and the ICM.
- The **American Mathematical Society** (AMS), via *Mathematical Reviews*
  / MathSciNet. MathSciNet is a citation database, not a normative
  reference.
- The **Mathematics Subject Classification** (MSC2020), maintained jointly
  by zbMATH and MathSciNet. This is genuinely normative — every paper in
  every refereed math journal carries an MSC code — but it is a
  classification, not a definition / notation reference.

The IUPAC Gold Book is *adopted by IUPAC* — a real standards body. The
*Éléments* is not adopted by any analogous body. The strongest defence
of Bourbaki is the *de facto* one: that mid-20th-century mathematicians
cited the *Éléments* the way a chemist would cite the Gold Book. But
chemistry pass-3 §3.4 is explicit: **"Popularity is not normativity."**

### 4.4 The pass-2 ruling

**Binding: demote Bourbaki *Éléments de mathématique* to
`01-mathematics/_landscape/textbooks.md`.** It does not promote under
c1 (collective, non-originator), does not promote under c2 (not the
edition-of-record of a primary text), and fails c3 because no
mathematics standards body adopts or maintains it. By chemistry pass-3
§3.4 the only non-originator monographs that promote under c3 in any
branch are formally-adopted-by-a-standards-body documents.

The mathematics-canon analogue of the IUPAC Gold Book is then the
empty set. Math has originator monographs (Hilbert *Grundlagen der
Geometrie*, Banach 1932, Mac Lane CWM, Kolmogorov *Grundbegriffe*) and
originator papers; it does not have a normative reference adopted by a
standards body, and trying to fit Bourbaki into that empty slot
violates the rule chemistry pass-3 spent a section unwinding.

The `01-mathematics/reference/` sub-folder shrinks accordingly — it
holds pointer files for OEIS (maintained by the OEIS Foundation; not
normative for definitions, but normative for sequence identifiers),
arXiv, MathSciNet, and zbMATH. None of those are canon entries; the
sub-folder is a pointer registry.

A residual carve-out: **Bourbaki, "Theory of Sets" (Vol. I of the
*Éléments*), Hermann 1968 / Springer 2004 reprint.** The set-theory
volume is the originator presentation of the structures-mère framework
and the explicit ⌀ symbol for the empty set. If pass-3 wants to carve
out a single Bourbaki volume as the Bourbaki originator entry, this is
the candidate. Pass-2 declines to make that promotion: the
structures-mère framework was largely superseded by category theory
(Eilenberg-Mac Lane 1945, Mac Lane CWM 1971), and the ⌀ symbol is a
notational contribution that does not by itself promote a 400-page
volume to canon. Pass-3 may overturn.

### 4.5 The landscape entry text

To be placed under `01-mathematics/_landscape/textbooks.md`:

> **Bourbaki, N. (1939–).** *Éléments de mathématique.* Hermann (later
> Masson, then Springer), Paris. Multiple volumes across Set Theory,
> Algebra, General Topology, Functions of a Real Variable, Topological
> Vector Spaces, Integration, Lie Groups and Lie Algebras, Commutative
> Algebra, Spectral Theory, Differential and Analytic Manifolds.
> **Landscape, not canon.** Bourbaki is the most successful collective
> textbook project in 20th-century mathematics and fixed mid-century
> mathematical notation across Europe and North America. It does not
> promote under the canon promotion rule because it is a non-originator
> monograph (originator material by Bourbaki members appears under each
> member's own name) and fails the c3 normativity test (chemistry pass-3
> §3.4): no mathematics standards body adopts or maintains it.
> Popularity is not normativity. Cited as landscape for working
> mathematical reference; not canon.

---

## 5. Cross-branch entry list — every math entry that physics, chemistry, info, or biophysics will need to cite

The table is the binding artefact of this pass for downstream branches.
Every row is a math entry that another branch's stub-writers will
need a stable reference to. The `cited-by` column is exhaustive as of
the pass-1 sweeps of all four sibling branches; pass-3 may add rows.

| Math entry (folder/bibkey) | Cited-by branches | Citation context |
|---|---|---|
| `01-mathematics/differential-geometry/riemann-1854.md` | `02-physics/relativity/general/einstein-1915`, `02-physics/relativity/general/hilbert-1915`, `02-physics/relativity/general/schwarzschild-1916`, `06-cosmology/friedmann-1922` | Manifold concept, metric tensor, sectional curvature — the substrate of GR |
| `01-mathematics/differential-geometry/ricci-levi-civita-1900.md` | `02-physics/relativity/general/einstein-1915`, `03-chemistry/quantum-chemistry/computational/` (spinor / tensor calculus for relativistic DFT) | Tensor calculus — the formal language Einstein used |
| `01-mathematics/differential-geometry/cartan-1928.md` | `02-physics/quantum-field-theory/yang-mills-1954`, `02-physics/relativity/general/`, `03-chemistry/spectroscopy/` (moving frames for vibrational analysis) | Moving frames, exterior differential systems — the modern language of gauge theory |
| `01-mathematics/probability/kolmogorov-1933.md` | `04-information/information-theory/shannon-1948`, `04-information/cryptography/foundations/shannon-1949`, `02-physics/statistical-mechanics/gibbs-1902` (modern measure-theoretic re-reading), `04-information/algorithmic-information/` (the probability-side counterpart to Kolmogorov 1965) | Measure-theoretic axioms of probability — every information-theoretic entropy and every modern statmech argument inherits |
| `01-mathematics/category-theory/eilenberg-mac-lane-1945.md` | `04-information/computation/` (denotational semantics, type theory), `07-mind/` (categorical models of cognition, if pass-1 of mind opens that line), `01-mathematics/algebra/` (homological algebra), `01-mathematics/topology/` (sheaf cohomology) | Categories, functors, natural transformations — the structural language of modern math |
| `01-mathematics/category-theory/mac-lane-cwm-1971.md` | same as above | Discipline-standard reference for the categorical vocabulary |
| `01-mathematics/functional-analysis/banach-1932.md` | `02-physics/quantum-mechanics/von-neumann-1932` (Banach-space techniques used in spectral theory), `04-information/learning-theory/` (Vapnik-Chervonenkis 1971 uses Banach-space arguments), `02-physics/condensed-matter/wilson-rg` (operator-algebra techniques) | Banach spaces, Hahn-Banach, open-mapping, closed-graph, uniform-boundedness |
| `01-mathematics/functional-analysis/hilbert-courant-1924.md` (promoted in §1.3 above) | `02-physics/quantum-mechanics/`, `02-physics/electromagnetism/` (PDE methods for boundary-value problems) | Eigenvalue problems for self-adjoint operators, PDE theory — the math substrate of QM |
| `01-mathematics/algebra/galois-1846.md` | `04-information/coding-theory/reed-solomon-1960` (finite-field arithmetic), `04-information/cryptography/foundations/diffie-hellman-1976` (group-theoretic discrete log) | Galois correspondence, finite fields |
| `01-mathematics/algebra/cayley-1854.md` | `02-physics/quantum-mechanics/weyl-1928` (group-rep theory of QM), `03-chemistry/spectroscopy/cotton-1990` (point groups), `02-physics/particle-physics/` (Lie group theory) | Abstract group definition |
| `01-mathematics/algebra/noether-1921.md` | `01-mathematics/algebra/` (Noetherian rings, Lasker-Noether decomposition), no direct external use yet | Foundational for commutative algebra and downstream algebraic geometry |
| `01-mathematics/foundations/godel-1931.md` | `04-information/computation/turing-1936`, `04-information/computation/church-1936`, `04-information/computation/post-1936`, `07-mind/` (computational theories of mind, Penrose-style arguments) | Incompleteness — the closure of the Hilbert program |
| `01-mathematics/foundations/zermelo-1908.md` | `04-information/algorithmic-information/` (axiom of choice in descriptive set theory), `01-mathematics/probability/kolmogorov-1933` (measure-theoretic foundations) | First axiomatization of set theory |
| `01-mathematics/foundations/cantor-1874-1891.md` | `04-information/algorithmic-information/` (cardinality of computable sets, the diagonal method), `01-mathematics/foundations/godel-1931` (the diagonal lemma is a Cantor-diagonal descendant) | Originator of set theory |
| `01-mathematics/analysis/lebesgue-1902.md` | `01-mathematics/probability/kolmogorov-1933`, `04-information/information-theory/shannon-1948` (continuous channels), `02-physics/statistical-mechanics/` | Lebesgue measure and integral |
| `01-mathematics/analysis/caratheodory-1918.md` | `01-mathematics/probability/kolmogorov-1933` (Carathéodory extension theorem) | Axiomatic measure theory |
| `01-mathematics/topology/poincare-1895.md` | `02-physics/quantum-field-theory/` (gauge bundles), `02-physics/relativity/general/` (topology of spacetime), `06-cosmology/` (cosmological topology) | Algebraic topology, fundamental group |
| `01-mathematics/topology/hausdorff-1914.md` | `02-physics/quantum-mechanics/` (topology of state spaces), `01-mathematics/functional-analysis/banach-1932` | Hausdorff axioms, point-set topology |
| `01-mathematics/geometry/euclid-elements.md` | `08-deep-history/` (axiomatic method), `09-art/` (geometric construction in early modern art) | Axiomatic method — every later axiomatization is in dialogue with it |
| `01-mathematics/geometry/hilbert-1899.md` | `01-mathematics/foundations/` (the modern axiomatic method) | First complete consistent axiomatic system for Euclidean geometry |
| `01-mathematics/number-theory/gauss-1801.md` | `04-information/cryptography/foundations/` (number-theoretic cryptography), `04-information/cryptography/foundations/rsa-1978` | Quadratic reciprocity, modular arithmetic |
| `01-mathematics/number-theory/riemann-1859.md` | `04-information/cryptography/foundations/` (analytic number theory underpins primality testing) | Zeta function, the explicit formula |
| `01-mathematics/number-theory/dedekind-1872.md` | `01-mathematics/foundations/` (real-number construction), `01-mathematics/analysis/cauchy-1821` | Dedekind cuts |

Every cross-link is one-directional from the math entry to the citing
branch. The cited branch's stub carries a `Cross-link from
01-mathematics/<bibkey>` line; the math stub carries a `Cited by
<branch>/<bibkey>` line. Pass-3 should generate a `CROSS_LINKS.md` at
the math branch root that mechanically derives from this table.

Three rows above are placeholders for entries pass-1 of math listed but
did not adjudicate the bibkey for: `noether-1921` (the bibkey is fine),
`hilbert-courant-1924` (promoted in §1.3 of this pass; pass-3 needs to
add the entry stub), and `cartan-1928` (pass-1 listed it as **Strong**).
Two cross-link targets in the table point into branches that have not
yet opened pass-1 sweeps: `06-cosmology/friedmann-1922.md` and
`07-mind/`. Those targets are stable references because physics pass-1
§3 binds Friedmann to cosmology, and the math-mind boundary was settled
in math pass-1 §3 (cognitive science of mathematics is in `07-mind/`,
not here).

---

## 6. Math pass-1 omissions caught while adjudicating cross-branch

Pass-1 was breadth-first and named ~32 strong candidates plus ~10
borderline. Working through the cross-branch interface in §§1–5 above
surfaced five candidate entries pass-1 missed entirely or under-weighted.
Each is tested below against the chemistry pass-3 §3 rule architecture.
None is binding-promote in this pass; each gets a recommended pass-3
disposition.

### 6.1 Grothendieck — *Éléments de géométrie algébrique* (EGA, *Publ. Math. IHÉS* 4, 8, 11, 17, 20, 24, 28, 32, 1960–1967, with Dieudonné) and *Séminaire de géométrie algébrique du Bois Marie* (SGA 1–7, Springer LNM 224 / 269 / 270 / 305 / 569 / 589 / 288 / 340, 1971–1977)

Math pass-1 §4 flagged this as Question 3 and explicitly deferred to
pass-2. Pass-2 ruling: **canon, under c1, in a new sub-folder
`01-mathematics/algebraic-geometry/`.** EGA contains load-bearing
material — schemes, sheaf cohomology in the EGA-style generality, the
relative point of view, the functorial definition of algebraic-geometric
objects — that no prior Grothendieck paper contains. SGA contains the
étale cohomology (SGA 4), the ℓ-adic formalism (SGA 5), and the
Riemann-Hilbert correspondence apparatus (SGA 7). Both promote under
chemistry pass-3 §3.1: originator monograph containing load-bearing
material no originator paper of record contains. The unfinished status
of EGA (the published volumes cover the equivalent of "EGA 0–IV §4"
only; chapters V onward exist as Grothendieck's notes but were not
published) does not block c1 promotion — chemistry pass-3 promoted
several papers whose downstream completion took decades.

The discipline-standard reference companion is Hartshorne, *Algebraic
Geometry*, Springer GTM 52, 1977 (ISBN 0-387-90244-9), which is c2
edition-of-record for the schemes-and-sheaves apparatus in
English-language form. Hartshorne does not pass c3 (no standards body
adopts it; popularity is not normativity per chemistry pass-3 §3.4) so
it is c2 only.

Cross-links: `02-physics/quantum-field-theory/` (étale cohomology in
arithmetic-geometric approaches to QFT, Beilinson-Drinfeld, geometric
Langlands), `04-information/cryptography/foundations/` (the elliptic-
curve and abelian-variety machinery used by ECC and pairing-based
crypto inherits from EGA).

### 6.2 Élie Cartan and Hermann Weyl on Lie groups — the math physics needs for gauge theory

Math pass-1 §1.8 lists Cartan 1928 *Leçons sur la géométrie des espaces
de Riemann* in differential geometry, which is correct but partial. The
Cartan-Weyl Lie theory specifically — Cartan's 1894 thesis *Sur la
structure des groupes de transformations finis et continus* (Nony,
Paris) and Weyl's 1925-26 *Mathematische Zeitschrift* trilogy on the
representation theory of compact semisimple Lie groups (*Math. Zeit.*
23, 271–309 (1925); 24, 328–376 (1926); 24, 377–395 (1926); 24,
789–791 (1926), the four "Theorie der Darstellungen kontinuierlicher
halbeinfacher Gruppen durch lineare Transformationen" papers) — is not
in the math pass-1 inventory. Both promote under c1.

This is the single highest cross-branch leverage omission: every Yang-
Mills 1954, every gauge theory in physics pass-1's `quantum-field-
theory/` fold, every SU(2)/SU(3) treatment in `02-physics/particle-
physics/`, and every spectroscopy-side use of point-group representation
theory in `03-chemistry/spectroscopy/` cites Cartan-Weyl Lie theory.
Without it the math branch has a Riemann entry and a Noether cross-link
but no canonical entry for the *group-theoretic* substrate that physics
inherits.

Pass-3 disposition: **promote both, in a new sub-folder
`01-mathematics/algebra/lie-theory/`.** Cartan 1894 thesis and Weyl
1925-26 trilogy are originator papers under c1. Chevalley *Theory of Lie
Groups I*, Princeton 1946 (ISBN 0-691-04990-4), is c2 edition-of-record
for the modern English-language presentation; Serre *Lie Algebras and
Lie Groups* (Benjamin 1965; Springer LNM 1500 reprint 1992) is
landscape (popular textbook by an originator of *other* material, but
not originator for Lie theory).

### 6.3 Atiyah and Singer 1963 index theorem

M. F. Atiyah and I. M. Singer, "The Index of Elliptic Operators on
Compact Manifolds," *Bulletin of the American Mathematical Society* 69,
422–433 (1963); the full proof in five papers in *Annals of Mathematics*
87, 484–530, 531–545, 546–604 (1968) and 93, 119–138, 139–149 (1971).
Math pass-1 did not list it. Promotes under c1: originator paper for
the index of an elliptic operator on a compact manifold, the
index-theoretic generalization that swallowed Hirzebruch-Riemann-Roch,
the Riemann-Roch theorem for algebraic curves, and the Gauss-Bonnet
theorem as special cases.

The "theorem in pure math that physics needs" rule (§3.3 above) keeps
this in math: the originator-framing is mathematical (elliptic operator
theory on a compact manifold), the first downstream uses are
mathematical (K-theory, the Hirzebruch program), and the physical
applications (anomalies in QFT — Alvarez-Gaumé, Witten — and instantons
in Yang-Mills) are downstream by 15+ years. Cross-link from
`02-physics/quantum-field-theory/`.

Pass-3 disposition: **promote, in `01-mathematics/differential-geometry/`
or in `01-mathematics/algebra/lie-theory/` jointly with the Cartan-Weyl
material — the index theorem is a Lie-theoretic theorem about elliptic
operators that lives across both sub-folders.** Pass-3 picks the
sub-folder.

### 6.4 Robinson 1966 *Non-standard Analysis*

Abraham Robinson, *Non-standard Analysis*, North-Holland, Amsterdam,
1966 (revised 2nd ed. 1974; Princeton Landmarks in Mathematics reprint
1996, ISBN 0-691-04490-2). Math pass-1 did not list it. Borderline
under c1: it is the originator monograph for a foundational alternative
to ε-δ analysis, using infinitesimal numbers in a logically rigorous
model-theoretic framework. The load-bearing element absent from prior
Robinson papers (his 1961 *Indag. Math.* 23, 432–440 sketch is not the
full theory) is the systematic transfer principle and the construction
of the hyperreals via an ultrapower of ℝ.

Pass-2 ruling: **borderline-strong — promote in pass-3 with explicit
"foundations alternative" tag.** Non-standard analysis is a genuine
foundational alternative and its omission would leave the math canon
silent on a real internal-foundations debate. The chemistry pass-3 §3.1
rule licenses promotion. Folder: `01-mathematics/foundations/non-standard
-analysis/` or as a single entry in `01-mathematics/analysis/`.

### 6.5 Lawvere ETCS / Lawvere-Tierney elementary topos theory

F. William Lawvere, "An Elementary Theory of the Category of Sets,"
*Proceedings of the National Academy of Sciences USA* 52, 1506–1511
(1964); F. W. Lawvere and Myles Tierney, the elementary-topos lectures
(Lawvere's 1969-70 Dalhousie lectures, written up by Tierney as
*Topoi* notes; published canon: P. T. Johnstone, *Topos Theory*, LMS
Monographs 10, Academic Press, 1977; superseded by Johnstone, *Sketches
of an Elephant: A Topos Theory Compendium*, vols. I-II, Oxford Logic
Guides 43-44, 2002).

Math pass-1 did not list ETCS. Borderline-strong under c1: ETCS is the
originator paper for category-theoretic foundations as an alternative
to ZFC. It is the structural-foundations counterpart of Robinson 1966's
analytic-foundations alternative.

Pass-2 ruling: **borderline — flag for pass-3 as overturn-for-pass-3
candidate.** Pass-1 of math committed to ZFC as the working foundations
(via the Jech 2003 c3 promotion); ETCS is a real alternative that the
modern category-theoretic and homotopy-type-theory communities take
seriously. The rule chemistry pass-3 §3.1 licenses promotion as
originator paper. The question pass-3 must answer is whether the math
canon is monistic about foundations (one foundation per branch) or
pluralistic (ZFC, ETCS, Robinson hyperreals all listed as foundational
alternatives). Pass-3 of foundations chemistry / physics has not had to
answer this question because chemistry and physics inherit *one*
mathematical foundation by convention. The math branch has to make the
call.

### 6.6 The single most cross-branch leverage entry pass-1 missed

**The Cartan-Weyl Lie theory primaries (Cartan 1894 thesis + Weyl 1925-26
*Math. Zeit.* trilogy)** are the highest-leverage omission. Every
gauge-theory entry in physics pass-1, every group-rep entry in
chemistry's spectroscopy fold, every Lie-algebraic entry in
quantum-information, and every Atiyah-Singer downstream cite hangs off
them. Without a canonical Cartan-Weyl entry in math, every other branch
that needs Lie theory has a dangling cross-link target. Pass-3 must
open `01-mathematics/algebra/lie-theory/` as priority #1.

The four other omissions (Grothendieck EGA/SGA, Atiyah-Singer 1963,
Robinson 1966, Lawvere ETCS) each have one or two downstream branches
that need them. Cartan-Weyl has four. Highest leverage.

---

## 7. What pass-3 inherits from this pass

Binding rulings:

1. **von Neumann 1932** — canonical entry in `02-physics/quantum-mechanics/`,
   cross-link from `01-mathematics/functional-analysis/`. Generalized rule
   in §1.3 also binds **Hilbert-Bernays 1934/1939** (math), **Weyl 1928
   *Gruppentheorie und Quantenmechanik*** (physics), **Hilbert-Courant
   1924/1937** (math, promoted).
2. **Church 1936** — canonical entry in `04-information/computation/`,
   cross-link from `01-mathematics/foundations/`. Same row as Turing 1936
   and Post 1936; Gödel 1931 alone goes the other way.
3. **Noether 1918** — canonical entry in `02-physics/classical-mechanics/`,
   cross-link from `01-mathematics/analysis/calculus-of-variations/`
   (sub-folder to be opened in pass-3).
4. **Bourbaki *Éléments*** — landscape, by chemistry pass-3 §3.4
   ("popularity is not normativity"). The mathematics-canon analogue of
   the IUPAC Gold Book is the empty set.
5. **Cross-branch entry table (§5)** — binding manifest for what every
   sibling branch can cite from the math canon.

Pass-3 to-do for math:

- Open sub-folders: `01-mathematics/analysis/calculus-of-variations/`,
  `01-mathematics/algebra/lie-theory/`, `01-mathematics/algebraic-geometry/`.
- Promote the §6 omissions (Cartan 1894, Weyl 1925-26, Grothendieck
  EGA/SGA, Atiyah-Singer 1963, Robinson 1966, conditionally Lawvere ETCS).
- Promote Hilbert-Courant 1924 to `01-mathematics/functional-analysis/` per §1.3.
- Generate `01-mathematics/CROSS_LINKS.md` from the table in §5.
- Move the Bourbaki entry into `01-mathematics/_landscape/textbooks.md`.

Pass-3 to-do for sibling branches (filed for the relevant pillar):

- Physics pass-2 must add the von Neumann 1932 cross-link header text
  (§1.4 above) inverted as the canonical-entry header.
- Information pass-2 must add the Church 1936 *J. Symbolic Logic* note
  as a companion to the *American Journal of Mathematics* entry (§2.3).
- Cosmology pass-1 (when opened) must inherit the Friedmann 1922
  cross-link target named in physics pass-1 §3 and in §5 above.

---

## Sources used in this pass

- math pass-1 sweep: `bucket-canon/01-mathematics/_intake/mathematics-canon-pass-1-2026-05-01.md`
- physics pass-1 sweep: `bucket-canon/02-physics/_intake/physics-canon-pass-1-2026-05-01.md`
- info pass-1 sweep: `bucket-canon/04-information/_intake/information-canon-pass-1-2026-05-01.md`
- chemistry pass-3 synthesis (§3.1, §3.4, §4.3): `bucket-canon/03-chemistry/_intake/chemistry-canon-pass-3-synthesis-2026-05-01.md`
- [Princeton University Press — von Neumann, *Mathematical Foundations of Quantum Mechanics*, new ed. 2018](https://press.princeton.edu/books/hardcover/9780691178561)
- [Tavel 1971 English translation of Noether 1918 — *Transport Theory and Statistical Physics* 1(3)](https://www.tandfonline.com/doi/abs/10.1080/00411457108231446)
- [Hartshorne, *Algebraic Geometry*, Springer GTM 52, 1977](https://link.springer.com/book/10.1007/978-1-4757-3849-0)
- [Atiyah-Singer 1963, *Bull. AMS* 69, 422–433 (open access)](https://www.ams.org/journals/bull/1963-69-03/S0002-9904-1963-10957-X/)
- [Robinson, *Non-standard Analysis*, Princeton Landmarks reprint 1996](https://press.princeton.edu/books/paperback/9780691044903/non-standard-analysis)
- [Lawvere 1964, "An Elementary Theory of the Category of Sets" — *PNAS* 52](https://www.pnas.org/doi/10.1073/pnas.52.6.1506)
