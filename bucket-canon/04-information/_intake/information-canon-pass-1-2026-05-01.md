# 04-information — Pass-1 Sweep Memo

Date: 2026-05-01
Sweep: opens the branch, inventories candidate canon entries, proposes the
sub-domain map, settles boundary calls, and flags contestable calls for pass-2.

The branch was opened in response to two dangling cross-links from prior
sweeps:

- Chemistry pass-3 §5.4 binds the Shannon-entropy / Gibbs-entropy
  non-conflation here.
- Gov-declassified pass-2 §4 names Friedman *Military Cryptanalysis* and
  Shannon 1949 as the cryptography canon-tier pair, both targeted here.

Both bindings are honored in this pass.

---

## 1. Inventory of candidate canon entries

Each entry: edition-of-record, mechanism justification, strong/borderline
flag. ~38 entries. Pass-2 will adjudicate borderline calls and prune.

### 1.1 Computation

- **Turing 1936.** "On Computable Numbers, with an Application to the
  Entscheidungsproblem," *Proc. Lond. Math. Soc.* (2) 42, 230–265.
  doi:10.1112/plms/s2-42.1.230. Originates the universal machine model and
  proves the Entscheidungsproblem unsolvable. Edition-of-record: 1936
  *PLMS* paper plus the 1937 correction; reprinted in Davis ed. *The
  Undecidable* (1965) and Copeland ed. *The Essential Turing* (Oxford 2004).
  **Strong c1.**
- **Church 1936.** "An Unsolvable Problem of Elementary Number Theory,"
  *American Journal of Mathematics* 58, 345–363. doi:10.2307/2371045. Lambda
  calculus and the Church thesis. **Strong c1**, with cross-citation from
  `01-mathematics/foundations/` (see boundary calls §3).
- **Post 1936.** "Finite Combinatory Processes — Formulation 1," *J.
  Symbolic Logic* 1(3), 103–105. doi:10.2307/2269031. Independent
  formulation contemporaneous with Turing. **Strong c1.**
- **Gödel 1931.** "Über formal unentscheidbare Sätze der Principia
  Mathematica und verwandter Systeme I," *Monatshefte für Mathematik und
  Physik* 38, 173–198. **Cross-link only** — primary placement is
  `01-mathematics/foundations/`. See §3.
- **Kleene 1952.** *Introduction to Metamathematics* (North-Holland).
  **Borderline c2/c3** — synthesizes recursion theory, partial recursive
  functions, the s-m-n and recursion theorems in their now-canonical form.
  Pass-2 should decide whether it sits here or in `01-mathematics/`.
- **von Neumann 1945.** *First Draft of a Report on the EDVAC* (Moore
  School). The architecture document. **Strong c1** for stored-program
  architecture. Edition-of-record: Stern 1981 reproduction, IEEE Annals
  reprint 1993.

### 1.2 Information theory

- **Hartley 1928.** "Transmission of Information," *Bell Syst. Tech. J.*
  7(3), 535–563. The pre-Shannon log-of-symbols measure. **Strong c1** for
  the pre-Shannon information measure.
- **Nyquist 1928.** "Certain Topics in Telegraph Transmission Theory,"
  *Trans. AIEE* 47, 617–644. The sampling-rate result. **Strong c1.**
- **Shannon 1948.** "A Mathematical Theory of Communication," *Bell Syst.
  Tech. J.* 27, 379–423 and 623–656. doi:10.1002/j.1538-7305.1948.tb01338.x
  and tb00917.x. **The c1 of information theory.** Edition-of-record: BSTJ
  original; *Claude Shannon: Collected Papers* (Sloane and Wyner eds.,
  IEEE Press 1993). **Strong c1, anchor entry.**
- **Shannon and Weaver 1949.** *The Mathematical Theory of Communication*
  (University of Illinois Press). Monograph reprint of Shannon 1948 with
  Weaver's expository chapter. **c2** edition-of-record for many citers.
