# Discovering binary codes for documents by learning deep generative models.

- **PMID**: 25164175
- **DOI**: 10.1111/j.1756-8765.2010.01109.x
- **PMCID**:  
- **Journal**: Topics in cognitive science  ·  **Year**: 2011
- **Authors**: Geoffrey Hinton, Ruslan Salakhutdinov
- **MeSH**: Artificial Intelligence, Documentation, Information Storage and Retrieval, Models, Theoretical, Semantics
- **URL**: https://pubmed.ncbi.nlm.nih.gov/25164175/
- **Captured**: 2026-05-10T14:06:22

## Abstract

We describe a deep generative model in which the lowest layer represents the word-count vector of a document and the top layer represents a learned binary code for that document. The top two layers of the generative model form an undirected associative memory and the remaining layers form a belief net with directed, top-down connections. We present efficient learning and inference procedures for this type of generative model and show that it allows more accurate and much faster retrieval than latent semantic analysis. By using our method as a filter for a much slower method called TF-IDF we achieve higher accuracy than TF-IDF alone and save several orders of magnitude in retrieval time. By using short binary codes as addresses, we can perform retrieval on very large document sets in a time that is independent of the size of the document set using only one word of memory to describe each document.
