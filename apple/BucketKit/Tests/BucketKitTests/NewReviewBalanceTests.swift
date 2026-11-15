import Foundation
import Testing
@testable import BucketKit

@Suite struct NewReviewBalanceTests {
    let utc = TimeZone(identifier: "UTC")!
    let now = 1_792_508_400_000.0

    func corpus() throws -> LangCorpus {
        buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    }

    func backlog(_ corpus: LangCorpus, _ lang: String, _ count: Int) -> EngineState {
        var st = EngineState()
        for (i, item) in corpus.items.filter({ isVocab($0) && $0.form(lang) != nil }).prefix(count).enumerated() {
            var c = Card(state: "review")
            c.reps = 3
            c.stability = 4
            c.due = now - Double(count - i) * 60_000
            st.cards[cardId(lang, item.id)] = c
        }
        return st
    }

    func isNew(_ st: EngineState, _ c: SessionCard) -> Bool { !st.cards.started(cardId(c.lang, c.itemId)) }

    @Test func backlogOfReviewsStillLeavesRoomForNewWords() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr"], [], now: now)
        let st = backlog(corpus, "fr", 31)
        let parity = planSession(sys, corpus, st, now: now, size: 14, tz: utc)
        #expect(parity.count == 14)
        #expect(parity.filter { isNew(st, $0) }.isEmpty)
        let plan = planSession(sys, corpus, st, now: now, size: 14, tz: utc, newFloor: Lang.newPerSessionFloor)
        #expect(plan.count == 14)
        #expect(plan.filter { isNew(st, $0) }.count == Lang.newPerSessionFloor)
        #expect(plan.filter { !isNew(st, $0) }.count == 14 - Lang.newPerSessionFloor)
    }

    @Test func oldestReviewsKeepTheirPlaceWhenNewWordsTakeSlots() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr"], [], now: now)
        let st = backlog(corpus, "fr", 31)
        let parity = planSession(sys, corpus, st, now: now, size: 14, tz: utc)
        let plan = planSession(sys, corpus, st, now: now, size: 14, tz: utc, newFloor: Lang.newPerSessionFloor)
        #expect(plan.filter { !isNew(st, $0) } == Array(parity.prefix(14 - Lang.newPerSessionFloor)))
    }

    @Test func newWordsAreSpreadThroughTheReviews() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr"], [], now: now)
        let st = backlog(corpus, "fr", 31)
        let plan = planSession(sys, corpus, st, now: now, size: 14, tz: utc, newFloor: Lang.newPerSessionFloor)
        let at = plan.indices.filter { isNew(st, plan[$0]) }
        #expect(at == [1, 5, 8, 12])
    }

    @Test func smallBacklogFillsTheRestWithNewWordsAsBefore() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr"], [], now: now)
        let st = backlog(corpus, "fr", 2)
        let parity = planSession(sys, corpus, st, now: now, size: 14, tz: utc)
        let plan = planSession(sys, corpus, st, now: now, size: 14, tz: utc, newFloor: Lang.newPerSessionFloor)
        #expect(Set(plan.map { "\($0.lang):\($0.itemId)" }) == Set(parity.map { "\($0.lang):\($0.itemId)" }))
        #expect(plan.filter { isNew(st, $0) }.count == Lang.newPerLangPerDay)
    }

    @Test func spentDailyNewBudgetGivesAFullReviewSession() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr"], [], now: now)
        var st = backlog(corpus, "fr", 31)
        let fresh = corpus.items.filter { isVocab($0) && $0.form("fr") != nil }.dropFirst(31).prefix(Lang.newPerLangPerDay)
        for item in fresh { st = gradeCard(st, "fr", item.id, 3, now: now - 1_000, tz: "UTC") }
        let plan = planSession(sys, corpus, st, now: now, size: 14, tz: utc, newFloor: Lang.newPerSessionFloor)
        #expect(plan.count == 14)
        #expect(plan.allSatisfy { !isNew(st, $0) })
    }

    @Test func studySessionIntroducesWordsDuringABacklog() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr"], [], now: now)
        let st = backlog(corpus, "fr", 31)
        let q = SessionMix.queue(sys, corpus, st, now: now, freq: FrequencyRank([:]), tz: utc)
        let fresh = q.filter { !st.cards.started(cardId($0.lang, $0.itemId)) }
        #expect(Set(fresh.map(\.itemId)).count == Lang.newPerSessionFloor)
        #expect(q.filter { $0.stage == .review }.count == 14 - Lang.newPerSessionFloor)
        let firstNew = try #require(q.firstIndex { !st.cards.started(cardId($0.lang, $0.itemId)) })
        #expect(firstNew < 3)
    }

    @Test func blendPlacesNewCardsAtEvenSlots() {
        let reviews = (0..<10).map { SessionCard(itemId: "r\($0)", lang: "fr") }
        let fresh = (0..<4).map { SessionCard(itemId: "n\($0)", lang: "fr") }
        let out = blendNew(reviews, fresh)
        #expect(out.count == 14)
        #expect(out.indices.filter { out[$0].itemId.hasPrefix("n") } == [1, 5, 8, 12])
        #expect(out.filter { $0.itemId.hasPrefix("r") } == reviews)
        #expect(out.filter { $0.itemId.hasPrefix("n") } == fresh)
        #expect(blendNew([], fresh) == fresh)
        #expect(blendNew(reviews, []) == reviews)
    }
}
