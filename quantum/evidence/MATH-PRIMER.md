# Appendix · Math primer

**Prerequisites:** comfort with vectors, matrices, and matrix multiplication over the real numbers, plus basic probability. Everything specific to quantum — complex amplitudes, bra-ket notation, unitaries, density matrices — is built here from that starting point.

This appendix gives the linear algebra over the complex numbers $\mathbb{C}$ that you actually need to read Chapter 1 and the rest of the atlas. It is deliberately narrow. The aim is that when a later page writes $|\psi\rangle$, $\langle\phi|\psi\rangle$, $U^\dagger U = I$, or $\rho$, you know exactly what each symbol means and can compute with it.

## Complex amplitudes and the unit circle

A complex number is $z = a + bi$ with $a,b$ real and $i^2 = -1$. Its **conjugate** is $z^* = a - bi$, and its **magnitude** is $|z| = \sqrt{z^*z} = \sqrt{a^2+b^2}$. Every complex number can be written in polar form:

$$ z = r e^{i\theta} = r(\cos\theta + i\sin\theta), \qquad r = |z|. $$

The numbers with $r = 1$ — the ones of the form $e^{i\theta}$ — lie on the **unit circle** in the complex plane. They are called **phases**. A phase has magnitude $1$, so multiplying by $e^{i\theta}$ rotates a number without changing its length.

This matters because a quantum amplitude is a complex number, and two facts about it come up constantly. First, only $|z|^2$ shows up in measurement probabilities, so the phase is invisible to a single measurement. Second, phases are exactly what interference manipulates — quantum algorithms arrange for unwanted amplitudes to have opposite phases so they cancel. Hold both ideas: the phase is hidden from one look, and it is the whole game across many.

## The state vector and normalization

A quantum state is a **column vector of complex amplitudes**, one entry per outcome the system could show when measured. A single qubit has two outcomes, labeled $0$ and $1$, so its state is a length-2 complex vector:

$$ |\psi\rangle = \begin{pmatrix} \alpha \\ \beta \end{pmatrix} = \alpha|0\rangle + \beta|1\rangle, \qquad |0\rangle = \begin{pmatrix}1\\0\end{pmatrix},\quad |1\rangle = \begin{pmatrix}0\\1\end{pmatrix}. $$

The amplitudes obey one constraint, **normalization**:

$$ |\alpha|^2 + |\beta|^2 = 1. $$

The reason is coming in the Born rule: $|\alpha|^2$ and $|\beta|^2$ are probabilities, and probabilities of the exhaustive outcomes sum to $1$. Geometrically, the state is a **unit vector**. Physical operations keep it a unit vector, which is why they turn out to be a restricted class of matrices.

## Bra-ket notation

Bra-ket (Dirac) notation is bookkeeping for column and row vectors and their products. A **ket** $|\psi\rangle$ is a column vector — the state. A **bra** $\langle\psi|$ is its conjugate-transpose, a row vector:

$$ |\psi\rangle = \begin{pmatrix}\alpha\\\beta\end{pmatrix} \;\Longrightarrow\; \langle\psi| = \begin{pmatrix}\alpha^* & \beta^*\end{pmatrix}. $$

Put a bra next to a ket and you multiply a row by a column, which gives a single complex number — the **inner product**:

$$ \langle\phi|\psi\rangle = \begin{pmatrix}\gamma^* & \delta^*\end{pmatrix}\begin{pmatrix}\alpha\\\beta\end{pmatrix} = \gamma^*\alpha + \delta^*\beta. $$

The inner product measures overlap. Some facts to keep:

- $\langle\psi|\psi\rangle = |\alpha|^2 + |\beta|^2 = 1$ for a normalized state — a state fully overlaps itself.
- $\langle\phi|\psi\rangle = \langle\psi|\phi\rangle^*$ — swapping the order conjugates the value.
- If $\langle\phi|\psi\rangle = 0$ the states are **orthogonal**: perfectly distinguishable in one measurement. $|0\rangle$ and $|1\rangle$ are orthogonal.

