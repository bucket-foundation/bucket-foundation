import Foundation

public struct ListenCard: Equatable, Sendable, Hashable {
    public let text: String
    public let lang: String
    public let meaning: String
    public let meaningLang: String

    public init(text: String, lang: String, meaning: String, meaningLang: String) {
        self.text = text
        self.lang = lang
        self.meaning = meaning
        self.meaningLang = meaningLang
    }
}

public enum ListenStep: Equatable, Sendable {
    case say(text: String, lang: String)
    case wait(Double)
}

public struct ListenQueue: Equatable, Sendable {
    public static let limit = 40
    public static let gap: Double = 1.5
    public static let afterMeaning: Double = 2.5

    public private(set) var cards: [ListenCard]
    public private(set) var index: Int

    public init(cards: [ListenCard], start: Int = 0) {
        self.cards = cards
        index = cards.isEmpty ? 0 : min(max(start, 0), cards.count - 1)
    }

    public init(words: [GameWord], limit: Int = ListenQueue.limit) {
        var seen = Set<String>()
        let picked = words
            .sorted { $0.rank < $1.rank }
            .filter { !$0.form.isEmpty && !$0.gloss.isEmpty && $0.form != $0.gloss }
            .filter { seen.insert($0.id).inserted }
            .prefix(max(limit, 0))
            .map { ListenCard(text: $0.form, lang: $0.lang, meaning: $0.gloss, meaningLang: $0.root) }
        self.init(cards: Array(picked))
    }

    public var isEmpty: Bool { cards.isEmpty }
    public var current: ListenCard? { cards.indices.contains(index) ? cards[index] : nil }
    public var hasNext: Bool { index + 1 < cards.count }
    public var hasPrevious: Bool { index > 0 }
    public var position: (number: Int, count: Int) { (cards.isEmpty ? 0 : index + 1, cards.count) }

    @discardableResult
    public mutating func next(wrap: Bool = true) -> Bool {
        guard !cards.isEmpty else { return false }
        if hasNext {
            index += 1
            return true
        }
        guard wrap else { return false }
        index = 0
        return true
    }

    @discardableResult
    public mutating func previous() -> Bool {
        guard hasPrevious else { return false }
        index -= 1
        return true
    }

    public var steps: [ListenStep] {
        guard let c = current else { return [] }
        return [.say(text: c.text, lang: c.lang), .wait(Self.gap), .say(text: c.meaning, lang: c.meaningLang), .wait(Self.afterMeaning)]
    }
}
