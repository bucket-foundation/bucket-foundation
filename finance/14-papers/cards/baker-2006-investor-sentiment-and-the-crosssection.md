# Investor Sentiment and the Cross‐Section of Stock Returns <!-- voice-ignore-line -->

Topic: Behavioral Finance  
Also tagged: Behavioral Finance  
OpenAlex: https://openalex.org/W3121467893  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Malcolm P. Baker, Jeffrey A. Wurgler | <!-- voice-ignore-line -->
| Year | 2006 |
| Venue | The Journal of Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/j.1540-6261.2006.00885.x |
| Cited by | 7336 as of 2026-11-27 |
| Cited by inside this set | 7 |

## Method

Empirical analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Consistent with this prediction, we find that when beginning‐of‐period proxies for sentiment are low, subsequent returns are relatively high for small stocks, young stocks, high volatility stocks, unprofitable stocks, non‐dividend‐paying stocks, extreme growth stocks, and distressed stocks.

## Replication

Cited as a source by strategy cards: [eq-sentiment-timing](../../09-strategies/cards/eq-sentiment-timing.md). Each card grades decay after publication and retail feasibility.

## Abstract

<!-- voice-ignore-next 1 -->
> We study how investor sentiment affects the cross‐section of stock returns. We predict that a wave of investor sentiment has larger effects on securities whose valuations are highly subjective and difficult to arbitrage. Consistent with this prediction, we find that when beginning‐of‐period proxies for sentiment are low, subsequent returns are relatively high for small stocks, young stocks, high volatility stocks, unprofitable stocks, non‐dividend‐paying stocks, extreme growth stocks, and distressed stocks. When sentiment is high, on the other hand, these categories of stock earn relatively low subsequent returns.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w10449/w10449.pdf

## Deep Read

Source: open-access NBER Working Paper 10449, April 2004, the version published in the Journal of Finance 2006. Read 2026-11-27.

### Research Question

Does a broad wave of investor sentiment move the cross-section of stock returns, and does it hit hardest the stocks that are hard to value and hard to arbitrage?

### Data and Sample

CRSP and Compustat US common stocks, monthly returns from 1963 to 2001 (Table 1). Six annual sentiment proxies: the closed-end fund discount (CEFD), NYSE share turnover, the number of IPOs, average first-day IPO returns, the equity share of new issues, and the dividend premium. Firm characteristics: size, age, total return volatility, profitability (E/BE), dividends (D/BE), book to market, external finance (EF/A) and sales growth.

### Method

Each proxy is regressed on macro variables (industrial production, durables and nondurables consumption, services consumption, employment and an NBER recession dummy) and the residual is kept. SENTIMENT is the first principal component of the six orthogonalized proxies, each at its best lead or lag. Table 3 sorts monthly returns into NYSE-breakpoint deciles of each characteristic and splits months by whether SENTIMENT at the prior year end was positive or negative. Tables 4 to 6 run Fama-MacBeth regressions and time series regressions of long-short portfolios on lagged sentiment. Table 7 tests whether conditional market betas explain the pattern.

### Main Results

Table 3b, average monthly returns: after negative sentiment years, the smallest size decile earns 2.33 percent a month and the largest 0.91, a small-minus-big spread of 1.43. After positive sentiment years the smallest earns 0.88 and the largest 0.97, so the size effect disappears.

Volatility reverses sign: after negative sentiment the highest volatility decile earns 2.25 percent a month against 1.04 for the lowest; after positive sentiment it earns 0.61 against 1.26.

Unprofitable firms earn 2.51 percent a month after negative sentiment and 0.62 after positive. Non-payers earn 2.26 against 0.62. The youngest firms earn 1.75 against 0.35.

Book to market behaves differently: the value spread is about 1.1 to 1.2 percent a month in both regimes, consistent with value being less exposed to sentiment.

Tables 5 and 6: lagged sentiment predicts long-short returns on the hard-to-value characteristics with the signs above, using the composite and the separate proxies.

### Robustness

Results hold with CEFD alone (Table 3a), with each proxy in turn, with and without macro orthogonalization, and in regressions that control for the market return. Table 7 shows conditional market betas do not line up with the pattern a risk story would need. Table 8 shows earnings announcement returns move in the same direction, pointing to corrected mispricing.

### Stated Limits

Sentiment is measured with noisy annual proxies picked with hindsight about their timing. The authors concede the risk explanation cannot be ruled out entirely and that the sample covers a few large sentiment episodes.

### Retail Systematic Trader

Sentiment conditions the small-cap, high-volatility and unprofitable-stock premia. A rules-based book can lean toward speculative, small and unprofitable names only after low sentiment readings and lean away after high ones, using the Baker-Wurgler index that Wurgler publishes. The signal is annual and the strongest returns sit in small, illiquid stocks, so expected net gains depend on cost control, and the sample has few independent regime changes.
