# Magnetometry · A-magneto
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Measuring magnetic fields with quantum systems, down to femtotesla (fT) — the brain's magnetic signals are ~50–500 fT, roughly a hundred-million-times weaker than Earth's ~50 µT field. Three platforms with different trade-offs:
- **SQUIDs** — superconducting loops, the cryogenic gold standard since the 1960s; **~1–5 fT/√Hz**, but need liquid helium and fixed dewars.
- **OPMs (optically pumped magnetometers)** — alkali (Rb/Cs) or ⁴He vapor cells, near-room-temperature, small and wearable; commercial zero-field OPMs (QuSpin QZFM Gen-2) reach **~7–15 fT/√Hz** (1–100 Hz), approaching SQUID sensitivity without cryogenics.
- **NV-diamond** — nanoscale, ambient, vector; best NV-MEG-oriented sensors reach **~9.4 pT/√Hz** (5–100 Hz) — three orders worse than OPMs, but at atom-scale spatial resolution (see `A-nvsensing`, `H-nv`).

## Maturity & real deployments (2025–26)
Commercial today across several niches, with neuroimaging the standout disruption.
- **MEG (magnetoencephalography)**: SQUID-MEG has imaged brain fields in hospitals for decades inside **$2–3M shielded rooms** with fixed helmets. The disruption is **OPM-MEG** — wearable helmets the patient can move in. **Cerca Magnetics** (Nottingham spin-out) sells OPM-MEG and ran epilepsy/Parkinson's clinical work through 2024–25; **FieldLine Medical** installed 64-channel wearable OPM-MEG at two US academic medical centres in 2024 for pediatric epilepsy pre-surgical mapping without sedation; **MAG4Health** (France) sells a ⁴He-OPM system; an 80-sensor OPM-MEG study (NeuroImage 2025) marks research-grade adoption.
- **Cardiac**: SandboxAQ's **CardiAQ** (with Mayo Clinic) applies OPMs to magnetocardiography.
- **Navigation**: magnetic-anomaly map-matching (Q-CTRL Ironstone Opal, SandboxAQ AQNav — see `A-sensing`, `A-pnt`).
- **Geophysics/defense**: SQUID transient-EM sensors (CSIRO LANDTEM) have found ore bodies; OPM/NV airborne surveys are emerging; magnetic-anomaly submarine detection (MAD) is a classified but active area.

## Key graded claims
- [T1] SQUIDs (~1–5 fT/√Hz) and zero-field OPMs (~7–15 fT/√Hz) reach femtotesla sensitivity — decades of metrology + QuSpin datasheets (established)
- [T2] Wearable OPM-MEG matches cryogenic MEG signal quality while allowing head motion — Boto et al., Nature 555 (2018); 80-sensor system, NeuroImage 2025 (demonstrated)
- [T2] NV-diamond magnetometer at ~9.4 pT/√Hz enabling ambient-condition MEG-scale sensing — Phys.org/2024 diamond magnetometer result (demonstrated)
- [T4] CardiAQ OPM cardiac diagnostics in clinical evaluation with Mayo Clinic; Cerca OPM-MEG clinical work 2024–25 — company announcements (claimed)

## Conflicts / open questions
- **Reimbursement, not physics, gates OPM-MEG.** The sensitivity is there; whether it displaces SQUID suites this decade turns on FDA/CE clearance and insurance reimbursement pace, plus the still-needed magnetically shielded room (OPMs cut cost but don't fully eliminate shielding).
- **NV fit is unsettled**: NV's ambient operation and spatial resolution are unmatched, but it lags OPM/SQUID by 2–3 orders in raw sensitivity — so its commercial niche (current mapping inside chips, single-cell biology, scanning probe) is real but narrow.

## The honest call
**Commercial and the most clinically consequential quantum-sensing modality.** SQUID magnetometry is a mature medical/industrial product; OPM-MEG is a live, well-funded disruption already installed in hospitals and limited by regulatory/reimbursement timelines rather than performance; NV magnetometry is real but a specialist tool, not an OPM/SQUID replacement.

## Sources
- https://www.sciencedirect.com/science/article/pii/S1053811925001843 (80-sensor OPM-MEG, 2025)
- https://entangledfuture.com/quantum-sensors/magnetometers/ (OPM/SQUID/NV sensitivity comparison)
- https://phys.org/news/2024-06-highly-sensitive-diamond-quantum-magnetometer.html (9.4 pT/√Hz NV)
- Boto et al., "Moving magnetoencephalography towards real-world applications," Nature 555 (2018)
