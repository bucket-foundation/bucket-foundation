import Foundation
import Testing
@testable import BucketKit

struct LangReferenceTests {
    static func corpus() -> LangCorpus {
        let word = LangItem(
            id: "drink", kind: .word, baseId: "drink", tier: 1, unit: 0, category: "verb", gloss: "to drink",
            forms: ["es": "beber", "fr": "boire"], readings: ["es": Reading(ipa: "beˈβeɾ")], root: "*bib-", cognateLangs: ["es", "fr"],
            note: "A common verb", example: ["es": "Quiero beber agua"], sentences: ["es": ["s1", "gone"]],
            gender: OrderedMap(), conj: ["es": ["bebo", "bebes", "bebe"]], conjPast: ["es": ["bebí"]], falseFriends: [:])
        var article = word
        article.id = "g-drink"
        article.kind = .gender
        article.forms = ["es": "el beber"]
        let pool = ["s1": PoolSentence(t: ["es": "Bebo agua"], r: [:], jaTokens: nil, lv: nil)]
        return LangCorpus(items: [word, article], byId: ["drink": word, "g-drink": article], attribution: "", sources: [], pool: pool, poolKeys: ["s1"], persons: ["es": ["yo", "tú", "él", "nosotros", "vosotros", "ellos"]], falseFriends: [], units: [])
    }

    @Test func everyCourseLanguageHasASoundTable() {
        for lang in Lang.codes {
            let sections = LangReference.soundSections(lang)
            #expect(!sections.isEmpty, "\(lang)")
            #expect(sections.allSatisfy { !$0.letters.isEmpty }, "\(lang)")
            #expect(Set(sections.map(\.id)).count == sections.count, "\(lang)")
        }
    }

    @Test func latinTableKeepsTheFullAlphabet() {
        let alphabet = LangReference.soundSections("es")[0]
        #expect(alphabet.letters.count == 26)
        #expect(alphabet.letters.first { $0.ch == "j" }?.sound == "h")
    }

    @Test func conditionalLatinSoundStaysBesideThePlainLetter() {
        let sections = LangReference.soundSections("sv")
        #expect(sections[0].letters.first { $0.ch == "k" }?.sound == "k")
        #expect(sections[1].letters.contains { $0.ch == "k" && $0.sound == "sh" })
    }

    @Test func englishUsesEnglishVowels() {
        #expect(LangReference.soundSections("en")[0].letters.first { $0.ch == "i" }?.name == "as in sit")
    }

    @Test func japaneseSplitsBothKana() {
        let titles = LangReference.soundSections("ja").map(\.title)
        #expect(Array(titles.prefix(2)) == ["Hiragana", "Katakana"])
        #expect(LangReference.soundSections("ja")[0].letters.count == 46)
        #expect(LangReference.soundSections("ja")[1].letters.count == 46)
    }

    @Test func koreanSplitsConsonantsAndVowels() {
        let s = LangReference.soundSections("ko")
        #expect(s[0].letters.count == 14)
        #expect(s[1].letters.count == 10)
    }

    @Test func russianSignsReadAsSilent() {
        let hard = LangReference.soundSections("ru")[0].letters.first { $0.ch == "ъ" }
        #expect(hard?.sound == "silent")
        #expect(hard?.name == "hard sign")
    }

    @Test func vowelSignsAreNotSpoken() {
        let signs = LangReference.soundSections("hi").first { $0.title == "Vowel signs" }
        #expect(signs?.letters.allSatisfy { LangReference.speakable($0) == nil } == true)
        #expect(LangReference.speakable(Letter(ch: "क", sound: "ka")) == "क")
    }

    @Test func writingCountsBaseLetters() {
        let w = LangReference.writing("hi")
        #expect(w.title == "Devanagari")
        #expect(w.letterCount == LangReference.soundSections("hi")[0].letters.count)
        #expect(LangReference.writing("ar").rightToLeft)
        #expect(!LangReference.writing("fr").rightToLeft)
        #expect(LangReference.writing("fr").title == "Latin alphabet")
        #expect(LangReference.writing("fr").letterCount == 26)
    }

    @Test func wordListJoinsCourseAndTopWordsOnce() {
        let top = [TopWord(rank: 1, word: "Beber", meaning: "drink", pos: "verb", band: "A1"), TopWord(rank: 2, word: "casa", meaning: "house", ipa: "/ˈkasa/", band: "A1")]
        let words = LangReference.words("es", corpus: Self.corpus(), top: top)
        #expect(words.map(\.word) == ["beber", "casa"])
        #expect(words[0].itemId == "drink")
        #expect(words[0].pos == "verb")
        #expect(words[1].reading?.ipa == "ˈkasa")
    }

    @Test func searchMatchesWordAndMeaning() {
        let words = LangReference.words("es", corpus: Self.corpus(), top: [])
        #expect(LangReference.filter(words, query: "BEB").count == 1)
        #expect(LangReference.filter(words, query: "to dr").count == 1)
        #expect(LangReference.filter(words, query: "zzz").isEmpty)
        #expect(LangReference.filter(words, query: "  ").count == 1)
    }

