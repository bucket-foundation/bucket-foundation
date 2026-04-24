# Bead Backlog — "Make the Stack Participable"

Filed 2026-04-23. Nucleus API currently 401'd on `/api/portfolio/dispatch` (nginx basic-auth rejecting founder creds — see CLAUDE.md Strategic Priority "bkt-epic-infra"). These will be filed via `bd-remote` once that's unblocked. Priority 1 = blocker for external-dev / agent participation.

## Stack Reality Check (what works, what doesn't — 2026-04-23)

| Component | State | Blocker for external participation? |
|-----------|-------|-------------------------------------|
| bucket.foundation site | ✅ live at www.bucket.foundation, v0.2.0, mobile-responsive | No |
| bucket-foundation repo | ✅ public (github.com/bucket-foundation/bucket-foundation) | Needs CONTRIBUTING + .env.example + dev quickstart |
| feed402 spec + ref impl | ✅ public (gianyrox/feed402), boots locally, manifest valid | Wallet=0x000…, no hosted demo, no Docker one-liner |
| x402-research-gateway | ✅ public code (gianyrox/x402-research-gateway), compiles | **Not hosted anywhere.** No agent can actually pay the rail. |
| Viatika vendor integration | ✅ vendor live, we're a customer | Not ours to ship |
| Story Protocol / Walrus mint path | ❓ code exists, no docs for canon submitters | Submission path unclear |

**Blocking chain:** external dev watches demo video → goes to bucket.foundation → wants to try feed402 → no hosted endpoint to hit → bounces.

---

## Bucket Foundation repo (4 beads)

### bkt-cont-01 · P2 · CONTRIBUTING.md for external devs (canon + code paths)
Two contribution paths: (1) code PRs to the Next.js site, (2) canon submissions via Story Protocol IP NFT mint. Doc setup (`npm i`, `npm run dev`, env vars for Dynamic/Supabase/Story), canon submission criteria (axioms/laws/primary derivations only, not outcomes), MIT/CC0 licensing expectations. Link from README.

### bkt-cont-02 · P2 · README dev quickstart + stack diagram
Current README is mission-heavy, no dev quickstart. Add: clone → `npm i` → copy `.env.example` → `npm run dev` → localhost:3000. Stack diagram (Next14 + Dynamic + Supabase + Story Protocol + Walrus + Viatika). Badges (MIT, CC0 spec, Vercel, Next14).

### bkt-cont-03 · P2 · .env.example committed + secrets documented
No `.env.example` in repo. External devs have no clue which env vars are required. Ship: `NEXT_PUBLIC_DYNAMIC_ENV_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STORY_RPC_URL`, `WALRUS_*` — placeholder values, link to where to get each key.

### bkt-cont-04 · **P1** · Wire bucket.foundation → x402-research-gateway live demo
Site talks about feed402/x402 citation protocol but has no live wire-up. Add `/research` page or widget that issues a real feed402 query against the hosted gateway (depends on `x402-gw-deploy-01`) and renders the cited envelope. Proves "claude is always doing research for me" concretely.

---

## x402-research-gateway repo (3 beads)

### x402-gw-deploy-01 · **P1** · Host at x402-research.agfarms.dev
**Gateway only runs locally — biggest blocker in the whole stack.** Repo has `Caddyfile`, `docker-compose.prod.yml`, `deploy.sh` — wire them up. Needs:
- DNS record: `x402-research.agfarms.dev` → Hetzner CPX42 IP
- K3s manifest in a new namespace (or Caddy standalone)
- Base Sepolia wallet key in K8s secret (fund with ~$5 USDC)
- Caddy ACME for TLS
- Health check: `GET /.well-known/feed402.json` returns 200
Without this, no external agent can pay the rail and the demo video promise is a lie.

### x402-gw-docs-01 · P2 · Agent-builder quickstart in README
Current README is internal-facing. Write "build an agent against this gateway in 5 min": manifest URL, auth pattern, raw/query/insight tier trade-offs, cURL + TypeScript + Python examples hitting `/insight` with a Base wallet sig. Link from `bucket.foundation/research`.

