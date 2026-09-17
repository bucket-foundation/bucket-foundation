# Research OS Ideal State

Date 2026-09-17. Founder prompt: "why is the workspace just why is the sky blue. take a step back, reimagine this whole product. what are all the parts and what is the intersections and unions of all the parts. right now it's more just union, we need intersection and we need full functionality. what is the ideal state of this product."

## Why the workspace opens on the sky

The workspace was built in Phase 0 as a tool sequence for one seed target, "why is the sky blue": a chain of 22 nodes, and a fixed order of blocks under that target (quick check, path, quote, check, organize, the production form). The graph now holds 517 nodes across eight branches. The workspace still opens on the seed target, still lays its tools out for that one chain, and still reads as the prototype page it was. The target is a parameter; the page became the product. The same inversion runs through every other part: each has its own page and its own data, and meets the rest through a link or a copied id.

## The parts

| # | Part | What it holds | Where it lives |
|---|---|---|---|
| 1 | The graph | Nodes of eleven kinds (fact, concept, law, derivation, primary source, artifact, hypothesis, extension, replication, peer review, production), edges of ten kinds, branches, tiers, frontier flags, visibility and owner, provenance | `graph.nodes`, `graph.edges`, the importers |
| 2 | The person | One account, roles (learner, teacher, librarian, parent, peer, reviewer), consent and payee, game state, a standing per node (stage and evidence), a Learn state per atom (card and proficiency) | `bucket.identities`, `graph.learner_profiles`, `graph.learner_node_state`, `bucket.academy_progress` |
| 3 | Learn | Decks, lessons at three depths, drills, the FSRS scheduler, placement, test yourself | `/research-os/learn`, `src/lib/academy` |
| 4 | The canon | Claims, figures, sites, the timeline, bridges, primary papers, sign-off, the globe | `/canon/*`, `bucket-canon/`, `CanonGlobeMount` |
| 5 | The tools | Find, quote, check, organize, transfer, probe, corroborate, the production form | `/research-os/workspace`, `/api/research-os/workspace` |
| 6 | Awareness | Directions, frontier flags, open questions, engine hypotheses, cross-branch connections | `directions.ts`, `frontier.ts`, `connections.ts`, `hte` |
| 7 | Class | Classes with join codes, memberships and roles, assignments, overrides, roster, holds, the review queue, the class grid, calibration, the leaderboard | `/research-os/class`, `review`, `roster`, `edges` |
| 8 | Production | Draft, submit, review, accept, the node it becomes, four kinds, the engine outbox, incentive eligibility | `graph.productions`, `production-node.ts` |
| 9 | Access | Visibility, grants, requests, imports with fetched text, class sharing | `access.ts`, `access-db.ts`, `import-fetch.ts` |
| 10 | Game | XP on a level rise, levels, streaks, badges | `game.ts` |
| 11 | The site | The landing, public canon pages, sign-in, account | `/`, `/research-os`, `/sign-in`, `/account` |

## Union today, intersection tomorrow

| Pair | Today | Ideal |
|---|---|---|
| Learn × graph | Provenance links an atom to a node; mastery lifts the node to Understanding | The lesson is a section of the node; the drill is the node's Understanding verb; one standing |
| Map × graph | The globe shows canon claims and figures; a click sends a title to Find | The map is the graph: every node a point, colored by your standing, the class as an overlay, the frontier as a layer; the globe is the time-and-place layer of the same map |
| Tools × node | One target's tool sequence on one page | Every node has a page; the tools are verbs on it; the workspace is the path rail around that page |
| Class × graph | A grid of the seed path per class | A heatmap over the same graph; assign from any node; review on the node |
| Production × graph | Accepted work becomes a node | The new node carries every verb; peers review it, others extend and replicate it, a citation settles to the author's payee; one person's Production is the next person's Access |
| Search × everything | Three searches: canon, Find, the deck | One search over nodes, passages, and claims, reachable from every surface |
| Game × standing | XP on a level rise; Learn keeps its own XP and streak | One XP and one streak, earned on the same standing |
| Access × class | Grants, requests, class sharing | A class is a region: what a teacher assigns is visible to the class; a learner's private region publishes into the class region, then the public one |
| Awareness × everything | A block under the selected node, a panel on home | Directions and the frontier on the node page and on the map; the loop on home names the next bridge |

