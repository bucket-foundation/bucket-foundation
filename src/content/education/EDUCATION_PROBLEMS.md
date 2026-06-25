# The Global Education Problem Landscape

### Bucket Foundation's founding problem statement, grounded in authoritative data

_education-atlas v0.1.0 — generated from the World Bank EdStats, UNESCO UIS,
Our World in Data, and OECD PISA 2022. Every number in this document is a row in
the published dataset, traceable to its source, source URL, and as-of date via
`data/processed/` and `data/MANIFEST.json`._

Bucket Foundation exists to reform education. Reform that is not grounded in
evidence is opinion. This document is the evidence: what the educational
problems actually are, by country, by level, measured against the global
standard (UN Sustainable Development Goal 4, *Quality Education*), drawn from the
authoritative custodians of education data — not from an LLM's recollection.

The atlas holds **78,326 observations** across **219 countries**, **30
indicators**, and **9 problem categories**, spanning **1870–2024** (long-run
attainment series back to 1870; the substantive problem signal is 2000–2024).
It scores **5,036 country × level × indicator problem profiles** against SDG 4
benchmarks, income-peer medians, and trend.

---

## 1. The big picture: three crises stacked on top of each other

The world has largely solved *getting children into a primary classroom*. It has
not solved *keeping them there*, *teaching them to read*, or *paying for the
system*. Three crises, in order of how badly the data indicts them:

### The learning crisis is the deepest problem

**Learning poverty — the share of 10-year-olds who cannot read and understand a
simple text — is 48.3% worldwide** (World Bank `SE.LPV.PRIM`, latest). Nearly
half of all children reach age 10 unable to do the one thing primary school
exists to teach. This is not an access problem; these are children *in school*.

It is wildly unequal:

| Region | Learning poverty |
|---|---|
| Sub-Saharan Africa | **86.5%** |
| Middle East & North Africa | 69.3% |
| South Asia | 55.8% |
| Latin America & Caribbean | 52.3% |
| East Asia & Pacific | 32.4% |
| Europe & Central Asia | 8.6% |

In Sub-Saharan Africa, **roughly nine in ten children cannot read by age 10.**
The learning crisis is, first and last, a problem of where a child is born.

### The access crisis has shrunk but not closed — and it has moved up a level

At least **51.2 million primary-age children are out of school** (sum of the
latest available value for every country; a lower bound, since countries with no
recent data are missing). The unfinished access agenda has migrated to the next
level: **61.2 million adolescents are out of lower-secondary school** worldwide
(UNESCO UIS `UIS.OFST.2`, 2019). As primary access approached saturation, the
bottleneck moved to the transition into and through secondary.

### The financing crisis underwrites both

**World education spending is 3.6% of GDP** (`SE.XPD.TOTL.GD.ZS`, latest) —
*below* the 4% floor set by the Education 2030 / Incheon Framework, and far below
its 4–6% target band. **92 of the 200 countries with spending data invest less
than 4% of GDP in education.** Nearly half the world's governments underfund
education relative to the globally agreed minimum. The learning and access
crises are not mysteries; they are, in large part, bought.

A fourth, quieter figure frames the rest: **global adult literacy is 87.7%** —
meaning roughly one in eight adults alive today cannot read, the accumulated
residue of decades of the problems above.

---

## 2. The dominant problem at every education level

The atlas tags every indicator with the education **level** it measures, so the
single worst problem per level falls out of the data (highest mean severity
across countries):

| Level | Dominant problem | Mean severity |
|---|---|---|
| **Pre-primary** (ISCED 0) | Low enrollment — the world's least-universal level | 39.6 |
| **Primary** (ISCED 1) | Children still out of school | 49.9 |
| **Lower secondary** (ISCED 2) | Adolescents out of school — the new access frontier | 48.3 |
| **Upper / secondary** (ISCED 3) | Net enrollment shortfall | 30.6 |
| **Tertiary** (ISCED 5–8) | Gender disparity in enrollment | 40.3 |
| **Adult / lifelong** | Adult illiteracy | 16.9 |
| **System-wide** | Youth NEET (not in education, employment or training) | 39.6 |

