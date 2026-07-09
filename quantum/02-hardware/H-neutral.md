# Neutral-atom qubits · H-neutral
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Neutral atoms (Rb, Sr, Cs, Yb) held in arrays of optical tweezers; qubits live in hyperfine or nuclear-spin states, and two-qubit gates come from exciting atoms to giant **Rydberg** states whose strong interaction blockades neighbors. Tweezers can be physically rearranged mid-computation, giving reconfigurable, effectively all-to-all connectivity and native support for shuttling logical qubits — the feature that made the modality the fastest-moving of 2024–26. Atoms are laser-cooled but the apparatus itself runs at room temperature inside an ultra-high-vacuum chamber (see `H-uhv`); the machine is fundamentally a laser instrument (`H-lasers`).

## Key players & state of the art (2025–26)
- **QuEra / Harvard / MIT**: 2025 Nature results — 48 logical qubits on 280 atoms with below-threshold operation and logical-layer magic-state distillation; a separately reported continuously-operating array kept a ~3,000-atom system running for over two hours by reloading atoms mid-computation, addressing atom-loss as an error channel. **Jan 2026: 96 logical qubits from 448 physical atoms via a high-rate $[[16,6,4]]$ code (~4.7:1 encoding), below-threshold across all 96 — peer-reviewed in Nature (s41586-025-09848-5), the current logical-qubit record.** Roadmap: 100 logical qubits ~2026. Raised $230M (Feb 2025), Google/SoftBank participating.
- **Pasqal** (France): 1,000+ atom arrays; first neutral-atom demo of logical qubits outperforming physical ones on a differential-equation workload (2026); analog + digital modes; ~3 kW rack systems. Targets 10,000 qubits ~2026–27.
- **Atom Computing** (US): 1,180-atom Sr array (1,225 sites), ~40 s coherence; with Microsoft demonstrated 24 entangled logical qubits (2024); Magne (~50 logical from ~1,200 physical) targeted ~2027.
- **Infleqtion** (US): Sqale platform, UK NQCC deployment. **planqc** (Germany): Sr arrays, DLR/LRZ contracts.
- **Atom-count frontier**: Caltech loaded 6,100 atoms in a single tweezer array (Sep 2025); QuEra/Atom Computing project 100,000 atoms per chamber within a few years.

## Key graded claims
- [T2] 48 logical qubits + logical magic-state distillation — Harvard/QuEra, Nature (2025) (demonstrated)
- [T2] 96 logical qubits via a high-rate $[[16,6,4]]$ code on 448 atoms, below-threshold — QuEra, Nature s41586-025-09848-5 (2026) (demonstrated, peer-reviewed)
- [T2] Continuous >2 hr operation via mid-computation atom reloading (~3,000 atoms) — Harvard/MIT, Nature (2025) (demonstrated)
- [T3] 6,100-atom single-array loading — Caltech (Sep 2025) (demonstrated, static array)
- [T4] Pasqal 10,000 qubits by ~2026–27 — company roadmap (roadmap)

## Trade-offs (vs other modalities)
The largest qubit counts of any gate-based modality, reconfigurable connectivity, a room-temperature apparatus, and intrinsically identical atoms; against that, gates are slower than transmons (Rydberg gates ~sub-µs but with cooling/rearrangement overhead per cycle), atom loss is a distinctive error channel that forces continuous reloading, and 2Q fidelities (~99.5%) still trail trapped ions. The optical-table laser subsystem is the practical scaling wall (`H-lasers`), the analog of superconducting wiring.

## Conflicts / open questions
Does the logical-qubit lead survive the move from batch-mode demos to continuous, repeatable computation with fast mid-circuit measurement and feed-forward at scale? Rearrangement time and cooling cycles set an effective clock speed that has to fit inside QEC budgets.

## Sources
quera.com; Nature 2025 logical-qubit + continuous-operation papers; QuEra 96-logical Nature s41586-025-09848-5 (2026); Caltech 6,100-atom (Sep 2025); Pasqal newsroom; IEEE Spectrum "Neutral-Atom QC 2026"; postquantum.com neutral-atom guide.
