# Quantum machine learning · S-qml
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
QML covers quantum kernels, variational quantum classifiers, quantum neural networks, and hybrid pipelines — the proposal that quantum feature maps or quantum linear algebra could accelerate learning. The clearest instance is the **quantum kernel**: encode each datum $x$ into a state $\ket{\phi(x)}$ and use $k(x,y)=|\braket{\phi(x)}{\phi(y)}|^2$ as the kernel a classical SVM consumes. The manual's **reference implementation** is exactly this object built honestly end to end — amplitude-encode vectors, estimate the overlap with a swap/Hadamard test, assemble the Gram matrix, feed it to a classical SVM (100% on Iris, kernel RMSE 0.007), with a full shots-versus-noise error budget (`reference-impl/MATH.md` §6–8). It is a correct, hardware-validatable quantum kernel that also names, in the same breath, why it is **not** a speedup (classical cosine similarity is $O(d)$). QML is the most hype-inflated corner of the stack and this manual grades it accordingly.

## Where it stands (2025–26)
The record on **classical** data is negative. Tang's 2018 dequantization killed the flagship (quantum recommendation systems, `S-hhl`); random-Fourier-feature methods reproduce quantum-kernel performance classically; and a Dec 2025 peer-reviewed benchmark found plain logistic regression beating quantum SVMs, quantum k-NN, and variational classifiers on 4 of 5 realistic tabular datasets — one variational classifier scored below random guessing. Barren plateaus (`S-variational`) apply with full force to trainable models. What survives is narrow and real: **provable** kernel separations exist for contrived, cryptographically structured data (discrete-log — Liu–Arunachalam–Temme 2021), and an **exponential** advantage exists for learning from *quantum* data / experiments when a quantum memory is available (Huang et al., Science 2022). The defensible position: QML on classical data has no evidence of practical advantage; QML on quantum data is a real but niche research direction awaiting hardware.

## Key graded claims
- [T2] Low-rank QML dequantized — Tang, STOC 2019, arXiv:1807.04271 (established)
- [T2] Rigorous quantum-kernel advantage on a crypto-structured task — Liu–Arunachalam–Temme, Nat. Phys. 17, 1013 (2021) (established; artificial problem)
- [T2] Exponential advantage learning from quantum experiments with quantum memory — Huang et al., Science 376, 1182 (2022) (demonstrated; quantum data only)
- [T2] Classical baselines beat QML across realistic tabular benchmarks — Scientific Reports (Dec 2025) (demonstrated)
- [T5] "18% of quantum-algorithm revenue from AI by 2026" — Hyperion Research (forecast; graded skeptically)

## Speedup / caveat
No proven or empirical speedup on classical data. Provable advantages exist only where the problem is built from cryptographic hardness or the data is itself quantum. Even when a quantum kernel is *expressive*, the state-loading cost (`S-qram`) and the $O(m^2)$ pairwise-overlap cost of building the Gram matrix (as the reference impl makes concrete) dominate. Assume any commercial "quantum AI" pitch is unsubstantiated until it names its separation.

## Conflicts / open questions
Whether "quantum data" applications (sensor streams `A-sensing`, simulation outputs) become a real market, and whether generative "GenQAI" vendor framings (Quantinuum) ever acquire evidence. Classical shadows (`S-shadows`) are the leading rigorous tool for turning quantum data into predictions with few measurements — a more defensible route than variational QML.

## Sources
arXiv:1807.04271; Nat. Phys. 17, 1013 (2021); Science 376, 1182 (2022); Sci. Rep. (Dec 2025). Cross-links: `S-hhl`, `S-variational`, `S-qram`, `S-shadows`, `reference-impl/`, `O-hype`.
