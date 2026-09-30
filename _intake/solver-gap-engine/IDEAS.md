# Solver Gap Engine

Founder ideas, 2026-09-30.

## Solver
A solver returns a computed solution as a Lean proof. The classical result is then checked by empirical tests: run the claim on samples and confirm it holds.

## Proof Map
Map every math topic as proved or open. Embed all proved and provable problems, embed all open problems, match them. High similarity marks candidates to hand to a prover. The ranking excludes matches within the same file, since those are variants of one problem.

## Division of Labor
The solver is centralized proof. Empirical research is distributed: many groups collect samples on the same topic.

## Replication Funding
Fund people to replicate empirical results. Ties to paid-to-cite: citation fees route to authors and replicators.

## Open Question
How do research groups run empirical research on one topic, and how does Bucket coordinate them?

## Prior Work To Read
- AlphaProof, DeepMind 2024: RL plus Lean on IMO problems
- Lean mathlib and LeanDojo, Yang et al. 2023: retrieval-augmented provers
- DeepSeek-Prover V1.5 and V2
- Kimina-Prover, Goedel-Prover
- miniF2F and PutnamBench benchmarks
- FunSearch, Romera-Paredes et al., Nature 2023: LLM search finds new cap-set constructions, checked by evaluator
- AlphaEvolve, DeepMind 2025: evolved algorithms and bounds
- Ramanujan Machine, Raayoni et al., Nature 2021: conjectures from numeric search
- Davies et al., Nature 2021: ML guides intuition in knot theory and representation theory
- PatternBoost, Charton et al. 2024: counterexamples in combinatorics
- Tao equational theories project 2024: crowd plus Lean plus automated provers over 22 million implications
- Erdos problems database and formal-conjectures repo, Google DeepMind 2025
- Science of science: link prediction on concept graphs predicts future research, Krenn et al., Nature Machine Intelligence 2023, and Tshitoyan et al., Nature 2019 on embeddings predicting materials discoveries
- Many Labs and Reproducibility Project: Psychology, OSC Science 2015: multi-lab replication model
- Brain games with solvers: Foldit, EteRNA, Natural Number Game in Lean
