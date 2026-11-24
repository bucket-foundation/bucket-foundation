import Foundation

public struct LookupRuns<Run: Hashable & Sendable>: Sendable {
    private var runs: [String: [String: Run]] = [:]

    public init() {}

    public func running(word: String, lang: String) -> [String: Run] {
        runs[Self.key(word, lang)] ?? [:]
    }

    public mutating func start(_ run: Run, word: String, lang: String, targets: [String]) {
        let key = Self.key(word, lang)
        var open = runs[key] ?? [:]
        for target in targets { open[target] = run }
        runs[key] = open
    }

    public mutating func finish(_ run: Run, word: String, lang: String) {
        let key = Self.key(word, lang)
        guard var open = runs[key] else { return }
        open = open.filter { $0.value != run }
        runs[key] = open.isEmpty ? nil : open
    }

    private static func key(_ word: String, _ lang: String) -> String {
        lang + "\u{1F}" + word
    }
}