### x402-gw-ci-01 · P2 · GitHub Actions: build + e2e on PR
No CI. Add workflow: `go build`, unit tests, boot server + hit `/.well-known/feed402.json`, verify schema compliance against feed402/0.2. Required for external PRs to be reviewable + mergeable.

---

## feed402 repo (3 beads)

### feed402-wallet-01 · **P1** · Configure real Base Sepolia wallet in demo manifest
Current manifest wallet = `0x0000…0000`. Demo claims payment but goes nowhere. Burn a Base Sepolia test wallet into demo config + fund it with ~$5 USDC. Alternative: `DEMO_MODE=1` flag that fakes settlement with a clear `DEMO` banner in the receipt. Pick the real-wallet path for credibility.

### feed402-sync-01 · P3 · AGFarms/feed402 fork sync + CONTRIBUTING
AGFarms org fork exists but may drift from `gianyrox/feed402`. Set up daily upstream-sync workflow. Add `CONTRIBUTING.md`: spec changes = CC0, ref impl = MIT, bead-first rule for AGFarms-origin changes.

### feed402-docker-01 · P3 · `demo.sh` one-command Docker path
`demo.sh` requires node>=20 + `npm install`. Ship `Dockerfile` + `docker run farmera/feed402` one-liner. Lower barrier for evaluators to literal zero. Publish to Docker Hub.

---

## Cross-cutting / landing (1 bead)

### bkt-build-01 · P2 · `/build` landing page at bucket.foundation
New `/build` page: "integrate bucket in 10 min". Three paths:
1. **Run an agent** against the research gateway (code snippet + npx one-liner)
2. **Become a data merchant** via feed402 (clone template → fill manifest → push)
3. **Contribute a canon entry** (Story Protocol mint flow)

Each path: code snippet + repo link + expected output. Ties all three repos together so devs see the full stack. Link from header nav + demo video CTA.

---

## Priority-1 chain (do in this order)

1. `x402-gw-deploy-01` — host the gateway (unblocks everything)
2. `feed402-wallet-01` — real wallet in demo
3. `bkt-cont-04` — wire bucket.foundation → live gateway
4. `bkt-build-01` — `/build` landing

After that ladder is green, an external dev can watch the demo, hit `/build`, clone one repo, and have a working agent in <10 min.

---

## Longtermism / Deep-History / Biophysics Research Track (filed 2026-04-23)

Filed via `bkt-nuc` session. Nucleus dispatch still 401'd; will be promoted to live beads once `bkt-epic-infra` ships. Canon/landscape split enforced per founder direction: foundation-tier → `bucket-canon/<branch>/`, hypothesis/commercial-tier → `research-landscape/` (new sibling directory, outside canon).

### bkt-research-01 · P1 · Pipeline: DOI resolver → canon mirror
Build DOI resolution + paper-fetch pipeline feeding `gdrive:AGFarms/Nucleus/research/bucket-canon/`. Sources: OpenAlex, arXiv, bioRxiv, Crossref, PubMed, Semantic Scholar. Fallback: Sci-Hub for paywalled DOIs (local read only — canon stores DOI + canonical_url + our notes, NEVER redistributes PDFs). Open-access sources get full mirror (license allows). Reuse `x402-research-gateway` where possible. Flow: `query → DOI list → metadata → canon-score → mirror`. Foundation for all other research beads below — ship first.

### bkt-research-02 · P2 · Canon scaffold: `08-deep-history` branch + `research-landscape/` sibling
Add canon branch `08-deep-history` under `bucket-canon/` for foundation-tier deep-history science (archaeoastronomy primaries, Schoch Sphinx erosion geology, geomagnetic siting primary papers). Update `TAXONOMY_NOTES.md` with rationale. **Also create `research-landscape/` directory outside canon** for hypothesis-tier material (Hancock, Carlson, UnchartedX, alt-history podcasters). Only primary-source-verified material promotes landscape → canon. Keeps canon clean; landscape honest.

