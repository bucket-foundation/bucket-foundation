# Post-Quantum Cryptography · A-pqc
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Classical cryptography built on problems believed hard even for quantum computers (structured lattices, hash functions, error-correcting codes, isogenies), replacing the RSA and elliptic-curve schemes that Shor's algorithm (`S-shor`) breaks in polynomial time. The driver is **"harvest now, decrypt later" (HNDL)**: adversaries record encrypted traffic today to decrypt once a cryptographically-relevant quantum computer (CRQC) exists — so any secret with a shelf life past the CRQC date (state secrets, health records, genomic data, long-term IP) is *already* at risk, regardless of when the machine actually arrives. PQC runs on today's classical hardware; it is the pragmatic answer to the quantum threat, and the one all four Five-Eyes-adjacent signals agencies endorse over QKD (`A-qkd`).

## Maturity & real deployments (2025–26)
**Commercial and deploying at internet scale now — the most consequential quantum-adjacent technology of the decade.**
- **Standards**: NIST finalized **FIPS 203 ML-KEM** (Kyber), **FIPS 204 ML-DSA** (Dilithium), and **FIPS 205 SLH-DSA** (SPHINCS+) in **August 2024**. **HQC** (code-based) was selected March 2025 as a backup KEM on a different math assumption, finalization ~2027.
- **Live deployment**: hybrid **X25519 + ML-KEM-768** key exchange is default in **Chrome, Firefox, Cloudflare** and major CDNs — a large fraction of TLS 1.3 handshakes on the open web are already post-quantum. **Signal (PQXDH)** and **Apple iMessage (PQ3)** shipped PQC messaging; PQ3 does continuous rekeying for forward secrecy against HNDL.
- **Blockchain adoption**: Algorand executed quantum-resistant **Falcon**-signed transactions and enabled Falcon-based accounts on mainnet (Nov 2025) — an early production PQC signature in public-ledger infrastructure.
- **Mandated deadlines**: NSA **CNSA 2.0** requires new national-security-system acquisitions to be PQC-capable by **Jan 1 2027**, full NSS migration by **2030–2035**; NIST IR 8547 deprecates quantum-vulnerable algorithms by **2030**, disallows after **2035**.

## Key graded claims
- T2 ML-KEM/ML-DSA/SLH-DSA standardized after multi-year public cryptanalysis — NIST FIPS 203/204/205, Aug 2024 (established)
- T2 Hybrid PQC key exchange live across major browsers/CDNs at internet scale — Cloudflare/Google deployment telemetry (demonstrated)
- T2 Falcon-signed accounts live on Algorand mainnet — Nov 2025 (demonstrated)
- T1/T2 Shor breaks RSA/ECC given an FTQC — Shor 1994 (established); the *date* such a machine exists is T6
- T5 HNDL is economically rational for state actors today — CSA / arXiv analyses (claimed)

## Conflicts / open questions
- **C-pqc-confidence**: lattice hardness has *no* unconditional security proof — a classical or quantum cryptanalytic surprise (cf. **SIKE's 2022 one-afternoon collapse** on a classical laptop) would force re-migration. Hence HQC as a math-diverse hedge, and **hybrid modes** (classical + PQC together) as the default so a break in either half is not catastrophic.
- **Migration inventory is the real bottleneck**: the algorithms are ready, but most organizations cannot enumerate where cryptography lives in their stacks (embedded keys, protocols, certificates, HSMs), so "crypto-agility" and discovery tooling — not new math — is the gating work.

## The honest call
**The single most real, most deployed, most economically-important item in the whole adjacent-tech chapter — and it isn't even quantum hardware.** PQC is classical software, shipping now, on a legally-mandated clock. If any node in §04 pays for itself this decade, it is this one. The open risk is cryptanalytic (an assumption breaks), not deployment.

## Sources
- https://csrc.nist.gov/projects/post-quantum-cryptography
- https://pages.nist.gov/nccoe-migration-post-quantum-cryptography/
- https://algorand.co/technology/post-quantum (Falcon on mainnet, 2025)
- NSA CNSA 2.0 FAQ / timeline; NIST IR 8547
