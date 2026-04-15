# Narrative — Mission, Activities, Public Benefit

> The narrative attachment that accompanies the master application. Designed to be lifted directly into IRS Form 1023 Part IV ("Narrative Description of Your Activities") or into the equivalent free-text fields on a fiscal sponsor's intake form.

---

## A. The problem we are organized to solve

Primary research is the substrate on which every downstream applied science depends — medicine, energy, agriculture, materials, climate, computation. The economic system that publishes this substrate is broken in three measurable ways:

1. **Readers pay for papers they may not need.** Subscription bundles force libraries (and the public funds behind them) to purchase access to entire journal portfolios in order to read a small number of relevant articles.
2. **Authors pay publishers to publish work the authors already wrote.** Article processing charges (APCs) for open-access publication routinely range from $1,500 to $11,000 per article, paid by the author's grant or institution.
3. **Independent researchers cannot cite what they cannot afford to read.** The marginal cost of citing a paper that already exists in a library should be zero; in practice it is bounded below by the publisher's per-article paywall.

The cumulative effect is that the supply of new primary research is artificially throttled by an intermediary layer that adds no scientific value, and the readers most likely to produce derivative discoveries — students, independent researchers, and researchers in low-income regions — are the ones most consistently locked out.

## B. The mechanism we propose

bucket.foundation introduces a single convention on top of the existing HTTP and payments stack:

> **Pay for a paper once via x402 (HTTP 402 Payment Required). Store the paper, the manifest, and the payment receipt in a content-addressed folder. Cite that folder forever, at zero marginal x402 cost. Route the per-citation fee directly to the author.**

The convention is implemented as:

- **`PROTOCOL.md`** — an open specification (CC0-in-intent) defining the bucket folder layout, the `canon.json` sidecar schema, the x402 fetch flow, and the citation receipt format.
- **A reference implementation** — an MIT-licensed Next.js site that fetches papers from x402-gated research APIs, writes them into buckets, and exposes a public registry.
- **A canon** — a curated, conservative collection of foundation-tier research (axioms, principles, primary derivations, landmark studies) maintained under the editorial filter described in `PROTOCOL.md`.

There is **nothing technically novel** about any of these pieces in isolation. The novelty is the convention, the license, and the citation economics. The protocol is designed so that **no single party — including the Foundation itself — is structurally necessary** for the system to function. Anyone may run a bucket. The Foundation runs *a* bucket, not *the* bucket.

## C. Why this is a charitable activity

The Foundation's activities map directly onto the IRS-recognized charitable purposes of **education, science, and the relief of the poor and distressed**:

- **Education.** Disseminating primary research to the general public — including to readers who cannot afford subscription paywalls — is a textbook educational purpose. The Foundation does not gate access by membership, geography, or institutional affiliation.
- **Science.** Maintaining the protocol and the reference implementation is the production and maintenance of open scientific infrastructure, comparable in kind (if not yet in scale) to arXiv, PubMed Central, and OpenAlex.
- **Relief of distress.** The class of users for whom the existing publisher economy is most economically distressing — independent researchers, students, low-income institutions, and researchers in developing regions — is explicitly named as a priority constituency. The Foundation's pricing structure (read-for-free, cite-for-author-set-fee) is designed so that the marginal cost of using a bucketed paper approaches zero for these users.

The Foundation is **not** organized to:

- Generate profit for any private party (there is no equity).
- Lobby for legislation (no lobbying activities planned or budgeted).
- Promote a particular candidate or political position (none).
- Benefit a closed or restricted class (the user class is open and indefinite).

## D. Activities — the next 12 months

The Foundation will pursue the following activities in its first operating year as a sponsored project:

1. **Protocol stewardship.** Maintain `PROTOCOL.md` at version 0.1 → 0.3, accept community pull requests, publish at least one round of test vectors so independent implementations can verify conformance.
2. **Reference site reactivation.** Bring the dormant Next.js reference implementation back to a deployable state, audit its dependencies, ship a minimal demo at `bucket.foundation` that fetches and displays at least one bucketed paper end-to-end.
3. **Canon seeding.** Mirror an initial conservative canon of approximately 50 foundation-tier artifacts from public open-access sources (where the source license permits), so that the protocol has real content to demonstrate against. No paid acquisitions in year one until the operating wallet has been transferred to the sponsor.
4. **Author payout pipeline.** Build and document the on-chain payout flow so that any future citation fee collected through the reference bucket is routed to the author's recorded payout address with no manual intervention by the Foundation.
5. **Documentation and outreach.** Publish a public roadmap, a contributor guide, and at least one written explanation of the protocol aimed at non-technical librarians and open-science advocates. Present the protocol at one public venue (workshop, podcast, or written essay).
6. **Governance maturation.** Recruit at least two additional individuals to serve as advisors or interim board members, draft bylaws, and adopt a formal conflict-of-interest acknowledgment that all participants sign.
7. **Sponsor reporting.** Submit quarterly written reports to the fiscal sponsor on activities, finances, and risks. Comply with all sponsor reporting and audit requirements.

## E. Activities — what we will NOT do in year one

- We will not mint, issue, or sell any token or NFT-equivalent that represents an equity, profit, or governance interest in the Foundation. (The reference site uses Story Protocol IP NFTs to represent **author copyright registrations**, which are distinct from financial instruments.)
- We will not accept any donation, grant, or sponsorship that conditions the gift on restricting the canon, blocking specific authors, or modifying the protocol in a way that compromises interoperability.
- We will not sue, threaten to sue, or send takedown notices to any party operating a competing bucket implementation. The protocol is open. Competition is welcome.
- We will not enter into any commercial agreement with AGFarms LLC (the founding maintainer's other entity) without prior public disclosure and, once a board is seated, the affirmative vote of a non-conflicted board member.

## F. Public-benefit measurement

In each quarterly report to the sponsor, the Foundation will publish:

- **Buckets created** in the period (count and total paper count).
- **Citations served** in the period (count and on-chain receipts).
- **Author payouts disbursed** in the period (count, total amount, top-line recipients with consent).
- **Operating expenses** in the period (line-item, with receipts).
- **Surplus or deficit** for the period.
- **Concentration risk** — what fraction of activity / revenue depends on the largest single donor, sponsor, or x402 source. The Foundation will work to keep no single party above 50% of revenue.

These metrics, taken together, are the answer to the question *"is the Foundation actually doing what it says it does?"* and they are intended to be auditable by any third party against the on-chain wallet record.

## G. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The x402 ecosystem stalls or fragments. | The protocol does not depend on any single x402 implementation; any HTTP 402 endpoint that satisfies `PROTOCOL.md` § 4 works. |
| Publishers issue legal challenges over mirroring. | The Foundation only mirrors content for which a valid x402 purchase receipt exists or for which the source license explicitly permits redistribution. The canon record (`canon.json`) preserves the license string verbatim. |
| Founder dependency / bus factor of one. | The first formal governance task is recruiting two advisors / interim board members. The protocol and code are open such that any party can fork and continue without permission. |
| Conflict of interest with AGFarms LLC. | Documented in `GOVERNANCE.md` § 7 and `05-CONFLICT-OF-INTEREST-POLICY.md`. Recusal, disclosure, and arm's-length terms apply. |
| The operating wallet is compromised. | Wallet custody is transferred to the sponsor or to a multi-sig with the sponsor as a co-signer as soon as the sponsorship agreement is signed. |
| The Foundation cannot demonstrate impact in year one. | The Foundation operates on volunteer labor and minimal cash burn (see `03-BUDGET.md`). A quiet year one is acceptable; a dishonest year one is not. |

## H. What success looks like in 36 months

- A protocol spec that has at least three independent implementations.
- A reference bucket that has paid out non-trivial citation revenue (≥ $10,000 cumulative) to at least 25 authors.
- A board of at least three people, with formal bylaws and an annual financial audit.
- A clear decision on the long-term legal home: continue under the fiscal sponsor, file as a direct US 501(c)(3), or restructure under a non-US umbrella (Swiss Verein, Netherlands Stichting, or equivalent).
- The Foundation is no longer the largest bucket operator. Other buckets — academic, commercial, individual — exist and federate.

If three years from now the Foundation has succeeded in its mission, it will be visibly **less central** to the network than it is at founding. That is the goal. A foundation that grows its own indispensability is a foundation that has lost the plot.
