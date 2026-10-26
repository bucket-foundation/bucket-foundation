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
}

struct WatchGrade: Codable, Equatable {
    let card: WatchCard
    let rating: Int
}

enum WatchKeys {
    static let deck = "deck"
    static let grades = "grades"
}
