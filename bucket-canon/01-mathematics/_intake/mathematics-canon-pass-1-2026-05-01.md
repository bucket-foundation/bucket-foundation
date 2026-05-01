# Mathematics Canon Pass-1 Sweep — 2026-05-01

Intake document. Not promoted. Opens `bucket-canon/01-mathematics/` as a full canon branch under the same promotion rule used to seed `03-chemistry/` and `09-art/`. The branch did not exist before this sweep; `01-mathematics/README.md` and a seeded `CANON_INDEX.md` were created alongside this file.

Author: data pillar (research sweep).
Method: breadth-first inventory of primary theoretical texts, edition-of-record selection, sub-domain map, and explicit boundary calls vs `02-physics/`, `03-chemistry/`, `04-information/`, `07-mind/`. No deep dive on individual entries — that is pass-2 work. No frozen tree — that is pass-3 work.

Mathematics is the most foundational of the seven canon branches. Every other branch's cross-links currently dangle into it. Opening the branch removes a structural deficit in the canon spine.

---

## 1. Inventory of canon candidates

Each entry: author, title, year, edition-of-record, one-paragraph justification, proposed sub-folder, strength.

### 1.1 Foundations of geometry

**Euclid — *Elements*, c. 300 BCE.**
Edition of record (English): Sir Thomas L. Heath (tr. and ed.), *The Thirteen Books of Euclid's Elements*, 2nd edition, Cambridge University Press, 1925, three volumes; Dover reprint 1956 (ISBN 0-486-60088-2 / 0-486-60089-0 / 0-486-60090-4). Heath's introduction and historical apparatus are themselves canon-grade scholarship and the definitive English-language access point. The *Elements* is the originator-tier statement of axiomatic method: definitions, postulates, common notions, propositions with proofs. Every subsequent axiomatic system in mathematics is in dialogue with it. **Strong.** `geometry/`.

**David Hilbert — *Grundlagen der Geometrie*, B. G. Teubner, Leipzig, 1899.**
Edition of record: 10th German edition with supplements by Paul Bernays, Teubner, 1968; English translation E. J. Townsend, *The Foundations of Geometry*, Open Court, La Salle, 1902 (PD); modern English translation Leo Unger, Open Court, 1971 (ISBN 0-87548-164-7), based on the 10th German edition. The first complete and consistent axiomatic system for Euclidean geometry, independent of intuitive appeals to figures. The text where the modern axiomatic method is first executed at full discipline. **Strong.** `geometry/`.

### 1.2 Number theory

**Carl Friedrich Gauss — *Disquisitiones Arithmeticae*, Gerh. Fleischer, Leipzig, 1801.**
Edition of record: Arthur A. Clarke (tr.), revised W. C. Waterhouse, *Disquisitiones Arithmeticae*, Springer, New York, 1986 (ISBN 0-387-96254-9). The founding text of modern number theory: congruences, quadratic reciprocity (with the first complete proof, plus a second), the theory of binary quadratic forms, and cyclotomy. Originator-tier. **Strong.** `number-theory/`.

**Bernhard Riemann — "Ueber die Anzahl der Primzahlen unter einer gegebenen Grösse", *Monatsberichte der Königlich Preußischen Akademie der Wissenschaften zu Berlin*, November 1859, pp. 671–680.**
Edition of record: Heinrich Weber (ed.), *Bernhard Riemann's Gesammelte Mathematische Werke und Wissenschaftlicher Nachlass*, Teubner, Leipzig, 1876 (2nd ed. 1892; Dover reprint 1953). The eight-page paper that introduces the zeta function on the complex plane, the functional equation, the explicit formula for π(x), and the Riemann hypothesis. Founding text of analytic number theory. **Strong.** `number-theory/`.

**Richard Dedekind — *Stetigkeit und irrationale Zahlen*, F. Vieweg, Braunschweig, 1872.**
Edition of record: Wooster Woodruff Beman (tr.), *Essays on the Theory of Numbers*, Open Court, Chicago, 1901 (PD); Dover reprint 1963 (ISBN 0-486-21010-3), bound with *Was sind und was sollen die Zahlen?* (1888). The Dedekind-cut construction of the real numbers — the first rigorous foundation for the continuum from the rationals. Companion text *Was sind und was sollen die Zahlen?* (1888) gives the chain-theoretic foundation of the natural numbers. **Strong.** `number-theory/` (with cross-link to `foundations/`).

