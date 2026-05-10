# A guide to group effective connectivity analysis, part 2: Second level analysis with PEB.

- **PMID**: 31226492
- **DOI**: 10.1016/j.neuroimage.2019.06.032
- **PMCID**: PMC5726753 (full-text saved)
- **Journal**: NeuroImage  ·  **Year**: 2019
- **Authors**: Peter Zeidman, Amirhossein Jafarian, Mohamed L Seghier, Vladimir Litvak, Hayriye Cagnan, Cathy J Price, Karl J Friston
- **MeSH**: Adult, Connectome, Guidelines as Topic, Humans, Magnetic Resonance Imaging, Models, Theoretical, Nerve Net, Prefrontal Cortex
- **URL**: https://pubmed.ncbi.nlm.nih.gov/31226492/
- **Captured**: 2026-05-10T11:32:19

## Abstract

This paper provides a worked example of using Dynamic Causal Modelling (DCM) and Parametric Empirical Bayes (PEB) to characterise inter-subject variability in neural circuitry (effective connectivity). It steps through an analysis in detail and provides a tutorial style explanation of the underlying theory and assumptions (i.e, priors). The analysis procedure involves specifying a hierarchical model with two or more levels. At the first level, state space models (DCMs) are used to infer the effective connectivity that best explains a subject's neuroimaging timeseries (e.g. fMRI, MEG, EEG). Subject-specific connectivity parameters are then taken to the group level, where they are modelled using a General Linear Model (GLM) that partitions between-subject variability into designed effects and additive random effects. The ensuing (Bayesian) hierarchical model conveys both the estimated connection strengths and their uncertainty (i.e., posterior covariance) from the subject to the group level; enabling hypotheses to be tested about the commonalities and differences across subjects. This approach can also finesse parameter estimation at the subject level, by using the group-level parameters as empirical priors. The preliminary first level (subject specific) DCM for fMRI analysis is covered in a companion paper. Here, we detail group-level analysis procedures that are suitable for use with data from any neuroimaging modality. This paper is accompanied by an example dataset, together with step-by-step instructions demonstrating how to reproduce the analyses.
