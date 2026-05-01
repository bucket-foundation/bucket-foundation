# 04-information — Pass-2 Cross-Branch Memo

Date: 2026-05-01
Sweep: pass-2 of `bucket-canon/04-information/`. Focus is explicitly
**cross-branch coherence** with the parallel pass-1 sweeps in
`01-mathematics/`, `02-physics/`, `03-chemistry/` (already at pass-3),
and the gov-declassified pass-2 in `08-deep-history/`. This memo also
executes the **verification gate** that pass-1 §4(1) attached to the
Friedman pedagogical-primary tier and adjudicates the four other
contestable calls flagged in pass-1 §4.

This is an `_intake/` artifact, not a promotion. Pass-3 of this branch
will fold the rulings here into `README.md` and `CANON_INDEX.md`.

The promotion rule c1/c2/c3 from `04-information/README.md` is the
governing instrument throughout. Pass-3 of the chemistry branch
introduced a tightening of c1 in §3.1 ("originator monograph promotes
under c1 only when the monograph contains a load-bearing element that
the originator paper does not contain") and a counter-rule in §3.4
("popularity is not normativity") that this pass adopts verbatim.

---

## 1. Friedman pedagogical-primary tier — the verification gate

Pass-1 §4(1) said: provisional yes on the `cryptography/pedagogical-primary/`
sub-fold, but pass-2 must execute three checks before the structure binds:

> (a) verify FOIA case 60494 against the NSA release index, (b) test the
> rule against Knuth's TAOCP and reject if it admits Knuth, (c) produce
> the explicit one-paragraph definition of "pedagogical-primary" and
> what it excludes. Do all three. If (c) cannot be cleanly written,
> collapse the sub-fold and file Friedman in `cryptography/foundations/`
> with a tier-tag in the entry's metadata.

### 1.1 (a) FOIA case 60494 verification

Gov-declassified pass-2 §4.1 of `08-deep-history/` already attempted
this check and reported the result literally:

> The FOIA case number cited in pass-1 ("FOIA case 60494") could not be
> re-verified in pass-2 — `nsa.gov/...Friedman-Documents/` returned 403
> to WebFetch. Flag as **unconfirmed** pending direct manual fetch.

The April 2015 release date (NSA blog post on *Transforming
Classification*, April 30, 2015) and the ~52,000 page count are
independently corroborated by the Internet Archive mirror at
`archive.org/details/nsa-friedman` and by the per-volume page counts
recovered for *Military Cryptanalysis* III (123 pp) and IV (156 pp).

**Pass-2 ruling on (a):** the **release** is verified (April 2015, NSA
Cryptologic Heritage portal, Internet Archive mirror, per-volume page
counts confirm). The specific **FOIA case number 60494** is not
re-verifiable from open-web sources accessible to this sweep. The
entry-level metadata for each Friedman volume must therefore use the
release citation (NSA Friedman Collection release, April 2015) as the
primary provenance string and carry a `foia_case_number_unverified`
tag for the 60494 number until manual fetch from the NSA portal
confirms it. The provenance of the documents themselves is not in
doubt — only the FOIA case number is unconfirmed.

This is sufficient for promotion. Bucket's evidence rule does not
require a FOIA case number to file a declassified document; it
requires verifiable provenance of the document's release. The release
is verified.

### 1.2 (b) The Knuth test

The test the maintainer named: does the pedagogical-primary rule, as
written, admit Donald Knuth's *The Art of Computer Programming*? If
yes, the rule is too loose and pedagogical-primary becomes a wedge for
promoting any sufficiently authoritative textbook by an originator-tier
author. If no, the rule is tight enough to license Friedman without
opening the door to TAOCP.

Knuth's *TAOCP* (Addison-Wesley, vols. 1–4A published 1968, 1969, 1973,
2011, plus fascicles) is the discipline-standard treatise on classical
algorithm design and analysis. Knuth is unambiguously originator-tier
(LR parsing, attribute grammars, the analysis-of-algorithms program,
TeX, literate programming, the dancing-links algorithm, multiple
priority results in combinatorics-of-algorithms). The book is
maintained, encyclopedic, and load-bearing in the discipline.

**Apply the proposed pedagogical-primary definition (drafted in §1.3
below) to TAOCP:**

1. Is TAOCP "by the field-founding practitioner who built the field
   from scratch"? Knuth did not build the field of algorithm analysis
   from scratch — he systematized and named it. The field had
   identifiable predecessors (von Neumann, Rabin, Hartmanis, Stearns,
   Cobham, Edmonds). Friedman, by contrast, built American
   cryptanalysis from a standing start at Riverbank in 1917 and at the
   Signal Intelligence Service from 1929; the SIS organization
   Friedman ran was *the* American cryptanalytic capability and the
   personnel he trained (Rowlett, Sinkov, Kullback, Small) were the
   field's working population for two decades. The "built from scratch"
   clause is the load-bearing one.
