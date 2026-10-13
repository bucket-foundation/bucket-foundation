# Launch

Every channel below needs the founder's login, token or account. The bot never types a password, accepts a terms of service, solves a captcha or creates an account. Each item is marked FOUNDER-GATED.

## Funnel

A reader reaches an installer in two clicks.

| Step | Where | What happens |
|---|---|---|
| 1 | Home hero (`src/components/Presentation.tsx`) and the header (`src/components/HeaderV2.tsx`) | A Download button sits beside the Research OS link; the footer links `/download` too |
| 2 | `/download` | Email, name, computer and a consent box. The page detects the OS and offers the matching architecture |
| 3 | Result | The install command for that computer, and a 24-hour download link by email through `/api/download` |
| 4 | Install | `scripts/install.sh` on macOS and Linux, `scripts/install.ps1` on Windows. Both check the checksum and the release signature |
| 5 | Daily | An optional box on `/download` opts the address into the What's New email |

Install one-liners, as the page shows them:

```bash
curl -fsSL https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts/install.ps1 | iex
```

Release `bkt-v0.4.0` carries `bkt` for five targets (`bkt-darwin-arm64`, `bkt-darwin-x64`, `bkt-linux-arm64`, `bkt-linux-x64`, `bkt-windows-x64.exe`) and one Linux AppImage, `Bucket-0.4.0-x86_64.AppImage`, which opens the window through `bkt app`. Each file has `.sha256`, `.manifest` and `.manifest.sig` companions. macOS and Windows get the terminal app only; the windowed installers named `Bucket-desktop-<version>-<os>-<arch>` arrive with the next tag. Then `bkt init` and `bkt` open the first quiz. The installers are also public on the [releases page](https://github.com/bucket-foundation/bucket-foundation/releases).

The What's New email is a daily digest of shipped work. The `whats-new` workflow appends to `data/whats-new.json` on each merge to `main`, a leak filter screens every entry, and the `/api/cron/whats-new-daily` crons send through Resend to opted-in addresses with an unsubscribe link. `npm run email:whats-new-preview` renders a digest locally. The same feed is public at `/whats-new`.

## Pre-launch checks

- [ ] `/download` returns 200 on production and lists the current release's installers.
- [ ] The home page and the header show Download at 375 px and 1280 px.
- [ ] `RESEND_API_KEY`, `DOWNLOAD_LINK_SECRET`, `DOWNLOAD_ARTIFACT_BLOB` and `CRON_SECRET` are set on Vercel, so the link email and the digest send.
- [ ] The install one-liner installs `bkt` on a clean Linux machine and a clean macOS machine; `install.ps1` does the same on Windows.
- [ ] `sitemap.xml`, `robots.txt` and `feed.xml` resolve in production.
- [ ] The OG image renders in a Slack, X and LinkedIn link preview.
- [ ] Vercel Web Analytics is on; the `<Analytics/>` tag is mounted and records once enabled.
- [ ] `/contribute` and `/support` load and the contact address is correct.

## Show HN

Submit at https://news.ycombinator.com/submit. FOUNDER-GATED: needs an HN account with some karma.

Post on a weekday between 08:00 and 10:00 US Eastern. The title starts with "Show HN:" and describes the thing in plain terms. The first comment is the founder's: what it is, why it exists, what is limited, and what feedback helps. Reply to every comment and post once.

Title: `Show HN: Bucket, an offline study app and research OS on a free-to-read canon`

URL: https://www.bucket.foundation/download

First comment:

> Bucket is a terminal and desktop app for studying offline. A timed quiz and spaced-repetition review run over an encrypted SQLite store on your computer, and your answers stay there. The installers verify a release signature before they write anything.
>
> The same graph of concepts is on the web as Research OS, and the canon behind it is free to read: axioms, laws and primary sources, each with a canonical URL. Agents can query it over MCP at https://www.bucket.foundation/api/mcp.
>
> Limits today: release 0.4.0 is the first public build, the window ships only as a Linux AppImage while macOS and Windows get the terminal app, and the author fee rail over x402 on Base is specified but does not settle yet. I would like feedback on the first-run quiz and on the install flow.

## Cross-posts

One link per post: https://www.bucket.foundation/download. All FOUNDER-GATED.

X and Bluesky:

> Bucket 0.4.0 is out. An offline study app: a terminal app for macOS, Windows and Linux and a window on Linux, signed releases, answers stay on your computer. Free canon on the web, MCP endpoint for agents. bucket.foundation/download

LinkedIn:

> Bucket 0.4.0 is out. It is a study app that runs offline: a timed quiz and spaced-repetition review over an encrypted local store, with signed binaries for macOS, Windows and Linux and a Linux window. The web side is Research OS and a free-to-read canon of foundations, open to agents over MCP. The code is MIT. Download it at bucket.foundation/download and tell me what breaks.

dev.to or Medium, long form. Title: "Building an offline study app with signed releases". Outline:

- Why the quiz store is local and encrypted.
- The release pipeline: five binaries, one AppImage, signature and checksum checks in both installers.
- One graph shared by the site, the terminal app and the desktop window through `packages/ros-contract`.
- The MCP endpoint and the canon's canonical URLs.
- Limits, and where to contribute: `/contribute`.

Post the canonical link back on the original.

Reddit. Read each subreddit's self-promotion rules first, disclose authorship and never post to several communities in the same hour. Match the community: r/commandline or r/selfhosted for the installer and the local store, r/ClaudeAI or r/mcp for the endpoint, r/Open_Science for the canon.

## Posting plan

| When | Channel | Gate |
|---|---|---|
| Day 0, 08:30 ET on a Tuesday or Thursday | Show HN | FOUNDER-GATED, HN account |
| Day 0, same morning | X and Bluesky | FOUNDER-GATED |
| Day 0, midday | LinkedIn | FOUNDER-GATED |
| Day 1 to 2 | dev.to or Medium | FOUNDER-GATED |
| Day 2 to 4 | Reddit, the community that responded to the HN thread | FOUNDER-GATED |
| Ongoing | TikTok and Instagram carousels through `agf-poster` | FOUNDER-GATED, OAuth |
| Passive | `/feed.xml`, `sitemap.xml`, JSON-LD and `/llms.txt` | none |

`agf-poster` stages a packet from a `carousels/ACCOUNT.json` and `CHANNEL.md` under a carousels folder. Its default is a MEDIA_UPLOAD draft that the founder taps to publish, and `--direct` stays refused until the TikTok app is audited. A human authorizes OAuth and taps Post.

## After launch

Watch the signup list and the install smoke jobs. Answer every comment within a day. File each report as a bead in `bkt-`.
