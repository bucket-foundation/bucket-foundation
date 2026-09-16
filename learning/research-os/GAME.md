# The game layer

ros-33. INTEGRATION-PLAN.md section 6: streaks and daily goals, XP and levels, a path map over every branch, badges at Internalization and Production, class leaderboards only. Level progress stays the spine; this layer reads the transitions `stages.ts` already produces and adds nothing to them.

## Rules

`src/lib/research-os/game.ts`, tested by `scripts/test-research-os-game.ts`.

- XP: the first time a node reaches a level, the learner gains that level's XP: access 2, awareness 10, understanding 25, internalization 50, production 100. A transition that crosses several levels grants each. A drop or a repeat grants nothing.
- Levels: level n starts at 50 n (n - 1) XP: level 2 at 100, level 3 at 300, level 4 at 600. The profile shows XP into the current level and the span to the next.
- Streak: any recorded transition counts as activity for that UTC day; the same day holds the streak, the next day grows it, a gap resets it to 1.
- Badges: `internalized` and `produced`, once per node each, recorded with the node id and the time.

## Where it runs

- `recordEvidence` in `db.ts` calls `awardProgress` after every evidence write, with the prior and next stage, so every route that records a transition (state, workspace, probe, production, review) counts once. Awarding never fails the evidence write.
- Storage: `graph.learner_profiles.xp`, `streak_days`, `last_active_day`, `badges` (migration `20260915010000_research_os_game.sql`).
- `GET /api/research-os/profile` returns `game` (xp, level, into, span, streakDays, lastActiveDay, badges). `GET /api/research-os/class` returns `xpByLearner` per class.

## Surfaces

- Workspace: the path map, the routed chain as a winding path of nodes colored by the learner's level on each, the target ringed at the end; clicking a node selects it.
- Profile: level, XP, progress to the next level, streak, badge counts.
- Class view: a class leaderboard, top ten by XP, class members only.

## Later

Daily goals with a target per day, the Academy's own XP and streak merged with this one (the app keeps its own in localStorage today), credentials issued from the badges through the Academy issuer.