- **Jaynes 1957.** "Information Theory and Statistical Mechanics," *Phys.
  Rev.* 106, 620–630. doi:10.1103/PhysRev.106.620. The bridge text per
  chemistry pass-3 §5.4. **Strong c1.**

### 1.3 Coding theory

- **Hamming 1950.** "Error Detecting and Error Correcting Codes," *Bell
  Syst. Tech. J.* 29, 147–160. **Strong c1.**
- **Reed and Solomon 1960.** "Polynomial Codes Over Certain Finite Fields,"
  *J. SIAM* 8(2), 300–304. doi:10.1137/0108018. **Strong c1.**
- **Berrou, Glavieux, Thitimajshima 1993.** "Near Shannon Limit
  Error-Correcting Coding and Decoding: Turbo-codes," *Proc. ICC '93*,
  1064–1070. **Borderline.** A landmark engineering achievement that
  approaches the Shannon limit in practice; whether it is foundation or
  near-foundation is a pass-2 call.

### 1.4 Algorithmic information theory

The four-author lineage here is the foundational chain. All four belong as
c1 entries — algorithmic information theory has multiple independent
originators converging on the same object (Kolmogorov complexity), and the
canon must represent the convergence rather than picking a single
"originator."

- **Solomonoff 1964.** "A Formal Theory of Inductive Inference," Parts I
  and II, *Information and Control* 7(1), 1–22 and 7(2), 224–254. The
  earliest of the four. **Strong c1.**
- **Kolmogorov 1965.** "Three Approaches to the Quantitative Definition of
  Information," *Problems of Information Transmission* 1(1), 1–7. **Strong
  c1.**
- **Chaitin 1966 / 1969.** "On the Length of Programs for Computing Finite
  Binary Sequences," *J. ACM* 13(4), 547–569 and *J. ACM* 16(1), 145–159.
  **Strong c1.**
- **Levin 1973.** "Universal Sequential Search Problems," *Problems of
  Information Transmission* 9(3), 265–266. The universal search construction
  and the independent NP-completeness result. **Strong c1**, dual entry
  with §1.5.

### 1.5 Computational complexity

- **Cobham 1965.** "The Intrinsic Computational Difficulty of Functions,"
  *Proc. 1964 Cong. Logic, Methodology, and Philosophy of Science*,
  24–30. The polynomial-time class as a thesis. **Strong c1.**
- **Edmonds 1965.** "Paths, Trees, and Flowers," *Canad. J. Math.* 17,
  449–467. doi:10.4153/CJM-1965-045-4. The other half of the polynomial-time
  thesis. **Strong c1.**
- **Cook 1971.** "The Complexity of Theorem-Proving Procedures," *Proc.
  3rd STOC*, 151–158. doi:10.1145/800157.805047. **Strong c1.** The
  Cook–Levin theorem.
- **Karp 1972.** "Reducibility Among Combinatorial Problems," in *Complexity
  of Computer Computations*, Plenum, 85–103. The 21 NP-complete problems.
  **Strong c1.**
- **Levin 1973.** Dual entry — see §1.4.

### 1.6 Cryptography (mathematical foundations)

- **Shannon 1949.** "Communication Theory of Secrecy Systems," *Bell Syst.
  Tech. J.* 28(4), 656–715. doi:10.1002/j.1538-7305.1949.tb00928.x. Perfect
  secrecy, unicity distance, the information-theoretic framing of
  cryptography. **Strong c1, anchor entry.** Edition-of-record per
  gov-declassified pass-2 §4.2: the 1949 BSTJ original; convenient reprint
  in *Claude Shannon: Collected Papers* (IEEE 1993).
- **Diffie and Hellman 1976.** "New Directions in Cryptography," *IEEE
  Trans. Information Theory* IT-22(6), 644–654.
  doi:10.1109/TIT.1976.1055638. Public-key exchange. **Strong c1.**
- **Rivest, Shamir, Adleman 1978.** "A Method for Obtaining Digital
  Signatures and Public-Key Cryptosystems," *Comm. ACM* 21(2), 120–126.
  doi:10.1145/359340.359342. **Strong c1.**
