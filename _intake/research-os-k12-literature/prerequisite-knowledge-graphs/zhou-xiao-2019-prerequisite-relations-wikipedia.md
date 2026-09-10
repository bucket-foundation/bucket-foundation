---
title: "Extracting Prerequisite Relations Among Concepts in Wikipedia"
authors:
  - "Zhou, Yang"
  - "Xiao, Kui"
year: 2019
venue: "2019 International Joint Conference on Neural Networks (IJCNN)"
doi: "10.1109/ijcnn.2019.8852275"
url: "https://doi.org/10.1109/ijcnn.2019.8852275"
openalex_id: "https://openalex.org/W2979139649"
branch: "prerequisite-knowledge-graphs"
tier: "candidate"
why_it_matters: >
  An independent, contemporaneous method for extracting prerequisite relations from
  Wikipedia, corroborating `roy-et-al-2019-inferring-concept-prerequisite-relations.md`'s
  finding that citation and reference structure carries prerequisite signal, from a
  different research group using a different model architecture on the same
  underlying resource.
key_claims:
  - "Prerequisite relations between Wikipedia concepts were predicted using a neural model trained on link structure, article length, and category-membership features drawn from Wikipedia's own structure, without external domain-specific training data."
  - "The model outperformed a set of prior baseline methods on the paper's own held-out Wikipedia concept pairs, including methods relying on hand-engineered lexical features alone."
  - "Performance was reported separately by subject domain within Wikipedia, science, technology, mathematics, and the paper found accuracy varied by domain, evidence the method's own signal strength is not uniform across subject areas."
research_questions_it_leaves_open:
  - "Whether the domain-varying accuracy this paper reports would predict which of Research OS's own seven subject branches an `inferred` prerequisite proposal is more or less trustworthy in."
  - "Whether a neural model trained on Wikipedia's own structure generalizes to Research OS's smaller, non-Wikipedia multi-source corpus without retraining."
how_it_bears_on_research_os: >
  Extends overlap map question 7 alongside Roy and colleagues (2019): a second,
  independently developed method also finds Wikipedia's own structural features
  predictive of prerequisite order, strengthening the case that `graph.edge`'s `cites`
  kind could double as an input signal for candidate prerequisite detection. The
  domain-varying accuracy finding is a caution for `ROUTING.md`'s `inferred` tier:
  confidence should perhaps vary by subject branch rather than use one fixed
  Jaccard-overlap threshold across all branches.
---

# Extracting Prerequisite Relations Among Concepts in Wikipedia

An independent neural method for extracting prerequisite relations between Wikipedia
concepts from link structure, article length, and category features, with accuracy
that varies by subject domain.

## Key Claims

- Prerequisite relations were predicted from a neural model trained on Wikipedia's
  own link, length, and category features.
- The model outperformed prior baseline methods, including hand-engineered lexical
  feature methods, on held-out concept pairs.
- Accuracy varied by subject domain within Wikipedia.

## Research Questions It Leaves Open

- Whether domain-varying accuracy predicts which of Research OS's own subject
  branches an `inferred` proposal is more trustworthy in.
- Whether a Wikipedia-trained model generalizes to a smaller, non-Wikipedia corpus.

## How It Bears on Research OS

Extends overlap map question 7 alongside Roy and colleagues (2019): a second,
independent method also finds Wikipedia structure predictive of prerequisite order.
The domain-varying accuracy finding is a caution for `ROUTING.md`'s `inferred` tier
using one fixed threshold across all branches.