Read top to bottom, this is a single story: **the problem is no longer the
primary classroom door — it is the years on either side of it.** Pre-primary
(the foundation) is the least universal level on earth, and lower secondary (the
exit) is where the system loses adolescents in tens of millions. The middle is
comparatively solved; the bookends are not.

By **problem category**, averaged across all countries, severity ranks:

| Rank | Category | Mean severity | What it captures |
|---|---|---|---|
| 1 | **Skills / NEET** | 39.6 | youth disconnected from education *and* work |
| 2 | **Access / enrollment** | 31.4 | out-of-school children & adolescents |
| 3 | **Digital divide** | 30.9 | schools without internet |
| 4 | **Learning outcomes** | 28.6 | learning poverty, low test scores |
| 5 | Completion / dropout | 19.4 | |
| 6 | Financing | 19.2 | |
| 7 | Equity (gender) | 18.6 | |
| 8 | Infrastructure | 17.4 | |
| 9 | Literacy | 13.5 | |
| 10 | Teacher supply | 10.1 | |

(Severity is a 0–100 composite: gap vs the SDG 4 benchmark dominates, distance
from income-group peers and an adverse multi-year trend add on. Categories like
infrastructure and digital score *lower on average only because few countries
report them* — see §5 on data sparsity, which is itself a finding.)

---

## 3. The worst-off countries, by problem category

The atlas ranks every country's problem severity within each category. The
highest-severity countries (a data-grounded "where is this problem worst" list):

- **Access:** Somalia (84.8), South Sudan (69.1), Equatorial Guinea (61.8),
  Mauritania (53.2)
- **Completion / dropout:** South Sudan (76.6), Angola (71.2), Niger (67.9),
  Uganda (59.3)
- **Learning outcomes:** Nigeria (75.5), Haiti (70.9), Tuvalu (70.1),
  South Africa (66.0), Ghana (65.8)
- **Equity (gender):** Somalia (66.5), Afghanistan (58.8), South Sudan (53.0)
- **Financing:** Papua New Guinea (82.2), Nigeria (78.1), South Sudan (70.5),
  Lebanon (65.2)
- **Teachers (pupil–teacher ratio, training):** Malawi (50.9), Guinea-Bissau
  (48.3), Central African Republic (47.2), Chad (44.8)
- **Adult literacy:** South Sudan (75.6), Chad (67.7), Guinea (63.8), Mali
  (61.1), Niger (58.7)
- **Infrastructure (electricity/water in schools):** Nicaragua (92.4), Lesotho
  (90.0), Angola (90.0), Guinea (86.1), Niger (79.5)
- **Digital (internet in schools):** Nicaragua (91.5), Gabon (90.0), Algeria
  (90.0), Micronesia (89.9)

Two patterns dominate. First, **conflict and fragility** — South Sudan, Somalia,
Afghanistan, Central African Republic recur across categories; where the state
has collapsed, so has the school. Second, **Nigeria** appears at the top of both
*learning* and *financing*: the largest concentration of out-of-school and
non-reading children on earth sits alongside one of the lowest education-spending
shares — the financing crisis and the learning crisis, in one country.

A subtler signal: **South Africa appears among the worst on learning outcomes**
despite being an upper-middle-income country with near-universal access. Money
and enrollment are necessary but not sufficient — *quality* is its own problem.

---

## 4. The cross-cutting patterns

**Equity is the master variable.** Every headline number splits violently by
region and income. Learning poverty runs from 8.6% (Europe & Central Asia) to
86.5% (Sub-Saharan Africa) — a tenfold gap. The single best predictor of whether
a child can read at 10 is the country they were born in. Within countries,
**gender parity is still unmet in 51 countries at the secondary level** (gender
parity index ≥ 0.10 away from 1.0). In a few systems the gap now runs *against
boys* in tertiary enrollment — equity is not only a girls'-access problem
anymore.

