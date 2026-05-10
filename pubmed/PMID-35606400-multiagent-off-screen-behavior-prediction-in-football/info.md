# Multiagent off-screen behavior prediction in football.

- **PMID**: 35606400
- **DOI**: 10.1109/JSEN.2019.2923982
- **PMCID**: PMC5904216 (full-text saved)
- **Journal**: Scientific reports  ·  **Year**: 2022
- **Authors**: Shayegan Omidshafiei, Daniel Hennes, Marta Garnelo, Zhe Wang, Adria Recasens, Eugene Tarassov, Yi Yang, Romuald Elie, Jerome T Connor, Paul Muller, Natalie Mackraz, Kris Cao, Pol Moreno, Pablo Sprechmann, Demis Hassabis, Ian Graham, William Spearman, Nicolas Heess, Karl Tuyls
- **MeSH**: Football, Humans, Learning, Soccer
- **URL**: https://pubmed.ncbi.nlm.nih.gov/35606400/
- **Captured**: 2026-05-10T16:34:25

## Abstract

In multiagent worlds, several decision-making individuals interact while adhering to the dynamics constraints imposed by the environment. These interactions, combined with the potential stochasticity of the agents' dynamic behaviors, make such systems complex and interesting to study from a decision-making perspective. Significant research has been conducted on learning models for forward-direction estimation of agent behaviors, for example, pedestrian predictions used for collision-avoidance in self-driving cars. In many settings, only sporadic observations of agents may be available in a given trajectory sequence. In football, subsets of players may come in and out of view of broadcast video footage, while unobserved players continue to interact off-screen. In this paper, we study the problem of multiagent time-series imputation in the context of human football play, where available past and future observations of subsets of agents are used to estimate missing observations for other agents. Our approach, called the Graph Imputer, uses past and future information in combination with graph networks and variational autoencoders to enable learning of a distribution of imputed trajectories. We demonstrate our approach on multiagent settings involving players that are partially-observable, using the Graph Imputer to predict the behaviors of off-screen players. To quantitatively evaluate the approach, we conduct experiments on football matches with ground truth trajectory data, using a camera module to simulate the off-screen player state estimation setting. We subsequently use our approach for downstream football analytics under partial observability using the well-established framework of pitch control, which traditionally relies on fully observed data. We illustrate that our method outperforms several state-of-the-art approaches, including those hand-crafted for football, across all considered metrics.
