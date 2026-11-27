## Deep Read

Source: open-access copy in NYU's Faculty Digital Archive of the article in the Journal of Financial Economics 77(2), 2005, pages 375 to 410. Read 2026-11-27.

### Research Question

If each asset carries a random trading cost, how does liquidity risk enter required returns, through which covariances, and how large is each channel in US stocks?

### Data and Sample

CRSP daily and monthly data for NYSE and AMEX common stocks, 1963 to 1999, with tests from 1964. Illiquidity is the Amihud (2002) measure, average absolute daily return over dollar volume, normalized and capped to approximate a cost. Each year stocks form 25 portfolios on past illiquidity, plus size and book-to-market sorts as checks.

### Method

An overlapping-generations model with risk-averse investors and an exogenous, random illiquidity cost on each security gives a liquidity-adjusted CAPM: the required excess return equals expected illiquidity plus a premium times a net beta. The net beta is beta1 + beta2 minus beta3 minus beta4, where beta1 is the usual market beta, beta2 is the covariance of the asset's illiquidity with market illiquidity (commonality), beta3 is the covariance of the asset's return with market illiquidity, and beta4 is the covariance of the asset's illiquidity with the market return. Innovations in illiquidity come from an AR(2). Cross-sectional regressions of portfolio returns on expected illiquidity and the betas, with GMM standard errors that account for pre-estimated betas (Tables 4 and 5). The model also predicts that persistent illiquidity shocks lower current returns and raise expected returns, a flight to liquidity.

### Main Results

Tables 2 and 3: the four betas are collinear across portfolios; beta1 and beta3 correlate at 0.972, beta2 and beta4 at 0.941, which limits separate identification.

Table 5, Panel A, equal-weighted illiquidity portfolios: with the coefficient on expected illiquidity set to average turnover, the net beta coefficient is 1.115 (t = 1.997) with R2 of 0.825; letting it be free gives 0.996 (t = 4.848). The model fits better than the plain CAPM (R2 of 0.350 for market beta alone).

Under the model's restrictions, liquidity risk adds about 1.1 percent a year to the gap in expected returns between the most and least illiquid portfolios: 0.08 percent from commonality in liquidity, 0.16 percent from covariance of return with market illiquidity, and 0.82 percent from covariance of illiquidity with the market return, the largest channel. The level of liquidity accounts for about 4.6 percent a year. Illiquid stocks have higher sensitivity on all three liquidity betas.

### Robustness

Value-weighted and equal-weighted portfolios and markets (Table 5), size and book-to-market portfolios, different normalizations of illiquidity, and tests with the betas entered separately.

### Stated Limits

Collinearity among the betas makes the separate estimates noisy; the split of the 1.1 percent rests on the model's restrictions. Illiquidity is a proxy, and the model takes illiquidity costs as exogenous.

### Retail Systematic Trader

Illiquid stocks pay a premium mostly for their expected trading cost and for becoming harder to sell when the market falls. A retail trader who holds small, illiquid names collects part of that premium but pays it back in spreads and in forced selling costs during sell-offs. Amihud illiquidity is easy to compute from daily price and volume and can screen positions so that the book stays sellable in a downturn.
