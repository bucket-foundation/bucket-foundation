import Foundation
import Testing
@testable import BucketKit

func translateCorpus() throws -> LangCorpus {
    buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
}

@Test func translateFindsAWordFromAnyLanguage() throws {
    let corpus = try translateCorpus()
    let item = try #require(corpus.items.first { $0.form("es") != nil && $0.form("en") != nil && !$0.form("en")!.contains(" ") })
    let en = item.form("en")!
    let hits = translateSearch(corpus, en.uppercased())
    #expect(hits.first?.exact == true)
    #expect(hits.contains { $0.itemId == item.id })
    let es = item.form("es")!
    #expect(translateSearch(corpus, es).contains { $0.itemId == item.id })
}

@Test func translateIgnoresAccentsAndArticles() throws {
    #expect(foldForSearch("  Ñandú! ") == "nandu")
    let corpus = try translateCorpus()
    if let item = corpus.items.first(where: { ($0.form("es") ?? "").hasPrefix("el ") }) {
        let bare = String(item.form("es")!.dropFirst(3))
        #expect(translateSearch(corpus, bare, langs: ["es"]).first?.itemId == item.id || translateSearch(corpus, bare, langs: ["es"]).contains { $0.itemId == item.id })
    }
    #expect(translateSearch(corpus, "").isEmpty)
}

@Test func wordOfDayIsStableForADayAndCoversEveryTarget() throws {
    let corpus = try translateCorpus()
    let system = try createSystem("en", ["fr", "es", "it"], [], now: 0)
    let a = try #require(wordOfDay(system, corpus, EngineState(), day: "2026-10-26"))
    #expect(wordOfDay(system, corpus, EngineState(), day: "2026-10-26")?.id == a.id)
    #expect(["fr", "es", "it", "en"].allSatisfy { a.form($0) != nil })
    let week = Set((20...26).compactMap { wordOfDay(system, corpus, EngineState(), day: "2026-10-\($0)")?.id })
    #expect(week.count > 1)
}

@Test func translateDetectsTheLanguageAndListsSourcesMineFirst() throws {
    let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    let item = try #require(corpus.items.first { $0.form("fr") != nil && $0.form("es") != nil && $0.form("fr") != $0.form("es") && translateSearch(corpus, $0.form("fr")!, langs: ["fr", "es", "en"], limit: 1).first?.matchedLang == "fr" })
    #expect(detectLanguage(corpus, item.form("fr")!, langs: ["fr", "es", "en"]) == "fr")
    #expect(detectLanguage(corpus, item.form("es")!, langs: ["es"]) == "es")
    #expect(detectLanguage(corpus, "", langs: ["fr"]) == nil)
    let sources = translateSources(corpus, mine: ["it", "en"])
    #expect(Array(sources.prefix(2)) == ["it", "en"])
    #expect(Set(sources).count == sources.count)
    #expect(sources.contains("fr") && sources.allSatisfy { Lang.codes.contains($0) })
}

@Test func sentencesAreDetectedAmongTheLearnersLanguages() {
    #expect(SentenceLanguage.isSentence("do you have pizza"))
    #expect(!SentenceLanguage.isSentence(" pizza "))
    #expect(SentenceLanguage.detect("do you have pizza", among: ["en", "es", "fr", "it"]) == "en")
    #expect(SentenceLanguage.detect("¿Tienes pizza para cenar esta noche?", among: ["en", "es", "fr", "it"]) == "es")
    #expect(SentenceLanguage.detect("Est-ce que tu as une pizza ce soir ?", among: ["en", "es", "fr", "it"]) == "fr")
    #expect(SentenceLanguage.detect("你有披萨吗", among: ["en", "zh"]) == "zh")
    #expect(SentenceLanguage.appleCode("zh") == "zh-Hans")
}

@Test func japaneseRomajiSpellsSyllabicNBeforeLabials() throws {
    #expect(Romaji.hanbun("hambun") == "hanbun")
    #expect(Romaji.hanbun("shimbun o yomu") == "shinbun o yomu")
    #expect(Romaji.hanbun("samma") == "sanma")
    #expect(Romaji.hanbun("kimi") == "kimi")
    let corpus = try translateCorpus()
    let ja = corpus.items.compactMap { $0.readings["ja"]?.roman } + corpus.pool.values.compactMap { $0.r["ja"] }
    #expect(ja.contains { $0.contains("hanbun") })
    #expect(!ja.contains { $0.contains(/m[bmp]/) })
}

func lexiconShelf() -> LexiconShelf {
    let tsv: [String: String] = [
        "es": "casa\thome|house\ntener\thave\ntiene\t>tener\nbuenos días\tgood morning\ngato\tcat\nnegro\tblack\n=house\tcasa\n=cat\tgato\n=good morning\tbuenos días\n=black\tnegro\n",
        "zh": "你好\thello\t\tnǐhǎo\n猫\tcat\t\tmāo\n=cat\t猫\n=hello\t你好\n",
        "ja": "ねこ\tcat\n=cat\t猫\n",
        "en": "house\t\t\nhouses\t>house\ncat\t\t\n",
    ]
    return LexiconShelf { lang in
        guard let text = tsv[lang] else { return nil }
        return try? (Data(text.utf8) as NSData).compressed(using: .zlib) as Data
    }
}

@Test func lexiconLayersAnswerWordsFormsAndReadings() throws {
    let shelf = lexiconShelf()
    let word = try #require(TranslateEngine.answer("Casa", from: ["es"], to: ["en", "zh"], corpus: nil, shelf: shelf))
    #expect(word.layer == .word)
    #expect(word.rows["en"] == "home; house")
    #expect(word.rows["zh"] == nil)
    let form = try #require(TranslateEngine.answer("tiene", from: ["es"], to: ["en"], corpus: nil, shelf: shelf))
    #expect(form.layer == .form && form.headword == "tener" && form.rows["en"] == "have")
    let pinyin = try #require(TranslateEngine.answer("ni hao", from: ["zh"], to: ["en"], corpus: nil, shelf: shelf))
    #expect(pinyin.layer == .roman && pinyin.headword == "你好")
    let romaji = try #require(TranslateEngine.answer("neko", from: ["ja"], to: ["en"], corpus: nil, shelf: shelf))
    #expect(romaji.headword == "ねこ")
    let plural = try #require(TranslateEngine.answer("houses", from: ["en"], to: ["es", "zh"], corpus: nil, shelf: shelf))
    #expect(plural.rows["es"] == "casa")
    let pivot = try #require(TranslateEngine.answer("gato", from: ["es"], to: ["zh"], corpus: nil, shelf: shelf))
    #expect(pivot.rows["zh"] == "猫")
}

@Test func phrasesMatchWholeAndSentencesFallBackToAGloss() throws {
    let shelf = lexiconShelf()
    let phrase = try #require(TranslateEngine.answer("¡Buenos días!", from: ["es"], to: ["en"], corpus: nil, shelf: shelf))
    #expect(phrase.layer == .phrase && phrase.rows["en"] == "good morning")
    let gloss = try #require(TranslateEngine.answer("el gato negro", from: ["es"], to: ["en"], corpus: nil, shelf: shelf))
    #expect(gloss.layer == .gloss)
    #expect(gloss.rows["en"] == "el cat black")
    let back = try #require(TranslateEngine.answer("the black cat", from: ["en"], to: ["es"], corpus: nil, shelf: shelf))
    #expect(back.rows["es"] == "the negro gato")
    #expect(TranslateEngine.answer("zzz qqq", from: ["es"], to: ["en"], corpus: nil, shelf: shelf) == nil)
}
