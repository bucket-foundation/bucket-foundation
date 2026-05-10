# RetroGNN: Fast Estimation of Synthesizability for Virtual Screening and De Novo Design by Learning from Slow Retrosynthesis Software.

- **PMID**: 35452226
- **DOI**: 10.1021/acs.jcim.1c01476
- **PMCID**:  
- **Journal**: Journal of chemical information and modeling  ·  **Year**: 2022
- **Authors**: Cheng-Hao Liu, Maksym Korablyov, Stanisław Jastrzębski, Paweł Włodarczyk-Pruszyński, Yoshua Bengio, Marwin Segler
- **MeSH**: Algorithms, Drug Design, Neural Networks, Computer, Software
- **URL**: https://pubmed.ncbi.nlm.nih.gov/35452226/
- **Captured**: 2026-05-10T16:34:18

## Abstract

De novo molecule design algorithms often result in chemically unfeasible or synthetically inaccessible molecules. A natural idea to mitigate this problem is to bias these algorithms toward more easily synthesizable molecules using a proxy score for synthetic accessibility. However, using currently available proxies can still result in highly unrealistic compounds. Here, we propose a novel approach, RetroGNN, to estimate synthesizability. First, we search for routes using synthesis planning software for a large number of random molecules. This information is then used to train a graph neural network to predict the outcome of the synthesis planner given the target molecule, in which the regression task can be used as a synthesizability scorer. We highlight how RetroGNN can be used in generative molecule-discovery pipelines together with other scoring functions. We evaluate our approach on several QSAR-based molecule design benchmarks, for which we find synthesizable molecules with state-of-the-art scores. Compared to the virtual screening of 5 million existing molecules from the ZINC database, using RetroGNNScore with a simple fragment-based de novo design algorithm finds molecules predicted to be more likely to possess the desired activity exponentially faster, while maintaining good druglike properties and being easier to synthesize. Importantly, our deep neural network can successfully filter out hard to synthesize molecules while achieving a 10
