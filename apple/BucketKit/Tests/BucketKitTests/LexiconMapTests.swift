import Foundation
import Testing
@testable import BucketKit

private let day = 86_400_000.0
private let start = 1_800_000_000_000.0
private let utc = TimeZone(identifier: "UTC")!

private func fixtureCorpus() throws -> LangCorpus {
    buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
}

private func card(stability: Double?, state: String = "review") -> Card {
    var c = Card(state: state)
    c.stability = stability
    return c
}

private func studied(_ corpus: LangCorpus, lang: String, count: Int, rounds: Int) -> (state: EngineState, now: Double, ids: [String]) {
    let items = Array(corpus.items.filter { isVocab($0) && usable($0, "en", lang) }.prefix(count))
    var now = start
    var state = EngineState()
    for round in 0..<rounds {
        for (k, i) in items.enumerated() where k < count / 2 || round == 0 { state = gradeCard(state, lang, i.id, 4, now: now, tz: "UTC") }
        now += day * Double(1 << round)
    }
    return (state, now, items.map(\.id))
}

@Test func wordStateFollowsCardMastery() {
    #expect(LexiconMap.state(nil) == .unseen)
    #expect(LexiconMap.state(Card(state: "new")) == .unseen)
    #expect(LexiconMap.state(card(stability: 3)) == .started)
    #expect(LexiconMap.state(card(stability: 3, state: "relearning")) == .started)
    #expect(LexiconMap.state(card(stability: nil)) == .started)
    #expect(LexiconMap.state(card(stability: 15)) == .known)
    #expect(LexiconMap.state(card(stability: 33)) == .known)
    #expect(LexiconMap.state(card(stability: 34)) == .mastered)
    #expect(LexiconWordState.unseen < .started && LexiconWordState.started < .known && LexiconWordState.known < .mastered)
}

@Test func placedWordsCountAsKnown() throws {
    let corpus = try fixtureCorpus()
    let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
    let state = applyPlacement(EngineState(), system, corpus, "es", 4, now: start, tz: utc)
    let es = try #require(LexiconMap(root: "en", learning: [(system, state)], corpus: corpus, now: start, tz: utc).language("es"))
    #expect(es.counts.known > 0)
    #expect(es.counts.known == state.cards.count)
    #expect(es.counts.started == 0)
    #expect(es.pace == 0)
    #expect(es.finish(now: start) == nil)
}

@Test func countsAgreeWithLangProgress() throws {
    let corpus = try fixtureCorpus()
    let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
    let run = studied(corpus, lang: "es", count: 12, rounds: 8)
    let map = LexiconMap(root: "en", learning: [(system, run.state)], corpus: corpus, now: run.now, tz: utc)
    let es = try #require(map.language("es"))
    let progress = try #require(langProgress(system, corpus, run.state, now: run.now).first)
    #expect(es.counts.total == progress.total)
    #expect(es.counts.seen == progress.started)
    #expect(es.counts.mastered == progress.mastered)
    #expect(es.counts.mastered > 0)
    #expect(es.counts.seen == 12)
    #expect(es.counts.left == es.counts.total - es.counts.known - es.counts.mastered)
    #expect(es.learning)
}

@Test func everyLanguageListsItsWholeLexicon() throws {
    let corpus = try fixtureCorpus()
    let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
    let run = studied(corpus, lang: "es", count: 6, rounds: 1)
    let map = LexiconMap(root: "en", learning: [(system, run.state)], corpus: corpus, now: run.now, tz: utc)
    #expect(map.languages.first?.lang == "es")
    #expect(map.languages.count > 1)
    #expect(!map.languages.contains { $0.lang == "en" })
    #expect(Set(map.languages.map(\.lang)).count == map.languages.count)
    for l in map.languages {
        let usableCount = corpus.items.filter { isVocab($0) && usable($0, "en", l.lang) }.count
        #expect(l.counts.total == usableCount)
        #expect(l.groups.reduce(0) { $0 + $1.words.count } == usableCount)
        #expect(l.groups.map(\.index) == l.groups.map(\.index).sorted())
        #expect(l.groups.allSatisfy { !$0.words.isEmpty && !$0.title.isEmpty && $0.counts.total == $0.words.count })
        #expect(l.groups.flatMap(\.words).allSatisfy { !$0.form.isEmpty && !$0.meaning.isEmpty && $0.lang == l.lang })
        if l.lang != "es" {
            #expect(!l.learning)
            #expect(l.counts.unseen == l.counts.total)
        }
    }
    #expect(map.lexicon.total == map.languages.reduce(0) { $0 + $1.counts.total })
    #expect(map.lexicon.seen == 6)
}

