import Foundation
import Testing
@testable import BucketKit

@Suite struct DailyBudgetTests {
    static let limits = DailyLimits(newWords: 12, cards: 60)
    static let day = "2026-11-18"

    static func spentBudget() -> DailyBudget {
        var b = DailyBudget(day: day)
        b.charge(newWords: 12, cards: 60, day: day)
        return b
    }

    @Test func defaultsComeFromTheFlagTable() {
        #expect(BetaFlags.fallback["daily_new_words"] == "12")
        #expect(BetaFlags.fallback["daily_cards"] == "60")
        #expect(DailyLimits(flags: BetaFlags()) == Self.limits)
    }

    @Test func serverFlagsReplaceTheDefaults() {
        let flags = BetaFlags(values: ["daily_new_words": "20", "daily_cards": "100"])
        #expect(DailyLimits(flags: flags) == DailyLimits(newWords: 20, cards: 100))
    }

    @Test func unreadableFlagsFallBackToTheDefaults() {
        let flags = BetaFlags(values: ["daily_new_words": "lots", "daily_cards": "-5"])
        #expect(DailyLimits(flags: flags) == Self.limits)
    }

    @Test func lessonsAndGamesShareOneLedger() {
        var b = DailyBudget(day: Self.day)
        b.charge(newWords: 4, cards: 14, day: Self.day)
        b.charge(cards: 6, day: Self.day)
        #expect(b.newWords == 4)
        #expect(b.cards == 20)
        #expect(b.cardsLeft(Self.limits, capped: true) == 40)
        #expect(b.newWordsLeft(Self.limits, capped: true) == 8)
        #expect(!b.spent(Self.limits, capped: true))
    }

    @Test func subscribersHaveNoCap() {
        let b = Self.spentBudget()
        #expect(b.cardsLeft(Self.limits, capped: false) == nil)
        #expect(b.newWordsLeft(Self.limits, capped: false) == nil)
        #expect(!b.spent(Self.limits, capped: false))
        #expect(b.lessonGate(Self.limits, capped: false, dueReviews: 0) == .open(newWords: .max))
        #expect(b.retryOffer("daily", capped: false) == .free)
    }

    @Test func cardCapSpendsTheBudget() {
        let b = Self.spentBudget()
        #expect(b.spent(Self.limits, capped: true))
        #expect(b.cardsLeft(Self.limits, capped: true) == 0)
        #expect(b.newWordsLeft(Self.limits, capped: true) == 0)
    }

    @Test func newWordsNeverExceedTheCardsLeft() {
        var b = DailyBudget(day: Self.day)
        b.charge(newWords: 2, cards: 57, day: Self.day)
        #expect(b.newWordsLeft(Self.limits, capped: true) == 3)
    }

    @Test func newWordCapLeavesReviewCardsOpen() {
        var b = DailyBudget(day: Self.day)
        b.charge(newWords: 12, cards: 24, day: Self.day)
        #expect(b.lessonGate(Self.limits, capped: true, dueReviews: 0) == .open(newWords: 0))
        #expect(!b.spent(Self.limits, capped: true))
    }

    @Test func budgetResetsOnANewDay() {
        var b = Self.spentBudget()
        b.grantCards(day: Self.day)
        b.markPlayed("shift", day: Self.day)
        b.grantRetry("daily", capped: true, day: Self.day)
        let next = b.on("2026-11-19")
        #expect(next == DailyBudget(day: "2026-11-19"))
        b.charge(cards: 3, day: "2026-11-19")
        #expect(b.cards == 3)
        #expect(b.adGrants == 0)
        #expect(!b.hasPlayed("shift"))
        #expect(b.retriesLeft("daily") == 2)
    }

    @Test func resetIsTheNextLocalMidnight() throws {
        let tz = try #require(TimeZone(identifier: "America/New_York"))
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        let evening = try #require(cal.date(from: DateComponents(year: 2026, month: 11, day: 18, hour: 23, minute: 30)))
        let midnight = try #require(cal.date(from: DateComponents(year: 2026, month: 11, day: 19)))
        #expect(DailyBudget.resetsAt(evening, tz: tz) == midnight)
        let ms = evening.timeIntervalSince1970 * 1000
        #expect(dayKey(ms, tz: tz) == "2026-11-18")
        #expect(dayKey(midnight.timeIntervalSince1970 * 1000, tz: tz) == "2026-11-19")
    }

    @Test func resetFollowsTheClockChange() throws {
        let tz = try #require(TimeZone(identifier: "America/New_York"))
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        let noon = try #require(cal.date(from: DateComponents(year: 2026, month: 11, day: 1, hour: 12)))
        let next = try #require(cal.date(from: DateComponents(year: 2026, month: 11, day: 2)))
        #expect(DailyBudget.resetsAt(noon, tz: tz) == next)
    }

    @Test func anAdAddsTenCardsTwiceADay() {
        var b = Self.spentBudget()
        #expect(b.canWatchForCards)
        let granted1 = b.grantCards(day: Self.day)
        #expect(granted1)
        #expect(b.cardsLeft(Self.limits, capped: true) == 10)
        #expect(!b.spent(Self.limits, capped: true))
        b.charge(cards: 10, day: Self.day)
        let granted2 = b.grantCards(day: Self.day)
        #expect(granted2)
        #expect(b.cardCap(Self.limits) == 80)
        #expect(!b.canWatchForCards)
        let granted3 = b.grantCards(day: Self.day)
        #expect(!granted3)
        #expect(b.cardCap(Self.limits) == 80)
    }

