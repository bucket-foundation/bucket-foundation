# Quantum error correction · S-qec
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
QEC encodes one *logical* qubit into many physical qubits so errors are detected and corrected faster than they accumulate. The **threshold theorem** (Aharonov–Ben-Or; Kitaev; Knill–Laflamme–Zurek, 1996–98) proves that if the physical error rate $p$ sits below a code-dependent threshold $p_{th}$, arbitrarily long computation is possible with only $\text{polylog}(1/\varepsilon)$ overhead per logical operation. The **surface code** (Fowler et al. 2012; threshold $\approx 1\%$, nearest-neighbor 2D layout, distance $d$ protects against $\lfloor(d-1)/2\rfloor$ errors using $d^2$ data + measure qubits) has been the default. **qLDPC codes** promise far better encoding rate — more logical qubits per physical qubit — at the price of long-range connectivity. Non-Clifford gates need **magic-state distillation** (or newer **cultivation**, `S-gates`), historically the dominant cost of fault-tolerant computing. Syndrome extraction runs every cycle and must be decoded in real time (`S-decoders`).

## Where it stands (2025–26)
Google's **Willow** result (Nature 2024) is the era-defining demo: a distance-7 surface-code logical qubit whose error rate **halves** with each increase in code distance (suppression factor $\Lambda\approx 2.14$) — the first clear below-threshold memory, meaning bigger codes now help rather than hurt. IBM pivoted to qLDPC: the $[[144,12,12]]$ "gross code" protects 12 logical qubits with 288 physical qubits, versus roughly 3,000 physical for equivalent surface-code protection — about a 10× encoding-rate win; the **Loon** chip (2025) demonstrated the required long-range couplers. Gidney's magic-state **cultivation** (2024) cut projected T-gate costs by roughly 10×, feeding directly into the falling Shor estimates (`S-shor`). Quantinuum, QuEra, and Harvard demonstrated logical operations on trapped-ion and neutral-atom platforms (`S-logical`).

## Key graded claims
- T1 Threshold theorem — Aharonov–Ben-Or, STOC 1997; Knill–Laflamme–Zurek (established)
- T2 Below-threshold surface-code memory, $\Lambda=2.14$, $d=7$ — Google, Nature 638 (2024), arXiv:2408.13687 (demonstrated)
- T2 Gross code $[[144,12,12]]$ ~10× better encoding rate — Bravyi et al., Nature 627, 778 (2024) (demonstrated in theory + partial hardware)
- T3 Magic-state cultivation reduces distillation overhead ~10× — Gidney et al., arXiv:2409.17595 (claimed)
- T4 IBM Loon validates qLDPC architectural components — IBM blog, Nov 2025 (claimed, awaiting peer review)

## Speedup / caveat
Overhead is the whole game (`O-overhead`): ~100–1,000 physical qubits per logical qubit at useful error rates, and QEC **slows** the logical clock because each logical gate spans many syndrome cycles plus decode latency. Encoding rate (surface) versus connectivity demand (qLDPC) is the central engineering tension.

## Conflicts / open questions
Surface code versus qLDPC is a live architectural fork (Google and most of the field versus IBM); whether qLDPC's long-range connectivity is buildable at scale, and stays below threshold across the couplers, is unproven (`O-interconnect-loss`). Real-time decoding throughput at scale (`O-decoder`) is a separate open bottleneck.

## Sources
arXiv:2408.13687; Nature 627, 778 (2024); arXiv:2409.17595; ibm.com/quantum/blog; PRA 86, 032324 (2012). Cross-links: `S-logical`, `S-decoders`, `S-gates`, `S-shor`, `O-overhead`, `O-decoder`.
