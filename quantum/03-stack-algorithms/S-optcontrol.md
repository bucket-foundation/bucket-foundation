# Pulse-level & quantum optimal control · S-optcontrol
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
The bottom of the stack, where an abstract gate becomes an actual analog waveform driving a qubit. Quantum optimal control (QOC) shapes the microwave, laser, or flux pulse that steers the system's Hamiltonian to realize a target unitary with maximum fidelity in minimum time, respecting hardware constraints (bandwidth, power, leakage to non-computational levels). It sits below the gate/compiler layer (`S-gates`, `S-software`) and directly on the control electronics (`H-control`). Core methods:
- **GRAPE** (gradient ascent pulse engineering) — piecewise-constant controls, all updated together via gradient/L-BFGS.
- **Krotov** — monotonically-convergent gradient method, updates controls sequentially within an iteration.
- **CRAB** — expand the pulse in a truncated random basis and optimize the few coefficients (gradient-free, good with a physical simulator in the loop).
- **GOAT / analytic-gradient** methods, and **DRAG** — an analytic correction that removes leakage for weakly-anharmonic transmons, the workhorse for single-qubit gates.
- **Reinforcement-learning control** — increasingly used where a model is expensive or unknown.

## Where it stands (2025–26)
QOC is standard practice for squeezing the last fidelity out of a device and is how record two-qubit gates are calibrated. The honest 2025–26 finding is a note of restraint: a systematic transmon study concluded that **properly calibrated DRAG already operates near the decoherence floor** for single-qubit gates, so heavy numerical optimization (GRAPE) buys little there — the win from fancy control is real mainly for two-qubit gates, leakage-heavy or strongly-coupled systems, and robustness against calibration drift (arXiv:2511.12799, 2025). Reinforcement-learning control matured for robust perfect-entangling gates (npj QI 2025). The practical tension is the same everywhere: model-based optimal pulses are only as good as the device model, so closed-loop calibration against the live hardware (and periodic recalibration against drift) matters as much as the optimizer. This layer is also where analog quantum simulation (`S-qsim`) and pulse-efficient compilation of `S-hamsim` blocks live.

## Key graded claims
- [T1] GRAPE gradient pulse optimization — Khaneja et al., J. Magn. Reson. 172, 296 (2005) (established)
- [T1] DRAG leakage suppression for weakly-anharmonic qubits — Motzoi et al., PRL 103, 110501 (2009) (established)
- [T1] Krotov / CRAB optimal-control frameworks — Krotov (1996); Caneva–Murphy–Calarco, PRA 84, 022326 (2011) (established)
- [T3] Calibrated DRAG near the decoherence floor; numerical optimization helps mainly for hard cases — arXiv:2511.12799 (2025) (preprint)
- [T2] Reinforcement-learning robust entangling gates — npj Quantum Information (2025), s41534-025-01065-2 (peer-reviewed)

## Speedup / caveat
Not an algorithmic speedup — a **fidelity and time-optimality** layer. It raises gate quality (feeding the thresholds in `S-qec`) and can shorten gate duration to beat decoherence, but it is bounded by the quantum speed limit and by hardware (bandwidth, coherence $T_1/T_2$, control-line crosstalk). Over-optimizing to a stale device model can *reduce* real fidelity, so the practical caveat is that calibration and drift-tracking often dominate the theoretical pulse shape.

## Conflicts / open questions
When numerical optimal control actually beats simple analytic pulses (DRAG/Gaussian) is instance-specific and debated. How to make optimal pulses robust to drift without constant recalibration; how well RL control transfers across devices.

## Sources
J. Magn. Reson. 172, 296 (2005); PRL 103, 110501 (2009); PRA 84, 022326 (2011); arXiv:2511.12799 (2025); npj QI s41534-025-01065-2 (2025). Cross-links: `S-gates`, `S-software`, `H-control`, `S-qsim`, `S-qec`.
