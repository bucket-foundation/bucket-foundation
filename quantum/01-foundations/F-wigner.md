# Wigner Functions & Quasiprobability · F-wigner
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
A Wigner function $W(x,p)$ represents a quantum state as a real distribution over phase space, the closest quantum analog of a classical probability density. Eugene Wigner introduced it in 1932 to compute quantum corrections to classical statistical mechanics. Its defining feature: unlike a genuine probability density, $W$ can take negative values. Those negative regions are the phase-space signature of nonclassicality. The construction generalizes to finite-dimensional (qudit) systems through the discrete Wigner function of Gross and Wootters, where the same negativity plays the same role.

## Core idea / key equation
$$W(x,p) = \frac{1}{\pi\hbar}\int \langle x+y| \rho |x-y\rangle\, e^{-2ipy/\hbar}\, dy$$
a real function whose marginals recover the correct position and momentum distributions, so integrating $W$ reproduces every measurable statistic. What breaks the classical picture is that $W(x,p) < 0$ in some regions for most states.

Hudson's theorem (1974) pins down the boundary: a pure continuous-variable state has a non-negative Wigner function if and only if it is a Gaussian (coherent, squeezed, or thermal-pure) state. Everything with negativity — Fock states, cat states, GKP states — sits outside that Gaussian island. In the odd-prime-dimension discrete case (Gross 2006), the non-negative pure states are exactly the stabilizer states, tying Wigner positivity to the stabilizer formalism (see F-stabilizer). Negativity is then a resource: Wigner-non-negative states, Gaussian/Clifford operations, and positive measurements are efficiently classically simulable, so any quantum speed-up must inject negativity somewhere.

## Why it matters for quantum tech
Wigner negativity is the continuous-variable currency of quantum advantage. In photonic and bosonic hardware (see H-photonic, H-bosonic), Gaussian states and operations alone are classically simulable; a non-Gaussian, Wigner-negative element (photon subtraction, a cubic phase gate, a GKP state) is what lifts the platform to universality. In the qudit circuit model, negativity of the discrete Wigner function is the same resource that magic-state distillation must manufacture (see F-contextuality, S-qec, S-logical). Wigner negativity is also a practical witness for benchmarking non-classical state preparation on NISQ and bosonic devices (see S-nisq, S-qsim).

## Key graded claims
- T1 A pure state has a non-negative Wigner function iff it is Gaussian — Hudson, Rep. Math. Phys. 6, 249 (1974); qudit extension Gross, J. Math. Phys. 47, 122107 (2006), arXiv:quant-ph/0602001 (status: established)
- T2 Wigner negativity is a necessary resource for super-polynomial quantum speed-up; non-negative states + operations are efficiently classically simulable — Mari & Eisert, PRL 109, 230503 (2012), arXiv:1208.3660; Veitch, Ferrie, Gross & Emerson, New J. Phys. 14, 113011 (2012), arXiv:1201.1256 (status: established)
- T2 In odd prime dimension, non-negative discrete Wigner functions characterize exactly the stabilizer states — Gross (2006) (status: established)

## Conflicts / open questions
- The qubit ($d=2$) case is subtle: the standard discrete Wigner construction fails to make stabilizer states non-negative, so the clean "negativity = magic" statement holds cleanly only for odd dimension. Rebit and qubit refinements tie negativity to contextuality instead (see F-contextuality).
- Whether Wigner negativity, contextuality, and magic are the *same* resource or merely coincident measures is still being sharpened.

## Go deeper
- Veitch, Ferrie, Gross & Emerson, New J. Phys. 14, 113011 (2012)
- Kenfack & Życzkowski, "Negativity of the Wigner function as an indicator of nonclassicality," J. Opt. B 6, 396 (2004)

## Sources
- Wigner, Phys. Rev. 40, 749 (1932). doi:10.1103/PhysRev.40.749
- Hudson, Rep. Math. Phys. 6, 249 (1974). doi:10.1016/0034-4877(74)90007-X
- Gross, J. Math. Phys. 47, 122107 (2006). arXiv:quant-ph/0602001
- Veitch et al., New J. Phys. 14, 113011 (2012). arXiv:1201.1256 · Mari & Eisert, PRL 109, 230503 (2012). arXiv:1208.3660