## The ideal state

### One object model

- **Node**: a unit of knowledge on the graph, of any kind, with a branch, a tier, sources, and provenance.
- **Edge**: how two nodes relate.
- **Person**: one account with roles, consent, a payee, and game state.
- **Standing**: a person on a node: the level they hold and the evidence that put them there. The hinge of the product.
- **Class**: a group of people with roles, a region of the graph, assignments, and a teacher's judgment.
- **Assignment**: a node a class is sent to, with a due date and whether a production is required.
- **Production**: a node in the making, of one of four kinds, acting on a node, moving through draft, submitted, accepted or returned.
- **Grant**: who may do what on a node that is not public.
- **Import**: a source a person brought in, fetched, and holds as a private node.
- **Review**: a teacher's or peer's judgment on a hold or a production.

### The five levels as verbs on a node

| Level | Verbs |
|---|---|
| Access | open, import, share, request |
| Awareness | look around, follow a direction, flag a frontier |
| Understanding | learn, recall, explain and check |
| Internalization | connect, transfer, corroborate |
| Production | draft, submit, extend, replicate, review, publish, cite |

Every verb works on every node kind, and every level shows the evidence that raised it.

### Seven surfaces

1. **Node** `/research-os/n/<slug>`. The center. Header: title, kind, branch, tier, your standing with what raised it, owner and visibility. Sections: learn (the lesson at three depths and the drill), sources (passages, quote), check (your explanation and the verdict), around (prerequisites, dependents, directions, frontier, open questions, connections), productions on this node (extensions, replications, reviews, with statuses), class (who holds it, assignments targeting it), access (share, grant, requests). The verbs live here.
2. **Home**. The cockpit: the loop, your path, what is due in Learn, assignments, classes, connections.
3. **Map**. The graph with layers: standing, class, frontier, time and place. One search box.
4. **Learn**. Route, study, placement, test yourself. Every atom is a node; study opens the node page in study mode.
5. **Produce**. Your productions and the one form, opened from a node.
6. **Class**. Roster, assignments, holds, review, the heatmap, all on the graph.
7. **Account and profile**. Identity, consent, payee, privacy, credentials.

The landing and the public canon pages face outward and link in.

### A day in it

A learner opens home. The loop says Understanding is where she stands on the Rayleigh scattering law and names the bridge one step away, Fourier series in mathematics. She opens the node: the lesson at Core, the drill, then her explanation checked against the sources. Around the node: the law derives from wave optics; the bridge crosses a branch. The transfer prompt asks her to carry the idea across; she does. She starts an extension of the law, quotes two sources, corroborates them, submits. Her teacher reviews it on the node that afternoon. It becomes a node on the map with her name on it, in her class's region. A classmate's Access begins there.

A teacher opens the class heatmap. Three learners sit at Awareness on "scattering strength depends on particle size". He assigns the node with a date and a required production. The holds queue shows two transfer answers; he decides them on the node. A production waits; he approves it; the map lights the new node for the whole class.

## What it takes

Four moves, each usable on its own, in order. Status on 2026-09-17: moves 1 to 3 built on `site-local-2026-09-14` (the node surface, one search, the map as the graph with the class heatmap, assign and review on the node); move 4's peer review, extension, and replication of productions work through the node page; citations and engine hypotheses wait on the payout rail and an engine host.

1. **The node surface and one search.** Move the workspace's tools onto `/research-os/n/<slug>`; the workspace keeps the path rail and opens on the person's assignment, last node, or deck frontier. One `/api/research-os/search` over nodes, passages, and claims, behind Find, the map, Learn, and a palette on every page.
2. **The map as the graph.** A graph layer beside the globe: nodes by branch and tier, colored by standing, with the class overlay for staff and the frontier layer for everyone.
3. **Class on the graph.** The heatmap, assign from any node, review and holds on the node, one XP.
4. **Production closes the loop.** Peer review by classmates, extension and replication of productions, citations on productions through the x402 rail to the payee, engine hypotheses as frontier targets.

Outside the repo, still blocking parts of move 4: a host for the hypothesis engine, the consent vendor, the payout rail, the live database.
