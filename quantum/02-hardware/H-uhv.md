# Ultra-high-vacuum & atomic-source systems · H-uhv
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Trapped-ion (`H-ion`) and neutral-atom (`H-neutral`) machines hold their qubits — bare atoms — in an **ultra-high or extreme-high vacuum** chamber (10⁻¹¹ mbar and below). The vacuum *is* the qubit's isolation: a single collision with a stray background gas molecule knocks an atom out of its trap, which is the modality's characteristic error channel (atom/ion loss). The system comprises the chamber and viewports, ion/getter pumps, an atomic source (an oven or dispenser for ions; a 2D-MOT / dispenser cold-atom source for neutral atoms), and — increasingly — a **cryogenic shroud** that both improves the vacuum (cold surfaces cryopump residual gas) and blocks blackbody radiation that would otherwise limit Rydberg-state lifetimes. It is the atomic-modality counterpart of the dilution fridge (`H-cryo`): unglamorous plumbing that sets a hard ceiling on qubit lifetime and count.

## Key players & state of the art (2025–26)
- **Cryogenic vacuum for atoms**: a high-optical-access cryogenic chamber achieved a **3,000-second single-atom trap lifetime** for Rydberg arrays (arXiv:2412.09780) — using cryogenically cooled metal walls and windows to cryopump the background gas and suppress unwanted transitions. Trap lifetime, historically seconds, is now limited by design rather than by attainable vacuum.
- **Continuous operation**: Harvard/MIT ran a ~3,000-atom array for over two hours by reloading atoms mid-computation (2025), turning atom loss from a hard stop into a managed, replenished error — a vacuum/atom-source engineering result as much as a physics one (see `H-neutral`).
- **Scale**: Caltech loaded 6,100 atoms in one chamber (Sep 2025); QuEra and Atom Computing project ~100,000 atoms per vacuum chamber within a few years — which pushes chamber size, pumping speed, and source flux hard. Vendors like **ColdQuanta/Infleqtion** and specialist UHV-chamber makers supply the hardware.

## Key graded claims
- [T2] 3,000-second trap lifetime in a cryogenic high-optical-access chamber — arXiv:2412.09780 (demonstrated)
- [T2] Continuous >2 hr operation via mid-computation atom reloading — Harvard/MIT, Nature (2025) (demonstrated)
- [T1] A background-gas collision ejects a trapped atom (loss is vacuum-limited) — established atomic physics

## Trade-offs
Room-temperature UHV chambers are simpler and give full optical access but cap trap lifetime at seconds to minutes; cryogenic chambers extend lifetime by orders of magnitude and add blackbody suppression, at the cost of a cooling system and reduced optical access. Bigger chambers hold more atoms but are harder to pump and to keep field-uniform. The atomic source flux trades loading speed against vacuum degradation.

## Conflicts / open questions
Does the path to 100,000-atom machines run through room-temperature chambers with fast reloading, or through cryogenic chambers with long-lived atoms — and can either keep vacuum-limited loss below the QEC threshold at that scale? Optical access vs cryogenic shrouding is a live chamber-design tension for the biggest neutral-atom roadmaps.

## Sources
arXiv:2412.09780 (3,000 s cryogenic trap); Nature 2025 continuous-operation paper; Caltech 6,100-atom (Sep 2025); APS Physics v18/103 (longer atom trapping); postquantum.com building-a-neutral-atom-QC guide.
