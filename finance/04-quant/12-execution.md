# Execution

Execution cost is spread plus market impact plus timing risk. Almgren-Chriss trades off impact against variance to give an optimal schedule; Bertsimas-Lo minimizes expected cost under linear impact.

## Papers

- Bertsimas and Lo 1998, Optimal control of execution costs, J. Financial Markets. doi:10.1016/s1386-4181(97)00012-8
- Almgren and Chriss 2001, Optimal execution of portfolio transactions, J. Risk. doi:10.21314/jor.2001.041
- Harris, Trading and Exchanges (Oxford 2002).
- Bouchaud, Bonart, Donier, Gould, Trades, Quotes and Prices (Cambridge 2018). Square-root impact law.

## In The Video Corpus

- 2bE2iyRBK1E @ 0:31:00 RL execution
- y4z1FSdN_GA @ 0:13:00 latency cost about 20 mils per share
- joXDV5eqOoY @ 0:34:00 fees erase an overnight SPY anomaly
- fIxSae8k3t0 @ 0:03:00 walking the book

## Open Question

Retail fill quality depends on payment-for-order-flow routing that the trader cannot see.

## Derivation

### Almgren-Chriss

Assumptions: sell \(X\) shares over \([0,T]\) in \(N\) intervals of length \(\tau = T/N\); holdings \(x_k\) with \(x_0 = X\), \(x_N = 0\), trades \(n_k = x_{k-1} - x_k\). Price is arithmetic random walk with permanent impact: \(S_k = S_{k-1} + \sigma\sqrt\tau\,\xi_k - \tau g(n_k/\tau)\), \(\xi_k\) i.i.d. \(N(0,1)\). Execution price has temporary impact: \(\tilde S_k = S_{k-1} - h(n_k/\tau)\). Linear impacts \(g(v) = \gamma v\), \(h(v) = \epsilon\,\text{sgn}(v) + \eta v\).

1. Implementation shortfall \(XS_0 - \sum_k n_k\tilde S_k = -\sum_k\sigma\sqrt\tau\,\xi_k x_k + \sum_k \tau x_k g(n_k/\tau) + \sum_k n_k h(n_k/\tau)\).
2. Mean and variance:
\[ E = \tfrac12\gamma X^2 + \epsilon X + \frac{\tilde\eta}{\tau}\sum_k n_k^2,\quad \tilde\eta = \eta - \tfrac12\gamma\tau;\qquad V = \sigma^2\tau\sum_k x_k^2 \]
3. Minimize \(E + \lambda V\) for risk aversion \(\lambda\). Set the derivative in each interior \(x_j\) to zero:
\[ \frac{x_{j-1} - 2x_j + x_{j+1}}{\tau^2} = \tilde\kappa^2 x_j,\qquad \tilde\kappa^2 = \frac{\lambda\sigma^2}{\tilde\eta} \]
4. A linear second-order difference equation. Try \(x_j = e^{\pm\kappa t_j}\): \(2(\cosh\kappa\tau - 1) = \tilde\kappa^2\tau^2\). Fit the boundary conditions \(x_0 = X\), \(x_N = 0\):
\[ \boxed{\,x_j = X\,\frac{\sinh\big(\kappa(T - t_j)\big)}{\sinh(\kappa T)},\qquad n_j = \frac{2\sinh(\tfrac12\kappa\tau)}{\sinh(\kappa T)}\cosh\big(\kappa(T - t_{j-\frac12})\big)X\,} \]
5. Limits. \(\lambda \to 0\) gives \(\kappa \to 0\) and \(x_j = X(1 - t_j/T)\), the straight-line TWAP that minimizes expected cost. Large \(\lambda\) front-loads the sale to cut variance. Varying \(\lambda\) traces an efficient frontier in \((V, E)\). The half-life of the trade is \(1/\kappa\).

Source: Almgren and Chriss, Optimal execution of portfolio transactions, J. Risk 3(2):5-39, 2001, doi:10.21314/JOR.2001.041, Crossref record fetched 2026-11-27.
