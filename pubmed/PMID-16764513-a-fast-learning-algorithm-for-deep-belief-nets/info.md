# A fast learning algorithm for deep belief nets.

- **PMID**: 16764513
- **DOI**: 10.1162/neco.2006.18.7.1527
- **PMCID**:  
- **Journal**: Neural computation  ·  **Year**: 2006
- **Authors**: Geoffrey E Hinton, Simon Osindero, Yee-Whye Teh
- **MeSH**: Algorithms, Animals, Humans, Learning, Neural Networks, Computer, Neurons
- **URL**: https://pubmed.ncbi.nlm.nih.gov/16764513/
- **Captured**: 2026-05-10T13:59:41

## Abstract

We show how to use "complementary priors" to eliminate the explaining-away effects that make inference difficult in densely connected belief nets that have many hidden layers. Using complementary priors, we derive a fast, greedy algorithm that can learn deep, directed belief networks one layer at a time, provided the top two layers form an undirected associative memory. The fast, greedy algorithm is used to initialize a slower learning procedure that fine-tunes the weights using a contrastive version of the wake-sleep algorithm. After fine-tuning, a network with three hidden layers forms a very good generative model of the joint distribution of handwritten digit images and their labels. This generative model gives better digit classification than the best discriminative learning algorithms. The low-dimensional manifolds on which the digits lie are modeled by long ravines in the free-energy landscape of the top-level associative memory, and it is easy to explore these ravines by using the directed connections to display what the associative memory has in mind.
