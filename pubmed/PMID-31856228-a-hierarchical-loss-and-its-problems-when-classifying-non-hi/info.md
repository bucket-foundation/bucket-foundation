# A hierarchical loss and its problems when classifying non-hierarchically.

- **PMID**: 31856228
- **DOI**: 10.3233/SW-140134
- **PMCID**: PMC6922344 (full-text saved)
- **Journal**: PloS one  ·  **Year**: 2019
- **Authors**: Cinna Wu, Mark Tygert, Yann LeCun
- **MeSH**: Neural Networks, Computer
- **URL**: https://pubmed.ncbi.nlm.nih.gov/31856228/
- **Captured**: 2026-05-10T14:08:55

## Abstract

Failing to distinguish between a sheepdog and a skyscraper should be worse and penalized more than failing to distinguish between a sheepdog and a poodle; after all, sheepdogs and poodles are both breeds of dogs. However, existing metrics of failure (so-called "loss" or "win") used in textual or visual classification/recognition via neural networks seldom leverage a-priori information, such as a sheepdog being more similar to a poodle than to a skyscraper. We define a metric that, inter alia, can penalize failure to distinguish between a sheepdog and a skyscraper more than failure to distinguish between a sheepdog and a poodle. Unlike previously employed possibilities, this metric is based on an ultrametric tree associated with any given tree organization into a semantically meaningful hierarchy of a classifier's classes. An ultrametric tree is a tree with a so-called ultrametric distance metric such that all leaves are at the same distance from the root. Unfortunately, extensive numerical experiments indicate that the standard practice of training neural networks via stochastic gradient descent with random starting points often drives down the hierarchical loss nearly as much when minimizing the standard cross-entropy loss as when trying to minimize the hierarchical loss directly. Thus, this hierarchical loss is unreliable as an objective for plain, randomly started stochastic gradient descent to minimize; the main value of the hierarchical loss may be merely as a meaningful metric of success of a classifier.
