# Adaptive importance sampling to accelerate training of a neural probabilistic language model.

- **PMID**: 18390314
- **DOI**: 10.1109/TNN.2007.912312
- **PMCID**:  
- **Journal**: IEEE transactions on neural networks  ·  **Year**: 2008
- **Authors**: Y Bengio, J S Senecal
- **MeSH**: Computer Simulation, Humans, Language, Markov Chains, Models, Statistical, Neural Networks, Computer, Programming Languages
- **URL**: https://pubmed.ncbi.nlm.nih.gov/18390314/
- **Captured**: 2026-05-10T14:00:51

## Abstract

Previous work on statistical language modeling has shown that it is possible to train a feedforward neural network to approximate probabilities over sequences of words, resulting in significant error reduction when compared to standard baseline models based on n-grams. However, training the neural network model with the maximum-likelihood criterion requires computations proportional to the number of words in the vocabulary. In this paper, we introduce adaptive importance sampling as a way to accelerate training of the model. The idea is to use an adaptive n-gram model to track the conditional distributions produced by the neural network. We show that a very significant speedup can be obtained on standard problems.
