# Modeling natural images using gated MRFs.

- **PMID**: 23868780
- **DOI**: 10.1109/TPAMI.2013.29
- **PMCID**:  
- **Journal**: IEEE transactions on pattern analysis and machine intelligence  ·  **Year**: 2013
- **Authors**: Marc'Aurelio Ranzato, Volodymyr Mnih, Joshua M Susskind, Geoffrey E Hinton
- **MeSH**: 
- **URL**: https://pubmed.ncbi.nlm.nih.gov/23868780/
- **Captured**: 2026-05-10T14:05:54

## Abstract

This paper describes a Markov Random Field for real-valued image modeling that has two sets of latent variables. One set is used to gate the interactions between all pairs of pixels, while the second set determines the mean intensities of each pixel. This is a powerful model with a conditional distribution over the input that is Gaussian, with both mean and covariance determined by the configuration of latent variables, which is unlike previous models that were restricted to using Gaussians with either a fixed mean or a diagonal covariance matrix. Thanks to the increased flexibility, this gated MRF can generate more realistic samples after training on an unconstrained distribution of high-resolution natural images. Furthermore, the latent variables of the model can be inferred efficiently and can be used as very effective descriptors in recognition tasks. Both generation and discrimination drastically improve as layers of binary latent variables are added to the model, yielding a hierarchical model called a Deep Belief Network.
