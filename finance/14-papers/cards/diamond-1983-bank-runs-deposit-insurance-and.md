# Bank Runs, Deposit Insurance, and Liquidity <!-- voice-ignore-line -->

Topic: Banking and Crises  
Also tagged: Banking and Crises  
OpenAlex: https://openalex.org/W2157509893  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Douglas W. Diamond, Philip H. Dybvig | <!-- voice-ignore-line -->
| Year | 1983 |
| Venue | Journal of Political Economy | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1086/261155 |
| Cited by | 12282 as of 2026-11-27 |
| Cited by inside this set | 27 |

## Method

Model-based analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> This paper shows that bank deposit contracts can provide allocations superior to those of exchange markets, offering an explanation of how banks subject to runs can attract deposits.
<!-- voice-ignore-next 1 -->
> Contracts which can prevent runs are studied, and the analysis shows that there are circumstances when government provision of deposit insurance can produce superior contracts.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> This paper shows that bank deposit contracts can provide allocations superior to those of exchange markets, offering an explanation of how banks subject to runs can attract deposits. Investors face privately observed risks which lead to a demand for liquidity. Traditional demand deposit contracts which provide liquidity have multiple equilibria, one of which is a bank run. Bank runs in the model cause real economic damage, rather than simply reflecting other problems. Contracts which can prevent runs are studied, and the analysis shows that there are circumstances when government provision of deposit insurance can produce superior contracts.

## Full Text

Open-access copy: https://knowledge.uchicago.edu/records/3sa4m-hvw53/files/Bank-Runs-Deposit-Insurance-and-Liquidity.pdf

## Deep Read

Source: open-access full text, Journal of Political Economy 91(3), 1983, pages 401 to 419. Read 2026-11-27.

### Research Question

Why do banks that issue demand deposits attract savers when those contracts leave the bank open to runs, and which contracts or public policies stop runs without destroying the liquidity service banks provide?

### Data and Sample

None. The paper is a theory model with three dates, T = 0, 1, 2, one good and a continuum of ex ante identical agents. Historical runs enter only as motivation: Hartford Federal Savings and Loan and Abilene National Bank in 1982, Penn Square Bank, and the 1930s record from Friedman and Schwartz.

### Method

A riskless technology returns R > 1 at T = 2 per unit invested at T = 0, and only the unit back if liquidated at T = 1. At T = 1 each agent learns privately whether they are type 1, who must consume at T = 1, or type 2, who can wait. Types are unobservable, so markets cannot insure the risk. The bank offers a demand deposit paying r1 at T = 1 under a sequential service constraint: withdrawals are paid in order of arrival until the bank runs out. The authors solve for Nash equilibria of the withdrawal game, then add suspension of convertibility, a stochastic share t of type 1 agents, and a government that taxes withdrawals after the fact to fund deposit insurance.

### Main Results

The deposit contract with r1 above 1 reproduces the optimal risk sharing allocation (c1*, c2*) as one equilibrium. The same contract has a second equilibrium, a run, in which every agent withdraws at T = 1, the bank liquidates all assets and production is lost. Runs follow a shift in expectations; nothing in fundamentals has to change.

When the share of type 1 agents is known, suspending convertibility at that share removes the run equilibrium at no cost, since suspension never binds in equilibrium.

Proposition 1: when the share of early consumers is random, no bank contract that obeys sequential service, suspension included, reaches the full-information optimum.

Proposition 2: demand deposits with government deposit insurance, financed by a tax set on the realized volume of withdrawals, reach the unconstrained optimum as the unique Nash equilibrium, in dominant strategies.

### Robustness

The model has no formal robustness section. Section IV relaxes the known withdrawal volume and shows where suspension falls short. The conclusion argues that a discount window with the same taxes and transfers delivers the same allocation, since the technology is riskless.

### Stated Limits

The model has one bank standing in for the whole industry, a riskless asset and no moral hazard. The authors say that with risky assets chosen by bank managers, deposit insurance creates a trade-off with portfolio incentives and would need bank regulation, and that a lender of last resort is less credible than insurance once assets are risky. They do not model currency or many banks.

### Retail Systematic Trader

No trading signal. The paper gives a framework for run risk in any venue that promises par redemption on illiquid backing: uninsured bank deposits, money market funds, stablecoins, and exchanges holding customer assets. A retail book should treat such balances as exposed to a coordination equilibrium that can flip on news alone, size cash held outside insured accounts accordingly, and read a sudden withdrawal queue as a signal to exit before the sequential service line forms.
