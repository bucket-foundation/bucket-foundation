import Foundation
import Testing
@testable import BucketKit

@Suite struct StreakDayTests {
    let utc = TimeZone(identifier: "UTC")!
    let now = 1_700_000_000_000.0
    let day = 86_400_000.0

    func state(_ streak: Double, last: Double?) -> EngineState {
        var s = EngineState()
        s.streak = streak
        s.lastStudyDay = last.map { dayKey($0, tz: utc) }
        return s
    }

    @Test func aPendingDayShowsTheDayInPlay() {
        let g = StreakGoal(streak: 27, pending: true)
        #expect(g.day == 27 && g.today == 28 && g.pending)
        #expect(g.left == 73 && g.fraction == 0.27)
        #expect(StreakGoal(streak: 27).today == 27)
        let fresh = StreakGoal(streak: 0, pending: true)
        #expect(!fresh.pending && fresh.today == 0)
        let last = StreakGoal(streak: 99, pending: true)
        #expect(last.today == StreakGoal.target && last.todayReached && !last.reached)
        #expect(!StreakGoal(streak: 98, pending: true).todayReached)
    }

    @Test func theFlameLightsOnlyAfterTodayCounts() {
        #expect(!StreakGoal(streak: 28, pending: true).lit)
        #expect(StreakGoal(streak: 29).lit)
        #expect(!StreakGoal(streak: 0).lit && !StreakGoal(streak: 0, pending: true).lit)
    }

    @Test func yesterdaysStreakIsPendingUntilTodayCounts() {
        let before = LiveStreak([state(27, last: now - day)], now: now, tz: utc)
        #expect(before.days == 27 && !before.countsToday && before.pending)
        let after = LiveStreak([state(28, last: now)], now: now, tz: utc)
        #expect(after.days == 28 && after.countsToday && !after.pending)
    }

    @Test func theLongestLiveStreakDecidesWhetherTodayCounts() {
        let mixed = LiveStreak([state(27, last: now - day), state(3, last: now)], now: now, tz: utc)
        #expect(mixed.days == 27 && mixed.pending)
        let tied = LiveStreak([state(28, last: now), state(28, last: now - day)], now: now, tz: utc)
        #expect(tied.days == 28 && !tied.pending)
        let broken = LiveStreak([state(40, last: now - 3 * day)], now: now, tz: utc)
        #expect(broken.days == 0 && !broken.pending)
        #expect(!LiveStreak([], now: now, tz: utc).pending)
    }
}
