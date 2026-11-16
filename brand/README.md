# bucket-foundation, Brand

Reusable brand-research canon + workshop framework, pulled from the DerbyFish
brand research (which was itself source-agnostic methodology, well clear of DerbyFish-
Specific answers).

## Contents

- `research/`, the canon (brand-book frameworks, case studies, 2020-2026
 strategies, talks/podcasts, downstream effects, extracted frameworks). ~2.7K
 lines of source material. READ THIS BEFORE ANSWERING ANY BRAND QUESTION FOR
 BUCKET.
- `workshop/`, the fill-in workshop template. This is the worksheet *Gian
 fills out* to land bucket's brand foundation (positioning, archetype, voice,
 visual direction, naming system). Copy `FRAMEWORK.md` → `BUCKET-FOUNDATION.md`
 when you sit down to do it.

## Workflow

1. Skim `research/INDEX.md` (one-page map of the canon)
2. Pick the 2-3 frameworks in `research/06-frameworks-extracted.md` that fit
 bucket's thesis (nonprofit + research canon + open protocol = which
 archetype / positioning?)
3. Open `workshop/FRAMEWORK.md`, copy to `BUCKET-FOUNDATION.md`, fill in.
4. Output: bucket's filled `BUCKET-FOUNDATION.md` = the canon answer for
 positioning, archetype, voice, visual direction, naming, downstream
 surfaces (site, docs, social, research repo).

## Provenance

Lifted 2026-04-23 from `DerbyFish/derbyfish-docs/research/brand/` and the
BRAND-WORKSHOP-FRAMEWORK (war-room). The research canon and the workshop are
source-agnostic. The Kala name, Fibonacci marks and logo system were left out.
Bucket did carry over the Kala Earth Ambient palette and carved-stone CSS
(site 0.1.0, 2026-04-23), the tagline pair, the canon globe (2026-05-01) and
the stone title cards in `gtm/video-v5`. The filled workshop is
`workshop/BUCKET-FOUNDATION.md`. The plan that uses it is `docs/growth/BRAND-PLAN.md`.

## Logo Standard

Each product has one logo file. Every shipped icon is rendered from it.

- Bucket: `brand/logo/bucket/current.svg`, the Grid ℧ from `_round2/assets/grid2/marks/mho.svg`. The founder ranked Grid first for logo and mark in `_round2/FOUNDER-FEEDBACK.md`.
- Polingual: `brand/logo/polingual/current.svg`, the Po mark on tyrian.
- A source is a square SVG with `<rect id="ground">` and a `data-radius` for rounded outputs.
- `npm run brand:icons` writes web favicons and the Bucket share card, iOS, Watch and Android icon sets, desktop icons and `brand/logo/icons.lock.json`.
- `npm run brand:check` fails when a source or a committed icon differs from the lock, or when a fresh render differs by more than 2 levels per channel. CI runs it in `brand-icons.yml`.
- Web builds rerun the script in `prebuild`. `apple/scripts/archive-polingual.sh` reruns it before each archive. Both fail when the render cannot run. `--soft` is for local use and prints a warning per skipped product.
- Beta badge: `node scripts/brand/build-icons.mjs --only apple,android --badge 2026-11-15`, or `ICON_BADGE=1` on the archive script. Badged files fail the check, so they stay out of commits.
- To change a logo, edit `current.svg`, run `npm run brand:icons` and commit the result. Never edit an icon file by hand.
