# Fine-Grained Classification via Categorical Memory Networks.

- **PMID**: 35700253
- **DOI**: 10.1109/TIP.2022.3181492
- **PMCID**:  
- **Journal**: IEEE transactions on image processing : a publication of the IEEE Signal Processing Society  ·  **Year**: 2022
- **Authors**: Weijian Deng, Joshua Marsh, Stephen Gould, Liang Zheng
- **MeSH**: 
- **URL**: https://pubmed.ncbi.nlm.nih.gov/35700253/
- **Captured**: 2026-05-10T11:34:12

## Abstract

Motivated by the desire to exploit patterns shared across classes, we present a simple yet effective class-specific memory module for fine-grained feature learning. The memory module stores the prototypical feature representation for each category as a moving average. We hypothesize that the combination of similarities with respect to each category is itself a useful discriminative cue. To detect these similarities, we use attention as a querying mechanism. The attention scores with respect to each class prototype are used as weights to combine prototypes via weighted sum, producing a uniquely tailored response feature representation for a given input. The original and response features are combined to produce an augmented feature for classification. We integrate our class-specific memory module into a standard convolutional neural network, yielding a Categorical Memory Network. Our memory module significantly improves accuracy over baseline CNNs, achieving competitive accuracy with state-of-the-art methods on four benchmarks, including CUB-200-2011, Stanford Cars, FGVC Aircraft, and NABirds.
