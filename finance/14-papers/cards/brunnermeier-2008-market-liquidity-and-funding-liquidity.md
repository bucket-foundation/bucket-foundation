# Market Liquidity and Funding Liquidity <!-- voice-ignore-line -->

Topic: Market Microstructure  
Also tagged: Market Microstructure  
OpenAlex: https://openalex.org/W3121630491  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Markus Konrad Brunnermeier, Lasse Heje Pedersen | <!-- voice-ignore-line -->
| Year | 2008 |
| Venue | Review of Financial Studies | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1093/rfs/hhn098 |
| Cited by | 6173 as of 2026-11-27 |
| Cited by inside this set | 9 |

## Method

Model-based analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We show that, under certain conditions, margins are destabilizing and market liquidity and funding liquidity are mutually reinforcing, leading to liquidity spirals.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We provide a model that links an asset's market liquidity (i.e., the ease with which it is traded) and traders' funding liquidity (i.e., the ease with which they can obtain funding). Traders provide market liquidity, and their ability to do so depends on their availability of funding. Conversely, traders' funding, i.e., their capital and margin requirements, depends on the assets' market liquidity. We show that, under certain conditions, margins are destabilizing and market liquidity and funding liquidity are mutually reinforcing, leading to liquidity spirals. The model explains the empirically documented features that market liquidity (i) can suddenly dry up, (ii) has commonality across securities, (iii) is related to volatility, (iv) is subject to “flight to quality,” and (v) co-moves with the market. The model provides new testable predictions, including that speculators' capital is a driver of market liquidity and risk premiums.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w12939/w12939.pdf

## Deep Read

Source: open-access NBER Working Paper 12939, February 2007 version of the paper published in the Review of Financial Studies. Read 2026-11-27.

### Research Question

How does the ease of trading an asset, market liquidity, interact with the ease with which traders fund positions, funding liquidity, and can that interaction explain sudden liquidity dry-ups, commonality, flight to quality and the link to volatility?

### Data and Sample

None. Section 1 describes institutional funding for hedge funds, bank trading desks and market makers: margins, haircuts, lock-ups and redemption notice periods. The rest is a theory model.

### Method

J risky assets trade at t = 0 to 3. Fundamental value follows equation (2) with ARCH volatility, equation (3): sigma(t+1) = sigma + theta times the absolute last shock. Risk-averse customers receive offsetting endowment shocks that arrive at different times, so they need liquidity. Risk-neutral speculators supply it, subject to a capital constraint: the sum of position times margin cannot exceed their capital. Financiers set margins as a value-at-risk on the next price change. Two cases: an informed financier who knows prices revert to fundamentals, and an uninformed one who reads all price volatility as fundamental.

### Main Results

Proposition 1: an informed financier sets margins that fall when prices sit below fundamentals for long positions, equations (20) and (21). Illiquidity then cushions speculators, and margins are stabilizing.

Proposition 2: an uninformed financier sets margins that rise with past price volatility, equation (22). A liquidity shock raises volatility, raises margins and forces more selling. The authors say this matches real margin setting from recent price moves.

Proposition 3: the market is fragile, with multiple equilibria and sudden jumps in illiquidity, when speculators hold large positions or when the ARCH parameter is high and financiers put low prior weight on liquidity shocks. A numerical example with sigma = 5, theta = 0.3, a 1% VaR and speculator wealth of 750 shows the jump.

Proposition 4: when the capital constraint is slack, prices equal fundamentals and do not respond to speculator wealth. When it binds, equation (23) gives the price sensitivity to wealth shocks, amplified by a loss spiral from existing positions and a margin spiral from rising margins.

Proposition 5: market illiquidity co-moves across securities and with speculators' shadow cost of capital; jumps in illiquidity hit all assets at once; and when funding tightens, speculators cut the most capital-intensive, volatile positions first, giving flight to quality.

### Robustness

Theory only. The authors show the results under both financier types and give comparative statics.

### Stated Limits

The authors list tests the model needs: margin data from futures markets or prime brokers, exogenous capital shocks such as a desk closure, and nonlinear effects near the constraint. They do not test the model here.

### Retail Systematic Trader

Section 7 predicts that liquidity providers earn negatively skewed returns, since losses compound near the constraint and gains do not. A retail trader who sells volatility, runs short-term reversal or provides liquidity in small caps or crypto is in the speculator's seat and should expect the same skew. Margin rules at the broker work like equation (22): volatility spikes raise margins at the worst time. Keep leverage well under the broker maximum, expect correlations across positions to jump toward one in a funding squeeze, and treat a rise in broad volatility as a reason to cut size before the margin call forces it.
