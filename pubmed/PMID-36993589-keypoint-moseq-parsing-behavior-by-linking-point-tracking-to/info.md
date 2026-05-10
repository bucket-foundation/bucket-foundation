# Keypoint-MoSeq: parsing behavior by linking point tracking to pose dynamics.

- **PMID**: 36993589
- **DOI**: 10.1371/journal.pcbi.1009439
- **PMCID**: PMC8489729 (full-text saved)
- **Journal**: bioRxiv : the preprint server for biology  ·  **Year**: 2023
- **Authors**: Caleb Weinreb, Jonah Pearl, Sherry Lin, Mohammed Abdal Monium Osman, Libby Zhang, Sidharth Annapragada, Eli Conlin, Red Hoffman, Sofia Makowska, Winthrop F Gillis, Maya Jay, Shaokai Ye, Alexander Mathis, Mackenzie Weygandt Mathis, Talmo Pereira, Scott W Linderman, Sandeep Robert Datta
- **MeSH**: 
- **URL**: https://pubmed.ncbi.nlm.nih.gov/36993589/
- **Captured**: 2026-05-10T16:52:04

## Abstract

Keypoint tracking algorithms have revolutionized the analysis of animal behavior, enabling investigators to flexibly quantify behavioral dynamics from conventional video recordings obtained in a wide variety of settings. However, it remains unclear how to parse continuous keypoint data into the modules out of which behavior is organized. This challenge is particularly acute because keypoint data is susceptible to high frequency jitter that clustering algorithms can mistake for transitions between behavioral modules. Here we present keypoint-MoSeq, a machine learning-based platform for identifying behavioral modules ("syllables") from keypoint data without human supervision. Keypoint-MoSeq uses a generative model to distinguish keypoint noise from behavior, enabling it to effectively identify syllables whose boundaries correspond to natural sub-second discontinuities inherent to mouse behavior. Keypoint-MoSeq outperforms commonly used alternative clustering methods at identifying these transitions, at capturing correlations between neural activity and behavior, and at classifying either solitary or social behaviors in accordance with human annotations. Keypoint-MoSeq therefore renders behavioral syllables and grammar accessible to the many researchers who use standard video to capture animal behavior.
