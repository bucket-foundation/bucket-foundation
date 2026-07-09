# Quantum simulation · S-qsim
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Using a controllable quantum system to simulate another quantum system — Feynman's original 1981–82 pitch and still the most credible application class. Two flavors. **Digital**: implement the evolution operator $e^{-iHt}$ on a gate-based machine by Trotter–Suzuki product formulas, linear combination of unitaries (LCU), qubitization, or QSVT (the methods are unpacked in `S-hamsim` and unified by `S-qsvt`), then extract observables — often via quantum phase estimation (`S-qft`) for ground-state chemistry. **Analog**: build a purpose-made quantum system whose native Hamiltonian *is* the target (e.g. Rydberg-atom arrays realizing spin models). Lloyd (1996) proved that local-Hamiltonian dynamics is simulable in polynomial time on a quantum computer — the theorem that makes the whole class rigorous.

## Where it stands (2025–26)
Analog simulators lead on scale: QuEra/Harvard 256+ atom arrays probing quantum phase transitions, spin liquids, and quench dynamics that strain classical methods (`H-neutral`). Digital simulation is the target of the current advantage push. IBM's 2023 kicked-Ising "utility" claim on 127 qubits was matched within weeks by classical tensor-network methods on a laptop (see `S-nisq`, `S-tensornet`) — the canonical example of the classical counterattack. Google's Oct 2025 "quantum echoes" experiment on Willow measures an out-of-time-order correlator (OTOC) and claims a **verifiable 13,000× speedup** over the best classical estimate, with a molecular-structure (NMR) application hook — under active classical-counterattack scrutiny, unresolved. For fault-tolerant chemistry the showcase target is the FeMoco cofactor (biological nitrogen fixation, `I-chem`/`I-agri`): resource estimates sit around ~4M physical qubits and days of runtime, after a decade of refinement that cut earlier figures by orders of magnitude.

## Key graded claims
- [T1] Local-Hamiltonian dynamics simulable in poly time on a quantum computer — Lloyd, Science 273, 1073 (1996) (established)
- [T1] Feynman's simulation proposal — Int. J. Theor. Phys. 21, 467 (1982) (established, foundational)
- [T2] 256-atom analog simulation of quantum phases — Ebadi et al., Nature 595, 227 (2021) (demonstrated)
- [T3/T4] "Quantum echoes" OTOC 13,000× beyond-classical, verifiable — Google, Nature (Oct 2025) + blog.google (claimed; contested-by-default, classical response pending)
- [T3] FeMoco ground-state estimate ~4M qubits / ~days — Lee et al., PRX Quantum 2, 030305 (2021) lineage (claimed resource estimate)

## Speedup / caveat
Exponential over known classical methods for **generic** quantum dynamics — the best-founded advantage in the portfolio (`O-advantage`, `O-killerapp`). Fine print: classical tensor-network and neural-quantum-state methods keep absorbing "hard" instances, especially anything with limited entanglement or short evolution time (`S-tensornet`); static ground-state estimation (chemistry's real prize) is QMA-hard in general, so the machine helps with *specific* instances without a blanket guarantee. Digital simulation also inherits the state-preparation problem — you must load a good approximate ground state before phase estimation refines it.

## Conflicts / open questions
Is quantum simulation the first paying application (field consensus: most likely) and when — 2027 (vendor optimism) versus mid-2030s (conservative academia)? See conflict `C-killerapp-timing`.

## Sources
Int. J. Theor. Phys. 21, 467 (1982); Science 273, 1073 (1996); Nature 595, 227 (2021); blog.google quantum-echoes (2025); PRX Quantum 2, 030305 (2021). Cross-links: `S-hamsim`, `S-qsvt`, `S-qft`, `S-tensornet`, `S-nisq`, `I-pharma`, `I-chem`, `O-killerapp`.
