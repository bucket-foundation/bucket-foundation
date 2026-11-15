# Career-Specific and Workplace Language Learning

## Data Sources for Job Vocabulary

### Takeaway
O*NET and ESCO give free, openly licensed occupation data in bulk: tasks, tools, technology and skills for about 900 US occupations and about 3,000 EU occupations. ESCO is multilingual. Job posting text is the costly layer: Lightcast postings are contracted, USAJOBS is free but federal-only.

### Cited Findings
- O*NET database is mostly under Creative Commons CC BY 4.0; career exploration tools carry separate licenses: [O*NET licenses](https://www.onetcenter.org/license_agreements.html), [O*NET 29.2 Database License](https://onetcenter.org/license_db.html)
- Current release is O*NET 30.2, offered in five formats including Excel and tab-delimited; one ZIP holds all 40 core files: [O*NET Database](https://www.onetcenter.org/database.html)
- The O*NET Tools and Technology file lists machines, equipment, tools and software workers use, coded to the UN Standard Products and Services Code (UNSPSC). This is the direct "shovel for construction laborer" source: [Tools and Technology readme](https://onetcenter.org/dl_files/tools_technology_readme.pdf)
- O*NET Web Services offers API access: [services.onetcenter.org](https://services.onetcenter.org/about)
- ESCO: free portal, downloadable as SKOS-RDF, ODS or CSV; web API plus a local API; API licensed EUPL 1.2 with Apache 2.0 components: [ESCO FAQ](https://esco.ec.europa.eu/en/about-esco/faq), [ESCO services API](https://esco.ec.europa.eu/ar/use-esco/use-esco-services-api)
- ESCO v1.2 has about 3,039 occupations and 13,890 skills, built on ISCO-08; language count reported as 28 (EU official languages plus Icelandic, Norwegian, Ukrainian, Arabic), though other sources say 27 or 24: [Lifelong-learning.lu](https://lifelong-learning.lu/actualite/13-890-skills/en), [Interoperable Europe](https://interoperable-europe.ec.europa.eu/collection/labour-market-interoperability/about-esco-european-classification-skills-competences-qualifications-and-occupations-esco)
- Lightcast Open Skills library is free for individual and nonprofit use with attribution; the free API caps at 50 skill extraction calls a month and excludes job titles, occupations and production use: [Lightcast Open Skills FAQ](https://lightcast.io/open-skills/faqs), [Lightcast free API access](https://docs.lightcast.io/lightcast-api/docs/free-api-access)
- Lightcast job posting data requires a paid contract. A competing vendor (JobsPipe) claims the free Skills tier became nonprofit-only in April 2026, which conflicts with Lightcast's docs: [JobsPipe on Lightcast pricing](https://jobspipe.dev/blog/lightcast-pricing)
- USAJOBS API is free with a key requested at developer.usajobs.gov; requests send Host, User-Agent (registered email) and Authorization-Key headers; rate limits exist but numbers unpublished in sources found: [JobsPipe USAJOBS guide](https://jobspipe.dev/guides/usajobs-api), [publicapi.dev](https://publicapi.dev/usajobs-api)

### Inferences
- A practical pipeline: map the learner's stated career to an O*NET-SOC code (or ESCO/ISCO outside the US), pull task statements, tools and technology, and work activities, then have an LLM extract and rank concrete nouns and verbs and translate them. ESCO's multilingual labels can seed translations for occupation and skill names.
- O*NET's CC BY 4.0 permits commercial use with attribution, so a paid app can ship derived word lists.
- Job postings mostly add soft-skill and credential vocabulary; O*NET tools and tasks cover the concrete on-the-job nouns more cheaply.

### Gaps
- Did not verify Indeed, LinkedIn or Common Crawl job posting dataset terms; LinkedIn and Indeed prohibit scraping in general terms of service, unconfirmed here.
- No published occupation-specific vocabulary lists at scale for languages other than English were found.
- BLS OEWS data (employment counts by occupation, useful for prioritizing which careers to build first) not fetched in this pass.

## Competitors

### Takeaway
Enterprise players (Voxy, EnGen, Babbel for Business, Berlitz, British Council) sell workplace English or industry courses to employers. Occupational Spanish for English speakers is served by Command Spanish licensed through community colleges and by Babbel's construction Spanish. None found generate a vocabulary set from an arbitrary stated job.

### Cited Findings
- Voxy sells English training to employers; its Business English course has 18 units and 120+ hours; in March 2026 it added AI Chat and AI Voice Chat with short workplace scenarios: [Voxy business English](https://voxy.com/?p=14861), [Voxy AI](https://voxy.com/?p=134850)
- EnGen (B Corp) offers career-aligned English instruction; it is Amazon Career Choice's English partner; Maine offers EnGen to local employers at no cost and North Dakota bought 1,000 seats for employers; its 2026 impact survey (vendor-reported, published via NCCER) says 85% of learners are more likely to stay with their employer: [EnGen](https://getengen.com/), [Maine](https://www.myworksourcemaine.gov/so/node/497), [North Dakota](https://www.nd.gov/news/north-dakotas-global-talent-office-launches-statewide-effort-connect-workers-career-aligned), [2026 EnGen Impact Survey](https://www.nccer.org/media/2026/10/2026_EnGen_Impact_Survey_PDF.pdf)
- EnGen partnered with NCCER, the construction craft training body, which hosts its impact survey: [NCCER PDF](https://www.nccer.org/media/2026/10/2026_EnGen_Impact_Survey_PDF.pdf)
- British Council EnglishScore uses AI for test validity; corporate offering includes live classes, self-study or blended learning tailored to workforce needs: [British Council corporate](https://corporate.britishcouncil.org/sector-solutions/business)
- Babbel for Business sells Construction Spanish courses covering on-site vocabulary, safety protocols and project management: [Babbel for Business construction](https://www.babbelforbusiness.com/us/spanish-for-business/construction/)
- Babbel for Business pricing listed on review sites from $8.99 per month; quoted by number of users: [Capterra](https://www.capterra.com/p/234859/Babbel/), [SaaSworthy](https://www.saasworthy.com/product/babbel-for-business)
- Duolingo for Business: no public pricing found: [FitGap](https://us.fitgap.com/products/021941/duolingo-for-business)
- Berlitz, a competitor, lists Duolingo for Business and Babbel for Business among the most used corporate platforms in 2025 and says Duolingo lacks support for corporate-specific language goals: [Berlitz blog](https://www.berlitz.com/blog/business/top-corporate-business-language-learning-programs)
- Command Spanish, Inc. licenses non-grammar occupational Spanish through colleges, with tracks for paramedics/EMTs, warehousing, construction sites, retail, dental, hospitality, real estate and healthcare; formats range from one day to 18 hours: [Northampton CC](https://cmsprod04.northampton.edu/education-and-training/community-education/command-spanish.html), [BPCC](https://bpcc.edu/workforce-development/command-spanish), [Houston CC](https://hccs.edu/hcc-talent-solutions/training-solutions/spanish-esl--languages)
- Fox Valley Tech runs Spanish for Construction for English speakers; Penn State runs Spanish for Healthcare Workers: [FVTC](https://www.fvtc.edu/news/story/spanish-for-construction-bridges-communication-gaps), [Penn State](https://continuinged.psu.edu/explore-programs/spanish-fundamentals-for-todays-workplace)

### Inferences
- Two directions of demand: LEP immigrant workers learning English (employer and government funded) and English-speaking supervisors learning Spanish (employer funded, safety driven). Polingual's multi-language model fits both.
- Incumbents sell fixed industry tracks. Generating a vocabulary set for any of ~900 O*NET occupations on demand is a gap in what was found.

### Gaps
- No reliable data found for Talkpal, Preply Business, Speexx, Busuu for Business, Rosetta Stone Enterprise, or Cleveland Clinic and hospital language programs; searches returned nothing usable.
- No revenue or seat counts for Duolingo for Business or Babbel for Business.

## Buyers, Funding and Market Size

### Takeaway
Funding exists through employer education benefits (Amazon Career Choice funds ESL), state workforce boards buying seats, and WIOA Title II adult education (about $715M state grants, about $86M IELCE set-aside), though the FY2026 federal budget proposed eliminating adult education state grants. Market size estimates for language learning vary from $5.9B to $79B by definition, with B2B over half of online language learning by one estimate.

### Cited Findings
- Amazon Career Choice funds ESL proficiency certifications; over 10,000 US employees have taken its English programs; eligibility listed as 90 days for 750,000 US hourly workers, though EF reported in July 2025 that Amazon removed the waiting period for English training: [Amazon Career Choice](https://www.aboutamazon.com/news/workplace/career-choice), [EF Corporate Learning](https://corporatelearning.ef.com/en/resources/articles/access-language-training-amazon/)
- Amazon chose EnGen as an English partner in 2022, paid through Career Choice; Amazon employees in 14 countries get prepaid English and local language classes: [EnGen Amazon](https://getengen.com/amazon), [About Amazon](https://aboutamazon.com/news/workplace/amazon-employees-in-14-countries-can-now-learn-english-and-other-local-languages-via-pre-paid-classes-heres-how)
- Guild works with Amazon on Guild Navigator for licensing and certification programs; no source found showing Guild as an English provider: [Chain Store Age](https://chainstoreage.com/amazon-partners-upskilling-platform-develop-internal-talent)
- EnGen says programs like it qualify for WIOA funds when embedded in credential pathways: [EnGen blog](https://getengen.com/blog-posts/the-missing-piece-in-workforce-development)
- ED's FY2026 congressional justification proposed eliminating Adult Education Basic and Literacy State Grants: [ED FY2026 CJ](https://www.ed.gov/media/document/fy-2026-congressional-justification-career-technical-and-adult-education-110142.pdf)
- New America reports ED withholding $715M for these programs; the system served 1.3 million learners in the prior year: [New America](https://www.newamerica.org/insights/trumps-funding-delay-will-devastate-adult-literacy-programs/)
- ED issued FY2026 estimated state AEFLA allocations (updated May 13, 2026); Texas allocation fell from $77.86M (FY2025) to $75.15M (FY2026): [Texas Workforce Commission](https://www.twc.texas.gov/sites/default/files/ogc/mtg25/commission-meeting-material-100725-item5a-fy2026-allocations-ael-twc.pdf)
- IELCE (Integrated English Literacy and Civics Education) set-aside: $85,854,600 under the 2025 appropriation: [Grantsights](https://grantsights.com/blog/grants-for-adult-education-programs), [Wisconsin IELCE chart](https://mywtcs.wtcsystem.edu/wp-content/uploads/2025/09/IELCE-Section-243-Funding-Chart.pdf)
- CCRC (March 2026): over 18 million working-age adults do not speak English very well or at all: [CCRC](https://ccrc.tc.columbia.edu/wp-content/uploads/2026/03/community-colleges-providers-adult-education.pdf)
- Language learning market 2025 estimates: $5.86B (Meticulous), $8.2B (TrendX), $14B (GMI), $78.86B (GII): [Meticulous](https://meticulousresearch.com/reports/language-learning-market-5561), [GMI](https://www.gminsights.com/industry-analysis/language-learning-market), [GII](https://www.giiresearch.com/report/sky1920026-language-learning-market-size-share-growth.html)
- Meticulous: B2B expected to hold over 56% of online language learning in 2025; corporate learners the fastest-growing segment: [Meticulous online language learning](https://meticulousresearch.com/reports/online-language-learning-market-5025)
- Chobani employees got a pay increase after an EnGen/Voxy pilot (vendor case study): [EnGen webinar](https://getengen.com/s/January-2022-Webinar.pdf)

### Inferences
- The fastest B2B entry is likely state workforce boards and employers that already buy seats (Maine, North Dakota model), plus employer tuition programs that accept ESL vendors.
- Federal adult education money is at political risk in 2026; build plans should not depend on it.

### Gaps
- Final FY2026 AEFLA and IELCE appropriation not confirmed.
- No data found on Walmart Live Better U language offerings, union programs, staffing agency programs, or refugee resettlement workforce ESL budgets.
- No credible standalone size for workplace or occupation-specific language training; market reports are paywalled marketing summaries.

## US Industries With the Largest Language Gaps

### Takeaway
About 26.5 to 28 million US residents are limited English proficient, and about 18 million working-age adults speak English less than very well. LEP workers concentrate in agriculture and natural resources, construction, manufacturing and hospitality; national industry-level LEP shares need an ACS PUMS pull.

### Cited Findings
- MPI: about 27.7 million LEP residents as of 2023; MPI March 2025 testimony gave 26.5 million: [MPI language diversity](https://www.migrationpolicy.org/article/language-diversity-and-english-proficiency-united-states), [MPI testimony](https://www.migrationpolicy.org/sites/default/files/publications/USCCR-Hofstetter-Testimony-March2025-FINAL.pdf)
- KFF: about 26 million LEP, about 8% of people 5+: [KFF five key facts](https://www.kff.org/racial-equity-and-health-policy/five-key-facts-about-immigrants-with-limited-english-proficiency)
- Secondary blogs cite 28.5M (KFF, 2024 ACS) and 28.9M (MPI, 2024 ACS); unverified against originals: [VoxBooster](https://voxbooster.com/blog/bilingualism-multilingual-households-statistics-2026)
- MPI: employed LEP men are much more likely than English-proficient men to work in construction, natural resources and maintenance; LEP women more than twice as likely to work in service and personal care: [MPI](https://www.migrationpolicy.org/article/language-diversity-and-english-proficiency-united-states)
- Oregon, ACS 2019 to 2023: natural resources and mining (incl. agriculture) 25% LEP; manufacturing 10% (23,500 workers); construction 9% (11,800); leisure and hospitality 9% (19,100); about 6% of all workers: [Oregon Employment Dept](https://qualityinfo.org/-/ability-of-oregon-workers-to-speak-english-varies-by-type-of-job-1)
- Construction business owners had a 30.8% LEP share (2018 ACS), second highest among industries: [New American Economy](https://research.newamericaneconomy.org/report/covid19-immigrant-entrepreneurs-languages)
- Immigrant healthcare workers are more likely than immigrant workers overall to speak English fluently: [MPI health care workers](https://www.migrationpolicy.org/article/immigrant-health-care-workers-united-states-2021)
- Brookings: LEP workers concentrate in low-paying jobs and different industries: [Brookings](https://www.brookings.edu/articles/investing-in-english-skills-the-limited-english-proficient-workforce-in-u-s-metropolitan-areas/)

### Inferences
- English for LEP workers: agriculture, construction, manufacturing/warehousing, hospitality and food service have the largest gaps.
- Healthcare's gap is mostly patient-facing: English-speaking clinicians need Spanish and other languages for LEP patients, which matches Command Spanish and Spanish for Healthcare demand.

### Gaps
- No national ACS table of LEP workers by industry found; requires a PUMS query (ENG variable by INDP).
- Logistics-specific LEP counts not found.

## AI Personalization and Evidence for Goal-Targeted Vocabulary

### Takeaway
Praktika, Speak and Voxy personalize around goals such as job interviews and workplace scenarios, but none found build a curriculum from an arbitrary job title. Corpus research shows technical vocabulary makes up a large share of specialized text, about 20 to 30% by Chung and Nation, which supports teaching job-specific words early.

### Cited Findings
- Praktika lessons cover careers, job interviews and business; its blog describes adapting lessons to a learner's goal of an overseas tech job: [App Store](https://apps.apple.com/app/id1624701477), [Praktika blog](https://praktika.ai/blog/learning-english-with-an-ai-tutor-how-it-works)
- Speak Premium Plus includes "Made for You" and unlimited personalized lessons (third-party review, affiliate risk): [Speakshark](https://speakshark.com/blog/praktika-vs-speak-app-2026)
- Voxy AI Voice Chat (March 2026) places learners in workplace scenarios tied to recent study: [Voxy](https://voxy.com/?p=134850)
- Chung and Nation: technical vocabulary is about 20 to 30% of specialized text; in an anatomy text about one word in three was technical; many technical words come from the first 2,000 words and the Academic Word List: [Chung and Nation 2003](https://www2.hawaii.edu/~readfl/rfl/October2003/chung/chung.pdf), [ScholarSpace](https://scholarspace.manoa.hawaii.edu/items/327ab56c-781a-4bb7-83b7-971329b0cd7d/full)
- Coxhead, Demecheleer and McLaughlin (2016) found similar technical vocabulary proportions in carpentry texts: [TESOL ALIS newsletter](https://tcnewsletter.s3.amazonaws.com/newsmanager.commpartners.com/tesolalis/print/2017-08-18/3.html)
- Other estimates put technical vocabulary at about 5% of running words, under a different measure: [ESPEAP](https://espeap.junis.ni.ac.rs/index.php/espeap/article/download/1117/542)

### Inferences
- A career onboarding question plus O*NET tool and task terms gives a learner a list that covers a sizable share of their workplace language, layered on the core high-frequency words.
- Polingual could claim occupation-level personalization across ~900 US occupations, which incumbents do not show.

### Gaps
- No controlled study found comparing job-targeted vocabulary with general curricula on retention or job outcomes.
- Duolingo Max roleplay specifics not verified in this pass.
- Talkpal job-goal features not found.
