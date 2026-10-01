# Changelog

All notable changes to **bucket.foundation** are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer 2.0.0](https://semver.org/).

Story Protocol minting was removed in 2026-06; citations settle over x402 on Base.

Versions <1.0.0 mean the protocol + UI are still actively mutating. `0.MAJOR.MINOR` bumps on any user-visible change.

## [Unreleased]

### Changed
- `bkt` names the key store entries of a new data folder with a random id, kept in `keyring-scope` and in `bkt.db`, so a second `BKT_HOME` gets its own keys and device. A 0.4.0 folder is left as it is: bkt reads its unscoped entries and never writes them. `bkt hai export` and `bkt analyze --json` print only the fields in their shapes.
- `bkt whoami` and `bkt stats` print text rows unless `--json` is passed; `bkt init` keeps its JSON record.

### Added
- **Research OS for K-12**, iteration 1: plan, learner-state model, frontier-backward routing, the four-tool student workspace, the production schema shared with the hypothesis engine, and phases (`learning/research-os/`). Intake of the vendor and data-source map and the funding and people map (`_intake/research-os-k12/`). Public page at `/research-os`, linked from the research hub. Ten `ros-` beads queued in `BEADS-PENDING.jsonl`.

## [0.4.0]: 2026-09-30 · *Terminal installers*

### Added
- Signed `bkt` binaries for five targets: Linux and macOS on x64 and arm64, Windows on x64.
- `scripts/install.sh` and `scripts/install.ps1`: pick the architecture, verify the checksum and the release signature, refuse downgrades.
- Download button and direct installers on `/download`, and a first-run quiz in the app.
- History view with local activity and a productions snapshot, and workspace notes in the window.
- Academy courses absorbed into the graph, What's new entries generated from merged PRs, and approved NSM links on `/research-os/nsm`.

### Fixed
- Research tool routes return 400 on bad bodies and 502 on non-JSON gateway replies.

## [0.3.0]: 2026-09-30 · *Research OS in the window*

### Added
- Research OS inside the desktop window: learning path, grip sphere, work quiz from local beads and git, canon circle and globe, solvability, software and patents atlases, advisors, prime directions, host-Python jobs, notes and history.
- Desktop window over `bkt serve`, with launch auth and local quiz and review routes, sharing one engine review store.
- Advisor review by PCA distance to a research statement, fit-me with a local PDF statement and CV, and PI fit maps.
- Prime directions fitted on the OpenAlex topic taxonomy.
- Human and AI probe, `bkt hai`.
- Backward prerequisite path to any concept, and per-branch mastery bars.

## [0.2.0]: 2026-09-30 · *Desktop AppImage*

### Added
- Bucket AppImage build with a size gate, a signed manifest and checksum, and an installer that verifies them.

## [0.1.0]: 2026-09-29 · *First signed release*

### Added
- Signed offline `bkt` terminal app, distributed through `/download`.

## [Site 0.2.0]: 2026-04-23 · *Mobile awakening*

### Added
- **Versioning**, `CHANGELOG.md`, `VERSION` file, `0.x.0` convention while pre-1.0. Version surfaces in footer (`v0.2.0`).
- Mobile navigation drawer (hamburger → carved-stone slide-out with full canon index, links, join CTA).
- Dedicated mobile breakpoints for every section on `/`, hero, § I Thesis, § I·b Manifesto, § II Canon, § III Protocol, § IV The Cut, § V Closer. No horizontal scroll, touch-first hit targets ≥44px.
- Responsive typography scale overhaul, hero H1 clamps 2.3rem→clamp, body never drops below 16px, line-height opens on narrow widths.
- `viewport` meta now includes `interactiveWidget: "resizes-content"` and `viewportFit: "cover"` for notched devices.

### Changed
- Canon plinths: aspect-ratio is mobile-flexible (min-h on small screens, aspect-[4/5] on md+).
- Manifesto pull: `.carved-inset` padding clamps tighter on small screens (prevents edge crowding).
- Header: wordmark truncates gracefully; mark alone at the smallest widths.
- Grid containers with `gap-px bg-basalt` hairline trick gracefully promote to rounded stacked cards on mobile.

### Fixed
- Horizontal overflow on hero armillary globe overlay.
- Fixed-attachment stone bg was causing jank on iOS Safari, scoped to md+ only.
- Touch-target size on "all branches →" and nav links (was <32px).

## [Site 0.1.0]: 2026-04-23 · *Written in stone*

### Added
- Full KALA Earth Ambient V06.1 palette + carved-stone CSS design system.
- Inverse-omega-lyre SVG logo (5 gold strings + citation-dot cup).
- Stone-carved page body via SVG fractal-noise + mineral mottling (no photo assets).
- `.carved-inset` / `.carved-relief` / `.carved-seam`, panels are recesses cut INTO the slab, sitting below its surface.
- Full metadata, OG, Twitter, JSON-LD (Organization, WebSite, CreativeWork, SoftwareApplication).
- `icon.svg` vector favicon + PNG fallback set.
- Canon page (8 branches), About, Manifesto, Protocol, Governance, Join, /canon/[slug]/figures/[figure].
- Supabase backend. Story Protocol minting, Walrus storage and Dynamic auth shipped here and were removed later.
- `feed402` protocol endpoint + spec.
- PageShell pattern for interior pages.

### Changed
- Tagline locked: **"free to read. paid to cite."** (primary), **"written in stone."** (closer).
- Font stack: Cinzel display + Fraunces body + Instrument Serif italic + JetBrains Mono.

### Fixed
- Legacy `--parchment`/`--parchment-dim` aliases flipped to light-mode, all interior pages now have visible ink.
- Gold (`--gold`) darkened to `#B8861E` for AA contrast on bone stone.
- `.stone-basalt`/`.stone-aegean` restored as true dark pockets; bone text readable inside.
- Canon plinths & protocol step tiles use explicit `bg-[bone]` (transparent stone-bone was bleeding grid-gap basalt through children).
- Body font-weight bumped 400→500 globally for Fraunces-on-stone legibility.

### Archaeology
- First public build of `bucket.foundation` after the 2022 → 2026 transition (see `HISTORY.md`).
- Reference implementation for the x402 research protocol; not the protocol itself.
