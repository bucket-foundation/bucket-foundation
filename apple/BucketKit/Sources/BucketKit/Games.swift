import Foundation

public struct GameWord: Sendable, Equatable, Identifiable {
    public var itemId: String
    public var lang: String
    public var form: String
    public var gloss: String
    public var root: String
    public var id: String { "\(lang):\(itemId)" }

    public init(itemId: String, lang: String, form: String, gloss: String, root: String) {
        self.itemId = itemId
        self.lang = lang
        self.form = form
        self.gloss = gloss
        self.root = root
    }
}

public enum GameWords {
    public static func learned(_ systems: [LangSystem], states: [String: EngineState], corpus: LangCorpus) -> [GameWord] {
        var seen = Set<String>()
        var out: [GameWord] = []
        for s in systems {
            let state = states[s.id] ?? EngineState()
            for key in state.cards.keys where state.cards.started(key) {
                let p = parseCardId(key)
                guard s.targets.contains(p.lang), let item = corpus.byId[p.itemId], isVocab(item),
                      let form = item.form(p.lang), let gloss = item.form(s.root) ?? Optional(item.gloss), form != gloss,
                      seen.insert(key).inserted else { continue }
                out.append(GameWord(itemId: item.id, lang: p.lang, form: form, gloss: gloss, root: s.root))
            }
        }
        return out
    }

    public static func starter(_ systems: [LangSystem], corpus: LangCorpus, perLang: Int = 12) -> [GameWord] {
        var out: [GameWord] = []
        for s in systems {
            for l in s.targets {
                let words = corpus.items.lazy.filter { isVocab($0) && usable($0, s.root, l) }
                    .compactMap { i -> GameWord? in
                        guard let f = i.form(l), let g = i.form(s.root) ?? Optional(i.gloss), f != g else { return nil }
                        return GameWord(itemId: i.id, lang: l, form: f, gloss: g, root: s.root)
                    }
                out.append(contentsOf: words.prefix(perLang))
            }
        }
        return out
    }

    public static func pick<R: RandomNumberGenerator>(_ words: [GameWord], count: Int, using rng: inout R) -> [GameWord] {
        var glosses = Set<String>()
        var forms = Set<String>()
        var out: [GameWord] = []
        for w in words.shuffled(using: &rng) where out.count < count {
            guard glosses.insert(w.gloss.lowercased()).inserted, forms.insert(w.form.lowercased()).inserted else { continue }
            out.append(w)
        }
        return out
    }
}

public struct MatchRound: Sendable, Equatable {
    public let words: [GameWord]
    public let right: [GameWord]
    public private(set) var solved: Set<String> = []
    public private(set) var picked: String?
    public private(set) var misses = 0

    public init<R: RandomNumberGenerator>(_ words: [GameWord], using rng: inout R) {
        self.words = words
        right = words.shuffled(using: &rng)
    }

    public enum Outcome: Equatable { case picked, matched, missed, ignored }

    public mutating func pickLeft(_ id: String) -> Outcome {
        guard !solved.contains(id) else { return .ignored }
        picked = id
        return .picked
    }

    public mutating func pickRight(_ id: String) -> Outcome {
        guard let left = picked, !solved.contains(id) else { return .ignored }
        picked = nil
        if left == id {
            solved.insert(id)
            return .matched
        }
        misses += 1
        return .missed
    }

    public var done: Bool { solved.count == words.count }
}

public struct MemoryBoard: Sendable, Equatable {
    public struct Tile: Sendable, Equatable, Identifiable {
        public let id: Int
        public let wordId: String
        public let text: String
        public let lang: String
        public let isForm: Bool
    }

    public let tiles: [Tile]
    public private(set) var open: [Int] = []
    public private(set) var found: Set<String> = []
    public private(set) var turns = 0

    public init<R: RandomNumberGenerator>(_ words: [GameWord], using rng: inout R) {
        let faces = words.flatMap { w in [(w.id, w.form, w.lang, true), (w.id, w.gloss, w.root, false)] }.shuffled(using: &rng)
        tiles = faces.enumerated().map { Tile(id: $0.offset, wordId: $0.element.0, text: $0.element.1, lang: $0.element.2, isForm: $0.element.3) }
    }

    public func isFaceUp(_ id: Int) -> Bool { open.contains(id) || found.contains(tiles[id].wordId) }

    public enum Outcome: Equatable { case flipped, matched, missed, ignored }

    public mutating func flip(_ id: Int) -> Outcome {
        guard tiles.indices.contains(id), !isFaceUp(id) else { return .ignored }
        if open.count == 2 { open = [] }
        open.append(id)
        guard open.count == 2 else { return .flipped }
        turns += 1
        let (a, b) = (tiles[open[0]], tiles[open[1]])
        if a.wordId == b.wordId {
            found.insert(a.wordId)
            open = []
            return .matched
        }
        return .missed
    }

    public mutating func hide() { open = [] }
    public var done: Bool { found.count * 2 == tiles.count }
}

public struct FlagRound: Sendable, Equatable {
    public let word: GameWord
    public let choices: [String]

    public init<R: RandomNumberGenerator>(word: GameWord, langs: [String], using rng: inout R) {
        self.word = word
        var pool = langs.filter { $0 != word.lang }.shuffled(using: &rng).prefix(3)
        pool.append(word.lang)
        choices = Array(pool).shuffled(using: &rng)
    }

    public func isRight(_ lang: String) -> Bool { lang == word.lang }
}

public struct SeededRandom: RandomNumberGenerator, Sendable {
    var state: UInt64

    public init(seed: UInt64) { state = seed == 0 ? 0x9E3779B97F4A7C15 : seed }

    public mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }
}
