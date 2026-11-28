# Market Making

Quote both sides around a fair price, earn the spread, manage inventory, avoid informed flow. Glosten-Milgrom and Kyle explain the spread as adverse selection; Avellaneda-Stoikov gives an inventory-aware quoting rule.

## Papers

- Glosten and Milgrom 1985, JFE. doi:10.1016/0304-405x(85)90044-3
- Kyle 1985, Continuous Auctions and Insider Trading, Econometrica. doi:10.2307/1913210
- Avellaneda and Stoikov 2008, High-frequency trading in a limit order book, Quantitative Finance. doi:10.1080/14697680701381228
- Cont, Kukanov, Stoikov 2014, The Price Impact of Order Book Events, J. Financial Econometrics (SSRN 1712822). Order flow imbalance drives short-horizon price change.
- Cartea, Jaimungal, Penalva, Algorithmic and High-Frequency Trading (Cambridge 2015).

## In The Video Corpus

- S7eig5VXFpY @ 0:15:00 reservation price derivation
- S7eig5VXFpY @ 0:48:00 Stoikov's paper test lost money on BTC
- eLLarGvuBzY @ 0:12:00 toxic flow; @ 0:46:00 Knight Capital
- W58yBI7owRs @ 0:09:00 Glosten-Milgrom zero-profit quotes

## Open Question

Retail access to maker rebates and queue priority limits what a small operator can capture.

## Derivation

### Avellaneda-Stoikov

Assumptions: mid price \(dS = \sigma\,dW\); the dealer has exponential utility \(-e^{-\gamma X}\) of terminal wealth at \(T\), risk aversion \(\gamma\); inventory \(q\), cash \(x\); a quote at distance \(\delta\) from the mid is hit at Poisson rate \(\lambda(\delta) = A e^{-k\delta}\), on each side.

1. Value function \(u(t,x,S,q) = \max E[-e^{-\gamma(x_T + q_T S_T)}]\). Without quoting, \(u = -e^{-\gamma x}e^{-\gamma qS}e^{\gamma^2 q^2\sigma^2(T-t)/2}\).
2. Reservation (indifference) prices. The bid price \(r^b\) solves \(u(t,x - r^b, S, q+1) = u(t,x,S,q)\), and \(r^a\) solves \(u(t,x+r^a,S,q-1) = u(t,x,S,q)\). From step 1:
\[ r^a = S + \frac{(1 - 2q)\gamma\sigma^2(T-t)}{2},\qquad r^b = S - \frac{(1 + 2q)\gamma\sigma^2(T-t)}{2} \]
and their average is the reservation price
\[ \boxed{\,r(S,q,t) = S - q\,\gamma\sigma^2(T-t)\,} \]
3. With quoting, the HJB equation is
\[ u_t + \tfrac12\sigma^2 u_{SS} + \max_{\delta^b}\lambda(\delta^b)\big[u(S{-}\delta^b\text{ bought}) - u\big] + \max_{\delta^a}\lambda(\delta^a)\big[u(S{+}\delta^a\text{ sold}) - u\big] = 0 \]
4. Ansatz \(u = -e^{-\gamma x}e^{-\gamma\theta(t,S,q)}\). The first-order condition in each \(\delta\) with \(\lambda = Ae^{-k\delta}\) gives
\[ \delta^a = r^a - S + \tfrac1\gamma\ln\big(1 + \tfrac\gamma k\big),\qquad \delta^b = S - r^b + \tfrac1\gamma\ln\big(1+\tfrac\gamma k\big) \]
5. Add them, using \(r^a - r^b = \gamma\sigma^2(T-t)\) from step 2:
\[ \boxed{\,\delta^a + \delta^b = \gamma\sigma^2(T-t) + \frac2\gamma\ln\Big(1 + \frac\gamma k\Big)\,} \]
Quote that spread symmetrically around \(r\). Long inventory shifts both quotes down, which sells inventory off.

Source: Avellaneda and Stoikov, High-frequency trading in a limit order book, Quantitative Finance 8(3):217-224, 2008, doi:10.1080/14697680701381228, Crossref record fetched 2026-11-27.
