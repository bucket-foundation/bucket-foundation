# Backtesting and Overfitting

ID: `Q-backtest`
As of: 2026-11-27
Bead: `bkt-q5moa.1`

## What It Is

Testing many strategies on one history guarantees some look good by chance. The deflated Sharpe ratio adjusts a Sharpe for the number of trials, skew, kurtosis and sample length. Harvey, Liu and Zhu argue new factors need t-statistics above 3.

## Key Numbers and Dates

- Bailey and Lopez de Prado, The Deflated Sharpe Ratio, Journal of Portfolio Management 40(5):94-107, 2014. **A**
- Harvey, Liu and Zhu, ...and the Cross-Section of Expected Returns, RFS 29(1):5-68, 2016 (online 2015-10-09). **A**
- t > 3.0 hurdle from Harvey-Liu-Zhu abstract; read from memory; the fetched metadata lacks the abstract. **C**

## Sources

1. Crossref record, Bailey and Lopez de Prado 2014. https://api.crossref.org/works/10.3905/jpm.2014.40.5.094 (fetched 2026-11-27)
2. Crossref record, Harvey, Liu and Zhu 2016. https://api.crossref.org/works/10.1093/rfs/hhv059 (fetched 2026-11-27)

Grades: A primary data or statute, B reputable secondary, C single source or memory pending check.

## Derivation

### Deflated Sharpe Ratio

Assumptions: returns are i.i.d. with skewness \(\gamma_3\) and kurtosis \(\gamma_4\); \(T\) observations; \(N\) independent trials whose Sharpe estimates have variance \(V\) across trials; under the null every trial has true Sharpe zero.

1. Sharpe estimator distribution (Mertens, used by the paper): \(\hat{SR} \to N\big(SR, \sigma^2_{SR}\big)\) with
\[ \sigma^2_{SR} = \frac{1 - \gamma_3\,SR + \frac{\gamma_4 - 1}{4}SR^2}{T - 1} \]
Fat tails (\(\gamma_4 > 3\)) and negative skew widen it.
2. Probabilistic Sharpe ratio against a benchmark \(SR^*\):
\[ PSR(SR^*) = \Phi\left(\frac{(\hat{SR} - SR^*)\sqrt{T-1}}{\sqrt{1 - \gamma_3\hat{SR} + \frac{\gamma_4 - 1}{4}\hat{SR}^2}}\right) \]
3. Selection bias. The best of \(N\) standard normals has expectation, by extreme value theory with the Euler-Mascheroni constant \(\gamma_e\),
\[ E[\max_N Z] \approx (1-\gamma_e)\,\Phi^{-1}\Big(1 - \frac1N\Big) + \gamma_e\,\Phi^{-1}\Big(1 - \frac1{Ne}\Big) \]
Scale by the cross-trial standard deviation to get the expected maximum Sharpe under the null:
\[ SR_0 = \sqrt V\,E[\max_N Z] \]
4. Set the benchmark to that inflated maximum:
\[ \boxed{\,DSR = PSR(SR_0) = \Phi\left(\frac{(\hat{SR} - SR_0)\sqrt{T-1}}{\sqrt{1 - \gamma_3\hat{SR} + \frac{\gamma_4-1}{4}\hat{SR}^2}}\right)\,} \]
A DSR above 0.95 rejects the null of zero skill at the 5% level after accounting for \(N\) trials.

In the lab replication, crypto trend was the one family with `DSR lab` above 0.95, at 0.99 [empirical: lab/data/results/results.json, 2026-11-27, python run.py].

Source: Bailey and Lopez de Prado 2014, doi:10.3905/jpm.2014.40.5.094, Crossref record fetched 2026-11-27.
