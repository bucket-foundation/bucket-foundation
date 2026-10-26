import Foundation

public struct ReviewForecast: Sendable, Equatable {
    public let count: Int
    public let example: String?
    public let streak: Int

    public init(count: Int, example: String?, streak: Int) {
        self.count = count
        self.example = example
        self.streak = streak
    }
}

public enum ReminderPlan {
    public static let quietAfterDays = 7

    public static func fireDates(now: Date, minute: Int, lastStudy: Date?, calendar cal: Calendar = .current) -> [Date] {
        let start = cal.startOfDay(for: now)
        let studiedToday = lastStudy.map { cal.isDate($0, inSameDayAs: now) } ?? false
        let quietFrom = cal.date(byAdding: .day, value: quietAfterDays, to: cal.startOfDay(for: lastStudy ?? now)) ?? now
        return (0...quietAfterDays).compactMap { k -> Date? in
            guard let day = cal.date(byAdding: .day, value: k, to: start), let fire = cal.date(bySettingHour: minute / 60, minute: minute % 60, second: 0, of: day) else { return nil }
            if fire <= now || (k == 0 && studiedToday) || fire >= quietFrom { return nil }
            return fire
        }
    }

    public static func forecast(due: [(due: Double, label: String?)], at date: Date, streak: Int) -> ReviewForecast {
        let t = date.timeIntervalSince1970 * 1000
        let ready = due.filter { $0.due <= t }
        let first = ready.filter { $0.label != nil }.min { $0.due < $1.due }
        return ReviewForecast(count: ready.count, example: first?.label, streak: streak)
    }

    public static func median(_ minutes: [Int], fallback: Int) -> Int {
        let m = minutes.sorted()
        return m.isEmpty ? fallback : m[m.count / 2]
    }

    public static func message(_ f: ReviewForecast) -> String {
        let lead: String
        if f.count == 0 {
            lead = "New words are ready. Five minutes today keeps the habit."
        } else if let ex = f.example, f.count == 1 {
            lead = "\(ex) is due. One quick review keeps it."
        } else if let ex = f.example {
            lead = "\(ex) and \(f.count - 1) more are due. A few minutes keeps them in long-term memory."
        } else {
            lead = "\(f.count) reviews are due. A few minutes keeps them in long-term memory."
        }
        return f.streak > 0 ? "\(lead) Your streak is \(f.streak) \(f.streak == 1 ? "day" : "days")." : lead
    }
}
