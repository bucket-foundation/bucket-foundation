# Circuit knitting & cutting · S-circuitcut
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Circuit knitting runs a circuit that is too large for one QPU by decomposing it into smaller subcircuits, executing them separately, and reconstructing the full result classically. Two cut types: **gate cuts** replace a non-local two-qubit gate with a quasiprobability sum of local operations, and **wire cuts** break a qubit's timeline into a measure-and-reprepare step. The reconstruction uses a **quasiprobability decomposition** — write the non-local operation as a signed combination of local channels, sample from it, and combine with the right signs in post-processing. This trades quantum width for classical sampling: it lets a 100-qubit problem run on smaller devices, or partitions a circuit across multiple QPUs (relevant to modular/interconnect hardware, `H-intercon`). IBM's Circuit Knitting Toolbox / qiskit-addon-cutting includes an automated cut-finder that searches for the cuts minimizing overhead.

## Where it stands (2025–26)
The technique is mature as software but bounded by a hard scaling law: each cut multiplies the sampling cost, and the **total overhead grows exponentially in the number of cuts** ($\gamma^2$ per gate cut, worse for wire cuts). So knitting is practical for a handful of cuts — separating weakly-entangled blocks, or shaving a few qubits past a device limit — and hopeless for cutting a densely entangled circuit into many pieces. The 2024–25 research pushed on the exponent: classical side-information from intermediate measurements improves post-processing (Phys. Rev. Research 2025), and a Dec 2025 result reduces the measurement overhead from exponential to **polynomial** in special cases via a quantum-tomography reformulation (arXiv:2512.19623) — a meaningful but still-narrow escape from the exponential wall. It shares a mathematical core with error mitigation (`S-errmit`): both are quasiprobability sampling, both pay exponential sampling cost, both estimate expectation values rather than states.

## Key graded claims
- T2 Gate/wire cutting via quasiprobability; overhead exponential in cut count — Bravyi–Smith–Smolin, PRX 6, 021043 (2016); Peng et al., PRL 125, 150504 (2020) (established)
- T2 Automated cut-finding minimizing sampling overhead — IBM Circuit Knitting Toolbox, IBM Research QCE 2024 (established, software)
- T2 Classical side-information improves reconstruction — Phys. Rev. Research (2025) (peer-reviewed)
- T3 Exponential→polynomial overhead in special cases via tomography reformulation — arXiv:2512.19623 (2025) (preprint)

## Speedup / caveat
Not a speedup — a **space-for-time trade** (fewer qubits, exponentially more shots). It is a bridge technology for the pre-fault-tolerant / modular era, useful only when cuts are few and cross-cut entanglement is low; for a highly entangled cut it costs as much as the classical simulation it was trying to avoid (`S-tensornet`). Overlaps error mitigation's cost structure, so the same "shallow enough to knit ≈ shallow enough to simulate classically" caution applies.

## Conflicts / open questions
How far the polynomial-overhead special cases generalize, and whether knitting across real chip-to-chip links (`H-intercon`, `O-interconnect-loss`) beats simply building a bigger monolithic device. Whether it earns a durable role once large fault-tolerant machines exist.

## Sources
PRX 6, 021043 (2016); PRL 125, 150504 (2020); IBM Research QCE 2024; arXiv:2411.17756; arXiv:2512.19623. Cross-links: `S-errmit`, `S-tensornet`, `S-shadows`, `H-intercon`, `O-interconnect-loss`.
