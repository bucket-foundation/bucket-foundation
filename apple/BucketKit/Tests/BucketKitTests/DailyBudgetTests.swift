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

    @Test(arguments: ["lots", "-5", "0", ""])
    func badOrZeroFlagsFallBackToTheDefaults(_ value: String) {
        let flags = BetaFlags(values: ["daily_new_words": value, "daily_cards": value])
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
        #expect(b.lessonGate(Self.limits, capped: false, dueReviews: 0) == .open(newWords: .max, cards: .max))
        #expect(b.retryOffer("daily", deck: Self.day, capped: false, adReady: true) == .free)
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
        #expect(b.lessonGate(Self.limits, capped: true, dueReviews: 9) == .open(newWords: 3, cards: 3))
    }

    @Test func newWordCapLeavesReviewCardsOpen() {
        var b = DailyBudget(day: Self.day)
        b.charge(newWords: 12, cards: 24, day: Self.day)
        #expect(b.lessonGate(Self.limits, capped: true, dueReviews: 0) == .open(newWords: 0, cards: 36))
    }

    @Test func countsResetOnALaterDay() {
        var b = Self.spentBudget()
        b.grantCards(day: Self.day)
        b.charge(cards: 3, day: "2026-11-19")
        #expect(b.day == "2026-11-19")
        #expect(b.cards == 3)
        #expect(b.newWords == 0)
        #expect(b.adGrants == 0)
    }

    @Test func clockMovedBackOneDayKeepsTheHighWaterDay() {
        var b = Self.spentBudget()
        b.grantCards(day: Self.day)
        b.grantCards(day: Self.day)
        let back = b.on("2026-11-17")
        #expect(back == b)
        b.charge(cards: 5, day: "2026-11-17")
        #expect(b.day == Self.day)
        #expect(b.cards == 65)
        let again = b.grantCards(day: "2026-11-17")
        #expect(!again)
        #expect(b.on("garbage") == b)
    }

    @Test func clockSetFarForwardOnceDoesNotPinTheLedger() {
        let future = "2027-03-01"
        var b = DailyBudget(day: future)
        b.charge(newWords: 12, cards: 60, day: future)
        b.grantCards(day: future)
        b.grantCards(day: future)
        b.markPlayed("atlas", deck: future)
        b.grantRetry("atlas", deck: future, capped: true)
        b.grantRetry("atlas", deck: future, capped: true)
        let back = b.on(Self.day)
        #expect(back == DailyBudget(day: Self.day))
        #expect(!back.spent(Self.limits, capped: true))
        #expect(back.cardGrantsLeft == 2)
        #expect(!back.hasPlayed("atlas", deck: Self.day))
        #expect(back.retriesLeft("atlas", deck: Self.day) == 2)
        #expect(b.on("2026-11-20").day == "2026-11-20")
        #expect(DailyBudget(day: "2026-11-20").on(Self.day) == DailyBudget(day: Self.day))
    }

    @Test func attemptFromAFarFutureDeckDoesNotBlockToday() {
        var b = DailyBudget(day: Self.day)
        b.markPlayed("shift", deck: "2027-03-01")
        b.grantRetry("shift", deck: "2027-03-01", capped: true)
        b.grantRetry("shift", deck: "2027-03-01", capped: true)
        #expect(!b.hasPlayed("shift", deck: Self.day))
        #expect(b.retriesLeft("shift", deck: Self.day) == 2)
        b.markPlayed("shift", deck: Self.day, title: "2 of 4 found")
        #expect(b.first("shift", deck: Self.day)?.title == "2 of 4 found")
    }

    @Test func oneDayAheadAcrossTimeZonesKeepsTheLedger() throws {
        let tokyo = try #require(TimeZone(identifier: "Asia/Tokyo"))
        let honolulu = try #require(TimeZone(identifier: "Pacific/Honolulu"))
        let moment = Date(timeIntervalSince1970: 1_795_042_800)
        let ahead = dayKey(moment.timeIntervalSince1970 * 1000, tz: tokyo)
        let behind = dayKey(moment.timeIntervalSince1970 * 1000, tz: honolulu)
        #expect(ahead == "2026-11-19")
        #expect(behind == "2026-11-18")
        #expect(!DailyDeck.tooFarAhead(ahead, of: behind))
        var b = DailyBudget(day: ahead)
        b.charge(newWords: 12, cards: 60, day: ahead)
        b.markPlayed("daily", deck: ahead)
        b.grantRetry("daily", deck: ahead, capped: true)
        let landed = b.on(behind)
        #expect(landed == b)
        #expect(landed.spent(Self.limits, capped: true))
        #expect(landed.hasPlayed("daily", deck: behind))
        #expect(landed.retriesLeft("daily", deck: behind) == 0)
        #expect(DailyDeck.tooFarAhead("2026-11-20", of: behind))
        #expect(!DailyDeck.tooFarAhead("2027-01-01", of: "2026-12-31"))
        #expect(!DailyDeck.tooFarAhead("garbage", of: behind))
    }

    @Test func clockMovedBackNeverReopensAnAttemptOrRetries() {
        var b = DailyBudget(day: Self.day)
        b.markPlayed("atlas", deck: Self.day)
        b.grantRetry("atlas", deck: Self.day, capped: true)
        #expect(b.hasPlayed("atlas", deck: "2026-11-17"))
        #expect(b.retriesLeft("atlas", deck: "2026-11-17") == 0)
        #expect(b.retryOffer("atlas", deck: "2026-11-17", capped: true, adReady: true) == .none)
        let granted = b.grantRetry("atlas", deck: "2026-11-17", capped: true)
        #expect(!granted)
        b.markPlayed("atlas", deck: "2026-11-17")
        #expect(b.attempts["atlas"]?.deck == Self.day)
    }

    @Test func resetIsTheNextLocalMidnight() throws {
        let tz = try #require(TimeZone(identifier: "America/New_York"))
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        let evening = try #require(cal.date(from: DateComponents(year: 2026, month: 11, day: 18, hour: 23, minute: 30)))
        let midnight = try #require(cal.date(from: DateComponents(year: 2026, month: 11, day: 19)))
        #expect(DailyBudget.resetsAt(evening, tz: tz) == midnight)
        #expect(dayKey(evening.timeIntervalSince1970 * 1000, tz: tz) == "2026-11-18")
        #expect(dayKey(midnight.timeIntervalSince1970 * 1000, tz: tz) == "2026-11-19")
    }

    @Test func aGrantAddsTenCardsTwiceADay() {
        var b = Self.spentBudget()
        #expect(b.cardGrantsLeft == 2)
        let one = b.grantCards(day: Self.day)
        #expect(one)
        #expect(b.cardsLeft(Self.limits, capped: true) == 10)
        b.charge(cards: 10, day: Self.day)
        let two = b.grantCards(day: Self.day)
        #expect(two)
        #expect(b.cardCap(Self.limits) == 80)
        let three = b.grantCards(day: Self.day)
        #expect(!three)
        #expect(b.cardCap(Self.limits) == 80)
    }

    @Test func dueReviewsStayReachableAtTheCap() {
        let b = Self.spentBudget()
        #expect(b.lessonGate(Self.limits, capped: true, dueReviews: 5) == .reviewsOnly)
        #expect(b.lessonGate(Self.limits, capped: true, dueReviews: 0) == .limit)
    }

    @Test func retriesStopAtTwoPerGame() {
        var b = DailyBudget(day: Self.day)
        #expect(b.retryOffer("daily", deck: Self.day, capped: true, adReady: true) == .ad(left: 2))
        b.grantRetry("daily", deck: Self.day, capped: true)
        #expect(b.retryOffer("daily", deck: Self.day, capped: true, adReady: true) == .ad(left: 1))
        b.grantRetry("daily", deck: Self.day, capped: true)
        #expect(b.retryOffer("daily", deck: Self.day, capped: true, adReady: true) == .none)
        let third = b.grantRetry("daily", deck: Self.day, capped: true)
        #expect(!third)
        #expect(b.retryOffer("mini", deck: Self.day, capped: true, adReady: true) == .ad(left: 2))
    }

    @Test func noReadyAdMakesThePlainOfferWithinTheSameCap() {
        var b = DailyBudget(day: Self.day)
        #expect(b.retryOffer("daily", deck: Self.day, capped: true, adReady: false) == .plain(left: 2))
        b.grantRetry("daily", deck: Self.day, capped: true)
        b.grantRetry("daily", deck: Self.day, capped: true)
        #expect(b.retryOffer("daily", deck: Self.day, capped: true, adReady: false) == .none)
    }

    @Test func subscribersRetryFreelyWithoutSpendingRetries() {
        var b = DailyBudget(day: Self.day)
        for _ in 0..<5 {
            let granted = b.grantRetry("daily", deck: Self.day, capped: false)
            #expect(granted)
        }
        #expect(b.retriesLeft("daily", deck: Self.day) == 2)
    }

    @Test func retryLeavesTheFirstResultAndCardsAlone() {
        var b = DailyBudget(day: Self.day)
        b.charge(cards: 6, day: Self.day)
        b.markPlayed("shift", deck: Self.day, title: "3 of 4 found", shape: .marks([true, true, true, false]))
        b.grantRetry("shift", deck: Self.day, capped: true)
        b.markPlayed("shift", deck: Self.day, title: "4 of 4 found", shape: .marks([true, true, true, true]))
        #expect(b.cards == 6)
        #expect(b.first("shift", deck: Self.day)?.title == "3 of 4 found")
        #expect(b.first("shift", deck: Self.day)?.shape == .marks([true, true, true, false]))
        #expect(b.first("shift", deck: Self.day)?.retries == 1)
    }

    @Test func utcDeckRollsBeforeLocalMidnight() throws {
        let tz = try #require(TimeZone(identifier: "America/Los_Angeles"))
        let afternoon = Date(timeIntervalSince1970: 1_795_042_800)
        let evening = afternoon.addingTimeInterval(3 * 3600)
        #expect(dayKey(afternoon.timeIntervalSince1970 * 1000, tz: tz) == dayKey(evening.timeIntervalSince1970 * 1000, tz: tz))
        let oldDeck = DailyDeck.key("atlas", now: afternoon, tz: tz)
        let newDeck = DailyDeck.key("atlas", now: evening, tz: tz)
        #expect(oldDeck != newDeck)
        var b = DailyBudget(day: dayKey(afternoon.timeIntervalSince1970 * 1000, tz: tz))
        b.markPlayed("atlas", deck: oldDeck, title: "9000 points")
        b.grantRetry("atlas", deck: oldDeck, capped: true)
        b.grantRetry("atlas", deck: oldDeck, capped: true)
        #expect(b.hasPlayed("atlas", deck: oldDeck))
        #expect(!b.hasPlayed("atlas", deck: newDeck))
        #expect(b.first("atlas", deck: newDeck) == nil)
        #expect(b.retriesLeft("atlas", deck: newDeck) == 2)
        b.markPlayed("atlas", deck: newDeck, title: "12000 points")
        #expect(b.first("atlas", deck: newDeck)?.title == "12000 points")
        #expect(b.hasPlayed("atlas", deck: oldDeck))
        #expect(b.retriesLeft("atlas", deck: oldDeck) == 0)
    }

    @Test func localMidnightComesBeforeTheUtcDeckRolls() throws {
        let tz = try #require(TimeZone(identifier: "Asia/Tokyo"))
        let lateNight = Date(timeIntervalSince1970: 1_795_010_400)
        let afterMidnight = lateNight.addingTimeInterval(3 * 3600)
        let before = dayKey(lateNight.timeIntervalSince1970 * 1000, tz: tz)
        let after = dayKey(afterMidnight.timeIntervalSince1970 * 1000, tz: tz)
        #expect(before != after)
        let deck = DailyDeck.key("shift", now: lateNight, tz: tz)
        #expect(DailyDeck.key("shift", now: afterMidnight, tz: tz) == deck)
        var b = DailyBudget(day: before)
        b.charge(cards: 60, day: before)
        b.markPlayed("shift", deck: deck, title: "3 of 4 found")
        b.grantRetry("shift", deck: deck, capped: true)
        b.charge(cards: 1, day: after)
        #expect(b.cards == 1)
        #expect(b.hasPlayed("shift", deck: deck))
        #expect(b.first("shift", deck: deck)?.title == "3 of 4 found")
        #expect(b.retriesLeft("shift", deck: deck) == 1)
        #expect(DailyDeck.key("daily", now: afterMidnight, tz: tz) == after)
    }

    @Test func seededPlayGamesUseTheUtcDeckAndTheRestUseTheLocalDay() throws {
        let tz = try #require(TimeZone(identifier: "America/Los_Angeles"))
        let evening = Date(timeIntervalSince1970: 1_795_053_600)
        for game in ["atlas", "shift", "flagTiles"] { #expect(DailyDeck.key(game, now: evening, tz: tz) == PlayDecks.deckDay(evening)) }
        for game in ["daily", "mini", "wordGroups", "polyword"] { #expect(DailyDeck.key(game, now: evening, tz: tz) == dayKey(evening.timeIntervalSince1970 * 1000, tz: tz)) }
        #expect(DailyDeck.later("2026-11-19", than: "2026-11-18"))
        #expect(DailyDeck.later("2027-01-01", than: "2026-12-31"))
        #expect(!DailyDeck.later("2026-11-18", than: "2026-11-18"))
        #expect(DailyDeck.later("2026-11-9", than: "2026-11-08"))
    }

    @Test func practiceRoundRecordsNothing() {
        var round = PracticeRound()
        let first = round.finish()
        #expect(first)
        #expect(round.recorded)
        let repeated = round.finish()
        #expect(!repeated)
        round.begin()
        #expect(round.practicing)
        let practice = round.finish(score: "4 of 4 found")
        #expect(!practice)
        #expect(!round.practicing)
        #expect(round.score == "4 of 4 found")
        round.begin()
        #expect(round.score == nil)
    }

    @Test func practiceBeforeAnyRecordStillRecordsNothing() {
        var round = PracticeRound()
        round.begin()
        let practice = round.finish(score: "1:05")
        #expect(!practice)
        #expect(!round.recorded)
    }

    @Test func budgetRoundTripsThroughCodable() throws {
        var b = DailyBudget(day: Self.day)
        b.charge(newWords: 3, cards: 9, day: Self.day)
        b.markPlayed("polyword", deck: Self.day, title: "3/6", shape: .guesses(rows: [[.hit, .near, .miss]], solved: true, limit: 6))
        b.grantRetry("polyword", deck: Self.day, capped: true)
        let data = try JSONEncoder().encode(b)
        #expect(try JSONDecoder().decode(DailyBudget.self, from: data) == b)
    }

    @Test func defaultsVaultSavesAndLoads() throws {
        let name = "daily-budget-test"
        let defaults = try #require(UserDefaults(suiteName: name))
        defaults.removePersistentDomain(forName: name)
        defer { defaults.removePersistentDomain(forName: name) }
        let vault = DefaultsBudgetVault(defaults, key: "k")
        #expect(vault.load() == nil)
        var b = DailyBudget(day: Self.day)
        b.charge(cards: 9, day: Self.day)
        vault.save(b)
        #expect(vault.load() == b)
    }

    @Test func pairedVaultTakesTheHighWaterCopy() {
        var old = DailyBudget(day: "2026-11-17")
        old.charge(cards: 50, day: "2026-11-17")
        var fresh = DailyBudget(day: Self.day)
        fresh.charge(cards: 2, day: Self.day)
        #expect(PairedBudgetVault(MemoryBudgetVault(old), MemoryBudgetVault(fresh)).load() == fresh)
        #expect(PairedBudgetVault(MemoryBudgetVault(fresh), MemoryBudgetVault(nil)).load() == fresh)
        var more = fresh
        more.charge(cards: 5, day: Self.day)
        #expect(PairedBudgetVault(MemoryBudgetVault(fresh), MemoryBudgetVault(more)).load() == more)
        let a = MemoryBudgetVault(), b = MemoryBudgetVault()
        PairedBudgetVault(a, b).save(more)
        #expect(a.load() == more)
        #expect(b.load() == more)
    }

    static let queue = [
        QueueEntry(itemId: "dog", lang: "es", stage: .intro), QueueEntry(itemId: "dog", lang: "es", stage: .check),
        QueueEntry(itemId: "cat", lang: "es", stage: .review),
        QueueEntry(itemId: "sun", lang: "es", stage: .intro), QueueEntry(itemId: "sun", lang: "es", stage: .check),
        QueueEntry(itemId: "sea", lang: "es", stage: .review),
        QueueEntry(itemId: "sky", lang: "es", stage: .review),
    ]
    static func isNew(_ e: QueueEntry) -> Bool { ["dog", "sun"].contains(e.itemId) }
    static func isDue(_ e: QueueEntry) -> Bool { e.itemId == "cat" }
    static func trim(_ gate: LessonGate) -> [String] { LessonTrim.queue(queue, gate: gate, isNew: isNew, isDue: isDue).map(\.itemId) }

    @Test func openGateKeepsOnlyTheAllowedNewWords() {
        #expect(Self.trim(.open(newWords: 1, cards: 60)) == ["dog", "dog", "cat", "sea", "sky"])
        #expect(Self.trim(.open(newWords: 0, cards: 60)) == ["cat", "sea", "sky"])
        #expect(Self.trim(.open(newWords: .max, cards: .max)) == Self.queue.map(\.itemId))
    }

    @Test func sessionIsTrimmedToTheCardsLeft() {
        #expect(Self.trim(.open(newWords: 12, cards: 1)) == ["cat"])
        #expect(Self.trim(.open(newWords: 12, cards: 2)) == ["dog", "dog", "cat"])
        #expect(Self.trim(.open(newWords: 12, cards: 3)) == ["dog", "dog", "cat", "sun", "sun"])
        #expect(Self.trim(.open(newWords: 0, cards: 2)) == ["cat", "sea"])
        #expect(Self.trim(.open(newWords: 0, cards: 3)) == ["cat", "sea", "sky"])
    }

    @Test func reviewsOnlyKeepsDueCards() {
        #expect(Self.trim(.reviewsOnly) == ["cat"])
    }

    @Test func limitGateEmptiesTheSession() {
        #expect(Self.trim(.limit).isEmpty)
    }
}

@MainActor
@Suite struct DailyLedgerTests {
    @MainActor
    final class World {
        var now = Date(timeIntervalSince1970: 1_795_042_800)
        var tz = TimeZone(identifier: "America/Los_Angeles")!
        var outcome = AdOutcome.earned
        var ready = true
        var shown = 0
        var events: [(name: String, props: [String: JSONScalar])] = []
        var flags = BetaFlags()
        let vault = MemoryBudgetVault()

        func ledger(capped: Bool = true) -> DailyLedger {
            let l = DailyLedger(
                vault: vault,
                clock: { self.now },
                tz: { self.tz },
                flags: { self.flags },
                ad: { self.shown += 1; return self.outcome },
                adReady: { self.ready },
                log: { self.events.append(($0, $1)) }
            )
            l.capped = capped
            return l
        }

        func names() -> [String] { events.map(\.name) }
    }

    @Test func chargesPersistAndReload() {
        let w = World()
        let l = w.ledger()
        l.charge(newWords: 2, cards: 7)
        #expect(w.vault.load()?.cards == 7)
        let again = w.ledger()
        #expect(again.now.cards == 7)
        #expect(again.now.newWords == 2)
    }

    @Test func budgetSpendsAndReopensAtLocalMidnight() {
        let w = World()
        let l = w.ledger()
        l.charge(cards: 60)
        #expect(l.spent)
        #expect(l.gate(dueReviews: 0) == .limit)
        #expect(l.gate(dueReviews: 2) == .reviewsOnly)
        w.now = DailyBudget.resetsAt(w.now, tz: w.tz).addingTimeInterval(60)
        #expect(!l.spent)
        #expect(l.now.cards == 0)
    }

    @Test func clockMovedBackOneDayDoesNotReopenTheBudget() {
        let w = World()
        let l = w.ledger()
        l.charge(cards: 60)
        w.now = w.now.addingTimeInterval(-86_400)
        #expect(l.spent)
        #expect(w.ledger().spent)
    }

    @Test func clockSetFarForwardThenCorrectedFreesTheLearner() async {
        let w = World()
        let real = w.now
        w.now = real.addingTimeInterval(90 * 86_400)
        let l = w.ledger()
        l.charge(newWords: 12, cards: 60)
        l.markPlayed("atlas", title: "9000 points")
        _ = await l.retry("atlas")
        _ = await l.retry("atlas")
        #expect(l.spent)
        w.now = real
        #expect(!l.spent)
        #expect(l.now.cards == 0)
        #expect(!l.hasPlayed("atlas"))
        #expect(l.retryOffer("atlas") == .ad(left: 2))
        let reloaded = w.ledger()
        #expect(!reloaded.spent)
        reloaded.charge(cards: 4)
        #expect(w.vault.load()?.day == reloaded.today)
        #expect(w.vault.load()?.cards == 4)
    }

    @Test func travelOneDayBackAcrossTimeZonesKeepsTheCap() {
        let w = World()
        w.tz = TimeZone(identifier: "Asia/Tokyo")!
        let l = w.ledger()
        l.charge(cards: 60)
        let day = l.today
        w.tz = TimeZone(identifier: "Pacific/Honolulu")!
        #expect(l.today != day)
        #expect(l.spent)
        #expect(l.now.day == day)
        #expect(w.ledger().spent)
    }

    @Test func subscribersAreNeverSpentAndRetryWithoutAds() async {
        let w = World()
        let l = w.ledger(capped: false)
        l.charge(cards: 500)
        #expect(!l.spent)
        #expect(l.retryOffer("daily") == .free)
        let result = await l.retry("daily")
        #expect(result == .free)
        #expect(w.shown == 0)
        #expect(w.events.isEmpty)
        #expect(l.cardOffer == .free)
    }

    @Test func earnedAdGrantsTheRetryAndLogsBothEvents() async {
        let w = World()
        let l = w.ledger()
        #expect(l.retryOffer("daily") == .ad(left: 2))
        let result = await l.retry("daily")
        #expect(result == .ad)
        #expect(l.retryOffer("daily") == .ad(left: 1))
        #expect(w.names() == ["retry_ad_shown", "retry_granted"])
        #expect(w.events.last?.props["via"] == .string("ad"))
        #expect(w.events.last?.props["game"] == .string("daily"))
    }

    @Test func skippedAdGrantsNothing() async {
        let w = World()
        w.outcome = .skipped
        let l = w.ledger()
        let result = await l.retry("daily")
        #expect(result == .skipped)
        #expect(!result.granted)
        #expect(l.retryOffer("daily") == .ad(left: 2))
        #expect(w.names() == ["retry_ad_shown"])
    }

    @Test func failedAdStillGrantsAndLogsTheFallback() async {
        let w = World()
        w.outcome = .unavailable
        let l = w.ledger()
        let result = await l.retry("mini")
        #expect(result == .fallback)
        #expect(result.granted)
        #expect(l.retryOffer("mini") == .ad(left: 1))
        #expect(w.names() == ["retry_granted"])
        #expect(w.events.last?.props["via"] == .string("fallback"))
    }

    @Test func noReadyAdOffersAPlainRetryAndNeverCallsTheAd() async {
        let w = World()
        w.ready = false
        let l = w.ledger()
        #expect(l.retryOffer("daily") == .plain(left: 2))
        #expect(l.cardOffer == .plain(left: 2))
        let one = await l.retry("daily")
        let two = await l.retry("daily")
        let three = await l.retry("daily")
        #expect(one == .plain)
        #expect(two == .plain)
        #expect(three == .refused)
        #expect(w.shown == 0)
        #expect(l.retryOffer("daily") == .none)
        #expect(w.names() == ["retry_granted", "retry_granted"])
        #expect(w.events.last?.props["via"] == .string("plain"))
    }

    @Test func moreCardsReopensTheBudgetTwiceADay() async {
        let w = World()
        let l = w.ledger()
        l.charge(cards: 60)
        #expect(l.cardOffer == .ad(left: 2))
        let one = await l.moreCards(place: "lesson")
        #expect(one == .ad)
        #expect(!l.spent)
        l.charge(cards: 10)
        let two = await l.moreCards(place: "lesson")
        #expect(two.granted)
        l.charge(cards: 10)
        #expect(l.spent)
        #expect(l.cardOffer == .none)
        let three = await l.moreCards(place: "lesson")
        #expect(three == .refused)
        #expect(w.shown == 2)
        #expect(w.events.filter { $0.name == "retry_granted" }.allSatisfy { $0.props["for"] == .string("cards") })
    }

    @Test func retryWritesNothingButTheRetryCount() async {
        let w = World()
        let l = w.ledger()
        l.charge(cards: 6)
        l.markPlayed("shift", title: "3 of 4 found", shape: .marks([true, true, true, false]))
        let before = l.now
        _ = await l.retry("shift")
        l.markPlayed("shift", title: "4 of 4 found", shape: .marks([true, true, true, true]))
        #expect(l.now.cards == before.cards)
        #expect(l.first("shift")?.title == "3 of 4 found")
        #expect(l.first("shift")?.shape == before.first("shift", deck: l.deck("shift"))?.shape)
        #expect(l.first("shift")?.retries == 1)
    }

    @Test func utcDeckRollOpensANewFirstAttemptWhileTheLocalDayHolds() async {
        let w = World()
        let l = w.ledger()
        l.charge(cards: 12)
        let oldDeck = l.deck("atlas")
        l.markPlayed("atlas", title: "9000 points")
        _ = await l.retry("atlas")
        _ = await l.retry("atlas")
        #expect(l.retryOffer("atlas") == .none)
        let day = l.today
        w.now = w.now.addingTimeInterval(3 * 3600)
        #expect(l.today == day)
        #expect(l.deck("atlas") != oldDeck)
        #expect(!l.hasPlayed("atlas"))
        #expect(l.first("atlas") == nil)
        #expect(l.retryOffer("atlas") == .ad(left: 2))
        #expect(l.now.cards == 12)
        #expect(l.hasPlayed("atlas", deck: oldDeck))
        #expect(l.retryOffer("atlas", deck: oldDeck) == .none)
        l.markPlayed("atlas", title: "12000 points")
        #expect(l.first("atlas")?.title == "12000 points")
    }

    @Test func localMidnightKeepsTheUtcDeckPlayed() async {
        let w = World()
        w.tz = TimeZone(identifier: "Asia/Tokyo")!
        w.now = Date(timeIntervalSince1970: 1_795_010_400)
        let l = w.ledger()
        l.charge(cards: 60)
        l.markPlayed("flagTiles", title: "14 words")
        _ = await l.retry("flagTiles")
        let day = l.today
        let deck = l.deck("flagTiles")
        w.now = w.now.addingTimeInterval(3 * 3600)
        #expect(l.today != day)
        #expect(l.deck("flagTiles") == deck)
        #expect(!l.spent)
        #expect(l.hasPlayed("flagTiles"))
        #expect(l.first("flagTiles")?.title == "14 words")
        #expect(l.retryOffer("flagTiles") == .ad(left: 1))
    }

    @Test func limitAndPaywallEventsCarryThePlace() {
        let w = World()
        let l = w.ledger()
        l.charge(newWords: 3, cards: 60)
        l.limitHit("lesson")
        l.paywallTap("retry:daily")
        #expect(w.names() == ["limit_hit", "limit_paywall_tap"])
        #expect(w.events[0].props["place"] == .string("lesson"))
        #expect(w.events[0].props["cards"] == .number(60))
        #expect(w.events[1].props["from"] == .string("retry:daily"))
    }

    @Test func flagChangesMoveTheCapWithoutARelease() {
        let w = World()
        let l = w.ledger()
        l.charge(cards: 60)
        #expect(l.spent)
        w.flags = BetaFlags(values: ["daily_cards": "100"])
        #expect(!l.spent)
        w.flags = BetaFlags(values: ["daily_cards": "0"])
        #expect(l.spent)
        #expect(l.limits.cards == 60)
    }
}
