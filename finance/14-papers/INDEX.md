# Finance Paper Canon

1000 paper cards ranked by OpenAlex citation count, pulled 2026-11-27 for bead `bkt-q5moa.19`. Rebuild with `python3 fetch.py && python3 build.py`. Network summary in [NETWORK.md](NETWORK.md).

## Selection

Each topic queries OpenAlex for its phrases in title or abstract, restricted to the economics, business and decision-science fields, plus computer science and mathematics for crypto, prediction markets, betting and machine learning. Two pages of 200, sorted by citations. A local pass keeps a work only when a topic phrase appears in its abstract, or, when OpenAlex has no abstract, when its title carries a finance term. Topics then take turns adding their next most-cited unclaimed paper until the set holds 1000. Ten papers the lab replicated or cites, which the keyword search missed, enter as seeds by DOI (`SEEDS` in `fetch.py`). Twelve off-topic works that pass the phrase filter are excluded by OpenAlex id in `build.py`. A paper sits under the topic that claimed it first; its card lists every topic it matched.

Citation counts mix canon with method papers that finance borrows, such as econometric tools. Niche topics run out of papers sooner, so their floor citation count is lower.

## Topics

| Topic | Papers | Lowest cites |
|---|---|---|
| [Asset Pricing](#asset-pricing) | 67 | 1826 |
| [Portfolio Theory](#portfolio-theory) | 67 | 1493 |
| [Derivatives](#derivatives) | 67 | 1264 |
| [Market Microstructure](#microstructure) | 67 | 983 |
| [Behavioral Finance](#behavioral) | 67 | 1266 |
| [Financial Econometrics](#econometrics) | 67 | 1683 |
| [Monetary Economics](#monetary) | 67 | 1461 |
| [Banking and Crises](#banking-crises) | 67 | 1497 |
| [Real Estate Finance](#real-estate) | 67 | 629 |
| [Mortgage](#mortgage) | 67 | 521 |
| [Cryptocurrency](#crypto) | 66 | 640 |
| [Prediction Markets](#prediction-markets) | 66 | 71 |
| [Sports Betting Markets](#sports-betting) | 66 | 82 |
| [Machine Learning in Finance](#ml-finance) | 66 | 648 |
| [Reinforcement Learning Trading](#rl-trading) | 66 | 100 |

<a id="asset-pricing"></a>

## Asset Pricing

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Common risk factors in the returns on stocks and bonds](cards/fama-1993-common-risk-factors-in-the.md) | Eugene F. Fama and others | 1993 | 31861 | <!-- voice-ignore-line -->
| [CAPITAL ASSET PRICES: A THEORY OF MARKET EQUILIBRIUM UNDER CONDITIONS OF RISK](cards/sharpe-1964-capital-asset-prices-a-theory.md) | William F. Sharpe | 1964 | 27642 | <!-- voice-ignore-line -->
| [The Cross-Section of Expected Stock Returns](cards/fama-1992-the-cross-section-of-expected.md) | Eugene F. Fama and others | 1992 | 21919 | <!-- voice-ignore-line -->
| [On Persistence in Mutual Fund Performance](cards/carhart-1997-on-persistence-in-mutual-fund.md) | Mark M. Carhart | 1997 | 20117 | <!-- voice-ignore-line -->
| [Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency](cards/jegadeesh-1993-returns-to-buying-winners-and.md) | Narasimhan Jegadeesh and others | 1993 | 14196 | <!-- voice-ignore-line -->
| [Conditional Heteroskedasticity in Asset Returns: A New Approach](cards/nelson-1991-conditional-heteroskedasticity-in-asset-returns.md) | Daniel B. Nelson | 1991 | 12884 | <!-- voice-ignore-line -->
| [Estimating Standard Errors in Finance Panel Data Sets: Comparing Approaches](cards/petersen-2006-estimating-standard-errors-in-finance.md) | Mitchell A. Petersen | 2006 | 12150 | <!-- voice-ignore-line -->
| [A five-factor asset pricing model](cards/fama-2014-a-five-factor-asset-pricing.md) | Eugene F. Fama and others | 2014 | 10267 | <!-- voice-ignore-line -->
| [The arbitrage theory of capital asset pricing](cards/ross-1976-the-arbitrage-theory-of-capital.md) | Stephen A. Ross | 1976 | 9435 | <!-- voice-ignore-line -->
| [The relationship between return and market value of common stocks](cards/banz-1981-the-relationship-between-return-and.md) | Rolf W. Banz | 1981 | 8066 | <!-- voice-ignore-line -->
| [Multifactor Explanations of Asset Pricing Anomalies](cards/fama-1996-multifactor-explanations-of-asset-pricing.md) | Eugene F. Fama and others | 1996 | 7902 | <!-- voice-ignore-line -->
| [The theory and practice of corporate finance: evidence from the field](cards/graham-2001-the-theory-and-practice-of.md) | John Robert Graham and others | 2001 | 7443 | <!-- voice-ignore-line -->
| [Risk Aversion in the Small and in the Large](cards/pratt-1964-risk-aversion-in-the-small.md) | John W. Pratt | 1964 | 6921 | <!-- voice-ignore-line -->
| [The equity premium: A puzzle](cards/mehra-1985-the-equity-premium-a-puzzle.md) | Rajnish Mehra and others | 1985 | 6906 | <!-- voice-ignore-line -->
| [Industry costs of equity](cards/fama-1997-industry-costs-of-equity.md) | Eugene F. Fama and others | 1997 | 6230 | <!-- voice-ignore-line -->
| [By Force of Habit: A Consumption‐Based Explanation of Aggregate Stock Market Behavior](cards/campbell-1999-by-force-of-habit-a.md) | John Y. Campbell and others | 1999 | 5372 | <!-- voice-ignore-line -->
| [The Cross‐Section of Volatility and Expected Returns](cards/ang-2006-the-crosssection-of-volatility-and.md) | Andrew Ang and others | 2006 | 5096 | <!-- voice-ignore-line -->
| [Expected stock returns and volatility](cards/french-1987-expected-stock-returns-and-volatility.md) | Kenneth R. French and others | 1987 | 4647 | <!-- voice-ignore-line -->
| [Risks for the Long Run: A Potential Resolution of Asset Pricing Puzzles](cards/bansal-2000-risks-for-the-long-run.md) | Ravi Bansal and others | 2000 | 4520 | <!-- voice-ignore-line -->
| [Business conditions and expected returns on stocks and bonds](cards/fama-1989-business-conditions-and-expected-returns.md) | Eugene F. Fama and others | 1989 | 4440 | <!-- voice-ignore-line -->
| [A Comprehensive Look at The Empirical Performance of Equity Premium Prediction](cards/welch-2007-a-comprehensive-look-at-the.md) | Ivo Welch and others | 2007 | 4376 | <!-- voice-ignore-line -->
| [Dividend yields and expected stock returns](cards/fama-1988-dividend-yields-and-expected-stock.md) | Eugene F. Fama and others | 1988 | 4003 | <!-- voice-ignore-line -->
| [A Capital Asset Pricing Model with Time-Varying Covariances](cards/bollerslev-1988-a-capital-asset-pricing-model.md) | Tim Bollerslev and others | 1988 | 3809 | <!-- voice-ignore-line -->
| [Forecasting Using Principal Components From a Large Number of Predictors](cards/stock-2002-forecasting-using-principal-components-from.md) | James H. Stock and others | 2002 | 3707 | <!-- voice-ignore-line -->
| [The Capital Asset Pricing Model: Theory and Evidence](cards/fama-2004-the-capital-asset-pricing-model.md) | Eugene F. Fama and others | 2004 | 3650 | <!-- voice-ignore-line -->
| [The price of sin: The effects of social norms on markets](cards/hong-2009-the-price-of-sin-the.md) | Harrison G. Hong and others | 2009 | 3344 | <!-- voice-ignore-line -->
| [Asset pricing with liquidity risk](cards/acharya-2005-asset-pricing-with-liquidity-risk.md) | Viral V. Acharya and others | 2005 | 3317 | <!-- voice-ignore-line -->
| [Home Bias at Home: Local Equity Preference in Domestic Portfolios](cards/coval-1999-home-bias-at-home-local.md) | Joshua D. Coval and others | 1999 | 3249 | <!-- voice-ignore-line -->
| [Macroeconomic Forecasting Using Diffusion Indexes](cards/stock-2002-macroeconomic-forecasting-using-diffusion-indexes.md) | James H. Stock and others | 2002 | 3226 | <!-- voice-ignore-line -->
| [An intertemporal asset pricing model with stochastic consumption and investment opportunities](cards/breeden-1979-an-intertemporal-asset-pricing-model.md) | Douglas T. Breeden | 1979 | 3160 | <!-- voice-ignore-line -->
| [Conditional Skewness in Asset Pricing Tests](cards/harvey-2000-conditional-skewness-in-asset-pricing.md) | Campbell R. Harvey and others | 2000 | 3093 | <!-- voice-ignore-line -->
| [Estimating Time Varying Risk Premia in the Term Structure: The Arch-M Model](cards/engle-1987-estimating-time-varying-risk-premia.md) | Robert F. Engle and others | 1987 | 3036 | <!-- voice-ignore-line -->
| [Investor Psychology and Asset Pricing](cards/hirshleifer-2001-investor-psychology-and-asset-pricing.md) | David A. Hirshleifer | 2001 | 2944 | <!-- voice-ignore-line -->
| [Sustainable investing in equilibrium](cards/pastor-2020-sustainable-investing-in-equilibrium.md) | Ľuboš Pástor and others | 2020 | 2918 | <!-- voice-ignore-line -->
| [Value and Momentum Everywhere](cards/asness-2013-value-and-momentum-everywhere.md) | Clifford S. Asness and others | 2013 | 2887 | <!-- voice-ignore-line -->
| [The Conditional CAPM and the Cross-Section of Expected Returns](cards/jagannathan-1996-the-conditional-capm-and-the.md) | Ravi Jagannathan and others | 1996 | 2864 | <!-- voice-ignore-line -->
| [Digesting Anomalies: An Investment Approach](cards/hou-2012-digesting-anomalies-an-investment-approach.md) | Kewei Hou and others | 2012 | 2855 | <!-- voice-ignore-line -->
| [Political uncertainty and risk premia](cards/pastor-2013-political-uncertainty-and-risk-premia.md) | Ľuboš Pástor and others | 2013 | 2822 | <!-- voice-ignore-line -->
| [Evaluating Natural Resource Investments](cards/brennan-1985-evaluating-natural-resource-investments.md) | Michael John Brennan and others | 1985 | 2817 | <!-- voice-ignore-line -->
| [Uncertainty about Government Policy and Stock Prices](cards/pastor-2012-uncertainty-about-government-policy-and.md) | Ľuboš Pástor and others | 2012 | 2781 | <!-- voice-ignore-line -->
| [Post-Earnings-Announcement Drift: Delayed Price Response or Risk Premium?](cards/bernard-1989-post-earnings-announcement-drift-delayed.md) | Victor L. Bernard and others | 1989 | 2751 | <!-- voice-ignore-line -->
| [… and the Cross-Section of Expected Returns](cards/harvey-2015-and-the-cross-section-of.md) | Campbell R. Harvey and others | 2015 | 2748 | <!-- voice-ignore-line -->
| [Responsible Investing: The ESG-Efficient Frontier](cards/pedersen-2019-responsible-investing-the-esg-efficient.md) | Lasse Heje Pedersen and others | 2019 | 2710 | <!-- voice-ignore-line -->
| [Rare Disasters and Asset Markets in the Twentieth Century](cards/barro-2006-rare-disasters-and-asset-markets.md) | Robert J. Barro | 2006 | 2571 | <!-- voice-ignore-line -->
| [Time-Varying World Market Integration](cards/bekaert-1995-time-varying-world-market-integration.md) | Geert Bekaert and others | 1995 | 2503 | <!-- voice-ignore-line -->
| [Size, value, and momentum in international stock returns](cards/fama-2012-size-value-and-momentum-in.md) | Eugene F. Fama and others | 2012 | 2404 | <!-- voice-ignore-line -->
| [Consumption, Aggregate Wealth, and Expected Stock Returns](cards/lettau-2001-consumption-aggregate-wealth-and-expected.md) | Martin Lettau and others | 2001 | 2402 | <!-- voice-ignore-line -->
| [Habit Formation: A Resolution of the Equity Premium Puzzle](cards/constantinides-1990-habit-formation-a-resolution-of.md) | George M. Constantinides | 1990 | 2379 | <!-- voice-ignore-line -->
| [The relationship between earnings' yield, market value and return for NYSE common stocks](cards/basu-1983-the-relationship-between-earnings-yield.md) | Sanjoy Basu | 1983 | 2258 | <!-- voice-ignore-line -->
| [Luck versus Skill in the Cross‐Section of Mutual Fund Returns](cards/fama-2010-luck-versus-skill-in-the.md) | Eugene F. Fama and others | 2010 | 2230 | <!-- voice-ignore-line -->
| [Environmental Externalities and Cost of Capital](cards/chava-2014-environmental-externalities-and-cost-of.md) | Sudheer Chava | 2014 | 2195 | <!-- voice-ignore-line -->
| [The Generalized Dynamic-Factor Model: Identification and Estimation](cards/forni-2000-the-generalized-dynamic-factor-model.md) | Mario Forni and others | 2000 | 2124 | <!-- voice-ignore-line -->
| [Do Industries Explain Momentum?](cards/moskowitz-1999-do-industries-explain-momentum.md) | Tobias J. Moskowitz and others | 1999 | 2100 | <!-- voice-ignore-line -->
| [New Indexes of Coincident and Leading Economic Indicators](cards/stock-1989-new-indexes-of-coincident-and.md) | James H. Stock and others | 1989 | 2087 | <!-- voice-ignore-line -->
| [Information Uncertainty and Stock Returns](cards/zhang-2006-information-uncertainty-and-stock-returns.md) | Frank Zhang | 2006 | 2039 | <!-- voice-ignore-line -->
| [Oil and the Stock Markets](cards/jones-1996-oil-and-the-stock-markets.md) | Charles M. Jones and others | 1996 | 2017 | <!-- voice-ignore-line -->
| [Fundamentals and Stock Returns in Japan](cards/chan-1991-fundamentals-and-stock-returns-in.md) | Louis K.C. Chan and others | 1991 | 2010 | <!-- voice-ignore-line -->
| [Heterogeneous beliefs and routes to chaos in a simple asset pricing model](cards/brock-1998-heterogeneous-beliefs-and-routes-to.md) | William A. Brock and others | 1998 | 1989 | <!-- voice-ignore-line -->
| [A general version of the fundamental theorem of asset pricing](cards/delbaen-1994-a-general-version-of-the.md) | Freddy Delbaen and others | 1994 | 1985 | <!-- voice-ignore-line -->
| [When Are Contrarian Profits Due to Stock Market Overreaction?](cards/lo-1990-when-are-contrarian-profits-due.md) | Andrew W. Lo and others | 1990 | 1983 | <!-- voice-ignore-line -->
| [Measuring Fund Strategy and Performance in Changing Economic Conditions](cards/ferson-1996-measuring-fund-strategy-and-performance.md) | Wayne E. Ferson and others | 1996 | 1974 | <!-- voice-ignore-line -->
| [Expected Stock Returns and Variance Risk Premia](cards/bollerslev-2009-expected-stock-returns-and-variance.md) | Tim Bollerslev and others | 2009 | 1921 | <!-- voice-ignore-line -->
| [Stock Returns, Expected Returns, and Real Activity](cards/fama-1990-stock-returns-expected-returns-and.md) | Eugene F. Fama | 1990 | 1897 | <!-- voice-ignore-line -->
| [Debt/Equity Ratio and Expected Common Stock Returns: Empirical Evidence](cards/bhandari-1988-debt-equity-ratio-and-expected.md) | Laxmi Chand Bhandari | 1988 | 1856 | <!-- voice-ignore-line -->
| [On Market Timing and Investment Performance. II. Statistical Procedures for Evaluating Forecasting Skills](cards/henriksson-1981-on-market-timing-and-investment.md) | Roy D. Henriksson and others | 1981 | 1829 | <!-- voice-ignore-line -->
| [Time Series Momentum](cards/moskowitz-2011-time-series-momentum.md) | Tobias J. Moskowitz and others | 2011 | 1828 | <!-- voice-ignore-line -->
| [Out-of-Sample Equity Premium Prediction: Combination Forecasts and Links to the Real Economy](cards/rapach-2009-out-of-sample-equity-premium.md) | David E. Rapach and others | 2009 | 1826 | <!-- voice-ignore-line -->

<a id="portfolio-theory"></a>

## Portfolio Theory

| Paper | First author | Year | Cites |
|---|---|---|---|
| [PORTFOLIO SELECTION](cards/markowitz-1952-portfolio-selection.md) | Harry M. Markowitz | 1952 | 36475 | <!-- voice-ignore-line -->
| [Agency Costs of Free Cash Flow, Corporate Finance, and Takeovers](cards/jensen-1986-agency-costs-of-free-cash.md) | Michael C. Jensen | 1986 | 20654 | <!-- voice-ignore-line -->
| [Corporate Social Responsibility: A Theory of the Firm Perspective](cards/mcwilliams-2001-corporate-social-responsibility-a-theory.md) | Abagail McWilliams and others | 2001 | 10218 | <!-- voice-ignore-line -->
| [Optimization of conditional value-at-risk](cards/rockafellar-2000-optimization-of-conditional-value-at.md) | Ralph Tyrrell Rockafellar and others | 2000 | 8859 | <!-- voice-ignore-line -->
| [An Intertemporal Capital Asset Pricing Model](cards/merton-1973-an-intertemporal-capital-asset-pricing.md) | Robert C. Merton | 1973 | 7663 | <!-- voice-ignore-line -->
| [Lifetime Portfolio Selection under Uncertainty: The Continuous-Time Case](cards/merton-1969-lifetime-portfolio-selection-under-uncertainty.md) | Robert C. Merton | 1969 | 6021 | <!-- voice-ignore-line -->
| [The Price of Robustness](cards/bertsimas-2004-the-price-of-robustness.md) | Dimitris Bertsimas and others | 2004 | 5552 | <!-- voice-ignore-line -->
| [Financial Literacy and Stock Market Participation](cards/rooij-2007-financial-literacy-and-stock-market.md) | Maarten van Rooij and others | 2007 | 4823 | <!-- voice-ignore-line -->
| [Insiders and Outsiders: The Choice between Informed and Arm's-Length Debt](cards/rajan-1992-insiders-and-outsiders-the-choice.md) | Raghuram G. Rajan | 1992 | 4644 | <!-- voice-ignore-line -->
| [Optimal Versus Naive Diversification: How Inefficient is the 1/ N Portfolio Strategy?](cards/demiguel-2007-optimal-versus-naive-diversification-how.md) | Victor DeMiguel and others | 2007 | 4219 | <!-- voice-ignore-line -->
| [A critique of the asset pricing theory's tests Part I: On past and potential testability of the theory](cards/roll-1977-a-critique-of-the-asset.md) | Richard W. Roll | 1977 | 4090 | <!-- voice-ignore-line -->
| [Finance, entrepreneurship and growth](cards/king-1993-finance-entrepreneurship-and-growth.md) | Robert G. King and others | 1993 | 4059 | <!-- voice-ignore-line -->
| [Diversification's effect on firm value](cards/berger-1995-diversification-s-effect-on-firm.md) | Philip G. Berger and others | 1995 | 3689 | <!-- voice-ignore-line -->
| [SECURITY PRICES, RISK, AND MAXIMAL GAINS FROM DIVERSIFICATION](cards/lintner-1965-security-prices-risk-and-maximal.md) | John Lintner | 1965 | 3620 | <!-- voice-ignore-line -->
| [Linking two dimensions of entrepreneurial orientation to firm performance](cards/lumpkin-2001-linking-two-dimensions-of-entrepreneurial.md) | G. T. Lumpkin and others | 2001 | 3598 | <!-- voice-ignore-line -->
| [INTERNATIONAL DIVERSIFICATION: EFFECTS ON INNOVATION AND FIRM PERFORMANCE IN PRODUCT-DIVERSIFIED FIRMS.](cards/hitt-1997-international-diversification-effects-on-innovation.md) | Michael A. Hitt and others | 1997 | 3444 | <!-- voice-ignore-line -->
| [Risk Reduction as a Managerial Motive for Conglomerate Mergers](cards/amihud-1981-risk-reduction-as-a-managerial.md) | Yakov Amihud and others | 1981 | 3421 | <!-- voice-ignore-line -->
| [Predicting Excess Stock Returns Out of Sample: Can Anything Beat the Historical Average?](cards/campbell-2007-predicting-excess-stock-returns-out.md) | John Y. Campbell and others | 2007 | 3288 | <!-- voice-ignore-line -->
| [The dynamics of product innovation and firm competences](cards/danneels-2002-the-dynamics-of-product-innovation.md) | Erwin Danneels | 2002 | 3138 | <!-- voice-ignore-line -->
| [Accounting Information, Disclosure, and the Cost of Capital](cards/lambert-2007-accounting-information-disclosure-and-the.md) | Richard A. Lambert and others | 2007 | 2989 | <!-- voice-ignore-line -->
| [Tobin's q, Corporate Diversification, and Firm Performance](cards/stulz-1994-tobin-s-q-corporate-diversification.md) | René M. Stulz | 1994 | 2966 | <!-- voice-ignore-line -->
| [Is Group Affiliation Profitable in Emerging Markets? An Analysis of Diversified Indian Business Groups](cards/khanna-2000-is-group-affiliation-profitable-in.md) | Tarun Khanna and others | 2000 | 2906 | <!-- voice-ignore-line -->
| [Have Individual Stocks Become More Volatile? An Empirical Exploration of Idiosyncratic Risk](cards/campbell-2001-have-individual-stocks-become-more.md) | John Y. Campbell and others | 2001 | 2890 | <!-- voice-ignore-line -->
| [The capital asset pricing model: Some empirical tests](cards/black-nd-the-capital-asset-pricing-model.md) | Fischer Black and others | None | 2815 | <!-- voice-ignore-line -->
| [A Test of the Efficiency of a Given Portfolio](cards/gibbons-1989-a-test-of-the-efficiency.md) | Michael R. Gibbons and others | 1989 | 2737 | <!-- voice-ignore-line -->
| [Financial Literacy among the Young](cards/lusardi-2010-financial-literacy-among-the-young.md) | Annamaria Lusardi and others | 2010 | 2645 | <!-- voice-ignore-line -->
| [Towards an economic theory of the multiproduct firm](cards/teece-1982-towards-an-economic-theory-of.md) | David J. Teece | 1982 | 2618 | <!-- voice-ignore-line -->
| [Economic development as self-discovery](cards/hausmann-2003-economic-development-as-self-discovery.md) | Ricardo Hausmann and others | 2003 | 2543 | <!-- voice-ignore-line -->
| [Global Portfolio Optimization](cards/black-1992-global-portfolio-optimization.md) | Fischer Black and others | 1992 | 2332 | <!-- voice-ignore-line -->
| [Lifetime Portfolio Selection By Dynamic Stochastic Programming](cards/samuelson-1969-lifetime-portfolio-selection-by-dynamic.md) | Paul Anthony Samuelson | 1969 | 2280 | <!-- voice-ignore-line -->
| [Network relationships and the internationalisation process of small software firms](cards/coviello-1997-network-relationships-and-the-internationalisation.md) | Nicole E. Coviello and others | 1997 | 2179 | <!-- voice-ignore-line -->
| [Correlation and Dependence in Risk Management: Properties and Pitfalls](cards/embrechts-2002-correlation-and-dependence-in-risk.md) | Paul Embrechts and others | 2002 | 2155 | <!-- voice-ignore-line -->
| [International Asset Allocation With Regime Shifts](cards/ang-2002-international-asset-allocation-with-regime.md) | Andrew Ang and others | 2002 | 2062 | <!-- voice-ignore-line -->
| [Stages of Diversification](cards/imbs-2003-stages-of-diversification.md) | Jean M. Imbs and others | 2003 | 2043 | <!-- voice-ignore-line -->
| [The determinants of cross-border equity flows](cards/portes-2004-the-determinants-of-cross-border.md) | Richard D. Portes and others | 2004 | 2032 | <!-- voice-ignore-line -->
| [Emerging equity market volatility](cards/bekaert-1997-emerging-equity-market-volatility.md) | Geert Bekaert and others | 1997 | 2032 | <!-- voice-ignore-line -->
| [The determinants of corporate board size and composition: An empirical analysis](cards/boone-2007-the-determinants-of-corporate-board.md) | Audra L. Boone and others | 2007 | 2016 | <!-- voice-ignore-line -->
| [The Cost of Diversity: The Diversification Discount and Inefficient Investment](cards/rajan-2000-the-cost-of-diversity-the.md) | Raghuram G. Rajan and others | 2000 | 2014 | <!-- voice-ignore-line -->
| [Asset allocation: Management style and performance measurement](cards/sharpe-1992-asset-allocation-management-style-and.md) | William F. Sharpe | 1992 | 1967 | <!-- voice-ignore-line -->
| [Strategic Asset Allocation: Portfolio Choice for Long-Term Investors](cards/campbell-2002-strategic-asset-allocation-portfolio-choice.md) | John Y. Campbell and others | 2002 | 1961 | <!-- voice-ignore-line -->
| [Improved estimation of the covariance matrix of stock returns with an application to portfolio selection](cards/ledoit-2003-improved-estimation-of-the-covariance.md) | Olivier Ledoit and others | 2003 | 1914 | <!-- voice-ignore-line -->
| [Understanding corporate coherence](cards/teece-1994-understanding-corporate-coherence.md) | David J. Teece and others | 1994 | 1879 | <!-- voice-ignore-line -->
| [Naive Diversification Strategies in Defined Contribution Saving Plans](cards/benartzi-2001-naive-diversification-strategies-in-defined.md) | Shlomo Benartzi and others | 2001 | 1875 | <!-- voice-ignore-line -->
| [Maxing out: Stocks as lotteries and the cross-section of expected returns](cards/bali-2010-maxing-out-stocks-as-lotteries.md) | Turan G. Bali and others | 2010 | 1867 | <!-- voice-ignore-line -->
| [BEYOND DICHOTOMY: THE CURVILINEAR RELATIONSHIP BETWEEN SOCIAL RESPONSIBILITY AND FINANCIAL PERFORMANCE](cards/barnett-2006-beyond-dichotomy-the-curvilinear-relationship.md) | Michael L. Barnett and others | 2006 | 1827 | <!-- voice-ignore-line -->
| [Follow the Leader: Mimetic Isomorphism and Entry Into New Markets](cards/haveman-1993-follow-the-leader-mimetic-isomorphism.md) | Heather A. Haveman | 1993 | 1820 | <!-- voice-ignore-line -->
| [Risk Reduction in Large Portfolios: Why Imposing the Wrong Constraints Helps](cards/jagannathan-2003-risk-reduction-in-large-portfolios.md) | Ravi Jagannathan and others | 2003 | 1812 | <!-- voice-ignore-line -->
| [Mean-Absolute Deviation Portfolio Optimization Model and Its Applications to Tokyo Stock Market](cards/konno-1991-mean-absolute-deviation-portfolio-optimization.md) | Hiroshi Konno and others | 1991 | 1802 | <!-- voice-ignore-line -->
| [Diversification strategy and profitability](cards/rumelt-1982-diversification-strategy-and-profitability.md) | Richard P. Rumelt | 1982 | 1787 | <!-- voice-ignore-line -->
| [Diversification strategy, profit performance and the entropy measure](cards/palepu-1985-diversification-strategy-profit-performance-and.md) | Krishna G. Palepu | 1985 | 1786 | <!-- voice-ignore-line -->
| [International Portfolio Choice and Corporation Finance: A Synthesis](cards/adler-1983-international-portfolio-choice-and-corporation.md) | MICHAEL ADLER and others | 1983 | 1760 | <!-- voice-ignore-line -->
| [Research, Innovation And Productivi[Ty: An Econometric Analysis At The Firm Level](cards/crepon-1998-research-innovation-and-productivi-ty.md) | Bruno Crépon and others | 1998 | 1753 | <!-- voice-ignore-line -->
| [Consumption and Portfolio Choice over the Life Cycle](cards/cocco-2005-consumption-and-portfolio-choice-over.md) | João F. Cocco and others | 2005 | 1744 | <!-- voice-ignore-line -->
| [Was Prometheus Unbound by Chance? Risk, Diversification, and Growth](cards/acemoglu-1997-was-prometheus-unbound-by-chance.md) | Daron Acemoğlu and others | 1997 | 1739 | <!-- voice-ignore-line -->
| [Environmental, Social and Governance (ESG) Scores and Financial Performance of Multilatinas: Moderating Effects of Geographic International Diversification and Financial Slack](cards/grisales-2019-environmental-social-and-governance-esg.md) | Eduardo Alexander Duque Grisales and others | 2019 | 1723 | <!-- voice-ignore-line -->
| [Estimating the performance effects of business groups in emerging markets](cards/khanna-2000-estimating-the-performance-effects-of.md) | Tarun Khanna and others | 2000 | 1720 | <!-- voice-ignore-line -->
| [The Atlas of Economic Complexity: Mapping Paths to Prosperity](cards/hausmann-2014-the-atlas-of-economic-complexity.md) | Ricardo Hausmann and others | 2014 | 1718 | <!-- voice-ignore-line -->
| [Determinants of weaknesses in internal control over financial reporting](cards/doyle-2007-determinants-of-weaknesses-in-internal.md) | Jeffrey T. Doyle and others | 2007 | 1671 | <!-- voice-ignore-line -->
| [Explaining the Diversification Discount](cards/campa-2002-explaining-the-diversification-discount.md) | José Manuel Campa and others | 2002 | 1621 | <!-- voice-ignore-line -->
| [THE FUTURE OF BUSINESS GROUPS IN EMERGING MARKETS: LONG-RUN EVIDENCE FROM CHILE.](cards/khanna-2000-the-future-of-business-groups.md) | Tarun Khanna and others | 2000 | 1621 | <!-- voice-ignore-line -->
| [INTERNATIONAL DIVERSIFICATION AND FIRM PERFORMANCE: THE S-CURVE HYPOTHESIS.](cards/lu-2004-international-diversification-and-firm-performance.md) | Jane Wenzhen Lu and others | 2004 | 1599 | <!-- voice-ignore-line -->
| [Arbitrage, Factor Structure, and Mean-Variance Analysis on Large Asset Markets](cards/chamberlain-1983-arbitrage-factor-structure-and-mean.md) | Gary Chamberlain and others | 1983 | 1599 | <!-- voice-ignore-line -->
| [Agency Cost of Free Cash Flow, Corporate Finance, and Takeovers](cards/jensen-1999-agency-cost-of-free-cash.md) | Michael C. Jensen | 1999 | 1556 | <!-- voice-ignore-line -->
| [Out-of-sample tests of forecasting accuracy: an analysis and review](cards/tashman-2000-out-of-sample-tests-of.md) | Leonard J. Tashman | 2000 | 1552 | <!-- voice-ignore-line -->
| [Income Risk, Coping Strategies, and Safety Nets](cards/dercon-2002-income-risk-coping-strategies-and.md) | Stefan Dercon | 2002 | 1526 | <!-- voice-ignore-line -->
| [Do firms in clusters innovate more?](cards/baptista-1998-do-firms-in-clusters-innovate.md) | Rui Baptista and others | 1998 | 1502 | <!-- voice-ignore-line -->
| [Agency Problems, Equity Ownership, and Corporate Diversification](cards/denis-1997-agency-problems-equity-ownership-and.md) | David J. Denis and others | 1997 | 1493 | <!-- voice-ignore-line -->

<a id="derivatives"></a>

## Derivatives

| Paper | First author | Year | Cites |
|---|---|---|---|
| [The Pricing of Options and Corporate Liabilities](cards/black-1973-the-pricing-of-options-and.md) | Fischer Black and others | 1973 | 35105 | <!-- voice-ignore-line -->
| [A Closed-Form Solution for Options with Stochastic Volatility with Applications to Bond and Currency Options](cards/heston-1993-a-closed-form-solution-for.md) | Steven L. Heston | 1993 | 10424 | <!-- voice-ignore-line -->
| [Theory of Rational Option Pricing](cards/merton-1973-theory-of-rational-option-pricing.md) | Robert C. Merton | 1973 | 10423 | <!-- voice-ignore-line -->
| [A Theory of the Term Structure of Interest Rates](cards/cox-1985-a-theory-of-the-term.md) | John C. Cox and others | 1985 | 9593 | <!-- voice-ignore-line -->
| [Option pricing: A simplified approach](cards/cox-1979-option-pricing-a-simplified-approach.md) | John C. Cox and others | 1979 | 7518 | <!-- voice-ignore-line -->
| [Option pricing when underlying stock returns are discontinuous](cards/merton-1976-option-pricing-when-underlying-stock.md) | Robert C. Merton | 1976 | 7025 | <!-- voice-ignore-line -->
| [The Pricing of Options on Assets with Stochastic Volatilities](cards/hull-1987-the-pricing-of-options-on.md) | John C. Hull and others | 1987 | 4960 | <!-- voice-ignore-line -->
| [Modeling and Forecasting Realized Volatility](cards/andersen-2003-modeling-and-forecasting-realized-volatility.md) | Torben G. Andersen and others | 2003 | 4449 | <!-- voice-ignore-line -->
| [Martingales and arbitrage in multiperiod securities markets](cards/harrison-1979-martingales-and-arbitrage-in-multiperiod.md) | J. Michael Harrison and others | 1979 | 4258 | <!-- voice-ignore-line -->
| [Valuing American Options by Simulation: A Simple Least-Squares Approach](cards/longstaff-2001-valuing-american-options-by-simulation.md) | Francis A. Longstaff and others | 2001 | 3958 | <!-- voice-ignore-line -->
| [Answering the Skeptics: Yes, Standard Volatility Models do Provide Accurate Forecasts](cards/andersen-1998-answering-the-skeptics-yes-standard.md) | Torben G. Andersen and others | 1998 | 3919 | <!-- voice-ignore-line -->
| [Bond Pricing and the Term Structure of Interest Rates: A New Methodology for Contingent Claims Valuation](cards/heath-1992-bond-pricing-and-the-term.md) | David Heath and others | 1992 | 3624 | <!-- voice-ignore-line -->
| [The pricing of commodity contracts](cards/black-1976-the-pricing-of-commodity-contracts.md) | Fischer Black | 1976 | 3335 | <!-- voice-ignore-line -->
| [Transform Analysis and Asset Pricing for Affine Jump-diffusions](cards/duffie-2000-transform-analysis-and-asset-pricing.md) | Darrell Duffie and others | 2000 | 3317 | <!-- voice-ignore-line -->
| [Martingales and stochastic integrals in the theory of continuous trading](cards/harrison-1981-martingales-and-stochastic-integrals-in.md) | J. Michael Harrison and others | 1981 | 3254 | <!-- voice-ignore-line -->
| [VALUING CORPORATE SECURITIES: SOME EFFECTS OF BOND INDENTURE PROVISIONS](cards/black-1976-valuing-corporate-securities-some-effects.md) | Fischer Black and others | 1976 | 2948 | <!-- voice-ignore-line -->
| [Empirical Performance of Alternative Option Pricing Models](cards/bakshi-1997-empirical-performance-of-alternative-option.md) | Gurdip Bakshi and others | 1997 | 2898 | <!-- voice-ignore-line -->
| [Modeling Term Structures of Defaultable Bonds](cards/duffie-1999-modeling-term-structures-of-defaultable.md) | Darrell Duffie and others | 1999 | 2884 | <!-- voice-ignore-line -->
| [A YIELD‐FACTOR MODEL OF INTEREST RATES](cards/duffie-1996-a-yieldfactor-model-of-interest.md) | Darrell Duffie and others | 1996 | 2748 | <!-- voice-ignore-line -->
| [Prices of State-Contingent Claims Implicit in Option Prices](cards/breeden-1978-prices-of-state-contingent-claims.md) | Douglas T. Breeden and others | 1978 | 2691 | <!-- voice-ignore-line -->
| [Stochastic Volatility: Likelihood Inference and Comparison with ARCH Models](cards/kim-1998-stochastic-volatility-likelihood-inference-and.md) | Sang‐Joon Kim and others | 1998 | 2681 | <!-- voice-ignore-line -->
| [Monetary policy surprises and interest rates: Evidence from the Fed funds futures market](cards/kuttner-2001-monetary-policy-surprises-and-interest.md) | Kenneth N. Kuttner | 2001 | 2646 | <!-- voice-ignore-line -->
| [Jumps and Stochastic Volatility: Exchange Rate Processes Implicit in Deutsche Mark Options](cards/bates-1996-jumps-and-stochastic-volatility-exchange.md) | David S. Bates | 1996 | 2636 | <!-- voice-ignore-line -->
| [Financial Modelling with Jump Processes](cards/tankov-2003-financial-modelling-with-jump-processes.md) | Peter Tankov | 2003 | 2587 | <!-- voice-ignore-line -->
| [Pricing Interest-Rate-Derivative Securities](cards/hull-1990-pricing-interest-rate-derivative-securities.md) | John C. Hull and others | 1990 | 2568 | <!-- voice-ignore-line -->
| [Econometric Analysis of Realized Volatility and its Use in Estimating Stochastic Volatility Models](cards/nielsen-2002-econometric-analysis-of-realized-volatility.md) | Ole Eiler Barndorff-Nielsen and others | 2002 | 2559 | <!-- voice-ignore-line -->
| [The Stochastic Behavior of Commodity Prices: Implications for Valuation and Hedging](cards/schwartz-1997-the-stochastic-behavior-of-commodity.md) | Eduardo S. Schwartz | 1997 | 2501 | <!-- voice-ignore-line -->
| [Pricing Derivatives on Financial Securities Subject to Credit Risk](cards/jarrow-1995-pricing-derivatives-on-financial-securities.md) | Robert A. Jarrow and others | 1995 | 2456 | <!-- voice-ignore-line -->
| [Stock Returns and the Term Structure](cards/campbell-1985-stock-returns-and-the-term.md) | John Y. Campbell | 1985 | 2404 | <!-- voice-ignore-line -->
| [An Intertemporal General Equilibrium Model of Asset Prices](cards/cox-1985-an-intertemporal-general-equilibrium-model.md) | John C. Cox and others | 1985 | 2302 | <!-- voice-ignore-line -->
| [A Jump-Diffusion Model for Option Pricing](cards/kou-2002-a-jump-diffusion-model-for.md) | Steven Kou | 2002 | 2285 | <!-- voice-ignore-line -->
| [Non-Gaussian Ornstein–Uhlenbeck-based Models and Some of Their Uses in Financial Economics](cards/nielsen-2001-non-gaussian-ornsteinuhlenbeck-based-models.md) | Ole Eiler Barndorff-Nielsen and others | 2001 | 2250 | <!-- voice-ignore-line -->
| [Power and Bipower Variation with Stochastic Volatility and Jumps](cards/nielsen-2004-power-and-bipower-variation-with.md) | Ole Eiler Barndorff-Nielsen | 2004 | 2233 | <!-- voice-ignore-line -->
| [Default Risk in Equity Returns](cards/vassalou-2004-default-risk-in-equity-returns.md) | Maria Vassalou and others | 2004 | 2223 | <!-- voice-ignore-line -->
| [Why Has U.S. Inflation Become Harder to Forecast?](cards/stock-2007-why-has-u-s-inflation.md) | James H. Stock and others | 2007 | 2140 | <!-- voice-ignore-line -->
| [Copula Methods in Finance](cards/cherubini-2004-copula-methods-in-finance.md) | Umberto Cherubini and others | 2004 | 2050 | <!-- voice-ignore-line -->
| [The Variance Gamma Process and Option Pricing](cards/madan-1998-the-variance-gamma-process-and.md) | Dilip B. Madan and others | 1998 | 2049 | <!-- voice-ignore-line -->
| [Constructing a Market, Performing Theory: The Historical Sociology of a Financial Derivatives Exchange](cards/mackenzie-2003-constructing-a-market-performing-theory.md) | Donald A. MacKenzie and others | 2003 | 2011 | <!-- voice-ignore-line -->
| [Stock Price Distributions with Stochastic Volatility: An Analytic Approach](cards/stein-1991-stock-price-distributions-with-stochastic.md) | Elias M. Stein and others | 1991 | 1812 | <!-- voice-ignore-line -->
| [The Valuation of Uncertain Income Streams and the Pricing of Options](cards/rubinstein-1976-the-valuation-of-uncertain-income.md) | Mark Rubinstein | 1976 | 1766 | <!-- voice-ignore-line -->
| [The jump-risk premia implicit in options: evidence from an integrated time-series study](cards/pan-2002-the-jump-risk-premia-implicit.md) | Jun Pan | 2002 | 1753 | <!-- voice-ignore-line -->
| [Term Structure Movements and Pricing Interest Rate Contingent Claims](cards/ho-1986-term-structure-movements-and-pricing.md) | Thomas S. Y. Ho and others | 1986 | 1664 | <!-- voice-ignore-line -->
| [The Impact of Jumps in Volatility and Returns](cards/eraker-2003-the-impact-of-jumps-in.md) | Bjørn Eraker and others | 2003 | 1652 | <!-- voice-ignore-line -->
| [The Price Variability-Volume Relationship on Speculative Markets](cards/tauchen-1983-the-price-variability-volume-relationship.md) | George E. Tauchen and others | 1983 | 1652 | <!-- voice-ignore-line -->
| [Forecasting Volatility in Financial Markets: A Review](cards/poon-2003-forecasting-volatility-in-financial-markets.md) | Ser‐Huang Poon and others | 2003 | 1617 | <!-- voice-ignore-line -->
| [Assessing the Probability of Bankruptcy](cards/hillegeist-2004-assessing-the-probability-of-bankruptcy.md) | Stephen A. Hillegeist and others | 2004 | 1585 | <!-- voice-ignore-line -->
| [Post-'87 crash fears in the S&P 500 futures option market](cards/bates-2000-post-87-crash-fears-in.md) | David S. Bates | 2000 | 1555 | <!-- voice-ignore-line -->
| [Lévy Processes in Finance: Pricing Financial Derivatives](cards/schoutens-2003-levy-processes-in-finance-pricing.md) | Wim Schoutens | 2003 | 1541 | <!-- voice-ignore-line -->
| [Unit-Root Tests and Asymmetric Adjustment With an Example Using the Term Structure of Interest Rates](cards/enders-1998-unit-root-tests-and-asymmetric.md) | Walter Enders and others | 1998 | 1502 | <!-- voice-ignore-line -->
| [The option pricing model and the risk factor of stock](cards/galai-1976-the-option-pricing-model-and.md) | Dan Galai and others | 1976 | 1465 | <!-- voice-ignore-line -->
| [Modeling and pricing long memory in stock market volatility](cards/bollerslev-1996-modeling-and-pricing-long-memory.md) | Tim Bollerslev and others | 1996 | 1435 | <!-- voice-ignore-line -->
| [An Empirical Analysis of the Dynamic Relation between Investment‐Grade Bonds and Credit Default Swaps](cards/blanco-2005-an-empirical-analysis-of-the.md) | Roberto Blanco and others | 2005 | 1431 | <!-- voice-ignore-line -->
| [Implied Volatility Functions: Empirical Tests](cards/dumas-1998-implied-volatility-functions-empirical-tests.md) | Bernard Dumas and others | 1998 | 1418 | <!-- voice-ignore-line -->
| [Risk, Uncertainty and Monetary Policy](cards/bekaert-2011-risk-uncertainty-and-monetary-policy.md) | Geert Bekaert and others | 2011 | 1363 | <!-- voice-ignore-line -->
| [Range‐Based Estimation of Stochastic Volatility Models](cards/alizadeh-2002-rangebased-estimation-of-stochastic-volatility.md) | Sassan Alizadeh and others | 2002 | 1359 | <!-- voice-ignore-line -->
| [Bayesian Analysis of Stochastic Volatility Models](cards/jacquier-1994-bayesian-analysis-of-stochastic-volatility.md) | Éric Jacquier and others | 1994 | 1344 | <!-- voice-ignore-line -->
| [On cox processes and credit risky securities](cards/lando-1998-on-cox-processes-and-credit.md) | David Lando | 1998 | 1340 | <!-- voice-ignore-line -->
| [Commodity Futures Prices: Some Evidence on Forecast Power, Premiums, and the Theory of Storage](cards/fama-1987-commodity-futures-prices-some-evidence.md) | Eugene F. Fama and others | 1987 | 1323 | <!-- voice-ignore-line -->
| [The relation between implied and realized volatility](cards/christensen-1998-the-relation-between-implied-and.md) | Bent Jesper Christensen and others | 1998 | 1313 | <!-- voice-ignore-line -->
| [Short-Term Variations and Long-Term Dynamics in Commodity Prices](cards/schwartz-2000-short-term-variations-and-long.md) | Eduardo S. Schwartz and others | 2000 | 1312 | <!-- voice-ignore-line -->
| [The relationship between credit default swap spreads, bond yields, and credit rating announcements](cards/hull-2004-the-relationship-between-credit-default.md) | John C. Hull and others | 2004 | 1307 | <!-- voice-ignore-line -->
| [The Market Model of Interest Rate Dynamics](cards/brace-1997-the-market-model-of-interest.md) | Alan Brace and others | 1997 | 1305 | <!-- voice-ignore-line -->
| [The valuation of compound options](cards/geske-1979-the-valuation-of-compound-options.md) | Robert L. Geske | 1979 | 1285 | <!-- voice-ignore-line -->
| [Economic uncertainty before and during the COVID-19 pandemic](cards/altig-2020-economic-uncertainty-before-and-during.md) | Dave Altig and others | 2020 | 1284 | <!-- voice-ignore-line -->
| [THE GARCH OPTION PRICING MODEL](cards/duan-1995-the-garch-option-pricing-model.md) | Jin‐Chuan Duan | 1995 | 1269 | <!-- voice-ignore-line -->
| [Target Zones and Exchange Rate Dynamics](cards/krugman-1991-target-zones-and-exchange-rate.md) | Paúl Krugman | 1991 | 1268 | <!-- voice-ignore-line -->
| [Efficient Analytic Approximation of American Option Values](cards/baroneadesi-1987-efficient-analytic-approximation-of-american.md) | Giovanni Barone‐Adesi and others | 1987 | 1264 | <!-- voice-ignore-line -->

<a id="microstructure"></a>

## Market Microstructure

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Continuous Auctions and Insider Trading](cards/kyle-1985-continuous-auctions-and-insider-trading.md) | Albert S. Kyle | 1985 | 11111 | <!-- voice-ignore-line -->
| [Bid, ask and transaction prices in a specialist market with heterogeneously informed traders](cards/glosten-1985-bid-ask-and-transaction-prices.md) | Lawrence R. Glosten and others | 1985 | 7093 | <!-- voice-ignore-line -->
| [Market Liquidity and Funding Liquidity](cards/brunnermeier-2008-market-liquidity-and-funding-liquidity.md) | Markus Konrad Brunnermeier and others | 2008 | 6173 | <!-- voice-ignore-line -->
| [Asset pricing and the bid-ask spread](cards/amihud-1986-asset-pricing-and-the-bid.md) | Yakov Amihud and others | 1986 | 5907 | <!-- voice-ignore-line -->
| [Liquidity Risk and Expected Stock Returns](cards/pastor-2003-liquidity-risk-and-expected-stock.md) | Ľuboš Pástor and others | 2003 | 5839 | <!-- voice-ignore-line -->
| [ARCH modeling in finance](cards/bollerslev-1992-arch-modeling-in-finance.md) | Tim Bollerslev and others | 1992 | 5210 | <!-- voice-ignore-line -->
| [Disclosure, Liquidity, and the Cost of Capital](cards/diamond-1991-disclosure-liquidity-and-the-cost.md) | Douglas W. Diamond and others | 1991 | 4562 | <!-- voice-ignore-line -->
| [Information and the Cost of Capital](cards/easley-2004-information-and-the-cost-of.md) | David A. Easley and others | 2004 | 3501 | <!-- voice-ignore-line -->
| [A Simple Implicit Measure of the Effective Bid-Ask Spread in an Efficient Market](cards/roll-1984-a-simple-implicit-measure-of.md) | Richard W. Roll | 1984 | 3335 | <!-- voice-ignore-line -->
| [The Economic Consequences of Increased Disclosure](cards/leuz-2000-the-economic-consequences-of-increased.md) | Christian Leuz and others | 2000 | 3319 | <!-- voice-ignore-line -->
| [Mandatory IFRS Reporting around the World: Early Evidence on the Economic Consequences](cards/daske-2008-mandatory-ifrs-reporting-around-the.md) | Holger Daske and others | 2008 | 2677 | <!-- voice-ignore-line -->
| [Price, trade size, and information in securities markets](cards/easley-1987-price-trade-size-and-information.md) | David A. Easley and others | 1987 | 2405 | <!-- voice-ignore-line -->
| [Corporate Yield Spreads: Default Risk or Liquidity? New Evidence from the Credit Default Swap Market](cards/longstaff-2004-corporate-yield-spreads-default-risk.md) | Francis A. Longstaff and others | 2004 | 2314 | <!-- voice-ignore-line -->
| [Information Effects on the Bid-Ask Spread](cards/copeland-1983-information-effects-on-the-bid.md) | Thomas E. Copeland and others | 1983 | 2240 | <!-- voice-ignore-line -->
| [Measuring the Information Content of Stock Trades](cards/hasbrouck-1991-measuring-the-information-content-of.md) | Joel Hasbrouck | 1991 | 2085 | <!-- voice-ignore-line -->
| [The Geography of Investment: Informed Trading and Asset Prices](cards/coval-2001-the-geography-of-investment-informed.md) | Joshua D. Coval and others | 2001 | 2033 | <!-- voice-ignore-line -->
| [Is Information Risk a Determinant of Asset Returns?](cards/easley-2002-is-information-risk-a-determinant.md) | David A. Easley and others | 2002 | 1970 | <!-- voice-ignore-line -->
| [Market liquidity and volume around earnings announcements](cards/kim-1994-market-liquidity-and-volume-around.md) | Oliver Kim and others | 1994 | 1970 | <!-- voice-ignore-line -->
| [Market Liquidity and Performance Monitoring](cards/holmstrom-1993-market-liquidity-and-performance-monitoring.md) | Bengt R. Holmstrom and others | 1993 | 1935 | <!-- voice-ignore-line -->
| [Fads, Martingales, and Market Efficiency](cards/lehmann-1990-fads-martingales-and-market-efficiency.md) | Bruce N. Lehmann | 1990 | 1891 | <!-- voice-ignore-line -->
| [Liquidity and Market Structure](cards/grossman-1988-liquidity-and-market-structure.md) | Sanford J. Grossman and others | 1988 | 1875 | <!-- voice-ignore-line -->
| [Commonality in liquidity](cards/chordia-2000-commonality-in-liquidity.md) | Tarun Chordia and others | 2000 | 1869 | <!-- voice-ignore-line -->
| [Market microstructure theory](cards/ohara-1995-market-microstructure-theory.md) | Maureen O’Hara | 1995 | 1853 | <!-- voice-ignore-line -->
| [Does Academic Research Destroy Stock Return Predictability?](cards/mclean-2016-does-academic-research-destroy-stock.md) | R. David McLean and others | 2016 | 1831 | <!-- voice-ignore-line -->
| [Market microstructure and asset pricing: On the compensation for illiquidity in stock returns](cards/brennan-1996-market-microstructure-and-asset-pricing.md) | Michael John Brennan and others | 1996 | 1795 | <!-- voice-ignore-line -->
| [A Tale of Two Time Scales: Determining Integrated Volatility With Noisy High-Frequency Data](cards/zhang-2005-a-tale-of-two-time.md) | Lan Zhang and others | 2005 | 1761 | <!-- voice-ignore-line -->
| [Market Liquidity and Trading Activity](cards/chordia-2001-market-liquidity-and-trading-activity.md) | Tarun Chordia and others | 2001 | 1753 | <!-- voice-ignore-line -->
| [Trading Volume and Serial Correlation in Stock Returns](cards/campbell-1993-trading-volume-and-serial-correlation.md) | John Y. Campbell and others | 1993 | 1750 | <!-- voice-ignore-line -->
| [The Econometrics of Financial Markets](cards/campbell-2012-the-econometrics-of-financial-markets.md) | John Y. Campbell and others | 2012 | 1715 | <!-- voice-ignore-line -->
| [Special Information and Insider Trading](cards/jaffe-1974-special-information-and-insider-trading.md) | Jeffrey F. Jaffe | 1974 | 1642 | <!-- voice-ignore-line -->
| [Large Shareholders as Monitors: Is There a Trade‐Off between Liquidity and Control?](cards/maug-1998-large-shareholders-as-monitors-is.md) | Ernst G. Maug | 1998 | 1591 | <!-- voice-ignore-line -->
| [Do liquidity measures measure liquidity?☆](cards/goyenko-2009-do-liquidity-measures-measure-liquidity.md) | Ruslan Y. Goyenko and others | 2009 | 1583 | <!-- voice-ignore-line -->
| [Insiders' profits, costs of trading, and market efficiency](cards/seyhun-1986-insiders-profits-costs-of-trading.md) | H. Nejat Seyhun | 1986 | 1578 | <!-- voice-ignore-line -->
| [Price Informativeness and Investment Sensitivity to Stock Price](cards/chen-2006-price-informativeness-and-investment-sensitivity.md) | Qi Chen and others | 2006 | 1561 | <!-- voice-ignore-line -->
| [Intraday periodicity and volatility persistence in financial markets](cards/andersen-1997-intraday-periodicity-and-volatility-persistence.md) | Torben G. Andersen and others | 1997 | 1508 | <!-- voice-ignore-line -->
| [Market liquidity as a sentiment indicator](cards/baker-2004-market-liquidity-as-a-sentiment.md) | Malcolm P. Baker and others | 2004 | 1457 | <!-- voice-ignore-line -->
| [The World Price of Insider Trading](cards/bhattacharya-2000-the-world-price-of-insider.md) | Utpal Bhattacharya and others | 2000 | 1427 | <!-- voice-ignore-line -->
| [Contagion in financial networks](cards/gai-2010-contagion-in-financial-networks.md) | Prasanna Gai and others | 2010 | 1396 | <!-- voice-ignore-line -->
| [Realized Variance and Market Microstructure Noise](cards/hansen-2006-realized-variance-and-market-microstructure.md) | Peter Reinhard Hansen and others | 2006 | 1389 | <!-- voice-ignore-line -->
| [Market microstructure: A survey](cards/madhavan-2000-market-microstructure-a-survey.md) | Ananth Madhavan | 2000 | 1376 | <!-- voice-ignore-line -->
| [Determinants of market reactions to restatement announcements](cards/palmrose-2003-determinants-of-market-reactions-to.md) | Zoe‐Vonna Palmrose and others | 2003 | 1375 | <!-- voice-ignore-line -->
| [Disclosure Policy, Information Asymmetry, and Liquidity in Equity Markets](cards/welker-1995-disclosure-policy-information-asymmetry-and.md) | Michael Welker | 1995 | 1371 | <!-- voice-ignore-line -->
| [High-Frequency Trading and Price Discovery](cards/brogaard-2014-high-frequency-trading-and-price.md) | Jonathan Brogaard and others | 2014 | 1343 | <!-- voice-ignore-line -->
| [Corporate disclosures by family firms](cards/ali-2007-corporate-disclosures-by-family-firms.md) | Ashiq Ali and others | 2007 | 1334 | <!-- voice-ignore-line -->
| [Liquidity and Expected Returns: Lessons from Emerging Markets](cards/bekaert-2007-liquidity-and-expected-returns-lessons.md) | Geert Bekaert and others | 2007 | 1315 | <!-- voice-ignore-line -->
| [Order Flow and Exchange Rate Dynamics](cards/evans-2002-order-flow-and-exchange-rate.md) | Martin D.D. Evans and others | 2002 | 1299 | <!-- voice-ignore-line -->
| [An Empirical Analysis of the Limit Order Book and the Order Flow in the Paris Bourse](cards/biais-1995-an-empirical-analysis-of-the.md) | Bruno Biais and others | 1995 | 1266 | <!-- voice-ignore-line -->
| [The Components of the Bid-Ask Spread: A General Approach](cards/huang-1997-the-components-of-the-bid.md) | Roger D. Huang and others | 1997 | 1261 | <!-- voice-ignore-line -->
| [Common factors in prices, order flows, and liquidity](cards/hasbrouck-2001-common-factors-in-prices-order.md) | Joel Hasbrouck and others | 2001 | 1224 | <!-- voice-ignore-line -->
| [Good Timing: CEO Stock Option Awards and Company News Announcements](cards/yermack-1997-good-timing-ceo-stock-option.md) | David Yermack | 1997 | 1214 | <!-- voice-ignore-line -->
| [Does corporate governance matter in competitive industries?](cards/giroud-2009-does-corporate-governance-matter-in.md) | Xavier Giroud and others | 2009 | 1195 | <!-- voice-ignore-line -->
| [The hidden costs of stock market liquidity](cards/bhide-1993-the-hidden-costs-of-stock.md) | Amar Bhidé | 1993 | 1155 | <!-- voice-ignore-line -->
| [Liquidity and Market Efficiency](cards/chordia-2007-liquidity-and-market-efficiency.md) | Tarun Chordia and others | 2007 | 1131 | <!-- voice-ignore-line -->
| [Inferring the Components of the Bid-Ask Spread: Theory and Empirical Tests](cards/stoll-1989-inferring-the-components-of-the.md) | Hans R. Stoll | 1989 | 1124 | <!-- voice-ignore-line -->
| [An Introduction to High-Frequency Finance](cards/gencay-2001-an-introduction-to-high-frequency.md) | Ramazan Gençay and others | 2001 | 1117 | <!-- voice-ignore-line -->
| [Is the Electronic Open Limit Order Book Inevitable?](cards/glosten-1994-is-the-electronic-open-limit.md) | Lawrence R. Glosten | 1994 | 1082 | <!-- voice-ignore-line -->
| [The High-Frequency Trading Arms Race: Frequent Batch Auctions as a Market Design Response](cards/budish-2013-the-high-frequency-trading-arms.md) | Eric B. Budish and others | 2013 | 1070 | <!-- voice-ignore-line -->
| [Does Net Buying Pressure Affect the Shape of Implied Volatility Functions?](cards/bollen-2004-does-net-buying-pressure-affect.md) | Nicolas P. B. Bollen and others | 2004 | 1061 | <!-- voice-ignore-line -->
| [Dealer versus auction markets: A paired comparison of execution costs on NASDAQ and the NYSE](cards/huang-1996-dealer-versus-auction-markets-a.md) | Roger D. Huang and others | 1996 | 1034 | <!-- voice-ignore-line -->
| [HERD BEHAVIOR AND AGGREGATE FLUCTUATIONS IN FINANCIAL MARKETS](cards/cont-2000-herd-behavior-and-aggregate-fluctuations.md) | Rama Cont and others | 2000 | 1029 | <!-- voice-ignore-line -->
| [Why Do Security Prices Change? A Transaction-Level Analysis of NYSE Stocks](cards/madhavan-1997-why-do-security-prices-change.md) | Ananth Madhavan and others | 1997 | 1029 | <!-- voice-ignore-line -->
| [Direct foreign ownership, institutional investors, and firm characteristics](cards/dahlquist-2001-direct-foreign-ownership-institutional-investors.md) | Magnus Dahlquist | 2001 | 1017 | <!-- voice-ignore-line -->
| [Presidential Address: Asset Price Dynamics with Slow‐Moving Capital](cards/duffie-2010-presidential-address-asset-price-dynamics.md) | Darrell Duffie | 2010 | 1015 | <!-- voice-ignore-line -->
| [Economic News and Bond Prices: Evidence from the U.S. Treasury Market](cards/balduzzi-2001-economic-news-and-bond-prices.md) | Pierluigi Balduzzi and others | 2001 | 1011 | <!-- voice-ignore-line -->
| [Low-Latency Trading](cards/hasbrouck-2011-low-latency-trading.md) | Joel Hasbrouck and others | 2011 | 1008 | <!-- voice-ignore-line -->
| [An Empirical Analysis of Stock and Bond Market Liquidity](cards/chordia-2004-an-empirical-analysis-of-stock.md) | Tarun Chordia and others | 2004 | 984 | <!-- voice-ignore-line -->
| [Dealership market](cards/amihud-1980-dealership-market.md) | Yakov Amihud and others | 1980 | 983 | <!-- voice-ignore-line -->

<a id="behavioral"></a>

## Behavioral Finance

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Prospect Theory: An Analysis of Decision under Risk](cards/kahneman-1979-prospect-theory-an-analysis-of.md) | Daniel J. Kahneman and others | 1979 | 69936 | <!-- voice-ignore-line -->
| [Advances in prospect theory: Cumulative representation of uncertainty](cards/tversky-1992-advances-in-prospect-theory-cumulative.md) | Amos Tversky and others | 1992 | 18861 | <!-- voice-ignore-line -->
| [Does the Stock Market Overreact?](cards/bondt-1985-does-the-stock-market-overreact.md) | Werner F. M. De Bondt and others | 1985 | 9924 | <!-- voice-ignore-line -->
| [Noise Trader Risk in Financial Markets](cards/long-1990-noise-trader-risk-in-financial.md) | J. Bradford De Long and others | 1990 | 7464 | <!-- voice-ignore-line -->
| [Investor Sentiment and the Cross‐Section of Stock Returns](cards/baker-2006-investor-sentiment-and-the-crosssection.md) | Malcolm P. Baker and others | 2006 | 7336 | <!-- voice-ignore-line -->
| [Boys will be Boys: Gender, Overconfidence, and Common Stock Investment](cards/barber-2001-boys-will-be-boys-gender.md) | Brad M. Barber and others | 2001 | 7185 | <!-- voice-ignore-line -->
| [Investor Psychology and Security Market Under‐ and Overreactions](cards/daniel-1998-investor-psychology-and-security-market.md) | Kent Daniel and others | 1998 | 7041 | <!-- voice-ignore-line -->
| [Giving Content to Investor Sentiment: The Role of Media in the Stock Market](cards/tetlock-2007-giving-content-to-investor-sentiment.md) | Paul C. Tetlock | 2007 | 6084 | <!-- voice-ignore-line -->
| [Trading Is Hazardous to Your Wealth: The Common Stock Investment Performance of Individual Investors](cards/barber-2000-trading-is-hazardous-to-your.md) | Brad M. Barber and others | 2000 | 4709 | <!-- voice-ignore-line -->
| [Earnings management to avoid earnings decreases and losses](cards/burgstahler-1997-earnings-management-to-avoid-earnings.md) | David Burgstahler and others | 1997 | 4693 | <!-- voice-ignore-line -->
| [Are Investors Reluctant to Realize Their Losses?](cards/odean-1998-are-investors-reluctant-to-realize.md) | Terrance Odean | 1998 | 4648 | <!-- voice-ignore-line -->
| [CEO Overconfidence and Corporate Investment](cards/malmendier-2005-ceo-overconfidence-and-corporate-investment.md) | Ulrike M. Malmendier and others | 2005 | 4559 | <!-- voice-ignore-line -->
| [The information content of stock markets: why do emerging markets have synchronous stock price movements?](cards/mrck-2000-the-information-content-of-stock.md) | Randall Mørck and others | 2000 | 3555 | <!-- voice-ignore-line -->
| [Who makes acquisitions? CEO overconfidence and the market's reaction☆](cards/malmendier-2008-who-makes-acquisitions-ceo-overconfidence.md) | Ulrike M. Malmendier and others | 2008 | 3386 | <!-- voice-ignore-line -->
| [Myopic Loss Aversion and the Equity Premium Puzzle](cards/benartzi-1995-myopic-loss-aversion-and-the.md) | Shlomo Benartzi and others | 1995 | 3327 | <!-- voice-ignore-line -->
| [From Efficient Markets Theory to Behavioral Finance](cards/shiller-2003-from-efficient-markets-theory-to.md) | Robert J. Shiller | 2003 | 3117 | <!-- voice-ignore-line -->
| [The trouble with overconfidence.](cards/moore-2008-the-trouble-with-overconfidence.md) | Don A. Moore and others | 2008 | 3097 | <!-- voice-ignore-line -->
| [Chapter 18 A survey of behavioral finance](cards/barberis-2003-chapter-18-a-survey-of.md) | Nicholas Barberis and others | 2003 | 3065 | <!-- voice-ignore-line -->
| [Psychology and Economics: Evidence from the Field](cards/dellavigna-2009-psychology-and-economics-evidence-from.md) | Stefano DellaVigna | 2009 | 2980 | <!-- voice-ignore-line -->
| [Do Investors Trade Too Much?](cards/odean-1999-do-investors-trade-too-much.md) | Terrance Odean | 1999 | 2814 | <!-- voice-ignore-line -->
| [Natural resources, education, and economic development](cards/gylfason-2001-natural-resources-education-and-economic.md) | Þorvaldur Gylfason | 2001 | 2687 | <!-- voice-ignore-line -->
| [Overconfidence and Excess Entry: An Experimental Approach](cards/camerer-1999-overconfidence-and-excess-entry-an.md) | Colin F. Camerer and others | 1999 | 2683 | <!-- voice-ignore-line -->
| [Overconfidence and Speculative Bubbles](cards/scheinkman-2003-overconfidence-and-speculative-bubbles.md) | Jose Alexandre Scheinkman and others | 2003 | 2581 | <!-- voice-ignore-line -->
| [Volume, Volatility, Price, and Profit When All Traders Are Above Average](cards/odean-1998-volume-volatility-price-and-profit.md) | Terrance Odean | 1998 | 2508 | <!-- voice-ignore-line -->
| [The Adaptive Markets Hypothesis](cards/lo-2004-the-adaptive-markets-hypothesis.md) | Andrew W. Lo | 2004 | 2454 | <!-- voice-ignore-line -->
| [Momentum Investment Strategies, Portfolio Performance, and Herding: A Study of Mutual Fund Behavior](cards/grinblatt-1995-momentum-investment-strategies-portfolio-performance.md) | Mark S. Grinblatt and others | 1995 | 2384 | <!-- voice-ignore-line -->
| [The impact of institutional trading on stock prices](cards/lakonishok-1992-the-impact-of-institutional-trading.md) | Josef Lakonishok and others | 1992 | 2379 | <!-- voice-ignore-line -->
| [Investor Sentiment and the Closed-End Fund Puzzle](cards/lee-1991-investor-sentiment-and-the-closed.md) | Charles M.C. Lee and others | 1991 | 2187 | <!-- voice-ignore-line -->
| [Prospect Theory and Asset Prices](cards/barberis-2001-prospect-theory-and-asset-prices.md) | Nicholas Barberis and others | 2001 | 2184 | <!-- voice-ignore-line -->
| [A Behavioral Agency Model of Managerial Risk Taking](cards/wiseman-1998-a-behavioral-agency-model-of.md) | Robert M. Wiseman and others | 1998 | 2110 | <!-- voice-ignore-line -->
| [Gender and Corporate Finance: Are Male Executives Overconfident Relative to Female Executives?](cards/huang-2011-gender-and-corporate-finance-are.md) | Jiekun Huang and others | 2011 | 2066 | <!-- voice-ignore-line -->
| [The Noise Trader Approach to Finance](cards/shleifer-1990-the-noise-trader-approach-to.md) | Andrei Shleifer and others | 1990 | 2064 | <!-- voice-ignore-line -->
| [The short of it: Investor sentiment and anomalies](cards/stambaugh-2011-the-short-of-it-investor.md) | Robert F. Stambaugh and others | 2011 | 2049 | <!-- voice-ignore-line -->
| [Thirty Years of Prospect Theory in Economics: A Review and Assessment](cards/barberis-2013-thirty-years-of-prospect-theory.md) | Nicholas Barberis | 2013 | 2034 | <!-- voice-ignore-line -->
| [Overconfidence and Early‐Life Experiences: The Effect of Managerial Traits on Corporate Financial Policies](cards/malmendier-2011-overconfidence-and-earlylife-experiences-the.md) | Ulrike M. Malmendier and others | 2011 | 1970 | <!-- voice-ignore-line -->
| [Mutual Fund Herding and the Impact on Stock Prices](cards/wermers-1999-mutual-fund-herding-and-the.md) | Russ R. Wermers | 1999 | 1933 | <!-- voice-ignore-line -->
| [Decisions from Experience and the Effect of Rare Events in Risky Choice](cards/hertwig-2004-decisions-from-experience-and-the.md) | Ralph Hertwig and others | 2004 | 1904 | <!-- voice-ignore-line -->
| [Understanding customers' repeat purchase intentions in B2C e‐commerce: the roles of utilitarian value, hedonic value and perceived risk](cards/chiu-2012-understanding-customers-repeat-purchase-intentions.md) | Chao‐Min Chiu and others | 2012 | 1858 | <!-- voice-ignore-line -->
| [Herding and Feedback Trading by Institutional and Individual Investors](cards/nofsinger-1999-herding-and-feedback-trading-by.md) | John R. Nofsinger and others | 1999 | 1845 | <!-- voice-ignore-line -->
| [Herd Behavior in Financial Markets](cards/bikhchandani-2000-herd-behavior-in-financial-markets.md) | Sushil Bikhchandani and others | 2000 | 1780 | <!-- voice-ignore-line -->
| [An examination of herd behavior in equity markets: An international perspective](cards/chang-2000-an-examination-of-herd-behavior.md) | Eric Chieh C. Chang and others | 2000 | 1769 | <!-- voice-ignore-line -->
| [Stocks as Lotteries: The Implications of Probability Weighting for Security Prices](cards/barberis-2008-stocks-as-lotteries-the-implications.md) | Nicholas Barberis and others | 2008 | 1764 | <!-- voice-ignore-line -->
| [Variations in R&D Investments of Family and Nonfamily Firms: Behavioral Agency and Myopic Loss Aversion Perspectives](cards/chrisman-2012-variations-in-r-d-investments.md) | James J. Chrisman and others | 2012 | 1736 | <!-- voice-ignore-line -->
| [Why Don’t Issuers Get Upset About Leaving Money on the Table in IPOs?](cards/loughran-2002-why-dont-issuers-get-upset.md) | Tim Loughran and others | 2002 | 1725 | <!-- voice-ignore-line -->
| [Driven to Distraction: Extraneous Events and Underreaction to Earnings News](cards/hirshleifer-2009-driven-to-distraction-extraneous-events.md) | David A. Hirshleifer and others | 2009 | 1721 | <!-- voice-ignore-line -->
| [Investor attention, overconfidence and category learning](cards/peng-2006-investor-attention-overconfidence-and-category.md) | Lin Peng and others | 2006 | 1685 | <!-- voice-ignore-line -->
| [Rational herding in financial economics](cards/devenow-1996-rational-herding-in-financial-economics.md) | Andrea Devenow and others | 1996 | 1674 | <!-- voice-ignore-line -->
| [Retail Investor Sentiment and Return Comovements](cards/kumar-2006-retail-investor-sentiment-and-return.md) | Alok Kumar and others | 2006 | 1670 | <!-- voice-ignore-line -->
| [A model of investor sentiment /](cards/barberis-1997-a-model-of-investor-sentiment.md) | Nicholas Barberis and others | 1997 | 1665 | <!-- voice-ignore-line -->
| [Investor sentiment and the near-term stock market](cards/brown-2003-investor-sentiment-and-the-near.md) | Gregory W. Brown and others | 2003 | 1657 | <!-- voice-ignore-line -->
| [Prospect Theory: For Risk and Ambiguity](cards/wakker-2010-prospect-theory-for-risk-and.md) | Peter P. Wakker | 2010 | 1635 | <!-- voice-ignore-line -->
| [Investor Sentiment in the Stock Market](cards/baker-2007-investor-sentiment-in-the-stock.md) | Malcolm P. Baker and others | 2007 | 1612 | <!-- voice-ignore-line -->
| [The Sum of All FEARS Investor Sentiment and Asset Prices](cards/da-2014-the-sum-of-all-fears.md) | Zhi Da and others | 2014 | 1609 | <!-- voice-ignore-line -->
| [Inefficient Markets: An Introduction to Behavioral Finance](cards/shleifer-2000-inefficient-markets-an-introduction-to.md) | Andrei Shleifer | 2000 | 1597 | <!-- voice-ignore-line -->
| [Salience Theory of Choice Under Risk](cards/bordalo-2012-salience-theory-of-choice-under.md) | Pedro Bordalo and others | 2012 | 1579 | <!-- voice-ignore-line -->
| [Individualism and Momentum around the World](cards/chui-2010-individualism-and-momentum-around-the.md) | Andy C.W. Chui and others | 2010 | 1544 | <!-- voice-ignore-line -->
| [Following the Pied Piper: Do Individual Returns Herd around the Market?](cards/christie-1995-following-the-pied-piper-do.md) | William Gary Christie and others | 1995 | 1513 | <!-- voice-ignore-line -->
| [Fairness as a Constraint on Profit Seeking: Entitlements in the Market](cards/kahneman-2000-fairness-as-a-constraint-on.md) | Daniel J. Kahneman and others | 2000 | 1440 | <!-- voice-ignore-line -->
| [Behavioral Economics: Past, Present and Future](cards/thaler-2016-behavioral-economics-past-present-and.md) | Richard H. Thaler | 2016 | 1396 | <!-- voice-ignore-line -->
| [Risk and Time Preferences: Linking Experimental and Household Survey Data from Vietnam](cards/tanaka-2010-risk-and-time-preferences-linking.md) | Tomomi Tanaka and others | 2010 | 1387 | <!-- voice-ignore-line -->
| [Security Analysts' Career Concerns and Herding of Earnings Forecasts](cards/kubik-2000-security-analysts-career-concerns-and.md) | Jeffrey D. Kubik and others | 2000 | 1374 | <!-- voice-ignore-line -->
| [Investor Sentiment and Asset Valuation](cards/brown-2005-investor-sentiment-and-asset-valuation.md) | Gregory W. Brown and others | 2005 | 1363 | <!-- voice-ignore-line -->
| [Herd on the Street: Informational Inefficiencies in a Market with Short-Term Speculation](cards/froot-1992-herd-on-the-street-informational.md) | Kenneth A. Froot and others | 1992 | 1347 | <!-- voice-ignore-line -->
| [Cognitive biases, risk perception, and venture formation](cards/simon-2000-cognitive-biases-risk-perception-and.md) | Mark Simon and others | 2000 | 1286 | <!-- voice-ignore-line -->
| [Behavioral finance](cards/ritter-2003-behavioral-finance.md) | Jay R. Ritter | 2003 | 1279 | <!-- voice-ignore-line -->
| [Hedge Funds and the Technology Bubble](cards/brunnermeier-2004-hedge-funds-and-the-technology.md) | Markus Konrad Brunnermeier and others | 2004 | 1270 | <!-- voice-ignore-line -->
| [Prospect theory, mental accounting, and momentum](cards/grinblatt-2005-prospect-theory-mental-accounting-and.md) | Mark S. Grinblatt and others | 2005 | 1266 | <!-- voice-ignore-line -->

<a id="econometrics"></a>

## Financial Econometrics

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Distribution of the Estimators for Autoregressive Time Series With a Unit Root](cards/dickey-1979-distribution-of-the-estimators-for.md) | David Alan Dickey and others | 1979 | 34909 | <!-- voice-ignore-line -->
| [Generalized autoregressive conditional heteroskedasticity](cards/bollerslev-1986-generalized-autoregressive-conditional-heteroskedasticity.md) | Tim Bollerslev | 1986 | 29026 | <!-- voice-ignore-line -->
| [Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of United Kingdom Inflation](cards/engle-1982-autoregressive-conditional-heteroscedasticity-with-estimates.md) | Robert F. Engle | 1982 | 27731 | <!-- voice-ignore-line -->
| [Testing for a Unit Root in Time Series Regression](cards/phillips-1988-testing-for-a-unit-root.md) | Peter C.B. Phillips and others | 1988 | 24272 | <!-- voice-ignore-line -->
| [Statistical analysis of cointegration vectors](cards/johansen-1988-statistical-analysis-of-cointegration-vectors.md) | Søren Johansen | 1988 | 22719 | <!-- voice-ignore-line -->
| [Likelihood Ratio Statistics for Autoregressive Time Series with a Unit Root](cards/dickey-1981-likelihood-ratio-statistics-for-autoregressive.md) | David Alan Dickey and others | 1981 | 18449 | <!-- voice-ignore-line -->
| [Testing for unit roots in heterogeneous panels](cards/im-2003-testing-for-unit-roots-in.md) | Kyung So Im and others | 2003 | 18269 | <!-- voice-ignore-line -->
| [MAXIMUM LIKELIHOOD ESTIMATION AND INFERENCE ON COINTEGRATION — WITH APPLICATIONS TO THE DEMAND FOR MONEY](cards/johansen-1990-maximum-likelihood-estimation-and-inference.md) | Søren Johansen and others | 1990 | 17864 | <!-- voice-ignore-line -->
| [Testing the null hypothesis of stationarity against the alternative of a unit root](cards/kwiatkowski-1992-testing-the-null-hypothesis-of.md) | Denis Kwiatkowski and others | 1992 | 16238 | <!-- voice-ignore-line -->
| [Unit root tests in panel data: asymptotic and finite-sample properties](cards/levin-2002-unit-root-tests-in-panel.md) | Andrew Levin and others | 2002 | 15819 | <!-- voice-ignore-line -->
| [A simple panel unit root test in the presence of cross‐section dependence](cards/pesaran-2007-a-simple-panel-unit-root.md) | M. Hashem Pesaran | 2007 | 15290 | <!-- voice-ignore-line -->
| [Estimation and Hypothesis Testing of Cointegration Vectors in Gaussian Vector Autoregressive Models](cards/johansen-1991-estimation-and-hypothesis-testing-of.md) | Søren Johansen | 1991 | 14105 | <!-- voice-ignore-line -->
| [On the Relation between the Expected Value and the Volatility of the Nominal Excess Return on Stocks](cards/glosten-1993-on-the-relation-between-the.md) | Lawrence R. Glosten and others | 1993 | 10816 | <!-- voice-ignore-line -->
| [The Great Crash, the Oil Price Shock, and the Unit Root Hypothesis](cards/perron-1989-the-great-crash-the-oil.md) | Pierre Perron | 1989 | 9430 | <!-- voice-ignore-line -->
| [A Comparative Study of Unit Root Tests with Panel Data and a New Simple Test](cards/maddala-1999-a-comparative-study-of-unit.md) | Gangadharrao S. Maddala and others | 1999 | 8996 | <!-- voice-ignore-line -->
| [Dynamic Conditional Correlation: A Simple Class of Multivariate Generalized Autoregressive Conditional Heteroskedasticity Models](cards/engle-2002-dynamic-conditional-correlation-a-simple.md) | Robert F. Engle | 2002 | 8927 | <!-- voice-ignore-line -->
| [Critical Values for Cointegration Tests in Heterogeneous Panels with Multiple Regressors](cards/pedroni-1999-critical-values-for-cointegration-tests.md) | Peter L. Pedroni | 1999 | 8129 | <!-- voice-ignore-line -->
| [Efficient Tests for an Autoregressive Unit Root](cards/elliott-1996-efficient-tests-for-an-autoregressive.md) | Graham Elliott and others | 1996 | 7626 | <!-- voice-ignore-line -->
| [Spurious regression and residual-based tests for cointegration in panel data](cards/kao-1999-spurious-regression-and-residual-based.md) | Chihwa D. Kao | 1999 | 7036 | <!-- voice-ignore-line -->
| [PANEL COINTEGRATION: ASYMPTOTIC AND FINITE SAMPLE PROPERTIES OF POOLED TIME SERIES TESTS WITH AN APPLICATION TO THE PPP HYPOTHESIS](cards/pedroni-2004-panel-cointegration-asymptotic-and-finite.md) | Peter L. Pedroni | 2004 | 6782 | <!-- voice-ignore-line -->
| [Unit root tests for panel data](cards/choi-2001-unit-root-tests-for-panel.md) | In Choi | 2001 | 5126 | <!-- voice-ignore-line -->
| [Modelling Asymmetric Cointegration and Dynamic Multipliers in a Nonlinear ARDL Framework](cards/shin-2014-modelling-asymmetric-cointegration-and-dynamic.md) | Yongcheol Shin and others | 2014 | 4829 | <!-- voice-ignore-line -->
| [Conditional value-at-risk for general loss distributions](cards/rockafellar-2002-conditional-value-at-risk-for.md) | Ralph Tyrrell Rockafellar and others | 2002 | 4753 | <!-- voice-ignore-line -->
| [LAG Length Selection and the Construction of Unit Root Tests with Good Size and Power](cards/ng-2001-lag-length-selection-and-the.md) | Serena Ng and others | 2001 | 4661 | <!-- voice-ignore-line -->
| [The saving and investment nexus for China: evidence from cointegration tests](cards/narayan-2005-the-saving-and-investment-nexus.md) | Paresh Kumar Narayan | 2005 | 4563 | <!-- voice-ignore-line -->
| [Testing for Unit Roots in Autoregressive-Moving Average Models of Unknown Order](cards/said-1984-testing-for-unit-roots-in.md) | Saïd E. Saïd and others | 1984 | 4361 | <!-- voice-ignore-line -->
| [Modelling the Coherence in Short-Run Nominal Exchange Rates: A Multivariate Generalized Arch Model](cards/bollerslev-1990-modelling-the-coherence-in-short.md) | Tim Bollerslev | 1990 | 4321 | <!-- voice-ignore-line -->
| [Numerical distribution functions for unit root and cointegration tests](cards/mackinnon-1996-numerical-distribution-functions-for-unit.md) | James G. MacKinnon | 1996 | 3782 | <!-- voice-ignore-line -->
| [Managerial incentives and risk-taking☆](cards/coles-2005-managerial-incentives-and-risk-taking.md) | Jeffrey L. Coles and others | 2005 | 3269 | <!-- voice-ignore-line -->
| [Time Series Regression with a Unit Root](cards/phillips-1987-time-series-regression-with-a.md) | P. C. B. Phillips | 1987 | 3259 | <!-- voice-ignore-line -->
| [A Conditionally Heteroskedastic Time Series Model for Speculative Prices and Rates of Return](cards/bollerslev-1987-a-conditionally-heteroskedastic-time-series.md) | Tim Bollerslev | 1987 | 3207 | <!-- voice-ignore-line -->
| [Residual-based tests for cointegration in models with regime shifts](cards/gregory-1996-residual-based-tests-for-cointegration.md) | Allan W. Gregory and others | 1996 | 3172 | <!-- voice-ignore-line -->
| [A Note with Quantiles of the Asymptotic Distribution of the Maximum Likelihood Cointegration Rank Test Statistics1](cards/osterwaldlenum-1992-a-note-with-quantiles-of.md) | Michael Osterwald‐Lenum | 1992 | 3091 | <!-- voice-ignore-line -->
| [Minimum Lagrange Multiplier Unit Root Test with Two Structural Breaks](cards/lee-2003-minimum-lagrange-multiplier-unit-root.md) | Junsoo Lee and others | 2003 | 2970 | <!-- voice-ignore-line -->
| [A Simple Approximate Long-Memory Model of Realized Volatility](cards/corsi-2008-a-simple-approximate-long-memory.md) | Fulvio Corsi | 2008 | 2968 | <!-- voice-ignore-line -->
| [Simple Technical Trading Rules and the Stochastic Properties of Stock Returns](cards/brock-1992-simple-technical-trading-rules-and.md) | William Brock and others | 1992 | 2894 | <!-- voice-ignore-line -->
| [An Autoregressive Distributed-Lag Modelling Approach to Cointegration Analysis](cards/pesaran-2012-an-autoregressive-distributed-lag-modelling.md) | M. Hashem Pesaran and others | 2012 | 2793 | <!-- voice-ignore-line -->
| [Error‐correction Mechanism Tests for Cointegration in a Single‐equation Framework](cards/banerjee-1998-errorcorrection-mechanism-tests-for-cointegration.md) | Anindya Banerjee and others | 1998 | 2776 | <!-- voice-ignore-line -->
| [More Than Words: Quantifying Language to Measure Firms' Fundamentals](cards/tetlock-2008-more-than-words-quantifying-language.md) | Paul C. Tetlock and others | 2008 | 2742 | <!-- voice-ignore-line -->
| [Fractionally integrated generalized autoregressive conditional heteroskedasticity](cards/baillie-1996-fractionally-integrated-generalized-autoregressive-condition.md) | Richard T. Baillie and others | 1996 | 2720 | <!-- voice-ignore-line -->
| [CAViaR: Conditional Autoregressive Value at Risk by Regression Quantiles](cards/engle-2004-caviar-conditional-autoregressive-value-at.md) | Robert F. Engle and others | 2004 | 2579 | <!-- voice-ignore-line -->
| [Multivariate GARCH models: a survey](cards/bauwens-2006-multivariate-garch-models-a-survey.md) | Luc Bauwens and others | 2006 | 2538 | <!-- voice-ignore-line -->
| [Cointegration and Tests of Present Value Models](cards/campbell-1987-cointegration-and-tests-of-present.md) | John Y. Campbell and others | 1987 | 2496 | <!-- voice-ignore-line -->
| [The distribution of realized stock return volatility](cards/andersen-2001-the-distribution-of-realized-stock.md) | Torben G. Andersen | 2001 | 2475 | <!-- voice-ignore-line -->
| [Asymptotic Properties of Residual Based Tests for Cointegration](cards/phillips-1990-asymptotic-properties-of-residual-based.md) | P. C. B. Phillips and others | 1990 | 2369 | <!-- voice-ignore-line -->
| [A forecast comparison of volatility models: does anything beat a GARCH(1,1)?](cards/hansen-2005-a-forecast-comparison-of-volatility.md) | Peter Reinhard Hansen and others | 2005 | 2309 | <!-- voice-ignore-line -->
| [A PANIC Attack on Unit Roots and Cointegration](cards/bai-2004-a-panic-attack-on-unit.md) | Jushan Bai and others | 2004 | 2254 | <!-- voice-ignore-line -->
| [Autoregressive conditional heteroskedasticity and changes in regime](cards/hamilton-1994-autoregressive-conditional-heteroskedasticity-and-changes.md) | James Douglas Hamilton and others | 1994 | 2196 | <!-- voice-ignore-line -->
| [The Behavior of U. S. Public Debt and Deficits](cards/bohn-1998-the-behavior-of-u-s.md) | Henning Bohn | 1998 | 2191 | <!-- voice-ignore-line -->
| [Estimation of tail-related risk measures for heteroscedastic financial time series: an extreme value approach](cards/mcneil-2000-estimation-of-tail-related-risk.md) | Alexander J. McNeil and others | 2000 | 2169 | <!-- voice-ignore-line -->
| [Testing structural hypotheses in a multivariate cointegration analysis of the PPP and the UIP for UK](cards/johansen-1992-testing-structural-hypotheses-in-a.md) | Søren Johansen and others | 1992 | 2106 | <!-- voice-ignore-line -->
| [Is the correlation in international equity returns constant: 1960–1990?](cards/longin-1995-is-the-correlation-in-international.md) | Francois M. Longin and others | 1995 | 2097 | <!-- voice-ignore-line -->
| [Renewable energy consumption and economic growth: Evidence from a panel of OECD countries](cards/apergis-2009-renewable-energy-consumption-and-economic.md) | Nicholas Apergis and others | 2009 | 2025 | <!-- voice-ignore-line -->
| [Numerical distribution functions of likelihood ratio tests for cointegration](cards/mackinnon-1999-numerical-distribution-functions-of-likelihood.md) | James G. MacKinnon and others | 1999 | 1917 | <!-- voice-ignore-line -->
| [The local power of some unit root tests for panel data](cards/breitung-2004-the-local-power-of-some.md) | Jörg Breitung | 2004 | 1892 | <!-- voice-ignore-line -->
| [Unit Roots, Cointegration, and Structural Change](cards/maddala-1999-unit-roots-cointegration-and-structural.md) | Gangadharrao S. Maddala and others | 1999 | 1881 | <!-- voice-ignore-line -->
| [Seasonal integration and cointegration](cards/hylleberg-1990-seasonal-integration-and-cointegration.md) | Svend Hylleberg and others | 1990 | 1864 | <!-- voice-ignore-line -->
| [Tests for Unit Roots: A Monte Carlo Investigation](cards/schwert-1989-tests-for-unit-roots-a.md) | G. William Schwert | 1989 | 1827 | <!-- voice-ignore-line -->
| [Testing for a unit root in the nonlinear STAR framework](cards/kapetanios-2002-testing-for-a-unit-root.md) | George Kapetanios and others | 2002 | 1821 | <!-- voice-ignore-line -->
| [Unit Root Tests in ARMA Models with Data-Dependent Methods for the Selection of the Truncation Lag](cards/ng-1995-unit-root-tests-in-arma.md) | Serena Ng and others | 1995 | 1821 | <!-- voice-ignore-line -->
| [Modeling Asymmetric Comovements of Asset Returns](cards/kroner-1998-modeling-asymmetric-comovements-of-asset.md) | Kenneth F. Kroner and others | 1998 | 1820 | <!-- voice-ignore-line -->
| [Inference for unit roots in dynamic panels where the time dimension is fixed](cards/harris-1999-inference-for-unit-roots-in.md) | Richard D. F. Harris and others | 1999 | 1769 | <!-- voice-ignore-line -->
| [GARCH 101: The Use of ARCH/GARCH Models in Applied Econometrics](cards/engle-2001-garch-101-the-use-of.md) | Robert F. Engle | 2001 | 1751 | <!-- voice-ignore-line -->
| [Corporate Disclosure Practices, Institutional Investors, and Stock Return Volatility](cards/bushee-2000-corporate-disclosure-practices-institutional-investors.md) | Brian J. Bushee and others | 2000 | 1741 | <!-- voice-ignore-line -->
| [Roughing It Up: Including Jump Components in the Measurement, Modeling, and Forecasting of Return Volatility](cards/andersen-2007-roughing-it-up-including-jump.md) | Torben G. Andersen and others | 2007 | 1736 | <!-- voice-ignore-line -->
| [Modeling the conditional distribution of interest rates as a regime-switching process](cards/gray-1996-modeling-the-conditional-distribution-of.md) | Stephen Gray | 1996 | 1700 | <!-- voice-ignore-line -->
| [Time-Varying Distributions and Dynamic Hedging with Foreign Currency Futures](cards/kroner-1993-time-varying-distributions-and-dynamic.md) | Kenneth F. Kroner and others | 1993 | 1683 | <!-- voice-ignore-line -->

<a id="monetary"></a>

## Monetary Economics

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Nominal Rigidities and the Dynamic Effects of a Shock to Monetary Policy](cards/christiano-2005-nominal-rigidities-and-the-dynamic.md) | Lawrence J. Christiano and others | 2005 | 8005 | <!-- voice-ignore-line -->
| [The Science of Monetary Policy: A New Keynesian Perspective](cards/clarida-1999-the-science-of-monetary-policy.md) | Richard H. Clarida and others | 1999 | 6383 | <!-- voice-ignore-line -->
| [Chapter 21 The financial accelerator in a quantitative business cycle framework](cards/bernanke-1999-chapter-21-the-financial-accelerator.md) | Ben Bernanke and others | 1999 | 5581 | <!-- voice-ignore-line -->
| [Inside the Black Box: The Credit Channel of Monetary Policy Transmission](cards/bernanke-1995-inside-the-black-box-the.md) | Ben Bernanke and others | 1995 | 5424 | <!-- voice-ignore-line -->
| [Empirical exchange rate models of the seventies](cards/meese-1983-empirical-exchange-rate-models-of.md) | Richard A. Meese and others | 1983 | 5234 | <!-- voice-ignore-line -->
| [Monetary Policy Rules and Macroeconomic Stability: Evidence and Some Theory](cards/clarida-2000-monetary-policy-rules-and-macroeconomic.md) | Richard H. Clarida and others | 2000 | 5202 | <!-- voice-ignore-line -->
| [Rules, discretion and reputation in a model of monetary policy](cards/barro-1983-rules-discretion-and-reputation-in.md) | Robert J. Barro and others | 1983 | 4513 | <!-- voice-ignore-line -->
| [The Optimal Degree of Commitment to an Intermediate Monetary Target](cards/rogoff-1985-the-optimal-degree-of-commitment.md) | Kenneth Rogoff | 1985 | 4502 | <!-- voice-ignore-line -->
| [Interest and Prices: Foundations of a Theory of Monetary Policy](cards/woodford-2004-interest-and-prices-foundations-of.md) | Michael Woodford | 2004 | 4255 | <!-- voice-ignore-line -->
| [Time Varying Structural Vector Autoregressions and Monetary Policy](cards/primiceri-2005-time-varying-structural-vector-autoregressions.md) | Giorgio E. Primiceri | 2005 | 3666 | <!-- voice-ignore-line -->
| [Credit Booms Gone Bust: Monetary Policy, Leverage Cycles, and Financial Crises, 1870–2008](cards/schularick-2012-credit-booms-gone-bust-monetary.md) | Moritz HP. Schularick and others | 2012 | 3327 | <!-- voice-ignore-line -->
| [A Positive Theory of Monetary Policy in a Natural Rate Model](cards/barro-1983-a-positive-theory-of-monetary.md) | Robert J. Barro and others | 1983 | 3205 | <!-- voice-ignore-line -->
| [The Theory of Economic Development: An Inquiry into Profits, Capital, Credit, Interest, and the Business Cycle](cards/schumpeter-1934-the-theory-of-economic-development.md) | Joseph Alois Schumpeter | 1934 | 3153 | <!-- voice-ignore-line -->
| [Monetary Policy, Business Cycles, and the Behavior of Small Manufacturing Firms](cards/gertler-1994-monetary-policy-business-cycles-and.md) | Mark L. Gertler and others | 1994 | 3113 | <!-- voice-ignore-line -->
| [What Explains the Stock Market's Reaction to Federal Reserve Policy?](cards/bernanke-2005-what-explains-the-stock-market.md) | Ben Bernanke and others | 2005 | 3109 | <!-- voice-ignore-line -->
| [What Do a Million Observations on Banks Say About the Transmission of Monetary Policy?](cards/kashyap-2000-what-do-a-million-observations.md) | Anil Kashyap and others | 2000 | 3066 | <!-- voice-ignore-line -->
| [Sticky Information versus Sticky Prices: A Proposal to Replace the New Keynesian Phillips Curve](cards/mankiw-2002-sticky-information-versus-sticky-prices.md) | N. Gregory Mankiw and others | 2002 | 3050 | <!-- voice-ignore-line -->
| [What are the effects of monetary policy on output? Results from an agnostic identification procedure](cards/uhlig-2005-what-are-the-effects-of.md) | Harald Uhlig | 2005 | 2919 | <!-- voice-ignore-line -->
| [Financial markets under the global pandemic of COVID-19](cards/zhang-2020-financial-markets-under-the-global.md) | Dayong Zhang and others | 2020 | 2880 | <!-- voice-ignore-line -->
| [Chapter 2 Monetary policy shocks: What have we learned and to what end?](cards/christiano-1999-chapter-2-monetary-policy-shocks.md) | Lawrence J. Christiano and others | 1999 | 2776 | <!-- voice-ignore-line -->
| [Measuring the Effects of Monetary Policy: A Factor-Augmented Vector Autoregressive (FAVAR) Approach](cards/bernanke-2005-measuring-the-effects-of-monetary.md) | Ben Bernanke and others | 2005 | 2764 | <!-- voice-ignore-line -->
| [Optimal monetary policy with staggered wage and price contracts](cards/erceg-2000-optimal-monetary-policy-with-staggered.md) | Christopher J. Erceg and others | 2000 | 2735 | <!-- voice-ignore-line -->
| ["Rational" Expectations, the Optimal Monetary Instrument, and the Optimal Money Supply Rule](cards/sargent-1975-rational-expectations-the-optimal-monetary.md) | Thomas J. Sargent and others | 1975 | 2679 | <!-- voice-ignore-line -->
| [Monetary Policy and Exchange Rate Volatility in a Small Open Economy](cards/gali-2005-monetary-policy-and-exchange-rate.md) | Jordi Galí and others | 2005 | 2657 | <!-- voice-ignore-line -->
| [Zero Bound on Interest Rates and Optimal Monetary Policy](cards/eggertsson-2003-zero-bound-on-interest-rates.md) | Gauti B. Eggertsson and others | 2003 | 2640 | <!-- voice-ignore-line -->
| [Monetary policy rules in practice](cards/clarida-1998-monetary-policy-rules-in-practice.md) | Richard H. Clarida and others | 1998 | 2490 | <!-- voice-ignore-line -->
| [Small Business Credit Availability and Relationship Lending: The Importance of Bank Organisational Structure](cards/berger-2002-small-business-credit-availability-and.md) | Allen N. Berger and others | 2002 | 2374 | <!-- voice-ignore-line -->
| [Drifts and volatilities: monetary policies and outcomes in the post WWII US](cards/cogley-2005-drifts-and-volatilities-monetary-policies.md) | Timothy Cogley and others | 2005 | 2342 | <!-- voice-ignore-line -->
| [Central Bank Independence and Macroeconomic Performance: Some Comparative Evidence](cards/alesina-1993-central-bank-independence-and-macroeconomic.md) | Alberto Alesina and others | 1993 | 2341 | <!-- voice-ignore-line -->
| [Measuring the Macroeconomic Impact of Monetary Policy at the Zero Lower Bound](cards/wu-2016-measuring-the-macroeconomic-impact-of.md) | Jing Cynthia Wu and others | 2016 | 2334 | <!-- voice-ignore-line -->
| [Monetary Policy Surprises, Credit Costs, and Economic Activity](cards/gertler-2015-monetary-policy-surprises-credit-costs.md) | Mark L. Gertler and others | 2015 | 2308 | <!-- voice-ignore-line -->
| [Sticky Prices in the United States](cards/rotemberg-1982-sticky-prices-in-the-united.md) | Julio J. Rotemberg | 1982 | 2306 | <!-- voice-ignore-line -->
| [It's Baaack: Japan's Slump and the Return of the Liquidity Trap](cards/krugman-1998-it-s-baaack-japan-s.md) | Paúl Krugman and others | 1998 | 2300 | <!-- voice-ignore-line -->
| [Inflation forecast targeting: Implementing and monitoring inflation targets](cards/svensson-1997-inflation-forecast-targeting-implementing-and.md) | Lars E.O. Svensson | 1997 | 2294 | <!-- voice-ignore-line -->
| [Long-Term Contracts, Rational Expectations, and the Optimal Money Supply Rule](cards/fischer-1977-long-term-contracts-rational-expectations.md) | Stanley Fischer | 1977 | 2289 | <!-- voice-ignore-line -->
| [A New Measure of Monetary Shocks: Derivation and Implications](cards/romer-2004-a-new-measure-of-monetary.md) | Christina Romer and others | 2004 | 2273 | <!-- voice-ignore-line -->
| [An Optimization-Based Econometric Framework for the Evaluation of Monetary Policy](cards/rotemberg-1997-an-optimization-based-econometric-framework.md) | Julio J. Rotemberg and others | 1997 | 2273 | <!-- voice-ignore-line -->
| [Optimal fiscal and monetary policy in an economy without capital](cards/lucas-1983-optimal-fiscal-and-monetary-policy.md) | Robert E. Lucas and others | 1983 | 2208 | <!-- voice-ignore-line -->
| [Measuring the Independence of Central Banks and Its Effect on Policy Outcomes](cards/cukierman-1992-measuring-the-independence-of-central.md) | Alex Cukierman and others | 1992 | 2160 | <!-- voice-ignore-line -->
| [Some Evidence on the Importance of Sticky Prices](cards/bils-2004-some-evidence-on-the-importance.md) | Mark Bils and others | 2004 | 2145 | <!-- voice-ignore-line -->
| [Asymmetric Dynamics in the Correlations of Global Equity and Bond Returns](cards/cappiello-2006-asymmetric-dynamics-in-the-correlations.md) | Lorenzo Cappiello and others | 2006 | 2042 | <!-- voice-ignore-line -->
| [The Term Structure as a Predictor of Real Economic Activity](cards/estrella-1991-the-term-structure-as-a.md) | Arturo Estrella and others | 1991 | 2033 | <!-- voice-ignore-line -->
| [Were There Regime Switches in U.S. Monetary Policy?](cards/sims-2006-were-there-regime-switches-in.md) | Christopher A. Sims and others | 2006 | 2031 | <!-- voice-ignore-line -->
| [Systematic Monetary Policy and the Effects of Oil Price Shocks](cards/bernanke-1997-systematic-monetary-policy-and-the.md) | Ben Bernanke and others | 1997 | 2030 | <!-- voice-ignore-line -->
| [Capital regulation, risk-taking and monetary policy: A missing link in the transmission mechanism?](cards/borio-2011-capital-regulation-risk-taking-and.md) | Claudio E. V. Borio and others | 2011 | 2028 | <!-- voice-ignore-line -->
| [Political and Monetary Institutions and Public Financial Policies in the Industrial Countries](cards/grilli-1991-political-and-monetary-institutions-and.md) | Vittorio Grilli and others | 1991 | 1986 | <!-- voice-ignore-line -->
| [What are the effects of fiscal policy shocks?](cards/mountford-2009-what-are-the-effects-of.md) | Andrew Mountford and others | 2009 | 1956 | <!-- voice-ignore-line -->
| [Monetary Policy According to HANK](cards/kaplan-2018-monetary-policy-according-to-hank.md) | Greg Kaplan and others | 2018 | 1931 | <!-- voice-ignore-line -->
| [Measuring Monetary Policy](cards/bernanke-1998-measuring-monetary-policy.md) | Ben Bernanke and others | 1998 | 1880 | <!-- voice-ignore-line -->
| [High Frequency Identification of Monetary Non-Neutrality: The Information Effect](cards/nakamura-2013-high-frequency-identification-of-monetary.md) | Emi Nakamura and others | 2013 | 1819 | <!-- voice-ignore-line -->
| [Low inflation, pass-through, and the pricing power of firms](cards/taylor-2000-low-inflation-pass-through-and.md) | John B. Taylor | 2000 | 1760 | <!-- voice-ignore-line -->
| [A Unified Framework for Monetary Theory and Policy Analysis](cards/lagos-2005-a-unified-framework-for-monetary.md) | Ricardo A. Lagos and others | 2005 | 1749 | <!-- voice-ignore-line -->
| [The federal funds rate and the channels of monetary transmission](cards/bernanke-1989-the-federal-funds-rate-and.md) | Ben Bernanke and others | 1989 | 1742 | <!-- voice-ignore-line -->
| [Hazardous Times for Monetary Policy: What Do Twenty-Three Million Bank Loans Say About the Effects of Monetary Policy on Credit Risk-Taking?](cards/jimenez-2014-hazardous-times-for-monetary-policy.md) | Gabriel Jimenez and others | 2014 | 1727 | <!-- voice-ignore-line -->
| [Do Rural Banks Matter? Evidence from the Indian Social Banking Experiment](cards/burgess-2005-do-rural-banks-matter-evidence.md) | Robin Burgess and others | 2005 | 1670 | <!-- voice-ignore-line -->
| [Central Bank Communication and Monetary Policy: A Survey of Theory and Evidence](cards/blinder-2008-central-bank-communication-and-monetary.md) | Alan S. Blinder and others | 2008 | 1664 | <!-- voice-ignore-line -->
| [Open-Economy Inflation Targeting](cards/svensson-2000-open-economy-inflation-targeting.md) | Lars E.O. Svensson | 2000 | 1656 | <!-- voice-ignore-line -->
| [Financial Constraints and Stock Returns](cards/lamont-2001-financial-constraints-and-stock-returns.md) | Owen A Lamont and others | 2001 | 1641 | <!-- voice-ignore-line -->
| [Optimal Choice of Monetary Policy Instruments in a Simple Stochastic Macro Model](cards/poole-1970-optimal-choice-of-monetary-policy.md) | William H. Poole | 1970 | 1614 | <!-- voice-ignore-line -->
| [Inflation Targeting: A New Framework for Monetary Policy?](cards/bernanke-1997-inflation-targeting-a-new-framework.md) | Ben Bernanke and others | 1997 | 1611 | <!-- voice-ignore-line -->
| [Monetary Policy Rules Based on Real-Time Data](cards/orphanides-2001-monetary-policy-rules-based-on.md) | Athanasios Orphanides | 2001 | 1604 | <!-- voice-ignore-line -->
| [Invested interests: the politics of national economic policies in a world of global finance](cards/frieden-1991-invested-interests-the-politics-of.md) | Jeffry Frieden | 1991 | 1579 | <!-- voice-ignore-line -->
| [The New Neoclassical Synthesis and the Role of Monetary Policy](cards/goodfriend-1997-the-new-neoclassical-synthesis-and.md) | Marvin S. Goodfriend and others | 1997 | 1510 | <!-- voice-ignore-line -->
| [Monetary Policy Rules](cards/taylor-1999-monetary-policy-rules.md) | John B. Taylor | 1999 | 1488 | <!-- voice-ignore-line -->
| [Should Central Banks Respond to Movements in Asset Prices?](cards/bernanke-2001-should-central-banks-respond-to.md) | Ben Bernanke and others | 2001 | 1478 | <!-- voice-ignore-line -->
| [TESTING FOR MULTIPLE BUBBLES: HISTORICAL EPISODES OF EXUBERANCE AND COLLAPSE IN THE S&P 500](cards/phillips-2015-testing-for-multiple-bubbles-historical.md) | Peter C.B. Phillips and others | 2015 | 1461 | <!-- voice-ignore-line -->
| [A Proposal for International Monetary Reform](cards/tobin-1978-a-proposal-for-international-monetary.md) | James Tobin | 1978 | 1461 | <!-- voice-ignore-line -->

<a id="banking-crises"></a>

## Banking and Crises

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Bank Runs, Deposit Insurance, and Liquidity](cards/diamond-1983-bank-runs-deposit-insurance-and.md) | Douglas W. Diamond and others | 1983 | 12282 | <!-- voice-ignore-line -->
| [Financial Intermediation and Delegated Monitoring](cards/diamond-1984-financial-intermediation-and-delegated-monitoring.md) | Douglas W. Diamond | 1984 | 10278 | <!-- voice-ignore-line -->
| [Better to give than to receive: Predictive directional measurement of volatility spillovers](cards/diebold-2011-better-to-give-than-to.md) | Francis X. Diebold and others | 2011 | 6626 | <!-- voice-ignore-line -->
| [This Time Is Different: Eight Centuries of Financial Folly](cards/reinhart-2009-this-time-is-different-eight.md) | Carmen Reinhart and others | 2009 | 6132 | <!-- voice-ignore-line -->
| [The Twin Crises: The Causes of Banking and Balance-of-Payments Problems](cards/kaminsky-1999-the-twin-crises-the-causes.md) | Graciela Kaminsky and others | 1999 | 5835 | <!-- voice-ignore-line -->
| [Financial intermediation and growth: Causality and causes](cards/levine-2000-financial-intermediation-and-growth-causality.md) | Ross Eric Levine and others | 2000 | 5538 | <!-- voice-ignore-line -->
| [On the Network Topology of Variance Decompositions: Measuring the Connectedness of Financial Firms](cards/diebold-2011-on-the-network-topology-of.md) | Francis X. Diebold and others | 2011 | 5408 | <!-- voice-ignore-line -->
| [No Contagion, Only Interdependence: Measuring Stock Market Comovements](cards/forbes-2002-no-contagion-only-interdependence-measuring.md) | Kristin J. Forbes and others | 2002 | 5357 | <!-- voice-ignore-line -->
| [Social Capital, Trust, and Firm Performance: The Value of Corporate Social Responsibility during the Financial Crisis](cards/lins-2016-social-capital-trust-and-firm.md) | Karl V. Lins and others | 2016 | 5080 | <!-- voice-ignore-line -->
| [Financial Contagion](cards/allen-2000-financial-contagion.md) | Franklin Allen and others | 2000 | 4799 | <!-- voice-ignore-line -->
| [Financial Intermediation, Loanable Funds, and The Real Sector](cards/holmstrom-1997-financial-intermediation-loanable-funds-and.md) | Bengt R. Holmstrom and others | 1997 | 4496 | <!-- voice-ignore-line -->
| [Financial Development, Growth, and the Distribution of Income](cards/greenwood-1990-financial-development-growth-and-the.md) | Jeremy Greenwood and others | 1990 | 4245 | <!-- voice-ignore-line -->
| [Bank lending during the financial crisis of 2008](cards/ivashina-2009-bank-lending-during-the-financial.md) | Victoria Ivashina and others | 2009 | 3294 | <!-- voice-ignore-line -->
| [A model of unconventional monetary policy](cards/gertler-2010-a-model-of-unconventional-monetary.md) | Mark L. Gertler and others | 2010 | 3094 | <!-- voice-ignore-line -->
| [The real effects of financial constraints: Evidence from a financial crisis](cards/campello-2010-the-real-effects-of-financial.md) | Murillo Campello and others | 2010 | 3079 | <!-- voice-ignore-line -->
| [Econometric measures of connectedness and systemic risk in the finance and insurance sectors](cards/billio-2012-econometric-measures-of-connectedness-and.md) | Monica Billio and others | 2012 | 2977 | <!-- voice-ignore-line -->
| [Relationship Banking: What Do We Know?](cards/boot-2000-relationship-banking-what-do-we.md) | Arnoud W. A. Boot | 2000 | 2863 | <!-- voice-ignore-line -->
| [Social Contagion and Innovation: Cohesion versus Structural Equivalence](cards/burt-1987-social-contagion-and-innovation-cohesion.md) | Ronald S. Burt | 1987 | 2848 | <!-- voice-ignore-line -->
| [Bank regulation and supervision: what works best?](cards/barth-2003-bank-regulation-and-supervision-what.md) | James R. Barth and others | 2003 | 2818 | <!-- voice-ignore-line -->
| [Problem loans and cost efficiency in commercial banks](cards/berger-1997-problem-loans-and-cost-efficiency.md) | Allen N. Berger and others | 1997 | 2779 | <!-- voice-ignore-line -->
| [Determinants of Commercial Bank Interest Margins and Profitability: Some International Evidence](cards/demirguckunt-1999-determinants-of-commercial-bank-interest.md) | Asli Demirgüç‐Kunt and others | 1999 | 2754 | <!-- voice-ignore-line -->
| [Financial Intermediation and Endogenous Growth](cards/bencivenga-1991-financial-intermediation-and-endogenous-growth.md) | Valerie R. Bencivenga and others | 1991 | 2736 | <!-- voice-ignore-line -->
| [Deposit Insurance, Risk, and Market Power in Banking](cards/keeley-1988-deposit-insurance-risk-and-market.md) | Michael C. Keeley | 1988 | 2684 | <!-- voice-ignore-line -->
| [Systemic Risk and Stability in Financial Networks](cards/acemoglu-2015-systemic-risk-and-stability-in.md) | Daron Acemoğlu and others | 2015 | 2623 | <!-- voice-ignore-line -->
| [Socially responsible investments: Institutional aspects, performance, and investor behavior](cards/renneboog-2008-socially-responsible-investments-institutional-aspects.md) | Luc D. R. Renneboog and others | 2008 | 2525 | <!-- voice-ignore-line -->
| [The role of ESG performance during times of financial crisis: Evidence from COVID-19 in China](cards/broadstock-2020-the-role-of-esg-performance.md) | David C. Broadstock and others | 2020 | 2447 | <!-- voice-ignore-line -->
| [World Development Report 2020: Trading for Development in the Age of Global Value Chains](cards/bank-2019-world-development-report-2020-trading.md) | World Bank | 2019 | 2407 | <!-- voice-ignore-line -->
| [An analytic derivation of the cost of deposit insurance and loan guarantees An application of modern option pricing theory](cards/merton-1977-an-analytic-derivation-of-the.md) | Robert C. Merton | 1977 | 2327 | <!-- voice-ignore-line -->
| [Bank Governance, Regulation, and Risk Taking](cards/laeven-2008-bank-governance-regulation-and-risk.md) | Luc A. Laeven and others | 2008 | 2314 | <!-- voice-ignore-line -->
| [Financial Intermediation and Credit Policy in Business Cycle Analysis](cards/gertler-2010-financial-intermediation-and-credit-policy.md) | Mark L. Gertler and others | 2010 | 2310 | <!-- voice-ignore-line -->
| [The Determinants of Banking Crises in Developing and Developed Countries](cards/demirguckunt-1998-the-determinants-of-banking-crises.md) | Asli Demirgüç‐Kunt and others | 1998 | 2291 | <!-- voice-ignore-line -->
| [Measuring Systemic Risk](cards/acharya-2016-measuring-systemic-risk.md) | Viral V. Acharya and others | 2016 | 2271 | <!-- voice-ignore-line -->
| [How does capital affect bank performance during financial crises?](cards/berger-2013-how-does-capital-affect-bank.md) | Allen N. Berger and others | 2013 | 2196 | <!-- voice-ignore-line -->
| [Measuring the Frequency Dynamics of Financial Connectedness and Systemic Risk](cards/barunik-2018-measuring-the-frequency-dynamics-of.md) | Jozef Baruník and others | 2018 | 2189 | <!-- voice-ignore-line -->
| [Transmission of Volatility between Stock Markets](cards/king-1990-transmission-of-volatility-between-stock.md) | Mervyn A. King and others | 1990 | 2170 | <!-- voice-ignore-line -->
| [Corporate governance in the Asian financial crisis](cards/johnson-2000-corporate-governance-in-the-asian.md) | Simon Johnson and others | 2000 | 2116 | <!-- voice-ignore-line -->
| [Dividends, Earnings, and Stock Prices](cards/gordon-1959-dividends-earnings-and-stock-prices.md) | Myron J. Gordon | 1959 | 2066 | <!-- voice-ignore-line -->
| [Capital flow waves: Surges, stops, flight, and retrenchment](cards/forbes-2012-capital-flow-waves-surges-stops.md) | Kristin J. Forbes and others | 2012 | 1926 | <!-- voice-ignore-line -->
| [The Aftermath of Financial Crises](cards/reinhart-2009-the-aftermath-of-financial-crises.md) | Carmen Reinhart and others | 2009 | 1910 | <!-- voice-ignore-line -->
| [The Employment Effects of Credit Market Disruptions: Firm-level Evidence from the 2008–9 Financial Crisis](cards/reich-2013-the-employment-effects-of-credit.md) | Gabriel Chodorow-Reich | 2013 | 1864 | <!-- voice-ignore-line -->
| [A cross-firm analysis of the impact of corporate governance on the East Asian financial crisis](cards/mitton-2002-a-cross-firm-analysis-of.md) | Todd Mitton | 2002 | 1863 | <!-- voice-ignore-line -->
| [The East Asian Financial Crisis: Diagnosis, Remedies, Prospects](cards/radelet-1998-the-east-asian-financial-crisis.md) | Steven C. Radelet and others | 1998 | 1853 | <!-- voice-ignore-line -->
| [From Financial Crash to Debt Crisis](cards/reinhart-2011-from-financial-crash-to-debt.md) | Carmen Reinhart and others | 2011 | 1833 | <!-- voice-ignore-line -->
| [Systemic risk in banking ecosystems](cards/haldane-2011-systemic-risk-in-banking-ecosystems.md) | Andrew  G. Haldane and others | 2011 | 1815 | <!-- voice-ignore-line -->
| [Bank concentration, competition, and crises: First results](cards/beck-2005-bank-concentration-competition-and-crises.md) | Thorsten Beck and others | 2005 | 1783 | <!-- voice-ignore-line -->
| [Cronyism and capital controls: evidence from Malaysia](cards/johnson-2002-cronyism-and-capital-controls-evidence.md) | Simon Johnson and others | 2002 | 1771 | <!-- voice-ignore-line -->
| [A Theory of Bank Capital](cards/diamond-2000-a-theory-of-bank-capital.md) | Douglas W. Diamond and others | 2000 | 1766 | <!-- voice-ignore-line -->
| [Systemic Risk in Financial Systems](cards/eisenberg-2001-systemic-risk-in-financial-systems.md) | Larry Eisenberg and others | 2001 | 1747 | <!-- voice-ignore-line -->
| [The consolidation of the financial services industry: Causes, consequences, and implications for the future](cards/berger-1999-the-consolidation-of-the-financial.md) | Allen N. Berger and others | 1999 | 1714 | <!-- voice-ignore-line -->
| [Growth Dynamics: The Myth of Economic Recovery](cards/cerra-2008-growth-dynamics-the-myth-of.md) | Valerie Cerra and others | 2008 | 1703 | <!-- voice-ignore-line -->
| [Systemic Risk, Interbank Relations, and Liquidity Provision by the Central Bank](cards/freixas-2000-systemic-risk-interbank-relations-and.md) | Xavier Freixas and others | 2000 | 1662 | <!-- voice-ignore-line -->
| [Bank Liquidity Creation](cards/berger-2009-bank-liquidity-creation.md) | Allen N. Berger and others | 2009 | 1654 | <!-- voice-ignore-line -->
| [SRISK: A Conditional Capital Shortfall Measure of Systemic Risk](cards/brownlees-2016-srisk-a-conditional-capital-shortfall.md) | Christian T. Brownlees and others | 2016 | 1636 | <!-- voice-ignore-line -->
| [Credit and Banking in a DSGE Model of the Euro Area](cards/gerali-2010-credit-and-banking-in-a.md) | Andrea Gerali and others | 2010 | 1598 | <!-- voice-ignore-line -->
| [Determinants of Bank Profitability Before and During the Crisis: Evidence from Switzerland](cards/dietrich-2010-determinants-of-bank-profitability-before.md) | Andreas Dietrich and others | 2010 | 1597 | <!-- voice-ignore-line -->
| [Quantitative Risk Management: Concepts, Techniques and Tools : Concepts, Techniques and Tools](cards/mcneil-2015-quantitative-risk-management-concepts-techniques.md) | Alexander J. McNeil and others | 2015 | 1593 | <!-- voice-ignore-line -->
| [Ownership Structure, Corporate Governance, and Firm Value: Evidence from the East Asian Financial Crisis](cards/lemmon-2003-ownership-structure-corporate-governance-and.md) | Michael L. Lemmon and others | 2003 | 1591 | <!-- voice-ignore-line -->
| [The Credit Crunch](cards/bernanke-1991-the-credit-crunch.md) | Ben Bernanke and others | 1991 | 1571 | <!-- voice-ignore-line -->
| [Capital Flows and the Risk-Taking Channel of Monetary Policy](cards/bruno-2013-capital-flows-and-the-risk.md) | Valentina Giulia Bruno and others | 2013 | 1563 | <!-- voice-ignore-line -->
| [Bank activity and funding strategies: The impact on risk and returns☆](cards/demirguckunt-2010-bank-activity-and-funding-strategies.md) | Asli Demirgüç‐Kunt and others | 2010 | 1551 | <!-- voice-ignore-line -->
| [Is the crisis problem growing more severe?](cards/bordo-2001-is-the-crisis-problem-growing.md) | Michael David Bordo and others | 2001 | 1548 | <!-- voice-ignore-line -->
| [Is a Finance-led growth regime a viable alternative to Fordism? A preliminary analysis](cards/boyer-2000-is-a-finance-led-growth.md) | Robert Boyer | 2000 | 1546 | <!-- voice-ignore-line -->
| [Financial Networks and Contagion](cards/elliott-2012-financial-networks-and-contagion.md) | Matthew Elliott and others | 2012 | 1535 | <!-- voice-ignore-line -->
| [Too much finance?](cards/arcand-2015-too-much-finance.md) | Jean‐Louis Arcand and others | 2015 | 1513 | <!-- voice-ignore-line -->
| [Contemporary Banking Theory](cards/bhattacharya-1993-contemporary-banking-theory.md) | Sudipto Bhattacharya and others | 1993 | 1512 | <!-- voice-ignore-line -->
| [Corporate governance in the 2007–2008 financial crisis: Evidence from financial institutions worldwide](cards/erkens-2012-corporate-governance-in-the-20072008.md) | David H. Erkens and others | 2012 | 1502 | <!-- voice-ignore-line -->
| [Does Deposit Insurance Increase Banking System Stability?](cards/demirguckunt-2000-does-deposit-insurance-increase-banking.md) | Asli Demirgüç‐Kunt and others | 2000 | 1497 | <!-- voice-ignore-line -->

<a id="real-estate"></a>

## Real Estate Finance

| Paper | First author | Year | Cites |
|---|---|---|---|
| [ESG and financial performance: aggregated evidence from more than 2000 empirical studies](cards/friede-2015-esg-and-financial-performance-aggregated.md) | Gunnar Friede and others | 2015 | 8590 | <!-- voice-ignore-line -->
| [Wages, Rents, and the Quality of Life](cards/morse-1982-wages-rents-and-the-quality.md) | Jennifer Roback Morse | 1982 | 3936 | <!-- voice-ignore-line -->
| [Asset returns and inflation](cards/fama-1977-asset-returns-and-inflation.md) | Eugene F. Fama and others | 1977 | 3245 | <!-- voice-ignore-line -->
| [House Prices, Borrowing Constraints, and Monetary Policy in the Business Cycle](cards/iacoviello-2005-house-prices-borrowing-constraints-and.md) | Matteo M. Iacoviello | 2005 | 3083 | <!-- voice-ignore-line -->
| [Hedonic housing prices and the demand for clean air](cards/harrison-1978-hedonic-housing-prices-and-the.md) | David Harrison and others | 1978 | 2395 | <!-- voice-ignore-line -->
| [Loss Aversion and Seller Behavior: Evidence from the Housing Market](cards/genesove-2001-loss-aversion-and-seller-behavior.md) | David Genesove and others | 2001 | 1839 | <!-- voice-ignore-line -->
| [Housing Market Spillovers: Evidence from an Estimated DSGE Model](cards/iacoviello-2010-housing-market-spillovers-evidence-from.md) | Matteo M. Iacoviello and others | 2010 | 1807 | <!-- voice-ignore-line -->
| [Is There a Bubble in the Housing Market?](cards/case-2003-is-there-a-bubble-in.md) | Karl E. Case and others | 2003 | 1681 | <!-- voice-ignore-line -->
| [Liquidity Constraints, Household Wealth, and Entrepreneurship](cards/hurst-2004-liquidity-constraints-household-wealth-and.md) | Erik G. Hurst and others | 2004 | 1597 | <!-- voice-ignore-line -->
| [Tax Subsidies to Owner-Occupied Housing: An Asset-Market Approach](cards/poterba-1984-tax-subsidies-to-owner-occupied.md) | James M. Poterba | 1984 | 1588 | <!-- voice-ignore-line -->
| [House Prices, Home Equity–Based Borrowing, and the US Household Leverage Crisis](cards/mian-2011-house-prices-home-equitybased-borrowing.md) | Atif Mian and others | 2011 | 1529 | <!-- voice-ignore-line -->
| [Does Air Quality Matter? Evidence from the Housing Market](cards/chay-2005-does-air-quality-matter-evidence.md) | Kenneth Y. Chay and others | 2005 | 1496 | <!-- voice-ignore-line -->
| [The Wealth of Cities: Agglomeration Economies and Spatial Equilibrium in the United States](cards/glaeser-2009-the-wealth-of-cities-agglomeration.md) | Edward L. Glaeser and others | 2009 | 1443 | <!-- voice-ignore-line -->
| [A Team Production Theory of Corporate Law](cards/blair-1999-a-team-production-theory-of.md) | Margaret M. Blair and others | 1999 | 1427 | <!-- voice-ignore-line -->
| [Assessing High House Prices: Bubbles, Fundamentals and Misperceptions](cards/himmelberg-2005-assessing-high-house-prices-bubbles.md) | Charles P. Himmelberg and others | 2005 | 1365 | <!-- voice-ignore-line -->
| [Collateral Damage: Effects of the Japanese Bank Crisis on Real Activity in the United States](cards/peek-2000-collateral-damage-effects-of-the.md) | Joe Peek and others | 2000 | 1335 | <!-- voice-ignore-line -->
| [Experts, amateurs, and real estate: An anchoring-and-adjustment perspective on property pricing decisions](cards/northcraft-1987-experts-amateurs-and-real-estate.md) | Gregory B. Northcraft and others | 1987 | 1327 | <!-- voice-ignore-line -->
| [How do house prices affect consumption? Evidence from micro data](cards/campbell-2006-how-do-house-prices-affect.md) | John Y. Campbell and others | 2006 | 1320 | <!-- voice-ignore-line -->
| [The baby boom, the baby bust, and the housing market](cards/mankiw-1989-the-baby-boom-the-baby.md) | N. Gregory Mankiw and others | 1989 | 1285 | <!-- voice-ignore-line -->
| [A Regression Method for Real Estate Price Index Construction](cards/bailey-1963-a-regression-method-for-real.md) | Martin J. Bailey and others | 1963 | 1275 | <!-- voice-ignore-line -->
| [Airbnb and the rent gap: Gentrification through the sharing economy](cards/wachsmuth-2018-airbnb-and-the-rent-gap.md) | David Wachsmuth and others | 2018 | 1231 | <!-- voice-ignore-line -->
| [Climate Finance](cards/giglio-2020-climate-finance.md) | Stefano Giglio and others | 2020 | 1193 | <!-- voice-ignore-line -->
| [The Collateral Channel: How Real Estate Shocks Affect Corporate Investment](cards/chaney-2012-the-collateral-channel-how-real.md) | Thomas Chaney and others | 2012 | 1156 | <!-- voice-ignore-line -->
| [Housing supply and housing bubbles](cards/glaeser-2008-housing-supply-and-housing-bubbles.md) | Edward L. Glaeser and others | 2008 | 1079 | <!-- voice-ignore-line -->
| [COVID-19 and the march 2020 stock market crash. Evidence from S&P1500](cards/mazur-2020-covid-19-and-the-march.md) | Mieszko Mazur and others | 2020 | 1072 | <!-- voice-ignore-line -->
| [The Composition of Hedonic Pricing Models](cards/sirmans-2005-the-composition-of-hedonic-pricing.md) | G. Stacy Sirmans and others | 2005 | 1057 | <!-- voice-ignore-line -->
| [Urban Economics and Real Estate Markets](cards/dipasquale-1995-urban-economics-and-real-estate.md) | Denise DiPasquale and others | 1995 | 1036 | <!-- voice-ignore-line -->
| [How do business and financial cycles interact?](cards/claessens-2011-how-do-business-and-financial.md) | Stijn Claessens and others | 2011 | 1032 | <!-- voice-ignore-line -->
| [Prices and Trading Volume in the Housing Market: A Model with Down-Payment Effects](cards/stein-1995-prices-and-trading-volume-in.md) | Jeremy C. Stein | 1995 | 1016 | <!-- voice-ignore-line -->
| [Owner-Occupied Housing and the Composition of the Household Portfolio](cards/flavin-2002-owner-occupied-housing-and-the.md) | Marjorie A. Flavin and others | 2002 | 965 | <!-- voice-ignore-line -->
| [House prices, money, credit, and the macroeconomy](cards/goodhart-2008-house-prices-money-credit-and.md) | Charles Goodhart and others | 2008 | 947 | <!-- voice-ignore-line -->
| [Forced Sales and House Prices](cards/campbell-2011-forced-sales-and-house-prices.md) | John Y. Campbell and others | 2011 | 945 | <!-- voice-ignore-line -->
| [The value of trees, water and open space as reflected by house prices in the Netherlands](cards/luttik-2000-the-value-of-trees-water.md) | J. Luttik | 2000 | 927 | <!-- voice-ignore-line -->
| [On the Choice of Funtional Form for Hedonic Price Functions](cards/cropper-1988-on-the-choice-of-funtional.md) | Maureen Cropper and others | 1988 | 927 | <!-- voice-ignore-line -->
| [A New Measure of the Local Regulatory Environment for Housing Markets: The Wharton Residential Land Use Regulatory Index](cards/gyourko-2008-a-new-measure-of-the.md) | Joseph Gyourko and others | 2008 | 920 | <!-- voice-ignore-line -->
| [The Impact of Railway Stations on Residential and Commercial Property Value: A Meta-analysis](cards/debrezion-2007-the-impact-of-railway-stations.md) | Ghebreegziabiher Debrezion and others | 2007 | 906 | <!-- voice-ignore-line -->
| [Late Neoliberalism: The Financialization of Homeownership and Housing Rights](cards/rolnik-2013-late-neoliberalism-the-financialization-of.md) | Raquel Rolnik | 2013 | 888 | <!-- voice-ignore-line -->
| [Banking-industry specific and regional economic determinants of non-performing loans: Evidence from US states](cards/ghosh-2015-banking-industry-specific-and-regional.md) | Amit Ghosh | 2015 | 885 | <!-- voice-ignore-line -->
| [Virtual currency, tangible return: Portfolio diversification with bitcoin](cards/briere-2015-virtual-currency-tangible-return-portfolio.md) | Marie Brière and others | 2015 | 865 | <!-- voice-ignore-line -->
| [Vacancy, Search, and Prices in a Housing Market Matching Model](cards/wheaton-1990-vacancy-search-and-prices-in.md) | William C. Wheaton | 1990 | 857 | <!-- voice-ignore-line -->
| [Does Climate Change Affect Real Estate Prices? Only If You Believe In It](cards/baldauf-2018-does-climate-change-affect-real.md) | Markus Baldauf and others | 2018 | 845 | <!-- voice-ignore-line -->
| [The Economic Implications of Housing Supply](cards/glaeser-2018-the-economic-implications-of-housing.md) | Edward L. Glaeser and others | 2018 | 812 | <!-- voice-ignore-line -->
| [Why Is Manhattan So Expensive? Regulation and the Rise in Housing Prices](cards/glaeser-2005-why-is-manhattan-so-expensive.md) | Edward L. Glaeser and others | 2005 | 790 | <!-- voice-ignore-line -->
| [Marketing-to-Millennials: Marketing 4.0, customer satisfaction and purchase intention](cards/dash-2020-marketing-to-millennials-marketing-4.md) | Ganesh Dash and others | 2020 | 784 | <!-- voice-ignore-line -->
| [Comparing Wealth Effects: The Stock Market versus the Housing Market](cards/w-nd-comparing-wealth-effects-the-stock.md) | Working No. W and others | None | 784 | <!-- voice-ignore-line -->
| [Airbnb, buy-to-let investment and tourism-driven displacement: A case study in Lisbon](cards/gant-2019-airbnb-buy-to-let-investment.md) | Agustín Cócola-Gant and others | 2019 | 781 | <!-- voice-ignore-line -->
| [Why Have Housing Prices Gone Up?](cards/glaeser-2005-why-have-housing-prices-gone.md) | Edward L. Glaeser and others | 2005 | 772 | <!-- voice-ignore-line -->
| [On the economics of energy labels in the housing market](cards/brounen-2011-on-the-economics-of-energy.md) | Dirk Brounen and others | 2011 | 750 | <!-- voice-ignore-line -->
| [Housing Market Dynamics and the Future of Housing Prices](cards/dipasquale-1994-housing-market-dynamics-and-the.md) | Denise DiPasquale and others | 1994 | 726 | <!-- voice-ignore-line -->
| [House Price Dynamics: The Role of Tax Policy and Demography](cards/poterba-1991-house-price-dynamics-the-role.md) | James M. Poterba and others | 1991 | 723 | <!-- voice-ignore-line -->
| [Do industries lead stock markets?](cards/hong-2006-do-industries-lead-stock-markets.md) | Harrison G. Hong and others | 2006 | 719 | <!-- voice-ignore-line -->
| [Analysis of Spatial Autocorrelation in House Prices](cards/basu-1998-analysis-of-spatial-autocorrelation-in.md) | Sabyasachi Basu and others | 1998 | 714 | <!-- voice-ignore-line -->
| [The Strategic Exercise of Options: Development Cascades and Overbuilding in Real Estate Markets](cards/grenadier-1996-the-strategic-exercise-of-options.md) | Steven R. Grenadier | 1996 | 697 | <!-- voice-ignore-line -->
| [Real estate appraisal: a review of valuation methods](cards/pagourtzi-2003-real-estate-appraisal-a-review.md) | Elli Pagourtzi and others | 2003 | 692 | <!-- voice-ignore-line -->
| [Speculative Dynamics](cards/cutler-1991-speculative-dynamics.md) | David Cutler and others | 1991 | 687 | <!-- voice-ignore-line -->
| [Forecasting Prices and Excess Returns in the Housing Market](cards/case-1990-forecasting-prices-and-excess-returns.md) | Karl E. Case and others | 1990 | 683 | <!-- voice-ignore-line -->
| [The Global Findex Database 2017: Measuring Financial Inclusion and Opportunities to Expand Access to and Use of Financial Services](cards/demirguckunt-2020-the-global-findex-database-2017.md) | Asli Demirgüç‐Kunt and others | 2020 | 670 | <!-- voice-ignore-line -->
| [Using GIS and landscape metrics in the hedonic price modeling of the amenity value of urban green space: A case study in Jinan City, China](cards/kong-2006-using-gis-and-landscape-metrics.md) | Fanhua Kong and others | 2006 | 660 | <!-- voice-ignore-line -->
| [Market Distortions When Agents Are Better Informed: The Value of Information in Real Estate Transactions](cards/levitt-2008-market-distortions-when-agents-are.md) | Steven D. Levitt and others | 2008 | 657 | <!-- voice-ignore-line -->
| [No Price Like Home: Global House Prices, 1870–2012](cards/knoll-2017-no-price-like-home-global.md) | Katharina Knoll and others | 2017 | 655 | <!-- voice-ignore-line -->
| [On the exclusion of assets from tests of the two-parameter model](cards/stambaugh-1982-on-the-exclusion-of-assets.md) | Robert F. Stambaugh | 1982 | 649 | <!-- voice-ignore-line -->
| [The Macroeconomic Effects of Housing Wealth, Housing Finance, and Limited Risk Sharing in General Equilibrium](cards/favilukis-2016-the-macroeconomic-effects-of-housing.md) | Jack Favilukis and others | 2016 | 646 | <!-- voice-ignore-line -->
| [Migration and hedonic valuation: The case of air quality](cards/bayer-2009-migration-and-hedonic-valuation-the.md) | Patrick J. Bayer and others | 2009 | 646 | <!-- voice-ignore-line -->
| [Micro-Neighborhood Externalities and Hedonic Housing Prices](cards/li-1980-micro-neighborhood-externalities-and-hedonic.md) | Mingche M. Li and others | 1980 | 639 | <!-- voice-ignore-line -->
| [The financialisation of rental housing: A comparative analysis of New York City and Berlin](cards/fields-2014-the-financialisation-of-rental-housing.md) | Desiree Fields and others | 2014 | 634 | <!-- voice-ignore-line -->
| [The price and quantity of residential land in the United States](cards/davis-2007-the-price-and-quantity-of.md) | Morris A. Davis and others | 2007 | 634 | <!-- voice-ignore-line -->
| [Pricing Residential Amenities: The Value of a View](cards/benson-1998-pricing-residential-amenities-the-value.md) | Earl D. Benson and others | 1998 | 629 | <!-- voice-ignore-line -->

<a id="mortgage"></a>

## Mortgage

| Paper | First author | Year | Cites |
|---|---|---|---|
| [INFORMATIONAL ASYMMETRIES, FINANCIAL STRUCTURE, AND FINANCIAL INTERMEDIATION](cards/brealey-1977-informational-asymmetries-financial-structure-and.md) | Richard A. Brealey and others | 1977 | 6817 | <!-- voice-ignore-line -->
| [Deciphering the Liquidity and Credit Crunch 2007–2008](cards/brunnermeier-2009-deciphering-the-liquidity-and-credit.md) | Markus Konrad Brunnermeier | 2009 | 4259 | <!-- voice-ignore-line -->
| [Household Finance](cards/campbell-2006-household-finance.md) | John Y. Campbell | 2006 | 3319 | <!-- voice-ignore-line -->
| [Fintech, regulatory arbitrage, and the rise of shadow banks](cards/buchak-2018-fintech-regulatory-arbitrage-and-the.md) | Greg Buchak and others | 2018 | 2296 | <!-- voice-ignore-line -->
| [The Consequences of Mortgage Credit Expansion: Evidence from the U.S. Mortgage Default Crisis](cards/mian-2009-the-consequences-of-mortgage-credit.md) | Atif Mian and others | 2009 | 2293 | <!-- voice-ignore-line -->
| [Financial literacy and the need for financial education: evidence and implications](cards/lusardi-2019-financial-literacy-and-the-need.md) | Annamaria Lusardi | 2019 | 2247 | <!-- voice-ignore-line -->
| [Financial Literacy and Retirement Preparedness: Evidence and Implications for Financial Education](cards/lusardi-2007-financial-literacy-and-retirement-preparedness.md) | Annamaria Lusardi and others | 2007 | 2202 | <!-- voice-ignore-line -->
| [Macroeconomic and bank-specific determinants of non-performing loans in Greece: A comparative study of mortgage, business and consumer loan portfolios](cards/louzis-2011-macroeconomic-and-bank-specific-determinants.md) | Dimitrios P. Louzis and others | 2011 | 1895 | <!-- voice-ignore-line -->
| [Costly external finance, corporate investment, and the subprime mortgage credit crisis](cards/duchin-2010-costly-external-finance-corporate-investment.md) | Ran Duchin and others | 2010 | 1749 | <!-- voice-ignore-line -->
| [Did Securitization Lead to Lax Screening? Evidence from Subprime Loans](cards/keys-2010-did-securitization-lead-to-lax.md) | Benjamin J. Keys and others | 2010 | 1537 | <!-- voice-ignore-line -->
| [The Effects of Quantitative Easing on Interest Rates: Channels and Implications for Policy](cards/krishnamurthy-2011-the-effects-of-quantitative-easing.md) | Arvind Krishnamurthy and others | 2011 | 1495 | <!-- voice-ignore-line -->
| [Corporate Governance and Corporate Social Responsibility Disclosure: Evidence from the US Banking Sector](cards/jizi-2013-corporate-governance-and-corporate-social.md) | Mohammad Issam Jizi and others | 2013 | 1456 | <!-- voice-ignore-line -->
| [The Role of Technology in Mortgage Lending](cards/fuster-2019-the-role-of-technology-in.md) | Andreas Fuster and others | 2019 | 1455 | <!-- voice-ignore-line -->
| [Learning from Inflation Experiences](cards/malmendier-2015-learning-from-inflation-experiences.md) | Ulrike M. Malmendier and others | 2015 | 1431 | <!-- voice-ignore-line -->
| [Can "It" Happen Again? Essays on Instability and Finance](cards/minsky-1982-can-it-happen-again-essays.md) | Hyman P. Minsky | 1982 | 1266 | <!-- voice-ignore-line -->
| [Understanding the Subprime Mortgage Crisis](cards/demyanyk-2009-understanding-the-subprime-mortgage-crisis.md) | Yuliya S. Demyanyk and others | 2009 | 1254 | <!-- voice-ignore-line -->
| [The Everyday Life of Global Finance: Saving and Borrowing in Anglo-America](cards/langley-2008-the-everyday-life-of-global.md) | Paul Langley | 2008 | 1153 | <!-- voice-ignore-line -->
| [Household Debt and Business Cycles Worldwide](cards/mian-2017-household-debt-and-business-cycles.md) | Atif Mian and others | 2017 | 986 | <!-- voice-ignore-line -->
| [Mortgage Terminations, Heterogeneity and the Exercise of Mortgage Options](cards/deng-2000-mortgage-terminations-heterogeneity-and-the.md) | Yongheng Deng and others | 2000 | 967 | <!-- voice-ignore-line -->
| [Medical Bankruptcy in the United States, 2007: Results of a National Study](cards/himmelstein-2009-medical-bankruptcy-in-the-united.md) | David U. Himmelstein and others | 2009 | 931 | <!-- voice-ignore-line -->
| [Anti-Crisis](cards/roitman-2013-anti-crisis.md) | Janet L. Roitman | 2013 | 907 | <!-- voice-ignore-line -->
| [Bank Risk-taking, Securitization, Supervision, and Low Interest Rates: Evidence from the Euro-area and the U.S. Lending Standards](cards/maddaloni-2011-bank-risk-taking-securitization-supervision.md) | Angela Maria Maddaloni and others | 2011 | 903 | <!-- voice-ignore-line -->
| [Is the 2007 U.S. Sub-Prime Financial Crisis So Different? An International Historical Comparison](cards/reinhart-2008-is-the-2007-u-s.md) | Carmen Reinhart and others | 2008 | 853 | <!-- voice-ignore-line -->
| [Markets: The Credit Rating Agencies](cards/white-2010-markets-the-credit-rating-agencies.md) | Lawrence J. White | 2010 | 825 | <!-- voice-ignore-line -->
| [What is housing affordability? The case for the residual income approach](cards/stone-2006-what-is-housing-affordability-the.md) | Michael E. Stone | 2006 | 825 | <!-- voice-ignore-line -->
| [Household Risk Management and Optimal Mortgage Choice](cards/campbell-2003-household-risk-management-and-optimal.md) | John Y. Campbell and others | 2003 | 821 | <!-- voice-ignore-line -->
| [The Economics of Structured Finance](cards/coval-2009-the-economics-of-structured-finance.md) | Joshua D. Coval and others | 2009 | 798 | <!-- voice-ignore-line -->
| [The Rise in Mortgage Defaults](cards/mayer-2009-the-rise-in-mortgage-defaults.md) | Christopher Clemens Mayer and others | 2009 | 769 | <!-- voice-ignore-line -->
| [Credit Supply and the Price of Housing](cards/favara-2015-credit-supply-and-the-price.md) | Giovanni Favara and others | 2015 | 763 | <!-- voice-ignore-line -->
| [Inflation and the Redistribution of Nominal Wealth](cards/doepke-2006-inflation-and-the-redistribution-of.md) | Matthias Doepke and others | 2006 | 753 | <!-- voice-ignore-line -->
| [Booms and Busts in the UK Housing Market](cards/muellbauer-1997-booms-and-busts-in-the.md) | John N. J. Muellbauer and others | 1997 | 750 | <!-- voice-ignore-line -->
| [Financialised Capitalism: Crisis and Financial Expropriation](cards/lapavitsas-2009-financialised-capitalism-crisis-and-financial.md) | Costas Lapavitsas | 2009 | 735 | <!-- voice-ignore-line -->
| [The great mortgaging: housing finance, crises and business cycles](cards/jorda-2016-the-great-mortgaging-housing-finance.md) | Òscar Jordà and others | 2016 | 717 | <!-- voice-ignore-line -->
| [The Financialization of Home and the Mortgage Market Crisis](cards/aalbers-2008-the-financialization-of-home-and.md) | Manuel B. Aalbers | 2008 | 716 | <!-- voice-ignore-line -->
| [The Variegated Financialization of Housing](cards/aalbers-2017-the-variegated-financialization-of-housing.md) | Manuel B. Aalbers | 2017 | 715 | <!-- voice-ignore-line -->
| [Credit Booms and Lending Standards: Evidence from the Subprime Mortgage Market](cards/dellariccia-2012-credit-booms-and-lending-standards.md) | Giovanni Dell’Ariccia and others | 2012 | 708 | <!-- voice-ignore-line -->
| [Time and frequency dynamics of connectedness between renewable energy stocks and crude oil prices](cards/ferrer-2018-time-and-frequency-dynamics-of.md) | Román Ferrer and others | 2018 | 687 | <!-- voice-ignore-line -->
| [The Determinants of Attitudes toward Strategic Default on Mortgages](cards/guiso-2013-the-determinants-of-attitudes-toward.md) | Luigi Guiso and others | 2013 | 687 | <!-- voice-ignore-line -->
| [Dating the timeline of financial bubbles during the subprime crisis](cards/phillips-2011-dating-the-timeline-of-financial.md) | Peter C.B. Phillips and others | 2011 | 679 | <!-- voice-ignore-line -->
| [Global retail lending in the aftermath of the US financial crisis: Distinguishing between supply and demand effects](cards/puri-2010-global-retail-lending-in-the.md) | Manju Puri and others | 2010 | 677 | <!-- voice-ignore-line -->
| [Originate-to-Distribute Model and the Subprime Mortgage Crisis](cards/purnanandam-2010-originate-to-distribute-model-and.md) | Amiyatosh K. Purnanandam | 2010 | 676 | <!-- voice-ignore-line -->
| [CAUSES OF THE FINANCIAL CRISIS](cards/acharya-2009-causes-of-the-financial-crisis.md) | Viral V. Acharya and others | 2009 | 671 | <!-- voice-ignore-line -->
| [Methods of Estimation for Markets in Disequilibrium](cards/fair-1972-methods-of-estimation-for-markets.md) | Ray C. Fair and others | 1972 | 666 | <!-- voice-ignore-line -->
| [The Structure and Performance of the Money Management Industry](cards/lakonishok-1992-the-structure-and-performance-of.md) | Josef Lakonishok and others | 1992 | 663 | <!-- voice-ignore-line -->
| [House of Debt: How They (and You) Caused the Great Recession, and How We Can Prevent It from Happening Again](cards/mian-2014-house-of-debt-how-they.md) | Atif Mian and others | 2014 | 654 | <!-- voice-ignore-line -->
| [Negative equity and foreclosure: Theory and evidence](cards/foote-2008-negative-equity-and-foreclosure-theory.md) | Christopher L. Foote and others | 2008 | 639 | <!-- voice-ignore-line -->
| [Interest Rate Pass-Through: Mortgage Rates, Household Consumption, and Voluntary Deleveraging](cards/maggio-2017-interest-rate-pass-through-mortgage.md) | Marco Di Maggio and others | 2017 | 620 | <!-- voice-ignore-line -->
| [The concept of housing affordability: Six contemporary uses of the housing expenditure‐to‐income ratio](cards/hulchanski-1995-the-concept-of-housing-affordability.md) | John David Hulchanski | 1995 | 611 | <!-- voice-ignore-line -->
| [A Simple Error Correction Model of House Prices](cards/malpezzi-1999-a-simple-error-correction-model.md) | Stephen Tipple Malpezzi | 1999 | 604 | <!-- voice-ignore-line -->
| [What drives housing price dynamics: cross-country evidence](cards/tsatsaronis-2004-what-drives-housing-price-dynamics.md) | Kostas Tsatsaronis and others | 2004 | 601 | <!-- voice-ignore-line -->
| [Financialization and housing: Between globalization and Varieties of Capitalism](cards/fernandez-2016-financialization-and-housing-between-globalization.md) | Rodrigo Fernandez and others | 2016 | 598 | <!-- voice-ignore-line -->
| [Debt and distress: Evaluating the psychological cost of credit](cards/brown-2005-debt-and-distress-evaluating-the.md) | Sarah Brown and others | 2005 | 594 | <!-- voice-ignore-line -->
| [Valuation effects of corporate debt offerings](cards/eckbo-1986-valuation-effects-of-corporate-debt.md) | B. Espen Eckbo | 1986 | 593 | <!-- voice-ignore-line -->
| [The Safe Assets Shortage Conundrum](cards/caballero-2017-the-safe-assets-shortage-conundrum.md) | Ricardo J. Caballero and others | 2017 | 589 | <!-- voice-ignore-line -->
| [Oil prices and real estate investment trusts (REITs): Gradual-shift causality and volatility transmission analysis](cards/nazloglu-2016-oil-prices-and-real-estate.md) | Şaban Nazlıoğlu and others | 2016 | 576 | <!-- voice-ignore-line -->
| [Creating Liquidity out of Spatial Fixity: The Secondary Circuit of Capital and the Subprime Mortgage Crisis](cards/gotham-2009-creating-liquidity-out-of-spatial.md) | Kevin Fox Gotham | 2009 | 570 | <!-- voice-ignore-line -->
| [The Real Costs of Credit Access: Evidence from the Payday Lending Market](cards/melzer-2011-the-real-costs-of-credit.md) | Brian Melzer | 2011 | 568 | <!-- voice-ignore-line -->
| [Systemic Risk in the Financial Sector: An Analysis of the Subprime-Mortgage Financial Crisis](cards/hellwig-2008-systemic-risk-in-the-financial.md) | Martin Hellwig | 2008 | 568 | <!-- voice-ignore-line -->
| [Industry Change Through Vertical Disintegration: How and Why Markets Emerged in Mortgage Banking](cards/jacobides-2005-industry-change-through-vertical-disintegration.md) | Michael G. Jacobides | 2005 | 565 | <!-- voice-ignore-line -->
| [The Growth of Finance](cards/greenwood-2013-the-growth-of-finance.md) | Robin Greenwood and others | 2013 | 564 | <!-- voice-ignore-line -->
| [Home Is Where the Equity Is: Mortgage Refinancing and Household Consumption](cards/hurst-2004-home-is-where-the-equity.md) | Erik G. Hurst and others | 2004 | 550 | <!-- voice-ignore-line -->
| [What's the point of credit scoring?](cards/mester-1997-what-s-the-point-of.md) | Loretta Jean Mester | 1997 | 541 | <!-- voice-ignore-line -->
| [Over the Cliff: From the Subprime to the Global Financial Crisis](cards/mishkin-2011-over-the-cliff-from-the.md) | Frederic S. Mishkin | 2011 | 531 | <!-- voice-ignore-line -->
| [Déjà Vu All Over Again: The Causes of U.S. Commercial Bank Failures This Time Around](cards/cole-2011-deja-vu-all-over-again.md) | Rebel A. Cole and others | 2011 | 529 | <!-- voice-ignore-line -->
| [The external costs of foreclosure: The impact of single‐family mortgage foreclosures on property values](cards/immergluck-2006-the-external-costs-of-foreclosure.md) | Dan Immergluck and others | 2006 | 526 | <!-- voice-ignore-line -->
| [Securitization and the Declining Impact of Bank Finance on Loan Supply: Evidence from Mortgage Originations](cards/loutskina-2009-securitization-and-the-declining-impact.md) | Elena Loutskina and others | 2009 | 522 | <!-- voice-ignore-line -->
| [Exploiting Naïvete about Self-Control in the Credit Market](cards/heidhues-2010-exploiting-naivete-about-self-control.md) | Paul Heidhues and others | 2010 | 521 | <!-- voice-ignore-line -->

<a id="crypto"></a>

## Cryptocurrency

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Bitcoin: A Peer-to-Peer Electronic Cash System](cards/squarepants-2022-bitcoin-a-peer-to-peer.md) | Spongebob Squarepants | 2022 | 10816 | <!-- voice-ignore-line -->
| [Ethereum: A Secure Decentralised Generalised Transaction Ledger](cards/wood-2013-ethereum-a-secure-decentralised-generalised.md) | Gavin Wood | 2013 | 7761 | <!-- voice-ignore-line -->
| [Blockchain Revolution: How the Technology Behind Bitcoin Is Changing Money, Business, and the World](cards/tapscott-2016-blockchain-revolution-how-the-technology.md) | Don Tapscott and others | 2016 | 3855 | <!-- voice-ignore-line -->
| [On the Fintech Revolution: Interpreting the Forces of Innovation, Disruption, and Transformation in Financial Services](cards/gomber-2018-on-the-fintech-revolution-interpreting.md) | Peter Gomber and others | 2018 | 3491 | <!-- voice-ignore-line -->
| [Bitcoin: Economics, Technology, and Governance](cards/bohme-2015-bitcoin-economics-technology-and-governance.md) | Rainer Böhme and others | 2015 | 2634 | <!-- voice-ignore-line -->
| [Bitcoin and Cryptocurrency Technologies: A Comprehensive Introduction](cards/narayanan-2016-bitcoin-and-cryptocurrency-technologies-a.md) | Arvind Narayanan and others | 2016 | 2366 | <!-- voice-ignore-line -->
| [Bitcoin and Beyond: A Technical Survey on Decentralized Digital Currencies](cards/tschorsch-2016-bitcoin-and-beyond-a-technical.md) | Florian Tschorsch and others | 2016 | 2002 | <!-- voice-ignore-line -->
| [Bitcoin, gold and the dollar – A GARCH volatility analysis](cards/dyhrberg-2015-bitcoin-gold-and-the-dollar.md) | Anne Haubo Dyhrberg | 2015 | 1997 | <!-- voice-ignore-line -->
| [Bitcoin: Medium of exchange or speculative assets?](cards/baur-2017-bitcoin-medium-of-exchange-or.md) | Dirk G. Baur and others | 2017 | 1958 | <!-- voice-ignore-line -->
| [On the hedge and safe haven properties of Bitcoin: Is it really more than a diversifier?](cards/bouri-2016-on-the-hedge-and-safe.md) | Elie I. Bouri and others | 2016 | 1832 | <!-- voice-ignore-line -->
| [PPCoin: Peer-to-Peer Crypto-Currency with Proof-of-Stake](cards/king-2012-ppcoin-peer-to-peer-crypto.md) | Sunny King and others | 2012 | 1800 | <!-- voice-ignore-line -->
| [Speculative bubbles in Bitcoin markets? An empirical investigation into the fundamental value of Bitcoin](cards/cheah-2015-speculative-bubbles-in-bitcoin-markets.md) | Jeremy Eng‐Tuck Cheah and others | 2015 | 1776 | <!-- voice-ignore-line -->
| [The Inefficiency of Bitcoin](cards/urquhart-2016-the-inefficiency-of-bitcoin.md) | Andrew Urquhart | 2016 | 1657 | <!-- voice-ignore-line -->
| [Exploring the Dynamic Relationships between Cryptocurrencies and Other Financial Assets](cards/corbet-2017-exploring-the-dynamic-relationships-between.md) | Shaen Corbet and others | 2017 | 1618 | <!-- voice-ignore-line -->
| [Blockchain beyond bitcoin](cards/underwood-2016-blockchain-beyond-bitcoin.md) | Sarah Underwood | 2016 | 1460 | <!-- voice-ignore-line -->
| [A Survey on Security and Privacy Issues of Bitcoin](cards/conti-2018-a-survey-on-security-and.md) | Mauro Conti and others | 2018 | 1390 | <!-- voice-ignore-line -->
| [Volatility estimation for Bitcoin: A comparison of GARCH models](cards/katsiampa-2017-volatility-estimation-for-bitcoin-a.md) | Paraskevi Katsiampa | 2017 | 1388 | <!-- voice-ignore-line -->
| [Mastering Bitcoin: Unlocking Digital Crypto-Currencies](cards/antonopoulos-2014-mastering-bitcoin-unlocking-digital-crypto.md) | Andreas M. Antonopoulos | 2014 | 1333 | <!-- voice-ignore-line -->
| [Risks and Returns of Cryptocurrency](cards/liu-2018-risks-and-returns-of-cryptocurrency.md) | Yukun Liu and others | 2018 | 1321 | <!-- voice-ignore-line -->
| [The economics of BitCoin price formation](cards/ciaian-2015-the-economics-of-bitcoin-price.md) | Pavel Ciaian and others | 2015 | 1283 | <!-- voice-ignore-line -->
| [What Are the Main Drivers of the Bitcoin Price? Evidence from Wavelet Coherence Analysis](cards/kristoufek-2015-what-are-the-main-drivers.md) | Ladislav Krištoufek | 2015 | 1255 | <!-- voice-ignore-line -->
| [Hedging capabilities of bitcoin. Is it the virtual gold?](cards/dyhrberg-2015-hedging-capabilities-of-bitcoin-is.md) | Anne Haubo Dyhrberg | 2015 | 1233 | <!-- voice-ignore-line -->
| [Trading and Arbitrage in Cryptocurrency Markets](cards/makarov-2018-trading-and-arbitrage-in-cryptocurrency.md) | Igor Makarov and others | 2018 | 1155 | <!-- voice-ignore-line -->
| [Is Bitcoin a Real Currency? An Economic Appraisal](cards/yermack-2015-is-bitcoin-a-real-currency.md) | David Yermack | 2015 | 1124 | <!-- voice-ignore-line -->
| [Blockchain Disruption and Decentralized Finance: The Rise of Decentralized Business Models](cards/chen-2019-blockchain-disruption-and-decentralized-finance.md) | Yan Chen and others | 2019 | 1121 | <!-- voice-ignore-line -->
| [BitCoin meets Google Trends and Wikipedia: Quantifying the relationship between phenomena of the Internet era](cards/kristoufek-2013-bitcoin-meets-google-trends-and.md) | Ladislav Krištoufek | 2013 | 1116 | <!-- voice-ignore-line -->
| [Decentralized Finance: On Blockchain- and Smart Contract-Based Financial Markets](cards/schar-2020-decentralized-finance-on-blockchain-and.md) | Fabian Schär | 2020 | 1083 | <!-- voice-ignore-line -->
| [Decentralized Finance](cards/zetzsche-2020-decentralized-finance.md) | Dirk Andreas Zetzsche and others | 2020 | 1061 | <!-- voice-ignore-line -->
| [The contagion effects of the COVID-19 pandemic: Evidence from gold and cryptocurrencies](cards/corbet-2020-the-contagion-effects-of-the.md) | Shaen Corbet and others | 2020 | 1045 | <!-- voice-ignore-line -->
| [Eclipse attacks on Bitcoin's peer-to-peer network](cards/heilman-2015-eclipse-attacks-on-bitcoin-s.md) | Ethan Heilman and others | 2015 | 1033 | <!-- voice-ignore-line -->
| [Bitcoin is not the New Gold – A comparison of volatility, correlation, and portfolio performance](cards/klein-2018-bitcoin-is-not-the-new.md) | Tony Klein and others | 2018 | 1020 | <!-- voice-ignore-line -->
| [Majority is not enough: bitcoin mining is vulnerable](cards/eyal-2018-majority-is-not-enough-bitcoin.md) | Ittay Eyal and others | 2018 | 1006 | <!-- voice-ignore-line -->
| [Does Bitcoin hedge global uncertainty? Evidence from wavelet-based quantile-in-quantile regressions](cards/bouri-2017-does-bitcoin-hedge-global-uncertainty.md) | Elie I. Bouri and others | 2017 | 977 | <!-- voice-ignore-line -->
| [Safe haven or risky hazard? Bitcoin during the Covid-19 bear market](cards/conlon-2020-safe-haven-or-risky-hazard.md) | Thomas Conlon and others | 2020 | 956 | <!-- voice-ignore-line -->
| [Bitcoin's Growing Energy Problem](cards/vries-2018-bitcoin-s-growing-energy-problem.md) | Alex de Vries | 2018 | 955 | <!-- voice-ignore-line -->
| [Price manipulation in the Bitcoin ecosystem](cards/gandal-2018-price-manipulation-in-the-bitcoin.md) | Neil Gandal and others | 2018 | 952 | <!-- voice-ignore-line -->
| [Bitcoin-NG: A Scalable Blockchain Protocol](cards/eyal-2015-bitcoin-ng-a-scalable-blockchain.md) | Ittay Eyal and others | 2015 | 943 | <!-- voice-ignore-line -->
| [Introducing Ethereum and Solidity: Foundations of Cryptocurrency and Blockchain Programming for Beginners](cards/dannen-2017-introducing-ethereum-and-solidity-foundations.md) | Chris Dannen | 2017 | 937 | <!-- voice-ignore-line -->
| [An Analysis of Anonymity in the Bitcoin System](cards/reid-2012-an-analysis-of-anonymity-in.md) | Fergal Reid and others | 2012 | 918 | <!-- voice-ignore-line -->
| [Can volume predict Bitcoin returns and volatility? A quantiles-based approach](cards/balclar-2017-can-volume-predict-bitcoin-returns.md) | Mehmet Balcılar and others | 2017 | 858 | <!-- voice-ignore-line -->
| [BITCOIN - ASSET OR CURRENCY? REVEALING USERS' HIDDEN INTENTIONS](cards/glaser-2014-bitcoin-asset-or-currency-revealing.md) | Florian Glaser and others | 2014 | 854 | <!-- voice-ignore-line -->
| [Blockchains and the economic institutions of capitalism](cards/davidson-2018-blockchains-and-the-economic-institutions.md) | Sinclair Davidson and others | 2018 | 822 | <!-- voice-ignore-line -->
| [Is Bitcoin Really Un-Tethered?](cards/griffin-2018-is-bitcoin-really-un-tethered.md) | John M. Griffin and others | 2018 | 782 | <!-- voice-ignore-line -->
| [Does economic policy uncertainty predict the Bitcoin returns? An empirical investigation](cards/demir-2018-does-economic-policy-uncertainty-predict.md) | Ender Demir and others | 2018 | 779 | <!-- voice-ignore-line -->
| [Common Risk Factors in Cryptocurrency](cards/liu-2019-common-risk-factors-in-cryptocurrency.md) | Yukun Liu and others | 2019 | 772 | <!-- voice-ignore-line -->
| [Bitcoins as an investment or speculative vehicle? A first look](cards/baek-2014-bitcoins-as-an-investment-or.md) | Chaeyoon Baek and others | 2014 | 768 | <!-- voice-ignore-line -->
| [Portfolio diversification with virtual currency: Evidence from bitcoin](cards/guesmi-2018-portfolio-diversification-with-virtual-currency.md) | Khaled Guesmi and others | 2018 | 767 | <!-- voice-ignore-line -->
| [On the inefficiency of Bitcoin](cards/nadarajah-2016-on-the-inefficiency-of-bitcoin.md) | Saralees Nadarajah and others | 2016 | 766 | <!-- voice-ignore-line -->
| [Proof of Activity: Extending Bitcoin's Proof of Work via Proof of Stake [Extended Abstract]y](cards/bentov-2014-proof-of-activity-extending-bitcoin.md) | Iddo Bentov and others | 2014 | 761 | <!-- voice-ignore-line -->
| [Is non-fungible token pricing driven by cryptocurrencies?](cards/dowling-2021-is-non-fungible-token-pricing.md) | Michael Dowling | 2021 | 757 | <!-- voice-ignore-line -->
| [On the Financing Benefits of Supply Chain Transparency and Blockchain Adoption](cards/chod-2020-on-the-financing-benefits-of.md) | Jiri Chod and others | 2020 | 755 | <!-- voice-ignore-line -->
| [From Mining to Markets: the Evolution of Bitcoin Transaction Fees](cards/easley-2017-from-mining-to-markets-the.md) | David A. Easley and others | 2017 | 740 | <!-- voice-ignore-line -->
| [A Survey on Ethereum Systems Security: Vulnerabilities, Attacks, and Defenses](cards/chen-2020-a-survey-on-ethereum-systems.md) | Huashan Chen and others | 2020 | 738 | <!-- voice-ignore-line -->
| [The inefficiency of Bitcoin revisited: A dynamic approach](cards/bariviera-2017-the-inefficiency-of-bitcoin-revisited.md) | Aurelio F. Bariviera | 2017 | 730 | <!-- voice-ignore-line -->
| [The Carbon Footprint of Bitcoin](cards/stoll-2019-the-carbon-footprint-of-bitcoin.md) | Christian Stoll and others | 2019 | 724 | <!-- voice-ignore-line -->
| [Dynamic connectedness and integration in cryptocurrency markets](cards/ji-2018-dynamic-connectedness-and-integration-in.md) | Qiang Ji and others | 2018 | 718 | <!-- voice-ignore-line -->
| [Why Do Businesses Go Crypto? An Empirical Analysis of Initial Coin Offerings](cards/adhami-2017-why-do-businesses-go-crypto.md) | Saman Adhami and others | 2017 | 705 | <!-- voice-ignore-line -->
| [Bitcoin: An Innovative Alternative Digital Currency](cards/grinberg-2011-bitcoin-an-innovative-alternative-digital.md) | Reuben Grinberg | 2011 | 694 | <!-- voice-ignore-line -->
| [Are cryptocurrencies a safe haven for equity markets? An international perspective from the COVID-19 pandemic](cards/conlon-2020-are-cryptocurrencies-a-safe-haven.md) | Thomas Conlon and others | 2020 | 692 | <!-- voice-ignore-line -->
| [Mastering Bitcoin: Programming the Open Blockchain](cards/antonopoulos-2017-mastering-bitcoin-programming-the-open.md) | Andreas M. Antonopoulos | 2017 | 684 | <!-- voice-ignore-line -->
| [Sustainability of bitcoin and blockchains](cards/vranken-2017-sustainability-of-bitcoin-and-blockchains.md) | Harald Vranken | 2017 | 672 | <!-- voice-ignore-line -->
| [Blockchain and Its Coming Impact on Financial Services](cards/fanning-2016-blockchain-and-its-coming-impact.md) | Kurt M. Fanning and others | 2016 | 671 | <!-- voice-ignore-line -->
| [Initial Coin Offerings: Financing Growth with Cryptocurrency Token Sales](cards/howell-2018-initial-coin-offerings-financing-growth.md) | Sabrina T Howell and others | 2018 | 670 | <!-- voice-ignore-line -->
| [Herding behaviour in cryptocurrencies](cards/bouri-2018-herding-behaviour-in-cryptocurrencies.md) | Elie I. Bouri and others | 2018 | 661 | <!-- voice-ignore-line -->
| [Cryptocurrency trading: a comprehensive survey](cards/fang-2022-cryptocurrency-trading-a-comprehensive-survey.md) | Fan Fang and others | 2022 | 645 | <!-- voice-ignore-line -->
| [Initial coin offerings (ICOs) to finance new ventures](cards/fisch-2018-initial-coin-offerings-icos-to.md) | Christian O. Fisch | 2018 | 640 | <!-- voice-ignore-line -->

<a id="prediction-markets"></a>

## Prediction Markets

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Evaluating replicability of laboratory experiments in economics](cards/camerer-2016-evaluating-replicability-of-laboratory-experiments.md) | Colin F. Camerer and others | 2016 | 1581 | <!-- voice-ignore-line -->
| [Prediction Markets](cards/wolfers-2004-prediction-markets.md) | Justin J. Wolfers and others | 2004 | 1374 | <!-- voice-ignore-line -->
| [Combinatorial Information Market Design](cards/hanson-2003-combinatorial-information-market-design.md) | Robin Hanson | 2003 | 658 | <!-- voice-ignore-line -->
| [Competing for Attention in Knowledge Markets: Electronic Document Dissemination in a Management Consulting Company](cards/hansen-2001-competing-for-attention-in-knowledge.md) | Morten T. Hansen and others | 2001 | 522 | <!-- voice-ignore-line -->
| [The market for information and the origin of financial intermediation](cards/allen-1990-the-market-for-information-and.md) | Franklin Allen | 1990 | 502 | <!-- voice-ignore-line -->
| [Information Markets and the Comovement of Asset Prices](cards/veldkamp-2006-information-markets-and-the-comovement.md) | Laura Veldkamp | 2006 | 469 | <!-- voice-ignore-line -->
| [Interpreting the predictions of prediction markets](cards/manski-2006-interpreting-the-predictions-of-prediction.md) | Charles F. Manski | 2006 | 416 | <!-- voice-ignore-line -->
| [Prediction market accuracy in the long run](cards/berg-2008-prediction-market-accuracy-in-the.md) | Joyce E. Berg and others | 2008 | 407 | <!-- voice-ignore-line -->
| [Nonlinear Pricing of Information Goods](cards/sundararajan-2004-nonlinear-pricing-of-information-goods.md) | Arun Sundararajan | 2004 | 393 | <!-- voice-ignore-line -->
| [Using prediction markets to estimate the reproducibility of scientific research](cards/dreber-2015-using-prediction-markets-to-estimate.md) | Anna Dreber and others | 2015 | 378 | <!-- voice-ignore-line -->
| [Prediction Markets: Does Money Matter?](cards/schreiber-2004-prediction-markets-does-money-matter.md) | Emile Servan-Schreiber and others | 2004 | 350 | <!-- voice-ignore-line -->
| [Information Choice in Macroeconomics and Finance](cards/veldkamp-2011-information-choice-in-macroeconomics-and.md) | Laura Veldkamp | 2011 | 344 | <!-- voice-ignore-line -->
| [Partisan Impacts on the Economy: Evidence from Prediction Markets and Close Elections](cards/snowberg-2007-partisan-impacts-on-the-economy.md) | Erik Snowberg and others | 2007 | 333 | <!-- voice-ignore-line -->
| [Markets for Information: An Introduction](cards/bergemann-2019-markets-for-information-an-introduction.md) | Dirk Bergemann and others | 2019 | 328 | <!-- voice-ignore-line -->
| [Understanding Digital Markets: Review and Assessment](cards/smith-2000-understanding-digital-markets-review-and.md) | Michael D. Smith and others | 2000 | 327 | <!-- voice-ignore-line -->
| [Media Frenzies in Markets for Financial Information](cards/veldkamp-2006-media-frenzies-in-markets-for.md) | Laura Veldkamp | 2006 | 323 | <!-- voice-ignore-line -->
| [Prediction Markets as Decision Support Systems](cards/berg-2003-prediction-markets-as-decision-support.md) | Joyce E. Berg and others | 2003 | 274 | <!-- voice-ignore-line -->
| [Does Voluntary Disclosure Improve Stock Price Informativeness?](cards/haggard-2008-does-voluntary-disclosure-improve-stock.md) | K. Stephen Haggard and others | 2008 | 228 | <!-- voice-ignore-line -->
| [Distilling the Wisdom of Crowds: Prediction Markets vs. Prediction Polls](cards/atanasov-2016-distilling-the-wisdom-of-crowds.md) | Pavel Dimitrov Atanasov and others | 2016 | 213 | <!-- voice-ignore-line -->
| [Non‐financial disclosure regulation and environmental, social, and governance (ESG) performance: The case of EU and US firms](cards/cicchiello-2022-nonfinancial-disclosure-regulation-and-environmental.md) | Antonella Francesca Cicchiello and others | 2022 | 202 | <!-- voice-ignore-line -->
| [Group Judgments: Deliberation, Statistical Means, and Information Markets](cards/sunstein-2004-group-judgments-deliberation-statistical-means.md) | Cass Robert Sunstein | 2004 | 201 | <!-- voice-ignore-line -->
| [Methods to Elicit Forecasts from Groups: Delphi and Prediction Markets Compared](cards/green-2007-methods-to-elicit-forecasts-from.md) | Kesten C. Green and others | 2007 | 186 | <!-- voice-ignore-line -->
| [PREDICTION MARKETS: AN EXTENDED LITERATURE REVIEW](cards/tziralis-2012-prediction-markets-an-extended-literature.md) | George Tziralis and others | 2012 | 185 | <!-- voice-ignore-line -->
| [Market for Information: Experimental Evidence](cards/sunder-1992-market-for-information-experimental-evidence.md) | Shyam Sunder | 1992 | 181 | <!-- voice-ignore-line -->
| [Election uncertainty, economic policy uncertainty and financial market uncertainty: A prediction market analysis](cards/goodell-2019-election-uncertainty-economic-policy-uncertainty.md) | John W. Goodell and others | 2019 | 174 | <!-- voice-ignore-line -->
| [Augur: a Decentralized Oracle and Prediction Market Platform](cards/peterson-2015-augur-a-decentralized-oracle-and.md) | Jack Peterson and others | 2015 | 174 | <!-- voice-ignore-line -->
| [Using Markets to Inform Policy: The Case of the Iraq War](cards/wolfers-2009-using-markets-to-inform-policy.md) | Justin J. Wolfers and others | 2009 | 167 | <!-- voice-ignore-line -->
| [Are Political Markets Really Superior to Polls as Election Predictors?](cards/erikson-2008-are-political-markets-really-superior.md) | Robert S. Erikson and others | 2008 | 165 | <!-- voice-ignore-line -->
| [Using Prediction Markets and Twitter to Predict a Swine Flu Pandemic](cards/ritterman-2009-using-prediction-markets-and-twitter.md) | Joshua Ritterman and others | 2009 | 164 | <!-- voice-ignore-line -->
| [Suckers Are Born but Markets Are Made: Individual Rationality, Arbitrage, and Market Efficiency on an Electronic Futures Market](cards/oliven-2004-suckers-are-born-but-markets.md) | Kenneth Oliven and others | 2004 | 163 | <!-- voice-ignore-line -->
| [Intellectual capital and the capital market – organisation and competence](cards/holland-2003-intellectual-capital-and-the-capital.md) | John Holland | 2003 | 162 | <!-- voice-ignore-line -->
| [Understanding Voluntary Knowledge Provision and Content Contribution Through a Social-Media-Based Prediction Market: A Field Experiment](cards/qiu-2017-understanding-voluntary-knowledge-provision-and.md) | Liangfei Qiu and others | 2017 | 151 | <!-- voice-ignore-line -->
| [A grounded theory of corporate disclosure](cards/holland-2005-a-grounded-theory-of-corporate.md) | John Holland | 2005 | 148 | <!-- voice-ignore-line -->
| [Corporate Prediction Markets: Evidence from Google, Ford, and Firm X](cards/cowgill-2015-corporate-prediction-markets-evidence-from.md) | Bo Cowgill and others | 2015 | 145 | <!-- voice-ignore-line -->
| [Forecasting Tournaments: Tools for Increasing Transparency and Improving the Quality of Debate](cards/tetlock-2014-forecasting-tournaments-tools-for-increasing.md) | Philip E. Tetlock and others | 2014 | 133 | <!-- voice-ignore-line -->
| [Group Judgments: Statistical Means, Deliberation, and Information Markets](cards/sunstein-2005-group-judgments-statistical-means-deliberation.md) | Cass Robert Sunstein | 2005 | 133 | <!-- voice-ignore-line -->
| [Prediction Markets for Corporate Governance](cards/abramowicz-2006-prediction-markets-for-corporate-governance.md) | Marc Abramowicz and others | 2006 | 130 | <!-- voice-ignore-line -->
| [E-commerce and the information market](cards/grover-2001-e-commerce-and-the-information.md) | Varun Grover and others | 2001 | 129 | <!-- voice-ignore-line -->
| [Forecasting Elections](cards/rothschild-2009-forecasting-elections.md) | David M. Rothschild | 2009 | 127 | <!-- voice-ignore-line -->
| [Elections and Markets: The Effect of Partisanship, Policy Risk, and Electoral Margins on the Economy](cards/fowler-2005-elections-and-markets-the-effect.md) | James Fowler | 2005 | 124 | <!-- voice-ignore-line -->
| [Prediction Markets in Theory and Practice](cards/wolfers-2006-prediction-markets-in-theory-and.md) | Justin J. Wolfers and others | 2006 | 117 | <!-- voice-ignore-line -->
| [Gaming Prediction Markets: Equilibrium Strategies with a Market Maker](cards/chen-2009-gaming-prediction-markets-equilibrium-strategies.md) | Yiling Chen and others | 2009 | 114 | <!-- voice-ignore-line -->
| [Supply chain information sharing in a macro prediction market](cards/guo-2006-supply-chain-information-sharing-in.md) | Zhiling Guo and others | 2006 | 113 | <!-- voice-ignore-line -->
| [Accuracy and Forecast Standard Error of Prediction Markets](cards/berg-2003-accuracy-and-forecast-standard-error.md) | Joyce E. Berg and others | 2003 | 111 | <!-- voice-ignore-line -->
| [Efficient Market Making via Convex Optimization, and a Connection to Online Learning](cards/abernethy-2013-efficient-market-making-via-convex.md) | Jacob Abernethy and others | 2013 | 109 | <!-- voice-ignore-line -->
| [Path dependence and path creation: Framing the extra‐financial information market for a sustainable trajectory](cards/caron-2009-path-dependence-and-path-creation.md) | Marie‐Andrée Caron and others | 2009 | 107 | <!-- voice-ignore-line -->
| [Marketing Information: A Competitive Analysis](cards/sarvary-1997-marketing-information-a-competitive-analysis.md) | Miklós Sárváry and others | 1997 | 107 | <!-- voice-ignore-line -->
| [Private Investor Participation and Commercialization Rates for Government‐sponsored Research and Development: Would a Prediction Market Improve the Performance of the SBIR Programme?](cards/link-2009-private-investor-participation-and-commercialization.md) | Albert N. Link and others | 2009 | 105 | <!-- voice-ignore-line -->
| [Do Prediction Markets Produce Well‐Calibrated Probability Forecasts?](cards/page-2012-do-prediction-markets-produce-wellcalibrated.md) | Lionel Page and others | 2012 | 98 | <!-- voice-ignore-line -->
| [A Manipulator Can Aid Prediction Market Accuracy](cards/hanson-2009-a-manipulator-can-aid-prediction.md) | Robin Hanson and others | 2009 | 98 | <!-- voice-ignore-line -->
| [Using a Free Permit Rule to Forecast the Marginal Abatement Cost of Proposed Climate Policy](cards/meng-2017-using-a-free-permit-rule.md) | Kyle C. Meng | 2017 | 95 | <!-- voice-ignore-line -->
| [Computational Aspects of Prediction Markets](cards/pennock-2007-computational-aspects-of-prediction-markets.md) | David M. Pennock and others | 2007 | 95 | <!-- voice-ignore-line -->
| [Prediction Markets and the Financial "Wisdom of Crowds"](cards/ray-2006-prediction-markets-and-the-financial.md) | Russ Ray | 2006 | 92 | <!-- voice-ignore-line -->
| [What Makes Markets Predict Well? Evidence from the Iowa Electronic Markets](cards/berg-1997-what-makes-markets-predict-well.md) | Joyce E. Berg and others | 1997 | 90 | <!-- voice-ignore-line -->
| [Designing Markets for Prediction](cards/chen-2010-designing-markets-for-prediction.md) | Yiling Chen and others | 2010 | 87 | <!-- voice-ignore-line -->
| [Prediction Markets for Economic Forecasting](cards/snowberg-2013-prediction-markets-for-economic-forecasting.md) | Erik Snowberg and others | 2013 | 84 | <!-- voice-ignore-line -->
| [New Product Blockbusters: The Magic and Science of Prediction Markets](cards/ho-2007-new-product-blockbusters-the-magic.md) | Teck‐Hua Ho and others | 2007 | 84 | <!-- voice-ignore-line -->
| [Public Disclosure and the Structure of Private Information Markets](cards/bushman-1991-public-disclosure-and-the-structure.md) | Robert M. Bushman | 1991 | 83 | <!-- voice-ignore-line -->
| [How psychological framing affects economic market prices in the lab and field](cards/sonnemann-2013-how-psychological-framing-affects-economic.md) | Ulrich Sonnemann and others | 2013 | 82 | <!-- voice-ignore-line -->
| [Statistical Tests of Real‐Money versus Play‐Money Prediction Markets](cards/rosenbloom-2006-statistical-tests-of-realmoney-versus.md) | E.S. Rosenbloom and others | 2006 | 81 | <!-- voice-ignore-line -->
| [Prediction Markets: Alternative Mechanisms for Complex Environments with Few Traders](cards/healy-2010-prediction-markets-alternative-mechanisms-for.md) | Paul J. Healy and others | 2010 | 80 | <!-- voice-ignore-line -->
| [PREDICTION MARKETS: PRACTICAL EXPERIMENTS IN SMALL MARKETS AND BEHAVIOURS OBSERVED](cards/christiansen-2012-prediction-markets-practical-experiments-in.md) | Jed D Christiansen | 2012 | 77 | <!-- voice-ignore-line -->
| [Interpreting Prediction Market Prices as Probabilities](cards/wolfers-2006-interpreting-prediction-market-prices-as.md) | Justin J. Wolfers and others | 2006 | 75 | <!-- voice-ignore-line -->
| [A Practical Liquidity-Sensitive Automated Market Maker](cards/othman-2013-a-practical-liquidity-sensitive-automated.md) | Abraham Othman and others | 2013 | 73 | <!-- voice-ignore-line -->
| [Choice Among Financial Reporting Alternatives.](cards/demski-1974-choice-among-financial-reporting-alternatives.md) | J.A. Demski | 1974 | 72 | <!-- voice-ignore-line -->
| [Manipulating political stock markets: A field experiment and a century of observational data](cards/rhode-2006-manipulating-political-stock-markets-a.md) | Paul W. Rhode and others | 2006 | 71 | <!-- voice-ignore-line -->

<a id="sports-betting"></a>

## Sports Betting Markets

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Anomalies: Parimutuel Betting Markets: Racetracks and Lotteries](cards/thaler-1988-anomalies-parimutuel-betting-markets-racetracks.md) | Richard H. Thaler and others | 1988 | 732 | <!-- voice-ignore-line -->
| [Modelling Association Football Scores and Inefficiencies in the Football Betting Market](cards/dixon-1997-modelling-association-football-scores-and.md) | Mark J. Dixon and others | 1997 | 657 | <!-- voice-ignore-line -->
| [LOGARITHMIC MARKETS CORING RULES FOR MODULAR COMBINATORIAL INFORMATION AGGREGATION](cards/hanson-2012-logarithmic-markets-coring-rules-for.md) | Robin Hanson | 2012 | 462 | <!-- voice-ignore-line -->
| [Why are Gambling Markets Organised so Differently from Financial Markets?](cards/levitt-2004-why-are-gambling-markets-organised.md) | Steven D. Levitt | 2004 | 457 | <!-- voice-ignore-line -->
| [The Economics of Wagering Markets](cards/sauer-1998-the-economics-of-wagering-markets.md) | Raymond D. Sauer | 1998 | 435 | <!-- voice-ignore-line -->
| [Outcome uncertainty and attendance demand in sport: the case of English soccer](cards/forrest-2002-outcome-uncertainty-and-attendance-demand.md) | David Forrest and others | 2002 | 405 | <!-- voice-ignore-line -->
| [Explaining the Favorite–Long Shot Bias: Is it Risk-Love or Misperceptions?](cards/snowberg-2010-explaining-the-favoritelong-shot-bias.md) | Erik Snowberg and others | 2010 | 372 | <!-- voice-ignore-line -->
| [Historical Presidential Betting Markets](cards/rhode-2004-historical-presidential-betting-markets.md) | Paul W. Rhode and others | 2004 | 276 | <!-- voice-ignore-line -->
| [Efficiency of the Market for Racetrack Betting](cards/hausch-1981-efficiency-of-the-market-for.md) | Donald B. Hausch and others | 1981 | 269 | <!-- voice-ignore-line -->
| [Market Efficiency and the Favorite-Longshot Bias: The Baseball Betting Market](cards/woodland-1994-market-efficiency-and-the-favorite.md) | Linda M. Woodland and others | 1994 | 248 | <!-- voice-ignore-line -->
| [Testing Market Efficiency: Evidence From The NFL Sports Betting Market](cards/gray-1997-testing-market-efficiency-evidence-from.md) | Philip K. Gray and others | 1997 | 246 | <!-- voice-ignore-line -->
| [Forecasting football results and the efficiency of fixed‐odds betting](cards/goddard-2004-forecasting-football-results-and-the.md) | John A. Goddard and others | 2004 | 242 | <!-- voice-ignore-line -->
| [The use of machine learning in sport outcome prediction: A review](cards/horvat-2020-the-use-of-machine-learning.md) | Tomislav Horvat and others | 2020 | 240 | <!-- voice-ignore-line -->
| [Information Salience, Investor Sentiment, and Stock Returns: The Case of British Soccer Betting](cards/palomino-2008-information-salience-investor-sentiment-and.md) | Frederic Albert Palomino and others | 2008 | 236 | <!-- voice-ignore-line -->
| [Sports forecasting: a comparison of the forecast accuracy of prediction markets, betting odds and tipsters](cards/spann-2008-sports-forecasting-a-comparison-of.md) | Martin Spann and others | 2008 | 232 | <!-- voice-ignore-line -->
| [Measuring the Incidence of Insider Trading in a Market for State-Contingent Claims](cards/shin-1993-measuring-the-incidence-of-insider.md) | Hyun Song Shin | 1993 | 228 | <!-- voice-ignore-line -->
| [The Kelly Capital Growth Investment Criterion: Theory and Practice](cards/maclean-2011-the-kelly-capital-growth-investment.md) | Leonard C. MacLean and others | 2011 | 220 | <!-- voice-ignore-line -->
| [Subjective Information and Market Efficiency in a Betting Market](cards/figlewski-1979-subjective-information-and-market-efficiency.md) | Stephen Figlewski | 1979 | 219 | <!-- voice-ignore-line -->
| [Testing Rationality in the Point Spread Betting Market](cards/gandar-1988-testing-rationality-in-the-point.md) | John M. Gandar and others | 1988 | 205 | <!-- voice-ignore-line -->
| [Probability and Risk: Foundations and Economic Implications of Probability-Dependent Risk Preferences](cards/duda-2012-probability-and-risk-foundations-and.md) | Helga Fehr-Duda and others | 2012 | 201 | <!-- voice-ignore-line -->
| [Optimal Betting Odds Against Insider Traders](cards/shin-1991-optimal-betting-odds-against-insider.md) | Hyun Song Shin | 1991 | 193 | <!-- voice-ignore-line -->
| [Identifying Investor Sentiment from Price Paths: The Case of Football Betting](cards/avery-1999-identifying-investor-sentiment-from-price.md) | Christopher Norio Avery and others | 1999 | 191 | <!-- voice-ignore-line -->
| [Information and efficiency: an empirical study of a fixed odds betting market](cards/kuypers-2000-information-and-efficiency-an-empirical.md) | Tim Kuypers | 2000 | 190 | <!-- voice-ignore-line -->
| [Prices of State Contingent Claims with Insider Traders, and the Favourite-Longshot Bias](cards/shin-1992-prices-of-state-contingent-claims.md) | Hyun Song Shin | 1992 | 189 | <!-- voice-ignore-line -->
| [The degree of inefficiency in the football betting market Statistical tests](cards/golec-1991-the-degree-of-inefficiency-in.md) | Joseph H. Golec | 1991 | 181 | <!-- voice-ignore-line -->
| [Information, Prices and Efficiency in a Fixed-Odds Betting Market](cards/pope-1989-information-prices-and-efficiency-in.md) | Peter F. Pope and others | 1989 | 173 | <!-- voice-ignore-line -->
| [Racetrack betting and informed behavior](cards/asch-1982-racetrack-betting-and-informed-behavior.md) | Peter Asch and others | 1982 | 167 | <!-- voice-ignore-line -->
| [The Favourite‐Longshot Bias and Market Efficiency in UK Football betting](cards/cain-2000-the-favouritelongshot-bias-and-market.md) | Michael Cain and others | 2000 | 166 | <!-- voice-ignore-line -->
| [Information Efficiency in Betting Markets: a Survey](cards/williams-1999-information-efficiency-in-betting-markets.md) | Leighton Vaughan Williams | 1999 | 163 | <!-- voice-ignore-line -->
| [Can Asset Markets Be Manipulated? A Field Experiment With Racetrack Betting](cards/camerer-1998-can-asset-markets-be-manipulated.md) | Colin F. Camerer | 1998 | 154 | <!-- voice-ignore-line -->
| [A birth process model for association football matches](cards/dixon-1998-a-birth-process-model-for.md) | Mark J. Dixon and others | 1998 | 149 | <!-- voice-ignore-line -->
| [Information and Efficiency: Goal Arrival in Soccer Betting](cards/croxson-2013-information-and-efficiency-goal-arrival.md) | Karen Croxson and others | 2013 | 144 | <!-- voice-ignore-line -->
| [Sentiment in the betting market on Spanish football](cards/forrest-2007-sentiment-in-the-betting-market.md) | David Forrest and others | 2007 | 142 | <!-- voice-ignore-line -->
| [Financial markets can go mad: evidence of irrational behaviour during the South Sea Bubble1](cards/dale-2005-financial-markets-can-go-mad.md) | RICHARD S. DALE and others | 2005 | 142 | <!-- voice-ignore-line -->
| [Why is There a Favourite-Longshot Bias in British Racetrack Betting Markets](cards/williams-1997-why-is-there-a-favourite.md) | Leighton Vaughan Williams and others | 1997 | 142 | <!-- voice-ignore-line -->
| [Market Efficiency in Racetrack Betting](cards/asch-1984-market-efficiency-in-racetrack-betting.md) | Peter Asch and others | 1984 | 139 | <!-- voice-ignore-line -->
| [How Efficient is the European Football Betting Market? Evidence from Arbitrage and Trading Strategies](cards/vlastakis-2007-how-efficient-is-the-european.md) | Nikolaos Vlastakis and others | 2007 | 131 | <!-- voice-ignore-line -->
| [Dynamic modelling and prediction of English Football League matches for betting](cards/crowder-2002-dynamic-modelling-and-prediction-of.md) | Martin J. Crowder and others | 2002 | 130 | <!-- voice-ignore-line -->
| [On the Efficiency and Equity of Betting Markets](cards/dowie-1976-on-the-efficiency-and-equity.md) | Jack Dowie | 1976 | 127 | <!-- voice-ignore-line -->
| [Chapter 9 The Kelly Criterion in Blackjack Sports Betting, and the Stock Market](cards/thorp-2006-chapter-9-the-kelly-criterion.md) | Edward O. Thorp | 2006 | 125 | <!-- voice-ignore-line -->
| [On determining probability forecasts from betting odds](cards/strumbelj-2014-on-determining-probability-forecasts-from.md) | Erik Štrumbelj | 2014 | 124 | <!-- voice-ignore-line -->
| [On the Optimal Design of Lotteries](cards/quiggin-1991-on-the-optimal-design-of.md) | John C. Quiggin | 1991 | 124 | <!-- voice-ignore-line -->
| [The value of statistical forecasts in the UK association football betting market](cards/dixon-2004-the-value-of-statistical-forecasts.md) | Mark J. Dixon and others | 2004 | 123 | <!-- voice-ignore-line -->
| [Market Efficiency in Person‐to‐Person Betting](cards/smith-2006-market-efficiency-in-persontoperson-betting.md) | Michael Smith and others | 2006 | 122 | <!-- voice-ignore-line -->
| [Prediction accuracy of different market structures — bookmakers versus a betting exchange](cards/franck-2010-prediction-accuracy-of-different-market.md) | Egon P. Franck and others | 2010 | 118 | <!-- voice-ignore-line -->
| [Parimutuel betting markets as information aggregation devices: experimental results](cards/plott-2003-parimutuel-betting-markets-as-information.md) | Charles R. Plott and others | 2003 | 115 | <!-- voice-ignore-line -->
| [Informed Traders and Price Variations in the Betting Market for Professional Basketball Games](cards/gandar-1998-informed-traders-and-price-variations.md) | John M. Gandar and others | 1998 | 115 | <!-- voice-ignore-line -->
| [The Elasticity of Demand for Gambling](cards/suits-1979-the-elasticity-of-demand-for.md) | Daniel B. Suits | 1979 | 114 | <!-- voice-ignore-line -->
| [Sport analytics for cricket game results using machine learning: An experimental study](cards/kapadia-2020-sport-analytics-for-cricket-game.md) | Kumash Kapadia and others | 2020 | 112 | <!-- voice-ignore-line -->
| [Efficiency of online football betting markets](cards/angelini-2018-efficiency-of-online-football-betting.md) | Giovanni Angelini and others | 2018 | 110 | <!-- voice-ignore-line -->
| [Econophysics and Physical Economics](cards/richmond-2013-econophysics-and-physical-economics.md) | Peter Richmond and others | 2013 | 108 | <!-- voice-ignore-line -->
| [A Note on the Hayek Hypothesis and the Favorite-Longshot Bias in Parimutuel Betting](cards/hurley-1995-a-note-on-the-hayek.md) | William J. Hurley and others | 1995 | 107 | <!-- voice-ignore-line -->
| [Exploiting sports-betting market using machine learning](cards/hubacek-2019-exploiting-sports-betting-market-using.md) | Ondřej Hubáček and others | 2019 | 105 | <!-- voice-ignore-line -->
| [Some Evidence of Insider Knowledge in Horse Race Betting in Britain](cards/crafts-1985-some-evidence-of-insider-knowledge.md) | Nicholas F. R. Crafts | 1985 | 105 | <!-- voice-ignore-line -->
| [The kelly criterion in blackjack sports betting, and the stock market](cards/thorp-2008-the-kelly-criterion-in-blackjack.md) | Edward O. Thorp | 2008 | 100 | <!-- voice-ignore-line -->
| [Market Efficiency and Profitable Wagering in the National Hockey League: Can Bettors Score on Longshots?](cards/woodland-2001-market-efficiency-and-profitable-wagering.md) | Linda M. Woodland and others | 2001 | 99 | <!-- voice-ignore-line -->
| [Determining the level of ability of football teams by dynamic ratings based on the relative discrepancies in scores between adversaries](cards/constantinou-2013-determining-the-level-of-ability.md) | Anthony Costa Constantinou and others | 2013 | 98 | <!-- voice-ignore-line -->
| [How to Be IncoherentandSeductive: Bookmakers' Odds and Support Theory](cards/ayton-1997-how-to-be-incoherentandseductive-bookmakers.md) | Peter Ayton | 1997 | 95 | <!-- voice-ignore-line -->
| [The Favourite‐Longshot Bias, Bookmaker Margins and Insider Trading in a Variety of Betting Markets](cards/cain-2003-the-favouritelongshot-bias-bookmaker-margins.md) | Michael Cain and others | 2003 | 93 | <!-- voice-ignore-line -->
| [Asset Pricing and Sports Betting](cards/moskowitz-2021-asset-pricing-and-sports-betting.md) | Tobias J. Moskowitz | 2021 | 91 | <!-- voice-ignore-line -->
| [Sports prediction and betting models in the machine learning age: The case of tennis](cards/wilkens-2021-sports-prediction-and-betting-models.md) | Sascha Wilkens | 2021 | 91 | <!-- voice-ignore-line -->
| [Information Efficiency in Financial and Betting Markets](cards/williams-2005-information-efficiency-in-financial-and.md) | Leighton Vaughan Williams | 2005 | 90 | <!-- voice-ignore-line -->
| [An examination of the empirical derivatives of the favourite-longshot bias in racetrack betting](cards/sobel-2003-an-examination-of-the-empirical.md) | Russell S. Sobel and others | 2003 | 86 | <!-- voice-ignore-line -->
| [An Examination of Market Efficiency in British Racetrack Betting](cards/gabriel-1990-an-examination-of-market-efficiency.md) | Paul E. Gabriel and others | 1990 | 85 | <!-- voice-ignore-line -->
| [The Threat to Football from Betting-Related Corruption](cards/forrest-2012-the-threat-to-football-from.md) | David Forrest | 2012 | 84 | <!-- voice-ignore-line -->
| [Associative memory, beliefs and market interactions](cards/enke-2024-associative-memory-beliefs-and-market.md) | Benjamin Enke and others | 2024 | 82 | <!-- voice-ignore-line -->

<a id="ml-finance"></a>

## Machine Learning in Finance

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Machine learning: Trends, perspectives, and prospects](cards/jordan-2015-machine-learning-trends-perspectives-and.md) | Michael I. Jordan and others | 2015 | 13299 | <!-- voice-ignore-line -->
| [Double/debiased machine learning for treatment and structural parameters](cards/chernozhukov-2018-double-debiased-machine-learning-for.md) | Victor Chernozhukov and others | 2018 | 5493 | <!-- voice-ignore-line -->
| [Deep learning with long short-term memory networks for financial market predictions](cards/fischer-2017-deep-learning-with-long-short.md) | Thomas Günter Fischer and others | 2017 | 4010 | <!-- voice-ignore-line -->
| [Empirical Asset Pricing via Machine Learning](cards/gu-2020-empirical-asset-pricing-via-machine.md) | Shihao Gu and others | 2020 | 3785 | <!-- voice-ignore-line -->
| [FinBERT: Financial Sentiment Analysis with Pre-trained Language Models](cards/araci-2019-finbert-financial-sentiment-analysis-with.md) | Dogu Araci | 2019 | 2340 | <!-- voice-ignore-line -->
| [Bayesian Reasoning and Machine Learning](cards/barber-2012-bayesian-reasoning-and-machine-learning.md) | David Barber | 2012 | 2146 | <!-- voice-ignore-line -->
| [Financial time series forecasting using support vector machines](cards/kim-2003-financial-time-series-forecasting-using.md) | Kyoung-jae Kim | 2003 | 2075 | <!-- voice-ignore-line -->
| [The Information Content of Forward‐Looking Statements in Corporate Filings—A Naïve Bayesian Machine Learning Approach](cards/li-2010-the-information-content-of-forwardlooking.md) | Feng Li | 2010 | 1713 | <!-- voice-ignore-line -->
| [Predicting stock and stock price index movement using Trend Deterministic Data Preparation and machine learning techniques](cards/patel-2014-predicting-stock-and-stock-price.md) | Jigar Patel and others | 2014 | 1527 | <!-- voice-ignore-line -->
| [A deep learning framework for financial time series using stacked autoencoders and long-short term memory](cards/bao-2017-a-deep-learning-framework-for.md) | Wei Bao and others | 2017 | 1525 | <!-- voice-ignore-line -->
| [Learning and Soft Computing: Support Vector Machines, Neural Networks, and Fuzzy Logic Models](cards/kecman-2001-learning-and-soft-computing-support.md) | Vojislav Kecman | 2001 | 1401 | <!-- voice-ignore-line -->
| [Forecasting stock market movement direction with support vector machine](cards/huang-2004-forecasting-stock-market-movement-direction.md) | Wei Huang and others | 2004 | 1399 | <!-- voice-ignore-line -->
| [Application of support vector machines in financial time series forecasting](cards/tay-2001-application-of-support-vector-machines.md) | Francis E. H. Tay and others | 2001 | 1388 | <!-- voice-ignore-line -->
| [Kalman Filtering and Neural Networks](cards/haykin-2001-kalman-filtering-and-neural-networks.md) | Simon Haykin | 2001 | 1384 | <!-- voice-ignore-line -->
| [Designing a neural network for forecasting financial and economic time series](cards/kaastra-1996-designing-a-neural-network-for.md) | Iebeling Kaastra and others | 1996 | 1351 | <!-- voice-ignore-line -->
| [Differentially Private Empirical Risk Minimization](cards/chaudhuri-2009-differentially-private-empirical-risk-minimization.md) | Kamalika Chaudhuri and others | 2009 | 1333 | <!-- voice-ignore-line -->
| [Time Series Prediction Using Support Vector Machines: A Survey](cards/sapankevych-2009-time-series-prediction-using-support.md) | Nicholas I. Sapankevych and others | 2009 | 1313 | <!-- voice-ignore-line -->
| [Nonlinear Time Series Models in Empirical Finance](cards/franses-2000-nonlinear-time-series-models-in.md) | Philip Hans Franses and others | 2000 | 1309 | <!-- voice-ignore-line -->
| [Machine learning models and bankruptcy prediction](cards/barboza-2017-machine-learning-models-and-bankruptcy.md) | Flávio Barboza and others | 2017 | 1305 | <!-- voice-ignore-line -->
| [FinBERT: A Large Language Model for Extracting Information from Financial Text](cards/huang-2020-finbert-a-large-language-model.md) | Allen Huang and others | 2020 | 1273 | <!-- voice-ignore-line -->
| [Deep Learning for Finance: Deep Portfolios](cards/heaton-2016-deep-learning-for-finance-deep.md) | J.B. Heaton and others | 2016 | 1257 | <!-- voice-ignore-line -->
| [A Comprehensive Survey on Graph Anomaly Detection With Deep Learning](cards/ma-2021-a-comprehensive-survey-on-graph.md) | Xiaoxiao Ma and others | 2021 | 1200 | <!-- voice-ignore-line -->
| [A hybrid ARIMA and support vector machines model in stock price forecasting](cards/pai-2004-a-hybrid-arima-and-support.md) | Ping‐Feng Pai and others | 2004 | 1198 | <!-- voice-ignore-line -->
| [Deep Learning for Time Series Anomaly Detection: A Survey](cards/darban-2024-deep-learning-for-time-series.md) | Zahra Zamanzadeh Darban and others | 2024 | 1172 | <!-- voice-ignore-line -->
| [Support vector machine with adaptive parameters in financial time series forecasting](cards/cao-2003-support-vector-machine-with-adaptive.md) | Leilei Cao and others | 2003 | 1169 | <!-- voice-ignore-line -->
| [Benchmarking state-of-the-art classification algorithms for credit scoring](cards/baesens-2003-benchmarking-state-of-the-art.md) | Bart Baesens and others | 2003 | 1162 | <!-- voice-ignore-line -->
| [Predicting direction of stock price index movement using artificial neural networks and support vector machines: The sample of the Istanbul Stock Exchange](cards/kara-2010-predicting-direction-of-stock-price.md) | Yakup Kara and others | 2010 | 1099 | <!-- voice-ignore-line -->
| [Financial Fraud: A Review of Anomaly Detection Techniques and Recent Advances](cards/hilal-2021-financial-fraud-a-review-of.md) | Waleed Hilal and others | 2021 | 1090 | <!-- voice-ignore-line -->
| [Deep learning networks for stock market analysis and prediction: Methodology, data representations, and case studies](cards/chong-2017-deep-learning-networks-for-stock.md) | Eunsuk Chong and others | 2017 | 1038 | <!-- voice-ignore-line -->
| [Bankruptcy prediction using support vector machine with optimal choice of kernel function parameters](cards/min-2005-bankruptcy-prediction-using-support-vector.md) | J MIN and others | 2005 | 1025 | <!-- voice-ignore-line -->
| [Textual analysis of stock market prediction using breaking financial news: The AZFin text system](cards/schumaker-2009-textual-analysis-of-stock-market.md) | Robert P. Schumaker and others | 2009 | 1022 | <!-- voice-ignore-line -->
| [Mapping the NFT revolution: market trends, trade networks, and visual features](cards/nadini-2021-mapping-the-nft-revolution-market.md) | Matthieu Nadini and others | 2021 | 991 | <!-- voice-ignore-line -->
| [Forecasting the volatility of stock price index: A hybrid model integrating LSTM with multiple GARCH-type models](cards/kim-2018-forecasting-the-volatility-of-stock.md) | Ha Young Kim and others | 2018 | 967 | <!-- voice-ignore-line -->
| [Using artificial neural network models in stock market index prediction](cards/guresen-2011-using-artificial-neural-network-models.md) | Erkam Güreşen and others | 2011 | 959 | <!-- voice-ignore-line -->
| [Applications of deep learning in stock market prediction: Recent progress](cards/jiang-2021-applications-of-deep-learning-in.md) | Weiwei Jiang | 2021 | 953 | <!-- voice-ignore-line -->
| [An application of support vector machines in bankruptcy prediction model](cards/shin-2004-an-application-of-support-vector.md) | Kyung-Shik Shin and others | 2004 | 930 | <!-- voice-ignore-line -->
| [A Comprehensive Comparative Study of Artificial Neural Network (ANN) and Support Vector Machines (SVM) on Stock Forecasting](cards/kurani-2021-a-comprehensive-comparative-study-of.md) | Akshit Kurani and others | 2021 | 927 | <!-- voice-ignore-line -->
| [Evaluating the Quality of Machine Learning Explanations: A Survey on Methods and Metrics](cards/zhou-2021-evaluating-the-quality-of-machine.md) | Jianlong J. Zhou and others | 2021 | 901 | <!-- voice-ignore-line -->
| [Conditional Time Series Forecasting with Convolutional Neural Networks](cards/borovykh-2017-conditional-time-series-forecasting-with.md) | Anastasia Borovykh and others | 2017 | 898 | <!-- voice-ignore-line -->
| [Bankruptcy prediction for credit risk using neural networks: A survey and new results](cards/atiya-2001-bankruptcy-prediction-for-credit-risk.md) | Amir F. Atiya | 2001 | 894 | <!-- voice-ignore-line -->
| [Explainable Machine Learning in Credit Risk Management](cards/bussmann-2020-explainable-machine-learning-in-credit.md) | Niklas Bussmann and others | 2020 | 884 | <!-- voice-ignore-line -->
| [Bankruptcy prediction using neural networks](cards/wilson-1994-bankruptcy-prediction-using-neural-networks.md) | Rick L. Wilson and others | 1994 | 880 | <!-- voice-ignore-line -->
| [Financial time series forecasting model based on CEEMDAN and LSTM](cards/cao-2018-financial-time-series-forecasting-model.md) | Jian Cao and others | 2018 | 859 | <!-- voice-ignore-line -->
| [Genetic algorithms approach to feature discretization in artificial neural networks for the prediction of stock price index](cards/kim-2000-genetic-algorithms-approach-to-feature.md) | Kyoung-jae Kim and others | 2000 | 858 | <!-- voice-ignore-line -->
| [Financial time series forecasting with deep learning : A systematic literature review: 2005–2019](cards/sezer-2020-financial-time-series-forecasting-with.md) | Ömer Berat Sezer and others | 2020 | 846 | <!-- voice-ignore-line -->
| [Applying Neural Networks: A Practical Guide](cards/swingler-1996-applying-neural-networks-a-practical.md) | Kevin M. Swingler | 1996 | 844 | <!-- voice-ignore-line -->
| [Artificial neural networks in bankruptcy prediction: General framework and cross-validation analysis](cards/zhang-1999-artificial-neural-networks-in-bankruptcy.md) | Guoqiang Zhang and others | 1999 | 832 | <!-- voice-ignore-line -->
| [Deep learning for financial applications : A survey](cards/ozbayoglu-2020-deep-learning-for-financial-applications.md) | Ahmet Murat Özbayoğlu and others | 2020 | 787 | <!-- voice-ignore-line -->
| [A CNN-LSTM-Based Model to Forecast Stock Prices](cards/lu-2020-a-cnn-lstm-based-model.md) | Wenjie Lu and others | 2020 | 784 | <!-- voice-ignore-line -->
| [Machine learning techniques and data for stock market forecasting: A literature review](cards/kumbure-2022-machine-learning-techniques-and-data.md) | Mahinda Mailagaha Kumbure and others | 2022 | 783 | <!-- voice-ignore-line -->
| [Predicting stock market index using fusion of machine learning techniques](cards/patel-2014-predicting-stock-market-index-using.md) | Jigar Patel and others | 2014 | 778 | <!-- voice-ignore-line -->
| [When Machine Learning Meets Privacy: A Survey and Outlook](cards/liu-2021-when-machine-learning-meets-privacy.md) | Bo Liu and others | 2021 | 776 | <!-- voice-ignore-line -->
| [Financial Fraud Detection Based on Machine Learning: A Systematic Literature Review](cards/ali-2022-financial-fraud-detection-based-on.md) | Abdulalem Ali and others | 2022 | 773 | <!-- voice-ignore-line -->
| [Literature review: Machine learning techniques applied to financial market prediction](cards/henrique-2019-literature-review-machine-learning-techniques.md) | Bruno Miranda Henrique and others | 2019 | 761 | <!-- voice-ignore-line -->
| [Machine learning advances for time series forecasting](cards/masini-2021-machine-learning-advances-for-time.md) | Ricardo Masini and others | 2021 | 746 | <!-- voice-ignore-line -->
| [Machine Learning in Banking Risk Management: A Literature Review](cards/leo-2019-machine-learning-in-banking-risk.md) | Martin Leo and others | 2019 | 737 | <!-- voice-ignore-line -->
| [The Big Data Newsvendor: Practical Insights from Machine Learning](cards/ban-2018-the-big-data-newsvendor-practical.md) | Gah‐Yi Ban and others | 2018 | 731 | <!-- voice-ignore-line -->
| [Temporal Relational Ranking for Stock Prediction](cards/feng-2019-temporal-relational-ranking-for-stock.md) | Fuli Feng and others | 2019 | 721 | <!-- voice-ignore-line -->
| [Comparison of ARIMA and Artificial Neural Networks Models for Stock Price Prediction](cards/adebiyi-2014-comparison-of-arima-and-artificial.md) | Ayodele Ariyo Adebiyi and others | 2014 | 718 | <!-- voice-ignore-line -->
| [Detecting Accounting Fraud in Publicly Traded U.S. Firms Using a Machine Learning Approach](cards/bao-2020-detecting-accounting-fraud-in-publicly.md) | Yang Bao and others | 2020 | 700 | <!-- voice-ignore-line -->
| [Deep Learning in Asset Pricing](cards/chen-2023-deep-learning-in-asset-pricing.md) | Luyang Chen and others | 2023 | 697 | <!-- voice-ignore-line -->
| [Credit Card Fraud Detection Using AdaBoost and Majority Voting](cards/randhawa-2018-credit-card-fraud-detection-using.md) | Kuldeep Kaur Randhawa and others | 2018 | 685 | <!-- voice-ignore-line -->
| [Machine learning in the Chinese stock market](cards/leippold-2021-machine-learning-in-the-chinese.md) | Markus Leippold and others | 2021 | 678 | <!-- voice-ignore-line -->
| [Explainable artificial intelligence (XAI) in finance: a systematic literature review](cards/cerneviciene-2024-explainable-artificial-intelligence-xai-in.md) | Jurgita Černevičienė and others | 2024 | 677 | <!-- voice-ignore-line -->
| [Credit Card Fraud Detection Using State-of-the-Art Machine Learning and Deep Learning Algorithms](cards/alarfaj-2022-credit-card-fraud-detection-using.md) | Fawaz Khaled Alarfaj and others | 2022 | 661 | <!-- voice-ignore-line -->
| [Using Neural Network Rule Extraction and Decision Tables for Credit-Risk Evaluation](cards/baesens-2003-using-neural-network-rule-extraction.md) | Bart Baesens and others | 2003 | 648 | <!-- voice-ignore-line -->

<a id="rl-trading"></a>

## Reinforcement Learning Trading

| Paper | First author | Year | Cites |
|---|---|---|---|
| [Reinforcement Learning: A Survey](cards/kaelbling-1996-reinforcement-learning-a-survey.md) | Leslie Pack Kaelbling and others | 1996 | 10991 | <!-- voice-ignore-line -->
| [Deep Direct Reinforcement Learning for Financial Signal Representation and Trading](cards/deng-2016-deep-direct-reinforcement-learning-for.md) | Yue Cheng Deng and others | 2016 | 1115 | <!-- voice-ignore-line -->
| [A Deep Reinforcement Learning Framework for the Financial Portfolio Management Problem](cards/jiang-2017-a-deep-reinforcement-learning-framework.md) | Zhengyao Jiang and others | 2017 | 832 | <!-- voice-ignore-line -->
| [Deep hedging](cards/buehler-2019-deep-hedging.md) | Hans Buehler and others | 2019 | 720 | <!-- voice-ignore-line -->
| [A Survey of Forex and Stock Price Prediction Using Deep Learning](cards/hu-2021-a-survey-of-forex-and.md) | Zexin Hu and others | 2021 | 524 | <!-- voice-ignore-line -->
| [Deep Reinforcement Learning for Trading](cards/zhang-2020-deep-reinforcement-learning-for-trading.md) | Zihao Zhang and others | 2020 | 408 | <!-- voice-ignore-line -->
| [Recent advances in reinforcement learning in finance](cards/hambly-2023-recent-advances-in-reinforcement-learning.md) | Ben M. Hambly and others | 2023 | 395 | <!-- voice-ignore-line -->
| [Performance functions and reinforcement learning for trading systems and portfolios](cards/moody-1998-performance-functions-and-reinforcement-learning.md) | John E. Moody and others | 1998 | 386 | <!-- voice-ignore-line -->
| [Reinforcement Learning and Savings Behavior](cards/choi-2009-reinforcement-learning-and-savings-behavior.md) | James J. Choi and others | 2009 | 377 | <!-- voice-ignore-line -->
| [Deep Learning and Explainable Artificial Intelligence Techniques Applied for Detecting Money Laundering–A Critical Review](cards/kute-2021-deep-learning-and-explainable-artificial.md) | Dattatray Vishnu Kute and others | 2021 | 334 | <!-- voice-ignore-line -->
| [How are reinforcement learning and deep learning algorithms used for big data based decision making in financial industries–A review and research agenda](cards/singh-2022-how-are-reinforcement-learning-and.md) | Vinay Kumar Singh and others | 2022 | 323 | <!-- voice-ignore-line -->
| [An adaptive portfolio trading system: A risk-return portfolio optimization using recurrent reinforcement learning with expected maximum drawdown](cards/almahdi-2017-an-adaptive-portfolio-trading-system.md) | Saud Almahdi and others | 2017 | 323 | <!-- voice-ignore-line -->
| [Adaptive stock trading strategies with deep reinforcement learning methods](cards/wu-2020-adaptive-stock-trading-strategies-with.md) | Xing Wu and others | 2020 | 319 | <!-- voice-ignore-line -->
| [FinGPT: Democratizing Internet-scale Data for Financial Large Language Models](cards/liu-2023-fingpt-democratizing-internet-scale-data.md) | Xiaoyang Liu and others | 2023 | 316 | <!-- voice-ignore-line -->
| [An Overview of Machine Learning, Deep Learning, and Reinforcement Learning-Based Techniques in Quantitative Finance: Recent Progress and Challenges](cards/sahu-2023-an-overview-of-machine-learning.md) | Santosh Kumar Sahu and others | 2023 | 298 | <!-- voice-ignore-line -->
| [Adversarial Deep Reinforcement Learning in Portfolio Management](cards/liang-2018-adversarial-deep-reinforcement-learning-in.md) | Zhipeng Liang and others | 2018 | 290 | <!-- voice-ignore-line -->
| [Once Burned, Twice Shy: How Naive Learning, Counterfactuals, and Regret Affect the Repurchase of Stocks Previously Sold](cards/strahilevitz-2011-once-burned-twice-shy-how.md) | Michal Ann Strahilevitz and others | 2011 | 289 | <!-- voice-ignore-line -->
| [Multi-DQN: An ensemble of Deep Q-learning agents for stock market forecasting](cards/carta-2020-multi-dqn-an-ensemble-of.md) | Salvatore Carta and others | 2020 | 278 | <!-- voice-ignore-line -->
| [Adaptive machine learning models: Concepts for real-time financial fraud prevention in dynamic environments](cards/bello-2024-adaptive-machine-learning-models-concepts.md) | Halima Oluwabunmi Bello and others | 2024 | 257 | <!-- voice-ignore-line -->
| [Improving financial trading decisions using deep Q-learning: Predicting the number of shares, action strategies, and transfer learning](cards/jeong-2018-improving-financial-trading-decisions-using.md) | Gyeeun Jeong and others | 2018 | 255 | <!-- voice-ignore-line -->
| [An application of deep reinforcement learning to algorithmic trading](cards/theate-2021-an-application-of-deep-reinforcement.md) | Thibaut Théate and others | 2021 | 219 | <!-- voice-ignore-line -->
| [An automated FX trading system using adaptive reinforcement learning](cards/dempster-2005-an-automated-fx-trading-system.md) | M. A. H. Dempster and others | 2005 | 210 | <!-- voice-ignore-line -->
| [Financial portfolio optimization with online deep reinforcement learning and restricted stacked autoencoder—DeepBreath](cards/soleymani-2020-financial-portfolio-optimization-with-online.md) | Farzan Soleymani and others | 2020 | 209 | <!-- voice-ignore-line -->
| [Reinforcement Learning in Financial Markets](cards/meng-2019-reinforcement-learning-in-financial-markets.md) | Terry Lingze Meng and others | 2019 | 208 | <!-- voice-ignore-line -->
| [FinRL: A Deep Reinforcement Learning Library for Automated Stock Trading in Quantitative Finance](cards/liu-2020-finrl-a-deep-reinforcement-learning.md) | Xiao-Yang Liu and others | 2020 | 201 | <!-- voice-ignore-line -->
| [Deep Robust Reinforcement Learning for Practical Algorithmic Trading](cards/li-2019-deep-robust-reinforcement-learning-for.md) | Yang Li and others | 2019 | 198 | <!-- voice-ignore-line -->
| [Deep reinforcement learning for stock portfolio optimization by connecting with modern portfolio theory](cards/jang-2023-deep-reinforcement-learning-for-stock.md) | Junkyu Jang and others | 2023 | 192 | <!-- voice-ignore-line -->
| [Computational learning techniques for intraday FX trading using popular technical indicators](cards/dempster-2001-computational-learning-techniques-for-intraday.md) | M. A. H. Dempster and others | 2001 | 184 | <!-- voice-ignore-line -->
| [A multi-agent deep reinforcement learning framework for algorithmic trading in financial markets](cards/shavandi-2022-a-multi-agent-deep-reinforcement.md) | Ali Shavandi and others | 2022 | 182 | <!-- voice-ignore-line -->
| [Policy Gradients with Variance Related Risk Criteria](cards/castro-2012-policy-gradients-with-variance-related.md) | Dotan Di Castro and others | 2012 | 179 | <!-- voice-ignore-line -->
| [Reinforcement learning in financial markets - a survey](cards/fischer-2018-reinforcement-learning-in-financial-markets.md) | Thomas Fischer | 2018 | 174 | <!-- voice-ignore-line -->
| [Application of deep reinforcement learning in stock trading strategies and stock forecasting](cards/li-2019-application-of-deep-reinforcement-learning.md) | Yuming Li and others | 2019 | 172 | <!-- voice-ignore-line -->
| [Practical Deep Reinforcement Learning Approach for Stock Trading](cards/liu-2018-practical-deep-reinforcement-learning-approach.md) | Xiaoyang Liu and others | 2018 | 172 | <!-- voice-ignore-line -->
| [An intelligent financial portfolio trading strategy using deep Q-learning](cards/park-2020-an-intelligent-financial-portfolio-trading.md) | Hyungjun Park and others | 2020 | 168 | <!-- voice-ignore-line -->
| [Fin-R1: A Large Language Model for Financial Reasoning through Reinforcement Learning](cards/liu-2025-fin-r1-a-large-language.md) | Zhaowei Liu and others | 2025 | 167 | <!-- voice-ignore-line -->
| [A multi-layer and multi-ensemble stock trader using deep learning and deep reinforcement learning](cards/carta-2020-a-multi-layer-and-multi.md) | Salvatore Carta and others | 2020 | 167 | <!-- voice-ignore-line -->
| [Double Deep Q-Learning for Optimal Execution](cards/ning-2021-double-deep-q-learning-for.md) | Brian Ning and others | 2021 | 159 | <!-- voice-ignore-line -->
| [Cost-Sensitive Portfolio Selection via Deep Reinforcement Learning](cards/zhang-2020-cost-sensitive-portfolio-selection-via.md) | Yifan Zhang and others | 2020 | 155 | <!-- voice-ignore-line -->
| [A Multiagent Approach to $Q$-Learning for Daily Stock Trading](cards/lee-2007-a-multiagent-approach-to-q.md) | Jae Wook Lee and others | 2007 | 152 | <!-- voice-ignore-line -->
| [Deep Hedging of Derivatives Using Reinforcement Learning](cards/cao-2020-deep-hedging-of-derivatives-using.md) | Jay Cao and others | 2020 | 151 | <!-- voice-ignore-line -->
| [Reinforcement Learning for Quantitative Trading](cards/sun-2023-reinforcement-learning-for-quantitative-trading.md) | Shuo Sun and others | 2023 | 150 | <!-- voice-ignore-line -->
| [Time-driven feature-aware jointly deep reinforcement learning for financial signal representation and algorithmic trading](cards/lei-2019-time-driven-feature-aware-jointly.md) | Kai Lei and others | 2019 | 149 | <!-- voice-ignore-line -->
| [Trading financial indices with reinforcement learning agents](cards/pendharkar-2018-trading-financial-indices-with-reinforcement.md) | Parag C. Pendharkar and others | 2018 | 149 | <!-- voice-ignore-line -->
| [Deep Reinforcement Learning Approach for Trading Automation in the Stock Market](cards/kabbani-2022-deep-reinforcement-learning-approach-for.md) | Taylan Kabbani and others | 2022 | 148 | <!-- voice-ignore-line -->
| [Reinforcement learning applied to Forex trading](cards/carapuco-2018-reinforcement-learning-applied-to-forex.md) | João Carapuço and others | 2018 | 141 | <!-- voice-ignore-line -->
| [FraudGNN-RL: A Graph Neural Network With Reinforcement Learning for Adaptive Financial Fraud Detection](cards/cui-2025-fraudgnn-rl-a-graph-neural.md) | Yiwen Cui and others | 2025 | 140 | <!-- voice-ignore-line -->
| [Dynamic Replication and Hedging: A Reinforcement Learning Approach](cards/kolm-2019-dynamic-replication-and-hedging-a.md) | Petter N. Kolm and others | 2019 | 137 | <!-- voice-ignore-line -->
| [Model-based Deep Reinforcement Learning for Dynamic Portfolio Optimization](cards/pengqian-2019-model-based-deep-reinforcement-learning.md) | Yu, Pengqian and others | 2019 | 136 | <!-- voice-ignore-line -->
| [Reinforcement Learning for Market Making in a Multi-agent Dealer Market](cards/ganesh-2019-reinforcement-learning-for-market-making.md) | Sumitra Ganesh and others | 2019 | 129 | <!-- voice-ignore-line -->
| [A novel Deep Reinforcement Learning based automated stock trading system using cascaded LSTM networks](cards/zou-2023-a-novel-deep-reinforcement-learning.md) | Jie Zou and others | 2023 | 126 | <!-- voice-ignore-line -->
| [Financial Trading as a Game: A Deep Reinforcement Learning Approach](cards/huang-2018-financial-trading-as-a-game.md) | Chien Yi Huang | 2018 | 124 | <!-- voice-ignore-line -->
| [Market sentiment-aware deep reinforcement learning approach for stock portfolio allocation](cards/koratamaddi-2021-market-sentiment-aware-deep-reinforcement.md) | Prahlad Koratamaddi and others | 2021 | 123 | <!-- voice-ignore-line -->
| [Incentive-Driven Deep Reinforcement Learning for Content Caching and D2D Offloading](cards/zhou-2021-incentive-driven-deep-reinforcement-learning.md) | Huan Zhou and others | 2021 | 121 | <!-- voice-ignore-line -->
| [Scalable and Efficient Bayes-Adaptive Reinforcement Learning Based on Monte-Carlo Tree Search](cards/guez-2013-scalable-and-efficient-bayes-adaptive.md) | Arthur Guez and others | 2013 | 120 | <!-- voice-ignore-line -->
| [Deep Learning in Finance: A Survey of Applications and Techniques](cards/mienye-2024-deep-learning-in-finance-a.md) | Ebikella Domor Mienye and others | 2024 | 119 | <!-- voice-ignore-line -->
| [Deep reinforcement learning for portfolio management of markets with a dynamic number of assets](cards/betancourt-2020-deep-reinforcement-learning-for-portfolio.md) | Carlos Betancourt and others | 2020 | 118 | <!-- voice-ignore-line -->
| [Many-to-Many Task Offloading in Vehicular Fog Computing: A Multi-Agent Deep Reinforcement Learning Approach](cards/wei-2023-many-to-many-task-offloading.md) | Zhiwei Wei and others | 2023 | 114 | <!-- voice-ignore-line -->
| [Deep graph convolutional reinforcement learning for financial portfolio management – DeepPocket](cards/soleymani-2021-deep-graph-convolutional-reinforcement-learning.md) | Farzan Soleymani and others | 2021 | 114 | <!-- voice-ignore-line -->
| [Multi-Model Generative Adversarial Network Hybrid Prediction Algorithm (MMGAN-HPA) for stock market prices prediction](cards/polamur-2021-multi-model-generative-adversarial-network.md) | Subba Rao Polamurı and others | 2021 | 109 | <!-- voice-ignore-line -->
| [Deep LSTM and LSTM-Attention Q-learning based reinforcement learning in oil and gas sector prediction](cards/oyewola-2023-deep-lstm-and-lstm-attention.md) | David Opeoluwa Oyewola and others | 2023 | 108 | <!-- voice-ignore-line -->
| [A multi-agent reinforcement learning framework for optimizing financial trading strategies based on TimesNet](cards/huang-2023-a-multi-agent-reinforcement-learning.md) | Yuling Huang and others | 2023 | 106 | <!-- voice-ignore-line -->
| [Multi-period portfolio optimization using a deep reinforcement learning hyper-heuristic approach](cards/cui-2023-multi-period-portfolio-optimization-using.md) | Tianxiang Cui and others | 2023 | 104 | <!-- voice-ignore-line -->
| [Can Artificial Intelligence (AI) Manage Behavioural Biases Among Financial Planners?](cards/hasan-2023-can-artificial-intelligence-ai-manage.md) | Zahid Hasan and others | 2023 | 103 | <!-- voice-ignore-line -->
| [Deep Reinforcement Learning in Quantitative Algorithmic Trading: A Review](cards/pricope-2021-deep-reinforcement-learning-in-quantitative.md) | Tidor-Vlad Pricope | 2021 | 103 | <!-- voice-ignore-line -->
| [A deep Q-learning portfolio management framework for the cryptocurrency market](cards/lucarelli-2020-a-deep-q-learning-portfolio.md) | Giorgio Lucarelli and others | 2020 | 103 | <!-- voice-ignore-line -->
| [Deep LSTM with Reinforcement Learning Layer for Financial Trend Prediction in FX High Frequency Trading Systems](cards/rundo-2019-deep-lstm-with-reinforcement-learning.md) | Francesco Rundo | 2019 | 100 | <!-- voice-ignore-line -->
