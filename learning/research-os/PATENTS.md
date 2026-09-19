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

**EPO OPS fair use: the cap needs a primary source.** The matrix says 4 GB a week for non-paying users. A client library's notes say 4 GB a week, older notes 3.5 GB, and another source 5 GB per IP address in any sliding seven days. The EPO's own terms and fair-use charter pages did not render to the tools used here; the figure stays unverified until one of them is read.

**Patent data already sells over x402, at far higher prices.** Apify's "USPTO Patent Search" actor accepts x402 payment in USDC with no API key and charges $0.10 per patent, returning claims text, CPC classes, cited patents, and forward citation counts ([Apify, nexgendata/uspto-patent-search](https://apify.com/nexgendata/uspto-patent-search)). Catalogs of keyless x402 endpoints list patents among hundreds of data kinds ([2s.io](https://2s.io/learn/x402)). Subscription sellers price by the month: SerpApi's Google Patents API from $25 a month, about 2.5 cents a search at the entry plan; PQAI's API from $199 a month for 600 queries; IFI CLAIMS by quote with no metering ([SerpApi](https://serpapi.com/google-patents-api); [PQAI on Lens alternatives](https://projectpq.ai/lens-org-alternatives/); [IFI CLAIMS FAQ](https://www.ificlaims.com/about-us/faqs/)). feed402's $0.010 for a full grant is a tenth of that x402 seller's price.

**The facilitator fee is a floor on price.** Coinbase's CDP facilitator settles the first 1,000 onchain transactions a month free, then charges $0.001 each, and needs a CDP API key; it covers Base, Polygon, Arbitrum, World, and Solana, and indexes an endpoint in the Bazaar discovery layer once it settles a payment for an endpoint that advertises Bazaar metadata ([CDP facilitator](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)). Past the free thousand, a $0.002 insight call pays half its price to settlement. The research gateway settles through `facilitator.x402.rs` on Base Sepolia today.
