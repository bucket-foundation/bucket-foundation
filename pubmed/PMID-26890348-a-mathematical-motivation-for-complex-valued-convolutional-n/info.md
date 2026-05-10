# A Mathematical Motivation for Complex-Valued Convolutional Networks.

- **PMID**: 26890348
- **DOI**: 10.1162/NECO_a_00824
- **PMCID**:  
- **Journal**: Neural computation  ·  **Year**: 2016
- **Authors**: Mark Tygert, Joan Bruna, Soumith Chintala, Yann LeCun, Serkan Piantino, Arthur Szlam
- **MeSH**: 
- **URL**: https://pubmed.ncbi.nlm.nih.gov/26890348/
- **Captured**: 2026-05-10T14:06:54

## Abstract

A complex-valued convolutional network (convnet) implements the repeated application of the following composition of three operations, recursively applying the composition to an input vector of nonnegative real numbers: (1) convolution with complex-valued vectors, followed by (2) taking the absolute value of every entry of the resulting vectors, followed by (3) local averaging. For processing real-valued random vectors, complex-valued convnets can be viewed as data-driven multiscale windowed power spectra, data-driven multiscale windowed absolute spectra, data-driven multiwavelet absolute values, or (in their most general configuration) data-driven nonlinear multiwavelet packets. Indeed, complex-valued convnets can calculate multiscale windowed spectra when the convnet filters are windowed complex-valued exponentials. Standard real-valued convnets, using rectified linear units (ReLUs), sigmoidal (e.g., logistic or tanh) nonlinearities, or max pooling, for example, do not obviously exhibit the same exact correspondence with data-driven wavelets (whereas for complex-valued convnets, the correspondence is much more than just a vague analogy). Courtesy of the exact correspondence, the remarkably rich and rigorous body of mathematical analysis for wavelets applies directly to (complex-valued) convnets.
