## ☐ FOUNDER TODO BEFORE SUBMIT

Required before you click submit. Each item is a real human task — not a writer task.

- [ ] **Submit through the actual ESP form** at https://esp.ethereum.foundation/applicants — there is no email intake. Copy this draft into the form's free-text fields. (~30 min)
- [ ] **Pick the exact ask** inside $30K–$300K and replace the range. The ESP form has a single number field. Recommend $200K target, $50K floor for M1-only scope. (~5 min)
- [ ] **Name the smart-contract / wallet-path audit vendor** for the M2 mainnet migration line item — OpenZeppelin / Trail of Bits / Spearbit / Cantina. ESP reviewers ask. (~30 min — actually email two of them for a quote)
- [ ] **Confirm Base mainnet wallet address** for grant disbursement (USDC on Base). ESP pays in fiat or crypto; pick one. (~10 min)
- [ ] **Decide HCB-vs-direct disbursement** and state preference (do not offer both). (~5 min)
- [ ] **Verify the M2 target (1,000 buckets in 4 months)** is actually shippable given current canon-intake throughput — if not, drop to 250 and revise §4. (~20 min reality check)
- [ ] **Confirm Story Protocol IP-NFT mint path is functional on testnet today** — the draft says "shipped in a prior iteration … being revived." ESP will probe this. Either revive it before submit or soften the claim. (~2 hr OR a doc edit)
- [ ] **Get one letter of support** from a known x402 / Base ecosystem contact (Coinbase Developer Platform, x402 maintainers, a known data provider). Massive lift on ESP scoring. (~3 days lead time — start now)
- [ ] **Pick a submit window** — ESP has rolling intake but reviewers batch monthly. Aim for the 1st of the month.
- [ ] **Submit by** end of FY26-Q2 at https://esp.ethereum.foundation/applicants — keep the confirmation email; ESP responds in 4–6 weeks.

After this is clean, the draft below is ready to copy-paste / paste into the form.

---

# Ethereum Foundation — Ecosystem Support Program Application
## bucket.foundation — A Citation-Payment Public Good on Base

