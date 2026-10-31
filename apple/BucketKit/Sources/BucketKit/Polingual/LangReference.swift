import Foundation

public struct SoundSection: Sendable, Equatable, Identifiable {
    public let title: String
    public let letters: [Letter]

    public init(title: String, letters: [Letter]) {
        self.title = title
        self.letters = letters
    }

    public var id: String { title }
}

public struct WritingSystem: Sendable, Equatable {
    public let title: String
    public let rightToLeft: Bool
    public let letterCount: Int
    public let facts: [String]
}

public struct WordFacts: Sendable, Equatable {
    public struct Relative: Sendable, Equatable, Identifiable {
        public let lang: String
        public let word: String
        public let reading: Reading?

        public var id: String { lang }
    }

    public struct PersonForm: Sendable, Equatable, Identifiable {
        public let person: String
        public let form: String

        public var id: String { person }
    }

    public let detail: WordDetail
    public let withArticle: String?
    public let root: String?
    public let note: String?
    public let example: String?
    public let sentences: [String]
    public let present: [PersonForm]
    public let past: [PersonForm]
    public let relatives: [Relative]
    public let falseFriend: FalseFriend?
}

public enum LangReference {
    static let maxSentences = 5
    static let signLetters = ["hard-sign": "hard sign", "soft-sign": "soft sign"]
    static let defaultPersons = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"]

    static let latinExtras: [String: String] = [
        "en": "a=a:as_in_cat e=e:as_in_bed i=i:as_in_sit o=o:as_in_hot u=u:as_in_cup th=th:as_in_thin sh=sh:as_in_shoe ch=ch:as_in_church ng=ng:as_in_sing",
        "id": "c=ch:as_in_church ng=ng:as_in_sing ny=ny:as_in_canyon sy=sh:as_in_shoe kh=kh:as_in_Bach",
        "la": "c=k:always_hard v=w:as_in_water ae=eye:as_in_eye oe=oy:as_in_boy ph=p:with_a_breath th=t:with_a_breath ch=k:with_a_breath ā=aa:long_a ē=ay:long_e ī=ee:long_i ō=oh:long_o ū=oo:long_u",
        "ang": "æ=a:as_in_cat þ=th:as_in_thin ð=th:as_in_this ƿ=w:as_in_water sc=sh:as_in_shoe cg=j:as_in_edge ċ=ch:as_in_church ġ=y:as_in_yes",
    ]

    static let scriptExtras: [String: [(title: String, table: String)]] = [
        "ja": [
            ("Voiced hiragana", "が=ga ぎ=gi ぐ=gu げ=ge ご=go ざ=za じ=ji ず=zu ぜ=ze ぞ=zo だ=da ぢ=ji づ=zu で=de ど=do ば=ba び=bi ぶ=bu べ=be ぼ=bo ぱ=pa ぴ=pi ぷ=pu ぺ=pe ぽ=po"),
            ("Voiced katakana", "ガ=ga ギ=gi グ=gu ゲ=ge ゴ=go ザ=za ジ=ji ズ=zu ゼ=ze ゾ=zo ダ=da ヂ=ji ヅ=zu デ=de ド=do バ=ba ビ=bi ブ=bu ベ=be ボ=bo パ=pa ピ=pi プ=pu ペ=pe ポ=po"),
            ("Combined sounds", "きゃ=kya きゅ=kyu きょ=kyo しゃ=sha しゅ=shu しょ=sho ちゃ=cha ちゅ=chu ちょ=cho にゃ=nya にゅ=nyu にょ=nyo ひゃ=hya ひゅ=hyu ひょ=hyo みゃ=mya みゅ=myu みょ=myo りゃ=rya りゅ=ryu りょ=ryo ぎゃ=gya ぎゅ=gyu ぎょ=gyo じゃ=ja じゅ=ju じょ=jo びゃ=bya びゅ=byu びょ=byo ぴゃ=pya ぴゅ=pyu ぴょ=pyo"),
        ],
        "ko": [
            ("Double consonants", "ㄲ=kk ㄸ=tt ㅃ=pp ㅆ=ss ㅉ=jj"),
            ("Compound vowels", "ㅐ=ae ㅒ=yae ㅔ=e ㅖ=ye ㅘ=wa ㅙ=wae ㅚ=oe ㅝ=wo ㅞ=we ㅟ=wi ㅢ=ui"),
        ],
        "zh": [("Tones", "妈=mā:first_tone,_high_and_level 麻=má:second_tone,_rising 马=mǎ:third_tone,_dipping 骂=mà:fourth_tone,_falling 吗=ma:neutral_tone,_light")],
        "ar": [("Vowel signs", "◌َ=-a:fatha ◌ِ=-i:kasra ◌ُ=-u:damma ◌ّ=double:shadda ◌ْ=no_vowel:sukun")],
        "he": [
            ("Final forms", "ך=kh ם=m ן=n ף=f ץ=ts"),
            ("Vowel signs", "◌ַ=-a:patah ◌ֶ=-e:segol ◌ִ=-i:hiriq ◌ֹ=-o:holam ◌ֻ=-u:qubuts"),
        ],
        "th": [("Tone marks", "◌่=tone:mai_ek ◌้=tone:mai_tho ◌๊=tone:mai_tri ◌๋=tone:mai_chattawa")],
        "el": [("Letter pairs", "ς=s:at_a_word_end αι=e ει=i οι=i ου=ou αυ=av/af ευ=ev/ef μπ=b ντ=d γκ=g")],
        "hi": [("Other signs", "◌ं=n:anusvara ◌ः=h:visarga ◌्=no_vowel:virama")],
        "sa": [("Other signs", "◌ं=ṁ:anusvara ◌ः=ḥ:visarga ◌्=no_vowel:virama")],
    ]

