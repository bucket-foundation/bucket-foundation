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

    func placedOnly(_ lang: String, _ itemId: String, at now: Double) -> EngineState {
        var s = gradeCard(EngineState(), lang, itemId, 3, now: now, tz: "UTC")
        var c = s.cards[cardId(lang, itemId)]!
        c.placed = true
        c.reps = 1
        c.spread = nil
        s.cards[cardId(lang, itemId)] = c
        s.prof = OrderedMap()
        return s
    }

    @Test func newerPlacementNeverReplacesAReviewedCard() {
        var reviewed = gradeCard(EngineState(), "nl", "wife", 3, now: 1_000, tz: "UTC")
        reviewed = gradeCard(reviewed, "nl", "wife", 3, now: 2_000, tz: "UTC")
        let placed = placedOnly("nl", "wife", at: 9_000)
        #expect(adoptSiblingCards(reviewed, langs: ["nl"], from: [placed]) == reviewed)
    }

    @Test func reviewedCardReplacesANewerPlacement() {
        let reviewed = gradeCard(EngineState(), "nl", "wife", 3, now: 1_000, tz: "UTC")
        let placed = placedOnly("nl", "wife", at: 9_000)
        let id = cardId("nl", "wife")
        let next = adoptSiblingCards(placed, langs: ["nl"], from: [reviewed])
        #expect(next.cards[id] == reviewed.cards[id])
        #expect(next.prof[id] == reviewed.prof[id])
    }

    @Test func adoptedWordsKeepTheirDayAndShareTheLanguageBudget() {
        let now = 1_000_000.0
        var other = gradeCard(EngineState(), "nl", "wife", 3, now: now, tz: "UTC")
        other = gradeCard(other, "nl", "man", 3, now: now, tz: "UTC")
        let next = adoptSiblingCards(EngineState(), langs: ["nl", "es"], from: [other])
        let utc = TimeZone(identifier: "UTC")!
        #expect(next.cards[cardId("nl", "wife")]?.introduced == other.cards[cardId("nl", "wife")]?.introduced)
        #expect(newToday(next, "nl", now: now, tz: utc) == newToday(other, "nl", now: now, tz: utc))
        #expect(newToday(next, "nl", now: now, tz: utc) == 2)
        #expect(newToday(next, "es", now: now, tz: utc) == 0)
        #expect(newToday(next, "nl", now: now + 86_400_000, tz: utc) == 0)
    }

    @Test func adoptedCardBringsItsProficiencyOrNone() {
        var mine = gradeCard(EngineState(), "nl", "wife", 3, now: 1_000, tz: "UTC")
        mine.prof[cardId("nl", "wife")] = Proficiency(theta: 2, n: 5)
        var other = gradeCard(EngineState(), "nl", "wife", 4, now: 5_000, tz: "UTC")
        other.prof = OrderedMap()
        #expect(adoptSiblingCards(mine, langs: ["nl"], from: [other]).prof[cardId("nl", "wife")] == nil)
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

    @Test func gradingInOneSetReachesSiblingSetsAtOnce() async throws {
        let server = LangServer()
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000 })
        let a = try await s.create(root: "en", targets: ["nl"])
        let b = try await s.create(root: "en", targets: ["nl", "de"])
        let c = try await s.create(root: "en", targets: ["it"])
        s.grade(b.id, lang: "nl", itemId: "wife", rating: 3)
        let id = cardId("nl", "wife")
        #expect(s.state(a.id).cards[id] == s.state(b.id).cards[id])
        #expect(s.state(a.id).cards.started(id))
        #expect(s.state(c.id) == EngineState())
        await s.flush()
        #expect(EngineState(js: server.branches.value[progressBranch(a)]).cards[id] == s.state(b.id).cards[id])
    }

    @Test func cardsMergedFromTheServerReachSiblingSets() async throws {
        let server = LangServer()
        let clock = LockedBox<Double>(2_000)
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { clock.value })
        await s.load()
        let a = try await s.create(root: "en", targets: ["nl"])
        let b = try await s.create(root: "en", targets: ["nl", "de"])
        s.grade(b.id, lang: "nl", itemId: "wife", rating: 3)
        await s.flush()
        let id = cardId("nl", "wife")
        let remote = gradeCard(s.state(b.id), "nl", "wife", 3, now: 90_000, tz: "UTC")
        server.branches.mutate { $0[progressBranch(b)] = remote.js }
        clock.mutate { $0 = 95_000 }
        s.grade(b.id, lang: "de", itemId: "wife", rating: 3)
        await s.flush()
        #expect(s.state(b.id).cards[id] == remote.cards[id])
        #expect(s.state(a.id).cards[id] == remote.cards[id])
    }

    @Test func dayTotalsCountASharedCardAndItsLanguageBudgetOnce() throws {
        let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
        let a = try createSystem("en", ["fr", "es"], [], now: 0)
        let b = try createSystem("en", ["fr", "it"], [], now: 0)
        let item = try #require(corpus.items.first { i in isVocab(i) && ["fr", "es", "it"].allSatisfy { usable(i, "en", $0) } })
        let now = 1_000_000.0
        let graded = gradeCard(EngineState(), "fr", item.id, 1, now: now, tz: "UTC")
        let shared = adoptSiblingCards(EngineState(), langs: b.targets, from: [graded])
        let utc = TimeZone(identifier: "UTC")!
        let budget = Int(graded.newPerDay)
        let today = langDayTotals([(a, graded), (b, shared)], corpus, now: now, tz: utc)
        #expect(today.new == (budget - 1) + budget + budget)
        let later = langDayTotals([(a, graded), (b, shared)], corpus, now: now + 86_400_000, tz: utc)
        #expect(later.due == 1)
        #expect(later.due == langDayTotals([(a, graded)], corpus, now: now + 86_400_000, tz: utc).due)
        #expect(later.new == 3 * budget)
    }

    @Test func adoptedWordsReachTheServerAndAFreshInstall() async throws {
        let server = LangServer()
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000 })
        await s.load()
        let first = try await s.create(root: "en", targets: ["nl"])
        s.grade(first.id, lang: "nl", itemId: "wife", rating: 3)
        let second = try await s.create(root: "en", targets: ["nl", "it"])
        await s.flush()
        #expect(!s.hasUnsyncedWork)
        let id = cardId("nl", "wife")
        #expect(EngineState(js: server.branches.value[progressBranch(second)]).cards.started(id))
        let reinstalled = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000 })
        await reinstalled.load()
        #expect(reinstalled.state(second.id).cards[id] == s.state(second.id).cards[id])
    }

    @Test func loadAdoptsSiblingCardsWhenStoredSetsDisagree() async throws {
        let server = LangServer()
        let clock = LockedBox<Double>(2_000)
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { clock.value })
        await s.load()
        let a = try await s.create(root: "en", targets: ["nl"])
        let b = try await s.create(root: "en", targets: ["nl", "de"])
        let c = try await s.create(root: "en", targets: ["it"])
        s.grade(b.id, lang: "nl", itemId: "wife", rating: 3)
        clock.mutate { $0 = 90_000 }
        s.grade(b.id, lang: "nl", itemId: "man", rating: 3)
        await s.flush()
        let wife = cardId("nl", "wife")
        let man = cardId("nl", "man")
        let stale = gradeCard(EngineState(), "nl", "man", 1, now: 1_000, tz: "UTC")
        server.branches.mutate { $0[progressBranch(a)] = stale.js }
        let reinstalled = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { clock.value })
        await reinstalled.load()
        #expect(reinstalled.state(a.id).cards[wife] == s.state(b.id).cards[wife])
        #expect(reinstalled.state(a.id).cards[man] == s.state(b.id).cards[man])
        #expect(reinstalled.state(a.id).prof[man] == s.state(b.id).prof[man])
        #expect(reinstalled.state(b.id).cards[man] == s.state(b.id).cards[man])
        #expect(!reinstalled.state(c.id).cards.has(wife))
    }

    @Test func guestNewSetCarriesWordsToTheAccountAfterSignIn() async throws {
        let server = LangServer()
        let signedIn = LockedBox(false)
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { signedIn.value ? "t" : nil }, now: { 2_000 })
        await s.load()
        let first = try await s.create(root: "en", targets: ["nl"])
        s.grade(first.id, lang: "nl", itemId: "wife", rating: 3)
        let second = try await s.create(root: "en", targets: ["nl", "de"])
        #expect(s.state(second.id).cards.started(cardId("nl", "wife")))
        await s.flush()
        #expect(server.posts.value.isEmpty)
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-a")
        #expect(!s.hasUnsyncedWork)
        #expect(EngineState(js: server.branches.value[progressBranch(second)]).cards.started(cardId("nl", "wife")))
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
