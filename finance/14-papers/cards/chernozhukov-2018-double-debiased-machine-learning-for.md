# Double/debiased machine learning for treatment and structural parameters <!-- voice-ignore-line -->

Topic: Machine Learning in Finance  
Also tagged: Machine Learning in Finance  
OpenAlex: https://openalex.org/W3123436326  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Victor Chernozhukov, Denis Chetverikov, Mert Demirer, Esther Duflo, Christian Hansen, Whitney K. Newey, James M. Robins | <!-- voice-ignore-line -->
| Year | 2018 |
| Venue | Econometrics Journal | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/ectj.12097 |
| Cited by | 5493 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Machine learning model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We show that the impact of regularization bias and overfitting on estimation of the parameter of interest θ0 can be removed by using two simple, yet critical, ingredients: (1) using Neyman‐orthogonal moments/scores that have reduced sensitivity with respect to nuisance parameters to estimate θ0; (2) making use of cross‐fitting, which provides an efficient form of data‐splitting.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We revisit the classic semi‐parametric problem of inference on a low‐dimensional parameter θ0 in the presence of high‐dimensional nuisance parameters η0. We depart from the classical setting by allowing for η0 to be so high‐dimensional that the traditional assumptions (e.g. Donsker properties) that limit complexity of the parameter space for this object break down. To estimate η0, we consider the use of statistical or machine learning (ML) methods, which are particularly well suited to estimation in modern, very high‐dimensional cases. ML methods perform well by employing regularization to reduce variance and trading off regularization bias with overfitting in practice. However, both regularization bias and overfitting in estimating η0 cause a heavy bias in estimators of θ0 that are obtained by naively plugging ML estimators of η0 into estimating equations for θ0. This bias results in the naive estimator failing to be N−1/2 consistent, where N is the sample size. We show that the impact of regularization bias and overfitting on estimation of the parameter of interest θ0 can be removed by using two simple, yet critical, ingredients: (1) using Neyman‐orthogonal moments/scores that have reduced sensitivity with respect to nuisance parameters to estimate θ0; (2) making use of cross‐fitting, which provides an efficient form of data‐splitting. We call the resulting set of methods double or debiased ML (DML). We verify that DML delivers point estimators that concentrate in an N−1/2‐neighbourhood of the true parameter values and are approximately unbiased and normally distributed, which allows construction of valid confidence statements. The generic statistical theory of DML is elementary and simultaneously relies on only weak theoretical requirements, which will admit the use of a broad array of modern ML methods for estimating the nuisance parameters, such as random forests, lasso, ridge, deep neural nets, boosted trees, and various hybrids and ensembles of these methods. We illustrate the general theory by applying it to provide theoretical properties of the following: DML applied to learn the main regression parameter in a partially linear regression model; DML applied to learn the coefficient on an endogenous variable in a partially linear instrumental variables model; DML applied to learn the average treatment effect and the average treatment effect on the treated under unconfoundedness; DML applied to learn the local average treatment effect in an instrumental variables setting. In addition to these theoretical applications, we also illustrate the use of DML in three empirical examples.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w23564/w23564.pdf

## Deep Read

Source: open-access NBER Working Paper 23564, June 2017, the version published in The Econometrics Journal 21(1), 2018. Read 2026-11-27.

### Research Question

How can one get valid confidence intervals for a low-dimensional causal parameter, such as a treatment effect, when high-dimensional nuisance functions are estimated with machine learning methods whose regularization and overfitting bias naive plug-in estimates?

### Data and Sample

Theory and simulations, plus three applications: the Pennsylvania Reemployment Bonus experiment (cash bonus and unemployment duration, Table 1); 401(k) eligibility and participation against net financial assets (Tables 2 and 3); and the Acemoglu, Johnson and Robinson settler mortality data on institutions and output (Table 4).

### Method

Double/debiased machine learning (DML) has two ingredients. Neyman-orthogonal moment conditions make the estimating equation insensitive to small errors in the nuisance functions; in the partially linear model this means residualizing both outcome and treatment on controls (a Robinson-style partialling out), and in the interactive model it means using the efficient score with propensity weights. Cross-fitting splits the sample into K folds, estimates nuisance functions on the other folds and evaluates the score on the held-out fold, then averages; DML2 solves the pooled moment. The median over repeated random splits removes split dependence. Theorems give root-N consistency and asymptotic normality under rate conditions on the nuisance estimators of order N to the minus one-quarter, which lasso, random forests, gradient-boosted trees, neural networks and ensembles can meet.

### Main Results

Simulations show the naive plug-in estimator with random forests is biased and its intervals undercover, while DML with cross-fitting is centered and its intervals have close to nominal coverage.

Table 1: the cash bonus lowers log unemployment duration by about 0.07 to 0.085 with standard errors near 0.036 across lasso, trees, forests, gradient-boosted trees, neural networks and ensembles, in both models and with 2 or 5 folds.

Table 2: 401(k) eligibility raises net financial assets by about $6,800 to $8,100 in the interactive model and $7,700 to $9,250 in the partially linear model, standard errors $1,150 to $1,750. Table 3 gives larger effects of participation using eligibility as an instrument.

Table 4: the effect of institutions on log output per capita ranges from 0.45 to 1.06 across learners, with standard errors of 0.46 to 1.35, so most estimates lose significance once split variation is counted.

### Robustness

Every application compares six learners, two and five folds, two model forms, and reports both median standard errors and standard errors adjusted for variation across splits.

### Stated Limits

Results are asymptotic and rely on nuisance estimators converging fast enough; deep learning was tried and dropped for stability and computing reasons. Identification still requires selection on observables or a valid instrument; DML addresses estimation and leaves confounding to the research design.

### Retail Systematic Trader

DML is a tool for asking whether a signal has an effect on returns after controlling for many correlated characteristics: residualize both the return and the signal on the controls with any learner, using cross-fitting, then regress residual on residual. This guards against the false discoveries that come from throwing a flexible model at many factors and reading coefficients off it. Implementations exist in DoubleML for Python and R.
