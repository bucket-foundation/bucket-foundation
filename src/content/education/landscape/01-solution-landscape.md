# The Education Solution Landscape — mapped on the Age × Knowledge-depth grid

### Bucket Foundation landscape brief 01 — who is already solving what, and where the grid is empty

> The atlas's diagnosis (`docs/EDUCATION_PROBLEMS.md`) and four deep-dives
> (`docs/deep/01–04`) say *what is broken*. The reform thesis
> (`docs/REFORM_THESIS.md`) says Bucket's wedge is the **knowledge layer** —
> access to the frontier, fair production and validation of it, and an
> un-capped path for self-directed learners and the few who can extend it.
> This brief tests that wedge against the market: it catalogs **83 real
> players** across the whole education stack, places each on a 2-D grid, and
> asks honestly where the grid is **crowded** and where it is **empty**. The
> structured catalog is `data/landscape/solutions.csv` (12 columns, one row per
> player, each with a source URL). This document is the map and the reading of
> it.

---

## 0. The frame: a 2-D grid

Every solution is placed on two axes.

**X — Age / life-stage** (a learner's position in life):

| Band | Ages |
|---|---|
| Early-childhood | 0–5 |
| K-12 | 5–18 |
| Higher-ed | 18–22 |
| Professional / working-age | 22–65 |
| Lifelong / elder | 65+ |

**Y — Knowledge depth** (how far into a body of knowledge the tool takes you):

| Level | What it is |
|---|---|
| **L0** | Basic literacy / numeracy |
| **L1** | K-12 content |
| **L2** | Undergraduate-level material |
| **L3** | Graduate / professional depth |
| **L4** | The frontier — *accessing* primary, peer-reviewed and preprint research |
| **L5** | *Producing* new knowledge — actually doing research |

The catalog records each player's age range (`age_min`/`age_max`) and the depth
band it serves (`depth_min_L`/`depth_max_L`). The thesis to test, stated up
front so it can be falsified: **the top of the Y-axis (L4–L5) at any age — both
reaching the frontier and being able to *do* research there — is the least
served region of the grid.** The data below tests it; §4 reports the verdict
honestly, including where the data complicates the story.

The catalog is *not* exhaustive of every edtech company — there are thousands.
It is a representative census of the **category leaders and the structurally
distinct players** in each cell, which is what a coverage map needs.

---

## 1. The grid, column by column (who serves which cell)

### 1.1 Early-childhood (0–5), depth L0

Crowded and well-capitalized — and entirely at the literacy/numeracy floor.
**ABCmouse** (Age of Learning; ~50M children lifetime, >$750M raised, a
$1B+ valuation) [1], **Lingokids** (185M families reached, ~$186M raised
including a $120M 2025 Series D) [2], and **Homer/Begin** [3] are paid
consumer subscriptions; **Khan Academy Kids** [4] and **Duolingo ABC** [5]
are free loss-leaders. All five do roughly the same thing — gamified
phonics, counting, early SEL for ages 2–8 — and none reaches above L0. The
cell is *commercially* well-served; whether it serves the *learning-poverty*
problem (48% of 10-year-olds can't read, per the atlas) is a different
question — these are paid apps in homes that can afford a tablet and a
subscription, i.e. structurally absent from exactly the low-income, fragile
contexts where the atlas locates the deepest crisis (§3, EDUCATION_PROBLEMS).

### 1.2 K-12 (5–18), depth L0–L2

The single most crowded region of the entire grid. Five overlapping sub-markets:

- **Free/nonprofit content + AI tutor:** Khan Academy ($117.5M FY25 revenue,
  77% philanthropic) [6] and its **Khanmigo** AI tutor ($4/mo for learners,
  free to US teachers via Microsoft) [7] — the closest thing to a universal
  free K-12 spine.
- **Adaptive practice (institutional):** IXL (17M+ students) [8], i-Ready
  (~13M US students, ~1/3 of K-8) [9], DreamBox [10], Prodigy [11].
- **Tutoring & homework help:** Varsity Tutors/Nerdy (public, ~$190M FY25
  revenue, 1,100+ districts) [12], Wyzant, Chegg (collapsing under AI — Q1'25
  revenue −30%, 45% layoffs Oct 2025) [13], Photomath (300M+ users, owned by
  Google) [14].
- **AI tutors:** Khanmigo, Synthesis Tutor (math, ages 5–11) [15], Sizzle AI
  (1.7M users, acquired by Campus 2025) [16], Quizlet (60M+ users) [17].
- **Plumbing (LMS/SIS):** Google Classroom (150M+ users) [18], Canvas/Instructure
  (taken private by KKR for $4.8B) [19], Schoology/PowerSchool (Bain, $5.6B) [20].

This is where the AI-tutoring "2-sigma" promise is being fought (see
`docs/foundations/04`, §2). The cell is saturated; the unmet problems here are
the ones no product targets — *learning-to-learn*, philosophy, agency
(`docs/deep/03`) — not a lack of content-delivery vendors.

### 1.3 Higher-ed (18–22) + Professional (22–65), depth L2–L3

Also crowded, and consolidating. **Coursera** ($757M FY25 revenue, 197M
learners) is acquiring **Udemy** ($790M FY25 revenue) for ~$2.5B [21][22] —
merging the biggest MOOC platform with the biggest open course marketplace.
The debt-and-ISA-financed cohort broke: **2U/edX** went through Chapter 11 in
2024 [23], **Pluralsight** was handed to its lenders after Vista's ~$4B
writeoff [24], **Udacity** was absorbed into Accenture [25], and **BloomTech**
(ex-Lambda School) was banned from consumer lending by the CFPB for inflated
job-placement claims [26]. Alongside them: LinkedIn Learning (Microsoft) [27],
Skillshare [28], DataCamp [29], Codecademy (Skillsoft) [30], O'Reilly [31],
Maven (cohort-based, ~75% completion vs MOOC ~7–10%) [32], and corporate-L&D
LXPs Degreed [33] and Cornerstone [34]. Free open-courseware (MIT OCW [35],
OpenStax [36]) sits underneath at no cost but offers no credential or
interaction. This whole band tops out at L3: it teaches *established*
undergraduate and professional knowledge, not the research frontier.

### 1.4 Lifelong / adult (any age, into 65+), depth L0–L3 (one tail to L4)

The broadest, shallowest column. **Wikipedia** (~15B monthly pageviews, 65M+
articles) [37] and **US public libraries** (~17K outlets, 155M+ users, 800M+
annual visits) [38] are the free reference floor. **MasterClass** ($2.75B
valuation, edutainment) [39], **Brilliant** (STEM, 10M+ users) [40], and **The
Great Courses** [41] are paid lifelong learning. **Podcasts** [42] are the one
informal medium whose *ceiling* occasionally reaches L4 (a working scientist
explaining their own field) — but with zero structure, assessment, or
verification. This column is about *breadth of access to settled knowledge*,
not depth toward the frontier.

### 1.5 Credentialing (cross-cutting), depth L2–L5 *signal*

Credentials sit on a different plane — they *certify* depth rather than teach
it. **Traditional university degrees** are the only mechanism that
institutionally certifies all the way to L5 (the PhD = a license to produce
new knowledge) — but they are slow, expensive, and increasingly decoupled from
competence (45% of employers dropped some degree requirements in 2024) [43].
**Google Career Certificates** (1M+ graduates) [44], **Microsoft/AWS certs**
[45], and **Credly/Open Badges** (Pearson, 100M+ badges issued) [46] are the
unbundled, lower-depth alternatives filling the credentialism crack. Note the
asymmetry: *teaching* tools stop at L3; the only thing reaching L4–L5 in this
column is the **credential**, not the learning.

### 1.6 The frontier column (L4–L5) — the heart of the test

This is the column the thesis hinges on, so it gets the most detail. It splits
into four sub-layers, and the split itself is the finding.

**(a) Paywalled access (L4) — the bottleneck.** The "big five" commercial
publishers — **Elsevier/ScienceDirect** (~2,900 journals, RELX, >30% margins)
[47], **Springer Nature** (Nature OA fee $12,850 in 2026) [48], **Wiley**
[49], **Taylor & Francis** [49] — gate the majority of peer-reviewed
literature behind institutional subscriptions or per-article paywalls. This is
the "<1% of people ever read primary research" problem from the reform thesis,
made concrete: the frontier exists but is priced for institutions, not people.

**(b) Open access (L4–L5 *reading*) — partial relief.** **arXiv** (2M+ papers)
[50], **bioRxiv/medRxiv** (now nonprofit openRxiv on a $16M CZI grant) [51],
**PubMed/PMC** (38M+ citations, NIH) [52], **PLOS** [53], **DOAJ** [54], and
**Unpaywall** [55] make a growing share legally free to read. And **Sci-Hub**
[56] — illegal, donation-funded, ~88M files, >90% coverage of closed content —
is the honest acknowledgment that the access problem is so acute that the
single largest "solution" is an outright shadow library. (Noted as illicit;
not endorsed.) The frontier is *increasingly readable* — but reading is L4,
not L5.

**(c) Discovery / open data (L4–L5 finding).** **Google Scholar** [57],
**Semantic Scholar** (AI2, 200M+ papers, the open substrate under most AI
tools) [58], **OpenAlex** (474M works, CC0, now powers the Leiden Ranking) [59],
**CORE** (400M+ resources) [60], **ResearchGate** (25M+ members) [61], and the
visual mappers **Connected Papers** [62] / **Research Rabbit** [63] /
**Undermind** (agentic deep search) [64] help you *find* frontier work. Strong,
mostly free, well-built. Still: finding is not doing.

**(d) AI research tools (L4–L5 — the closest anyone gets to *doing*).** This is
the newest and most contested layer (`docs/foundations/04`). On a spectrum of
"how close to actually doing research":

| Tool | What it does | How far up the L4→L5 ladder |
|---|---|---|
| **Consensus** [65] | synthesizes findings across papers (consensus meter) | L4 — evidence summary |
| **Scite** [66] | classifies citations supporting/contrasting | L4 — citation trust |
| **SciSpace** [67] | search + chat-with-PDF + lit review + writing | L4 — copilot |
| **Perplexity Deep Research** [68] | dozens of searches → cited report | L2–L5 general, not scholarly-rigorous |
| **STORM** (Stanford) [69] | generates cited Wikipedia-style reports | L2–L4 curation |
| **Elicit** [70] | search + extract + **PRISMA systematic-review** + autonomous **Research Agents** | **L4→L5 for the review/extraction stage** — the most production-mature "doing" tool |
| **FutureHouse / Edison Scientific** [71] | autonomous science agents: **PaperQA2** beat PhDs on lit-review; **Robin** generated a genuine hypothesis (ripasudil for dry-AMD); **Kosmos** "AI Scientist" | **L5 — the current frontier of AI actually *doing* science**, though wet-lab validation still needs humans |

**Elicit** (2M+ users, 50K+ paying) is the most mature tool that crosses from
*reading* into *doing* a defined piece of research (a systematic review).
**FutureHouse** (nonprofit; for-profit spinout Edison raised $70M seed) is the
most ambitious at autonomous discovery. These two are the *closest existing
players to Bucket's wedge* — and that proximity is exactly why the white-space
verdict (§4) has to be careful.

---

## 2. The coverage map — crowded vs empty

Reading the catalog as a grid (counts are of distinct players whose range
covers the cell; tools spanning bands are counted in each):

| Depth ↓ \ Age → | Early (0–5) | K-12 (5–18) | Higher-ed (18–22) | Professional (22–65) | Lifelong/65+ |
|---|---|---|---|---|---|
| **L5 produce** | — | — | thin | **very thin** | thin |
| **L4 frontier-access** | — | — | crowded-access / **thin-doing** | crowded-access / **thin-doing** | thin |
| **L3 grad/prof** | — | — | **crowded** | **crowded** | medium |
| **L2 undergrad** | — | thin | **crowded** | **crowded** | medium |
| **L1 K-12** | thin | **very crowded** | — | thin | medium |
| **L0 literacy** | **crowded** | **crowded** | — | thin | medium (libraries/Wikipedia) |

Quantitatively, of the 83 players: only **31** reach L4 or L5 at all, and they
are concentrated in one column (frontier-access/research-tools); **the L0–L3
diagonal — early-childhood literacy through professional upskilling — holds the
clear majority of players and essentially all of the consumer-edtech capital.**

**Crowded cells:** early-childhood L0; K-12 L0–L2 (the densest cell on the
grid); higher-ed and professional L2–L3; frontier *reading/discovery* L4
(strong open-access + discovery infrastructure).

**Empty / thin cells:**
1. **Frontier L4–L5 for non-institutional / younger learners.** Almost every
   L4–L5 tool is priced and designed for credentialed academics with an
   institutional affiliation. A motivated 16-year-old, or a curious adult with
   no university login, can *read* a lot (open access, Sci-Hub) but is not the
   user any of these tools were built for.
2. **L5 "doing research" at any age.** The cell is occupied by exactly two
   serious players (Elicit for the review stage; FutureHouse/Edison for
   discovery) plus the general-purpose Perplexity/STORM — versus dozens of
   players at every L0–L3 cell. It is the **thinnest occupied region of the
   grid.**
3. **The bridge from L3 → L4.** Nothing in the crowded higher-ed/professional
   column *hands a learner up to the frontier.* Coursera/edX/Udemy stop at
   established knowledge; the frontier tools assume you already arrived. The
   on-ramp from "I finished the courses" to "I can read and contribute to
   primary research" is unbuilt.
4. **Lifelong/elder above L1** — almost nothing structured exists for an older
   adult who wants to go *deep*, only breadth (libraries, MasterClass).

---

## 3. How the landscape maps onto the atlas's problems

Matching solution density to the problem inventory from `EDUCATION_PROBLEMS.md`
and the deep-dives:

| Problem (from the atlas) | Solution density | Honest read |
|---|---|---|
| **Access / out-of-school children** (51.2M primary, 61.2M lower-sec) | Low where it matters | Edtech clusters in paying homes; the out-of-school crisis is a state-capacity problem (REFORM_THESIS §3) — apps don't reach it. |
| **Learning crisis** (48% can't read at 10) | Many *products*, wrong *places* | Khan/IXL/i-Ready/DreamBox target it, but adoption tracks income; the 86% learning poverty in Sub-Saharan Africa is barely touched. |
| **Financing** (3.6% of GDP, below the 4% floor) | None (not a product space) | A policy lever, not a market; correctly absent from this catalog. |
| **Personalization / 2-sigma tutoring** | **Crowded** | Khanmigo, Synthesis, Sizzle, Varsity, the whole AI-tutor wave — the most-funded response to any atlas problem. |
| **Learning-to-learn / philosophy / agency** (`deep/03`) | **Near-empty** | No category leader targets metacognition, epistemology, or self-direction. A genuine product gap *inside* the crowded K-12 column. |
| **The body / health → cognition** (`deep/04`) | Empty (in edtech) | No education player addresses sleep/light/movement; outside the catalog's scope. |
| **The ceiling on top-end learners** (`deep/02`, SMPY) | **Near-empty** | Acceleration is a niche; nothing opens the *frontier* to a capable young learner. This is where the white-space and the atlas's ceiling problem coincide. |
| **Frontier access** (<1% read primary research) | Partial — strong reading, thin doing | Open access + Sci-Hub + AI tools made *reading* far easier than five years ago; *doing* and *non-institutional access* remain thin. |
| **Credentialism** (degrees decoupled from competence) | Cracking | Skills-based hiring + badges (Credly 100M+) erode it, but the degree still monopolizes L5 certification. |

The pattern is sharp: **the problems with the most solutions (personalization,
content delivery, test prep) are not the problems the atlas ranks deepest, and
the problems the atlas and deep-dives flag as most neglected (learning-to-learn,
the ceiling, doing research at the frontier) are the emptiest cells.** Markets
chase the payable middle; the structural problems are upstream or
upmarket of where the money is.

---

## 4. The white-space finding — testing the top-right thesis honestly

**The thesis largely holds, with one important qualification.**

**Where it holds.** The top-right of the grid — **L5 ("producing new
knowledge") at any age, and L4–L5 access for anyone outside an institution** —
is unambiguously the thinnest occupied region. Against dozens of players at
every L0–L3 cell, the L5 cell has effectively *two* serious occupants. No
product bridges the crowded L3 upskilling column up to the L4 frontier. And the
frontier tools that exist are built for credentialed academics, not for the
self-directed learner or the capable young person the reform thesis centers —
which is precisely the "un-capped frontier" white space Bucket aims at.

**The qualification — be honest about who is already there.** The top-right is
*not virgin territory*, and pretending otherwise would repeat the overreach the
atlas was built to avoid:

- **Reading the frontier is increasingly solved.** Open access (arXiv,
  bioRxiv/openRxiv, PMC, PLOS), discovery (Semantic Scholar, OpenAlex, Google
  Scholar), and — illicitly — Sci-Hub have made *access to read* primary
  research far less of a moat than it was. Bucket's "free-to-read primary
  research" lever is real but is entering a column with strong, mostly free,
  well-funded incumbents.
- **AI-assisted *doing* has two credible, fast-moving incumbents.** **Elicit**
  already does the systematic-review stage at production scale (2M+ users, an
  API as of 2026); **FutureHouse/Edison** already demonstrated autonomous
  hypothesis generation that yielded a real drug-repurposing candidate, and
  raised $70M to commercialize it. The "40 research tools + research agent"
  lever in the reform thesis is aimed at a cell that is **thin but no longer
  empty, and is being entered by very well-resourced players.**

**So the precise white space is narrower and sharper than "L4–L5 is empty."**
It is the **intersection** of three things that *no* current player occupies
together:

1. **Non-institutional, any-age access** to the frontier (the existing tools
   assume an academic affiliation and an academic user);
2. A **bridge from established knowledge (L3) up to the frontier (L4–L5)** —
   the on-ramp that turns a finished-the-MOOCs learner into someone who can
   read and contribute to primary research; and
3. A **fair production-and-validation layer** — paid-to-cite, author-routed
   economics (the feed402/x402 lever) — which is *orthogonal* to what Elicit
   and FutureHouse do. They make doing research *easier*; none of them changes
   *who gets paid* when knowledge is produced and cited. That economic layer is
   genuinely unoccupied.

The honest verdict: **the top-right is the least-served region (thesis
confirmed), but the most defensible white space is not "AI tools that do
research" — Elicit and FutureHouse are already there — it is the
combination of open, non-institutional, any-age frontier access *with* a
fair author-routed production-and-validation economics.** Bucket should treat
Elicit and FutureHouse as the proximate competitors on the "doing" axis and
compete on *who it serves* (non-institutional, self-directed, young-and-capable)
and *how knowledge production is paid for* — not on out-building their agents.

---

## 5. One-page summary

- **Catalog size:** 83 players, `data/landscape/solutions.csv`.
- **Most crowded:** K-12 L0–L2 (the densest cell), early-childhood L0,
  higher-ed/professional L2–L3, and frontier *reading/discovery* L4.
- **Emptiest:** L5 "doing research" (two serious players vs dozens elsewhere);
  the L3→L4 bridge; non-institutional/any-age frontier access; lifelong learning
  above L1.
- **Thesis verdict:** the top-right (L4–L5 access + doing, at any age) **is** the
  least-served region — confirmed — **but** reading-access is increasingly
  solved and the "doing" cell already has Elicit (review stage) and
  FutureHouse/Edison (discovery). The true, defensible white space is the
  *intersection* of non-institutional any-age frontier access **+** a
  fair, author-routed production-and-validation economics — which no incumbent
  occupies.
- **Problem mapping:** the most-funded responses (personalization, content
  delivery) target problems the atlas ranks shallower; the atlas's deepest and
  most-neglected problems (learning-to-learn, the ceiling, doing research)
  coincide with the emptiest grid cells.

---

## Sources

[1] Age of Learning / ABCmouse — https://www.crunchbase.com/organization/age-of-learning
[2] Lingokids ($120M Series D) — https://bullhoundcapital.com/articles/bullhound-capital-leads-lingokids-120m-round/
[3] Homer / Begin — https://www.crunchbase.com/organization/learn-with-homer
[4] Khan Academy Kids — https://www.khanacademy.org/kids
[5] Duolingo ABC — https://play.google.com/store/apps/details?id=com.duolingo.literacy
[6] Khan Academy — https://www.khanacademy.org
[7] Khanmigo pricing — https://www.khanmigo.ai/pricing
[8] IXL Learning — https://www.myengineeringbuddy.com/blog/ixl-learning-reviews-pricing-2026-honest-look/
[9] i-Ready / Curriculum Associates — https://www.curriculumassociates.com/about/press-releases/2025/09/back-to-school
[10] DreamBox / Discovery Education — https://www.discoveryeducation.com/details/clearlake-capital-backed-discovery-education-completes-acquisition-of-dreambox-learning/
[11] Prodigy Math — https://www.crunchbase.com/organization/prodigy-game
[12] Varsity Tutors / Nerdy (NYSE: NRDY) — https://www.businesswire.com/news/home/20260226513294/en/Nerdy-Announces-Fourth-Quarter-2025-Financial-Results
[13] Chegg layoffs (AI disruption) — https://www.cnbc.com/2025/10/27/chegg-slashes-45percent-of-workforce-blames-new-realities-of-ai.html
[14] Photomath (Google) — https://en.wikipedia.org/wiki/Photomath
[15] Synthesis Tutor — https://www.synthesis.com/tutor
[16] Sizzle AI (acq. by Campus) — https://www.prnewswire.com/news-releases/campus-acquires-ai-startup-founded-by-former-meta-ai-chief-302580557.html
[17] Quizlet / Q-Chat — https://quizlet.com/blog/meet-q-chat
[18] Google Classroom — https://research.com/education/how-google-conquered-the-classroom
[19] Canvas / Instructure (KKR $4.8B) — https://www.instructure.com/press-release/instructure-to-be-acquired-by-KKR
[20] PowerSchool / Schoology (Bain $5.6B) — https://www.baincapital.com/news/powerschool-be-acquired-bain-capital-56-billion-transaction
[21] Coursera FY25 results — https://investor.coursera.com/news/news-details/2026/Coursera-Reports-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx
[22] Coursera–Udemy combination — https://investor.coursera.com/news/news-details/2025/Coursera-to-Combine-with-Udemy-to-Empower-the-Global-Workforce-with-Skills-for-the-AI-Era/default.aspx
[23] 2U/edX Chapter 11 — https://www.insidehighered.com/news/business/2024/07/26/long-embattled-2u-declares-bankruptcy
[24] Pluralsight restructuring — https://www.privateequitywire.co.uk/vista-and-co-investors-take-4bn-hit-in-pluralsight-private-credit-restructuring/
[25] Udacity / Accenture — https://newsroom.accenture.com/news/2024/accenture-completes-acquisition-of-udacity
[26] BloomTech CFPB action — https://www.consumerfinance.gov/enforcement/actions/bloomtech-inc-and-austen-allred/
[27] LinkedIn Learning — https://jobright.ai/blog/complete-linkedin-learning-guide/
[28] Skillshare — https://grokipedia.com/page/Skillshare
[29] DataCamp — https://app.dealroom.co/companies/datacamp
[30] Codecademy / Skillsoft — https://www.skillsoft.com/press-releases/skillsoft-to-acquire-codecademy-a-leading-platform-for-learning-high-demand-technical-skills-creating-a-worldwide-community-of-more-than-85-million-learners
[31] O'Reilly Learning — https://about.proquest.com/en/products-services/OReilly-for-Higher-Education/
[32] Maven — https://www.prnewswire.com/news-releases/maven-raises-20-million-in-series-a-funding-led-by-andreessen-horowitz-301295905.html
[33] Degreed — https://joshbersin.com/2021/04/learning-tech-pioneer-degreed-gets-new-ceo-now-valued-at-1-4-billion/
[34] Cornerstone OnDemand — https://www.cornerstoneondemand.com/company/news-room/press-releases/cornerstone-ondemand-enters-definitive-agreement-to-be-acquired-by-clearlake-capital-group-in-dollar52-billion-transaction/
[35] MIT OpenCourseWare — https://ocw.mit.edu/
[36] OpenStax — https://openstax.org/
[37] Wikipedia / Wikimedia funding — https://wikimediafoundation.org/news/2025/11/26/how-is-wikipedia-funded/
[38] US public libraries (IMLS) — https://www.imls.gov/news/people-visited-public-libraries-more-billion-times-one-year
[39] MasterClass — https://research.contrary.com/company/masterclass
[40] Brilliant.org — https://en.wikipedia.org/wiki/Brilliant_(website)
[41] The Great Courses / Teaching Company — https://en.wikipedia.org/wiki/The_Teaching_Company
[42] Podcasts (medium) — https://en.wikipedia.org/wiki/Podcast
[43] Degree-requirement decline — https://fortune.com/2024/09/20/degree-requirements-employers-hiring-managers-paper-ceiling-education-careers-leadership/
[44] Google Career Certificates — https://blog.coursera.org/1-million-graduates-the-real-world-impact-of-google-career-certificates/
[45] AWS certifications (Pearson VUE) — https://www.pearsonvue.com/us/en/aws.html
[46] Credly / Open Badges (Pearson, 100M+) — https://www.prnewswire.com/news-releases/with-100-million-digital-credentials-issued-through-credly-pearson-fosters-a-future-proof-workforce-for-enterprises-in-the-ai-era-and-beyond-302343746.html
[47] Elsevier / ScienceDirect — https://www.elsevier.com/products/sciencedirect/journals/subscription-options
[48] Springer Nature / Nature OA fee — https://www.statnews.com/2026/06/11/open-access-journal-fees-nature-wiley-elsevier-nih/
[49] Wiley & Taylor & Francis (publisher market share) — https://direct.mit.edu/qss/article/4/4/778/118070/
[50] arXiv — https://arxiv.org/
[51] bioRxiv/medRxiv → openRxiv — https://manusights.com/blog/preprint-servers-explained-biorxiv-medrxiv-arxiv
[52] PubMed / PMC (NIH) — https://www.ncbi.nlm.nih.gov/pmc/
[53] PLOS — https://plos.org/
[54] DOAJ — https://doaj.org/
[55] Unpaywall — https://unpaywall.org/
[56] Sci-Hub (illicit; for reference) — https://en.wikipedia.org/wiki/Sci-Hub
[57] Google Scholar — https://scholar.google.com/
[58] Semantic Scholar (AI2) — https://www.semanticscholar.org/
[59] OpenAlex — https://openalex.org/
[60] CORE — https://core.ac.uk/
[61] ResearchGate — https://www.researchgate.net/
[62] Connected Papers — https://www.connectedpapers.com/pricing
[63] Research Rabbit — https://www.researchrabbit.ai/
[64] Undermind (YC) — https://www.ycombinator.com/companies/undermind
[65] Consensus ($30M raise) — https://consensus.app/home/blog/30m-in-new-funding-to-reach-the-next-10m-researchers/
[66] Scite — https://scite.ai/
[67] SciSpace — https://scispace.com/pricing
[68] Perplexity Deep Research — https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research
[69] STORM (Stanford) — https://techstartups.com/2024/12/31/stanford-university-launches-storm-a-new-ai-tool-that-enables-anyone-to-create-wikipedia-style-reports-on-any-topic/
[70] Elicit — https://elicit.com/pricing
[71] FutureHouse / Edison Scientific — https://www.futurehouse.org/about

---

_Catalog: `data/landscape/solutions.csv` (83 rows × 12 columns). Method: a
representative census of category leaders and structurally distinct players,
grounded with web research (June 2026) and cited above. Maps to
`docs/EDUCATION_PROBLEMS.md`, `docs/deep/01–04`, `docs/foundations/01–04`, and
`docs/REFORM_THESIS.md`. Figures for private companies are estimates or
company-reported reach where noted in the catalog's `scale_note` column._
