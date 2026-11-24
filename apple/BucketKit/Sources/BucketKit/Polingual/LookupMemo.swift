import Foundation

public struct LookupMemo: Sendable {
    public struct Entry: Sendable, Equatable {
        public var asked: Set<String> = []
        public var found: [String: String] = [:]

        public init() {}
    }

    public let capacity: Int
    private var entries: [String: Entry] = [:]
    private var order: [String] = []

    public init(capacity: Int) {
        self.capacity = max(1, capacity)
    }

    public func entry(word: String, lang: String) -> Entry {
        entries[Self.key(word, lang)] ?? Entry()
    }

    public mutating func record(word: String, lang: String, asked: [String], rows: [String: String]) {
        let key = Self.key(word, lang)
        var entry = entries[key] ?? Entry()
        entry.asked.formUnion(asked)
        entry.found.merge(rows) { kept, _ in kept }
        entries[key] = entry
        order.removeAll { $0 == key }
        order.append(key)
        while order.count > capacity {
            entries[order.removeFirst()] = nil
        }
    }

    private static func key(_ word: String, _ lang: String) -> String {
        lang + "\u{1F}" + word
    }
}
