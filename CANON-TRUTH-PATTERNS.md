# Canon Truth Patterns

*Auto-generated synthesis · 2026-05-11T21:22:36.*


This is the algorithm-discovered structure of canon, the multi-branch primitives that emerged when we embedded every claim card and let cosine similarity tell us which different branches were independently arriving at the same truth.


## Method


1. **599 curated claim cards** across 9 canon branches were each embedded with `nomic-embed-text` (768-dim, L2-normalized).

2. **Cross-branch nearest neighbors** were ranked by *non-obvious score* = `cosine × (1 − lexical-Jaccard) × (1 + 0.3 × branch-distance)`. This favors pairs that are semantically close while being lexically distant AND living in branches that are far apart in the canon ontology, i.e., the non-obvious bridges.

3. **UMAP→HDBSCAN clustering** on the 768-d embedding space found 34 clusters; 27 spanned ≥2 branches, 17 spanned ≥3 branches. The ≥3-branch clusters are the **multi-branch primitives**.

4. **A local LLM** (llama3.2:3b via ollama, JSON format) was given the cluster members for each primitive and asked to name the underlying structural truth + map vocabulary across branches + state a falsifiability test.

5. **Corpus search**: for each primitive, the top-15 most relevant passages from the full corpus (~67K paragraph embeddings) attach as evidence. *(In progress as of generation time.)*


No keyword matching. No manual labeling. The structure emerged from semantic distance alone, then was named by reading the cluster.


## Corpus


- 599 claim cards across 9 canon branches

- 17 multi-branch primitives discovered

- 1785 cross-branch edges above cosine 0.55

- 599 total claim cards distributed:


| Branch | Cards |
|---|---:|
| 01-mathematics | 35 |
| 02-physics | 136 |
| 03-chemistry | 13 |
| 04-information | 9 |
| 05-biophysics | 198 |
| 06-cosmology | 52 |
| 07-mind | 105 |
| 08-deep-history | 42 |
| 09-sacred-texts | 9 |

## Detected primitives


| # | Score | Branches | Name | Canonical form |
|---:|---:|---:|---|---|
| 1 | 10.00 | 5 | [Non-Symmetry Principle](bucket-canon/_bridges/detected/01-non-symmetry-principle/README.md) | Any physical system or theory must be symmetric under non-trivial transformations to produce a chiral world. |
| 2 | 9.58 | 5 | [Multivalence](bucket-canon/_bridges/detected/02-multivalence/README.md) | The concept of multiple meanings or interpretations is a fundamental aspect of the subject matter. |
| 3 | 7.52 | 5 | [Subjective Truth](bucket-canon/_bridges/detected/03-subjective-truth/README.md) | The truth is subject to change and interpretation based on new data or perspectives. |
| 4 | 6.78 | 5 | [Wound Healing](bucket-canon/_bridges/detected/04-wound-healing/README.md) | Healing from injury or trauma is a natural process that leads to growth and regeneration. |
| 5 | 6.35 | 3 | [Cold Increases Energy](bucket-canon/_bridges/detected/05-cold-increases-energy/README.md) | Cold increases the amount of energy available in a system. |
| 6 | 6.05 | 5 | [Demonstration](bucket-canon/_bridges/detected/06-demonstration/README.md) | The act of explaining how to arrive at a conclusion through step-by-step explanation. |
| 7 | 6.05 | 4 | [Extracurricular Learning](bucket-canon/_bridges/detected/07-extracurricular-learning/README.md) | Learning outside of formal education is a valuable and diverse way to acquire knowledge. |
| 8 | 5.57 | 3 | [second law of thermodynamics](bucket-canon/_bridges/detected/08-second-law-of-thermodynamics/README.md) | the total entropy of an isolated system always increases over time. |
| 9 | 5.14 | 3 | [Intrinsic Pressure](bucket-canon/_bridges/detected/09-intrinsic-pressure/README.md) | The universe exhibits a pervasive, intrinsic pressure driving objects towards their centers. |
| 10 | 5.11 | 3 | [photoelectric effect](bucket-canon/_bridges/detected/10-photoelectric-effect/README.md) | The photoelectric effect is the process by which light energy is absorbed and converted into chemical energy. |
| 11 | 5.06 | 4 | [Nonlinear Dynamical Systems](bucket-canon/_bridges/detected/11-nonlinear-dynamical-systems/README.md) | A system's behavior is sensitive to initial conditions and small changes, leading to unpredictable outcomes. |
| 12 | 4.76 | 3 | [constant speed of light](bucket-canon/_bridges/detected/12-constant-speed-of-light/README.md) | The speed of light is always constant. |
| 13 | 4.61 | 3 | [Global Causality](bucket-canon/_bridges/detected/13-global-causality/README.md) | Every event has a cause, and change occurs instantly everywhere. |
| 14 | 4.60 | 3 | [Decentralized Operational Law](bucket-canon/_bridges/detected/14-decentralized-operational-law/README.md) | Operational laws and principles are decentralized. |
| 15 | 4.47 | 3 | [Curvature is fundamental](bucket-canon/_bridges/detected/15-curvature-is-fundamental/README.md) | Curvature is a universal limit for massless particles and the geometry of fundamental particles. |
| 16 | 4.34 | 3 | [Lack of Self-Reference](bucket-canon/_bridges/detected/16-lack-of-self-reference/README.md) | A system cannot be conscious if it lacks the ability to modify its own internal state. |
| 17 | 3.44 | 3 | [Two-Story Narrative](bucket-canon/_bridges/detected/17-two-story-narrative/README.md) | There are two stories that need to be told: one about the event itself and another about the individual's experience. |

