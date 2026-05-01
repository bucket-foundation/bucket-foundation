# 04-information — Pass-2 Sweep Memo

Date: 2026-05-01
Sweep: closes the verification gates left by pass-1, runs sub-domain
deep dives at chemistry-pass-2 depth, verifies the Shannon ↔ Gibbs
binding from chemistry pass-3 §5.4, produces the cross-branch coherence
map, and proposes the frozen tree to be ratified in pass-3.

Author: data pillar.
Method: re-read of `04-information/README.md`, the pass-1 sweep memo,
mathematics pass-1 (foundations boundary), chemistry pass-3 §5.4
(Shannon ↔ Gibbs binding), gov-declassified pass-2 §4 (Friedman
material), with targeted citation verification on every contestable
entry. No promotions yet — pass-2 is still adjudication; pass-3 freezes
the tree and seeds `CANON_INDEX.md`.

Pass-1 left seven contestable calls. Pass-2 closes all seven. The most
load-bearing of them — the Friedman pedagogical-primary verification
gate — gets §1, with the explicit (a)/(b)/(c) sub-decisions the pass-1
memo demanded. Church 1936 cross-branch consensus gets §2. The eleven
sub-domain deep dives are §3. The Shannon ↔ Gibbs verification is §4.
The cross-branch coherence map is §5. The recommended frozen tree is §6.

---

## 1. Friedman pedagogical-primary verification gate — close

Pass-1 §4(1) made the Friedman tier provisional and named three
conditions for pass-2: (a) verify FOIA case 60494 against the NSA
release index; (b) test the rule against Knuth *TAOCP* — does the rule
admit Knuth?; (c) produce a one-paragraph definition of
"pedagogical-primary" tier and what it excludes. The pass-1 memo also
said: if (c) cannot be cleanly produced, collapse the sub-fold.

This pass calls each one explicitly.

### 1.1 (a) FOIA case 60494 — verification result

The number cannot be verified at the document level and was already
flagged unconfirmed by gov-declassified pass-2 §4.1. Pass-2 of this
branch repeated the verification attempt: NSA's
`Friedman-Documents/` portal returned 403 to direct fetch; the
*Transforming Classification* blog post (NARA, 30 April 2015) and the
NSA Cryptologic Heritage portal both confirm a single April 2015
release of approximately 50,000+ pages of Friedman's official papers,
but neither names a FOIA case number on the public-facing pages.
Internet Archive's `nsa-friedman` collection mirrors the release with
the same ~52,000-page figure but also does not carry a FOIA case
number on its landing page.

Verdict: the *release itself* is solid (NARA blog, NSA Cryptologic
Heritage portal, Internet Archive mirror, ~50,000 pp, April 2015,
~7,000 records, organized into Correspondence / Reports & Research /
Publications / Patent & Equipment / Personnel / Panel-Committee-Board
sub-collections). The *FOIA case number 60494* is not, on public
sources reachable in this sweep, an NSA-endorsed identifier; it
likely originated as a researcher's intake tracking number and was
restated in gov-declassified pass-1 from a secondary source.

Operational consequence: the citation form
`nsa.friedman.mc.<vol>` proposed in pass-1 stands on the basis of the
release itself, not a FOIA tracking number. The provisional citation
field for FOIA case is **dropped**, and the canonical pointer is the
NSA Cryptologic Heritage portal URL plus the Internet Archive mirror.
If a future maintainer recovers the actual case number from a
direct NSA FOIA reading-room search, it can be added back as a
metadata field; nothing in the canon entry depends on it.

This closes (a) as **verified-by-substitution**: the underlying
declassification event is verified, the specific case-number string
is not, the canon entry does not depend on the case-number string.

### 1.2 (b) Knuth *TAOCP* test — does the rule admit Knuth?

The pass-1 worry: if "pedagogical-primary tier by the field-founding
practitioner" admits Friedman, does the same wording admit Knuth's
*The Art of Computer Programming*? Knuth is the closest other
candidate in the inventory. If Knuth qualifies, the floodgates open
(Cormen-Leiserson-Rivest-Stein, Sipser, Cover-Thomas, Goldreich's
foundations of cryptography, Hennessy-Patterson on architecture,
Aho-Sethi-Ullman dragon book), and the canon erodes into a textbook
shelf. If Knuth does not qualify, what cleanly distinguishes him from
Friedman?

The distinguishing test pass-2 adopts has three parts, all of which
Friedman satisfies and none of which Knuth satisfies:

**Part 1 — Field-creation primacy.** The author must be the
practitioner who built the field as a practical discipline from
scratch, not merely the most influential systematizer of an existing
field. Friedman built American cryptanalysis: he set up Riverbank
Laboratories' cryptologic operation in 1917, he ran the Signal
Intelligence Service from its 1930 founding, he trained Frank
Rowlett, Solomon Kullback, Abraham Sinkov, and the team that broke
PURPLE, and he wrote the SIS training material that taught the people
who taught everyone else. Knuth, by contrast, came into a field
already populated by von Neumann, Turing, Church, Post, Hopper,
Backus, Dijkstra, Hoare, McCarthy, Floyd; he is the systematizer of
the algorithm-analysis sub-discipline (and the originator of the
formal asymptotic-analysis machinery), not the founder of computing
as a practice.

**Part 2 — No foundational alternative on the same material.**
Friedman's *Military Cryptanalysis* I–IV is the only systematic
primary text on classical cryptanalysis from the practitioner-founder
of the American discipline. Shannon 1949 is the *mathematical*
foundation of secrecy and is in the foundations sub-fold; it does not
teach classical cryptanalysis. There is no third candidate. Knuth,
by contrast, sits in a field with multiple competing systematizers
(Aho-Hopcroft-Ullman 1974 for design and analysis; Cormen et al. for
the standard pedagogy; Sedgewick for the practical-algorithms strand;
Sipser for theory). The "primary text on the field" slot Knuth would
occupy is structurally contested by other texts; Friedman's slot is
not.

**Part 3 — The text is the field's only access route to its
practitioner-built knowledge.** Until April 2015 the *Military
Cryptanalysis* volumes were classified; declassification *was* the
release of the discipline's pedagogical-primary corpus into the
public record. There is no other route. Knuth's content was never
classified; the algorithm-analysis tradition has been openly
published continuously since the 1960s and Knuth is one of many
contributors to that open record.

Knuth fails all three. Knuth therefore does not qualify under the
pedagogical-primary tier, and the rule does not erode.

Status: Knuth → `_landscape/`, not canon. *TAOCP* is the discipline's
most influential reference monograph but it is not pedagogical-primary
under the three-part test. Cite freely.

This closes (b): the rule **distinguishes** Friedman from Knuth on
three independent dimensions; the floodgates do not open.

### 1.3 (c) One-paragraph definition of "pedagogical-primary" tier

Required for the sub-fold to survive. Pass-1 said: if (c) cannot be
cleanly produced, collapse the sub-fold. Producing it now.

> **Pedagogical-primary** is a sub-tier of c3 (discipline-standard
> normative reference) reserved for systematic primary teaching texts
> by the practitioner who built the discipline as a practice from
> scratch, where (i) the text is the field's only systematic primary
> exposition by the field-founder, (ii) no alternative foundational
> exposition on the same material exists at the same tier, (iii) the
> text constitutes the discipline's principal access route to its
> own practitioner-built corpus (often by virtue of having been
> classified or otherwise occluded for decades and then released as a
> single corpus). Pedagogical-primary excludes: discipline-standard
> reference monographs by leading systematizers of an existing field
> (Knuth *TAOCP*, Cormen et al. *CLRS*, Cover and Thomas, Sipser,
> Goldreich); textbooks below the discipline-standard tier;
> popularizations; retrospective monographs by non-originators; and
> any text whose subject area is already covered by an originator-tier
> c1 text in the same sub-fold (Shannon 1949 covers the
> mathematical-foundations side of cryptography, so any candidate
> "pedagogical-primary mathematical-secrecy text" is excluded — the
> tier is reserved for material orthogonal to a c1, not redundant
> with one).

