# Partnership Pitches — bucket.foundation x Top 5 DeSci Candidates

**Author:** Revenue pillar (Nucleus)
**Date:** 2026-04-23
**Selection criteria:** overlap in stack, complementary (not competing) primitive, live & funded in 2026, reachable founders.

Ranked: Molecule → bio.xyz → VitaDAO → ResearchHub → Story Protocol.

---

## 1. Molecule (molecule.to) — top priority

### Their pain
Molecule mints IP-NFTs and IPTs that represent biotech IP ownership, but **revenue to IP-NFT holders is episodic** — it comes from milestone licensing deals or IPT secondary sales. There is no recurring per-use revenue stream. ([Molecule IPT docs](https://docs.molecule.xyz/ip-tokens/what-are-ipts) explicitly state IPTs do NOT automatically convey economic rights.) This is the single biggest criticism of the IP-NFT model from crypto-skeptics and from the bio-IP community: "great, you minted an NFT, now what?"

### What bucket gives them
A continuous, on-chain, agent-driven revenue stream attached to every Molecule IP-NFT. Every time an AI agent cites an underlying paper, USDC flows to the IP-NFT's owner wallet — which is the DAO / IPT holders. IPT becomes economically backed, not just governance.

### Integration sketch
1. Molecule IP-NFT `tokenURI` → bucket adds `cite.payout_wallet` = IP-NFT contract (or DAO treasury).
2. Bucket's feed402 gateway routes `$0.005–$0.05` per citation call on Base to that wallet.
3. Attestation via Story Protocol (already in Molecule stack).
4. IPT holders now see a streaming revenue chart on their dashboard, not just a governance badge.
5. Molecule adds a "Citation Revenue" tab next to "Funding" on every IP-NFT page.

### The ask
**Pilot: 10 IP-NFTs get bucket-wrapped.** We supply the endpoint, the license template, the feed402 config. They supply the IP-NFTs and a tweet. 90-day pilot; bucket takes 0% during pilot, 2% protocol fee after (nonprofit). Success metric: ≥ $100 in citation revenue per pilot IP-NFT in 90 days.

### Contact
- **Tyler Golato**, co-founder ([LinkedIn](https://www.linkedin.com/company/vitadao) via VitaDAO; he co-founded both)
- X: **@moleculedao**, **@tygolato**
- Discord: Molecule server (public invite on molecule.to)
- Email: via contact form on molecule.to

---

## 2. bio.xyz / BIO Protocol — highest leverage

### Their pain
BIO Protocol runs 8 BioDAOs. Each BioDAO spends months raising, minting, and launching. Post-launch, DAOs need **ongoing revenue to sustain treasuries** beyond initial fundraise. Biofy Commerce (Dec 2025 consumer-product platform) is their answer for physical products but does nothing for the actual research IP. Binance-Labs-backed = KPI pressure on ecosystem GMV.

### What bucket gives them
**One integration = recurring revenue for ALL 8 BioDAOs simultaneously.** Every paper funded by AthenaDAO, CryoDAO, CerebrumDAO, HairDAO, PsyDAO, ValleyDAO, VitaDAO gets a bucket citation wallet. Agents paying for citations → DAO treasuries. BIO Protocol can point to "recurring onchain research revenue" as a flagship metric.

### Integration sketch
1. BIO Protocol publishes a "bucket-enabled" standard schema.
2. Every new BIO-incubated DAO gets a bucket payout wallet auto-provisioned at mint.
3. Retroactive: existing BioDAO papers added in batch.
4. Revenue routes to individual DAO treasuries, not BIO Protocol itself (optics: "we empower our DAOs").
5. Dashboard integration on bio.xyz.

### The ask
**Blog post co-authorship + 2026 cohort includes bucket integration by default.** Bucket presents at next BIO Protocol BioDAO cohort onboarding. No token deal, no equity — this is nonprofit + accelerator symbiosis.

### Contact
- X: **@bioxyz**
- Discord: BIO Protocol public (link on bio.xyz)
- Team listed at [bio.xyz](https://www.bio.xyz/) — use their contact form
- **Warm path:** Tyler Golato is the bridge (VitaDAO is a BIO DAO; Molecule is close to BIO)

---

## 3. VitaDAO — fastest pilot

### Their pain
VitaDAO holds **$38M in IP assets** ([March 2026 newsletter](https://www.vitadao.com/blog/vitadao-longevity-newsletter-march-26)) but realizing that IP into treasury cashflow requires multi-year clinical trials. Treasury diversification is a real DAO governance concern. Longevity papers are heavily cited in the agent era.

### What bucket gives them
A **second revenue line** on VitaDAO-owned longevity IP. Aubrey de Grey-era classics, spermidine studies, GPX4 modulator papers — all get per-citation payouts. Zero clinical-trial risk, zero new science needed, just a wallet address.

### Integration sketch
1. VitaDAO selects 10–50 IP-NFTs from their portfolio.
2. Bucket attaches `cite.payout_wallet` = VITA treasury.
3. Launch aligned with VD-001 spermidine consumer campaign for cross-promotion.
4. Publish citation-revenue dashboard on vitadao.com.
5. If it works, scale to full 31-project portfolio.

### The ask
**A 30-day pilot with 10 papers.** Public announcement, revenue reported transparently. If citation revenue > $1k/mo in pilot, scale. Also: VitaDAO listed as **"first canon-tier DAO partner"** in Bucket's governance doc — optics for both sides (nonprofit's first institutional partner, DAO's most innovative integration).

### Contact
- **Tyler Golato**, founder ([LinkedIn](https://www.linkedin.com/company/vitadao))
- X: **@vita_dao**
- Website contact form: vitadao.com
- Discord: VitaDAO public (very active)

---

## 4. ResearchHub — same-chain same-audience

### Their pain
ResearchHub pays $150-in-RSC for peer reviews ([Nature 2024](https://www.nature.com/articles/d41586-024-04027-4), [RSC on Base](https://basescan.org/token/0xFbB75A59193A3525a8825BeBe7D4b56899E2f7e1)), but once a paper is reviewed and posted, the **author has no downstream revenue**. Coinbase's Brian Armstrong locked up his RSC until 2026 = signal that post-2026 ResearchHub is looking for real utility, not just price appreciation. RSC on Base = same rail as bucket.

### What bucket gives them
**The missing post-publication economic layer.** ResearchHub pays reviewers up-front (review bounty). Bucket pays authors forever (citation rail). Same author, same paper, two revenue streams, both on Base. ResearchHub's authors become bucket's first supply.

### Integration sketch
1. Every ResearchHub paper gets an optional "Attach bucket citation wallet" button.
2. Author signs with Dynamic (same web3 auth bucket uses).
3. Citations paid in USDC (not RSC) — avoids RSC price risk for authors.
4. ResearchHub takes 0% or earns RSC reward for each bucket-enabled paper.
5. Co-marketing: "Full-stack science on Base: ResearchHub reviews + bucket citations."

### The ask
**UI integration + co-announcement post.** A button on every ResearchHub paper page. Armstrong tweet. Target: 500 papers bucket-enabled in 6 months.

### Contact
- **Brian Armstrong** (Coinbase CEO, ResearchHub co-founder) — @brian_armstrong on X (huge follower count, DMs likely closed)
- **ResearchHub Foundation** — @researchhub on X, more reachable
- Warm path: **Coinbase Base ecosystem team** — bucket is already on Base, this is exactly what Base ecosystem devrel wants to showcase

---

## 5. Story Protocol — the storyteller

### Their pain
Story Protocol has $136M in funding and a programmable royalty module, but most ecosystem case studies are **entertainment IP** (anime, music). DeSci is a missing vertical in their narrative. Their own data shows low on-chain revenue (~$2/day at mainnet launch per [Decrypt](https://decrypt.co/305730/story-protocol-debuts-mainnet-with-1-billion-ip-tokens-to-claim), though 2026 may be higher). They need a killer **non-entertainment** use case.

### What bucket gives them
A clean, sympathetic, nonprofit-aligned DeSci flagship: "Story Protocol is the IP layer under the world's first recurring-royalty research citation rail." Bucket is already using Story for IP-NFT minting. Formalize it as a case study.

### Integration sketch
1. Bucket publishes "Built on Story" badge on every IP-NFT.
2. Story Protocol features bucket in ecosystem showcase / blog.
3. Story's Royalty Module configured to auto-split on every bucket citation (even split: author, nonprofit fund, Story Protocol royalty).
4. Joint technical post: "Programmable IP meets x402 citation."
5. Apply to Story ecosystem grants if available.

### The ask
**Grant or co-marketing.** $25k–$100k ecosystem grant OR a featured blog post + ecosystem page inclusion. Or both. Bucket commits to remaining on Story mainnet for all canon-tier mints.

### Contact
- X: **@StoryProtocol**
- Founder: **Jason Zhao** (@jasonzzzhao)
- Story Foundation contact form: story.foundation
- **Warm path:** a16z crypto portfolio network (Chris Dixon's crew)

---

## Priority order for outreach this week

1. **VitaDAO** — warmest, most aligned mission, fastest pilot
2. **Molecule** — same founder as VitaDAO, so #1 is the door-opener for #2
3. **bio.xyz** — force-multiplier (8 DAOs via one deal)
4. **ResearchHub** — same chain, same audience, hardest contact (Armstrong)
5. **Story Protocol** — grant play, longer sales cycle
