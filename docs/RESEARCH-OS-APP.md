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

## Primitives

`src/components/ui/index.tsx`: `PageHeader`, `Panel`, `LoadingState`, `EmptyState`, `ErrorState`, `StageChip`, and the button and link class constants. New surfaces use these; older pages move over as they are touched.

## States

Every data block passes through loading, empty, and error states from the primitives. API failures show a retry; a 503 from an unconfigured deployment shows the same copy the routes return.
