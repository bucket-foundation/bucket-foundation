# Deep Read Log

Bead `bkt-q5moa.25`. Targets: the 200 most-cited cards plus the 28 cards that `09-strategies` or `lab/RESULTS.md` link to, 217 in all after overlap. `lab/RESULTS-100.md` links no paper cards. Full texts come from legal open-access copies found through OpenAlex (best and other OA locations, plus a title search for working paper versions), Unpaywall, arXiv and Semantic Scholar: NBER working papers, institutional repositories, RePEc archives and author pages. Copies that were JSTOR or publisher downloads reposted by third parties were set aside. Each deep read lives in `deep/<card>.md`; `build.py` appends it to the card along with a Full Text section and any abstract from `data/abstracts.json`, keyed on `data/fulltext.json`. `_pdf/` is gitignored and was emptied after the reads; rerun the lookup to refetch.

## Counts

| Item | Count |
|---|---|
| Target cards | 217 |
| Open-access copy found, all looked-up cards | 108 of 451 |
| Target cards with a deep read | 54 |
| Target cards whose only copy was set aside | 6 |
| Target cards with no open-access copy | 157 |
| Cards missing an abstract in OpenAlex, of the 1000 | 300 |
| Abstracts filled, all from an open-access full text: 60 extracted from the PDF, 1 from Semantic Scholar | 61 |

## Sources

| Source | Copies |
|---|---|
| openalex | 59 |
| openalex2 | 24 |
| s2 | 21 |
| curl | 3 |
| arxiv | 1 |

## Deep Reads

