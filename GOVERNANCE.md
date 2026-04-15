# Governance

`bucket.foundation` is a **nonprofit** project. This document is the plain-English, non-legal explanation of how it is run, what it owns, what it does not own, and how decisions get made.

> **Legal status:** nonprofit, formalization in progress. Jurisdiction, fiscal sponsor, and tax status will be listed here once filed. Until then, treat this document as a statement of intent from the founding maintainer, not a binding charter.

---

## 1. Mission

Make primary research **paid-for-once and citeable-forever**, and route citation fees to authors — not publishers.

The concrete expression of this mission is:

1. Maintain an open protocol spec (`PROTOCOL.md`) so anyone can run an interoperable bucket.
2. Operate a reference bucket (the site at `bucket.foundation`) as a non-exclusive example of what a bucket looks like.
3. Publish a conservative canon of foundation-tier research under the strict filter described in `PROTOCOL.md`.
4. Return citation revenue to authors, minus verifiable operating costs.

That's it. Everything else is implementation detail.

---

## 2. What the Foundation owns

- The **domain** `bucket.foundation` and related subdomains.
- The **reference bucket** — the canonical copies of papers that were purchased via x402 through the Foundation's operating wallet.
- The **trademark** of the name "bucket.foundation" (to the extent one can be established), used defensively to prevent confusing forks from impersonating the canonical site.
- **Operating infrastructure** — the servers, wallets, and cloud accounts that run the reference site.

## 3. What the Foundation does NOT own

- The **protocol**. The protocol is CC0-in-intent. Nobody owns it. Nobody needs permission to implement it.
- The **code** in this repository. It is MIT-licensed. Fork it, sell it, bundle it with proprietary software, do what you want within the MIT terms.
- **Other buckets.** Anyone can run a bucket. The Foundation's bucket is one of many. There is no authoritative node.
- **Author copyrights.** Each canon artifact keeps its own license, recorded in `canon.json`. The Foundation does not claim copyright over the research it mirrors.
- **The brand of any downstream fork.** If someone forks bucket.foundation and calls their site `research.example.com`, that is their site under their rules.

---

## 4. Financial structure (intent)

| Revenue source | Flow |
|---|---|
| Citation fees collected by the Foundation's reference bucket | → author payout wallet (majority) → Foundation operating budget (minority, capped) |
| Donations / sponsorships | → operating budget and author payouts; never to maintainer compensation beyond reasonable rates |
| Grants | → earmarked for the specific program stated in the grant |
| Protocol licensing | **$0** — the protocol is free forever |

The exact split between author payout and operating budget will be published once the Foundation has real operating costs to calibrate against. Default intent: **≥80% to authors, ≤20% to operations**, with the split audited annually.

The Foundation will not:

- Pay dividends or profit shares to anyone. There is no equity.
- Compensate the founder(s) beyond reasonable fair-market rates for documented work.
- Hold crypto or fiat reserves beyond what is required to operate for 12 months. Surplus above that flows back into author payouts, mirror subsidies, or grants to open-access infrastructure.

## 5. Decision making

Until a formal board is seated:

- **Maintainer authority.** The founding maintainer (@gianyrox) is the decision-maker of last resort for:
  - Merging changes to `PROTOCOL.md`
  - Allocating operating surplus
  - Accepting or declining partnerships, sponsorships, and grants
- **Open process.** Every non-trivial decision is recorded as a GitHub issue tagged `governance`. Objections from the community are considered and responded to in the thread before a decision is finalized.
- **Transparency default.** All financial flows through the Foundation's reference wallet are public on-chain and can be independently audited.

Once the Foundation formalizes, this section will be replaced with a board charter, conflict-of-interest policy, and a procedure for electing new maintainers.

## 6. What will trigger formalization

The Foundation will file as a formal nonprofit (jurisdiction TBD — candidates include US 501(c)(3) via a fiscal sponsor, Swiss Verein, or Netherlands Stichting) when any one of the following is true:

- Annual revenue exceeds **$10,000 USD**, OR
- A single donation exceeds **$2,500 USD**, OR
- A grant offer requires a formal legal entity, OR
- A court order, subpoena, or takedown notice requires a legal counterparty.

Until then, running as an informal nonprofit project under the founding maintainer's personal tax reporting is simpler, cheaper, and honest.

## 7. Conflicts of interest (founder disclosure)

- **@gianyrox** is also the founder of **AGFarms**, a venture studio. AGFarms operates a separate for-profit Nucleus Brain instance that may, in the future, integrate with `bucket.foundation` as a consumer of citation data. This integration would be at arms-length and at the same rate any other consumer pays.
- The `bucket.foundation` project and its reference wallet are **not** owned by AGFarms LLC. They are held in the founder's personal capacity, pending formalization.
- Any contribution from an AGFarms-funded engineer to this repository will be disclosed in the PR description.

## 8. What this document is not

- It is **not** a contract.
- It is **not** tax advice.
- It is **not** a solicitation of donations.
- It is **not** a promise that the Foundation will be granted 501(c)(3) or any equivalent status.

It is a good-faith statement of how the project intends to be governed. Anyone who relies on it should do their own diligence before contributing, donating, or building on top of the Foundation's infrastructure.

---

*Last updated: 2026-04-14. This file will be versioned along with the protocol.*