### bkt-research-03 · P2 · canon-figures/ pass-2 index (~25 new names)
Extend `canon-figures/` contributor index:
- **Deep history**: Hancock, Carlson, Schoch, West, Foerster, Schmidt (Gobekli Tepe †)
- **Biophysics/melanin/mito**: Solís-Herrera, Doug Wallace, Szent-Györgyi, Gilbert Ling, Gerald Pollack, Fritz-Albert Popp, Robert O. Becker, Nick Lane, Doris Loh, Georgi Dinkov, Ray Peat (†)
- **Peptides**: Khavinson, William Seeds
- **Longtermism (philosophy tier)**: Bostrom, Ord, MacAskill, Parfit (†)
Each entry: name, branch, 1-line contribution, 1–3 key works.

### bkt-research-04 · P2 · Canon dossier: melanin as biological semiconductor (`05-biophysics/melanin/`)
Primary-source dossier on melanin/eumelanin water-splitting + semiconduction. Core: Solís-Herrera "Human Photosynthesis" papers, Pollack EZ-water, Becker bioelectric medicine, Szent-Györgyi electronic biology. Mechanism focus, no clinical claims. Output: `CANON_INDEX.md` entry + annotated bibliography.

### bkt-research-05 · P2 · Canon dossier: mitochondria primary science (`05-biophysics/mitochondria/`)
Foundation-tier mitochondrial science. Doug Wallace (mtDNA/disease), Nick Lane (*Power, Sex, Suicide* + primary papers), Szent-Györgyi, cytochrome c oxidase enzymology, ELF-field coupling primary refs, deuterium depletion primary literature. Separate the science from the commentariat. Output: `CANON_INDEX.md` entries.

### bkt-research-06 · P2 · Canon dossier: peptide science primary literature (`05-biophysics/peptides/`)
Foundation-tier peptide literature: Khavinson epithalon/bioregulators, BPC-157 mechanism, MOTS-c (Lee et al), GHK-Cu (Pickart), SS-31 (Szeto), TB-500/thymosin-β4, semax/selank (Russian primary lit). Mechanism of action only — NOT dosing/clinical/commercial. Lives in canon; separate from peptide-markets landscape bead.

### bkt-research-07 · P3 · Landscape: RUO peptide marketplace scan (read-only, non-facilitation)
Index research-use-only peptide vendor landscape as situational awareness — **NOT a buyer's guide, NOT canon**. Scope: vendor list, COA practices, RUO regulatory framing, pricing trends, geographic distribution. Output: `research-landscape/peptide-markets/` (outside `bucket-canon/`). **Explicit non-facilitation clause**: Bucket indexes information about the market, does not enable purchase or use. Read-only scraping, no account creation, no transactions.

### bkt-research-08 · P3 · Canon seed: GOE + radiosynthesis↔photosynthesis deep-time thread
Seed Great Oxygenation Event (~2.4 Gya) material across `06-cosmology` (atmospheric O₂ history) and `05-biophysics` (photosynthesis → radiosynthesis continuity; Dadachova melanized fungi at Chernobyl primary papers). Argues energy-from-light/ionizing-radiation as continuous across deep time into modern biology. Primary refs only.

### bkt-research-09 · P4 · Shelf: longtermism philosophy (separate from science canon)
Curate longtermism philosophy shelf: Bostrom (*Superintelligence*, *Deep Utopia*), Ord (*The Precipice*), MacAskill (*What We Owe the Future*), Parfit (*Reasons and Persons* foundations). **PHILOSOPHY TIER flag** — does NOT enter science canon (which holds only foundations/axioms/primary derivations). Lives in `research-landscape/philosophy/longtermism/`. Last priority; most separable.

### Shipping order (founder-approved 2026-04-23)
1. `bkt-research-01` (pipeline — blocks all others)
2. `bkt-research-02` (canon scaffold + landscape sibling)
3. `bkt-research-03` (figures index pass-2)
4. Parallel: `bkt-research-04`, `bkt-research-05`, `bkt-research-06` (three dossiers)
5. `bkt-research-07`, deep-history landscape scans (from `08-deep-history` intake)
6. `bkt-research-08` (GOE/radiosynthesis seed)
7. `bkt-research-09` (longtermism shelf)