**Submitted to:** esp.ethereum.foundation [[FOUNDER: this is a web form at https://esp.ethereum.foundation/applicants, not an email — paste sections into the form fields]]
**Date:** 2026-05-04
**Applicant:** Gianangelo Dichio (individual, on behalf of bucket.foundation)
**Amount requested:** $30,000 – $300,000 USD-equivalent [[FOUNDER: pick a single number — ESP form has one field; recommend $200K target ask]]
**License:** MIT (code) + CC0-in-intent (protocol spec)
**Repo:** https://github.com/gianyrox/bucket-foundation

---

## 1. Project description

bucket.foundation is an open protocol and reference implementation that turns HTTP 402 — `Payment Required`, the long-dormant status code that x402 has finally made operational — into the patronage layer for primary scientific research. A "bucket" is a content-addressed folder containing a research artifact, a JSON sidecar manifest with provenance and citation metadata, and an x402 payment receipt. Once a bucket exists, the underlying paper is **citeable forever** at zero marginal payment cost, and each citation routes a fee directly to the original author's wallet on Base — bypassing the publisher rent layer entirely. The protocol is deliberately boring: HTTP, JSON, SHA-256, signatures. The novelty is the *convention* and the *license*, not any single primitive.

We are applying to ESP because bucket.foundation is the kind of public-goods infrastructure on Ethereum that ESP exists to fund: open-source, no token, no equity, no exit, MIT-licensed code, CC0-in-intent spec, and a clearly identified public good (citeable primary research) that the broader Ethereum ecosystem benefits from but no single actor has the incentive to build alone. The work runs on Base (an Ethereum L2) because x402 settlement on Base is the only credibly cheap and durable payment rail for per-citation micropayments at the price points (sub-$0.01 to $0.25) that primary research economics require.

## 2. Why this matters to the Ethereum ecosystem

x402 has, as of late 2025, complete client-side and middleware tooling, but the supply side is empty: there are almost no real data providers selling against the rail, and therefore almost no real demand. Bucket attacks the supply problem head-on by giving research-data providers — gateways like the open-source `x402-research-gateway` we already operate (PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem, and a curated longevity corpus of 17,211 indexed rows) — a canonical, federation-ready downstream consumer that turns a one-time x402 purchase into a durable, citeable, royalty-bearing artifact. The integration with Story Protocol IP NFTs (already shipped in a prior iteration of the reference site) means that canon-tier artifacts mint as on-chain IP with programmatic license terms, again on EVM rails. The result, if successful, is a measurable and replicable pattern: more x402 supply, more agent-side demand, a real volume of micropayments routed through Base, and a credible public-goods showcase the EF and the broader Base ecosystem can point to.

## 3. Team

- **Gianangelo Dichio** — founding maintainer; sole author of bucket.foundation, the x402-research-gateway (7 live paid endpoints on Base Sepolia, MIT), and feed402 (an open-source, MIT code + CC0 spec for x402 data discovery). Decade of full-stack/infra experience; currently operates AGFarms, a 16-venture studio with a working K3s production environment.
- **Open contributor pool.** The contributor index (`canon-figures/`) seeds a pass-1 list of ~76 canon-tier figures across ten branches whose foundations the canon is built on; outreach for editorial and review collaboration is part of the funded work. [[FOUNDER: if any canon-tier figure has agreed to be named as advisor, list them here — ESP weights named advisors heavily]]

## 4. Concrete deliverables and milestones

We propose four milestones over 9 months. ESP funds release on milestone completion against a public commit history.

**M1 — Protocol v1.0 (months 0–2).** Promote `PROTOCOL.md` from draft v0.1 to v1.0. Add a federation / mirroring section. Publish a public test-vector suite (canon.json schema, x402 fetch flow, citation receipt) and a conformance harness any implementer can run against their bucket. Open-source under MIT.

**M2 — Reference bucket hardened on Base mainnet (months 1–4).** Migrate the reference implementation from Base Sepolia to Base mainnet. Onboard the Story Protocol IP-NFT mint path for canon-tier artifacts. Operate a publicly available, zero-key, budget-capped agent proxy at `bucket.foundation/api/research` returning the feed402-compliant `{ data, citation, receipt }` envelope. Target: 1,000 canon-tier buckets [[FOUNDER: reality-check 1,000 in 4 months against current canon-intake throughput; if marginal, drop to 250 + commit to 1,000 by end of grant]] across the seven foundation branches (mathematics, physics, chemistry, information & computation, biophysics, cosmology, mind) live and citeable.

**M3 — Federation pilot (months 4–7).** Stand up at least two independently operated bucket instances mirroring the canonical bucket (one on Walrus, one on a different storage backend — IPFS, Arweave, or S3) to prove the protocol's federation and idempotency claims under live operation. Publish a federation playbook so any third party can run their own bucket without any permission from the Foundation.

**M4 — Author payout demonstration and post-mortem (months 7–9).** Process and publicly report at least 100 distinct citation events with on-chain payouts to identified authors via wallets resolved through the contributor index and ORCID. Publish a transparency report covering volume, fee distribution, and any operational issues. Open-source the payout reconciler.

Each milestone ships to a public commit; ESP can verify deliverables without trusting us.

## 5. Budget (indicative)

| Category | Amount | Notes |
|---|---|---|
| Maintainer time (9 months, 0.5 FTE) | $90,000 | Protocol v1.0, federation pilot, code |
| Editorial + canon review | $30,000 | Curation across the seven branches |
| Infrastructure (Walrus storage, Base gas, Hetzner hosting, RPC) | $25,000 | 9 months of runway including federation pilot |
| Mirror subsidies (independent operators) | $20,000 | Two federated buckets, bandwidth + storage |
| Audit / security review of the buyer wallet path | $15,000 | Required for mainnet migration [[FOUNDER: name the audit vendor — OpenZeppelin / Trail of Bits / Spearbit / Cantina — and get a real quote before submit; $15K is on the low end]] |
| Documentation, conformance harness, transparency report | $10,000 | M1 + M4 deliverables |
| Contingency | $10,000 | |
| **Total (target ask)** | **$200,000** | Range $30K–$300K acceptable; scope adjusts proportionally |

We are willing to scope to any subset of the milestones at any award size in the $30K–$300K range. M1 alone (Protocol v1.0 + conformance harness + Base mainnet hardening) is feasible at the low end.

## 6. Open-source guarantee

All code produced under this grant will be MIT-licensed in `github.com/gianyrox/bucket-foundation` (or its post-transfer successor at `github.com/AGFarms/bucket-foundation` once the nonprofit transfer is complete). The protocol spec is CC0-in-intent. There is no token, no equity, no investor, no exit. The Foundation is structurally non-extractive — see `GOVERNANCE.md` and `MANIFESTO.md` in the repo for the operating constraints.

## 7. Conflict of interest disclosure

bucket.foundation is currently held in the applicant's personal capacity (`gianyrox/bucket-foundation`) pending formal 501(c)(3) reinstatement, with Hack Club Bank in process as interim fiscal sponsor. This is disclosed in `GOVERNANCE.md`. The applicant also operates AGFarms, a venture studio, but bucket is explicitly not an AGFarms-owned asset — it is managed, not owned, by the AGFarms workflow, and will transfer to the nonprofit legal entity on reinstatement. ESP funds, if awarded, would be received via HCB or directly to the nonprofit upon determination, at the EF's preference. [[FOUNDER: pick one before submit — offering both signals indecision; default to HCB and provide ACH/wire details on request]] [[FOUNDER: confirm Base mainnet wallet address if ESP elects USDC-on-Base disbursement]]

## 8. Why ESP, why now

ESP funds public-goods infrastructure. bucket is exactly that: a non-extractive, MIT-licensed, no-token, no-exit project that uses Ethereum and Base as the substrate to fix a real economic failure in the global research economy. The window to ship the substrate before any one party — a frontier lab, a publisher consortium, a national government — captures the rails is open right now. We would be grateful for ESP's support to build it in the open, on Ethereum, where it belongs.

— Gianangelo Dichio [[FOUNDER: confirm preferred citation form — match across all three grant drafts]], gianyrox@gmail.com, github.com/gianyrox [[FOUNDER: attach 1+ letter of support from a known x402 / Base / Coinbase Developer Platform contact — single highest-leverage scoring lever on ESP]]
