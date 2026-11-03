import Foundation

public struct WordGroup: Codable, Sendable, Equatable, Identifiable {
    public enum Link: Codable, Sendable, Equatable, Hashable {
        case language(String)
        case theme(String)
        case languageTheme(String, String)
    }

    public let link: Link
    public let words: [GameWord]

    public var id: String { words.map(\.id).sorted().joined(separator: ",") }
}

public struct WordGroupsPuzzle: Codable, Sendable, Equatable {
    public static let groupCount = 4
    public static let groupSize = 4
    public static let mistakes = 4
    public static let longestForm = 14
    public static let themes: Set<String> = ["adjective", "animal", "body", "color", "family", "food", "nature", "number", "object", "time", "verb"]

    public let groups: [WordGroup]
    public let tiles: [GameWord]

    public static func boardKey(day: String, root: String, targets: [String]) -> String {
        "\(day)|\(root)|\(Set(targets).sorted().joined(separator: ","))"
    }

    enum Partition: CaseIterable {
        case language, theme, languageTheme
    }

    public static func daily(_ words: [GameWord], day: String, root: String, targets: [String], theme: (GameWord) -> String?, sameForm: (GameWord, String) -> Bool = { _, _ in false }) -> WordGroupsPuzzle? {
        let seed = "groups|\(boardKey(day: day, root: root, targets: targets))"
        var rng = SeededRandom(seed: GameSeed.hash(seed))
        let pool = words.filter { targets.contains($0.lang) && fits($0) }
            .map { (order: GameSeed.hash("\(seed)|\($0.id)"), word: $0) }
            .sorted { ($0.order, $0.word.id) < ($1.order, $1.word.id) }
            .map(\.word)
        let distinct = pool.filter { w in !targets.contains { $0 != w.lang && sameForm(w, $0) } }
        for partition in mixed(Partition.allCases, using: &rng) {
            let source = partition == .theme ? pool : distinct
            if let groups = pick(source, partition, theme: theme, using: &rng) {
                return WordGroupsPuzzle(groups: groups, tiles: mixed(groups.flatMap(\.words), using: &rng))
            }
        }
        return nil
    }

    static func fits(_ word: GameWord) -> Bool {
        word.form.count <= longestForm && !word.form.contains(" ")
    }

    static func link(_ word: GameWord, _ partition: Partition, theme: (GameWord) -> String?) -> WordGroup.Link? {
        if partition == .language { return .language(word.lang) }
        guard let name = theme(word), themes.contains(name) else { return nil }
        return partition == .theme ? .theme(name) : .languageTheme(word.lang, name)
    }

    static func key(_ link: WordGroup.Link) -> String {
        switch link {
        case .language(let l): "l:\(l)"
        case .theme(let t): "t:\(t)"
        case .languageTheme(let l, let t): "c:\(l):\(t)"
        }
    }

    static func pick<R: RandomNumberGenerator>(_ words: [GameWord], _ partition: Partition, theme: (GameWord) -> String?, using rng: inout R) -> [WordGroup]? {
        var buckets: [WordGroup.Link: [GameWord]] = [:]
        for w in words {
            if let link = link(w, partition, theme: theme) { buckets[link, default: []].append(w) }
        }
        var forms = Set<String>()
        var groups: [WordGroup] = []
        let links = buckets.keys.filter { (buckets[$0]?.count ?? 0) >= groupSize }.sorted { key($0) < key($1) }
        for link in mixed(links, using: &rng) where groups.count < groupCount {
            var taken: [GameWord] = []
            var meanings = Set<String>(), spelled = forms
            for w in buckets[link] ?? [] where taken.count < groupSize {
                guard !meanings.contains(w.itemId), !meanings.contains(w.gloss.lowercased()), !spelled.contains(w.form.lowercased()) else { continue }
                meanings.formUnion([w.itemId, w.gloss.lowercased()])
                spelled.insert(w.form.lowercased())
                taken.append(w)
            }
            guard taken.count == groupSize else { continue }
            forms = spelled
            groups.append(WordGroup(link: link, words: taken))
        }
        return groups.count == groupCount ? groups : nil
    }
}

public struct WordGroupsRound: Sendable, Equatable {
    public enum Outcome: Sendable, Equatable { case solved(WordGroup), oneAway, miss, repeated, ignored }

    public let puzzle: WordGroupsPuzzle
    public private(set) var tiles: [GameWord]
    public private(set) var selected: Set<String> = []
    public private(set) var solved: [WordGroup] = []
    public private(set) var results: [Bool] = []
    private var tried: Set<Set<String>> = []

    public init(_ puzzle: WordGroupsPuzzle) {
        self.puzzle = puzzle
        tiles = puzzle.tiles
    }

    public init(_ puzzle: WordGroupsPuzzle, resuming saved: WordGroupsSave) {
        self.init(puzzle)
        guard saved.solved.allSatisfy({ id in puzzle.groups.contains { $0.id == id } }) else { return }
        solved = saved.solved.compactMap { id in puzzle.groups.first { $0.id == id } }
        results = saved.pattern.map { $0 == "1" }
        tried = Set(saved.tried.map(Set.init))
        let gone = Set(solved.flatMap(\.words).map(\.id))
        tiles = puzzle.tiles.filter { !gone.contains($0.id) }
    }

    public var mistakes: Int { results.filter { !$0 }.count }
    public var mistakesLeft: Int { max(0, WordGroupsPuzzle.mistakes - mistakes) }
    public var won: Bool { solved.count == puzzle.groups.count }
    public var finished: Bool { won || mistakesLeft == 0 }
    public var canSubmit: Bool { !finished && selected.count == WordGroupsPuzzle.groupSize }
    public var unsolved: [WordGroup] { puzzle.groups.filter { g in !solved.contains(g) } }
    public var pattern: String { results.map { $0 ? "1" : "0" }.joined() }
    public var save: WordGroupsSave { WordGroupsSave(pattern: pattern, solved: solved.map(\.id), tried: tried.map { $0.sorted() }.sorted { $0.joined() < $1.joined() }) }

    public mutating func toggle(_ id: String) {
        guard !finished, tiles.contains(where: { $0.id == id }) else { return }
        if selected.remove(id) == nil, selected.count < WordGroupsPuzzle.groupSize { selected.insert(id) }
    }

    public mutating func clear() { selected = [] }

    public mutating func shuffle<R: RandomNumberGenerator>(using rng: inout R) { tiles = mixed(tiles, using: &rng) }

    public mutating func submit() -> Outcome {
        guard canSubmit else { return .ignored }
        guard tried.insert(selected).inserted else { return .repeated }
        if let group = puzzle.groups.first(where: { Set($0.words.map(\.id)) == selected }) {
            results.append(true)
            solved.append(group)
            tiles.removeAll { selected.contains($0.id) }
            selected = []
            return .solved(group)
        }
        results.append(false)
        let best = puzzle.groups.map { g in g.words.filter { selected.contains($0.id) }.count }.max() ?? 0
        return best == WordGroupsPuzzle.groupSize - 1 ? .oneAway : .miss
    }
}

public struct WordGroupsSave: Codable, Sendable, Equatable {
    public var pattern: String
    public var solved: [String]
    public var tried: [[String]]

    public init(pattern: String = "", solved: [String] = [], tried: [[String]] = []) {
        self.pattern = pattern
        self.solved = solved
        self.tried = tried
    }

    public var misses: Int { pattern.filter { $0 == "0" }.count }
    public var finished: Bool { solved.count == WordGroupsPuzzle.groupCount || misses >= WordGroupsPuzzle.mistakes }
    public var results: [Bool] { pattern.map { $0 == "1" } }
}
