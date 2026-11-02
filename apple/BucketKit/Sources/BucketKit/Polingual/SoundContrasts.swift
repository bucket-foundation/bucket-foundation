public struct SpokenOption: Sendable, Equatable, Hashable {
    public let key: String
    public let text: String
    public let say: String
    public let gloss: String
}

public struct SoundContrast: Sendable, Equatable {
    public let hint: String
    public let nativeVoice: Bool
    public let words: [SpokenOption]

    public var key: String { words.map(\.key).joined(separator: "/") }
}

public enum SoundContrasts {
    enum Stage { case ear, afterSpelling }

    static func parse(_ raw: String) -> [SoundContrast] {
        raw.split(separator: "\n").compactMap { line in
            let f = line.split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
            guard f.count == 3 else { return nil }
            let words = f[2].split(separator: ";").compactMap { w -> SpokenOption? in
                let p = w.split(separator: "=").map(String.init)
                return p.count == 3 ? SpokenOption(key: p[0], text: p[0], say: p[1], gloss: p[2]) : nil
            }
            return SoundContrast(hint: f[0], nativeVoice: f[1] == "native", words: words)
        }
    }

    static func unit(_ lang: String, _ title: String, _ index: Int, _ raw: String) -> AlphabetUnit {
        let contrasts = parse(raw)
        return AlphabetUnit(id: "contrast-\(lang)-\(index)", lang: lang, script: "contrast", title: title,
                            letters: contrasts.map { Letter(ch: $0.key, sound: $0.words.map(\.text).joined(separator: " or ")) })
    }

    static func units(_ lang: String, _ stage: Stage = .ear) -> [AlphabetUnit] {
        (stage == .ear ? ear[lang] : spelled[lang]).map { [unit(lang, $0.title, stage == .ear ? 0 : 1, $0.raw)] } ?? []
    }

    static let index: [String: [String: SoundContrast]] = {
        var out: [String: [String: SoundContrast]] = [:]
        for (lang, t) in Array(ear) + Array(spelled) {
            for c in parse(t.raw) { out[lang, default: [:]][c.key] = c }
        }
        return out
    }()

    public static func lookup(_ lang: String, _ key: String) -> SoundContrast? { index[lang]?[key] }

    public static var nativeRecordingsNeeded: [String: Int] {
        index.mapValues { $0.values.filter(\.nativeVoice).count }.filter { $0.value > 0 }
    }

    static let spelled: [String: (title: String, raw: String)] = [
        "zh": ("Spelling pairs", """
        Pinyin x has the tongue tip down and the lips spread. Pinyin sh curls the tongue tip up.||xī=西=west;shī=师=teacher
        Pinyin q has the tongue tip down and the lips spread. Pinyin ch curls the tongue tip up.||qī=七=seven;chī=吃=to eat
        Pinyin j has the tongue tip down and the lips spread. Pinyin zh curls the tongue tip up.||jī=鸡=chicken;zhī=知=to know
        Pinyin b has no puff of air. Pinyin p has a strong one. Hold a hand before your mouth to feel it.||bà=爸=dad;pà=怕=to fear
        Pinyin d has no puff of air. Pinyin t has a strong one.||dà=大=big;tà=踏=to step
        Pinyin g has no puff of air. Pinyin k has a strong one.||gǒu=狗=dog;kǒu=口=mouth
        """),
    ]

