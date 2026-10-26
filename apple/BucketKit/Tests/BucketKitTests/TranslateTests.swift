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
