# Quantum Internet & Repeaters · A-qinternet
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
A network that distributes *entanglement* between distant nodes — enabling QKD without trusted relays, blind/distributed quantum computing, and networked quantum sensors (`A-sensing`, entanglement-based clock networks). Photon loss in fiber is exponential (~0.2 dB/km) and optical amplification is forbidden by no-cloning (`F-nocloning`), so long links need **quantum repeaters**: quantum memories (`A-qmemory-hw`) that store entanglement in short segments, then fuse segments by entanglement swapping (`F-teleport`) and purification. The figure of merit is delivered **entanglement rate vs distance**, and the field's watershed is the moment a repeater beats direct transmission at that.

## Maturity & real deployments (2025–26)
**Research — no repeater has yet beaten direct fiber in delivered entanglement rate.** That crossover has not happened; everything below is a building block toward it.
- **Metropolitan entanglement network**: QuTech (Delft) linked **Delft–The Hague over ~25 km of deployed fiber** with heralded entanglement between processor nodes (Stolk et al., Sci. Adv. 2024) — the first multi-node network on installed fiber.
- **Long-distance memory entanglement**: a preprint reports entangling quantum memories over **420 km** of fiber (arXiv:2504.05660); USTC reported **memory–memory entanglement + device-independent QKD across 100 km** (Feb 2026); long-lived **remote ion–ion entanglement** suited to repeaters appeared in Nature (2026). ICFO Barcelona demonstrated **multiplexed** memory-based distribution (2025), attacking the rate problem.
- **Programs & vendors**: Germany's **TD.QR** repeater project (started Jan 2026) targets viable repeater demos by **2028**. Startups sell early network gear — **Qunnect** (room-temperature memories, `A-qmemory-hw`) and **Aliro** (network orchestration/SDN). Testbeds run in Boston, Chicago (the Chicago Quantum Exchange), Amsterdam, and Hefei.

## Key graded claims
- T2 Multi-node heralded entanglement between two cities over ~25 km deployed fiber — Stolk et al./QuTech, Sci. Adv. 2024 (demonstrated)
- T3 Quantum memories entangled over 420 km fiber — arXiv:2504.05660 (claimed, preprint)
- T2/T3 Memory–memory entanglement + DI-QKD across 100 km — USTC, Feb 2026 (demonstrated; verify final journal ref)
- T6 Useful multi-node quantum internet by the early 2030s — various national roadmaps (roadmap)

## Conflicts / open questions
- **Which memory platform wins** is unsettled: atomic ensembles (highly multiplexable, good rate) vs single ions/NV/atoms (processable, can do logic at the node) vs rare-earth crystals (long storage). The network market may fork by use case.
- **Repeater-vs-direct crossover date is unproven**, and some argue **satellite links** (`A-satqkd`) will reach continental scale before fiber repeaters do — making the "quantum internet" partly a space story.
- **The demand question underneath it all**: beyond relay-free QKD (itself contested vs PQC, see `C-qkd-vs-pqc`), the killer app for a quantum internet — distributed QC, blind computing, sensor networks — is real in principle but has no paying customer yet.

## The honest call
**Genuinely research-stage, and honest about it.** The milestones are real and accelerating (city links, 100–420 km memory entanglement, a repeater program aiming at 2028), but the defining achievement — a repeater that beats direct transmission — has not been reached, and the economic case rests on applications that don't yet have buyers. This is a decade-plus infrastructure bet, not a near-term product.

## Sources
- https://www.science.org/doi/10.1126/sciadv.ad.... (QuTech metropolitan entanglement network, 2024)
- https://qt.eu/news/2025/2025-10-14_interconnecting-quantum-memories-for-the-quantum-internet
- https://arxiv.org/pdf/2504.05660 (420 km memory entanglement)
- https://www.innovationnewsnetwork.com/german-quantum-repeater-project-advances-future-quantum-internet/68370/ (TD.QR)
