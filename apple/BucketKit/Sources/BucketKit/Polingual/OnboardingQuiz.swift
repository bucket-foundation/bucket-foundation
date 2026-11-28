import Foundation

public enum QuizReason: String, CaseIterable, Codable, Sendable {
    case travel, family, work, school, culture, mind
}

public enum QuizLevel: String, CaseIterable, Codable, Sendable {
    case new, words, getBy = "get_by", talk
}

public enum QuizMinutes: Int, CaseIterable, Codable, Sendable {
    case five = 5, ten = 10, fifteen = 15, twenty = 20
}

public enum QuizTime: String, CaseIterable, Codable, Sendable {
    case morning, midday, evening, night

    public var minute: Int {
        switch self {
        case .morning: 8 * 60
        case .midday: 12 * 60 + 30
        case .evening: 18 * 60
        case .night: 21 * 60
        }
    }
}

public enum QuizDeadline: String, CaseIterable, Codable, Sendable {
    case month, quarter, half, year, open

    public static let fallback = QuizDeadline.quarter

    public var months: Int? {
        switch self {
        case .month: 1
        case .quarter: 3
        case .half: 6
        case .year: 12
        case .open: nil
        }
    }
}

public struct QuizAnswers: Codable, Equatable, Sendable {
    public static let key = "polingual.quiz"

    public var reason: QuizReason?
    public var level: QuizLevel?
    public var minutes: QuizMinutes?
    public var time: QuizTime?
    public var deadline: QuizDeadline?

    public init(reason: QuizReason? = nil, level: QuizLevel? = nil, minutes: QuizMinutes? = nil, time: QuizTime? = nil, deadline: QuizDeadline? = nil) {
        self.reason = reason
        self.level = level
        self.minutes = minutes
        self.time = time
        self.deadline = deadline
    }

    public static func load(_ defaults: UserDefaults = .standard) -> QuizAnswers {
        defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(QuizAnswers.self, from: $0) } ?? QuizAnswers()
    }

    public func save(_ defaults: UserDefaults = .standard) {
        if let data = try? JSONEncoder().encode(self) { defaults.set(data, forKey: Self.key) }
    }
}

public struct PersonalPlan: Equatable, Sendable {
    public static let retention = 0.9

    public let languages: Int
    public let minutes: Int
    public let deadline: QuizDeadline
    public let until: Date
    public let days: Int
    public let wordsPerLanguage: Int
    public let reminderMinute: Int?

    public var newToday: Int { Lang.newPerLangPerDay * languages }
    public var words: Int { wordsPerLanguage * languages }

    public init(_ answers: QuizAnswers, languages: Int, now: Date, calendar: Calendar = .current) {
        self.languages = max(0, languages)
        minutes = (answers.minutes ?? .ten).rawValue
        let picked = answers.deadline ?? .open
        deadline = picked.months == nil ? .fallback : picked
        let start = calendar.startOfDay(for: now)
        until = calendar.date(byAdding: .month, value: deadline.months ?? 3, to: start) ?? start
        days = max(0, calendar.dateComponents([.day], from: start, to: until).day ?? 0)
        wordsPerLanguage = ExpectedLearning.items(newPerDay: Double(Lang.newPerLangPerDay), retention: Self.retention, days: days)
        reminderMinute = answers.time?.minute
    }
}
