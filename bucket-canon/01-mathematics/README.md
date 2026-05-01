# 01-mathematics — Canon Branch

## Scope

The mathematics canon holds **axioms, primary definitions, and foundational
derivations** of mathematics: the foundations of geometry, the foundations of
arithmetic and number theory, the rigorous foundations of analysis, the
structural foundations of algebra, set theory and the foundations of logic, the
foundations of topology, the foundations of differential geometry, the
axiomatic foundation of probability, the structural foundation of functional
analysis, and category theory as the modern language of structure-preserving
maps. It also holds the discipline-standard normative reference works that
fix mathematical vocabulary and notation across sub-fields.

It does **NOT** hold:

- Catalogues of solved problems (no Hilbert-problems list, no Clay-problems
  monographs as canon — primary papers that resolved them may qualify on
  their own merits)
- Biographies of mathematicians
- History-of-mathematics narrative (that belongs in `08-deep-history/`)
- Popularizations and trade books (Strogatz on calculus, Hardy's *Apology*
  belongs in landscape, not canon)
- Undergraduate textbooks below the discipline-standard tier (Spivak,
  Rudin, Munkres, Dummit-Foote, Hatcher are landscape — load-bearing for
  pedagogy, not for foundations)
- Open-problem manuscripts and survey articles unless the survey is the
  originator's own statement of a framework (e.g. Grothendieck's *Récoltes
  et Semailles* is landscape; Eilenberg-Mac Lane 1945 is canon)
- Computer-algebra and proof-assistant systems as objects (cite as
  reference, do not mirror)

## Promotion rule

Material enters `01-mathematics/` only when one of the following holds:

1. It is a **primary theoretical text** by the originator of the framework
   (e.g. Cantor on transfinite sets, Dedekind on the real numbers,
   Hilbert on the foundations of geometry, Noether on ring ideals,
   Kolmogorov on the axioms of probability, Eilenberg and Mac Lane on
   natural transformations).
2. It is a **recognized academic edition-of-record** of a primary text
   (e.g. Heath's translation of Euclid, the Liouville 1846 edition of
   Galois, the Springer Gesammelte Abhandlungen of Riemann).
3. It is a **discipline-standard normative reference** that fixes
   vocabulary and notation across the field (Bourbaki *Éléments de
   mathématique* is the canonical example, evaluated below).

Practitioner monographs, advanced textbooks, problem collections, and
expository surveys do not promote unless they meet condition 3 by virtue
of being the discipline's normative reference, not just a celebrated one.

## Boundary calls

### Boundary with 02-physics

The mathematics-physics boundary is the most worked one in the canon. The
default rule is: a text belongs in mathematics if its primary content is
the mathematical structure, even when its motivation is physical.
- Newton's *Principia* (1687) is cross-referenced from both branches; the
  geometric-calculus apparatus is mathematics, the laws of motion and
  gravitation are physics. Edition-of-record sits in `02-physics/` with a
  pointer here.
- Riemann's 1854 *Habilitationsvortrag* (manifolds, the metric tensor) is
  mathematics; Einstein 1915–16 (general relativity, which uses the
  Ricci-Levi-Civita tensor calculus built on Riemann) is physics.
- Von Neumann's *Mathematische Grundlagen der Quantenmechanik* (1932) is
  the contestable case. It is the canonical statement of the
  Hilbert-space formulation of quantum mechanics. Default placement:
  `02-physics/quantum-mechanics/` because the explanandum is physical;
  the spectral-theory machinery it develops is cross-referenced here. See
  pass-2 for re-adjudication.
- Statistical mechanics, ergodic theory, and the operator algebras that
  came out of QM live in physics with cross-refs into mathematics.

### Boundary with 03-chemistry

Group theory underpins crystallography, point groups, and selection
rules; the primary group-theory texts (Burnside, Weyl) live here, and
Cotton 1990 lives in `03-chemistry/spectroscopy/` as the chemistry-side
discipline-standard reference. No duplication.

### Boundary with 04-information

This is the most consequential boundary. Computability and information
theory grew out of mathematics, but `04-information/` exists as a branch
precisely because they are now their own canon. The rule:
- Turing 1936 ("On Computable Numbers") and Church 1936 (lambda
  calculus) are primaries of `04-information/`. They are
  cross-referenced here under `foundations/computation-cross-link/`
  because the decision problem is a problem of mathematical logic.
- Gödel 1931 (incompleteness) is primary in `01-mathematics/foundations/`
  because the explanandum is the consistency and completeness of formal
  arithmetic, not computation. Cross-link to `04-information/`.
- Shannon 1948 is primary in `04-information/`. The mathematical
  apparatus (probability, entropy as a measure-theoretic object) is
  inherited from here; cite, do not duplicate.
- Kolmogorov complexity (Kolmogorov 1965, Solomonoff 1964, Chaitin 1966)
  is primary in `04-information/`; Kolmogorov 1933 (axiomatic
  probability) is primary here. The same author lands on both sides of
  the line because the explananda differ.

### Boundary with 07-mind

Cognitive science of mathematics (Lakoff and Núñez, *Where Mathematics
Comes From*, 2000; Dehaene, *The Number Sense*, 2nd ed. 2011) is canon
material for `07-mind/`, not here. The mathematics canon is structural
and formal; how humans come to grasp it is a different object.

## Subfolders

Tentative for pass-1; pass-3 freezes the tree.

- `foundations/` — set theory, logic, the formal foundations program
  (Frege, Russell-Whitehead, Zermelo, ZF/ZFC, Gödel)
- `number-theory/` — Gauss, Riemann, Dedekind, the analytic and algebraic
  primaries
- `analysis/` — Cauchy, Weierstrass, Lebesgue, Stieltjes, the rigorous
  foundations of the calculus and measure theory
- `algebra/` — Galois, Cayley, Noether, the structural primaries of
  groups, rings, and fields
- `geometry/` — Euclid, Hilbert, the axiomatic foundations of geometry
- `topology/` — Poincaré, Hausdorff, the foundations of point-set and
  combinatorial topology
- `differential-geometry/` — Riemann 1854/1868, Ricci and Levi-Civita
  1900, the tensor-calculus foundations
- `probability/` — Kolmogorov 1933 and the measure-theoretic axiomatization
- `functional-analysis/` — Banach 1932, the Hilbert-space and
  operator-theory primaries (von Neumann 1932 cross-referenced from
  physics)
- `category-theory/` — Eilenberg and Mac Lane 1945, the structural
  language of modern mathematics
- `reference/` — Bourbaki *Éléments de mathématique* if accepted; OEIS,
  arXiv, MathSciNet, zbMATH as pointer files

## Status

Branch opened 2026-05-01 by the mathematics pass-1 sweep at
`_intake/mathematics-canon-pass-1-2026-05-01.md`. No files yet promoted.
`CANON_INDEX.md` is seeded as the master manifest pointing at sub-folders.
`_intake/` is the holding area for sweep memos and pre-promotion
artifacts. Pass-2 will deep-dive each candidate; pass-3 will freeze the
sub-folder tree.
