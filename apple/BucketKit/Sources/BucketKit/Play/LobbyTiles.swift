import Foundation

public struct TileWord: Sendable, Equatable, Hashable {
    public let lang: String
    public let form: String

    public init(lang: String, form: String) {
        self.lang = lang
        self.form = form
    }

    public var key: String { "\(lang):\(form)" }
}

public struct TileRound: Sendable, Equatable {
    public let round: Int
    public let lang: String
    public let itemId: String
    public let gloss: String
    public let tiles: [TileWord]
    public let answer: [Int]
}

public struct TileOutcome: Sendable, Equatable {
    public let hits: Int
    public let wrong: Int
    public let missed: Int
    public var perfect: Bool { wrong == 0 && missed == 0 }
}

public enum LobbyTiles {
    public static let lives = 3
    public static let points = 50
    public static let minTiles = 5
    public static let maxTiles = 9
    public static let roundSeconds = 9

    public static func count(round: Int, rounds: Int) -> Int { min(maxTiles, minTiles + playRound(Double(maxTiles - minTiles) * Lanes.ramp(round: round, rounds: rounds))) }

    public static func outcome(answer: [Int], tapped: [Int]) -> TileOutcome {
        let right = Set(answer)
        let hits = tapped.filter(right.contains).count
        return TileOutcome(hits: hits, wrong: tapped.count - hits, missed: right.count - hits)
    }

    public static func combo(_ c: Int) -> Double { 1 + Double(min(c, 4)) * 0.5 }

    public static func score(_ o: TileOutcome, combo c: Int) -> Int {
        playRound(Double(max(0, o.hits - o.wrong) * points) * (o.perfect ? combo(c) : 1))
    }

    static func shuffled<T>(_ xs: [T], _ rand: () -> Double) -> [T] {
        var out = xs
        var i = out.count - 1
        while i > 0 {
            out.swapAt(i, Int((rand() * Double(i + 1)).rounded(.down)))
            i -= 1
        }
        return out
    }

    public static func deal(_ items: [LangItem], root: String, targets: [String], rounds: Int, langPool: [String], rand: () -> Double) -> [TileRound] {
        var seen = Set<String>()
        let langs = (targets + langPool).filter { seen.insert($0).inserted && $0 != root }
        let words = items.filter { $0.kind == .word && $0.form(root) != nil }
        let candidates = shuffled(Array(words.filter { i in targets.contains { l in i.form(l) != nil && i.form(l) != i.form(root) } }.prefix(600)), rand)
        var out: [TileRound] = []
        var used = Set<String>()
        for item in candidates {
            if out.count >= rounds { break }
            let gloss = item.form(root)!
            if used.contains(gloss.lowercased()) { continue }
            let round = out.count
            let n = count(round: round, rounds: rounds)
            let own = shuffled(langs.filter { item.form($0) != nil && item.form($0) != gloss }, rand)
            let rightCount = min(own.count, 2 + round * 3 / max(1, rounds))
            if rightCount < 1 { continue }
            let right = own.prefix(rightCount).map { TileWord(lang: $0, form: item.form($0)!) }
            var taken = Set(right.map(\.key))
            let ownForms = Set(item.forms.values.map { $0.lowercased() })
            var foils: [TileWord] = []
            for other in shuffled(Array(words.prefix(2000)), rand) {
                if foils.count >= n - right.count { break }
                if other.id == item.id || other.form(root)?.lowercased() == gloss.lowercased() { continue }
                let options = langs.filter { l in other.form(l).map { !ownForms.contains($0.lowercased()) } ?? false }
                if options.isEmpty { continue }
                let lang = options[Int((rand() * Double(options.count)).rounded(.down))]
                let t = TileWord(lang: lang, form: other.form(lang)!)
                if taken.contains(t.key) || t.key.utf16.count > 60 { continue }
                taken.insert(t.key)
                foils.append(t)
            }
            if foils.count < 2 { continue }
            let tiles = shuffled(right + foils, rand)
            let rightKeys = Set(right.map(\.key))
            used.insert(gloss.lowercased())
            out.append(TileRound(round: round, lang: right[0].lang, itemId: item.id, gloss: gloss, tiles: tiles, answer: tiles.indices.filter { rightKeys.contains(tiles[$0].key) }))
        }
        return out
    }
}
