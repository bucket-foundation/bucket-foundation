# Interpretations of Quantum Mechanics · F-interp
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
The formalism predicts probabilities perfectly; what it *says about reality* is unsettled. The main families: Copenhagen (Bohr/Heisenberg — the classical measurement context is primitive), many-worlds (Everett 1957 — no collapse, all branches real), de Broglie–Bohm (1952 — particles with definite trajectories guided by the wave), objective collapse (GRW/CSL, Diósi–Penrose — collapse is a physical process, and testable), QBism (states are agents' credences), and relational QM (Rovelli — states are relative to observers). All except objective collapse are empirically identical to standard QM.

## Core idea / key equation
The whole dispute sits on a mismatch between two rules the standard formalism runs together. Between measurements a state evolves smoothly and deterministically by the Schrödinger equation, $i\hbar\, \partial_t|\psi\rangle = H|\psi\rangle$, which is linear and never destroys a superposition. At a measurement the Born rule takes over: outcome $a$ appears with probability $P(a) = |\langle a|\psi\rangle|^2 = \mathrm{Tr}(\rho P_a)$, and the state jumps to the matching eigenstate. Superposition in, one definite outcome out — that discontinuous, probabilistic jump is nowhere in the linear equation, and specifying when and why it happens is the measurement problem. The interpretations are answers to it: many-worlds keeps only the linear equation and denies the jump is real (every outcome happens, on its own branch); de Broglie–Bohm keeps the wave and adds definite particle positions; objective-collapse theories add a small stochastic nonlinear term to the Schrödinger equation so that superpositions of large masses self-destruct on a physical timescale, which makes them the one family with numbers to test. The GRW/CSL collapse rate $\lambda$ and the Diósi–Penrose gravitational timescale are the parameters experiments try to pin.

## Why it matters for quantum tech
Mostly none — the no-collapse interpretations agree on every number, so gates, memories, and algorithms behave the same whichever you believe. The exception has teeth: objective-collapse models predict that a superposition of a large enough mass decoheres on its own, and the platforms that build ever-heavier or ever-more-isolated superpositions are exactly the matter-wave interferometers, levitated nanoparticles, and mechanical oscillators shared with quantum sensing and bosonic hardware (H-bosonic). Each new mass or coherence-time record tightens the bound on the collapse rate. The interpretation debate does not change how you run S-gates or S-qec, but the collapse tests ride on the same isolation-and-readout engineering that H-photonic and sensing programs push.

## Key graded claims
- T1 All mainstream no-collapse interpretations reproduce identical predictions; no experiment to date distinguishes them (status: established)
- T2 Objective-collapse models are being squeezed experimentally: an underground test of Diósi–Penrose collapse-induced radiation excluded its natural parameter-free version — Donadi et al., Nat. Phys. 17, 74 (2021), doi:10.1038/s41567-020-1008-4 (status: demonstrated)
- T2 The superposition principle holds for objects far heavier than atoms: matter-wave interference in a 2-m Talbot–Lau interferometer was shown for oligoporphyrin molecules beyond 25,000 Da made of up to 2,000 atoms — the heaviest objects put into a spatial superposition to date, directly narrowing the window collapse models can occupy — Fein et al., Nat. Phys. 15, 1242 (2019), doi:10.1038/s41567-019-0663-9 (status: demonstrated)
- T3 Extended Wigner's-friend theorems sharpen what any observer-independent account must give up — Frauchiger & Renner, Nat. Commun. 9, 3711 (2018); Bong et al., Nat. Phys. 16, 1199 (2020) (status: contested)

## Conflicts / open questions
- C-measurement-problem: the field's oldest open question. Physicist polls (e.g. Schlosshauer et al., arXiv:1301.1069) show no consensus — Copenhagen-ish pluralities, growing Everettian and QBist minorities. What would resolve it: a confirmed collapse-model deviation, or nothing ever.

## Go deeper
- Everett, Rev. Mod. Phys. 29, 454 (1957) · Bohm, Phys. Rev. 85, 166 & 180 (1952) · Ghirardi, Rimini, Weber, PRD 34, 470 (1986)
- Fuchs, Mermin, Schack, Am. J. Phys. 82, 749 (2014) · Rovelli, Int. J. Theor. Phys. 35, 1637 (1996)

## Sources
- As listed above; Donadi et al. (2021) doi:10.1038/s41567-020-1008-4; Bassi et al., "Models of wave-function collapse," RMP 85, 471 (2013)
- Fein et al., Nat. Phys. 15, 1242 (2019). doi:10.1038/s41567-019-0663-9
