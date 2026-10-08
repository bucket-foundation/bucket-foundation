# Site funnel proposal

Bead: bkt-n7f9. Founder decision needed before any page changes.

## Today

The header and home page link to 25 destinations: manifesto, governance, mission, protocol, about, download, research-os, research, research/papers, research/tools, research/education, canon, canon/search, canon/graph, canon/bridges, learn, academy, earth, excerpts, sacred-history, build, access, contribute, support, whats-new. A first visitor has no single next step, and the foundation documents weigh as much as the product.

## Proposed funnel

One path, four steps, each page with one primary action.

| Step | Page | One job | Primary action |
|---|---|---|---|
| 1 | `/` | Say what Bucket is in two sentences and show one live figure (the solvability frontier) | Open Research OS |
| 2 | `/research-os` | Try the product signed out: quiz, atlas, frontier, one read-only session | Sign in to keep your work |
| 3 | `/sign-in` | Email code, nothing else on the page | Continue |
| 4 | `/research-os` signed in | Daily quiz, your learning path, your reports | Download the desktop app |

Secondary paths, one click from the home footer and the user menu:

- Research: `/research` lists the papers, tools, reports and What's New. Everything under `/research/*` and `/whats-new` stays and gets reached from here.
- Learn: `/learn` (Academy) stays as the education entry and is linked from the Research OS quiz.
- Foundation: one page `/about` with the manifesto, protocol, governance, mission and history as sections or sub-pages, reached from the footer.
- Canon and Explore: `/canon` and `/explore` move under Research OS navigation; their public URLs stay as redirects.

## What changes

- Header: logo, Research, Learn, About, and the user menu. Four items.
- Home: hero, the frontier figure with its one-line reading, three cards (Research OS, Research, Learn), footer with the foundation links and Download.
- Footer carries download, support, contribute, access, privacy and feed.
- Pages such as `/earth`, `/excerpts`, `/sacred-history`, `/build`, `/ladder` and `/kruse` keep their URLs and leave the header; they get listed on `/research/tools` or `/about` where they fit.

## What stays the same

Every URL keeps working. No page is deleted. Research OS, Academy and the papers keep their current layouts.

## Measure

Target: half of first visits reach `/research-os` and one in five of those sign in. Vercel analytics already records page views; add two events, `open_research_os` and `sign_in_complete`.

## Open questions for the founder

1. Is Research OS the one destination, or should Learn be step 2 for visitors who arrive from education contexts?
2. Does the frontier figure go on the home page before the backtest is settled, with its inconclusive wording?
3. Which foundation pages may collapse into `/about` sections and which stay as standalone pages?
