# Research OS roadmap

Every queued item staged as MVP, near-term, or later, with what it depends on and what it unlocks, so the order of the work is one page the founder can mark. Bead: `ros-roadmap`, priority 0.

The list lives in `src/lib/research-os/roadmap.ts` and shows at `/research-os/roadmap`. This file holds the test behind the stages and the rules the list has to keep. One list, read by the page and by the loop, so the two cannot drift.

## The test

A stage name is worth nothing until a reader can apply it. Each of these asks one question about the item.

- **MVP.** One researcher runs a whole loop on one machine: bring material in, find and quote it, see what a node is made of and how well it stands, produce something, have it reviewed. An item off that path is not MVP, whatever its priority.
- **Near-term.** A second person joins the work, or the result reaches the public site. Sharing, roles, classes, and the public words live here.
- **Later.** Many people, money moving, or compute somebody else owns.

Two rules keep the staging usable. An item cannot ship before what it rests on, so every dependency is a row on the same list. An item whose decision is open in `docs/FOUNDER-DECISIONS.md` cannot sit in MVP, because the loop cannot start it. `roadmapProblems()` checks both, plus duplicate ids and dependency cycles, and the page prints what it finds.

## What the staging says today

38 items: 17 in MVP, 14 near-term, 7 later. Seven of the MVP rows are shipped and carry the rest.

**Shipped.** Prime decomposition with its signature, penetration and tier; the decompose-further queue that holds model-proposed factors for human review; the made-of section on the node page; both patent slices; the Vercel gate with the pre-push check; the engine's local host.

**MVP, open.** The truth memo and the claim-provenance schema under it; the truth level per node with the network analysis that names the load-bearing primes; the grade-tier reconciliation; imports 1 through 3, which is the data model, the upload, and the extraction into passages and tables; the research on human-AI-computer work; this roadmap; and the standing rule that every task shows its work.

**Near-term.** Both remaining patent slices, the first waiting on FD-1; the software atlas and the workbench design; the map layers and the canon-tag split; graph dedup; imports in search and sharing; the Awareness view, production placement, and roles as grants; first-hand verification; the local model tier; and the site copy, waiting on FD-4.

**Later.** The compute runner and everything on top of it, hosted and self-hosted datasets, claims into elements with invention disclosure, the research tools and engine inside the workspace, under-13 gates, and the game layer.

## How the founder reads it

The page groups by stage, filters by stage or epic, and opens with what is ready to start: items with nothing open in front of them and no decision pending. The founder decides the order between stages, and the loop keeps the order inside one. A mark that moves an item between stages changes one line in `roadmap.ts` and the page follows.

## What the page does not do yet

It reads a list in code, so the founder's marks arrive through a session rather than a click. Recording a mark in the database, and showing the bead behind each row, come with `ros-frontend`'s next pass.
