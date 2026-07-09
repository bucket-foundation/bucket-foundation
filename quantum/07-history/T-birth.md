# Birth of quantum computing (1980–1994) · T-birth
**Layer:** L6 History · **Chapter:** §07 · **Status:** depth

## The arc
The idea arrived from several directions at once. Yuri Manin (1980, in a Russian book) and Paul Benioff (1980) asked whether computation itself could be quantum-mechanical — Benioff building an explicit quantum Turing machine to show computation is compatible with unitary evolution. Richard Feynman flipped the question in a now-legendary May 1981 keynote at the first MIT Physics of Computation conference: classical computers choke on simulating quantum systems because the state space grows exponentially, so build a quantum machine to simulate quantum physics natively. "Nature isn't classical, dammit, and if you want to make a simulation of nature, you'd better make it quantum mechanical." David Deutsch made it rigorous in 1985 — a universal quantum computer and the first quantum algorithm — motivated partly by wanting to test the many-worlds interpretation. Bennett and Brassard, building on Wiesner's dormant conjugate-coding idea (see T-qinfobirth), showed quantum states could carry provably secure keys (BB84, 1984). The era ends with a detonation: Peter Shor's 1994 algorithm factored integers in polynomial time, threatening RSA and the entire public-key infrastructure. Overnight, quantum computing went from a physicists' curiosity to a national-security priority. Every funding line that exists today traces back to that one result.

## Milestone timeline
- 1980 — Quantum computation floated in *Computable and Uncomputable* — Yuri Manin — earliest published suggestion (in Russian, so little-noticed in the West for years) — [T1] Manin, Sovetskoye Radio (1980)
- 1980 — Quantum-mechanical model of a Turing machine — Paul Benioff (Argonne) — showed computation is compatible with reversible quantum evolution — [T1] Benioff, J. Stat. Phys. 22, 563 (1980)
- 1981 (6–8 May) — "Simulating Physics with Computers" keynote, MIT Physics of Computation conference — Richard Feynman — the field's founding motivation: simulate quantum with quantum — [T1] published Feynman, Int. J. Theor. Phys. 21, 467 (1982)
- 1982 — No-cloning theorem: an unknown quantum state cannot be copied — Wootters & Zurek; Dieks — the security root of quantum crypto (see F-nocloning) — [T1] Nature 299, 802 (1982)
- 1984 — BB84 quantum key distribution protocol — Charles Bennett (IBM) & Gilles Brassard (Montréal) — first quantum information technology; still deployed today — [T1] Proc. IEEE Int. Conf. on Computers, Systems and Signal Processing, Bangalore, 175 (1984)
- 1985 — Universal quantum computer; the quantum Turing machine; the first quantum algorithm (Deutsch's problem) — David Deutsch (Oxford) — the theoretical foundation of the whole field — [T1] Deutsch, Proc. R. Soc. A 400, 97 (1985)
- 1992 — Deutsch–Jozsa algorithm, first provable exponential quantum–classical separation in the exact query model — David Deutsch & Richard Jozsa — proof the speedups could exist — [T1] Proc. R. Soc. A 439, 553 (1992)
- 1993 — Bernstein–Vazirani and the first steps toward complexity-theoretic separation; quantum teleportation protocol — Bernstein & Vazirani (STOC 1993); Bennett, Brassard, Crépeau, Jozsa, Peres, Wootters — entanglement as a communication resource — [T1] PRL 70, 1895 (1993)
- 1994 (20 Nov) — Polynomial-time factoring and discrete-log algorithm — Peter Shor (AT&T Bell Labs) — broke public-key crypto in principle; ignited the field and its funding — [T1] Shor, Proc. 35th FOCS, 124 (1994); SIAM J. Comput. 26, 1484 (1997)
- 1994 — Simon's problem: the exponential separation that directly inspired Shor — Daniel Simon — the algorithmic template (period-finding) Shor generalized — [T1] Proc. 35th FOCS, 116 (1994)

## The human context
Feynman's talk is often called the birth of the field, but he was pitching a simulator, not a general-purpose computer, and he was skeptical the machine could be built. Deutsch's universal model came from a physicist worried about interpretation, not computation. Shor's algorithm reportedly grew out of Simon's problem, which Shor heard about at a talk; he generalized period-finding to factoring within weeks. The result was so consequential that within two years the field went from a few dozen people to a global program — and cryptographers began the migration that is still underway 30 years later (see A-pqc).

## Key graded claims
- claim: Shor's algorithm factors N in polynomial time on an ideal fault-tolerant quantum computer · tier: T1 · source: Shor 1994; SIAM J. Comput. 26, 1484 (1997) · status: established (mathematically proven; large-scale execution still awaits hardware — see S-shor, O-scaling)
- claim: Feynman's simulation pitch is the application most likely to pay off first · tier: T6 · provenance: widely held field belief, unproven at scale · status: speculative — see S-qsim, O-killerapp
- claim: The no-cloning theorem (1982) makes BB84 security information-theoretic, not computational · tier: T1 · status: established — see F-nocloning, A-qkd

## Sources
- Manin (1980); Benioff, J. Stat. Phys. 22 (1980); Feynman, IJTP 21 (1982); Wootters–Zurek, Nature 299 (1982); Bennett–Brassard, BB84 (1984); Deutsch, Proc. R. Soc. A 400 (1985); Shor, FOCS (1994); Simon, FOCS (1994)
- **Go deeper:** T-qinfobirth (Wiesner→Holevo→Bennett-Brassard lineage); S-shor; F-nocloning; T-early (turning theory into hardware)
