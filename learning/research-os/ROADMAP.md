# Research OS roadmap

Every open Research OS item staged as MVP, near-term, or later, with what it depends on and what it unlocks, so the order of the work is one page the founder can mark. Bead: `ros-roadmap`, priority 0.

Scope: the open Research OS beads in `BEADS-PENDING.jsonl`, and the shipped beads other rows rest on. A shipped bead that carries no dependency is left out, since the page is the order of the work ahead. The beads left out this way are the K-12 slices that shipped through PR #6 to PR #130, the access model, the shell, the deterministic workspace, Academy and canon in the workspace, and the primality research that became `PRIMES.md`.

The list lives in `src/lib/research-os/roadmap.ts` and shows at `/research-os/roadmap`. This file holds the test behind the stages and the rules the list has to keep. One list, read by the page and by the loop, so the two cannot drift.

## The test

A stage name is worth nothing until a reader can apply it. Each of these asks one question about the item.

- **MVP.** One researcher runs a whole loop on one machine: bring material in, find and quote it, see what a node is made of and how well it stands, produce something, have it reviewed. An item off that path is not MVP, whatever its priority.
- **Near-term.** A second person joins the work, or the result reaches the public site. Sharing, roles, classes, and the public words live here.
- **Later.** Many people, money moving, or compute somebody else owns.

Two rules keep the staging usable. An item cannot ship before what it rests on, so every dependency is a row on the same list. An item whose decision is open in `docs/FOUNDER-DECISIONS.md` cannot sit in MVP, because the loop cannot start it. `roadmapProblems()` checks both, plus duplicate ids and dependency cycles, and the page prints what it finds.

## What the staging says today

41 items: 17 in MVP, 17 near-term, 7 later. Seven of the MVP rows are shipped and carry the rest.

**Shipped.** Prime decomposition with its signature, penetration and tier; the decompose-further queue that holds model-proposed factors for human review; the made-of section on the node page; both patent slices; the Vercel gate with the pre-push check; the engine's local host.

**MVP, open.** The truth memo and the claim-provenance schema under it; the truth level per node with the network analysis that names the load-bearing primes; the grade-tier reconciliation; imports 1 through 3, which is the data model, the upload, and the extraction into passages and tables; the research on human-AI-computer work; this roadmap; and the standing rule that every task shows its work.

**Near-term.** Funding wave 1 in three rows, since what each funder asks decides what blocks it. The Tools Competition, DPG registration, the Renaissance Philanthropy inquiry and the Sentry open-source plan take an individual, and the nearest live deadline among them is 2026-10-13. NLnet takes individuals too and carries its own question, whether a US applicant clears the European-dimension bar, 43 days before its 2026-11-03 close. Cloudflare Project Galileo, Vercel for Startups and Fast Forward's next cycle ask who the applicant is and wait on FD-8. both remaining patent slices, the first waiting on FD-1; the software atlas and the workbench design; the map layers and the canon-tag split; graph dedup; imports in search and sharing; the Awareness view, production placement, and roles as grants; first-hand verification; the local model tier; and the site copy, waiting on FD-4.

**Later.** The compute runner and everything on top of it, hosted and self-hosted datasets, claims into elements with invention disclosure, the research tools and engine inside the workspace, under-13 gates, and the game layer.

## How the founder reads it

The page groups by stage, filters by stage or epic, and opens with what is ready to start: items with nothing open in front of them and no decision pending. The founder decides the order between stages, and the loop keeps the order inside one. A mark that moves an item between stages changes one line in `roadmap.ts` and the page follows.

## What the page does not do yet

It reads a list in code, so the founder's marks arrive through a session. Recording a mark in the database, and showing the bead behind each row, come with `ros-frontend`'s next pass. The page is staff-only, on the same test the shell uses for the teaching nav.
