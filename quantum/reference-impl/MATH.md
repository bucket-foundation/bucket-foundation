# The math & science, from first principles

This document explains everything the code does, assuming linear algebra and
probability but **no prior quantum background**. Read it top to bottom and the
code in `src/` will read like a transcription of these equations.

Notation: vectors are columns; $\langle a | b \rangle$ is the inner (dot) product;
$\dagger$ is conjugate-transpose; $\lVert x \rVert$ is the L2 norm.

---

## 1. What a qubit and a quantum state actually are

A single **qubit** is a unit vector in a 2-dimensional complex space, written in
the basis $|0\rangle = (1,0)^\top$ and $|1\rangle = (0,1)^\top$:

$$ |q\rangle = a|0\rangle + b|1\rangle, \qquad a,b \in \mathbb{C}, \qquad |a|^2 + |b|^2 = 1. $$

$n$ qubits live in the **tensor product** of those spaces, which has dimension
$2^n$. Its basis is all $n$-bit strings $|00\dots0\rangle, \dots, |11\dots1\rangle$.
A general $n$-qubit state is a unit vector of length $2^n$:

$$ |\psi\rangle = \sum_{i=0}^{2^n - 1} c_i\, |i\rangle, \qquad \sum_i |c_i|^2 = 1. \tag{1} $$

Two facts we use constantly:

- **Measurement (Born rule).** If you measure $|\psi\rangle$ in the computational
  basis, you get outcome $i$ with probability $|c_i|^2$. You never see the
  amplitudes $c_i$ directly — only these probabilities, and only by repeating
  ("shots").
- **Gates are unitary matrices.** Any operation is a unitary $U$ ($U^\dagger U = I$),
  so $|\psi\rangle \mapsto U|\psi\rangle$. Unitaries preserve length and inner
  products: $\langle Ua | Ub \rangle = \langle a | b \rangle$.

The one-qubit gate we lean on is the **Hadamard**:

$$ H = \frac{1}{\sqrt2}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}, \qquad
   H|0\rangle = \tfrac{|0\rangle+|1\rangle}{\sqrt2}, \qquad
   H|1\rangle = \tfrac{|0\rangle-|1\rangle}{\sqrt2}. $$

$H$ creates an equal superposition; applying it again "un-mixes" it. Every
interference trick below is just $H$, a controlled operation, then $H$ again.

---

## 2. Amplitude encoding: a classical vector becomes a state  (`src/encode.py`)

Given a classical vector $x = (x_0, \dots, x_{N-1})$, define the state whose
amplitudes **are** the normalized entries of $x$:

$$ |\psi_x\rangle = \frac{1}{\lVert x \rVert} \sum_i x_i\, |i\rangle. \tag{2} $$

This needs $N = 2^n$, so we zero-pad $x$ to the next power of two; then
$n = \log_2 N$ qubits hold it. A 1024-dim embedding $\to$ **10 qubits**.

Why this encoding and not another? Because it makes **inner products physical**
(next section). The price: preparing $|\psi_x\rangle$ for an arbitrary $x$ costs up
to $O(2^n)$ gates — data loading is the expensive part, not the similarity step. We
study the similarity primitive and name loading as future work (qRAM / variational
loaders). `encode.py` uses Qiskit's exact state-preparation compiler.

---

## 3. The key identity: quantum overlap = cosine similarity

Take two classical vectors $u, v$. Encode them via (2). Their **overlap** is

$$ \langle \psi_u | \psi_v \rangle
   = \frac{1}{\lVert u \rVert\,\lVert v \rVert} \sum_i u_i v_i
   = \frac{\langle u, v \rangle}{\lVert u \rVert\,\lVert v \rVert}
   = \cos(u, v). \tag{3} $$

That is the entire conceptual engine: **the overlap of the two encoded states is
exactly the cosine similarity of the original vectors.** So any quantum routine that
estimates state overlap is a cosine-similarity estimator. Two such routines follow.
(For already-normalized $u,v$, $\langle\psi_u|\psi_v\rangle = \langle u,v\rangle$.)

---

## 4. The swap test: estimate $|\cos|^2$   (`src/swap_test.py`)

