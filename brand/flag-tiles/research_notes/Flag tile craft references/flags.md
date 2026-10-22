# Flag sources and tactile tile references

## Canonical flag source

### Takeaway

Use the native SVG files from `hampusborgos/country-flags`, pinned to commit `c09927e63705529bbf59ca6684cd9b23225dddad`, as the versioned flag layer. The audit on 22 October 2026 found every code in the installed 249-entry ISO country dataset, plus EU and XK. [Pinned source tree](https://github.com/hampusborgos/country-flags/tree/c09927e63705529bbf59ca6684cd9b23225dddad/svg)

### Cited findings

| Source | Coverage and format | Rights evidence | Fit for this system |
| --- | --- | --- | --- |
| hampusborgos/country-flags | The audit compared two-letter SVG filenames with `pycountry.countries`: 249 required codes, zero missing, EU and XK as extras. The repository also carries GB subdivisions. | The project identifies Wikimedia Commons as its source and describes the flags as public domain. It also mentions that flag-use restrictions can exist. Preserve this source statement with the snapshot. | Recommended base. Files retain their own viewBoxes and emblem geometry. [README](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/README.md), [tree API](https://api.github.com/repos/hampusborgos/country-flags/git/trees/c09927e63705529bbf59ca6684cd9b23225dddad?recursive=1), [pycountry](https://github.com/pycountry/pycountry) |
| lipis/flag-icons | SVG and CSS icon collection with 4:3 and 1:1 variants. The inspected Switzerland and Nepal files in `flags/4x3` both use `viewBox="0 0 640 480"`. | MIT license, copyright Panayiotis Lipiridis. Preserve its license notice if copying assets or code. | Good fit when uniform icon proportions are desired. Native silhouettes need separate handling. [Repository](https://github.com/lipis/flag-icons), [license](https://github.com/lipis/flag-icons/blob/main/LICENSE), [Switzerland file](https://github.com/lipis/flag-icons/blob/main/flags/4x3/ch.svg), [Nepal file](https://github.com/lipis/flag-icons/blob/main/flags/4x3/np.svg) |
| FlagCDN / Flagpedia | API offers 254 country flags plus US states, EU, and UN; SVG endpoint is `https://flagcdn.com/{code}.svg`. It offers original proportions as well as fixed-ratio raster icons. Its API page reports an update on 6 February 2026. | Flagpedia's terms identify its flag images as public domain while reserving rights in other site content. | Useful cross-check and acquisition fallback. Pin downloaded bytes before release because the endpoint can change. [API](https://flagpedia.net/download/api), [terms](https://flagpedia.net/terms) |

- The selected commit is dated 10 March 2026. Its message records flag updates and added legislative references. [Commit](https://github.com/hampusborgos/country-flags/commit/c09927e63705529bbf59ca6684cd9b23225dddad)
- Switzerland has `viewBox="0 0 32 32"`. Nepal has `viewBox="-17.582 -4.664 71.571 87.246"`, retaining its pennant silhouette and transparent surroundings. Mexico contains 159,738 bytes of SVG with detailed emblem paths. These observations came from fetched source files on 22 October 2026. [Switzerland](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/ch.svg), [Nepal](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/np.svg), [Mexico](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/mx.svg)
- Syria's current official design has equal green, white, and black horizontal bands with three red stars in the white band. The Syrian Ministry of Culture describes that design. The UN announced the new three-star flag raising for 25 April 2025. [Ministry of Culture](https://events.moc.gov.sy/en/about-flag), [UN briefing](https://www.un.org/sg/en/content/highlight/2025-04-24.html)
- The selected Syria SVG uses a 900 by 600 viewBox, green `#007a3d`, white, black, and three red stars `#ce1126`. The inspected lipis and FlagCDN files also carry the green-top design. [Pinned SVG](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/sy.svg), [lipis SVG](https://github.com/lipis/flag-icons/blob/main/flags/4x3/sy.svg), [FlagCDN SVG](https://flagcdn.com/sy.svg)

### Inferences

- Preserve the flag artwork as a separate layer inside the tile. Give every tile the same outside geometry and fit each flag with `object-fit: contain` or the SVG equivalent. Preserve native proportions, orientation, transparency, and colors.
- Place cultural decoration on a surrounding frame or a backing surface. Keep the emblem and field legible. This gives square Switzerland, tall Nepal, and wide flags a shared container without editing their identifying shapes.
- Store the upstream repository, pinned commit, acquisition date, per-file hash, and a copy of the upstream rights statement with the asset manifest. Use a manual review of source changes before replacing a snapshot.
- Keep the 249 ISO records as the default catalog. Represent EU, XK, and GB subdivisions as explicit extensions with a declared entity type. An ISO country-code catalog includes territories and dependencies.
- Use a visual review matrix that includes Nepal, Switzerland, Vatican City, Mexico, Belize, Brazil, Sri Lanka, and Syria. These cases exercise silhouettes, dense emblems, letterforms, and updates. Test at both compact and enlarged tile sizes.

### Gaps

- This research verified collection coverage and selected edge cases. It did not compare every flag with legislation or official construction sheets.
- The upstream public-domain statement is a source declaration. A future physical merchandise program would need review of the relevant country's flag-use rules.
- Collections can choose different representations for disputed or transitional cases. Flag selection needs a recorded product policy and review date for each such exception.

## Tactile surfaces and accessible interaction

### Takeaway

A raised edge, a stable hit area, and visible press feedback can make digital tiles feel pressable. Museum ceramic examples supply material references; accessibility requirements should govern the control boundary and motion. [GOV.UK button source](https://github.com/alphagov/govuk-frontend/blob/main/packages/govuk-frontend/src/govuk/components/button/_mixin.scss), [V&A ceramic staircase](https://www.vam.ac.uk/articles/va-trail-architectural-wonders), [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

### Cited findings

| Primary reference | Evidence | Design inference |
| --- | --- | --- |
| GOV.UK button implementation | A solid lower shadow creates depth. The active state moves the button down by the shadow depth. A pseudo-element keeps the original click area covered after movement. | Give the tile a solid lower rim. Animate its inner visual face while keeping the button hit area in place. [Source](https://github.com/alphagov/govuk-frontend/blob/main/packages/govuk-frontend/src/govuk/components/button/_mixin.scss) |
| V&A ceramic staircase | The museum documents lead-glazed earthenware reliefs and painted panels fired onto hexagonal tiles. Its tile collection includes more than 19,000 objects spanning multiple production regions and periods. | Explore a glazed highlight, a matte unglazed edge, or a relief border. Cite the particular maker, place, and period for each craft treatment. [Ceramic staircase](https://www.vam.ac.uk/articles/va-trail-architectural-wonders), [tile collection](https://www.vam.ac.uk/collections/tiles) |
| W3C WCAG 2.2 target size | Level AA criterion 2.5.8 calls for a target of at least 24 by 24 CSS pixels, with listed exceptions including spacing. Rounded corners must still contain a 24-pixel square to meet the direct size condition. | Set the product's normal tile target to at least 48 by 48 CSS pixels, with an accessible name. Keep compact flag art inside that target. [Source](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) |
| W3C non-text contrast | Required visual cues for control identity and state need at least 3:1 contrast against adjacent colors. A separate focus indicator remains necessary even when a control's text identifies it. | Use a clear focus ring and a selected mark on the tile frame. Preserve national flag colors and evaluate the control chrome's contrast. [Source](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) |

- W3C's interaction-animation guidance, a Level AAA criterion, says users must be able to disable nonessential interaction motion. It identifies `prefers-reduced-motion` as a supporting technique. [Source](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

### Inferences

- Standardize a square outer body, an inset face, a lower edge, and a country label. Keep craft treatments within that shell so each tile retains the same interaction grammar.
- A starting recipe is a 16% corner radius, a 4% lower edge, a 10% internal safe area, and a 2-pixel focus ring offset by 3 pixels. Treat these values as prototype parameters to test, rather than requirements from the sources.
- Use a native button for a selectable tile and a native link for navigation. A selected state should include text or a check mark. Decorative flag images can use empty alternative text when the adjacent country name supplies the control name.
- Under reduced-motion preferences, switch the state without spatial animation. Provide focus and selection feedback that survives forced-color display modes.

### Gaps

- Visual depth cannot provide tactile perception on a flat screen. Physical relief, haptic feedback, and Braille would require distinct production and accessibility specifications.
- These references establish a starting design. Usability testing with low-vision users and people using keyboard or switch input remains part of product validation.

## Country and language identity

### Takeaway

Store country identity and language identity as separate data. Country tiles can identify geographic content in Bucket and Polyglott; language choices need explicit language names and language tags. [W3C language guidance](https://www.w3.org/TR/i18n-html-tech-lang/)

### Cited findings

- W3C's language-authoring guidance advises against flag icons as language indicators and specifies BCP 47 subtags for language values. [Source](https://www.w3.org/TR/i18n-html-tech-lang/)
- W3C recommends target-language labels for links to translated content, such as `français` and `日本語`, with optional explanation in the current page language. For a country-of-residence form, it recommends names in the current page language. [Source](https://www.w3.org/International/questions/qa-navigation-select)
- Language markup helps speech synthesis and Braille translation choose the right language behavior. [Source](https://www.w3.org/International/questions/qa-lang-why)

### Inferences

- Use `countryCode` for the tile asset and `languageTag` for content or course identity. Add a region to a language choice only when the content distinguishes that region.
- Render a language course with a language name, its autonym, and an optional geographic context. A country flag can accompany a named regional course or a place-based lesson.
- Let one country connect to several language experiences and one language connect to several countries. Do not infer a user's language, ethnicity, or citizenship from a tile selection.
- Keep country names as text and localize them for the current interface. Provide the full name to assistive technology when a compact layout truncates the visible name.

### Gaps

- The product teams must define which courses distinguish a regional language variety. This research did not audit the course catalogs.