2. Is TAOCP "the systematic primary pedagogy that the discipline used
   internally to train its working practitioners"? *Military
   Cryptanalysis* I–IV were the SIS training texts — they trained the
   people who broke PURPLE and contributed to ULTRA. TAOCP is the
   external pedagogical canon of computer science as a public
   discipline; it was not the internal training manual of any agency
   that built computer science.
3. Is TAOCP "primary in a sense the originator papers cannot be"? No.
   Knuth's originator content is in his papers (the LR parsing paper,
   the dancing-links paper, the literate-programming papers). TAOCP is
   discipline-standard reference grade — that is c3 reference, not
   pedagogical-primary. By contrast, Friedman has *no* primary papers
   that contain the systematic teaching of classical cryptanalysis;
   the SIS-era manuals are the only place that material exists in
   primary form.

**TAOCP fails clauses 1, 2, and 3.** The definition does not admit it.
TAOCP is c3-eligible as a discipline-standard reference — but the
chemistry pass-3 §3.4 counter-rule (`"normative" means published,
maintained, or formally adopted by a standards body or by professional
consensus equivalent to a standards body. Popularity is not
normativity.`) excludes it from c3 as well, because there is no
standards body in computer science that adopts TAOCP. TAOCP is
landscape — the most-cited landscape entry in computer science, but
landscape.

**Pass-2 ruling on (b):** the rule rejects Knuth. The definition is
tight.

### 1.3 (c) The pedagogical-primary definition — one paragraph

> **Pedagogical-primary** is a c3 sub-tier reserved for systematic
> teaching texts that satisfy three conjunctive clauses: (i) the
> author is the field-founding practitioner who **built the discipline
> from scratch as an institutional capability**, not merely
> systematized an extant field; (ii) the text is the **internal
> training material that the discipline itself used to train its
> working practitioners**, not an external pedagogical synthesis aimed
> at a general scholarly audience; and (iii) the systematic content of
> the text **does not exist in primary form anywhere else in the
> author's corpus** — the originator papers (where they exist) carry
> isolated results, but the unified, teachable, mechanism-grammar of
> the discipline appears only in this text. A text that fails any one
> of (i), (ii), (iii) is not pedagogical-primary; it is c3 reference
> at most, or landscape. The clause that does the most work is (i):
> "built the discipline from scratch as an institutional capability"
> — this excludes systematizers (Knuth, Cover-Thomas, Goldreich) and
> admits builders (Friedman, in the only known case at pass-2 time).

The definition is writable. It excludes the obvious wedge cases. It
admits Friedman.

### 1.4 Final call on the sub-fold

**Kept.** `04-information/cryptography/pedagogical-primary/` survives
pass-2. Friedman *Military Cryptanalysis* I–IV files there with citation
key `nsa.friedman.mc.<vol>` per gov-declassified pass-2 §4.4.
Friedman–Callimahos *Military Cryptanalytics* I–III files in the same
sub-fold with explicit cross-reference noting the successor relationship.

The sub-fold is closed at pass-2: no other text in the inventory
satisfies all three clauses of the §1.3 definition, and the
chemistry-pass-3 counter-rule against textbook promotion further
constrains future additions. If a candidate appears, it must be tested
against the definition and the test must be recorded in `_intake/`.

The README §"Cryptography sub-folder structure" already reflects this
structure as if it were settled; pass-2 confirms it is settled.

---

## 2. Church 1936 — final binding call

Pass-1 §3.2 placed Church 1936 in `04-information/computation/` with a
dual cross-link from `01-mathematics/foundations/`, on the
"downstream-use" test, and reserved the right for pass-2 to reverse.
Mathematics pass-1 §1.6 lists Church 1936 as **primary in
`04-information/`** and cross-referenced into mathematics under
`foundations/computation-cross-link/`. Mathematics pass-1 §3 — the
boundary-call section — gives the test:

> A primary text belongs to mathematics if its explanandum is a
> structural property of mathematical objects (consistency,
> decidability of an axiomatic system, cardinality, completeness); it
> belongs to information if its explanandum is a property of
> computation, communication, or encoding (decidability of a problem,
> channel capacity, descriptive complexity).

