# Kelly and Position Sizing

ID: `Q-kelly`
As of: 2026-11-27
Bead: `bkt-q5moa.1`

## What It Is

Kelly sizing bets the fraction of bankroll that maximizes expected log wealth. For a binary bet at net odds b with win probability p, f* = (bp - q)/b. On a prediction market contract bought at price c, f* = (p - c)/(1 - c). Full Kelly is volatile; practitioners bet a fraction of it.

## Key Numbers and Dates

- Kelly, A New Interpretation of Information Rate, Bell System Technical Journal 35(4):917-926, July 1956; manuscript received 1956-03-21. **A**
- Prediction market form f* = (p - c)/(1 - c) follows from the binary formula with b = (1 - c)/c. **A**

## Sources

1. Crossref record, Kelly 1956. https://api.crossref.org/works/10.1002/j.1538-7305.1956.tb03809.x (fetched 2026-11-27)
2. Kelly 1956 full text, reproduced with permission of AT&T. https://www.princeton.edu/~wbialek/rome/refs/kelly_56.pdf (fetched 2026-11-27)

Grades: A primary data or statute, B reputable secondary, C single source or memory pending check.

## Derivation

Assumptions: repeated independent binary bets; win probability \(p\), loss probability \(q = 1-p\); net odds \(b\) (a win pays \(b\) per unit staked, a loss costs the stake); the bettor stakes a fixed fraction \(f \in [0,1)\) of wealth each round.

1. After \(n\) bets with \(W\) wins and \(L\) losses, wealth is \(X_n = X_0 (1+bf)^W (1-f)^L\).
2. The per-bet growth rate is
\[ G_n(f) = \frac1n \ln\frac{X_n}{X_0} = \frac{W}{n}\ln(1+bf) + \frac{L}{n}\ln(1-f) \]
3. By the strong law of large numbers \(W/n \to p\) and \(L/n \to q\) almost surely, so
\[ G(f) = p\ln(1+bf) + q\ln(1-f) \]
4. First-order condition: \(G'(f) = \dfrac{pb}{1+bf} - \dfrac{q}{1-f} = 0\), so \(pb(1-f) = q(1+bf)\), which rearranges to \(pb - q = bf(p+q) = bf\).
5. \(G''(f) = -\dfrac{pb^2}{(1+bf)^2} - \dfrac{q}{(1-f)^2} < 0\), so the stationary point is the maximum.
\[ \boxed{\,f^* = \frac{bp - q}{b}\,} \]
6. Prediction market contract bought at price \(c\), paying 1: net odds \(b = (1-c)/c\). Substitute:
\[ \boxed{\,f^* = \frac{p - c}{1 - c}\,} \]
7. Growth at the optimum: \(G(f^*) = p\ln p + q\ln q + p\ln(1+b) - \ln b\) when \(bp > q\). At fair odds \(b = q/p\), \(f^* = 0\) and growth is zero.

Kelly's own framing: with a private channel of rate \(R\) on even-money bets, the maximal growth rate of capital equals \(R\).

Source: Kelly 1956, doi:10.1002/j.1538-7305.1956.tb03809.x, Crossref record fetched 2026-11-27.