- **Goldwasser and Micali 1984.** "Probabilistic Encryption," *J. Comput.
  Syst. Sci.* 28(2), 270–299. doi:10.1016/0022-0000(84)90070-9. Semantic
  security. **Strong c1.**
- **Goldwasser, Micali, Rackoff 1989.** "The Knowledge Complexity of
  Interactive Proof Systems," *SIAM J. Comput.* 18(1), 186–208
  (conference 1985 STOC). Zero-knowledge. **Strong c1.**
- **Bellare and Rogaway 1993.** "Random Oracles are Practical: a
  Paradigm for Designing Efficient Protocols," *Proc. 1st CCS*, 62–73.
  **Borderline c1/c3.** Either a foundational primitive (the random oracle
  methodology) or a proof technique elevated to convention. Pass-2 to
  adjudicate.

### 1.7 Cryptography (pedagogical primary, declassified)

- **Friedman 1938–1941.** *Military Cryptanalysis* Vols. I–IV, Signal
  Intelligence Service. Declassified April 2015 in the NSA Friedman
  Collection (NSA Cryptologic Heritage portal; mirrored at
  archive.org/details/nsa-friedman). FOIA case 60494 cited in
  gov-declassified pass-2 (case number itself unconfirmed at the
  document level — pass-2 of this branch should verify against the NSA
  release index). **c3 — pedagogical-primary tier per gov-declassified
  pass-2 §4.2 and §4.4.** Files into `cryptography/pedagogical-primary/`.
  Citation key: `nsa.friedman.mc.<vol>`.
- **Friedman and Callimahos 1956–1977.** *Military Cryptanalytics* Vols.
  I–III, NSA. Declassified in tranches. **c3 with caveat** — expanded
  successor to *Military Cryptanalysis*, not an independent work. File next
  to Friedman with explicit cross-reference.

The two-sub-fold structure (`foundations/` vs `pedagogical-primary/`) is
intentional — see §3.

### 1.8 Learning theory

- **Vapnik and Chervonenkis 1971.** "On the Uniform Convergence of
  Relative Frequencies of Events to their Probabilities," *Theory of
  Probability and Its Applications* 16(2), 264–280.
  doi:10.1137/1116025. **Strong c1.**
- **Valiant 1984.** "A Theory of the Learnable," *Comm. ACM* 27(11),
  1134–1142. doi:10.1145/1968.1972. PAC learning. **Strong c1.**

### 1.9 Compression and sampling

- **Lempel and Ziv 1977.** "A Universal Algorithm for Sequential Data
  Compression," *IEEE Trans. Information Theory* IT-23(3), 337–343.
  doi:10.1109/TIT.1977.1055714. **Borderline.** See §4.
- **Ziv and Lempel 1978.** "Compression of Individual Sequences via
  Variable-Rate Coding," *IEEE Trans. Information Theory* IT-24(5),
  530–536. doi:10.1109/TIT.1978.1055934. **Borderline.**
- **Shannon–Nyquist sampling.** Already covered by Nyquist 1928 and
  Shannon 1949 ("Communication in the Presence of Noise," *Proc. IRE*
  37(1), 10–21). Single combined entry.

### 1.10 Quantum information

- **Feynman 1982.** "Simulating Physics with Computers," *Int. J. Theor.
  Phys.* 21(6/7), 467–488. doi:10.1007/BF02650179. **Strong c1.**
- **Deutsch 1985.** "Quantum Theory, the Church–Turing Principle and the
  Universal Quantum Computer," *Proc. Roy. Soc. Lond. A* 400(1818), 97–117.
  **Strong c1.**
- **Bennett and Brassard 1984.** "Quantum Cryptography: Public Key
  Distribution and Coin Tossing," *Proc. IEEE Int. Conf. Computers,
  Systems and Signal Processing* (Bangalore), 175–179. The BB84 protocol.
  **Strong c1.**
