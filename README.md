# bucket.foundation

**build the past. build history. bucket is the new renaissance.**

Bucket is a nonprofit reference implementation of research that is paid for once and citeable forever. Reading is free. A citation triggers a one-time author payment over [x402](https://x402.org/) (HTTP-native micropayments on Base), so citation fees route to authors. The canon holds foundations only: axioms, real math, laws, principles and primary derivations across seven branches. AI agents discover and query it through the feed402 spec. No equity, no investors, no exit.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![protocol](https://img.shields.io/badge/protocol-x402-purple.svg)](docs/foundation/PROTOCOL.md)
[![manifesto](https://img.shields.io/badge/read-MANIFESTO.md-red.svg)](docs/foundation/MANIFESTO.md)

## Live at bucket.foundation

| Surface | URL |
|---|---|
| Research OS | [bucket.foundation/research-os](https://www.bucket.foundation/research-os) |
| Papers | [bucket.foundation/research/papers](https://www.bucket.foundation/research/papers) |
| Academy | [bucket.foundation/academy](https://www.bucket.foundation/academy) |
| Canon search API | [bucket.foundation/api/canon/search](https://www.bucket.foundation/api/canon/search) |
| Access page | [bucket.foundation/access](https://www.bucket.foundation/access) |
| What is new | [bucket.foundation/whats-new](https://www.bucket.foundation/whats-new) |

## For AI agents

```bash
curl -s "https://www.bucket.foundation/api/research?q=mitochondrial+function&tier=insight"
```

Every response is a feed402/0.2 envelope: `{ data, citation, receipt }`. The playbook is at [`/llms.txt`](https://www.bucket.foundation/llms.txt) and [`/llms-full.txt`](https://www.bucket.foundation/llms-full.txt). Discovery manifests are at [`/.well-known/feed402.json`](https://www.bucket.foundation/.well-known/feed402.json) and [`/.well-known/mcp.json`](https://www.bucket.foundation/.well-known/mcp.json). A local MCP server for Claude Desktop and Claude Code lives in [`mcp-server/`](./mcp-server/); see [`docs/MCP.md`](docs/MCP.md).

## Install bkt

`bkt` is a signed terminal app for Linux, macOS and Windows. The installers pick your architecture, verify the release signature and checksum, and put `bkt` on your path.

```bash
curl -fsSL https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/bkt-v0.4.0/scripts/install.sh -o install.sh
BKT_VERSION=0.4.0 sh install.sh
```

On Windows, run `scripts/install.ps1` in PowerShell. Then run `bkt init` and `bkt`. Every answer stays on your computer. Releases are on the [release page](https://github.com/bucket-foundation/bucket-foundation/releases/tag/bkt-v0.4.0).

## Repository layout

| Path | Contents |
|---|---|
| `src/` | Next.js 14 site and Research OS app (`src/app`, `src/components`, `src/lib`, `src/providers`) |
| `packages/bkt` | `bkt` CLI and TUI: timed quiz and FSRS review over local SQLite |
| `packages/bkt-ui` | Shared UI for the `bkt` window |
| `packages/bkt-desktop` | Desktop app shell for `bkt` |
| `packages/bkt-mobile`, `packages/ros-contract` | Mobile shell and the Research OS API contract |
| `tools/solvability-atlas` | Problem and theorem cards with sourced difficulty records |
| `tools/hypothesis-engine` | `hte`, the history hypothesis engine, served locally by `hte-serve` |
| `tools/` | Pipelines for canon sign-off, evidence search, feeds, figures and posts |
| `bucket-canon/` | Canon claim cards across the branches, plus cross-branch bridges |
| `papers/` | LaTeX papers with Lean 4 proofs ([standards](papers/PAPER-STANDARDS.md)) |
| `lean/` | BucketMath, the Lean 4 library |
| `learning/` | Academy corpus, the standalone Academy app and Research OS plans |
| `mcp-server/` | Local MCP server exposing the canon |
| `supabase/` | Migrations for the local and hosted database |
| `scripts/` | Build, test, ingestion and release scripts |
| `docs/` | Documentation, mapped below |

## Local first

Bucket runs on one machine first. Hosted services are optional.

```bash
git clone https://github.com/bucket-foundation/bucket-foundation
cd bucket-foundation
cp .env.example .env.local
npm install
npm run db:local          # local Supabase stack
npm run db:local:status   # prints the keys for .env.local
npm run dev               # http://localhost:3000
```

[`docs/AUTH.md`](docs/AUTH.md) covers sign-in against the local stack.

## Tests

```bash
node scripts/run-tests.mjs                    # site and library suites
npm run lint && npm run typecheck
cd packages/bkt && bun test                   # bkt CLI and TUI
cd tools/solvability-atlas && pytest          # atlas records and builders
```

## Documentation

| Path | Contents |
|---|---|
| [`docs/foundation/MANIFESTO.md`](docs/foundation/MANIFESTO.md) | Thesis |
| [`docs/foundation/PROTOCOL.md`](docs/foundation/PROTOCOL.md) | The x402 data protocol spec |
| [`docs/foundation/GOVERNANCE.md`](docs/foundation/GOVERNANCE.md) | Nonprofit governance and conflict-of-interest disclosure |
| [`docs/foundation/HISTORY.md`](docs/foundation/HISTORY.md) | Bucket 1.0 (December 2022) to bucket 2026 |
| [`docs/specs/PHOTON-SPEC.md`](docs/specs/PHOTON-SPEC.md), [`docs/specs/POLINGUAL.md`](docs/specs/POLINGUAL.md) | Photon substrate and Polingual |
| [`docs/specs/SHORTS_FORMAT_SPEC.md`](docs/specs/SHORTS_FORMAT_SPEC.md) | Short-video format |
| [`docs/canon/CANON-MASTER.md`](docs/canon/CANON-MASTER.md) | Canon master index, with the ingestion index and truth patterns beside it |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Forward plan |
| [`docs/REPRODUCE.md`](docs/REPRODUCE.md) | Rebuilding the embeddings and graph artifacts |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture |
| [`docs/RESEARCH-OS-APP.md`](docs/RESEARCH-OS-APP.md) | Research OS app |
| [`docs/internal/OPERATIONS.md`](docs/internal/OPERATIONS.md) | Operations runbook |
| [`canon-figures/`](canon-figures/) | Contributor index of canon-tier figures |
| [`nonprofit-application/`](nonprofit-application/) | 501(c)(3) reinstatement packet |

Contributors start with [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md). Release notes are in [`CHANGELOG.md`](CHANGELOG.md).

## License

- Code: [MIT](./LICENSE).
- Protocol spec: Creative Commons Zero in intent. Use it anywhere with no attribution.
- Canon content: each artifact carries its own license in its sidecar. The Foundation does not relicense authors' work.
- Polingual data: Wiktionary via Kaikki, CC-BY-SA, attributed.
