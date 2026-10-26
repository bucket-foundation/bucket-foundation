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
