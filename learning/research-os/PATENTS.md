# Patents in Research OS

Patents as first-class research objects: a paid patents gateway over x402 with feed402 envelopes, patent nodes in the graph beside papers and canon, prior-art search on any node or production, claims read as combinations of known ideas, and invention disclosure as a production.

The founder, 2026-09-18: "if we are focused on scientific research, discovery, and innovation, patents are super important too," and "patents should have its own x402 researchgateway and feed402, do some internal external research on that."

This file holds the ros-patents epic. Slice 0, the gateway and the service, comes first; slices 1 to 4 (the research memo, the first corpus, prior-art search, claims and disclosure) follow in the queue.

## Slice 0: the gateway and the service

### What the repositories hold

As of 2026-09-19.

**feed402** (`~/agfarms/feed402`, Gian's MIT protocol and reference server, local with no public remote):

- `SPEC.md` §6.1 defines six routes: `/patents/search`, `/patents/{id}`, `/patents/by-coord`, `/patents/family/{id}`, `/patents/citations/{id}` at the query and raw tiers ($0.005, $0.010), and `/patents/insight` at $0.002. Section 6.1.1 turns the jurisdiction rules into a structured rights block: US records from PatentsView or Google Patents carry CC-BY-4.0 on metadata and content with every action allowed; EP records through EPO OPS allow metadata and deny content, text mining, and training; WO records reach the insight tier alone. The fixture is `fixtures/v0.3/insight-rights-patents-jurisdiction.json`.
- `routes/patents.ts` (651 lines) mounts the six routes behind a payment guard, with domain types that mirror this repository's USPTO schema, a `PatentsRepo` interface, and a `MockPatentsRepo`. No real data backs it.

**x402-research-gateway** (`~/agfarms/x402-research-gateway`, Gian's MIT Go service, deployed at `x402-research.agfarms.dev`):

- A config-driven paid proxy. Each route in `config/routes.yaml` names an upstream (base URL, path, headers with environment expansion, fixed and passed-through query parameters, timeout), a price, a cache time, a feed402 tier, and a citation block (source prefix, canonical URL template, license). Handlers wrap upstream replies in feed402 envelopes.
- Seven routes over PubMed, Semantic Scholar, OpenAlex, ClinicalTrials.gov, PubChem, and the Kruse corpus, priced $0.001 to $0.002, on Base Sepolia through the facilitator at `facilitator.x402.rs`. The insight endpoint over PubMed is priced $0.005, above its query routes, where feed402 §5 makes insight the cheapest tier.
- No patents route.

**bucket-foundation**:

- `data/patents/uspto/`: the USPTO Postgres schema (`schema/uspto.sql`, bead bkt-5qg), fetch scripts, and a loader skeleton; the raw and parquet directories are empty.
- `local/patents/`: the design of a local DuckDB index with vector search (bkt-ibj); its data directory is empty.
- `docs/FEED402_PATENTS.md`: the route surface (bkt-zx6), with the real repository, pgvector claims, and PostGIS locations pending.
- `docs/PATENT_LICENSING.md` (2026-05-03, bkt-z6k): ten sources reviewed for paid redistribution. Its v1 verdict is USPTO with PatentsView and Google Patents Public Data on BigQuery, both CC-BY-4.0, plus EPO OPS bibliographic data within the fair-use cap, and WIPO PATENTSCOPE content on the insight tier under a derivative license. Lens, IFI CLAIMS, KIPO, CNIPA, and JPO wait on paid licenses. Its claims are checked against the sources below before the design rests on them.

So the protocol side is written and mocked, the licensing is mapped, the schema exists, and no patent record has been loaded anywhere.

### What changed outside since the licensing matrix

Checked 2026-09-19 against the sources named.

**PatentsView is now part of the USPTO Open Data Portal, and its search API is paused.** On 2026-03-20 PatentsView moved into the Open Data Portal (ODP). Its downloads and data dictionaries are served from ODP, while its search, APIs, visualizations, and support "will pause temporarily", and the USPTO "plans to reintroduce these functions in updated forms" with no date given ([USPTO notice, 2026-03-18](https://www.uspto.gov/subscription-center/2026/patentsview-migrating-uspto-open-data-portal-march-20); [ODP transition guide](https://data.uspto.gov/support/transition-guide/patentsview)). Keys issued for the old PatentSearch API do not work on ODP. The matrix's v1 plan, a query tier in front of PatentsView, has no live API to stand in front of.

**ODP needs a verified account.** ODP APIs take an API key tied to a USPTO.gov account verified through ID.me, limited to 60 requests a minute per key and 4 a minute for PDF and ZIP downloads, with a weekly download quota that answers HTTP 429 for seven days once exceeded ([ODP getting started](https://data.uspto.gov/apis/getting-started); [ODP rate limits](https://data.uspto.gov/apis/api-rate-limits)). From 2026-06-18 every use of ODP, the web included, requires a signed-in USPTO.gov account with multi-factor authentication; the USPTO gave site security and "costly, unregistered bot traffic" as the reasons ([Patent Riff, 2026-05-01](https://blog.patentriff.com/p/not-so-open-uspto-to-require-registration)). A key belongs to a person, so loading the bulk tables waits on the founder's account.

**Google Patents Public Data is unchanged.** The BigQuery tables `patents-public-data.patents.publications` and the rest stay under CC BY 4.0, "Google Patents Public Data by IFI CLAIMS Patent Services and Google", with worldwide bibliographic data and US full text ([Google Cloud blog](https://cloud.google.com/blog/topics/public-datasets/google-patents-public-datasets-connecting-public-paid-and-private-patent-data); [google/patents-public-data](https://github.com/google/patents-public-data)). BigQuery bills by bytes scanned, so a slice by CPC class exported once costs one query.

**EPO OPS allows EP data inside a product, and no passthrough.** The EPO's terms for OPS (version 2.0, September 2017) grant a licence to "use and include these data in their own machine-readable databases, products and services" and to "distribute the data as part of these products" (clause 3.1), and forbid making "the data as such available to the public" or copying and distributing "the data as such" (3.2). No royalties are due on products built with OPS data (4.6). A weekly volume is free and a yearly subscription covers more (4.1, 4.2); both figures sit in the EPO price list, which was not read, and secondary sources give 3.5, 4, and 5 GB a week ([EPO OPS terms](https://developers.epo.org/sites/default/files/terms_and_conditions_OPS%202.0%20EN_DE_FR.pdf)). So an EP record may appear inside a Bucket answer or a merged record, and a query route that relays OPS results as they come breaks 3.2. The matrix's plan of an OPS "query-tier passthrough" does not hold.

**WIPO data costs a licence before any resale.** WIPO's terms for PCT data products (last updated 2025-11-12) grant bulk redistribution only under a paid derivative licence, and only "with 'added value' (i.e., with substantial modification of the PCT data, beyond that made available 'as is')"; the basic, non-derivative, and derivative licences all carry fees ([WIPO terms](https://www.wipo.int/en/web/patentscope/data/terms)). The matrix admitted WIPO content to the insight tier under the derivative clause; that clause applies after a licence is bought. WIPO stays out of v1.

**The patent-to-paper link data is non-commercial.** Reliance on Science by Matt Marx and Aaron Fuegi, version 65 (2026-07-22), holds patent-to-paper citations through patents granted in 2025, front page and body text, with a confidence score from 1 to 10 for each, in `pcs_oa_uspto.csv` (1.4 GB) keyed to OpenAlex works, under CC BY-NC 4.0 ([Zenodo](https://zenodo.org/records/21493744); Marx and Fuegi, [Strategic Management Journal 41(9) 2020](https://doi.org/10.1002/smj.3145) and [Journal of Economics and Management Strategy 31(2)](https://doi.org/10.1111/jems.12455), published though Zenodo still calls it forthcoming; both DOIs checked in OpenAlex). Research OS, free to read, may use it for links between patent and paper nodes. A paid x402 route may not carry it; the paid routes need links built from CC BY sources, such as the non-patent literature references in PatentsView, matched to OpenAlex by Bucket.

**Patent data already sells over x402, at far higher prices.** Apify's "USPTO Patent Search" actor accepts x402 payment in USDC with no API key and charges $0.10 per patent, returning claims text, CPC classes, cited patents, and forward citation counts ([Apify, nexgendata/uspto-patent-search](https://apify.com/nexgendata/uspto-patent-search)). Catalogs of keyless x402 endpoints list patents among hundreds of data kinds ([2s.io](https://2s.io/learn/x402)). Subscription sellers price by the month: SerpApi's Google Patents API from $25 a month, about 2.5 cents a search at the entry plan; PQAI's API from $199 a month for 600 queries; IFI CLAIMS by quote with no metering ([SerpApi](https://serpapi.com/google-patents-api); [PQAI on Lens alternatives](https://projectpq.ai/lens-org-alternatives/); [IFI CLAIMS FAQ](https://www.ificlaims.com/about-us/faqs/)). feed402's $0.010 for a full grant is a tenth of that x402 seller's price.

**The facilitator fee is a floor on price.** Coinbase's CDP facilitator settles the first 1,000 onchain transactions a month free, then charges $0.001 each, and needs a CDP API key; it covers Base, Polygon, Arbitrum, World, and Solana, and indexes an endpoint in the Bazaar discovery layer once it settles a payment for an endpoint that advertises Bazaar metadata ([CDP facilitator](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)). Past the free thousand, a $0.002 insight call pays half its price to settlement. The research gateway settles through `facilitator.x402.rs` on Base Sepolia today.

### Design

The gateway, the corpus behind it, and Research OS read one patent index. The gateway sells it per call; Research OS reads it free, as it reads the rest of the graph.

**One index, two readers.** A patents service holds the corpus and answers the six feed402 routes of §6.1. It is the feed402 reference server's `mountPatents` with a real `PatentsRepo` in place of the mock, over the local DuckDB index that `local/patents` designs (full-text and vector search fused by reciprocal rank, the Kruse Index pattern), or over the USPTO Postgres schema when it moves to the Hetzner box. It runs with payment off on a private port. Two readers sit in front of it:

- The x402 research gateway sells it. Each of the six routes becomes an entry in `config/routes.yaml` whose upstream is the private patents service, so payment, the facilitator, receipts, and discovery stay in the one gateway that already sells PubMed and OpenAlex, at `x402-research.agfarms.dev`. The patents service already answers in feed402 envelopes, so the gateway needs one change: a per-route flag that passes an upstream envelope through, where today it wraps every upstream reply in a new one.
- Research OS reads the same service directly and free, for patent nodes, prior-art search, and the MCP tool.

A config-only proxy route in front of a public patent API was the other shape considered. It has no lawful upstream today: PatentsView's search API is paused, ODP gives one person's key 60 requests a minute and ties it to that person, EPO forbids relaying OPS data as such, and WIPO needs a paid licence.

**Corpus v1: US grants, CC BY 4.0, in the classes the graph covers.** The first load is US granted patents from the PatentsView bulk tables on ODP, which are CC BY 4.0: grants, claims, patent-to-patent citations, non-patent literature references, current CPC classes, and disambiguated assignees and inventors. The slice is the CPC classes that match the graph's branches, chosen in ros-patents 1 and loaded in ros-patents 2. The Google Patents Public Data tables on BigQuery, also CC BY 4.0, are the fallback source and the route to worldwide bibliographic data later. Either source needs an account in the founder's name: a USPTO.gov account with MFA for ODP, or a Google Cloud project with billing for BigQuery.

**Rights by tier.** Each record carries the §6.1.1 rights block, and the rules below decide what a tier may hold:

| Source | Raw and query tiers | Insight tier | Research OS |
|---|---|---|---|
| PatentsView and Google Patents Public Data, CC BY 4.0 | yes, with attribution | yes | yes |
| EPO OPS | no: the terms forbid the data as such | inside a composed answer only, with the EPO credit | inside composed views only |
| WIPO PATENTSCOPE | no | no, until a paid derivative licence | no |
| Reliance on Science, CC BY-NC 4.0 | no | no | yes, marked non-commercial |
| Patent-to-paper links Bucket builds from PatentsView references matched to OpenAlex | yes | yes | yes |

Reliance on Science stays out of every paid tier, so the paid routes carry only the links Bucket builds. OpenAlex metadata is CC0.

**Pricing.** The §6.1 prices stand: $0.010 for a full grant, $0.005 for a query, $0.002 for an insight. They sit far below the one x402 patent seller found ($0.10 a patent), which fits Bucket's aim that citing stays cheap. Settlement sets the floor. Past 1,000 settlements a month, Coinbase's facilitator takes $0.001 of each, half of an insight call. The gateway settles through `facilitator.x402.rs` today, whose fees were not checked here; the fee of whichever facilitator carries mainnet traffic belongs in the pricing decision. The gateway's own insight route over PubMed is priced $0.005, above its query routes, against §5; the patents routes follow the spec, and the PubMed price is flagged for the gateway.

**Where the fees go.** PROTOCOL.md sends a citation fee to the author's `payout_wallet`. A patent's inventors and assignees have no wallet on record and never signed up. The options are Bucket's operating costs with a public ledger, an escrow per inventor that a claim releases, or a donation to the open data sources. It is the founder's call, and until then patent fees go to operations and the ledger is public.

**Graph model** (built in ros-patents 2):

- A node kind `patent`, with provenance `{type: "patent", number, jurisdiction, grant_date, cpc, assignees, inventors, license, source}` and the first independent claim as its summary.
- Edges reuse `cites`: a patent citing a patent, and a patent citing a paper when the paper is a literature or canon node, with the link's source and confidence in its provenance.
- A patent rests on the ideas its claims combine, through the `derives_from` proposals the decompose-further queue already runs (ros-patents 4). A reviewer approves them at `/research-os/edges` like any other proposal.
- Patents are work built on ideas: the directions walk passes through them, and the idea rule leaves them out of decomposition targets until ros-patents 4 decomposes claims into elements.

**Where a researcher meets it:**

- the node page of an idea gets the patents that cite its papers or rest on it (ros-patents 2);
- search returns patents beside papers and canon (ros-patents 2);
- the production form checks prior art before a production is submitted, and the node page offers the same check (ros-patents 3);
- the MCP endpoint gets a `patents_search` tool over the same service, so an agent working with a researcher reaches the patent record the way it reaches the literature;
- a patent's own node page shows its claims, its citations both ways, and the ideas it rests on.

That is the human-AI-computer division this epic serves. The machine finds and ranks the prior art and proposes what a claim combines. The researcher reads it, judges novelty, and decides.

**Changes outside this repository, logged for their own sessions:**

- feed402 `SPEC.md` §6.1 prose names EPO OPS on the query tier, and the matrix calls it a passthrough. Both should say EP data appears only inside composed answers, as the §6.1.1 rights block already implies. Hours for that edit go to `feed402/TIMELOG.md`.
- The x402 research gateway needs the envelope passthrough flag, the six patents routes, and a look at its insight price.

`docs/PATENT_LICENSING.md` carries the corrections found here in a dated block at its top: PatentsView's paused API, the OPS terms, WIPO's paid licence, Reliance on Science's licence, and Lens paid for any commercial or integrated use, with a 14-day trial otherwise ([Lens API access](https://support.lens.org/knowledge-base/lens-patent-and-scholar-api/), updated 2026-05-21).

**Waiting on the founder:**

1. An account for the bulk data: a USPTO.gov account with MFA for the PatentsView tables on ODP, or a Google Cloud project with billing for BigQuery. ros-patents 2 needs one.
2. Where patent citation fees go: operations with a public ledger (the default until decided), escrow per inventor, or a donation to the data sources.
3. The IP stance for a nonprofit that publishes inventions, before ros-patents 4 adds disclosure as a production.

**Slices after this one:**

- ros-patents 1 (the research memo) fills this file with the prior work on patents in discovery and picks the CPC slice.
- ros-patents 2 loads the corpus and writes patent nodes and links.
- ros-patents 3 builds prior-art search.
- ros-patents 4 decomposes claims into elements and adds disclosure.

The gateway routes go live with ros-patents 2, once a real `PatentsRepo` has data behind it.
