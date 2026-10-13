# Edtech Map

187 players in `edtech-players.jsonl`, 136 market facts in `edtech-market.jsonl`, retrieved 2026-10-11. Efficacy was searched for 86 players; the other 101 are marked `not-searched`. Of the 86, 24 have an independent finding, 26 a company study and 36 none found, so 50 of 187 hold any efficacy evidence.

## Segments

| Segment | Leaders | Mechanism | Model | Evidence quality |
|---|---|---|---|---|
| Spaced repetition | Anki, Quizlet, RemNote, SuperMemo | Scheduled recall of cards | Free core, subscription | Weak: surveys and developer benchmarks |
| Language | Duolingo, Babbel, Busuu, Preply | Short drills and streaks, or human tutors | Freemium, subscription | Company studies with no control group |
| Adaptive mastery | ALEKS, IXL, Khan, Zearn, MATHia, Math Academy | Diagnostic, then mastery practice | School licenses | Strongest: randomized trials, small effects |
| MOOCs | Coursera with Udemy, edX | Video and quizzes toward a certificate | Subscription and enterprise seats | Independent data on completion only |
| Workplace | LinkedIn Learning, Pluralsight, Degreed, Docebo | Video libraries, skill tracking | Enterprise seats | Near absent |
| AI tutors | ChatGPT study mode, Gemini, Khanmigo, Chegg | Chat that answers or coaches | Bundled with a chatbot plan | A few trials of custom tutors |
| Researcher tools | Zotero, Elicit, Obsidian, Notion | Store and search papers and notes | Freemium | Accuracy tests only |
| K-12 and LMS | Canvas, Google Classroom, i-Ready | Course delivery, assessment | District contracts | Mixed, ESSA-rated for some |
| Test prep | UWorld, Amboss, Kaplan, Sketchy | Question banks | Fixed-term passes | Observational |
| Open and nonprofit | Khan, Wikipedia, OpenStax, MIT OCW | Free content | Donations, grants | Company reports |
| China and India | Yuanfudao, Zuoyebang, Physics Wallah, Byju's | Live classes, homework help | Course fees | Not searched |

## Evidence of learning

Strong: K-12 math tools with randomized trials. Evidence for ESSA rates Zearn strong at an average effect size of +0.09 across 22,575 students ([source](https://www.evidenceforessa.org/?p=1310)) and i-Ready math moderate at +0.23 on one study ([source](https://evidenceforessa.org/program/i-ready-personalized-instruction-math)). Two ALEKS meta-analyses put it level with classroom teaching, g = 0.05 ([source](https://digitalcommons.memphis.edu/facpubs/7254)). The effects are real and small.

Weak: language apps and flashcards. Duolingo and Babbel cite studies they ran or paid for. The Anki evidence is a survey of 165 medical students where daily users scored 238 against 233.5 on Step 1 ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC10176558)).

Absent: workplace learning, where 2 of 23 players have an independent finding and one of those is a negative Ofsted inspection of Multiverse ([source](https://feweek.co.uk/?p=156179)). Researcher tools report extraction accuracy and never learning.

AI tutors cut both ways. In a trial of nearly 1,000 students, unguarded GPT-4 access raised practice grades 48% and left students 17% lower once access ended, while a guarded tutor removed most of the harm ([source](https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html)).

No player in the file publishes each learner's measured retention at 30 days or transfer to new problems.

## The market since 2021

Size estimates for 2025 range from $187.0B ([Grand View](https://www.grandviewresearch.com/industry-analysis/education-technology-market)) to $404B ([HolonIQ forecast](https://www.holoniq.com/edtech/10-charts-that-explain-the-global-education-technology-market)). They disagree on scope: HolonIQ counts all digital education spend. The research firms count vendor revenue in narrower product sets, and two of them include classroom hardware.

Venture funding peaked at $20.8B in 2021 ([HolonIQ](https://www.holoniq.com/notes/global-edtech-venture-capital-report-full-year-2021)), fell to $2.4B in 2024 ([HolonIQ](https://www.holoniq.com/notes/edtech-vc-reached-2-4b-for-2024-representing-the-lowest-level-of-investment-in-a-decade)) and reached $2.6B in 2025 ([HolonIQ](https://www.holoniq.com/notes/edtech-hits-2-6b-in-investment-as-the-market-stabilizes-bigger-bets-in-ai-and-workforce-training)). HolonIQ's own later note gives 2024 as $1.8B.

Outcomes split by exposure to chatbots. Chegg lost its answer business: subscribers fell from 8.1M in 2022 to 6.6M in 2024, and it cut 56% of staff in 2025 ([10-K](https://www.sec.gov/Archives/edgar/data/1364954/000136495426000021/chgg-20251231.htm)). Duolingo grew revenue to $1,037.6M in 2025 ([10-K](https://www.sec.gov/Archives/edgar/data/1562088/000162828026012494/duol-20251231.htm)) while its market cap fell 43% after the AI-first memo and the backlash ([source](https://stockanalysis.com/stocks/duol/market-cap/)). Coursera absorbed Udemy in May 2026. 2U went through Chapter 11 in 2024, Byju's fell from $22B to insolvency ([source](https://en.wikipedia.org/wiki/Byju%27s)), and private equity took Instructure and PowerSchool private in 2024.

Nonprofits reach the most people per dollar. Khan Academy spent $87.5M in fiscal 2025 for 104.9M yearly learners, about $0.83 each, an estimate from its Form 990 ([source](https://projects.propublica.org/nonprofits/organizations/261544963)).

## Open ground

1. Learning tied to a person's own working output. Nearest: Exercism and LeetCode, which grade code on set exercises. Neither builds questions from the learner's own commits or papers.
2. A verified canon with paid citation. Nearest: OpenStax and Wikipedia. Both are free to cite and pay authors nothing per use.
3. Offline desktop with local data. Nearest: Anki, Obsidian, Zotero and Logseq. Anki has no curriculum, and Obsidian and Zotero schedule no review.
4. Measured retention and transfer shown to the learner. Nearest: ALEKS progress assessments and Math Academy. Both cover school math only and publish no per-learner retention figure.
5. Research-career learning. Nearest: Elicit and Readwise. Elicit extracts findings and stops. Readwise resurfaces highlights without testing understanding.

## Risks for Bucket

1. Free chatbot study modes absorb the casual learner, as they absorbed Chegg's.
2. Bucket has no efficacy study. The segment with trials shows effects near 0.1 SD, so a Bucket trial may show little.
3. Venture funding in 2025 sat 87% below the 2021 peak, our division of the two HolonIQ figures, and Khan Academy's reach cost $87.5M that year.
4. AnkiHub now stewards Anki and can add curriculum and AI to the largest offline review base.
5. Hand-verified canon grows slowly, and generated content carries citation error: AI search tools answered over 60% of test queries incorrectly ([source](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php)).