---

## Figures / Religion / Ancient Sites / Becker Research Track (filed 2026-04-23)

Second batch, filed same session. Canon/landscape split continues.

### bkt-research-10 · P2 · Polymath register (`canon-figures/_polymaths.md`)
Cross-branch contributors whose work spans ≥3 canon branches. Seed: Leonardo, Newton, Gauss, Poincaré, von Neumann, Feynman, Turing, Ramanujan, Wiener, Goethe, Ibn al-Haytham, al-Khwarizmi, Avicenna, Pascal, Leibniz, Tesla, Helmholtz, Maxwell, Émilie du Châtelet, Hypatia (†), Ada Lovelace, Hildegard of Bingen. Entry: name, branches touched, primary works, qualifying criterion (not just famous).

### bkt-research-11 · P3 · Polyglot register (`canon-figures/_polyglots.md`)
Figures whose multilingualism was load-bearing for the work: Champollion, Schliemann, Mezzofanti, Tolkien, William Jones (Indo-European), Richard F. Burton, Ventris (Linear B), Kató Lomb. Separates "knew many languages" from "language was the epistemic instrument."

### bkt-research-12 · P3 · Landscape: history commentariat (`research-landscape/history-commentariat/`)
Modern history/civilization commentators who move public understanding but aren't primary-source historians: Hancock, Carlson, Dan Carlin (Hardcore History), Martin Rundkvist, Fall of Civilizations, Tides of History, Historia Civilis, Kurzgesagt-history. Landscape only, zero auto-promotion to canon. Evaluation axes: sourcing rigor, primary-reference density, retraction history.

### bkt-research-13 · P2 · Canon scaffold: `09-sacred-texts` branch + public-domain source index
New canon branch `09-sacred-texts` for primary religious/philosophical texts (treated as primary sources, NOT as truth claims — same discipline as Euclid). PD/open-license seed sources:
- **Tanakh**: Westminster Leningrad Codex (PD), Sefaria API (CC-BY)
- **Christian Bible**: KJV/ASV/WEB (PD); SBLGNT Greek NT (CC-BY)
- **Quran**: Tanzil.net (CC BY-ND), Quran.com API
- **Buddhist**: Pali Canon via SuttaCentral (CC0/CC-BY), BDK English Tripitaka
- **Hindu**: Rig Veda (Griffith PD), Upanishads (PD translations)
- **Taoist**: Tao Te Ching (multiple PD), Zhuangzi
- **Zoroastrian**: Avesta (PD)
- **Gnostic/Nag Hammadi**: Nag Hammadi Library (PD scans)
- **Egyptian**: Pyramid Texts, Book of the Dead (Budge PD)
- **Mesopotamian**: Enuma Elish, Gilgamesh (PD)
- **Mesoamerican**: Popol Vuh, Chilam Balam (PD)
Output: `09-sacred-texts/SOURCES.md` + download pipeline to `gdrive:bucket-canon/09-sacred-texts/`.