- [diamond-1983-bank-runs-deposit-insurance-and](cards/diamond-1983-bank-runs-deposit-insurance-and.md) <!-- voice-ignore-line -->
- [kaelbling-1996-reinforcement-learning-a-survey](cards/kaelbling-1996-reinforcement-learning-a-survey.md) <!-- voice-ignore-line -->
- [wolfers-2004-prediction-markets](cards/wolfers-2004-prediction-markets.md) <!-- voice-ignore-line -->
- [chernozhukov-2018-double-debiased-machine-learning-for](cards/chernozhukov-2018-double-debiased-machine-learning-for.md) <!-- voice-ignore-line -->
- [brunnermeier-2008-market-liquidity-and-funding-liquidity](cards/brunnermeier-2008-market-liquidity-and-funding-liquidity.md) <!-- voice-ignore-line -->
- [diebold-2011-better-to-give-than-to](cards/diebold-2011-better-to-give-than-to.md) <!-- voice-ignore-line -->
- [campbell-2006-household-finance](cards/campbell-2006-household-finance.md) <!-- voice-ignore-line -->
- [fischer-2017-deep-learning-with-long-short](cards/fischer-2017-deep-learning-with-long-short.md) <!-- voice-ignore-line -->
- [gu-2020-empirical-asset-pricing-via-machine](cards/gu-2020-empirical-asset-pricing-via-machine.md) <!-- voice-ignore-line -->
- [pastor-2003-liquidity-risk-and-expected-stock](cards/pastor-2003-liquidity-risk-and-expected-stock.md) <!-- voice-ignore-line -->
- [baker-2006-investor-sentiment-and-the-crosssection](cards/baker-2006-investor-sentiment-and-the-crosssection.md) <!-- voice-ignore-line -->
- [kaminsky-1999-the-twin-crises-the-causes](cards/kaminsky-1999-the-twin-crises-the-causes.md) <!-- voice-ignore-line -->
- [levine-2000-financial-intermediation-and-growth-causality](cards/levine-2000-financial-intermediation-and-growth-causality.md) <!-- voice-ignore-line -->
- [petersen-2006-estimating-standard-errors-in-finance](cards/petersen-2006-estimating-standard-errors-in-finance.md) <!-- voice-ignore-line -->
- [barro-1983-rules-discretion-and-reputation-in](cards/barro-1983-rules-discretion-and-reputation-in.md) <!-- voice-ignore-line -->
- [diebold-2011-on-the-network-topology-of](cards/diebold-2011-on-the-network-topology-of.md) <!-- voice-ignore-line -->
- [snowberg-2010-explaining-the-favoritelong-shot-bias](cards/snowberg-2010-explaining-the-favoritelong-shot-bias.md) <!-- voice-ignore-line -->
- [rooij-2007-financial-literacy-and-stock-market](cards/rooij-2007-financial-literacy-and-stock-market.md) <!-- voice-ignore-line -->
- [andersen-2003-modeling-and-forecasting-realized-volatility](cards/andersen-2003-modeling-and-forecasting-realized-volatility.md) <!-- voice-ignore-line -->
- [forbes-2002-no-contagion-only-interdependence-measuring](cards/forbes-2002-no-contagion-only-interdependence-measuring.md) <!-- voice-ignore-line -->
- [lins-2016-social-capital-trust-and-firm](cards/lins-2016-social-capital-trust-and-firm.md) <!-- voice-ignore-line -->
- [schularick-2012-credit-booms-gone-bust-monetary](cards/schularick-2012-credit-booms-gone-bust-monetary.md) <!-- voice-ignore-line -->
- [malmendier-2005-ceo-overconfidence-and-corporate-investment](cards/malmendier-2005-ceo-overconfidence-and-corporate-investment.md) <!-- voice-ignore-line -->
- [barro-1983-a-positive-theory-of-monetary](cards/barro-1983-a-positive-theory-of-monetary.md) <!-- voice-ignore-line -->
- [duffie-2000-transform-analysis-and-asset-pricing](cards/duffie-2000-transform-analysis-and-asset-pricing.md) <!-- voice-ignore-line -->
- [malmendier-2008-who-makes-acquisitions-ceo-overconfidence](cards/malmendier-2008-who-makes-acquisitions-ceo-overconfidence.md) <!-- voice-ignore-line -->
- [gertler-1994-monetary-policy-business-cycles-and](cards/gertler-1994-monetary-policy-business-cycles-and.md) <!-- voice-ignore-line -->
- [benartzi-1995-myopic-loss-aversion-and-the](cards/benartzi-1995-myopic-loss-aversion-and-the.md) <!-- voice-ignore-line -->
- [bernanke-2005-what-explains-the-stock-market](cards/bernanke-2005-what-explains-the-stock-market.md) <!-- voice-ignore-line -->
- [campello-2010-the-real-effects-of-financial](cards/campello-2010-the-real-effects-of-financial.md) <!-- voice-ignore-line -->
- [billio-2012-econometric-measures-of-connectedness-and](cards/billio-2012-econometric-measures-of-connectedness-and.md) <!-- voice-ignore-line -->
- [ang-2006-the-crosssection-of-volatility-and](cards/ang-2006-the-crosssection-of-volatility-and.md) <!-- voice-ignore-line -->
- [mankiw-2002-sticky-information-versus-sticky-prices](cards/mankiw-2002-sticky-information-versus-sticky-prices.md) <!-- voice-ignore-line -->
- [campbell-2007-predicting-excess-stock-returns-out](cards/campbell-2007-predicting-excess-stock-returns-out.md) <!-- voice-ignore-line -->
- [bansal-2000-risks-for-the-long-run](cards/bansal-2000-risks-for-the-long-run.md) <!-- voice-ignore-line -->
- [dellavigna-2009-psychology-and-economics-evidence-from](cards/dellavigna-2009-psychology-and-economics-evidence-from.md) <!-- voice-ignore-line -->
- [barth-2003-bank-regulation-and-supervision-what](cards/barth-2003-bank-regulation-and-supervision-what.md) <!-- voice-ignore-line -->
- [liu-2018-risks-and-returns-of-cryptocurrency](cards/liu-2018-risks-and-returns-of-cryptocurrency.md) <!-- voice-ignore-line -->
- [pedroni-2004-panel-cointegration-asymptotic-and-finite](cards/pedroni-2004-panel-cointegration-asymptotic-and-finite.md) <!-- voice-ignore-line -->
- [welch-2007-a-comprehensive-look-at-the](cards/welch-2007-a-comprehensive-look-at-the.md) <!-- voice-ignore-line -->
- [stulz-1994-tobin-s-q-corporate-diversification](cards/stulz-1994-tobin-s-q-corporate-diversification.md) <!-- voice-ignore-line -->
- [campbell-2001-have-individual-stocks-become-more](cards/campbell-2001-have-individual-stocks-become-more.md) <!-- voice-ignore-line -->
- [makarov-2018-trading-and-arbitrage-in-cryptocurrency](cards/makarov-2018-trading-and-arbitrage-in-cryptocurrency.md) <!-- voice-ignore-line -->
- [stock-2002-forecasting-using-principal-components-from](cards/stock-2002-forecasting-using-principal-components-from.md) <!-- voice-ignore-line -->
- [ng-2001-lag-length-selection-and-the](cards/ng-2001-lag-length-selection-and-the.md) <!-- voice-ignore-line -->
- [liu-2020-finrl-a-deep-reinforcement-learning](cards/liu-2020-finrl-a-deep-reinforcement-learning.md) <!-- voice-ignore-line -->
- [acharya-2005-asset-pricing-with-liquidity-risk](cards/acharya-2005-asset-pricing-with-liquidity-risk.md) <!-- voice-ignore-line -->
- [croxson-2013-information-and-efficiency-goal-arrival](cards/croxson-2013-information-and-efficiency-goal-arrival.md) <!-- voice-ignore-line -->
- [hirshleifer-2001-investor-psychology-and-asset-pricing](cards/hirshleifer-2001-investor-psychology-and-asset-pricing.md) <!-- voice-ignore-line -->
- [pastor-2020-sustainable-investing-in-equilibrium](cards/pastor-2020-sustainable-investing-in-equilibrium.md) <!-- voice-ignore-line -->
- [hou-2012-digesting-anomalies-an-investment-approach](cards/hou-2012-digesting-anomalies-an-investment-approach.md) <!-- voice-ignore-line -->
- [pastor-2013-political-uncertainty-and-risk-premia](cards/pastor-2013-political-uncertainty-and-risk-premia.md) <!-- voice-ignore-line -->
- [bali-2010-maxing-out-stocks-as-lotteries](cards/bali-2010-maxing-out-stocks-as-lotteries.md) <!-- voice-ignore-line -->
- [liu-2019-common-risk-factors-in-cryptocurrency](cards/liu-2019-common-risk-factors-in-cryptocurrency.md) <!-- voice-ignore-line -->

