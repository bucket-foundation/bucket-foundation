import Foundation

public enum PlayDecks {
    public static let root = "en"

    public static func root(_ learnerRoot: String?, items: [LangItem], min: Int = 200) -> String {
        guard let r = learnerRoot, (2...3).contains(r.unicodeScalars.count), r.unicodeScalars.allSatisfy({ (97...122).contains($0.value) }) else { return root }
        return items.lazy.filter { $0.kind == .word && $0.form(r) != nil }.count >= min ? r : root
    }

    public static func deckDay(_ now: Date = Date()) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let c = cal.dateComponents([.year, .month, .day], from: now)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    public static func langsWithoutRoot(_ langs: [String]?, root: String, min: Int = 2, max: Int = 4) -> [String]? {
        guard let langs else { return nil }
        let out = langs.filter { $0 != root }
        return (min...max).contains(out.count) ? out : nil
    }
}

public struct BoardRow: Sendable, Equatable, Hashable {
    public let name: String
    public let score: Int
    public let me: Bool

    public init(name: String, score: Int, me: Bool) {
        self.name = name
        self.score = score
        self.me = me
    }
}

public enum Boards {
    public static func withYou(_ others: [BoardRow], you: Int) -> [BoardRow] { stableSorted(others + [BoardRow(name: "You", score: you, me: true)], by: \.score, descending: true) }

    public static func named(flag: String, name: String, score: Int) -> BoardRow { BoardRow(name: "\(Bots.countryFlag(flag)) \(name)", score: score, me: false) }

    public static func fromGhosts(_ ghosts: [Ghost], you: Int) -> [BoardRow] { withYou(ghosts.map { named(flag: $0.flag, name: $0.name, score: $0.score) }, you: you) }
}

public enum PlayLookup {
    public static func word(_ words: [PlayWord], lang: String, form: String, slug: String? = nil) -> PlayWord? {
        words.first { (slug != nil && $0.slug == slug) || $0.form(lang)?.word.lowercased() == form.lowercased() }
    }
}

public enum DealSeeds {
    public static func fresh(_ random: () -> Double = { Double.random(in: 0..<1) }) -> String { String(1 + Int64(random() * 1e12)) }

    public static func ensure(_ saved: String, _ random: () -> Double = { Double.random(in: 0..<1) }) -> String { saved.isEmpty ? fresh(random) : saved }
}

public enum ForeheadRules {
    public static func toggle(_ langs: [String], _ l: String) -> [String] {
        if langs.contains(l) { return langs.filter { $0 != l } }
        return langs.count >= 6 ? langs : langs + [l]
    }
}
