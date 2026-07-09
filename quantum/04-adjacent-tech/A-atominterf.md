# Atom interferometry (as its own platform) · A-atominterf
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3, new node)

## What it is
Atom interferometry is the *technique* underneath several sensing cards, promoted here to its own node because it is a distinct platform, not an application. Laser-cool a cloud of atoms, then use light pulses to coherently split, redirect, and recombine each atom's matter-wave along two paths; the phase difference at recombination encodes whatever acted differently on the two arms — gravitational acceleration, rotation, or a fundamental constant. Because the de Broglie wavelength is tiny and the atom is a perfect, drift-free test mass referenced to atomic structure, atom interferometers are **absolute** instruments. The same hardware measures gravity (`A-gravimetry`), rotation (gyroscopes), acceleration (the IMU under `A-pnt`), and probes physics: the fine-structure constant, tests of the equivalence principle, and searches for dark matter and gravitational waves in a new band.

## Maturity & real deployments (2025–26)
**A mature laboratory platform; early-commercial as gravimeters; a physics tool at the frontier.**
- **Commercial instruments**: Exail's AQG absolute gravimeter (`A-gravimetry`) and AOSense inertial/gravity sensors are atom interferometers you can buy.
- **Fundamental physics**: atom interferometers have measured the fine-structure constant α to ~0.2 parts per billion and run the tightest lab tests of the weak equivalence principle (Stanford 10 m tower, and the MICROSCOPE-successor concepts). **AION** (UK) and **MAGIS-100** (Fermilab, ~100 m baseline) are building long-baseline atom interferometers to search for ultralight dark matter and mid-band gravitational waves (~0.1–10 Hz, between LIGO and LISA). Space concepts (STE-QUEST, and Bose-Einstein-condensate interferometry on the ISS Cold Atom Lab) extend the free-fall time that sets sensitivity.
- **The sensitivity lever**: interferometer phase sensitivity scales with the interrogation time squared and the momentum splitting — which is why the field pushes toward longer drop towers, microgravity, and large-momentum-transfer beam-splitters.

## Key graded claims
- [T1] Light-pulse atom interferometry gives absolute, atomic-referenced measurement of acceleration/rotation — Kasevich–Chu lineage (established)
- [T2] Fine-structure constant measured to sub-ppb by atom interferometry — Parker et al./Morel et al. (established)
- [T2] Long-baseline atom interferometers (MAGIS-100, AION) under construction for dark-matter / GW search — collaboration reports (demonstrated construction, roadmap science)
- [T3] BEC atom interferometry in microgravity (Cold Atom Lab, ISS) — NASA/JPL results (demonstrated)

## Conflicts / open questions
- **The moving-platform problem** (shared with `A-pnt`/`A-gravimetry`): a launched cloud dislikes vibration and rotation, so turning a beautiful lab gravimeter into a strapdown navigation-grade 6-DoF sensor on a maneuvering vehicle is unsolved engineering.
- **Physics upside is speculative**: whether long-baseline interferometers actually *detect* dark matter or mid-band gravitational waves (rather than just set limits) is unknown — that is the science bet, not a guaranteed return.

## The honest call
**A mature, foundational quantum-sensing platform** — Nobel-recognized physics (1997/2005 laser cooling and precision measurement lineage), buyable as gravimeters, and the engine of the field's most precise fundamental-constant measurements. Its two frontiers are opposite in character: *down* into rugged, small navigation sensors (engineering-hard, `A-pnt`), and *up* into kilometre-scale physics detectors (science-speculative). Grade the instrument as established; grade each application on its own card.

## Sources
- https://arxiv.org/abs/... (MAGIS-100 detector, Fermilab)
- https://aion-project.web.cern.ch/ (AION long-baseline atom interferometer)
- Parker et al., "Measurement of the fine-structure constant as a test of the Standard Model," Science 360 (2018)
- NASA JPL Cold Atom Lab BEC interferometry results
