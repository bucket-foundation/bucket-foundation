# People Map — Expansion Pass 2 Summary

> Carded the figures queued in `00-map/discovered-people.md` (Waves 1+2) and built the
> people × labs × trials relationship graph. Pass 2, 2026-06-27. INCLUSION ≠ ENDORSEMENT.

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