    static let ear: [String: (title: String, raw: String)] = [
        "zh": ("Tone pairs", """
        Second tone climbs from the middle to high. Third tone starts lower and dips first, so listen for the low start.||má=麻=hemp;mǎ=马=horse
        Second tone climbs from the middle to high. Third tone starts lower and dips first, so listen for the low start.||bái=白=white;bǎi=百=hundred
        Second tone climbs from the middle to high. Third tone starts lower and dips first, so listen for the low start.||yú=鱼=fish;yǔ=雨=rain
        Second tone climbs from the middle to high. Third tone starts lower and dips first, so listen for the low start.||dú=读=to read;dǔ=赌=to gamble
        Second tone climbs from the middle to high. Third tone starts lower and dips first, so listen for the low start.||táng=糖=sugar;tǎng=躺=to lie down
        Second tone climbs from the middle to high. Third tone starts lower and dips first, so listen for the low start.||yóu=油=oil;yǒu=有=to have
        First tone stays high and level. Fourth tone drops from high to low.||mā=妈=mom;mà=骂=to scold
        First tone stays high and level. Fourth tone drops from high to low.||shū=书=book;shù=树=tree
        First tone stays high and level. Fourth tone drops from high to low.||tāng=汤=soup;tàng=烫=scalding
        First tone stays high and level. Fourth tone drops from high to low.||jī=鸡=chicken;jì=记=to remember
        First tone stays high and level. Fourth tone drops from high to low.||fēi=飞=to fly;fèi=费=fee
        First tone stays high and level. Fourth tone drops from high to low.||gāo=高=tall;gào=告=to tell
        """),
        "ja": ("Beats", """
        Japanese runs on even beats, one for each kana. o-ba-sa-n has four beats, o-ba-a-sa-n has five.||obasan=おばさん=aunt;obaasan=おばあさん=grandmother
        Count the beats: o-ji-sa-n has four, o-ji-i-sa-n has five.||ojisan=おじさん=uncle;ojiisan=おじいさん=grandfather
        A held vowel takes one more beat: bi-ru has two, bi-i-ru has three.||biru=ビル=building;biiru=ビール=beer
        A held vowel takes one more beat: ka-do has two, ka-a-do has three.||kado=かど=corner;kaado=カード=card
        A silent beat counts: ki-te has two beats, ki-t-te has three, with a pause before the t.||kite=きて=come;kitte=きって=stamp
        A silent beat counts: sa-ka has two beats, sa-k-ka has three, with a pause before the k.||saka=さか=slope;sakka=さっか=writer
        Two long vowels add two beats: ko-ko has two, ko-o-ko-o has four.||koko=ここ=here;koukou=こうこう=high school
        The ending n is a full beat of its own: ka-na has two, ka-n-na has three.||kana=かな=kana;kanna=かんな=wood plane
        """),
        "ko": ("Sound pairs", """
        Three kinds of t: d starts soft with a light breath, t bursts with a strong puff, tt is tight with no air.|native|dal=달=moon;tal=탈=mask;ttal=딸=daughter
        Three kinds of p: b starts soft with a light breath, p bursts with a strong puff, pp is tight with no air.|native|bul=불=fire;pul=풀=grass;ppul=뿔=horn
        Three kinds of ch: j starts soft with a light breath, ch bursts with a strong puff, jj is tight with no air.|native|jada=자다=to sleep;chada=차다=to kick;jjada=짜다=salty
        Plain k has a light breath. Aspirated k has a strong puff of air.|native|gong=공=ball;kong=콩=bean
        Plain s is breathy. Tense ss is tight, with no breath.|native|sal=살=flesh;ssal=쌀=uncooked rice
        ㅓ has relaxed, open lips. ㅗ has rounded lips.||seom=섬=island;som=솜=cotton
        """),
        "th": ("Tones and breath", """
        Four tones on one syllable. Low stays low, falling drops from high, high climbs, rising dips then rises.|native|mài=ใหม่=new;mâi=ไม่=not;mái=ไม้=wood;mǎi=ไหม=silk
        A mid tone stays flat in the middle. A rising tone dips low, then climbs.|native|khaa=คา=to be stuck;khǎa=ขา=leg
        Vowel length changes the word: the first is short, the second is long.|native|khâo=เข้า=to enter;khâao=ข้าว=rice
        Thai k has no puff of air. Thai kh has a strong one.|native|kài=ไก่=chicken;khài=ไข่=egg
        Thai p has no puff of air. Thai ph has a strong one.|native|pàa=ป่า=forest;phàa=ผ่า=to split
        Thai t has no puff of air. Thai th has a strong one.|native|taa=ตา=eye;thaa=ทา=to paint
        """),
        "vi": ("Tones", """
        Level stays flat. Sắc rises sharply. Huyền falls low and breathy.|native|ma=ma=ghost;má=má=cheek;mà=mà=but
        Hỏi dips and returns. Ngã rises with a catch in the throat. Nặng drops short and stops. Southern speakers merge hỏi and ngã.|native|mả=mả=tomb;mã=mã=horse;mạ=mạ=rice seedling
        ư has spread lips, like a smile. u has rounded lips.||thư=thư=letter;thu=thu=autumn
        ơ is an unrounded uh. ô is a rounded o.||cơ=cơ=muscle;cô=cô=aunt
        """),
        "ar": ("Sound pairs", """
        The emphatic ص pulls the root of the tongue back and darkens the vowel after it.|native|sayf=سَيْف=sword;ṣayf=صَيْف=summer
        The emphatic ط pulls the root of the tongue back and darkens the vowel after it.|native|tīn=تِين=figs;ṭīn=طِين=clay
        The emphatic ض pulls the root of the tongue back and darkens the vowel after it.|native|darb=دَرْب=path;ḍarb=ضَرْب=hitting
        ك is a k at the soft palate. ق is made further back, against the uvula.|native|kalb=كَلْب=dog;qalb=قَلْب=heart
        ه is a light h. ح is a strong whispered h squeezed from the throat.|native|sahar=سَهَر=staying up late;saḥar=سَحَر=the time before dawn
        ح is smooth and squeezed from the throat. خ rasps at the soft palate.|native|ḥāl=حَال=condition;khāl=خَال=maternal uncle
        ع is a voiced squeeze in the throat. أ is a plain catch, as in uh-oh.|native|ʿalam=عَلَم=flag;ʾalam=أَلَم=pain
        """),
        "hi": ("Sound pairs", """
        Plain k has no puff of air. kh has a strong one.|native|kāl=काल=time;khāl=खाल=skin
        Plain p has no puff of air. ph has a strong one.|native|pal=पल=moment;phal=फल=fruit
        Dental d presses the tongue on the upper teeth. Retroflex ḍ curls the tongue tip back.|native|dāl=दाल=lentils;ḍāl=डाल=branch
        Dental tt presses the tongue on the upper teeth. Retroflex ṭṭ curls the tongue tip back.|native|pattā=पत्ता=leaf;paṭṭā=पट्टा=strap
        Plain d is voiced. dh adds a breathy h that rides on the voice.|native|dān=दान=donation;dhān=धान=paddy rice
        A short a is a relaxed uh. A long ā is an open ah held longer.||kam=कम=less;kām=काम=work
        A short u is as in put. A long ū is as in food.||sunā=सुना=heard;sūnā=सूना=empty
        """),
        "ta": ("Sound pairs", """
        Three kinds of l: ல has the tongue tip on the gum ridge, ள curls it back to touch, ழ curls it back without touching.|native|vali=வலி=pain;vaḷi=வளி=air;vaḻi=வழி=path
        ன has the tongue tip on the gum ridge. ண curls it back to the roof of the mouth.|native|paṉi=பனி=dew;paṇi=பணி=work
        ர is a light tap. ற is firmer, close to a trill.|native|kari=கரி=charcoal;kaṟi=கறி=curry
        """),
        "ru": ("Sound pairs", """
        A soft t lifts the middle of the tongue toward the palate, as if a faint y follows. The apostrophe marks it.|native|brat=брат=brother;brat'=брать=to take
        A soft t lifts the middle of the tongue toward the palate, as if a faint y follows.|native|mat=мат=checkmate;mat'=мать=mother
        A hard l is dark, like the ll in full. A soft l lifts the middle of the tongue.|native|ugol=угол=corner;ugol'=уголь=coal
        A soft s lifts the middle of the tongue toward the palate.|native|ves=вес=weight;ves'=весь=whole
        ы pulls the tongue back with the lips spread. и is a clear ee and softens the consonant before it.|native|byt'=быть=to be;bit'=бить=to hit
        ы pulls the tongue back with the lips spread. и is a clear ee and softens the consonant before it.|native|byl=был=he was;bil=бил=he hit
        """),
        "fr": ("Sound pairs", """
        French u is ee with rounded lips. French ou is the oo in food.||tu=tu=you;tout=tout=all
        French u is ee with rounded lips. French ou is the oo in food.||dessus=dessus=on top;dessous=dessous=underneath
        On is a nasal o with rounded lips. An is a nasal ah with open lips. Neither ends in an n.||bon=bon=good;banc=banc=bench
        In is a nasal a as in cat, with spread lips. En is a nasal ah with open lips.||vin=vin=wine;vent=vent=wind
        Le ends in a short relaxed uh. Les ends in the e of they, held steady.||le=le=the, singular;les=les=the, plural
        Eu is the e of bed with rounded lips. Ou is the oo in food.||peur=peur=fear;pour=pour=for
        """),
        "de": ("Sound pairs", """
        U is the oo in food. Ü is ee with rounded lips.||Mutter=Mutter=mother;Mütter=Mütter=mothers
        O is a rounded o. Ö is the e of they with rounded lips.||schon=schon=already;schön=schön=beautiful
        Stadt has a short a. Staat holds a long a.||Stadt=Stadt=city;Staat=Staat=state
        Fühlen holds a long ü. Füllen has a short ü.||fühlen=fühlen=to feel;füllen=füllen=to fill
        The ch of Kirche is the soft h in huge. The sch of Kirsche is the sh in shoe.||Kirche=Kirche=church;Kirsche=Kirsche=cherry
        """),
        "es": ("Sound pairs", """
        One r is a single quick tap. Rr is a trill of several taps.||pero=pero=but;perro=perro=dog
        One r is a single quick tap. Rr is a trill of several taps.||caro=caro=expensive;carro=carro=car
        One r is a single quick tap. Rr is a trill of several taps.||para=para=for;parra=parra=grapevine
        N is a plain n. Ñ is the ny in canyon, said as one sound.||pena=pena=sorrow;peña=peña=rock
        """),
        "it": ("Sound pairs", """
        A double consonant is held longer. Pause on it before the next vowel.||pala=pala=shovel;palla=palla=ball
        A double consonant is held longer. Pause on it before the next vowel.||nono=nono=ninth;nonno=nonno=grandfather
        A double consonant is held longer. Pause on it before the next vowel.||sete=sete=thirst;sette=sette=seven
        A double consonant is held longer. Pause on it before the next vowel.||capello=capello=hair;cappello=cappello=hat
        """),
        "pt": ("Sound pairs", """
        Ô is a closed o. Ó is an open o, as in or.||avô=avô=grandfather;avó=avó=grandmother
        Ão goes through the nose. Au stays in the mouth.||pão=pão=bread;pau=pau=stick
        A is open. Ã goes through the nose.||lá=lá=there;lã=lã=wool
        """),
        "pl": ("Sound pairs", """
        Sz is hard with the tongue tip raised. Si is soft with the tongue flat.||proszę=proszę=please;prosię=prosię=piglet
        Sz is hard with the tongue tip raised. Si is soft with the tongue flat.||kasza=kasza=groats;Kasia=Kasia=Kasia
        Cz is hard with the tongue tip raised and a dark y after it. Ci is soft with the tongue flat.||czy=czy=whether;ci=ci=to you
        L is a clear l. Ł is the w in water.||los=los=fate;łoś=łoś=moose
        """),
        "tr": ("Sound pairs", """
        I with a dot is ee. I without a dot pulls the tongue back with relaxed lips.||kir=kir=dirt;kır=kır=countryside
        U is oo with rounded lips. Ü is ee with rounded lips.||kul=kul=servant;kül=kül=ash
        O is a rounded o. Ö is the e of bed with rounded lips.||kor=kor=ember;kör=kör=blind
        """),
        "nl": ("Sound pairs", """
        Man has a short a. Maan holds a long, brighter aa.||man=man=man;maan=maan=moon
        Bom has a short, open o. Boom holds a long, closed oo.||bom=bom=bomb;boom=boom=tree
        A short i is as in sit. Ie is the ee in see.||vis=vis=fish;vies=vies=dirty
        """),
        "sv": ("Sound pairs", """
        Length moves between vowel and consonant: a long vowel before one consonant, a short vowel before a double one.||tak=tak=ceiling;tack=tack=thanks
        Length moves between vowel and consonant: a long vowel before one consonant, a short vowel before a double one.||glas=glas=glass;glass=glass=ice cream
        Skj is the hushing sound made far back. Tj is the soft sound at the front of the mouth.||skjuta=skjuta=to shoot;tjuta=tjuta=to howl
        """),
        "fi": ("Sound pairs", """
        Finnish length changes the word, for vowels and consonants alike. Each double letter is held twice as long.||tuli=tuli=fire;tuuli=tuuli=wind;tulli=tulli=customs
        A held consonant closes for a moment before it releases.||kuka=kuka=who;kukka=kukka=flower
        A doubled vowel is held twice as long.||muta=muta=mud;muuta=muuta=other
        """),
        "cs": ("Sound pairs", """
        An accent marks a long vowel. It never marks stress.||byt=byt=apartment;být=být=to be
        An accent marks a long vowel. It never marks stress.||dal=dal=he gave;dál=dál=farther
        R is a rolled r. Ř is a rolled r that buzzes like the s in measure.||rada=rada=advice;řada=řada=row
        """),
        "en": ("Sound pairs", """
        The short i of ship is relaxed. The long ee of sheep is tense.||ship=ship=a boat;sheep=sheep=a farm animal
        The a of bat opens the mouth wide. The e of bet is more closed.||bat=bat=a flying mammal;bet=bet=a wager
        Th puts the tongue tip between the teeth. T touches the ridge behind them.||thin=thin=not thick;tin=tin=a metal
        R never touches the roof of the mouth. L touches the ridge behind the top teeth.||right=right=correct;light=light=not heavy
        """),
    ]
}
