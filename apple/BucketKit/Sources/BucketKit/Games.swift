import Foundation

public struct GameWord: Codable, Sendable, Equatable, Hashable, Identifiable {
    public var itemId: String
    public var lang: String
    public var form: String
    public var gloss: String
    public var root: String
    public var rank: Int
    public var id: String { cardId(lang, itemId) }

    public init(itemId: String, lang: String, form: String, gloss: String, root: String, rank: Int = 2) {
        self.itemId = itemId
        self.lang = lang
        self.form = form
        self.gloss = gloss
        self.root = root
        self.rank = rank
    }
}

public enum GameWords {
    public static let missedRank = 0
    public static let dueRank = 1
    public static let heldRank = 2
    public static let starterRank = 3

    public static func learned(_ systems: [LangSystem], states: [String: EngineState], corpus: LangCorpus, now: Double = 0) -> [GameWord] {
        var seen = Set<String>()
        var out: [GameWord] = []
        for s in systems {
            let state = states[s.id] ?? EngineState()
            let missed = Set(GameLedger(state).pending(state))
            for key in state.cards.keys where state.cards.started(key) {
                let p = parseCardId(key)
                guard s.targets.contains(p.lang), let item = corpus.byId[p.itemId], isVocab(item),
                      let form = item.form(p.lang), let gloss = item.form(s.root) ?? Optional(item.gloss), form != gloss,
                      seen.insert(key).inserted else { continue }
                let due = (state.cards[key]?.due ?? .infinity) <= now
                let rank = missed.contains(key) ? missedRank : due ? dueRank : heldRank
                out.append(GameWord(itemId: item.id, lang: p.lang, form: form, gloss: gloss, root: s.root, rank: rank))
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
                        return GameWord(itemId: i.id, lang: l, form: f, gloss: g, root: s.root, rank: starterRank)
                    }
                out.append(contentsOf: words.prefix(perLang))
            }
        }
        return out
    }

    public static func ordered<R: RandomNumberGenerator>(_ words: [GameWord], using rng: inout R) -> [GameWord] {
        var tiers: [Int: [GameWord]] = [:]
        for w in words { tiers[w.rank, default: []].append(w) }
        var out: [GameWord] = []
        for rank in tiers.keys.sorted() { out += mixed(tiers[rank]!, using: &rng) }
        return out
    }

    public static func balanced(_ words: [GameWord]) -> [GameWord] {
        var langs: [String] = []
        var queues: [String: ArraySlice<GameWord>] = [:]
        for w in words {
            if queues[w.lang] == nil { langs.append(w.lang) }
            queues[w.lang, default: []].append(w)
        }
        var turns: [GameWord] = []
        while turns.count < words.count {
            for l in langs {
                if let w = queues[l]?.popFirst() { turns.append(w) }
            }
        }
        return turns.enumerated().sorted { (min($0.element.rank, heldRank), $0.offset) < (min($1.element.rank, heldRank), $1.offset) }.map(\.element)
    }
}

func mixed<T, R: RandomNumberGenerator>(_ xs: [T], using rng: inout R) -> [T] {
    var a = xs
    var i = a.count - 1
    while i > 0 {
        a.swapAt(i, Int(rng.next() % UInt64(i + 1)))
        i -= 1
    }
    return a
}

public struct GameDeck: Sendable {
    public struct Entry: Sendable, Equatable {
        public let itemId: String
        public let form: String
        public let gloss: String
        public let category: String
    }

    public let root: String
    public let targets: [String]
    let pools: [String: [Entry]]
    let index: [String: [String: Entry]]

    public init(_ corpus: LangCorpus, root: String, targets: [String]) {
        self.root = root
        self.targets = targets
        var pools: [String: [Entry]] = [:]
        var index: [String: [String: Entry]] = [:]
        for l in targets {
            let entries = corpus.items.filter { $0.kind == .word && usable($0, root, l) }.compactMap { i -> Entry? in
                guard let f = i.form(l), let g = i.form(root), f != g else { return nil }
                return Entry(itemId: i.id, form: f, gloss: g, category: i.category)
            }
            pools[l] = entries
            index[l] = Dictionary(entries.map { ($0.itemId, $0) }) { first, _ in first }
        }
        self.pools = pools
        self.index = index
    }

    public func word(_ itemId: String, _ lang: String) -> GameWord? {
        index[lang]?[itemId].map { GameWord(itemId: $0.itemId, lang: lang, form: $0.form, gloss: $0.gloss, root: root) }
    }