## Copies Set Aside

- [kahneman-1979-prospect-theory-an-analysis-of](cards/kahneman-1979-prospect-theory-an-analysis-of.md): Copy found is a JSTOR download reposted on a third-party archive; not counted as a legal open-access copy.
- [jordan-2015-machine-learning-trends-perspectives-and](cards/jordan-2015-machine-learning-trends-perspectives-and.md): Copy found is a different 2023 paper with the same title; no open-access copy of the Jordan and Mitchell article located.
- [iacoviello-2005-house-prices-borrowing-constraints-and](cards/iacoviello-2005-house-prices-borrowing-constraints-and.md): Open-access copy is Appendix C only; the main paper is not in the file.
- [bertsimas-2004-the-price-of-robustness](cards/bertsimas-2004-the-price-of-robustness.md): Open-access copy is a set of seminar slides about the paper; the paper text is not in the file.
- [roll-1984-a-simple-implicit-measure-of](cards/roll-1984-a-simple-implicit-measure-of.md): Copy found is a JSTOR download reposted on a course page; not counted as a legal open-access copy.
- [mehra-1985-the-equity-premium-a-puzzle](cards/mehra-1985-the-equity-premium-a-puzzle.md): Copy found is a JSTOR download reposted on a third-party archive; not counted as a legal open-access copy.

## No Open-Access Copy

Target cards marked in their Full Text section.

