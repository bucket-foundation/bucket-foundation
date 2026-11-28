# Myopic Loss Aversion and the Equity Premium Puzzle <!-- voice-ignore-line -->

Topic: Behavioral Finance  
Also tagged: Asset Pricing, Behavioral Finance  
OpenAlex: https://openalex.org/W1977145788  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Shlomo Benartzi, Richard H. Thaler | <!-- voice-ignore-line -->
| Year | 1995 |
| Venue | The Quarterly Journal of Economics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.2307/2118511 |
| Cited by | 3327 as of 2026-11-27 |
| Cited by inside this set | 11 |

## Method

Simulation. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The equity premium puzzle refers to the empirical fact that stocks have outperformed bonds over the last century by a surprisingly large margin.
<!-- voice-ignore-next 1 -->
> We dub this combination “myopic loss aversion.” Using simulations, we find that the size of the equity premium is consistent with the previously estimated parameters of prospect theory if investors evaluate their portfolios annually.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> The equity premium puzzle refers to the empirical fact that stocks have outperformed bonds over the last century by a surprisingly large margin. We offer a new explanation based on two behavioral concepts. First, investors are assumed to be “loss averse,” meaning that they are distinctly more sensitive to losses than to gains. Second, even long-term investors are assumed to evaluate their portfolios frequently. We dub this combination “myopic loss aversion.” Using simulations, we find that the size of the equity premium is consistent with the previously estimated parameters of prospect theory if investors evaluate their portfolios annually.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w4369/w4369.pdf

## Deep Read

Source: open-access NBER Working Paper 4369, May 1993, the version published in the Quarterly Journal of Economics 110(1), 1995. Read 2026-11-27.

### Research Question

Can loss aversion combined with frequent portfolio evaluation, "myopic loss aversion," explain the equity premium that Mehra and Prescott (1985) found too large for standard risk aversion?

### Data and Sample

CRSP monthly returns, 1926 to 1990, on the value-weighted stock index, 5-year Treasury bonds and Treasury bills, in nominal and real terms. Over this period real stock returns averaged about 7 percent a year and real bill returns under 1 percent.

### Method

Investors maximize prospective utility from Tversky and Kahneman's cumulative prospect theory: value v(x) = x^0.88 for gains and minus 2.25(minus x)^0.88 for losses, with their probability weighting function. Returns are evaluated over an evaluation period of n months, which can differ from the planning horizon. For each n from 1 to 18 months the authors bootstrap 10,000 n-month returns with replacement, rank them, and compute the prospective value of stocks against bills or bonds. The equilibrium evaluation period is where the investor is indifferent. They also find the best stock-bond mix for a one-year evaluator, and the equity premium implied by longer evaluation periods.

### Main Results

Figure 1: across four comparisons (stocks against bills and against bonds, real and nominal), indifference occurs at evaluation periods of 9 to 12 months, about one year.

With a simpler bilinear value function and loss aversion of 2.25, the equilibrium evaluation period is 8 months; a 12-month period fits loss aversion of 2.77.

Figure 2: a one-year evaluator's best portfolio is about 50 percent stocks, in line with the typical 50-50 TIAA-CREF allocation.

Figure 3: the 6.5 percent real equity premium over 5-year bonds fits a one-year evaluation period. With a 2-year period the premium falls to 4.65 percent; with 5, 10 and 20 years it falls to 3.0, 2.0 and 1.4 percent.

Section 7 gives preliminary evidence that the same mechanism could explain part of the small-firm premium.

### Robustness

Four return comparisons, real and nominal; two value function forms; and the observed asset allocation of pension plans as an outside check.

### Stated Limits

The model is partial equilibrium: it explains indifference at observed returns without deriving prices. The size effect results are preliminary. Bootstrap draws assume independent monthly returns; mean reversion would change the horizon result.

### Retail Systematic Trader

The equity premium in this model is a payment for watching losses at short intervals. A retail trader who can hold a rules-based equity allocation through annual drawdowns without checking or reacting collects a premium priced for investors who cannot. The practical moves are fewer portfolio reviews, pre-set rebalancing rules, and judging performance over multi-year windows, since a strategy judged every month will look worse than its long-run return justifies.
