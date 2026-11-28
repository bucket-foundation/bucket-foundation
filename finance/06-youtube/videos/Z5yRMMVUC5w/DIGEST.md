<!-- voice-ignore-file: transcript-derived digest -->
# 18. Itō Calculus | MIT OpenCourseWare | Z5yRMMVUC5w | 1.30 h

Teaches: A lecture on Ito calculus: the general Ito lemma for drift-diffusion processes, worked examples including geometric Brownian motion, the Ito integral and adapted processes, Ito isometry, martingale conditions, and Girsanov's change of measure.

Claims:
- For dX = mu dt + sigma dB, df(t,X) equals the classical terms plus (1/2) sigma squared times the second x-derivative of f dt; it comes from dB squared equals dt. "then mu plus sigma db t square" [0:15:19]
- Example f(x)=x squared gives d(B squared) = 2B dB + dt. "one was 2x so 2b t db" [0:21:04]
- For f = exp(mu t + sigma x), df = (mu + sigma squared / 2) f dt + sigma f dB. "is 1 2 and then sigma square" [0:23:15]
- S equal to e to the sigma B has drift sigma squared over 2; the driftless version is exp(-(1/2) sigma squared t + sigma B), geometric Brownian motion without drift. "be minus 1 over 2 sigma square" [0:27:26]
- The Ito integral is the limit of Riemann sums taken at the left endpoint; the right endpoint gives a parallel calculus with dB squared equal to minus dt. "t square is equal to minus dt" [0:38:33]
- A strategy is adapted if its value at t depends only on the process up to t; Ito calculus fits because a decision cannot see the future. "that are reasonable that cannot see future" [0:42:23]
- Ito isometry: E[(integral of Delta dB) squared] = E[integral of Delta squared dt]; an SDE with no drift term is a martingale, one with a drift term is not. "ito integral of your adapted process that's" [0:50:17]
- Girsanov: Brownian motion with drift and without are equivalent measures with an explicit Radon-Nikodym derivative; it turns a non-martingale into a martingale for pricing. "distribution defined by brownian motion without drift" [1:14:10]

- Taylor expansion to second order with dB squared equal to dt gives the lemma; examples; integral defined as inverse of differentiation then as left-point Riemann limit; adapted processes; isometry and martingale property; change of measure. "integration using differentiation integration was an inverse" [0:45:41]

Worked:
- Subtracting half sigma squared from the exponent removes the unwanted drift in the stock model. "of b t to remove that drift" [0:27:16]

Failed:
- Riemann sum limits depend on the chosen sample point, unlike classical calculus. "to b according to the riemannian sum" [0:33:47]
- Strategies using future maxima are not adapted and are not valid. "let delta t to be the maximum" [0:44:30]
- Treating S(t) as a pointwise function of the path is safe for most cases here but fails in advanced settings. "it fails but that's a very advanced" [0:30:16]
- The speaker says he is not expert enough to explain why Girsanov is used in pricing and states it without proof. "pricing theory i'm not an expert enough" [1:10:13]
