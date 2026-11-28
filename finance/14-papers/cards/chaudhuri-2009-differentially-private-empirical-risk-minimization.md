# Differentially Private Empirical Risk Minimization <!-- voice-ignore-line -->

Topic: Machine Learning in Finance  
Also tagged: Machine Learning in Finance  
OpenAlex: https://openalex.org/W2119874464  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Kamalika Chaudhuri, Claire Monteleoni, Anand D. Sarwate | <!-- voice-ignore-line -->
| Year | 2009 |
| Venue | PubMed | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.48550/arxiv.0912.0071 |
| Cited by | 1333 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Machine learning model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> If the loss and regularizer satisfy certain convexity and differentiability criteria, we prove theoretical results showing that our algorithms preserve privacy, and provide generalization bounds for linear and nonlinear kernels.
<!-- voice-ignore-next 1 -->
> Our results show that both theoretically and empirically, objective perturbation is superior to the previous state-of-the-art, output perturbation, in managing the inherent tradeoff between privacy and learning performance.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Privacy-preserving machine learning algorithms are crucial for the increasingly common setting in which personal data, such as medical or financial records, are analyzed. We provide general techniques to produce privacy-preserving approximations of classifiers learned via (regularized) empirical risk minimization (ERM). These algorithms are private under the ε-differential privacy definition due to Dwork et al. (2006). First we apply the output perturbation ideas of Dwork et al. (2006), to ERM classification. Then we propose a new method, objective perturbation, for privacy-preserving machine learning algorithm design. This method entails perturbing the objective function before optimizing over classifiers. If the loss and regularizer satisfy certain convexity and differentiability criteria, we prove theoretical results showing that our algorithms preserve privacy, and provide generalization bounds for linear and nonlinear kernels. We further present a privacy-preserving technique for tuning the parameters in general machine learning algorithms, thereby providing end-to-end privacy guarantees for the training process. We apply these results to produce privacy-preserving analogues of regularized logistic regression and support vector machines. We obtain encouraging results from evaluating their performance on real demographic and benchmark data sets. Our results show that both theoretically and empirically, objective perturbation is superior to the previous state-of-the-art, output perturbation, in managing the inherent tradeoff between privacy and learning performance.
