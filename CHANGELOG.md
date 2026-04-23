# Changelog

All notable changes to **bucket.foundation** are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer 2.0.0](https://semver.org/).

Versions <1.0.0 mean the protocol + UI are still actively mutating. `0.MAJOR.MINOR` bumps on any user-visible change.

## [Unreleased]

## [0.2.0] — 2026-04-23 · *Mobile awakening*

### Added
- **Versioning** — `CHANGELOG.md`, `VERSION` file, `0.x.0` convention while pre-1.0. Version surfaces in footer (`v0.2.0`).
- Mobile navigation drawer (hamburger → carved-stone slide-out with full canon index, links, join CTA).
- Dedicated mobile breakpoints for every section on `/` — hero, § I Thesis, § I·b Manifesto, § II Canon, § III Protocol, § IV The Cut, § V Closer. No horizontal scroll, touch-first hit targets ≥44px.
- Responsive typography scale overhaul — hero H1 clamps 2.3rem→clamp, body never drops below 16px, line-height opens on narrow widths.
- `viewport` meta now includes `interactiveWidget: "resizes-content"` and `viewportFit: "cover"` for notched devices.

### Changed
- Canon plinths: aspect-ratio is mobile-flexible (min-h on small screens, aspect-[4/5] on md+).
- Manifesto pull: `.carved-inset` padding clamps tighter on small screens (prevents edge crowding).
- Header: wordmark truncates gracefully; mark alone at the smallest widths.
- Grid containers with `gap-px bg-basalt` hairline trick gracefully promote to rounded stacked cards on mobile.

### Fixed
- Horizontal overflow on hero armillary globe overlay.
- Fixed-attachment stone bg was causing jank on iOS Safari — scoped to md+ only.
- Touch-target size on "all branches →" and nav links (was <32px).

## [0.1.0] — 2026-04-23 · *Written in stone*

### Added
- Full KALA Earth Ambient V06.1 palette + carved-stone CSS design system.
- Inverse-omega-lyre SVG logo (5 gold strings + citation-dot cup).
- Stone-carved page body via SVG fractal-noise + mineral mottling (no photo assets).
- `.carved-inset` / `.carved-relief` / `.carved-seam` — panels are recesses INTO the slab, not overlays.
- Full metadata, OG, Twitter, JSON-LD (Organization, WebSite, CreativeWork, SoftwareApplication).
- `icon.svg` vector favicon + PNG fallback set.
- Canon page (8 branches), About, Manifesto, Protocol, Governance, Join, /canon/[slug]/figures/[figure].
- Story Protocol IP NFT integration, Walrus storage, Dynamic web3 auth, Supabase.
- `feed402` protocol endpoint + spec.
- PageShell pattern for interior pages.

### Changed
- Tagline locked: **"free to read. paid to cite."** (primary), **"written in stone."** (closer).
- Font stack: Cinzel display + Fraunces body + Instrument Serif italic + JetBrains Mono.

### Fixed
- Legacy `--parchment`/`--parchment-dim` aliases flipped to light-mode — all interior pages now have visible ink.
- Gold (`--gold`) darkened to `#B8861E` for AA contrast on bone stone.
- `.stone-basalt`/`.stone-aegean` restored as true dark pockets; bone text readable inside.
- Canon plinths & protocol step tiles use explicit `bg-[bone]` (transparent stone-bone was bleeding grid-gap basalt through children).
- Body font-weight bumped 400→500 globally for Fraunces-on-stone legibility.

### Archaeology
- First public build of `bucket.foundation` after the 2022 → 2026 transition (see `HISTORY.md`).
- Reference implementation for the x402 research protocol; not the protocol itself.
