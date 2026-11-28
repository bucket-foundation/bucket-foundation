<!-- voice-ignore-file: transcript-derived digest -->
# 17. Stochastic Processes II | MIT OpenCourseWare | PPl-7_RL0Ko | 1.27 h

Teaches: A lecture on continuous-time stochastic processes: the definition of Brownian motion, why it models pollen and stock prices, its path properties, the reflection principle for the maximum, quadratic variation, and the motivation for Ito's lemma.

Claims:
- Brownian motion: B(0)=0, B(t)-B(s) is normal with mean 0 and variance t-s, and increments over non-overlapping intervals are independent; the existence theorem is hard and the distribution is over paths. "normal distribution with mean 0 and variance" [0:07:43]
- Brownian motion is the limit of simple random walks on [0,1] cut into n steps as n goes to infinity. "saying the limit of simple random walks" [0:17:19]
- A guest notes the range of the process is used to build volatility estimates more precise than close-to-close prices. "volatility than just using say the close" [0:42:07]
- Written dB squared equals dt. "it's db squared is equal to dt" [0:54:06]
- For stocks the percentage change should be normal; S equal to e to the B is wrong because B is not differentiable and the classical chain rule fails. "differential equation for it so the percentile" [1:01:29]
- Ito's lemma: df = f'(B) dB + (1/2) f''(B) dt; the lecturer says if only one thing is remembered it is this, and the second is dB squared equals dt. "2 dt this is called ito's lemma" [1:12:54]


Worked:
- Random walk limit gives a reason to use Brownian motion for physical and price processes, since it comes from a discrete model. "be a reasonable model for stock prices" [0:18:17]

Failed:
- The stock price story ignores other drivers, so Brownian motion is a starting point only. "action causing the price then brownian motion" [0:24:51]
- Writing df = f'(B) dB without the second derivative term is wrong because dB squared equals dt is not negligible. "next term we get the second derivative" [1:12:02]
- Non-differentiability removes standard calculus tools. "just not differentiable so the standard tools" [0:29:07]
