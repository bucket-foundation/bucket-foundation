# bucket.foundation — launch & syndication kit

A copy-paste kit of drafts for launching bucket.foundation across the channels
that matter. **Nothing here auto-posts.** Every channel that needs a login,
account, or API token is marked **[FOUNDER-GATED]** — the bot never types a
password, accepts a ToS, solves a captcha, or creates an account. Founder runs
the actual submissions.

What we have that's already automated and zero-gated:
- The live RSS feed at **https://www.bucket.foundation/feed.xml** (anyone can subscribe; agents/aggregators discover via the `<link rel="application/rss+xml">` in the root layout).
- `sitemap.xml` + `robots.ts` (all crawlers + AI agents allowed) + JSON-LD (Organization / Dataset / ScholarlyArticle / SoftwareApplication). Search + LLM discovery is passive and already shipping.
- The `agf-poster` tool at `~/agfarms/tools/agf-poster` for the TikTok/IG photo-carousel cadence (see "Posting plan" below). Still **[FOUNDER-GATED]** on OAuth.

The three honest things we are launching:
1. **research-atlas** — the reconciled research-economy graph (73 funders, ~958k grants, ~$658B, ~8.1M rows), open, CC-BY-4.0, real DOI `10.5281/zenodo.20774322`.
2. **The 20 free research tools** — protein stability, ADMET, RNA folding, ephys, cryo-EM triage, and live-literature/agent tools over OpenAlex. Free to run.
3. **The paper** — the funding-landscape preprint born with a real DOI on Zenodo.

---

## Show HN drafts

HN norms to honor (read before posting):
- Title starts with **"Show HN:"** and is a plain, factual description — no hype, no superlatives, no emoji, no "revolutionary".
- You must have something people can *try* (a URL that works without signup). All three angles below do.
- The first comment is yours: say what it is, why you built it, what's honest/limited, and what you'd like feedback on. Be specific about what's real vs. demo.
- Reply to every comment. Don't be defensive. "Good point, that's a limitation" beats a wall of justification.
- Post once. If it doesn't catch, you may repost a genuinely different version weeks later — not the same thing.
- Best window empirically: weekday ~08:00–10:00 US Eastern. Avoid Fri/weekend.
- Submit at https://news.ycombinator.com/submit **[FOUNDER-GATED — needs HN account]**.

### Angle A — research-atlas (the dataset)
**Title:** `Show HN: research-atlas – an open, reconciled graph of the global research economy`

**URL:** https://www.bucket.foundation/research/atlas

**First comment:**
> I reconciled the world's public research funding into one normalized graph: 73 funders (NIH down to the awarding IC, NSF, EC/ERC, UKRI, Gates, Wellcome, Sloan, DFG), ~958k grants, ~$658B, ~8.1M rows. Every grant is USD-normalized with a stamped FX date and full provenance; orgs are merged per ROR id; people are keyed on ORCID where available (~61% coverage); works are linked via OpenAlex.
>
> It's CC-BY-4.0, born with a real DOI (10.5281/zenodo.20774322), and the build pipeline is open source (github.com/bucket-foundation/research-atlas). Free to read; the only paid path is downstream citation, which routes to the author, not a publisher.
>
> Honest limitations: ORCID coverage is partial, some funders publish messy award data, and the "person" node is the noisiest. I'd love feedback on the reconciliation choices and on funders worth adding next.

### Angle B — the 20 free tools
**Title:** `Show HN: 20 free research tools (protein stability, RNA folding, ephys, live OpenAlex)`

**URL:** https://www.bucket.foundation/research/tools

**First comment:**
> Twenty small research instruments, each running real logic on your input — protein stability (ΔΔG), ADMET screening, RNA folding via ViennaRNA, Hodgkin-Huxley membrane fits, spike detection, cryo-EM triage — plus five literature/agent tools over the live OpenAlex index and a real awarded-grant corpus.
>
> Free to run, no signup. They're part of a nonprofit open-research foundation (no equity, no investors). Some of the heavier GPU/local-LLM tools run on my own laptop GPU and go dark when it's closed — those are clearly badged "founder GPU" vs "always-on", and there's an honest funding ask if anyone wants them up 24/7.
>
> Code is MIT (github.com/bucket-foundation). Feedback I'd most value: which tool is actually useful in your workflow, and what's missing.

### Angle C — the paper / cite-forever model
**Title:** `Show HN: A paper born with a DOI, free to read, where citations pay the author`

**URL:** https://www.bucket.foundation/research/papers

**First comment:**
> I published a funding-landscape paper on bucket.foundation. It's free to read, has a real Zenodo DOI, and is fully reproducible from the open research-atlas corpus. The twist: it's minted as an IP record, and the "cite-forever" model routes any *downstream paid re-publication* fee to the author over x402 — never a charge to a reader or an agent that just wants to cite it.
>
> This is the nonprofit thesis: primary research paid-for-once, citeable-forever, fees to authors not publishers. I'd like feedback from people who've fought with publisher paywalls and citation economics — does the model hold up, where does it break?

---

## Cross-post drafts

All of these are **[FOUNDER-GATED]** — each needs the founder's account/token.
Keep one canonical link per post; let the JSON-LD + OG image do the preview work.

### X / Twitter [FOUNDER-GATED — @gianyrox]
> Launched bucket.foundation: a nonprofit canon of foundations — free to read, paid to cite, fees to authors not publishers.
>
> • research-atlas: 73 funders, ~958k grants, ~$658B, open + CC-BY (DOI 10.5281/zenodo.20774322)
> • 20 free research tools
> • a paper born with a DOI
>
> No equity. No exit. Build it with us → bucket.foundation/contribute

