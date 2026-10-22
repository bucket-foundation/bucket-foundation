# Flag tile system

Bucket and Polingual expose the same gallery at `/flags`. Bucket links it from Explore in its footer. Polingual links it from its homepage footer. Selecting a tile opens the detail panel. Search covers country names and two-letter codes; Craft studies limits the gallery to researched editions.

## Component

`src/components/flags/TactileFlagTile.tsx` renders the visual. `FlagGallery.tsx` supplies native button behavior, selection state and keyboard access. Wrap the visual in a button for actions or a link for navigation; provide the country name as its accessible label. Use `decorative` when its wrapper already supplies the name.

```tsx
<button type="button" aria-label={`Explore ${country.name}`} onClick={() => select(country.code)}>
  <TactileFlagTile country={country} material="ceramic" decorative />
</button>
```

Material values are `ceramic`, `lacquer`, `textile`, `enamel`, `glass`, and `terracotta`. Pattern values are `plain`, `grid`, `stripe`, `diamond`, `wave`, and `dot`. Both belong to the frame. `accent` controls the craft's pigment. `tokens.css` defines shared primitives; `flags.module.css` owns the material recipes. `fonts.css` contains generated local Noto subsets and loads through the gallery.

## Asset contract

| File | Contract |
| --- | --- |
| `flags/*.svg` | Unchanged source artwork for 249 ISO records. |
| `countries.json` | Country-code and display-name registry from the pinned source. |
| `crafts.json` | Sixteen cited regional studies with material and pattern choices. |
| `cultural-labels.json` | Country-name specimens with language tags, direction, font family and label source. |
| `illustrations/*.svg` | Original studio studies of craft objects and processes. |
| `icons/*.svg` | Original object and tool pictograms on a 48-unit grid. |
| `imagery/*.jpg` | Six Met photographs under CC0, with captions in the research imagery registry. |
| `fonts/*` | Five subset font files and their SIL Open Font License texts. |
| `catalog.json` | Generated data with embedded local images, source hashes and provenance. |
| `client-catalog.json` | Browser metadata with image bytes removed. |
| `src/components/flags/assets.ts` | Generated Next static imports for cached image URLs. |
| `material-study.png` | Generated concept board. Flag geometry in this board is illustrative. |
| `culture-study.png` | Generated Japan, Morocco, India and Mexico concept board with native lettering and flag badges. |

The source snapshot is `hampusborgos/country-flags` at `c09927e63705529bbf59ca6684cd9b23225dddad`, retrieved 22 October 2026. `FLAG-SOURCE.md` retains its rights statement. Afghanistan and Antarctica carry source-variant captions. The catalog expresses coverage by ISO code; it makes no sovereignty determination.

## Rebuild

```sh
node brand/flag-tiles/illustrate.mjs
node brand/flag-tiles/build.mjs
node brand/flag-tiles/verify.test.mjs
```

Both apps bundle the same generated metadata and CSS. Next emits images as hashed local files; images load through their cached URLs. The artwork has no runtime CDN dependency. Browser checks use Polingual on port 3291 and Bucket on port 3292; `FLAG_POL_PORT` and `FLAG_BUCKET_PORT` override those ports:

```sh
node brand/flag-tiles/browser-check.mjs
```

Font aliases are Flag Latin, Flag Japanese, Flag Korean, Flag Devanagari, and Flag Arabic. The source families are Noto Serif, Noto Serif JP, Noto Serif KR, Noto Serif Devanagari, and Noto Naskh Arabic. Subsets cover the current specimens. Adding a specimen requires a glyph-coverage check and an expanded local subset when needed.

## Cultural editions

Each edition names a region or community and links a craft source. A country can hold several editions. The current catalog holds one researched edition per selected country. Language specimens name their language; the sample does not describe every language used in that country.

Keep museum object captions visible. The Gujarat textile is a related object beside the Rajasthan craft study; the Wari tunic is a related object beside Taquile weaving. Neither image authenticates the named contemporary craft. Commission practitioners before adopting protected community patterns or workshop marks.

The built-in imagegen tool produced both concept boards. The first explores eight tactile material samples. The second puts craft imagery and native lettering on the face, with a flag badge and tap cue. Their prompts are retained in the generation JSON files. All interface flag geometry comes from the pinned SVG source.
