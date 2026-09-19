# Patents in Research OS

Patents as first-class research objects: a paid patents gateway over x402 with feed402 envelopes, patent nodes in the graph beside papers and canon, prior-art search on any node or production, claims read as combinations of known ideas, and invention disclosure as a production.

The founder, 2026-09-18: "if we are focused on scientific research, discovery, and innovation, patents are super important too," and "patents should have its own x402 researchgateway and feed402, do some internal external research on that."

This file holds the ros-patents epic. Slice 0, the gateway and the service, comes first; slices 1 to 4 (the research memo, the first corpus, prior-art search, claims and disclosure) follow in the queue.

## Slice 0: the gateway and the service

### What the repositories hold

As of 2026-09-19.

**feed402** (`~/agfarms/feed402`, Gian's MIT protocol and reference server; remotes `gianyrox/feed402` and `bucket-foundation/feed402` on GitHub):

- `SPEC.md` §6.1 defines six routes: `/patents/search`, `/patents/{id}`, `/patents/by-coord`, `/patents/family/{id}`, `/patents/citations/{id}` at the query and raw tiers ($0.005, $0.010), and `/patents/insight` at $0.002. Section 6.1.1 turns the jurisdiction rules into a structured rights block: US records from PatentsView or Google Patents carry CC-BY-4.0 on metadata and content with every action allowed; EP records through EPO OPS allow metadata and deny content, text mining, and training; WO records reach the insight tier alone. The fixture is `fixtures/v0.3/insight-rights-patents-jurisdiction.json`.
- `routes/patents.ts` (651 lines) mounts the six routes and a seventh, `/citation`, behind a payment guard, with domain types that mirror this repository's USPTO schema, a `PatentsRepo` interface, and a `MockPatentsRepo`. No real data backs it.

**x402-research-gateway** (`~/agfarms/x402-research-gateway`, Gian's MIT Go service, deployed at `x402-research.agfarms.dev`):

- A config-driven paid proxy. Each route in `config/routes.yaml` names an upstream (base URL, path, headers with environment expansion, fixed and passed-through query parameters, timeout), a price, a cache time, a feed402 tier, and a citation block (source prefix, canonical URL template, license). Handlers wrap upstream replies in feed402 envelopes.
- Seven routes over PubMed, Semantic Scholar, OpenAlex, ClinicalTrials.gov, PubChem, and the Kruse corpus, priced $0.001 to $0.002, on Base Sepolia through the facilitator at `facilitator.x402.rs`. The insight endpoint over PubMed is priced $0.005, above its query routes, where feed402 §5 makes insight the cheapest tier.
- No patents route.

**bucket-foundation**:

- `data/patents/uspto/`: the USPTO Postgres schema (`schema/uspto.sql`, bead bkt-5qg), fetch scripts, and a loader skeleton, with no data directories. Both fetch scripts point at hosts that no longer serve the data: the PatentsView S3 path answers 403 and `bulkdata.uspto.gov` does not answer (checked 2026-09-19).
- `local/patents/`: a local DuckDB index with vector search (bkt-ibj), with no data. Its `scripts/05-serve.ts` already holds a DuckDB-backed `PatentsRepo` and serves feed402's routes with payment off, but calls `mountPatents(app, repo, {...})`, which no longer matches the current signature `mountPatents(app, {repo, guard})`, and writes receipts as `tx: "local-mode-no-payment"`.
- `docs/FEED402_PATENTS.md`: the route surface (bkt-zx6), with the real repository, pgvector claims, and PostGIS locations pending.
- `docs/PATENT_LICENSING.md` (2026-05-03, bkt-z6k): ten sources reviewed for paid redistribution. Its v1 verdict is USPTO with PatentsView and Google Patents Public Data on BigQuery, both CC-BY-4.0, plus EPO OPS bibliographic data within the fair-use cap, and WIPO PATENTSCOPE content on the insight tier under a derivative license. Lens, IFI CLAIMS, KIPO, CNIPA, and JPO wait on paid licenses. Its claims are checked against the sources below before the design rests on them.

So the protocol side is written and mocked, the licensing is mapped, the schema exists, and no patent record has been loaded anywhere.

### What changed outside since the licensing matrix

Checked 2026-09-19 against the sources named.

**PatentsView is now part of the USPTO Open Data Portal, and its search API is paused.** On 2026-03-20 PatentsView moved into the Open Data Portal (ODP). Its downloads and data dictionaries are served from ODP, while its search, APIs, visualizations, and support "will pause temporarily", and the USPTO "plans to reintroduce these functions in updated forms" with no date given ([USPTO notice, 2026-03-18](https://www.uspto.gov/subscription-center/2026/patentsview-migrating-uspto-open-data-portal-march-20); [ODP transition guide](https://data.uspto.gov/support/transition-guide/patentsview)). Keys issued for the old PatentSearch API do not work on ODP. The matrix's v1 plan, a query tier in front of PatentsView, has no live API to stand in front of.

**ODP needs a verified account.** ODP APIs take an API key tied to a USPTO.gov account verified through ID.me, limited to 60 requests a minute per key and 4 a minute for PDF and ZIP downloads, with a weekly download quota that answers HTTP 429 for seven days once exceeded ([ODP getting started](https://data.uspto.gov/apis/getting-started); [ODP rate limits](https://data.uspto.gov/apis/api-rate-limits)). From 2026-06-18 every use of ODP, the web included, requires a signed-in USPTO.gov account with multi-factor authentication; the USPTO gave site security and "costly, unregistered bot traffic" as the reasons ([Patent Riff, 2026-05-01](https://blog.patentriff.com/p/not-so-open-uspto-to-require-registration)). A key belongs to a person, so loading the bulk tables waits on the founder's account.

**Google Patents Public Data is unchanged.** The BigQuery tables `patents-public-data.patents.publications` and the rest stay under CC BY 4.0, "Google Patents Public Data by IFI CLAIMS Patent Services and Google", with worldwide bibliographic data and US full text ([Google Cloud blog](https://cloud.google.com/blog/topics/public-datasets/google-patents-public-datasets-connecting-public-paid-and-private-patent-data); [google/patents-public-data](https://github.com/google/patents-public-data)). BigQuery bills by bytes scanned, so a slice by CPC class exported once costs one query.

**EPO OPS data may go inside Bucket's own products.** The EPO's terms for OPS (version 2.0, September 2017) grant a licence to "use and include these data in their own machine-readable databases, products and services" and to "distribute the data as part of these products" (clause 3.1), and forbid making "the data as such available to the public" or copying and distributing "the data as such" (3.2). No royalties are due on products built with OPS data (4.6). A weekly volume is free and a yearly subscription covers more (4.1, 4.2); both figures sit in the EPO price list, which was not read, and secondary sources give 3.5, 4, and 5 GB a week ([EPO OPS terms](https://developers.epo.org/sites/default/files/terms_and_conditions_OPS%202.0%20EN_DE_FR.pdf)). So an EP record may appear inside a Bucket answer or a merged record, and a query route that relays OPS results as they come breaks 3.2. The matrix's plan of an OPS "query-tier passthrough" does not hold.

**EPO's bulk data became free in 2025.** Since 2025-01-01 the EPO serves seven bulk products, DOCDB worldwide bibliographic data, INPADOC, and EP full text among them, free and without an account from the public area of its Bulk Data Distribution Service ([patent.dev](https://patent.dev/game-changer-key-epo-patent-datasets-are-now-free/); [patent-dev/epo-bdds](https://github.com/patent-dev/epo-bdds)). They fall under the EPO's raw-data licensing terms, which did not render to the tools used here and were not read. Until they are, EP data stays out of v1.

**ODP has one live US API.** The Open Data Portal's Patent File Wrapper search answers today with US application data ([ODP search API](https://data.uspto.gov/apis/patent-file-wrapper/search)). It runs on one person's key at 60 requests a minute, which suits a loader or a nightly refresh and does not suit a public paid route.

**WIPO data costs a licence before any resale.** WIPO's terms for PCT data products (last updated 2025-11-12) grant bulk redistribution only under a paid derivative licence, and only "with 'added value' (i.e., with substantial modification of the PCT data, beyond that made available 'as is')"; the basic, non-derivative, and derivative licences all carry fees ([WIPO terms](https://www.wipo.int/en/web/patentscope/data/terms)). The matrix admitted WIPO content to the insight tier under the derivative clause; that clause applies after a licence is bought. WIPO stays out of v1.

**The patent-to-paper link data is non-commercial.** Reliance on Science by Matt Marx and Aaron Fuegi, version 65 (2026-07-22), holds patent-to-paper citations through patents granted in 2025, front page and body text, with a confidence score from 1 to 10 for each, in `pcs_oa_uspto.csv` (1.4 GB) keyed to OpenAlex works, under CC BY-NC 4.0 ([Zenodo](https://zenodo.org/records/21493744); Marx and Fuegi, [Strategic Management Journal 41(9) 2020](https://doi.org/10.1002/smj.3145) and [Journal of Economics and Management Strategy 31(2)](https://doi.org/10.1111/jems.12455), published though Zenodo still calls it forthcoming; both DOIs checked in OpenAlex). Research OS, free to read, may use it for links between patent and paper nodes. A paid x402 route may not carry it; the paid routes need links built from CC BY sources, such as the non-patent literature references in PatentsView, matched to OpenAlex by Bucket.

**Patent data already sells over x402, at far higher prices.** Apify's "USPTO Patent Search" actor accepts x402 payment in USDC with no API key and charges $0.10 per patent, returning claims text, CPC classes, cited patents, and forward citation counts ([Apify, nexgendata/uspto-patent-search](https://apify.com/nexgendata/uspto-patent-search)). Catalogs of keyless x402 endpoints list patents among hundreds of data kinds ([2s.io](https://2s.io/learn/x402)). Subscription sellers price by the month: SerpApi's Google Patents API from $25 a month, about 2.5 cents a search at the entry plan; PQAI's API from $199 a month for 600 queries; IFI CLAIMS by quote with no metering ([SerpApi](https://serpapi.com/google-patents-api); [PQAI on Lens alternatives](https://projectpq.ai/lens-org-alternatives/); [IFI CLAIMS FAQ](https://www.ificlaims.com/about-us/faqs/)). feed402's $0.010 for a full grant is a tenth of that x402 seller's price.

**The facilitator fee is a floor on price.** Coinbase's CDP facilitator settles the first 1,000 onchain transactions a month free, then charges $0.001 each, and needs a CDP API key; it covers Base, Polygon, Arbitrum, World, and Solana, and indexes an endpoint in the Bazaar discovery layer once it settles a payment for an endpoint that advertises Bazaar metadata ([CDP facilitator](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)). Past the free thousand, a $0.002 insight call pays half its price to settlement. The research gateway settles through `facilitator.x402.rs` on Base Sepolia today, which its operator, FareSide, runs as "a free testnet facilitator" whose tokens have "no real value" ([facilitator.x402.rs](https://facilitator.x402.rs)). The gateway takes no real money yet.

### Design

The gateway, the corpus behind it, and Research OS read one patent index. The gateway sells it per call; Research OS reads it free, as it reads the rest of the graph.

**One index, two readers.** A patents service holds the corpus and answers the feed402 patent routes of §6.1. It is the feed402 reference server's `mountPatents` with a real `PatentsRepo` in place of the mock: the DuckDB index of `local/patents` (full-text and vector search fused by reciprocal rank, the Kruse Index pattern), whose `05-serve.ts` needs its call updated to the current `mountPatents(app, {repo, guard})`, or the USPTO Postgres schema once the service moves to the Hetzner box. It runs with payment off. Two readers sit in front of it.

The x402 research gateway sells it. Each patent route becomes an entry in `config/routes.yaml` whose upstream is the patents service, so payment, the facilitator, receipts, and discovery stay in the one gateway that already sells PubMed and OpenAlex at `x402-research.agfarms.dev`. The gateway needs four changes for that, found by reading its handlers:

1. **Receipts.** The patents service answers in feed402 envelopes whose receipt says `tx: "local-mode-no-payment"`. The gateway must keep the upstream's data and citation and put its own settlement receipt in place of that one; today it wraps every upstream reply in a new envelope.
2. **Path parameters.** The gateway finds a route by exact method and path (`routeIndex["GET /path"]`) and fills an upstream path template from query parameters alone, so `/patents/{id}`, `/patents/family/{id}`, and `/patents/citations/{id}` do not route. It needs path patterns and path-parameter forwarding.
3. **Spec version.** The gateway declares `feed402/0.2`, where `citation` is one object; the patents routes answer in v0.3 with a list of citations. Either the gateway moves to 0.3 or a route declares its own version.
4. **Payee.** One `recipientAddress` serves every route. Patent fees go wherever the founder decides (below), which may be a different wallet, so a route needs its own `payTo`.

Research OS reads the same corpus free, in two ways. The ros-patents 2 importer writes patent nodes and their links into the Supabase `graph` schema, so node pages, search, and the map read patents the way they read every other node, with no call to the service. Prior-art search over the whole corpus (ros-patents 3) calls the service from Research OS's server routes on Vercel, which cannot reach a private port: the service gets a public HTTPS address on the Hetzner box beside the gateway, and the Research OS reader authenticates with a shared secret held in Vercel's environment.

**A profile per reader.** The service cannot tell a paying agent from Research OS unless the caller says, and the licences differ between them. Every call names a reader profile, and the service filters rows by each row's rights block before it answers:

- `paid`, which the gateway sets on its upstream calls through the route's `headers`, returns only rows whose rights allow the tier: no CC BY-NC rows, no EP or WO content.
- `research-os`, accepted only with the shared secret, adds rows Research OS may show, such as Reliance on Science links, each marked non-commercial.
- A call that names no profile gets `paid`, the narrower one.

A config-only proxy in front of a public patent API was the other shape considered. It has no usable upstream today: PatentsView's search API is paused, the one live ODP API gives one person's key 60 requests a minute, EPO forbids relaying OPS data as such, and WIPO needs a paid licence.

**Corpus v1: US grants, CC BY 4.0, in the classes the graph covers.** The first load is US granted patents, in the CPC classes that match the graph's branches, chosen in ros-patents 1 and loaded in ros-patents 2. Two sources carry them under CC BY 4.0:

- the PatentsView bulk tables, now on ODP: grants, claims, patent-to-patent citations, non-patent literature references, current CPC classes, and disambiguated assignees and inventors;
- the Google Patents Public Data tables on BigQuery, with worldwide bibliographic data and US full text.

The fetch scripts in `data/patents/uspto/scripts` need new hosts either way.

**Rights by tier.** Each record carries the §6.1.1 rights block, and the service's reader profile applies it. For v1:

| Source | Raw and query tiers | Insight tier | Research OS |
|---|---|---|---|
| PatentsView and Google Patents Public Data, CC BY 4.0 | yes, with attribution | yes, with attribution | yes |
| Patent-to-paper links Bucket builds from PatentsView references matched to OpenAlex | yes, marked as Bucket's adaptation of CC BY data | yes | yes |
| Reliance on Science, CC BY-NC 4.0 | no | no | yes, marked non-commercial |
| EPO, through OPS or the free bulk products | not in v1 | not in v1 | not in v1 |
| WIPO PATENTSCOPE | no | no, until a paid derivative licence | no |

EP data waits on the EPO's raw-data terms, read in ros-patents 1. The OPS terms allow it inside Bucket's products, but feed402's EP rights block marks text mining denied, and an insight answer is a model reading the text, so the two need reconciling before EP enters any tier.

Attribution rides in each citation as an `attribution` string: "USPTO; PatentsView, CC BY 4.0" or "Google Patents Public Data by IFI CLAIMS Patent Services and Google, CC BY 4.0", with "adapted by Bucket" on the links Bucket builds. The `canonical_url` points at the record's real source: the USPTO's patent full text for PatentsView records, Google Patents for BigQuery records.

**Pricing.** The §6.1 prices stand: $0.010 for a full grant, $0.005 for a query, $0.002 for an insight. They sit far below the one x402 patent seller found ($0.10 a patent), which fits Bucket's aim that citing stays cheap. Settlement sets the floor. Past 1,000 settlements a month, Coinbase's facilitator takes $0.001 of each, half of an insight call. The gateway settles on a free testnet facilitator today, so the mainnet facilitator is a choice still to make: Coinbase's CDP, FareSide's hosted service, or x402-rs run by Bucket; its fee belongs in the price. The insight tier also pays for a model call (the gateway's insight route uses `gpt-4o-mini`), so its margin is the price less settlement and the model, which puts $0.002 near zero past the free settlements. The gateway's own insight route over PubMed is priced $0.005, above its query routes, against §5; the patents routes follow the spec, and the PubMed price is flagged for the gateway.

**Where the fees go.** PROTOCOL.md sends a citation fee to the author's `payout_wallet`. A patent's inventors and assignees have no wallet on record and never signed up. The options are Bucket's operating costs with a public ledger, an escrow per inventor that a claim releases, or a donation to the open data sources. It is the founder's call, and until then patent fees go to operations and the ledger is public.

**Graph model**, slice by slice:

- ros-patents 2 adds the node kind `patent`: to `NodeKind` in `src/lib/research-os/types.ts`, to the node kind check constraint in a migration, and to `WORK_NODE_KINDS` in `directions.ts`. Provenance holds `{type: "patent", number, jurisdiction, grant_date, cpc, assignees, inventors, license, source, attribution}`, with the first independent claim as the summary. `branch` is required, so each patent takes the graph branch its main CPC class maps to, with the map written in ros-patents 1.
- ros-patents 2 writes edges of the existing kind `cites`: a patent citing a patent, and a patent citing a paper when the paper is a literature or canon node, with the link's source and confidence in its provenance. `cites` is not in either walk set of `directions.ts`, so "where it leads" does not follow citations; patents reach the walk through the edges of ros-patents 4.
- ros-patents 4 proposes `derives_from` edges from a patent to the ideas its claims combine, through the decompose-further queue, reviewed at `/research-os/edges`. That needs `isIdeaNode` in `src/lib/research-os/idea.ts` to admit patents as targets.

**Where a researcher meets it**, level by level:

- **Access.** A patent's own page at `/research-os/n/<slug>` shows its claims, its citations both ways, and its source with attribution. Search returns patents beside papers and canon. Both come in ros-patents 2.
- **Awareness.** An idea's node page lists the patents that cite its papers or rest on it (ros-patents 2), and later the patents it leads to.
- **Understanding.** A claim reads as the ideas it combines, in the "made of" section (ros-patents 4).
- **Production.** The production form checks prior art before a production is submitted, and the node page offers the same check (ros-patents 3). Invention disclosure becomes a production kind (ros-patents 4).
- **Agents.** The MCP endpoint in `src/app/api/mcp` gets a `patents_search` tool over the service, so an agent working beside a researcher reaches the patent record the way it reaches the literature.

The split of work is the human-AI-computer one this epic serves:

- **The computer** holds the index and ranks prior art by text, vectors, and CPC overlap.
- **The model** proposes what a claim combines and writes the insight summaries.
- **The researcher** reads both, judges novelty, and approves or rejects each proposed edge.

**Changes outside this repository, logged for their own sessions:**

- **feed402**, with hours logged to `feed402/TIMELOG.md`:
  - The §6.1 prose names EPO OPS on the query tier and WIPO on the insight tier. It should match the v1 table above.
  - The EP and WO rights blocks in §6.1.1 and the fixture `fixtures/v0.3/insight-rights-patents-jurisdiction.json` need the same change, and so do the comments in `routes/patents.ts`.
  - The spec should name the reader profile and the `attribution` field.
- **The x402 research gateway** needs the four changes above, the patent routes, a mainnet facilitator, and a look at its insight price. Its feed402 manifest gives `research@viatika.ai` as the contact, which is a vendor's address.
- **`local/patents/scripts/05-serve.ts`** needs the current `mountPatents` call. It lives in this repository and is part of ros-patents 2.

`docs/PATENT_LICENSING.md` and `docs/FEED402_PATENTS.md` carry the corrections found here in dated blocks at their tops: PatentsView's paused API, the OPS terms, the free EPO bulk data with its terms unread, WIPO's paid licence, Reliance on Science's licence, and Lens paid for any commercial or integrated use, with a 14-day trial otherwise ([Lens API access](https://support.lens.org/knowledge-base/lens-patent-and-scholar-api/), updated 2026-05-21).

**Waiting on the founder**, each with a default the loop follows until he answers:

1. **An account for the bulk data.**
   - The default is the BigQuery sandbox under his Google account: no billing, a monthly free allowance of query and storage, enough for one CPC slice exported once.
   - The option is a USPTO.gov account with MFA for the PatentsView tables on ODP, which add disambiguated assignees and inventors and the non-patent literature references.
   - ros-patents 2 needs one of them.
2. **Where patent citation fees go.** The default is Bucket's operations, with a public ledger. The options are an escrow per inventor that a claim releases, or a donation to the open data sources.
3. **The IP stance before disclosure becomes a production.**
   - The default is defensive publication: Bucket publishes disclosures openly as prior art and files nothing.
   - The options are filing and pledging the patents open, or holding disclosures back until counsel reviews.
4. **Who owns the mainnet money path.** The gateway runs on a testnet facilitator, with one receiving address and a vendor contact.
   - The default is Coinbase's CDP facilitator under a Bucket-owned CDP account, a Bucket wallet receiving patent fees on Base, and a Bucket contact in the manifest.
   - The option is x402-rs run by Bucket.

**Slices after this one:**

- ros-patents 1 (the research memo) fills this file with the prior work on patents in discovery and picks the CPC slice.
- ros-patents 2 loads the corpus and writes patent nodes and links.
- ros-patents 3 builds prior-art search.
- ros-patents 4 decomposes claims into elements and adds disclosure.

The gateway routes go live with ros-patents 2, once a real `PatentsRepo` has data behind it.
