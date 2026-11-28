# Route Map: Zero To Quant

Three end roles share one base. Role targets follow Paolucci's roadmap (kLJEXE5_7rI @ 0:03:00): traders need the deepest probability, developers the deepest systems skill, researchers the deepest math and statistics. Book titles and authors were checked against Open Library, course URLs returned HTTP 200, and GitHub stars were read from the GitHub API, all on 2026-11-27.

## Stage 0: Base

Months 0 to 6. Python, linear algebra, calculus, probability.

- Wes McKinney, *Python for Data Analysis* (O'Reilly).
- Joseph Blitzstein and Jessica Hwang, *Introduction to Probability* (CRC). Free Harvard Stat 110 lectures accompany it.
- MIT OCW 18.S096 *Topics in Mathematics with Applications in Finance*, Fall 2013: https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/ . Seven of its lectures sit in `../06-youtube/`.
- MIT OCW 15.401 *Finance Theory I*: https://ocw.mit.edu/courses/15-401-finance-theory-i-fall-2008/

## Stage 1: Markets And Statistics

Months 6 to 12.

- Larry Harris, *Trading and Exchanges* (Oxford 2002).
- Ruey Tsay, *Analysis of Financial Time Series* (Wiley).
- Trevor Hastie, Robert Tibshirani, Jerome Friedman, *The Elements of Statistical Learning* (Springer, free PDF from the authors).
- Dan Stefanica, *A Primer for the Mathematics of Financial Engineering*.
- Coursera, Georgia Tech *Machine Learning for Trading* specialization: https://www.coursera.org/specializations/machine-learning-trading
- Coursera, Columbia *Financial Engineering and Risk Management*: https://www.coursera.org/learn/financial-engineering-1

## Stage 2: Strategy Research

Months 12 to 24.

- Ernest Chan, *Quantitative Trading* (Wiley 2009) and *Machine Trading* (Wiley 2016).
- Marcos Lopez de Prado, *Advances in Financial Machine Learning* (Wiley 2018) and *Machine Learning for Asset Managers* (Cambridge 2020).
- Stefan Jansen, *Machine Learning for Algorithmic Trading* (Packt, 2nd ed.). Companion repo below.
- Lasse Heje Pedersen, *Efficiently Inefficient* (Princeton 2015).
- Antti Ilmanen, *Expected Returns* (Wiley 2011).
- Wesley Gray and Jack Vogel, *Quantitative Momentum* (Wiley 2016).
- David Aronson, *Evidence-Based Technical Analysis* (Wiley 2006).
- Rishi Narang, *Inside the Black Box* (Wiley).
- Richard Grinold and Ronald Kahn, *Active Portfolio Management* (McGraw-Hill).

## Stage 3: Specialization

| Track | Read |
|---|---|
| Derivatives | John Hull, *Options, Futures, and Other Derivatives*; Steven Shreve, *Stochastic Calculus for Finance II*; Paul Wilmott, *Paul Wilmott Introduces Quantitative Finance* |
| Microstructure and HFT | Maureen O'Hara, *Market Microstructure Theory*; Alvaro Cartea, Sebastian Jaimungal, Jose Penalva, *Algorithmic and High-Frequency Trading*; Bouchaud, Bonart, Donier, Gould, *Trades, Quotes and Prices* |
| RL and agents | Richard Sutton and Andrew Barto, *Reinforcement Learning: An Introduction* (MIT Press, free PDF); cards `../04-quant/03-markov-mdp-rl.md` and `14-llm-ai-agents.md` |
| History and sizing | Gregory Zuckerman, *The Man Who Solved the Market*; William Poundstone, *Fortune's Formula* |

## Interview Prep

- Xinfeng Zhou, *A Practical Guide to Quantitative Finance Interviews*.
- Timothy Falcon Crack, *Heard on the Street*.

## Structured Programs

| Program | Format | URL |
|---|---|---|
| WorldQuant University MSc in Financial Engineering | Online, tuition-free | https://www.wqu.edu/ |
| QuantInsti EPAT | Online certificate, paid | https://www.quantinsti.com/epat |
| CQF Certificate in Quantitative Finance | Online, paid | https://www.cqf.com/ |
| Coursera advanced trading algorithms, Indian School of Business | Online course | https://www.coursera.org/learn/advanced-trading-algorithms |

## Certifications

| Credential | Body | Use |
|---|---|---|
| CFA charter | CFA Institute, https://www.cfainstitute.org/programs/cfa-program | Asset management, research roles |
| FRM | GARP, https://www.garp.org/frm | Risk roles |
| CQF | CQF Institute | Derivatives and quant dev roles |

Hiring for quant researcher roles at top firms weights a math, physics, statistics or CS degree and interview performance above any certificate.

## Open-Source Frameworks

Stars from the GitHub API on 2026-11-27.

| Repo | Stars | License | Last push | Use |
|---|---|---|---|---|
| [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) | 123,901 | Apache-2.0 | 2026-11-25 | Multi-agent LLM trading research (arXiv:2412.20138) |
| [freqtrade/freqtrade](https://github.com/freqtrade/freqtrade) | 57,326 | GPL-3.0 | 2026-11-27 | Crypto bot, backtest, hyperopt, dry run |
| [microsoft/qlib](https://github.com/microsoft/qlib) | 50,626 | MIT | 2026-11-04 | AI quant research platform (arXiv:2009.11189) |
| [ccxt/ccxt](https://github.com/ccxt/ccxt) | 45,004 | MIT | 2026-11-27 | Unified crypto exchange API |
| [nautechsystems/nautilus_trader](https://github.com/nautechsystems/nautilus_trader) | 31,859 | LGPL-3.0 | 2026-11-27 | Rust-core event-driven engine, same code for backtest and live |
| [mementum/backtrader](https://github.com/mementum/backtrader) | 23,819 | GPL-3.0 | 2024-08-19 | Python event-driven backtester, unmaintained since 2024 |
| [QuantConnect/Lean](https://github.com/QuantConnect/Lean) | 22,749 | Apache-2.0 | 2026-11-25 | C# and Python engine behind QuantConnect |
| [stefan-jansen/machine-learning-for-trading](https://github.com/stefan-jansen/machine-learning-for-trading) | 22,089 | MIT | 2026-11-25 | Notebooks for the Jansen book |
| [hummingbot/hummingbot](https://github.com/hummingbot/hummingbot) | 21,415 | Apache-2.0 | 2026-11-27 | Market-making bots, Avellaneda-Stoikov strategy |
| [AI4Finance-Foundation/FinRL](https://github.com/AI4Finance-Foundation/FinRL) | 17,193 | MIT | 2026-11-27 | Deep RL trading (arXiv:2011.09607) |
| [polakowo/vectorbt](https://github.com/polakowo/vectorbt) | 9,965 | custom | 2026-11-11 | Vectorized backtests and parameter sweeps |
| [kernc/backtesting.py](https://github.com/kernc/backtesting.py) | 9,308 | AGPL-3.0 | 2026-08-05 | Lightweight single-asset backtester |
| [jesse-ai/jesse](https://github.com/jesse-ai/jesse) | 8,840 | MIT | 2026-11-23 | Crypto strategy framework |
| [hudson-and-thames/mlfinlab](https://github.com/hudson-and-thames/mlfinlab) | 4,980 | custom | 2023-10-02 | AFML methods, now closed commercial |
| [stefan-jansen/zipline-reloaded](https://github.com/stefan-jansen/zipline-reloaded) | 2,022 | Apache-2.0 | 2026-11-25 | Maintained fork of Quantopian zipline |
| [Polymarket/py-clob-client](https://github.com/Polymarket/py-clob-client) | 1,223 | MIT | 2026-05-25 | Polymarket order client, archived |
| [Kalshi/kalshi-starter-code-python](https://github.com/Kalshi/kalshi-starter-code-python) | 102 | none | 2025-03-07 | Kalshi API starter |

Star counts measure attention. TradingAgents leads every quant repo here, though its paper reports a short backtest window and FINSABER (arXiv:2505.07078) finds LLM strategy advantages fade over long, broad tests.

## Suggested Build Path

1. Backtesting.py or vectorbt on daily bars with costs (e4ytbIm2Xg0).
2. LEAN or zipline-reloaded for multi-asset, point-in-time data (joXDV5eqOoY).
3. nautilus_trader or Lean for backtest-to-live parity, Alpaca or IBKR paper first.
4. Hummingbot or freqtrade only after reading the market-making and overfitting cards.
