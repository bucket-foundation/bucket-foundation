# AI Hypothesis Generation for Scientific Discovery, 2026

One pattern repeats: retrieve evidence, generate hypotheses with an LLM, score them, iterate. The signal differs, Elo, Bayesian, programmatic fitness, or a physical result, as does whether a hypothesis reaches a wet lab or an archive.

## OpenAI

| System | Mechanism | Scoring signal | Reuse |
|---|---|---|---|
| OpenAI for Science | GPT-5 as collaborator: lit review, hypotheses, proof sketches | Expert judgment | AI as collaborator, surfaces overlooked evidence |
| Prism | LaTeX workspace; GPT-5.2 reasons inline over the manuscript | Author accept/reject | Hypothesis bound to its full evidence context |
| Science Acceleration paper | Case studies: GPT-5 extends findings from a paper's full text | Co-author review | Extension framing: given findings, propose the next claim |

## Anthropic

| System | Mechanism | Scoring signal | Reuse |
|---|---|---|---|
| Claude for Life Sciences | Retrieves PubMed, bioRxiv, Benchling; synthesizes cited hypotheses | Citation traceability, no tournament | Claims carry a pointer to source evidence |
| AI for Science Program | $50k API credits per project, rolling cohorts | Grant review | Funding model only |

## Google DeepMind

| System | Mechanism | Scoring signal | Reuse |
|---|---|---|---|
| AI co-scientist | Gemini coalition: Generation proposes, Reflection critiques, Ranking debates, Evolution recombines, Meta-review synthesizes | Elo from simulated debate, self-play | Template: generate, debate, rank, evolve on a claims graph, corroboration as fitness |
| AlphaEvolve | LLM mutates a program population; generalizes FunSearch to full codebases | Programmatic fitness function | No crisp fitness for history; use evidence-coverage or consistency |
| FunSearch | LLM plus evaluator evolve one function toward a math objective | Exact numeric score | Weak fit for qualitative claims, needs a numeric objective |

## Other AI-scientist systems

| System | Mechanism | Scoring signal | Reuse |
|---|---|---|---|
| FutureHouse Robin | Literature to hypothesis to experiment to wet lab to paper (AMD candidate, 2.5 mo) | Real experimental outcome | Swap a corroborating source for an assay result |
| PaperQA2 / Kosmos | World model spans 1,500 papers, 42k analysis lines per run | Self-estimated ~80% accuracy | Persistent world model as substrate, state held across a session |
| Sakana AI-Scientist v2 | Tree search: idea to code to experiment to paper draft | Automated review; one paper passed peer review | Tree search over directions, paper as terminal node |
| Stanford Virtual Lab | PI agent directs specialists; 92 nanobody designs, 2 validated | Lab validation, ~1% human review | Role specialization plus a small human-review budget |
| MIT SciAgents | Ontologist, scientist, critic agents over a ~1,000-paper graph | Critic-agent review | Agents walking a claims graph for connective hypotheses |
| Lila Sciences | Hypothesis and experiment design closed-loop with a robotic lab | Assay result feeds back into the model | History's loop: archival retrieval, corroboration, revision |
| MC-NEST | Monte Carlo Tree Search plus Nash-equilibrium selection | LLM judge: novelty, clarity, significance, verifiability | Tree search with an explicit explore/exploit balance |
| Continuous Knowledge Metabolism | Sliding-window ingestion, persistent knowledge state | Predictive score against later papers | Falsification test: hold out evidence, check the prediction |

## Historical and social-science hypothesis generation

| System | Mechanism | Scoring signal | Reuse |
|---|---|---|---|
| Ithaca / Aeneas | Trained on 176,861 inscriptions; restores text, dates and places it as a ranked hypothesis | 73% accuracy at 10 missing characters; validated with 23 historians | Evidence-grounded, confidence-scored hypotheses as a research aid |
| OxCal | Bayesian model over stratigraphy and the calibration curve, Gibbs sampling | Posterior distribution over dates | Bayesian layer to combine with LLM-generated chronologies |
| Seshat / cliodynamics | Coded-variable databank per polity and century; LLMs proposed for extraction | Expert coding; Hist-LLM scores frontier models ~46% recall | Ground claims in an evidence graph, independent of model memory |

## Ten design patterns worth copying

1. Generate, debate, and rank inside one tournament loop (DeepMind co-scientist).
2. Score every hypothesis with an explicit signal: Elo, a Bayesian posterior, or a programmatic fitness function.
3. Search the hypothesis space as a tree or population with a tunable explore/exploit knob (MC-NEST, AlphaEvolve).
4. Ground every claim in retrieved primary sources with a traceable citation (Claude for Life Sciences, PaperQA2).
5. Specialize agent roles: generator, critic, ontologist, evolver, reviewer (SciAgents, Virtual Lab).
6. Build a persistent knowledge graph or world model that agents reason over across a session (SciAgents, Kosmos).
7. Hold out evidence by date and test whether a hypothesis predicts it, a falsification test (Continuous Knowledge Metabolism).
8. Close the loop against ground truth outside the model: wet lab, archive, or inscription database (Robin, Lila, Aeneas).
9. Report confidence and rationale with every hypothesis, route it to a human reviewer before treating it as settled (Aeneas, Ithaca).
10. Treat the model's trained-in knowledge as unreliable for the domain; route every claim through the evidence graph (Hist-LLM's 46% score on Seshat).
