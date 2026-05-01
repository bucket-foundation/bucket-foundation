# 04-information — Canon Branch

## Scope

The information canon holds **foundational statements of laws, limits, and
principles** governing information, computation, communication, cryptography,
and learning. The unit of inclusion is the primary text in which a quantitative
limit, an impossibility result, a universal model, or a constructive primitive
is first stated by its originator (or stated in its now-canonical form).

The five sub-domains in scope:

1. **Computation** — what is computable, by what model, and at what cost.
   Turing machines, lambda calculus, Post systems, the von Neumann
   architecture, the Church–Turing thesis as primary texts.
2. **Information theory** — entropy, channel capacity, source coding,
   rate–distortion, sampling, the noisy-channel theorem.
3. **Coding theory and compression** — error-correcting codes, universal
   compression, the algebraic and probabilistic primitives that follow
   from Shannon's theorems.
4. **Cryptography** — the mathematical foundations of secrecy, public-key
   exchange, semantic security, zero-knowledge, and the proof-technique
   primitives downstream of those.
5. **Learning and complexity** — VC theory, PAC learning, computational
   complexity classes, NP-completeness, algorithmic information theory.

It does **NOT** hold:

- Programming languages, language specifications, or compiler theory below
  the foundational tier (the lambda calculus is canon; the ECMAScript spec
  is not)
- Software systems, frameworks, or library documentation
- ML model architectures, model zoos, training recipes, or benchmark results
- AI safety policy, alignment manifestos, or governance writing
- Popularizations, textbooks below the discipline-standard tier, and
  retrospectives by non-originators
- Histories of computing or biographies of computer scientists (those are
  candidate material for `08-deep-history/`)
- Internet engineering as such (most IETF RFCs are infrastructure, not
  foundation; see boundary call below)

## Promotion rule

Material enters `04-information/` only when one of the following holds:

1. **c1 — primary statement by the originator.** The text in which the
   limit, model, primitive, or impossibility result first appears in its
   canonical form, by the author who derived it. Examples: Turing 1936,
   Shannon 1948, Shannon 1949 (secrecy), Diffie–Hellman 1976, Cook 1971,
   Valiant 1984.
2. **c2 — recognized academic edition-of-record of a c1 text.** Reprints,
   collected-works editions, and authoritative translations counted as
   the citable surface for a primary text. Example: *Claude Shannon:
   Collected Papers* (IEEE Press, 1993, eds. Sloane and Wyner) for the
   Shannon corpus; *The Essential Turing* (Copeland ed., 2004) for Turing.
3. **c3 — discipline-standard normative reference or pedagogical-primary
   text.** A small, named class. Two examples qualify today:
   - Friedman, *Military Cryptanalysis* I–IV (SIS 1938–1941, declassified
     2015), as the systematic primary pedagogy of classical cryptanalysis
     by the practitioner who built the field.
   - The IETF and ISO/IEC normative documents *only when the document
     originates the primitive itself* (RFC 2104 HMAC, the AES FIPS-197
     specification). Documents that compose existing primitives (TLS 1.3,
     QUIC) are infrastructure and stay landscape.

Survey papers, textbooks below the discipline-standard tier, lecture notes,
and retrospective monographs by non-originators do not promote. CLRS, Sipser,
Cover–Thomas, Goldreich's two-volume foundations of cryptography are
landscape-tier — cite freely, do not mirror as canon.

## Boundary calls

### vs `01-mathematics/`

The cleanest carving is by *what the result is about*, not by who proved it.
A result about formal systems, recursion, definability, or proof theory lives
in `01-mathematics/foundations/`. A result about machines, channels, codes,
or programs as objects lives here.

The hardest single call is Gödel 1931. Gödel's incompleteness theorems are
results in metamathematics about formal arithmetic; they live in
`01-mathematics/foundations/`. Turing 1936 ("On Computable Numbers") shares
intellectual ancestry with Gödel but its central object is the *machine* and
its central result is the unsolvability of the *Entscheidungsproblem* by a
mechanical procedure. Turing 1936 lives here. Both branches cross-link.

Church 1936 (lambda calculus) is a borderline case adjacent to Gödel — the
lambda calculus is a formal system in the mathematical-logic tradition and
the Church–Turing thesis is a thesis about computation. Pass-1 places Church
1936 here, on the computation side, and notes the dual-citation from
`01-mathematics/foundations/`.

Kolmogorov complexity straddles measure theory and computation. The c1 papers
(Solomonoff 1964, Kolmogorov 1965, Chaitin 1966/1969, Levin 1973) live here
in `algorithmic-information/`. The probabilistic measure-theoretic axiomatics
that Kolmogorov 1933 established for probability live in `01-mathematics/`.

