# Quantum in AI & Machine Learning · I-ai
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Quantum machine learning (QML, `S-qml`) promises quantum kernels, quantum neural networks, faster sampling, and quantum-enhanced optimization inside classical ML pipelines — plus, aspirationally, help training or running large models. It's pitched as the fusion of the two hottest technologies. It is also the **most hype-inflated corner of the entire field** and gets graded hardest (per the map's honest edge).

## Real activity (named, dated)
- Enterprise pilots exist in finance, pharma, logistics, and aerospace, and enterprises test QML as a specialized hybrid-pipeline component rather than replacing classical AI stacks.
- **Quantum-kernel methods** for credit scoring, classification, and generative sampling appear in academic + vendor studies (e.g. credit-scoring arXiv 2308.03575), typically on tiny datasets with no advantage shown.
- Vendors (IBM, IonQ, Quantinuum, Xanadu/PennyLane, Multiverse) ship QML SDKs and demos; most "results" prove *feasibility*, not advantage.
- **The dequantization record** — Tang et al. (2019, quantum recommendation systems) and successors produced classical algorithms inspired by the quantum method that matched the claimed speedups, retroactively erasing several QML "advantages."
- **NVIDIA CUDA-Q / cuQuantum** — the dominant tooling is *classical GPU simulation* of quantum circuits, a tell about where the compute actually runs.

## Key graded claims
- [T3/T4] Quantum-kernel classifiers competitive on small datasets — assorted arXiv + vendor studies (no advantage at scale)
- [T2] Certified randomness (JPMC/Quantinuum, *Nature* 2025) has downstream ML/privacy uses — established primitive, not "QML" per se
- [T6] Quantum acceleration of large-model training/inference — aspirational (speculative)
- [T5] "Quantum AI" market-size projections — forecast; among the most inflated in the field

## Proven today vs promise vs hype
- **Proven:** QML circuits run and classify toy datasets — feasibility, not advantage. Certified randomness (adjacent) is real.
- **Promise:** quantum-native data (simulating quantum systems for ML) may be the one durable niche.
- **Hype:** "quantum AI accelerates LLMs," quantum-kernel "advantage" on real data — repeatedly dequantized.

## Honest assessment
QML is where skepticism should be maximal. Multiple provisional quantum-ML "advantages" have been dequantized — classical algorithms inspired by the quantum method matched them — so the speedup evaporated. Today's hardware (tens–hundreds of noisy qubits, shallow circuits) can't run QML at data scales where it would matter, and loading classical data into quantum states (the I/O bottleneck, `S-qram`) often erases any theoretical gain. Business leaders who bet on "quantum AI" in 2025 largely walked it back. The science is worth following; the near-term product is not. Realistic advantage: unproven, possibly never for mainstream ML, plausibly niche for quantum-native data.

## Sources
- postquantum.com "Quantum Machine Learning in 2026: State of the Field": https://postquantum.com/quantum-ai/quantum-machine-learning-reality/
- techrevolt.news "What 500 Business Leaders Got Wrong About Quantum AI in 2025"
- Quantum ML for credit scoring: https://arxiv.org/pdf/2308.03575
- Tang, "A quantum-inspired classical algorithm for recommendation systems" (dequantization)
