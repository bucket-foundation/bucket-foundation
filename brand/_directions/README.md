# bkt Brand Directions

Round 2 of the brand-kit step: seven candidate identities for Bucket, each with marks, icons, a mascot, pages, app screens, motion and 3D. The founder picks one. Round 1 sits in `brand/_archive/2026-10/directions-v1/`.

## Directions

| Id | Name | Movement | Design system |
|----|------|----------|---------------|
| d1 | Grid | Swiss International Style | IBM Carbon |
| d2 | Kamon | Japanese mon crests and ukiyo-e | Apple HIG |
| d3 | Squiggle | Memphis Group | Duolingo |
| d4 | Wedge | Soviet constructivism | Material Design 3 |
| d5 | Girih | Islamic geometric tiling | Microsoft Fluent 2 |
| d6 | Primitive | Bauhaus | Teenage Engineering |
| d7 | Euclid | Attic red-figure, stoichedon, Byrne's Euclid | Wikimedia Codex |

Each direction's palette, fonts, motion and source list live in `src/lib.py` (`D`). The long write-up per direction is `brand/DESIGN-DIRECTIONS.md`, which `make index` regenerates.

## Tools

python3 with cairosvg, Pillow and fontTools; chromium (`chromium-browser`, or set `CHROME`); ffmpeg; Blender for 3D only.

```bash
pip install cairosvg Pillow fontTools
```

## Build and Serve

```bash
cd brand/_directions/src
make check     # geometry, asset 200 and WCAG AA contrast
make index     # index.html and brand/DESIGN-DIRECTIONS.md
make all       # marks, pages, mm, index, thumbs, check
make serve     # python3 -m http.server --directory brand 8777
```

Open http://127.0.0.1:8777/_directions/index.html.

| Target | Does |
|--------|------|
| marks | `build2.py`: logos, icons, hero, card and state screens, pixel strips, index |
| pages | `gen_pages.py`, `game12.py`, `pages456.py`, `game56.py`, `game_d34.py`, `search_gen.py` |
| mm | `mm.py`: math and motion screens |
| screens, thumbs | `shoot.sh`: chromium captures at 1440x900 and 390x844 |
| video | `vid.sh` per direction at 16x9 and 9x16; needs `make serve` running |
| render3d | `blender -b -P render.py`: marks and objects into `3d/` |
| check | `geomcheck.py` and `check.py`; `STRICT=1` also fails on unbuilt thumbs and video |
| index | `build2.py` |

Every generator is deterministic: two runs give the same HTML. Paths resolve from `src/paths.py`, so the tree builds from any clone.

## Heavy Outputs

Thumbs, pixel PNGs, 3D PNGs, video and mood images are gitignored and rebuild from source. A copy of the 2026-10-19 build: GDRIVE_LINK (`gdrive:AGFarms/Nucleus/bucket-foundation/brand-directions/2026-10-19/`). Copy it into `brand/_directions/` to skip the rebuild.

## File Map

| Path | Holds |
|------|-------|
| `index.html` | the review page, all seven directions |
| `src/` | generators, `Makefile`, `made.json` medium notes, `scores.txt`, `canon.json`, `hinted.json` |
| `src/briefs/` | agent briefs: `CRITIC-BRIEF.md` rubric, marks, pages, game, enforce |
| `logos/`, `icons/` | SVG marks, lockups, constructions, icon sets |
| `pages/<id>/` | site and app pages per direction |
| `screens/` | hero, card, states, search and math-motion screens |
| `licensed/<id>/` | licensed reference images, credited in `sources.json` |
| `licensed/marks/` | OFL fonts and public-domain mark sources |
| `refs/<id>/` | movement reference images |
| `heritage/` | earlier bucket marks and the lineage strip |
| `made/` | per-direction medium and motion pages |
| `3d/` | `.glb` models and JPEG renders |
| `current/` | the live site's brand for comparison |

## Critic Loop

Each direction goes through the Bucket critic in `docs/agents/BUCKET-CRITIC.md`, with the frozen design rubric in `src/briefs/CRITIC-BRIEF.md`. Pass is above 8.0 weighted, every dimension at least 7.0, no open critical or high finding, three rounds at most. Reports go in `brand/_directions/.critic/<id>/`, which git ignores. Record each score as a line `<id> <round> <score> PASS|FAIL` in `src/scores.txt`; `make index` turns it into the Critic Rounds table at the end of `brand/DESIGN-DIRECTIONS.md`.

## Rules

- No AI-generated art as final work. Mood images under `mood/` are reference only.
- Every image comes from a real, licensed source and carries its credit in `licensed/<id>/sources.json`.
- Every page and screen renders as a full viewport at 1440x900 and 390x844.
- Text meets WCAG AA: 4.5:1 for text, 3:1 for icons and non-text marks. `lib.pairs` asserts it.
- No code comments. Voice rules apply to every string.

## Claiming Work

```bash
bd ready
bd update <id> --status=in_progress
git worktree add ~/agfarms/.wt-<slug> -b feat/brand-<slug> origin/dev
```

One branch and one PR into `dev` per change; open the draft PR before you write. Open work sits under the epic "Brand directions round 2 follow-ups". Beads labelled `needs-founder` wait for the founder's approval.
