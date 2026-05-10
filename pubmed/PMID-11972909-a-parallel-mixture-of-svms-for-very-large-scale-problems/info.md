# A parallel mixture of SVMs for very large scale problems.

- **PMID**: 11972909
- **DOI**: 10.1162/089976602753633402
- **PMCID**:  
- **Journal**: Neural computation  ·  **Year**: 2002
- **Authors**: Ronan Collobert, Samy Bengio, Yoshua Bengio
- **MeSH**: Algorithms, Artificial Intelligence, Software
- **URL**: https://pubmed.ncbi.nlm.nih.gov/11972909/
- **Captured**: 2026-05-10T13:58:14

## Abstract

Support vector machines (SVMs) are the state-of-the-art models for many classification problems, but they suffer from the complexity of their training algorithm, which is at least quadratic with respect to the number of examples. Hence, it is hopeless to try to solve real-life problems having more than a few hundred thousand examples with SVMs. This article proposes a new mixture of SVMs that can be easily implemented in parallel and where each SVM is trained on a small subset of the whole data set. Experiments on a large benchmark data set (Forest) yielded significant time improvement (time complexity appears empirically to locally grow linearly with the number of examples). In addition, and surprisingly, a significant improvement in generalization was observed.