    @Test func dueReviewsStayReachableAtTheCap() {
        let b = Self.spentBudget()
        #expect(b.lessonGate(Self.limits, capped: true, dueReviews: 5) == .reviewsOnly)
        #expect(b.lessonGate(Self.limits, capped: true, dueReviews: 0) == .limit)
    }

    @Test func retriesCostAnAdAndStopAtTwoPerGame() {
        var b = DailyBudget(day: Self.day)
        #expect(b.retryOffer("daily", capped: true) == .ad(left: 2))
        let granted4 = b.grantRetry("daily", capped: true, day: Self.day)
        #expect(granted4)
        #expect(b.retryOffer("daily", capped: true) == .ad(left: 1))
        let granted5 = b.grantRetry("daily", capped: true, day: Self.day)
        #expect(granted5)
        #expect(b.retryOffer("daily", capped: true) == .none)
        let granted6 = b.grantRetry("daily", capped: true, day: Self.day)
        #expect(!granted6)
        #expect(b.retryOffer("mini", capped: true) == .ad(left: 2))
    }

    @Test func subscribersRetryFreelyWithoutSpendingRetries() {
        var b = DailyBudget(day: Self.day)
        for _ in 0..<5 {
            let granted = b.grantRetry("daily", capped: false, day: Self.day)
            #expect(granted)
        }
        #expect(b.retriesLeft("daily") == 2)
    }

    @Test func retryLeavesTheFirstAttemptAndCardsAlone() {
        var b = DailyBudget(day: Self.day)
        b.charge(cards: 6, day: Self.day)
        b.markPlayed("shift", day: Self.day)
        let before = b
        b.grantRetry("shift", capped: true, day: Self.day)
        #expect(b.cards == before.cards)
        #expect(b.played == before.played)
        #expect(b.hasPlayed("shift"))
    }

    @Test func failedAdStillGrantsAndSkippedAdDoesNot() {
        #expect(AdOutcome.earned.grants)
        #expect(AdOutcome.unavailable.grants)
        #expect(!AdOutcome.skipped.grants)
        #expect(AdOutcome.unavailable.via == "fallback")
        #expect(AdOutcome.earned.via == "ad")
    }

    @Test func ledgerSurvivesASaveAndRollsOverOnLoad() throws {
        let name = "daily-budget-test"
        let defaults = try #require(UserDefaults(suiteName: name))
        defaults.removePersistentDomain(forName: name)
        defer { defaults.removePersistentDomain(forName: name) }
        var b = DailyBudget(day: Self.day)
        b.charge(newWords: 3, cards: 9, day: Self.day)
        b.grantRetry("mini", capped: true, day: Self.day)
        b.save(defaults, key: "k")
        #expect(DailyBudget.load(defaults, key: "k", day: Self.day) == b)
        #expect(DailyBudget.load(defaults, key: "k", day: "2026-11-19") == DailyBudget(day: "2026-11-19"))
        #expect(DailyBudget.load(defaults, key: "missing", day: Self.day) == DailyBudget(day: Self.day))
    }

    static let queue = [
        QueueEntry(itemId: "dog", lang: "es", stage: .intro), QueueEntry(itemId: "dog", lang: "es", stage: .check),
        QueueEntry(itemId: "cat", lang: "es", stage: .review),
        QueueEntry(itemId: "sun", lang: "es", stage: .intro), QueueEntry(itemId: "sun", lang: "es", stage: .check),
        QueueEntry(itemId: "sea", lang: "es", stage: .review),
    ]
    static func isNew(_ e: QueueEntry) -> Bool { ["dog", "sun"].contains(e.itemId) }
    static func isDue(_ e: QueueEntry) -> Bool { e.itemId == "cat" }

    @Test func openGateKeepsOnlyTheAllowedNewWords() {
        let one = LessonTrim.queue(Self.queue, gate: .open(newWords: 1), isNew: Self.isNew, isDue: Self.isDue)
        #expect(one.map(\.itemId) == ["dog", "dog", "cat", "sea"])
        let none = LessonTrim.queue(Self.queue, gate: .open(newWords: 0), isNew: Self.isNew, isDue: Self.isDue)
        #expect(none.map(\.itemId) == ["cat", "sea"])
        #expect(LessonTrim.queue(Self.queue, gate: .open(newWords: .max), isNew: Self.isNew, isDue: Self.isDue) == Self.queue)
    }

    @Test func reviewsOnlyKeepsDueCards() {
        let kept = LessonTrim.queue(Self.queue, gate: .reviewsOnly, isNew: Self.isNew, isDue: Self.isDue)
        #expect(kept.map(\.itemId) == ["cat"])
    }

    @Test func limitGateEmptiesTheSession() {
        #expect(LessonTrim.queue(Self.queue, gate: .limit, isNew: Self.isNew, isDue: Self.isDue).isEmpty)
    }
}
