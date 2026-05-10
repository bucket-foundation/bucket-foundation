# Robust and data-efficient generalization of self-supervised machine learning for diagnostic imaging.

- **PMID**: 37291435
- **DOI**: 10.1109/TMI.2020.2995518
- **PMCID**: 8767307 (full-text saved)
- **Journal**: Nature biomedical engineering  ·  **Year**: 2023
- **Authors**: Shekoofeh Azizi, Laura Culp, Jan Freyberg, Basil Mustafa, Sebastien Baur, Simon Kornblith, Ting Chen, Nenad Tomasev, Jovana Mitrović, Patricia Strachan, S Sara Mahdavi, Ellery Wulczyn, Boris Babenko, Megan Walker, Aaron Loh, Po-Hsuan Cameron Chen, Yuan Liu, Pinal Bavishi, Scott Mayer McKinney, Jim Winkens, Abhijit Guha Roy, Zach Beaver, Fiona Ryan, Justin Krogue, Mozziyar Etemadi, Umesh Telang, Yun Liu, Lily Peng, Greg S Corrado, Dale R Webster, David Fleet, Geoffrey Hinton, Neil Houlsby, Alan Karthikesalingam, Mohammad Norouzi, Vivek Natarajan
- **MeSH**: Supervised Machine Learning, Machine Learning, Diagnostic Imaging
- **URL**: https://pubmed.ncbi.nlm.nih.gov/37291435/
- **Captured**: 2026-05-10T16:52:24

## Abstract

Machine-learning models for medical tasks can match or surpass the performance of clinical experts. However, in settings differing from those of the training dataset, the performance of a model can deteriorate substantially. Here we report a representation-learning strategy for machine-learning models applied to medical-imaging tasks that mitigates such 'out of distribution' performance problem and that improves model robustness and training efficiency. The strategy, which we named REMEDIS (for 'Robust and Efficient Medical Imaging with Self-supervision'), combines large-scale supervised transfer learning on natural images and intermediate contrastive self-supervised learning on medical images and requires minimal task-specific customization. We show the utility of REMEDIS in a range of diagnostic-imaging tasks covering six imaging domains and 15 test datasets, and by simulating three realistic out-of-distribution scenarios. REMEDIS improved in-distribution diagnostic accuracies up to 11.5% with respect to strong supervised baseline models, and in out-of-distribution settings required only 1-33% of the data for retraining to match the performance of supervised models retrained using all available data. REMEDIS may accelerate the development lifecycle of machine-learning models for medical imaging.
