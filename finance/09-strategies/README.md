# Strategy Cards

Beads `bkt-q5moa.5` and `bkt-q5moa.15`. 1000 cards across 18 families, one per distinct strategy logic, built 2026-11-27. Each card holds the logic, the fetched source, the claimed edge, post-publication decay evidence, capacity, data needs linked to `03-data-sources/cards/`, an implementation repo when one exists, and a retail feasibility grade. `registry.csv` lists every card with family, asset, source DOI or URL, data needed and whether free data can rerun it, for the replication bead.

## Method

Sources were fetched on 2026-11-27: DOIs through the Crossref API, arXiv papers through the arXiv API, web pages by direct request.

| Source | Fetched | Cards |
|---|---|---|
| First 180 cards, bead `bkt-q5moa.5` | Crossref, arXiv, web | 180 |
| Chen and Zimmermann, Open Source Asset Pricing, release 2026.10: SignalDoc.csv, predictor and placebo long-short returns | Hugging Face files; 160 papers searched on Crossref, 148 resolved | 211 new; 120 signals merged into variants or earlier cards |
| Hou, Xue and Zhang testing portfolios, 201 anomalies, global-q.org | technical document and recent-performance file | 0 new: every base signal maps to a Chen-Zimmermann or earlier card |
| Kakushadze and Serur, 151 Trading Strategies, [10.1007/978-3-030-02792-6](https://doi.org/10.1007/978-3-030-02792-6), arXiv 1912.04492 | Crossref and arXiv PDF table of contents | 74 new; 45 sections merged; 2 illegal strategies left out: money laundering and usury |
| Quantpedia free strategies, 82 pages | each page fetched | 28 new; 54 merged |
| `08-software/STRATEGIES-IN-CODE.md`, 465 rows | local source | 84 new cluster cards; every row mapped to one card |
| arXiv q-fin.TR and q-fin.PM, 2015 to 2026, 3,678 abstracts | arXiv API | 423 new, selected by a stated rule and a stated result |

Dedupe by logic: variants that differ only in frequency, holding period, lookback or estimator merge into one card, for example quarterly book-to-market into value, or 6-month into 12-month momentum. Mirror option structures with the same payoff by put-call parity share one card. Merged sources are listed under Merged Duplicates on the surviving card. Technical rules from code merge by rule family: every moving-average cross is one card, every ATR trailing flip another.

Grading for Chen-Zimmermann cards follows the post-publication t-stat in their replication: A at 3 or more with value weights, B at 2, C below 2, F below 0.5. arXiv cards default to C: one study, no out-of-sample follow-up. Their Logic and Claimed Edge lines quote the abstract; those lines carry voice-ignore markers.

Blocked: SSRN still returns 403, so SSRN-only papers linked from Quantpedia are cited without a fetch.

## Decay Baseline

McLean and Pontiff study 97 predictors: portfolio returns are 26% lower out of sample and 58% lower after publication, with a 32% drop they attribute to publication-informed trading. Declines are larger for predictors with high in-sample returns. Hou, Xue and Zhang find 65% of 452 anomalies fail a t-value of 1.96 once microcaps are muted with NYSE breakpoints and value weights, 82% fail at 2.78, and 96% of trading-friction anomalies fail. Jensen, Kelly and Pedersen reach the opposite verdict for factors grouped into 13 themes: most replicate and work out of sample in 93 countries. Read together: published equity anomalies keep about half their paper return, the robust survivors are the broad themes, and the small, illiquid, high-turnover signals fail.

Chen-Zimmermann replication of 274 signals with positive in-sample returns: the median signal kept 39 percent of its in-sample return after publication. Over 2016 to 2025, 33 of 321 signals had a long-short t-stat of 2 or more. Each equity anomaly card shows its own in-sample, post-publication and 2016 to 2025 figures.

## Family Ranking

Evidence strength: A for multi-decade, multi-market peer-reviewed evidence that survives the replication studies; B for peer-reviewed evidence in one market or a short sample; C for working papers, arXiv or a single study; D for practitioner sources and market history only. Retail A+B counts cards graded A or B. Free data counts `replicable_with_free_data = y` in `registry.csv`.

| Rank | Family | Cards | Evidence | Retail A+B | Free data | Verdict |
|---|---|---|---|---|---|---|
| 1 | ETFs and Macro | 61 | A | 32 | 46 | Trend, risk parity, rotation and calendar rules run on free ETF data. Expect half the paper return. |
| 2 | Options and Volatility | 56 | A | 33 | 41 | The variance premium pays sellers with crash risk. Spreads and collars from the book are payoff tools with no edge of their own. |
| 3 | Futures and CTA | 34 | A | 7 | 14 | Trend and carry have a century of evidence and a weak 2010s. Margin needs make most cards B or worse. |
| 4 | Equities | 547 | A | 95 | 341 | 211 Chen-Zimmermann anomalies kept a median 39 percent of their paper return; few clear t of 2 since 2016. Broad value, profitability, investment and momentum themes survive. |
| 5 | Commodities | 14 | B | 9 | 10 | Term structure, momentum and hedging pressure hold up; retail needs futures accounts. |
| 6 | FX | 20 | A | 6 | 8 | Carry, momentum and value are documented; carry crashes in liquidity crises. |
| 7 | Rates | 27 | B | 12 | 15 | Carry and term premium are documented; ladders and barbells are construction rules. Basis trades need repo. |
| 8 | Prediction Markets | 17 | C | 9 | 17 | Thin evidence, open retail access, small capacity. Sum arbitrage, cross-venue arbitrage and market making lead. |
| 9 | Execution and Portfolio Construction | 16 | B | 8 | 14 | Sizing, execution and allocation methods. They change cost and risk, and add no return of their own. |
| 10 | Crypto | 106 | C | 11 | 82 | Funding basis and time-series momentum are the best documented. Most of the 65 arXiv crypto cards are single ML backtests. |
| 11 | Stablecoin Yield | 7 | C | 7 | 7 | Yield tracks T-bills and funding, with protocol and depeg risk. |
| 12 | Credit | 15 | B | 3 | 3 | Small premium after costs; OTC access and CDO tranches exclude retail. |
| 13 | Real Estate | 12 | B | 7 | 4 | Long-run housing returns are high; strategies are operating businesses. |
| 14 | Sports Betting | 11 | C | 6 | 6 | Edges against soft books close through account limits. |
| 15 | Technical Analysis | 33 | D | 1 | 33 | 465 rows of shipped code reduce to 33 rule families. Sullivan, Timmermann and White found the best rules lost their edge after 1986. Use them as exits and filters. |
| 16 | Private Business Acquisition | 6 | B | 4 | 0 | Operational edge, one deal at a time. |
| 17 | GPU and Compute | 5 | D | 1 | 0 | No academic literature; prices fell from 2023 to 2025. |
| 18 | Other | 13 | C | 2 | 4 | Weather, inflation, LLM and RL agents; LLM and RL backtests are not yet credible. |

## Retail Shortlist

The cards graded A with family evidence A or B, ordered for the paper-trading plan in `07-system/`:

1. [Time-Series Momentum](cards/etf-time-series-momentum.md) and [Moving-Average Tactical Allocation](cards/etf-faber-sma-timing.md) on ETFs.
2. [Multi-Factor Combination](cards/eq-ff5-multifactor.md) through factor ETFs, with [Quality Minus Junk](cards/eq-quality-minus-junk.md) and [Gross Profitability](cards/eq-gross-profitability.md).
3. [Cash-Secured Put Writing](cards/op-putwrite.md) sized for crash loss.
4. [Tax-Loss Harvesting](cards/eq-tax-loss-harvesting.md) on any taxable account.
5. [Perpetual Funding-Rate Basis](cards/cy-perp-funding-basis.md) with venue limits.
6. [Multi-Outcome Sum Arbitrage](cards/pm-intra-market-arb.md), [Cross-Venue Prediction Market Arbitrage](cards/pm-cross-venue-arb.md) and [Kalshi Market Making](cards/pm-kalshi-mm.md) at small size.

## Open

- SSRN and Alpha Architect refetch when the 403 clears.
- arXiv cards quote abstracts; full-text checks of figures and a second read of their logic remain.
- Replication bead: start from the `y` rows in `registry.csv`; Chen-Zimmermann portfolios are free on Hugging Face.

## Card Index

`registry.csv` indexes all 1000 cards. File names start with the family prefix: `eq` equities, `eq-cz` Chen-Zimmermann anomalies, `etf`, `fu`, `op`, `cm`, `fx`, `pm`, `rt`, `cy`, `sy`, `cr`, `re`, `sb`, `pb`, `gp`, `ot`, `ta` technical analysis, `ex` execution and portfolio construction. An `-ax-` infix marks cards built from arXiv abstracts.
