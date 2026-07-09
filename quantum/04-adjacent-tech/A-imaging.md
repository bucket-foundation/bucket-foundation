# Quantum Imaging & Radar · A-imaging
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Imaging and ranging schemes that exploit photon correlations. **Ghost imaging** reconstructs an object from a beam that never touched it, via correlations with a reference beam that did. **Quantum illumination (QI)** (Lloyd 2008; Tan et al. 2008) sends one half of an entangled signal–idler pair at a target and keeps the idler; joint correlation detection gives a theoretical **6 dB advantage in the error exponent** in the high-noise, low-reflectivity, low-signal regime — the basis of "quantum radar" claims. Related: sub-shot-noise microscopy, NOON-state phase imaging, and single-photon LiDAR. A crucial taxonomic split runs through this node — **truly quantum** (entangled/squeezed light) vs **quantum-inspired** (classical correlations, quantum detectors) — because almost all the commercial wins are the latter.

## The quantum vs quantum-inspired LiDAR split (the load-bearing distinction)
- **Single-photon / quantum-inspired LiDAR is genuinely deployed.** SPAD arrays and photon-counting time-of-flight sensors ship in automotive and remote sensing for photon-starved conditions — but they use **quantum detection with classical light**, not entanglement. A compact all-fiber **quantum-inspired LiDAR** demonstrated **>100 dB rejection** of in-band noise with single-photon sensitivity using classical time-frequency correlations (Nature Communications 2023); a 2025 **photon-number-resolving** single-photon LiDAR approached the **standard quantum limit** in ranging precision (Light: Science & Applications 2025). These keep the noise-rejection benefit without needing entanglement or cryogenics — which is exactly why they, not QI radar, reach the field.
- **Entanglement-based QI** stays in the lab. Microwave QI was demonstrated in principle inside dilution refrigerators, showing **~4 dB** measured enhancement over a classical-noise-radar benchmark (below the 6 dB theoretical ceiling), but only over a narrow parameter range and requiring cryogenic idler storage.

## Maturity & real deployments
Mostly research; the commercial wins are quantum-inspired. **Quantum radar** is the graded-hardest corner: fielded long-range quantum radar is implausible near-term because idler storage over realistic ranges is impossible (you'd need a lossless quantum memory for the round-trip light-time), entanglement generation rates are tiny, and the advantage evaporates the moment you can just transmit more classical power. Defense-lab and academic assessments are broadly skeptical despite recurring Chinese vendor claims. Ghost imaging and sub-shot-noise microscopy (Padgett, Genovese groups) are established lab techniques with niche microscopy use.

## Key graded claims
- T2 QI's 6 dB error-exponent advantage in the noise-limited regime — Tan et al., PRL 101, 253601 (2008); microwave lab demos ~4 dB (established theory, demonstrated small-scale)
- T2 Ghost imaging and sub-shot-noise imaging demonstrated repeatedly — Padgett group, Genovese reviews (established)
- T2 Noise-tolerant / photon-number-resolving LiDAR near the standard quantum limit — Light Sci. Appl. 2025; Nat. Commun. 2023 (demonstrated, quantum-inspired)
- T6 Fielded long-range quantum (entanglement) radar — vendor/press claims, no verified system (speculative; contested)

## Conflicts / open questions
- **C-qradar**: proponents cite the QI advantage; skeptics (RAND-adjacent and academic reviews) note it assumes conditions — pre-shared entanglement surviving a lossy round trip, known target range, extreme background noise, no option to just raise transmit power — that no fielded radar meets. Resolution: any independently verified over-the-air quantum (not quantum-inspired) radar demo. None exists.
- Where entanglement-based quantum imaging beats cheap computational classical imaging is still case-by-case and mostly loses on cost.

## The honest call
**Quantum-inspired imaging/LiDAR is commercial and shipping; entanglement-based quantum radar is not, and probably won't be soon.** The single most useful thing this node does is police the label: a "quantum LiDAR" in a product is almost always a photon-counting classical system, and "quantum radar" as a fielded weapon is, as of 2026, vaporware.

## Sources
- https://www.nature.com/articles/s41377-025-01880-4 (photon-number-resolving single-photon LiDAR, 2025)
- https://www.nature.com/articles/s41467-023-40914-6 (quantum-inspired LiDAR, >100 dB rejection)
- https://arxiv.org/abs/2211.05684 (quantum advantage in microwave quantum radar, ~lab)
- https://arxiv.org/pdf/2103.12548 (Quantum Technology for Military Applications — skeptical review)
