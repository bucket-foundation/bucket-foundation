# Adiabatic Theorem · F-adiabatic
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
If a quantum system starts in an eigenstate of its Hamiltonian and the Hamiltonian is changed slowly enough, the system stays in the corresponding instantaneous eigenstate. "Slowly enough" is set by the spectral gap: the runtime must scale roughly as $1/\text{gap}^2$ (Born & Fock, 1928; rigorous conditions later tightened by Kato and others). If the gap closes or nearly closes, the theorem fails and the system leaks to excited states (Landau-Zener transitions).

## Core idea / key equation
The whole theorem hangs on one ratio. Call $\Delta$ the smallest energy gap between the eigenstate you are riding and its nearest neighbor over the entire schedule, and let the drive matrix element be roughly how fast the Hamiltonian changes, $dH/dt$. The system stays put as long as the drive is slow compared to the gap squared — the standard adiabatic condition is $(\text{rate of change of } H)/\Delta^2 \ll 1$, so the total runtime scales as **$T \sim 1/\Delta^2$**. Halve the gap and you must run four times slower. The failure mode is quantitative and named: at an **avoided crossing** the probability of jumping to the excited state is the Landau-Zener formula $P = e^{-2\pi\Gamma}$, with $\Gamma = \Delta^2/(4\hbar v)$, where $v$ is the sweep speed through the crossing. Go slow enough and the jump probability is exponentially suppressed; sweep too fast through a tiny gap and you almost certainly leave the ground state. The exponent $\Delta^2$ is the same one that appears in the runtime — the gap is the single number that governs whether adiabatic evolution works.

## Why it matters for quantum tech
The adiabatic theorem is the load-bearing foundation under **quantum annealing** and **adiabatic quantum computation** (Farhi et al., 2000): encode a hard optimization problem's solution as the ground state of a final Hamiltonian, start in the easy-to-prepare ground state of an initial one, and interpolate slowly. If you stay adiabatic, you end in the answer. Adiabatic QC is polynomially equivalent to the gate model (Aharonov et al., 2004), which makes it a legitimate computing paradigm rather than a heuristic (see H-anneal). The catch is the gap: for hard instances it can shrink exponentially, erasing any speedup — the central open question hanging over D-Wave's machines (see C-dwave-advantage). The same $1/\text{gap}^2$ control appears in quantum simulation, where adiabatic state preparation is a standard way to reach a many-body ground state before measuring it (see S-qsim), and the Landau-Zener physics is exactly what STIRAP and other geometric state-transfer protocols exploit (see F-berry). Slow, gap-limited ramps are also how experimentalists load qubits and cold-atom lattices into their target states across every hardware line (see H-ion, H-supercon).

## Key graded claims
- [T1] A system remains in its instantaneous eigenstate under sufficiently slow Hamiltonian change, with error controlled by the inverse spectral gap — Born & Fock, Z. Phys. 51, 165 (1928) (status: established)
- [T2] Adiabatic quantum computation is polynomially equivalent to the standard gate model — Aharonov, van Dam, Kempe, Landau, Lloyd, Regev, SIAM J. Comput. 37, 166 (2007); arXiv:quant-ph/0405098 (status: established)
- [T2] Coherent quantum annealing demonstrated at scale — quantum critical dynamics in a 5,000+-qubit programmable spin glass, faster than the matched classical annealing model — King et al., Nature 617, 61 (2023) (status: demonstrated, classical-advantage claim contested)

## Conflicts / open questions
- Whether the minimum gap for practically important optimization problems stays large enough for a real speedup is unresolved — it is the crux of the annealing-advantage debate.

## Go deeper
- Farhi et al., "Quantum Computation by Adiabatic Evolution," arXiv:quant-ph/0001106 (2000)
- Albash & Lidar, "Adiabatic quantum computation," RMP 90, 015002 (2018)

## Sources
- Born & Fock (1928)
- Aharonov et al., arXiv:quant-ph/0405098
- King et al., Nature 617, 61 (2023). doi:10.1038/s41586-023-05867-2