The definition holds. The exclusion clauses are operational, not
hortatory: each one names the specific class of text it excludes and
the structural reason for the exclusion.

This closes (c) as **definition produced and operational**.

### 1.4 Sub-fold disposition

All three conditions close. The `cryptography/pedagogical-primary/`
sub-fold survives into pass-3 with:

- `friedman-mc-i/` — *Military Cryptanalysis* I (Monoalphabetic
  Substitution Systems Using Standard Cipher Alphabets), SIS 1938.
- `friedman-mc-ii/` — *Military Cryptanalysis* II (Simpler Varieties
  of Polyalphabetic Substitution Systems), SIS 1938.
- `friedman-mc-iii/` — *Military Cryptanalysis* III (Simpler Varieties
  of Aperiodic Substitution Systems), SIS 1939, ~123 pp per the
  Internet Archive item.
- `friedman-mc-iv/` — *Military Cryptanalysis* IV (Transposition and
  Fractionating Systems), SIS 1941, ~156 pp per the Internet Archive
  item.
- `friedman-callimahos-mca/` — *Military Cryptanalytics* I–III, NSA
  1956–1977, with a stub note: this is the *expanded successor*, not
  an independent work; cite for material not present in the
  1938–1941 originals; do not double-count for content overlap with
  the *Military Cryptanalysis* series.

Edition-of-record across the bundle: the April 2015 NSA release scans,
canonical pointer to the NSA Cryptologic Heritage portal entry plus
the Internet Archive mirror at `archive.org/details/nsa-friedman`.
Citation key form `nsa.friedman.mc.<vol>` (e.g.
`nsa.friedman.mc.iii`).

---

## 2. Church 1936 cross-branch consensus

Math pass-1 §3 placed Church 1936 in `04-information/` "by the
*downstream-use* test" and noted that math pass-1 expected info pass-1
to make the call. Info pass-1 §3.2 took it on the same downstream-use
grounds. The user prompt notes that math pass-2 is now "testing the
inverse" — i.e. a re-litigation of whether Church belongs in
`01-mathematics/foundations/`.

Pass-2 final consensus, with the disagreement-resolution rule.

### 2.1 The two candidate placements

**Candidate A — `04-information/computation/` (current placement,
math-pass-1 + info-pass-1 default).** Argument: the lambda calculus
became, in retrospect, the founding model of a programming-language
tradition (LISP, ML, Haskell), and the Church-Turing thesis is a
thesis *about computation*. The downstream uptake is computational,
not logical. Reading the canon by downstream object, Church 1936 sits
with Turing 1936 and Post 1936 as the three independent originators
of the formal model of computation. They form a unit; separating one
from the other two would be an unforced editorial split.

**Candidate B — `01-mathematics/foundations/`.** Argument: the lambda
calculus is a formal calculus of substitution, conversion, and
reduction in the mathematical-logic tradition; Church's 1936 paper is
explicitly a paper in *elementary number theory*; the result Church
proves is the unsolvability of a problem in formal logic. Reading the
canon by *what the result is about*, Church 1936 is a metamathematics
paper of the same type as Gödel 1931 and belongs adjacent to Gödel.

### 2.2 The resolving rule

The two readings disagree on which of two principles the canon is
sorted by:

- **Object principle (preferred by math).** A primary text belongs to
  the branch whose *explanandum* the text addresses. Gödel 1931
  explains the incompleteness of arithmetic → math. Church 1936
  explains the unsolvability of an elementary number theory problem
  via lambda-definability → math.
- **Use-trajectory principle (preferred by info).** A primary text
  belongs to the branch whose *downstream object class* the text
  founds. Turing 1936 founded computation, Church 1936 founded
  another model of computation, downstream uptake is computational →
  info.

Both principles are internally coherent. Neither is obviously
correct. The canon's choice between them must be the same choice
made for adjacent borderline cases, or the canon becomes ad hoc.

The adjacent precedents:

- **Gödel 1931 → math.** Object principle wins. Both branches agree.
- **Turing 1936 → info.** Use-trajectory principle wins. Both
  branches agree.
- **Kolmogorov 1933 → math; Kolmogorov 1965 → info.** Same author
  split by object: 1933 is measure-theoretic axiomatics of
  probability (math), 1965 is descriptive complexity of strings
  (info). Both branches agree.

The Turing/Gödel split is the load-bearing precedent. Math gives up
Turing to info on use-trajectory grounds even though the
Entscheidungsproblem is, on the object principle, a metamathematics
problem; info gives up Gödel to math on object grounds even though
the incompleteness theorem is, on the use-trajectory principle,
arguably the originating moment of computability theory. Both
branches accept asymmetric concessions in opposite directions for the
same pair of texts. This is the canon's working compromise: each
branch concedes the borderline case where the *other* principle
gives the cleaner answer.

Applying the same compromise to Church 1936:

- The object principle gives Church → math (the result is about a
  formal system in elementary number theory).
- The use-trajectory principle gives Church → info (the lambda
  calculus founded a tradition of computation models).

The asymmetric-concession rule says: pick the placement that mirrors
the Turing/Gödel split's logic. Turing 1936 went to info because the
*model of computation* is the load-bearing object — even though the
result is a metamathematics result, the canon treats Turing as a
computation primary because the model is what propagated. By the
same logic, Church 1936's lambda calculus is *also* a model of
computation, propagated as such, taught as such. Church 1936
therefore belongs with Turing 1936.

**Pass-2 final consensus: Church 1936 → `04-information/computation/`,
with hard cross-link from `01-mathematics/foundations/`.** Math pass-1
already wrote the cross-link entry. Info pass-1's placement stands.
Math pass-2's "test the inverse" exercise is recorded as: tested,
result reaffirms current placement, the asymmetric-concession rule is
the explicit mechanism.

### 2.3 The disagreement-resolution rule (formalized for future cases)

Pass-2 codifies the rule used here for the *next* borderline case
that arises:

> When two branches disagree on the placement of a primary text,
> identify the analogous Turing/Gödel pair already adjudicated in the
> canon. If the candidate text resembles Turing 1936 in the structure
> of its propagation (a model that founded a downstream tradition,
> taught as such), apply the use-trajectory principle and place it
> with Turing. If it resembles Gödel 1931 (a result about a formal
> system whose downstream uptake is in the metalanguage rather than
> in any model), apply the object principle and place with Gödel.
> Both branches cross-link.

This is a one-paragraph rule that future sweeps in either branch can
apply without re-litigating from first principles.

---

## 3. Sub-domain deep dives

Each sub-section: the entries with their mechanism paragraphs at
chemistry-pass-2 depth, the borderline calls resolved, and the
verified citation details.

### 3.1 Computation

**Turing 1936.** "On Computable Numbers, with an Application to the
Entscheidungsproblem," *Proc. London Math. Soc.* (2) 42 (published in
parts 1936–1937), 230–265, with corrections in vol. 43 (1937),
544–546. doi:10.1112/plms/s2-42.1.230. The mechanism: Turing
constructs a hypothetical computing device — a finite-state head
moving over a tape divided into squares, each capable of bearing one
of a finite number of symbols, with a finite table of behaviour
specifying for each (state, symbol) pair the next symbol, the head
move, and the next state. He defines a *computable number* as one
whose decimal expansion is the output of such a machine on a blank
tape. He then constructs a *universal machine* that, given a suitably
encoded description of any other machine, simulates that machine.
The Entscheidungsproblem result follows: the question "does machine
M, on input I, halt?" is undecidable, because a decision procedure
for halting could be self-applied to derive a contradiction. The
1937 correction repairs a flaw in the diagonal argument noticed by
Bernays. Edition-of-record: original *PLMS* + 1937 correction;
Davis ed. *The Undecidable* (Raven Press 1965); Copeland ed. *The
Essential Turing* (Oxford 2004) for the modern annotated reading
text. **Strong c1.**

