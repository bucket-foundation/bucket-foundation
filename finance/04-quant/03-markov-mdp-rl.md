# Markov Decision Processes and Reinforcement Learning

A Markov decision process states trading as sequential choice: state (position, book, regime), action (order), reward (P&L net of cost). Hidden Markov models infer regimes. RL learns policies by simulation; finance gives short, non-stationary samples, so RL works best on execution and market making where a simulator is credible.

## Papers

- Hamilton 1989, regime switching, Econometrica. doi:10.2307/1912559
- Moody and Saffell 2001, Learning to trade via direct reinforcement, IEEE TNN. doi:10.1109/72.935097
- Deng, Bao, Kong, Ren 2017, Deep Direct Reinforcement Learning for Financial Signal Representation and Trading, IEEE TNNLS. doi:10.1109/tnnls.2016.2522401
- Liu et al. 2020, FinRL, arXiv:2011.09607
- Sutton and Barto, Reinforcement Learning: An Introduction (MIT Press).

## In The Video Corpus

- 2bE2iyRBK1E @ 0:31:00 RL order timing saved cost across 100 stocks
- dHlBxjbzrtU @ 0:43:00 Chan: six-month deep RL project no better than simpler methods
- y_bsjZThP0o @ 0:13:00 HMM regime bot; use forward algorithm to avoid look-ahead
- LJIwxiMxbaw @ 1:35:00 Chan: HMMs never worked for him

## Open Question

No published RL equity strategy in this card shows audited live returns.

## Derivation

### Hidden Markov Regime Model

Assumptions: hidden regime \(S_t \in \{1..K\}\) is a Markov chain with transition matrix \(A_{ij} = P(S_t = j\mid S_{t-1} = i)\) and initial law \(\pi\); observed return \(r_t\) given \(S_t = j\) has density \(b_j(r_t)\), for example \(N(\mu_j, \sigma_j^2)\); returns are independent given the regimes.

1. Forward variable \(\alpha_t(j) = p(r_{1:t}, S_t = j)\). Start \(\alpha_1(j) = \pi_j b_j(r_1)\).
2. Sum over the previous regime and use the Markov and conditional independence properties:
\[ \boxed{\,\alpha_t(j) = b_j(r_t)\sum_{i=1}^K \alpha_{t-1}(i)\,A_{ij}\,} \]
3. Filtered regime probability, which uses no future data: \(P(S_t = j\mid r_{1:t}) = \alpha_t(j)/\sum_k\alpha_t(k)\). Likelihood: \(p(r_{1:T}) = \sum_j\alpha_T(j)\).
4. Backward variable \(\beta_t(i) = p(r_{t+1:T}\mid S_t = i)\), with \(\beta_T = 1\) and \(\beta_t(i) = \sum_j A_{ij}b_j(r_{t+1})\beta_{t+1}(j)\). Smoothed probabilities \(\gamma_t(i) \propto \alpha_t(i)\beta_t(i)\) and \(\xi_t(i,j) \propto \alpha_t(i)A_{ij}b_j(r_{t+1})\beta_{t+1}(j)\).
5. Baum-Welch (EM): maximize the expected complete-data log-likelihood. Lagrange multipliers on \(\sum_j A_{ij} = 1\) give
\[ \hat A_{ij} = \frac{\sum_t\xi_t(i,j)}{\sum_t\gamma_t(i)},\qquad \hat\mu_j = \frac{\sum_t\gamma_t(j)r_t}{\sum_t\gamma_t(j)},\qquad \hat\sigma_j^2 = \frac{\sum_t\gamma_t(j)(r_t-\hat\mu_j)^2}{\sum_t\gamma_t(j)} \]
Each iteration does not decrease the likelihood.

Smoothed \(\gamma_t\) uses data after \(t\). A backtest must trade on the filtered probability from step 3.

Sources: Baum, Petrie, Soules, Weiss, A Maximization Technique Occurring in the Statistical Analysis of Probabilistic Functions of Markov Chains, Ann. Math. Statist. 41(1):164-171, 1970, doi:10.1214/aoms/1177697196. Hamilton 1989, Econometrica 57(2):357, doi:10.2307/1912559. Crossref records fetched 2026-11-27.

### Bellman Equation

Assumptions: Markov decision process with states \(s\), actions \(a\), transition law \(P(s'\mid s,a)\), bounded reward \(r(s,a)\), discount \(\gamma \in [0,1)\). A policy \(\pi\) has value \(V^\pi(s) = E^\pi\big[\sum_{t\ge0}\gamma^t r(s_t,a_t)\mid s_0 = s\big]\).

1. Split off the first reward and use the Markov property: \(V^\pi(s) = E^\pi[r(s,a_0) + \gamma V^\pi(s_1)]\).
2. Principle of optimality: an optimal policy, after any first step, is optimal from the state it reaches. So
\[ \boxed{\,V^*(s) = \max_a\Big[r(s,a) + \gamma\sum_{s'}P(s'\mid s,a)\,V^*(s')\Big]\,} \]
3. The right side defines an operator \(T\). For any \(V, U\): \(\|TV - TU\|_\infty \le \gamma\|V-U\|_\infty\), since \(|\max_a f - \max_a g| \le \max_a|f-g|\). By the Banach fixed-point theorem \(V^*\) is unique and value iteration \(V_{k+1} = TV_k\) converges geometrically.
4. Action-value form: \(Q^*(s,a) = r(s,a) + \gamma\sum_{s'}P(s'\mid s,a)\max_{a'}Q^*(s',a')\).

Source: Bellman, On the Theory of Dynamic Programming, PNAS 38(8):716-719, 1952, doi:10.1073/pnas.38.8.716, Crossref record fetched 2026-11-27.

### Reinforcement Learning for Execution

Assumptions: transitions \(P\) are unknown; the agent observes samples \((s, a, r, s')\). Execution MDP: state \(s = (\text{time left}, \text{inventory left}, \text{book features})\), action \(a\) = limit price or quantity for the next slice, reward = minus implementation shortfall of the fills, terminal penalty for unfilled shares.

1. Replace the expectation in the \(Q^*\) equation with one sample and move a step of size \(\eta_t\) toward it:
\[ \boxed{\,Q(s,a) \leftarrow Q(s,a) + \eta_t\Big[r + \gamma\max_{a'}Q(s',a') - Q(s,a)\Big]\,} \]
2. This is stochastic approximation on the contraction \(T\). Watkins and Dayan prove \(Q \to Q^*\) with probability 1 when every state-action pair is visited an unbounded number of times, \(\sum_t\eta_t = \infty\) and \(\sum_t\eta_t^2 < \infty\), and rewards are bounded.
3. Finite-horizon execution: index states by time left \(t\) and set \(\gamma = 1\). Backward induction on historical order book replays computes \(Q_t\) from \(Q_{t+1}\), which is the method of Nevmyvaka, Feng and Kearns.

Sources: Watkins and Dayan, Q-learning, Machine Learning 8:279-292, 1992, doi:10.1007/BF00992698. Nevmyvaka, Feng, Kearns, Reinforcement learning for optimized trade execution, ICML 2006, pp. 673-680, doi:10.1145/1143844.1143929. Crossref records fetched 2026-11-27.
