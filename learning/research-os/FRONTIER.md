# Frontier

The Frontier step (INTEGRATION-PLAN.md section 3 and 10; ros-31 and ros-24). Frontier kinds on the graph, four sources of frontier targets, private and public regions, and the Awareness view that shows where a node leads.

## Kinds

Migration `20260915040000_research_os_frontier_kinds.sql`, types in `types.ts`.

- Node kinds added: `hypothesis` (engine or human), `extension`, `replication`, `peer_review`.
- Edge kinds added: `extends`, `replicates`, `reviews`, `answers`.
- `graph.nodes.frontier_flag`: `open_question` (a claim whose answer is not in the graph) or `frontier` (the current edge of a branch). Set and cleared through `POST /api/research-os/frontier` by a reviewer email or class staff; `GET ?branch=` lists both.

A replicated study and a peer review sit on the graph beside the claim they touch, each with its own provenance; the hypothesis engine's nodes keep the `hypothesis` kind through `engine-bridge.ts`.

## Frontier targets

Four sources, all reachable from the workspace: live engine hypotheses (`engineFrontier` on the route response, `engine-frontier.ts`), canon claims flagged as open questions (`openQuestions` on the route response), teacher-picked targets (assignments, CLASS.md), and any node the learner picks (`?target=<slug>`).

## Private and public regions

Routing and directions run over the graph the viewer may see: `filterSubgraphForViewer` (`access-db.ts`) keeps public nodes, the viewer's own, and shared nodes with a grant, and drops edges that touch a hidden node. A private region holds its own state; publishing into a public place is the owner switching visibility (ACCESS.md). The merge step for a private branch that diverged from the public one stays a later item.

## The Awareness view

`directions.ts` (tested by `scripts/test-research-os-directions.ts`): from a node, forward along prerequisite, derives_from, generalizes, extends, replicates, and answers edges, up to three steps: the direct dependents, the frontier-kind and flagged-frontier nodes reachable, the open questions reachable, and the count of nodes at each depth. `GET /api/research-os/directions?node=&branch=` serves it; the workspace's `DirectionsBlock` shows "where this leads" under the selected node, with the open questions as targets.

## Later

Engine compute run privately on a private region, contribution credit for the nodes that affect the graph the most, and the primality tier (ros-25) feeding the frontier order.
