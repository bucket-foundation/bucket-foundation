# Early experiments (1995–2010) · T-early
**Layer:** L6 History · **Chapter:** §07 · **Status:** depth

## The arc
After Shor, the question stopped being "is it useful?" and became "can you actually build one?" This era answered "in principle, yes" — while quietly revealing how hard the engineering would be. Cirac and Zoller published a realistic trapped-ion two-qubit gate in May 1995, and Wineland's NIST group demonstrated a working quantum logic gate on a single beryllium ion within months. The deepest result was theoretical: Shor (1995) and Steane (1996) proved that quantum errors could be corrected *without measuring — and thereby destroying — the encoded data*, removing the single strongest objection to the whole enterprise. The threshold theorem (Aharonov–Ben-Or, Knill–Laflamme–Zurek, Kitaev, 1996–98) then showed that below a critical error rate, arbitrarily long computations are possible. Grover added a second headline algorithm. NMR machines ran the first real algorithms — including Shor's algorithm factoring 15 — before hitting a hard scalability wall. DiVincenzo wrote down the five-item checklist any real platform must satisfy, still the field's scorecard. And superconducting circuits went from the first coherent charge qubit (NEC 1999) through circuit QED (Yale 2004) to the transmon (Yale 2007) — the noise-tolerant design that would dominate the next two decades.

## Milestone timeline
- 1995 (May) — Trapped-ion CNOT gate proposal using a shared vibrational mode as the bus — Ignacio Cirac & Peter Zoller (Innsbruck) — first realistic hardware blueprint for any platform — [T1] Cirac & Zoller, PRL 74, 4091 (1995)
- 1995 (Dec) — First quantum logic gate demonstrated on a single ⁹Be⁺ ion — Monroe, Meekhof, King, Itano, Wineland (NIST) — theory becomes experiment in seven months — [T1] Monroe et al., PRL 75, 4714 (1995)
- 1995–96 — Quantum error-correcting codes: the 9-qubit Shor code, then the 7-qubit Steane (CSS) code — Peter Shor; Andrew Steane — errors are correctable; fault tolerance is possible — [T1] Shor, Phys. Rev. A 52, R2493 (1995); Steane, PRL 77, 793 (1996)
- 1996 — Threshold theorem: below a critical physical error rate, arbitrarily long computation is possible — Aharonov–Ben-Or; Knill–Laflamme–Zurek; Kitaev — the theoretical license for fault tolerance (see S-qec) — [T1] STOC 1997; Science 279, 342 (1998)
- 1996 — Unstructured-search algorithm, quadratic speedup O(√N) — Lov Grover (Bell Labs) — the second canonical algorithm — [T1] Grover, Proc. 28th STOC, 212 (1996)
- 1997–98 — First NMR quantum algorithms (Deutsch–Jozsa, Grover on 2 qubits) — Chuang, Gershenfeld, Jones et al. — first algorithms run on any hardware — [T2] Nature 393, 143 (1998); Chuang et al., PRL 80, 3408 (1998)
- 1999 — First coherent superconducting (charge) qubit; Rabi oscillations in a Cooper-pair box — Nakamura, Pashkin, Tsai (NEC) — solid-state qubits arrive — [T2] Nakamura et al., Nature 398, 786 (1999)
- 2000 — DiVincenzo criteria: five requirements (plus two for communication) any quantum computer must meet — David DiVincenzo (IBM) — the checklist every new modality is still graded against — [T1] DiVincenzo, Fortschr. Phys. 48, 771 (2000)
- 2001 — Shor's algorithm factors 15 = 3 × 5 on 7 NMR qubits — Vandersypen, Steffen, Chuang et al. (IBM Almaden/Stanford) — proof-of-principle for the algorithm that started the field — [T2] Nature 414, 883 (2001)
- 2004 — Circuit QED: a superconducting qubit strongly coupled to a single microwave photon in a resonator — Wallraff, Schoelkopf, Girvin et al. (Yale) — the readout-and-coupling architecture of all superconducting QCs — [T2] Nature 431, 162 (2004)
- 2007 — Transmon qubit: charge-noise-insensitive by design — Koch, Schoelkopf, Devoret et al. (Yale) — the workhorse used by IBM, Google, Rigetti to this day — [T2] Koch et al., Phys. Rev. A 76, 042319 (2007)

## The human context
NMR's early lead was real and then evaporated — Braunstein and colleagues showed in 1999 that room-temperature liquid-state NMR states are so mixed they are arguably never entangled, and the signal decays exponentially with qubit count, so the "factoring 15" demo could not have scaled. Two of the 2007 transmon co-authors, Devoret and Martinis, would later share the 2025 Nobel Prize for the macroscopic-quantum-tunneling experiments (1984–85) that made superconducting qubits conceivable in the first place (see T-nobel). This era is where the modern hardware map was drawn: ions and superconductors as the two front-runners, error correction as the organizing goal.

## Key graded claims
- claim: Quantum error correction works — errors can be detected and reversed without measuring the logical data · tier: T1 · source: Shor (1995), Steane (1996) · status: established (theory); experimentally realized below threshold only in 2024 (see T-ecera)
- claim: Liquid-state NMR does not scale (signal decays exponentially; states arguably unentangled) · tier: T1 · source: Braunstein et al., PRL 83, 1054 (1999) · status: established — why NMR's early lead evaporated
- claim: A working platform must satisfy the DiVincenzo criteria (scalable qubits, initialization, universal gates, long coherence, measurement) · tier: T1 · status: established as the field's standard scorecard

## Sources
- Cirac–Zoller, PRL 74 (1995); Monroe et al., PRL 75 (1995); Shor (1995); Steane (1996); Grover, STOC (1996); DiVincenzo, Fortschr. Phys. 48 (2000); Vandersypen et al., Nature 414 (2001); Wallraff et al., Nature 431 (2004); Koch et al., PRA 76 (2007)
- **Go deeper:** S-qec (codes and threshold); H-ion, H-supercon (the two platforms this era chose); T-nobel (Devoret/Martinis 2025); T-race (industrial scale-up)
