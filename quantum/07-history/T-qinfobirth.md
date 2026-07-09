# Birth of quantum information theory (1970–1984) · T-qinfobirth
**Layer:** L6 History · **Chapter:** §07 · **Status:** depth

## The arc
Before there was quantum *computing*, there was quantum *information* — the recognition that a quantum state is a carrier of information governed by its own rules, distinct from Shannon's classical theory. The idea's patient zero is Stephen Wiesner, a Columbia graduate student who around 1970 wrote a manuscript called "Conjugate Coding" describing how to encode two messages in conjugate observables (like the linear and circular polarization of light) so that a receiver can read one or the other but never both — and, as a bonus, how to make banknotes that cannot be counterfeited because an unknown quantum state cannot be copied. It was so far ahead of its time that it was rejected (reportedly by IEEE Transactions on Information Theory) and sat unpublished for thirteen years, circulating only as a curiosity among a few physicists. One of the few who took it seriously was Charles Bennett, Wiesner's friend; another was Gilles Brassard. In 1984 they turned Wiesner's conjugate coding into BB84, the first quantum key distribution protocol — and quantum information had its first practical technology. In parallel, Alexander Holevo (Moscow, 1973) proved the fundamental limit on how much classical information a quantum state can carry, and Wootters, Zurek, and Dieks (1982) proved the no-cloning theorem that makes the whole edifice secure. By 1984 the conceptual toolkit — qubits as information carriers, no-cloning as a security primitive, channel capacities, conjugate coding — was in place, waiting for Deutsch and Shor to add computation (see T-birth).

## Milestone timeline
- ~1970 — "Conjugate Coding" manuscript: quantum money and multiplexed messages via conjugate observables — Stephen Wiesner — the founding idea of quantum cryptography, rejected and unpublished for over a decade — T1 Wiesner, eventually in SIGACT News 15(1), 78 (1983)
- 1973 — Holevo bound: a qubit conveys at most one bit of accessible classical information; the general capacity limit for quantum channels — Alexander Holevo — a founding theorem of quantum information theory (later completed by the HSW theorem, 1996–98) — T1 Holevo, Probl. Peredachi Inf. 9(3), 3 (1973)
- 1975–1976 — Early quantum detection and estimation theory; distinguishability limits — Helstrom; Holevo — the quantum analogue of statistical inference — T1 Helstrom, *Quantum Detection and Estimation Theory* (1976)
- 1982 — No-cloning theorem: an unknown quantum state cannot be perfectly copied — Wootters & Zurek (Nature); Dieks (Phys. Lett. A) — the security root of quantum cryptography; makes eavesdropping detectable (see F-nocloning) — T1 Nature 299, 802 (1982)
- 1983 — Wiesner's "Conjugate Coding" finally appears in print — SIGACT News — thirteen years late — T1 SIGACT News 15(1), 78–88 (1983)
- 1984 — BB84 quantum key distribution: Wiesner's conjugate coding turned into a working key-exchange protocol — Charles Bennett & Gilles Brassard — quantum information's first technology; still deployed (see A-qkd) — T1 Proc. IEEE Int. Conf. Computers, Systems and Signal Processing, Bangalore, 175 (1984)
- 1991 — Entanglement-based QKD (E91), grounding security in Bell-inequality violation — Artur Ekert — links quantum crypto to the foundations program (see T-foundations) — T1 Ekert, PRL 67, 661 (1991)

## Why it earns its own card
The birth-of-computing card (T-birth) starts the clock at 1980 with Manin, Benioff, and Feynman, but that framing hides an older lineage: the information-theoretic roots that predate the computational ones. Wiesner's 1970 insight — that conjugate observables plus no-cloning give you security for free — is arguably the first genuinely quantum *application* ever conceived, and it arrived before anyone was thinking about computation at all. Giving it a dedicated card corrects the "Feynman started everything" simplification and makes visible the crypto→computing sequence: the field learned to *protect* information with quantum mechanics before it learned to *process* it.

## The human context
Wiesner (1942–2021) never held a conventional physics career commensurate with his ideas; Scott Aaronson's memorial notes that he spent years as a construction laborer in Israel while the field he seeded became a global enterprise. Bennett has said BB84 was essentially Wiesner's idea with a use case attached. The pattern — a foundational insight, rejected and dormant for a decade, then activated by someone who happened to know the originator — recurs throughout quantum history (Everett's many-worlds, Bell's theorem in an obscure journal).

## Key graded claims
- claim: Quantum key distribution (BB84) derives its security from the no-cloning theorem and measurement disturbance, making it information-theoretic rather than computational · tier: T1 · status: established — see A-qkd, F-nocloning
- claim: The Holevo bound caps accessible classical information in a quantum state at one bit per qubit · tier: T1 · status: established — a founding result of quantum Shannon theory
- claim: Wiesner's ~1970 conjugate coding is the earliest conceived quantum information application · tier: T1 (historical) · status: established, though "earliest" is a claim about priority and framing

## Sources
- Wiesner, "Conjugate Coding," SIGACT News 15(1), 78 (1983, written ~1970); Holevo, Probl. Peredachi Inf. 9 (1973); Wootters & Zurek, Nature 299 (1982); Bennett & Brassard, BB84 (1984); Ekert, PRL 67 (1991)
- Aaronson, "Stephen Wiesner (1942–2021)," scottaaronson.blog; Wikipedia "Quantum money," "Holevo's theorem"
- **Go deeper:** F-qinfo (the modern theory); F-nocloning; A-qkd; T-birth (where computation joins); T-nobel
