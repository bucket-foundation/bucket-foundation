# Founder decisions

Open decisions only you can make, what each one blocks, and what the loop does while it waits. The loop adds a row when it hits a wall and closes one when you answer. Nothing here stops other work: every row names what proceeds without it.

| # | Decision | Raised | Blocks | What happens while it waits |
|---|---|---|---|---|
| FD-1 | The account for the patent bulk data: the USPTO ODP account behind the research gateway's key, or a Google BigQuery project on the free sandbox tier | 2026-09-19 | `ros-patents 2` (the corpus load), and `ros-patents 3` through it | The memo and the design are done and merged (#189), so the load starts the day an account exists |
| FD-2 | Where patent citation fees go. The loop's default is operations with a public ledger | 2026-09-19 | Pricing in `ros-patents 4` | Nothing is charged, and no fee path is built |
| FD-3 | The IP stance before an invention disclosure becomes a production. Publishing ends European novelty at once and starts the twelve-month US grace period, so it cannot be undone | 2026-09-19 | `ros-patents 4` (disclosure as a production) | Disclosures stay private to their author |
| FD-4 | Where the human-AI-computer direction goes on the public site, and in whose words. Public copy ships after you approve the placement and the words | 2026-09-18 | Public site copy | The direction is built inside Research OS, where no public copy is involved |
| FD-5 | `ANTHROPIC_API_KEY` in Vercel for the Academy tutor | 2026-06-14 | The grounded Socratic tutor on the live site | The route ships dark and fails safe |
| FD-6 | The Nucleus host, unreachable since 2026-09-14 (no ping, no port) | 2026-09-14 | `bd-remote` and every `*.nucleus.agfarms.dev` call | Beads queue in `BEADS-PENDING.jsonl` and drain when the host returns |
| FD-7 | Promotion of `dev` to `main`, which is yours by the branch policy | standing | Anything reaching bucket.foundation | Work merges into `dev` and waits there |

## How a row closes

Answer it in a session, or write the answer into the row. The loop reads this file at the start of a task, and an item whose decision is open cannot sit in the MVP stage of `learning/research-os/ROADMAP.md`.
