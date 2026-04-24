# bucket.foundation — Launch Posts

**Date drafted:** 2026-04-24
**Status:** Pre-1.0. Rail live, corpus thin, wallet unfunded, 501(c)(3) reinstatement pending.
**Primary link:** https://www.bucket.foundation/
**Repo:** https://github.com/bucket-foundation/bucket-foundation
**Style:** declarative. No hype. No rockets. Honest about what is and isn't built.

---

## 1. Show HN — Hacker News

**Title** (72 chars):
`Show HN: Bucket – a nonprofit citation rail that pays authors per AI query`

**Body** (~110 words):
Bucket is a reference implementation of an open protocol (feed402, CC0-in-intent) for paid, citeable research endpoints. One sentence: free to read, paid to cite. $0.005 per insight query on Base (USDC, x402). Citation fees route to the original author's wallet, not a publisher.

Pre-1.0. The rail works, the corpus is thin, the operating wallet is donation-funded and capped at $1/day across all callers. 501(c)(3) reinstatement is pending.

Code is MIT. Spec is CC0-in-intent. MCP server published at `@bucket-foundation/mcp` so any Claude Code or Claude Desktop user can wire it in.

Try it with your own Anthropic key: https://www.bucket.foundation/learn
Spec and envelope shape: https://www.bucket.foundation/protocol/envelope
Repo: https://github.com/bucket-foundation/bucket-foundation

Happy to take the comment section apart.

---

## 2. Product Hunt

**Tagline** (56 chars):
`Free to read, paid to cite — nonprofit research rail`

**Description** (258 chars):
Bucket is an open, nonprofit citation rail for primary research. Every AI query pays the author — not the publisher — $0.005 in USDC on Base. MIT code, CC0-in-intent spec, MCP server on npm. Pay-once per paper, cite-forever. Built for agents and the humans behind them.

**Gallery captions:**
1. "The envelope shape — every paid response carries its own citation, receipt, and cite-forever license."
2. "Seven canon branches. Foundations only — axioms, laws, primary derivations. Outcomes live downstream."
3. "Try it with your own Anthropic key. Zero-wallet proxy, $1/day shared budget, no signup."

**Founder comment** (2 sentences):
This exists because the gated-journal model is structurally extractive — authors pay to publish, readers pay to read, publishers keep the citation. We are pre-1.0 and the corpus is small on purpose; the point of launching now is to get the protocol and the envelope shape torn apart in public before more buckets ship.

---

## 3. Reddit

### r/DeSci

**Title:** `Bucket: a nonprofit citation rail — $0.005/query routes to author forever, not publisher`

**Body** (~195 words):
TL;DR: pay-once per paper, cite-forever, author gets the citation fee. MIT code, CC0-in-intent spec, nonprofit.

Bucket is a reference implementation of feed402, an open protocol for paid, citeable research endpoints on x402/Base. It's live at bucket.foundation.

How it differs from the neighborhood:

- **Molecule / bio.xyz / VitaDAO** — mint IP-NFTs and IPTs. Great primitives, but revenue to holders is episodic (milestone deals, IPT secondary). Bucket is orthogonal: a **recurring per-citation payout rail** that can wrap any IP-NFT. We'd happily bucket-wrap 10 Molecule IP-NFTs as a pilot.
- **ResearchHub** — pays reviewers up-front in RSC. Bucket pays authors forever in USDC. Same chain (Base), complementary layer.
- **Story Protocol** — IP registry. We mint canon IP-NFTs on Story; the citation rail sits above it.

The wedge: **per-citation recurring payout with a machine-checkable `cite-forever` license embedded in every response envelope.** "Cite the envelope" — the envelope itself is the citation unit.

Pre-1.0 honesty: rail works, corpus is thin, wallet is donation-funded and capped at $1/day across all callers, 501(c)(3) reinstatement pending.

Protocol + envelope: https://www.bucket.foundation/protocol/envelope
Repo: https://github.com/bucket-foundation/bucket-foundation

Happy to argue about canon scope and the 7-branch thesis in the comments.

---

### r/opensource

**Title:** `Bucket — nonprofit citation rail: MIT code, CC0-in-intent spec, MCP on npm`

**Body** (~148 words):
TL;DR: open protocol for paid, citeable research endpoints. Nonprofit (501(c)(3) reinstatement pending). Free to read, paid to cite.

- **Code:** MIT — https://github.com/bucket-foundation/bucket-foundation
- **Protocol spec (`PROTOCOL.md`):** CC0-in-intent — nobody owns it, no permission needed to run a bucket
- **Governance (`GOVERNANCE.md`):** no equity, no token, no exit; ≥80% of net citation fees to authors, ≤20% to operations, capped reserves, annual audit
- **MCP server:** `@bucket-foundation/mcp` on npm — wire it into Claude Code or Claude Desktop and your agent can cite primary research directly
- **License layer:** `bucket.foundation/cite-forever/v0.1` machine-checkable license embedded in every paid response

The Foundation's stated success condition: in three years, be *less* central to the network than today. Goal is to spawn the network, not be the network.

Protocol: https://www.bucket.foundation/protocol/envelope

---

### r/webdev

**Title:** `Next.js 14 + Base + x402 + MCP on npm — nonprofit citation rail, stack writeup`

