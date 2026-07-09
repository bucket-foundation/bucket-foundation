# Quantum-secured & quantum-resistant blockchain · A-qblockchain
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3, new node)

## What it is
Blockchains are unusually exposed to quantum attack: their security rests almost entirely on the elliptic-curve signatures (ECDSA/EdDSA) that Shor's algorithm (`S-shor`) breaks, and every public key ever exposed on-chain is *permanently* harvestable (`A-pqc`'s HNDL threat, but worse — the ciphertext-equivalent is the immutable ledger itself). Two responses, often conflated:
1. **Quantum-resistant blockchain** — swap ECDSA for a PQC signature (lattice-based Dilithium/ML-DSA, or hash/NTRU-based **Falcon**, or stateful hash schemes). This is classical software; the dominant, practical track.
2. **Quantum-secured blockchain** — use QKD (`A-qkd`) or QRNG (`A-qrng`) to protect the *network* links or seed keys. Mostly experimental and niche.

## Maturity & real deployments (2025–26)
**Quantum-resistant is deploying now; quantum-secured is a research sideshow.**
- **Algorand** executed quantum-resistant **Falcon**-signed transactions and, in **November 2025**, enabled **Falcon-based accounts on mainnet** — an early production PQC signature scheme on a mainstream public ledger (via state proofs already using Falcon since 2022).
- **QRL (Quantum Resistant Ledger)** has run a hash-based-signature (XMSS) chain since 2018 — a purpose-built PQC blockchain.
- **Bitcoin/Ethereum** face the hardest migration: proposals exist (e.g. quantum-resistant address types, a "P2QRH" BIP for Bitcoin; account-abstraction paths for Ethereum) but require contentious hard/soft forks and a plan for the millions of coins in exposed-public-key addresses (including dormant early-Bitcoin wallets that cannot be moved by their owners). Research consolidations (Hyperledger Fabric + Kyber/Dilithium/Falcon; SoK arXiv:2512.13333) map the design space.
- **Threat timing**: consensus estimates put a CRQC able to break ECC at **~5–15 years** out, which is *inside* the lifetime of long-lived on-chain keys — the reason migration is being taken seriously now.

## Key graded claims
- T2 Falcon-signed accounts live on Algorand mainnet (Nov 2025); QRL XMSS chain live since 2018 — project releases (demonstrated)
- T2 PQC signatures (ML-DSA/Falcon/SLH-DSA) integratable into blockchains without new math — NIST FIPS 204/205; Hyperledger integrations (established)
- T5 A CRQC threatening ECDSA is ~5–15 years out — analyst/CSA consensus (claimed/forecast)
- T4 QKD/QRNG "quantum-secured" ledgers as a needed product — vendor/academic pilots (claimed, niche)

## Conflicts / open questions
- **Signature bloat**: PQC signatures are large (Dilithium ~2.4 kB, Falcon ~0.7 kB, SPHINCS+ ~8–50 kB) vs ECDSA's ~64 bytes — inflating block size, fees, and validation cost. This is the real engineering tax, and it is why chains pick Falcon (small but complex to implement) over Dilithium where they can.
- **The unmovable-coins problem**: exposed public keys on existing UTXOs (and lost-key wallets) can't be retroactively protected — a fork can require new PQC addresses going forward but cannot rescue the old exposed ones from a future quantum attacker.
- **Quantum-secured (QKD) blockchain** inherits all of QKD's limits (distance, trusted relays, `C-qkd-vs-pqc`) and adds little a PQC signature doesn't — mostly a solution in search of a problem.

## The honest call
**Quantum-resistant blockchain is real, live, and mostly a PQC-migration story (so it's `A-pqc` applied to ledgers) — the interesting nuance is signature-size economics and the unmovable-coins overhang.** "Quantum-secured" (QKD-based) blockchain is a research curiosity with weak motivation. The genuine near-term risk is not exotic: it's that Bitcoin/Ethereum are slow to fork and hold trillions in ECDSA-exposed value on a ~5–15-year clock.

## Sources
- https://algorand.co/technology/post-quantum (Falcon on mainnet, 2025)
- https://www.theqrl.org/the-definitive-guide-to-post-quantum-blockchain-security/
- https://arxiv.org/pdf/2512.13333 (SoK: post-quantum attackers, blockchain security & performance)
- https://www.chainalysis.com/blog/quantum-computing-crypto-security/ (threat timing)
