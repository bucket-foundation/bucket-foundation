# Real-time QEC decoding · S-decoders
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Error correction (`S-qec`) is only half the job — something must read the stream of syndrome measurements and infer, in real time, which correction to apply before the next round of gates. That something is the *decoder*, and it has become its own engineering discipline. The throughput wall is brutal: a surface-code logical qubit emits a syndrome every QEC cycle (~1 µs on superconducting hardware), and the decoder must keep up or the error backlog grows without bound (the "decoding backlog problem," Terhal). At scale this is a firehose — Riverlane estimates a large machine produces on the order of ~100 TB/s of syndrome data. General software decoders (minimum-weight perfect matching, union-find, belief-propagation) are accurate but too slow, so the field has moved to dedicated FPGA and ASIC decoders co-located with the control electronics (`H-control`).

## Where it stands (2025–26)
Riverlane is the pure-play here (Deltaflow QEC system; Deltaflow 2 shipped 2025, Deltaflow 3 targeted late 2026 with continuous "streaming" decoding). In Dec 2025 they published a hardware decoder in Nature Electronics: a Local Clustering Decoder on FPGA that decodes a round in under 1 µs while adaptively modeling noise, cutting the physical-qubit count per logical qubit ~4× under a leakage-dominated model. Google's Willow result (2024) used a real-time-capable decoder to show below-threshold scaling, and its AlphaQubit work applied ML decoding for higher accuracy at the cost of speed — the central tension of the field: accuracy vs latency vs power. This is a named open problem in its own right (`O-decoder`): the classical co-processor bandwidth may bottleneck fault-tolerant scaling as hard as the qubits do.

## Key graded claims
- [T2] Decoding must run inside the QEC cycle or the backlog diverges — Terhal, Rev. Mod. Phys. 87, 307 (2015) (established)
- [T2] Sub-µs adaptive hardware (FPGA) decoder, ~4× qubit reduction under leakage noise — Riverlane, Nature Electronics (Dec 2025) (peer-reviewed)
- [T2] Real-time decoding enabled Willow below-threshold demo; ML decoders (AlphaQubit) trade latency for accuracy — Google, Nature 638 (2024/25) (peer-reviewed)

## Speedup / caveat
Not an algorithm speedup — an enabling constraint. Fault tolerance is impossible without a decoder that sustains syndrome throughput at scale; a slow decoder silently caps how large a computation can run regardless of qubit quality.

## Conflicts / open questions
Whether ASIC/FPGA decoders scale to millions of qubits (100 TB/s-class data movement, cryo-adjacent power budgets) or become the true bottleneck — see `O-decoder`. Accuracy-vs-latency-vs-power has no settled optimum.

## Sources
Rev. Mod. Phys. 87, 307 (2015); Riverlane Nature Electronics 2025 (HPCwire coverage); Google Willow, Nature 638 (2025); AlphaQubit, Nature 2024. Cross-links: `S-qec`, `S-logical`, `H-control`, `O-decoder`.
