# Quantum computing × AI/LLMs — an honest landscape

*Deep-research report. 25 sources fetched, 110 claims extracted, 23 confirmed and 2
killed by 3-vote adversarial verification. Compiled 2026-07-08.*

**Bottom line up front.** Theory has largely deflated the early hype for LLMs
specifically. Three rigorous results form the skeptical backbone: (1) supervised
quantum ML on *classical* data is provably equivalent to kernel methods; (2)
"dequantization" (Ewin Tang) removed the leading exponential-speedup candidates on
classical data; (3) barren plateaus block variational training from scaling. The one
proven and hardware-demonstrated exponential quantum advantage in ML is for learning
about *quantum-native* data — explicitly not text/LLMs. There is **no credible
demonstrated path** to quantum computers training or running production-scale LLMs.

---

## 1. The research directions (what people actually work on)

- **Quantum machine learning (QML)** — the umbrella. The dominant near-term form is
  **variational / parameterized quantum circuits (PQCs)**: a quantum circuit with
  trainable gate angles, optimized by a classical loop.
- **Quantum kernels** — encode data into quantum states, use state overlaps as a
  kernel for an SVM. *(This is exactly the primitive your Quantum Project builds.)*
- **Quantum transformers / quantum attention** — the newest hot area. A 2025 survey
  (arXiv:2504.03192) organizes it into two paradigms: **PQC-based** (subdivided into
  QKV-only mapping, quantum pairwise attention, quantum holistic attention, and
  quantum-assisted optimization) and **QLA-based** (quantum linear algebra). Only
  preliminary advantages on small/resource-constrained toy tasks; open obstacles are
  complexity-resource trade-offs, scalability/generalization, and barren plateaus.
- **Quantum embeddings / data encoding** — how classical data enters a quantum state;
  shown to *determine* a model's expressive power (see §3).
- **Quantum linear algebra for ML (HHL, QSVT)** — solve linear systems / transform
  matrices; the original source of exponential-speedup hopes, largely dequantized.
- **Tensor-network methods** — classical simulation of quantum states, also used as ML
  models (Carleo's neural quantum states sit adjacent).
- **Quantum optimization / sampling / generative models** — QAOA-style training,
  Boltzmann-machine sampling, quantum GANs.

## 2. Seminal + recent papers and their groups

| Paper | Who | What it established |
|---|---|---|
| **Barren plateaus in QNN training landscapes** (Nat. Commun. 2018, arXiv:1803.11173) | McClean, Boixo, Smelyanskiy, Babbush, Neven (Google) | Gradients vanish exponentially with qubit count → random-init variational training doesn't scale. |
| **Supervised QML models are kernel methods** (arXiv:2101.11020, Nat. Commun.) | Maria Schuld (Xanadu) | QML on classical data ≡ kernel methods; kernel (SVM) training ≥ variational training; advantage lives in the *encoding*. |
| **Effect of data encoding on expressive power** (arXiv:2008.08605, Phys. Rev. A 2021) | Schuld, Sweke, Meyer | A QML model is a partial Fourier series; the accessible frequencies are set by the encoding gates. |
| **Quantum advantage in learning from experiments** (Science 2022) | Hsin-Yuan (Robert) Huang, Jarrod McClean, John Preskill et al. | The one proven + demonstrated exponential ML advantage — for quantum-native data (see §4). |
| **Dequantizing framework** (arXiv:1910.06151, STOC 2020 / JACM 2022) + Tang PhD thesis | Chia, Gilyén, Li, Lin, Ewin Tang, Wang | Classical sampling matches quantum for recommendation, PCA, SVM, low-rank regression, SDP; QSVT gives no exponential speedup in the QRAM model. |
| **Quixer: a quantum transformer** (arXiv:2406.04305) | Quantinuum | A quantum-native transformer architecture; ran on H1 hardware on genomic classification. |

## 3. What determines whether quantum ML can help at all
Two clean theory results frame everything:
- **Kernel equivalence (Schuld).** Any supervised QML model that encodes classical
  data into quantum states and reads out via measurement inner products *is* a kernel
  method. Convex kernel/SVM training is guaranteed to match or beat variational-circuit
  training. So the "quantum neural network" framing is misleading — it's a kernel
  machine, and the only lever for advantage is the **feature map (encoding)**.
- **Encoding = expressivity (Schuld/Sweke/Meyer).** The model is a Fourier series in
  the input whose frequency spectrum is fixed by the encoding gates. Expressivity is
  *designed*, not automatic.

## 4. The one real, proven advantage — and its scope limit
**Huang, McClean, Preskill et al., Science 2022:** a quantum learner *with quantum
memory* needs exponentially fewer experiments than any classical strategy to learn
properties of a physical system. Demonstrated on Google's **Sycamore** (up to 40
superconducting qubits, ~1300 gates), ~**10,000× fewer measurements** at 20-qubit
size, 70% accuracy, and it works on **noisy (NISQ) hardware without error correction**.

**The load-bearing caveat (every verifier flagged this):** the advantage applies only
to **quantum-native data** — learning about quantum states/systems, where classical
reconstruction needs ~2ⁿ copies while the quantum algorithm scales linearly by
entangling copies. It is **explicitly not** a claim about classical text data. It has
no demonstrated relevance to training or running LLMs.

