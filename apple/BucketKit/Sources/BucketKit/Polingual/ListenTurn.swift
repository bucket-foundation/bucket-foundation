import Foundation

public struct ListenTurn: Equatable, Sendable {
    public enum Part: Equatable, Sendable { case word, meaning }

    public enum Cue: Equatable, Sendable {
        case show(card: Int)
        case lookahead(after: Int)
    }

    struct Entry: Equatable, Sendable {
        let id: UUID
        let card: Int
        let part: Part
    }

    private(set) var entries: [Entry] = []

    public init() {}

    public var isEmpty: Bool { entries.isEmpty }
    public var queuedCards: [Int] { entries.filter { $0.part == .word }.map(\.card) }

    public mutating func enqueue(card: Int, word: UUID, meaning: UUID) {
        entries += [Entry(id: word, card: card, part: .word), Entry(id: meaning, card: card, part: .meaning)]
    }

    public mutating func clear() { entries = [] }

    public func started(_ id: UUID) -> Cue? {
        guard let e = entries.first(where: { $0.id == id }) else { return nil }
        switch e.part {
        case .word: return .show(card: e.card)
        case .meaning: return queuedCards.contains { $0 != e.card } ? nil : .lookahead(after: e.card)
        }
    }

    public mutating func finished(_ id: UUID) -> Int? {
        guard let i = entries.firstIndex(where: { $0.id == id }) else { return nil }
        let e = entries[i]
        guard e.part == .meaning else { return nil }
        entries.removeFirst(i + 1)
        return e.card
    }
}
