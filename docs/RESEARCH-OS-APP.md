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

## The graph

One graph holds everything researched. `scripts/research-os/ingest/academy-import.ts` writes the 487 Academy atoms and their prerequisite edges; `scripts/research-os/ingest/canon-all.ts` writes the canon on top: one `concept` per claim folder (105), one `fact` or `law` per claim card (599), one `primary_source` per paper across every branch (135), one `figure` (99), one `site` (47), and one `concept` per cross-branch bridge cluster (30), 1,013 nodes and 1,424 edges. Canon meets mastery through edges: a claim `example_of` its concept and `derives_from` the atoms it names, a concept `derives_from` the atoms its claims name, a paper `cites` the atoms it names, a figure `contributes` to atoms and `authored` papers by author name, a bridge `bridges` its member claims. The links come from `src/lib/research-os/ingest/link.ts`, an IDF-weighted overlap over titles and summaries within a branch, recorded with a confidence and the shared words. `scripts/research-os/ingest/intake-all.ts` adds the research under `_intake/`: the 178 literature cards as `primary_source` nodes in `10-literature` (citing the atoms they name), the 26 concept digests as `concept` nodes in biophysics with up to fifteen of their PubMed papers each (177), and the 8 queued concept targets as `concept` nodes flagged open questions. The graph holds 1,903 nodes across 14 branches after both importers. Every node carries `provenance.type` (`academy_atom`, `canon_claim`, `canon_concept`, `canon_paper`, `canon_figure`, `canon_site`, `canon_bridge`, `literature_paper`, `intake_digest`, `intake_paper`, `intake_target`, `production`, `import`), which the map and the node page read.

## Node

`/research-os/n/<slug>` is the center (`src/app/research-os/(app)/n`). One read, `/api/research-os/node`, returns the node, the viewer's standing with its evidence, prerequisites and dependents, directions, the Learn target, the viewer's productions on it and the public nodes that extend, replicate, or review it, the viewer's verbs, the assignments targeting it, and for staff the class holders by level. The page shows the standing and what raised it, then the five levels as verbs in place: learn (the lesson and drill for the atom it came from, through `useAcademy`), sources (quote with a locator, kept for the next two), check (an explanation against the quotes, with the forcing step when a class turns it on), transfer (a prompt built from the node's dependents, held for a teacher), around (rests on, unlocks, where it leads, open questions, relations across branches), produce (a production, extension, replication, or peer review from this node through the one form, `ProduceForm`), class (assignments targeting it; for staff, learners by level, the holds and productions waiting on this node with decide in place, and assign in place), and access.

## Search

`/api/research-os/search?q=` ranks the nodes the viewer may see by title, slug, and summary (`src/lib/research-os/search.ts`) and returns each with the viewer's standing. `SearchPalette` opens on every app page with Ctrl or Cmd K and from the sidebar; Enter opens the node.

## Home

`/research-os/home` is where sign-in lands. At the top, the loop block (`LoopPanel`, `/api/research-os/loop`) shows the five levels as the person's live state with one next action each: nodes owned and imports (Access), nodes opened (Awareness), nodes held and decks started (Understanding), connections held and the nearest bridge (Internalization), productions by status and the nodes they became (Production). A first run shows a three-step way in instead. `/research-os/productions` lists everything the person produced with its status and the node it became. Below, it reads the person's game state (`/api/research-os/profile`), open assignments (`/api/research-os/assignments?mine=1`), and the current path (`/api/research-os/route` plus `/api/research-os/state`), and shows: level, XP, streak, and badges; what to continue; where the person stands on the current chain with a level chip per node; the open questions on the branch; and a prompt to finish the two-question profile when it is missing.

## Learn

The Academy runs inside the shell as the Learn module (`src/app/research-os/(app)/learn`). The engine is a TypeScript port of the Academy app's scheduler and learning loop (`src/lib/academy/fsrs.ts`, `engine.ts`: FSRS-5, leverage, the encompassing map, the daily route, grading with proficiency and FIRe credit, streaks, the cross-device merge; tests in `scripts/test-academy-engine.ts`). The corpus is the same 358-atom set, read from `/academy-app/corpus`. Progress keeps the Academy's local keys (`bucket-academy/v1/<branch>`) and syncs to `bucket.academy_progress` through `/api/academy/progress` with the site session (`src/lib/academy/progress-store.ts`).

Surfaces: `/research-os/learn` (every deck with the person's progress), `/research-os/learn/[branch]` (summary, today's route, the atoms by shell with mastery), `/research-os/learn/[branch]/[atom]` (the lesson at three depths with the full text and equations, then retrieval at the depth mastery calls for), `/research-os/learn/[branch]/study` (today's route one item at a time). `/academy?branch=&atom=` redirects to the same atom, so every older link holds. A Research OS node's Learn link (`learnTargetFor`) opens its atom here.

### Placement and test yourself

`/research-os/learn/[branch]/place` runs the Academy's adaptive placement (`src/lib/academy/diagnostic.ts`: a log-odds belief per atom, the atom nearest 0.5 asked next, a confident "I knew it" flooring the prerequisite closure and "I did not" flooring the dependents, at most eighteen questions); known atoms are seeded as started with a modest schedule. A new deck starts there. `/research-os/learn/[branch]/assess` is the sealed run (`src/lib/academy/assess.ts`): ten items across started atoms at rising depth, answered before the answer shows, graded on the spot where the answer is a number or a short expression and self-checked at lower trust otherwise; every verdict feeds the scheduler at the item's depth, and missed atoms link back to study. Tests: `scripts/test-academy-diagnostic.ts`, `scripts/test-academy-assess.ts`.

## Map

The map is the graph. `/research-os/map` lists every branch the graph holds and lays one out by tier (`src/lib/research-os/graph-layout.ts`, a barycenter ordering over prerequisite edges) from `/api/research-os/graph?branch=`: every node a point colored by the viewer's standing, prerequisite edges as lines, the frontier ringed gold, assignments in the viewer's classes boxed red, a find box, a filter by what nodes came from (atoms, claims, papers, figures, productions; canon edges dashed), and for staff a class heatmap layer (the share of learners at Understanding or above per node). Click opens the node page. `?view=globe` shows the canon globe (`CanonGlobeMount`, the same component as the public `/canon/search`) with "work on this" in its drawer.

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

## Workspace

`/research-os/workspace` without a target is the picker: search the whole graph, your open assignments, the map, a deck, the seed path. With `?target=<slug>` it lays the path to that node from what you hold; the route resolves the target's branch, the header reads from the target, and the node page is one link away. Every node in the graph can be a target.

## Primitives

`src/components/ui/index.tsx`: `PageHeader`, `Panel`, `LoadingState`, `EmptyState`, `ErrorState`, `StageChip`, and the button and link class constants. New surfaces use these; older pages move over as they are touched.

## States

Every data block passes through loading, empty, and error states from the primitives. API failures show a retry; a 503 from an unconfigured deployment shows the same copy the routes return.
