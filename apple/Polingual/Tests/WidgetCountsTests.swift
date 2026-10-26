import BucketKit
import Foundation
import Testing
@testable import Polingual

struct WidgetCountsTests {
    var utc: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }

    let noon = Date(timeIntervalSince1970: 1_761_566_400)

    func studied(_ day: Date, streak: Double) -> EngineState {
        var st = EngineState()
        st.streak = streak
        st.lastStudyDay = dayKey(day.timeIntervalSince1970 * 1000, tz: TimeZone(identifier: "UTC")!)
        return st
    }

    @Test func dueClimbsAsCardsComeDueAndNewResetsAtMidnight() {
        let ms = noon.timeIntervalSince1970 * 1000
        let plan = WidgetPlan.counts(dueNow: 3, dueLater: [ms + 3_600_000, ms + 7_200_000, ms - 60_000, ms + 3 * 86_400_000], newToday: 2, newTomorrow: 15,
                                     states: [studied(noon, streak: 4)], now: noon, calendar: utc)
        #expect(plan.dueAt.count == 2)
        let snap = WidgetSnapshot(streak: plan.streak, due: plan.due, newToday: plan.newToday, words: [], gloss: "", updated: noon,
                                  dueAt: plan.dueAt, newTomorrow: plan.newTomorrow, dayEnds: plan.dayEnds, streakUntil: plan.streakUntil)
        #expect(snap.counts(at: noon) == WidgetCounts(streak: 4, due: 3, new: 2))
        #expect(snap.counts(at: noon.addingTimeInterval(3_700)).due == 4)
        #expect(snap.counts(at: noon.addingTimeInterval(7_300)).due == 5)
        #expect(snap.counts(at: noon.addingTimeInterval(12 * 3600 + 1)).new == 15)
        #expect(snap.changes(after: noon).count == 3)
    }

    @Test func aStreakEndsAfterTheFirstDayWithoutStudy() {
        let yesterday = noon.addingTimeInterval(-86_400)
        let plan = WidgetPlan.counts(dueNow: 0, dueLater: [], newToday: 0, newTomorrow: 0, states: [studied(yesterday, streak: 9)], now: noon, calendar: utc)
        #expect(plan.streak == 9)
        #expect(plan.streakUntil == utc.date(byAdding: .day, value: 1, to: utc.startOfDay(for: noon)))
        let today = WidgetPlan.counts(dueNow: 0, dueLater: [], newToday: 0, newTomorrow: 0, states: [studied(noon, streak: 10)], now: noon, calendar: utc)
        #expect(today.streakUntil == utc.date(byAdding: .day, value: 2, to: utc.startOfDay(for: noon)))
        let lapsed = WidgetPlan.counts(dueNow: 0, dueLater: [], newToday: 0, newTomorrow: 0, states: [studied(noon.addingTimeInterval(-3 * 86_400), streak: 9)], now: noon, calendar: utc)
        #expect(lapsed.streak == 0 && lapsed.streakUntil == nil)
        let snap = WidgetSnapshot(streak: plan.streak, due: 0, newToday: 0, words: [], gloss: "", updated: noon, streakUntil: plan.streakUntil)
        #expect(snap.counts(at: noon).streak == 9)
        #expect(snap.counts(at: noon.addingTimeInterval(12 * 3600 + 1)).streak == 0)
    }

    @Test func anOldSnapshotWithoutTheNewFieldsStillDecodes() throws {
        let old = #"{"streak":2,"due":1,"newToday":3,"words":[],"gloss":"night","updated":0}"#
        let snap = try JSONDecoder().decode(WidgetSnapshot.self, from: Data(old.utf8))
        #expect(snap.counts(at: .now) == WidgetCounts(streak: 2, due: 1, new: 3))
    }
}