**Church 1936.** "An Unsolvable Problem of Elementary Number Theory,"
*American Journal of Mathematics* 58(2) (April 1936), 345–363.
doi:10.2307/2371045. The mechanism: Church introduces the lambda
calculus — a formal language with three constructors (variable,
abstraction `λx.M`, application `(M N)`) and one rule of conversion
(β-reduction, `(λx.M)N → M[x:=N]`). He defines a function on the
naturals to be λ-definable iff there exists a closed lambda-term that
computes it under reduction. He then proves: the predicate
"λ-term M reduces to normal form" is not λ-definable, hence not
"effectively calculable" in the informal sense, hence the
Entscheidungsproblem is unsolvable. The Church thesis (every
effectively calculable function is λ-definable) is stated here for
the first time. Placement: `04-information/computation/` per §2
above; cross-link from `01-mathematics/foundations/`. **Strong c1.**

**Post 1936.** "Finite Combinatory Processes — Formulation 1,"
*Journal of Symbolic Logic* 1(3) (September 1936), 103–105.
doi:10.2307/2269031. The mechanism: Post proposes a worker operating
on a two-way infinite sequence of "boxes," each empty or marked, with
a finite list of directions of the form "(i) mark the box, (ii) move
right, (iii) move left, (iv) determine whether the box is marked,
(v) stop." The sketch is independent of and contemporaneous with
Turing 1936; the model is provably equivalent. Promotion: **strong c1**
on independent-codiscovery grounds, the same logic that promotes
Solomonoff alongside Kolmogorov in §3.4.

**Kleene 1952.** *Introduction to Metamathematics*, North-Holland.
Pass-2 verdict: **demote to landscape** for `04-information/`.
Reasoning: Kleene 1952 is a synthesizing textbook of recursion
theory and metamathematics by an originator-tier figure, but the
synthesis is of material whose primary statements are elsewhere
(Church 1936 for lambda calculus, Turing 1936 for computability,
Kleene's own 1936 *American J. Math.* paper for general recursive
functions). The promotion rule's c2 (recognized academic
edition-of-record of a c1 text) requires the edition to be *of* a
specific c1 text; Kleene 1952 is not the edition-of-record of any
single c1 paper, it is a teaching synthesis. The c3 tier requires
discipline-standard normative reference status; Kleene 1952 was that
in the 1950s and 60s but is no longer (Sipser, Soare, Cooper have
displaced it). Outcome: cite freely; do not promote. The s-m-n and
recursion theorems get their canon-tier placement via Kleene's own
1936 paper, which can be added to the inventory in pass-3 if a
maintainer judges it primary in its own right (pass-2 leans yes on
re-reading the *AJM* paper but does not pre-commit pass-3).

**von Neumann 1945.** *First Draft of a Report on the EDVAC*,
Moore School of Electrical Engineering, University of Pennsylvania,
30 June 1945, 101 pp (typescript). The mechanism: the report
introduces the now-canonical stored-program architecture — a single
addressable memory holding both program and data, a central
arithmetic unit, a central control unit, and input/output organs.
The machine is described in terms of idealized neuron-like elements
(McCulloch-Pitts), establishing the conceptual link between the
EDVAC design and the formal-neuron literature von Neumann was
working from. Edition-of-record: Stern 1981 photographic
reproduction in *From ENIAC to UNIVAC: An Appraisal of the Eckert-
Mauchly Computers* (Digital Press); IEEE Annals of the History of
Computing reprint, vol. 15(4) (1993), 27–75, with editorial apparatus
by Michael Godfrey. **Strong c1** for stored-program architecture.

### 3.2 Information theory

**Hartley 1928.** "Transmission of Information," *Bell System
Technical Journal* 7(3) (July 1928), 535–563. The mechanism: Hartley
defines the quantity of information `H = n log s` for a message of
n symbols drawn from an alphabet of s symbols. He gives the first
explicit decoupling of information from psychological factors,
identifying the logarithmic measure as the natural choice for an
additive quantity over independent symbol sequences. Pre-Shannon —
Hartley's measure assumes equiprobable symbols and does not capture
the role of source statistics — but it is the originator-tier
statement of the logarithmic information measure. **Strong c1.**

**Nyquist 1928.** "Certain Topics in Telegraph Transmission Theory,"
*Trans. AIEE* 47 (April 1928), 617–644. The mechanism: Nyquist
derives the maximum rate of pulse transmission over a band-limited
channel as `2W` distinguishable pulses per second through a channel
of bandwidth W (the "Nyquist rate"). The result is the channel-side
half of what would become Shannon's sampling theorem. **Strong c1.**

**Shannon 1948.** "A Mathematical Theory of Communication," *Bell
System Technical Journal* 27 (July 1948), 379–423; (October 1948),
623–656. doi:10.1002/j.1538-7305.1948.tb01338.x and
doi:10.1002/j.1538-7305.1948.tb00917.x. The mechanism — three
load-bearing theorems:

1. **Source coding theorem.** For a discrete memoryless source X
   with entropy `H(X) = −Σ p(x) log p(x)` bits per symbol, the
   minimum average number of bits required per symbol to encode X
   for transmission over a noiseless channel approaches H(X)
   asymptotically as block length grows; no code achieves a lower
   rate. This converts Hartley's `log s` into the average
   `−Σ p log p` weighted by source statistics.
2. **Noisy-channel coding theorem.** For a discrete memoryless
   channel with capacity `C = max_{p(x)} I(X;Y)` bits per channel
   use (where `I(X;Y)` is the mutual information), there exist
   block codes of rate R < C with arbitrarily low decoding error
   probability as block length grows; conversely, no code of rate
   R > C achieves arbitrarily low error. The capacity is a
   property of the channel, not of any code.
3. **Sampling-and-rate-distortion sketch (made precise in Shannon
   1949 BSTJ-second-paper).** The continuous analogue: a
   band-limited signal of bandwidth W is determined by its values
   at 2W samples per second.

The 1948 paper also introduces the differential entropy for
continuous sources, the chain rule for entropy, conditional and
joint entropy, mutual information as a primary quantity, and the
channel-capacity formula `C = W log(1 + S/N)` for the additive
white Gaussian noise channel. Edition-of-record: BSTJ original (two
parts); reprinted with Weaver's expository chapter as *The
Mathematical Theory of Communication* (University of Illinois Press
1949); definitive collected-works edition is *Claude Shannon:
Collected Papers* (Sloane and Wyner eds., IEEE Press 1993). **Strong
c1, anchor entry.**

**Shannon 1949 (secrecy).** "Communication Theory of Secrecy
Systems," *BSTJ* 28(4) (October 1949), 656–715.
doi:10.1002/j.1538-7305.1949.tb00928.x. Filed under
`cryptography/foundations/`; mechanism in §3.6 below.

**Shannon 1949 (sampling).** "Communication in the Presence of
Noise," *Proc. IRE* 37(1) (January 1949), 10–21.
doi:10.1109/JRPROC.1949.232969. The mechanism: makes the sampling
theorem rigorous in continuous time, derives the channel-capacity
formula `C = W log(1 + S/N)` rigorously, geometrizes the channel
problem in signal-space. This is the second of Shannon's two 1949
papers and is *not* the secrecy paper. Filed under
`compression-sampling/` (per §3.10) bundled with Nyquist 1928 as the
combined Nyquist-Shannon sampling entry.

