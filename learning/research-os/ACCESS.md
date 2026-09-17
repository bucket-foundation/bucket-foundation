# Access

The first of the five levels, as a data model (ros-21). A node is public, private, or shared, the way a repository or a drive works; a person asks for a role on a node and the owner grants it; a person imports data as a private node and shares or publishes it later.

## Model

`supabase/migrations/20260915000000_research_os_access.sql`

- `graph.nodes.visibility`: `public` (default), `private`, `shared`. `graph.nodes.owner_id`: the person who can change visibility, grant, and decide requests. Seeded canon and Academy nodes have no owner and stay public.
- `graph.node_grants`: one row per node, grantee, role. The grantee is a person (`grantee_id`) or a group (`grantee_group`, `class:<uuid>` or `role:<name>`). Roles: `view`, `continue`, `extend`, `cite`, `replicate`, `review`. `expires_at` optional.
- `graph.access_requests`: a person asks for a purpose (the roles minus `view`) with a message; the owner grants or denies; a grant writes the matching `node_grants` row. One open request per node, person, purpose.
- `graph.imports`: a dataset, paper, notes, or corpus a person brings in; it creates a private node in branch `00-imports` owned by them.

## Rules

`src/lib/research-os/access.ts`, pure, tested by `scripts/test-research-os-access.ts`.

| Node | view | continue, extend, cite, replicate | review |
|---|---|---|---|
| public | anyone | anyone | owner or a `review` grant |
| shared | owner, or any grant | owner, or the matching grant | owner, or a `review` grant |
| private | owner | owner | owner |

A group grant applies to everyone in the group; class membership maps to `class:<id>`. Expired grants do not count. Only the owner changes visibility, grants, revokes, or decides. A request is accepted only when the requester cannot already do the thing and the node has an owner to ask.

## Route

`src/app/api/research-os/access/route.ts`: `GET ?node=` returns the node's access, the caller's verbs, and (for the owner) the grants and requests; `GET ?mine=1` lists the nodes the caller owns with pending counts and the caller's own requests; `POST` takes `set_visibility`, `grant`, `revoke`, `request`, `decide`, `import`.

## Surfaces

- Workspace: a visibility badge on the selected node; a request-access control when the caller lacks a verb on a shared or private node; for an owner, the visibility switch and the pending requests.
- Profile: the nodes the person owns, their pending requests, and the requests the person has made.

## Later

Roles as grants across the product (ros-27: teacher, librarian, parent, peer, reviewer), private and public graph regions with their own state of the truth (ros-31), a bidding or queue model for scarce access, the merge step when a private branch publishes into a public place.