The inner product $\langle\phi|\psi\rangle$ is the cosine-similarity of the two state vectors, and the reference implementation in `reference-impl/` is built entirely on estimating it. A worked example: for $|\psi\rangle = \tfrac{1}{\sqrt2}(|0\rangle+|1\rangle)$ and $|\phi\rangle = |0\rangle$, the overlap is $\langle\phi|\psi\rangle = \tfrac{1}{\sqrt2}$.

## The Born rule

The **Born rule** connects the vector to what a measurement shows. Measure $|\psi\rangle$ in the computational basis $\{|i\rangle\}$, and outcome $i$ appears with probability

$$ P(i) = |\langle i|\psi\rangle|^2. $$

The bra $\langle i|$ picks out the $i$-th amplitude, so $\langle i|\psi\rangle$ is that amplitude and $|\langle i|\psi\rangle|^2$ is its squared magnitude. For the qubit, $P(0) = |\alpha|^2$ and $P(1) = |\beta|^2$, and normalization guarantees they sum to $1$. You never read an amplitude directly; you estimate these probabilities by repeating the preparation many times — the repeats are called **shots** — and the phase of each amplitude drops out of any single measurement.

## Tensor products for multi-qubit states

Two qubits together are described by the **tensor product** (Kronecker product) of the single-qubit spaces. If register A is in $|a\rangle$ and register B in $|b\rangle$, the joint state is $|a\rangle \otimes |b\rangle$, often written $|a\rangle|b\rangle$ or $|ab\rangle$. Concretely,

$$ \begin{pmatrix}\alpha_0\\\alpha_1\end{pmatrix} \otimes \begin{pmatrix}\beta_0\\\beta_1\end{pmatrix} = \begin{pmatrix}\alpha_0\beta_0\\\alpha_0\beta_1\\\alpha_1\beta_0\\\alpha_1\beta_1\end{pmatrix}. $$

So $n$ qubits live in a space of dimension $2^n$, with basis the $2^n$ bit strings $|00\dots0\rangle,\dots,|11\dots1\rangle$. A general $n$-qubit state is

$$ |\psi\rangle = \sum_{i=0}^{2^n-1} c_i\,|i\rangle, \qquad \sum_i |c_i|^2 = 1. $$

That exponential dimension is the resource quantum computing spends. A state that **cannot** be written as a single tensor product of individual qubit states is **entangled** — the Bell state $\tfrac{1}{\sqrt2}(|00\rangle + |11\rangle)$ is the standard example. Entanglement is the subject of Chapter 1's central sections.

## Unitary operators and why gates are unitary

An operation on a state is a matrix $U$ acting as $|\psi\rangle \mapsto U|\psi\rangle$. Physical operations must send unit vectors to unit vectors, and the matrices that preserve length and inner products are exactly the **unitary** matrices, defined by

$$ U^\dagger U = U U^\dagger = I, $$

where $U^\dagger$ is the conjugate-transpose. Unitarity has two consequences worth stating plainly. Length is preserved, so a normalized state stays normalized. Overlaps are preserved, $\langle U\phi|U\psi\rangle = \langle\phi|\psi\rangle$, so a unitary never makes two distinct states more or less distinguishable. And because $U^\dagger$ is also unitary and undoes $U$, every gate is **reversible** — a hard constraint on how quantum circuits are built. The one-qubit **Hadamard** gate,

$$ H = \frac{1}{\sqrt2}\begin{pmatrix}1 & 1\\ 1 & -1\end{pmatrix}, \qquad H|0\rangle = \frac{|0\rangle+|1\rangle}{\sqrt2}, $$

builds an equal superposition and is its own inverse ($H^2 = I$). Nearly every interference trick in the atlas is $H$, a controlled operation, then $H$ again.

## The Pauli matrices and the Bloch sphere

Three $2\times 2$ unitaries, the **Pauli matrices**, generate single-qubit dynamics:

