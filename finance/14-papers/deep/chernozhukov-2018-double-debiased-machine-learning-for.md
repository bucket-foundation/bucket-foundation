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
