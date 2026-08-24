## ☐ FOUNDER TODO BEFORE SUBMIT

Required before you click submit. Each item is a real human task.

- [ ] **Pick the FY26-Q? Gitcoin round number** from https://gitcoin.co/program, replace "GG-round" header with the actual round name (e.g. GG23 OSS). Application windows are short (~2 weeks). (~5 min)
- [ ] **Create / verify the Gitcoin Passport** for the project owner address; passport score must clear the round threshold (>20). (~30 min)
- [ ] **Confirm Base mainnet payout wallet**, Gitcoin pays match in the round's chosen token (DAI/USDC) on the round's chosen chain. Confirm chain match with round config. (~10 min)
- [ ] **Connect the wallet to Gitcoin Builder** at https://builder.gitcoin.co and create the project profile (name, logo, banner, links). The draft below is the long-form application, but you also need a 1-line tagline + 280-char summary in the form. (~45 min)
- [ ] **Apply to the specific round**, the Builder profile is reusable, but each round needs a separate apply step with eligibility review. (~10 min, then 3-7 day review wait)
- [ ] **Banner + logo**, 1500x500 banner and 300x300 logo. Drop in `grants-targets/assets/gitcoin/`. (~30 min in Figma)
- [ ] **Confirm HCB receipt path for Gitcoin funds**, Gitcoin payouts are on-chain to a wallet; HCB needs to be able to receive that wallet's withdrawals as fiat or to custody the wallet directly. (~30 min HCB conversation)
- [ ] **Plan the donation drive**, quadratic funding rewards *number of contributors* over dollar amount. Lining up 50 small donors > 1 whale. Draft the X / email push for round-open day. (~2 hr)
- [ ] **Pick a contributor wallet for the canon-figures payout demo**, the "100 citation events" claim needs at least one real demo author wallet on file. (~1 hr)
- [ ] **Submit by** the round's published "applications close" date (check https://gitcoin.co/program for current round) at https://builder.gitcoin.co.

After this is clean, the draft below is ready to copy-paste / paste into the form.

---

# Gitcoin Grants, bucket.foundation
## OSS / Public Goods Round Application [[FOUNDER: replace with the specific round name from gitcoin.co/program]]

