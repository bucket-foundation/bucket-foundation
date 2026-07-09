# Microwave↔optical transduction · H-transduce
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Superconducting qubits live at ~10 mK and speak microwave photons (~5–10 GHz). Optical fiber carries quantum information between fridges at ~200 THz with almost no loss. Nothing bridges the ~10,000× frequency gap cheaply, so a **quantum transducer** — a device that coherently converts a single microwave photon into a single optical photon and back — is the missing link for fridge-to-fridge superconducting modularity (`H-intercon`) and for a superconducting-to-photonic quantum internet (`A-qinternet`). Three physical routes compete: **electro-optic** (χ² crystals, thin-film lithium niobate), **optomechanical** (a vibrating membrane or bulk-acoustic mode couples both fields), and **magneto-optic / atomic** (rare-earth ions like erbium, or magnons in YIG). The figures of merit are conversion **efficiency** η, **added noise** (junk photons per converted photon), and **bandwidth**.

## Key players & state of the art (2025–26)
- The target is the "quantum-enabled" regime: added noise below 1 photon *and* η above ~50% simultaneously. Theory says η > 1/2 with low noise is physically allowed, so this is an engineering wall, not a fundamental one.
- 2025 membrane-based **optomechanical** transducers reached input-referred added noise approaching single-photon levels in both directions; one platform reported external η ≈ 2.2% at added noise ≈ 0.94, with an efficiency-bandwidth product ~2 orders of magnitude above prior low-noise demos (arXiv:2509.26349).
- **Electro-optic** thin-film-lithium-niobate devices push bandwidth and integration; **erbium-ion-in-crystal** transducers coupled to planar photonic + superconducting resonators pursue the atomic route (Nature Communications).
- Academic groups (Caltech, JILA/NIST, Delft, Chicago, Yale) dominate; no commercial merchant transducer ships yet. IBM, PsiQuantum, and every superconducting-modularity roadmap treat it as an *open dependency*, not a solved input.

## Key graded claims
- T3 Membrane optomechanical transduction near single-photon added noise, η ~2% — APS SMT 2025 / arXiv:2509.26349 (demonstrated, low efficiency)
- T1 η > 1/2 with low added noise is physically allowed — transduction theory (established)
- T4 Efficiency high enough for fault-tolerant fridge-to-fridge links — no group claims this yet (roadmap)

## Trade-offs
The brutal three-way tension is efficiency vs added noise vs bandwidth: pumping harder raises η but heats the device and injects thermal noise; narrow bandwidth mismatches qubit lifetimes and throughput. Percent-level efficiency means most photons are simply lost — unusable for QEC, which needs high-fidelity links. This node, not qubit count, gates whether superconducting machines can ever go truly modular across fridges.

## Conflicts / open questions
Will any of the three routes reach simultaneous high-η, sub-unity-noise, qubit-bandwidth operation — and on what timeline? Or do superconducting machines stay confined to single-fridge scale (`H-cryo` volume limits) while photonic (`H-photonic`) and ion (`H-ion`) modalities network natively over fiber and sidestep the problem entirely? This is one of the quietest but most decisive forks in the whole hardware map.

## Sources
schedule.aps.org/smt/2025 (MAR-A09); arXiv:2509.26349; Nature Communications s41467-023-36799-0; arXiv:2503.01133; arXiv:2406.02704.