**Hartley 1928 vs Shannon 1948 boundary.** Hartley is canon for
priority; Shannon supersedes on every quantitative dimension. Both
file in `information-theory/` as separate entries, with the Shannon
entry's stub explicitly marking the supersession.

**Jaynes 1957.** "Information Theory and Statistical Mechanics,"
*Phys. Rev.* 106(4) (May 1957), 620–630.
doi:10.1103/PhysRev.106.620. The mechanism: Jaynes shows that
equilibrium statistical mechanics can be derived as the
maximum-entropy distribution subject to the constraints of known
macroscopic averages, where "entropy" is the Shannon entropy of the
microstate probability distribution. The result reproduces the
Gibbs canonical and grand-canonical ensembles without any
ergodic-theoretic detour. Bridge text per chemistry pass-3 §5.4 and
§4 below. **Strong c1.** Filed in `information-theory/` (or in a
`bridges/` sub-fold to be decided in pass-3).

### 3.3 Coding theory

**Hamming 1950.** "Error Detecting and Error Correcting Codes,"
*BSTJ* 29(2) (April 1950), 147–160. The mechanism: Hamming
constructs the (7,4) code — four data bits encoded into seven
transmitted bits via three parity bits, each parity bit covering a
distinct subset of data bits, with the property that any single-bit
error in transmission can be both detected and corrected by
inspecting the syndrome. He also defines Hamming distance (the
number of positions at which two codewords differ) and proves that
a code with minimum distance d can detect d-1 errors and correct
⌊(d-1)/2⌋ errors. **Strong c1.**

**Reed and Solomon 1960.** "Polynomial Codes Over Certain Finite
Fields," *J. SIAM* 8(2) (June 1960), 300–304. doi:10.1137/0108018.
The mechanism: a Reed-Solomon code of dimension k over GF(q)
encodes a message as the coefficient vector of a polynomial of
degree < k and transmits the polynomial's evaluation at n distinct
field points. Decoding amounts to polynomial reconstruction via
Lagrange interpolation given any k of the n evaluations. The
construction achieves the Singleton bound (a (n,k) RS code has
minimum distance n-k+1) and is the foundational MDS-code family.
**Strong c1.**

**Berrou, Glavieux, Thitimajshima 1993** turbo codes. Pass-1 flagged
borderline. Pass-2 verdict: **promote**. The mechanism: parallel
concatenation of two recursive systematic convolutional encoders
separated by a pseudo-random interleaver, with iterative decoding
using soft-output (BCJR-derived) decoders that exchange extrinsic
information across iterations. Reasoning for promotion: the paper is
the originator-tier statement of two distinct ideas — (i) iterative
decoding with extrinsic-information exchange (a *paradigm shift* in
how decoding is conceptualized, not a new code family per se), and
(ii) the empirical demonstration that capacity-approaching codes
exist at practical block lengths and decoding complexities, which
re-opened a question Shannon's existence proof had left dormant for
45 years. The downstream uptake (LDPC revival, polar codes, modern
5G channel coding) is built on top of the iterative-decoding
paradigm Berrou et al. introduced. Filed in `coding-theory/`.

**Gallager 1962 LDPC priority.** Robert Gallager's MIT PhD thesis
"Low-Density Parity-Check Codes" (MIT Press 1963; preceded by his
1962 *IRE Trans. Inf. Theory* paper of the same title) introduced
LDPC codes and a probabilistic decoding algorithm three decades
before turbo codes. Pass-1 did not name it; pass-2 adds it as
**strong c1**. Filed in `coding-theory/`. The historical note: LDPC
codes were largely ignored from 1963 to the mid-1990s; the turbo
codes paper triggered a re-examination that led to MacKay-Neal 1995
rediscovering them. The canon entry for Gallager 1962 honors
priority; the canon entry for Berrou-Glavieux-Thitimajshima 1993
honors the paradigm shift. Both stand.

### 3.4 Algorithmic information / Kolmogorov complexity

The convergent-originator rule articulated in info pass-1 §1.4:
algorithmic information theory has four independent originators
converging on essentially the same object (the Kolmogorov-Chaitin-
Solomonoff complexity of a string), and the canon represents the
convergence rather than picking a single "originator."

**Solomonoff 1964.** "A Formal Theory of Inductive Inference,"
*Information and Control* 7(1) (March 1964), 1–22; Part II in 7(2)
(June 1964), 224–254. doi:10.1016/S0019-9958(64)90223-2 and
doi:10.1016/S0019-9958(64)90131-7. The mechanism: Solomonoff
defines the algorithmic probability of a string x as the sum over
all programs that output x of `2^{-|p|}`, where |p| is program
length, and proves that universal induction by this prior converges
to any computable distribution faster than any other computable
prior. The earliest of the four. **Strong c1.**

**Kolmogorov 1965.** "Three Approaches to the Quantitative
Definition of Information," *Problems of Information Transmission*
1(1) (1965), 1–7 (English translation; original Russian
*Problemy Peredachi Informatsii* same year). The mechanism:
Kolmogorov defines K(x) = the length of the shortest program that
outputs x on a fixed universal machine, proves K is invariant up to
an additive constant across choice of universal machine, and
establishes the link to Shannon entropy in the limit of repeated
sampling from a stationary source. **Strong c1.**

**Chaitin 1966.** "On the Length of Programs for Computing Finite
Binary Sequences," *J. ACM* 13(4) (October 1966), 547–569.
doi:10.1145/321356.321363. **Chaitin 1969.** "On the Simplicity and
Speed of Programs for Computing Infinite Sets of Natural Numbers,"
*J. ACM* 16(3) (July 1969), 407–422 — note the pass-1 citation gives
volume 16(1) 145–159; the correct citation is 16(3) 407–422 (pass-1
correction logged here). Mechanism: Chaitin independently arrives
at descriptive complexity as the length of the shortest program;
his 1969 paper introduces the algorithmic information of an
infinite set and the construction of Ω, the halting probability of
a universal machine, as a specific real number that is algorithmically
random in a precise sense. **Strong c1.**

**Levin 1973.** "Universal Sequential Search Problems," *Problems
of Information Transmission* 9(3) (1973), 265–266. The mechanism:
Levin's universal search algorithm dovetails all programs and
returns the first output meeting a decidable acceptance criterion;
the running time is optimal up to a multiplicative constant
depending on the program but not on the instance. The same paper
states the independent NP-completeness result that earns Levin the
co-attribution on the Cook-Levin theorem (see §3.5). **Strong c1**,
dual entry under `algorithmic-information/` and `complexity/`.

The four-author bundle is the canon's reference example of a
convergent-originator domain. Pass-2 promotes all four under the
rule.

### 3.5 Computational complexity

**Cobham 1965.** "The Intrinsic Computational Difficulty of
Functions," *Proc. 1964 Intl. Cong. for Logic, Methodology, and
Philosophy of Science* (North-Holland 1965), 24–30. Mechanism:
Cobham defines a class of functions computable in time bounded by a
polynomial in the input length and proposes this class as the
formal capture of "intrinsic" tractability, with the key property
that the class is robust under model variation (Turing machines,
RAM machines, etc., agree up to polynomial overhead). **Strong c1.**

**Edmonds 1965.** "Paths, Trees, and Flowers," *Canad. J. Math.*
17 (1965), 449–467. doi:10.4153/CJM-1965-045-4. Mechanism: Edmonds
exhibits a polynomial-time algorithm for maximum matching in
general graphs, and articulates the same polynomial-time-as-
tractable thesis as Cobham, in a paper whose mathematical content
(the blossom algorithm) is independent of the philosophical thesis.
**Strong c1.** Pass-2 promotes both Cobham and Edmonds; the
polynomial-time thesis has co-originator status the same way
Kolmogorov complexity does.

