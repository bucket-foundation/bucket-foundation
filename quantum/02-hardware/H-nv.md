# NV centers / diamond qubits · H-nv
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
A nitrogen-vacancy (NV) center is a point defect in diamond — a substitutional nitrogen atom beside a missing carbon — whose electron spin works as a qubit that can be optically initialized and read out and stays coherent at *room temperature*, because the stiff, low-spin-density diamond lattice isolates it almost as well as a millikelvin vacuum would. Nearby ¹³C nuclear spins act as long-lived ancilla qubits and quantum memory. The same physics drives quantum sensing, where NV is a commercial reality today (see `A-nvsensing`, `A-magneto`); for computing, the pitch is a cryogenics-free, rack- or edge-deployable "quantum accelerator."

## Key players & state of the art (2025–26)
- **Quantum Brilliance** (Australia/Germany): the anchor company. 2025: three QB-QDK2.0 units deployed at Oak Ridge National Laboratory for hybrid quantum-classical work; Europe's first room-temperature NV accelerator went live at Fraunhofer IAF (Jun 2025). Roadmap: 25–100 qubit systems by 2026–27 via incremental qubit-count "drops," moving toward full chip production. Part of a €35M German Cyberagency portable-QC program (with ParityQC) targeting a transportable defense system by 2027.
- **Academic multi-qubit records** (Delft/QuTech, Stuttgart, Ulm, Harvard): ~10-qubit registers on a single NV node with fault-tolerant-grade control and demonstrated small logical operations; NV nodes double as the memory/repeater endpoints in early quantum-network experiments (a bridge to `A-qinternet`, `A-qmemory-hw`). Coherence: NV electron-spin T2 reaches milliseconds at room temperature and seconds with dynamical decoupling; ¹³C nuclear memories exceed a minute.

## Key graded claims
- T4 QB-QDK2.0 accelerators operating at ORNL and Fraunhofer IAF — deployment announcements (demonstrated as installations; compute utility unproven)
- T4 25–100 qubits by 2026–27 — Quantum Brilliance roadmap (roadmap)
- T2 ~10-qubit NV registers with high-fidelity control and small logical ops — academic literature (demonstrated)
- T1 NV electron/nuclear spins are coherent qubits at room temperature — established physics

## Trade-offs (vs other modalities)
Room temperature, no laser-vacuum-cryo stack, car-battery-scale power, and a physically tiny package — the only modality plausibly deployable at the edge or in a vehicle. Against that: qubit counts are the lowest of any modality (single digits per node), entangling *many* NV centers is hard because each defect sits at a random lattice position, and deterministic placement of many high-quality NVs in an array is unsolved fabrication.

## Conflicts / open questions
Is diamond compute a real computing modality, or a superb sensing technology wearing a compute badge? The 25–100-qubit roadmap requires deterministic NV placement and NV-to-NV entangling that nobody has demonstrated at those numbers. The strongest near-term value of the platform is clearly on the sensing side.

## Sources
quantumbrilliance.com; OLCF/ORNL Q&A (Sep 2025); Fraunhofer IAF release (Jun 2025); The Quantum Insider; IOPscience 2633-4356/ade359 (NV registers); entangledfuture.com NV guide (2026).
