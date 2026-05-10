# Joint emulation of Earth System Model temperature-precipitation realizations with internal variability and space-time and cross-variable correlation: fldgen v2.0 software description.

- **PMID**: 31584973
- **DOI**: 10.1175/BAMS-D-11-00094.1
- **PMCID**: PMC5224358 (full-text saved)
- **Journal**: PloS one  ·  **Year**: 2019
- **Authors**: Abigail Snyder, Robert Link, Kalyn Dorheim, Ben Kravitz, Ben Bond-Lamberty, Corinne Hartin
- **MeSH**: Algorithms, Earth, Planet, Humans, Models, Theoretical, Rain, Software, Temperature
- **URL**: https://pubmed.ncbi.nlm.nih.gov/31584973/
- **Captured**: 2026-05-10T11:32:26

## Abstract

Earth System Models (ESMs) are excellent tools for quantifying many aspects of future climate dynamics but are too computationally expensive to produce large collections of scenarios for downstream users of ESM data. In particular, many researchers focused on the impacts of climate change require large collections of ESM runs to rigorously study the impacts to both human and natural systems of low-frequency high-importance events, such as multi-year droughts. Climate model emulators provide an effective mechanism for filling this gap, reproducing many aspects of ESMs rapidly but with lower precision. The fldgen v1.0 R package quickly generates thousands of realizations of gridded temperature fields by randomizing the residuals of pattern scaling temperature output from any single ESM, retaining the spatial and temporal variance and covariance structures of the input data at a low computational cost. The fldgen v2.0 R package described here extends this capability to produce joint realizations of multiple variables, with a focus on temperature and precipitation in an open source software package available for community use (https://github.com/jgcri/fldgen). This substantially improves the fldgen package by removing the requirement that the ESM variables be normally distributed, and will enable researchers to quickly generate covarying temperature and precipitation data that are synthetic but faithful to the characteristics of the original ESM.
