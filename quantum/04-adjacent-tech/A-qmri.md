# Quantum-enhanced MRI / NMR & biomagnetism · A-qmri
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3, new node)

## What it is
Two distinct quantum leverages on magnetic-resonance and biomagnetic imaging, grouped because both aim at the same clinical/biological target from different physics:
1. **Hyperpolarization** — force nuclear spins far from thermal equilibrium (parahydrogen-induced polarization/SABRE, dynamic nuclear polarization, or brute-force) so the MR signal jumps by **10,000–100,000×**, turning slow *metabolic* MRI (watching, e.g., pyruvate→lactate in a tumor in real time) from impossible to feasible.
2. **Quantum-sensor detection** — read magnetic-resonance signals with **NV-diamond** (`A-nvsensing`) or atomic magnetometers (`A-magneto`) instead of pickup coils, enabling **nano-/micro-scale NMR**, **zero-to-low-field NMR** (no giant superconducting magnet), and biomagnetism (MEG/MCG) — see the OPM-MEG story in `A-magneto`.

## Maturity & real deployments (2025–26)
**Hyperpolarization is entering the clinic; quantum-sensor NMR is lab/preclinical.**
- **NVision Quantum Technologies** (Germany) built the **POLARIS** parahydrogen hyperpolarizer, boosting sugar/metabolite MRI signal **>10,000×** (up to ~100,000× claimed), and in 2025 ran feasibility work with **Memorial Sloan Kettering** toward standardized high-throughput metabolic imaging; its earlier collaboration seeded a Cambridge quantum-MRI hub. Hyperpolarized ¹³C-pyruvate MRI is already in human oncology/cardiology trials at multiple academic centers (the field predates NVision, but hyperpolarizer commercialization is the 2025 story).
- **Diamond/NV NMR**: MCQST (Munich) combined optical microscopy with NV-detected NMR to push MRI toward the microscopic scale, converting MR signals to optical readout on a camera (2025). Zero-/low-field **J-spectroscopy with a diamond magnetometer** (arXiv:2512.05776) and NV nuclear-spin-locking for microscale high-field NMR (arXiv:2504.00887) demonstrate NMR in regimes conventional coils can't reach — no superconducting magnet, no large shield.

## Key graded claims
- [T2] Parahydrogen/DNP hyperpolarization raises MR signal 10⁴–10⁵× enabling real-time metabolic MRI — established MR physics; hyperpolarized ¹³C human trials (established/demonstrated)
- [T3] NVision POLARIS hyperpolarizer feasibility for standardized metabolic imaging with MSK — company + 2025 collaboration (demonstrated, preclinical/translational)
- [T3] NV-diamond micro-scale and zero-field NMR without superconducting magnets — MCQST 2025; arXiv:2512.05776, 2504.00887 (demonstrated, lab)
- [T2] OPM/atomic-magnetometer biomagnetism (MEG/MCG) — see `A-magneto` (demonstrated, clinical trials)

## Conflicts / open questions
- **Hyperpolarization's clock problem**: hyperpolarized states decay in seconds to a couple of minutes (T₁-limited), so the polarizer must sit beside the scanner and imaging must be fast — a workflow/logistics barrier, not a physics one, and the main thing standing between trials and routine clinical use.
- **NV/atomic NMR's sensitivity–volume tradeoff**: quantum sensors excel at *tiny* samples (nano/micro) but do not replace whole-body clinical MRI; their clinical path is benchtop diagnostics, point-of-care low-field NMR, and research microscopy, not the hospital 3 T magnet.

## The honest call
**The most clinically plausible near-term quantum-biomedical story — but "quantum-enhanced MRI" bundles two very different maturities.** Hyperpolarized metabolic MRI is in real human trials and hyperpolarizers are being commercialized (NVision) — this is close. Quantum-sensor (NV/atomic) NMR is exciting lab physics enabling magnet-free micro-NMR, years from clinical routine. Biomagnetism via OPMs is already clinical (`A-magneto`). Grade each strand separately and resist the umbrella hype.

## Sources
- https://www.nvision-quantum.com/quantum-enhanced-mri (POLARIS hyperpolarization)
- https://analyticalscience.wiley.com/content/news-do/new-quantum-sensor-elevates-magnetic-resonance-imaging-microscopic-level (MCQST NV-NMR, 2025)
- https://arxiv.org/pdf/2512.05776 (zero-to-low-field J-spectroscopy with a diamond magnetometer)
- https://arxiv.org/pdf/2504.00887 (NV nuclear-spin-locking, microscale high-field NMR)
