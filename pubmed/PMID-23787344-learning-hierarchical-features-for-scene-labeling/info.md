# Learning hierarchical features for scene labeling.

- **PMID**: 23787344
- **DOI**: 10.1109/TPAMI.2012.231
- **PMCID**:  
- **Journal**: IEEE transactions on pattern analysis and machine intelligence  ·  **Year**: 2013
- **Authors**: Clément Farabet, Camille Couprie, Laurent Najman, Yann Lecun
- **MeSH**: 
- **URL**: https://pubmed.ncbi.nlm.nih.gov/23787344/
- **Captured**: 2026-05-10T14:05:52

## Abstract

Scene labeling consists of labeling each pixel in an image with the category of the object it belongs to. We propose a method that uses a multiscale convolutional network trained from raw pixels to extract dense feature vectors that encode regions of multiple sizes centered on each pixel. The method alleviates the need for engineered features, and produces a powerful representation that captures texture, shape, and contextual information. We report results using multiple postprocessing methods to produce the final labeling. Among those, we propose a technique to automatically retrieve, from a pool of segmentation components, an optimal set of components that best explain the scene; these components are arbitrary, for example, they can be taken from a segmentation tree or from any family of oversegmentations. The system yields record accuracies on the SIFT Flow dataset (33 classes) and the Barcelona dataset (170 classes) and near-record accuracy on Stanford background dataset (eight classes), while being an order of magnitude faster than competing approaches, producing a $(320\times 240)$ image labeling in less than a second, including feature extraction.
