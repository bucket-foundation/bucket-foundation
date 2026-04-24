# Blockchain Landscape Memo — bucket.foundation Citation Rail

**Author:** Product pillar (Nucleus)
**Date:** 2026-04-23
**Status:** Decision-ready, for founder review
**Scope:** Chains & protocols for payments, IP registry, storage, attestations — next 6 months.

---

## 1. Executive Verdict (5 bullets)

1. **Keep Base as the primary transact chain, add Solana as a second rail within 6 months.** Base is where x402 was born and still holds ~85% of all x402 volume ([x402 foundation via Cloudflare, 2026](https://blog.cloudflare.com/x402/)), but Solana joined the Linux Foundation x402 Foundation in April 2026 and already handles ~65% of *new* x402 TPS at ~$0.00025/tx — which matters for $0.002 insight-tier calls ([Solana x402 announcement, 2026-04-02](https://www.banklesstimes.com/articles/2026/04/02/solana-foundation-enters-linux-foundations-x402-initiative-for-web-native-payments/), [Solana x402 docs](https://solana.com/x402)). Multi-chain x402 is table stakes now; single-chain lock-in is a deprecated bet.
2. **Keep Story Protocol for IP NFT minting, but treat it as thin — back every mint with an EAS attestation + an Arweave hash.** Story shipped mainnet + Jan 2026 hard fork but is doing ~$2/day in revenue ([Decrypt, Story mainnet](https://decrypt.co/305730/story-protocol-debuts-mainnet-with-1-billion-ip-tokens-to-claim), [CMC Story news, 2026](https://coinmarketcap.com/cmc-ai/story-protocol/latest-updates/)). It gives us the programmable-IP narrative; EAS + Arweave give us the receipts if Story dies.
3. **Migrate canon artifacts from Walrus to Arweave (or Irys) over 6 months.** Walrus max duration is ~2 years, priced in WAL ([Walrus storage costs](https://docs.wal.app/docs/system-overview/storage-costs)). "Citeable forever" is incompatible with a 2-year lease. Arweave is ~$3,500/TB pay-once-store-forever ([CoinMarketCap: Filecoin vs Arweave](https://coinmarketcap.com/academy/article/the-decentralized-storage-war-filecoin-vs-arweave)); Irys claims 20x cheaper with the same permanence model ([MEXC on Irys](https://blog.mexc.com/news/irys-network-the-programmable-datachain-challenging-arweave-with-100k-tps-and-20x-cheaper-storage/)). Keep Walrus as a hot cache.
4. **Do NOT build our own chain.** The cost-to-value ratio on an OP Stack or Orbit rollup is punitive for a citation rail (see §5). Base already *is* our rollup. Our moat is the envelope + payout contract + canon curation, not a custom VM.
5. **The real competition is DeSci (Molecule, VitaDAO, ResearchHub) and data markets (Ocean, Vana) — not Coinbase or Story.** Bucket is differentiated by being a *citation* rail (payouts to authors per query) rather than an IP-licensing DAO (Molecule) or a dataset marketplace (Ocean). Lean into that wedge; don't recreate RSC or OCEAN tokenomics.

---

## 2. Comparison Matrices

### A) Chains to transact on (x402 payments + citation payouts)

| Chain | Native tx cost | USDC | x402 status | Verdict |
|---|---|---|---|---|
| **Base** | <$0.01, paymaster lets users pay gas in USDC ([Circle Paymaster](https://www.circle.com/blog/introducing-circle-paymaster)) | Native, fee-free via CDP facilitator | 85% of all x402 txns ([Cloudflare](https://blog.cloudflare.com/x402/)) | **Keep. Primary rail.** |
| **Solana** | ~$0.00025, 400ms finality | Native USDC | Official x402 support, ~65% of new volume, LF member 2026 ([Solana x402](https://solana.com/x402)) | **Add as second rail.** Micropayment economics are unbeatable. |
| **Arbitrum** | $0.03–$0.30 ([Arbitrum docs](https://docs.arbitrum.io/how-arbitrum-works/deep-dives/gas-and-fees)) | Yes, paymaster supported | CDP facilitator supports it | Skip. Too expensive for insight-tier. |
| **Optimism** | Similar to Base (shared stack) | Yes | In CDP facilitator | Redundant with Base. Skip. |
| **Polygon PoS** | Sub-cent | Yes | CDP facilitator supports it | Skip. Declining mindshare vs Base/Solana. |
| **zkSync** | Sub-cent | Yes | No first-class x402 | Skip. |
| **Sui** | ~$0.001 | Yes | No x402 | Interesting only because Walrus is Sui-native. If we stay on Walrus, worth watching. |
| **Aptos** | ~$0.0005 | Yes | No x402 | Skip. |
| **Avalanche** | $0.01–$0.05 | Yes | No x402 | Skip. |
| **Near** | ~$0.0001, human-readable accounts | Yes | No x402 | Skip for now; watch. |
| **Stellar** | Near-zero, payment-native | Yes (native) | No x402 | Skip. Not AI-agent native. |

**Strategic fit (A):** **Base + Solana.** Base for the USDC-on-L2 mindshare and x402 origin story, Solana for fee-sensitive insight-tier queries. Everything else is noise.

### B) IP / content / citation registry

| Protocol | Model | Cost | 2026 traction | Verdict |
|---|---|---|---|---|
| **Story Protocol** | Programmable IP NFTs on own L1 | Sub-cent gas; mainnet + Jan 2026 hard fork | Live but ~$2/day revenue ([Decrypt](https://decrypt.co/305730/story-protocol-debuts-mainnet-with-1-billion-ip-tokens-to-claim)); "Parasite" studio partnership ([CMC](https://coinmarketcap.com/cmc-ai/story-protocol/latest-updates/)) | **Keep, but thin layer.** Use for programmable license + royalty routing; don't depend on it for existence proof. |
| **Arweave** | Permanent blobs, pay-once | ~$3,500/TB forever | Mature, stable | **Adopt as canon backing-store.** "Citeable forever" maps 1:1. |
| **Irys (ex-Bundlr)** | Arweave-backed + programmable datachain | ~20x cheaper than Arweave; 100k TPS claim ([MEXC](https://blog.mexc.com/news/irys-network-the-programmable-datachain-challenging-arweave-with-100k-tps-and-20x-cheaper-storage/)) | Growing | **Strong candidate.** Mint provenance + attach programmable access rules. Pilot against Arweave. |
| **Walrus** | Sui-native blob, lease-based | Per-epoch (~2 weeks); max ~2yr duration ([Walrus docs](https://docs.wal.app/docs/system-overview/storage-costs)) | 450TB stored, mainnet live ([Walrus 2025 review](https://www.walrus.xyz/blog/walrus-2025-year-in-review)) | Keep as **hot cache only**. 2-year cap breaks the citation model. |
| **Filecoin / IPFS** | Recurring storage deals | $200–1000/TB/yr ([CoinMarketCap](https://coinmarketcap.com/academy/article/the-decentralized-storage-war-filecoin-vs-arweave)) | Mature, but recurring | Skip for canon; fine for ephemeral. |
| **Ceramic / OrbitDB** | Mutable decentralized data | Cheap | Quiet in 2026 | Skip. Citations should be immutable. |
| **Ethereum Attestation Service (EAS)** | On/off-chain attestations, 2 contracts ([attest.org](https://attest.org/)) | Gas only; deployed on Base, Arbitrum, Optimism | Infrastructure public good; active GitHub, indexing service updated 2026-03 ([EAS GitHub](https://github.com/ethereum-attestation-service)) | **Adopt.** Every canon-tier claim gets a signed EAS attestation. Free-er than Story minting. |
| **Verax** (Linea-native) | Attestation registry built on EAS schema | Low gas on Linea | Smaller ecosystem | Skip; EAS is the Schelling point. |
| **Polygon ID** | ZK identity primitives | Cheap | Quiet | Skip. Not our use case. |

**Strategic fit (B):** **Arweave (or Irys) for permanence + EAS for attestations + Story for programmable licensing.** Three layers, each doing one thing well. Story alone is too thin a reed.

### C) "Make our own chain" options

| Option | Up-front cost | Ongoing cost | Security | Verdict |
|---|---|---|---|---|
| **OP Stack rollup (Superchain)** | RaaS tooling makes launch fast ([BlockEden 2026-03](https://blockeden.xyz/blog/2026/03/13/rollup-deployment-simplification-raas-chain-as-easy-as-smart-contract/)) | **2.5% of revenue OR 15% of onchain profit** for Superchain interop ([Agglayer comparison](https://www.agglayer.dev/blogs/op-stack-vs-arbitrum-orbit-which-stack-should-you-choose)) | Inherits L1 via Base/ETH settlement | **No.** We're a nonprofit; paying a tax to own a chain we don't need is the worst of both worlds. |
| **Arbitrum Orbit** | Similar RaaS | Revenue share if not L3 on Arbitrum One ([Agglayer](https://www.agglayer.dev/blogs/op-stack-vs-arbitrum-orbit-which-stack-should-you-choose)) | Arbitrum-inherited | **No.** |
| **Polygon CDK / zkEVM** | Similar | Polygon ecosystem tax | zk-proven | No. |
| **Avalanche Subnet / L1** | Validator set required | Subnet gas | Self-validated; weaker than rollup | No. |
| **Cosmos SDK / Celestia DA** | Full sovereignty, run own validators | Ops cost; DA via Celestia is cheap | Own security set | No. Sovereignty we don't need. |
| **Substrate parachain** | Polkadot slot auction | Slot lease | Shared | No. |

**Strategic fit (C):** **None.** See §5.

### D) Competitive landscape — who is already doing this?

| Project | What they do | Overlap with Bucket | Verdict |
|---|---|---|---|
| **Ocean Protocol** | Datatoken-wrapped dataset marketplace ([Ocean](https://oceanprotocol.com)) | Tokenized data access, not citation payouts | Adjacent, not competitor |
| **Vana** | Data DAOs; 12.7M datapoints from 1M users ([CMC Vana](https://coinmarketcap.com/cmc-ai/vana/latest-updates/)) | User-owned training data; not research citation | Adjacent |
| **Molecule + VitaDAO** | IP-NFTs for biotech research; first IP-NFT 2021, $RSC integration w/ ResearchHub ([Molecule](https://www.molecule.to/)) | **Closest competitor** on IP-NFT primitive | Partner, don't compete. Biotech vertical; Bucket = cross-domain canon |
| **ResearchHub** | Open peer review + $RSC bounties, now integrated with Molecule BioAgents ([PANews](https://www.panewslab.com/en/articles/m75jwq213yo7)) | Incentivized peer review | Adjacent; Bucket is downstream (after canon-tier) |
| **DeSci Publish / Desci Labs (IPT)** | Publish primitives, IP tokens | Publishing layer | Study their IPT model |
| **Bittensor subnets** | Incentivized AI subnet economy | AI-native payouts, not citation | Not competitor |
| **Fetch.ai** | Agent-to-agent payments (via own FET chain) | Agent payments, but legacy stack | Less relevant post-x402 |
| **SingularityNET** | AI service marketplace | AI services, not citations | Not competitor |
| **Grass** | Bandwidth data DAO | Data DAO, not citation | Not competitor |
| **Farcaster Frames** | Social + micropayment surface | Discovery mechanism | **Use as distribution**, not competitor |
| **Lens Protocol** | Social graph | Researcher graph is useful | Watch; possible integration for author profiles |
| **Gitcoin / Optimism RetroPGF** | Public goods funding | Funding model for our nonprofit | **Model to emulate.** Apply to RetroPGF rounds; Bucket = citation infra = public good |

**Strategic fit (D):** Bucket's wedge is **"pay-once-mint → author gets paid forever on every citation"** — Molecule + VitaDAO do this for biotech *licensing* (access to IP), not for *citation*. ResearchHub pays for peer review, not citations. Ocean pays for data access, not citations. **The citation-payout primitive is unoccupied.** Hold it.

---

## 3. Strategic Fit Summary

- **Payments:** Base primary, Solana second rail within 6 months. ([x402 ecosystem](https://www.x402.org/ecosystem))
- **IP / Registry:** Story Protocol (license logic) + EAS (attestations) + Arweave/Irys (permanence). Triple-redundant.
- **Storage:** Arweave or Irys as canon backing-store; Walrus as hot cache.
- **Distribution:** Farcaster Frames for discovery; apply to Optimism RetroPGF as nonprofit infra.
- **Partners not competitors:** Molecule, ResearchHub, VitaDAO. Pitch them x402 citation-payout rail as a downstream service.

---

## 4. Migration Cost / Risk if We Ever Leave

| Dependency | Replace cost | Lock-in severity |
|---|---|---|
| **Base** | Low — x402 is chain-agnostic; Coinbase facilitator supports 5 chains already. Swap to Solana = days of work. | Low |
| **Story Protocol** | Medium — if we re-issued as EAS attestations + Arweave hashes we lose the programmable-license module but retain the core registry. ~2–4 weeks. | Medium. Mitigation: dual-write EAS on every Story mint from day 1. |
| **Walrus** | Low — blobs are just blobs. Re-upload to Arweave = bandwidth + storage fee. This should be done anyway (see verdict #3). | Low |
| **Dynamic (auth)** | Low — swap to Privy/Thirdweb/Reown in a week | Low |
| **Supabase (off-chain)** | Low — Postgres is portable | Low |
| **Viatika (metering)** | Medium — per CLAUDE.md we rely on them for x402 metering; fallback = self-host CDP facilitator | Medium |

**Biggest risk:** Story Protocol dying (revenue is $2/day). Mitigation is cheap: dual-write to EAS + Arweave on every mint. Do it now.

---

## 5. Don't Build Our Own Chain

The case for a custom chain would be: we need a custom opcode, custom fee model, or a sovereign jurisdiction for citation state. None of these apply.

- **Custom opcode?** Citation provenance is a signed envelope + Merkle inclusion proof. Standard EVM (and even standard Solana programs) can verify this. No custom VM needed.
- **Custom fee model?** x402 already *is* the fee model. Our "fee" is the citation payout, which is a plain ERC-20 transfer in a smart contract.
- **Sovereignty?** A nonprofit foundation has zero regulatory benefit to owning a chain. It adds validator ops, bridge risk, and a 2.5%–15% Superchain tax ([Agglayer](https://www.agglayer.dev/blogs/op-stack-vs-arbitrum-orbit-which-stack-should-you-choose)).
- **Security?** Rolling our own validator set gives us *weaker* security than inheriting Base/ETH.
- **Dev time cost:** Even with RaaS, running an L2/L3 is a full-time infra team. Bucket is a nonprofit with a founder + co-founder.

**The moat is the envelope schema, the payout contract, and the canon curation — not the chain.** Base is our chain. Don't fork the rail; fork the application layer.

A reasonable re-evaluation trigger: **Bucket handles >1M citations/day AND Base fees systematically exceed $0.001 per tx for our flow.** Neither is close.

---

## 6. 6-Month Action Checklist

1. **Week 1–2:** Dual-write every Story mint to EAS (Base schema) + Arweave hash. De-risks Story dying.
2. **Month 1:** Spike Solana x402 payment path behind the same envelope. Ship behind a feature flag.
3. **Month 2–3:** Migrate canon artifacts from Walrus to Arweave/Irys. Keep Walrus as cache.
4. **Month 3–4:** Talk to Molecule + ResearchHub about integrating Bucket's citation-payout envelope as a downstream rail.
5. **Month 4–6:** Apply to Optimism RetroPGF (Season 8+) as "citation infrastructure public good."
6. **Continuous:** Monitor x402 Foundation roadmap + Story mainnet revenue.

---

## Sources (consolidated)

- [x402 Foundation, Cloudflare](https://blog.cloudflare.com/x402/)
- [x402 protocol docs](https://docs.cdp.coinbase.com/x402/welcome) · [x402.org](https://www.x402.org/) · [x402 GitHub](https://github.com/coinbase/x402)
- [Solana x402 announcement 2026-04-02](https://www.banklesstimes.com/articles/2026/04/02/solana-foundation-enters-linux-foundations-x402-initiative-for-web-native-payments/)
- [Solana x402 intro](https://solana.com/x402)
- [Circle Paymaster](https://www.circle.com/blog/introducing-circle-paymaster)
- [Arbitrum gas docs](https://docs.arbitrum.io/how-arbitrum-works/deep-dives/gas-and-fees)
- [Story Protocol mainnet (Decrypt)](https://decrypt.co/305730/story-protocol-debuts-mainnet-with-1-billion-ip-tokens-to-claim) · [CMC Story updates](https://coinmarketcap.com/cmc-ai/story-protocol/latest-updates/)
- [Walrus storage costs](https://docs.wal.app/docs/system-overview/storage-costs) · [Walrus 2025 review](https://www.walrus.xyz/blog/walrus-2025-year-in-review)
- [Arweave vs Filecoin (CoinMarketCap)](https://coinmarketcap.com/academy/article/the-decentralized-storage-war-filecoin-vs-arweave)
- [Irys (MEXC)](https://blog.mexc.com/news/irys-network-the-programmable-datachain-challenging-arweave-with-100k-tps-and-20x-cheaper-storage/)
- [EAS](https://attest.org/) · [EAS GitHub](https://github.com/ethereum-attestation-service) · [EAS docs](https://docs.attest.org/)
- [Molecule](https://www.molecule.to/) · [VitaDAO IP-NFT primer](https://vitadao.medium.com/unlocking-research-innovation-with-ip-nfts-how-to-get-started-with-decentralized-funding-0584b5b1f111) · [DeSci overview (PANews)](https://www.panewslab.com/en/articles/m75jwq213yo7)
- [Ocean Protocol](https://oceanprotocol.com) · [Vana updates (CMC)](https://coinmarketcap.com/cmc-ai/vana/latest-updates/)
- [OP Stack vs Orbit (Agglayer)](https://www.agglayer.dev/blogs/op-stack-vs-arbitrum-orbit-which-stack-should-you-choose) · [RaaS 2026 (BlockEden)](https://blockeden.xyz/blog/2026/03/13/rollup-deployment-simplification-raas-chain-as-easy-as-smart-contract/)

---

*End of memo. ~2,200 words.*
