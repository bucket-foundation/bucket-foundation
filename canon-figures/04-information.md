# 04 — Information & Computation

> **What counts as canon-tier in information.** A new model of computation, a new measure of information or complexity, an undecidability or impossibility result, a substrate (transistor, network, protocol) that becomes the platform for everything downstream, or a formal language whose adoption reorganizes a field. Faster algorithms inside an existing model are not canon-tier; the figures below each defined a new model.

---

### George Boole

| | |
|---|---|
| **id** | boole |
| **lifespan** | 1815–1864 |
| **era** | Mid-19th century |
| **region / tradition** | Cork — English/Irish mathematical logic |
| **primary works** | *The Mathematical Analysis of Logic* (1847, English); *An Investigation of the Laws of Thought* (1854, English) |

**Foundation contribution.** Reformulated **logic as algebra**. Where Aristotelian logic operated on syllogisms in natural language, Boole operated on symbols ($x$, $y$) under operations ($\cdot$, $+$, $-$) that obeyed algebraic rules — with the constraint $x^2 = x$ (idempotence) marking the Boolean case. This is the birth of *symbolic* logic and the direct ancestor of every digital circuit ever built.

**Why canon.** Logic stops being a verbal discipline and becomes a calculable one. The "calculus of thought" promised by Leibniz finally has a working notation.

**Downstream.** Frege, Russell, Whitehead, Shannon (who applied Boolean algebra to circuits in 1937), every digital computer.

**Tags.** `boolean-algebra` `symbolic-logic` `propositional-calculus` `laws-of-thought`

---

### Gottlob Frege

| | |
|---|---|
| **id** | frege |
| **lifespan** | 1848–1925 |
| **era** | Late 19th / early 20th century |
| **region / tradition** | Jena — German mathematical logic |
| **branches** | 04-information |
| **cross-branches** | 01-mathematics, 07-mind |
| **primary works** | *Begriffsschrift* (1879, German); *Die Grundlagen der Arithmetik* (1884, German) |

**Foundation contribution.** Invented **first-order predicate logic** — quantifiers ($\forall$, $\exists$), variables, predicates, the modern logical notation that subsumed and surpassed Boole's propositional algebra. Argued that arithmetic could be derived from logic alone (logicism). The *Begriffsschrift* is the first formal language adequate for expressing mathematical reasoning.

**Why canon.** Modern mathematical logic begins here. Every formal system in computer science, linguistics, philosophy, and mathematics is descended from Frege's notation.

**Downstream.** Russell, Whitehead, Wittgenstein, Tarski, Gödel, Turing, all of computer science.

**Tags.** `predicate-logic` `quantifier` `logicism` `formal-language`

---

### Alan Turing

| | |
|---|---|
| **id** | turing |
| **lifespan** | 1912–1954 |
| **era** | 20th century |
| **region / tradition** | Cambridge, Bletchley Park, Manchester — English mathematical logic & computer science |
| **branches** | 04-information |
| **cross-branches** | 01-mathematics, 07-mind |
| **primary works** | *On Computable Numbers, with an Application to the Entscheidungsproblem* (1936, English); *Computing Machinery and Intelligence* (1950, English); *The Chemical Basis of Morphogenesis* (1952, English) |

**Foundation contribution.** Defined the **Turing machine** — a precise mathematical model of what it means to *compute*. Used it to prove the **halting problem** is undecidable, settling the Entscheidungsproblem in the negative. The Turing machine is the standard reference model of computation; the Church–Turing thesis identifies "computable" with "Turing-computable." Also: the 1950 paper proposes the imitation game as a behavioral test for machine intelligence; the 1952 paper founds **mathematical biology** (reaction-diffusion morphogenesis).

**Why canon.** Three foundations in three different fields. The 1936 paper alone is the founding document of computer science.

**Downstream.** Von Neumann, Church, Kleene, all of computer science, all of theoretical AI, the Turing test as a canonical (if contested) benchmark.

**Tags.** `turing-machine` `halting-problem` `computability` `church-turing-thesis`

---

### Alonzo Church

| | |
|---|---|
| **id** | church |
| **lifespan** | 1903–1995 |
| **era** | 20th century |
| **region / tradition** | Princeton — American mathematical logic |
| **branches** | 04-information |
| **cross-branches** | 01-mathematics |
| **primary works** | *An Unsolvable Problem of Elementary Number Theory* (1936, English); papers on the lambda calculus (1932–41) |

**Foundation contribution.** Invented the **lambda calculus**, an alternative formal model of computation based on function abstraction and application. Independently of Turing, proved the Entscheidungsproblem unsolvable. The lambda calculus is the substrate of every functional programming language (LISP, ML, Haskell, Scala, modern type systems) and of every modern proof assistant (Coq, Agda, Lean).

**Why canon.** Provides a second, equivalent foundation for computability — different formal apparatus, same expressive power. The Church–Turing thesis is the assertion that this is not a coincidence: lambda calculus and Turing machines define the same class of computable functions.

**Downstream.** McCarthy (LISP, 1958), Milner (ML), Wadler, Pierce, every type theorist.

**Tags.** `lambda-calculus` `functional-programming` `entscheidungsproblem` `church-numerals`

