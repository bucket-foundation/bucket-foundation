# Round 2 deck

The founder's feedback is in bead bkt-squyk.3 (`bd show bkt-squyk.3`). Build a new page, a deck. Leave the directions page unchanged except for a link to the deck.

## Output
- **Deck:** brand/_round2/index.html, with its own screens in brand/_round2/screens/ and assets in brand/_round2/assets/.
- **Serving:** add an unlisted public copy at public/brand/round2/ with a base tag, the same way the directions page is served at /brand/directions (see next.config.mjs rewrites, PRs #922, #930, #934). Add /brand/round2 rewrites.
- **Links:** link each page to the other.
- **Generators:** put them in brand/_round2/src/, reusing brand/_directions/src (lib.py, logos.py, icons.py, made.json, gen_pages.py and the rest). Make targets: round2, round2-check.

## Deck shape
- **Viewport:** full-viewport slides at 1440x900, with a 390x844 variant.
- **Navigation:** arrow keys, a progress rail, a hash per slide, and prefers-reduced-motion respected.
- **Slide 1:** the founder's feedback verbatim from bkt-squyk.3, covering the quiz ranking and his notes. Mark it voice-ignore so the quotation stays intact.
- **Decision slides, one each:**
  1. Grid is the base for standards.
  2. Squiggle is the young-learner register.
  3. Euclid's app-screen strengths.
  4. Primitive's ℧ and its dot. Explain the dot: it carries the gold dot of the live InverseOmega (src/components/InverseOmega.tsx), drawn as Teenage Engineering's orange knob. Show it with and without the dot, and offer Primitive's ℧ as an alternate mark inside Grid 2.
  5. Girih's texture: one pattern system kept as Grid 2's background texture option.
  6. The polymath and polyglot concept: the canon across seven branches plus 35 languages, shown as one system.
- **Then:** Grid 2 screens, Polingual in the Squiggle register, the Euclid 2 landing, marks, gamification, and motion.

## Grid 2
- **Base:** keep the Swiss grid and Grid's ℧ and b, and make them less generic and perfect.
- **Polymath and polyglot:**
  - a seven-branch canon index and a 35-language strip, set as one typographic system
  - real Greek, Hebrew, Devanagari, Han and Cyrillic in the type stack
  - Polingual data from data/ or src/lib/polingual
- **Euclid's app strengths:** bring in numbered propositions with a proof column, Byrne-colored figures for ideas, and source credits on screens.
- **Squiggle register:** a sub-theme that switches Polingual study screens to Squiggle energy for young learners. Keep the frozen Polingual flows: read docs/specs/POLINGUAL.md and the ux-freeze specs in packages/bkt-ui, and do not change any flow.
- **Screens,** each at full 1440x900 and 390x844:
  - landing, with header and footer
  - canon search
  - app learn
  - study card in both registers
  - review
  - quiz
  - progress
  - settings
  - sign in
  - math page with KaTeX
  - gamification: streak, XP, badges, celebration
  - motion: one live animation in Grid 2's language

## Euclid 2
One landing that is much better than round 1's Euclid. Use real Greek material only: the licensed/d7 sources, the verbatim Heiberg text of I.1, Byrne plates and stoichedon lettering.

## Rules
- Real licensed sources with credits. No AI-generated art.
- AA contrast on every text pair, with the ratio computed.
- No horizontal scroll at 390.
- Tokens on a 4px rhythm.
- Every view renders full at both sizes. Shoot thumbnails.
- Relative paths, so the hygiene check passes.
- No code comments.
- Repo CLAUDE.md voice rules.

## Founder decisions, update 2026-10-20

Source: brand/_round2/FOUNDER-FEEDBACK.md. It is verbatim; keep it verbatim on the opening slides. Where these decisions conflict with anything above, they win.

1. **Base is a Grid and Primitive merge.** Grid's Swiss grid structure with Primitive's play. Grid alone is too strict. Grid and Primitive rank top two, possibly Primitive first. Rename "Grid 2" to "Grid-Primitive" in copy; keep the files at grid2-*.
2. **Young-learner register is a Squiggle and Primitive merge, "disciplined chaos".** Squiggle has the best buttons; use them. The register drives the Polingual study screens.
3. **Wedge is an accent only, never the base.** Keep:
   - its ℧
   - the diagonal cut, "metal tool cutting through a map, shiny"
   - its punk, steampunk and solarpunk energy, as a "solarpunk b or subtle punk" mark variant
4. **Euclid becomes the polymath direction, "ideal Euclid".** A real rebuild around the Library of Alexandria, the geometers and the polymaths. Use real public-domain sources: Alexandria engravings, Byrne, papyri, and the astrolabe and mathematical instruments from the Met. It replaces the Euclid 2 landing goal with an ideal-Euclid landing plus two app screens.
5. **Girih supplies texture and motion.** Use its generative pattern system as texture and as motion.
6. **Kamon is dropped.** Its mark was unclear.
7. **Primitive's dot is the knob.** It comes from the Teenage Engineering reference, "Bucket as an instrument you play". State that on the slide and show the mark without the dot.

**Deck order:** the ranking and these notes, then one slide per decision, then the screens.