    @Test func factsGatherGrammarAndRelatives() {
        let c = Self.corpus()
        let d = WordLookup.detail("beber", lang: "es", corpus: c, top: [])
        let f = LangReference.facts(d, corpus: c, others: ["es", "fr", "de"])
        #expect(f.withArticle == "el beber")
        #expect(f.root == "*bib-")
        #expect(f.example == "Quiero beber agua")
        #expect(f.sentences == ["Bebo agua"])
        #expect(f.present.map(\.person) == ["yo", "tú", "él"])
        #expect(f.past.map(\.form) == ["bebí"])
        #expect(f.relatives.map(\.lang) == ["fr"])
    }

    @Test func factsForAnUnknownWordStayEmpty() {
        let d = WordLookup.detail("zzz", lang: "es", corpus: Self.corpus(), top: [])
        let f = LangReference.facts(d, corpus: Self.corpus(), others: ["fr"])
        #expect(f.present.isEmpty)
        #expect(f.relatives.isEmpty)
        #expect(f.withArticle == nil)
    }

    static func webCorpus() -> LangCorpus {
        func word(_ id: String, _ gloss: String, _ forms: [String: String], root: String?, cognates: [String] = [], readings: [String: Reading] = [:]) -> LangItem {
            LangItem(id: id, kind: .word, baseId: id, tier: 1, unit: 0, category: "noun", gloss: gloss, forms: forms, readings: readings, root: root, cognateLangs: cognates,
                     note: nil, example: [:], sentences: [:], gender: OrderedMap(), conj: [:], conjPast: [:], falseFriends: [:])
        }
        let night = word("night", "night", ["en": "night", "de": "Nacht", "es": "noche", "fr": "nuit", "ja": "夜", "ru": "ночь", "nl": "nacht"],
                         root: "*nókʷts", cognates: ["en", "de", "nl"], readings: ["ja": Reading(roman: "yoru"), "ru": Reading(roman: "noch")])
        let nocturnal = word("nocturnal", "of the night", ["en": "nocturnal", "es": "nocturno"], root: "*nókʷts")
        let twin = word("night-2", "night", ["en": "nighttime"], root: "*nókʷts")
        let cat = word("cat", "cat", ["en": "cat"], root: nil)
        let items = [night, nocturnal, twin, cat]
        return LangCorpus(items: items, byId: Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) }), attribution: "", sources: [], pool: [:], poolKeys: [], persons: [:], falseFriends: [], units: [])
    }

    @Test func webListsEveryLanguageWithMineFirstThenLookAlikes() {
        let d = WordDetail(word: "night", lang: "en", gloss: "night", reading: nil, itemId: "night")
        let web = LangReference.web(d, corpus: Self.webCorpus(), mine: ["ru", "es"])
        #expect(web.forms.map(\.lang) == ["ru", "es", "de", "nl", "fr", "ja"])
        #expect(web.forms.allSatisfy { $0.lang != "en" })
        #expect(web.forms.first { $0.lang == "de" }?.cognate == true)
        #expect(web.forms.first { $0.lang == "ja" }?.soundsAlike == false)
        #expect(web.forms.first { $0.lang == "ru" }?.script == "Cyrillic alphabet")
        #expect(web.forms.first { $0.lang == "ja" }?.script == "Kanji and kana")
        #expect(web.forms.first { $0.lang == "fr" }?.script == "Latin alphabet")
        #expect(web.forms.first { $0.lang == "es" }?.detail == WordDetail(word: "noche", lang: "es", gloss: "night", reading: nil, itemId: "night"))
        #expect(web.root == "*nókʷts")
    }

    @Test func webJoinsWordsThatShareTheRootOncePerMeaning() {
        let d = WordDetail(word: "noche", lang: "es", gloss: "night", reading: nil, itemId: "night")
        let web = LangReference.web(d, corpus: Self.webCorpus(), mine: [])
        #expect(web.kin.map(\.word) == ["nocturno"])
        #expect(web.kin.first?.detail.lang == "es")
    }

    @Test func kinFallsBackToAnyFormWhenTheLanguageHasNone() {
        let d = WordDetail(word: "Nacht", lang: "de", gloss: "night", reading: nil, itemId: "night")
        let web = LangReference.web(d, corpus: Self.webCorpus(), mine: [])
        #expect(web.kin.map(\.word) == ["nocturnal"])
        #expect(web.kin.first?.detail.lang == "en")
    }

    @Test func likenessComparesRomanizedSpelling() {
        #expect(LangReference.likeness("night", "Nacht") >= WordWeb.alike)
        #expect(LangReference.likeness("night", "ночь") < WordWeb.alike)
        #expect(LangReference.likeness("Nacht", "nacht") == 1)
        #expect(LangReference.likeness("", "") == 0)
    }

    @Test func webForAWordOutsideTheCourseIsEmpty() {
        let d = WordDetail(word: "zzz", lang: "en", gloss: nil, reading: nil)
        let web = LangReference.web(d, corpus: Self.webCorpus(), mine: ["es"])
        #expect(web.forms.isEmpty && web.kin.isEmpty && web.root == nil)
    }

    @Test func webUsesLookedUpFormsForAWordOutsideTheCourse() {
        let d = WordDetail(word: "you", lang: "en", gloss: nil, reading: nil)
        let web = LangReference.web(d, corpus: Self.webCorpus(), mine: ["es", "de"], found: ["de": "du", "es": "tú", "en": "you", "fr": ""])
        #expect(web.forms.map(\.word) == ["tú", "du"])
        #expect(web.forms.allSatisfy { $0.mine && !$0.cognate && $0.detail.itemId == nil })
        #expect(web.kin.isEmpty)
    }
}