- **Shor 1994.** "Algorithms for Quantum Computation: Discrete Logarithms
  and Factoring," *Proc. 35th FOCS*, 124–134.
  doi:10.1109/SFCS.1994.365700. **Strong c1.**

Holevo 1973 (Holevo's bound) is a strong candidate addition; pass-2 to
decide.

### 1.11 Reference / normative

- **RFC 2104 (1997).** Krawczyk, Bellare, Canetti, "HMAC: Keyed-Hashing for
  Message Authentication." **Borderline c3** — originates the HMAC
  primitive. See §4.
- **FIPS PUB 197 (2001).** "Advanced Encryption Standard (AES)." NIST.
  Originates AES as a normative primitive (Daemen and Rijmen's Rijndael
  selected and standardized). **Borderline c3.**
- **RFC 8446 (2018).** "The Transport Layer Security (TLS) Protocol Version
  1.3." **Landscape, not canon** — composes existing primitives.
- ISO/IEC 10118 family (hash functions), ISO/IEC 18033 (encryption
  algorithms): **landscape**, cite as pointers from `reference/` if at all.

---

## 2. Sub-domain map / proposed folder tree

```
04-information/
  README.md
  CANON_INDEX.md
  _intake/
  computation/
  information-theory/
  coding-theory/
  algorithmic-information/
  complexity/
  cryptography/
    foundations/
    pedagogical-primary/
  learning-theory/
  compression-sampling/
  quantum-information/
  reference/
```

The two-tier `cryptography/` sub-fold is intentional and binding from
gov-declassified pass-2 §4.2 and §4.4. Friedman is pedagogical-primary;
Shannon 1949 is foundation. They are adjacent, not collapsed. Reasoning:

- **Reader-facing.** A reader looking for "the foundational mathematical
  theory of secrecy" wants Shannon 1949 (26 pp). A reader looking for "the
  systematic primary teaching of classical cryptanalysis" wants Friedman
  (~1500 pp across four volumes). Bundling the two tiers under a single
  folder forces every visitor through a sort step.
- **Epistemically.** Shannon 1949 is c1 in the strict originator sense.
  Friedman is c3 — discipline-standard pedagogical-primary by the
  practitioner who built the field. Conflating the tiers would erode the
  promotion rule.
- **Operationally.** When `cryptography/modern/` opens (Diffie–Hellman, RSA,
  GM, GMR), it sits under `foundations/` as a sub-fold or as a sibling. The
  Friedman tier stays separate either way.

`reference/` is a sub-fold for normative documents that originate primitives
(RFC 2104, FIPS-197). Documents that compose primitives (TLS, QUIC, IPsec)
are landscape and do not file here.

---

## 3. Boundary calls

### 3.1 Shannon entropy vs Gibbs entropy

Bound to chemistry pass-3 §5.4 by literal quotation in the README. The
operational rule:

- The Shannon 1948 entry lives in `information-theory/` here.
- The Jaynes 1957 entry lives in `information-theory/` here as a c1 for
  information-theoretic statmech, cross-linked from
  `03-chemistry/thermodynamics/`.
- The Gibbs entropy entry stays in `02-physics/statistical-mechanics/`.
- No silent identification of the two. Stub-writing rule: every
  information-theoretic entry that mentions "entropy" specifies Shannon
  entropy explicitly; every chemistry entry specifies Gibbs entropy
  explicitly. Pass-3 chemistry already binds the chemistry side; this pass
  binds the information side.

### 3.2 Turing / Church / Gödel — when does 01-mathematics hand off

Pass-1 verdict, with reasoning the maintainer can override in pass-2:

- **Gödel 1931 → `01-mathematics/foundations/`.** The result is about
  formal arithmetic and the limits of axiomatic systems. The object is the
  formal system. Information-branch readers reach Gödel 1931 by cross-link.
- **Turing 1936 → here.** The object is the machine. The Entscheidungsproblem
  is solved by *constructing a mechanical procedure* and showing the
  construction cannot succeed. The mechanical-procedure framing is what
  makes Turing 1936 the founding text of computation rather than a
  metamathematics paper. `01-mathematics/foundations/` cross-links.
- **Church 1936 → here, with cross-link from `01-mathematics/foundations/`.**
  The lambda calculus is a formal system in the mathematical-logic
  tradition, but its uptake and downstream development are computational.
  Pass-1 places it here by the *downstream-use* test; pass-2 may reverse.
- **Kleene 1952 → contested**, see inventory §1.1. Pass-2 to decide.

### 3.3 Quantum information

Own sub-fold here (`quantum-information/`) for the information-theoretic
results: BB84, Shor, Deutsch, Feynman, Holevo if promoted. The physics of
the substrate (decoherence, the measurement problem, canonical
quantization) lives in `02-physics/quantum-mechanics/`. Every entry
cross-links. This is the same pattern chemistry uses for `quantum-chemistry/`
vs physics — a downstream-discipline sub-fold that does not duplicate the
upstream physics canon.

### 3.4 Algorithmic information theory vs probability foundations

Solomonoff 1964 / Kolmogorov 1965 / Chaitin 1966 / Levin 1973 → here, in
`algorithmic-information/`. Kolmogorov 1933 (the measure-theoretic axioms
of probability) → `01-mathematics/`. The two Kolmogorov contributions are
distinct objects.

---

## 4. Contestable calls flagged for pass-2

1. **Friedman pedagogical-primary tier — does it actually pass the
   promotion rule?** Gov-declassified pass-2 §4.2 makes the call at c3.
   Pass-1 of this branch accepts it provisionally because Friedman is the
   only candidate that occupies the "systematic primary pedagogy by the
   field-founding practitioner" slot. Pass-2 must verify three things: (a)
   that the c3 promotion rule actually licenses the Friedman tier and is
   not being stretched to fit; (b) that no other text in the inventory has
   a parallel claim that would force opening pedagogical-primary sub-folds
   in other sub-domains (Knuth's *The Art of Computer Programming* is the
   obvious test case — pass-1 leans no, but documents the question); (c)
   that the FOIA case number 60494 cited in gov-declassified pass-2 is
   verifiable against the NSA release index. Pass-1's adjudication on the
   sub-fold is in the report-back below.

2. **Bellare–Rogaway 1993 random oracle model.** Either a foundational
   primitive (the methodology became the dominant proof framework in
   practical cryptography) or a proof technique elevated by convention
   (the random oracle is known to be unsoundable in the standard model;
   Canetti–Goldreich–Halevi 1998). Pass-2 should call it.

3. **Lempel–Ziv 1977 / 1978.** Foundational (universal compression with no
   knowledge of the source distribution, the universality theorem) or
   engineering (the LZ77/LZ78 algorithms became the substrate of every
   subsequent compressor)? The universality result is foundational; the
   algorithms qua algorithms are engineering. Pass-2 should split the
   call: promote the universality result, file the algorithms in
   `reference/` as pointers if at all.

4. **Any IETF RFC at all.** RFC 2104 (HMAC) and FIPS-197 (AES) originate
   primitives that the field then uses as black-box building blocks; this
   is a different epistemic relationship than RFC 8446 (TLS), which
   composes existing primitives into a protocol. The c3 promotion rule
   licenses the originating documents but pass-2 must decide whether the
   line holds — there is a real risk the `reference/` sub-fold becomes a
   wedge for promoting infrastructure documents one engineering committee
   at a time.

5. **Holevo 1973.** Strong candidate addition to `quantum-information/` not
   in pass-1's named inventory list. Pass-2 to add or reject.

6. **Berrou, Glavieux, Thitimajshima 1993 turbo codes.** Borderline. The
   near-Shannon-limit achievement is a landmark; whether it is foundation
   or near-foundation engineering is a pass-2 call.

7. **Kleene 1952 *Introduction to Metamathematics*.** Borderline c2/c3.
   Pass-2 to decide branch placement (here vs `01-mathematics/`).

---

End of pass-1 sweep memo.
