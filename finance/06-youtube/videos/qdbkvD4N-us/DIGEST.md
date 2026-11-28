<!-- voice-ignore-file: transcript-derived digest -->
# 21. Stochastic Differential Equations | MIT OpenCourseWare | qdbkvD4N-us | 0.93 h

Teaches: A lecture on stochastic differential equations: existence and uniqueness of solutions, two solvable examples (geometric Brownian motion and Ornstein-Uhlenbeck), numerical methods (finite differences along a sampled path, Monte Carlo, trees), and the heat equation as the route to the Black-Scholes solution.

Claims:
- If mu and sigma are reasonable a solution exists and is unique given the initial point; the stated conditions are a Lipschitz bound in x and a growth bound. "boundary condition has a solution and given" [0:02:47]
- Solving dX = mu X dt + sigma X dB by guessing a function of t and B gives X = x0 exp(sigma B + (mu - sigma squared / 2) t). "mu minus 1 over 2 sigma square" [0:10:48]
- Ornstein-Uhlenbeck dX = -alpha X dt + sigma dB models mean reversion; X(t) = e^(-alpha t) (x0 + integral of sigma e^(alpha s) dB). "is used to model a mean reverting" [0:14:18]
- Most SDEs lack closed forms, so one uses finite difference, Monte Carlo or tree methods. "techniques called finite difference method monte carlo" [0:21:36]
- Finite difference example with step 1/2 gives u(1/2)=1 and u(1)=9/2; the method repeats u(i+1) = u(i) + h u'(i). "computation it should give 9 over 2" [0:24:48]
- Tree method: a binomial tree has end-node probabilities such as 1/32 and 5/32; trinomial trees also converge to Brownian motion. "1 over 32 2 with probability 5" [0:37:27]
- The heat equation with a Dirac delta start has the normal density as solution; superposition solves any initial condition, and Black-Scholes reduces to it. "solution to the dirac delta initial condition" [0:48:41]

- Existence and uniqueness; solve by guessing a form and matching coefficients; when that fails, discretize time, fix a Brownian path, sample many paths; or use trees; close with the heat equation kernel as the pricing solution. "does exist a solution and it's unique" [0:02:03]

Worked:
- A guest notes trees suit path-dependent claims such as early exercise because each node can condition on its history. "with options where you have early exercise" [0:40:51]
- Accuracy rises with more branches per step or with smaller time steps. "at each step or take smaller time" [0:42:07]

Failed:
- The lecturer says it is a starting point only. "the mean reversion so if you start" [0:20:12]
- A smaller h costs compute. "you pick h to be too small" [0:39:31]
