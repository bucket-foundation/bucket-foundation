# Quantum Information Theory · F-qinfo
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
The Shannon theory of quantum states: how much quantum information a state carries (von Neumann entropy $S = -\mathrm{Tr}\,\rho\log\rho$), how well it can be compressed (Schumacher coding), how much classical information quantum states can convey (Holevo bound), and what noisy quantum channels can transmit (quantum capacity). Fidelity, trace distance, and CPTP channels are the working vocabulary of every hardware benchmark.

## Core idea / key equation
The central quantity is the von Neumann entropy $S(\rho) = -\mathrm{Tr}(\rho\log\rho)$, which is Shannon's $H = -\sum p\log p$ rewritten with the density matrix's eigenvalues as the probabilities. It counts, in qubits, the irreducible size of a quantum source: Schumacher's theorem says $N$ copies of $\rho$ compress into about $N\cdot S(\rho)$ qubits and no fewer, the quantum echo of Shannon's compression bound. When you want to read *classical* messages out of quantum states, the ceiling is the Holevo $\chi$ quantity: for an ensemble $\{p_i, \rho_i\}$ with average state $\rho = \sum_i p_i \rho_i$, the accessible information obeys $I \le \chi = S(\rho) - \sum_i p_i S(\rho_i)$. A corollary is blunt — $n$ qubits carry at most $n$ classical bits of retrievable message. For sending quantum states down a noisy channel $\mathcal{N}$, the analogue of Shannon capacity is the coherent information $I_c(\rho, \mathcal{N}) = S(\mathcal{N}(\rho)) - S((\mathcal{N}\otimes I)(|\psi\rangle\langle\psi|))$, and the quantum capacity is its regularized maximum (the LSD theorem). Regularization is the sting in the tail: unlike the classical case, you generally cannot compute the capacity from a single use of the channel.

## Why it matters for quantum tech
Channel capacities set the hard limits for quantum communication and the quantum internet, and they are why long links on photonic hardware (H-photonic) need entanglement distillation and repeaters rather than amplification (see F-nocloning). Fidelity and trace distance are how every gate, memory, and teleportation demo is scored across H-supercon, H-ion, and H-neutral, and they are the figures of merit that S-bench randomized benchmarking and S-qec threshold estimates report. The Holevo bound underwrites the key-rate accounting in QKD security proofs (S-qkd → A-qkd). Von Neumann entropy is also the bookkeeping unit for entanglement as a resource, which is the currency spent by teleportation, superdense coding, and the whole S-gates → S-qec stack.

## Key graded claims
- T1 A quantum source is compressible to $S(\rho)$ qubits per signal — Schumacher, PRA 51, 2738 (1995); entropy formalism from von Neumann (1932) (status: established)
- T1 $n$ qubits cannot convey more than $n$ classical bits — Holevo, Probl. Inf. Transm. 9, 177 (1973) (status: established)
- T2 Quantum channel capacity is given by regularized coherent information (LSD theorem) — Lloyd, PRA 55, 1613 (1997); Shor (2002); Devetak, IEEE TIT 51, 44 (2005) (status: established)
- T2 Channel capacities are strange: additivity fails (Hastings, Nat. Phys. 5, 255, 2009) and quantum capacity is superactivatable — two zero-capacity channels can combine to positive capacity (Smith & Yard, Science 321, 1812, 2008) (status: demonstrated)
- T2 Quantum information survives transmission at continental scale: ground-to-satellite teleportation of single-photon qubits over a 1,400 km uplink to the Micius satellite reached average fidelity $0.80 \pm 0.01$ across six mutually unbiased input states, above the $2/3$ classical state-estimation limit — Ren et al., Nature 549, 70 (2017), arXiv:1707.00934 (status: demonstrated)

## Conflicts / open questions
- No closed-form, single-letter formula for the quantum capacity of a general channel; whether it is even computable in practice remains open.

## Go deeper
- Nielsen & Chuang chs. 11–12; Wilde, *Quantum Information Theory* (2013), arXiv:1106.1445
- Preskill notes ch. 10

## Sources
- Holevo (1973); Schumacher, PRA 51, 2738 (1995) doi:10.1103/PhysRevA.51.2738
- Devetak, IEEE Trans. Inf. Theory 51, 44 (2005). arXiv:quant-ph/0304127
- Hastings, Nat. Phys. 5, 255 (2009). arXiv:0809.3972 · Smith & Yard, Science 321, 1812 (2008). arXiv:0807.4935
- Ren et al., Nature 549, 70 (2017). arXiv:1707.00934
