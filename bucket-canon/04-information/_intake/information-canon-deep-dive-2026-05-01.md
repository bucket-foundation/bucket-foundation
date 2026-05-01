# 04-information — Pass-2 Deep Dive Memo

Date: 2026-05-01
Author: data pillar.
Method: re-read pass-1, the README, the seeded `CANON_INDEX.md`, the math
pass-1 (for the foundations boundary), the physics pass-1 (for the QM and
quantum-information boundary), the chemistry pass-3 §3.4 textbook guardrail
and §5.4 Shannon/Gibbs binding, and the gov-declassified pass-2 §4 on
Friedman. Targeted bibliographic verification by hand.

Bar: match the chemistry pass-2 / physics pass-2 voice. Plain prose, no AI
tells. Edition-of-record specificity. Where pass-1 deferred a call, this pass
makes it. Where pass-1 missed an entry, this pass adds or rejects it. The
deep dive earns its length by walking the lineages, not by re-narrating
pass-1.

Pass-1 left ten contestable items. Pass-2 disposes of all ten and adds an
eleventh sub-domain (cybernetics / control / estimation) that pass-1 did not
inventory. The folder tree changes in three places:

1. The `cryptography/pedagogical-primary/` sub-fold survives, with the rule
   defined in §2 that closes the door on Knuth-style backdoors.
2. `learning-theory/` expands to include boosting and a no-free-lunch entry,
   and absorbs the perceptron lineage from a possible `mind/` claim.
3. `cybernetics-and-estimation/` opens as a new sub-fold for Wiener 1948,
   Wiener 1949, Kalman 1960, and (with caveat) McCulloch–Pitts 1943.

Tree freezes in §7. `CANON_INDEX.md` blocks for the new sub-folders are
written in §7.4 and ready to paste.

---

## 1. Sub-domain deep dive

This section walks each pass-1 sub-folder by lineage, names every entry with
journal-of-record bibliographic detail, and adds entries pass-1 missed or
deferred. Each entry is tagged with its tier under the README's c1/c2/c3
promotion rule. The boundary calls in §4 of pass-1 are resolved here at the
entry level; the cross-branch coherence audit in §5 of this memo binds the
results to the math, physics, chemistry, and mind branches.

### 1.1 Information theory — the pre-Shannon priorities Shannon credited

Shannon 1948 footnote 1 (page 379 of the BSTJ original) credits Hartley
1928 explicitly for "Transmission of Information" as the first quantitative
information measure, and Nyquist 1924/1928 for the bandwidth-rate result that
Shannon's channel-capacity theorem generalizes. Both pre-Shannon papers are
canon, not landscape. Pass-1 had them; this section nails the bibliographic
form.

- **Nyquist 1924.** "Certain Factors Affecting Telegraph Speed," *Bell System
  Technical Journal* 3(2), 324–346, April 1924. Introduces the
  log-of-number-of-signal-elements measure of "information" sent over a
  channel — three years before Hartley generalized it. Pass-1 named only the
  1928 paper. Pass-2 verdict: **promote both Nyquist papers as a paired
  c1**, with the 1928 paper as the more cited entry. The 1924 paper is the
  earlier statement of the same idea; together they are the pre-Shannon
  channel-rate priority.
- **Nyquist 1928.** "Certain Topics in Telegraph Transmission Theory,"
  *Trans. AIEE* 47(2), 617–644, April 1928. The bandwidth–symbol-rate
  result (`2B` independent samples per second from a band-limited channel of
  bandwidth `B`). The sampling theorem in pre-Shannon form. **c1.**
- **Hartley 1928.** "Transmission of Information," *Bell System Technical
  Journal* 7(3), 535–563, July 1928. The log-of-symbols measure
  `H = n log s`. Hartley argued the *amount* of information transmitted over
  a channel is proportional to the bandwidth times the duration times the
  log of the number of distinguishable signal levels — Shannon's capacity
  formula in everything but the noise term. **c1.** Edition-of-record: the
  BSTJ original; convenient reprint in *Key Papers in the Development of
  Information Theory* (Slepian ed., IEEE Press, 1974).
- **Shannon 1948.** "A Mathematical Theory of Communication," *Bell System
  Technical Journal* 27, 379–423 (July 1948) and 623–656 (October 1948).
  doi:10.1002/j.1538-7305.1948.tb01338.x and tb00917.x. The c1 of
  information theory. Edition-of-record: the BSTJ two-part original;
  *Claude Shannon: Collected Papers* (Sloane and Wyner eds., IEEE Press,
  1993, ISBN 0-7803-0434-9) is c2.
- **Shannon 1949.** "Communication in the Presence of Noise," *Proceedings of
  the IRE* 37(1), 10–21, January 1949. The sampling theorem in its modern
  form (`2B` samples sufficient to reconstruct a band-limited signal of
  bandwidth `B`) plus the geometric picture of channel capacity in
  signal space. **c1.** Pass-1 mentioned this paper only as half of the
  combined "Shannon–Nyquist sampling" entry in `compression-sampling/`.
  Pass-2 splits it: the sampling-theorem statement is c1 here, and the
  combined entry in `compression-sampling/` becomes a cross-link, not a
  duplicate.
- **Shannon and Weaver 1949.** *The Mathematical Theory of Communication*,
  University of Illinois Press, 1949. **c2.** Monograph reprint of Shannon
  1948 with Warren Weaver's expository chapter. Cited because the Weaver
  chapter is what most disciplines outside electrical engineering actually
  read for the framework; the BSTJ original is what mathematicians and
  information-theorists cite. Both citations are honored.
- **Kullback and Leibler 1951.** "On Information and Sufficiency," *Annals of
  Mathematical Statistics* 22(1), 79–86, March 1951.
  doi:10.1214/aoms/1177729694. Introduces relative entropy
  `D(P‖Q) = Σ p_i log(p_i/q_i)` — the Kullback–Leibler divergence. The
  load-bearing primitive for hypothesis testing, model selection,
  variational inference, and (later) the rate-distortion-style framing of
  inference itself. Pass-1 missed this. **c1.** Strong addition; promote.
- **Kullback 1959.** *Information Theory and Statistics*, John Wiley & Sons,
  1959 (Dover reprint 1968, ISBN 0-486-69684-7). Originator monograph
  developing the KL framework systematically. **c2** under the rule from
  chemistry pass-3 §3.1 (originator monograph promotes if it contains
  load-bearing material the originator paper does not — the 1959 book
  contains the systematic statistical-decision-theory development that the
  1951 paper sketches).
- **Jaynes 1957.** "Information Theory and Statistical Mechanics," *Physical
  Review* 106, 620–630, May 1957; companion paper "II," *Physical Review*
  108, 171–190, October 1957. doi:10.1103/PhysRev.106.620 and
  10.1103/PhysRev.108.171. The bridge text per chemistry pass-3 §5.4.
  **c1, paired entry.** Pass-1 named only Jaynes I; Jaynes II contains the
  derivation of the canonical and grand-canonical ensembles from
  max-entropy, and is the load-bearing companion. Promote both.

The Cover–Thomas question. *Elements of Information Theory* (Wiley, 1991;
2nd ed. 2006, ISBN 0-471-24195-4) is the discipline-standard graduate
textbook. Under the README's promotion rule it does **not** promote: it is a
non-originator monograph and does not satisfy c3 in the strict sense
(chemistry pass-3 §3.4 fixed the counter-rule that "normative" means
published or formally adopted by a standards body, not "most assigned").
**Verdict: landscape.** Cite freely from sub-folder stubs; do not mirror as
canon. The same disposition applies to MacKay 2003 *Information Theory,
Inference, and Learning Algorithms* (CUP, ISBN 0-521-64298-1) — excellent
synthesis, no originator status, landscape.

### 1.2 Computation — the Turing / Post / Church 1936 trio

The 1936 trio is the founding moment of computation as a discipline. Pass-1
correctly identified all three. The bibliographic form below is exact and
the edition-of-record statements are verified against the journal masthead
in each case. The Church 1936 placement question raised in §4 of pass-1 §3.2
is adjudicated in §3 of this memo, after the full lineage is on the table.

- **Turing 1936.** Alan M. Turing, "On Computable Numbers, with an
  Application to the Entscheidungsproblem," *Proceedings of the London
  Mathematical Society* (2) 42, 230–265, presented 12 November 1936,
  published 1937. doi:10.1112/plms/s2-42.1.230. The correction note: "On
  Computable Numbers, with an Application to the Entscheidungsproblem. A
  Correction," *Proc. Lond. Math. Soc.* (2) 43, 544–546, 1937,
  doi:10.1112/plms/s2-43.6.544. **c1, anchor entry for `computation/`.**
  Edition-of-record: the *PLMS* original plus the 1937 correction. Reprints:
  Davis ed., *The Undecidable*, Raven Press, 1965; Copeland ed., *The
  Essential Turing*, Oxford University Press, 2004 (ISBN 0-19-825080-0).