---

### Claude Shannon

| | |
|---|---|
| **id** | shannon |
| **lifespan** | 1916–2001 |
| **era** | 20th century |
| **region / tradition** | Bell Labs, MIT — American information theory |
| **branches** | 04-information |
| **primary works** | *A Symbolic Analysis of Relay and Switching Circuits* (1938, English — MS thesis); *A Mathematical Theory of Communication* (1948, English) |

**Foundation contribution.** Two foundations: (1) the 1938 thesis showed that **electrical relay circuits implement Boolean algebra**, providing the bridge between Boole and digital hardware and arguably founding digital electronics; (2) the 1948 paper founds **information theory** by defining the bit, the entropy of a source, the channel capacity, and the channel coding theorem (reliable communication is possible at any rate below channel capacity, no matter how noisy the channel).

**Why canon.** The 1948 paper is the founding document of every quantitative treatment of information — from telecommunications to data compression to neural-network training to statistical inference.

**Downstream.** Hamming, Kolmogorov, Cover & Thomas, every modern codec.

**Tags.** `information-theory` `entropy` `channel-capacity` `digital-circuits`

---

### John von Neumann

| | |
|---|---|
| **id** | von-neumann |
| **lifespan** | 1903–1957 |
| **era** | 20th century |
| **region / tradition** | Princeton (IAS), Los Alamos — Hungarian/American polymath |
| **branches** | 04-information |
| **cross-branches** | 01-mathematics, 02-physics |
| **primary works** | *Mathematische Grundlagen der Quantenmechanik* (1932, German); *First Draft of a Report on the EDVAC* (1945, English); *Theory of Games and Economic Behavior* (1944, with Morgenstern, English) |

**Foundation contribution.** Three foundations: (1) the **stored-program computer architecture** (1945 EDVAC report) — the design pattern in which the program lives in the same memory as the data, which is the architecture of effectively every computer built since; (2) **game theory** (1944, with Morgenstern) — a mathematical foundation for strategic interaction that became the substrate of theoretical economics, evolutionary biology, and AI; (3) the **mathematical foundations of quantum mechanics** (1932) in Hilbert-space terms, providing the formalism still used today.

**Why canon.** Three independent canon-tier contributions in three branches. The von Neumann architecture is one of the very few engineering decisions that has held for 80 years without structural revision.

**Downstream.** Every computer architect, every game theorist, every quantum physicist.

**Tags.** `stored-program` `von-neumann-architecture` `game-theory` `quantum-formalism`

---

### Andrey Kolmogorov

| | |
|---|---|
| **id** | kolmogorov |
| **lifespan** | 1903–1987 |
| **era** | 20th century |
| **region / tradition** | Moscow — Soviet mathematics |
| **branches** | 04-information |
| **cross-branches** | 01-mathematics |
| **primary works** | *Grundbegriffe der Wahrscheinlichkeitsrechnung* (1933, German); *Three Approaches to the Quantitative Definition of Information* (1965, English) |

**Foundation contribution.** Two foundations: (1) the 1933 monograph **axiomatized probability theory** in measure-theoretic terms, ending the foundational ambiguity that had dogged probability since Bernoulli and providing the framework that statistics, stochastic processes, and mathematical finance are still built on; (2) the 1965 paper founds **algorithmic information theory (Kolmogorov complexity)** — the information content of a string is the length of the shortest program that outputs it. This is the *intrinsic* notion of randomness and information, independent of any source distribution.

**Why canon.** Modern probability is Kolmogorov's axioms. Kolmogorov complexity is the only definition of information that does not require a probability distribution as an input.

**Downstream.** Doob, Itô, all of modern stochastic analysis; Chaitin, Levin, Solomonoff (algorithmic probability), AIXI, modern theoretical AI.

**Tags.** `probability-axioms` `kolmogorov-complexity` `algorithmic-information` `randomness`

---

### Norbert Wiener

| | |
|---|---|
| **id** | wiener |
| **lifespan** | 1894–1964 |
| **era** | 20th century |
| **region / tradition** | MIT — American mathematics |
| **branches** | 04-information |
| **cross-branches** | 01-mathematics, 05-biophysics, 07-mind |
| **primary works** | *Extrapolation, Interpolation, and Smoothing of Stationary Time Series* (1949, English); *Cybernetics: or Control and Communication in the Animal and the Machine* (1948, English) |

**Foundation contribution.** Founded **cybernetics**: the unified study of control, feedback, and communication in systems regardless of whether they are biological, mechanical, or social. Formalized negative-feedback control loops, the Wiener filter for signal estimation in noise, and the mathematical treatment of stochastic processes (Wiener process / Brownian motion). Framed the analogy — later literal — between nervous-system regulation and servo-mechanism regulation.

**Why canon.** Cybernetics is the substrate vocabulary of control theory, systems biology, and the *feedback* concept that AI, economics, and neuroscience all depend on. The Wiener process is the canonical model of continuous random motion in probability theory.

**Downstream.** Ashby, von Foerster, Bateson (second-order cybernetics); modern control theory; stochastic calculus; Kalman's 1960 filter generalizes the Wiener filter.

**Tags.** `cybernetics` `feedback` `wiener-process` `control-theory`
