# Vercel Preview Builds

Every push to every branch of this repo triggered a Vercel preview build.
Most pushes are the HTE research engine, ephemeral run/intake/data
checkpoints, or bot feed syncs, none of which touch the Next.js site.
`scripts/vercel-ignore-build.sh`, wired as `vercel.json`'s `ignoreCommand`,
skips a build unless the push provably touches a path the deployed app
reads. Production is not exempt: an engine-only squash merge to `main`
skips too, since the diff check runs for every environment.

## Measured on 2026-09-18

The founder, 2026-09-18: "too many vercel builds especially failing builds." <!-- voice-ignore-line: the founder's words, quoted -->

Sources: the Vercel API (the project's deployment list, 2026-09-14 14:39 UTC to 2026-09-19 03:37 UTC) and the build logs of the deployments named.

| Measure | Value |
|---|---|
| Deployments | 178: 108 ready, 40 errored, 26 canceled, 1 building, 3 unreadable in the API reply |
| Most deployed branches | `site-local-2026-09-14` 48 (9 errored), `feat/ros-loop-decompose-further` 38 (10 errored, 15 canceled), `hte/integration` 35 (12 errored), `dev` 25 (1 errored), `main` 5 (3 errored) |

**The diff check never ran on Vercel.** Every build log read shows the gate failing to compute its diff and building to be safe:

- `dev` at `0b57b2e` (2026-09-16): `could not compute diff for 'b1a4bea… 0b57b2e…' (git said: error: Could not access 'b1a4bea…') — building defensively`.
- `feat/ros-loop-decompose-further` at `3134cc7`: the previous sha Vercel supplied was `aa14079`, the direct parent, and the clone could not reach it. The commit changed `BEADS-PENDING.jsonl` alone and built.
- The same branch's first deployment, `965c9f3`, had no previous sha, and the fallback to the parent failed the same way.

Vercel documents `VERCEL_GIT_PREVIOUS_SHA` as the sha of the last successful deployment for the project and branch ([system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables); [release note, 2023-01-19](https://github.com/vercel/vercel/discussions/7251)) and says nothing about whether that commit is in the build's clone. A public write-up found a clone of depth 10 with no remote configured ([Git on Vercel](https://fryuni.dev/notes/vercel-git/)); in this repo's logs the clone lacks even the pushed commit's parent. Vercel's own `turbo-ignore` checks whether the previous sha exists (`git cat-file -t`), falls back to `HEAD^` when it does not, and names "a shallow clone with insufficient history" as a known failure (turbo-ignore 2.11.2, `dist/cli.js`). So every push built unless its message carried `[skip ci]` or `feed:`, or its branch was an engine prefix. Bead-only commits `3134cc7`, `7f8396d`, and `c137373` built.

**A gate change reaches a branch when that branch merges it.** Vercel runs the `vercel.json` and the script of the commit it deploys. `hte/integration` built 23 times after #144 blocked `hte/*` on `dev`, because it took #144 only when #181 synced it on 2026-09-18.

**Three causes account for the failures read:**

1. `Failed to collect page data for /contributors/[handle]` on 2026-09-14, in `next build`: `hte/integration`, `site-local-2026-09-14`, and the branches cut from them that day.
2. A function over the Hobby plan's duration limit on 2026-09-17 (`/api/mcp`, fixed by #177): the build completed and the deploy was refused, on `dev`, `main`, and `feat/mcp-http-endpoint`.
3. Lint and type errors on `feat/ros-loop-decompose-further`, 10 builds from 2026-09-18 19:46 to 2026-09-19 01:39 UTC: 2 on a type error (an import of `toNodeProposals`, which the module did not export) and 8 on one ESLint error (`react/no-unescaped-entities` in `src/app/research-os/(app)/edges/page.tsx`). `next build` runs the type check and ESLint and fails on an error in either, and the loop pushed without running them.

**Node 20 stops building on 2026-10-01.** Every build log read since 2026-09-18 prints `Node.js version 20.x is deprecated. Deployments created on or after 2026-10-01 will fail to build. Please set Node.js Version to 24.x`. An `engines.node` field in `package.json` overrides the project setting ([Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)).

**A canceled build still counts.** Vercel's docs: "Canceled builds are counted as full deployments as they execute a build command in the build step", so they count toward the daily deployment quota and the concurrent build slots ([project settings, Ignored Build Step](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step)). The ignore step saves build minutes and keeps a failing build from running; only `git.deploymentEnabled` and fewer pushes avoid the deployment itself.

## Changes on 2026-09-21

The gate fell open on `dev` and `main` after every skip it performed. Vercel stops supplying `VERCEL_GIT_PREVIOUS_SHA` once the branch's last deployment was canceled, which a skip produces, so the base arrived empty and the next merge built whatever it touched. Deployment `dpl_GRCQFCJkedFQHWkKekvsvtYt2rtg` on `dev` at `884156aeb`, a docs-only merge, logged `prev=<empty>` and ran a full build; `dpl_HkRXdMA7pRyu2iB5K5YJekXRzd9c` before it skipped and canceled. The gate now falls back to the pushed commit's first parent on those branches, and only when the commit is a merge or a squash merge, since one parent covers one commit. Four cases in `scripts/test-vercel-ignore-build.sh` hold both halves, and the old suite asserted the fail-open as correct.

The pre-push check also ran only when the gate answered build, so a branch whose pushes all carried `[skip ci]` reached a pull request with no lint and no type check. It now runs both whenever a push carries code.

## Changes on 2026-09-18

Four changes, each against one finding above.

1. **The gate fetches what it compares against.** The base is `VERCEL_GIT_PREVIOUS_SHA` when Vercel sets it. On a branch with no successful deployment yet it is the tip of `dev`, the default target of a pull request; on `dev` or `main` with no previous deployment sha, which Vercel stops sending once the branch's last deployment was canceled, it is the pushed commit's first parent, and only when that commit is a merge or a squash merge, since one parent covers one commit. When the clone lacks the base, the script fetches the trees of the base and the pushed commit at depth 1 (`--filter=blob:none`) from the public repository (`https://github.com/$VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG.git`) into a scratch bare repository, within a time limit, and diffs there with `--no-renames`, which lists both paths of a moved file. The build's clone is left untouched. A depth-1 fetch with blobs is a pack of about 815 MB for this repository and ran past two minutes; fetching into the clone itself made git 2.48 and later copy its local objects into an 814 MB promisor pack (critic rounds 1 and 2, 2026-09-19). The scratch fetch of `aa14079` and `3134cc7` comes to 8.2 MB and skipped, as it should; it took 4.5 to 33 s over a home connection, and the critic measured 1.3 to 2.7 s in 7 of 9 runs with 28 s and 45 s in the other two. Any failure still builds, and the log says which step failed.
2. **Node 24.** `package.json` gets `"engines": { "node": "24.x" }`, and CI runs Node 24, so the preview and CI build on the version Vercel requires from 2026-10-01.
3. **A check before a building push.** `scripts/pre-push-vercel-check.sh` asks the gate whether the push would build, with the branch's changes since its merge base with `origin/dev`. When the push would build, it runs `npm run lint` and `npm run typecheck` and refuses the push on an error, so a lint or type error fails on the machine before it fails on Vercel. `scripts/install-git-hooks.sh` adds a `pre-push` to the hooks directory (`core.hooksPath`, the org's shared directory on AGFarms machines) that runs a repository's own `scripts/pre-push-vercel-check.sh` when it has one. `AGF_PREPUSH_SKIP=1` bypasses it.
4. **One building push per task.** Work in progress carries `[skip ci]`, which skips the Vercel build and GitHub Actions; the finish push of a task builds once, after lint, types, and tests pass locally. The Research OS loop has worked this way since 2026-09-18. GitHub Actions reads `[skip ci]` anywhere in a pushed commit's message, and the repository's squash default puts every commit message in the merge's body, so a merge made with the default would skip CI on `dev`. The loop merges with its own subject and a body free of skip tokens. Setting the squash default to the pull request title alone (repository settings, "Default commit message", or `squash_merge_commit_message=BLANK` through the API) would close this for merges made by hand; that is the founder's call.

No researcher-facing surface changes. The preview a reviewer opens from a pull request builds once per task and builds green, and a branch no longer burns a deployment on every bead commit.

## The rule

1. Commit subject contains `[vercel build]` -> build (forced override, wins over everything below).
2. Commit subject starts with `feed:`, or contains `[skip ci]`, `[skip vercel]`, or `[vercel skip]` -> skip. The subject line alone counts: a squash merge can list every commit of a pull request in its body, work-in-progress `[skip ci]` commits included, and those lines must not skip the merge.
3. Branch matches an engine prefix (below) -> skip.
4. The diff from the base to the pushed commit touches an allowlisted path (below) -> build.
5. The base cannot be fetched, or the diff cannot be computed -> build (fail open).
6. Otherwise -> skip.

The base at step 4 is `VERCEL_GIT_PREVIOUS_SHA`, the branch's last successful deployment, when Vercel sets it. On a branch with no successful deployment yet it is the tip of `dev`; on `dev` or `main` with no previous deployment sha it is the pushed commit's first parent, and only when that commit is a merge or a squash merge; a plain commit on those branches builds, since one parent cannot cover a push that carries several. Vercel's clone holds the pushed commit alone, so the script fetches a missing base's trees at depth 1 (`--filter=blob:none`), with the pushed commit's, from `https://github.com/$VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG.git` into a scratch bare repository, within `VERCEL_IGNORE_FETCH_TIMEOUT` seconds (90 by default), and diffs with `--no-renames` so a file moved out of an allowlisted directory counts there. The allowlist match reads the diff from a here-string: a pipe into `grep -q` under `pipefail` failed on diffs past 64 KB of paths and skipped a site change. The fetch works because the repository is public; a private repository would need a token, and without one every push builds, as before.

Vercel's Ignored Build Step contract: the script exits `1` to build, `0`
to skip. See `scripts/vercel-ignore-build.sh` for the implementation and
`scripts/test-vercel-ignore-build.sh` for 31 checks (run it with
`bash scripts/test-vercel-ignore-build.sh`). Fourteen run in a depth-1 clone
with no remote, the way Vercel's clone is, and check that the fetch leaves
the base's blobs behind, the clone unchanged, and no scratch repository in
`TMPDIR`. Others cover a diff of
4,000 paths and squash bodies carrying `[skip ci]` or `[vercel build]` lines. CI runs both test
scripts.

## Before a push

`scripts/pre-push-vercel-check.sh` asks the gate whether a push would build, with the branch, the pushed commit's message, and the branch's merge base with `origin/dev` as the base; on `dev` and `main` it gives no base, so every push there that the message or branch does not skip is checked. When the answer is build, it runs `npm run lint` and `npm run typecheck` and refuses the push on an error. Both read the working tree, so the check first refuses a push whose commit is not the one checked out, a tracked or untracked source file that differs from it, and a checkout without `node_modules`, each with the reason. A push Vercel would skip passes at once. `bash scripts/install-git-hooks.sh` installs a `pre-push` in the hooks directory (`core.hooksPath`, the org's shared directory on AGFarms machines) that runs a repository's own check when it has one and does nothing in other repositories; it leaves an existing `pre-push` alone. `AGF_PREPUSH_SKIP=1 git push` bypasses it. `scripts/test-pre-push-vercel-check.sh` covers 23 cases, the installer and a crashing gate among them.

The check catches lint and type errors, the cause of 10 of the failed builds measured above. Generated route types under `.next/types` count in the type check as they do in `next build`; a stale copy from an old dev server can fail it, and deleting `.next/types` clears that. It does not run `next build`, so a page that fails to collect its data at build time, or a function over a plan limit, still fails on Vercel alone.

## Node version

`package.json` sets `engines.node` to `24.x`, which overrides the project's Node setting on Vercel, and CI runs Node 24. `next build` passes on Node 24.21 locally (976 static pages, 2026-09-19). Local development on Node 22 works; npm prints an engine warning.

## Branch prefixes skipped at step 3

Built from `git branch -r` on 2026-09-14 (~75 remote branches):

| Pattern | Scope | Evidence |
|---|---|---|
| `run/*` | whole prefix | `run/quantum-history-001`, `run/sacred-history-002`: ephemeral engine-run checkpoints |
| `intake/*` | whole prefix | `intake/ros-canon-promotion-3`, `intake/ros-literature-2`: data-ingestion branches |
| `data/*` | whole prefix | `data/sacred-history-ai-analysis`: data-analysis branch |
| `hte/*` | whole prefix | `hte/integration`: the engine's integration branch. Every engine PR merges here first and one batch PR carries it into `dev`. Merging `dev` into it brings `src/` changes along, so the diff check alone would build it; added 2026-09-14 after exactly that happened. |
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

Put `[vercel build]` in the commit subject line. It wins over the
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

This repo sets it to the five prefixes with zero legitimate-exception
history: `run/*`, `intake/*`, `data/*`, `hte/*`, `*/hte-*`. `*/feed-*`, `*/canon-*`,
and `*/paper-*` are deliberately left off this hard gate; a real fix on
one of those branches occasionally needs to touch canon or feed-adjacent
site code, and this lever has no per-push override, unlike `ignoreCommand`.
Those three stay on the soft, diff-checked path only.

This is a **harder cut than `ignoreCommand`**: no deployment record is
created at all (no PR check, no dashboard entry, no `[vercel build]`
escape hatch), versus `ignoreCommand`, which still creates a deployment
that shows as "Ignored Build Step" with the reason this script printed.
Reserve it for prefixes with no exceptions, the way the five above are.

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
  `run/`, `intake/`, `data/`, `hte/`, or `*/hte-*` prefix.
- Any branch that touches `src/`, `public/`, or another allowlisted path
  keeps a plain `feat/`, `fix/`, `test/`, or `docs/` prefix with **no**
  `hte-`, `feed-`, `canon-`, or `paper-` topic segment, the way
  `feat/site-reform-education-reposition` and `feat/ros-status-band-2`
  already do.

That split is already how the repo's branches behave in practice; this
doc just writes down the rule so a future branch name does not
accidentally fall on the wrong side of `git.deploymentEnabled`'s hard,
un-overridable gate.
