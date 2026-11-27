# willowtree

https://github.com/federicomariamassari/willowtree. License MIT. Stars 392. Last push 2018-07-14. Python. Checked 2026-11-27.

## Architecture
Package `willowtree/` with `sampling.py` (discrete density pairs), `lp.py` (linear program for transition probabilities), `graph.py` (plots) and `maketree.py` (one-call tree generation). Twelve files.

## Data Layer
None. Inputs are node count `n`, shape weight `gamma` and algorithm choice.

## Event Loop
None.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. Builds a willow tree lattice for option pricing: sampling by kurtosis matching (for deep out of the money options) or first partial moment (near the money), then a linear program fits transition probabilities between time steps.

## AI Components
None.

## Connectors
None.

## Fit
Numerical method for lattice pricing of path-dependent options. Small and self-contained; no pricer on top.
Output is a tree of space nodes with probabilities per time step, and `graph.py` plots it. Parameters `k` and `tol` tune the linear program solve.