    public func foils<R: RandomNumberGenerator>(for word: GameWord, also: [String] = [], count: Int = 3, using rng: inout R) -> [String] {
        let pool = pools[word.lang] ?? []
        let category = index[word.lang]?[word.itemId]?.category
        let form = word.form.lowercased(), gloss = word.gloss.lowercased(), size = word.form.count, first = word.form.first
        let close = pool.lazy.filter { $0.gloss.lowercased() != gloss && $0.form.lowercased() != form }
            .map { e in (rank: (e.category == category ? 0 : 4) + min(3, abs(e.form.count - size)) + (e.form.first == first ? 0 : 1), entry: e) }
            .sorted { ($0.rank, $0.entry.itemId) < ($1.rank, $1.entry.itemId) }
            .prefix(16).map(\.entry)
        var taken = Set([form] + also.map { $0.lowercased() })
        var out = also.filter { $0.lowercased() != form }
        for e in mixed(close, using: &rng) where out.count < count {
            if taken.insert(e.form.lowercased()).inserted { out.append(e.form) }
        }
        return Array(out.prefix(count))
    }

    func daily<R: RandomNumberGenerator>(count: Int, using rng: inout R) -> [GameWord] {
        let langs = targets.sorted()
        guard !langs.isEmpty else { return [] }
        var used = Set<String>()
        var out: [GameWord] = []
        var i = 0
        let common = langs.map { l in mixed(Array((pools[l] ?? []).prefix(GameRounds.dailyPool)), using: &rng) }
        var cursors = Array(repeating: 0, count: langs.count)
        while out.count < count, cursors.indices.contains(where: { cursors[$0] < common[$0].count }) {
            let k = i % langs.count
            i += 1
            while cursors[k] < common[k].count {
                let e = common[k][cursors[k]]
                cursors[k] += 1
                if used.insert(e.itemId).inserted {
                    out.append(GameWord(itemId: e.itemId, lang: langs[k], form: e.form, gloss: e.gloss, root: root))
                    break
                }
            }
        }
        return out
    }

    func shared() -> [String] {
        guard let first = targets.first else { return [] }
        return (pools[first] ?? []).map(\.itemId)
    }
}

public struct GamePrompt: Sendable, Equatable, Identifiable {
    public enum Mode: Sendable { case form, flag, voice }

    public let id: Int
    public let mode: Mode
    public let word: GameWord
    public let choices: [String]
    public let answer: String
    public let group: Int

    public init(id: Int, mode: Mode, word: GameWord, choices: [String], answer: String, group: Int = 0) {
        self.id = id
        self.mode = mode
        self.word = word
        self.choices = choices
        self.answer = answer
        self.group = group
    }
}

public struct GameRun: Sendable, Equatable {
    public let prompts: [GamePrompt]
    public private(set) var index = 0
    public private(set) var answered: String?
    public private(set) var results: [Bool] = []
    public private(set) var combo = 0
    public private(set) var bestCombo = 0

    public init(_ prompts: [GamePrompt]) { self.prompts = prompts }

    public init(_ prompts: [GamePrompt], replaying pattern: String) {
        self.prompts = prompts
        results = pattern.prefix(prompts.count).map { $0 == "1" }
        index = results.count
    }

    public var current: GamePrompt? { prompts.indices.contains(index) ? prompts[index] : nil }
    public var done: Bool { index >= prompts.count }
    public var hits: Int { results.filter { $0 }.count }
    public var pattern: String { results.map { $0 ? "1" : "0" }.joined() }

    public var missed: [GameWord] {
        var seen = Set<String>()
        return zip(prompts, results).filter { !$0.1 && seen.insert($0.0.word.id).inserted }.map(\.0.word)
    }

    public mutating func answer(_ choice: String) -> Bool? {
        guard let current, answered == nil else { return nil }
        let right = choice == current.answer
        answered = choice
        results.append(right)
        combo = right ? combo + 1 : 0
        bestCombo = max(bestCombo, combo)
        return right
    }

    public mutating func advance() {
        guard answered != nil else { return }
        answered = nil
        index += 1
    }
}

public enum GameFamilies {
    static let groups: [[String]] = [
        ["es", "pt", "it", "fr", "en", "de", "nl", "sv", "pl", "cs", "fi", "tr", "id", "vi", "la", "ang"],
        ["ru", "el", "grc"],
        ["ar", "fa", "he"],
        ["hi", "sa", "ta", "th"],
        ["ja", "zh", "ko"],
    ]

    static let classical: Set<String> = ["la", "ang", "grc", "sa"]

    public static func family(_ lang: String) -> [String] { groups.first { $0.contains(lang) } ?? [lang] }

