<!-- voice-ignore-file: transcript-derived digest -->
# 24. HJM Model for Interest Rates and Credit | MIT OpenCourseWare | D2Jn1VrqjWI | 1.79 h

Teaches: A guest lecture by Denis Gorokhov (Morgan Stanley) on the Heath-Jarrow-Morton framework: Ito's lemma and Black-Scholes from first principles, Monte Carlo risk-neutral pricing, interest rate and credit derivative basics, and structured notes priced by simulation.

Claims:
- Log S is normal with drift mu minus sigma squared over 2, by Ito's lemma. "mu minus one half of sigma squared" [0:14:44]
- Ito's second-order term holds because a sum of N squared standard normals becomes deterministic; dispersion grows like N while mean grows like N, using fourth moment 3. "that the fourth moment of the normal" [0:30:35]
- Ito's lemma needs two time scales: hedging interval dt' much smaller than the observation interval dt; the speaker says a famous textbook proof is wrong. "the small time scale which is dt" [0:32:13]
- The real-world drift drops out; only volatility matters; Monte Carlo prices by simulating in the risk-neutral world, averaging the payoff and discounting. "risk neutral world right so you simulate" [0:39:57]
- US 10 year Treasury yield fell from about 12 percent in 1980 to 1.7 percent at end 2012. "1980 the us government would pay 12%" [0:48:47]
- A floating-rate leg plus notional at the end has present value equal to notional; the yield curve is bootstrapped from swap quotes. "the very end then the present value" [0:59:53]
- CDS levels quoted: Morgan Stanley near 100 basis points for 5 years, Greece 500 to 1,000; roughly 1 percent a year spread implies about 1 percent default probability. "you pay like 500 maybe 1 000" [1:11:39]
- Structured note example: the investor gets 10% only if the 30 year swap rate exceeds the 2 year rate and the S&P 500 is above 880; if either condition fails the investor gets nothing. "s p 500 index is higher than 880" [1:23:58]

- Model forward rates (and hazard rates) as processes; fix drift by no-arbitrage; calibrate volatility to liquid options or history; simulate risk-neutral paths; average discounted payoff; hedge with sensitivities and stress tests. "calibration as you mentioned because these volatilities" [1:39:26]

Worked:
- Volatility is implied from liquid options and then used for exotic payoffs, which are off-loaded into simpler hedges. "instruments and we buy them to hedge" [1:32:58]
- Price equals the cost of the hedging strategy; extra charged is the margin. "the hedging strategy so if you charge" [1:42:24]

Failed:
- Path-dependent range accruals have no useful analytic model; only Monte Carlo works. "course this kind of double range accruals" [1:38:00]
- Credit volatility is illiquid, so historical estimates are used. "can do is to take historical estimates" [1:33:36]
- SABR approximations can fail for long maturities or deep out-of-the-money options. "very deep out of the money option" [1:37:35]
- Banks keep residual risk because rebalancing assumptions do not hold exactly; stress tests are required. "residual risk because remember we cannot exactly" [1:44:07]