- [fama-1993-common-risk-factors-in-the](cards/fama-1993-common-risk-factors-in-the.md) <!-- voice-ignore-line -->
- [markowitz-1952-portfolio-selection](cards/markowitz-1952-portfolio-selection.md) <!-- voice-ignore-line -->
- [black-1973-the-pricing-of-options-and](cards/black-1973-the-pricing-of-options-and.md) <!-- voice-ignore-line -->
- [kyle-1985-continuous-auctions-and-insider-trading](cards/kyle-1985-continuous-auctions-and-insider-trading.md) <!-- voice-ignore-line -->
- [dickey-1979-distribution-of-the-estimators-for](cards/dickey-1979-distribution-of-the-estimators-for.md) <!-- voice-ignore-line -->
- [christiano-2005-nominal-rigidities-and-the-dynamic](cards/christiano-2005-nominal-rigidities-and-the-dynamic.md) <!-- voice-ignore-line -->
- [friede-2015-esg-and-financial-performance-aggregated](cards/friede-2015-esg-and-financial-performance-aggregated.md) <!-- voice-ignore-line -->
- [brealey-1977-informational-asymmetries-financial-structure-and](cards/brealey-1977-informational-asymmetries-financial-structure-and.md) <!-- voice-ignore-line -->
- [squarepants-2022-bitcoin-a-peer-to-peer](cards/squarepants-2022-bitcoin-a-peer-to-peer.md) <!-- voice-ignore-line -->
- [sharpe-1964-capital-asset-prices-a-theory](cards/sharpe-1964-capital-asset-prices-a-theory.md) <!-- voice-ignore-line -->
- [jensen-1986-agency-costs-of-free-cash](cards/jensen-1986-agency-costs-of-free-cash.md) <!-- voice-ignore-line -->
- [heston-1993-a-closed-form-solution-for](cards/heston-1993-a-closed-form-solution-for.md) <!-- voice-ignore-line -->
- [glosten-1985-bid-ask-and-transaction-prices](cards/glosten-1985-bid-ask-and-transaction-prices.md) <!-- voice-ignore-line -->
- [tversky-1992-advances-in-prospect-theory-cumulative](cards/tversky-1992-advances-in-prospect-theory-cumulative.md) <!-- voice-ignore-line -->
- [bollerslev-1986-generalized-autoregressive-conditional-heteroskedasticity](cards/bollerslev-1986-generalized-autoregressive-conditional-heteroskedasticity.md) <!-- voice-ignore-line -->
- [clarida-1999-the-science-of-monetary-policy](cards/clarida-1999-the-science-of-monetary-policy.md) <!-- voice-ignore-line -->
- [diamond-1984-financial-intermediation-and-delegated-monitoring](cards/diamond-1984-financial-intermediation-and-delegated-monitoring.md) <!-- voice-ignore-line -->
- [morse-1982-wages-rents-and-the-quality](cards/morse-1982-wages-rents-and-the-quality.md) <!-- voice-ignore-line -->
- [brunnermeier-2009-deciphering-the-liquidity-and-credit](cards/brunnermeier-2009-deciphering-the-liquidity-and-credit.md) <!-- voice-ignore-line -->
- [wood-2013-ethereum-a-secure-decentralised-generalised](cards/wood-2013-ethereum-a-secure-decentralised-generalised.md) <!-- voice-ignore-line -->
- [dixon-1997-modelling-association-football-scores-and](cards/dixon-1997-modelling-association-football-scores-and.md) <!-- voice-ignore-line -->
- [fama-1992-the-cross-section-of-expected](cards/fama-1992-the-cross-section-of-expected.md) <!-- voice-ignore-line -->
- [mcwilliams-2001-corporate-social-responsibility-a-theory](cards/mcwilliams-2001-corporate-social-responsibility-a-theory.md) <!-- voice-ignore-line -->
- [merton-1973-theory-of-rational-option-pricing](cards/merton-1973-theory-of-rational-option-pricing.md) <!-- voice-ignore-line -->
- [bondt-1985-does-the-stock-market-overreact](cards/bondt-1985-does-the-stock-market-overreact.md) <!-- voice-ignore-line -->
- [engle-1982-autoregressive-conditional-heteroscedasticity-with-estimates](cards/engle-1982-autoregressive-conditional-heteroscedasticity-with-estimates.md) <!-- voice-ignore-line -->
- [bernanke-1999-chapter-21-the-financial-accelerator](cards/bernanke-1999-chapter-21-the-financial-accelerator.md) <!-- voice-ignore-line -->
- [fama-1977-asset-returns-and-inflation](cards/fama-1977-asset-returns-and-inflation.md) <!-- voice-ignore-line -->
- [tapscott-2016-blockchain-revolution-how-the-technology](cards/tapscott-2016-blockchain-revolution-how-the-technology.md) <!-- voice-ignore-line -->
- [carhart-1997-on-persistence-in-mutual-fund](cards/carhart-1997-on-persistence-in-mutual-fund.md) <!-- voice-ignore-line -->
- [rockafellar-2000-optimization-of-conditional-value-at](cards/rockafellar-2000-optimization-of-conditional-value-at.md) <!-- voice-ignore-line -->
- [cox-1985-a-theory-of-the-term](cards/cox-1985-a-theory-of-the-term.md) <!-- voice-ignore-line -->
- [amihud-1986-asset-pricing-and-the-bid](cards/amihud-1986-asset-pricing-and-the-bid.md) <!-- voice-ignore-line -->
- [long-1990-noise-trader-risk-in-financial](cards/long-1990-noise-trader-risk-in-financial.md) <!-- voice-ignore-line -->
- [phillips-1988-testing-for-a-unit-root](cards/phillips-1988-testing-for-a-unit-root.md) <!-- voice-ignore-line -->
- [bernanke-1995-inside-the-black-box-the](cards/bernanke-1995-inside-the-black-box-the.md) <!-- voice-ignore-line -->
- [reinhart-2009-this-time-is-different-eight](cards/reinhart-2009-this-time-is-different-eight.md) <!-- voice-ignore-line -->
- [gomber-2018-on-the-fintech-revolution-interpreting](cards/gomber-2018-on-the-fintech-revolution-interpreting.md) <!-- voice-ignore-line -->
- [levitt-2004-why-are-gambling-markets-organised](cards/levitt-2004-why-are-gambling-markets-organised.md) <!-- voice-ignore-line -->
- [jegadeesh-1993-returns-to-buying-winners-and](cards/jegadeesh-1993-returns-to-buying-winners-and.md) <!-- voice-ignore-line -->
- [merton-1973-an-intertemporal-capital-asset-pricing](cards/merton-1973-an-intertemporal-capital-asset-pricing.md) <!-- voice-ignore-line -->
- [cox-1979-option-pricing-a-simplified-approach](cards/cox-1979-option-pricing-a-simplified-approach.md) <!-- voice-ignore-line -->
- [johansen-1988-statistical-analysis-of-cointegration-vectors](cards/johansen-1988-statistical-analysis-of-cointegration-vectors.md) <!-- voice-ignore-line -->
- [meese-1983-empirical-exchange-rate-models-of](cards/meese-1983-empirical-exchange-rate-models-of.md) <!-- voice-ignore-line -->
- [nelson-1991-conditional-heteroskedasticity-in-asset-returns](cards/nelson-1991-conditional-heteroskedasticity-in-asset-returns.md) <!-- voice-ignore-line -->
- [merton-1969-lifetime-portfolio-selection-under-uncertainty](cards/merton-1969-lifetime-portfolio-selection-under-uncertainty.md) <!-- voice-ignore-line -->
- [merton-1976-option-pricing-when-underlying-stock](cards/merton-1976-option-pricing-when-underlying-stock.md) <!-- voice-ignore-line -->
- [bollerslev-1992-arch-modeling-in-finance](cards/bollerslev-1992-arch-modeling-in-finance.md) <!-- voice-ignore-line -->
- [barber-2001-boys-will-be-boys-gender](cards/barber-2001-boys-will-be-boys-gender.md) <!-- voice-ignore-line -->
- [dickey-1981-likelihood-ratio-statistics-for-autoregressive](cards/dickey-1981-likelihood-ratio-statistics-for-autoregressive.md) <!-- voice-ignore-line -->
- [clarida-2000-monetary-policy-rules-and-macroeconomic](cards/clarida-2000-monetary-policy-rules-and-macroeconomic.md) <!-- voice-ignore-line -->
- [hull-1987-the-pricing-of-options-on](cards/hull-1987-the-pricing-of-options-on.md) <!-- voice-ignore-line -->
- [diamond-1991-disclosure-liquidity-and-the-cost](cards/diamond-1991-disclosure-liquidity-and-the-cost.md) <!-- voice-ignore-line -->
- [daniel-1998-investor-psychology-and-security-market](cards/daniel-1998-investor-psychology-and-security-market.md) <!-- voice-ignore-line -->
- [im-2003-testing-for-unit-roots-in](cards/im-2003-testing-for-unit-roots-in.md) <!-- voice-ignore-line -->
- [fama-2014-a-five-factor-asset-pricing](cards/fama-2014-a-five-factor-asset-pricing.md) <!-- voice-ignore-line -->
- [easley-2004-information-and-the-cost-of](cards/easley-2004-information-and-the-cost-of.md) <!-- voice-ignore-line -->
- [tetlock-2007-giving-content-to-investor-sentiment](cards/tetlock-2007-giving-content-to-investor-sentiment.md) <!-- voice-ignore-line -->
- [johansen-1990-maximum-likelihood-estimation-and-inference](cards/johansen-1990-maximum-likelihood-estimation-and-inference.md) <!-- voice-ignore-line -->
- [rogoff-1985-the-optimal-degree-of-commitment](cards/rogoff-1985-the-optimal-degree-of-commitment.md) <!-- voice-ignore-line -->
- [ross-1976-the-arbitrage-theory-of-capital](cards/ross-1976-the-arbitrage-theory-of-capital.md) <!-- voice-ignore-line -->
- [rajan-1992-insiders-and-outsiders-the-choice](cards/rajan-1992-insiders-and-outsiders-the-choice.md) <!-- voice-ignore-line -->
- [harrison-1979-martingales-and-arbitrage-in-multiperiod](cards/harrison-1979-martingales-and-arbitrage-in-multiperiod.md) <!-- voice-ignore-line -->
- [barber-2000-trading-is-hazardous-to-your](cards/barber-2000-trading-is-hazardous-to-your.md) <!-- voice-ignore-line -->
- [kwiatkowski-1992-testing-the-null-hypothesis-of](cards/kwiatkowski-1992-testing-the-null-hypothesis-of.md) <!-- voice-ignore-line -->
- [woodford-2004-interest-and-prices-foundations-of](cards/woodford-2004-interest-and-prices-foundations-of.md) <!-- voice-ignore-line -->
- [banz-1981-the-relationship-between-return-and](cards/banz-1981-the-relationship-between-return-and.md) <!-- voice-ignore-line -->
- [demiguel-2007-optimal-versus-naive-diversification-how](cards/demiguel-2007-optimal-versus-naive-diversification-how.md) <!-- voice-ignore-line -->
- [longstaff-2001-valuing-american-options-by-simulation](cards/longstaff-2001-valuing-american-options-by-simulation.md) <!-- voice-ignore-line -->
- [leuz-2000-the-economic-consequences-of-increased](cards/leuz-2000-the-economic-consequences-of-increased.md) <!-- voice-ignore-line -->
- [burgstahler-1997-earnings-management-to-avoid-earnings](cards/burgstahler-1997-earnings-management-to-avoid-earnings.md) <!-- voice-ignore-line -->
- [levin-2002-unit-root-tests-in-panel](cards/levin-2002-unit-root-tests-in-panel.md) <!-- voice-ignore-line -->
- [primiceri-2005-time-varying-structural-vector-autoregressions](cards/primiceri-2005-time-varying-structural-vector-autoregressions.md) <!-- voice-ignore-line -->
- [allen-2000-financial-contagion](cards/allen-2000-financial-contagion.md) <!-- voice-ignore-line -->
- [fama-1996-multifactor-explanations-of-asset-pricing](cards/fama-1996-multifactor-explanations-of-asset-pricing.md) <!-- voice-ignore-line -->
- [roll-1977-a-critique-of-the-asset](cards/roll-1977-a-critique-of-the-asset.md) <!-- voice-ignore-line -->
- [andersen-1998-answering-the-skeptics-yes-standard](cards/andersen-1998-answering-the-skeptics-yes-standard.md) <!-- voice-ignore-line -->
- [odean-1998-are-investors-reluctant-to-realize](cards/odean-1998-are-investors-reluctant-to-realize.md) <!-- voice-ignore-line -->
- [pesaran-2007-a-simple-panel-unit-root](cards/pesaran-2007-a-simple-panel-unit-root.md) <!-- voice-ignore-line -->
- [holmstrom-1997-financial-intermediation-loanable-funds-and](cards/holmstrom-1997-financial-intermediation-loanable-funds-and.md) <!-- voice-ignore-line -->
- [graham-2001-the-theory-and-practice-of](cards/graham-2001-the-theory-and-practice-of.md) <!-- voice-ignore-line -->
- [king-1993-finance-entrepreneurship-and-growth](cards/king-1993-finance-entrepreneurship-and-growth.md) <!-- voice-ignore-line -->
- [heath-1992-bond-pricing-and-the-term](cards/heath-1992-bond-pricing-and-the-term.md) <!-- voice-ignore-line -->
- [johansen-1991-estimation-and-hypothesis-testing-of](cards/johansen-1991-estimation-and-hypothesis-testing-of.md) <!-- voice-ignore-line -->
- [greenwood-1990-financial-development-growth-and-the](cards/greenwood-1990-financial-development-growth-and-the.md) <!-- voice-ignore-line -->
- [pratt-1964-risk-aversion-in-the-small](cards/pratt-1964-risk-aversion-in-the-small.md) <!-- voice-ignore-line -->
- [berger-1995-diversification-s-effect-on-firm](cards/berger-1995-diversification-s-effect-on-firm.md) <!-- voice-ignore-line -->
- [black-1976-the-pricing-of-commodity-contracts](cards/black-1976-the-pricing-of-commodity-contracts.md) <!-- voice-ignore-line -->
- [mrck-2000-the-information-content-of-stock](cards/mrck-2000-the-information-content-of-stock.md) <!-- voice-ignore-line -->
- [glosten-1993-on-the-relation-between-the](cards/glosten-1993-on-the-relation-between-the.md) <!-- voice-ignore-line -->
- [schumpeter-1934-the-theory-of-economic-development](cards/schumpeter-1934-the-theory-of-economic-development.md) <!-- voice-ignore-line -->
- [ivashina-2009-bank-lending-during-the-financial](cards/ivashina-2009-bank-lending-during-the-financial.md) <!-- voice-ignore-line -->
- [lintner-1965-security-prices-risk-and-maximal](cards/lintner-1965-security-prices-risk-and-maximal.md) <!-- voice-ignore-line -->
- [perron-1989-the-great-crash-the-oil](cards/perron-1989-the-great-crash-the-oil.md) <!-- voice-ignore-line -->
- [gertler-2010-a-model-of-unconventional-monetary](cards/gertler-2010-a-model-of-unconventional-monetary.md) <!-- voice-ignore-line -->
- [fama-1997-industry-costs-of-equity](cards/fama-1997-industry-costs-of-equity.md) <!-- voice-ignore-line -->
- [lumpkin-2001-linking-two-dimensions-of-entrepreneurial](cards/lumpkin-2001-linking-two-dimensions-of-entrepreneurial.md) <!-- voice-ignore-line -->
- [harrison-1981-martingales-and-stochastic-integrals-in](cards/harrison-1981-martingales-and-stochastic-integrals-in.md) <!-- voice-ignore-line -->
- [maddala-1999-a-comparative-study-of-unit](cards/maddala-1999-a-comparative-study-of-unit.md) <!-- voice-ignore-line -->
- [campbell-1999-by-force-of-habit-a](cards/campbell-1999-by-force-of-habit-a.md) <!-- voice-ignore-line -->
- [hitt-1997-international-diversification-effects-on-innovation](cards/hitt-1997-international-diversification-effects-on-innovation.md) <!-- voice-ignore-line -->
- [black-1976-valuing-corporate-securities-some-effects](cards/black-1976-valuing-corporate-securities-some-effects.md) <!-- voice-ignore-line -->
- [shiller-2003-from-efficient-markets-theory-to](cards/shiller-2003-from-efficient-markets-theory-to.md) <!-- voice-ignore-line -->
- [engle-2002-dynamic-conditional-correlation-a-simple](cards/engle-2002-dynamic-conditional-correlation-a-simple.md) <!-- voice-ignore-line -->
- [kashyap-2000-what-do-a-million-observations](cards/kashyap-2000-what-do-a-million-observations.md) <!-- voice-ignore-line -->
- [amihud-1981-risk-reduction-as-a-managerial](cards/amihud-1981-risk-reduction-as-a-managerial.md) <!-- voice-ignore-line -->
- [bakshi-1997-empirical-performance-of-alternative-option](cards/bakshi-1997-empirical-performance-of-alternative-option.md) <!-- voice-ignore-line -->
- [moore-2008-the-trouble-with-overconfidence](cards/moore-2008-the-trouble-with-overconfidence.md) <!-- voice-ignore-line -->
- [pedroni-1999-critical-values-for-cointegration-tests](cards/pedroni-1999-critical-values-for-cointegration-tests.md) <!-- voice-ignore-line -->
- [boot-2000-relationship-banking-what-do-we](cards/boot-2000-relationship-banking-what-do-we.md) <!-- voice-ignore-line -->
- [french-1987-expected-stock-returns-and-volatility](cards/french-1987-expected-stock-returns-and-volatility.md) <!-- voice-ignore-line -->
- [duffie-1999-modeling-term-structures-of-defaultable](cards/duffie-1999-modeling-term-structures-of-defaultable.md) <!-- voice-ignore-line -->
- [barberis-2003-chapter-18-a-survey-of](cards/barberis-2003-chapter-18-a-survey-of.md) <!-- voice-ignore-line -->
- [elliott-1996-efficient-tests-for-an-autoregressive](cards/elliott-1996-efficient-tests-for-an-autoregressive.md) <!-- voice-ignore-line -->
- [uhlig-2005-what-are-the-effects-of](cards/uhlig-2005-what-are-the-effects-of.md) <!-- voice-ignore-line -->
- [burt-1987-social-contagion-and-innovation-cohesion](cards/burt-1987-social-contagion-and-innovation-cohesion.md) <!-- voice-ignore-line -->
- [danneels-2002-the-dynamics-of-product-innovation](cards/danneels-2002-the-dynamics-of-product-innovation.md) <!-- voice-ignore-line -->
- [kao-1999-spurious-regression-and-residual-based](cards/kao-1999-spurious-regression-and-residual-based.md) <!-- voice-ignore-line -->
- [zhang-2020-financial-markets-under-the-global](cards/zhang-2020-financial-markets-under-the-global.md) <!-- voice-ignore-line -->
- [fama-1989-business-conditions-and-expected-returns](cards/fama-1989-business-conditions-and-expected-returns.md) <!-- voice-ignore-line -->
- [lambert-2007-accounting-information-disclosure-and-the](cards/lambert-2007-accounting-information-disclosure-and-the.md) <!-- voice-ignore-line -->
- [choi-2001-unit-root-tests-for-panel](cards/choi-2001-unit-root-tests-for-panel.md) <!-- voice-ignore-line -->
- [fama-1988-dividend-yields-and-expected-stock](cards/fama-1988-dividend-yields-and-expected-stock.md) <!-- voice-ignore-line -->
- [khanna-2000-is-group-affiliation-profitable-in](cards/khanna-2000-is-group-affiliation-profitable-in.md) <!-- voice-ignore-line -->
- [shin-2014-modelling-asymmetric-cointegration-and-dynamic](cards/shin-2014-modelling-asymmetric-cointegration-and-dynamic.md) <!-- voice-ignore-line -->
- [bollerslev-1988-a-capital-asset-pricing-model](cards/bollerslev-1988-a-capital-asset-pricing-model.md) <!-- voice-ignore-line -->
- [rockafellar-2002-conditional-value-at-risk-for](cards/rockafellar-2002-conditional-value-at-risk-for.md) <!-- voice-ignore-line -->
- [black-nd-the-capital-asset-pricing-model](cards/black-nd-the-capital-asset-pricing-model.md) <!-- voice-ignore-line -->
- [mclean-2016-does-academic-research-destroy-stock](cards/mclean-2016-does-academic-research-destroy-stock.md) <!-- voice-ignore-line -->
- [fama-2004-the-capital-asset-pricing-model](cards/fama-2004-the-capital-asset-pricing-model.md) <!-- voice-ignore-line -->
- [narayan-2005-the-saving-and-investment-nexus](cards/narayan-2005-the-saving-and-investment-nexus.md) <!-- voice-ignore-line -->
- [hong-2009-the-price-of-sin-the](cards/hong-2009-the-price-of-sin-the.md) <!-- voice-ignore-line -->
- [said-1984-testing-for-unit-roots-in](cards/said-1984-testing-for-unit-roots-in.md) <!-- voice-ignore-line -->
- [bollerslev-1990-modelling-the-coherence-in-short](cards/bollerslev-1990-modelling-the-coherence-in-short.md) <!-- voice-ignore-line -->
- [coval-1999-home-bias-at-home-local](cards/coval-1999-home-bias-at-home-local.md) <!-- voice-ignore-line -->
- [lee-1991-investor-sentiment-and-the-closed](cards/lee-1991-investor-sentiment-and-the-closed.md) <!-- voice-ignore-line -->
- [mackinnon-1996-numerical-distribution-functions-for-unit](cards/mackinnon-1996-numerical-distribution-functions-for-unit.md) <!-- voice-ignore-line -->
- [erikson-2008-are-political-markets-really-superior](cards/erikson-2008-are-political-markets-really-superior.md) <!-- voice-ignore-line -->
- [stock-2002-macroeconomic-forecasting-using-diffusion-indexes](cards/stock-2002-macroeconomic-forecasting-using-diffusion-indexes.md) <!-- voice-ignore-line -->
- [coles-2005-managerial-incentives-and-risk-taking](cards/coles-2005-managerial-incentives-and-risk-taking.md) <!-- voice-ignore-line -->
- [breeden-1979-an-intertemporal-asset-pricing-model](cards/breeden-1979-an-intertemporal-asset-pricing-model.md) <!-- voice-ignore-line -->
- [phillips-1987-time-series-regression-with-a](cards/phillips-1987-time-series-regression-with-a.md) <!-- voice-ignore-line -->
- [harvey-2000-conditional-skewness-in-asset-pricing](cards/harvey-2000-conditional-skewness-in-asset-pricing.md) <!-- voice-ignore-line -->
- [bollerslev-1987-a-conditionally-heteroskedastic-time-series](cards/bollerslev-1987-a-conditionally-heteroskedastic-time-series.md) <!-- voice-ignore-line -->
- [engle-1987-estimating-time-varying-risk-premia](cards/engle-1987-estimating-time-varying-risk-premia.md) <!-- voice-ignore-line -->
- [gregory-1996-residual-based-tests-for-cointegration](cards/gregory-1996-residual-based-tests-for-cointegration.md) <!-- voice-ignore-line -->
- [osterwaldlenum-1992-a-note-with-quantiles-of](cards/osterwaldlenum-1992-a-note-with-quantiles-of.md) <!-- voice-ignore-line -->
- [lee-2003-minimum-lagrange-multiplier-unit-root](cards/lee-2003-minimum-lagrange-multiplier-unit-root.md) <!-- voice-ignore-line -->
- [asness-2013-value-and-momentum-everywhere](cards/asness-2013-value-and-momentum-everywhere.md) <!-- voice-ignore-line -->
- [corsi-2008-a-simple-approximate-long-memory](cards/corsi-2008-a-simple-approximate-long-memory.md) <!-- voice-ignore-line -->
- [jagannathan-1996-the-conditional-capm-and-the](cards/jagannathan-1996-the-conditional-capm-and-the.md) <!-- voice-ignore-line -->
- [brock-1992-simple-technical-trading-rules-and](cards/brock-1992-simple-technical-trading-rules-and.md) <!-- voice-ignore-line -->
- [brennan-1985-evaluating-natural-resource-investments](cards/brennan-1985-evaluating-natural-resource-investments.md) <!-- voice-ignore-line -->
- [bernard-1989-post-earnings-announcement-drift-delayed](cards/bernard-1989-post-earnings-announcement-drift-delayed.md) <!-- voice-ignore-line -->
- [griffin-2018-is-bitcoin-really-un-tethered](cards/griffin-2018-is-bitcoin-really-un-tethered.md) <!-- voice-ignore-line -->
- [moskowitz-1999-do-industries-explain-momentum](cards/moskowitz-1999-do-industries-explain-momentum.md) <!-- voice-ignore-line -->
- [moskowitz-2011-time-series-momentum](cards/moskowitz-2011-time-series-momentum.md) <!-- voice-ignore-line -->
