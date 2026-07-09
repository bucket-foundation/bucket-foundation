# Quantum RAM (qRAM) · S-qram
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Quantum RAM is the assumed device that loads classical data into quantum superposition: given an address register in a superposition of indices, qRAM returns the corresponding data entries entangled with those addresses, ideally in time polylogarithmic in the number of entries $N$. It is the load-bearing, largely-unproven assumption under the exponential-speedup algorithms — HHL (`S-hhl`), quantum recommendation systems, and most quantum machine learning (`S-qml`). If you cannot get $N$ classical numbers into the machine faster than $O(N)$, the exponential advantage of algorithms that then process them in polylog time evaporates. The canonical design is the bucket-brigade architecture (Giovannetti–Lloyd–Maccone, 2008), which routes an address through a tree of quantum switches so that only $O(\log N)$ of the $\sim N$ nodes are actively entangled per query, making it far more error-tolerant than a naive fanout.

## Where it stands (2025–26)
qRAM remains the field's most honest weak link. The cost debate: bucket-brigade buys gentle (polylogarithmic) query-infidelity scaling but at the price of $O(N)$ physical components / exponentially many ancillae, and if each must be error-corrected the fault-tolerant overhead can swallow the algorithmic gain (Arunachalam et al. analysis; the recurring theme of `S-hhl`). 2025 brought the first experimental demonstrations — a Zhejiang University superconducting team realized bucket-brigade qRAM addressing 4-bit and 8-bit data (query fidelities ~0.81 and ~0.60, Nature Physics 2026) — proof of principle at tiny scale, far from the millions of addressable cells the speedup algorithms assume. Dequantization results (Tang et al.) further showed that *if* you grant qRAM-style access, many "quantum" ML speedups can be matched classically, sharpening the question of what qRAM actually buys.

## Key graded claims
- T1/T2 Bucket-brigade qRAM: $O(\log N)$ active switches per query, more noise-tolerant than naive fanout — Giovannetti–Lloyd–Maccone, PRL 100, 160501 (2008) (established)
- T2 Fault-tolerant qRAM overhead can negate the algorithms it feeds; polylog infidelity vs $O(N)$ components tradeoff — arXiv analyses (Arunachalam et al. 2015; redundancy-repair, Sci. Rep. 2025) (established/contested)
- T3 First experimental bucket-brigade qRAM (4-/8-bit, fidelity 0.81/0.60) — Zhejiang, Nature Physics (2026), arXiv:2506.16682 (demonstrated, small scale)

## Speedup / caveat
Enabling assumption, not a speedup. When qRAM is granted for free, HHL/QML claim exponential gains; when its real cost ($O(N)$ hardware, error correction, state-prep fidelity) is charged, most of those gains shrink or vanish. No practical, scalable qRAM exists — this is the single biggest asterisk on data-heavy quantum advantage.

## Conflicts / open questions
Is scalable, fault-tolerant qRAM physically buildable at the sizes (millions–billions of cells) the speedup algorithms need, and does any application clear the bar once loading is charged honestly? Open — parallels the `S-hhl` fine print directly.

## Sources
PRL 100, 160501 (2008); arXiv:2506.16682; Nat. Phys. (2026); Sci. Rep. 15 (2025), arXiv:2312.17483; Tang, STOC 2019. Cross-links: `S-hhl`, `S-qml`, `S-qmc`, `reference-impl/` (amplitude encoding = the atlas data-loading it abstracts).