    public static func distractors<R: RandomNumberGenerator>(for lang: String, own: [String], excluding: Set<String> = [], count: Int = 3, using rng: inout R) -> [String] {
        let blocked = excluding.union([lang]).union(classical.subtracting(own))
        let kin = family(lang).filter { !blocked.contains($0) }
        let near = mixed(kin.filter(own.contains), using: &rng) + mixed(kin.filter { !own.contains($0) }, using: &rng)
        if near.count >= 2 { return Array(near.prefix(count)) }
        let far = mixed(own.filter { !blocked.contains($0) && !near.contains($0) }, using: &rng)
            + mixed(Lang.codes.filter { !blocked.contains($0) && !near.contains($0) && !own.contains($0) }, using: &rng)
        return Array((near + far).prefix(count))
    }
}

public enum GameSeed {
    public static func hash(_ text: String) -> UInt64 {
        var h: UInt64 = 0xcbf29ce484222325
        for b in text.utf8 {
            h ^= UInt64(b)
            h = h &* 0x100000001b3
        }
        return h
    }

    public static func daily(day: String, root: String, targets: [String]) -> UInt64 {
        hash("\(day)|\(root)|\(targets.sorted().joined(separator: ","))")
    }
}

public enum GameRounds {
    public static let dailyLength = 6
    public static let quizLength = 10
    public static let sameWordMeanings = 4
    public static let sameWordLangs = 3
    static let dailyPool = 400

    static func formPrompt<R: RandomNumberGenerator>(_ id: Int, _ word: GameWord, _ deck: GameDeck, also: [String] = [], group: Int = 0, using rng: inout R) -> GamePrompt {
        let foils = deck.foils(for: word, also: also, using: &rng)
        return GamePrompt(id: id, mode: .form, word: word, choices: mixed([word.form] + foils, using: &rng), answer: word.form, group: group)
    }

    public static func daily(_ deck: GameDeck, day: String) -> [GamePrompt] {
        var rng = SeededRandom(seed: GameSeed.daily(day: day, root: deck.root, targets: deck.targets))
        return deck.daily(count: dailyLength, using: &rng).enumerated().map { formPrompt($0.offset, $0.element, deck, using: &rng) }
    }

    public static func sameWord<R: RandomNumberGenerator>(_ deck: GameDeck, words: [GameWord], using rng: inout R) -> [GamePrompt] {
        var ids: [String] = []
        var seen = Set<String>()
        for id in words.filter({ $0.root == deck.root }).map(\.itemId) + deck.shared() where seen.insert(id).inserted { ids.append(id) }
        var out: [GamePrompt] = []
        var group = 0
        for id in ids where group < sameWordMeanings {
            let family = deck.targets.compactMap { deck.word(id, $0) }.prefix(sameWordLangs)
            guard family.count >= 2, Set(family.map(\.form)).count == family.count else { continue }
            for w in family {
                let other = family.first { $0.lang != w.lang }?.form
                out.append(formPrompt(out.count, w, deck, also: other.map { [$0] } ?? [], group: group, using: &rng))
            }
            group += 1
        }
        return out
    }

    public static func flags<R: RandomNumberGenerator>(_ words: [GameWord], own: [String], mode: GamePrompt.Mode, count: Int = quizLength, sameForm: (GameWord, String) -> Bool = { _, _ in false }, using rng: inout R) -> [GamePrompt] {
        var seen = Set<String>()
        let unique = GameWords.balanced(words).filter { seen.insert($0.form.lowercased()).inserted }
        var out: [GamePrompt] = []
        for w in unique.prefix(count) {
            let clash = Set(Lang.codes.filter { sameForm(w, $0) })
            let wrong = GameFamilies.distractors(for: w.lang, own: own, excluding: clash, using: &rng)
            out.append(GamePrompt(id: out.count, mode: mode, word: w, choices: mixed([w.lang] + wrong, using: &rng), answer: w.lang))
        }
        return out
    }
}

public struct SpeedBoard: Sendable, Equatable {
    public enum Outcome: Sendable, Equatable { case picked, matched(GameWord), missed(GameWord), ignored }

    public static let seconds = 60.0
    public static let missPenalty = 2.0
    public static let hotCombo = 5

    public private(set) var meanings: [GameWord?]
    public private(set) var forms: [GameWord?]
    public private(set) var pickedMeaning: String?
    public private(set) var pickedForm: String?
    public private(set) var points = 0
    public private(set) var hits = 0
    public private(set) var combo = 0
    public private(set) var bestCombo = 0
    public private(set) var missed: [GameWord] = []
    public private(set) var seen: [GameWord] = []
    let deck: [GameWord]
    var next = 0
    var rng: SeededRandom

    public init(deck: [GameWord], slots: Int = 5, seed: UInt64) {
        self.deck = deck
        rng = SeededRandom(seed: seed)
        meanings = Array(repeating: nil, count: slots)
        forms = Array(repeating: nil, count: slots)
        refill(force: true)
    }

    public var playable: Bool { meanings.compactMap { $0 }.count >= 3 }