### vs `02-physics/`

Quantum information has its own sub-fold here (`quantum-information/`) for the
information-theoretic results — Holevo's bound, BB84, Shor's algorithm,
quantum error correction. The physics of the substrate (decoherence, the
measurement problem, the canonical quantization) lives in
`02-physics/quantum-mechanics/`. Cross-link at every entry.

Landauer 1961 (the thermodynamic cost of erasure) is a physics result with
information-theoretic content; primary placement is `02-physics/`, with a
cross-link from here.

### vs `07-mind/`

Learning theory in the formal sense (VC, PAC, online learning bounds) is
canon here. Theories of learning as a *cognitive* process (associationism,
reinforcement-learning models of biological behavior, Bayesian brain) are
candidate canon for `07-mind/`. The boundary is whether the result is a
limit on what any learner can do (here) or a model of what biological
learners actually do (mind).

### Shannon entropy vs Gibbs entropy — binding from chemistry pass-3 §5.4

Chemistry pass-3 §5.4 issued the binding rule, quoted literally:

> **Shannon entropy** `H = −Σ p_i log₂ p_i` has units of **bits** and
> quantifies the average information content of a probability distribution.
> It is a property of the *probability distribution*, not of any physical
> system.

> **The Shannon entropy entry (Shannon 1948, "A Mathematical Theory of
> Communication," *Bell Syst. Tech. J.* 27, 379–423 and 623–656) lives in
> `04-information/`.**

> **Jaynes 1957 "Information Theory and Statistical Mechanics" (*Phys. Rev.*
> 106, 620–630) is the bridge text.** ... **Promote in `04-information/`** as
> c1 for information-theoretic statmech; cross-link from
> `03-chemistry/thermodynamics/`.

This branch honors the rule. The Shannon 1948 entry lives in
`information-theory/`; the Jaynes 1957 entry lives in `information-theory/`
(or in a `bridges/` sub-fold to be decided in pass-2). The Gibbs entropy
entry stays in `02-physics/statistical-mechanics/`. The two are not
silently identified.

## Cryptography sub-folder structure

The cryptography sub-fold carries two sub-sub-folders by deliberate design
(see gov-declassified pass-2 §4.2 and §4.4):

- `cryptography/foundations/` — the mathematical foundation tier. Shannon
  1949 secrecy paper, Diffie–Hellman 1976, RSA 1978, Goldwasser–Micali
  1984, GMR 1985.
- `cryptography/pedagogical-primary/` — the systematic primary pedagogy
  tier. Friedman *Military Cryptanalysis* I–IV and the Friedman–Callimahos
  *Military Cryptanalytics* successor.

The two tiers are not collapsed. Shannon 1949 is the mathematical theory of
secrecy by its originator; Friedman is the systematic teaching of classical
cryptanalysis by the practitioner who built American cryptanalysis from
scratch. Both are primary in different senses. The folder structure preserves
the distinction so a reader who arrives looking for *the* canon-tier
cryptography text is not handed a 1500-page manual when they wanted a
26-page paper, and vice versa.

## Subfolders (proposed)

- `computation/` — Turing 1936, Church 1936, Post 1936, von Neumann 1945
- `information-theory/` — Hartley 1928, Nyquist 1928, Shannon 1948, Jaynes 1957
- `coding-theory/` — Hamming 1950, Reed–Solomon 1960
- `algorithmic-information/` — Solomonoff 1964, Kolmogorov 1965, Chaitin
  1966/1969, Levin 1973
- `complexity/` — Cobham 1965, Edmonds 1965, Cook 1971, Karp 1972, Levin 1973
- `cryptography/foundations/` — Shannon 1949, Diffie–Hellman 1976, RSA 1978,
  Goldwasser–Micali 1984, GMR 1985
- `cryptography/pedagogical-primary/` — Friedman *Military Cryptanalysis*
  I–IV, Friedman–Callimahos *Military Cryptanalytics* I–III
- `learning-theory/` — Vapnik–Chervonenkis 1971, Valiant 1984
- `compression-sampling/` — Lempel–Ziv 1977, Lempel–Ziv 1978, Shannon–Nyquist
  sampling
- `quantum-information/` — Feynman 1982, Deutsch 1985, BB84 1984, Shor 1994
- `reference/` — IETF/ISO/IEC normative primitives where they originate
  (RFC 2104, FIPS-197); database and spec pointers, not mirrors

## Status

Branch opened 2026-05-01 by the information sweep at
`_intake/information-canon-pass-1-2026-05-01.md`. No files yet promoted.
`CANON_INDEX.md` is seeded as a manifest skeleton. `_intake/` is the holding
area for sweep memos and pre-promotion artifacts. Sub-folder scaffolding is
deferred to pass-2.
