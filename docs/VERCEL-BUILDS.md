# Vercel Preview Builds

Every push to every branch of this repo triggered a Vercel preview build.
Most pushes are the HTE research engine, ephemeral run/intake/data
checkpoints, or bot feed syncs, none of which touch the Next.js site.
`scripts/vercel-ignore-build.sh`, wired as `vercel.json`'s `ignoreCommand`,
skips a build unless the push provably touches a path the deployed app
reads. Production is not exempt: an engine-only squash merge to `main`
skips too, since the diff check runs for every environment.

## The rule

1. Commit message contains `[vercel build]` -> build (forced override, wins over everything below).
2. Commit message starts with `feed:` or contains `[skip ci]` -> skip.
3. Branch matches an engine prefix (below) -> skip.
4. Diff of this push touches an allowlisted path (below) -> build.
5. Diff cannot be computed -> build (fail open).
6. Otherwise -> skip.

Vercel's Ignored Build Step contract: the script exits `1` to build, `0`
to skip. See `scripts/vercel-ignore-build.sh` for the implementation and
`scripts/test-vercel-ignore-build.sh` for nine scenarios covering each
branch of the decision above (run it with `bash scripts/test-vercel-ignore-build.sh`).

## Branch prefixes skipped at step 3

Built from `git branch -r` on 2026-09-14 (~75 remote branches):

| Pattern | Scope | Evidence |
|---|---|---|
| `run/*` | whole prefix | `run/quantum-history-001`, `run/sacred-history-002`: ephemeral engine-run checkpoints |
| `intake/*` | whole prefix | `intake/ros-canon-promotion-3`, `intake/ros-literature-2`: data-ingestion branches |
| `data/*` | whole prefix | `data/sacred-history-ai-analysis`: data-analysis branch |
| `*/hte-*` | topic, any type | `feat/hte-*`, `fix/hte-*`, `test/hte-*`, `docs/hte-*` accounted for 60+ of the ~75 remote branches. HTE (Historical Truth Engine) is a research pipeline; none of its branches touch `src/`, `public/`, or any other allowlisted path. |
| `*/feed-*` | topic, any type | `fix/feed-bot-noise`: bot feed maintenance |
| `*/canon-*` | topic, any type | reserved; no standalone example on 2026-09-14 (canon-topic work so far lives under `intake/ros-canon-*` or `*/hte-*-canon-*`, both already covered), kept for the same reason `feed` is |
| `*/paper-*` | topic, any type | `docs/paper-doi`: paper-ingestion topic |

`feat/ros-*` and `feat/site-*` are deliberately **not** on this list.
Research-OS branches routinely touch `src/app/research-os/` and
`src/app/api/research-os/`, so they run the real diff check (step 4)
instead of a blanket skip. `review/pr*` branches mirror whatever PR
they review and are equally unpredictable, so they also fall through
to the diff check.

## Allowlist at step 4

Every entry below has a concrete reader; nothing here is guessed.

| Path | Why it gates a build |
|---|---|
| `src/**` | the app itself |
| `public/**` | static assets served as-is |
| `package.json`, `package-lock.json` | dependency + script changes |
| `next.config.mjs` | build config, including the `outputFileTracingIncludes` list below |
| `tailwind.config.ts`, `postcss.config.mjs`, `tsconfig.json` | build/type config |
| `vercel.json` | this gate's own config (and `git.deploymentEnabled`, see below) |
| `scripts/vercel-ignore-build.sh` | this gate's own logic; a change to it must always get a real build to prove out |
| `scripts/sync-academy.mjs` | the only script on the npm build lifecycle (`prebuild`/`predev`); copies `learning/app/` into `public/academy-app/` and writes the Academy's Supabase auth config |
| `learning/app/**` | source of the Academy app; `sync-academy.mjs` copies it into `public/academy-app/` on every build |
| `bucket-canon/**` | `.vercelignore`'s own header: "the repo IS the CMS (canon-fs.ts reads `bucket-canon/`), so canon directories MUST stay shipped." Read at request time by `src/lib/canon-fs.ts`, `canon-claims.ts`, `canon-search-index.ts`, `canon-primary.ts`, `canon-signoff.ts`, `canon-bridges.ts`, and `canon-detected-bridges.ts`. (`bucket-canon/**/site-mirror/` is gitignored and can never appear in a diff, so no carve-out is needed here.) |
| `canon-figures/figures.json` | statically imported by `src/lib/canon.ts` and `src/app/canon/CanonGlobeMount.tsx`. The sibling `canon-figures/bios/` and `canon-figures/_archive/` are excluded from the Vercel upload by `.vercelignore` and have zero effect on production, so they are intentionally left off this list. |
| `feed.json` | statically imported by `src/app/contributors/lib.ts` and `src/app/whats-new/page.tsx` |
| `PROTOCOL.md`, `GOVERNANCE.md`, `MANIFESTO.md` | read at build time by `src/lib/docs.ts` and rendered at `/protocol`, `/governance`, `/manifesto`. No other root markdown file is read this way; `REPRODUCE.md` and `CONTRIBUTING.md` are only linked to GitHub, never read from disk. |
| `_intake/embeddings/**`, `_intake/embeddings-v2/**`, `_intake/connections/**` | the exact small subset of `_intake/` that `next.config.mjs`'s `outputFileTracingIncludes` and `.vercelignore`'s "Keep these explicitly" block both name: claim vectors, the multi-branch graph, and the canon graph/centrality files read by `canon-search-index.ts`, `canon-evidence.ts`, and `canon-graph.ts`. Every other `_intake/` subdirectory (the 20 GB photon cache, the 2 GB war.gov mirror, per-figure intake folders, etc.) is excluded from the Vercel upload entirely and cannot affect a deployment either way. |