**Cook 1971.** "The Complexity of Theorem-Proving Procedures,"
*Proc. 3rd ACM STOC* (May 1971), 151–158.
doi:10.1145/800157.805047. Mechanism: Cook defines the class NP
(decision problems verifiable in polynomial time given a witness),
defines polynomial-time reducibility, and proves the satisfiability
problem for boolean formulas is NP-complete (every NP problem
reduces to SAT in polynomial time). The proof constructs, for any
nondeterministic polynomial-time Turing machine M and any input x,
a propositional formula whose satisfying assignments encode the
accepting computations of M on x. **Strong c1.**

**Karp 1972.** "Reducibility Among Combinatorial Problems," in
*Complexity of Computer Computations* (R. E. Miller and J. W.
Thatcher eds., Plenum 1972), 85–103. Mechanism: Karp constructs a
chain of polynomial-time reductions establishing the
NP-completeness of 21 natural combinatorial problems (vertex cover,
clique, set cover, three-dimensional matching, knapsack, partition,
Hamiltonian cycle, traveling salesman, etc.), demonstrating that
the NP-completeness phenomenon is pervasive rather than exotic.
**Strong c1.**

**Levin 1973.** Independent NP-completeness — the universal-search
paper (§3.4) also contains the result that the recognition problem
for a universal language under polynomial-time many-one reducibility
is complete for the class. The Cook-Levin attribution dates from
the late-1970s rediscovery of Levin's paper in the West and is now
universal usage. Levin gets dual citation: `algorithmic-information/`
for universal search, `complexity/` for NP-completeness.

### 3.6 Cryptography (foundations)

**Shannon 1949 (secrecy).** Mechanism: Shannon introduces the model
of a cipher as a family of transformations T_K of a plaintext space
P into a ciphertext space C indexed by a key K drawn from a key
distribution. He defines *perfect secrecy* as the condition that
the a posteriori distribution on plaintexts given ciphertext equals
the a priori distribution, and proves that perfect secrecy requires
key entropy ≥ message entropy (the one-time pad bound). He
introduces *unicity distance* — the expected length of ciphertext
beyond which the key becomes uniquely determined under exhaustive
search — as `n_0 = H(K) / D`, where D is the redundancy of the
plaintext language. He frames cryptography as an information-
theoretic problem and lays out the diffusion / confusion design
principles that Shannon-era and modern block-cipher designers still
cite. **Strong c1, anchor entry.**

**Diffie and Hellman 1976.** "New Directions in Cryptography," *IEEE
Trans. Inf. Theory* IT-22(6) (November 1976), 644–654.
doi:10.1109/TIT.1976.1055638. Mechanism: Diffie and Hellman
introduce the public-key paradigm — the separation of encryption
and decryption keys with the public encryption key revealing
nothing computationally tractable about the private decryption key
— and exhibit the Diffie-Hellman key-exchange protocol in a
multiplicative group of a finite field, whose security rests on the
intractability of the discrete logarithm. They also propose the
concept of a digital signature scheme. The paper is foundational on
*two* axes: a new model (public-key) and a specific construction
(DH key exchange). **Strong c1.**

**Rivest, Shamir, Adleman 1978.** "A Method for Obtaining Digital
Signatures and Public-Key Cryptosystems," *Comm. ACM* 21(2)
(February 1978), 120–126. doi:10.1145/359340.359342. Mechanism:
RSA realizes the Diffie-Hellman public-key vision with a concrete
trapdoor function — modular exponentiation in (Z/nZ)* with n the
product of two large primes, where the trapdoor is the prime
factorization. Encryption is `c = m^e mod n`, decryption is
`m = c^d mod n` with `e d ≡ 1 mod φ(n)`, and the security rests on
the hardness of factoring n. The paper realizes both encryption and
digital signatures in one construction. **Strong c1.**

**Goldwasser and Micali 1984.** "Probabilistic Encryption," *J.
Comput. Syst. Sci.* 28(2) (April 1984), 270–299.
doi:10.1016/0022-0000(84)90070-9. Mechanism: GM define *semantic
security* — the requirement that the probability distribution of
plaintext-derived predicates is computationally indistinguishable
between distinct ciphertexts of the same plaintext — and exhibit
the first encryption scheme provably semantically secure under a
standard hardness assumption (the quadratic-residuosity assumption).
The paper introduces probabilistic encryption (deterministic
encryption cannot be semantically secure) and the formal indistin-
guishability paradigm that became the modern cryptographic standard
of definition. **Strong c1.**

**Goldwasser, Micali, Rackoff 1989.** "The Knowledge Complexity of
Interactive Proof Systems," *SIAM J. Comput.* 18(1) (February
1989), 186–208 — preceded by the conference version at *Proc. 17th
STOC* (1985), 291–304. Mechanism: GMR define the class IP of
interactive proof systems (a polynomial-time verifier interacting
with a computationally unbounded prover) and the notion of a
zero-knowledge proof — an interactive proof that reveals nothing
beyond the validity of the asserted statement, formalized via the
existence of a polynomial-time simulator producing transcripts
indistinguishable from real interaction. They exhibit a
zero-knowledge proof of quadratic residuosity. The construction
became the founding object of an entire sub-discipline (zero
knowledge, MPC, and ultimately zk-SNARKs). **Strong c1.**

**Bellare and Rogaway 1993** random oracle model. Pass-1 flagged
borderline; pass-2 verdict: **promote, with explicit caveat in the
entry stub**. "Random Oracles are Practical: A Paradigm for
Designing Efficient Protocols," *Proc. 1st ACM CCS* (November
1993), 62–73. doi:10.1145/168588.168596. Mechanism: BR propose a
methodology for designing cryptographic protocols in an idealized
model where all parties (including the adversary) have oracle
access to a publicly-available random function, prove the protocol
secure in that model, and then instantiate the oracle by a concrete
hash function. Reasoning for promotion: the methodology became the
*lingua franca* of practical cryptographic proof for two decades
and remains so for many primitives; the originator-tier paper is in
fact this one. The caveat: Canetti, Goldreich, Halevi 1998 ("The
Random Oracle Methodology, Revisited," *J. ACM* 51(4), 557–594,
2004 published, STOC 1998 conference) constructed a signature
scheme provably secure in the random-oracle model that becomes
insecure under any concrete hash instantiation, demonstrating the
methodology is not generically sound. The canon entry for BR 1993
honors originator priority on the methodology; the entry stub
records the CGH counter-result so a reader does not mistake
"promoted to canon" for "the methodology is universally valid."

### 3.7 Cryptography (pedagogical-primary)

Resolved in §1. Friedman bundle stands.

### 3.8 Learning theory

**Vapnik and Chervonenkis 1971.** "On the Uniform Convergence of
Relative Frequencies of Events to their Probabilities," *Theory of
Probability and Its Applications* 16(2) (1971), 264–280.
doi:10.1137/1116025. Mechanism: VC define the *VC dimension* of a
class of indicator functions as the largest integer d such that
some d-element set is shattered (every dichotomy is realized by
some function in the class), and prove the uniform convergence of
empirical means to true means over the class at a rate governed by
the VC dimension — `O(√(d log n / n))`. The result is the first
distribution-free convergence rate in nonparametric statistics and
the founding theorem of statistical learning theory. **Strong c1.**

**Valiant 1984.** "A Theory of the Learnable," *Comm. ACM* 27(11)
(November 1984), 1134–1142. doi:10.1145/1968.1972. Mechanism:
Valiant defines *probably approximately correct* (PAC) learnability
— a concept class C is PAC-learnable if there exists an algorithm
that, given access to labeled examples drawn from any distribution,
returns with probability at least 1−δ a hypothesis whose error
under the same distribution is at most ε, in time and sample
complexity polynomial in 1/ε, 1/δ, and the size of the target
concept. The framework is independent of the VC apparatus and
arrived at the same destination from a complexity-theoretic side.
**Strong c1.**