(Thread option: one tweet per pillar — atlas / tools / paper / contribute — each with its own deep link.)

### LinkedIn [FOUNDER-GATED]
> After a long build, bucket.foundation is live.
>
> It's a nonprofit open-research foundation with one idea: primary research should be paid-for-once and citeable-forever, with citation fees routed to authors instead of publishers.
>
> Three things you can use today, all free to read:
> 1) research-atlas — a reconciled graph of the global research economy: 73 funders, ~958k grants, ~$658B, ~8.1M rows. CC-BY-4.0, real DOI.
> 2) Twenty free research tools — protein stability, ADMET, RNA folding, ephys, cryo-EM triage, and live-literature tools over OpenAlex.
> 3) A reproducible funding-landscape paper born with a DOI.
>
> All MIT/CC-BY, no equity, no investors. If you do research, I'd value your feedback — and there's a contribute page if you want to help build it. bucket.foundation

### dev.to / Medium [FOUNDER-GATED]
Long-form post (title: *"Building an open research economy: free to read, paid to cite"*). Outline:
- The problem: publishers capture citation value; readers and authors lose.
- The model: cite-forever — free read, paid only on downstream re-publication, fees to authors over x402 on Base.
- What shipped: research-atlas (the data), the 20 tools (the instruments), the paper (the proof).
- The stack: Next.js + TypeScript, Story Protocol IP records, Walrus storage, feed402 protocol, x402 rail.
- Honest limits + how to contribute (link /contribute, the MIT repos, good-first-issues).
- Cross-post canonical URL back to the dev.to/Medium original to avoid duplicate-content dilution.

### Bluesky [FOUNDER-GATED]
> bucket.foundation is live — a nonprofit canon of foundations, free to read & paid to cite (fees to authors, not publishers).
>
> Open research-economy graph (CC-BY, real DOI), 20 free research tools, a reproducible paper. MIT code, no equity. → bucket.foundation/contribute

### Reddit [FOUNDER-GATED — read each subreddit's self-promotion rules first]
Reddit punishes anything that smells like an ad. Lead with the *useful artifact*, disclose that you built it, engage in comments. Candidate subreddits, matched to angle:
- **r/datasets** — angle A. Title: *"[OSS] research-atlas: open, reconciled graph of global research funding (73 funders, ~958k grants, ~$658B, CC-BY, DOI)"*. These folks want provenance + license + a download path — give all three up front.
- **r/bioinformatics** or **r/labrats** — angle B (the protein/RNA/ephys tools), framed as "free tools, would love to know if any are useful."
- **r/ScholarlyCommunication** or **r/Open_Science** — angle C (the cite-forever model + DOI paper).
- Always: flair correctly, disclose authorship in the body, never spam multiple subs the same hour.

---

## Posting plan

| When | Channel | Angle | Gated? |
|---|---|---|---|
| Day 0, ~08:30 ET (Tue–Thu) | Show HN | pick **one** primary angle (A=atlas is the strongest "Show HN" because it's a concrete dataset) | [FOUNDER-GATED] HN account |
| Day 0, same morning | X + Bluesky | launch announcement, link `/contribute` | [FOUNDER-GATED] |
| Day 0, midday | LinkedIn | the longer framing | [FOUNDER-GATED] |
| Day 1–2 | dev.to / Medium | the long-form build post (canonical link back) | [FOUNDER-GATED] |
| Day 2–4 | Reddit | the matched subreddit for the angle that got traction | [FOUNDER-GATED] |
| Ongoing | TikTok / IG carousels via `agf-poster` | short visual explainers (atlas stats, one-tool-per-day, the cite-forever idea) | [FOUNDER-GATED] OAuth |
| Passive, already live | RSS `/feed.xml` + sitemap + JSON-LD | no action — aggregators + LLM crawlers pick it up | not gated |

**On `agf-poster`** (`~/agfarms/tools/agf-poster`, see its `README.md`): it packages
the proven TikTok photo-carousel poster as a venture-agnostic CLI. To use it for
bucket, drop a `carousels/ACCOUNT.json` + `CHANNEL.md` under a bucket carousels
folder, then `agf-poster status` / `pack` / `post`. **Hard rules enforced by the
adapter (all founder-gated):** no password entry, no ToS accept, no captcha
solving, no account creation; default is a MEDIA_UPLOAD *draft* the founder taps
to publish; `--direct` (hands-free public) is refused unless the TikTok app is
audited (`TIKTOK_APP_AUDITED=1`). So the bot can *stage* a packet, but a human
authorizes OAuth and taps Post.

**On the RSS feed:** it's the one channel that needs zero accounts. Make sure the
launch posts (and the paper) flow into `/feed.xml` so subscribers and any feed
aggregator get the launch automatically.

---

## Pre-launch checklist (founder)

- [ ] `npx next build` green; sitemap.xml + robots.txt + feed.xml resolve in prod.
- [ ] OG image renders correctly on a Twitter/LinkedIn/Slack link-preview test.
- [ ] Vercel → Project → Analytics → **Enable Web Analytics** (the `<Analytics/>` tag is already mounted; events only record once enabled). Speed Insights records automatically once deployed on Vercel.
- [ ] HN account exists + has a little karma (brand-new accounts get filtered).
- [ ] Decide the single Day-0 Show HN angle (recommend **A — atlas**).
- [ ] First-comment text staged so you can paste it within seconds of submitting.
- [ ] X / Bluesky / LinkedIn / dev.to accounts logged in; tokens for `agf-poster` authorized if using carousels.
- [ ] `/contribute` and `/support` links work and the contact email is correct.
