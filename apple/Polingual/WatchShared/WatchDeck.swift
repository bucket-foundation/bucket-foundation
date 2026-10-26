import Foundation

struct WatchAnswer: Codable, Equatable, Hashable {
    let lang: String
    let form: String
}

struct WatchCard: Codable, Equatable, Identifiable {
    let id: String
    let systemId: String
    let itemId: String
    let lang: String
    let prompt: String
    let answer: WatchAnswer
    var due: Double?
}

struct WatchGrade: Codable, Equatable {
    let card: WatchCard
    let rating: Int
    var at: Double?
}

enum WatchQueue {
    static let pendingKey = "watch.pendingGrades"
    static let gradedKey = "watch.gradedCards"

    static func fresh(_ grades: [WatchGrade], lastReview: (WatchGrade) -> Double?) -> [WatchGrade] {
        grades.filter { g in
            guard let at = g.at, let last = lastReview(g) else { return true }
            return at > last
        }
    }

    static func pending(_ defaults: UserDefaults) -> [WatchGrade] {
        defaults.data(forKey: pendingKey).flatMap { try? JSONDecoder().decode([WatchGrade].self, from: $0) } ?? []
    }

    static func enqueue(_ grades: [WatchGrade], _ defaults: UserDefaults) {
        defaults.set(try? JSONEncoder().encode(pending(defaults) + grades), forKey: pendingKey)
    }

    static func drain(_ defaults: UserDefaults, ready: Bool) -> [WatchGrade] {
        guard ready else { return [] }
        let all = pending(defaults)
        defaults.removeObject(forKey: pendingKey)
        return all
    }

    static func oldestDue(_ cards: [WatchCard], now: Double, limit: Int) -> [WatchCard] {
        Array(cards.filter { ($0.due ?? .infinity) <= now }.sorted { ($0.due ?? 0, $0.id) < ($1.due ?? 0, $1.id) }.prefix(limit))
    }

    static func unseen(_ deck: [WatchCard], graded: Set<String>) -> (cards: [WatchCard], graded: Set<String>) {
        let ids = Set(deck.map(\.id))
        let kept = graded.intersection(ids)
        return (deck.filter { !kept.contains($0.id) }, kept)
    }
}

enum WatchKeys {
    static let deck = "deck"
    static let grades = "grades"
}
