# 04-information — CANON INDEX

Authoritative manifest. If a file in `04-information/` is not listed here,
treat it as not canon.

## Status

Branch opened 2026-05-01. No files yet promoted. This index is seeded as a
skeleton against the pass-1 inventory at
`_intake/information-canon-pass-1-2026-05-01.md`. Sub-folder scaffolding
is deferred to pass-2; entries below are the candidate slots, not committed
files.

## Root

- `README.md` — branch scope, promotion rule (c1/c2/c3), boundary calls,
  Shannon/Gibbs binding to chemistry pass-3 §5.4
- `CANON_INDEX.md` — this file
- `_intake/information-canon-pass-1-2026-05-01.md` — opening sweep memo

## computation/ (pending)

- Turing 1936, "On Computable Numbers," *Proc. Lond. Math. Soc.* (2) 42,
  230–265 — c1
- Church 1936, "An Unsolvable Problem of Elementary Number Theory,"
  *Amer. J. Math.* 58, 345–363 — c1, dual-cited from `01-mathematics/`
- Post 1936, "Finite Combinatory Processes — Formulation 1,"
  *J. Symbolic Logic* 1(3), 103–105 — c1
- von Neumann 1945, *First Draft of a Report on the EDVAC* — c1
- Kleene 1952, *Introduction to Metamathematics* — borderline c2/c3, pass-2

## information-theory/ (pending)

- Hartley 1928, "Transmission of Information," *BSTJ* 7(3), 535–563 — c1
- Nyquist 1928, "Certain Topics in Telegraph Transmission Theory,"
  *Trans. AIEE* 47, 617–644 — c1
- Shannon 1948, "A Mathematical Theory of Communication," *BSTJ* 27,
  379–423 and 623–656 — c1, anchor entry
- Shannon and Weaver 1949, *The Mathematical Theory of Communication*
  (UIUC Press) — c2
- Jaynes 1957, "Information Theory and Statistical Mechanics," *Phys.
  Rev.* 106, 620–630 — c1, cross-link from `03-chemistry/thermodynamics/`

## coding-theory/ (pending)

- Hamming 1950, "Error Detecting and Error Correcting Codes," *BSTJ* 29,
  147–160 — c1
- Reed and Solomon 1960, "Polynomial Codes Over Certain Finite Fields,"
  *J. SIAM* 8(2), 300–304 — c1
- Berrou, Glavieux, Thitimajshima 1993, turbo codes — borderline, pass-2

## algorithmic-information/ (pending)

- Solomonoff 1964, "A Formal Theory of Inductive Inference" I and II,
  *Information and Control* 7(1) and 7(2) — c1
- Kolmogorov 1965, "Three Approaches to the Quantitative Definition of
  Information," *Problems of Information Transmission* 1(1), 1–7 — c1
- Chaitin 1966 / 1969, *J. ACM* 13(4) and 16(1) — c1
- Levin 1973, "Universal Sequential Search Problems," *Problems of
  Information Transmission* 9(3), 265–266 — c1 (dual entry with complexity)

## complexity/ (pending)

- Cobham 1965, "The Intrinsic Computational Difficulty of Functions" — c1
- Edmonds 1965, "Paths, Trees, and Flowers," *Canad. J. Math.* 17,
  449–467 — c1
- Cook 1971, "The Complexity of Theorem-Proving Procedures," *Proc.
  3rd STOC*, 151–158 — c1
- Karp 1972, "Reducibility Among Combinatorial Problems" — c1
- Levin 1973 — c1 (see algorithmic-information/)

## cryptography/foundations/ (pending)

- Shannon 1949, "Communication Theory of Secrecy Systems," *BSTJ* 28(4),
  656–715 — c1, anchor entry
- Diffie and Hellman 1976, "New Directions in Cryptography," *IEEE Trans.
  Inf. Theory* 22(6), 644–654 — c1
- Rivest, Shamir, Adleman 1978, "A Method for Obtaining Digital Signatures
  and Public-Key Cryptosystems," *Comm. ACM* 21(2), 120–126 — c1
- Goldwasser and Micali 1984, "Probabilistic Encryption," *J. Comput.
  Syst. Sci.* 28(2), 270–299 — c1
- Goldwasser, Micali, Rackoff 1989, "The Knowledge Complexity of
  Interactive Proof Systems," *SIAM J. Comput.* 18(1), 186–208 — c1
- Bellare and Rogaway 1993, random oracle paper — borderline, pass-2

## cryptography/pedagogical-primary/ (pending)

- Friedman 1938–1941, *Military Cryptanalysis* Vols. I–IV (SIS;
  declassified NSA April 2015) — c3, citation key `nsa.friedman.mc.<vol>`
- Friedman and Callimahos 1956–1977, *Military Cryptanalytics* Vols.
  I–III (NSA; declassified in tranches) — c3 with caveat

## learning-theory/ (pending)

- Vapnik and Chervonenkis 1971, *Theory Probab. Appl.* 16(2), 264–280 — c1
- Valiant 1984, "A Theory of the Learnable," *Comm. ACM* 27(11),
  1134–1142 — c1

## compression-sampling/ (pending)

- Lempel and Ziv 1977, *IEEE Trans. Inf. Theory* 23(3), 337–343 —
  borderline, pass-2 (universality result vs algorithm split)
- Ziv and Lempel 1978, *IEEE Trans. Inf. Theory* 24(5), 530–536 —
  borderline, pass-2
- Shannon–Nyquist sampling — combined entry, see Nyquist 1928 + Shannon
  1949 *Proc. IRE* 37(1), 10–21

## quantum-information/ (pending)

- Feynman 1982, "Simulating Physics with Computers," *Int. J. Theor.
  Phys.* 21(6/7), 467–488 — c1
- Bennett and Brassard 1984, BB84 — c1
- Deutsch 1985, *Proc. Roy. Soc. Lond. A* 400(1818), 97–117 — c1
- Shor 1994, *Proc. 35th FOCS*, 124–134 — c1
- Holevo 1973 — pass-2 candidate

## reference/ (pending)

- RFC 2104 (1997), HMAC — borderline c3, pass-2
- FIPS PUB 197 (2001), AES — borderline c3, pass-2
- TLS, QUIC, IPsec composing-protocol RFCs — landscape, do not file

## Cross-links (out)

- Gödel 1931 → `01-mathematics/foundations/` (primary placement)
- Kolmogorov 1933 (probability axioms) → `01-mathematics/`
- Gibbs / Boltzmann entropy → `02-physics/statistical-mechanics/`
- Landauer 1961 (cost of erasure) → `02-physics/` (primary placement)
- Quantum-mechanics substrate (decoherence, measurement) →
  `02-physics/quantum-mechanics/`

## Cross-links (in)

- `03-chemistry/thermodynamics/` → `04-information/information-theory/`
  Shannon 1948 and Jaynes 1957 (binding from chemistry pass-3 §5.4)
- `08-deep-history/` → `04-information/cryptography/pedagogical-primary/`
  Friedman tier (binding from gov-declassified pass-2 §4.2 and §4.4)
