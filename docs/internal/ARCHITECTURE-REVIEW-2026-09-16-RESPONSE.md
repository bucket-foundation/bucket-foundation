# Response to the Architecture Review of 2026-09-14

Reviewer: the Bucket Foundation orchestrator session of 2026-09-15 and 16 (Research OS build). Scope: `docs/internal/ARCHITECTURE-REVIEW-2026-09-14.md`, `docs/PROBLEM-REGISTER.md` (55 rows), `docs/ARCHITECTURE.md`, and the 23 beads the review filed, as merged into `dev` at `0b57b2ebc`. Every claim below was checked against the `site-local-2026-09-14` branch head (`b79a376f5`) and `origin/dev`.

## Verdict

The register is the best systems audit this repo has had: specific files and lines, a severity per row, a fix per row, and an ordered plan. The six P0 rows are real and should drain in the order the register gives, with PR-021 first. Two things need correction before the register becomes the plan of record: two rows are stale against `dev`, and the target architecture's product model contradicts the product decision the founder made on 2026-09-15 and is building against.

## P0 rows, verified

| Row | Verified | Evidence on the branch head |
|---|---|---|
| PR-021 Story signing key in a client-imported module, logged | Confirmed | `src/lib/story/index:17` logs `NEXT_PUBLIC_WALLET_PRIVATE_KEY`, line 22 logs the key again; imported by `src/app/research/PublishForm.tsx` and `src/app/knowledge/page.tsx`. First fix of the drain. |
| PR-001 anon-key browser writes to `public.*` | Confirmed | `src/context/AuthorContext:27,41` and `CiteTokensContext:25,58` write through the anon client. |
| PR-003 CORS `*` on API proxies, `canon/search` claims a limit it lacks | Confirmed | `src/lib/research-tools/proxy.ts:46` sets `access-control-allow-origin: *` (lowercase, which a case-sensitive grep misses); `canon/search/route.ts:11` says "rate-limited via standard ip" and no limiter exists. |
| PR-004 three disconnected identity rows | Confirmed and understated | See "Findings the review missed" below: there are three sign-in stacks, and seven pages carry their own sign-in form. |
| PR-002 research-tools gateway open | Not re-verified here (service code outside this branch's scope); the fix is right. |
| PR-022 no real x402 payment | Confirmed | `src/lib/x402-pay.ts:15,76` return `null`; `feed402-client.ts:84` emits `stub-signed` or `unsigned`. |

## Rows that are stale against dev

- **PR-010** "branch holds 2 of 18 migrations; `graph` schema code ships without its DDL." True of the review's own base (`run/quantum-history-001`), false on `dev`: `origin/dev` carries 18 migrations, the `site-local-2026-09-14` branch 23 (five new on 2026-09-15). Mark fixed on `dev`; keep the CI drift check as the durable fix.
- **PR-032** "branch policy exists only on an unmerged branch." The policy is in the venture `CLAUDE.md` on `dev` and in the org `CLAUDE.md` (`a161419`, 2026-09-14). Mark fixed; the remaining half, rebasing `run/*` onto `hte/integration`, stays open.

## Findings the review missed

1. **Three sign-in stacks, seven sign-in forms.** Supabase email one-time code (Academy app, every Research OS page, `canon/signoff`), NextAuth v4 at `src/app/api/auth/[...nextauth]` (used by `/api/chat` and `src/lib/auth.ts`), and Dynamic web3 (`Web3Providers.tsx`, the canon publish flow). Each of `research-os/{workspace,class,review,roster,edges,profile}` and `canon/signoff` renders its own OTP form and holds its own token in component state; API routes take a pasted Bearer token. There is no site-wide session, no protected-route middleware (the only middleware gates `/kruse`), no account page, and no sign-out that covers the site. This is the identity problem PR-004 names, seen from the user's side; it is the first thing the product needs.
2. **Research OS is absent from the as-is and from the product model.** The review's "System as-is" and the register mention Research OS once, in passing. On `dev` it is 16 migrations (23 on the landing branch), 20 API routes, seven pages, 33 test scripts (494 tests), the hypothesis-engine seam, the Academy ingestion, and the plan and literature under `learning/research-os/`. An architecture that omits it describes a different product than the one being built.
3. **The Academy iframe keeps its own session.** `learning/app/js/auth.js` creates its own Supabase client with `storageKey: "bucket-academy/auth"`, so a person signed in on the site is signed out inside the framed app until they sign in again. Any site-wide session must bridge into the frame.

## The product-model conflict

`docs/ARCHITECTURE.md` "Product" states: "One loop: read canon, cite, author gets paid over x402 on Base, agents discover via feed402. Every surface either serves the loop or lives in `apps/labs`," with tiers Reader, Author, Agent, Admin, and the Academy filed under Reader.

The founder's decision of 2026-09-15 (`learning/research-os/INTEGRATION-PLAN.md`, from the requirements questionnaire) states: Research OS is the product; every surface built lives inside it; the canon and the citation rail are its backbone; K-12 is the first audience and libraries the first venue; the five words are levels of interaction with the graph; the first release runs without a model.

These are two different products. The register's engineering rows hold under either; the "Product" section, the `apps/web` versus `apps/labs` split, and the tier table do not. Reconciliation, applied to `ARCHITECTURE.md` in this commit: the product is Research OS; the citation loop is its backbone and its revenue path (the register's rows 5 and 8 stay as written); the tiers become identity facts on one account rather than product tiers; `apps/labs` holds only what the module map in INTEGRATION-PLAN.md section 9 freezes.

## What the register gets right that the Research OS build should adopt now

- `app.identities` keyed on `auth.users.id`, unique wallet and handle: the identity table the site-wide session needs. Adopt as the first migration of the auth work.
- The Academy stack as the reference pattern for every user-data route: verified caller, service-role client, private schema, per-user filter in code, RLS second. The Research OS routes already follow it; the site-wide session replaces the pasted Bearer token with a cookie session read server-side, and the pattern holds.
- `app.spend_ledger` before any model is turned on in Research OS (`RESEARCH_OS_LLM_ENABLED` stays off until then).
- The CI gate (lint, tsc, build, pytest, migration drift). The Research OS suite runs from `npm run test:research-os`; the gate should include it.

## Ordered plan, reconciled

1. Register rows in the review's own order for security and data: PR-021, PR-001, PR-002, PR-003, then PR-009 and PR-010's drift check. (Being drained by the review's session.)
2. System-wide auth: Supabase cookie sessions through `@supabase/ssr` in middleware, server components, and route handlers; one `/sign-in`; one account page; NextAuth retired; Dynamic reduced to a linked wallet on `app.identities`; the seven per-page forms removed; the Academy frame bridged. (This session, on the landing branch.)
3. The Research OS shell as an application: one layout with persistent navigation, page templates, loading and empty and error states, the design pass on every new surface, Playwright flows over sign-in and the core loop. (This session.)
4. Register rows 4 to 11 as written.

## Register edits in this commit

- PR-010 and PR-032 status notes (stale against `dev`).
- New rows PR-056 (three sign-in stacks and seven sign-in forms), PR-057 (Research OS absent from the as-is and the product model), PR-058 (the Academy frame's separate session).
- `ARCHITECTURE.md` "Product" rewritten to the founder's decision; the rest of the document unchanged.
- One bead: system-wide auth.