**Goal:** measure $|\langle\psi_u|\psi_v\rangle|^2$. **Cost:** one ancilla qubit + a
controlled-SWAP for each qubit of the registers.

The circuit ($\ast$ / $\times$ is a **controlled-SWAP** / Fredkin: swap the two
registers iff the ancilla is $|1\rangle$):

```
ancilla:  |0> --H--*--H--(measure)
u-reg:    |psi_u> -x-
v-reg:    |psi_v> -x-
```

**Derivation.** Start with $|0\rangle|\psi_u\rangle|\psi_v\rangle$. Hadamard the
ancilla:

$$ \tfrac{1}{\sqrt2}\big(|0\rangle + |1\rangle\big)\,|\psi_u\rangle|\psi_v\rangle. $$

Apply controlled-SWAP (only the $|1\rangle$ branch swaps the registers):

$$ \tfrac{1}{\sqrt2}\big(\,|0\rangle|\psi_u\rangle|\psi_v\rangle
   + |1\rangle|\psi_v\rangle|\psi_u\rangle\,\big). $$

Hadamard the ancilla again. Using $H|0\rangle = \tfrac{|0\rangle+|1\rangle}{\sqrt2}$ and
$H|1\rangle = \tfrac{|0\rangle-|1\rangle}{\sqrt2}$, the state becomes

$$ \tfrac12\,|0\rangle\big(|\psi_u\rangle|\psi_v\rangle + |\psi_v\rangle|\psi_u\rangle\big)
   + \tfrac12\,|1\rangle\big(|\psi_u\rangle|\psi_v\rangle - |\psi_v\rangle|\psi_u\rangle\big). $$

The probability of reading the ancilla as $|0\rangle$ is the squared norm of its
first component. Expanding it uses $\langle\psi_u\psi_v|\psi_v\psi_u\rangle =
\langle\psi_u|\psi_v\rangle\langle\psi_v|\psi_u\rangle = |\langle\psi_u|\psi_v\rangle|^2$:

$$ P(0) = \tfrac14\big(1 + 1 + 2\,|\langle\psi_u|\psi_v\rangle|^2\big)
        = \tfrac12 + \tfrac12\,\big|\langle\psi_u|\psi_v\rangle\big|^2. \tag{4} $$

Invert it and combine with (3):

$$ \big|\langle\psi_u|\psi_v\rangle\big|^2 = 2P(0) - 1,
   \qquad |\cos(u,v)| = \sqrt{2P(0) - 1}. \tag{5} $$

We estimate $P(0)$ from $S$ shots. A probability estimated from $S$ Bernoulli trials
has standard error $\sim\!\sqrt{P(1-P)/S}$, so **shot noise falls as $1/\sqrt{S}$** —
halving the error costs $4\times$ the shots. Limitation: (5) is a magnitude; the swap
test cannot see the **sign** of the cosine.

---

## 5. The Hadamard test: estimate the SIGNED $\cos$   (`src/hadamard_test.py`)

Real embeddings can be anti-correlated ($\cos < 0$). The **Hadamard test** recovers
the sign by estimating the real part of $\langle 0|U|0\rangle$ for a unitary $U$.

Pick $U = \mathrm{prep}_u^\dagger\,\mathrm{prep}_v$, where $\mathrm{prep}_x$ builds
$|\psi_x\rangle$ from $|0\dots0\rangle$ (so $\mathrm{prep}_x|0\rangle=|\psi_x\rangle$).
Then

$$ \langle 0|U|0\rangle
   = \langle 0|\, \mathrm{prep}_u^\dagger\,\mathrm{prep}_v \,|0\rangle
   = \big(\mathrm{prep}_u|0\rangle\big)^\dagger \big(\mathrm{prep}_v|0\rangle\big)
   = \langle\psi_u|\psi_v\rangle = \cos. \tag{6} $$

The circuit (one ancilla + one $n$-qubit register, $\ast$ = controlled-$U$):

```
ancilla: |0> --H------*------H--(measure)
work:    |0> ------[ U ]---------
```

The same interference algebra gives

$$ P(0) = \tfrac12 + \tfrac12\,\mathrm{Re}\langle 0|U|0\rangle
   \quad\Longrightarrow\quad \mathrm{Re}(\cos) = 2P(0) - 1. \tag{7} $$

