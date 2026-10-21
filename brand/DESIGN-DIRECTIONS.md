# bkt Design Directions, Round 2

Brand-kit Step 1. Page: `brand/_directions/index.html`; screens in `_directions/screens/`, icons in `_directions/icons/`, references in `_directions/refs/<id>/`. Round 1 archived at `brand/_archive/2026-10/directions-v1/`. Each direction pairs one art movement with one shipping design system and cites both. Art is gpt-image-1 high quality, three candidates per direction, best one cropped. Marks and icons are hand-written SVG on a 24px grid.

| # | Name | Movement | System | Accent | Display type | Scale | Motion |
|---|------|----------|--------|--------|--------------|-------|--------|
| 1 | Grid | Swiss International Style | IBM Carbon | #0F62FE | IBM Plex Sans | Carbon productive | cubic-bezier(0.2,0,0.38,0.9) 240ms |
| 2 | Kamon | Japanese mon crests and ukiyo-e | Apple Human Interface Guidelines | #1F3A5F | Shippori Mincho | Perfect fourth 1.333 | cubic-bezier(0.65,0,0.35,1) 500ms |
| 3 | Squiggle | Memphis Group | Duolingo design system | #58CC02 | Fredoka | Major third 1.25 | cubic-bezier(0.34,1.56,0.64,1) 300ms |
| 4 | Wedge | Soviet constructivism | Material Design 3 | #E3242B | Oswald | Golden 1.618 | cubic-bezier(0.2,0,0,1) 500ms |
| 5 | Girih | Islamic geometric tiling | Microsoft Fluent 2 | #3FC1C9 | Reem Kufi | Minor third 1.2 | cubic-bezier(0,0,0,1) 367ms |
| 6 | Primitive | Bauhaus | Teenage Engineering | #FF5F00 | Jost | Perfect fifth 1.5 | steps(4,end) 320ms |
| 7 | Euclid | Classical Greek: Attic red-figure, stoichedon inscriptions and Byrne's Euclid | Wikimedia Codex | #A6442A | GFS Didot | Golden ratio steps on a 4px base | cubic-bezier(0.4,0,0.2,1) 240ms |

## 1 Grid

Bucket as a reference work. Flush-left type on a 16-column grid, one blue for action, everything else black, white and grey. The canon reads like an index you trust because nothing on the page is decorative.

