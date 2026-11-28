## Deep Read

Source: open-access full text, Journal of Artificial Intelligence Research 4, 1996, pages 237 to 285. Read 2026-11-27.

### Research Question

What is reinforcement learning, what are its central technical problems, and which methods worked on real tasks as of 1995?

### Data and Sample

None of its own. The survey covers work from Samuel's 1959 checkers program through 1995, and reports results others obtained: TD-Gammon, robot control tasks, elevator dispatching and a packaging task.

### Method

A literature survey from a computer science view, organized by problem. Section 1 sets out the agent and environment model and three optimality criteria: finite horizon, infinite horizon discounted, and average reward. Section 2 covers exploration against exploitation in the one-state bandit case, from Gittins indices and learning automata to greedy and Boltzmann exploration. Section 3 defines Markov decision processes and value and policy iteration. Section 4 covers model-free methods: the adaptive heuristic critic, TD(lambda) and Q-learning. Section 5 covers model-based methods: certainty equivalence, Dyna and prioritized sweeping. Sections 6 and 7 cover generalization with function approximators, hierarchy, and partially observable environments. Section 8 reviews applications.

### Main Results

Q-learning updates Q(s,a) toward r plus the discounted maximum Q value of the next state. With every action tried in every state an infinite number of times and a decaying learning rate, the Q values converge to the optimum with probability 1 (Section 4.2, citing Watkins 1989 and Tsitsiklis 1994).

Model-based methods such as Dyna and prioritized sweeping reach good policies in far fewer real experiences than Q-learning on grid tasks, at the price of more computation per step (Section 5).

Function approximation breaks the convergence guarantees. Section 6.1 reports work in which value iteration with function approximators diverged on simple tasks, and other work in which a change of approximator, algorithm or training regime made the same tasks succeed.

Table 2: TD-Gammon, a three-layer network trained by temporal differences on self-play, lost by 13 points in 51 games at 300,000 training games, by 7 points in 38 games at 800,000, and by 1 point in 40 games at 1,500,000, against top human professionals.

### Robustness

No formal checks. The authors flag where results hinge on design choices, such as the approximator conflicts in Section 6.1.

### Stated Limits

The conclusion says many methods work on small problems and few scale to large ones. Solving complex problems needs bias supplied by people: shaping, local reward signals, imitation, problem decomposition and reflexes. The survey says it is not exhaustive.

### Retail Systematic Trader

A market is a noisy, partly observed, non-stationary environment with few independent samples, the setting this survey says breaks the convergence results. A retail trader should expect tabular RL to need a small discrete state space, and function approximation to need heavy priors, simulated costs and out-of-sample checks. The survey supplies the vocabulary for the trading papers in this set: reward design, discounting, exploration cost and the gap between model-free and model-based learning. It contains no trading result.
