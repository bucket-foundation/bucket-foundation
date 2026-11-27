# Majority is not enough: bitcoin mining is vulnerable <!-- voice-ignore-line -->

Topic: Cryptocurrency  
Also tagged: Cryptocurrency  
OpenAlex: https://openalex.org/W2103863878  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Ittay Eyal, Emin Gün Sirer | <!-- voice-ignore-line -->
| Year | 2018 |
| Venue | Communications of the ACM | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1145/3212998 |
| Cited by | 1006 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Proposed method or design. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We show that the Bitcoin mining protocol is not incentive-compatible.
<!-- voice-ignore-next 1 -->
> The attack can have significant consequences for Bitcoin: Rational miners will prefer to join the attackers, and the colluding group will increase in size until it becomes a majority.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> The Bitcoin cryptocurrency records its transactions in a public log called the blockchain. Its security rests critically on the distributed protocol that maintains the blockchain, run by participants called miners. Conventional wisdom asserts that the mining protocol is incentive-compatible and secure against colluding minority groups, that is, it incentivizes miners to follow the protocol as prescribed. We show that the Bitcoin mining protocol is not incentive-compatible. We present an attack with which colluding miners' revenue is larger than their fair share. The attack can have significant consequences for Bitcoin: Rational miners will prefer to join the attackers, and the colluding group will increase in size until it becomes a majority. At this point, the Bitcoin system ceases to be a decentralized currency. Unless certain assumptions are made, selfish mining may be feasible for any coalition size of colluding miners. We propose a practical modification to the Bitcoin protocol that protects Bitcoin in the general case. It prohibits selfish mining by a coalition that command less than 1/4 of the resources. This threshold is lower than the wrongly assumed 1/2 bound, but better than the current reality where a coalition of any size can compromise the system.