Apply the test to Church 1936 ("An Unsolvable Problem of Elementary
Number Theory," *Amer. J. Math.* 58, 345–363):

The paper introduces lambda-definability as a model of effective
computation, proves an undecidability result (no recursive function
decides the equivalence of two lambda-expressions), and uses that
result to give a negative answer to the Entscheidungsproblem. The
explanandum is **decidability of a problem via a model of
computation**. The lambda calculus is introduced as that model. The
mathematical-logic surface (lambda calculus as a formal calculus) is
the apparatus, not the object of inquiry.

Mathematics pass-1 already accepted this — its §3 boundary table reads
"Church 1936 → `04-information/`. Explanandum: an unsolvable problem as
established via lambda-definability, a model of computation."

**Final binding call.** **Church 1936 is primary in
`04-information/computation/`.** `01-mathematics/foundations/`
cross-references but does not duplicate the entry. The two branches
agree at pass-2; the cross-link is one-way (math → information). No
further deliberation is needed.

The lambda calculus *qua* type-theoretic substrate (Church 1940's
*JSL* paper "A Formulation of the Simple Theory of Types" and its
modern descendants in dependent type theory) is a separate question
that does not affect the placement of Church 1936. If a Church 1940
entry is later promoted, it sits on the mathematics side under
`01-mathematics/foundations/type-theory/` — different paper, different
explanandum.

---

## 3. Quantum information — info or physics?

Pass-1 §1.10 placed Feynman 1982, Deutsch 1985, BB84 (Bennett–Brassard
1984), and Shor 1994 in `04-information/quantum-information/`.
Physics pass-1 §3 ("Boundary calls — explicit") placed the
quantum-mechanical postulates in `02-physics/quantum-mechanics/`
(Schrödinger 1926, Dirac 1928, Pauli 1925, Born–Oppenheimer 1927)
without claiming the quantum-information papers. Physics pass-1
§"Quantum field theory and gauge theory" and §"Particle physics" do
not list any quantum-information entry. The two branches do not
conflict at pass-1 — but the boundary needs an explicit binding call
because the four papers above are exactly the kind of entry that could
plausibly migrate to physics in a future sweep.

Apply the chemistry pass-3 §5 boundary mechanism (the "explanandum
test" the maintainer asked for) to each:

**Feynman 1982, "Simulating Physics with Computers,"** *Int. J.
Theor. Phys.* 21(6/7), 467–488. Explanandum: the **computational**
question of whether classical computation can efficiently simulate
quantum systems. The paper does not derive a new quantum-mechanical
result; it observes that quantum systems are not efficiently
simulable by classical computers and proposes a quantum computer as
the resolution. The object of inquiry is computation. **Information
side.**

**Deutsch 1985, "Quantum Theory, the Church–Turing Principle and the
Universal Quantum Computer,"** *Proc. Roy. Soc. Lond. A* 400, 97–117.
Explanandum: a **computational universality** result — the existence
of a universal quantum Turing machine. The paper builds on the
quantum-mechanical formalism but does not derive new physics; it
derives a result about a model of computation. **Information side.**

**Bennett and Brassard 1984 (BB84),** *Proc. IEEE Int. Conf. Computers,
Systems and Signal Processing* (Bangalore), 175–179. Explanandum: a
**cryptographic protocol** whose security follows from the
no-cloning theorem and the measurement-disturbance relation. The
protocol is a key-distribution scheme, not a physical phenomenon.
**Information side.**

**Shor 1994, "Algorithms for Quantum Computation: Discrete Logarithms
and Factoring,"** *Proc. 35th FOCS*, 124–134. Explanandum: a
**polynomial-time algorithm** for an integer-factorization problem.
The result is in computational complexity. **Information side.**

The four papers' upstream physics dependencies (the no-cloning
theorem, unitarity, the quantum measurement formalism) are not the
explananda — they are the apparatus. Compare to the parallel call
chemistry pass-3 §5.1 made for Hohenberg–Kohn 1964: HK is a result
about density functionals (a physics object) used pervasively in
chemistry; HK lives in physics with a cross-link from chemistry. Here,
the four quantum-information papers are results about computation,
communication, and cryptography — information objects — that depend
on quantum mechanics. They live in information with cross-links from
physics.

**Pass-2 final call.** **The four quantum-information entries are
primary in `04-information/quantum-information/`.**
`02-physics/quantum-mechanics/` cross-links from each. The
quantum-mechanical postulates and the no-cloning theorem (Wootters
and Zurek 1982, *Nature* 299, 802–803; Dieks 1982, *Phys. Lett. A*
92, 271) live on the physics side; if no-cloning is later promoted as
a separate canon entry, it goes to `02-physics/quantum-mechanics/`
with a cross-link here.

Holevo 1973 (Holevo's bound) is the borderline case pass-1 §1.10
flagged. Holevo's bound is an information-theoretic limit on accessible
classical information from a quantum source — the explanandum is
information accessibility, not a physical phenomenon. **Promote in
`04-information/quantum-information/`** under c1.

---

## 4. Shannon entropy vs Gibbs entropy — the binding from the info side

Chemistry pass-3 §5.4 made the rule operational. The rule is binding
on chemistry; pass-2 of the information branch writes the **info-side
half of the binding** by literal quotation of pass-3 §5.4.

Quoting chemistry pass-3 §5.4:

> **The two entropies share the same mathematical form `S = −Σ p_i log
> p_i` but are not the same physical quantity:**
>
> - **Gibbs entropy** `S = −k_B Σ p_i ln p_i` has units of **J/K** and
>   counts microstates of a thermodynamic system. It is a property of
>   the *system*.
> - **Shannon entropy** `H = −Σ p_i log₂ p_i` has units of **bits**
>   and quantifies the average information content of a probability
>   distribution. It is a property of the *probability distribution*,
>   not of any physical system.
>
> The two are related by Boltzmann's constant `k_B ln 2 ≈ 9.57 ×
> 10⁻²⁴ J/K per bit` only when one explicitly identifies the
> probability distribution over physical microstates with a Shannon
> source distribution. **That identification is a modeling choice,
> not a derivation.**

And quoting the operative rules:

> 1. **The Gibbs/Boltzmann entropy entry lives in
>    `02-physics/statistical-mechanics/` and is cross-linked from
>    `03-chemistry/thermodynamics/`.** Already covered.
> 2. **The Shannon entropy entry (Shannon 1948, "A Mathematical Theory
>    of Communication," *Bell Syst. Tech. J.* 27, 379–423 and 623–656)
>    lives in `04-information/`.**
> 3. **Jaynes 1957 "Information Theory and Statistical Mechanics"
>    (*Phys. Rev.* 106, 620–630) is the bridge text.** It argues
>    statistical mechanics can be derived from information-theoretic
>    axioms (max-entropy inference). **Promote in `04-information/`**
>    as c1 for information-theoretic statmech; cross-link from
>    `03-chemistry/thermodynamics/`.

### 4.1 Info-side binding

The information branch accepts the rule literally and binds:

- **Shannon 1948 → `04-information/information-theory/`**, anchor
  entry, c1. Edition-of-record: BSTJ original; convenient reprint in
  *Claude Shannon: Collected Papers* (Sloane and Wyner eds., IEEE
  Press, 1993).
- **Jaynes 1957 → `04-information/information-theory/`**, c1 for
  information-theoretic statistical mechanics. Cross-link out to
  `03-chemistry/thermodynamics/` is in. Cross-link out to
  `02-physics/statistical-mechanics/` is added by this pass —
  Jaynes's content is foundations-of-physics in framing and physicists
  are a primary citing population.
- **The Gibbs entropy entry lives in `02-physics/statistical-mechanics/`.**
  Pass-1 of physics confirms this placement (Boltzmann, Gibbs 1902,
  Onsager are listed there). The information branch does not duplicate.
- **The two are formally analogous (`H = −Σ p log p` either way) but
  interpretively distinct (Shannon = uncertainty over a probability
  distribution; Gibbs = entropy of a thermodynamic ensemble).** This
  formula is binding stub-writing language for every information-side
  canon entry that mentions "entropy."
- **Popular-science conflation explicitly disallowed.** The two
  formulas being formally identical does not make the two quantities
  the same physical thing, and the canon does not permit any phrasing
  that elides the distinction. This is a class-1 popular-science
  error per chemistry pass-3 §5.4 and Bucket cannot make it.

### 4.2 Stub-writing rule for the maintainer

Every `04-information/` entry that uses the word "entropy" must
specify **Shannon entropy** explicitly and must not appeal to
thermodynamic intuition without invoking Jaynes 1957 as the explicit
bridge. Symmetrically, every `02-physics/` and `03-chemistry/` entry
that uses the word "entropy" specifies Gibbs or Boltzmann entropy
explicitly. The chemistry side already binds; the information side
binds here.

The Boltzmann constant conversion `k_B ln 2 ≈ 9.57 × 10⁻²⁴ J/K per
bit` may appear in the Jaynes 1957 entry as a derived consequence of
the modeling identification, but it does not appear in the Shannon
1948 entry. Shannon entropy is unitless (or bit-valued under base-2
log); the J/K conversion is not a property of the Shannon-1948 result
itself.

### 4.3 Landauer 1961 — note

Landauer 1961, "Irreversibility and Heat Generation in the Computing
Process," *IBM J. Res. Dev.* 5(3), 183–191 — the thermodynamic cost
of erasure — is a third entry in this neighborhood. Its primary
placement per pass-1 README is `02-physics/`. The information branch
holds a cross-link. Landauer's bound `k_B T ln 2` per erased bit is
the operational physical content of the Shannon/Gibbs identification
when made explicit; it is a physics result whose information-theoretic
significance is downstream. The placement does not change at pass-2.

---

## 5. Pass-1 contestable calls — adjudication

Pass-1 §4 flagged seven contestable calls. §4(1) (Friedman) is
adjudicated in §1 above. The remaining six get explicit calls here,
with reasoning bound to the README c1/c2/c3 rule and the chemistry
pass-3 §3 tightenings.

### 5.1 Bellare–Rogaway 1993 — the random oracle paper

Bellare and Rogaway 1993, "Random Oracles are Practical: a Paradigm
for Designing Efficient Protocols," *Proc. 1st CCS*, 62–73,
doi:10.1145/168588.168596.

The case for c1: the random-oracle methodology became the dominant
proof framework in practical cryptography for two decades and licensed
the security analyses of essentially every deployed public-key
primitive (OAEP, PSS, FDH, the IBE constructions). The paper
originates the methodology as a deliberate paradigm.

The case against: Canetti, Goldreich, Halevi 1998 ("The Random Oracle
Methodology, Revisited," *Proc. 30th STOC*, 209–218; expanded in *J.
ACM* 51(4), 557–594, 2004) proved the methodology unsoundable in
general — there exist signature and encryption schemes that are secure
in the random-oracle model but insecure with **any** instantiation of
the oracle by a real hash function. The methodology is therefore not
a foundation in the same sense as Shannon 1949 or Diffie–Hellman 1976.

Apply the explanandum test from §3 and the chemistry pass-3 §3.1 rule
on originator-monograph-vs-paper (which generalizes naturally to
"originator-method-vs-result"):

The Bellare–Rogaway 1993 paper's explanandum is a **proof technique** —
a way of getting efficient and analyzable protocols by replacing a
hash function with an idealized random oracle. The technique is
methodologically primary; the technique is also known to be unsound
under adversarial instantiation. A foundational primitive in
cryptography (as the c1 examples show: a one-way function, a
pseudorandom generator, a public-key trapdoor permutation) is an
*object* whose existence or hardness is the foundational claim. The
random oracle is not such an object; it is a heuristic.

**Pass-2 ruling.** **Bellare–Rogaway 1993 promotes under c3 as a
discipline-recognized methodological reference, not under c1.** The
entry's tier-tag is `methodology` rather than `originator-primitive`.
File in `cryptography/foundations/` next to the c1 primitives, with an
explicit cross-reference to Canetti–Goldreich–Halevi 1998 in the
entry's body to record the unsoundability result. Do not open a
`cryptography/methodology/` sub-fold for one paper.

The c3 promotion here uses the chemistry pass-3 §3.4 counter-rule's
"professional consensus equivalent to a standards body" clause: the
random-oracle methodology is in fact treated as the working idealized
model for protocol analysis across the IACR conferences (CRYPTO,
EUROCRYPT, TCC) and the NIST post-quantum standardization process,
which is the closest the field has to a standards body. This is the
edge of what c3 admits; the entry must be re-tested if a stronger
unsoundability result lands.

### 5.2 Lempel–Ziv 1977 / 1978 — split the call

Lempel and Ziv 1977, "A Universal Algorithm for Sequential Data
Compression," *IEEE Trans. Inf. Theory* IT-23(3), 337–343, and Ziv and
Lempel 1978, "Compression of Individual Sequences via Variable-Rate
Coding," *IEEE Trans. Inf. Theory* IT-24(5), 530–536.

Pass-1 §4(3) suggested splitting the call — promote the universality
result, file the algorithms-qua-algorithms in `reference/`. Pass-2
ratifies the split with explicit reasoning.

The 1977 paper contains two distinct contributions: (i) the LZ77
sliding-window algorithm itself, and (ii) the **universality
theorem** — that the algorithm achieves the entropy rate of any
stationary ergodic source without prior knowledge of the source
distribution. The universality theorem is the foundational content;
the algorithm is the constructive witness. The 1978 paper (LZ78)
extends the universality result to individual sequences via the
Kolmogorov-Sinai-style notion of complexity for individual sequences.

**Pass-2 ruling.** **Both papers promote under c1 in
`compression-sampling/`** for the **universality results**, not for
the algorithms qua algorithms. The entry stub for each paper records
the theorem as the canon-tier content; the algorithm is described
operationally as the constructive witness but is not itself the
canon claim. The downstream LZ-family compressors (LZW, gzip, DEFLATE,
zstd) are landscape and do not file as canon. RFC 1951 (DEFLATE) does
not promote.

This is the same structural move chemistry pass-3 made for Hammett:
promote the originator paper for the mechanism (LFER for Hammett, the
universality theorem for LZ), not the downstream tabulations or
algorithmic refinements.

### 5.3 IETF RFC inclusion — apply the rule strictly

Pass-1 §4(4) named the risk that `reference/` becomes a wedge for
promoting infrastructure documents one engineering committee at a
time. The README's c3 condition admits "IETF and ISO/IEC normative
documents only when the document originates the primitive itself,"
exemplified by RFC 2104 (HMAC) and FIPS-197 (AES).

Apply the chemistry pass-3 §3.4 counter-rule to the RFC question:
"normative" means published, maintained, or formally adopted by a
standards body. The IETF and NIST are standards bodies in the
relevant operational sense — they originate, maintain, and adopt the
primitives the field uses. The c3 admission is therefore well-formed.
But the originating-vs-composing distinction must be applied
mechanically.

**Pass-2 ruling.**

- **RFC 2104 (1997), Krawczyk, Bellare, Canetti, "HMAC: Keyed-Hashing
  for Message Authentication" — promote under c3.** The HMAC
  construction is originated in this document. (Note: the academic
  paper Bellare, Canetti, Krawczyk 1996, "Keying Hash Functions for
  Message Authentication," *CRYPTO '96*, LNCS 1109, 1–15, is the
  originator paper for the HMAC security proof; promote it in
  `cryptography/foundations/` as c1 alongside the RFC. The RFC is the
  normative-spec entry; the paper is the originator-result entry.
  Both entries cross-reference each other.)
- **FIPS PUB 197 (2001), "Advanced Encryption Standard (AES)" —
  promote under c3.** Originates AES as the normative primitive.
  Daemen and Rijmen's Rijndael paper ("AES Proposal: Rijndael," AES
  Round 1 submission, 1998; expanded as Daemen and Rijmen, *The
  Design of Rijndael*, Springer, 2002) is the originator design
  document; promote in `cryptography/foundations/` as c1. The FIPS
  document is the normative-spec entry; the design document is the
  originator-design entry.
- **RFC 8017 (2016), "PKCS #1: RSA Cryptography Specifications
  Version 2.2" — do not promote.** Composes RSA (already canon via
  Rivest–Shamir–Adleman 1978) with OAEP and PSS padding, themselves
  originated in academic papers (Bellare–Rogaway 1994 for OAEP).
  Landscape.
- **RFC 8446 (2018), "TLS 1.3" — do not promote.** Composes
  primitives. Pass-1 already excluded it; pass-2 ratifies.
- **RFC 9000 (2021), "QUIC" — do not promote.** Composes TLS 1.3 and
  congestion-control primitives.
- **FIPS PUB 180-4 (2015), "Secure Hash Standard (SHS)" — promote
  under c3.** Originates SHA-2 family as normative primitives.
  Cross-link to NIST SP 800-185 (2016) for SHA-3 derived functions
  (SHA-3 itself originated in NIST FIPS PUB 202 (2015), promote that
  too — SHA-3 is Keccak, Bertoni, Daemen, Peeters, Van Assche).
- **IETF RFCs that document a previously-published academic primitive
  (RFC 5869 HKDF, RFC 7748 Curve25519, RFC 8032 Ed25519) — file as
  `reference/` pointers but do not promote.** The originator paper
  promotes; the RFC is a normative specification that the canon
  records but does not duplicate.

The line that pass-1 worried might erode is held: an RFC promotes
under c3 only when it **originates** a primitive. An RFC that
**specifies** an academically-originated primitive is `reference/`
landscape. The originating-vs-specifying test is mechanical and the
sub-fold does not become a wedge.

### 5.4 Holevo 1973

Promoted in §3 above. Citation: A. S. Holevo, "Bounds for the Quantity
of Information Transmitted by a Quantum Communication Channel,"
*Problems of Information Transmission* 9(3), 177–183, 1973. c1.
Quantum-information sub-fold.

### 5.5 Berrou, Glavieux, Thitimajshima 1993 — turbo codes

The near-Shannon-limit achievement is a landmark engineering result
that approaches but does not establish a foundational limit. The limit
is Shannon 1948's noisy-channel theorem; turbo codes are the
constructive witness that the limit is approachable in practice with
iterative decoding. Apply the chemistry pass-3 §3.4 counter-rule:
turbo codes are not a normative standards-body output (they are
patented and were litigated extensively), and the engineering result
is downstream of a foundational result already in canon.

**Pass-2 ruling.** **Do not promote.** Landscape. The downstream
LDPC-codes work (Gallager 1962, "Low-Density Parity-Check Codes,"
*IRE Trans. Inf. Theory* 8(1), 21–28, doi:10.1109/TIT.1962.1057683)
is the borderline alternative — Gallager 1962 is older and is the
parity-check-code originator; pass-2 promotes Gallager 1962 under
c1 in `coding-theory/` as a third entry alongside Hamming 1950 and
Reed–Solomon 1960, and treats the modern turbo / LDPC re-discovery
as engineering downstream.

### 5.6 Kleene 1952 — *Introduction to Metamathematics*

The text is a synthesizing monograph, not a primary statement. Its
content (recursion theory, partial recursive functions, the s-m-n
theorem, the recursion theorem) is from Kleene's 1930s and 1940s
papers (Kleene 1936, "General Recursive Functions of Natural
Numbers," *Math. Ann.* 112, 727–742, doi:10.1007/BF01565439; Kleene
1938, "On Notation for Ordinal Numbers," *J. Symbolic Logic* 3,
150–155). Apply the chemistry pass-3 §3.1 rule on
originator-monograph-vs-originator-paper: does the monograph contain a
load-bearing element that the originator papers do not contain? The
1952 monograph contains the **synthesis** of recursion theory as a
unified subject, including the modern statement of the recursion
theorem in its now-canonical form. This is a genuine load-bearing
element.

**Pass-2 ruling.** Promote Kleene 1952 under c2 (edition-of-record for
the unified recursion-theory presentation). Promote Kleene 1936 under
c1 in `computation/` as the originator paper for general recursive
functions. Branch placement: **`04-information/computation/`** for
both, with cross-link from `01-mathematics/foundations/`. The
recursion-theory content is computation-side per the explanandum test
(the object is the class of computable functions, not the formal
system that defines them).

---

## 6. Cross-branch entry list

The information branch will be cited from every other canon branch.
This table is the explicit list of entries that pass-2 expects to see
cross-linked from elsewhere, with the cited-from branches and the
reason for the citation.

This table is not the complete information-canon manifest (see
`CANON_INDEX.md`); it is only the entries that are load-bearing for
**other** branches and that the maintainer needs to wire as
cross-links during pass-3 of those branches.

| Info entry | Cited from | Reason |
|------------|------------|--------|
| Shannon 1948, *BSTJ* 27, 379–423 + 623–656 | `01-mathematics/probability/`, `02-physics/statistical-mechanics/`, `03-chemistry/thermodynamics/`, `05-biophysics/`, `07-mind/` | Anchor for any branch that uses the word "entropy" in the information-theoretic sense. Math cross-links because Shannon inherits the measure-theoretic apparatus from Kolmogorov 1933. Physics and chemistry cross-link via the §4 binding (formal analogy, interpretive distinctness). Biophysics cross-links because information-theoretic measures appear pervasively in neural-coding and genome-information contexts. Mind cross-links for the same reason via theories of perceptual coding and free-energy formulations. |
| Jaynes 1957, *Phys. Rev.* 106, 620–630 | `02-physics/statistical-mechanics/`, `03-chemistry/thermodynamics/` | Bridge text per chemistry pass-3 §5.4 binding. The maximum-entropy formulation of statistical mechanics. Physics cross-links for the foundations-of-physics framing; chemistry cross-links for the equilibrium-distribution applications. |
| Turing 1936, *PLMS* (2) 42, 230–265 | `01-mathematics/foundations/`, `07-mind/cognitive-science/` | Math cross-links because the Entscheidungsproblem is a problem in mathematical logic and because the universal-machine construction is a result in metamathematics. Mind cross-links because computational theories of cognition (the computational theory of mind, Marr 1982, Newell-Simon physical-symbol-system hypothesis 1976) cite Turing 1936 as the foundational claim that cognition-as-computation is even well-defined. |
| Church 1936, *Amer. J. Math.* 58, 345–363 | `01-mathematics/foundations/`, `07-mind/cognitive-science/` | Math: lambda calculus as a formal system. Mind: lambda-calculus-based theories of compositionality (Montague semantics, modern type-theoretic semantics) cite Church. |
| Gödel 1931 *cross-link to math (primary placement)* | n/a — primary in math | The information branch holds a cross-link out, not in. |
| Kolmogorov 1965, *Problems of Inf. Trans.* 1(1), 1–7 | `01-mathematics/probability/`, `02-physics/statistical-mechanics/` | Math: algorithmic complexity as a measure-theoretic refinement of probability. Physics: Kolmogorov complexity appears in the algorithmic-statistical-mechanics literature (the Bennett-style accounts of "logical depth" and the Lloyd-Pagels formulation of computational thermodynamics). Cite carefully — Kolmogorov complexity is uncomputable; physics applications must specify the resource bound. |
| Solomonoff 1964, *Inf. and Control* 7(1), 1–22 + 7(2), 224–254 | `07-mind/cognitive-science/` | Solomonoff induction is the formal substrate of the universal-prior framework cited in Bayesian-brain and AIXI-adjacent cognitive-science theories. Cite carefully — Solomonoff induction is uncomputable and cognitive-science applications must specify approximation. |
| Vapnik–Chervonenkis 1971, *Theory Probab. Appl.* 16(2), 264–280 | `07-mind/cognitive-science/` | VC dimension is the foundational generalization-bound result. Theories of cognitive generalization (Tenenbaum-style Bayesian concept learning, the no-free-lunch theorems applied to perception) cite VC theory as the limit on what any learner — biological or artificial — can do. |
| Valiant 1984, *Comm. ACM* 27(11), 1134–1142 | `07-mind/cognitive-science/` | PAC learning is the parallel canonical-limit result for distributional learning. |
| Cook 1971, *STOC* 3, 151–158 + Karp 1972 | `01-mathematics/` | Math cross-links because NP-completeness as a *reducibility relation* is a result in combinatorial mathematics; the reduction-equivalence classes are the object. |
| Diffie–Hellman 1976, *IEEE Trans. Inf. Theory* IT-22(6), 644–654 | `08-deep-history/` | Cross-link in only — the deep-history branch will hold the contextual document (the NSA's reaction, the Inman intervention, the academic-vs-classified split). The primary entry stays here. |
| Shannon 1949, *BSTJ* 28(4), 656–715 | `08-deep-history/cryptology-history/` | Cross-link in. The deep-history branch may also cite the Friedman pedagogical-primary tier as a paired entry per gov-declassified pass-2 §4.4. |
| Friedman *Military Cryptanalysis* I–IV | `08-deep-history/cryptology-history/` | Primary placement here under c3 pedagogical-primary; deep-history cross-links for the SIS-history context. |
| Landauer 1961 *cross-link to physics (primary placement)* | n/a — primary in physics | Cross-link out. |

### 6.1 The Marcus 1956 ↔ Shannon channel-capacity analogy — the careful flag

Pass-2 was asked to flag Marcus 1956 (electron-transfer theory) as a
candidate cross-link to Shannon's channel-capacity result, with the
note that the analogy can be misleading.

**Marcus 1956**, R. A. Marcus, "On the Theory of Oxidation–Reduction
Reactions Involving Electron Transfer. I," *J. Chem. Phys.* 24(5),
966–978, doi:10.1063/1.1742723. Primary placement is
`03-chemistry/electrochemistry/` per chemistry pass-3 §5.3 ("Marcus
framed the result as a theory of chemical electron transfer").

The analogy: Marcus's expression for electron-transfer rate as a
function of reorganization energy and driving force has a
mathematical surface resembling the rate-distortion treatment of a
noisy channel. There exists a small literature (largely in
biophysical reviews of long-range electron transfer in proteins) that
informally invokes Shannon channel capacity to discuss
electron-transfer efficiency in biological contexts.

**The analogy is a class-2 popular-science error** (not class-1
because it is not the entropy conflation, but adjacent). The
Marcus expression derives a chemical rate from microscopic
parameters; channel capacity is an information-theoretic limit on a
communication channel under a probabilistic model of noise. There is
no formal correspondence between the two beyond superficial
mathematical resemblance, and any cross-link from the chemistry side
to Shannon must explicitly state that the relationship is analogical,
not derivational.

**Pass-2 ruling on the cross-link.** **Do not write a Marcus 1956 ↔
Shannon 1948 cross-link in either direction.** If a cross-link from
Marcus 1956 to information theory is later wanted on a per-paper
basis (e.g., a specific biophysics review that uses the analogy
defensibly), the cross-link annotation must read "analogical, not
derivational; cf. cross-branch pass-2 §6.1." The default is no link.

This is the same epistemic-hygiene call chemistry pass-3 §5.4 made
for Shannon vs Gibbs entropy, applied at one remove. The information
canon does not advertise itself as the foundation of every chemistry
result whose mathematical surface looks information-theoretic.

---

## 7. Summary of pass-2 binding rulings

For convenience and for the report-back. All seven rulings are
recorded as binding for pass-3 unless the maintainer overrides
explicitly.

1. **Friedman pedagogical-primary tier — KEPT.** §1.1 verifies the
   release (April 2015 NSA Friedman Collection); the FOIA case
   number 60494 itself is unconfirmed and entries carry a
   `foia_case_number_unverified` tag. §1.2 rejects the Knuth wedge.
   §1.3 writes the one-paragraph definition. §1.4 confirms the
   sub-fold survives.
2. **Church 1936 — `04-information/computation/`** with cross-link
   from `01-mathematics/foundations/`. Both branches agree.
3. **Quantum-information four entries (Feynman 1982, Deutsch 1985,
   BB84, Shor 1994) — `04-information/quantum-information/`**, with
   cross-links from `02-physics/quantum-mechanics/`. Holevo 1973
   added under c1.
4. **Shannon entropy vs Gibbs entropy** — info-side binding written
   per chemistry pass-3 §5.4 quoted literally. Stub-writing rule for
   maintainer recorded.
5. **Bellare–Rogaway 1993** — c3 methodology, not c1. Filed in
   `cryptography/foundations/` with `methodology` tier-tag and
   cross-reference to Canetti–Goldreich–Halevi 1998.
6. **Lempel–Ziv 1977/1978** — split call. Both promote under c1 for
   the universality theorems; downstream LZ-family compressors are
   landscape.
7. **IETF RFC inclusion** — strict originating-vs-specifying test.
   RFC 2104, FIPS-197, FIPS-180-4, FIPS PUB 202 promote under c3.
   RFC 8017, 8446, 9000 do not. Originator academic papers (BCK 1996
   for HMAC, Daemen-Rijmen for AES, Keccak team for SHA-3) promote
   alongside under c1.
8. **Berrou et al. 1993 turbo codes** — landscape. Gallager 1962 LDPC
   added under c1 to `coding-theory/` instead.
9. **Kleene 1952** — promote under c2 in `computation/`. Kleene 1936
   added under c1.
10. **Marcus 1956 ↔ Shannon 1948** — no cross-link. Class-2
    popular-science-adjacent analogy.

End of pass-2 cross-branch memo.
