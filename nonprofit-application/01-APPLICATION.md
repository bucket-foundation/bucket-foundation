# Master Application — bucket.foundation Nonprofit Reinstatement

> A reusable application form. Each section maps to the standard intake fields used by the major US fiscal sponsors (Open Collective Foundation, Code for Science & Society, Software Freedom Conservancy, NumFOCUS) and to the narrative sections of IRS Form 1023-EZ and Form 1023.

**Date of application:** 2026-04-14
**Applicant capacity:** Founding maintainer applying on behalf of an unincorporated nonprofit project, in personal capacity, pending sponsor acceptance or formal incorporation.

---

## 1. Project identity

| Field | Value |
|---|---|
| **Legal/working name** | bucket.foundation |
| **Alternate names** | Bucket Foundation, the Bucket Project |
| **Domain** | bucket.foundation |
| **Code repository** | https://github.com/gianyrox/bucket-foundation (planned transfer to a neutral org once sponsor is selected) |
| **Founded** | December 2024 (initial prototype); reactivated April 2026 as open-source-first |
| **Current legal status** | Unincorporated nonprofit project, operated by founding maintainer in personal capacity |
| **Prior status** | None. There is no lapsed entity to "reinstate" in the strict legal sense. The word *reinstated* in this packet refers to **reinstating the project as an active nonprofit effort** after a 14-month dormancy, not to reviving a struck-off corporation. |
| **Tax ID (EIN)** | None yet. Will apply via SS-4 once sponsor is selected or upon incorporation. |
| **State / jurisdiction of operation** | United States (founder resides in NY, NJ); no physical office |
| **Principal contact** | Gian Dichio, gianyrox@gmail.com |

## 2. One-paragraph description

bucket.foundation is an open-source protocol and a reference publishing site for primary research that can be **paid for once and cited forever**. A "bucket" is a content-addressed folder containing a paper, a sidecar manifest (`canon.json`), and an HTTP 402 (x402) payment receipt. Once a paper has been purchased into a bucket, the marginal cost of citing it is zero, and any citation fee attached to that paper flows back to the original author rather than to a publisher. The protocol is MIT-licensed, the spec is CC0-in-intent, and the Foundation runs **a** bucket (the reference site), not **the** bucket — anyone may run their own.

## 3. Mission statement

> Make primary research **paid-for-once and citeable-forever**, and route citation fees to authors — not publishers.

## 4. Charitable purpose (in IRS § 501(c)(3) language)

bucket.foundation is organized and operated **exclusively for charitable, educational, and scientific purposes** within the meaning of Section 501(c)(3) of the Internal Revenue Code, including:

- **Educational:** Disseminating the fruits of scientific research to the general public on a non-discriminatory basis, with particular attention to independent researchers, students, and researchers in low-income and developing regions who cannot afford traditional publisher access fees.
- **Scientific:** Maintaining an open-source protocol and reference implementation for the durable, content-addressed, machine-citeable storage of primary research artifacts.
- **Charitable:** Returning citation revenue to the authors of primary research at a default rate of not less than eighty percent (80%) of net citation receipts, thereby reducing the economic barrier to producing primary research and increasing the supply of publicly accessible scholarship.

The Foundation will **not** be operated for the benefit of any private interest. No part of the net earnings of the Foundation will inure to the benefit of any private shareholder or individual, except as reasonable compensation for services rendered, documented at fair market rates.

## 5. Specific activities

The Foundation will engage in the following activities to advance its mission:

1. **Maintain the open protocol specification** (`PROTOCOL.md`), published under a CC0-in-intent dedication so that any party may implement an interoperable bucket without permission or fee.
2. **Operate a reference bucket** at the domain `bucket.foundation`, comprising:
   - Purchased canonical copies of papers acquired via x402 micropayments through the Foundation's operating wallet;
   - The `canon.json` sidecar registry that records provenance, license, citation metadata, and author payout addresses;
   - A public website that allows readers to discover, read, and cite bucketed research.
3. **Publish a conservative canon** of foundation-tier research (axioms, principles, primary derivations, landmark studies) under the strict editorial filter described in `PROTOCOL.md`.
4. **Distribute citation revenue** to authors at a default rate of ≥80% of net receipts, with the balance retained for verifiable operating costs.
5. **Document and promote** the protocol through written materials, conference presentations, and direct engagement with research groups, libraries, and open-science organizations.
6. **Support derivative buckets** — anyone (nonprofit, for-profit, individual, university, lab) may run a bucket implementing the protocol; the Foundation will provide non-binding technical support and reference test vectors at no cost.

The Foundation will **not**:

- Lobby for or against legislation as a substantial part of its activities.
- Participate in any political campaign on behalf of (or in opposition to) any candidate for public office.
- Engage in any transaction prohibited by IRC § 4958 (excess benefit) or § 4941 (self-dealing).
- Pay dividends, profit shares, or equity-equivalent compensation to any person.

## 6. Public benefit

The class of persons benefited by the Foundation is **indefinite and open** — every reader, researcher, library, agent, and downstream tool that needs to access or cite primary research, with explicit prioritization of users for whom traditional publisher fees are a barrier (independent researchers, students, researchers in developing regions, AI agents acting on behalf of any of the above).

The Foundation does not restrict access by membership, geography, institutional affiliation, or ability to pay. The minimum payment to **read** a bucketed paper is the marginal cost of HTTP delivery (effectively zero); the minimum payment to **cite** a bucketed paper is the per-citation fee set by the original author and recorded in `canon.json`. Both are public, both are auditable on-chain, and both flow to authors rather than to the Foundation.

## 7. Funding sources (projected)

| Source | Description | Estimated 12-month amount |
|---|---|---|
| Citation fees | Per-citation micropayments collected by the reference bucket | $0 – $5,000 (highly uncertain in year 1) |
| Donations | Individual donations to the operating wallet | $0 – $2,500 |
| Grants | Open-science / open-data grants from foundations | $0 – $25,000 (one realistic target: Mozilla Builders, Sloan, Protocol Labs PL Network) |
| Sponsorships | In-kind hosting, RPC credits, storage credits | $0 – $5,000 in-kind |
| **Founder personal funds** | Gap funding by founding maintainer | ≤ $1,200 (operating runway only) |

The Foundation **will not** accept funding from any party that conditions the gift on (a) restricting access to the canon, (b) blocking specific authors from receiving payouts, (c) preferential placement in the canon, or (d) corporate-friendly modifications to the protocol that would compromise interoperability.

## 8. Compensation policy

Until further notice, **no person receives compensation from the Foundation.** All work in the first 12 months is volunteer. If the Foundation later compensates the founding maintainer or any contractor, the rate will be:

- Documented in writing, in advance, with scope and deliverables;
- Set at or below fair-market rate for comparable open-source / nonprofit technical work;
- Approved by a quorum of the board (once seated) or, in the absence of a board, disclosed publicly in the next quarterly report;
- Paid only against documented hours or deliverables, never as a retainer or salary.

No person will receive equity, profit-share, or revenue-share compensation. There is no equity in the Foundation.

## 9. Conflict of interest disclosure

The founding maintainer, **Gian Dichio**, is also the founder of **AGFarms LLC**, a Delaware for-profit venture studio. AGFarms operates an internal AI orchestration platform ("Nucleus Brain") that may, in the future, integrate with `bucket.foundation` as a paying consumer of citation data. To address this potential conflict, the Foundation adopts the policy in `05-CONFLICT-OF-INTEREST-POLICY.md`, the key terms of which are:

1. AGFarms LLC does **not** own the Foundation's domain, code, wallet, or canon.
2. Any AGFarms-funded engineering contribution to the Foundation's repositories must be disclosed in the pull-request description.
3. Any commercial agreement between AGFarms and the Foundation must be at arm's length, on the same terms offered to any other consumer, and approved by a board member who is not financially interested in AGFarms (or, until the board is seated, disclosed publicly in advance).
4. The founding maintainer recuses from any vote on AGFarms-related transactions.

Full disclosure: see `GOVERNANCE.md` § 7.

## 10. What the Foundation is asking the sponsor to do

If accepted, the fiscal sponsor will:

1. **Hold the Foundation's funds** in a sponsor-managed account or sub-account, with monthly statements visible to the founding maintainer.
2. **Issue tax receipts** to US donors for tax-deductible donations.
3. **Hold the `bucket.foundation` domain registration** (or accept the founding maintainer as the designated technical contact while retaining ultimate ownership).
4. **Hold the operating wallet** in custody, OR accept a multi-sig arrangement in which the sponsor holds at least one signing key.
5. **Provide a standard grant-agreement template** so the Foundation can disburse author payouts under the sponsor's compliance umbrella.
6. **Take a sponsor fee** of up to 10% of pass-through revenue, OR whatever the sponsor's standard rate is. The Foundation accepts the sponsor's standard fee schedule.

## 11. Acknowledgments

The applicant acknowledges that:

- Submission of this application is not an offer or a contract.
- The sponsor may decline this application without explanation.
- The sponsor may impose additional terms not contemplated here.
- Acceptance is conditional on signing the sponsor's standard fiscal sponsorship agreement.

---

**Signed:**

Gian Dichio, founding maintainer
2026-04-14
