# Quantum-dot vs donor: the silicon-spin fork · H-spinsplit
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Inside the silicon-spin modality (`H-silicon`) there is a strategic fork sharp enough to warrant its own node: two ways to hold a single-electron spin in silicon, optimizing for opposite things. **Gate-defined quantum dots** trap electrons in an electrostatic well shaped by lithographic top-gates (SiMOS or Si/SiGe heterostructures) — the qubit position and count are set by the mask, so the approach inherits CMOS manufacturability and prioritizes *scalability*. **Donor qubits** put the spin on a single dopant atom — usually phosphorus — placed with atomic precision by STM lithography, so every qubit is physically identical by nature, prioritizing *uniformity and raw qubit quality*. Both now clear 99% two-qubit fidelity, so the fork is no longer about which one works; it is about which one scales.

## Key players & state of the art (2025–26)
- **Donor camp** — **SQC** (Michelle Simmons, Australia): STM-placed phosphorus, 99.99% 2Q fidelity and Grover at 98.9% without error correction (Nature, Dec 2025); patterned 250,000-qubit registers in 8 hours (Nov 2025). The argument: identical atoms remove device-to-device variability at the source.
- **Quantum-dot camp** — **Diraq + imec**: gate-defined dots at >99% 2Q from a standard 300 mm CMOS flow, with four random wafer devices all under 1% error (Nature, 2025). **Intel** (Tunnel Falls), **Quantum Motion**, and **Equal1** all pursue the dot route because it plugs directly into the foundry (`H-foundry`) and cryo-CMOS (`H-cryocmos`).
- Hybrid ideas (flip-flop qubits, donor-dot hybrids, spin-shuttling buses) blur the line and try to take uniformity from donors and routing from dots.

## Key graded claims
- T2 Donor P devices: 99.99% 2Q, Grover 98.9% — SQC, Nature (Dec 2025) (demonstrated)
- T2 Gate-defined dots: >99% 2Q from a 300 mm CMOS flow — Diraq/imec, Nature (2025) (demonstrated)
- T1 Phosphorus donors are intrinsically identical; dots buy reproducibility from lithography — device physics (established)

## Trade-offs
Donors give the best intrinsic uniformity and coherence but atomic-precision STM placement is slow, serial, and hard to interface with industrial CMOS back-ends. Gate-defined dots ride the foundry and cryo-CMOS ecosystems and are naturally reproducible in *layout*, but electrostatic disorder and charge noise make each dot's exact working point drift, so tuning many dots (autotuning, ML calibration) is itself a research problem. Connectivity is short-range exchange in both, pushing spin-shuttling as the bus.

## Conflicts / open questions
Which philosophy reaches a working 100-qubit silicon system first — the donor bet that uniformity beats the variability wall, or the dot bet that foundry volume and autotuning tame it? Does spin-shuttling across a chip preserve fidelity well enough to make either route's short-range connectivity a non-issue? The fork may resolve into a hybrid rather than a winner.

## Sources
SQC Nature (Dec 2025); Diraq/imec Nature (2025); postquantum.com silicon-spin ecosystem; PatSnap spin-qubit-array review (2026); Intelligent Computing icomputing.0115 (single-electron spin review).
