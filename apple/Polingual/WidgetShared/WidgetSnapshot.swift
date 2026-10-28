import Foundation

struct WidgetWord: Codable, Equatable {
    let lang: String
    let form: String
}

struct WidgetCounts: Equatable {
    let streak: Int
    let due: Int
    let new: Int
}

struct WidgetSnapshot: Codable, Equatable {
    #if BUCKET
    static let group = "group.foundation.bucket.app"
    #else
    static let group = "group.com.polingual.app"
    #endif
    static let key = "widget.snapshot"

    var streak: Int
    var due: Int
    var newToday: Int
    var words: [WidgetWord]
    var gloss: String
    var updated: Date
    var dueAt: [Date]?
    var newTomorrow: Int?
    var dayEnds: Date?
    var streakUntil: Date?

    static let placeholder = WidgetSnapshot(streak: 12, due: 8, newToday: 4, words: [WidgetWord(lang: "fr", form: "nuit"), WidgetWord(lang: "es", form: "noche"), WidgetWord(lang: "it", form: "notte")], gloss: "night", updated: .now)

    func counts(at date: Date) -> WidgetCounts {
        let later = (dueAt ?? []).filter { $0 <= date }.count
        let newDay = dayEnds.map { date >= $0 } ?? false
        let alive = streakUntil.map { date < $0 } ?? true
        return WidgetCounts(streak: alive ? streak : 0, due: due + later, new: newDay ? newTomorrow ?? newToday : newToday)
    }

    func changes(after date: Date, limit: Int = 40) -> [Date] {
        let horizon = date.addingTimeInterval(86_400)
        var times = (dueAt ?? []).filter { $0 > date && $0 <= horizon }
        for t in [dayEnds, streakUntil].compactMap({ $0 }) where t > date && t <= horizon { times.append(t) }
        var seen = Set<Int>()
        return Array(times.sorted().filter { seen.insert(Int($0.timeIntervalSince1970 / 60)).inserted }.prefix(limit))
    }

    static func read() -> WidgetSnapshot? {
        guard let data = UserDefaults(suiteName: group)?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    func write() {
        UserDefaults(suiteName: Self.group)?.set(try? JSONEncoder().encode(self), forKey: Self.key)
    }
}
