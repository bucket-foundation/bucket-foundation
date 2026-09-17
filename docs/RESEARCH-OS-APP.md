# Research OS Application

Research OS is the product (`learning/research-os/INTEGRATION-PLAN.md`). The site has two faces of it: the landing at `/research-os`, which explains the five levels to a visitor, and the application under `/research-os/(app)`, which a signed-in person works in.

## Shell

`src/app/research-os/(app)/layout.tsx` checks the session, loads the identity row and staff roles, and renders `AppShell.tsx`: a sidebar on wide screens with the person's chip and two groups, a tab bar on phones, and one content column. Every page in the group renders inside it; the route group keeps the URLs unchanged.

| Group | Item | Route |
|---|---|---|
| learn | Home | `/research-os/home` |
| learn | Workspace | `/research-os/workspace` |
| learn | Learn | `/research-os/learn` |
| learn | Map | `/research-os/map` |
| learn | Profile | `/research-os/profile` |
| teach | Class | `/research-os/class` |
| teach | Review | `/research-os/review` |
| teach | Roster | `/research-os/roster` |
| teach | Edges | `/research-os/edges` |

The teach group shows for an email on `RESEARCH_OS_REVIEWER_EMAILS` or a teacher or librarian membership in any class (`isClassStaffAnywhere` in `src/lib/research-os/class-db.ts`).

## Home

`/research-os/home` is where sign-in lands. It reads the person's game state (`/api/research-os/profile`), open assignments (`/api/research-os/assignments?mine=1`), and the current path (`/api/research-os/route` plus `/api/research-os/state`), and shows: level, XP, streak, and badges; what to continue; where the person stands on the current chain with a level chip per node; the open questions on the branch; and a prompt to finish the two-question profile when it is missing.

## Learn

The Academy runs inside the shell as the Learn module (`src/app/research-os/(app)/learn`). The engine is a TypeScript port of the Academy app's scheduler and learning loop (`src/lib/academy/fsrs.ts`, `engine.ts`: FSRS-5, leverage, the encompassing map, the daily route, grading with proficiency and FIRe credit, streaks, the cross-device merge; tests in `scripts/test-academy-engine.ts`). The corpus is the same 358-atom set, read from `/academy-app/corpus`. Progress keeps the Academy's local keys (`bucket-academy/v1/<branch>`) and syncs to `bucket.academy_progress` through `/api/academy/progress` with the site session (`src/lib/academy/progress-store.ts`).

Surfaces: `/research-os/learn` (every deck with the person's progress), `/research-os/learn/[branch]` (summary, today's route, the atoms by shell with mastery), `/research-os/learn/[branch]/[atom]` (the lesson at three depths with the full text and equations, then retrieval at the depth mastery calls for), `/research-os/learn/[branch]/study` (today's route one item at a time). `/academy?branch=&atom=` redirects to the same atom, so every older link holds. A Research OS node's Learn link (`learnTargetFor`) opens its atom here.

## Map

The canon globe (`src/app/canon/CanonGlobeMount.tsx`, the same component as the public `/canon/search`) runs inside the shell at `/research-os/map` with `workspaceLinks`: the drawer's first action on a claim or figure is "work on this", which opens the workspace with that title as the Find query (`/research-os/workspace?q=`). The workspace's Map block links back to the map with the node's title.

## Class

A teacher creates a class from the home page (`ClassesPanel`, `POST /api/research-os/classes {action: "create", name}`); the class gets a join code and the creator a teacher membership, and `reviewer_email` is set to the creator so the class grid and the review queue scope to them. Anyone enters a code to join as a learner; staff change roles on the roster. The reviewer gate (`verifyReviewer`) accepts a teacher or librarian membership beside the env allowlist, and the shell shows the teach group on the same test. Migration `20260916020000_research_os_class_codes.sql`; library `src/lib/research-os/classes.ts`.

## Learn to graph

Every write to `/api/academy/progress` runs `syncAcademyMastery` (`src/lib/research-os/learn-sync.ts`): each atom whose fused mastery meets `MASTERED_THRESHOLD` moves its ingested node (provenance type `academy_atom`, matched on deck and atom id) to Understanding through `onAcademyMastery`, which records the evidence and awards XP like every other transition. The same person reads one state in Learn, the workspace, and home.

## Productions

`graph.productions.kind` is `production`, `extension`, `replication`, or `peer_review`; `related_node_id` names the node acted on. The workspace's produce block on a node starts an extension, a replication, or a peer review of it in the Production form. On approval the production becomes a node of the matching kind in the target's branch, owned by the learner, with an edge to the node it acts on (`derives_from` the target for a production; `extends`, `replicates`, `reviews` otherwise), so accepted work is on the graph and citable (`src/lib/research-os/production-node.ts`; migrations `20260916030000` and `20260916030001`).

## Sharing with a class

The access block on a node lets its owner grant view to a whole class (`grantAccess` with the `class:<id>` group), from the classes the person belongs to.

## Internalization on home

`/api/research-os/connections` (`src/lib/research-os/connections.ts`) reads the person's understood nodes and every edge other than a prerequisite between them and nodes in other branches: a held connection when both ends are understood, a bridge one step away when one is. The home panel "across branches" lists both, each opening the workspace on the node, so the next transfer target is the one the graph names.

## Imports with content

An import with a public URL is fetched on the server (`src/lib/research-os/import-fetch.ts`: http(s) only, no local or private hosts, 8 s, 1 MB, HTML stripped to text). The node gets the first 600 characters as its summary and up to 6,000 as `worked_example.text`, so the workspace's quote and check tools read the source. A failed fetch leaves the import as a title and a link.

## End to end

`npm run e2e` (`playwright.config.ts`, `tests/e2e/loop.spec.ts`) runs the loop as a person against the dev server and the local stack: the sign-in redirect, an email code from the mail catcher, home, a deck and an atom with a graded drill, the workspace, the map, the account page, sign out. `E2E_CHROME` points it at a system Chrome; `E2E_BASE_URL` and `E2E_MAIL_URL` override the defaults. The site-ci workflow runs the same suite on demand (workflow_dispatch) over a fresh local stack.

## Primitives

`src/components/ui/index.tsx`: `PageHeader`, `Panel`, `LoadingState`, `EmptyState`, `ErrorState`, `StageChip`, and the button and link class constants. New surfaces use these; older pages move over as they are touched.

## States

Every data block passes through loading, empty, and error states from the primitives. API failures show a retry; a 503 from an unconfigured deployment shows the same copy the routes return.
