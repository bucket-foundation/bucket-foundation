<!-- voice-ignore-file: transcript-derived digest -->
# I Re-Created A Quant Trading Strategy With Claude Code (Insanely Cool) | Lewis Jackson | ZVMTeDBmSrI | 0.45 h

Teaches: A three-state Markov regime model (bull, sideways, bear) built from trailing 20-day returns, a 3x3 transition matrix, matrix powers for multi-day odds, a bull minus bear signal, walk-forward testing and a hidden Markov model. The creator gives a free Claude Code skill prompt and a Pine Script indicator and points to a paid community.

Claims:
- The method comes from a quant's Twitter thread; he says quants quantify "vibes" instead of drawing trend lines. "quants are not using trend lines and" [0:00:16]
- A bull state is a trailing 20-day return of +5% or more, a bear state is -5% or less, and anything between is sideways. "last 20 days are they at 5%" [0:03:15]
- Every historical day gets a state label, and the Markov property says tomorrow depends on today's state. "the markov property focuses solely on today" [0:04:57]
- Transitions are tallied into a 3x3 matrix whose rows sum to 100%; the diagonal measures persistence, called stickiness. "brings us to this very simple 3x3" [0:07:09]
- Squaring the matrix gives two-day odds. "and it's something called squaring the matrix" [0:10:43]
- The signal is bull probability minus bear probability, for example 65% minus 20% gives +45%, and a larger gap means a larger position. "minus 20% which is the bear probability" [0:14:53]
- Walk-forward testing recomputes the matrix each day so the strategy never learns from the future. "2021 already and so this walk forward" [0:17:28]
- A hidden Markov model infers states without the human 5% thresholds; agreement between both labelings is the green light. "and also the hidden markov method labels" [0:20:34]
- On Bitcoin the Pine Script showed 29% bull, 42% bear and 29% sideways for the next day. "bear market is 42% chance and 29%" [0:26:09]

Architecture: Data: price history of any asset (SPY 10-year demo, Bitcoin, XRP, Tesla). Signal: next-day bull minus bear probability from the transition matrix. Model: Markov chain plus hidden Markov model, installed as a Claude Code skill. Execution: none; a TradingView Pine Script draws the matrix. Risk: position size scales with signal strength; no stops or limits are described.

Worked:
- The skill installed from a pasted prompt and ran the SPY demo. "over here you're going to click paste" [0:23:15]
- The Pine Script rendered on Bitcoin, XRP and Tesla charts. "chart and remember this is the bitcoin" [0:25:40]

Failed:
- He says he is not sure he understands walk-forward testing. "going to do something called walk forward" [0:16:18]
- The 5% state thresholds are subjective, which the hidden Markov step is meant to fix. "you've got the you know the 5%" [0:20:27]
- A claim that graduates land $650,000 quant jobs is an aside with no source. "up landing jobs that are $650 000" [0:12:23]