- **Post 1936.** Emil L. Post, "Finite Combinatory Processes — Formulation
  1," *Journal of Symbolic Logic* 1(3), 103–105, September 1936.
  doi:10.2307/2269031. Two-and-a-half pages. The Post-machine formulation,
  developed independently of Turing and submitted earlier (the chronology
  is in the JSL editor's note). **c1.** The Post 1947 paper "Recursive
  Unsolvability of a Problem of Thue," *J. Symbolic Logic* 12(1), 1–11,
  doi:10.2307/2267170, is an important corollary (the word problem for
  semigroups is undecidable) but not foundational at Turing/Church/Post
  level — landscape with cross-link.
- **Church 1936.** Alonzo Church, "An Unsolvable Problem of Elementary
  Number Theory," *American Journal of Mathematics* 58(2), 345–363, April
  1936. doi:10.2307/2371045. Establishes lambda-definability as a
  formalization of effective calculability and proves an unsolvable problem
  of elementary number theory. The companion paper "A Note on the
  Entscheidungsproblem," *J. Symbolic Logic* 1(1), 40–41, March 1936
  (correction 1(3), 101–102), explicitly proves the Entscheidungsproblem
  unsolvable from the lambda-definability result, two months before Turing
  presented his paper. **c1.** Placement adjudicated in §3 of this memo.
- **Markov 1954.** A. A. Markov, *Teoriya algorifmov*, Trudy Matematicheskogo
  Instituta imeni V. A. Steklova 42, Akademiia Nauk SSSR, Moscow, 1954.
  English: *Theory of Algorithms*, tr. Jacques J. Schorr-Kon and PST staff,
  Israel Program for Scientific Translations, Jerusalem, 1961, OTS 60-51085.
  The Markov-algorithm formalism — a fourth model of computation
  contemporary with the recursive functions, Turing machines, and lambda
  calculus, and the one Soviet computer science took as primary. **c1.**
  Pass-1 named Markov only in passing; promote as a formal entry.
- **Kleene 1936.** Stephen C. Kleene, "General Recursive Functions of
  Natural Numbers," *Mathematische Annalen* 112(1), 727–742, 1936.
  doi:10.1007/BF01565439. The general-recursive formulation that ties
  Gödel's primitive-recursive functions, Church's lambda calculus, and
  Herbrand's schema into the unified recursive-function framework. **c1.**
  Pass-1 placed Kleene only via the 1952 *Introduction to Metamathematics*;
  pass-2 promotes the 1936 *Math. Ann.* paper as the primary statement and
  retains Kleene 1952 only as c2 edition-of-record for the systematic
  framework (s-m-n theorem, recursion theorem, partial recursive
  functions). The 1952 *Introduction to Metamathematics* is c2 here by the
  rule from chemistry pass-3 §3.1: it contains the systematic recursion
  theory in its now-canonical form, and the originator papers do not.
  Folder: `computation/` (Kleene 1936 paper) and `computation/` (Kleene
  1952 monograph), both with cross-links from `01-mathematics/foundations/`.
- **Gödel 1934.** Kurt Gödel, "On Undecidable Propositions of Formal
  Mathematical Systems," lecture notes by Stephen C. Kleene and J. Barkley
  Rosser, Institute for Advanced Study, Princeton, 1934 (mimeographed; in
  Davis 1965 *The Undecidable*, 39–74). Contains Gödel's definition of
  general recursive functions following a suggestion of Herbrand. **c1
  cross-link only** — primary placement is `01-mathematics/foundations/`
  with the 1931 paper. Listed here because the recursive-function thread
  inside the 1934 lecture notes is what Kleene 1936 systematizes.
- **von Neumann 1945.** *First Draft of a Report on the EDVAC*, Moore School
  of Electrical Engineering, University of Pennsylvania, 30 June 1945
  (contract W-670-ORD-4926). Adjudication of canonical status in §4 of this
  memo. Edition-of-record: Stern 1981 reproduction in his *From ENIAC to
  UNIVAC* (Digital Press); IEEE *Annals of the History of Computing* 15(4),
  27–75, 1993, with introduction by Michael R. Williams.

The Church 1936 placement question is left to §3. The von Neumann 1945
adjudication is left to §4.

### 1.3 Algorithmic information theory — the four-author convergence

Pass-1 had this lineage right. Pass-2 confirms and tightens.

- **Solomonoff 1964.** Ray J. Solomonoff, "A Formal Theory of Inductive
  Inference," Parts I and II, *Information and Control* 7(1), 1–22, March
  1964 and 7(2), 224–254, June 1964. doi:10.1016/S0019-9958(64)90223-2 and
  10.1016/S0019-9958(64)90131-7. Earliest of the four. The universal prior
  and the framing of induction as a property of the shortest program
  reproducing the data. **c1.**
- **Kolmogorov 1965.** A. N. Kolmogorov, "Three Approaches to the
  Quantitative Definition of Information," *Problems of Information
  Transmission* 1(1), 1–7, January 1965. The descriptive-complexity
  formulation. **c1.** Edition-of-record: the *Problems of Information
  Transmission* English-language edition (the journal is published in both
  Russian and English by Pleiades / Springer; the English version of record
  is the IEEE-translated edition from 1965).
- **Chaitin 1966.** Gregory J. Chaitin, "On the Length of Programs for
  Computing Finite Binary Sequences," *Journal of the ACM* 13(4), 547–569,
  October 1966. doi:10.1145/321356.321363. Companion paper "On the Length of
  Programs for Computing Finite Binary Sequences: Statistical
  Considerations," *J. ACM* 16(1), 145–159, January 1969.
  doi:10.1145/321495.321506. **c1, paired entry.** Chaitin published the
  1966 paper at age 19 from Buenos Aires, independent of and unaware of
  Kolmogorov's 1965 result; the Soviet/American/Argentine convergence is
  what makes this lineage canon-worthy as a four-author entry rather than a
  single-originator entry.
- **Levin 1973.** Leonid A. Levin, "Universal Sequential Search Problems,"
  *Problems of Information Transmission* 9(3), 265–266, 1973. Two-page
  paper. Two distinct results: the construction of a universal search
  algorithm whose runtime is optimal up to a multiplicative constant
  (Levin's universal search); and the independent statement of NP-completeness
  of the SAT-style problem (the Cook–Levin theorem from the Soviet side,
  three years after Cook 1971). **c1, dual entry** — listed in
  `algorithmic-information/` for the universal search and in `complexity/`
  for the NP-completeness statement.
- **Martin-Löf 1966.** Per Martin-Löf, "The Definition of Random Sequences,"
  *Information and Control* 9(6), 602–619, December 1966.
  doi:10.1016/S0019-9958(66)80018-9. The first rigorous definition of an
  individual random sequence using effective null sets — the missing piece
  between Kolmogorov complexity and a definition of randomness for a single
  string. Pass-1 missed. **c1.** Promote.

### 1.4 Computational complexity — the 1965/1971/1972 chain

The complexity-theory lineage starts with two 1965 papers that, between
them, establish that complexity classes are well-defined mathematical
objects, and culminates in the 1971/1972 NP-completeness pair.

- **Hartmanis and Stearns 1965.** Juris Hartmanis and Richard E. Stearns,
  "On the Computational Complexity of Algorithms," *Transactions of the
  American Mathematical Society* 117, 285–306, May 1965.
  doi:10.2307/1994208. The time-hierarchy theorem and the introduction of
  *complexity class* as a definable object. **c1.** Pass-1 missed this — a
  serious oversight, since Hartmanis and Stearns are the originators of
  complexity theory as a sub-discipline (they shared the 1993 Turing Award
  for it). Promote as anchor entry of `complexity/`.
- **Cobham 1965.** Alan Cobham, "The Intrinsic Computational Difficulty of
  Functions," in Yehoshua Bar-Hillel (ed.), *Logic, Methodology and
  Philosophy of Science: Proceedings of the 1964 International Congress*,
  North-Holland, Amsterdam, 1965, 24–30. The polynomial-time class as a
  thesis (the Cobham–Edmonds thesis). **c1.**
- **Edmonds 1965.** Jack Edmonds, "Paths, Trees, and Flowers," *Canadian
  Journal of Mathematics* 17, 449–467, 1965. doi:10.4153/CJM-1965-045-4.
  The other half of the polynomial-time thesis: Edmonds gives the first
  polynomial-time algorithm for non-bipartite matching and argues
  explicitly that polynomial time is the right notion of "tractable." **c1.**
- **Cook 1971.** Stephen A. Cook, "The Complexity of Theorem-Proving
  Procedures," *Proceedings of the 3rd Annual ACM Symposium on Theory of
  Computing*, 151–158, 1971. doi:10.1145/800157.805047. The Cook–Levin
  theorem — SAT is NP-complete. **c1.**
- **Karp 1972.** Richard M. Karp, "Reducibility Among Combinatorial
  Problems," in Raymond E. Miller and James W. Thatcher (eds.), *Complexity
  of Computer Computations*, Plenum Press, New York, 1972, 85–103. The 21
  NP-complete problems. **c1.**
- **Levin 1973** — see §1.3 above for bibliographic detail; dual entry here.
- **Razborov and Rudich 1994.** Alexander A. Razborov and Steven Rudich,
  "Natural Proofs," *Proc. 26th STOC*, 204–213, 1994; *Journal of Computer
  and System Sciences* 55(1), 24–35, 1997.
  doi:10.1145/195058.195134. The natural-proofs barrier — formal evidence
  that a large class of proof techniques cannot resolve P vs NP. Pass-1
  missed. **c1.** Promote. The natural-proofs result is foundational in the
  same epistemic register as Gödel 1931 is for arithmetic — it is a
  meta-theorem about what proofs of complexity lower bounds can look like.
- **Baker, Gill, Solovay 1975.** Theodore Baker, John Gill, and Robert
  Solovay, "Relativizations of the P =? NP Question," *SIAM Journal on
  Computing* 4(4), 431–442, 1975. doi:10.1137/0204037. The relativization
  barrier — the earlier of the three known barriers to resolving P vs NP.
  Pass-1 missed. **c1.** Promote alongside Razborov–Rudich. The third
  barrier — Aaronson and Wigderson 2009 algebrization, *ACM Trans.
  Computation Theory* 1(1), 2 — is too recent to be canon-tier; mention as
  landscape only.

### 1.5 Cryptography (mathematical foundations)

Pass-1 had Shannon 1949, Diffie–Hellman 1976, RSA 1978, Goldwasser–Micali
1984, GMR 1989. Pass-2 confirms all five and adds three pre-DH primitives
that pass-1 missed or under-named.

- **Shannon 1949.** Claude E. Shannon, "Communication Theory of Secrecy
  Systems," *Bell System Technical Journal* 28(4), 656–715, October 1949.
  doi:10.1002/j.1538-7305.1949.tb00928.x. Perfect secrecy, unicity
  distance, the information-theoretic framing. **c1, anchor entry of
  `cryptography/foundations/`.** Edition-of-record: the BSTJ original;
  *Claude Shannon: Collected Papers* (IEEE Press 1993) is c2.
- **Merkle 1974/1978.** Ralph C. Merkle, "Secure Communications Over
  Insecure Channels," submitted to *Communications of the ACM* in 1975,
  rejected, finally published *Comm. ACM* 21(4), 294–299, April 1978.
  doi:10.1145/359460.359473. Merkle's puzzles — the first published
  asymmetric key-exchange primitive. The 1974 Berkeley CS244 term-paper
  draft is the priority document; the 1978 *CACM* paper is the
  edition-of-record. **c1.** Pass-1 named Merkle only as a flagged
  pre-Diffie–Hellman primitive; pass-2 promotes. The standard Diffie–Hellman
  citation now includes the Merkle priority — the protocol is properly
  "Diffie–Hellman–Merkle key exchange."
- **Diffie and Hellman 1976.** Whitfield Diffie and Martin E. Hellman, "New
  Directions in Cryptography," *IEEE Transactions on Information Theory*
  IT-22(6), 644–654, November 1976. doi:10.1109/TIT.1976.1055638. **c1.**
- **Rivest, Shamir, Adleman 1978.** Ronald L. Rivest, Adi Shamir, and
  Leonard M. Adleman, "A Method for Obtaining Digital Signatures and
  Public-Key Cryptosystems," *Communications of the ACM* 21(2), 120–126,
  February 1978. doi:10.1145/359340.359342. **c1.**
- **Blum and Micali 1984.** Manuel Blum and Silvio Micali, "How to Generate
  Cryptographically Strong Sequences of Pseudo-Random Bits," *SIAM Journal
  on Computing* 13(4), 850–864, November 1984. doi:10.1137/0213053
  (conference 1982 FOCS). Cryptographically secure PRGs from one-way
  functions. **c1.** Pass-1 missed; pass-2 promotes.
- **Yao 1982.** Andrew C. Yao, "Theory and Applications of Trapdoor
  Functions," *Proc. 23rd FOCS*, 80–91, 1982. doi:10.1109/SFCS.1982.45.
  The next-bit-test characterization of pseudorandomness, hardcore
  predicates. **c1.** Pass-1 missed; pass-2 promotes alongside Blum–Micali.
- **Goldwasser and Micali 1984.** Shafi Goldwasser and Silvio Micali,
  "Probabilistic Encryption," *Journal of Computer and System Sciences*
  28(2), 270–299, April 1984. doi:10.1016/0022-0000(84)90070-9 (conference
  1982 STOC). Semantic security. **c1.**
- **Goldreich, Goldwasser, Micali 1986.** Oded Goldreich, Shafi Goldwasser,
  and Silvio Micali, "How to Construct Random Functions," *Journal of the
  ACM* 33(4), 792–807, October 1986. doi:10.1145/6490.6503 (conference 1984
  FOCS). The GGM construction of pseudorandom functions from PRGs — the
  primitive on which essentially every modern symmetric construction
  ultimately rests. Pass-1 missed (the prompt named this paper as a
  candidate; it qualifies clearly). **c1.** Promote.
- **Goldwasser, Micali, Rackoff 1989.** Shafi Goldwasser, Silvio Micali,
  and Charles Rackoff, "The Knowledge Complexity of Interactive Proof
  Systems," *SIAM Journal on Computing* 18(1), 186–208, February 1989
  (conference 1985 STOC). doi:10.1137/0218012. Zero-knowledge. **c1.**
- **Bellare and Rogaway 1993.** Mihir Bellare and Phillip Rogaway, "Random
  Oracles are Practical: A Paradigm for Designing Efficient Protocols,"
  *Proc. 1st ACM Conf. on Computer and Communications Security*, 62–73,
  1993. doi:10.1145/168588.168596. Pass-1 flagged this borderline. Pass-2
  verdict: **c1, with a footnote.** The random-oracle methodology became
  the dominant proof framework in practical cryptography; Canetti, Goldreich,
  Halevi 1998 ("The Random Oracle Methodology, Revisited," *J. ACM* 51(4),
  557–594, 2004) showed the model is unsoundable in the standard model in
  general. Both papers go in `cryptography/foundations/` — the originator
  paper as c1, the Canetti–Goldreich–Halevi paper as c1 of the
  unsoundability counter-result. The pair stands as canon precisely because
  the limitation result is now load-bearing for every modern protocol that
  invokes the methodology. This is the same logic that puts Gödel 1931 next
  to Hilbert in `01-mathematics/foundations/`.

The pre-Wesley-Peterson question pass-1 raised. W. Wesley Peterson 1961
*Error-Correcting Codes* (MIT Press) introduced BCH codes (Hocquenghem 1959,
Bose–Chaudhuri 1960 are the originator papers) into the working
coding-theory literature; it is **not** a cryptography primitive. The BCH
codes themselves are coding theory, not cryptography, and belong in
`coding-theory/` if anywhere — pass-2 verdict on BCH is **landscape**, since
neither Bose–Chaudhuri 1960 (*Information and Control* 3, 68–79) nor
Hocquenghem 1959 (*Chiffres* 2, 147–156) crossed the foundational threshold
the way Hamming and Reed–Solomon did. The Wesley-Peterson trail is a dead
end.

### 1.6 Cryptography (pedagogical-primary, declassified) — the Friedman tier

Resolved in full in §2 of this memo. Inventory carries forward unchanged
from pass-1: Friedman *Military Cryptanalysis* I–IV (1938–1941, declassified
April 2015) and Friedman–Callimahos *Military Cryptanalytics* I–III (NSA
1956–1977, declassified in tranches).

### 1.7 Quantum information

Pass-1 had Feynman 1982, Deutsch 1985, BB84, Shor 1994, with Holevo 1973
flagged for pass-2. Pass-2 confirms the four pass-1 entries, promotes Holevo
1973, and adds the four entries pass-1 missed in the BB84-to-1996 window.

- **Holevo 1973.** Alexander S. Holevo, "Bounds for the Quantity of
  Information Transmitted by a Quantum Communication Channel," *Problemy
  Peredachi Informatsii* 9(3), 3–11, 1973 (English in *Problems of
  Information Transmission* 9(3), 177–183, 1973). The Holevo bound — the
  upper bound on classical mutual information accessible from a quantum
  state. **c1.** Promote.
- **Bennett and Brassard 1984.** Charles H. Bennett and Gilles Brassard,
  "Quantum Cryptography: Public Key Distribution and Coin Tossing," *Proc.
  IEEE International Conference on Computers, Systems, and Signal
  Processing* (Bangalore), 175–179, December 1984. The BB84 protocol.
  Edition-of-record per Bennett's own Wayback-confirmed 2014 reprint:
  *Theoretical Computer Science* 560, 7–11, 2014.
  doi:10.1016/j.tcs.2014.05.025. **c1.**
- **Feynman 1982.** Richard P. Feynman, "Simulating Physics with Computers,"
  *International Journal of Theoretical Physics* 21(6/7), 467–488, 1982.
  doi:10.1007/BF02650179. **c1.**
- **Deutsch 1985.** David Deutsch, "Quantum Theory, the Church–Turing
  Principle and the Universal Quantum Computer," *Proceedings of the Royal
  Society A* 400(1818), 97–117, 1985. doi:10.1098/rspa.1985.0070. **c1.**
- **Bennett and Wiesner 1992.** Charles H. Bennett and Stephen J. Wiesner,
  "Communication via One- and Two-Particle Operators on Einstein–Podolsky–
  Rosen States," *Physical Review Letters* 69(20), 2881–2884, November
  1992. doi:10.1103/PhysRevLett.69.2881. Superdense coding. Pass-1 missed.
  **c1.** Promote.
- **Bennett, Brassard, Crépeau, Jozsa, Peres, Wootters 1993.** "Teleporting
  an Unknown Quantum State via Dual Classical and Einstein–Podolsky–Rosen
  Channels," *Physical Review Letters* 70(13), 1895–1899, March 1993.
  doi:10.1103/PhysRevLett.70.1895. Quantum teleportation. **c1.** Promote.
- **Ekert 1991.** Artur K. Ekert, "Quantum Cryptography Based on Bell's
  Theorem," *Physical Review Letters* 67(6), 661–663, August 1991.
  doi:10.1103/PhysRevLett.67.661. The entanglement-based key distribution
  protocol (E91), independent of and complementary to BB84. Pass-1 missed.
  **c1.** Promote.
- **Shor 1994/1997.** Peter W. Shor, "Algorithms for Quantum Computation:
  Discrete Logarithms and Factoring," *Proc. 35th IEEE Symposium on
  Foundations of Computer Science*, 124–134, 1994.
  doi:10.1109/SFCS.1994.365700. Journal version: "Polynomial-Time
  Algorithms for Prime Factorization and Discrete Logarithms on a Quantum
  Computer," *SIAM Journal on Computing* 26(5), 1484–1509, October 1997.
  doi:10.1137/S0097539795293172. **c1, paired conference + journal.**
- **Grover 1996.** Lov K. Grover, "A Fast Quantum Mechanical Algorithm for
  Database Search," *Proc. 28th STOC*, 212–219, 1996.
  doi:10.1145/237814.237866. Quadratic speedup for unstructured search.
  Pass-1 missed. **c1.** Promote.
- **Shor 1995.** Peter W. Shor, "Scheme for Reducing Decoherence in Quantum
  Computer Memory," *Physical Review A* 52(4), R2493–R2496, October 1995.
  doi:10.1103/PhysRevA.52.R2493. The first quantum error-correcting code.
  Pass-1 missed. **c1.** Promote. Steane 1996 ("Multiple-Particle Interference
  and Quantum Error Correction," *Proc. Royal Society A* 452, 2551–2577,
  doi:10.1098/rspa.1996.0136) is the independent paired contribution and
  promotes alongside Shor 1995 as a paired entry.

The substrate question is settled by the README and physics pass-1: the
*physics* of decoherence, measurement, canonical quantization lives in
`02-physics/quantum-mechanics/`; the information-theoretic results listed
above live here. Cross-link at every entry. This is the same pattern
chemistry uses for `quantum-chemistry/` vs physics. See §5.2 for
coordination with physics pass-2.

### 1.8 Learning theory

Pass-1 had VC 1971 and Valiant 1984. Pass-2 adds boosting, no-free-lunch,
and the perceptron lineage, and answers the deep-learning question
explicitly.

- **Vapnik and Chervonenkis 1971.** Vladimir N. Vapnik and Alexey Ya.
  Chervonenkis, "On the Uniform Convergence of Relative Frequencies of
  Events to their Probabilities," *Theory of Probability and Its
  Applications* 16(2), 264–280, 1971. doi:10.1137/1116025. The VC
  dimension and uniform convergence. **c1.**
- **Valiant 1984.** Leslie G. Valiant, "A Theory of the Learnable,"
  *Communications of the ACM* 27(11), 1134–1142, November 1984.
  doi:10.1145/1968.1972. PAC learning. **c1.**
- **Schapire 1990.** Robert E. Schapire, "The Strength of Weak
  Learnability," *Machine Learning* 5(2), 197–227, 1990.
  doi:10.1007/BF00116037. The first proof that weak learners can be boosted
  to strong learners — the originator result for boosting. **c1.** Pass-1
  missed; promote.
- **Freund and Schapire 1997.** Yoav Freund and Robert E. Schapire, "A
  Decision-Theoretic Generalization of On-Line Learning and an Application
  to Boosting," *Journal of Computer and System Sciences* 55(1), 119–139,
  August 1997. doi:10.1006/jcss.1997.1504. AdaBoost. **c1** as the
  edition-of-record statement of the boosting framework that the 1990 paper
  established. Promote alongside Schapire 1990 as paired entry.
- **Wolpert 1996.** David H. Wolpert, "The Lack of A Priori Distinctions
  Between Learning Algorithms," *Neural Computation* 8(7), 1341–1390,
  October 1996. doi:10.1162/neco.1996.8.7.1341. The no-free-lunch theorem
  for supervised learning. Companion paper Wolpert and Macready 1997, "No
  Free Lunch Theorems for Optimization," *IEEE Trans. Evolutionary
  Computation* 1(1), 67–82, doi:10.1109/4235.585893, extends to
  optimization. **c1, paired entry.** Pass-1 missed; promote.
- **Littlestone 1988.** Nick Littlestone, "Learning Quickly When Irrelevant
  Attributes Abound: A New Linear-Threshold Algorithm," *Machine Learning*
  2(4), 285–318, 1988. doi:10.1007/BF00116827. The Winnow algorithm and the
  founding analysis of online learning with mistake-bound complexity.
  **c1.** Pass-1 missed; promote.
- **Rosenblatt 1958.** Frank Rosenblatt, "The Perceptron: A Probabilistic
  Model for Information Storage and Organization in the Brain,"
  *Psychological Review* 65(6), 386–408, November 1958.
  doi:10.1037/h0042519. The perceptron learning rule and the convergence
  theorem. The originator paper for the connectionist approach to learning.
  Cross-branch placement adjudicated in §5.4 below; pass-2 verdict is
  **here, c1**, with a strong cross-link to `07-mind/`. The result
  Rosenblatt proves is a *learning-algorithm convergence theorem*, not a
  model of biological cognition.

The deep-learning question. Does any specific deep-learning paper qualify
as c1 here? The candidates: Rumelhart, Hinton, Williams 1986
("Learning Representations by Back-Propagating Errors," *Nature* 323(6088),
533–536, doi:10.1038/323533a0); LeCun et al. 1998 ("Gradient-Based Learning
Applied to Document Recognition," *Proc. IEEE* 86(11), 2278–2324,
doi:10.1109/5.726791); Krizhevsky, Sutskever, Hinton 2012 (the AlexNet
*NeurIPS* paper); Vaswani et al. 2017 ("Attention Is All You Need," *NeurIPS
30*). All are landmark engineering achievements. None is a *foundation
paper* in the sense the README requires — none states a quantitative limit,
an impossibility result, a universal model, or a primitive that the field
then derives from. Backpropagation itself has multiple independent
originators (Werbos 1974 PhD thesis, Linnainmaa 1970 reverse-mode automatic
differentiation, Parker 1985); the Rumelhart–Hinton–Williams paper is the
*re-introduction* and popularization, not the originator. The transformer
architecture is engineering above the foundations. **Pass-2 verdict: no
deep-learning paper promotes under the current rule.** This is the same
disposition as Knuth's *TAOCP* in computation: discipline-defining
engineering work, not foundation. All of them are landscape; cite freely
from any sub-folder stub that needs them.

### 1.9 Coding theory and compression

- **Hamming 1950.** Richard W. Hamming, "Error Detecting and Error
  Correcting Codes," *Bell System Technical Journal* 29(2), 147–160, April
  1950. **c1.**
- **Reed and Solomon 1960.** Irving S. Reed and Gustave Solomon, "Polynomial
  Codes Over Certain Finite Fields," *Journal of the Society for Industrial
  and Applied Mathematics* 8(2), 300–304, 1960. doi:10.1137/0108018. **c1.**
- **Berrou, Glavieux, Thitimajshima 1993.** Claude Berrou, Alain Glavieux,
  and Punya Thitimajshima, "Near Shannon Limit Error-Correcting Coding and
  Decoding: Turbo-codes (1)," *Proc. IEEE International Conference on
  Communications (ICC '93)*, Geneva, 1064–1070, May 1993.
  doi:10.1109/ICC.1993.397441. Pass-1 flagged borderline. Pass-2 verdict:
  **c1**, on the same logic as the natural-proofs barrier — the achievement
  is a foundational *limit-approaching* result, not a routine engineering
  improvement. Berrou–Glavieux–Thitimajshima demonstrated empirically that
  the Shannon limit is approachable in practice within ~0.5 dB, which had
  been an open theoretical-versus-practical question for 45 years. Promote.
- **Gallager 1962.** Robert G. Gallager, "Low-Density Parity-Check Codes,"
  *IRE Transactions on Information Theory* 8(1), 21–28, January 1962.
  doi:10.1109/TIT.1962.1057683. The originator paper for LDPC codes —
  rediscovered 30 years later, now the basis of every modern coding system
  (5G, Wi-Fi 6, NVMe). Pass-1 missed. **c1.** Promote.
- **Lempel and Ziv 1977/1978.** Abraham Lempel and Jacob Ziv, "A Universal
  Algorithm for Sequential Data Compression," *IEEE Transactions on
  Information Theory* IT-23(3), 337–343, May 1977.
  doi:10.1109/TIT.1977.1055714. Companion: Ziv and Lempel, "Compression of
  Individual Sequences via Variable-Rate Coding," *IEEE Trans. Information
  Theory* IT-24(5), 530–536, September 1978. doi:10.1109/TIT.1978.1055934.
  Pass-1 flagged borderline and proposed splitting the call. Pass-2 takes
  the split: **the universality theorems are c1; the LZ77/LZ78 algorithms
  themselves are landscape.** Promote both papers as c1 — the universality
  result is in the paper, not separable from the algorithm. The downstream
  algorithm catalog (LZW, gzip, DEFLATE, zstd) stays landscape.
- **Levenshtein 1966.** Vladimir I. Levenshtein, "Binary Codes Capable of
  Correcting Deletions, Insertions, and Reversals," *Soviet Physics
  Doklady* 10(8), 707–710, 1966 (originally *Doklady Akademii Nauk SSSR*
  163(4), 845–848, 1965). The edit-distance metric. Pass-1 missed.
  **c1.** Promote. Levenshtein distance is the foundational primitive for
  approximate matching in genomics, NLP, spell-correction.

### 1.10 Reference (normative)

The promotion rule for `reference/` is the chemistry pass-3 §3.4 rule
(quoted in §6 of this memo): a non-originator monograph promotes only if it
is published, maintained, or formally adopted by a standards body. This is
the IUPAC/CODATA/PDG rule, applied here.

- **RFC 2104 (1997).** Hugo Krawczyk, Mihir Bellare, Ran Canetti, "HMAC:
  Keyed-Hashing for Message Authentication," IETF RFC 2104, February 1997.
  Originates HMAC as a primitive. The RFC is the IETF normative reference
  *and* the originating publication (Bellare–Canetti–Krawczyk 1996 *Crypto*
  proceedings is the conference paper; the RFC is the formally adopted
  normative form). Pass-1 flagged borderline. Pass-2 verdict: **c3.**
  Promote. The originating-primitive criterion holds.
- **FIPS PUB 197 (2001).** "Advanced Encryption Standard (AES)," NIST,
  November 2001. Originates AES as a normative primitive (Daemen and
  Rijmen's Rijndael selected and standardized). Pass-1 flagged borderline.
  Pass-2 verdict: **c3.** Promote. The Daemen and Rijmen 2002 monograph
  *The Design of Rijndael* (Springer, ISBN 3-540-42580-2) is c2 as
  originator-monograph edition-of-record.
- **RFC 8446 (2018), RFC 9000 (QUIC), RFC 4301 (IPsec).** Compose existing
  primitives. **Landscape, not canon.** The rule holds.
- ISO/IEC 10118 (hash functions), ISO/IEC 18033 (encryption algorithms),
  NIST SP 800 series. Cite as pointers from `reference/` if a sub-folder
  stub needs them. **Landscape.**

The wedge risk pass-1 raised — that `reference/` becomes a backdoor for
infrastructure documents one engineering committee at a time — is closed by
the chemistry §3.4 rule. The list of canon-tier `reference/` entries is
exactly two: RFC 2104 and FIPS-197. Adding any future `reference/` entry
requires it to originate a primitive that is then formally adopted by a
standards body. The TLS/QUIC/IPsec line holds.

---

## 2. The Friedman pedagogical-primary tier — adjudication

Pass-1 §4(1) deferred this to pass-2 with three explicit gates: verify the
FOIA case number, test the rule against Knuth, and write the explicit
one-paragraph definition of "pedagogical-primary." All three gates are
disposed below.

### 2.1 Gate (a) — FOIA case 60494

The gov-declassified pass-2 §4.1 already flagged this case number as
unconfirmed: "FOIA case number cited in pass-1 ('FOIA case 60494') could not
be re-verified in pass-2 — `nsa.gov/...Friedman-Documents/` returned 403 to
WebFetch. Flag as unconfirmed pending direct manual fetch." That status has
not changed. The April 20, 2015 NSA release announcement (NARA
*Transforming Classification* blog, April 30, 2015 post) confirms the
release date and the ~52,000-page scope but does not name a FOIA case
number in the public-facing announcement; the release was framed as a
proactive declassification under the NSA's cryptologic-heritage program,
not as a FOIA response, which is consistent with no FOIA case number
appearing in the announcement.

**Pass-2 verdict on (a): the FOIA case number 60494 is dropped from the
canon citation.** The provenance metadata for the Friedman entries should
read:

```yaml
provenance:
  release_type: declassified
  release_authority: NSA
  release_date: 2015-04-20
  release_program: NSA Cryptologic Heritage proactive declassification
  source_url: https://www.nsa.gov/news-features/declassified-documents/friedman-documents/
  source_archive_mirror: https://archive.org/details/nsa-friedman
  evidentiary_tier: A
  notes: |
    Original SIS production 1938-1941. The 2015 release covered the
    Friedman Collection (~50,000+ pp) en bloc; no individual FOIA case
    number is required for this material. Pass-1 of the gov-declassified
    sweep cited "FOIA case 60494" but could not be verified in pass-2 of
    the gov-declassified sweep nor pass-2 of this branch; dropped.
```

This is a tightening, not a rejection. The release itself is uncontested.

### 2.2 Gate (b) — the Knuth test

Does the pedagogical-primary tier admit Donald E. Knuth, *The Art of
Computer Programming*, Volumes 1–4A (Addison-Wesley / Pearson, 1968 to
present)? If yes, the rule is too loose and must be rewritten or the
sub-fold collapsed.

Knuth's case for promotion under the same logic that admits Friedman:

- Knuth is a working originator in the field (the Knuth–Morris–Pratt
  algorithm, the Knuth–Bendix completion algorithm, attribute grammars,
  literate programming, METAFONT, TeX).
- *TAOCP* is the systematic primary teaching of algorithm analysis by the
  practitioner who built much of the field.
- The work is definitive at its level. Generations of computer scientists
  cite *TAOCP* as the authoritative reference for the algorithms it covers.
- Knuth himself originated the analysis-of-algorithms framework that
  *TAOCP* teaches (the worst-case/average-case asymptotic-analysis
  vocabulary that Cobham 1965 and Hartmanis–Stearns 1965 axiomatized as
  complexity theory was put into operational pedagogical form by Knuth).

Knuth's case against promotion under the rule that this memo is about to
write:

- Knuth's originator papers (KMP, Knuth–Bendix, attribute grammars) are
  individually citable and individually promotable; *TAOCP* is the
  systematization of a field with *many* originators, of which Knuth is
  one. It is encyclopedic.
- The originator-content of *TAOCP* is in the published Knuth papers, not
  in *TAOCP* itself. *TAOCP* contains exposition, exercises, history, and
  cataloguing — not new originator material at the framework-naming level
  that distinguishes Friedman.
- The work is alive and being revised. Friedman *Military Cryptanalysis* is
  fixed in its 1938–1941 form, declassified once, and not added to. Knuth
  is rewriting volume 4 in fascicles. Canon-tier promotion of a
  continuously-revised work is harder to make idempotent.
- Most decisively: Knuth is the discipline-standard *reference for the
  analysis of specific algorithms*, not the discipline-foundational
  *systematic primary teaching of a field nobody else had built*. Friedman
  built American cryptanalysis from scratch and trained Rowlett, Kullback,
  Sinkov, the people who broke PURPLE; without Friedman there is no field
  in 1938 for him to teach. Knuth taught a field with many active builders
  — McCarthy, Dijkstra, Hoare, Iverson, Floyd, Karp, Rabin, Cook — none
  of whom Knuth created.

**Pass-2 verdict on (b): the rule does not admit Knuth.** The distinguishing
criterion is "the practitioner who built the field from scratch and to whom
no other practitioner can be primary." Knuth is one of many; Friedman is
sui generis for American cryptanalysis pre-1941.

### 2.3 Gate (c) — the explicit one-paragraph definition

> **Pedagogical-primary** is a tier of `04-information/` reserved for a
> systematic, sustained, primary-source pedagogical work by a sole
> originator who built a field of practice from a state in which the field
> did not exist, and for which no contemporaneous originator-paper or
> originator-monograph by another practitioner can substitute. The work
> must be (i) written by the originator-practitioner, (ii) the systematic
> teaching of the field as a unified body of methods, (iii) load-bearing
> in the sense that the methods it teaches were not coherently available
> elsewhere at the time of writing, and (iv) closed in form — finished,
> not under continuous revision. The tier is **not** a residence for
> excellent textbooks, definitive references, encyclopedic catalogues,
> or pedagogical syntheses by non-originators or by originators-among-
> many. The currently known list of works satisfying all four criteria
> in the information branch is exactly Friedman, *Military Cryptanalysis*
> Vols. I–IV (SIS, 1938–1941), with the Friedman–Callimahos *Military
> Cryptanalytics* I–III (NSA, 1956–1977) as a c3-with-caveat successor.
> The list is closed against further additions until and unless a future
> sweep produces a candidate that satisfies all four criteria; the burden
> of proof on any future addition is the same as the burden of proof for
> opening a new sub-folder.

This paragraph is the explicit promotion-rule extension for this sub-fold.
It encodes the chemistry pass-3 §3.4 textbook guardrail in a form fitted to
the cryptography case. The four criteria together exclude Knuth (fails
(i) — not the sole originator-practitioner — and fails (iv) — under
continuous revision), Cover–Thomas (fails (i) and (ii) — synthesis by
non-originators, not systematic primary teaching of an unbuilt field),
MacKay 2003 (same), Goldreich's two-volume *Foundations of Cryptography*
(fails (i) — Goldreich is one originator among many in modern crypto), and
the *Feynman Lectures* (fails (iv) and is a physics work anyway). The list
holds.

### 2.4 Final call on the sub-fold

**Keep the sub-fold.** The `cryptography/pedagogical-primary/` sub-fold
survives pass-2 with the rule above as its admission gate. The rule is
codified in the README and copied verbatim into the `CANON_INDEX.md`
preamble for the sub-folder. The `cryptography/` two-tier structure
(foundations + pedagogical-primary) is binding, as it was in pass-1, and is
now defensible against the Knuth-style backdoor that would otherwise erode
it.

---

## 3. Adjudication of Church 1936

Pass-1 §3.2 placed Church 1936 in `04-information/computation/` on the
*downstream-use* test, with the explicit acknowledgement that pass-2 might
reverse. The math pass-1 §3 boundary call agreed: "Church 1936 →
`04-information/`. Explanandum: an unsolvable problem as established via
lambda-definability, a model of computation."

Pass-2 reads the README's c1 rule literally:

> **c1 — primary statement by the originator.** The text in which the
> limit, model, primitive, or impossibility result first appears in its
> canonical form, by the author who derived it.

Church 1936 ("An Unsolvable Problem of Elementary Number Theory," *Amer.
J. Math.* 58, 345–363) does two things:

1. It establishes lambda-definability as a model of effective calculability
   (an originator statement of a *model of computation*).
2. It proves an unsolvable problem of elementary number theory (an
   originator statement of an *impossibility result about a problem*).

The companion paper Church 1936b ("A Note on the Entscheidungsproblem,"
*J. Symbolic Logic* 1(1), 40–41) proves the Entscheidungsproblem
unsolvable from result (1) above — making the paper an originator
statement of an *impossibility result about a decision problem*.

All three are computational-foundation results in the README's strict
sense: each names a model, primitive, or impossibility result for
computation. None is a metamathematical result about the consistency or
completeness of an axiomatic system in the way Gödel 1931 is. The lambda
calculus is a formal system, but the *result* Church proves about it is
that it suffices as a definition of effective calculability — an
operational property, not a structural property.

**Pass-2 verdict, by literal quotation of c1: Church 1936 lives in
`04-information/computation/`.** The math pass-1 boundary call stands. The
cross-link from `01-mathematics/foundations/` is honored as a cross-link,
not as a primary placement. The lambda calculus as a formal-system object
(its syntactic structure, its β-reduction theory, its connection to
intuitionistic logic via Curry–Howard) generates downstream cross-link from
mathematics; the *unsolvability result* is the originator content and lives
here.

The pass-1 placement is ratified. Math pass-2 may push back; if it does,
the question to put back on the table is "does Church 1936 contain an
originator statement about a structural property of a formal system that is
load-bearing independently of its computational reading?" Pass-2 of this
branch's answer is no: the load-bearing content of Church 1936 is the
model-of-computation framing.

---

## 4. Adjudication of von Neumann 1945 EDVAC report

Pass-1 §1.1 included the *First Draft of a Report on the EDVAC* as c1
("strong c1 for stored-program architecture"). Pass-2 must test this against
the chemistry pass-3 §3.4 textbook guardrail and against the question of
whether an unpublished consultancy memo can carry c1 status.

### 4.1 What the document is

The *First Draft* is a 101-page typescript circulated by Herman H.
Goldstine on 30 June 1945 under the bibliographic banner of the Moore
School of Electrical Engineering at the University of Pennsylvania
(contract W-670-ORD-4926 with the US Army Ordnance Department). Authorship
is attributed solely to John von Neumann, although the document
synthesizes the Moore School team's work (Eckert, Mauchly, Goldstine,
Burks). It was never formally published in the lifetime of any of the
participants; the canonical reproductions are Stern 1981 (in *From ENIAC
to UNIVAC*, Digital Press) and the IEEE *Annals of the History of
Computing* 15(4), 27–75, 1993, with Michael R. Williams's introduction
documenting the textual history.

### 4.2 The originator-content question

Does the *First Draft* contain an originator statement of architecture as a
method? The components of the stored-program architecture — central
arithmetic unit, central control, memory, input, output, the principle
that instructions and data share the same memory — are present in the
document. The framing of these as a *unified architecture* (the term
"central control" is von Neumann's; the explicit separation of the five
units is his) is an originator move. The companion document Burks,
Goldstine, von Neumann 1946, "Preliminary Discussion of the Logical Design
of an Electronic Computing Instrument," Institute for Advanced Study report
(reprinted in *Datamation* 8(9–10), 1962, and in the von Neumann *Collected
Works* vol. V, Pergamon, 1963) is the better-cited and more polished
statement of the same content, with three named authors and explicit
treatment of binary versus decimal, parallel versus serial, and the
addressing model.

### 4.3 The unpublished-typescript question

The chemistry pass-3 §3.4 textbook guardrail is about *non-originator
monographs*; it does not directly govern *unpublished originator typescripts
formally circulated as a technical report under a named institutional
sponsor*. The question is sui generis. The closest precedent in the
information branch is the Bennett–Brassard 1984 BB84 paper, which appeared
only as a *Proc. IEEE International Conference* paper in Bangalore (a
conference proceedings, not a journal) and was not republished in a
peer-reviewed venue until the 2014 *Theoretical Computer Science* reprint.
The community treats BB84 as c1 anyway, on the basis that the originator
statement is in the document and the document is citable. The same logic
applies to the EDVAC report: it is the originator statement of the
architecture, formally circulated under institutional sponsorship,
bibliographically citable since 1945, and continuously cited as the
originator document for stored-program architecture for 80 years.

### 4.4 The Burks–Goldstine–von Neumann 1946 question

Should the canon entry be the 1945 *First Draft* or the 1946 IAS
*Preliminary Discussion*? The 1946 document is more polished, more
systematic, has three named authors (which more honestly reflects the
collaborative architecture of the work), and is the document the field
actually reads. The 1945 document is the priority document.

**Pass-2 verdict: promote both as a paired entry.** The 1945 *First Draft*
is c1 for priority; the 1946 IAS *Preliminary Discussion* is c1 for the
edition-of-record statement of the architecture. They go in
`computation/` next to each other, with explicit cross-reference in the
stub. This is the same pattern as Schapire 1990 + Freund–Schapire 1997 in
boosting (priority paper + edition-of-record paper), and the same pattern
as Goldwasser–Micali 1984 + GGM 1986 in cryptography (originator + the
construction the field actually uses).

The textbook guardrail is honored: neither document is a textbook, neither
is by a non-originator, both are formally circulated technical reports
authored by the originators.

---

## 5. Cross-branch coherence audit

This section is the load-bearing one for §3.x of the README's boundary
calls. Each cross-branch boundary is bound here at the level of specific
named entries.

### 5.1 04-info ↔ 01-math — the Gödel/Turing/Church split

Bind by literal quotation of c1 ("primary statement by the originator. The
text in which the limit, model, primitive, or impossibility result first
appears in its canonical form, by the author who derived it"):

- **Gödel 1931 → `01-mathematics/foundations/`.** Originator content:
  incompleteness of formal arithmetic. The result is about the *formal
  system*, not about a *machine*. Cross-link from `04-information/computation/`
  as the metamathematical predecessor of Turing 1936. Math pass-1 §3
  agrees.
- **Turing 1936 → `04-information/computation/`.** Originator content:
  the universal machine, the unsolvability of the Entscheidungsproblem
  *via* a mechanical procedure, the construction of a decision problem
  about machines. Cross-link from `01-mathematics/foundations/`. Math
  pass-1 §3 agrees.
- **Church 1936 → `04-information/computation/`.** Adjudicated in §3
  above. Cross-link from `01-mathematics/foundations/`. Math pass-1 §3
  agrees.
- **Post 1936 → `04-information/computation/`.** Same logic. Math has no
  competing primary placement claim. No cross-link required from math.
- **Kleene 1936 → `04-information/computation/`.** Same logic. The
  general-recursive-functions paper is computation-side; the Herbrand
  schema cross-link to math is from this side.
- **Kleene 1952 → `04-information/computation/` as c2 for the recursion
  framework.** Math has no competing primary placement claim. Math
  pass-1 §1.1 listed Kleene 1952 as borderline; pass-2 of this branch
  resolves to here. Cross-link from `01-mathematics/foundations/` for
  the Curry–Howard / typed-lambda thread (which mathematics may want to
  promote separately under category-theory / type-theory in math pass-2).
- **Kolmogorov 1933 → `01-mathematics/probability/`.** Math pass-1 §3
  agrees: "Explanandum: axioms for measure-theoretic probability."
- **Kolmogorov 1965 → `04-information/algorithmic-information/`.** Math
  pass-1 §3 agrees: "Explanandum: complexity of strings."
- **Solomonoff 1964, Chaitin 1966/1969, Levin 1973, Martin-Löf 1966 →
  `04-information/algorithmic-information/`.** Math has no competing
  claim. Cross-link from probability for the Martin-Löf randomness
  thread.

The split is operational and survives literal-quotation testing.

### 5.2 04-info ↔ 02-physics — Shannon/Gibbs entropy and quantum information

**Shannon/Gibbs entropy.** Chemistry pass-3 §5.4 issued the binding rule.
The information-branch side of the binding is now operational:

- The Shannon 1948 entry lives in `04-information/information-theory/`.
- The Jaynes 1957 + 1957b entries live in
  `04-information/information-theory/`.
- The Gibbs entropy entry lives in `02-physics/statistical-mechanics/`
  (Gibbs 1902 *Elementary Principles in Statistical Mechanics*, per
  physics pass-1).
- The Boltzmann *S = k log W* entry lives in
  `02-physics/statistical-mechanics/` (Boltzmann 1872 / 1877, per physics
  pass-1).
- No silent identification. Stub-writing rule (binding): every
  information-theoretic entry that uses "entropy" specifies *Shannon
  entropy* explicitly with units of bits; every chemistry/physics entry
  specifies *Gibbs* or *Boltzmann* entropy explicitly with units of J/K.
- Landauer 1961 ("Irreversibility and Heat Generation in the Computing
  Process," *IBM J. Research and Development* 5(3), 183–191) is the only
  primary text where the bits-to-joules identification is made
  rigorously and as a physical claim. Primary placement is
  `02-physics/` per the README; cross-link from `04-information/`.

**Quantum information.** Pass-1 of this branch proposed a sub-fold here for
quantum-information-theoretic results, with the *physics* of the substrate
(decoherence, measurement, canonical quantization) staying in
`02-physics/quantum-mechanics/`. Physics pass-1 inventory does not list
BB84, Shor, Holevo, or quantum error correction in `quantum-mechanics/` —
it lists Heisenberg 1925, BHJ 1926, Schrödinger 1926, Born 1926, Dirac
1928, Pauli 1925, Born–Oppenheimer 1927, Dirac monograph 1958, von Neumann
1932. The two inventories do not overlap, which is the cleanest possible
coordination outcome. Physics pass-2 will adjudicate any ambiguous case;
pass-2 of this branch flags none.

The coordination rule for physics pass-2: any quantum result whose
explanandum is a property of the *substrate* (a physical system, a
Hilbert-space structure, a measurement formalism) is physics; any quantum
result whose explanandum is a property of *information* (a channel, a
protocol, an algorithm, a code, a key) is information. Holevo 1973, BB84,
E91, BBCJPW 1993 teleportation, BW 1992 superdense coding, Shor 1994,
Grover 1996, Shor 1995 / Steane 1996 codes are all here. Bell 1964
("On the Einstein–Podolsky–Rosen Paradox," *Physics* 1(3), 195–200) is
physics — a result about physical reality — even though its proof is
information-theoretic in form; physics pass-1 did not list it but pass-2
will, and the cross-link from `04-information/quantum-information/` for the
BB84/E91 lineage will be honored. Aspect, Grangier, Roger 1981/1982
experiments are physics-experimental and live in physics if at all.

### 5.3 04-info ↔ 03-chemistry — Shannon/Gibbs reaffirmed

Chemistry pass-3 §5.4 already drew the line. Pass-2 of this branch
reaffirms verbatim, since the binding is reciprocal:

- The chemistry canon does not silently identify Shannon entropy with
  Gibbs entropy.
- The information canon does not silently identify Shannon entropy with
  Gibbs entropy.
- Jaynes 1957 / 1957b is c1 in `04-information/`, cross-linked from
  `03-chemistry/thermodynamics/`. Not duplicated as canon in chemistry.
- Every information-theoretic stub mentioning "entropy" specifies
  Shannon entropy explicitly with units of bits.
- The bits-to-joules conversion is a *modeling choice*, not a
  derivation; Landauer 1961 is the only primary text where it is made as
  a physical claim, and that text lives in `02-physics/`.

### 5.4 04-info ↔ 07-mind — cybernetics, Marr, free energy

Pass-1 deferred this entirely. Pass-2 makes the calls.

- **Wiener 1948 *Cybernetics* (MIT Press; 2nd ed. 1961, ISBN
  0-262-23007-0).** Norbert Wiener, *Cybernetics: or Control and
  Communication in the Animal and the Machine*. The originator monograph
  for cybernetics — feedback control, the unification of communication and
  control, the analogy between negative feedback in engineering systems
  and homeostasis in biological systems. Pass-2 verdict: **c1 here, in a
  new sub-folder `cybernetics-and-estimation/`.** Cross-link to `07-mind/`
  for the homeostasis / control-theory-of-cognition reading. Mind branch
  may promote McCulloch's *Embodiments of Mind* 1965 in its own right;
  Wiener 1948 stays here as the originator monograph for the
  control/communication unification.
- **Wiener 1949 *Extrapolation, Interpolation, and Smoothing of Stationary
  Time Series* (MIT Press; originally a 1942 classified report,
  declassified 1949).** The originator statement of optimal linear
  filtering (the Wiener filter) and the spectral approach to time-series
  prediction. **c1, here.** Promote in `cybernetics-and-estimation/`.
- **Kalman 1960.** Rudolf E. Kalman, "A New Approach to Linear Filtering
  and Prediction Problems," *Transactions of the ASME — Journal of Basic
  Engineering* 82(1), 35–45, March 1960. doi:10.1115/1.3662552. The
  state-space recursive estimation framework. **c1, here.** The Kalman
  filter is the foundational primitive for sequential Bayesian estimation
  in linear-Gaussian systems and underlies essentially every navigation,
  guidance, tracking, and signal-recovery system since 1960. Promote in
  `cybernetics-and-estimation/`.
- **McCulloch and Pitts 1943.** Warren S. McCulloch and Walter Pitts, "A
  Logical Calculus of the Ideas Immanent in Nervous Activity," *Bulletin
  of Mathematical Biophysics* 5(4), 115–133, December 1943.
  doi:10.1007/BF02478259. The originator paper for the formal-neuron
  model — networks of threshold logic units capable of computing any
  finite-state function. Cross-branch placement question: information or
  mind? Pass-2 verdict: **here, c1, in `cybernetics-and-estimation/`,**
  with strong cross-link to `07-mind/`. The originator content is a
  *computational result*: that any finite Turing-computable function on
  finite tapes can be realized by a network of formal neurons. This is
  computation-side. The interpretation as a model of biological
  cognition is mind-side; mind pass-2 may promote a separate entry on
  the cognitive-modeling reading. The same disposition applies as for
  Rosenblatt 1958: the originator-paper is here; the cognitive
  interpretation is mind.
- **Marr 1982 *Vision* (W. H. Freeman, ISBN 0-7167-1284-9; reprint MIT
  Press 2010, ISBN 0-262-51462-6).** David Marr, *Vision: A
  Computational Investigation into the Human Representation and
  Processing of Visual Information*. Pass-2 verdict: **defer to
  `07-mind/`.** The originator content of Marr 1982 is the three-level
  framework (computational / algorithmic / implementation) for theories
  *of mind* and the application to early vision. The work is *about*
  cognition, not about computation as such. Mind pass-2 should promote;
  cross-link from here for the computational-theory reading.
- **Friston free-energy principle (Friston 2010, "The Free-Energy
  Principle: A Unified Brain Theory?", *Nature Reviews Neuroscience*
  11(2), 127–138, doi:10.1038/nrn2787).** Pass-2 verdict: **defer to
  `07-mind/` if mind chooses to promote.** The free-energy principle is
  a theoretical framework for biological cognition that uses
  variational-inference machinery; the originator content is mind-side.
  Information branch holds the underlying machinery (KL divergence,
  variational inference) as canon already. Mind pass-2 to call.

The disposition above opens a new sub-fold here, `cybernetics-and-
estimation/`, that pass-1 did not anticipate. The folder tree §7 reflects
this.

---

## 6. What pass-1 missed

The following were either tested and added, or tested and rejected. Each is
a candidate the prompt explicitly named or that the cross-branch audit
surfaced.

### 6.1 Wiener 1948 *Cybernetics* — added

Treated in §5.4 above. Clear c1 originator monograph for cybernetics.
Promote in `cybernetics-and-estimation/`.

### 6.2 Wiener 1949 *Extrapolation, Interpolation, and Smoothing* — added

Treated in §5.4 above. Originator statement of optimal linear filtering.
Promote in `cybernetics-and-estimation/`.

### 6.3 McCulloch–Pitts 1943 — added

Treated in §5.4 above. Promote in `cybernetics-and-estimation/` with
cross-link to `07-mind/`.

### 6.4 Rosenblatt 1958 perceptron — added

Treated in §1.8 above. Promote in `learning-theory/` as the originator paper
for connectionist learning; cross-link from `07-mind/`.

### 6.5 Levenshtein 1966 edit distance — added

Treated in §1.9 above. Promote in `coding-theory/` as the originator paper
for the edit-distance metric.

### 6.6 Kalman 1960 — added

Treated in §5.4 above. Promote in `cybernetics-and-estimation/`.

### 6.7 Pearl 1988 *Probabilistic Reasoning in Intelligent Systems*
(Morgan Kaufmann, ISBN 0-934613-73-7) — added with care

Judea Pearl's *Probabilistic Reasoning* is the originator monograph for
Bayesian networks as a graphical formalism for probabilistic inference. The
1988 monograph contains the load-bearing message-passing algorithms (belief
propagation, the polytree algorithm) that are not present in any single
prior paper. Pearl is the originator. The work is closed in form (the
graphical-model framework as it appears in the 1988 monograph is the
framework the field uses). The chemistry pass-3 §3.1 originator-monograph
rule applies: the monograph contains load-bearing material the originator
papers do not.

**Pass-2 verdict: c1 / c2 paired.** The 1988 monograph is c2 as
edition-of-record. The originator papers (Pearl 1982, "Reverend Bayes on
Inference Engines: A Distributed Hierarchical Approach," *Proc. AAAI*; and
Pearl 1986, "Fusion, Propagation, and Structuring in Belief Networks,"
*Artificial Intelligence* 29(3), 241–288, doi:10.1016/0004-3702(86)90072-X)
are c1. Promote both. New sub-folder home: `learning-theory/` is the
cleanest, since the framework is foundational for all of probabilistic
inference (which graduates to learning); alternatively a new sub-fold
`graphical-models/` could open if pass-3 of this branch finds enough
neighbors. Pass-2 leaves the entries in `learning-theory/` provisionally;
pass-3 to revisit.

### 6.8 Cover–Thomas 1991 *Elements of Information Theory* — rejected

Treated in §1.1 above. Does not satisfy the chemistry pass-3 §3.4 rule for
non-originator monographs (not a standards-body publication, not formally
adopted, however excellent). Landscape only.

### 6.9 Bell 1964 — defer to physics

Bell, "On the Einstein–Podolsky–Rosen Paradox," *Physics* 1(3), 195–200,
1964. Originator content is a physical claim (no local hidden-variable
theory can reproduce QM's predictions). Information-theoretic in proof
form; physical in conclusion. Primary placement is `02-physics/`. Cross-
link from `04-information/quantum-information/` for the BB84 / E91
foundation.

### 6.10 Hartmanis–Stearns 1965 — added

Treated in §1.4 above. **The single biggest pass-1 miss.** Promote as
anchor entry of `complexity/`. Pass-1 listed Cobham 1965 and Edmonds 1965
as the polynomial-time thesis pair, but missed the originating
complexity-class result. Hartmanis and Stearns shared the 1993 Turing Award
for founding complexity theory; their 1965 *Trans. AMS* 117 paper is the
paper for which they shared it. The omission is the most consequential
single oversight in pass-1's inventory and is now corrected.

### 6.11 Razborov–Rudich 1994 and Baker–Gill–Solovay 1975 — added

Treated in §1.4 above. The two of the three known barriers to P vs NP.
Promote both.

### 6.12 Kullback–Leibler 1951 and Kullback 1959 — added

Treated in §1.1 above. KL divergence is the load-bearing primitive for
information-theoretic statistics, model selection, variational inference.
Pass-1 missed naming it explicitly; pass-2 promotes paper + monograph.

### 6.13 Shor 1995 quantum error correction, BBCJPW 1993 teleportation,
BW 1992 superdense, Ekert 1991 E91, Grover 1996 — added

Treated in §1.7 above. Pass-1's quantum-information inventory was thin.
Promote all five.

### 6.14 Gallager 1962 LDPC — added

Treated in §1.9 above. Originator paper for low-density parity-check codes,
the basis of every modern coding system after rediscovery in the 1990s.

### 6.15 Schapire 1990, Freund–Schapire 1997, Wolpert 1996 NFL,
Littlestone 1988 — added

Treated in §1.8 above. Boosting, no-free-lunch, online learning with
mistake bounds. The 1980s/90s learning-theory canon that pass-1 omitted.

### 6.16 Blum–Micali 1984, Yao 1982, GGM 1986 — added

Treated in §1.5 above. The cryptographically-secure-PRG / pseudorandom-
function lineage that completes the modern-foundations sub-fold.

### 6.17 Markov 1954 *Theory of Algorithms*, Kleene 1936 paper, Gödel 1934
lecture notes, Post 1947 — added or noted

Treated in §1.2 above. The 1936 trio plus Markov 1954 plus the recursion-
theory primary papers.

---

## 7. Final folder tree (frozen) and CANON_INDEX.md blocks

### 7.1 Frozen tree

```
04-information/
  README.md
  CANON_INDEX.md
  _intake/
    information-canon-pass-1-2026-05-01.md
    information-canon-deep-dive-2026-05-01.md            (this file)

  computation/
    1936-turing-on-computable-numbers.md                 (c1, anchor)
    1937-turing-correction.md                            (c1, paired)
    1936-post-finite-combinatory-processes.md            (c1)
    1936-church-unsolvable-problem.md                    (c1)
    1936-church-note-entscheidungsproblem.md             (c1, paired)
    1936-kleene-general-recursive-functions.md           (c1)
    1952-kleene-introduction-to-metamathematics.md       (c2, framework EOR)
    1954-markov-theory-of-algorithms.md                  (c1)
    1945-vonneumann-edvac-first-draft.md                 (c1, priority)
    1946-burks-goldstine-vonneumann-ias-prelim.md        (c1, framework EOR)

  information-theory/
    1924-nyquist-telegraph-speed.md                      (c1, paired with 1928)
    1928-nyquist-telegraph-transmission-theory.md        (c1)
    1928-hartley-transmission-of-information.md          (c1)
    1948-shannon-mathematical-theory-of-communication.md (c1, anchor)
    1949-shannon-communication-in-presence-of-noise.md   (c1)
    1949-shannon-weaver-monograph.md                     (c2)
    1951-kullback-leibler-on-information-and-sufficiency.md  (c1)
    1959-kullback-information-theory-and-statistics.md   (c2, originator EOR)
    1957-jaynes-information-theory-statistical-mechanics-i.md  (c1)
    1957-jaynes-information-theory-statistical-mechanics-ii.md (c1, paired)

  coding-theory/
    1950-hamming-error-detecting-correcting-codes.md     (c1)
    1960-reed-solomon-polynomial-codes.md                (c1)
    1962-gallager-low-density-parity-check-codes.md      (c1)
    1966-levenshtein-edit-distance.md                    (c1)
    1977-lempel-ziv-universal-algorithm.md               (c1, universality only)
    1978-ziv-lempel-individual-sequences.md              (c1, universality only)
    1993-berrou-glavieux-thitimajshima-turbo-codes.md    (c1)

  algorithmic-information/
    1964-solomonoff-formal-theory-of-inductive-inference.md  (c1)
    1965-kolmogorov-three-approaches.md                  (c1)
    1966-chaitin-on-length-of-programs.md                (c1)
    1969-chaitin-on-length-of-programs-ii.md             (c1, paired)
    1966-martin-lof-definition-of-random-sequences.md    (c1)
    1973-levin-universal-sequential-search.md            (c1, dual with complexity/)

  complexity/
    1965-hartmanis-stearns-on-the-computational-complexity.md  (c1, anchor)
    1965-cobham-intrinsic-computational-difficulty.md    (c1)
    1965-edmonds-paths-trees-flowers.md                  (c1)
    1971-cook-complexity-of-theorem-proving.md           (c1)
    1972-karp-reducibility-among-combinatorial.md        (c1)
    1973-levin-universal-sequential-search.md            (c1, dual)
    1975-baker-gill-solovay-relativizations.md           (c1, barrier 1)
    1994-razborov-rudich-natural-proofs.md               (c1, barrier 2)

  cryptography/
    foundations/
      1949-shannon-communication-theory-of-secrecy.md    (c1, anchor)
      1976-diffie-hellman-new-directions.md              (c1)
      1978-rsa-method-for-obtaining-digital-signatures.md (c1)
      1978-merkle-secure-communications.md               (c1)
      1982-yao-theory-and-applications-of-trapdoor.md    (c1)
      1984-blum-micali-cryptographically-strong-prgs.md  (c1)
      1984-goldwasser-micali-probabilistic-encryption.md (c1)
      1986-goldreich-goldwasser-micali-random-functions.md (c1)
      1989-goldwasser-micali-rackoff-zero-knowledge.md   (c1)
      1993-bellare-rogaway-random-oracles.md             (c1)
      2004-canetti-goldreich-halevi-rom-revisited.md     (c1, paired counter)
    pedagogical-primary/
      1938-friedman-military-cryptanalysis-i.md          (c3)
      1938-friedman-military-cryptanalysis-ii.md         (c3)
      1939-friedman-military-cryptanalysis-iii.md        (c3)
      1941-friedman-military-cryptanalysis-iv.md         (c3)
      1956-friedman-callimahos-military-cryptanalytics.md  (c3 with caveat)

  learning-theory/
    1958-rosenblatt-perceptron.md                        (c1)
    1971-vapnik-chervonenkis-uniform-convergence.md      (c1)
    1982-pearl-reverend-bayes-on-inference-engines.md    (c1)
    1984-valiant-theory-of-the-learnable.md              (c1)
    1986-pearl-fusion-propagation-belief-networks.md     (c1)
    1988-littlestone-winnow-mistake-bound.md             (c1)
    1988-pearl-probabilistic-reasoning-in-intelligent-systems.md  (c2)
    1990-schapire-strength-of-weak-learnability.md       (c1)
    1996-wolpert-no-free-lunch.md                        (c1)
    1997-freund-schapire-adaboost.md                     (c1)
    1997-wolpert-macready-no-free-lunch-optimization.md  (c1, paired)

  cybernetics-and-estimation/                            (NEW sub-fold)
    1943-mcculloch-pitts-logical-calculus.md             (c1)
    1948-wiener-cybernetics.md                           (c1)
    1949-wiener-extrapolation-interpolation-smoothing.md (c1)
    1960-kalman-new-approach-to-linear-filtering.md      (c1)

  compression-sampling/
    (combined sampling-theorem cross-link to information-theory/
     1928-nyquist + 1949-shannon-presence-of-noise; no
     standalone files; sub-fold may collapse in pass-3)

  quantum-information/
    1973-holevo-bounds-quantum-channel.md                (c1)
    1982-feynman-simulating-physics-with-computers.md    (c1)
    1984-bennett-brassard-bb84.md                        (c1, anchor)
    1985-deutsch-quantum-theory-church-turing.md         (c1)
    1991-ekert-quantum-cryptography-bell.md              (c1)
    1992-bennett-wiesner-superdense-coding.md            (c1)
    1993-bbcjpw-quantum-teleportation.md                 (c1)
    1994-shor-algorithms-for-quantum-computation.md      (c1)
    1995-shor-scheme-for-reducing-decoherence.md         (c1)
    1996-grover-fast-quantum-mechanical-database-search.md  (c1)
    1996-steane-multiple-particle-interference.md        (c1, paired)
    1997-shor-polynomial-time-algorithms-journal.md      (c1, EOR)

  reference/
    1997-rfc-2104-hmac.md                                (c3)
    2001-fips-pub-197-aes.md                             (c3)
    2002-daemen-rijmen-design-of-rijndael.md             (c2)

  _landscape/
    textbooks-and-syntheses.md                           (Cover–Thomas, MacKay,
                                                          Sipser, CLRS, KP&S,
                                                          Goldreich, Knuth TAOCP,
                                                          Feynman Lectures)
```

The `compression-sampling/` sub-fold is provisional — its contents are
either cross-links (sampling theorem) or already filed in `coding-theory/`
and `information-theory/`. Pass-3 should consider collapsing it.

The `cybernetics-and-estimation/` sub-fold is new at pass-2.

### 7.2 Cross-link map (canonical, for `04-information/CROSS_LINKS.md`)

Out:

- `computation/1936-turing` → `01-mathematics/foundations/`
- `computation/1936-church` and `1936-church-note` → `01-mathematics/
  foundations/`
- `computation/1936-kleene` and `1952-kleene` → `01-mathematics/
  foundations/`
- `algorithmic-information/1965-kolmogorov` → `01-mathematics/probability/`
  (cross-author cross-link; not a placement claim)
- `information-theory/1948-shannon` and `1957-jaynes-i/ii` → `03-chemistry/
  thermodynamics/` and `02-physics/statistical-mechanics/` (Shannon/Gibbs
  binding, both directions)
- `quantum-information/*` → `02-physics/quantum-mechanics/` (substrate)
- `cybernetics-and-estimation/1943-mcculloch-pitts` → `07-mind/`
- `cybernetics-and-estimation/1948-wiener` → `07-mind/`
- `learning-theory/1958-rosenblatt` → `07-mind/`

In:

- `02-physics/statistical-mechanics/landauer-1961` → `04-information/
  information-theory/` (bits-to-joules conversion, primary placement
  physics)
- `02-physics/quantum-mechanics/bell-1964` → `04-information/
  quantum-information/` (BB84 / E91 foundation)
- `03-chemistry/thermodynamics/` → `04-information/information-theory/
  1948-shannon` and `1957-jaynes-i/ii` (chemistry pass-3 §5.4 binding)
- `08-deep-history/` → `04-information/cryptography/pedagogical-primary/`
  (gov-declassified pass-2 §4.4 binding)
- `07-mind/` → `04-information/cybernetics-and-estimation/1948-wiener`,
  `learning-theory/1958-rosenblatt` (cross-link if mind chooses to
  cross-promote)

### 7.3 Promotion-rule extension (paste into `04-information/README.md`)

Add to the `## Promotion rule` section, after the c1/c2/c3 list, a new
paragraph for the pedagogical-primary tier. The text to paste is in §2.3
above ("Pedagogical-primary is a tier of `04-information/` reserved
for…").

Add to the `## Boundary calls` section, under "vs `01-mathematics/`," the
binding adjudication of Church 1936 from §3 of this memo: "Church 1936
lives in `04-information/computation/`. The originator content of the
paper is the lambda-calculus model of computation and the unsolvability of
the Entscheidungsproblem proved through that model — both computational-
foundation results in the c1 sense. The lambda calculus *qua* formal
system generates a cross-link from `01-mathematics/foundations/`, but the
primary placement is here."

Add to the same section, a new sub-section "vs `07-mind/` — second pass":
"Originator papers whose explanandum is a *computational* property of
information-processing systems (the perceptron convergence theorem of
Rosenblatt 1958; the formal-neuron computability result of McCulloch–Pitts
1943; the cybernetics unification of Wiener 1948) live here. Originator
papers whose explanandum is a *cognitive* property of biological agents
(Marr 1982 *Vision*, Friston 2010 free-energy principle) live in
`07-mind/`. Each entry cross-links."

### 7.4 CANON_INDEX.md blocks (paste verbatim)

```markdown
## cybernetics-and-estimation/ (new at pass-2)

- McCulloch and Pitts 1943, "A Logical Calculus of the Ideas Immanent
  in Nervous Activity," *Bull. Math. Biophysics* 5(4), 115–133 — c1,
  cross-link to `07-mind/`
- Wiener 1948, *Cybernetics: or Control and Communication in the
  Animal and the Machine*, MIT Press (2nd ed. 1961) — c1, cross-link
  to `07-mind/`
- Wiener 1949, *Extrapolation, Interpolation, and Smoothing of
  Stationary Time Series*, MIT Press (originally 1942 classified
  report, declassified 1949) — c1
- Kalman 1960, "A New Approach to Linear Filtering and Prediction
  Problems," *Trans. ASME — J. Basic Engineering* 82(1), 35–45 — c1

## learning-theory/ (expanded at pass-2)

- Rosenblatt 1958, "The Perceptron: A Probabilistic Model for
  Information Storage and Organization in the Brain," *Psychological
  Review* 65(6), 386–408 — c1, cross-link to `07-mind/`
- Vapnik and Chervonenkis 1971, *Theory Probab. Appl.* 16(2),
  264–280 — c1
- Pearl 1982, "Reverend Bayes on Inference Engines," *Proc. AAAI* —
  c1
- Valiant 1984, "A Theory of the Learnable," *Comm. ACM* 27(11),
  1134–1142 — c1
- Pearl 1986, "Fusion, Propagation, and Structuring in Belief
  Networks," *Artificial Intelligence* 29(3), 241–288 — c1
- Littlestone 1988, "Learning Quickly When Irrelevant Attributes
  Abound," *Machine Learning* 2(4), 285–318 — c1
- Pearl 1988, *Probabilistic Reasoning in Intelligent Systems*,
  Morgan Kaufmann — c2 (originator-monograph EOR)
- Schapire 1990, "The Strength of Weak Learnability," *Machine
  Learning* 5(2), 197–227 — c1
- Wolpert 1996, "The Lack of A Priori Distinctions Between Learning
  Algorithms," *Neural Computation* 8(7), 1341–1390 — c1
- Freund and Schapire 1997, "A Decision-Theoretic Generalization of
  On-Line Learning and an Application to Boosting," *J. Comput. Syst.
  Sci.* 55(1), 119–139 — c1
- Wolpert and Macready 1997, "No Free Lunch Theorems for
  Optimization," *IEEE Trans. Evolutionary Computation* 1(1), 67–82
  — c1, paired
```

The full updated `CANON_INDEX.md` will incorporate the §1 inventory
verbatim; the two blocks above are the new-since-pass-1 additions.

---

## 8. Work queue and unresolved questions

### 8.1 Work queue

1. Update `04-information/README.md` per §7.3 (promotion-rule extension,
   Church boundary, mind boundary). Effort S.
2. Rewrite `04-information/CANON_INDEX.md` per §7.4 and the §1 inventory.
   Effort S.
3. Scaffold the eleven sub-folders in §7.1, including the new
   `cybernetics-and-estimation/`. Effort S.
4. Mirror the Friedman *Military Cryptanalysis* I–IV PDFs from
   `archive.org/details/nsa-friedman` to
   `gdrive:AGFarms/Nucleus/research/bucket-canon/04-information/
   cryptography/pedagogical-primary/` with the §2.1 provenance metadata.
   Effort M.
5. Mirror the Shannon 1948 BSTJ PDF + the Shannon 1949 BSTJ PDF + the
   Shannon 1949 *Proc. IRE* PDF to the canon under
   `information-theory/`. Effort S.
6. Build `04-information/CROSS_LINKS.md` from §7.2 and reciprocate against
   `01-mathematics/CROSS_LINKS.md` (when math pass-3 produces it),
   `02-physics/CROSS_LINKS.md`, `03-chemistry/CROSS_LINKS.md`,
   `08-deep-history/CROSS_LINKS.md`. Effort M.
7. File a bead in `bkt-` for the Marr 1982 / Friston 2010 disposition,
   pending mind pass-2. Effort XS.
8. Resolve the §8.2 unresolved questions in pass-3. Effort L.

### 8.2 Unresolved questions for pass-3

1. **Should `compression-sampling/` collapse?** Its current contents are
   either cross-links (the sampling theorem, which is in
   `information-theory/` as Nyquist 1928 + Shannon 1949 *Proc. IRE*) or
   already filed in `coding-theory/` (Lempel–Ziv 1977/1978 universality
   results). Pass-3 should decide whether the sub-fold has independent
   reason to exist or whether it folds into `information-theory/` and
   `coding-theory/` cleanly.

2. **Does `learning-theory/` split into `learning-theory/` +
   `graphical-models/`?** With Pearl 1982/1986/1988 added at pass-2, the
   sub-fold now contains both the statistical-learning lineage (VC,
   PAC, boosting, NFL) and the probabilistic-inference lineage (Pearl).
   Pass-3 should test whether the two lineages are coherent in one
   sub-fold or whether `graphical-models/` opens. The case for splitting
   is that probabilistic graphical models are a foundational primitive
   for inference, not just learning, and the Pearl monograph is
   load-bearing for non-learning applications (diagnosis, expert
   systems, causal inference). The case against is that the sub-fold is
   small enough that splitting is premature.

3. **Should Pearl 2009 *Causality* (CUP, ISBN 978-0-521-89560-6)
   promote alongside Pearl 1988?** The 2009 monograph contains the
   do-calculus and the structural-causal-model framework, both
   originator content not present in the 1988 monograph. Under the
   chemistry pass-3 §3.1 originator-monograph rule it would qualify as
   c1, but the framework is still being absorbed and the load-bearing
   is harder to assess at pass-2. Pass-3 to call.

4. **What is the right placement for the sampling theorem?** Currently
   listed twice — as Nyquist 1928 in `information-theory/` and as
   Shannon 1949 *Proc. IRE* in `information-theory/`. The originator
   content overlaps. Pass-3 should decide whether to file as a single
   paired entry or two separate entries with a cross-reference.

5. **Does the Bell 1964 paper need an entry here, or only a
   cross-link?** Pass-2 deferred to physics. If physics pass-2 declines
   to inventory Bell 1964 (it was missing from physics pass-1's
   `quantum-mechanics/` list), then the BB84 / E91 foundation has no
   primary anchor in the canon and `04-information/quantum-information/`
   may need to host Bell 1964 as a cross-listed primary entry. Pass-3
   should check the physics pass-2 outcome and act accordingly.

---

End of pass-2 deep-dive memo.