**The learning crisis is distinct from the access crisis** and is worse. We have
spent two decades getting children into buildings; the data says the children
are in the buildings and not learning. Reform that only adds seats does not touch
the 48% who can't read.

**Financing is upstream of everything.** Half the world's governments are below
the 4%-of-GDP floor. The countries worst on learning and access are
disproportionately the countries worst on financing. This is the most
*actionable* finding in the atlas: it is a policy lever, not a mystery.

**The frontier has moved to the edges of the system** — pre-primary (the least
universal level) and lower-to-upper-secondary transition (where 61M adolescents
are lost). Plus a 21st-century layer the SDGs barely anticipated: the **digital
divide**, where in the poorest systems the share of schools with internet for
teaching is in the single digits.

---

## 5. Honest limitations — what this atlas does *not* capture

A founding problem statement that overclaims is worse than none. The honest
boundaries of this evidence:

**Data sparsity is worst exactly where the problems are worst.** Of the world's
25 low-income countries, **only 11 have any learning-poverty data at all.** The
countries in conflict — the ones topping every severity list — report the least.
Every "worst-off" ranking here is therefore a *lower bound on the lower bound*:
the true worst cases are partly invisible because broken states do not run
assessments. The 51.2M out-of-school primary figure is explicitly a sum of
latest-available country values, not a modeled global total, for the same reason.

**PISA covers 67 economies — overwhelmingly the rich ones.** The gold-standard
learning measure barely reaches the places with the deepest learning crisis.
India did not participate in 2022. Most of Sub-Saharan Africa never has. We
lean on World Bank learning poverty to fill the gap, but the highest-resolution
quality data is concentrated where quality is least in question.

**Indicators miss the problems that may matter most.** No global dataset
measures: curriculum *relevance* (whether what is taught matters); *pedagogy*
(rote memorization vs. understanding — a vast, largely unmeasured problem across
South and East Asia and beyond); *credentialism* (degrees decoupled from
competence); *corruption* (ghost teachers, sold exams, captured budgets); or the
*purpose* of education itself. These are real, arguably central, and flagged here
**qualitatively** precisely because they are absent from the quantitative record.
The atlas measures the measurable; Bucket's reform thesis must also address the
unmeasured.

**Latency and revision.** Education statistics lag 1–5 years and are revised.
"Latest" here means the most recent non-null value per country, which differs by
country — comparisons across countries are not always same-year.

**Aggregates are modeled.** Regional and world figures from the World Bank are
themselves estimates built on incomplete country reporting; they inherit the
sparsity above.

---

## 6. The mandate this lays down

The data is unambiguous about where reform should aim:

1. **A learning crisis, not (only) an access crisis** — 48% of children can't
   read at 10; reform must target what happens *inside* the classroom, not only
   who gets in.
2. **The poorest and most fragile contexts** — where every problem concentrates
   and where, perversely, we have the least data and the least measurement.
3. **The financing floor** — half the world underfunds education below the
   agreed minimum; this is the most directly actionable lever.
4. **The unmeasured problems** — relevance, pedagogy, credentialism, purpose —
   which no indicator captures and which may be the real frontier of reform.

Everything above is reproducible from this repository: re-run
`scripts/build_all.py`, then `scripts/findings.py`, and every figure regenerates
from the same authoritative sources. That is the point. Bucket's case for
reforming education does not rest on conviction. It rests on the record.

---

_Sources: World Bank EdStats (api.worldbank.org/v2, CC-BY-4.0); UNESCO Institute
for Statistics (api.uis.unesco.org); Our World in Data (ourworldindata.org);
OECD PISA 2022 Results, Volume I. Indicator codebook, benchmarks, and per-row
provenance: `edu/indicators.py`, `data/MANIFEST.json`, `docs/findings.json`.
Validation: `docs/VALIDATION.md` (14/14 checks pass)._