**Peter Gustav Lejeune Dirichlet — *Vorlesungen über Zahlentheorie*, ed. Richard Dedekind, F. Vieweg, Braunschweig, 1863; 4th ed. 1894.**
Edition of record: 4th edition, Vieweg, 1894. Dedekind's supplements (especially Supplement X on ideal theory in the 1871 edition, expanded in later editions) introduce the modern algebraic-number-theory framework. The book is itself a Dedekind-Dirichlet co-authored object after the first edition. **Strong-borderline** — primarily for the Dedekind supplements; if the supplements are excerpted to `algebra/` the *Vorlesungen* itself drops to landscape. Defer to pass-2.

### 1.3 Analysis

**Isaac Newton — *Philosophiæ Naturalis Principia Mathematica*, Joseph Streater for the Royal Society, London, 1687.**
Edition of record: I. Bernard Cohen and Anne Whitman (tr.), *The Principia: Mathematical Principles of Natural Philosophy*, University of California Press, 1999 (ISBN 978-0-520-08816-0), based on the 3rd edition (1726). The mathematical apparatus (geometric calculus, the method of first and ultimate ratios, lemmas on limits) is canon for `01-mathematics/`; the laws of motion and universal gravitation are canon for `02-physics/`. Edition-of-record sits in `02-physics/`; mathematics holds a reference pointer with the calculus side excerpted. **Strong** as a cross-listed entry. `analysis/` cross-ref.