## Top-10 detailed cards


### Non-Symmetry Principle **


**Spans**: 01-mathematics · 02-physics · 05-biophysics · 07-mind · 09-sacred-texts


> Any physical system or theory must be symmetric under non-trivial transformations to produce a chiral world.


The principle that any physical system or theory must be symmetric under non-trivial transformations to produce a chiral world.


*Supporting authors*: Einstein, Godel, Iron, Jung


### Multivalence **


**Spans**: 01-mathematics · 02-physics · 06-cosmology · 07-mind · 09-sacred-texts


> The concept of multiple meanings or interpretations is a fundamental aspect of the subject matter.


The concept of multiple meanings or interpretations shared across different branches, highlighting the complexity and richness of the subject matter.


*Supporting authors*: Heisenberg, Castrip, Vedanta


### Subjective Truth **


**Spans**: 02-physics · 04-information · 05-biophysics · 06-cosmology · 07-mind


> The truth is subject to change and interpretation based on new data or perspectives.


The truth is not fixed or absolute, but rather subject to change and interpretation based on new data or perspectives.


*Supporting authors*: Einstein, Shannon, Hawking


### Wound Healing **


**Spans**: 01-mathematics · 05-biophysics · 07-mind · 08-deep-history · 09-sacred-texts


> Healing from injury or trauma is a natural process that leads to growth and regeneration.


The process of healing from injury or trauma is a natural and essential part of life, leading to growth and regeneration.


*Supporting authors*: Becker, Aristotle


### Cold Increases Energy **


**Spans**: 02-physics · 05-biophysics · 09-sacred-texts


> Cold increases the amount of energy available in a system.


The principle that cold increases the amount of energy available in a system, which is fundamental to thermodynamics and has implications for physical and biological processes.


*Supporting authors*: Rick, Becker


### Demonstration **


**Spans**: 02-physics · 03-chemistry · 05-biophysics · 06-cosmology · 07-mind


> The act of explaining how to arrive at a conclusion through step-by-step explanation.


The act of showing someone how to arrive at a conclusion through step-by-step explanation.


*Supporting authors*: Feynman, Schrodinger, Becker, Kagan, Hegel


### Extracurricular Learning **


**Spans**: 01-mathematics · 05-biophysics · 06-cosmology · 07-mind


> Learning outside of formal education is a valuable and diverse way to acquire knowledge.


Learning outside of formal education is a common thread across various branches, emphasizing the importance of experiential knowledge and interdisciplinary connections.


*Supporting authors*: <name>, <name>, <name>


### second law of thermodynamics **


**Spans**: 02-physics · 05-biophysics · 07-mind


> the total entropy of an isolated system always increases over time.


the total entropy of an isolated system always increases over time, describing the direction of spontaneous processes.


*Supporting authors*: William Thompson, Laplace, Kant


### Intrinsic Pressure **


**Spans**: 02-physics · 06-cosmology · 09-sacred-texts


> The universe exhibits a pervasive, intrinsic pressure driving objects towards their centers.


A fundamental force driving objects towards their centers, manifesting as attractive or repulsive pressure.


*Supporting authors*: Albert Einstein, Stephen Hawking, Adi Shankaracharya


### photoelectric effect **


**Spans**: 02-physics · 03-chemistry · 05-biophysics


> The photoelectric effect is the process by which light energy is absorbed and converted into chemical energy.


The process by which light energy is absorbed and converted into chemical energy or biological activity.


*Supporting authors*: <name>, <name>, <name>


## Reading guide


- Branch indexes: `bucket-canon/<branch>/sub-claims/INDEX.md`

- All bridges: `bucket-canon/_bridges/INDEX.md` (curated) + `bucket-canon/_bridges/DETECTED-INDEX.md` (algorithmic)

- Design doc: `_intake/TRUTH-EXTRACTION-DESIGN.md`

- Raw cluster data: `_intake/embeddings/multi-branch-graph.json`

- Cross-branch pairs (1,785 deduped): `_intake/embeddings/cross-branch-pairs.jsonl`

- Topic clusters: `_intake/embeddings/topics.md`


## What this is not


This is not curated canon. The detected primitives are working hypotheses from a clustering + naming pipeline. Some will be real cross-domain isomorphisms. Some will be clustering artifacts. The LLM names will need human review and may be reworked. The value is that the **search-space has been reduced from 599 × 599 = 358K pairs to 17 named hypotheses for human evaluation**.
