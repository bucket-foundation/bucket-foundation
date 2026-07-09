# Quantum Discord · F-discord
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Quantum discord measures quantum correlations that survive even when a state has no entanglement. It captures the gap between two expressions for mutual information that are identical in classical probability but diverge for quantum states. Harold Ollivier and Wojciech Zurek introduced it in 2001, with Leah Henderson and Vlatko Vedral independently defining the classical-correlation term the same year. The striking claim: many separable (unentangled) mixed states still carry nonzero discord, so entanglement does not exhaust the ways quantum systems can be correlated.

## Core idea / key equation
Classically, mutual information can be written two ways — $I(A:B) = H(A) + H(B) - H(A,B)$ and $J(A:B) = H(A) - H(A|B)$ — and they always agree. Quantumly the conditional entropy $H(A|B)$ requires choosing a measurement on $B$, and the two expressions come apart. Discord is the minimized difference:

$$D(A:B) = I(A:B) - \max_{\{\Pi_k\}} J(A:B)$$

where the maximization runs over local measurements (POVMs) on $B$ and $I$ uses von Neumann entropies. $D \ge 0$ always, and $D = 0$ exactly for states that stay undisturbed by some local measurement on $B$ ("classical-quantum" states). Because the set of zero-discord states is much smaller than the set of separable states, generic separable states have $D > 0$. A concrete example is the two-qubit Werner-like separable mixtures used in the DQC1 "power of one qubit" model, where entanglement is absent yet discord tracks the computational speed-up. Computing discord requires an optimization over measurements, so closed forms exist only for special families (e.g. two-qubit Bell-diagonal states).

## Why it matters for quantum tech
Discord matters where entanglement is scarce but quantum behavior persists — highly mixed states, room-temperature and noisy platforms. It was proposed as the resource behind the DQC1 model of mixed-state quantum computation, which shows apparent speed-up with vanishing entanglement (see S-nisq, S-qsim). Discord appears in analyses of quantum metrology, state merging, and remote state preparation, and it connects to the broader map of correlations that includes entanglement and Bell nonlocality (see F-entangle, F-qinfo). For security arguments, the sharper structural constraint comes from entanglement monogamy rather than discord (see A-qkd, F-entropy-ineq).

## Key graded claims
- [T1] Some separable states have strictly positive discord; zero entanglement does not imply classical correlations — Ollivier & Zurek, PRL 88, 017901 (2001); Henderson & Vedral, J. Phys. A 34, 6899 (2001) (status: established)
- [T2] The DQC1 model exhibits computational advantage with negligible entanglement but nonzero discord — Datta, Shaji & Caves, PRL 100, 050502 (2008), arXiv:0709.0548 (status: demonstrated, interpretation debated)
- [T2] Comprehensive framework and measures for discord-type correlations — Modi, Brodutch, Cable, Paterek & Vedral, Rev. Mod. Phys. 84, 1655 (2012), arXiv:1112.6238 (status: established review)

## Conflicts / open questions
- Whether discord is an *operational* resource — one that buys a task no cheaper protocol can — is still contested; several claimed advantages have alternative explanations, and no single agreed resource theory of discord has won out.
- Discord is measurement-optimization-dependent and generally hard to compute (NP-hard in general), so which of the many proposed measures is canonical remains unsettled.

## Go deeper
- Modi, Brodutch, Cable, Paterek & Vedral, Rev. Mod. Phys. 84, 1655 (2012)
- Ollivier & Zurek, PRL 88, 017901 (2001)

## Sources
- Ollivier & Zurek, PRL 88, 017901 (2001). doi:10.1103/PhysRevLett.88.017901
- Henderson & Vedral, J. Phys. A 34, 6899 (2001). doi:10.1088/0305-4470/34/35/315
- Datta, Shaji & Caves, PRL 100, 050502 (2008). arXiv:0709.0548
- Modi et al., Rev. Mod. Phys. 84, 1655 (2012). arXiv:1112.6238
