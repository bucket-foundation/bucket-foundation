# Quantum in Intelligence & Cryptanalysis · I-intelligence
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth
**Added:** 2026-07-08 (cycle 3 random-walk — split from `I-aerospace` defense and `I-cyber` defense; the offensive SIGINT/cryptanalysis angle is distinct)

## The pitch
Distinct from defense hardware (`I-aerospace`) and defensive PQC (`I-cyber`), this node is the **offensive signals-intelligence** dimension: a cryptographically relevant quantum computer (CRQC) running Shor (`S-shor`) would let a state actor decrypt intercepted RSA/ECC traffic. The strategic behavior this *already* drives is **harvest-now-decrypt-later (HNDL)** — bulk collection and storage of today's encrypted traffic for future decryption. Secondary: quantum-enhanced pattern-analysis over massive intercept datasets (the same QML caveats as `I-ai`).

## Real activity (named, dated)
- **Intelligence-community warnings** — NSA, CISA, and NIST have jointly warned that adversaries **may already be harvesting** encrypted data with long-term value to decrypt once a CRQC exists (the HNDL doctrine). Nation-state SIGINT programs (US, China, Russia) operate the bulk-collection infrastructure that makes HNDL feasible.
- **NSA CNSA 2.0** — mandates quantum-resistant algorithms for new national-security systems by **Jan 2027**, full transition by 2035 — an intelligence-driven timeline (defend own secrets against adversary CRQC).
- **Resource-estimate shift (2025–26)** — the RSA-2048 qubit estimate fell from ~20M (2019) toward **<1M, possibly ~100k** on newer architectures — which compresses the intelligence risk horizon without a CRQC existing yet.
- **No CRQC exists.** No public evidence any agency can run Shor at cryptographic scale. Adversary capability is classified — the honest overhang.

## Key graded claims
- [T1] Shor breaks RSA/ECC given a CRQC — established theory (`S-shor`); the CRQC itself is [T6]
- [T3] Bulk HNDL collection is technically feasible and warned-of by NSA/CISA/NIST — official advisories (established as doctrine; specific programs classified)
- [T3] RSA-2048 resource estimate reduced toward <1M qubits — 2025–26 preprints (revised estimate, not a demonstration)
- [T6] Any agency currently possesses cryptanalytic quantum capability — speculative/classified (no public evidence)

## Proven today vs promise vs hype
- **Proven:** the doctrine and the math. HNDL is a real, warned-of collection strategy; Shor's threat is certain given a CRQC.
- **Promise (or threat):** a future CRQC that decrypts harvested traffic — timing genuinely unknown (2030–2040+, `O-scaling`).
- **Hype:** claims that a nation "already breaks encryption with quantum," stated with false certainty from classified inference.

## Honest assessment
Intelligence is the vertical where quantum's impact is most certain in *kind* and most uncertain in *timing*, wrapped in classification. Shor's threat to public-key crypto is established; HNDL collection is real doctrine, which is precisely why CNSA 2.0's deadlines exist. What no one outside classified spaces knows is whether — or how close — any adversary is to a CRQC, and the recent qubit-count reductions tighten the risk window without resolving it. The rational response is the same as `I-cyber`: migrate to PQC now, because HNDL makes the risk retroactive. Treat any "they already have it" claim as unverifiable. Offensive quantum SIGINT-analytics (QML over intercepts) inherits `I-ai`'s dequantization caveats.

## Sources
- "Harvest now, decrypt later": https://en.wikipedia.org/wiki/Harvest_now,_decrypt_later
- The Quantum Insider "Harvest Now, Decrypt Later — Why Should You Care?" (May 2026)
- NSA CNSA 2.0 (quantum-resistant mandate, 2027/2035)
- MDPI "Harvest-Now, Decrypt-Later: A Temporal Cybersecurity Risk in the Quantum Transition"