$$ X = \begin{pmatrix}0&1\\1&0\end{pmatrix},\quad Y = \begin{pmatrix}0&-i\\i&0\end{pmatrix},\quad Z = \begin{pmatrix}1&0\\0&-1\end{pmatrix}. $$

$X$ is the bit flip ($X|0\rangle = |1\rangle$), $Z$ is the phase flip ($Z|1\rangle = -|1\rangle$), and $Y = iXZ$. Each is Hermitian and unitary, and each squares to $I$.

Any single-qubit pure state can be parameterized by two angles,

$$ |\psi\rangle = \cos\tfrac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\tfrac{\theta}{2}\,|1\rangle, $$

and mapped to the point $(\sin\theta\cos\varphi,\ \sin\theta\sin\varphi,\ \cos\theta)$ on a unit sphere — the **Bloch sphere**. The north pole is $|0\rangle$, the south pole $|1\rangle$, and the equator holds the equal superpositions. Rotations about the $x$, $y$, $z$ axes are generated by the Pauli matrices via $R_k(\theta) = e^{-i\theta k/2}$, so single-qubit gates are literally rotations of this sphere. The global phase — an overall $e^{i\gamma}$ on the whole state — moves no Bloch point and is physically undetectable, which is the geometric reason phase-only differences vanish under measurement.

## Density matrices

A state vector describes a system you know completely. When you have a statistical mixture, or you are holding only part of an entangled pair, you need the **density matrix**. For a pure state it is the outer product

$$ \rho = |\psi\rangle\langle\psi|, $$

a $d\times d$ matrix that is Hermitian ($\rho = \rho^\dagger$), positive semidefinite, and has trace $1$. A **mixed** state — outcome $|\psi_k\rangle$ with classical probability $p_k$ — is the weighted sum

$$ \rho = \sum_k p_k\,|\psi_k\rangle\langle\psi_k|. $$

The clean test that separates the two cases is the **purity** $\mathrm{Tr}(\rho^2)$: it equals $1$ for a pure state and is strictly less than $1$ for a mixed one. Measurement probabilities read out as $P(i) = \langle i|\rho|i\rangle$, and expectation values as $\langle A\rangle = \mathrm{Tr}(\rho A)$.

The **partial trace** extracts the state of a subsystem. Given a joint $\rho_{AB}$, tracing out $B$ gives $\rho_A = \mathrm{Tr}_B(\rho_{AB})$, which is the correct description of A alone. The key phenomenon: trace one qubit out of an entangled pure state and the remaining single-qubit $\rho_A$ is **mixed**. Entanglement with an environment you cannot see is exactly what makes a subsystem look noisy — the mechanism behind decoherence, covered in Chapter 1.

## Open systems: the Lindblad master equation

A closed quantum system evolves reversibly by the Schrödinger equation, equivalently $\dot\rho = -\tfrac{i}{\hbar}[H,\rho]$ for the density matrix. Real devices are **open**: they leak information to an environment, so their evolution is not reversible and cannot be a plain unitary. The **Lindblad master equation** is the standard description of that leak. It adds dissipative terms, built from **jump operators** $L_k$ that encode each noise channel (energy loss, dephasing, and so on), to the reversible part:

$$ \dot\rho = -\frac{i}{\hbar}[H,\rho] + \sum_k \gamma_k\Big(L_k\rho L_k^\dagger - \tfrac{1}{2}\{L_k^\dagger L_k,\rho\}\Big). $$

The first term is the reversible Hamiltonian evolution; the sum is the irreversible drift toward a mixed state at rates $\gamma_k$. This is the equation that predicts $T_1$ (energy relaxation) and $T_2$ (dephasing) times, sets how fast a stored qubit degrades, and underwrites the noise models and error budgets you will run in the Lab track. When Chapter 2 quotes coherence times, this is the equation behind the numbers.

---

*Back to [Chapter 1 · Foundations](../01-foundations/_CHAPTER.md), which builds the physics — superposition, the Born rule, entanglement and the Bell/CHSH bound, no-cloning, and decoherence — on top of exactly this linear algebra.*
