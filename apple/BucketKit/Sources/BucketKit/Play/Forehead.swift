import Foundation

public struct ForeheadCard: Sendable, Equatable {
    public let lang: String
    public let form: String
    public let meaning: String
    public let reading: Reading?
    public let itemId: String
}

public enum ForeheadDeck {
    public static let cards = 60
    public static let seconds = 60

    public static func deck(_ items: [LangItem], langs: [String], seed: String, root: String = "en", size: Int = cards) -> [ForeheadCard] {
        var rand = WebRandom(seed)
        let pool = items.filter { i in i.kind == .word && i.form(root) != nil && langs.contains { l in i.form(l) != nil && i.form(l) != i.form(root) } }
        let order = rand.shuffled(pool)
        var out: [ForeheadCard] = []
        var used = Set<String>()
        for item in order {
            if out.count >= size { break }
            let r = item.form(root)!
            if used.contains(r.lowercased()) { continue }
            let options = langs.filter { item.form($0) != nil && item.form($0) != r }
            let k = Int((rand.next() * Double(options.count)).rounded(.down))
            guard options.indices.contains(k) else { continue }
            let lang = options[k]
            if item.form(lang)!.utf16.count > 24 { continue }
            used.insert(r.lowercased())
            out.append(ForeheadCard(lang: lang, form: item.form(lang)!, meaning: r, reading: item.readings[lang], itemId: item.id))
        }
        return out
    }
}

public enum Tilt: Sendable, Equatable { case score, pass }

public enum TiltRules {
    public static let trigger = 6.0
    public static let reset = 3.0

    public static func classify(_ z: Double?) -> Tilt? {
        guard let z else { return nil }
        if z <= -trigger { return .score }
        if z >= trigger { return .pass }
        return nil
    }

    public static func settled(_ z: Double?) -> Bool { z.map { abs($0) <= reset } ?? false }
}
