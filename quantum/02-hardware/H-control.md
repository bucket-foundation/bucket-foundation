# Control electronics & I/O · H-control
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
The classical layer that makes qubits do anything: arbitrary-waveform generators and FPGAs synthesizing shaped microwave pulses (typically upconverted from an IF), fast ADCs digitizing the readout, and real-time feedback engines that must decode errors and branch mid-circuit within qubit coherence times. In the NISQ era this is signal generation; in the fault-tolerant era the controller becomes a real-time computer running a QEC decoder inside a latency budget of hundreds of nanoseconds to a microsecond per cycle (the decoder-throughput wall — see `S-decoders`, `O-decoder`). The layer is modality-agnostic "picks and shovels" revenue: every architecture in this chapter needs it.

## Key players & state of the art (2025–26)
- **Quantum Machines** (Israel): OPX family with the QUA language for sub-microsecond real-time classical control flow; raised $170M Series D (Feb 2025); co-built **DGX Quantum** with Nvidia — a Grace-Hopper GPU tightly coupled to the controller for QEC-era feedback and calibration, targeting few-µs round-trip.
- **Zurich Instruments** (Switzerland, Rohde & Schwarz): SHFQC integrated controllers; launched the **ZQCS** platform (Mar 2026) explicitly aimed at operating long-lived logical qubits at large scale, with distributed synchronization across many units.
- **Qblox** (Delft): modular Cluster series; ~$32M raised; the "open architecture" stack via partnerships with Bluefors (cryo integration), Q-CTRL (autonomous calibration), and QuantWare. **Keysight**: QCS platform plus its test-and-measurement moat. **Zurich/Keysight/QM** dominate room-temperature control.
- Frontier direction: push the controller into the cold as cryo-CMOS (`H-cryocmos`) to escape one-coax-per-qubit; couple GPUs for decoding (Nvidia CUDA-Q, `S-software`).

## Key graded claims
- [T4] ZQCS targets large-scale logical-qubit operation — Zurich Instruments launch (Mar 2026) (claimed)
- [T4] Sub-µs real-time feedback + GPU-coupled decoding (DGX Quantum) — QM/Nvidia (demonstrated in deployments; benchmarks vendor-supplied)
- [T5] Quantum funding context: ~$3.77B raised Jan–Sep 2025, ~3× all of 2024 — trade press (reported/forecast)

## Trade-offs (vs other approaches)
Room-temperature racks are flexible and vendor-agnostic but cost on the order of ~$1k+ per qubit-channel and drown in cabling past a few thousand channels; cryo-CMOS cuts the wire count but must run on a milliwatt heat budget with re-characterized transistor models. Real-time decoding forces a hard co-design between the controller, the decoder ASIC/FPGA, and the QEC cycle time — latency, not raw compute, is the binding constraint.

## Conflicts / open questions
Can decoders and controllers keep up with surface-code cycle times (~1 µs) across 1,000+ logical qubits — the decoder-throughput wall? Will hyperscaler/GPU vendors (Nvidia) absorb this layer into their accelerated-computing stack, or does it stay a specialist market?

## Sources
Zurich Instruments ZQCS (The Quantum Insider, Mar 2026); Quantum Machines / Nvidia DGX Quantum; qblox.com + PitchBook; postquantum.com enabling-technologies analysis.