@Test func headlineCountsOnlyTheLearnersLanguages() throws {
    let corpus = try fixtureCorpus()
    let system = LangSystem(id: "s", name: "es fr", root: "en", targets: ["es", "fr"], createdAt: 0)
    let run = studied(corpus, lang: "es", count: 6, rounds: 1)
    let map = LexiconMap(root: "en", learning: [(system, run.state)], corpus: corpus, now: run.now, tz: utc)
    let es = try #require(map.language("es"))
    let fr = try #require(map.language("fr"))
    #expect(map.learning.map(\.lang) == ["es", "fr"])
    #expect(map.counts == es.counts + fr.counts)
    #expect(map.counts.total < map.lexicon.total)
    #expect(map.counts.seen == 6)
    #expect(map.counts.left == map.counts.total - map.counts.learned)
    #expect(map.others.count == map.languages.count - 2)
    #expect(map.others.allSatisfy { $0.counts.unseen == $0.counts.total })
    #expect(map.pace == es.pace + fr.pace)
    #expect(map.finish(now: run.now) == LexiconMap.finish(left: map.counts.left, pace: map.pace, now: run.now))
    let empty = LexiconMap(root: "en", learning: [], corpus: corpus, now: start, tz: utc)
    #expect(empty.counts.total == 0)
    #expect(empty.learning.isEmpty)
    #expect(empty.lexicon.total == map.lexicon.total)
    #expect(empty.finish(now: start) == nil)
}

@Test func finishPastTwoYearsIsHidden() {
    #expect(LexiconMap.finish(left: 730, pace: 1, now: start) == start + 730 * day)
    #expect(LexiconMap.finish(left: 731, pace: 1, now: start) == nil)
    #expect(LexiconMap.finish(left: 500, pace: 1.0 / 14, now: start) == nil)
    #expect(LexiconMap.finish(left: 52, pace: 1.0 / 14, now: start) == start + 728 * day)
}

@Test func paceReadsPerDayOrPerWeek() {
    #expect(LexiconPace(0) == nil)
    #expect(LexiconPace(4.2) == .day(4))
    #expect(LexiconPace(1) == .day(1))
    #expect(LexiconPace(0.5) == .week(4))
    #expect(LexiconPace(1.0 / 14) == .week(1))
    #expect(LexiconPace(0.01) == .week(1))
}

@Test func bestStateWinsAcrossSystems() throws {
    let corpus = try fixtureCorpus()
    let a = LangSystem(id: "a", name: "es", root: "en", targets: ["es"], createdAt: 0)
    let b = LangSystem(id: "b", name: "es fr", root: "en", targets: ["es", "fr"], createdAt: 1)
    let item = try #require(corpus.items.first { isVocab($0) && usable($0, "en", "es") })
    let id = cardId("es", item.id)
    var weak = EngineState()
    weak.cards[id] = card(stability: 2)
    var strong = EngineState()
    strong.cards[id] = card(stability: 60)
    let map = LexiconMap(root: "en", learning: [(a, weak), (b, strong)], corpus: corpus, now: start, tz: utc)
    let es = try #require(map.language("es"))
    #expect(es.groups.flatMap(\.words).first { $0.id == id }?.state == .mastered)
    #expect(es.counts.mastered == 1)
    #expect(es.counts.seen == 1)
    #expect(map.languages.prefix(2).map(\.lang) == ["es", "fr"])
    #expect(map.language("fr")?.learning == true)
}

@Test func paceCountsWordsFirstStudiedInTheWindow() throws {
    let corpus = try fixtureCorpus()
    let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
    let items = Array(corpus.items.filter { isVocab($0) && usable($0, "en", "es") }.prefix(10))
    var state = EngineState()
    for i in items.prefix(3) { state = gradeCard(state, "es", i.id, 3, now: start - 30 * day, tz: "UTC") }
    for i in items.suffix(7) { state = gradeCard(state, "es", i.id, 3, now: start - 2 * day, tz: "UTC") }
    let map = LexiconMap(root: "en", learning: [(system, state)], corpus: corpus, now: start, tz: utc)
    let es = try #require(map.language("es"))
    #expect(es.pace == 0.5)
    #expect(map.pace == 0.5)
    #expect(es.finish(now: start) == LexiconMap.finish(left: es.counts.left, pace: 0.5, now: start))
    #expect(map.finish(now: start) == es.finish(now: start))
    #expect(LexiconPace(map.pace) == .week(4))
}

@Test func finishNeedsPaceAndWordsLeft() {
    #expect(LexiconMap.finish(left: 0, pace: 2, now: start) == nil)
    #expect(LexiconMap.finish(left: 10, pace: 0, now: start) == nil)
    #expect(LexiconMap.finish(left: 10, pace: 4, now: start) == start + 3 * day)
}

@Test func countsAddAndShare() {
    let a = LexiconCounts([.unseen, .unseen, .started, .known])
    let b = LexiconCounts([.mastered, .mastered, .known, .unseen])
    let sum = a + b
    #expect(sum.total == 8)
    #expect(sum.unseen == 3 && sum.started == 1 && sum.known == 2 && sum.mastered == 2)
    #expect(sum.learned == 4 && sum.left == 4 && sum.seen == 5)
    #expect(sum.share == 0.5)
    #expect(sum.share(.mastered) == 0.25)
    #expect(LexiconCounts().share == 0)
}
