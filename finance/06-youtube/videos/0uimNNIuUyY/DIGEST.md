<!-- voice-ignore-file: transcript-derived digest -->
# Lecture 2: Linear Algebra | MIT OpenCourseWare | 0uimNNIuUyY | 1.35 h

Teaches: Peter Kempthorne's MIT 18.S096 linear algebra lecture applied to finance: portfolios as vectors, profit and loss, shorting and zero-cost portfolios, Markov chains and stationary distributions, then a one-period two-state market where replication, no arbitrage and completeness are linear algebra statements.

Claims:
- A portfolio is a vector of share quantities, and the day's profit and loss is the change in portfolio value, with the long-short difference of two portfolios giving the net gain of one over the other. "it's really profit and loss" [0:06:09]
- Shorting means selling first and buying back later with borrowed stock, so a zero-net-value portfolio is possible and an arbitrage portfolio is one with zero cost and no chance of a negative payoff. "You basically sell first, buy back later" [0:12:03]
- Black, Scholes and Merton option pricing rests on arbitrage-free markets. "is all based upon arbitrage-free markets" [0:16:06]
- A stationary Markov chain has a stationary distribution that is the eigenvector with eigenvalue 1, and the other eigenvalues shrink to zero as the transition matrix is raised to powers. "it's only this one eigenvector that doesn't get shrunk to 0" [0:41:13]
- In a one-period two-state model, a contingent claim such as a call is replicated by units of bond and stock, solving two linear equations. "units of the stock, units of the bond" [0:50:02]
- No arbitrage holds when a pricing measure exists, with initial prices equal to a discount factor times expected terminal values; completeness asks that any payoff be realizable. "Q star being a probability distribution" [1:11:16]
- Eigendecomposition A = S Lambda S inverse makes powers cheap, which feeds state equations and Kalman filters. "very useful in defining state equations and Kalman filters" [1:20:07]

Architecture: none (math lecture with RStudio Cloud exercises).

Worked:
- none reported

Failed:
- none reported