**Blumer, Ehrenfeucht, Haussler, Warmuth 1989.** "Learnability and
the Vapnik-Chervonenkis Dimension," *J. ACM* 36(4) (October 1989),
929–965. doi:10.1145/76359.76371. Pass-1 did not list this entry;
pass-2 adds it. Mechanism: BEHW prove the *characterization theorem*
— a concept class is PAC-learnable if and only if its VC dimension
is finite, with explicit polynomial sample-complexity bounds in
both directions. The paper is the bridge that united VC theory and
PAC learning into a single discipline. The companion paper
"Occam's Razor" (Blumer, Ehrenfeucht, Haussler, Warmuth, *Inf.
Process. Lett.* 24(6) (April 1987), 377–380) establishes the
Occam's-razor lemma — a learner that produces hypotheses
significantly shorter than the data generalizes — which formalizes
the VC-dimension-as-effective-complexity intuition. Pass-2
promotes the 1989 *J. ACM* paper as **strong c1** for the
characterization, with the 1987 *IPL* paper bundled. The
inclusion argument: the characterization theorem is the
load-bearing structural result of statistical learning theory and
predates every modern textbook; without it the discipline has no
fundamental theorem. Filed in `learning-theory/`.

### 3.9 Quantum information

**Feynman 1982.** "Simulating Physics with Computers," *Int. J.
Theor. Phys.* 21(6/7) (June 1982), 467–488.
doi:10.1007/BF02650179. Mechanism: Feynman observes that simulating
quantum mechanical systems on a classical computer requires
resources exponential in the number of degrees of freedom (because
the dimension of the joint Hilbert space is exponential in the
particle count), and conjectures that a *quantum* computer — a
device whose states span a Hilbert space and whose evolution is
unitary — could simulate quantum systems with polynomial overhead.
This is the founding statement of quantum computation as a research
program. **Strong c1.**

**Deutsch 1985.** "Quantum Theory, the Church-Turing Principle and
the Universal Quantum Computer," *Proc. Roy. Soc. Lond. A*
400(1818) (8 July 1985), 97–117. doi:10.1098/rspa.1985.0070.
Mechanism: Deutsch formalizes the universal quantum computer as a
quantum Turing machine with unitary transition rules, states the
*Church-Turing-Deutsch principle* (every physically realizable
computation can be efficiently simulated by a universal quantum
computer), and exhibits the Deutsch algorithm — the first quantum
algorithm with a provable speedup over any classical algorithm on a
specific decision problem (parity of a single-bit function from
two queries to one). The result is qualitative speedup, not
asymptotic; the algorithm's significance is existence, not
practical utility. **Strong c1.**

**Bennett and Brassard 1984 (BB84).** "Quantum Cryptography:
Public Key Distribution and Coin Tossing," *Proc. IEEE Int. Conf.
on Computers, Systems and Signal Processing* (Bangalore, December
1984), 175–179. Mechanism: BB84 is a quantum key-distribution
protocol in which Alice transmits photons polarized in one of four
states (the two basis states of two mutually unbiased bases) and
Bob measures in a randomly chosen basis. The no-cloning theorem
ensures that an eavesdropper's measurements introduce detectable
disturbance; Alice and Bob detect eavesdropping by comparing a
random subset of their bit-disagreement statistics. The first
information-theoretically secure key-distribution protocol of any
kind. **Strong c1.**

**Bennett, Brassard, Crépeau, Jozsa, Peres, Wootters 1993.**
"Teleporting an Unknown Quantum State via Dual Classical and
Einstein-Podolsky-Rosen Channels," *Phys. Rev. Lett.* 70(13) (29
March 1993), 1895–1899. doi:10.1103/PhysRevLett.70.1895.
Mechanism: BBCJPW exhibit a protocol by which Alice can transmit
the state of a qubit to Bob using one shared maximally entangled
pair plus two bits of classical communication, with Alice's
original qubit destroyed in the process. The protocol is the first
demonstration that quantum information can be transmitted without
transmitting the carrier and is the foundational construction for
quantum communication, quantum repeaters, and measurement-based
quantum computation. **Strong c1.** Pass-1 did not name this entry;
pass-2 adds it.

**Shor 1994.** "Algorithms for Quantum Computation: Discrete
Logarithms and Factoring," *Proc. 35th IEEE FOCS* (November 1994),
124–134. doi:10.1109/SFCS.1994.365700; expanded as "Polynomial-
Time Algorithms for Prime Factorization and Discrete Logarithms on
a Quantum Computer," *SIAM J. Comput.* 26(5) (October 1997),
1484–1509. Mechanism: Shor exhibits polynomial-time quantum
algorithms for integer factorization and the discrete logarithm
problem, both of which are conjectured to be classically
intractable; the construction reduces factoring to period-finding
and uses the quantum Fourier transform to extract the period in
polynomial time. The result is the first asymptotic exponential
speedup of a quantum algorithm over the best known classical
algorithm on a problem of practical significance, and remains the
single most consequential result in quantum computation. **Strong
c1.**

**Holevo 1973.** "Bounds for the Quantity of Information
Transmitted by a Quantum Communication Channel," *Problems of
Information Transmission (Problemy Peredachi Informatsii)* 9(3)
(1973), 177–183 (English translation; original Russian volume same
issue, 3–11). Pass-1 §1.10 flagged Holevo as a strong candidate
addition; pass-2 verdict: **promote, strong c1**. Mechanism:
Holevo proves that the mutual information accessible to a
measurement on a quantum source emitting state ρ_x with probability
p_x is bounded above by `S(Σ p_x ρ_x) − Σ p_x S(ρ_x)`, where S is
the von Neumann entropy. The bound is the quantum analogue of
Shannon's mutual-information capacity and the load-bearing limit on
classical information transmission through a quantum channel.
**Strong c1.** Filed in `quantum-information/`.

### 3.10 Compression and sampling

**Lempel-Ziv 1977.** "A Universal Algorithm for Sequential Data
Compression," *IEEE Trans. Inf. Theory* IT-23(3) (May 1977),
337–343. doi:10.1109/TIT.1977.1055714. **Lempel-Ziv 1978.**
"Compression of Individual Sequences via Variable-Rate Coding,"
*IEEE Trans. Inf. Theory* IT-24(5) (September 1978), 530–536.
doi:10.1109/TIT.1978.1055934. Pass-1 §4(3) recommended splitting
the call: promote the universality result, file the algorithms qua
algorithms in `reference/` if at all. Pass-2 ratifies the split:
the canon entry is a **single bundled entry** "Lempel-Ziv
universality" covering the 1977 + 1978 papers as joint c1 for
universal compression without source-distribution knowledge. The
specific LZ77 / LZ78 algorithms are reference-tier; the
universality theorem (a sequential compressor achieving the
entropy rate of any stationary ergodic source without prior
knowledge of the source distribution) is foundation. Filed in
`compression-sampling/`.

**Huffman 1952.** "A Method for the Construction of Minimum-
Redundancy Codes," *Proc. IRE* 40(9) (September 1952), 1098–1101.
doi:10.1109/JRPROC.1952.273898. Pass-2 verdict: **promote as c1**,
filed in `compression-sampling/` adjacent to the Shannon source-
coding entry. Pre-Shannon? Post-Shannon? Post-Shannon by four
years; Huffman developed the algorithm as a class assignment for
Robert Fano at MIT, in response to Fano's open-question
formulation of optimal prefix coding (Shannon-Fano coding having
not achieved optimality). Mechanism: a greedy bottom-up tree
construction that assigns shorter codewords to higher-probability
symbols and is provably optimal among uniquely-decodable prefix
codes. The method has been the practical workhorse of source
coding for seventy years and is, by the originator-priority test,
canon. The "where does it go" question pass-1 raised has a clean
answer: post-Shannon, in `compression-sampling/`, as the
construction that realizes the source-coding theorem at finite
block length.

