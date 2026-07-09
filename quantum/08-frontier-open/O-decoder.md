# Real-Time QEC Decoding Throughput · O-decoder
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
Error correction only works if a classical co-processor decodes each round of syndrome measurements and tells the quantum hardware what correction to apply *before the next round arrives*. Superconducting qubits emit a syndrome roughly every microsecond, so the decoder must sustain about **1 MHz per logical qubit** at sub-microsecond latency — for thousands of logical qubits at once. If decoding lags, syndromes pile up (the "backlog problem," Terhal 2015): the effective clock speed collapses exponentially in the backlog. That makes the classical decoder a first-class bottleneck on the road to fault tolerance. A machine can have perfect qubits and still be useless if it can't decode fast enough — and the raw syndrome-data rate off a large cryostat runs to terabytes per second, which is itself an open cryo-electronics problem (see H-cryocmos, O-interconnect-loss).

## Where the disagreement is
- **Tractable-engineering camp.** Riverlane has built dedicated decoders — the Local Clustering Decoder targets <1 µs per round, and a Dec 2025 *Nature Communications* result reports hitting a **MegaQuOp** (10⁶ reliable operations) with ~4× fewer qubits via better decoding [T2]. Riverlane's roadmap frames the path from MegaQuOp (late 2020s) to **TeraQuOp** (10¹² operations, early 2030s) as an engineering scaling problem, and flags that commodity PCIe/GPU interfaces bottleneck beyond ~300 physical qubits, motivating purpose-built interconnects (QECi, <400 ns round-trip) [T3/T4]. Google has run real-time decoding on Willow's distance-5/7 codes keeping pace with the syndrome stream; FPGA and ASIC decoders (union-find, sliding-window) are demonstrated at small distance [T2/T3].
- **Unproven-at-scale camp.** The accuracy/latency/bandwidth *trilemma* is unsolved at scale: high-accuracy decoders (full minimum-weight matching, neural decoders) are slow; fast decoders are less accurate, and lower accuracy silently raises the logical error rate. Nobody has demonstrated real-time decoding across the **thousands-of-logical-qubit** regime a useful computation needs, and qLDPC codes (which IBM now bets on) are *harder* to decode fast than surface codes because their checks are non-local. Transversal-gate architectures need correlated decoding across logical qubits, which is more expensive still (arXiv:2505.13587). Off-chip syndrome bandwidth at million-qubit scale has no demonstrated solution [T3].

## What would resolve it
A machine running many logical qubits through millions of error-corrected cycles with decoding kept ahead of the syndrome stream, at demonstrated MHz throughput and **constant, non-growing backlog**, reproduced independently — ideally on a qLDPC code, not just surface codes. Riverlane's TeraQuOp milestone hitting spec, or IBM Kookaburra/Starling shipping with an integrated real-time decoder that holds pace, would settle the direction. The negative signal: decoder latency that grows with qubit count and forces the quantum clock to slow down.

## Sources
- Riverlane, "QEC Technology Roadmap" (2026) + Local Clustering Decoder papers — riverlane.com [T4]
- Riverlane et al., *Nature Communications* (Dec 2025), MegaQuOp with ~4× fewer qubits [T2]
- Terhal, "Quantum error correction for quantum memories," RMP 87, 307 (2015) — backlog problem [T2]
- arXiv:2605.30765 — real-time QEC system stack (architecture/algorithms/engineering, 2026) [T3]
- arXiv:2505.13587 — fast correlated decoding of transversal logical algorithms [T3]
