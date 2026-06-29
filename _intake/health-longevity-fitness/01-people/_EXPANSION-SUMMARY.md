# People Map — Expansion Pass 2 + Pass 3 Summary

> Pass 2 carded the figures queued in `00-map/discovered-people.md` (Waves 1+2) and built the
> people × labs × trials relationship graph. **Pass 3 (2026-06-27) carded the FRESH batch that
> the parallel biomarker / metabolic / sleep / genetics agents appended to `discovered-people.md`
> AFTER Pass 2 ran — the Domain L (measurement & biomarkers) wave + 2 Wave-4-J additions.**
> See the "Pass 3 addendum" section at the foot of this file. INCLUSION ≠ ENDORSEMENT.

## Cards added (68)

All 67 unique uncarded names in `discovered-people.md` were carded (Michael Snyder /
Michael P. Snyder deduped to one card; Wallace, Horvath, M. Levine, Gladyshev, Barzilai,
Wyss-Coray, Nedergaard, Panda, Walker and all 41 Wave-1 leadership figures were already
carded in Pass 1 and left untouched). Plus one disambiguation card.

**Bioenergetics / foundation (priority):** nick-lane, peter-mitchell, jennifer-moyle,
lynn-margulis, william-martin, carl-woese, hans-krebs

**Genetics / epigenetics / -omics (Domain C):** joris-deelen, paola-sebastiani,
thomas-perls, aleksandra-trifunovic, nils-goran-larsson, tomas-prolla, ake-lu,
albert-higgins-chen, daniel-belsky, benoit-lehallier, hamilton-oh, michael-snyder,
luigi-ferrucci, mahdi-moqri, tomasz-wilmanski, sean-gibbons, kenya-honda, elena-biagi,
claudio-franceschi, fedor-galkin

**Metabolic / nutrition (Domain D):** william-kraus, krista-varady, stephen-simpson,
david-le-couteur, samantha-solon-biet, jaime-guevara-aguirre, jurgen-bauer,
dariush-mozaffarian, christopher-ramsden, james-dinicolantonio, james-okeefe,
ramon-estruch, saul-justin-newman, john-newman

**Exercise / nutrition / biomarkers / movement / breath:** mike-joyner, bruce-ames,
don-layman, dan-garner, william-harris, jill-miller, brian-mackenzie, ori-hofmekler,
glen-jeffery, alexis-cowan

**Deuterium circle:** que-collins, roberts-ddw *(disambiguated — NOT the Nobel laureate
Sir Richard J. Roberts)*

**Mind / neuro (cross-branch → 07-mind):** karl-friston, donald-hoffman, nolan-williams,
paul-conti

**Biohacking practitioners:** dave-asprey, ben-greenfield

**Sleep / circadian / stress:** jeffrey-iliff, till-roenneberg, eve-van-cauter,
george-brainard, charles-czeisler, bruce-mcewen, fred-shaffer, joshua-gooley, alexei-guzey

## Totals

- `figures.json`: **155 entries** (was 87) — valid JSON.
- `cards/`: **151 markdown cards** (4 seed figures — pollack, becker, ling, wallace — have
  JSON entries but no markdown card; pre-existing, not introduced by this pass).
- All new entries: `added_in_pass: 2`, `discovered: true`, `surfaced_via` recorded.

### Evidence-posture distribution of the 68 new cards
mainstream-rigorous (majority, the bioenergetics + omics + nutrition-science backbone),
frontier-contested (deuterium circle, seed-oil-skeptic camp, Blue-Zones skeptic, Hoffman,
Galkin), clinical-translator (Guevara-Aguirre, Williams, Conti), mainstream-communicator
(Cowan, Guzey), practitioner-n1 (Garner, Miller, Mackenzie, Hofmekler, Asprey, Greenfield).

## Relationship graph

- `graph.json` + `RELATIONSHIPS.md` — **136 edges across 184 nodes**
  (155 people, 24 labs, 5 trials). Valid JSON.
- Edge types: affiliation 28, mentor 22, builds-on 21, colleague 50, rival 10,
  leads/associated 5 (trials).
- Affiliation edges auto-derived from `05-labs/labs.json` `key_people[].card` plus 5 manual
  edges to existing lab nodes. Mentor/lineage/colleague/rival/builds-on edges hand-curated.
- Key lineage clusters documented in `RELATIONSHIPS.md`: bioenergetics spine
  (Krebs→Mitchell+Moyle→Margulis/Martin/Woese→Lane), NAD+/sirtuin tree
  (Guarente→Sinclair/Imai; Brenner counterweight), mTOR tree (Hall→Sabatini→Lamming),
  insulin/IGF worm tree (Kenyon→Ruvkun/Murphy; Bartke; Guevara-Aguirre), senescence/telomere
  (Hayflick→Campisi→Kirkland; Blackburn→Greider), parabiosis (Rando→Conboy;
  Wyss-Coray→Villeda/Lehallier/Oh; Wagers/GDF11 dispute), epigenetic clocks
  (Horvath→Lu/Levine→Higgins-Chen; Biomarkers consortium), CR/fasting
  (McCay→Walford→Longo/Fontana; Kraus/CALERIE→Belsky), circadian/sleep
  (Brainard/Czeisler→Gooley; Nedergaard→Iliff; Walker vs Guzey), deuterium circle
  (Somlyai→Boros→Collins/Roberts; Asprey/Greenfield).
