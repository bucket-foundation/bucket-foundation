# Silicon spin qubits · H-silicon
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Qubits stored in the spin of single electrons (or nuclei) confined in silicon, split into two families that share a substrate but not a philosophy: **gate-defined quantum dots**, where lithographic gates electrostatically trap electrons in a well (prioritizes manufacturability — the devices are CMOS transistor structures), and **donor qubits**, where the spin lives on a single phosphorus atom placed with atomic precision (prioritizes uniformity — every P atom is identical by nature). The pitch for both: qubits are ~100 nm scale (roughly a million times smaller in area than a transmon), so in principle the entire semiconductor industry becomes the quantum fab. Operates around 100 mK–1 K, and — because the devices are silicon — is the natural home for cryo-CMOS co-integration (`H-cryocmos`).

## Key players & state of the art (2025–26)
- **Diraq + imec** (Sep 2025, Nature): >99% two-qubit fidelity on **gate-defined** dots made in a standard 300 mm CMOS foundry flow — four randomly selected devices from one wafer all under 1% 2Q error, three at 99.9%+ single-shot readout. First foundry-made qubits at error-correction-grade fidelity, and the strongest evidence yet for the "uniformity via lithography" thesis.
- **SQC** (Silicon Quantum Computing, Michelle Simmons): **donor** route — 99.99% 2Q fidelity in atom-precision devices and Grover's algorithm at 98.9% without error correction (Nature, Dec 2025); patterned 250,000-qubit registers in 8 hours with industrial STM/CMOS tooling (Nov 2025).
- **Quantum Motion** (UK): full-stack silicon QC delivered to the UK NQCC (2025), built on 300 mm wafers. **Intel**: Tunnel Falls 12-qubit research chip distributed to labs; 300 mm line with high-volume test. **Equal1** (see `H-cryocmos`): control integrated in GlobalFoundries 22FDX. **SiMOS single-qubit** RB records sit near 99.9%.
- **2026 firsts**: quantum error detection in silicon (Jan 2026); first universal logical operations on silicon spins (Mar 2026).

## Key graded claims
- T2 >99% 2Q fidelity from a standard 300 mm industrial flow (gate-defined) — Diraq/imec, Nature (2025) (demonstrated)
- T2 99.99% 2Q + Grover at 98.9% in donor devices — SQC, Nature (Dec 2025) (demonstrated)
- T4 250k-register patterning ⇒ manufacturing scalability — SQC release (claimed)
- T1 Donor P atoms are intrinsically identical; gate-dots buy reproducibility from lithography — device physics (established)

## Trade-offs (vs other modalities)
Unmatched density, direct reuse of the CMOS supply chain, and solid-state coherence good enough for foundry-grade fidelity; against that, qubit counts are tiny (tens at most today versus thousands for atoms), historic device-to-device variability, short-range exchange connectivity, and cryogenic control wiring per qubit that is unsolved at scale — cryo-CMOS is the bet that closes it. The quantum-dot vs donor split is a live strategic fork (see `H-spinsplit`): manufacturability vs intrinsic uniformity.

## Conflicts / open questions
Foundry-grade fidelity arrived in 2025; the open question is whether uniformity holds across 1,000+ dots on a wafer, and whether anyone stands up a mid-scale (100-qubit) silicon system before other modalities reach fault tolerance. Spin-shuttling fidelity across a chip is the connectivity bottleneck.

## Sources
Diraq/imec Nature paper + The Quantum Insider (Sep 2025); SQC Nature (Dec 2025); postquantum.com silicon-spin fabrication + ecosystem analyses; PatSnap spin-qubit array review (2026).