## 5. Dequantization — why classical-data speedups mostly vanished
Ewin Tang and collaborators built a classical sampling-based framework that
**recovers/matches** quantum algorithms for recommendation systems, PCA, supervised
clustering, SVMs, low-rank regression, and semidefinite programming, and proved
**quantum singular value transformation (QSVT) gives no exponential speedup** in the
QRAM/low-rank input model that motivated it. Eight QML algorithms — former top
exponential-speedup candidates — give **no exponential speedup on classical data**.

## 6. What exists (demonstrated on hardware) vs speculative

**Demonstrated (small-scale, at best approaching classical) — medium confidence,
self-reported by vendors:**
- **IonQ** integrated a PQC as a new layer into a pre-trained LLM to fine-tune
  **sentiment classification (SST-2)**, reporting higher accuracy than classical-only
  at similar parameter count.
- **Quantinuum Quixer** quantum transformer ran on **H1 hardware** on genomic sequence
  classification, "already approaching" classical models in a first implementation.

**Killed in verification (do not repeat these):**
- ❌ IonQ's quantum-GAN "steel microstructure images, 70% higher quality than classical"
  — refuted (1-2).
- ❌ Quixer as "the first quantum transformer to run on real hardware / quantum-native"
  — refuted (0-3).

**Speculative / not demonstrated:** anything at production LLM scale — quantum training,
quantum inference, quantum attention beating classical on real language data.

## 7. What is unexplored / open
- Any credible theoretical construction by which **fault-tolerant** quantum computers
  could speed up LLM **training or inference on classical text** — dequantization
  removed the low-rank/QRAM candidates and barren plateaus block variational scaling.
- The concrete **error-correction resource requirements** (logical qubit counts, gate
  fidelities, runtime) for a quantum transformer to scale past toy problems — none of
  the surviving claims quantified a fault-tolerant threshold.
- Whether classical ML datasets can be converted into a **quantum-data regime** where
  the proven Huang/McClean exponential separation would transfer, or whether that's a
  fundamental barrier.
- Where the labs and named researchers not covered by verified claims actually stand
  vs marketing (see §8).

## 8. Named researchers (verified core + to-verify breadth)
**Covered by verified findings:**
- **Maria Schuld** (Xanadu) — kernel-equivalence, encoding/expressivity; the leading
  "honest QML" voice.
- **Jarrod McClean** (Google Quantum AI) — barren plateaus; quantum advantage from
  experiments.
- **Hsin-Yuan (Robert) Huang** (Caltech→) — learning from quantum experiments; quantum
  advantage in learning.
- **John Preskill** (Caltech) — co-author, NISQ framing.
- **Ewin Tang** (UW) — dequantization; the single most important "cold water" result.

**Named but not independently verified this pass (flagged as open):** Nathan Killoran
(Xanadu, PennyLane/differentiable QML), Seth Lloyd (MIT, early quantum-ML algorithms),
Aram Harrow (MIT, HHL co-author), Giuseppe Carleo (EPFL, neural quantum states /
tensor networks), Nathan Wiebe (quantum algorithms for ML), Iordanis Kerenidis
(quantum recommendation systems — later dequantized). *A second research pass would
pin down each one's current position and results.*

**Industry (partially covered; full verification pending):** Google Quantum AI
(McClean; learning-from-experiments), IBM Quantum, Microsoft, **Quantinuum** (Quixer),
**IonQ** (PQC-in-LLM demo), Xanadu (PennyLane, Schuld/Killoran), Nvidia (CUDA-Q GPU
simulation), PsiQuantum, plus startups SandboxAQ, Multiverse Computing, QC Ware, Terra
Quantum. The verified evidence only substantiates the IonQ and Quantinuum demos; the
rest of the vendor landscape was not independently verified in this pass.

## 9. Honest hype-vs-reality — NISQ vs fault-tolerant
- **NISQ (today):** no scalable, provable quantum advantage for classical-data ML.
  Kernel-equivalence + dequantization + barren plateaus make the skeptical case
  rigorous. Vendor demos are toy-scale and at best approach classical baselines.
- **Fault-tolerant (long-term):** the door isn't formally closed, but there is no known
  construction that would help LLMs on classical text, and no resource estimate showing
  when it could. The proven exponential advantage is for **quantum data**, which text
  is not.
- **Credible path to quantum helping LLMs specifically:** none demonstrated, and the
  strongest theory results point away from it. The honest framing is that quantum ML's
  real near-term value is in **quantum chemistry / materials / simulation** (quantum
  data), not language.

---

### How this positions the Quantum Project
Your swap-test / quantum-kernel / quantum-embedding work sits squarely in the
**quantum-kernel** branch that Schuld's theorem covers — which is a feature, not a bug:
it means your project is on the one part of QML with clean theory, and your explicit
"no speedup for classical similarity search; the value is a correct hardware-validated
primitive" framing is *exactly* the honest posture this whole field's best researchers
(Schuld, Tang, Preskill) advocate. That alignment is a strong talking point for the
PhD applications and the PI emails.

### Sources (primary)
arXiv:2504.03192 (quantum transformer survey) · arXiv:2101.11020 (Schuld, kernels) ·
arXiv:2008.08605 (encoding/expressivity) · arXiv:1803.11173 (barren plateaus) ·
Science 2022 abn7293 + Google Research blog (learning from experiments) ·
arXiv:1910.06151 + Tang thesis (dequantization) · arXiv:2406.04305 (Quixer) ·
IonQ + Quantinuum vendor posts (medium confidence). 25 sources total; full list in the
workflow journal.
