export type ArtData = { name: string; label: string; origin: string; viewBox: string; body: string; dark: boolean };

export const ART_DATA = [
 {
  "name": "ticket",
  "label": "Ticket stamp",
  "origin": "Greek ἑκατόν, Athens, 400 BC",
  "viewBox": "0 0 260 120",
  "body": "<rect x=\"4\" y=\"4\" width=\"252\" height=\"112\" fill=\"#F6EEDC\" stroke=\"#231F20\" stroke-width=\"3\"/><rect x=\"4\" y=\"4\" width=\"252\" height=\"112\" fill=\"none\" stroke=\"#F6EEDC\" stroke-width=\"10\" stroke-dasharray=\"0 14\" stroke-linecap=\"round\"/><text x=\"26\" y=\"62\" font-family=\"Noto Sans\" font-weight=\"800\" font-size=\"44\" fill=\"#231F20\">ἑκατόν</text><text x=\"26\" y=\"94\" font-family=\"Space Mono\" font-weight=\"700\" font-size=\"12\" letter-spacing=\"1.44\" fill=\"#7a6f63\">ATHENS · 400 BC</text>",
  "dark": false
 },
 {
  "name": "torn-label",
  "label": "Torn label",
  "origin": "Sanskrit शतम्",
  "viewBox": "0 0 220 110",
  "body": "<polygon points=\"0,9 13,0 31,7 53,1 79,8 110,0 139,7 169,1 194,8 220,2 216,101 194,110 163,103 132,110 101,102 70,110 40,103 13,110 2,99\" fill=\"#EBDDBE\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><text x=\"110\" y=\"55\" text-anchor=\"middle\" dominant-baseline=\"central\" font-family=\"Noto Sans Devanagari\" font-weight=\"800\" font-size=\"56\" fill=\"#5B1A4A\">शतम्</text>",
  "dark": false
 },
 {
  "name": "seal",
  "label": "Red seal",
  "origin": "Chinese 百",
  "viewBox": "0 0 150 150",
  "body": "<rect width=\"150\" height=\"150\" rx=\"10\" fill=\"#D9381E\"/><rect x=\"10\" y=\"10\" width=\"130\" height=\"130\" rx=\"4\" fill=\"none\" stroke=\"#F6EEDC\" stroke-width=\"4\"/><text x=\"75\" y=\"78\" text-anchor=\"middle\" dominant-baseline=\"central\" font-family=\"Noto Sans SC\" font-weight=\"800\" font-size=\"96\" fill=\"#F6EEDC\">百</text>",
  "dark": false
 },
 {
  "name": "kente",
  "label": "Kente strip",
  "origin": "Ghana, Asante weave",
  "viewBox": "0 0 300 90",
  "body": "<rect x=\"0\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"22\" width=\"8\" height=\"90\" fill=\"#1E7A5A\"/><rect x=\"30\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"52\" width=\"8\" height=\"90\" fill=\"#D9381E\"/><rect x=\"60\" width=\"6\" height=\"90\" fill=\"#231F20\"/><rect x=\"66\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"88\" width=\"8\" height=\"90\" fill=\"#1E7A5A\"/><rect x=\"96\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"118\" width=\"8\" height=\"90\" fill=\"#D9381E\"/><rect x=\"126\" width=\"6\" height=\"90\" fill=\"#231F20\"/><rect x=\"132\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"154\" width=\"8\" height=\"90\" fill=\"#1E7A5A\"/><rect x=\"162\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"184\" width=\"8\" height=\"90\" fill=\"#D9381E\"/><rect x=\"192\" width=\"6\" height=\"90\" fill=\"#231F20\"/><rect x=\"198\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"220\" width=\"8\" height=\"90\" fill=\"#1E7A5A\"/><rect x=\"228\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"250\" width=\"8\" height=\"90\" fill=\"#D9381E\"/><rect x=\"258\" width=\"6\" height=\"90\" fill=\"#231F20\"/><rect x=\"264\" width=\"22\" height=\"90\" fill=\"#E9A23B\"/><rect x=\"286\" width=\"8\" height=\"90\" fill=\"#1E7A5A\"/><rect x=\"294\" width=\"6\" height=\"90\" fill=\"#E9A23B\"/><rect y=\"26\" width=\"300\" height=\"6\" fill=\"#231F20\" fill-opacity=\".85\"/><rect y=\"58\" width=\"300\" height=\"6\" fill=\"#231F20\" fill-opacity=\".85\"/>",
  "dark": false
 },
 {
  "name": "pebble",
  "label": "Red pebble",
  "origin": "Paisley boteh, Persia and India",
  "viewBox": "0 0 110 150",
  "body": "<defs><clipPath id=\"pbc\"><path d=\"M66 0A44 105 0 0 1 110 105A66 45 0 0 1 44 150A44 45 0 0 1 0 105A66 105 0 0 1 66 0Z\"/></clipPath></defs><g clip-path=\"url(#pbc)\"><path d=\"M66 0A44 105 0 0 1 110 105A66 45 0 0 1 44 150A44 45 0 0 1 0 105A66 105 0 0 1 66 0Z\" fill=\"#D9381E\" stroke=\"#F6EEDC\" stroke-width=\"40\"/><path d=\"M66 0A44 105 0 0 1 110 105A66 45 0 0 1 44 150A44 45 0 0 1 0 105A66 105 0 0 1 66 0Z\" fill=\"none\" stroke=\"#D9381E\" stroke-width=\"32\"/><path d=\"M66 0A44 105 0 0 1 110 105A66 45 0 0 1 44 150A44 45 0 0 1 0 105A66 105 0 0 1 66 0Z\" fill=\"none\" stroke=\"#E9A23B\" stroke-width=\"20\"/></g>",
  "dark": false
 },
 {
  "name": "azulejo",
  "label": "Azulejo tile",
  "origin": "Portugal, glazed tile",
  "viewBox": "0 0 170 170",
  "body": "<defs><clipPath id=\"azc\"><rect width=\"170\" height=\"170\" rx=\"6\"/></clipPath></defs><g clip-path=\"url(#azc)\"><rect width=\"170\" height=\"170\" fill=\"#F4F1E8\"/><path d=\"M85 85L176.9 -6.9A130 130 0 0 1 191.5 10.4Z\" fill=\"#6FB7C2\"/><path d=\"M85 85L215.0 85.0A130 130 0 0 1 213.0 107.6Z\" fill=\"#6FB7C2\"/><path d=\"M85 85L176.9 176.9A130 130 0 0 1 159.6 191.5Z\" fill=\"#6FB7C2\"/><path d=\"M85 85L85.0 215.0A130 130 0 0 1 62.4 213.0Z\" fill=\"#6FB7C2\"/><path d=\"M85 85L-6.9 176.9A130 130 0 0 1 -21.5 159.6Z\" fill=\"#6FB7C2\"/><path d=\"M85 85L-45.0 85.0A130 130 0 0 1 -43.0 62.4Z\" fill=\"#6FB7C2\"/><path d=\"M85 85L-6.9 -6.9A130 130 0 0 1 10.4 -21.5Z\" fill=\"#6FB7C2\"/><path d=\"M85 85L85.0 -45.0A130 130 0 0 1 107.6 -43.0Z\" fill=\"#6FB7C2\"/><circle cx=\"0\" cy=\"0\" r=\"40\" fill=\"#26428B\"/><circle cx=\"170\" cy=\"0\" r=\"40\" fill=\"#26428B\"/><circle cx=\"0\" cy=\"170\" r=\"40\" fill=\"#26428B\"/><circle cx=\"170\" cy=\"170\" r=\"40\" fill=\"#26428B\"/><circle cx=\"85\" cy=\"85\" r=\"14\" fill=\"#26428B\"/></g><rect x=\"1.5\" y=\"1.5\" width=\"167\" height=\"167\" rx=\"6\" fill=\"none\" stroke=\"#231F20\" stroke-width=\"3\"/>",
  "dark": false
 },
 {
  "name": "azulejo-grid",
  "label": "Azulejo rings",
  "origin": "Portugal, tile run",
  "viewBox": "0 0 160 160",
  "body": "<defs><clipPath id=\"sgc\"><rect width=\"160\" height=\"160\" rx=\"10\"/></clipPath></defs><g clip-path=\"url(#sgc)\"><rect width=\"160\" height=\"160\" fill=\"#F6EEDC\"/><g transform=\"translate(0 40)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(52 40)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(104 40)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(156 40)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(26 80)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(78 80)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(130 80)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(0 120)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(52 120)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(104 120)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(156 120)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(26 160)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(78 160)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g><g transform=\"translate(130 160)\"><circle r=\"26\" fill=\"#26428B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle r=\"18\" fill=\"#F6EEDC\"/><circle r=\"11\" fill=\"#6FB7C2\"/><circle r=\"5\" fill=\"#F6EEDC\"/></g></g><rect width=\"160\" height=\"160\" rx=\"10\" fill=\"none\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/>",
  "dark": false
 },
 {
  "name": "girih",
  "label": "Girih lattice",
  "origin": "Persia, star and cross pattern",
  "viewBox": "0 0 180 180",
  "body": "<defs><pattern id=\"ggp\" width=\"90\" height=\"90\" patternUnits=\"userSpaceOnUse\"><g fill=\"none\" stroke=\"#6FB7C2\" stroke-width=\"2\"><rect x=\"27\" y=\"27\" width=\"36\" height=\"36\"/><rect x=\"27\" y=\"27\" width=\"36\" height=\"36\" transform=\"rotate(45 45 45)\"/><path d=\"M0 45h27M63 45h27M45 0v27M45 63v27\"/></g><path d=\"M45 33l3 9 9 3-9 3-3 9-3-9-9-3 9-3z\" fill=\"#E9A23B\"/></pattern></defs><rect width=\"180\" height=\"180\" fill=\"#5B1A4A\"/><rect width=\"180\" height=\"180\" fill=\"url(#ggp)\" opacity=\".2\"/>",
  "dark": false
 },
 {
  "name": "flag-band",
  "label": "Flag band",
  "origin": "Flags of the hero tiles",
  "viewBox": "0 0 600 18",
  "body": "<rect x=\"0.0\" width=\"33.0\" height=\"18\" fill=\"#002654\"/><rect x=\"33.0\" width=\"33.0\" height=\"18\" fill=\"#fff\"/><rect x=\"66.0\" width=\"33.6\" height=\"18\" fill=\"#CE1126\"/><rect x=\"99.6\" width=\"32.4\" height=\"18\" fill=\"#0038B8\"/><rect x=\"132.0\" width=\"34.2\" height=\"18\" fill=\"#fff\"/><rect x=\"166.2\" width=\"33.6\" height=\"18\" fill=\"#0D5EAF\"/><rect x=\"199.8\" width=\"33.0\" height=\"18\" fill=\"#fff\"/><rect x=\"232.8\" width=\"33.6\" height=\"18\" fill=\"#CE1126\"/><rect x=\"266.4\" width=\"33.6\" height=\"18\" fill=\"#fff\"/><rect x=\"300.0\" width=\"33.0\" height=\"18\" fill=\"#000\"/><rect x=\"333.0\" width=\"33.0\" height=\"18\" fill=\"#FF9933\"/><rect x=\"366.0\" width=\"33.6\" height=\"18\" fill=\"#fff\"/><rect x=\"399.6\" width=\"33.6\" height=\"18\" fill=\"#138808\"/><rect x=\"433.2\" width=\"66.6\" height=\"18\" fill=\"#EE1C25\"/><rect x=\"499.8\" width=\"33.0\" height=\"18\" fill=\"#FFDE00\"/><rect x=\"532.8\" width=\"67.2\" height=\"18\" fill=\"#EE1C25\"/>",
  "dark": false
 },
 {
  "name": "streak-flame",
  "label": "Streak flame",
  "origin": "The 100 day streak",
  "viewBox": "0 0 34 44",
  "body": "<path d=\"M17 1c3 8 14 13 14 26a14 14 0 0 1-28 0c0-7 4-11 6-14 1 4 3 6 5 7-1-7 0-13 3-19z\" fill=\"#E8602A\"/><path d=\"M17 23c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 1 2 2 3 3 3-1-3-1-6 0-8z\" fill=\"#F6EEDC\"/>",
  "dark": false
 },
 {
  "name": "streak-pot",
  "label": "Streak pot",
  "origin": "Flame in the Polingual pot",
  "viewBox": "0 -78 100 184",
  "body": "<g><circle cx=\"50\" cy=\"58\" r=\"26\" fill=\"#D9381E\"/><path d=\"M50 -74C64 -46 84 -30 80 4c-2 22-6 40-8 56a22 22 0 0 1-44 0c-2-16-6-34-8-56-4-28 14-34 12-54 10 10 14 22 16 34 4-18 4-38-8-58z\" fill=\"#D9381E\"/><g><ellipse cx=\"50\" cy=\"62\" rx=\"17\" ry=\"19\" fill=\"#E9A23B\"/><ellipse cx=\"50\" cy=\"68\" rx=\"8\" ry=\"11\" fill=\"#F6EEDC\"/><path d=\"M50 -40c9 18 22 30 19 52-2 16-4 30-5 44a14 14 0 0 1-28 0c-1-14-3-28-5-44-2-16 8-22 8-34 6 8 8 16 10 24 3-12 3-26 1-42z\" fill=\"#E9A23B\"/><path d=\"M50 -6c5 12 11 22 10 38-1 10-2 20-3 30a7 7 0 0 1-14 0c-1-10-2-20-3-30-1-14 5-20 6-28 2 6 3 10 4 16 1-8 1-16 0-26z\" fill=\"#F6EEDC\"/></g></g><path d=\"M16 15H30C35 15 38 19 38.5 27A32 32 0 1 0 61.5 27C62 19 65 15 70 15H84\" fill=\"none\" stroke=\"#3A0F2F\" stroke-width=\"13\" stroke-linecap=\"round\" stroke-linejoin=\"round\" transform=\"translate(0 6)\"/><path d=\"M16 15H30C35 15 38 19 38.5 27A32 32 0 1 0 61.5 27C62 19 65 15 70 15H84\" fill=\"none\" stroke=\"#5B1A4A\" stroke-width=\"13\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "dark": false
 },
 {
  "name": "star",
  "label": "Star piece",
  "origin": "Girih eight-point star",
  "viewBox": "0 0 150 140",
  "body": "<path d=\"M75 5 L95 35 L130 30 L118 62 L145 85 L112 95 L105 130 L75 110 L45 130 L38 95 L5 85 L32 62 L20 30 L55 35Z\" fill=\"#1E7A5A\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M75 5 L95 35 L130 30 L118 62 L145 85 L112 95 L105 130 L75 110 L45 130 L38 95 L5 85 L32 62 L20 30 L55 35Z\" transform=\"translate(75 68) scale(.55) translate(-75 -68)\" fill=\"#E9A23B\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"75\" cy=\"68\" r=\"10\" fill=\"#F6EEDC\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/>",
  "dark": false
 },
 {
  "name": "blocks",
  "label": "Puzzle blocks",
  "origin": "Color block puzzle",
  "viewBox": "0 0 170 150",
  "body": "<g stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"><rect x=\"0\" y=\"0\" width=\"70\" height=\"60\" fill=\"#D9381E\"/><rect x=\"70\" y=\"0\" width=\"100\" height=\"40\" fill=\"#E9A23B\"/><rect x=\"70\" y=\"40\" width=\"50\" height=\"60\" fill=\"#6FB7C2\"/><rect x=\"120\" y=\"40\" width=\"50\" height=\"110\" fill=\"#1E7A5A\"/><rect x=\"0\" y=\"60\" width=\"70\" height=\"90\" fill=\"#F6EEDC\"/><rect x=\"70\" y=\"100\" width=\"50\" height=\"50\" fill=\"#5B1A4A\" stroke=\"#F6EEDC\"/></g>",
  "dark": false
 },
 {
  "name": "brush",
  "label": "Brush stroke",
  "origin": "Ink brush stroke",
  "viewBox": "0 0 600 200",
  "body": "<path d=\"M10 120 C120 40 220 170 330 90 S520 40 590 110\" fill=\"none\" stroke=\"#E9A23B\" stroke-width=\"34\" stroke-linecap=\"round\" opacity=\".9\"/><path d=\"M40 140 C150 80 260 190 380 120\" fill=\"none\" stroke=\"#E9A23B\" stroke-width=\"6\" stroke-linecap=\"round\" opacity=\".6\"/>",
  "dark": false
 },
 {
  "name": "bunting",
  "label": "Pennant bunting",
  "origin": "Festival bunting",
  "viewBox": "0 0 300 110",
  "body": "<path d=\"M0 16 Q150 30 300 16\" fill=\"none\" stroke=\"#231F20\" stroke-width=\"3\"/><path d=\"M8 18 h60 v62 l-10-10 -10 10 -10-10 -10 10 -10-10 -10 10Z M38 34 l8 8 -8 8 -8-8Z M22 56 a5 5 0 1 0 .1 0Z M54 56 a5 5 0 1 0 .1 0Z\" fill=\"#E85A9B\" fill-rule=\"evenodd\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M80 18 h60 v62 l-10-10 -10 10 -10-10 -10 10 -10-10 -10 10Z M110 34 l8 8 -8 8 -8-8Z M94 56 a5 5 0 1 0 .1 0Z M126 56 a5 5 0 1 0 .1 0Z\" fill=\"#E9A23B\" fill-rule=\"evenodd\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M152 18 h60 v62 l-10-10 -10 10 -10-10 -10 10 -10-10 -10 10Z M182 34 l8 8 -8 8 -8-8Z M166 56 a5 5 0 1 0 .1 0Z M198 56 a5 5 0 1 0 .1 0Z\" fill=\"#6FB7C2\" fill-rule=\"evenodd\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M224 18 h60 v62 l-10-10 -10 10 -10-10 -10 10 -10-10 -10 10Z M254 34 l8 8 -8 8 -8-8Z M238 56 a5 5 0 1 0 .1 0Z M270 56 a5 5 0 1 0 .1 0Z\" fill=\"#1E7A5A\" fill-rule=\"evenodd\" stroke=\"#231F20\" stroke-width=\"3\" stroke-linejoin=\"round\"/>",
  "dark": false
 },
 {
  "name": "script-ru",
  "label": "Script сто",
  "origin": "Russian",
  "viewBox": "0 0 80 60",
  "body": "<text x=\"40\" y=\"30\" text-anchor=\"middle\" dominant-baseline=\"central\" font-family=\"Noto Sans\" font-weight=\"800\" font-size=\"40\" fill=\"#F6EEDC\" fill-opacity=\".75\">сто</text>",
  "dark": true
 },
 {
  "name": "script-ko",
  "label": "Script 백",
  "origin": "Korean",
  "viewBox": "0 0 80 60",
  "body": "<text x=\"40\" y=\"30\" text-anchor=\"middle\" dominant-baseline=\"central\" font-family=\"Noto Sans\" font-weight=\"800\" font-size=\"40\" fill=\"#F6EEDC\" fill-opacity=\".75\">백</text>",
  "dark": true
 },
 {
  "name": "script-he",
  "label": "Script מאה",
  "origin": "Hebrew",
  "viewBox": "0 0 80 60",
  "body": "<text x=\"40\" y=\"30\" text-anchor=\"middle\" dominant-baseline=\"central\" font-family=\"Noto Sans Hebrew\" font-weight=\"800\" font-size=\"40\" fill=\"#F6EEDC\" fill-opacity=\".75\">מאה</text>",
  "dark": true
 },
 {
  "name": "calligraphy-ain",
  "label": "Calligraphy ع",
  "origin": "Arabic",
  "viewBox": "0 0 200 200",
  "body": "<text x=\"100\" y=\"100\" text-anchor=\"middle\" dominant-baseline=\"central\" font-family=\"Noto Sans Arabic\" font-weight=\"800\" font-size=\"170\" fill=\"#F6EEDC\" fill-opacity=\".13\">ع</text>",
  "dark": true
 },
 {
  "name": "calligraphy-yong",
  "label": "Calligraphy 永",
  "origin": "Chinese",
  "viewBox": "0 0 200 200",
  "body": "<text x=\"100\" y=\"100\" text-anchor=\"middle\" dominant-baseline=\"central\" font-family=\"Noto Sans SC\" font-weight=\"800\" font-size=\"170\" fill=\"#6FB7C2\" fill-opacity=\".22\">永</text>",
  "dark": true
 },
 {
  "name": "ink-dot",
  "label": "Ink dot",
  "origin": "Parchment dot",
  "viewBox": "0 0 40 40",
  "body": "<circle cx=\"20\" cy=\"20\" r=\"20\" fill=\"#F6EEDC\"/>",
  "dark": true
 },
 {
  "name": "sk-kente",
  "label": "Kente swatch",
  "origin": "Ghana",
  "viewBox": "0 0 48 48",
  "body": "<defs><pattern id=\"sk-kente\" width=\"12\" height=\"12\" patternUnits=\"userSpaceOnUse\"><rect width=\"12\" height=\"12\" fill=\"#E9A23B\"/><rect width=\"3\" height=\"12\" fill=\"#1E7A5A\"/><rect x=\"6\" width=\"2\" height=\"12\" fill=\"#D9381E\"/><rect y=\"8\" width=\"12\" height=\"3\" fill=\"#231F20\"/></pattern></defs><rect width=\"48\" height=\"48\" fill=\"url(#sk-kente)\"/>",
  "dark": false
 },
 {
  "name": "sk-azulejo",
  "label": "Azulejo swatch",
  "origin": "Portugal",
  "viewBox": "0 0 48 48",
  "body": "<defs><pattern id=\"sk-azulejo\" width=\"10\" height=\"10\" patternUnits=\"userSpaceOnUse\"><rect width=\"10\" height=\"10\" fill=\"#F4F1E8\"/><circle cx=\"5\" cy=\"5\" r=\"2.4\" fill=\"#26428B\"/><circle r=\"2.6\" fill=\"#26428B\"/><circle cx=\"10\" r=\"2.6\" fill=\"#26428B\"/><circle cy=\"10\" r=\"2.6\" fill=\"#26428B\"/><circle cx=\"10\" cy=\"10\" r=\"2.6\" fill=\"#26428B\"/></pattern></defs><rect width=\"48\" height=\"48\" fill=\"url(#sk-azulejo)\"/>",
  "dark": false
 },
 {
  "name": "sk-girih",
  "label": "Girih swatch",
  "origin": "Persia",
  "viewBox": "0 0 48 48",
  "body": "<defs><pattern id=\"sk-girih\" width=\"12\" height=\"12\" patternUnits=\"userSpaceOnUse\"><rect width=\"12\" height=\"12\" fill=\"#1E5F6E\"/><path d=\"M6 1l1.4 3.6L11 6 7.4 7.4 6 11 4.6 7.4 1 6l3.6-1.4z\" fill=\"#E9A23B\"/></pattern></defs><rect width=\"48\" height=\"48\" fill=\"url(#sk-girih)\"/>",
  "dark": false
 },
 {
  "name": "sk-seal",
  "label": "Seal swatch",
  "origin": "China",
  "viewBox": "0 0 48 48",
  "body": "<defs><pattern id=\"sk-seal\" width=\"8\" height=\"8\" patternUnits=\"userSpaceOnUse\"><rect width=\"8\" height=\"8\" fill=\"#D9381E\"/><path d=\"M0 4h4V0M4 8V4h4\" fill=\"none\" stroke=\"#F6EEDC\" stroke-width=\"1\"/></pattern></defs><rect width=\"48\" height=\"48\" fill=\"url(#sk-seal)\"/>",
  "dark": false
 },
 {
  "name": "sk-paisley",
  "label": "Paisley swatch",
  "origin": "Persia and India",
  "viewBox": "0 0 48 48",
  "body": "<defs><pattern id=\"sk-paisley\" width=\"14\" height=\"14\" patternUnits=\"userSpaceOnUse\"><rect width=\"14\" height=\"14\" fill=\"#8E2312\"/><path d=\"M7 3c3 0 4 3 2 5-1 1-3 2-5 4 0-3-1-4-1-6 0-2 2-3 4-3z\" fill=\"#E9A23B\"/><circle cx=\"7\" cy=\"6\" r=\"1\" fill=\"#8E2312\"/></pattern></defs><rect width=\"48\" height=\"48\" fill=\"url(#sk-paisley)\"/>",
  "dark": false
 },
 {
  "name": "sk-mudcloth",
  "label": "Mudcloth swatch",
  "origin": "Mali, bogolanfini",
  "viewBox": "0 0 48 48",
  "body": "<defs><pattern id=\"sk-mudcloth\" width=\"10\" height=\"10\" patternUnits=\"userSpaceOnUse\"><rect width=\"10\" height=\"10\" fill=\"#3B2A1E\"/><path d=\"M1 2h8M1 8h8\" stroke=\"#EBDDBE\" stroke-width=\"1.2\" stroke-dasharray=\"2 1.5\"/><circle cx=\"5\" cy=\"5\" r=\"1\" fill=\"#EBDDBE\"/></pattern></defs><rect width=\"48\" height=\"48\" fill=\"url(#sk-mudcloth)\"/>",
  "dark": false
 }
] as const satisfies readonly ArtData[];