**Nyquist-Shannon sampling.** Single combined entry per pass-1: the
Nyquist 1928 channel-rate result (§3.2) and the Shannon 1949
"Communication in the Presence of Noise" rigorous-sampling-theorem
paper (§3.2). Filed in `compression-sampling/` with cross-link to
`information-theory/`.

### 3.11 Reference (normative)

**RFC 2104 (1997).** Krawczyk, Bellare, Canetti, "HMAC: Keyed-
Hashing for Message Authentication," IETF, February 1997. Pass-2
verdict: **promote under c3 narrow inclusion**. Mechanism: HMAC
defines a generic construction of a message-authentication code
from any iterated cryptographic hash function H as
`HMAC(K, m) = H((K' ⊕ opad) ∥ H((K' ⊕ ipad) ∥ m))`, where K' is a
zero-padded key and opad/ipad are fixed byte constants. The
construction is *originated* by this RFC (the paper "Keying Hash
Functions for Message Authentication" by Bellare, Canetti, Krawczyk
in *CRYPTO '96* contains the security proof; the RFC contains the
canonical construction). Inclusion argument: the c3 tier admits
normative documents that *originate* the primitive itself, not
documents that compose existing primitives. HMAC originates here.
TLS 1.3 (RFC 8446) does not originate primitives, it composes them
— **landscape, not canon**, per pass-1 §1.11 and §4(4). Filed in
`reference/`.

**FIPS PUB 197 (2001).** "Advanced Encryption Standard (AES),"
NIST, November 2001. Pass-2 verdict: **promote under c3**. The
FIPS-197 specification originates AES as a normative primitive
(the underlying Daemen-Rijmen Rijndael construction was selected
through the AES competition; the FIPS document is the c3-tier
canonical reference). Filed in `reference/`.

**ISO/IEC 80000-13:2008.** "Quantities and units — Part 13:
Information science and technology." Pass-2 verdict: **promote
under c3**. Mechanism: 80000-13 normalizes the SI-style names and
symbols for information quantities — the bit, the byte, the
binary prefixes (kibi, mebi, gibi, tebi, ...) introduced to
disambiguate from decimal SI prefixes, the unit-symbol conventions
for entropy and channel capacity. It is the IUPAC-Gold-Book
parallel for information science. Filed in `reference/`. Pass-1
did not name this; pass-2 adds.

**RFC 8446 (2018) TLS 1.3** — landscape per the c3 narrow rule.

The c3 narrow rule, restated for the maintainer: **a normative
reference promotes only when the document originates the primitive
itself**. Documents that compose primitives stay landscape no
matter how widely deployed. This is the rule that prevents
`reference/` from drifting into a registry of every IETF protocol
in production.

---

## 4. Shannon ↔ Gibbs entropy binding — verification

Chemistry pass-3 §5.4 issued the binding rule. Pass-1 of this branch
honored the rule structurally (Shannon entry in `information-theory/`,
Jaynes entry in `information-theory/` as bridge, Gibbs entry stays in
`02-physics/statistical-mechanics/`) but did not write the
stub-writing rule into a binding form for the canon entries
themselves.

Pass-2 binds it explicitly. **The information-branch stub-writing
rule for entropy:**

> Every entry in `04-information/` that uses the word "entropy"
> without qualification specifies *Shannon entropy* in the entry
> stub, gives its formal definition `H(X) = −Σ p(x) log p(x)` with
> the log base specified (bits for log₂, nats for natural log), and
> states explicitly that this is a property of the probability
> distribution X, not of any physical system. Where a chemistry or
> physics concept is invoked (Gibbs entropy, von Neumann entropy,
> Boltzmann entropy), the entry stub names the concept by its full
> qualified name and gives a one-line explication of *why* the
> formal identity of the expression with Shannon's is non-trivial,
> not silent.

Concretely, the stub-writing consequences:

- **Shannon 1948 entry stub** says: "The entropy `H(X) = −Σ p(x) log p(x)`
  is the Shannon entropy of a probability distribution X with units
  of bits when log = log₂. It is a measure on the distribution, not
  on any physical system; the formal coincidence with Gibbs entropy
  in statistical mechanics is the subject of Jaynes 1957 (q.v.) and
  must not be taken as identification."
- **Jaynes 1957 entry stub** says: "Establishes that the Gibbs
  canonical-ensemble distribution can be derived as the maximum of
  Shannon entropy `H(X) = −Σ p(x) log p(x)` over microstate
  distributions X subject to constraints of known macroscopic
  averages. The result is a derivation, not an identification: the
  Shannon entropy of the maximum-entropy microstate distribution
  *equals* the Gibbs entropy of the corresponding equilibrium state,
  but the two quantities have distinct interpretations (information
  about the distribution vs. thermodynamic entropy of the system).
  Cross-link to `02-physics/statistical-mechanics/` and
  `03-chemistry/thermodynamics/`."
- **Holevo 1973 entry stub** says: "The von Neumann entropy
  `S(ρ) = −Tr(ρ log ρ)` is the quantum analogue of Shannon entropy;
  for a density matrix ρ that is diagonal in some basis, von Neumann
  entropy reduces to Shannon entropy of the eigenvalue distribution
  in that basis. Holevo's bound is stated in terms of von Neumann
  entropy."
- **Every Kolmogorov-complexity entry stub** says: "Algorithmic
  complexity K(x) is a measure on individual strings, not on
  distributions; in the limit of repeated sampling from a stationary
  source, the expected value of K(x_1...x_n)/n converges to the
  Shannon entropy rate of the source (Brudno 1974), but the two
  quantities are conceptually distinct and the limit is the
  bridge."

The binding is now operational at the entry-stub level, not only at
the folder-placement level. Chemistry pass-3 §5.4 is honored
literally.

---

## 5. Cross-branch coherence map

Same shape as math/physics pass-2 §6 — the dangling cross-links from
this branch into other branches, each with the directionality and the
canonical home.