### bkt-research-14 · P3 · Landscape: comparative mythology / cataclysm motifs (`research-landscape/myth-patterns/`)
Cross-cultural flood/fire/sky-change motifs: Sumerian, Hebrew, Greek, Hindu, Mesoamerican, Aboriginal, Native American. Secondary scholarship: Dumézil, Eliade, Campbell, de Santillana & von Dechend (*Hamlet's Mill* — precession-encoded myth). Analytical landscape, not canon.

### bkt-research-15 · P2 · `08-deep-history/sites/` — global ancient-site index
Geodetic + chronological index of pre-3000 BC sites with primary-literature citations. Seed: Göbekli Tepe, Karahan Tepe, Çatalhöyük, Giza, Saqqara, Abu Gorab, Stonehenge, Newgrange, Carnac, Nabta Playa, Teotihuacan, Tiwanaku, Puma Punku, Sacsayhuamán, Nan Madol, Yonaguni, Gunung Padang. Each entry: coordinates, dating refs, primary archaeological papers, dating controversies. Canon = dated primary findings; alt-dating hypotheses → landscape.

### bkt-research-16 · P2 · `08-deep-history/cataclysms/` — cataclysm event catalog
Primary literature on known + proposed Holocene / late-Pleistocene cataclysms:
- **Younger Dryas Impact Hypothesis** — Firestone et al 2007, Moore et al 2020, Sweatman review; primaries + rebuttals
- **Meltwater Pulse 1A / 1B** — sea-level primary data
- **8.2 kiloyear event**
- **Toba eruption** (~74 kya)
- **Chicxulub** (K-Pg methodology template)
- **Hiawatha crater** (Kjær 2018) + age debate
- **Miyake events** (774 AD, 993 AD, 660 BC — ¹⁴C spike solar-proton primaries)
Canon = peer-reviewed primary dating/evidence. Carlson's synthesis → landscape.

### bkt-research-17 · P1 · Robert O. Becker complete dossier (`05-biophysics/becker/`)
**Becker is foundational for bioelectric medicine — dedicated folder.** Can ship BEFORE general DOI pipeline (bead #01) because it's a bounded crawl + known paper list. Good first real deliverable.

Deliverables:
1. **Site mirror**: `robertobecker.net` full crawl (respect robots.txt; text + PDFs + images). Output: `bucket-canon/05-biophysics/becker/site-mirror/<YYYY-MM-DD>/` + gdrive.
2. **Papers**: all Becker-authored/co-authored papers via PubMed + Google Scholar + citation chase. DC currents + limb regeneration (salamander, frog, rat); silver electrode wound healing; ELF field bioeffects; Becker-Marino series; Syracuse VA work. DOI + citation + OA PDF where license allows; canonical-URL-only for paywalled.
3. **Books** (bibliographic, link to WorldCat — not piracy):
   - *The Body Electric* (1985, w/ Gary Selden)
   - *Cross Currents* (1990)
   - *Electromagnetism and Life* (1982, w/ Andrew Marino)
4. **Lineage / influenced-by network**: Andrew Marino, Marco Bischof, James Oschman, Gerald Pollack, Mae-Wan Ho (†), Cyril Smith, Abraham Liboff, Reba Goodman, Carl Blackman, Martin Blank (†). Each: relationship to Becker + 1–3 key works extending his line.
5. **Interview/talk index**: YouTube/archive talks + interviews (transcripts where available). Landscape tier.

Layout:
```
bucket-canon/05-biophysics/becker/
  CANON_INDEX.md
  biography.md
  papers.bib
  books.md
  lineage.md
  site-mirror/<date>/
research-landscape/biophysics/becker-commentariat/
  interviews.md
  talks.md
```

### bkt-research-18 · P3 · Bioelectric lineage dossier (`05-biophysics/bioelectric-lineage/`)
After Becker dossier lands, build the broader bioelectric-foundations arc: Galvani → Volta → DuBois-Reymond → Harold Saxton Burr (Yale L-fields) → Becker → Nordenström → Michael Levin (Tufts, modern bioelectric morphogenesis). Canonical papers per node showing the 18th-c frog legs → modern morphogenetic fields progression.

### Shipping order (second-batch, founder-approved 2026-04-23)
0. `bkt-research-17` (Becker) — can ship *before* pipeline because bounded
1. Pipeline from batch 1 (`bkt-research-01`) — then unlocks everything else
2. `bkt-research-13` (sacred-texts scaffold) + `bkt-research-15` (sites index) + `bkt-research-16` (cataclysms) in parallel once pipeline lands
3. `bkt-research-10` (polymaths), `bkt-research-11` (polyglots), `bkt-research-18` (bioelectric lineage)
4. `bkt-research-12` (history commentariat), `bkt-research-14` (myth patterns)
