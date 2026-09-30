# Bucket Schedule

Recurring jobs run as systemd user timers. Install with `scripts/systemd/schedule/install.sh`.

| Job | When | What |
|---|---|---|
| hygiene | Mondays 09:00 | Trim merged worktrees, close beads with merged PRs, reopen stale claims, sync the research-atlas manifest |
| syndicate | Thursdays 09:00 | Hacker News, Substack and Medium drafts from the week's findings |
| advisor | 1st of the month | Resume the advisor corpus build, compare counts, propose new institutions |
| alignment | 2nd of the month | Rescore beads against the mission, aligned at 8 of 10 |
| public-critic | 3rd of the month | Critic score for every public page, README and repo homepage, plus the funnel to /download |

Each job writes `reports/schedule/<job>/<date>.md`. The Bucket critic reviews it as a public page. A pass opens a PR into `dev`; merging it publishes the report on What's New. A fail leaves the report and log local.

The founder posts syndication drafts by hand. Hacker News and Substack have no posting API, and Medium issues no new API tokens.
