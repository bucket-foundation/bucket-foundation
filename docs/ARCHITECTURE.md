# Architecture

How bucket.foundation is built today. `docs/AUTH.md` covers sign-in, `docs/RESEARCH-OS-APP.md` covers the application, `docs/MCP.md` covers the agent endpoint.

## Product

Research OS is the product. The canon and the citation envelope are its backbone: read canon, cite it, and let agents discover the graph through feed402. A learner, a teacher and an agent see one graph at different levels of interaction: Access, Awareness, Understanding, Internalization and Production. The first release runs without a model.

## Runtime

| Part | Where it runs | Job |
|---|---|---|
| Web app | Next.js on Vercel, `src/app` | Canon, protocol, download, Research OS, Academy, `/api/*` routes |
| Database | Local Supabase first, hosted project on the same migrations | Auth, Research OS graph, Academy progress, identities |
| Canon content | `bucket-canon/` in git | Read at request time through `src/lib/canon-fs.ts` |
| Research tools | `services/research-tools` (FastAPI `gateway.py`) | The tool proxies under `/api/research/*` |
| Photon API | `services/photon-api` | Polingual photon index |
| Engine | `hte-serve` from `tools/hypothesis-engine` | Hypothesis campaigns over HTTP |
| Terminal and desktop app | `packages/bkt`, `packages/bkt-ui` | Offline study on the learner's computer |

Branches: `main` is production and takes merges from `dev` only. `dev` is the PR target. Engine work targets `hte/integration`, which Vercel never builds.

## Database

`supabase/config.toml` defines the local stack: Postgres, Auth, PostgREST and Inbucket. `npm run db:local` starts it, `npm run db:local:status` prints the keys for `.env.local`, and building or testing needs no hosted project. Migrations live in `supabase/migrations`. The hosted project takes the same files through `npx supabase db push`.

Schemas `graph` and `bucket` are exposed to PostgREST. Handlers reach private tables through the service-role client after `verifyRequestUser` (`src/lib/auth/verify.ts`) has named the caller, and RLS stays on as a second layer.

| Data | Store |
|---|---|
| Identity | `bucket.identities`, keyed on `auth.users.id`, unique handle and wallet |
| Research OS graph, edges, productions, classes | `graph.*` through `src/lib/research-os/db.ts` |
| Academy credentials | `bucket.academy_credentials` behind `/api/academy/*` |
| Download and launch-list signups | Vercel Blob through `src/lib/waitlist/store.ts` |
| Canon claims and evidence | files under `bucket-canon/`, never the database |

## Research OS

The landing is `/research-os`; the application sits under `/research-os/(app)` and reads `/api/research-os/*`. One node graph holds Academy atoms, canon claims, papers, figures and productions, each with a `provenance.type`. The shared wire shape is `src/lib/research-os/contract.ts`. Requests from an agent carry a Bearer token and go through the same verifier as a browser session.

## Packages

| Package | Job |
|---|---|
| `packages/bkt` | The `bkt` terminal app: quiz and FSRS review over an encrypted local SQLite store, `bkt analyze`, and `bkt serve`, which listens on 127.0.0.1 behind a per-launch nonce |
| `packages/bkt-ui` | The desktop window: a Vite and React build of the Research OS views that `bkt serve` serves and `bkt app` opens in a browser window |
| `packages/ros-contract` | Tests that hold the contract shared by the site and the window: golden fixtures, mocks and a check that the shared views import nothing from Next, Supabase or `localStorage` |

The desktop window is the `bkt-ui` build packaged with the `bkt` binary as an AppImage (`scripts/release/build-appimage.sh`). No `bkt-mobile` package exists yet. The runtime-neutral test in `ros-contract` keeps the shared views loadable outside Next, which a mobile client would need.

## Release pipeline

A tag `bkt-vX.Y.Z` triggers `.github/workflows/bkt.yml`:

1. `bkt`, `ros-contract` and `bkt-ui` jobs run tests and typechecks.
2. `binaries` compiles `bkt` for linux-x64, linux-arm64, darwin-arm64, darwin-x64 and windows-x64; `appimage` builds the unsigned AppImage.
3. `sign` signs every artifact with the release key (`scripts/release/ci-sign.sh`) and writes `.sha256`, `.manifest` and `.manifest.sig` beside it. Runs outside a tag use a throwaway key.
4. `install` runs `scripts/install.sh` and `scripts/install.ps1` on five runners, rejects a tampered binary, and smokes the result against the platform keystore.
5. `publish` attests provenance and uploads to a prerelease with `scripts/release/publish.sh`. `verify-release` reinstalls from the public release, then `promote` marks the release as latest.

The public key is `public/.well-known/bucket-release.pub`. The installers check the checksum and the signature before they write anything.

## Download and updates

`/download` reads the latest release through `src/lib/download/release-v2.ts`, which maps assets by name and skips checksum and manifest files. A reader signs up with email, name and computer, and the page shows the install command. `/api/download` stores the request in Blob and emails a 24-hour link through Resend. Retention is 12 months, enforced by the `download-retention` cron. The daily What's New digest is a `vercel.json` cron group at `/api/cron/whats-new-daily`, fed by `data/whats-new.json`, which the `whats-new` workflow rewrites on every merge to `main`.

## hte-serve

`hte-serve` is `python3 -m hte.serve` on 127.0.0.1:8420, installed as the `hte-serve.service` user unit by `scripts/systemd/install-hte-serve.sh`. The site reaches it through `HTE_SERVE_URL`, from `/api/research-os/hypothesize` and from the MCP `hypothesize` tool. A deployment without that variable reports the engine offline. Contracts are in `tools/hypothesis-engine/docs/PRODUCTION-SCHEMA-ALIGNMENT.md`.

## Citation envelopes

`/api/research` answers with a feed402/0.2 envelope: data, citation, and a receipt with tier, status and `price_usd`. Canon answers carry `price_usd: 0`. Server-side x402 signing is not implemented in `src/lib/x402-pay.ts`, so no settlement runs today. The manifest is `public/.well-known/feed402.json`.

## Secrets

Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `BUCKET_WALLET_PRIVATE_KEY`, `RESEND_API_KEY`, `DOWNLOAD_LINK_SECRET`, `CRON_SECRET`, `WAITLIST_ADMIN_KEY`, `WHATS_NEW_UNSUBSCRIBE_SECRET`. `NEXT_PUBLIC_*` holds the anon key, the site URL and feature flags. `scripts/check-client-bundle-secrets.mjs` fails a build that leaks a server name into the client bundle.
