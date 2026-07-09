# The Cryptographically-Relevant Quantum Computer (CRQC) Timeline · O-crqc-timeline
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
A **cryptographically-relevant quantum computer** is one that can run Shor's algorithm at scale — factoring RSA-2048 or solving the discrete logarithm behind ECC, breaking the public-key crypto that secures nearly all internet traffic, finance, and government data. This is a *specific* fault-tolerant milestone, distinct from the general "useful FTQC" question (O-scaling): it needs thousands of logical qubits sustained through ~10⁹ operations. It carries its own urgency because of **harvest-now-decrypt-later (HNDL)**: adversaries can record encrypted traffic *today* and decrypt it once a CRQC exists, so any secret that must stay confidential for a decade is already at risk. The sharp question: when does the CRQC arrive, and is PQC migration (A-pqc) outrunning it? This is where **Mosca's inequality** bites — if (migration time) + (secrecy shelf-life) > (time to CRQC), you are already exposed.

## Where the disagreement is
- **Sooner / resources-are-falling camp.** Craig Gidney (Google, arXiv:2505.15917, 2025) cut the RSA-2048 estimate ~20×, to **<1M noisy physical qubits at ~1 week runtime** — down from ~20M (2019) — via approximate residue arithmetic, yoked surface codes, and magic-state cultivation T3. Expert-elicitation surveys (Global Risk Institute) put meaningful probability on a CRQC within a decade: roughly **22.7% of surveyed cryptographers expect RSA-2048 to fall by 2030, and ~50% by 2035**; point estimates cluster around **2030 ± 3 years** T5. NIST has already standardized PQC (ML-KEM/Kyber, ML-DSA/Dilithium) precisely because the threat is treated as near enough to act on now [T2, standards].
- **Later / hardware-isn't-close camp.** A <1M-qubit *estimate* is not a <1M-qubit *machine* — the largest devices are ~1,000–6,000 physical qubits, so the gap is 2–3 orders of magnitude in count while *holding* the fidelity Shor needs, which nobody has shown at scale (O-scaling, O-materials). Broad expert consensus places the *heaviest* weight in the mid-2030s, and Gil Kalai's minority position says a CRQC never arrives at all (O-hype). Recent toy Shor demonstrations factored only tiny numbers and do not extrapolate. The energy cost of the run is itself nontrivial (O-energy). Skeptics stress that the resource *estimates* keep improving on paper faster than the *hardware* improves in the lab.

## What would resolve it
A quantum computer factoring a cryptographically meaningful RSA modulus (even RSA-1024, then 2048) with fault tolerance — or credible interim milestones: factoring a 100+-bit semiprime with Shor (not a special-form or annealing shortcut), then scaling. On the defensive side, completion of PQC migration across critical infrastructure before any CRQC appears would neutralize the threat regardless of the exact date. The dials: physical-qubit count *at Shor-relevant fidelity*, published Shor demonstrations on growing moduli, and the pace of NIST-PQC deployment versus HNDL exposure windows.

## Sources
- Gidney, "How to factor 2048 bit RSA integers with less than a million noisy qubits," arXiv:2505.15917 (2025) T3
- Global Risk Institute Quantum Threat Timeline expert survey (2030 ± 3; ~50% by 2035) T5
- NIST FIPS 203/204/205 (ML-KEM, ML-DSA, SLH-DSA) post-quantum standards (2024) T2
- quantumzeitgeist.com, "Cryptographically Relevant Quantum Computer: Complete 2026 Guide"; postquantum.com HNDL + RSA-2048 energy analyses T3/T5
- Mosca, "Cybersecurity in an era with quantum computers" (Mosca's inequality) T3