**Augustin-Louis Cauchy — *Cours d'analyse de l'École royale polytechnique*, Première partie: Analyse algébrique, Debure, Paris, 1821.**
Edition of record: Robert E. Bradley and C. Edward Sandifer (tr.), *Cauchy's Cours d'analyse: An Annotated Translation*, Springer, 2009 (ISBN 978-1-4419-1761-2). The first systematic attempt to put the calculus on a rigorous limit-based foundation; the ε-style precursor (Cauchy's "infinitely small" formulated as a variable tending to zero), continuity defined in terms of limits, the Cauchy criterion for convergence of series. **Strong.** `analysis/`.

**Karl Weierstrass — *Mathematische Werke*, Mayer & Müller, Berlin, 1894–1927, 7 volumes.**
Edition of record: the *Mathematische Werke* (PD, scanned at Göttingen). Weierstrass published almost nothing in his lifetime; his rigorous foundation of analysis (the modern ε-δ definition of limit and continuity, the Weierstrass approximation theorem, the construction of the reals via Cauchy sequences in his Berlin lectures, the Bolzano-Weierstrass theorem) is preserved in lecture notes by Hermann Amandus Schwarz, Adolf Hurwitz, and others, collected in the *Werke*. Borderline as a primary object — there is no single load-bearing book — but the work is foundational at the originator level. **Strong as a paper/lecture series, not a single text.** `analysis/`. Edition-of-record question to revisit in pass-2.

**Thomas Joannes Stieltjes — "Recherches sur les fractions continues", *Annales de la Faculté des Sciences de Toulouse* 8 (1894), J1–J122; 9 (1895), A1–A47.**
Edition of record: G. van Dijk (ed.), *Œuvres complètes / Collected Papers*, Springer, 1993 (ISBN 3-540-55767-2), two volumes. Introduces the Stieltjes integral and the Stieltjes moment problem — primary statements that prefigure measure theory and functional analysis. **Strong.** `analysis/`.

**Henri Lebesgue — "Intégrale, longueur, aire", *Annali di Matematica Pura ed Applicata* (3) 7 (1902), 231–359; doctoral thesis, Université de Paris.**
Edition of record: facsimile of the *Annali* paper (PD); the *Œuvres scientifiques* of Lebesgue, edited by the Société mathématique suisse and L'Enseignement Mathématique, Geneva, 1972, five volumes, is the collected-works edition. The thesis is the founding statement of the Lebesgue measure and integral and the modern theory of integration. **Strong.** `analysis/`.

**Constantin Carathéodory — "Über das lineare Mass von Punktmengen — eine Verallgemeinerung des Längenbegriffs", *Nachrichten von der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Mathematisch-Physikalische Klasse*, 1914, 404–426; *Vorlesungen über reelle Funktionen*, Teubner, Leipzig, 1918.**
Edition of record: 2nd edition of *Vorlesungen über reelle Funktionen*, Teubner, 1927 (Chelsea reprint 1948). Axiomatic measure theory: outer measure, the Carathéodory criterion for measurability, the abstract foundation that supersedes the Lebesgue construction by formulating the same content axiomatically. **Strong.** `analysis/`.

### 1.4 Algebra

**Évariste Galois — collected mathematical writings, especially "Mémoire sur les conditions de résolubilité des équations par radicaux" (manuscript 1831).**
Edition of record: Joseph Liouville (ed.), "Œuvres mathématiques d'Évariste Galois", *Journal de mathématiques pures et appliquées* (1) 11 (1846), 381–444 (PD); definitive scholarly edition Robert Bourgne and Jean-Pierre Azra (eds.), *Écrits et mémoires mathématiques d'Évariste Galois*, Gauthier-Villars, Paris, 1962 (2nd ed. Bordas 1976). The originator statement of group theory in the service of solvability of polynomial equations — the Galois correspondence between field extensions and groups. **Strong.** `algebra/`.

**Arthur Cayley — "On the Theory of Groups, as Depending on the Symbolic Equation θⁿ = 1", *Philosophical Magazine* (4) 7 (1854), 40–47, with continuations 7 (1854), 408–409 and 18 (1859), 34–37.**
Edition of record: *The Collected Mathematical Papers of Arthur Cayley*, Cambridge University Press, 13 volumes plus index, 1889–1898 (PD). The first explicit definition of an abstract group (closure under an associative operation with identity and inverses), independent of any concrete realization. **Strong.** `algebra/`.

**Emmy Noether — "Idealtheorie in Ringbereichen", *Mathematische Annalen* 83 (1921), 24–66.**
Edition of record: facsimile in the *Annalen* (PD); Nathan Jacobson (ed.), *Emmy Noether: Gesammelte Abhandlungen / Collected Papers*, Springer, 1983 (ISBN 3-540-11504-8). The founding paper of modern (commutative) ring theory: the ascending-chain condition, the Lasker-Noether decomposition theorem, and the structural turn that made "abstract algebra" a discipline. Sister paper "Abstrakter Aufbau der Idealtheorie in algebraischen Zahl- und Funktionenkörpern", *Math. Ann.* 96 (1927), 26–61, completes the program for Dedekind rings. **Strong.** `algebra/`.

### 1.5 Set theory and foundations

**Georg Cantor — "Ueber eine Eigenschaft des Inbegriffs aller reellen algebraischen Zahlen", *Journal für die reine und angewandte Mathematik* 77 (1874), 258–262; "Ueber eine elementare Frage der Mannigfaltigkeitslehre", *Jahresbericht der Deutschen Mathematiker-Vereinigung* 1 (1891), 75–78.**
Edition of record: Ernst Zermelo (ed.), *Gesammelte Abhandlungen mathematischen und philosophischen Inhalts*, Springer, Berlin, 1932 (Hildesheim reprint 1962, ISBN 3-487-04332-8). The 1874 paper proves the algebraic numbers are countable and the reals are not (the first cardinality argument); the 1891 paper introduces the diagonal method. Originator of set theory. **Strong.** `foundations/`.

**Gottlob Frege — *Begriffsschrift, eine der arithmetischen nachgebildete Formelsprache des reinen Denkens*, Louis Nebert, Halle, 1879; *Die Grundlagen der Arithmetik*, Wilhelm Koebner, Breslau, 1884.**
Edition of record: J. L. Austin (tr.), *The Foundations of Arithmetic*, Blackwell, Oxford, 1950 (2nd ed. 1953); Stefan Bauer-Mengelberg (tr.) of *Begriffsschrift* in Jean van Heijenoort (ed.), *From Frege to Gödel: A Source Book in Mathematical Logic, 1879–1931*, Harvard University Press, 1967 (ISBN 0-674-32449-8). *Begriffsschrift* is the founding text of modern formal logic (quantification, the predicate calculus, formal proof). *Grundlagen* is the founding statement of logicism — the program to derive arithmetic from logic alone. **Strong.** `foundations/`.

**Bertrand Russell and Alfred North Whitehead — *Principia Mathematica*, Cambridge University Press, three volumes 1910, 1912, 1913.**
Edition of record: 2nd edition, Cambridge University Press, 1925–1927 (PD in many jurisdictions; full scans at archive.org). The execution of the logicist program after Russell's paradox; the type-theoretic restriction; the formal derivation of arithmetic from logic + axioms of infinity, choice, and reducibility. Borderline-canon: pivotal historical object, but the program failed (Gödel 1931 closed it off) and the modern foundations community works in ZF/ZFC, not Principia. Pass-2 question. **Borderline-strong.** `foundations/`.

**Ernst Zermelo — "Untersuchungen über die Grundlagen der Mengenlehre. I", *Mathematische Annalen* 65 (1908), 261–281.**
Edition of record: facsimile in the *Annalen* (PD); English translation in van Heijenoort 1967. The first axiomatization of set theory. Companion paper "Beweis, dass jede Menge wohlgeordnet werden kann", *Math. Ann.* 59 (1904), 514–516, isolates the axiom of choice. **Strong.** `foundations/`.

**Adolf Fraenkel, Thoralf Skolem, Abraham Halevi Fraenkel — Zermelo-Fraenkel set theory (ZF; ZFC with choice).**
Edition of record: there is no single primary text. Fraenkel 1922 ("Zu den Grundlagen der Cantor-Zermeloschen Mengenlehre", *Math. Ann.* 86, 230–237) and Skolem 1923 ("Einige Bemerkungen zur axiomatischen Begründung der Mengenlehre") are the foundational corrections. The standard modern presentation is Thomas J. Jech, *Set Theory*, 3rd Millennium edition, Springer, 2003 (ISBN 3-540-44085-2), or Kenneth Kunen, *Set Theory*, College Publications, 2011 (ISBN 978-1-84890-050-9). Discipline-standard reference; cite Jech as edition-of-record under condition 3 of the promotion rule. **Strong via Jech.** `foundations/`.

**Kurt Gödel — "Über formal unentscheidbare Sätze der Principia Mathematica und verwandter Systeme I", *Monatshefte für Mathematik und Physik* 38 (1931), 173–198.**
Edition of record: Solomon Feferman et al. (eds.), *Kurt Gödel: Collected Works, Volume I — Publications 1929–1936*, Oxford University Press, 1986 (ISBN 0-19-503964-5), with the original German and a facing English translation by Jean van Heijenoort. The incompleteness theorems — the closure of the Hilbert-Frege-Russell program. **Strong.** `foundations/`.

### 1.6 Logic and computation cross-link

**Alan M. Turing — "On Computable Numbers, with an Application to the Entscheidungsproblem", *Proceedings of the London Mathematical Society* (2) 42 (1937), 230–265, with corrections in 43 (1937), 544–546.**
Primary in `04-information/`. Cross-referenced here under `foundations/computation-cross-link/` because the decision problem is a problem of mathematical logic. **Strong (cross-listed).**

**Alonzo Church — "An Unsolvable Problem of Elementary Number Theory", *American Journal of Mathematics* 58 (1936), 345–363.**
Primary in `04-information/`. Cross-link here. **Strong (cross-listed).**

### 1.7 Topology

**Henri Poincaré — "Analysis Situs", *Journal de l'École polytechnique* (2) 1 (1895), 1–123, with five compléments published 1899–1904 in *Rendiconti del Circolo Matematico di Palermo*, *Proc. London Math. Soc.*, and *Journal de mathématiques pures et appliquées*.**
Edition of record: John Stillwell (tr.), *Papers on Topology: Analysis Situs and Its Five Supplements*, AMS / LMS, History of Mathematics 37, 2010 (ISBN 978-0-8218-5234-7). The founding paper of algebraic topology: simplicial homology, the fundamental group, the Poincaré conjecture (in the 5th complément). **Strong.** `topology/`.

**Felix Hausdorff — *Grundzüge der Mengenlehre*, Veit, Leipzig, 1914.**
Edition of record: 1914 first edition (PD; AMS Chelsea reprint, 1949, of the 2nd edition under the title *Mengenlehre*). The founding text of point-set topology: the Hausdorff axioms for a topological space, neighborhood systems, the modern definition of a topological space as we now teach it. **Strong.** `topology/`.

### 1.8 Differential geometry

**Bernhard Riemann — "Ueber die Hypothesen, welche der Geometrie zu Grunde liegen", *Habilitationsvortrag* delivered 10 June 1854, Göttingen; published posthumously, *Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen* 13 (1868), 133–150.**
Edition of record: in the Riemann *Werke* (Weber ed. 1876/1892); English translation William Kingdon Clifford, "On the Hypotheses which lie at the Bases of Geometry", *Nature* 8 (1873), 14–17, 36–37. The founding statement of Riemannian geometry: the manifold concept, the metric tensor, sectional curvature. The mathematical substrate that Einstein and Levi-Civita would later equip with the tensor calculus. **Strong.** `differential-geometry/`.

**Gregorio Ricci-Curbastro and Tullio Levi-Civita — "Méthodes de calcul différentiel absolu et leurs applications", *Mathematische Annalen* 54 (1900), 125–201.**
Edition of record: facsimile in the *Annalen* (PD). The systematic introduction of the absolute differential calculus (the tensor calculus), the formal language Einstein used in 1915–16. **Strong.** `differential-geometry/`.

**Élie Cartan — *Leçons sur la géométrie des espaces de Riemann*, Gauthier-Villars, Paris, 1928 (2nd revised edition 1946).**
Modern formulation of Riemannian geometry through moving frames and exterior differential systems. **Strong.** `differential-geometry/`.

### 1.9 Probability

**Andrey Nikolaevich Kolmogorov — *Grundbegriffe der Wahrscheinlichkeitsrechnung*, Springer, *Ergebnisse der Mathematik und ihrer Grenzgebiete* 2.3, Berlin, 1933.**
Edition of record: Nathan Morrison (tr.), *Foundations of the Theory of Probability*, Chelsea, New York, 1950; 2nd English edition 1956 (still in print, AMS Chelsea ISBN 0-8284-0023-7). The axiomatic, measure-theoretic foundation of probability. The text that ended a century of disagreement about what probability is by giving it an unambiguous mathematical content. **Strong.** `probability/`.

### 1.10 Functional analysis

**Stefan Banach — *Théorie des opérations linéaires*, *Monografie Matematyczne* 1, Warszawa, 1932.**
Edition of record: Czesław Bessaga and Aleksander Pełczyński (eds.), English translation, *Theory of Linear Operations*, North-Holland Mathematical Library 38, Elsevier, Amsterdam, 1987 (ISBN 0-444-70184-2). The founding monograph of functional analysis: Banach spaces, the Hahn-Banach theorem, the open-mapping theorem, the closed-graph theorem, the uniform-boundedness principle. **Strong.** `functional-analysis/`.

**John von Neumann — *Mathematische Grundlagen der Quantenmechanik*, Springer, Berlin, 1932.**
Edition of record: Robert T. Beyer (tr.), *Mathematical Foundations of Quantum Mechanics*, Princeton University Press, 1955 (new edition, ed. Nicholas A. Wheeler, Princeton University Press, 2018, ISBN 978-0-691-17856-1). The Hilbert-space formulation of quantum mechanics; the spectral theorem for unbounded self-adjoint operators; the introduction of the density matrix. **Strong as a cross-listed entry.** Default placement: `02-physics/quantum-mechanics/`. Cross-ref into `functional-analysis/` because the operator-theory machinery developed for QM is canon for FA. Pass-2 may overturn the default placement.

### 1.11 Category theory

**Samuel Eilenberg and Saunders Mac Lane — "General Theory of Natural Equivalences", *Transactions of the American Mathematical Society* 58 (1945), 231–294.**
Edition of record: facsimile in *Trans. AMS* (open access via AMS). The founding paper of category theory: categories, functors, natural transformations introduced as the formal apparatus required to make "natural" precise in algebraic topology. The companion text Saunders Mac Lane, *Categories for the Working Mathematician*, Springer GTM 5, 1971 (2nd edition 1998, ISBN 0-387-98403-8) is the discipline-standard reference. **Strong** for both. `category-theory/`.

### 1.12 Reference (normative)

**Nicolas Bourbaki — *Éléments de mathématique*, Hermann (later Masson, then Springer), Paris, 1939–. Multiple volumes across Set Theory, Algebra, General Topology, Functions of a Real Variable, Topological Vector Spaces, Integration, Lie Groups and Lie Algebras, Commutative Algebra, Spectral Theory, Differential and Analytic Manifolds.**
Argued for inclusion as discipline-standard normative reference, parallel to the IUPAC Gold Book in chemistry. Bourbaki fixed mid-twentieth-century mathematical vocabulary and notation across Europe and North America: ⌀ for the empty set, the structuralist taxonomy of mathematical objects, the modern French-school treatment of integration and topological vector spaces. The contestable claim is whether Bourbaki is normative reference (condition 3 of the promotion rule) or landscape monograph series (extensive but not authoritative). The case for canon inclusion: no other text or author re-fixed the basic mathematical vocabulary at comparable scope; the only parallel object across the canon is the IUPAC Gold Book, which we are promoting as canon under condition 3. **Strong if promoted under condition 3.** Pass-2 should adjudicate. `reference/`.

---

## 2. Sub-domain map and proposed folder tree

```
01-mathematics/
  README.md
  CANON_INDEX.md
  _intake/                         (sweep memos and pre-promotion artifacts)
  foundations/                     Frege, Cantor, Zermelo, Russell-Whitehead, ZF/ZFC, Gödel
  number-theory/                   Gauss, Riemann zeta paper, Dedekind, Dirichlet-Dedekind
  analysis/                        Cauchy, Weierstrass, Lebesgue, Stieltjes, Carathéodory
  algebra/                         Galois, Cayley, Noether
  geometry/                        Euclid, Hilbert
  topology/                        Poincaré, Hausdorff, Alexandroff-Hopf
  differential-geometry/           Riemann 1854/1868, Ricci-Levi-Civita 1900, Cartan 1928
  probability/                     Kolmogorov 1933
  functional-analysis/             Banach 1932; von Neumann 1932 cross-listed from physics
  category-theory/                 Eilenberg-Mac Lane 1945; Mac Lane CWM
  reference/                       Bourbaki (if promoted); pointer files for OEIS, arXiv, MathSciNet, zbMATH
  _landscape/                      Spivak, Rudin, Munkres, Dummit-Foote, Hatcher (registry, no folder explosion)
```

Cross-link map (one-line statements; full version goes in `CROSS_LINKS.md` after pass-3):

- `01-mathematics/foundations/` ↔ `04-information/` — Turing 1936, Church 1936 are primary in 04; Gödel 1931 is primary here. Kolmogorov is primary in both, by paper.
- `01-mathematics/probability/` ↔ `04-information/` — Shannon 1948 inherits the measure-theoretic apparatus from Kolmogorov 1933.
- `01-mathematics/algebra/` ↔ `03-chemistry/spectroscopy/` — Burnside, Weyl primaries here; Cotton 1990 in chemistry.
- `01-mathematics/differential-geometry/` ↔ `02-physics/general-relativity/` — Riemann 1854/1868, Ricci-Levi-Civita 1900 here; Einstein 1915–16 in physics.
- `01-mathematics/functional-analysis/` ↔ `02-physics/quantum-mechanics/` — Banach 1932 here; von Neumann 1932 cross-listed.
- `01-mathematics/foundations/` ↔ `07-mind/cognitive-science/` — cognitive science of mathematics (Lakoff-Núñez, Dehaene) is canon for 07, not here.

---

## 3. Boundary calls

### Mathematics vs information & computation (the most-worked boundary)

The cleanest rule is: a primary text belongs to mathematics if its explanandum is a structural property of mathematical objects (consistency, decidability of an axiomatic system, cardinality, completeness); it belongs to information if its explanandum is a property of computation, communication, or encoding (decidability of a problem, channel capacity, descriptive complexity).
- Gödel 1931 → `01-mathematics/foundations/`. Explanandum: completeness of arithmetic.
- Turing 1936 → `04-information/`. Explanandum: decidability as a property of effective procedures.
- Church 1936 → `04-information/`. Explanandum: an unsolvable problem as established via lambda-definability, a model of computation.
- Shannon 1948 → `04-information/`. Explanandum: capacity of a channel.
- Kolmogorov 1933 → `01-mathematics/probability/`. Explanandum: axioms for measure-theoretic probability.
- Kolmogorov 1965 (descriptive complexity) → `04-information/`. Explanandum: complexity of strings.

The same author, Kolmogorov, lands on both sides because the two papers explain different things. This is correct.

### Mathematics vs physics

Default rule: a text belongs to mathematics if it can be read without reference to a physical phenomenon. Newton's *Principia* fails this test (the laws of motion are stated as facts about bodies); the *Principia* sits in physics with a cross-link from mathematics. Riemann 1854/1868 passes this test (manifolds and metrics are mathematical objects); it sits in mathematics. Von Neumann 1932 is the contestable case: it is the foundational text of two fields at once. Default placement is physics because the title and stated motivation are physical; cross-listed into functional analysis because the operator-theoretic apparatus it builds is canon for that sub-field.

### Mathematics vs chemistry

Group theory is the formal language of crystallography and spectroscopy. Burnside (1897), Weyl (1928 *Gruppentheorie und Quantenmechanik*) are primary here. Cotton 1990 is primary in `03-chemistry/spectroscopy/`. No duplication.

### Mathematics vs mind

Cognitive science of mathematics (how humans grasp mathematical objects, the development of numerical cognition) is canon for `07-mind/`. Lakoff-Núñez 2000 and Dehaene 2nd ed. 2011 are not candidates here. The mathematics canon is structural and formal.

---

## 4. What pass-1 expects pass-2 to test

The contestable calls, ranked by load-bearing-ness:

1. **Bourbaki *Éléments de mathématique* — canon under condition 3, or landscape monograph series?** This is the single hardest call in the inventory. If yes, it is a multi-volume normative reference parallel to the IUPAC Gold Book; if no, it is an extensive textbook series and lives in `_landscape/`. Pass-2 should adjudicate by polling discipline citation patterns: do mathematicians cite Bourbaki the way chemists cite the Gold Book (as the unambiguous authority for a definition or notation)? My pass-1 lean: yes, but only for set theory, algebra, and general topology, not for the later volumes.

2. **Russell-Whitehead *Principia Mathematica* — canon or historical?** Logicism failed; ZF/ZFC superseded type theory in the foundations community. But the formal-derivation apparatus and the program itself remain pivotal objects in the history of foundations. Pass-1 lean: borderline-strong, promote with a note. Pass-2 should test whether modern foundations work cites Principia or only its successors.

3. **Grothendieck — *Éléments de géométrie algébrique* (EGA, 1960–67) and *Séminaire de géométrie algébrique* (SGA, 1960–69) — canon or working math?** Pass-1 did not include them in the inventory because the question is unsettled. EGA/SGA are foundational for modern algebraic geometry; the texts themselves are unfinished in places and are working documents of an active program. Pass-2 should adjudicate. If yes, an `algebraic-geometry/` sub-folder opens with EGA/SGA as primary and Hartshorne 1977 as discipline-standard reference.

4. **Weierstrass *Mathematische Werke* — primary, or do we promote individual lecture-note volumes (Schwarz, Hurwitz)?** The work was not published as a coherent monograph. Pass-1 marked it strong as a series. Pass-2 should pick the specific volumes.

5. **Von Neumann 1932 default placement — is mathematics correct, not physics?** Pass-1 placed it in physics with a cross-link to functional analysis. Reasonable mathematicians disagree.

6. **Hilbert-Courant *Methoden der mathematischen Physik* I (1924) and II (1937) — primary for functional analysis or landscape?** Pass-1 mentioned it in passing in the index. Pass-2 should decide.

7. **Dirichlet-Dedekind *Vorlesungen über Zahlentheorie* — keep as primary, or excerpt the Dedekind supplements to `algebra/` and drop the rest to landscape?**

8. **Carathéodory 1918 vs Lebesgue 1902 — both, or just one?** They cover the same content. Pass-1 lean: both, because Lebesgue is the originator and Carathéodory is the axiomatic restatement. Pass-2 should confirm or collapse.

9. **The probability landscape after Kolmogorov 1933 — does the canon stop with the axiomatization, or does it extend to the structural primaries (martingales — Doob 1953, stochastic integration — Itô 1944)?** Pass-1 stops at Kolmogorov; pass-2 should evaluate Doob and Itô.

10. **Open question: is there a canon-tier text for combinatorics?** Erdős wrote almost no books. Lovász's *Combinatorial Problems and Exercises* (1979) is a problem set, not a foundation. There may be no primary text and the field may simply not have a canon entry under our promotion rule. Pass-2 should confirm or find one.

---

## Sources used in this sweep

- [Cambridge University Press — Heath, *The Thirteen Books of Euclid's Elements*, 2nd ed. 1925](https://archive.org/details/thirteenbookseu03heibgoog)
- [Open Court — Hilbert, *Foundations of Geometry*, Townsend tr. 1902](https://archive.org/details/thefoundationsof17384gut)
- [Springer — Clarke / Waterhouse tr. of Gauss, *Disquisitiones Arithmeticae*](https://link.springer.com/book/9780387962542)
- [Riemann *Gesammelte Werke* (Weber ed.) — scanned at archive.org](https://archive.org/details/bernardriemannsg00riem)
- [Open Court / Dover — Beman tr. of Dedekind, *Essays on the Theory of Numbers*](https://archive.org/details/essaysintheoryof00dedeuoft)
- [Springer — Bradley & Sandifer, *Cauchy's Cours d'analyse: An Annotated Translation*](https://link.springer.com/book/10.1007/978-1-4419-0549-9)
- [Université de Paris — Lebesgue 1902 thesis (in *Annali di Matematica*)](https://link.springer.com/article/10.1007/BF02420592)
- [van Heijenoort (ed.), *From Frege to Gödel*, Harvard University Press 1967](https://www.hup.harvard.edu/catalog.php?isbn=9780674324497)
- [Oxford University Press — Feferman et al., *Kurt Gödel: Collected Works, Volume I*](https://global.oup.com/academic/product/kurt-godel-collected-works-9780195039641)
- [AMS — Stillwell, *Papers on Topology: Analysis Situs and Its Five Supplements*](https://bookstore.ams.org/hmath-37)
- [AMS Chelsea — Hausdorff, *Mengenlehre* (2nd ed. of *Grundzüge der Mengenlehre*)](https://bookstore.ams.org/chel-119)
- [AMS Chelsea — Kolmogorov, *Foundations of the Theory of Probability*](https://bookstore.ams.org/chel-23-h)
- [Elsevier — Bessaga & Pełczyński, *Theory of Linear Operations* (Banach tr.)](https://www.sciencedirect.com/bookseries/north-holland-mathematical-library/vol/38)
- [Princeton University Press — von Neumann, *Mathematical Foundations of Quantum Mechanics*, new ed. 2018](https://press.princeton.edu/books/hardcover/9780691178561)
- [Springer GTM 5 — Mac Lane, *Categories for the Working Mathematician*, 2nd ed. 1998](https://link.springer.com/book/10.1007/978-1-4757-4721-8)
- [AMS — Eilenberg & Mac Lane 1945, *Trans. AMS* 58, 231–294 (open access)](https://www.ams.org/journals/tran/1945-058-00/S0002-9947-1945-0013131-6/)
- [Springer — Jech, *Set Theory, 3rd Millennium Edition*](https://link.springer.com/book/10.1007/3-540-44761-X)
- [Springer / Hermann — Bourbaki, *Éléments de mathématique* (publisher catalog)](https://link.springer.com/series/7340)
