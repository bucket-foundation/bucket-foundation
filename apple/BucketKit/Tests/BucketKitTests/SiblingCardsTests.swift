import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct SiblingCardsTests {
    @Test func adoptsStartedCardsForTargetLanguagesOnly() {
        var other = EngineState()
        other = gradeCard(other, "nl", "wife", 3, now: 1_000, tz: "UTC")
        other = gradeCard(other, "de", "wife", 3, now: 1_000, tz: "UTC")
        let next = adoptSiblingCards(EngineState(), langs: ["nl", "it"], from: [other])
        #expect(next.cards.has(cardId("nl", "wife")))
        #expect(!next.cards.has(cardId("de", "wife")))
        #expect(next.prof[cardId("nl", "wife")] == other.prof[cardId("nl", "wife")])
    }

    @Test func keepsTheMostRecentReview() {
        var older = EngineState()
        older = gradeCard(older, "nl", "wife", 1, now: 1_000, tz: "UTC")
        var newer = EngineState()
        newer = gradeCard(newer, "nl", "wife", 4, now: 9_000, tz: "UTC")
        let id = cardId("nl", "wife")
        #expect(adoptSiblingCards(older, langs: ["nl"], from: [newer]).cards[id] == newer.cards[id])
        #expect(adoptSiblingCards(newer, langs: ["nl"], from: [older]) == newer)
    }

    @Test func leavesStatsAndHistoryOfTheSetAlone() {
        var other = EngineState()
        other = gradeCard(other, "nl", "wife", 3, now: 1_000, tz: "UTC")
        let next = adoptSiblingCards(EngineState(), langs: ["nl"], from: [other])
        #expect(next.xp == 0)
        #expect(next.history.count == 0)
    }

    @Test func newSetStartsWithWordsLearnedInAnotherSet() async throws {
        let server = LangServer()
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000 })
        let first = try await s.create(root: "en", targets: ["nl", "de"])
        s.grade(first.id, lang: "nl", itemId: "wife", rating: 3)
        let second = try await s.create(root: "en", targets: ["nl", "it"])
        #expect(s.state(second.id).cards.started(cardId("nl", "wife")))
        #expect(!s.state(second.id).cards.has(cardId("de", "wife")))
    }

    @Test func studyInOneSetReachesTheOtherWhenItOpens() async throws {
        let server = LangServer()
        let clock = LockedBox<Double>(2_000)
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { clock.value })
        let a = try await s.create(root: "en", targets: ["nl"])
        let b = try await s.create(root: "en", targets: ["nl", "de"])
        s.grade(b.id, lang: "nl", itemId: "wife", rating: 3)
        clock.mutate { $0 = 90_000 }
        s.grade(b.id, lang: "nl", itemId: "wife", rating: 3)
        s.adoptSiblings(a.id)
        #expect(s.state(a.id).cards[cardId("nl", "wife")] == s.state(b.id).cards[cardId("nl", "wife")])
    }

    @Test func addingALanguageBringsItsProgress() async throws {
        let server = LangServer()
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000 })
        let a = try await s.create(root: "en", targets: ["de"])
        s.grade(a.id, lang: "de", itemId: "wife", rating: 3)
        let b = try await s.create(root: "en", targets: ["nl"])
        #expect(!s.state(b.id).cards.has(cardId("de", "wife")))
        try await s.edit(b.id, targets: ["nl", "de"])
        #expect(s.state(b.id).cards.started(cardId("de", "wife")))
    }
}
