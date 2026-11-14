import Foundation

public struct ExpectedLearning: Equatable, Sendable {
    public struct Track: Equatable, Sendable {
        public let newPerDay: Double
        public let retention: Double
        public let languages: Int

        public init(newPerDay: Double, retention: Double, languages: Int) {
            self.newPerDay = newPerDay
            self.retention = retention
            self.languages = languages
        }

        public init(_ state: EngineState, languages: Int = 1) {
            self.init(newPerDay: state.newPerDay, retention: state.requestRetention, languages: languages)
        }
    }

    public let words: Int
    public let concepts: Int

    public static func items(newPerDay: Double, retention: Double, days: Int) -> Int {
        guard newPerDay.isFinite, retention.isFinite, days > 0 else { return 0 }
        return Int((max(0, newPerDay) * Double(days) * min(1, max(0, retention))).rounded())
    }

    public init(streak: Int, languages: [Track], decks: [Track]) {
        words = languages.reduce(0) { $0 + Self.items(newPerDay: $1.newPerDay, retention: $1.retention, days: streak) * max(0, $1.languages) }
        concepts = decks.reduce(0) { $0 + Self.items(newPerDay: $1.newPerDay, retention: $1.retention, days: streak) }
    }

    public var isEmpty: Bool { words == 0 && concepts == 0 }
}