    static let bySection: [String: (first: String, second: String, inSecond: @Sendable (Letter) -> Bool)] = [
        "ja": ("Hiragana", "Katakana", { $0.ch.unicodeScalars.first.map { (0x30A0...0x30FF).contains($0.value) } ?? false }),
        "ko": ("Consonants", "Vowels", { $0.ch.unicodeScalars.first.map { $0.value > 0x314E } ?? false }),
        "zh": ("Initials", "Finals", { $0.ch.unicodeScalars.first.map { $0.value > 0x3119 } ?? false }),
    ]

    static let facts: [String: [String]] = [
        "ru": ["The soft sign and the hard sign add no sound of their own. They change the letter before them.", "Stress goes unwritten, so learn it with each word."],
        "el": ["Every word of two or more syllables marks its stress with an accent.", "Sigma takes the shape ς at the end of a word."],
        "grc": ["Inscriptions used capitals alone. Later manuscripts added breathing marks and accents."],
        "ar": ["Letters join inside a word and change shape by position.", "Short vowels usually go unwritten."],
        "fa": ["Persian uses the Arabic script with four added letters: پ چ ژ گ.", "Letters join inside a word and change shape by position."],
        "he": ["Five letters change shape at the end of a word.", "Everyday text leaves out the vowel signs. Children's books and prayer books print them."],
        "hi": ["Each consonant carries a built-in a sound, and a vowel sign replaces it.", "A bar along the top joins the letters of a word."],
        "sa": ["Each consonant carries a built-in a sound, and a vowel sign replaces it.", "A bar along the top joins the letters of a word."],
        "ta": ["Each consonant carries a built-in a sound, and a vowel sign replaces it.", "One letter can cover a voiced and an unvoiced sound, such as k and g."],
        "th": ["Vowel signs sit before, after, above or below the consonant.", "Words run together with no spaces.", "Five tones come from the consonant class, the tone mark and the syllable type."],
        "ja": ["Kanji carry word stems, hiragana carries grammar and katakana spells foreign words.", "Text runs across the page, or in columns from the right in books."],
        "zh": ["Each character is one syllable and usually one unit of meaning.", "Pinyin and Zhuyin spell the sounds for learners.", "Four tones and a neutral tone change the meaning of a syllable."],
        "ko": ["Letters stack into one block for each syllable.", "The basic consonant shapes draw the tongue and lips that make them."],
        "ang": ["Old English added þ, ð, æ and ƿ to the Latin alphabet.", "Manuscripts follow no fixed spelling."],
        "la": ["Modern editions add u and j, and mark long vowels for learners."],
        "vi": ["Tone marks sit on the vowel and change the meaning of a word."],
    ]

    public static func soundSections(_ lang: String) -> [SoundSection] {
        if let unit = LangScript.alphabetUnit(lang) { return scriptSections(unit) + extraSections(lang) }
        return latinSections(lang)
    }

    static func scriptSections(_ unit: AlphabetUnit) -> [SoundSection] {
        let letters = unit.letters.map(cleaned)
        let signs = letters.filter { isSign($0.ch) }
        let base = letters.filter { !isSign($0.ch) }
        var out: [SoundSection]
        if let split = bySection[unit.lang] {
            out = [SoundSection(title: split.first, letters: base.filter { !split.inSecond($0) }), SoundSection(title: split.second, letters: base.filter(split.inSecond))]
        } else {
            out = [SoundSection(title: "Letters", letters: base)]
        }
        if !signs.isEmpty { out.append(SoundSection(title: "Vowel signs", letters: signs)) }
        return out
    }

