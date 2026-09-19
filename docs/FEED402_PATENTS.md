# feed402 Patent Endpoints

**Bead:** `bkt-zx6` (route surface) · sibling `bkt-5qg` (USPTO Postgres schema)
**Spec:** [feed402 `SPEC.md §6.1`](https://github.com/gianyrox/feed402/blob/master/SPEC.md#61-patents-service-reference-implementation-bkt-zx6), *(local-only repo, no public remote yet, see `~/agfarms/feed402/SPEC.md`)*
**Licensing matrix:** [`PATENT_LICENSING.md`](./PATENT_LICENSING.md)
**Schema source of truth:** [`/data/patents/uspto/schema/uspto.sql`](../data/patents/uspto/schema/uspto.sql)

## Corrections of 2026-09-19

`learning/research-os/PATENTS.md` records the checks behind these. The text below this block is kept as written.

- The v1 corpus is US grants under CC BY 4.0 alone. EPO data, through OPS or the EPO's free bulk products, waits on the EPO's raw-data terms, and WIPO PATENTSCOPE content needs a paid derivative licence before any tier carries it.
- The route surface mounts seven routes: the six below and `/citation`.
- The local serve script `local/patents/scripts/05-serve.ts` calls `mountPatents` with an older signature and needs updating before it serves.
- The x402 research gateway now serves US patents through its USPTO ODP adapter ([x402-research-gateway#64](https://github.com/bucket-foundation/x402-research-gateway/pull/64)), and the protocol changes these corrections imply are tracked in [feed402#12](https://github.com/bucket-foundation/feed402/issues/12).
- feed402 has public remotes, `gianyrox/feed402` and `bucket-foundation/feed402` on GitHub; the "local-only repo" note below is out of date.

## Routes

The reference feed402 server exposes six patent endpoints across the three
standard tiers (raw $0.010 / query $0.005 / insight $0.002):

| Method | Path | Tier | Purpose |
|---|---|---|---|
| GET | `/patents/search` | query | Faceted search, text, CPC/IPC class, date range, jurisdiction, point+radius |
| GET | `/patents/{id}` | raw | Full grant bundle: grant + claims + backward citations + inventors + assignees + locations |
| GET | `/patents/by-coord` | query | Point-radius geographic search (postcode/lat-lng resolved through `uspto_location`) |
| GET | `/patents/family/{id}` | query | INPADOC-style family of cross-jurisdiction equivalents |
| GET | `/patents/citations/{id}` | query | Citation graph (direction = `forward` \| `backward`) |
| GET | `/patents/insight` | insight | NL question → top-k summarized hits with §3.2 retrieval provenance |

## v1 corpus

Per `docs/PATENT_LICENSING.md` (§v1 verdict): USPTO + Google Patents BigQuery
(both CC-BY 4.0) + EPO OPS bibliographic (citation-only, fair-use cap).
WIPO PATENTSCOPE content is admitted **only** on the `/patents/insight` tier
under the WIPO derivative-license clause. Lens, IFI CLAIMS, KIPO, CNIPA, JPO
are deferred to v2 pending paid-license budget.

## Citation envelope

Every response returns a feed402 §3 envelope. The `citation.license` field is
jurisdiction-aware, `CC-BY-4.0` for US, `EPO-OPS-fair-use` for EP,
`citation-only` for WO and any other passthrough jurisdiction. `canonical_url`
resolves to USPTO/Google Patents (US), Espacenet (EP), or PATENTSCOPE (WO).

## Implementation status

- Route surface + types: **shipped** (bkt-zx6)
- Postgres schema: **shipped** (bkt-5qg → `data/patents/uspto/schema/uspto.sql`)
- Mock repo for `demo.sh`: **shipped** (bkt-zx6)
- Real Postgres repo (data load): **pending** (bkt-5qg load step)
- pgvector embeddings on `uspto_claim`: **queued** (bkt-sq8)
- PostGIS geom on `uspto_location`: **queued** (bkt-nk7)
