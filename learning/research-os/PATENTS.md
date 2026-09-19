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
