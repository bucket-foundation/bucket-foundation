# Hybrid predictive coding: Inferring, fast and slow.

- **PMID**: 37531366
- **DOI**: 10.1162/neco_a_00999
- **PMCID**: PMC5380101 (full-text saved)
- **Journal**: PLoS computational biology  ·  **Year**: 2023
- **Authors**: Alexander Tscshantz, Beren Millidge, Anil K Seth, Christopher L Buckley
- **MeSH**: Bayes Theorem, Learning, Visual Perception
- **URL**: https://pubmed.ncbi.nlm.nih.gov/37531366/
- **Captured**: 2026-05-10T11:34:55

## Abstract

Predictive coding is an influential model of cortical neural activity. It proposes that perceptual beliefs are furnished by sequentially minimising "prediction errors"-the differences between predicted and observed data. Implicit in this proposal is the idea that successful perception requires multiple cycles of neural activity. This is at odds with evidence that several aspects of visual perception-including complex forms of object recognition-arise from an initial "feedforward sweep" that occurs on fast timescales which preclude substantial recurrent activity. Here, we propose that the feedforward sweep can be understood as performing amortized inference (applying a learned function that maps directly from data to beliefs) and recurrent processing can be understood as performing iterative inference (sequentially updating neural activity in order to improve the accuracy of beliefs). We propose a hybrid predictive coding network that combines both iterative and amortized inference in a principled manner by describing both in terms of a dual optimization of a single objective function. We show that the resulting scheme can be implemented in a biologically plausible neural architecture that approximates Bayesian inference utilising local Hebbian update rules. We demonstrate that our hybrid predictive coding model combines the benefits of both amortized and iterative inference-obtaining rapid and computationally cheap perceptual inference for familiar data while maintaining the context-sensitivity, precision, and sample efficiency of iterative inference schemes. Moreover, we show how our model is inherently sensitive to its uncertainty and adaptively balances iterative and amortized inference to obtain accurate beliefs using minimum computational expense. Hybrid predictive coding offers a new perspective on the functional relevance of the feedforward and recurrent activity observed during visual perception and offers novel insights into distinct aspects of visual phenomenology.
