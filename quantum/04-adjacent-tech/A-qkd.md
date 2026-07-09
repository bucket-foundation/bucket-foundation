# Quantum Key Distribution · A-qkd
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
QKD lets two parties grow a shared secret key whose security rests on physics — the no-cloning theorem (`F-nocloning`) and measurement disturbance — rather than computational hardness. BB84 (Bennett–Brassard 1984) encodes bits in non-orthogonal photon states; E91 (Ekert 1991) derives keys from entangled pairs and certifies security via Bell violation. An eavesdropper unavoidably raises the quantum bit error rate (QBER) and is detected. The security proof is information-theoretic in the ideal model — but every real deployment inherits two hard constraints: fiber loss is exponential ($\approx0.16$–$0.2\,\text{dB/km}$) so unamplified reach caps near a few hundred km, and QKD only distributes *keys*, so it still needs classically-authenticated channels and symmetric encryption to do anything useful.

## Maturity & real deployments (2025–26)
Commercial today, in niches — a two-decade-old product line with government and finance as the buyers. **Measured performance envelope:** at inter-city distances ($\sim200\,\text{km}$) twin-field QKD reaches $\mathbf{111.74\,\text{kbit/s}}$ secure key rate; the same protocol has been pushed to $\mathbf{1002\,\text{km}}$ of ultralow-loss fiber (USTC/Pan, PRL 2023) but at only $\mathbf{\sim0.0034\,\text{bit/s}}$ — a headline distance, not a usable rate. Practical metro QKD (Toshiba, ID Quantique) runs tens-of-kbit/s to Mbit/s over $10$–$100\,\text{km}$.
- **Toshiba** runs commercial metro QKD, launched a Paris service in 2025, and (with Quantum Corridor, Dec 2025) demonstrated cross-state QKD over live commercial fiber (Chicago→Indiana), including a $21.8\,\text{km}$ production segment carrying ordinary traffic.
- **ID Quantique** has sold QKD boxes since the early 2000s; anchors Geneva/Korea (SK Telecom) networks.
- **China** operates the $\sim2000\,\text{km}$ Beijing–Shanghai backbone (trusted-relay), the largest fielded network, plus the space segment (`A-satqkd`).
- **EU EuroQCI**: a continent-wide quantum-secure network is being built — Madrid's MadQCI testbed (IDQ, Toshiba, AIT), Hungary's first multi-node net with Magyar Telekom, national arms across most member states.

## Key graded claims
- T1 BB84/E91 offer information-theoretic key security in the ideal model — Bennett & Brassard 1984; Ekert PRL 1991 (established)
- T2 Real devices admit side-channel attacks (detector blinding, Trojan-horse); implementation ≠ ideal proof — Lydersen et al., Nat. Photonics 2010 (established)
- T2 Twin-field QKD over $1002\,\text{km}$ fiber at $\sim0.0034\,\text{bit/s}$; $111.74\,\text{kbit/s}$ at $202\,\text{km}$ — Liu et al., PRL 130, 210801 (2023) (demonstrated)
- T2 Beijing–Shanghai $2000\,\text{km}$ QKD backbone operational via trusted relays — Chen et al., Nature 589 (2021) (demonstrated)
- T4 Toshiba/Quantum Corridor cross-state QKD over live commercial metro fiber, $21.8\,\text{km}$ segment — Toshiba PR, Dec 2025 (claimed)

## Conflicts / open questions
- **C-qkd-vs-pqc**: NSA, UK NCSC, French ANSSI, and German BSI advise *against* QKD for national-security systems — citing cost, the trusted-relay hole, no protection against store-and-forward at relays, and the fact that authentication still needs classical (ideally PQC) crypto — and recommend PQC (`A-pqc`) instead. QKD vendors and China's program argue physics-based security is worth the cost for the highest-value links. Resolution: field success/failure of large deployments + whether PQC survives cryptanalysis over the next decade.
- Trusted relay nodes break end-to-end security — every backbone today depends on them until repeaters (`A-qinternet`) arrive. This is the single biggest gap between the marketing ("unhackable") and the deployed reality.

## The honest call
**Commercial but structurally niche.** QKD sells real boxes and secures real links today, but the addressable market is capped by three things it cannot escape without a quantum internet: distance (repeaterless ~a few hundred km), the trusted-relay compromise, and the four-agency government advice steering critical infrastructure toward PQC. It is a genuine product in a small, contested market — not the coming default for internet security.

## Sources
- https://thequantuminsider.com/2025/12/09/quantum-corridor-toshiba-demonstrate-cross-state-quantum-key-distribution-over-live-commercial-metro-fiber-network/
- https://link.aps.org/doi/10.1103/PhysRevLett.130.210801 ($1002\,\text{km}$ twin-field QKD)
- https://www.toshiba.eu/quantum/
- NSA "Quantum Key Distribution (QKD) and Quantum Cryptography" position page
- Chen et al., "An integrated space-to-ground quantum communication network," Nature 589 (2021)