- Documented scientific rivalries captured (not personal): Brenner↔Sinclair (NAD+),
  Solon-Biet↔Phillips (protein conflict), Mozaffarian↔DiNicolantonio (seed oils),
  Keys↔Ramsden (diet-heart), Guzey↔Walker (sleep claims), Newman↔Barzilai (Blue Zones),
  Wagers↔Villeda (GDF11), Trifunovic↔Prolla (parallel mutator mice).

## Still uncarded

- None from `discovered-people.md` — the queue is fully carded.
- 4 Pass-1 seed figures (pollack, becker, ling, wallace) have JSON entries but no markdown
  card; backfilling those 4 markdown cards is the only remaining people-map gap.
- Lab `key_people` with `card: null` (e.g. Gordon Lithgow, Ana Maria Cuervo, Michael Levin,
  David Botstein, Joe Betts-LaCroix) are candidate future cards but were out of scope (not in
  the discovered-people queue).

---

## Pass 3 addendum (2026-06-27) — the fresh Domain-L / Wave-4-J batch

Pass 2 declared the queue "fully carded," but it ran *before* the parallel protocols /
biomarkers / metabolic / sleep / genetics agents appended a new block to
`00-map/discovered-people.md` (the "Wave: Domain L" measurement-and-biomarkers wave plus two
Wave-4-J additions). Pass 3 cards exactly that fresh block. INCLUSION ≠ ENDORSEMENT.

### Cards added (19) — all `added_in_pass: 3`

**Lipid / cardiovascular biomarkers (Domain L):** sniderman (apoB particle number),
ference (Mendelian-randomization LDL causality), kamstrup (Lp(a) genetic causality),
nordestgaard (Copenhagen MR program), robert-clarke (PROCARDIS Lp(a) genetics),
ridker (hsCRP / JUPITER / CANTOS), danesh (Emerging Risk Factors Collaboration IPD meta).

**Glycemic / metabolic biomarkers (Domain L × D):** selvin (HbA1c / ARIC),
kovatchev (CGM accuracy engineering), hanley (HOMA-IR / IRAS).

**Functional / body-composition biomarkers (Domain L × E/F):** studenski (gait speed),
cooper-kuh (physical-capability omnibus meta — paired-author card), anne-newman
(Health ABC strength-not-mass), kuk-katzmarzyk (visceral-fat mortality — paired-author card),
robert-ross (AHA CRF-as-vital-sign), brito-araujo (sitting-rising test mortality — paired-author card).

**Autonomic / sleep measurement (Domain L × I):** hisako-tsuji (Framingham HRV-mortality),
chinoy (consumer sleep-tracker vs PSG validation).

**Aging-mechanism evidence check (Domain B):** kay-ahn (Pfizer SIRT1 group — resveratrol/STAC
assay-artifact result; indexed as a documented dispute, `rival` edge to Sinclair).

Three of the 19 are **paired-author cards** (cooper-kuh, kuk-katzmarzyk, brito-araujo) and
two are **group/consortium cards** (danesh = ERFC, kay-ahn = Pfizer biochemistry team), each
flagged in the card's Disputed/known-unknowns field.

### Affiliation verification note
OpenAlex authors-API verification was attempted but the daily API budget was exhausted
(HTTP "Insufficient budget", resets midnight UTC). The 19 are all well-documented public
figures (Mayo, McGill, Cambridge, Copenhagen, Oxford, Harvard/Brigham, Johns Hopkins,
Pittsburgh, UVA, Toronto, Queen's, Pennington, CLINIMEX) and were carded from established
public record; affiliations are stated in each card and are auditable. Re-run OpenAlex
cross-check on next pass to attach author IDs + top-cited DOIs.

### Updated totals (after Pass 3)
- `figures.json`: **174 entries** (was 155) — valid JSON.
- `cards/`: **170 markdown cards** (was 151).
- `graph.json`: **203 nodes / 155 edges / 174 people** (was 184/136), valid JSON.
  New edges include the lipid-causality cluster (sniderman↔ference, ference↔nordestgaard↔kamstrup,
  nordestgaard→kamstrup mentor, robert-clarke↔kamstrup), functional-biomarker cluster
  (studenski↔cooper-kuh↔anne-newman, cooper-kuh builds-on studenski), CRF/fitness
  (robert-ross↔mike-joyner), visceral-fat (kuk-katzmarzyk↔robert-ross), HRV
  (fred-shaffer builds-on hisako-tsuji), glycemic (selvin↔hanley, kovatchev↔michael-snyder),
  and the **kay-ahn→sinclair `rival`** resveratrol assay-artifact edge (+ kay-ahn↔guarente).

### Still uncarded after Pass 3
- **None** from `discovered-people.md` — the queue (including the fresh Domain-L wave) is fully carded.
- The 4 Pass-1 seed figures (**pollack, becker, ling, wallace**) remain WITHOUT a local markdown
  card in `01-people/cards/` **by design**: their `figures.json` entries carry `is_cross_ref: true`
  pointing to `canon-figures/05-biophysics.md`, where each already has a full canonical bio
  (verified: Pollack §265, Becker §197, Ling §241, Wallace §335 in `05-biophysics.md`). Creating
  local stubs would duplicate canon, so they are intentionally left as cross-refs (the SCHEMA
  rule that a card lives in the branch where the contribution is largest).
- Lab `key_people` with `card: null` (Gordon Lithgow, Ana Maria Cuervo, Michael Levin,
  David Botstein, Joe Betts-LaCroix) remain candidate future cards, out of scope (not in the
  discovered-people queue).