    var board: [GameWord] { meanings.compactMap { $0 } + forms.compactMap { $0 } }

    mutating func draw(avoiding held: [GameWord]) -> GameWord? {
        guard !deck.isEmpty else { return nil }
        for _ in deck.indices {
            let w = deck[next % deck.count]
            next += 1
            let clash = held.contains { $0.id == w.id || $0.gloss.lowercased() == w.gloss.lowercased() || $0.form.lowercased() == w.form.lowercased() }
            if !clash { return w }
        }
        return nil
    }

    mutating func refill(force: Bool = false) {
        let open = meanings.indices.filter { meanings[$0] == nil }
        let live = meanings.count - open.count
        guard force || open.count >= 2 || live <= 1 else { return }
        var held = board
        var fresh: [GameWord] = []
        for _ in open {
            guard let w = draw(avoiding: held) else { break }
            held.append(w)
            fresh.append(w)
        }
        for w in fresh where !seen.contains(w) { seen.append(w) }
        for (i, w) in zip(mixed(open, using: &rng), fresh) { meanings[i] = w }
        let gaps = forms.indices.filter { forms[$0] == nil }
        for (i, w) in zip(mixed(gaps, using: &rng), fresh) { forms[i] = w }
    }

    public mutating func tapMeaning(_ id: String) -> Outcome {
        guard meanings.contains(where: { $0?.id == id }) else { return .ignored }
        pickedMeaning = id
        return resolve()
    }

    public mutating func tapForm(_ id: String) -> Outcome {
        guard forms.contains(where: { $0?.id == id }) else { return .ignored }
        pickedForm = id
        return resolve()
    }

    mutating func resolve() -> Outcome {
        guard let m = pickedMeaning, let f = pickedForm else { return .picked }
        pickedMeaning = nil
        pickedForm = nil
        guard let word = meanings.compactMap({ $0 }).first(where: { $0.id == m }) else { return .ignored }
        guard m == f else {
            combo = 0
            if !missed.contains(word) { missed.append(word) }
            return .missed(word)
        }
        hits += 1
        combo += 1
        bestCombo = max(bestCombo, combo)
        points += combo >= Self.hotCombo ? 2 : 1
        meanings[meanings.firstIndex { $0?.id == m }!] = nil
        forms[forms.firstIndex { $0?.id == m }!] = nil
        refill()
        return .matched(word)
    }
}

public enum GameLetters {
    public static let roundLength = 8
    public static let seconds = 90.0

    public static func deal<R: RandomNumberGenerator>(_ systems: [LangSystem], states: [String: EngineState], now: Double, count: Int = roundLength, using rng: inout R) -> [GameWord] {
        var pool: [GameWord] = []
        var seen = Set<String>()
        for s in systems {
            let state = states[s.id] ?? EngineState()
            let missed = Set(GameLedger(state).pending(state))
            for l in s.targets {
                let letters = ScriptCourse.units(l, root: s.root).flatMap(\.letters)
                for letter in letters where LetterSounds.lookup(l, letter.ch) != nil {
                    let id = LangScript.letterCardId(l, letter.ch)
                    guard seen.insert(id).inserted else { continue }
                    let card = state.cards[id]
                    let rank = missed.contains(id) ? GameWords.missedRank : card == nil ? GameWords.starterRank : (card?.due ?? .infinity) <= now ? GameWords.dueRank : GameWords.heldRank
                    pool.append(GameWord(itemId: LangScript.letterItemId(letter.ch), lang: l, form: letter.ch, gloss: letter.sound, root: s.root, rank: rank))
                }
            }
        }
        return Array(GameWords.ordered(pool, using: &rng).prefix(count))
    }
}

public struct GroupQuest: Sendable, Equatable {
    public let group: LearningGroup
    public let target: Int
    public let done: Int
    public let active: [GroupMember]
    public let idle: [GroupMember]

    public init?(_ group: LearningGroup) {
        guard let goal = group.goal, goal.weekly > 0, !group.members.isEmpty else { return nil }
        self.group = group
        active = group.members.filter { $0.isMe || $0.weekReviews > 0 }
        idle = group.members.filter { !($0.isMe || $0.weekReviews > 0) }
        target = Int((Double(goal.weekly) * Double(active.count) / Double(group.members.count)).rounded(.up))
        done = goal.done
    }

    public var progress: Double { target > 0 ? min(1, Double(done) / Double(target)) : 0 }
    public var complete: Bool { done >= target }
    public var nudgeable: [GroupMember] { group.members.filter { !$0.isMe && !$0.studiedToday } }
}

public struct SeededRandom: RandomNumberGenerator, Sendable, Equatable {
    var state: UInt64

    public init(seed: UInt64) { state = seed == 0 ? 0x9E3779B97F4A7C15 : seed }

    public mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }
}