    static func cleaned(_ l: Letter) -> Letter {
        guard let name = signLetters[l.sound] else { return l }
        return Letter(ch: l.ch, sound: "silent", name: name)
    }

    static func extraSections(_ lang: String) -> [SoundSection] {
        (scriptExtras[lang] ?? []).map { SoundSection(title: $0.title, letters: ScriptCourse.parse($0.table)) }
    }

    static func latinSections(_ lang: String) -> [SoundSection] {
        let basic = ScriptCourse.parse(ScriptCourse.basicLatin)
        let plain = Set(basic.map(\.ch))
        let own = ScriptCourse.parse(ScriptCourse.latinLetters[lang] ?? "") + ScriptCourse.parse(latinExtras[lang] ?? "")
        let replaces = own.filter { plain.contains($0.ch) && $0.name?.hasPrefix("before") != true }
        let alphabet = basic.map { b in replaces.first { $0.ch == b.ch } ?? b }
        let special = own.filter { o in !replaces.contains(o) }
        return [SoundSection(title: "Alphabet", letters: alphabet)] + (special.isEmpty ? [] : [SoundSection(title: "Special letters and pairs", letters: special)])
    }

    static func isSign(_ ch: String) -> Bool { ch.unicodeScalars.contains("◌") }

    public static func speakable(_ letter: Letter) -> String? {
        isSign(letter.ch) ? nil : letter.ch
    }

    public static func writing(_ lang: String) -> WritingSystem {
        let script = LangScript.alphabetUnit(lang)?.letters.filter { !isSign($0.ch) }
        return WritingSystem(
            title: LangScript.scripts[lang]?.title ?? "Latin alphabet",
            rightToLeft: Lang.isRTL(lang),
            letterCount: script?.count ?? ScriptCourse.parse(ScriptCourse.basicLatin).count,
            facts: facts[lang] ?? [])
    }

    public static func characters(_ lang: String) -> AlphabetUnit? { ScriptCourse.characterUnit(lang) }

    public static func words(_ lang: String, corpus: LangCorpus?, top: [TopWord]) -> [WordDetail] {
        var seen = Set<String>()
        var out: [WordDetail] = []
        for item in corpus?.items ?? [] where isVocab(item) {
            guard let form = item.form(lang), seen.insert(WordLookup.fold(form, lang)).inserted else { continue }
            let ranked = top.first { WordLookup.fold($0.word, lang) == WordLookup.fold(form, lang) }
            out.append(WordDetail(word: form, lang: lang, gloss: item.gloss, reading: item.readings[lang], itemId: item.id, pos: ranked?.pos, band: ranked?.band))
        }
        for t in top where seen.insert(WordLookup.fold(t.word, lang)).inserted {
            out.append(WordDetail(word: t.word, lang: lang, gloss: t.meaning, reading: t.ipa.map(stripSlashes), pos: t.pos, band: t.band))
        }
        return out
    }

    static func stripSlashes(_ ipa: String) -> Reading {
        Reading(ipa: ipa.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    }

    public static func filter(_ words: [WordDetail], query: String) -> [WordDetail] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return words }
        return words.filter { w in
            [w.word, w.gloss, w.reading?.roman, w.reading?.kana].contains { $0?.localizedStandardContains(q) ?? false }
        }
    }

    public static func facts(_ detail: WordDetail, corpus: LangCorpus?, others: [String]) -> WordFacts {
        let lang = detail.lang
        let item = detail.itemId.flatMap { corpus?.byId[$0] }
        let persons = corpus?.persons[lang] ?? defaultPersons
        let sentences = (item?.sentences[lang] ?? []).compactMap { corpus?.pool[$0]?.text(lang) }.prefix(maxSentences)
        let relatives = others.filter { $0 != lang }.compactMap { l in
            item?.form(l).map { WordFacts.Relative(lang: l, word: $0, reading: item?.readings[l]) }
        }
        return WordFacts(
            detail: detail,
            withArticle: item.flatMap { corpus?.byId["g-\($0.id)"]?.form(lang) },
            root: item?.root, note: item?.note, example: item?.example[lang],
            sentences: Array(sentences),
            present: table(item?.conj[lang], persons), past: table(item?.conjPast[lang], persons),
            relatives: relatives, falseFriend: item?.falseFriends[lang])
    }

    static func table(_ forms: [String]?, _ persons: [String]) -> [WordFacts.PersonForm] {
        zip(persons, forms ?? []).filter { !$0.1.isEmpty }.map { WordFacts.PersonForm(person: $0.0, form: $0.1) }
    }
}
