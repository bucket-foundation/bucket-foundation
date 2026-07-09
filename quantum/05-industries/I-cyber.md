# Quantum in Cybersecurity · I-cyber
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Cybersecurity is the industry with the most *certain* quantum impact — and it lands as a **threat before it lands as a tool**. A cryptographically relevant quantum computer (CRQC) running Shor's algorithm (`S-shor`) breaks RSA and elliptic-curve crypto, so the internet's encryption must migrate to post-quantum cryptography (`A-pqc`). "Harvest now, decrypt later" (HNDL) means adversaries are already storing encrypted traffic to decrypt once a CRQC exists. This is a real, funded, deadline-driven market today.

## Real activity (named, dated)
- **NIST** — finalized first PQC standards **FIPS 203 (ML-KEM), 204 (ML-DSA), 205 (SLH-DSA)** in Aug 2024, triggering the largest mandated crypto migration in history. NIST IR 8547 sets deprecation timelines (2030 deprecate, 2035 disallow).
- **NSA CNSA 2.0** — quantum-safe algorithms required for new national-security systems by **Jan 2027**, full app migration by 2030, infrastructure by 2035.
- **Resource-estimate shift** — work published May 2025–March 2026 cut the estimated qubits to break RSA-2048 from ~20M (Gidney/Ekerå 2019) toward **<1M, potentially ~100k** on newer architectures — sharpening the HNDL urgency without a CRQC yet existing.
- **Enterprise reality** — a May 2025 survey of 1,000+ security managers found only **~5% had quantum-safe encryption deployed**; 81% said libraries/HSMs weren't PQC-ready.

## Key graded claims
- [T2] NIST PQC standards final (FIPS 203/204/205), migration mandated — NIST, Aug 2024 (established)
- [T1] Shor breaks RSA/ECC given a CRQC — established theory (`S-shor`); the CRQC itself is [T6]
- [T3] RSA-2048 resource estimate reduced toward <1M qubits — 2025–26 preprints (revised estimate, not a demonstration)
- [T5] ">$15B migration market by 2030" / 5% deployment rate — surveys + analyst projections (forecast; inflation-unadjusted)

## Proven today vs promise vs hype
- **Proven:** the threat model and the standards. Shor's math is established; FIPS 203/204/205 are final; deadlines are legally binding for regulated/defense sectors.
- **Promise:** actual enterprise migration — mandated but barely started (~5% deployed).
- **Hype:** "Q-Day is next year," QKD as the answer (PQC software is), and CRQC timelines stated with false precision.

## Honest assessment
This is the one industry where quantum's impact is **not** overstated — the threat is mathematically certain, the standards are final, the deadlines are binding. The uncertainty is *timing*: CRQC estimates range 2030 to "not before 2040+" (a first-class conflict, `O-scaling`), and the recent qubit-count reductions tighten but do not resolve it. Because HNDL makes the risk retroactive, migration must start now regardless. The honest caveat here runs opposite to the rest of L4 — the danger is *under*-reacting. QKD is over-marketed; classical-software PQC is the real answer.

## Sources
- NIST IR 8547 draft: https://nvlpubs.nist.gov/nistpubs/ir/2024/NIST.IR.8547.ipd.pdf
- PQShield on NIST timelines: https://pqshield.com/nist-recommends-timelines-for-transitioning-cryptographic-algorithms/
- "Harvest now, decrypt later" — The Quantum Insider (May 2026), CSA Q-Day clock
- PRNewswire "The $15 Billion Post-Quantum Migration"
