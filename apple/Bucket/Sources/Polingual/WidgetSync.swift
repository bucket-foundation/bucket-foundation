import BucketKit
import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

struct WidgetExtra {
    var dueNow = 0
    var dueLater: [Double] = []
    var newToday = 0
    var newTomorrow = 0
    var states: [EngineState] = []
}

enum WidgetPlan {
    static func counts(dueNow: Int, dueLater: [Double], newToday: Int, newTomorrow: Int, states: [EngineState], now: Date, calendar: Calendar = .current) -> (streak: Int, due: Int, newToday: Int, newTomorrow: Int, dueAt: [Date], dayEnds: Date, streakUntil: Date?) {
        let ms = now.timeIntervalSince1970 * 1000
        let today = calendar.startOfDay(for: now)
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today) ?? now.addingTimeInterval(86_400)
        let horizon = ms + 2 * DAY_MS
        let dueAt = dueLater.filter { $0 > ms && $0 <= horizon }.sorted().prefix(300).map { Date(timeIntervalSince1970: $0 / 1000) }
        let streak = states.map { liveStreak($0, now: ms, tz: calendar.timeZone) }.max() ?? 0
        let studiedToday = states.contains { $0.lastStudyDay == dayKey(ms, tz: calendar.timeZone) }
        let until: Date? = streak > 0 ? (studiedToday ? calendar.date(byAdding: .day, value: 1, to: tomorrow) : tomorrow) : nil
        return (Int(streak), dueNow, newToday, newTomorrow, Array(dueAt), tomorrow, until)
    }
}

@MainActor
enum WidgetSync {
    static func refresh(_ store: LangStore, extra: WidgetExtra = WidgetExtra(), now: Date = .now) {
        let ms = now.timeIntervalSince1970 * 1000
        let tomorrowMs = (Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now).timeIntervalSince1970 * 1000 + 3_600_000
        var dueNow = extra.dueNow
        var dueLater = extra.dueLater
        var newToday = extra.newToday
        var newTomorrow = extra.newTomorrow
        if let corpus = store.corpus {
            for s in store.systems {
                let state = store.state(s.id)
                dueNow += systemSummary(s, corpus, state, now: ms).due
                newToday += langNewLeft(s, state, now: ms)
                newTomorrow += langNewLeft(s, state, now: tomorrowMs)
            }
            dueLater += langDue(store).map(\.due).filter { $0 > ms }
        }
        let c = WidgetPlan.counts(dueNow: dueNow, dueLater: dueLater, newToday: newToday, newTomorrow: newTomorrow,
                                  states: store.systems.map { store.state($0.id) } + extra.states, now: now)
        var words: [WidgetWord] = []
        var gloss = ""
        if let corpus = store.corpus, let system = store.systems.first {
            let word = wordOfDay(system, corpus, store.state(system.id), day: dayKey(ms))
            words = system.targets.compactMap { l in word?.form(l).map { WidgetWord(lang: l, form: $0) } }
            gloss = word?.form(system.root) ?? ""
        }
        WidgetSnapshot(streak: c.streak, due: c.due, newToday: c.newToday, words: words, gloss: gloss, updated: now,
                       dueAt: c.dueAt, newTomorrow: c.newTomorrow, dayEnds: c.dayEnds, streakUntil: c.streakUntil).write()
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}
