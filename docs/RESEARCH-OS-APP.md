# Research OS Application

Research OS is the product (`learning/research-os/INTEGRATION-PLAN.md`). The site has two faces of it: the landing at `/research-os`, which explains the five levels to a visitor, and the application under `/research-os/(app)`, which a signed-in person works in.

## Shell

`src/app/research-os/(app)/layout.tsx` checks the session, loads the identity row and staff roles, and renders `AppShell.tsx`: a sidebar on wide screens with the person's chip and two groups, a tab bar on phones, and one content column. Every page in the group renders inside it; the route group keeps the URLs unchanged.

| Group | Item | Route |
|---|---|---|
| learn | Home | `/research-os/home` |
| learn | Workspace | `/research-os/workspace` |
| learn | Learn | `/academy` |
| learn | Map | `/canon/search` |
| learn | Profile | `/research-os/profile` |
| teach | Class | `/research-os/class` |
| teach | Review | `/research-os/review` |
| teach | Roster | `/research-os/roster` |
| teach | Edges | `/research-os/edges` |

The teach group shows for an email on `RESEARCH_OS_REVIEWER_EMAILS` or a teacher or librarian membership in any class (`isClassStaffAnywhere` in `src/lib/research-os/class-db.ts`).

## Home

`/research-os/home` is where sign-in lands. It reads the person's game state (`/api/research-os/profile`), open assignments (`/api/research-os/assignments?mine=1`), and the current path (`/api/research-os/route` plus `/api/research-os/state`), and shows: level, XP, streak, and badges; what to continue; where the person stands on the current chain with a level chip per node; the open questions on the branch; and a prompt to finish the two-question profile when it is missing.

## Primitives

`src/components/ui/index.tsx`: `PageHeader`, `Panel`, `LoadingState`, `EmptyState`, `ErrorState`, `StageChip`, and the button and link class constants. New surfaces use these; older pages move over as they are touched.

## States

Every data block passes through loading, empty, and error states from the primitives. API failures show a retry; a 503 from an unconfigured deployment shows the same copy the routes return.