| From `04-information/` | To branch | Canonical home | Direction |
|------------------------|-----------|----------------|-----------|
| Turing 1936 | `01-mathematics/foundations/computation-cross-link/` | here | cross-link from math |
| Church 1936 | `01-mathematics/foundations/computation-cross-link/` | here (per §2) | cross-link from math |
| Post 1936 | `01-mathematics/foundations/computation-cross-link/` | here | cross-link from math |
| Gödel 1931 | `01-mathematics/foundations/` | math | cross-link from here |
| Kleene 1936 (general recursive functions, if promoted in pass-3) | `01-mathematics/foundations/` | candidate either side; pass-3 to call | cross-link |
| Kolmogorov 1933 (probability axioms) | `01-mathematics/probability/` | math | cross-link from here (Shannon 1948 inherits the measure-theoretic frame) |
| Kolmogorov 1965 (descriptive complexity) | here (`algorithmic-information/`) | here | cross-link from math |
| Solomonoff 1964 / Chaitin 1966-69 / Levin 1973 | here | here | none required |
| Shannon 1948 entropy ↔ Gibbs entropy | `03-chemistry/thermodynamics/` | each in own home | cross-link both directions, with stub-rule above |
| Jaynes 1957 | here (per chemistry pass-3 §5.4) | here | cross-link from chemistry |
| Landauer 1961 (cost of erasure) | `02-physics/statistical-mechanics/` | physics | cross-link from here |
| Bennett 1973 (reversible computation) | `02-physics/statistical-mechanics/` | physics (candidate; pass-3 to confirm) | cross-link from here |
| Feynman 1982 / Deutsch 1985 / Shor 1994 / BB84 / BBCJPW 1993 / Holevo 1973 | here (`quantum-information/`) | here | cross-link from `02-physics/quantum-mechanics/` |
| von Neumann 1932 (quantum-mechanics formal foundation) | `02-physics/quantum-mechanics/` (default) | physics | cross-link from here (Holevo's bound uses the von Neumann entropy machinery) |
| Vapnik-Chervonenkis 1971 / Valiant 1984 / BEHW 1989 | here (`learning-theory/`) | here | cross-link from `07-mind/cognitive-science/` (formal limits on what any learner can do) |
| RFC 2104 / FIPS-197 / ISO/IEC 80000-13 | here (`reference/`) | here | none required; landscape composer documents (TLS, QUIC) stay landscape |

The two binding cross-branch contracts:

1. **The Turing/Gödel/Church split.** Math holds Gödel; info holds
   Turing, Church, Post. Each branch cross-links the other's
   placement. The asymmetric-concession rule (§2.3) governs future
   borderline cases.
2. **The Shannon/Gibbs binding.** Information holds Shannon and
   Jaynes; physics holds Gibbs and Boltzmann; chemistry holds the
   thermodynamic-entropy strand (Helmholtz, Lewis-Randall) per
   chemistry pass-3 §5.4. The stub-writing rule (§4) prevents silent
   identification across the three branches.

---

## 6. Recommended frozen tree for pass-3

```
04-information/
  README.md
  CANON_INDEX.md
  _intake/
  computation/
    turing-1936/
    church-1936/
    post-1936/
    von-neumann-1945/
    (kleene-1936/  — pass-3 to decide)
  information-theory/
    hartley-1928/
    nyquist-1928/
    shannon-1948/
    jaynes-1957/
  coding-theory/
    hamming-1950/
    reed-solomon-1960/
    gallager-1962/
    berrou-glavieux-thitimajshima-1993/
  algorithmic-information/
    solomonoff-1964/
    kolmogorov-1965/
    chaitin-1966-1969/
    levin-1973/
  complexity/
    cobham-1965/
    edmonds-1965/
    cook-1971/
    karp-1972/
    levin-1973/   (dual entry; symlink or duplicate stub)
  cryptography/
    foundations/
      shannon-1949/
      diffie-hellman-1976/
      rsa-1978/
      goldwasser-micali-1984/
      gmr-1989/
      bellare-rogaway-1993/   (with CGH 1998 caveat in stub)
    pedagogical-primary/
      friedman-mc-i/
      friedman-mc-ii/
      friedman-mc-iii/
      friedman-mc-iv/
      friedman-callimahos-mca/
  learning-theory/
    vapnik-chervonenkis-1971/
    valiant-1984/
    blumer-ehrenfeucht-haussler-warmuth-1989/
  compression-sampling/
    huffman-1952/
    lempel-ziv-1977-1978/
    nyquist-shannon-sampling/   (Nyquist 1928 + Shannon 1949 IRE)
  quantum-information/
    holevo-1973/
    feynman-1982/
    bb84-1984/
    deutsch-1985/
    bbcjpw-1993/
    shor-1994/
  reference/
    rfc-2104-hmac/
    fips-197-aes/
    iso-iec-80000-13/
  _landscape/                 (cite freely, do not mirror)
    kleene-1952-introduction-to-metamathematics/
    knuth-taocp/
    cormen-leiserson-rivest-stein/
    sipser-introduction-to-the-theory-of-computation/
    cover-thomas-elements-of-information-theory/
    goldreich-foundations-of-cryptography/
    aho-hopcroft-ullman-1974/
    rfc-8446-tls-1.3/
    quic-rfc-9000/
```

Differences from pass-1 §2:

- `kleene-1952` demoted to `_landscape/`.
- `gallager-1962` added to `coding-theory/`.
- `berrou-glavieux-thitimajshima-1993` promoted out of "borderline."
- `huffman-1952` added to `compression-sampling/`.
- `bbcjpw-1993` (teleportation) added to `quantum-information/`.
- `holevo-1973` added to `quantum-information/`.
- `blumer-ehrenfeucht-haussler-warmuth-1989` added to
  `learning-theory/`.
- `bellare-rogaway-1993` promoted out of borderline with caveat.
- `iso-iec-80000-13` added to `reference/`.
- `_landscape/` registry seeded with the named exclusions so
  future maintainers do not re-litigate.
- The `cryptography/modern/` placeholder pass-1 sketched is
  collapsed into `cryptography/foundations/`; the pedagogical-
  primary tier survives as a sibling.

Pass-3 tasks:

1. Seed `CANON_INDEX.md` with one block per entry above.
2. Decide Kleene 1936 (general recursive functions, *AJM* 1936)
   in or out — pass-2 leans in but does not pre-commit.
3. Add Bennett 1973 reversible-computation cross-link if
   `02-physics/statistical-mechanics/` is opened by then.
4. Write the Brudno 1974 cross-link stub for the
   Kolmogorov-Shannon entropy-rate convergence (referenced in §4
   stub for algorithmic-information entries).
5. Sub-fold question on Jaynes 1957: leave in
   `information-theory/` or open a `bridges/` sub-fold and put
   Jaynes there together with any other cross-branch bridge texts
   that arise.

---

## 7. Report-back

- **(a) Friedman pedagogical-primary gate.** Resolved
  **sub-fold survives**. The FOIA case number 60494 cannot be
  verified from public NSA sources and is dropped from the
  citation form (the underlying April 2015 release is verified
  from NARA's *Transforming Classification* blog and the NSA
  Cryptologic Heritage portal); the Knuth test gives a clean
  three-part distinguishing rule that admits Friedman and excludes
  Knuth and every other discipline-standard reference monograph;
  the one-paragraph definition of pedagogical-primary in §1.3 is
  operational and load-bearing. The
  `cryptography/pedagogical-primary/` sub-fold goes into pass-3
  with the five-entry bundle in §1.4.
- **(b) Church 1936 cross-branch consensus.** **Stays in
  `04-information/computation/`** with hard cross-link from
  `01-mathematics/foundations/`. The asymmetric-concession rule
  (§2.3) is the explicit mechanism — math gives up Turing to info
  on use-trajectory grounds, info gives up Gödel to math on object
  grounds, Church follows Turing under the same logic. The rule is
  formalized in §2.3 for re-use on the next borderline case.
- **(c) Shannon-Gibbs binding status.** **Honored at the
  entry-stub level**, not only at the folder-placement level.
  Pass-1 honored the rule structurally; pass-2 §4 writes the
  stub-writing rule that every information-branch entry using
  "entropy" must follow. Chemistry pass-3 §5.4 is satisfied
  literally.
- **(d) Most important pass-1 omission.** **Gallager 1962 LDPC
  codes.** Pass-1 named Berrou-Glavieux-Thitimajshima 1993 as a
  borderline coding-theory entry but did not name Gallager 1962,
  which is the originator-tier statement of low-density
  parity-check codes and probabilistic decoding three decades
  before turbo codes. The omission is structural: the
  coding-theory canon has *two* paradigm-setting works (Hamming
  1950 for the algebraic strand, Gallager 1962 for the
  probabilistic-iterative-decoding strand that turbo codes
  re-discovered). Without Gallager the canon misrepresents the
  field's intellectual history. Runner-up omission: Holevo 1973,
  which pass-1 named as a candidate addition but did not commit;
  pass-2 promotes. Tertiary omission: BEHW 1989, which is the
  characterization theorem of statistical learning theory and is
  load-bearing in a way pass-1's Vapnik-Chervonenkis-and-Valiant
  pair does not capture.

End of pass-2 sweep memo.
