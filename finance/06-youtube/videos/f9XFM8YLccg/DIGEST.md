<!-- voice-ignore-file: transcript-derived digest -->
# 3. Probability Theory | MIT OpenCourseWare | f9XFM8YLccg | 1.31 h

Teaches: Probability review for the MIT 18.S096 finance course: the normal and log-normal distributions for prices, the exponential family, moment-generating functions, the law of large numbers and the central limit theorem with proofs, and a casino and poker argument about edge.

Claims:
- Modeling daily price differences as normal is a poor choice because the size of a move depends on the price level (a $10 stock and a $50 stock); the percentage change is what should be normal, which leads to a log-normal price. "say it was $10 here and $50" [0:11:52]
- A log-normal Y has density 1/(x sigma sqrt(2 pi)) exp(-(ln x - mu)^2 / (2 sigma^2)) for x > 0; mu and sigma are parameters of the log, no longer the mean and variance. "1 over x sigma square root 2" [0:21:54]
- The log-normal fits the exponential family, a class whose joint densities of independent draws stay in the family, which the guest speaker says keeps them simple. "fact simplifies to the same exponential family" [0:29:24]
- The moment-generating function E[e^(tX)] gives the k-th moment as its k-th derivative at zero. The log-normal has no moment-generating function (it diverges for every nonzero t). "the k th derivative of this function" [0:38:08]
- Equal moment-generating functions imply equal distributions, but equal moments do not, since both variables may lack a moment-generating function. "might both not have moment generating functions" [0:42:35]
- Weak law of large numbers: the average of n i.i.d. draws has variance sigma^2/n, and Chebyshev gives P(|avg - mu| > epsilon) <= sigma^2/(n epsilon^2); the bound is loose and a moment-generating-function bound would need hundreds or thousands of trials instead of millions. "epsilon that will give you some bound" [1:01:26]
- Casino blackjack: a player wins about 48% of rounds at best, so the casino wins about $0.52 per $1 bet, and with large n the law of large numbers makes that profit certain; poker is different because the casino takes a rake and a player with an edge above the rake can use the same law. "the casino will win is $0 52" [0:52:22]
- Central limit theorem: sqrt(n) times (average minus mu) converges to N(0, sigma^2), proved through the moment-generating function converging to exp(t^2 sigma^2 / 2). "converges to that the moment generating function" [1:11:21]

- Notation and independence (mutual versus pairwise), then price distributions (normal then log-normal), exponential family, moment-generating function with its two theorems, then large-scale behavior through the law of large numbers and the central limit theorem, ending with the sample mean as an estimator. "law of large numbers and central limit" [0:00:46]

Worked:
- The lecturer says a trader or hedge fund with a tiny edge and enough trades lets the law of large numbers produce profit, if the edge exceeds the fees. "tiny edge if you can have enough" [0:56:10]
- Fitting the log-normal into the exponential family by choosing h(x) = 1/x and two sufficient statistics (log x and log x squared). "way so 1 over x sigma square" [0:29:49]

Failed:
- The central limit proof is pointwise in t only, and the sample mean is not the best estimator for every distribution. "the mean and then the central limit" [1:17:42]