**Body** (~175 words):
TL;DR: built a nonprofit "pay authors per AI citation" rail. Shipping the stack notes.

**Stack:**
- Next.js 14 App Router on Vercel
- Base L2 + USDC, viem for signing, x402 middleware for HTTP 402 handshakes
- EAS (Ethereum Attestation Service) for citation receipts
- Story Protocol SDK for canon IP-NFT minting
- Walrus for on-chain storage, Supabase for off-chain metadata
- Dynamic for web3 auth
- MCP server published at `@bucket-foundation/mcp` on npm — exposes the protocol to any MCP client

**One-liner to wire it into Claude Code:**

```
claude mcp add --scope user bucket-foundation -- npx -y @bucket-foundation/mcp
```

After restart your agent can query canon research; each insight call is $0.005 USDC on Base, citation routes to the author's wallet.

There's a `/learn` page where you bring your own Anthropic key and try it without a wallet — we run a public zero-wallet proxy (Base Sepolia, $1/day shared budget).

Code (MIT): https://github.com/bucket-foundation/bucket-foundation
Try it: https://www.bucket.foundation/learn

---

## 4. X / Twitter thread (8 tweets)

**1/** (the hook)
Free to read. Paid to cite. Citation fees route to the author's wallet — forever — not the publisher.
bucket.foundation is live.

**2/**
The gated-journal model is structurally extractive. Authors pay to publish. Readers pay to read. Publishers own the citation and collect rent on work they didn't create. Sci-Hub is a symptom; the model is the disease.

**3/**
Bucket inverts it. A bucket is a content-addressed folder with a paper and a sidecar manifest. $0.005 per insight query on Base (USDC, x402). The author's wallet is the payout wallet. Pay-once per paper, cite-forever.

**4/**
Every paid response ships the same envelope:
{ data, citation, receipt, cite: { price, payout_wallet, license } }
"Cite the envelope." The envelope itself is the citation unit. Machine-checkable, auditable on-chain.

**5/**
The cite-forever license (v0.1) is the whole legal move: read for free, pay per citation, fees route to the author for as long as the paper is cited. No publisher in the middle. It's a protocol, not a platform.

**6/**
Canon: seven branches — mathematics, physics, chemistry, information & computation, biophysics, cosmology, mind. Foundations only. Axioms, laws, primary derivations. Outcomes (longevity, disease, cognition) are downstream applications. The canon is small on purpose.

**7/**
Bucket is a nonprofit (501(c)(3) reinstatement pending). MIT code. CC0-in-intent spec. No token. No equity. No exit. If, in three years, three other buckets hold equal canons under the same protocol, bucket.foundation has succeeded.

**8/**
Try it with your own Anthropic key — zero wallet, shared $1/day budget:
https://www.bucket.foundation/learn
Spec + envelope: https://www.bucket.foundation/protocol/envelope
Repo: https://github.com/bucket-foundation/bucket-foundation

---

## 5. Lobsters

**Title:** `Bucket – a nonprofit citation rail over x402, free to read, paid to cite`
**Tags:** `web`, `distributed`, `show`

**Body** (~100 words):
Open protocol + reference implementation for paid, citeable research endpoints. HTTP 402 over Base (USDC), $0.005 per insight query, citation fee routes to the author's wallet — not the publisher — under a machine-checkable `cite-forever` license. Content-addressed buckets, SHA-256 addressing, federation by mirror. Stack: Next.js 14, viem, x402 middleware, EAS, Story Protocol, Walrus, Supabase, Dynamic. MCP server at `@bucket-foundation/mcp` on npm. MIT code, CC0-in-intent spec, nonprofit (501(c)(3) reinstatement pending). Pre-1.0: rail works, corpus is thin, operating wallet capped at $1/day across all callers.

Spec: https://www.bucket.foundation/protocol/envelope
Repo: https://github.com/bucket-foundation/bucket-foundation

---

## 6. DEV.to — long-form skeleton

**Title:** `Building a nonprofit citation rail on x402: free to read, paid to cite`

**Intro (3 sentences):**
Primary research lives behind paywalls where neither the reader nor the author sees a cent of the rent. We built bucket.foundation, an open protocol and reference implementation for a different arrangement: pay once per paper, cite it forever, fees route to the author's wallet on Base. This post is a walk through the stack, the envelope shape, the cite-forever license, and what's still broken at pre-1.0.

**Headers:**
1. **Why not just fix the journals** — the structural problem with publisher-owned citations, and why routing around > reforming
2. **The envelope shape** — what every paid response looks like, why the envelope *is* the citation unit, and how a machine verifies it
3. **The x402 fetch flow** — HTTP 402, Base L2, viem signing, and why this was theoretical until 2025
4. **The cite-forever license (v0.1)** — how a license can be machine-checkable, and what happens when one isn't honored
5. **MCP on npm + the zero-wallet proxy** — how any agent on Claude Code can cite primary research in one shell command, and how `/learn` lets humans try it with their own Anthropic key and no wallet

**CTA:**
Try it: https://www.bucket.foundation/learn · Read the spec: https://www.bucket.foundation/protocol/envelope · Star or fork the repo: https://github.com/bucket-foundation/bucket-foundation · Run your own bucket — the protocol is CC0-in-intent and no bucket is authoritative.
