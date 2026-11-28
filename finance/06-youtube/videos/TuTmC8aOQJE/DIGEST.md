<!-- voice-ignore-file: transcript-derived digest -->
# 5. Stochastic Processes I | MIT OpenCourseWare | TuTmC8aOQJE | 1.29 h

Teaches: Discrete-time stochastic processes for the MIT 18.S096 finance course: the simple random walk, finite Markov chains with transition matrices and stationary distributions (through Perron-Frobenius), and martingales with the optional stopping theorem.

Claims:
- A stochastic process is a collection of random variables indexed by time, or equivalently a probability distribution over paths; the three study questions are dependence, long-term behavior and boundary events. "collection of random variables indexed by time" [0:00:33]
- Simple random walk: X_t is the sum of i.i.d. plus or minus 1 steps with probability 1/2 each. By the central limit theorem X_t stays on the scale of square root of t, though it can reach t; it crosses zero infinitely often. "can be minus 1 even though theoretically" [0:18:24]
- Gambler's ruin: playing a fair $1 coin game until +$100 or -$50 is reached; the lecturer states the probability of hitting the upper line B before the lower line A is A/(A+B), found by solving f(k) = (f(k+1) + f(k-1))/2 with f(B) = 1 and f(-A) = 0. "50 it's 100 over 150 that's 2" [0:28:16]
- A finite Markov chain is fully described by its transition matrix; the two-step matrix is A squared. "finite markov chains really there's one matrix" [0:43:57]
- Machine example: working to working 0.99, working to broken 0.01, broken to working 0.8, broken to broken 0.2; the long-run distribution is the eigenvector with eigenvalue 1, which Perron-Frobenius guarantees is unique when all entries are positive. "01 v 2 and that 0 8" [0:51:08]
- A martingale satisfies E[X_(t+1) | past] = X_t; a random walk is one, roulette is not, and a variable multiplied by 2 with probability 1/3 or by 1/2 with probability 2/3 is one. "equal to 2 with probability 1 3" [1:03:35]
- Optional stopping: for a martingale and a bounded stopping time, E[X_tau] equals the starting value, so no strategy wins. Applied to the +$100 or -$50 game it gives 150p - 50 = 0, so p = 1/3. "50 equals 0 p is 1 3" [1:16:59]

- A random walk has both. "definition or example so the random walk" [1:05:48]

Worked:
- The random walk allows hand computations and approximates many practical models. "computations with simple random walk by hand" [0:31:59]

Failed:
- The random walk has no transition matrix because its state space is infinite. "transition probability matrix because the state space" [0:43:46]
- A strategy such as stopping at the first peak is not a stopping time because it uses future values. "future values it's not a stopping time" [1:10:18]
