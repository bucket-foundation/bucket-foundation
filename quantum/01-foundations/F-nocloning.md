# No-Cloning Theorem · F-nocloning
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
No physical process can make a perfect copy of an unknown quantum state. The proof is three lines: a universal copier would have to act linearly, and linearity forbids cloning superpositions of states it can clone individually. Proved independently by Wootters & Zurek and by Dieks in 1982 (with an earlier, little-noticed version by Park in 1970), partly in response to a proposed FTL-communication scheme that cloning would have enabled.

## Core idea / key equation
Suppose a unitary $U$ and a blank register $|b\rangle$ could copy any state: $U(|\psi\rangle|b\rangle) = |\psi\rangle|\psi\rangle$ for every $|\psi\rangle$. Apply it to two different states, $U(|\psi\rangle|b\rangle) = |\psi\rangle|\psi\rangle$ and $U(|\varphi\rangle|b\rangle) = |\varphi\rangle|\varphi\rangle$. Unitaries preserve inner products, so taking the overlap of the two input equations against the two output equations gives $\langle\psi|\varphi\rangle = \langle\psi|\varphi\rangle^2$. A number equal to its own square is $0$ or $1$, which forces the states to be either identical or orthogonal. A machine cannot clone a set that contains any non-orthogonal pair — in particular it cannot clone the two poles and the equator of the Bloch sphere at once. The same one-line argument, run with density matrices, gives no-broadcasting for mixed states. What survives is approximate cloning: the best universal $1\to 2$ machine produces two copies each with fidelity $F = \langle\psi|\rho_\text{out}|\psi\rangle = 5/6 \approx 0.833$, a ceiling set by the same linearity that forbids the perfect copy.

## Why it matters for quantum tech
No-cloning is the root of quantum cryptography: an eavesdropper cannot copy qubits in flight without disturbing them, which is what BB84 and E91 detect and is the physical assumption behind the security proofs in S-qkd → A-qkd. It also forbids naive backup of quantum data — the reason error correction (S-qec) has to protect information without reading or copying it, spreading one logical qubit across many physical ones instead of duplicating it. It blocks classical-style signal amplification, so long-haul links on photonic hardware (H-photonic) need quantum repeaters and entanglement swapping rather than repeaters that copy-and-amplify. The $5/6$ optimal-cloner bound is also the yardstick against which any real intercept-resend attack on deployed QKD is measured.

## Key graded claims
- T1 An unknown pure state cannot be perfectly copied — Wootters & Zurek, Nature 299, 802 (1982); Dieks, Phys. Lett. A 92, 271 (1982) (status: established)
- T1 Corollaries: no-broadcasting for mixed states (Barnum et al., PRL 76, 2818, 1996) and no-deleting (Pati & Braunstein, Nature 404, 164, 2000) (status: established)
- T2 Imperfect cloning is possible up to a tight bound — the optimal universal $1\to 2$ cloner reaches fidelity $5/6 \approx 0.833$: Bužek & Hillery, PRA 54, 1844 (1996) (status: established)
- T2 The $5/6$ bound was reached in the lab: single-photon cloning by stimulated parametric down-conversion produced clones at near-optimal fidelity, universal across input states — Lamas-Linares, Simon, Howell & Bouwmeester, Science 296, 712 (2002), arXiv:quant-ph/0205149 (status: demonstrated)

## Conflicts / open questions
- None at the theorem level; the live work is in how close practical eavesdropping/cloning attacks get to the optimal-cloner bound in deployed QKD (see A-qkd).

## Go deeper
- Scarani et al., "Quantum cloning," RMP 77, 1225 (2005)
- Nielsen & Chuang, Box 12.1

## Sources
- Wootters & Zurek, Nature 299, 802 (1982). doi:10.1038/299802a0
- Dieks, Phys. Lett. A 92, 271 (1982). doi:10.1016/0375-9601(82)90084-6
- Bužek & Hillery, PRA 54, 1844 (1996). doi:10.1103/PhysRevA.54.1844
- Lamas-Linares et al., Science 296, 712 (2002). arXiv:quant-ph/0205149