**Deliberately excluded**, with the evidence:
- `supabase/**`: migrations are applied out of band via the Supabase CLI; nothing in `src/` reads the SQL files, they're only referenced in comments.
- `scripts/**` other than `sync-academy.mjs`: not on the npm build lifecycle. One known gap: `src/app/api/research-os/{production,review}/route.ts` reads `scripts/research-os/ingest/out/sample-canon-claims.json` (a small committed fixture) at request time. It changes rarely and is not traced by `next.config.mjs`, so it is left off the allowlist rather than pulling in the noisy `scripts/research-os/ingest/**` engine tree; use `[vercel build]` in the commit message if a change to that fixture needs to reach production immediately.
- `tools/**`, `papers/**`, `_intake/**` (besides the three kept subdirs above), `.github/**`, `runs/**`, `tests/**`, `docs/**`, root markdown the site does not render, `BEADS-PENDING.jsonl`, `feed/**`: none are read by the build or the deployed app.

## Forcing a build

Put `[vercel build]` anywhere in the commit message. It wins over the
engine-branch skip, the feed/skip-ci message skip, and the diff check.
It does **not** override `git.deploymentEnabled` (below): that gate
runs before any deployment exists, so there is no commit for the
ignore script to inspect.

## The second lever: `git.deploymentEnabled`

`vercel.json`'s `git.deploymentEnabled` blocks a branch from creating a
deployment at all, before `ignoreCommand` ever runs. Confirmed against
Vercel's docs (`vercel.com/docs/project-configuration/git-configuration`,
2026-08-25 revision): it accepts [minimatch](https://github.com/isaacs/minimatch)
glob patterns as keys, not just exact branch names, e.g. `"internal-*": false`.

This repo sets it to the four prefixes with zero legitimate-exception
history: `run/*`, `intake/*`, `data/*`, `*/hte-*`. `*/feed-*`, `*/canon-*`,
and `*/paper-*` are deliberately left off this hard gate; a real fix on
one of those branches occasionally needs to touch canon or feed-adjacent
site code, and this lever has no per-push override, unlike `ignoreCommand`.
Those three stay on the soft, diff-checked path only.

This is a **harder cut than `ignoreCommand`**: no deployment record is
created at all (no PR check, no dashboard entry, no `[vercel build]`
escape hatch), versus `ignoreCommand`, which still creates a deployment
that shows as "Ignored Build Step" with the reason this script printed.
Reserve it for prefixes with no exceptions, the way the four above are.

## The third lever: branch-restricted previews in the dashboard

Project Settings -> Git in the Vercel dashboard can also restrict which
branches get preview deployments at all (`main` plus `feat/ros-*` and
`feat/site-*`, say). This is dashboard-only and needs the founder's
account; nothing in `vercel.json` reaches it beyond `git.deploymentEnabled`
above. `ignoreCommand` still allocates a build slot before it exits, so
this and `git.deploymentEnabled` are the only levers that avoid that
cost entirely.

## The fourth option

Disconnect Git and deploy from a GitHub Action instead. The most
control, at the cost of Vercel's native Git integration UX (automatic
PR checks, dashboard deployment comments): disconnect the GitHub
integration in Project Settings, then deploy with the Vercel CLI
from two workflows.

**Production**, on push to `main`, only when a site path changed:

```yaml
# .github/workflows/vercel-production.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }
      - name: Skip when no allowlisted path changed
        run: bash scripts/vercel-ignore-build.sh
        env:
          VERCEL_ENV: production
          VERCEL_GIT_COMMIT_REF: main
          VERCEL_GIT_COMMIT_MESSAGE: ${{ github.event.head_commit.message }}
          VERCEL_GIT_COMMIT_SHA: ${{ github.sha }}
          VERCEL_GIT_PREVIOUS_SHA: ${{ github.event.before }}
      - run: npm ci
      - run: npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**Preview**, only on a PR carrying a `preview` label, posting the URL back:

```yaml
# .github/workflows/vercel-preview.yml
on:
  pull_request:
    types: [labeled, synchronize]
jobs:
  deploy:
    if: contains(github.event.pull_request.labels.*.name, 'preview')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - id: deploy
        run: echo "url=$(npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})" >> "$GITHUB_OUTPUT"
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview: ${{ steps.deploy.outputs.url }}`
            })
```

`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as repo secrets
either way. Reusing `scripts/vercel-ignore-build.sh` for the production
gate keeps one allowlist for both paths instead of two that drift apart.
The tradeoff: reviewers who want a preview now label the PR instead of
getting one automatically on push, and every native Vercel Git feature
(the auto dashboard comment, deployment protection tied to the Git
integration) needs its own replacement or goes away. Worth it only if
`ignoreCommand`'s build-slot cost (not the runtime, just having a build
container spin up to run the check) turns out to matter at this repo's
push volume; not recommended as a first move.

## A naming convention for the cloud loop

Given how much of the branch-prefix skip list above exists only because
the HTE engine's cloud loop names branches `<type>/hte-<topic>`, the
cleanest fix upstream is naming discipline over allowlist entries:

- Any branch whose only possible effect on the site is "none" (an engine
  run, an intake pull, a data analysis pass) keeps its current
  `run/`, `intake/`, `data/`, or `*/hte-*` prefix.
- Any branch that touches `src/`, `public/`, or another allowlisted path
  keeps a plain `feat/`, `fix/`, `test/`, or `docs/` prefix with **no**
  `hte-`, `feed-`, `canon-`, or `paper-` topic segment, the way
  `feat/site-reform-education-reposition` and `feat/ros-status-band-2`
  already do.

That split is already how the repo's branches behave in practice; this
doc just writes down the rule so a future branch name does not
accidentally fall on the wrong side of `git.deploymentEnabled`'s hard,
un-overridable gate.
