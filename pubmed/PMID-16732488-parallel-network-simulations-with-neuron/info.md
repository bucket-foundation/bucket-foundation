# Parallel network simulations with NEURON.

- **PMID**: 16732488
- **DOI**: 10.1007/s10827-006-7949-5
- **PMCID**: PMC2712447 (full-text saved)
- **Journal**: Journal of computational neuroscience  ·  **Year**: 2006
- **Authors**: M Migliore, C Cannia, W W Lytton, Henry Markram, M L Hines
- **MeSH**: Action Potentials, Algorithms, Animals, Cerebral Cortex, Humans, Nerve Net, Neural Networks, Computer, Neural Pathways, Neurons, Software
- **URL**: https://pubmed.ncbi.nlm.nih.gov/16732488/
- **Captured**: 2026-05-10T15:57:27

## Abstract

The NEURON simulation environment has been extended to support parallel network simulations. Each processor integrates the equations for its subnet over an interval equal to the minimum (interprocessor) presynaptic spike generation to postsynaptic spike delivery connection delay. The performance of three published network models with very different spike patterns exhibits superlinear speedup on Beowulf clusters and demonstrates that spike communication overhead is often less than the benefit of an increased fraction of the entire problem fitting into high speed cache. On the EPFL IBM Blue Gene, almost linear speedup was obtained up to 100 processors. Increasing one model from 500 to 40,000 realistic cells exhibited almost linear speedup on 2,000 processors, with an integration time of 9.8 seconds and communication time of 1.3 seconds. The potential for speed-ups of several orders of magnitude makes practical the running of large network simulations that could otherwise not be explored.
