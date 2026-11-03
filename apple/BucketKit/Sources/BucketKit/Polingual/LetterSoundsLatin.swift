extension LetterSounds {
    static let latin: [String: String] = [
        "es": """
        ñ|ɲ|like the ny in 'canyon', said as one sound|niño|child
        ll|ʝ|like the y in 'yes' for most speakers; in Argentina it is the s in 'measure'|calle|street
        j|x|a rough h from the back of the throat, like the ch in Scottish 'loch'|ojo|eye
        rr|r|a trilled r: the tongue tip flutters several times behind the top teeth|perro|dog
        ch|tʃ|like the ch in 'church'|leche|milk
        á|a|the a of 'father' said short; the accent marks the stressed syllable|mamá|mom
        é|e|like the e in 'they' said short with no glide; the accent marks the stress|café|coffee
        í|i|like the ee in 'see' said short; the accent marks the stress|día|day
        ó|o|like the o in 'go' said short with no glide toward w; the accent marks the stress|canción|song
        ú|u|like the oo in 'food' said short; the accent marks the stress|música|music
        ü|w|like the w in 'wet'; the dots tell you to say the u after g|pingüino|penguin
        h|∅|silent: skip it and start with the vowel|hola|hello
        qu|k|like the k in 'kit'; the u is silent before e and i|queso|cheese
        gu|ɡ|a hard g, as in 'go', before e and i; the u is silent|guerra|war
        z|s|like the s in 'sun' in Latin America; like the th in 'thin' in most of Spain|zapato|shoe
        ce|se|c before e and i is the s in 'sun' in Latin America, the th in 'thin' in most of Spain|cena|dinner
        v|b|the same sound as Spanish b: both lips touch, never the teeth|vaca|cow
        """,
        "fr": """
        é|e|like the e in 'they' held steady with no glide|café|coffee
        è|ɛ|like the e in 'bed'|mère|mother
        ê|ɛ|like the e in 'bed'|fête|party
        ç|s|like the s in 'sun'|garçon|boy
        à|a|between the a in 'cat' and the a in 'father', said short|là|there
        â|ɑ|like the a in 'father'; many speakers say it the same as plain a|gâteau|cake
        î|i|like the ee in 'see' said short with no glide; the hat does not change the sound|île|island
        ô|o|like the o in 'go' held steady with no glide toward w|côte|coast
        û|y|no English match: say ee while rounding your lips as for oo|sûr|sure
        œ|œ|no English match: say the e in 'bed' with rounded lips|cœur|heart
        ou|u|like the oo in 'food' said short|nous|we
        eau|o|like the o in 'go' held steady with no glide toward w|bateau|boat
        ch|ʃ|like the sh in 'shoe'|chat|cat
        gn|ɲ|like the ny in 'canyon', said as one sound|montagne|mountain
        on|ɔ̃|a nasal o: say the o in 'or' with air through the nose and no n at the end|bon|good
        an|ɑ̃|a nasal a: say the a in 'father' with air through the nose and no n at the end|grand|big
        ai|ɛ|like the e in 'bed'|lait|milk
        au|o|like the o in 'go' held steady with no glide toward w|jaune|yellow
        oi|wa|like the wa in 'wand'|moi|me
        eu|ø|no English match: say the e in 'they' with no glide while rounding your lips|deux|two
        in|ɛ̃|a nasal vowel: say the a in 'cat' with air through the nose and no n at the end|vin|wine
        qu|k|like the k in 'kit'; the u is silent|qui|who
        ill|ij|like the ee in 'see' running into the y in 'yes'|fille|girl
        r|ʁ|a soft gargle at the back of the throat, with the tongue tip down|rouge|red
        u|y|no English match: say ee while rounding your lips as for oo|tu|you
        """,
        "it": """
        gli|ʎ|like the lli in 'million' said as one sound, tongue flat on the roof of the mouth; the i is silent|figlio|son
        gn|ɲ|like the ny in 'canyon', said as one sound and held|bagno|bathroom
        ch|k|like the k in 'kit'; Italian writes ch for this sound before e and i|chiave|key
        ci|tʃi|like the chee in 'cheese'|cibo|food
        gi|dʒi|like the jee in 'jeep'|giro|turn
        sc|ʃ|like the sh in 'shoe', held longer, when sc comes before e or i|pesce|fish
        z|ts|like the ts in 'cats'; in some words it is the ds in 'kids'|zio|uncle
        à|a|the a of 'father' with the stress on it|città|city
        è|ɛ|an open e like the e in 'bed', stressed|caffè|coffee
        é|e|a closed e like the e in 'they' with no glide, stressed|perché|why
        ò|ɔ|an open o like the o in 'or', stressed|però|but
        ù|u|like the oo in 'food' said short, stressed|più|more
        gh|ɡ|a hard g, as in 'go', before e and i; the h is silent|spaghetti|spaghetti
        qu|kw|like the qu in 'quick'|quattro|four
        ce|tʃe|like the che in 'chest'|cena|dinner
        ge|dʒe|like the je in 'jet'|gelato|ice cream
        r|r|a tapped or trilled r with the tongue tip|rosso|red
        """,
        "pt": """
        ã|ɐ̃|a nasal a: say the u in 'cup' with air through the nose|maçã|apple
        õ|õj̃|a nasal o: say the o in 'go' with air through the nose, ending in a nasal y|põe|puts
        ç|s|like the s in 'sun'|coração|heart
        nh|ɲ|like the ny in 'canyon', said as one sound|vinho|wine
        lh|ʎ|like the lli in 'million' said as one sound|filho|son
        á|a|an open a like the a in 'father', stressed|água|water
        â|ɐ̃|a closed a like the u in 'cup', said through the nose because m or n follows|lâmpada|lamp
        é|ɛ|an open e like the e in 'bed', stressed|café|coffee
        ê|e|a closed e like the e in 'they' with no glide, stressed|você|you
        ó|ɔ|an open o like the o in 'or', stressed|avó|grandmother
        ô|o|a closed o like the o in 'go' with no glide toward w, stressed|avô|grandfather
        ão|ɐ̃w̃|a nasal ow: say the ow in 'cow' through the nose, starting from the u in 'cup'|pão|bread
        ch|ʃ|like the sh in 'shoe'|chave|key
        x|ʃ|usually like the sh in 'shoe'; in some words it is s, z or ks|caixa|box
        rr|ʁ|a rasp at the back of the throat, close to the French r|carro|car
        ou|o|like the o in 'go' held steady with no glide toward w|ouro|gold
        em|ɐ̃j̃|at the end of a word in Portugal: a nasal vowel from the u in 'cup', gliding to a nasal y|bem|well
        s|ʃ|in Portugal, before a consonant and at the end of a word, like the sh in 'shoe'|mas|but
        """,
        "de": """
        ä|ɛ|like the e in 'bed'|Hände|hands
        ö|øː|no English match: say the e in 'they' with no glide while rounding your lips|schön|beautiful
        ü|yː|no English match: say ee while rounding your lips as for oo|grün|green
        ß|s|like the s in 'sun', never a z sound|Straße|street
        ch|x|after a, o and u: a rough h at the back of the throat like Scottish 'loch'; after e and i it is softer, like the h in 'huge'|Buch|book
        sch|ʃ|like the sh in 'shoe'|Tisch|table
        ei|aɪ|like the word 'eye'|nein|no
        ie|iː|like the ee in 'see', held long|Liebe|love
        eu|ɔʏ|like the oy in 'boy'|neu|new
        w|v|like the v in 'van'|zwei|two
        z|ts|like the ts in 'cats', also at the start of a word|zehn|ten
        v|f|like the f in 'fox' in most German words|vier|four
        st|ʃt|at the start of a word or word part, said sht|Stadt|city
        sp|ʃp|at the start of a word or word part, said shp|sprechen|to speak
        äu|ɔʏ|like the oy in 'boy'; the same sound as German eu|Häuser|houses
        qu|kv|a k followed by the v in 'van'|Quelle|source
        j|j|like the y in 'yes'|ja|yes
        r|ʁ|a soft gargle at the back of the throat; at the end of a syllable it fades toward the a in 'sofa'|rot|red
        """,
        "nl": """
        ij|ɛi|between the ay in 'day' and 'eye': start from the e in 'bed' and glide to ee|tijd|time
        ui|œy|no English match: say the e in 'bed' with rounded lips, then glide toward a rounded ee|huis|house
        oe|u|like the oo in 'food'|boek|book
        g|ɣ|a rasping h at the back of the throat, like the ch in Scottish 'loch'|goed|good
        eu|øː|no English match: say the e in 'they' with no glide while rounding your lips|neus|nose
        ou|ʌu|start from the u in 'cup' and glide to oo|koud|cold
        sch|sx|an s followed by the rasping throat sound of Dutch g|schip|ship
        w|ʋ|between v and w: the lower lip lightly touches the top teeth with no friction|wat|what
        j|j|like the y in 'yes'|ja|yes
        ie|i|like the ee in 'see' said short|niet|not
        ee|eː|like the ay in 'day', held steady|twee|two
        oo|oː|like the o in 'go', held steady|boom|tree
        ei|ɛi|the same sound as Dutch ij: start from the e in 'bed' and glide to ee|klein|small
        au|ʌu|the same sound as Dutch ou: start from the u in 'cup' and glide to oo|blauw|blue
        ng|ŋ|like the ng in 'sing', with no hard g after it|zingen|to sing
        """,
        "sv": """
        å|oː|like the o in 'more' without the r: rounded lips, held long, no glide|båt|boat
        ä|ɛ|like the e in 'bed'|äpple|apple
        ö|øː|no English match: say the e in 'they' with no glide while rounding your lips|öl|beer
        sj|ɧ|no English match: a hushing sh made with rounded lips and air from the back of the mouth|sju|seven
        tj|ɕ|a soft sh with the tongue flat and lips spread, close to the h in 'huge'|tjugo|twenty
        j|j|like the y in 'yes'|ja|yes
        k|ɕ|before e, i, y, ä and ö in most native words, k is the soft tj sound: close to the h in 'huge'|kött|meat
        y|y|no English match: say ee with tightly rounded lips|ny|new
        sk|ɧ|before e, i, y, ä and ö in most native words, the hushing sound of Swedish sj|skön|lovely
        g|j|before e, i, y, ä and ö in most native words, like the y in 'yes'|göra|to do
        o|uː|often a tight oo with the lips pushed forward, close to the oo in 'food'|sol|sun
        hj|j|like the y in 'yes'; the h is silent|hjärta|heart
        lj|j|at the start of a word, like the y in 'yes'; the l is silent|ljus|light
        """,
        "fi": """
        ä|æ|like the a in 'cat'|äiti|mother
        ö|ø|no English match: say the e in 'they' with rounded lips and no glide|pöytä|table
        y|y|no English match: say ee while rounding your lips as for oo|yksi|one
        aa|ɑː|the a of 'father' held twice as long|maa|land
        ii|iː|the ee of 'see' held twice as long with no glide|kiitos|thanks
        kk|kː|a held k: close for the k, pause a moment, then release, as in 'bookcase'|kukka|flower
        j|j|like the y in 'yes'|juna|train
        ää|æː|the a of 'cat' held twice as long|pää|head
        uu|uː|the oo of 'food' held twice as long|kuu|moon
        ie|ie̯|two vowels said as one glide: ee running into the e in 'bed'|tie|road
        tt|tː|a held t: close for the t, pause a moment, then release|katto|roof
        r|r|a trilled r: the tongue tip flutters behind the top teeth|ruoka|food
        nk|ŋk|the nk of 'bank', never a separate n and k|kenkä|shoe
        """,
        "pl": """
        ą|ɔ̃|a nasal o: say the o in 'or' with air through the nose, ending toward w|wąż|snake
        ę|ɛ̃|a nasal e: say the e in 'bed' with air through the nose, ending toward w|gęś|goose
        ć|tɕ|a soft ch: the tongue lies flat behind the lower teeth, like 'ch' in 'cheese' said with a smile|być|to be
        ł|w|like the w in 'water'|mały|small
        ń|ɲ|like the ny in 'canyon', said as one sound|koń|horse
        ó|u|like the oo in 'food' said short; ó and u sound the same|góra|mountain
        ś|ɕ|a soft sh: the tongue lies flat and the lips spread, like 'sh' in 'sheep' said with a smile|śnieg|snow
        ź|ʑ|the voiced partner of ś: like the s in 'measure' with the tongue flat and lips spread|źle|badly
        ż|ʐ|like the s in 'measure' with the tongue tip raised|żaba|frog
        cz|tʂ|like the ch in 'church' with the tongue tip raised|czas|time
        sz|ʂ|like the sh in 'shoe' with the tongue tip raised|szkoła|school
        rz|ʐ|the same sound as ż: like the s in 'measure' with the tongue tip raised|rzeka|river
        w|v|like the v in 'van'|woda|water
        ch|x|a rough h at the back of the throat, like the ch in Scottish 'loch'|chleb|bread
        dz|dz|like the ds in 'kids', said as one sound|dzwon|bell
        dż|dʐ|like the j in 'jam' with the tongue tip raised|dżem|jam
        dź|dʑ|the voiced partner of ć: a soft j with the tongue flat|dźwięk|sound
        ci|tɕ|before a vowel, the soft ć sound; the i only softens the consonant|ciepło|warm
        si|ɕ|before a vowel, the soft ś sound; the i only softens the consonant|siedem|seven
        zi|ʑ|before a vowel, the soft ź sound; before a consonant it adds ee, as in zima|zima|winter
        ni|ɲ|before a vowel, the soft ń sound; the i only softens the consonant|nie|no
        c|ts|like the ts in 'cats', even at the start of a word|noc|night
        j|j|like the y in 'yes'|ja|I
        y|ɨ|a vowel, close to the i in 'sit' with the tongue pulled back|my|we
        """,
        "tr": """
        ç|tʃ|like the ch in 'church'|çay|tea
        ş|ʃ|like the sh in 'shoe'|şeker|sugar
        ğ|ː|not said by itself: it lengthens the vowel before it, so dağ sounds like 'daa'; between e and i it can sound like a light y|dağ|mountain
        ı|ɯ|no English match: say ee with relaxed, unrounded lips while pulling the tongue back|kız|girl
        ö|œ|no English match: say the e in 'bed' with rounded lips|göz|eye
        ü|y|no English match: say ee while rounding your lips as for oo|süt|milk
        c|dʒ|like the j in 'jam'|cep|pocket
        j|ʒ|like the s in 'measure'; found in borrowed words|plaj|beach
        """,
        "cs": """
        č|tʃ|like the ch in 'church'|čaj|tea
        š|ʃ|like the sh in 'shoe'|škola|school
        ž|ʒ|like the s in 'measure'|žena|woman
        ř|r̝|no English match: a trilled r with the tongue tip raised and tense, buzzing like the s in 'measure' at the same time|řeka|river
        ě|jɛ|after b, p, v and f it is the ye in 'yes'; after d, t and n it softens that consonant instead; after m it is said mnye|věc|thing
        ů|uː|like the oo in 'food', held long|dům|house
        ch|x|a rough h at the back of the throat, like the ch in Scottish 'loch'|ucho|ear
        ň|ɲ|like the ny in 'canyon', said as one sound|kůň|horse
        ť|c|a soft t: press the flat of the tongue on the palate, close to the t in 'tune' in British speech|labuť|swan
        ď|ɟ|a soft d: press the flat of the tongue on the palate, close to the d in 'dune' in British speech|ďábel|devil
        c|ts|like the ts in 'cats', even at the start of a word|cena|price
        j|j|like the y in 'yes'|ja|I
        á|aː|the a of 'father' held long|máma|mom
        ou|ou̯|like the o in 'go' with a clear glide toward w|mouka|flour
        """,
        "vi": """
        đ|ɗ|like the d in 'day', with the tongue tip on the ridge behind the top teeth|đi|go
        ă|ă|the a of 'father' cut short|ăn|eat
        â|ɤ̆|like the u in 'cup', cut short|sân|yard
        ê|e|like the e in 'they' held steady with no glide|tên|name
        ô|o|like the o in 'go' held steady with no glide toward w|cô|aunt
        ơ|ɤ|like the u in 'fur' with no r and lips unrounded|cơm|rice
        ư|ɯ|no English match: say oo as in 'food' with lips spread as in a smile|thư|letter
        nh|ɲ|like the ny in 'canyon', said as one sound|nhà|house
        ng|ŋ|like the ng in 'sing', and Vietnamese also starts words with it|ngon|tasty
        ngh|ŋ|the same sound as ng; Vietnamese writes ngh before e, ê and i|nghe|to listen
        gi|z|like the z in 'zoo' in the north; like the y in 'yes' in the south|gió|wind
        d|z|like the z in 'zoo' in the north; like the y in 'yes' in the south|da|skin
        x|s|like the s in 'sun'|xe|vehicle
        ph|f|like the f in 'fan'|phở|noodle soup
        th|tʰ|a t with a strong puff of air; the English th sound is wrong here|thư|letter
        tr|ʈ|the same as Vietnamese ch in the north; in the south the tongue curls back|trà|tea
        ch|c|a ch with no puff of air and the flat of the tongue on the palate|chó|dog
        kh|x|a rough h at the back of the throat, like the ch in Scottish 'loch'|không|no
        r|z|like the z in 'zoo' in the north; a tapped or curled r in the south|ra|to go out
        qu|kw|like the qu in 'quick'|quà|gift
        """,
        "en": """
        a|ɑː|the a of 'father'; in many other words English a is the a of 'cat'|father|father
        b|b|both lips close, then open with voice|ball|ball
        c|k|like k before a, o and u; before e, i and y it sounds like s|cat|cat
        d|d|the tongue tip touches the ridge behind the top teeth, then releases, with voice|dog|dog
        e|ɛ|the short e of 'bed'|bed|bed
        f|f|top teeth rest on the lower lip and air hisses out|fish|fish
        g|ɡ|the back of the tongue closes against the soft palate, with voice|go|go
        h|h|a breath of air with the mouth open|hat|hat
        i|ɪ|the short i of 'sit'; in some words it is the ee of 'see', as in 'machine'|sit|sit
        j|dʒ|like the j in 'jam'|jump|jump
        k|k|the back of the tongue closes against the soft palate, with no voice|kite|kite
        l|l|the tongue tip touches the ridge behind the top teeth and voice flows around its sides|leg|leg
        m|m|lips closed, humming through the nose|man|man
        n|n|tongue tip on the ridge behind the top teeth, humming through the nose|nose|nose
        o|ɔː|the o of 'or'|fork|fork
        p|p|both lips close, then open with a puff of air|pen|pen
        q|k|q is k; the u after it gives the w|queen|queen
        r|ɹ|the tongue tip curls up and back without touching the roof of the mouth|red|red
        s|s|a hiss with the tongue tip near the ridge behind the top teeth|sun|sun
        t|t|the tongue tip touches the ridge behind the top teeth, then releases with a puff of air|ten|ten
        u|uː|the oo of 'food'|rule|rule
        v|v|top teeth rest on the lower lip, with voice|van|van
        w|w|rounded lips glide open, as at the start of 'water'|wet|wet
        x|ks|a k followed by an s|box|box
        y|j|the y of 'yes', a quick glide from ee|yes|yes
        z|z|a buzzing s, with voice|zoo|zoo
        """,
        "id": """
        a|a|like the a in 'father', said short|apa|what
        b|b|like the b in 'boy'|baju|shirt
        c|tʃ|always like the ch in 'church', never k or s|cinta|love
        d|d|like the d in 'dog', tongue tip just behind the top teeth|dua|two
        e|e|like the e in 'they' with no glide; in many words e is the weak uh of 'sofa', as in 'besar'|meja|table
        f|f|like the f in 'fan'|fajar|dawn
        g|ɡ|like the g in 'go'|gigi|tooth
        h|h|like the h in 'hat'|hari|day
        i|i|like the ee in 'see', said short|ikan|fish
        j|dʒ|like the j in 'jam'|jalan|road
        k|k|like the k in 'skip' with no puff of air; at the end of a word it is a catch in the throat|kaki|foot
        l|l|like the l in 'leaf'|lima|five
        m|m|like the m in 'man'|mata|eye
        n|n|like the n in 'no'|nasi|rice
        o|o|like the o in 'go' with no glide and no r|orang|person
        p|p|like the p in 'spin' with no puff of air|pagi|morning
        q|k|appears only in Arabic words and is said like k|taqwa|piety
        r|r|a trilled r: the tongue tip flutters behind the top teeth|rumah|house
        s|s|like the s in 'sun'|satu|one
        t|t|like the t in 'stop' with no puff of air, tongue tip on the top teeth|tiga|three
        u|u|like the oo in 'food', said short|ular|snake
        v|f|appears in borrowed words and is usually said like the f in 'fan'|televisi|television
        w|w|like the w in 'wet'|warna|color
        x|s|rare and found only in borrowed words; at the start of a word it sounds like the s in 'sun'|xilofon|xylophone
        y|j|like the y in 'yes'|saya|I
        z|z|like the z in 'zoo'|zaman|era
        ng|ŋ|like the ng in 'sing', with no hard g after it|dengan|with
        ny|ɲ|like the ny in 'canyon', said as one sound|nyanyi|to sing
        sy|ʃ|like the sh in 'shoe'|syarat|condition
        kh|x|a rough h at the back of the throat, like the ch in Scottish 'loch'; found in Arabic loanwords|khusus|special
        """,
    ]
}