**Project name:** bucket.foundation
**Tagline:** Pay once. Cite forever. The patronage layer for the new Renaissance.
**Website:** https://bucket.foundation
**Repo:** https://github.com/gianyrox/bucket-foundation (MIT)
**Protocol:** https://github.com/gianyrox/bucket-foundation/blob/main/PROTOCOL.md (CC0-in-intent)
**Round target:** OSS / Public Goods (GG-round) [[FOUNDER: replace with exact round number + apply window from gitcoin.co/program]]
**Chain:** Base (Ethereum L2) [[FOUNDER: confirm round's payout chain matches, some Gitcoin rounds pay on Optimism / Arbitrum instead of Base]]

---

## What we're building

Bucket.foundation is an open protocol and reference implementation that lets any research paper be **paid for once and cited forever** by anyone, including AI agents. A "bucket" is a content-addressed folder, paper, sidecar JSON manifest, x402 payment receipt, that is durable, mirrorable, and federation-ready. Once a bucket exists, the marginal cost to cite the paper is zero, and each citation routes a fee directly to the original author's wallet on Base, bypassing publishers. The protocol is intentionally boring: HTTP 402, JSON, SHA-256, signatures. The novelty is the convention and the license. The whole system is MIT (code) + CC0-in-intent (spec). There is no token, no equity, no investor, and no exit.

The slogan order, in case you want the operating spirit in one breath, is: **build the past. Build history. Bucket is the new renaissance.** The first slogan is what canon work looks like (recovering foundations). The second is the verb (the contributor index, *who built what foundation*). The third is the thesis: AI plus foundations plus a small number of brilliant humans equals the next layer of reality, and the missing piece in 2026 is the patronage layer that routes value to the people who write the foundations. That's what bucket is.

## Why this is a public good

The current research-access economy charges authors to publish, charges readers to read, and pays nobody when a paper is cited, the act that makes a paper scientifically valuable in the first place. Open-access mandates, Sci-Hub, the editorial-board exoduses from Elsevier titles are all leading indicators that the existing rails are cracking. Bucket replaces them with an open protocol that any individual, lab, or institution can run, with no permission and no token gating. The Foundation operates **a** bucket, not **the** bucket, and considers itself successful when three other independent buckets exist running stronger canons under the same protocol. Federation over platform.

The work also directly attacks the empty-supply problem on x402: today, x402 has good middleware but few real data merchants. A canonical, citeable downstream like bucket gives data gateways a reason to expose x402 endpoints, which gives AI agents a reason to use the rail, which routes a real volume of micropayments through Base. Public goods all the way down.

## What's already shipped, with numbers

This is not vapor. As of May 2026:

- **Protocol spec** at draft v0.1 in `PROTOCOL.md` (CC0-in-intent), defining the sidecar schema, x402 fetch flow, and citation-receipt format.
- **Seven canon branches**: mathematics, physics, chemistry, information & computation, biophysics, cosmology, mind. The canon holds only foundations, axioms, real math, rules, laws, principles, primary derivations. Outcomes (longevity, disease, cognition) are downstream applications.
- **Contributor index** (`canon-figures/`), ~76 canon-tier figures across 10 branches in pass-1 seed; this is the mechanism by which citation fees route to identified human authors.
- **Live x402 supply side**, the open-source `x402-research-gateway` (MIT, same maintainer) operates 7 paid endpoints on Base Sepolia today across PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem, and a curated longevity corpus of **17,211 indexed rows**.
- **Zero-key agent proxy**, any LLM can query the canon at `bucket.foundation/api/research` without holding a wallet, getting back a feed402-compliant `{ data, citation, receipt }` envelope. Discovery manifests are live at `/.well-known/feed402.json` and `/.well-known/mcp.json`, and `/llms.txt` + `/llms-full.txt` give AI agents a documented entry point.
- **Story Protocol IP-NFT mint path** for canon-tier artifacts (shipped in a prior iteration of the site, now being revived as part of the open-source push). [[FOUNDER: revive on testnet before submit, OR soften this bullet, Gitcoin reviewers click links]]
- **Walrus** as the on-chain durable storage layer for the reference implementation.

## Roadmap: what your match would fund

Quadratic match received from this round goes directly into:

1. **Protocol v1.0**, promoting the spec from draft v0.1, adding a federation / mirroring section, and publishing a public conformance test-vector suite anyone can run.
2. **Base mainnet migration** of the reference bucket, with a security review of the buyer-wallet payment path.
3. **Federation pilot**, at least two independently operated buckets mirroring the canonical bucket on different storage backends (Walrus + IPFS or Arweave) to prove federation in production.
4. **Author payout demonstration**, process and publicly report at least 100 citation events with on-chain payouts to identified authors via wallets resolved through the contributor index and ORCID.
5. **Mirror subsidies** for independent bucket operators in developing regions, so no single jurisdiction is the network's single point of failure.

## How we measure impact

- Number of canon-tier buckets live (target: 1,000 across the seven branches in 12 months).
- Number of independent federated buckets operating under the same protocol (target: 3+).
- Citation events with on-chain author payouts (target: 100+ in the first reporting period).
- GitHub stars, issues, and external contributors to `bucket-foundation` and `PROTOCOL.md`.
- Real x402 volume routed through the system on Base.

All of these are publicly verifiable from the repo, the chain, and the transparency report.

## Team and governance

Sole maintainer at present: **Gianangelo Dichio** (`github.com/gianyrox`), also author of the x402-research-gateway and feed402. The Foundation is operated as a nonprofit, no token, no equity, no investor, no exit. As of this writing, the project is held in the maintainer's personal capacity pending formal 501(c)(3) reinstatement, with Hack Club Bank in process as interim fiscal sponsor; this is disclosed in `GOVERNANCE.md`. Gitcoin matching funds, if awarded, will be received via HCB [[FOUNDER: confirm HCB can custody / withdraw from a Base wallet, Gitcoin pays on-chain rather than ACH]] and used exclusively for the deliverables above. [[FOUNDER: provide the project payout wallet address (Base mainnet) in the Builder profile form]] The contributor index (`canon-figures/CONTRIBUTORS.md`) is the active recruitment surface for editorial and review collaborators across the seven branches.

## Why your contribution matters

Quadratic funding is the right shape of capital for this project because bucket's value compounds with the size of the contributor and mirror network. A thousand small contributions are a stronger signal, and a stronger underlying network, than one large grant. If you believe primary research should be paid for once and citeable forever, and that authors should get paid when their work is cited, contribute. We will build it in the open, MIT, on Base. No token. No exit.

Gianyrox@gmail.com [[FOUNDER: confirm Gianangelo's preferred citation form for the team section, match across all three grant drafts]] [[FOUNDER: line up 50+ small donors before round-open day, quadratic funding rewards contributor count over dollar size]]
