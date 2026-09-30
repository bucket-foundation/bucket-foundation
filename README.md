# bucket.foundation

> **build history.** *(the original slogan, still load-bearing)*
> **bucket is the new renaissance.** *(the thesis it became)*
>
Bucket is a free-to-read, paid-to-cite research canon with Research OS and a desktop app for studying it offline. Foundations, brilliant humans and AI work on an open substrate, and citation fees route back to the people who write the foundations.

**Open-source research data protocol.** The reader pays nothing and needs no wallet. The bucket operator pays for a paper once, server-side, and the citation fee routes to the author forever. No gatekeepers.

**[Download](https://www.bucket.foundation/download)** the `bkt` terminal app for your system, open [Research OS](https://www.bucket.foundation/research-os) in the browser, or browse [every release](https://github.com/bucket-foundation/bucket-foundation/releases).

## Install

`bkt` 0.4.0 is a signed terminal app for Linux, macOS and Windows. The installers pick your architecture, verify the release signature and checksum, and put `bkt` on your path. Drop `BKT_VERSION` to take the latest release.

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/bkt-v0.4.0/scripts/install.sh -o install.sh
BKT_VERSION=0.4.0 sh install.sh
```

Windows, in PowerShell:

```powershell
iwr https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/bkt-v0.4.0/scripts/install.ps1 -OutFile install.ps1
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Then run `bkt init` and `bkt`. A new install starts on your first quiz, and every answer stays on your computer. The Linux desktop app ships as `Bucket-0.4.0-x86_64.AppImage` on the [release page](https://github.com/bucket-foundation/bucket-foundation/releases/tag/bkt-v0.4.0). Commands and storage details are in [`packages/bkt/README.md`](./packages/bkt/README.md).

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![protocol](https://img.shields.io/badge/protocol-x402-purple.svg)](./PROTOCOL.md)
[![manifesto](https://img.shields.io/badge/read-MANIFESTO.md-red.svg)](./MANIFESTO.md)
[![status](https://img.shields.io/badge/status-alpha-orange.svg)](#status)

---

> *"The first Renaissance happened because a few hundred people in a few cities had the right tools, the right foundations, and a working patronage layer at the same time. The second Renaissance is happening because the same three things are aligning again, on a planet of eight billion people, with an AI that fits in your pocket."*
>, [`MANIFESTO.md`](./MANIFESTO.md)

## For AI agents

bucket.foundation exposes a zero-key, budget-capped research proxy so any
LLM/agent can discover and query the canon without holding a wallet:

```bash
curl -s "https://www.bucket.foundation/api/research?q=mitochondrial+function&tier=insight"
```

Every response is a feed402/0.2 envelope: `{ data, citation, receipt }`.
Full playbook at [`/llms.txt`](https://www.bucket.foundation/llms.txt) and
[`/llms-full.txt`](https://www.bucket.foundation/llms-full.txt). Discovery
manifest at [`/.well-known/feed402.json`](https://www.bucket.foundation/.well-known/feed402.json).
MCP server manifest at [`/.well-known/mcp.json`](https://www.bucket.foundation/.well-known/mcp.json).

## What it is

`bucket.foundation` is an open protocol and a reference publishing site for research that can be **paid for once and cited forever**.

- The bucket *operator* pays for a paper once, server-side, over **[x402](https://x402.org/)**, HTTP-native micropayments on an L2. The reader never pays, signs, or holds a wallet.
- The paper lands in a **bucket**, a content-addressed folder with a sidecar manifest (`canon.json`) that records provenance, license, and citation metadata.
- Any downstream agent, research tool, or human can cite the bucketed paper from a local copy, forever, at zero marginal x402 cost.
- Citations route fees back to the author through a simple on-chain receipt, bypassing publishers.

This repo contains:

1. **`PROTOCOL.md`**, the open spec (sidecar schema, x402 endpoint shape, canon contract).
2. **`src/`**, Next.js site at [bucket.foundation](https://www.bucket.foundation), the reader UI + JSON API.
3. **`bucket-canon/`**, 599 curated claim cards across 9 branches + 17 detected multi-branch primitive bridges.
4. **`mcp-server/`**, local MCP server for Claude Desktop/Code (`canon_search`, `canon_get_claim`, etc.).
5. **`_intake/`**, embeddings, knowledge graph, trained ML artifacts. See [`REPRODUCE.md`](./REPRODUCE.md).
6. **`tools/`**, pipeline tools (`agf-*`) referenced from `~/agfarms/tools/`.
7. **`LICENSE`**, MIT.

## Map

| Surface | URL | What |
|---|---|---|
| **Website** | https://www.bucket.foundation | Read canon, browse bridges, search |
| **Access page** | https://www.bucket.foundation/access | Every entry point for humans, researchers, and AI agents |
| **API** | https://www.bucket.foundation/api/canon/search | Search canon claims as JSON |
| **MCP server** | `mcp-server/bucket-mcp.py` (this repo) | One server, 7 tools, Claude Code / Desktop. (The old standalone `bucket-mcp` repo is now archived.) |
| **Research artifacts** | [BucketDrive](https://drive.google.com/open?id=12QjkHYFqzVNm30kvkW-upi0kqa_Kri2B) (Google Drive) | PDFs, raw data, large research artifacts. The dormant `bucket-research` repo was retired 2026-05-15; all canon content lives here under `bucket-canon/` and `canon-figures/`. |
| **Upstream gateway** | https://github.com/AGFarms/x402-research-gateway | The feed402/x402 rail behind /api/research |
| **Agent-trust write-up** | https://www.bucket.foundation/protocol/agent-trust | Why a safety-tuned agent refused the protocol, why it was right, and the structural fix. Source: [`docs/AGENT-TRUST.md`](./docs/AGENT-TRUST.md) |

## The thesis in one paragraph

Research access is broken. Readers pay publishers for papers they may not need. Authors pay publishers to print what they already wrote. Independent researchers can't cite what they can't afford, and can't read what they can't cite. `bucket.foundation` flips the loop: **the paper is a one-time x402 purchase with forever citation rights.** A bucket is a durable, content-addressed copy of a paper plus a sidecar manifest. Once a bucket exists, the marginal cost of citing that paper is zero; the fee attached to each citation flows to the original author, bypassing a publisher that already got paid. The protocol is open and the reference implementation is MIT-licensed so anyone can run a bucket, federate, mirror, and compete.

## The protocol
In 90 seconds.

```
┌──────────┐    x402 payment      ┌──────────────────┐
│  client  │ ───────────────────► │  paper source    │
│ (agent,  │                      │ (any x402-gated  │
│ reader,  │ ◄─── paper + hash ── │  research API)   │
│  app)    │                      └──────────────────┘
└────┬─────┘
     │ write to bucket
     ▼
┌──────────────────────────────────────────┐
│  bucket/<sha256>/                        │
│    paper.pdf        ← the paper itself   │
│    canon.json       ← sidecar manifest   │
│    receipt.x402     ← payment receipt    │
└──────────────────────────────────────────┘
     │
     ▼  citeable forever, zero marginal cost
```

A bucket is just a folder. A sidecar is just JSON. An x402 endpoint is just HTTP 402. There is nothing novel to deploy, the novelty is the convention, the license, and the citation economics built on top.

## Run the site locally

```bash
git clone https://github.com/bucket-foundation/bucket-foundation
cd bucket-foundation
cp .env.example .env.local    # fill in your keys
npm install
npm run dev                   # http://localhost:3000
```

See **[PROTOCOL.md](./PROTOCOL.md)** for the spec. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** to help.

## Status

| Piece | State |
|---|---|
| Reference site | Live at [bucket.foundation](https://www.bucket.foundation) |
| Research OS | Live at [bucket.foundation/research-os](https://www.bucket.foundation/research-os) and [research.bucket.foundation](https://research.bucket.foundation), one sign-in across both |
| Protocol spec (`PROTOCOL.md`) | Draft v0.1 |
| Sidecar schema (`canon.json`) | Draft v0.1 |
| `bkt` offline terminal app | 0.4.0 for Linux, macOS and Windows, signed, installed with `scripts/install.sh` or `scripts/install.ps1` ([release](https://github.com/bucket-foundation/bucket-foundation/releases/tag/bkt-v0.4.0)) |
| Bucket desktop app | 0.4.0 Linux x86_64 AppImage; macOS and Windows installers in a later release |
| BucketMath Lean library | In `lean/`, checked in CI |
| Federation / mirroring spec | Not yet drafted |
| Open contributors welcome | **Yes** |

## What's new

September 2026. The full feed lives at [bucket.foundation/whats-new](https://www.bucket.foundation/whats-new).

- **Research OS workbench.** A tool registry and an MCP server so agents and people work in one place (#365).
- **Work quiz.** A timed quiz built from beads, PRs and notes, graded on the server, with misses turned into review cards (#351).
- **BucketMath.** A Lean 4 library, including a proof that learning prerequisites first gives the shortest path to a concept (#362, #363, #368).
- **Solvability atlas.** 156 problem and theorem cards across the seven branches, with the token circle, star charts, helix and sphere plots (#376).
- **Offline `bkt` app.** A terminal quiz and review that works with no network, encrypts answers, and gives each computer its own key (#374).
- **`bkt analyze`.** Checks a data file's form, runs the helix generator, then a full analysis suite (#380).
- **Download page and signed releases.** Email capture with consent, a signed link per person, and an installer that verifies every download (#372, #373).
- **research.bucket.foundation.** Serves Research OS, with one sign-in across both hosts (#381).

## Active canon

The canon holds foundations only: axioms, laws, principles and primary derivations. It lives in [`bucket-canon/`](./bucket-canon/) and is searchable on the [home page globe](https://www.bucket.foundation).

| Branch | Canon files |
|---|---|
| [Mathematics](./bucket-canon/01-mathematics/) | 46 |
| [Physics](./bucket-canon/02-physics/) | 149 |
| [Chemistry](./bucket-canon/03-chemistry/) | 31 |
| [Information](./bucket-canon/04-information/) | 22 |
| [Biophysics](./bucket-canon/05-biophysics/) | 227 |
| [Cosmology](./bucket-canon/06-cosmology/) | 60 |
| [Mind](./bucket-canon/07-mind/) | 120 |
| [Deep history](./bucket-canon/08-deep-history/) | 48 |
| [Sacred texts](./bucket-canon/09-sacred-texts/) and [Art](./bucket-canon/09-art/) | 20 |
| [Bridges](./bucket-canon/_bridges/) between branches | 43 |

The site indexes 599 source excerpts, 114 figures and 47 sites. Counts are from 2026-09-29.

## *build history*
The contributor index.

The original bucket slogan, before *bucket is the new renaissance*, was **build history**. The renaissance is the thesis. Build history is the verb. The verb produces a **contributor index**: contact cards for the figures who built the foundations the canon is made of.

→ [`canon-figures/`](./canon-figures/), pass-1 seed, ~76 figures across 10 branches (the seven strict-canon branches plus three expansion branches: *tradition*, *art*, *earth sciences*). Read [`canon-figures/README.md`](./canon-figures/README.md) for the editorial standard, or jump straight to [`canon-figures/CONTRIBUTORS.md`](./canon-figures/CONTRIBUTORS.md) for the master index.

The index is *not* a hall of fame. It is a record of *who built what foundation*, attached to the canon, so that any reader of a bucketed paper can trace any term, any law, any axiom back to the human who first wrote it down. Pass 1 is the floor, well below the ceiling; most of the work is ahead.

## Prior art & credits

- **[x402](https://x402.org/)**, the HTTP 402 micropayment protocol this builds on.
- **Research gateways** that expose x402 endpoints on top of PubMed, arXiv, OpenAlex, PubChem, `bucket.foundation` consumes these.

Story Protocol minting was removed in 2026-06; citations settle over x402 on Base.

## Governance
Bucket.foundation is a nonprofit.

`bucket.foundation` is a foundation. It is operated as a **nonprofit**. No equity, no investors, no exit.

- **Mission:** make primary research paid-for-once and citeable-forever, and route citation fees to authors.
- **No profit extraction.** Any revenue from operating the reference infrastructure (hosting buckets, running x402 buyer wallets, maintaining the canonical registry) goes back into operations and author payouts. If there is ever a surplus, it funds more research access, grants, mirror subsidies, bandwidth for developing regions.
- **The protocol is MIT.** Anyone, nonprofit, for-profit, individual, university, lab, can run a bucket. You do not need permission from the Foundation to participate in the network. The Foundation runs **a** bucket, not **the** bucket. There is no authoritative node.
- **Why "foundation"?** Two reasons that reinforce each other: (1) legally, this is a nonprofit foundation organization; (2) structurally, the canon holds only **foundations**, axioms, real math, rules, laws, principles, primary derivations. Outcomes (longevity, disease, cognition, climate) are downstream applications, one layer below canon. A foundation of foundations.

Full governance notes: see [`GOVERNANCE.md`](./GOVERNANCE.md).

**Supporting the project.** Until a formal donations page is set up, the most useful support is code, review, or mirroring a bucket. Financial sponsorship channels (fiscal sponsor, direct nonprofit donations) will be announced here once formalized. No fundraise is currently open.

## License

- **Protocol spec** (`PROTOCOL.md`), Creative Commons Zero (CC0) equivalent in intent: use it anywhere, no attribution required. See the spec file.
- **Code** (this repo), [MIT](./LICENSE). Fork it.
- **Canon content** published through `bucket.foundation`, each artifact carries its own license in `canon.json`. The Foundation does not relicense authors' work.
