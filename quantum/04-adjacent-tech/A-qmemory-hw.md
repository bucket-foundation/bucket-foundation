# Quantum memories as a component industry · A-qmemory-hw
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
A quantum memory stores a photonic qubit and releases it on demand with its quantum state intact. It is the missing hardware component that turns point-to-point QKD into a real **quantum internet**: repeaters need memories to hold entanglement while neighboring links succeed, defeating fiber loss over distance (see `A-qinternet`, `F-teleport`). Historically memories were cryogenic lab curiosities. The shift being tracked here is memories becoming a **buyable component** — rack-mounted, room-temperature, sold to network builders — the same maturation single-photon detectors and sources went through. Platforms: warm atomic vapor (rubidium/cesium), rare-earth-doped crystals, cold-atom ensembles, and defect centers.

## Maturity & real deployments (2025–26)
- **Qunnect** (Brooklyn, US) — the standout commercializer. Its rubidium-**vapor** approach runs at room temperature with no cryogenics or frequency conversion. Demonstrated entanglement between telecom-wavelength photons and a room-temperature memory at 90.2% fidelity, generating ~1,200 entangled photon-memory pairs/second. Sells the "GothamQ" testbed hardware; closed a $10M Series A extension (Airbus Ventures, Cisco Investments, Quantonation) in June 2025; ~$60M+ raised total.
- **Aliro Quantum** (US) — not a memory maker but the orchestration/SDN layer that manages multi-vendor quantum networks; its platform interoperates with Qunnect, Single Quantum, Cisco, IonQ, Thorlabs, Keysight, and others. Passed 50 supported network devices (Sept 2025).
- Academic memories (rare-earth crystals, cold atoms) still lead on storage time × efficiency but do not ship as products.

## Key graded claims
- [T3] Room-temperature telecom-band photon↔memory entanglement at 90.2% fidelity, ~1,200 pairs/s — Qunnect, 2025 (demonstrated)
- [T4] Qunnect memory hardware is commercially deployable outside the lab — company positioning (claimed)
- [T2] Repeater-based long-distance entanglement distribution requires quantum memories — network theory (established)

## Conflicts / open questions
Room-temperature vapor memories trade storage time and efficiency for practicality; cryogenic rare-earth-doped crystals win on the storage-time × efficiency product (the metric that actually sets repeater performance) but not deployability. Which wins the network market is unsettled. The deeper problem: a repeater needs memory *and* the delivered entanglement rate to beat direct transmission, and that crossover has not been reached anywhere (`A-qinternet`).

## The honest call
**A component industry being built ahead of its own market.** Qunnect's room-temperature memories are a real, demonstrated product with fidelity/rate numbers you can cite, and Aliro's orchestration layer treats quantum networks as a systems-integration problem — both are early-commercial. But the whole industry is only worth building if a quantum internet has a paying use case beyond QKD (itself contested vs PQC, `C-qkd-vs-pqc`). This is picks-and-shovels for a gold rush that hasn't been confirmed — well-funded, technically real, demand-unproven.

## Sources
qunnect.inc/press-release-2025-06-24; thequantuminsider.com 2025/03/19 (room-temp memory entanglement); thequantuminsider.com 2025/09/22 (Aliro 50 devices); postquantum.com/quantum-networks/quantum-memories.
