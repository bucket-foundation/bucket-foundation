# The Cross‐Section of Volatility and Expected Returns <!-- voice-ignore-line -->

Topic: Asset Pricing  
Also tagged: Asset Pricing  
OpenAlex: https://openalex.org/W2113208252  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Andrew Ang, Robert J. Hodrick, Yuhang Xing, Xiaoyan Zhang | <!-- voice-ignore-line -->
| Year | 2006 |
| Venue | The Journal of Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/j.1540-6261.2006.00836.x |
| Cited by | 5096 as of 2026-11-27 |
| Cited by inside this set | 7 |

## Method

Theoretical model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Consistent with theory, we find that stocks with high sensitivities to innovations in aggregate volatility have low average returns.

## Replication

Cited as a source by strategy cards: [eq-cz-betavix](../../09-strategies/cards/eq-cz-betavix.md), [eq-cz-realizedvol](../../09-strategies/cards/eq-cz-realizedvol.md), [eq-low-idio-vol](../../09-strategies/cards/eq-low-idio-vol.md). Each card grades decay after publication and retail feasibility.

## Abstract

<!-- voice-ignore-next 1 -->
> We examine the pricing of aggregate volatility risk in the cross‐section of stock returns. Consistent with theory, we find that stocks with high sensitivities to innovations in aggregate volatility have low average returns. Stocks with high idiosyncratic volatility relative to the Fama and French (1993, Journal of Financial Economics 25, 2349) model have abysmally low average returns. This phenomenon cannot be explained by exposure to aggregate volatility risk. Size, book‐to‐market, momentum, and liquidity effects cannot account for either the low average returns earned by stocks with high exposure to systematic volatility risk or for the low average returns of stocks with high idiosyncratic volatility.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w10852/w10852.pdf

## Deep Read

Source: open-access NBER Working Paper 10852, October 2004, the version published in the Journal of Finance 61(1), 2006. Read 2026-11-27.

### Research Question

Is aggregate market volatility a priced risk factor in the cross-section of stocks, and how do stocks with high idiosyncratic volatility perform?

### Data and Sample

Daily and monthly CRSP returns for NYSE, AMEX and NASDAQ stocks. Aggregate volatility tests run January 1986 to December 2000 using daily changes in the CBOE VXO (then called VIX), mean level 20.5 percent. Idiosyncratic volatility tests run July 1963 to December 2000.

### Method

Each month, regress each stock's daily returns over the prior month on the market return and the daily change in VIX; sort stocks into value-weighted quintiles on the VIX beta. Build FVIX, a mimicking portfolio of those quintiles that tracks VIX innovations, and estimate its price of risk with Fama-MacBeth regressions (Table V). Separately, sort stocks each month into quintiles on idiosyncratic volatility, the standard deviation of residuals from a Fama-French three-factor regression on the past month's daily returns, and hold for one month. Double sorts control for size, book to market, leverage, liquidity, volume, turnover, bid-ask spread, coskewness, analyst dispersion and momentum (Tables VII and VIII).

### Main Results

Table I: the quintile with the most negative VIX beta earns 1.64 percent a month and the most positive 0.60 percent; the 5-1 spread is minus 1.04 percent a month (t = minus 3.90) and the Fama-French alpha spread minus 0.83 (t = minus 2.93).

Table V: the price of aggregate volatility risk is about minus 0.08 percent a month, roughly minus 1 percent a year, robust to size, value, momentum and liquidity controls.

Table VI, Panel B: value-weighted quintiles on idiosyncratic volatility earn 1.04, 1.16, 1.20, 0.87 and minus 0.02 percent a month. The 5-1 three-factor alpha is minus 1.31 percent a month (t = minus 7.00). The highest quintile holds 1.9 percent of market value.

Table VII: the 5-1 alpha is minus 0.66 percent among NYSE stocks only, minus 1.04 controlling for size, and minus 0.26 (t = minus 1.74) in the largest size quintile. Controls for leverage, liquidity, volume, spreads and analyst dispersion leave alphas between minus 0.8 and minus 1.2 percent a month.

Table IX: exposure to FVIX explains little of the idiosyncratic volatility effect.

### Robustness

Table VIII controls for past returns. Table X varies formation and holding periods up to 12 months. Table XI shows the effect in bull and bear markets, recessions and expansions, and volatile and calm periods.

### Stated Limits

The volatility risk premium is small and the sample short, so a peso problem cannot be ruled out: adding one more volatility spike like October 1987 or August 1998 could flip its sign. The authors offer no explanation for the idiosyncratic volatility puzzle.

### Retail Systematic Trader

Avoiding the top idiosyncratic volatility quintile is a cheap, long-only use of the finding: those stocks earned about nothing over 1963 to 2000 while carrying the highest risk. Shorting them is harder, since they are small, costly to borrow and the effect weakens among the largest stocks. A low-volatility or low-idiosyncratic-volatility screen on a liquid universe keeps most of the benefit. Later replications report the effect has shrunk since publication.
