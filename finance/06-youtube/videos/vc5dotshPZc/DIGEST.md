<!-- voice-ignore-file: transcript-derived digest -->
# 25. Ross Recovery Theorem | MIT OpenCourseWare | vc5dotshPZc | 1.46 h

Teaches: A guest lecture by Peter Carr (Morgan Stanley) on Ross's Recovery Theorem: how to extract market beliefs about future states from Arrow-Debreu prices, with a diffusion version using the numeraire portfolio and a Sturm-Liouville problem.

Claims:
- Ross's paper, in the Journal of Finance, gives sufficient conditions to recover natural probabilities from Arrow-Debreu prices, that is, derivative prices. "it gives a sufficient set of conditions" [0:02:44]
- Three measures: P physical, Q risk-neutral, R recovered market beliefs; R may differ from P if the market is wrong. "measure is it's capturing the market's beliefs" [0:10:23]
- A risk-neutral probability of 40 percent means paying $0.40 now for $1 if S&P is up; the down security must cost $0.60 or there is an arbitrage. "of $0 40 and $0 60 so" [0:14:49]
- Pricing kernel is A divided by P. "of like just being very precise about" [0:41:26]
- Key assumption: phi(x,y) = delta U'(c(y)) / U'(c(x)); this cuts about 100 unknowns to 11 for n=10. "money and finally this pricing kernel phi" [0:56:19]
- Theorem 1: if the pricing matrix is positive or irreducible, P, delta and phi exist and are unique; the proof uses Perron-Frobenius. "zeros are then there exists a unique" [0:55:50]
- The numeraire portfolio of John Long, also the growth optimal portfolio of Kelly, converts risk-neutral growth to real-world growth. "another name growth optimal portfolio that kelly" [1:16:48]
- With time homogeneity and a bounded state space the value splits into a function of x and an exponential in time; the x part solves a Sturm-Liouville problem with one positive solution, giving uniqueness. "value function splits into an unknown positive" [1:25:46]

- Structure on the pricing kernel; recovery theorem; numeraire change; diffusion on a bounded interval. "a payoff from a single option struck" [0:36:28]

Worked:
- Prior approaches needed a risk aversion parameter; Ross identifies beliefs without one by restricting the kernel. "risk aversion so for example common approach" [0:57:27]
- Unbounded state space works for Cox-Ingersoll-Ross. "famous but still important cox ingersoll ross" [1:27:19]

Failed:
- Without assumptions, recovery is impossible. "fact without making assumptions it is impossible" [0:47:47]
- Bounded state space is criticized by economists; the unbounded case fails for Black-Scholes and is open. "beliefs about the frequencies of future states" [0:56:08]
- Samuelson objected that the Kelly portfolio is risky. "riskiest but it's risky so samuelson's objections" [0:24:11]
- Transaction costs are ignored in the analysis. "transactions cost when we do this analysis" [0:31:55]