For real-valued vectors $\cos$ is real, so (7) is the **signed cosine directly**. (An
$S^\dagger$ gate on the ancilla yields $\mathrm{Im}$, which is $\approx 0$ here.)

Two wins over the swap test, which is why we run *this* one on hardware:

- **Fewer qubits:** $n+1$ vs $2n+1$. On a 10-qubit embedding, 11 vs 21 qubits.
- **Linear, signed readout:** no $\sqrt{\cdot}$ to amplify noise near zero, and the
  sign comes for free.

Operator **order** matters and is a classic footgun: we need $U = \mathrm{prep}_u^\dagger\,\mathrm{prep}_v$,
which in left-to-right circuit application means apply $\mathrm{prep}_v$ first, then
$\mathrm{prep}_u^\dagger$. Reversing it returns the wrong overlap — exactly the bug
`test_hadamard_matches_signed_cosine` catches.

---

## 6. From pairs to a KERNEL MATRIX   (`src/kernel.py`)

A **kernel (Gram) matrix** of $m$ vectors is $K_{ij} = \mathrm{sim}(x_i, x_j)$. For
cosine similarity on unit vectors this is $K = X_n X_n^\top$ — a matrix of inner
products, the "matrix operations" heart of the project. We build $K$ by calling the
quantum estimator on every pair $(i,j)$, $i<j$, and mirroring; the diagonal is exactly
$1$ by construction (a vector is identical to itself), a free per-run noise gauge
($\texttt{diag\_max\_dev}$).

Why it matters: $K$ is what ML actually consumes. An SVM, kernel-ridge regression,
spectral clustering, and nearest-neighbour search all run on $K$, not on the raw
vectors. So `experiment.py`'s capstone feeds the **quantum-estimated kernel** into a
classical SVM — a quantum-kernel classifier, the bridge to quantum machine learning.

---

## 7. Noise: shots vs hardware   (`--backend aer_noisy`, `ibm`, `braket`)

Two distinct error sources, both measured:

1. **Shot noise (statistical).** Even a perfect device only samples probabilities;
   error $\sim 1/\sqrt{S}$. Controlled by `--shots`.
2. **Hardware noise (physical).** Real qubits decohere and gates misfire. We model it
   with a depolarizing channel in `aer_noisy` and measure it for real on IBM/IonQ. Its
   signature: the kernel diagonal drifts below $1$ and off-diagonals bias toward $0$ as
   states wash toward the maximally mixed state. **Error mitigation** (readout
   calibration, zero-noise extrapolation) is the natural next lever.

Both levers are now implemented and quantified in
[`writeup/error-mitigation.md`](../writeup/error-mitigation.md): readout-error
calibration (invert the measured 2×2 confusion matrix of the ancilla) and
zero-noise extrapolation (unitary folding + Richardson extrapolation to zero
noise). On the modeled gate+readout channel they cut the mean cosine error by 77%
(0.190 → 0.043) and the 5×5 kernel-matrix RMSE from 0.242 to 0.053. A lower-depth
encoding — the destructive (Bell-basis) swap test, no ancilla and no Fredkin
gates — cuts two-qubit gates by 10× at dim 2 (`src/destructive_swap.py`,
`src/error_budget.py`).

The Hadamard test's smaller qubit count and shallower circuit is why it degrades more
gracefully on hardware than the swap test — a concrete, defensible finding.

---

## 8. Honest complexity accounting

- **Encoding:** up to $O(2^n)$ gates for arbitrary vectors (the real bottleneck).
- **Swap / Hadamard test:** $O(n)$ gates beyond encoding, $O(1/\epsilon^2)$ shots for
  additive accuracy $\epsilon$.
- **Kernel matrix:** $O(m^2)$ estimator calls for $m$ vectors.

So this is **not** a claim of quantum speedup for similarity search — classical cosine
similarity is $O(d)$ and hard to beat. The value is: (a) a correct, hardware-validated
implementation of a canonical quantum primitive underlying quantum kernels and
HHL-style linear algebra; (b) an honest shots-vs-noise error budget; (c) a bridge from
a real ML workload (embeddings, kernels) to quantum hardware. Knowing what is and isn't
a speedup is exactly what a theory/algorithms PI wants to see.
