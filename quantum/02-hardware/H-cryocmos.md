# Cryogenic control ASICs · H-cryocmos
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Every qubit needs control and readout wires running from room-temperature electronics down into the fridge. At thousands of qubits this **wiring bottleneck** turns fatal: heat load down the coax, cabling bulk, and connector count all explode past what a dilution fridge (`H-cryo`) can absorb. The fix is **cryo-CMOS** — control/readout ASICs fabricated in standard silicon that run *inside* the cryostat, either at the 4 K stage or, ideally, alongside the qubits at ~10 mK–100 mK — collapsing the wire count by multiplexing many qubits per line and moving the classical/quantum boundary down into the cold. It is a prerequisite for any million-qubit superconducting or silicon-spin machine, and it borrows the entire CMOS supply chain (`H-foundry`) rather than inventing new fab.

## Key players & state of the art (2025–26)
- **Intel — Horse Ridge I/II**: cryo-CMOS SoCs generating microwave qubit-drive pulses at ~4 K; Horse Ridge II added integrated readout and multi-gate pulsing. Intel's Pando Tree targets scale-up interconnect.
- **SemiQon** (Finland): cryo-CMOS transistors (launched late 2024) claiming control/readout of hundreds of qubits in one cooldown at ~100× lower power than room-temperature electronics; pursues co-locating electronics on the qubit chip.
- **Equal1** (Ireland): UnityQ / Bell-1 rack-mounted silicon-spin system with control integrated in GlobalFoundries 22FDX FD-SOI CMOS; validated the CMOS process April 2025; Bell-1 headed to ESA's Φ-lab (2025).
- **Diraq** (with Emergence Quantum) and **QuTech** (with Intel) also active. Silicon spin qubits (`H-silicon`) benefit most: same-die integration is native to their CMOS-compatible modality, whereas transmons must place the ASIC at a separate cold stage.

## Key graded claims
- T3 Cryo-CMOS control of multiple silicon quantum dots in a commercial CMOS process — Equal1, GlobalFoundries 22FDX (demonstrated/validated)
- T4 SemiQon cryo-CMOS controls hundreds of qubits per cooldown at ~100× lower power — company claim (claimed)
- T4 Horse Ridge II integrates drive + readout + multi-gate pulsing at 4 K — Intel (demonstrated on Intel's own stack)

## Trade-offs
The core tension is **power vs proximity**: dissipation in the ASIC heats the cold stage, so the nearer the qubits (mK, where cooling power is ~µW–mW) the tighter the power budget. Running at 4 K eases the thermal budget (cooling power ~W) but reintroduces a wiring hop back down to the qubits. Transistors misbehave at cryo — threshold shifts, flicker noise, and carrier freeze-out all require re-characterized device models. Yield and reliability of cryo-CMOS at scale are unproven, and a failure inside a cold fridge is expensive to reach.

## Conflicts / open questions
Can cryo-CMOS dissipate little enough to sit at the mixing-chamber stage, or is 4 K the practical floor — leaving a residual wiring problem between 4 K and the qubits? Does same-die integration advantage silicon spin qubits enough to offset their smaller lead in qubit quality versus transmons and ions?

## Sources
intc.com (Horse Ridge II); semiqon.com/technology; quantumzeitgeist.com (SemiQon); thequantuminsider.com 2025/04/17 (Equal1 CMOS validation); design-reuse.com; qutech.nl; arXiv:2604.16216.
