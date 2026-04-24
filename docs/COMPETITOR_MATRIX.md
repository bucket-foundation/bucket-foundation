# DeSci + Data-Market Competitor Matrix — bucket.foundation

**Author:** Revenue pillar (Nucleus)
**Date:** 2026-04-23
**Scope:** Every project that touches research, IP, data, or agent-paid content. Classified into competitors (overlap with per-citation payout) vs partners (adjacent primitives bucket can sit on top of).

## Headline finding

**Nobody is doing per-citation author payouts.** Molecule tokenizes IP one-time. VitaDAO funds upfront and takes IP equity. ResearchHub pays peer reviewers via bounties (one-time). Ocean sells dataset access (one-time per dataset). Vana pays data contributors when AI companies burn DLP tokens (one-time per purchase). Story Protocol has programmable royalty modules but needs someone to plug in a *per-query* trigger — nobody has. **Bucket's wedge (pay author forever on every agent query) is empty.** Confirmed by search: [Nature 2024 crypto-paid peer review](https://www.nature.com/articles/d41586-024-04027-4) is the closest analog and it's per-review, not per-citation. [ResearchCoin overview](https://coinmarketcap.com/currencies/researchcoin/) confirms bounty/peer-review model, not citation.

## Tier 1 — DeSci IP / publishing / research primitives

| Entity | What they do | Primitive | Traction (2025–26) | Chain | Token | Overlap w/ bucket | Partnership angle | Contact |
|---|---|---|---|---|---|---|---|---|
| **Molecule** (molecule.to, molecule.xyz) | IP-NFT marketplace for biotech; mints IPTs for DAO governance over IP | IP-NFT + IPT (governance, no auto-royalty) | Launched 2021, co-issued first IP-NFT w/ VitaDAO + Univ. Copenhagen; active 2026 ([Molecule docs](https://docs.molecule.xyz/ip-tokens/what-are-ipts)) | Ethereum + Base | BIO (parent) | Adjacent — Molecule mints the IP, bucket could route per-query citation $ to that same IP-NFT | **Top-3 partner.** Plug bucket's `cite.payout_wallet` into IP-NFT owner wallet. Every downstream agent query routes USDC to IP-NFT → holders. | Tyler Golato (founder, also VitaDAO); @moleculedao on X |
| **VitaDAO** (vitadao.com) | Longevity research funding DAO, first BioDAO | DAO-funded IP-NFTs | $55.8M treasury, 31 projects, 411% YoY growth, Pfizer Ventures backed ([VitaDAO newsletter Mar 2026](https://www.vitadao.com/blog/vitadao-longevity-newsletter-march-26)) | Ethereum | VITA | Adjacent — VitaDAO owns IP on longevity papers. Per-citation revenue = recurring income stream for the DAO treasury | **Top-3 partner.** Pilot: 10 VitaDAO-owned papers minted as bucket citation primitives. Revenue → VITA treasury. | Tyler Golato; @vita_dao on X; contact form on vitadao.com |
| **ResearchHub** (researchhub.com) | Open peer review + RSC bounties; Coinbase-backed | Bounty + token rewards for peer-review | RSC on Coinbase; Molecule BioAgents integration ([RSC on Base](https://basescan.org/token/0xFbB75A59193A3525a8825BeBe7D4b56899E2f7e1)); Brian Armstrong lock-up to 2026 | Base | RSC | **Adjacent**, not competitor. RSC pays reviewers; bucket pays authors per citation. Two layers of the same stack. | **Top-3 partner.** Bucket = post-publication citation rail; RSC = pre-publication review rail. Co-announce "full-stack science onchain on Base." | Brian Armstrong (Coinbase); @researchhub on X |
| **DeSci Labs / DeSci Nodes** (desci.com) | dPID persistent identifiers + Nodes publishing | dPID (persistent ID) + IPT | Capybara v1.0 release; dPID is free, persistent ([DeSci docs](https://docs.desci.com/create-and-publish/share/persistent-identifier-dpid)) | Multi | — | Adjacent — dPIDs identify work; bucket monetizes downstream citations | **Strong partner.** Every dPID gets a bucket payout address attached. | @DeSciLabs on X |
| **bio.xyz / BIO Protocol** (bio.xyz) | BioDAO accelerator; 8 BioDAOs | Accelerator + launch platform for biotech DAOs | Binance Labs backed Nov 2024; 7+ BioDAOs live; Biofy Commerce Dec 2025 ([bio.xyz blog](https://www.bio.xyz/blog-posts/binance-labs-invests-in-bio-protocol-to-accelerate-decentralized-science-desci-funding)) | Multi (Base + Solana + ETH) | BIO | Adjacent — every BioDAO generates research = candidate bucket inventory | **Tier-1 partner.** Pitch bucket as the default citation rail for ALL BIO-incubated DAOs. | @bioxyz on X |
| **AthenaDAO** (women's health) | BioDAO funding | BIO-incubated | Active, BIO portfolio | Ethereum | ATH | Adjacent — low volume | Bundle via bio.xyz | @AthenaDAO on X |
| **CryoDAO** (cryopreservation) | BioDAO funding | BIO-incubated | Active | Ethereum | — | Adjacent | Bundle via bio.xyz | @cryodao on X |
| **HairDAO** (hair loss research) | BioDAO, called "wayward" by PsyDAO for anti-DAO gov | BIO-incubated | Active | Ethereum | HAIR | Adjacent | Bundle via bio.xyz | @HairDAO_ on X |
| **PsyDAO** (psychedelics) | BioDAO | BIO-incubated; "decentralized collective advancing psychedelic science" ([psydao.io](https://www.psydao.io/)) | Active | Ethereum | PSY | Adjacent | Bundle via bio.xyz | @psy_dao on X |
| **ValleyDAO** (synthetic biology) | BioDAO, climate-focused | BIO-incubated ([valleydao.bio](https://www.valleydao.bio/)) | Active | Ethereum | VALLEY | Adjacent | Bundle via bio.xyz | @valley_dao on X |
| **CerebrumDAO** (neuroscience) | BioDAO ([cerebrumdao.com](https://www.cerebrumdao.com/)) | BIO-incubated | Active | Ethereum | NEURON | Adjacent — neuro papers = candidate canon (mind branch) | Bundle via bio.xyz, prioritize for Mind branch | @CerebrumDAO on X |
| **DeSci Publish / Scinapse** | Publishing primitives | Publication layer | Low signal in 2026 searches — **FLAG: possibly inactive** | — | — | Adjacent | Low priority | Unverified |
| **Knowledge.io / Welight** | Knowledge credentialing | Credential NFT | **FLAG: stale, no 2026 signal found** | — | — | Minimal | Skip | — |
| **PoSciDonDAO / AxonDAO** | Listed in prompt | — | **FLAG: zero 2026 search signal — likely inactive or defunct** | — | — | — | Skip | — |

## Tier 2 — Data marketplaces + oracle economies

| Entity | What they do | Primitive | Traction | Chain | Token | Overlap | Partnership angle | Contact |
|---|---|---|---|---|---|---|---|---|
| **Ocean Protocol** (oceanprotocol.com) | Datatoken-wrapped dataset marketplace + Compute-to-Data | Data NFT + datatoken | Withdrew from ASI Alliance Oct 2025 ([The Block](https://www.theblock.co/post/373977/ocean-protocol-withdraws-from-artificial-superintelligence-alliance)); still operating independently | Ethereum + multi | OCEAN | Dataset access ≠ citation; different transaction | Partner — Ocean sells datasets, bucket sells queries against published papers. Co-list on a "research data x402" announcement. | @oceanprotocol on X |
| **Vana** (vana.org) | Data DAOs (DLPs); user-owned data | VRC-20 token-per-DLP | 12M+ datapoints, Reddit DataDAO 140k users ([Vana posts](https://www.vana.org/posts/datadao-deepdive)) | Vana L1 (EVM) | VANA | Adjacent — Vana monetizes training data, bucket monetizes citations | Partner — a "research DataDAO" could feed bucket canon. | @vana on X |
| **Numerai / Erasure Bay** | Prediction market + data bounty marketplace ([medium/numerai](https://medium.com/numerai/introducing-erasurebay-7a5de91b78d2)) | Staked bounties | Mature protocol, narrow use case | Ethereum | NMR | Minimal | Skip | @numerai on X |
| **Grass** (grass.io) | Distributed internet bandwidth for AI data | Node rewards + airdrops | 8.5M users 2026, $10M 2025 bridge ([AdsPower guide](https://www.adspower.com/blog/grass-airdrop-guide)) | Solana | GRASS | Web-scraping-as-a-service, not citation | Skip (wrong side of stack) | @getgrass_io on X |
| **Bittensor subnets** (bittensor.com) | Incentivized decentralized AI subnets | Subnet emissions (TAO) | 128 active subnets; $1.5B ecosystem ([CoinDesk Mar 2026](https://www.coindesk.com/tech/2026/03/25/bittensor-ecosystem-tokens-value-hit-usd1-5-billion-as-jensen-huang-endorsement-supports-tao-rally)) | Bittensor | TAO + subnet tokens | **A research subnet COULD compete** if it paid for per-paper retrieval, but none currently do per-citation | Watch. Potential to launch "bucket subnet" later. | @opentensor on X |
| **Fetch.ai / ASI Alliance** | Agent economy + AI services | Agent marketplace | $ASI token merger Jun 2024; ASI-1 model 86.4% MMLU ([crypto.com uni](https://crypto.com/us/university/what-is-the-artificial-superintelligence-alliance)) | Fetch + ETH | ASI | Adjacent — agents need data; bucket sells data-citations | Partner — Fetch agents = bucket's buyers | @Fetch_ai on X |

## Tier 3 — Adjacent infrastructure (NOT competitors — partners)

| Entity | What | Traction | Bucket fit | Contact |
|---|---|---|---|---|
| **Story Protocol** (story.foundation) | Programmable IP + royalty modules | $136M raised (a16z, Polychain, Samsung); Global Wallet Apr 22 2026 ([press release](https://www.globenewswire.com/news-release/2026/04/22/3278888/0/en/IP-Strategy-Highlights-the-Story-Global-Wallet-Advancing-Access-to-Programmable-IP-Infrastructure.html)) | **Foundational — bucket already uses Story for IP-NFT minting.** Push to be featured ecosystem case study | @StoryProtocol |
| **Arweave / AO** (arweave.org) | Permanent storage + hyper-parallel compute | AO mainnet Feb 2025; PermawebOS Feb 2026 ([MEXC news](https://www.mexc.com/news/548714)) | **Storage backbone** — bucket is migrating Walrus → Arweave (see BLOCKCHAIN_LANDSCAPE.md §B) | @ArweaveEco |
| **Gitcoin / Optimism RetroPGF** | Public goods funding | 60M+ OP distributed; GG21 DeSci round $39k ([Gitcoin blog](https://www.gitcoin.co/blog/prediction-markets-meet-public-goods-a-new-approach-to-retropgf)) | **Nonprofit fit.** Apply to DeSci quadratic rounds. Free runway. | @gitcoin |
| **Farcaster Frames** | Social discovery rails | Active, but not research-specific | Distribution channel for bucket canon announcements | @farcaster_xyz |

## Summary — where bucket slots in

```
ResearchHub (peer review $)           ← Molecule/VitaDAO own IP-NFT  ← Story Protocol (programmable royalty)
        │                                        │                              │
        └────── paper published ─────────────────┴───── IP-NFT minted ──────────┘
                                                         │
                                                         ▼
                                            ┌──────── BUCKET ────────┐
                                            │ cite.payout_wallet     │  ← per-query USDC on Base
                                            │ license: cite-forever  │  ← via x402 / feed402
                                            └────────────────────────┘
                                                         │
                                            ▼ storage: Arweave (permanent)
                                            ▼ discovery: Farcaster / Gitcoin
                                            ▼ buyers: Fetch/ASI agents
```

Bucket is a **vertical layer** (the citation-payout primitive) running across the entire DeSci + agent-economy stack. That's why the pitch to all of them is the same: **"You already do X. Bucket adds per-query payouts on top. Your authors/DAO earn forever, not just at mint."**

## Competitor red-flag scan (anyone doing per-citation payouts?)

Searched: `"per citation" OR "per query" author payout crypto research 2025 2026`.
Result: **zero hits** for per-citation author payouts. Closest was [Nature 2024 article](https://www.nature.com/articles/d41586-024-04027-4) on crypto-paid peer review (one-time, not recurring citations). **Wedge confirmed empty.**
