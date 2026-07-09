# Energy Consumption — Quantum vs Classical · O-energy
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
A quantum computer's headline runtime is only half of a fair comparison; the other half is *energy*. A dilution refrigerator draws roughly **10 kW continuously**, dominated by the mechanical compressor on the 3 K stage, and a full quantum system with control electronics runs on the order of **~18 kW** — a fixed cost paid whether the machine is computing or idle. A classical supercomputer like Frontier or Summit draws megawatts. The sharp question: for the specific tasks quantum machines win on, does the quantum system deliver the answer at *lower total energy* than the classical alternative — and does that "energy advantage" arrive earlier or later than the runtime advantage? This is a distinct axis from speed, and it becomes a scaling argument as classical data-center power grows 20–40% per year.

## Where the disagreement is
- **Quantum-is-energy-efficient camp.** For sampling-type tasks, Google's supremacy analysis found the classical simulation on Summit would consume **~7 orders of magnitude more energy** than the quantum processor's run [T3]. A quantum system at ~18 kW is orders of magnitude below a supercomputer; when *idle* the gap is even larger (~432 kWh/day vs a supercomputer's draw) [T5]. Recent theory identifies an **"energetic advantage before computational advantage"**: in boson sampling and in superconducting cat-qubit computation, the quantum machine can win on energy at a problem size *smaller* than where it wins on wall-clock time (arXiv:2601.08068; arXiv:2605.19854, 2026) [T3]. As classical compute's energy demand climbs 20–40%/year, quantum looks comparatively sustainable at scale.
- **Cryo-overhead-dominates camp.** The cryogenic and classical-control overhead is *fixed and large*, so for any small or short computation the quantum machine's energy-per-useful-answer is terrible — you pay 18 kW to run a circuit a laptop finishes for watts. Full-system energy accounting (arXiv:2605.09580, 2026) stresses that control electronics, the classical co-processor (decoders — O-decoder), and the dilution plant must all be counted, and at *fault-tolerant scale* the millions of physical qubits plus their real-time decoding could push total draw far above today's single-fridge figure. The RSA-2048 energy cost, even at ~1M qubits over a week, is nontrivial. The favorable comparisons are for cherry-picked sampling problems with no practical use (O-advantage); no useful workload has yet demonstrated a *net* energy win.

## What would resolve it
A full-system, end-to-end energy measurement — fridge + control + classical co-processor — for a *useful* computation, compared against the best classical method's energy for the same answer done in good faith. A published joules-per-useful-result that undercuts classical would establish a real energy advantage; full-stack accounting showing cryo + decoding overhead swamps the benefit at fault-tolerant scale would deflate it. The theory prediction to test: does the energetic-advantage crossover really precede the computational-advantage crossover on a problem someone cares about?

## Sources
- arXiv:2605.09580 — "Estimating the Energy Consumption of Quantum Computing from a Full System Aspect" (2026) [T3]
- arXiv:2601.08068 — "Quantum Energetic Advantage before Computational Advantage in Boson Sampling" (2026) [T3]
- arXiv:2605.19854 — energetic advantage in superconducting cat-qubit computation (2026) [T3]
- Google supremacy energy comparison (Summit, ~7 orders of magnitude) [T3]
- postquantum.com, "The Enormous Energy Cost of Breaking RSA-2048"; Springer, "Energy Efficiency for Quantum Computers" [T3/T5]