- Color: bg #FFFFFF, surf #F4F4F4, text #161616, muted #525252, acc #0F62FE, onacc #FFFFFF, hl #DA1E28
- Type: Carbon productive: 12/16, 14/20, 16/24, 20/28, 32/40, 54/64, 76/84; display IBM Plex Sans 300, body IBM Plex Sans, Hebrew IBM Plex Sans Hebrew
- Layout: 16-column Carbon 2x grid, 0 radius, 1px #E0E0E0 rules, flush left, ragged right, headline at 300 weight 54px
- Illustration: No illustration. Data is the picture: canon counts, timelines and grids drawn as Carbon charts. The hero image is a Muller-Brockmann style circle study.
- Icons: Carbon: 24 artboard, 2px padding, 20px live area, square terminals, 2px counters
- Motion: Carbon productive easing cubic-bezier(0.2,0,0.38,0.9), 110 to 240ms; card flip is a 2D slide, no 3D
- Contrast: text on bg 18.10:1; muted on bg 7.81:1; text on surface 16.45:1; muted on surface 7.10:1; button label 5.00:1; icon on bg, non-text 3:1 18.10:1; action on bg, non-text 3:1 5.00:1
- Sources:
  - [Josef Muller-Brockmann, Grid Systems in Graphic Design, 1981](https://archive.org/details/gridsystemsingra0000mull)
  - [Carbon icon design guidelines](https://carbondesignsystem.com/elements/icons/design/)
  - [Carbon motion](https://carbondesignsystem.com/elements/motion/overview/)
  - [Carbon color tokens](https://carbondesignsystem.com/elements/color/tokens/)
- References:
  - [Musica Viva. Müller-Brockmann](https://commons.wikimedia.org/wiki/File:Musica_Viva._M%C3%BCller-Brockmann.jpg), Public domain
  - [Josef Müller-Brockmann der Film](https://commons.wikimedia.org/wiki/File:Josef_M%C3%BCller-Brockmann_der_Film.jpg), Public domain
  - [1959 - Kunsthalle Basel - 4 Bildhauer](https://commons.wikimedia.org/wiki/File:1959_-_Kunsthalle_Basel_-_4_Bildhauer.jpg), Public domain
  - [1962 - Kunsthalle Basel - Rothko Chillida](https://commons.wikimedia.org/wiki/File:1962_-_Kunsthalle_Basel_-_Rothko_Chillida.jpg), Public domain
  - [Form Farbe Gewerbemuseum Winterthur 1951](https://commons.wikimedia.org/wiki/File:Form_Farbe_Gewerbemuseum_Winterthur_1951.jpg), Public domain
  - [Carbon Design System: Icons usage](https://carbondesignsystem.com/elements/icons/usage/), Screenshot of public documentation page, reference use only
  - [Carbon Design System: Color overview](https://carbondesignsystem.com/elements/color/overview/), Screenshot of public documentation page, reference use only
  - [Carbon Design System: Chart types](https://carbondesignsystem.com/data-visualization/chart-types/), Screenshot of public documentation page, reference use only

## 2 Kamon

Each canon branch and each language gets a crest, the way Edo families marked their goods. Indigo and sumi on washi, vermilion for the one seal of approval. Calm, ceremonial, made to be collected.

- Color: bg #F4EFE4, surf #FBF8F1, text #1C1C1C, muted #5A5148, acc #1F3A5F, onacc #F4EFE4, hl #B8341B
- Type: Perfect fourth 1.333: 14, 18, 24, 32, 42, 56, 75; display Shippori Mincho 800, body Zen Kaku Gothic New, Hebrew Frank Ruhl Libre
- Layout: Centered vertical axis like a hanging scroll, HIG 1024 superellipse icon, 20pt continuous corner cards, generous ma, the negative space of Japanese composition
- Illustration: Woodblock-print scenes in flat indigo and sumi with keyline outlines, Hokusai and Hiroshige as source. Crests drawn as SVG.
- Icons: SF Symbols regular-weight counters at 2px, 1px corner radius, glyph set into a 24px mon roundel with a hairline inner ring
- Motion: HIG spring, response 0.5s, damping 0.85; the seal stamps with a 1.04 overshoot
- Contrast: text on bg 14.86:1; muted on bg 6.77:1; text on surface 16.07:1; muted on surface 7.32:1; button label 10.01:1; seal label 5.92:1; crest on bg, non-text 3:1 10.01:1
- Sources:
  - [Matsuya Piece-Goods Store, Japanese Design Motifs: 4,260 Illustrations of Japanese Crests, Dover 1972](https://store.doverpublications.com/products/9780486228747)
  - [Katsushika Hokusai, Thirty-six Views of Mount Fuji, Met collection](https://www.metmuseum.org/art/collection/search/45434)
  - [Apple HIG, App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
  - [SF Symbols](https://developer.apple.com/sf-symbols/)
- References:
  - [Kamon Kuwayama 2](https://commons.wikimedia.org/wiki/File:Kamon_Kuwayama_2.jpg), CC BY-SA 4.0
  - [Japanese family crest takanoha](https://commons.wikimedia.org/wiki/File:Japanese_family_crest_takanoha.svg), CC BY-SA 2.5
  - [The Great Wave off Kanagawa](https://commons.wikimedia.org/wiki/File:The_Great_Wave_off_Kanagawa.jpg), Public domain
  - [Ōhashi Atake no yūdachi](https://commons.wikimedia.org/wiki/File:%C5%8Chashi_Atake_no_y%C5%ABdachi-%E5%90%8D%E6%89%80%E6%B1%9F%E6%88%B8%E7%99%BE%E6%99%AF_%E5%A4%A7%E3%81%AF%E3%81%97%E3%81%82%E3%81%9F%E3%81%91%E3%81%AE%E5%A4%95%E7%AB%8B-Sudden_Shower_over_Shin-%C5%8Chashi_Bridge_and_Atake_(%C5%8Chashi_Atake_no_y%C5%ABdachi),_from_the_series_One_Hundred_Famous_Views_of_Edo_(Meisho_Edo_hyakkei)_MET_DP123602.jpg), CC0
  - [Kamon Sakai](https://commons.wikimedia.org/wiki/File:Kamon_Sakai.svg), CC BY-SA 4.0
  - [Apple HIG: App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons), Screenshot of public documentation page, reference use only
  - [Apple HIG: SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols), Screenshot of public documentation page, reference use only
  - [Apple HIG: Foundations](https://developer.apple.com/design/human-interface-guidelines/), Screenshot of public documentation page, reference use only

## 3 Squiggle

Loud, toy-like, unserious about itself and serious about the work. Memphis laminate patterns and Duolingo chunky shapes make Polingual a game you open on the bus.

- Color: bg #FFF8E7, surf #FFFFFF, text #2B2B2B, muted #5E5A52, acc #58CC02, onacc #173600, hl #FF4B91
- Type: Major third 1.25: 15, 19, 24, 30, 37, 47, 58; display Fredoka 700, body Nunito, Hebrew Rubik
- Layout: Card stack with 16px radius and a 4px bottom lip on every pressable, Duolingo style; patterned margins of terrazzo and squiggles
- Illustration: Duolingo rule of simple shapes, rounded corners and flat fills, composed with Memphis squiggles, terrazzo and zigzags. Hero is generated.
- Icons: Duolingo: 24 artboard, 1.5px corner radius on every join, 2px darker lip below each shape
- Motion: Bouncy press: 3px lip collapses in 80ms, release overshoot cubic-bezier(0.34,1.56,0.64,1) at 300ms
- Contrast: text on bg 13.37:1; muted on bg 6.48:1; text on surface 14.16:1; muted on surface 6.86:1; button label 6.43:1; pink tag label 5.53:1; icon on bg, non-text 3:1 4.90:1; glyph on yellow, non-text 3:1 3.34:1
- Sources:
  - [Memphis Group, Milan 1981, Design Museum](https://designmuseum.org/discover-design/all-stories/memphis-group-awful-tasteless-and-brilliant)
  - [Ettore Sottsass, Carlton bookcase 1981, V&A](https://collections.vam.ac.uk/item/O1138636/carlton-bookcase-sottsass-ettore/)
  - [Duolingo design guidelines](https://design.duolingo.com/)
  - [Duolingo illustration guidelines](https://design.duolingo.com/marketing/illustration)
- References:
  - [Ettore sottsass per memphis srl., libreria carlton, milano 1981](https://commons.wikimedia.org/wiki/File:Ettore_sottsass_per_memphis_srl.,_libreria_carlton,_milano_1981.jpg), CC BY 3.0
  - [Memphis - MADRAS table by Natalie Du Pasquier 1986](https://commons.wikimedia.org/wiki/File:Memphis_-_MADRAS_table_by_Natalie_Du_Pasquier_1986.jpg), CC BY 2.0
  - [Memphis carpet by Nathalier Du Pasquier 1985](https://commons.wikimedia.org/wiki/File:Memphis_carpet_by_Nathalier_Du_Pasquier_1985.jpg), CC BY 2.0
  - [Memphis Emerald by Nathalie Du Pasquier - 31064843947](https://commons.wikimedia.org/wiki/File:Memphis_Emerald_by_Nathalie_Du_Pasquier_-_31064843947.jpg), CC BY 2.0
  - [Memphis Group collection of the Musée des Arts Décoratifs in Paris](https://commons.wikimedia.org/wiki/File:Memphis_Group_collection_of_the_Mus%C3%A9e_des_Arts_D%C3%A9coratifs_in_Paris.jpg), CC BY-SA 4.0
  - [Duolingo Design blog: core tabs redesign](https://blog.duolingo.com/core-tabs-redesign/), Screenshot of public documentation page, reference use only
  - [Duolingo Design blog: Duologues design conversations](https://blog.duolingo.com/duologues-design-conversations/), Screenshot of public documentation page, reference use only
  - [Duolingo: home](https://www.duolingo.com/), Screenshot of public documentation page, reference use only

## 4 Wedge

Knowledge as construction. A hot-red wedge cuts a black field at 30 degrees, type stacks in condensed caps, photomontage of hands at work. Bucket builds the past and the page shows the scaffolding.

- Color: bg #141414, surf #222222, text #EFE6D2, muted #B5AC9A, acc #E3242B, onacc #FFFFFF, hl #EFE6D2
- Type: Golden 1.618: 14, 22, 36, 58, 94, 152; display Oswald 700, body Roboto Flex, Hebrew Heebo
- Layout: M3 window classes with a 30 degree diagonal axis; one red wedge per screen points at the action; uppercase condensed headlines
- Illustration: Rodchenko photomontage: halftone photos cut into wedges and circles. Hero is generated.
- Icons: Material Symbols Sharp, filled, 24dp with 20dp live area, 0 radius, red corner wedge as the active marker
- Motion: M3 emphasized easing cubic-bezier(0.2,0,0,1), 500ms; elements enter on the 30 degree axis
- Contrast: text on bg 14.84:1; muted on bg 8.19:1; text on surface 12.82:1; muted on surface 7.07:1; button label 4.61:1; icon on bg, non-text 3:1 14.84:1; wedge on bg, non-text 3:1 3.99:1
- Sources:
  - [El Lissitzky, Beat the Whites with the Red Wedge, 1919](https://en.wikipedia.org/wiki/Beat_the_Whites_with_the_Red_Wedge)
  - [Alexander Rodchenko, Books poster for Lengiz, 1924, MoMA](https://www.moma.org/collection/works/6543)
  - [Material 3 icons](https://m3.material.io/styles/icons/designing-icons)
  - [Material 3 easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- References:
  - [Beat the Whites with the Red Wedge](https://commons.wikimedia.org/wiki/File:Beat_the_Whites_with_the_Red_Wedge.jpg), Public domain
  - [Mess-Mend 8](https://commons.wikimedia.org/wiki/File:Mess-Mend_8.png), Public domain
  - [Klucis, Да здравствует мировой Октябрь](https://commons.wikimedia.org/wiki/File:Klucis,_%D0%94%D0%B0_%D0%B7%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B5%D1%82_%D0%BC%D0%B8%D1%80%D0%BE%D0%B2%D0%BE%D0%B9_%D0%9E%D0%BA%D1%82%D1%8F%D0%B1%D1%80%D1%8C.jpg), Public domain
  - [Lenin and socialist reconstruction Design for poster - Gustavs Klucis](https://commons.wikimedia.org/wiki/File:Lenin_and_socialist_reconstruction_Design_for_poster_-_Gustavs_Klucis.jpg), Public domain
  - [Klutsis (1929) Soviet Power plus electrification](https://commons.wikimedia.org/wiki/File:Klutsis_(1929)_Soviet_Power_plus_electrification.png), Public domain
  - [Material 3: Icons overview](https://m3.material.io/styles/icons/overview), Screenshot of public documentation page, reference use only
  - [Material 3: Easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs), Screenshot of public documentation page, reference use only
  - [Google Fonts: Material Symbols](https://fonts.google.com/icons), Screenshot of public documentation page, reference use only

## 5 Girih

Foundations as pattern. One compass, one ruler, infinite tiling: girih and zellige show that a few axioms generate everything. Cobalt night, turquoise glaze, white plaster.

- Color: bg #0B2A5B, surf #123873, text #F5F7FA, muted #C3CEE2, acc #3FC1C9, onacc #062027, hl #F2C14E
- Type: Minor third 1.2: 14, 17, 20, 24, 29, 35, 50, 60; display Reem Kufi 700, body Noto Sans, Hebrew Noto Sans Hebrew
- Layout: Fluent 4px spacing ramp, 8px radius, layered acrylic surfaces; every container sits on an 8-fold tile lattice
- Illustration: Tiles built from compass and straightedge construction, after Broug: star, rosette, interlace. Hero is generated.
- Icons: Fluent 2 filled 24: 2px padding, 1.5px corner radius, 2px counters, 4-point accent on the keyline corner
- Motion: Fluent decelerate-max cubic-bezier(0,0,0,1) at 367ms; patterns rotate 45 degrees on reveal
- Contrast: text on bg 13.08:1; muted on bg 8.85:1; text on surface 10.64:1; muted on surface 7.20:1; button label 7.79:1; gold on bg 8.36:1; icon on bg, non-text 3:1 13.08:1; star on bg, non-text 3:1 6.47:1
- Sources:
  - [Eric Broug, Islamic Geometric Patterns, Thames and Hudson 2008](https://www.broug.com/)
  - [Alhambra tilework, Patronato de la Alhambra](https://www.alhambra-patronato.es/en)
  - [Fluent 2 iconography](https://fluent2.microsoft.design/iconography)
  - [Fluent 2 motion](https://fluent2.microsoft.design/motion)
- References:
  - [Iznik tiles, IMetropolitan Museum of Art, New York - 53476838117](https://commons.wikimedia.org/wiki/File:Iznik_tiles,_IMetropolitan_Museum_of_Art,_New_York_-_53476838117.jpg), CC BY-SA 2.0
  - [Iznik tiles, IMetropolitan Museum of Art, New York - 53476838172](https://commons.wikimedia.org/wiki/File:Iznik_tiles,_IMetropolitan_Museum_of_Art,_New_York_-_53476838172.jpg), CC BY-SA 2.0
  - [Alicatados de la Sala del Mexuar, la Alhambra](https://commons.wikimedia.org/wiki/File:Alicatados_de_la_Sala_del_Mexuar,_la_Alhambra.jpg), CC BY-SA 4.0
  - [Darb-e Imam 16](https://commons.wikimedia.org/wiki/File:Darb-e_Imam_16.jpg), CC BY-SA 4.0
  - [Girih tiles](https://commons.wikimedia.org/wiki/File:Girih_tiles.jpg), CC BY-SA 4.0
  - [Fluent 2: Iconography](https://fluent2.microsoft.design/iconography), Screenshot of public documentation page, reference use only
  - [Fluent 2: Motion](https://fluent2.microsoft.design/motion), Screenshot of public documentation page, reference use only
  - [Fluent 2: Color](https://fluent2.microsoft.design/color), Screenshot of public documentation page, reference use only

## 6 Primitive

Circle, square, triangle, and a knob. Kandinsky's 1923 questionnaire gives the colors, Bayer's universal alphabet the letters, Teenage Engineering the hardware feel: Bucket as an instrument you play.

- Color: bg #D9D6CF, surf #EDEBE6, text #111111, muted #3F3D39, acc #FF5F00, onacc #111111, hl #1D4ED8
- Type: Perfect fifth 1.5: 12, 18, 27, 40, 60, 90; display Jost 700, body Jost, Hebrew Heebo
- Layout: Hardware panel: 8px module, mono labels in small caps, 2px black keylines, controls laid out like OP-1 keys
- Illustration: Only the three primitives in primary colors, composed like Bauhaus posters. No figures.
- Icons: Circle, square and triangle only on a 2px module, two colors, no curves except full circles
- Motion: Stepped and linear: steps(4) for state, 120ms linear for knobs, after TE device screens
- Contrast: text on bg 13.01:1; muted on bg 7.47:1; text on surface 15.85:1; muted on surface 9.10:1; button label 6.19:1; blue link on bg 5.63:1; icon on bg, non-text 3:1 13.01:1; orange key keyline, non-text 3:1 6.19:1
- Sources:
  - [Herbert Bayer, Universal alphabet, 1925, MoMA](https://www.moma.org/collection/works/7108)
  - [Wassily Kandinsky, Bauhaus color-form questionnaire, 1923](https://www.bauhauskooperation.com/knowledge/the-bauhaus/works/)
  - [Teenage Engineering OP-1 field guide](https://teenage.engineering/guides/op-1)
  - [Teenage Engineering design](https://teenage.engineering/products)
- References:
  - [Joost Schmidt Bauhausausstellung 1923](https://commons.wikimedia.org/wiki/File:Joost_Schmidt_Bauhausausstellung_1923.jpg), Public domain
  - [Postkarte Bauhaus Wassily Kandinsky Postkarte für die Bauhaus-Ausstellung](https://commons.wikimedia.org/wiki/File:Postkarte_Bauhaus_Wassily_Kandinsky_Postkarte_f%C3%BCr_die_Bauhaus-Ausstellung.jpg), Public domain
  - [Herbert Bayer at the exhibition Bauhaus](https://commons.wikimedia.org/wiki/File:Herbert_Bayer_at_the_exhibition_Bauhaus.jpg), CC BY-SA 4.0
  - [Josef Albers' Studies for Homage to the Square](https://commons.wikimedia.org/wiki/File:Josef_Albers%27_Studies_for_Homage_to_the_Square.jpg), CC BY 2.0
  - [Joost Schmidt Bauhausheft 7 1926](https://commons.wikimedia.org/wiki/File:Joost_Schmidt_Bauhausheft_7_1926.jpg), Public domain
  - [Teenage Engineering: OP-1 guides](https://teenage.engineering/guides/op-1), Screenshot of public documentation page, reference use only
  - [Teenage Engineering: TP-7](https://teenage.engineering/products/tp-7), Screenshot of public documentation page, reference use only
  - [Teenage Engineering: Home](https://teenage.engineering/), Screenshot of public documentation page, reference use only
  - [Teenage Engineering: OP-1 product](https://teenage.engineering/products/op-1), Screenshot of public documentation page, reference use only

## 7 Euclid

Bucket as the Greek polymath's notebook. Letters cut on the stoichedon grid, terracotta and black from Attic vases, and Byrne's colored proofs for every diagram. The ℧ is Greek, so this is its home.

- Color: bg #F3EEE3, surf #FBF8F1, text #1A1714, muted #5B5148, acc #A6442A, onacc #FFFFFF, hl #1E4F94
- Type: Golden ratio steps on a 4px base: 13, 16, 21, 26, 34, 55, 89; display GFS Didot 400, body Gentium Book Plus, Hebrew Noto Sans Hebrew
- Layout: Stoichedon letter grid for headings, Codex 8px spacing and 2px radius, numbered propositions with a proof column beside the figure
- Illustration: Byrne-style Euclid figures in red, yellow and blue on parchment, red-figure silhouettes for people and animals, all drawn by compass and straightedge in code
- Icons: Codex 20px grid inside a 24 artboard, filled, 1px corner radius, Greek-key corner on the active state
- Motion: Proof steps: each construction line draws in order, then the conclusion fades in with QED; cubic-bezier(0.4,0,0.2,1) 240ms per step
- Contrast: text on bg 15.43:1; muted on bg 6.68:1; text on surface 16.83:1; muted on surface 7.29:1; button label 6.03:1; icon on bg, non-text 3:1 15.43:1; terracotta on bg, non-text 3:1 5.21:1
- Sources:
  - [Oliver Byrne, The First Six Books of the Elements of Euclid, 1847](https://archive.org/details/firstsixbooksofe00eucl)
  - [Euphronios krater, Met, public domain](https://www.metmuseum.org/art/collection/search/253425)
  - [Stoichedon inscription, decree of Athens, British Museum](https://www.britishmuseum.org/collection/term/x11868)
  - [Wikimedia Codex design system](https://doc.wikimedia.org/codex/latest/)

## Critic Rounds

Bucket critic, design rubric frozen before round 1, pass above 8.0 with every dimension at least 7.0 and no open high finding.

| # | Name | Round 1 | Round 2 | Round 3 |
|---|------|---------|---------|---------|
| 1 | Grid | 7.60 fail | 7.99 fail | 8.13 pass |
| 2 | Kamon | 7.55 fail | 7.93 fail | 7.75 fail |
| 3 | Squiggle | 7.93 fail | 8.25 pass |  |
| 4 | Wedge | 7.58 fail | 7.94 fail | 8.13 pass |
| 5 | Girih | 8.08 pass | 8.43 pass |  |
| 6 | Primitive | 7.95 fail | 8.23 pass |  |
| 7 | Euclid | 7.20 fail | 8.08 pass |  |
| all | Directions page | 6.50 fail | 7.25 fail | 7.85 fail |
| all | Round 2 deck | 7.15 fail | 7.93 fail |  |
