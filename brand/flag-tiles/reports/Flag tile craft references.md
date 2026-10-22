# Flag tiles connect places and craft

Research date: 22 October 2026.

Bucket and Polingual can share one clickable tile system with **249 ISO country and territory records** and a separate library of regional craft editions. The flag occupies a protected inset; the surrounding body carries the material treatment. **Sixteen initial craft studies** provide references for ceramic, lacquer, textile, enamel, glass, and terracotta finishes. Each edition names its place or community and links its source. Countries without a researched edition use the common material system. The collection establishes flag coverage and a first set of craft studies; further regional editions require their own research. [empirical: pinned source tree and local `crafts.json`, 2026-10-22, compare SVG basenames with `pycountry.countries`; count craft records] ([Flag source](https://github.com/hampusborgos/country-flags/tree/c09927e63705529bbf59ca6684cd9b23225dddad/svg))

## Flag artwork

The recommended geometric source is `hampusborgos/country-flags` at commit `c09927e63705529bbf59ca6684cd9b23225dddad`. The collection retains native proportions and detailed emblem paths. The audited two-letter files cover the ISO dataset, with EU and XK as extensions. Keep the source revision and per-file hashes in the asset record so updates can be reviewed. The public catalog should describe its artwork as a dated source snapshot. ([Repository and provenance](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/README.md))

Switzerland and Vatican City retain square viewBoxes. Nepal retains its pennant silhouette and transparent surroundings. Their native shapes must remain visible within the common shell; `object-fit: contain` preserves them. The source's Syria artwork has green, white, and black bands with three red stars, matching the Syrian Ministry of Culture's current description. The UN announced the new flag raising for 25 April 2025. [empirical: local CH, VA, NP, and SY SVG roots inspected, 2026-10-22, parse `viewBox` attributes] ([Switzerland source](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/ch.svg), [Vatican City source](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/va.svg), [Nepal source](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/np.svg), [Syria ministry](https://events.moc.gov.sy/en/about-flag), [UN briefing](https://www.un.org/sg/en/content/highlight/2025-04-24.html))

**Afghanistan requires a source note.** The pinned file retains the Islamic Republic's black, red, and green tricolour. This review does not certify that representation for every present-day authority or audience. Display the selected source and check the intended context before reuse. Antarctica also needs a source-specific label for its proposal artwork. Changes in political representation require an attributed decision, a review date, and a new asset revision. ([Afghanistan source](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/af.svg), [Antarctica source](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/svg/aq.svg))

The source repository describes its Wikimedia-derived flag images as public domain and acknowledges possible flag-use restrictions. Preserve that statement as provenance. `lipis/flag-icons` provides an MIT-licensed alternative whose notice must accompany copied material; its uniform icon variants need review where original proportions matter. Flagpedia identifies its flag images as public domain while retaining rights in other website content. Neither a museum reference nor a craft description grants reproduction rights to the pictured work. ([Source statement](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/README.md), [lipis license](https://github.com/lipis/flag-icons/blob/main/LICENSE), [Flagpedia terms](https://flagpedia.net/terms))

## Regional craft editions

Each pairing is an attributed regional study. A country can support many editions, and a craft can span present-day borders. The proposed treatments translate process into edge detail and material response. They use new marks around the flag. Named ceremonial patterns, community insignia, and artist compositions require an agreed scope of use before entering the reusable library.

| Country | Named reference | Proposed tile treatment and boundary |
| --- | --- | --- |
| Portugal | Portuguese azulejo object MNAz 8961 Az; maker unknown; held in Lisbon. [Museum record](https://raiz.museusemonumentos.pt/DetalhesObra/Index/1027469?tipo=OBJ) | White glaze with an original blue edge grid. The record supports Portuguese production; the workshop remains unknown. |
| Japan | Wajima-nuri, Wajima in Ishikawa Prefecture. [Japan Tourism Agency](https://www.mlit.go.jp/tagengo-db/en/R4-00536.html) | Polished lacquer body and a broad highlight. Preserve the red disc; reserve family crests and copied maki-e compositions. |
| Mexico | Talavera making in Puebla and Tlaxcala, related to named Spanish centres. [UNESCO](https://ich.unesco.org/es/RL/procesos-artesanales-para-la-elaboracion-de-la-talavera-de-puebla-y-tlaxcala-mexico-y-de-la-ceramica-de-talavera-de-la-reina-y-el-puente-del-arzobispo-espana-01462?RL=01462) | Glazed ceramic rim with original dots. Preserve the coat of arms and omit workshop marks. |
| India | Woodblock printing in Jaipur and Sanganer, Rajasthan. [V&A](https://www.vam.ac.uk/articles/indian-textiles/) | Fabric-like rim with stamped dots and slight registration variation. Preserve the Ashoka Chakra. |
| Ghana | Asante and Ewe kente weaving; Ewe traditions also extend into Togo. [Smithsonian](https://www.si.edu/object/wrapper%3Anmafa_EJ10571), [UNESCO](https://ich.unesco.org/en/RL/craftsmanship-of-traditional-woven-textile-kente-02130) | Plain woven strip seams. Reserve named and rank-coded patterns for maker-led editions. |
| Morocco | Fez zellij, Batha Museum panel C 66 from a domestic setting. [Museum record](https://islamicart.museumwnf.org/database_item.php?id=object%3BISL%3Bma%3BMus01_C%3B31%3Ben) | Cut-piece joints in the ceramic rim. Preserve the pentagram and avoid copied panel arrangements. |
| Türkiye | Iznik ceramics, western Anatolia, including raised bole-red. [Ashmolean](https://jameelcentre.ashmolean.org/collection/4/837/865) | White glaze with a raised red edge accent. Preserve the crescent and star. |
| Italy | Faenza maiolica and compendiario brushwork, Emilia-Romagna. [MIC Faenza](https://www.micfaenza.org/en/collezioni/faenza-ceramics-from-the-middle-ages-to-the-baroque-epoch/) | Opaque glaze with original brush dots. Keep pictorial scenes outside the default edition. |
| France | Limoges champlevé enamel, demonstrated through a reliquary detail. [V&A](https://www.vam.ac.uk/articles/how-was-it-made-champlev%C3%A9-enamelling) | Copper-toned rim and enamel appearance. The edition borrows a process cue; reliquary imagery remains excluded. |
| Netherlands | Delft cobalt brush painting and glazing. [Royal Delft Museum](https://museum.royaldelft.com/en/discover-the-collection/our-craftsmanship/) | White ceramic with an original blue brush-wave edge. Preserve the flag palette and omit maker marks. |
| Finland | Iittala village glassmaking, Hämeenlinna. [City of Hämeenlinna](https://www.hameenlinna.fi/en/tourism-and-events/iittala-design-arts-and-culture/) | Translucent rim and matte bevel in a new outline. Reserve branded silhouettes and Sámi ornament. |
| Peru | Textile art of Taquile island, Lake Titicaca. [UNESCO](https://ich.unesco.org/en/RL/textile-art-of-taquile-00166) | Plain woven relief and a stitched edge. Named garment patterns require community collaboration. |
| South Korea | Jeolla buncheong, white slip over a grey body. [Metropolitan Museum of Art](https://www.metmuseum.org/ko/essays/joseon-buncheong-ware-between-celadon-and-porcelain) | Grey sidewall with white slip and shallow edge incisions. Preserve taegeuk and trigrams. |
| Brazil | Brasília architectural tile practice documented by Fundação Athos Bulcão. [Foundation gallery](https://fundathos.org.br/galeriavirtual) | New modular ceramic grid. Athos Bulcão motifs and mural arrangements require licensed use. |
| Indonesia | Hand-drawn and stamped batik in Pekalongan, Java. [UNESCO](https://www.unesco.org/en/creative-cities/pekalongan) | Original wax-resist dots on a textile-like rim. Reserve named court and ritual patterns. |
| New Zealand | Driving Creek studio clay, Coromandel. [Driving Creek Trust](https://drivingcreek.nz/our-history/) | Plain terracotta sidewall. A Māori motif edition requires a Māori-led commission and agreed permissions. |

Kente and batik can carry social or ceremonial meaning, and Taquile textiles belong to a living community practice. Place, maker, object context, and permitted reuse belong alongside any cultural motif. IPONZ describes collective responsibilities associated with Māori cultural material and the potential need for consent from traditional owners. ([UNESCO batik](https://ich.unesco.org/en/RL/indonesianbatik-00170), [UNESCO Taquile](https://ich.unesco.org/en/RL/textile-art-of-taquile-00166), [IPONZ](https://www.iponz.govt.nz/get-ip/maori-ip/maori-culture-and-intellectual-property/))

## Tile construction and interaction

The implemented shell uses a **1.12 width-to-height ratio** and **19% corner radius**, with a **16% radius for textile**. Padding is 14% at the top, 13% at the sides, and 18% at the bottom; the white inset face adds 3% padding. Width responds to its containing layout. These are product design tokens selected for the prototype. The flag preserves its field colors and complete emblem; framing changes never crop, recolor, or stretch its geometry. [empirical: `src/components/flags/flags.module.css`, 2026-10-22, inspect `.tile`, `.tileFace`, and textile rules]

| Layer | Standard |
| --- | --- |
| Body | One shared footprint with a visible lower edge, a rounded face, and a stable click target. |
| Rim | Cultural treatment stays in the outer frame and sidewall. Maintain separation from the flag's symbols and writing. |
| Flag | Use the versioned SVG as an image with contain sizing and an unobstructed face. Preserve transparent space around shaped flags. |
| Label | Place the country name outside the artwork. Preserve the full accessible name when visible text truncates. |
| Detail view | Clicking opens the country record with source attribution, craft context, and imagery or typography references. |
| Compact sizes | Provide 40, 56, and 80 CSS-pixel artwork sizes. Interactive wrappers remain at least 44 by 44 CSS pixels. |

The compact sizes and control minimum are prototype standards. WCAG 2.2 Level AA specifies a 24 by 24 CSS-pixel target subject to its listed exceptions. Required control and state cues need 3:1 contrast against adjacent colors. Keep the original flag palette and apply those checks to the surrounding controls. [empirical: W3C guidance and design proposal, 2026-10-22, compare target and contrast specifications] ([Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html))

Use a native button for selection and a native link for navigation. Keyboard focus needs a visible ring; selection needs a persistent mark or label. The implementation changes the selected frame and lifts the inner face on hover while retaining the button's hit area. GOV.UK's button implementation supplies a reference for a solid lower shadow and coverage of the original click area during movement. Under `prefers-reduced-motion`, change state without spatial animation. ([GOV.UK source](https://github.com/alphagov/govuk-frontend/blob/main/packages/govuk-frontend/src/govuk/components/button/_mixin.scss), [W3C motion guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html))

| Common finish | Shared material cue |
| --- | --- |
| Ceramic | Opaque body, glaze pooling at the rim, shallow relief. |
| Lacquer | Smooth dark sidewall and one broad polished highlight. |
| Textile | Low-relief woven strips or stamped dots in the frame. |
| Enamel | Copper-toned edge with a smooth fused-glass appearance. |
| Glass | Translucent rim with a matte bevel and limited refraction. |
| Terracotta | Matte clay sidewall with an unpatterned surface. |

These finishes are reusable rendering recipes. Their application to a country without a cited study carries a material label alone. Digital highlights suggest material; physical relief and haptic behavior require a separate production specification.

## Typography and cultural imagery

Country identity and language identity need separate fields. A `countryCode` selects flag artwork; a BCP 47 language tag selects language content. A language can connect to several countries, and a country can connect to several languages. Polingual's language choices should display explicit names and autonyms; a regional course can add a named geographic context. W3C recommends target-language labels for translated content and advises against using flags to identify languages. ([W3C language guidance](https://www.w3.org/TR/i18n-html-tech-lang/), [Localized navigation](https://www.w3.org/International/questions/qa-navigation-select))

The interface keeps its country labels and adds script specimens with explicit language tags. Five local Google Fonts Noto subsets supply Noto Serif, Noto Serif JP, Noto Serif KR, Noto Serif Devanagari, and Noto Naskh Arabic. Each retains its SIL Open Font License text. FontTools glyph checks covered the current sixteen labels; new labels require a new coverage check. The Arabic specimen carries `dir="rtl"`. Each specimen names its selected language. [empirical: `fonts/` and `cultural-labels.json`, 2026-10-22, compare FontTools `getBestCmap()` with every label character] W3C documents how language markup supports font selection and speech or Braille output. ([Language attributes](https://www.w3.org/International/questions/qa-lang-why))

Sixteen original vector material studies and sixteen object or tool icons supply the initial visual library. Six detail views replace the studio illustration with a credited Met photograph. The pictured objects are a Japanese lacquer box, a Gujarat printed textile, a Korean buncheong bowl, a Delft dish, a Wari tunic, and an Italian maiolica dish. The Met object records and collection API identify these images as public domain; the museum releases designated images under CC0. [empirical: `icons/`, `illustrations/`, and `imagery.json`, 2026-10-22, count local SVGs and check Met object rights records] ([Met Open Access](https://www.metmuseum.org/hubs/open-access), [Japanese box](https://www.metmuseum.org/art/collection/search/56543), [Gujarat textile](https://www.metmuseum.org/art/collection/search/448535), [Korean bowl](https://www.metmuseum.org/art/collection/search/39571), [Delft dish](https://www.metmuseum.org/art/collection/search/196577), [Wari tunic](https://www.metmuseum.org/art/collection/search/675980), [Italian dish](https://www.metmuseum.org/art/collection/search/460150))

Photograph captions preserve their own attribution. The Gujarat textile appears as a related object beside the Rajasthan study; the Wari tunic accompanies the Taquile study. The Japanese box has no specified production locality, and the Korean bowl has no assigned province or kiln. The Italian dish's Faenza attribution retains the museum's uncertainty. These images illustrate related material traditions while the craft source continues to define the named frame edition. Sacred imagery and recognizable community insignia require a reviewed commission before adaptation into reusable motifs.

Generated concept boards can explore glaze, light, and texture around a protected flag face. Mark them as generated design studies. Their flag details and text require comparison with the versioned SVG and reviewed language copy. The geometric asset remains the source used by the interface. A production edition combines the approved shell with a verified flag and an attributed craft record.

## Edition records

Every cultural edition should retain its regional attribution and source URL, plus the chosen finish and motif status. Add a practitioner review when a design adopts a recognizable living tradition. Preserve earlier editions and the reason for an artwork change so historical content can select the intended version.

The first release serves the geographic catalog alongside its initial craft studies, script specimens, and credited imagery. New editions need source-backed records at the same level of detail. This creates a path for future commissions and local review without assigning one visual tradition to an entire country.
