# FinBERT: A Large Language Model for Extracting Information from Financial Text <!-- voice-ignore-line -->

Topic: Machine Learning in Finance  
Also tagged: Machine Learning in Finance  
OpenAlex: https://openalex.org/W4298110867  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Allen Huang, Hui Wang, Yi Yang | <!-- voice-ignore-line -->
| Year | 2020 |
| Venue | Contemporary Accounting Research | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/1911-3846.12832 |
| Cited by | 1273 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Neural network model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We show that FinBERT incorporates finance knowledge and can better summarize contextual information in financial texts.
<!-- voice-ignore-next 1 -->
> Using a sample of researcher‐labeled sentences from analyst reports, we document that FinBERT substantially outperforms the Loughran and McDonald dictionary and other machine learning algorithms, including naïve Bayes, support vector machine, random forest, convolutional neural network, and long short‐term memory, in sentiment classification.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We develop FinBERT, a state‐of‐the‐art large language model that adapts to the finance domain. We show that FinBERT incorporates finance knowledge and can better summarize contextual information in financial texts. Using a sample of researcher‐labeled sentences from analyst reports, we document that FinBERT substantially outperforms the Loughran and McDonald dictionary and other machine learning algorithms, including naïve Bayes, support vector machine, random forest, convolutional neural network, and long short‐term memory, in sentiment classification. Our results show that FinBERT excels in identifying the positive or negative sentiment of sentences that other algorithms mislabel as neutral, likely because it uses contextual information in financial text. We find that FinBERT's advantage over other algorithms, and Google's original bidirectional encoder representations from transformers model, is especially salient when the training sample size is small and in texts containing financial words not frequently used in general texts. FinBERT also outperforms other models in identifying discussions related to environment, social, and governance issues. Last, we show that other approaches underestimate the textual informativeness of earnings conference calls by at least 18% compared to FinBERT. Our results have implications for academic researchers, investment professionals, and financial market regulators.
