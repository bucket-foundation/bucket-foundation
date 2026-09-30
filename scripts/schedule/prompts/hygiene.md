Weekly Bucket hygiene, repo ~/agfarms/bucket-foundation, beads via local bd.
1. Remove git worktrees whose PR merged or closed and that hold no uncommitted tracked changes. Keep the main checkout and any worktree with unpushed commits.
2. For every in_progress bead: a merged PR naming the bead id means close it; no PR, branch or worktree evidence in 14 days means set it back to open.
3. Run node scripts/sync-research-atlas-manifest.mjs and report whether the manifest changed.
4. Report: tables of worktrees removed, beads closed, beads reopened, open PRs older than 7 days. Headings name the thing. No em dashes. Under 120 lines.
