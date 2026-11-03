import Foundation

public struct MiniCell: Hashable, Sendable {
    public let row: Int
    public let col: Int

    public init(row: Int, col: Int) {
        self.row = row
        self.col = col
    }
}

public struct MiniEntry: Sendable, Equatable, Identifiable {
    public let word: GameWord
    public let letters: [String]
    public var row: Int
    public var col: Int
    public let across: Bool
    public var number = 0

    public var id: String { "\(across ? "a" : "d")\(row):\(col)" }

    public var cells: [MiniCell] {
        letters.indices.map { across ? MiniCell(row: row, col: col + $0) : MiniCell(row: row + $0, col: col) }
    }
}

public struct MiniPuzzle: Sendable, Equatable {
    public static let side = 6
    public static let wanted = 5

    public let lang: String
    public let entries: [MiniEntry]
    public let keys: [String]

    public var rows: Int { (entries.flatMap(\.cells).map(\.row).max() ?? -1) + 1 }
    public var cols: Int { (entries.flatMap(\.cells).map(\.col).max() ?? -1) + 1 }

    public var answers: [MiniCell: String] {
        var out: [MiniCell: String] = [:]
        for e in entries {
            for (cell, letter) in zip(e.cells, e.letters) { out[cell] = letter }
        }
        return out
    }

    public var numbers: [MiniCell: Int] {
        var out: [MiniCell: Int] = [:]
        for e in entries { out[MiniCell(row: e.row, col: e.col)] = e.number }
        return out
    }

    public static func letters(_ form: String) -> [String]? {
        guard form.allSatisfy(\.isLetter), (3...side).contains(form.count) else { return nil }
        return form.map { c in
            let up = String(c).uppercased()
            return up.count == 1 ? up : String(c)
        }
    }

    public static func daily(_ words: [GameWord], day: String, root: String, targets: [String]) -> MiniPuzzle? {
        var rng = SeededRandom(seed: GameSeed.hash("mini|\(day)|\(root)|\(targets.sorted().joined(separator: ","))"))
        let langs = targets.sorted().filter { l in words.filter { $0.lang == l && letters($0.form) != nil }.count >= 8 }.shuffled(using: &rng)
        for lang in langs {
            if let puzzle = build(words.filter { $0.lang == lang }, lang: lang, using: &rng) { return puzzle }
        }
        return nil
    }

    static func build<R: RandomNumberGenerator>(_ words: [GameWord], lang: String, using rng: inout R) -> MiniPuzzle? {
        var seen = Set<String>()
        let pool = words.sorted { $0.id < $1.id }.compactMap { w -> (GameWord, [String])? in
            guard let l = letters(w.form), seen.insert(l.joined()).inserted else { return nil }
            return (w, l)
        }
        var best: [MiniEntry] = []
        for _ in 0..<30 {
            let placed = attempt(pool.shuffled(using: &rng), using: &rng)
            if placed.count > best.count { best = placed }
            if best.count >= wanted { break }
        }
        guard best.count >= 3 else { return nil }
        let top = best.map(\.row).min() ?? 0
        let left = best.map(\.col).min() ?? 0
        var shifted = best.map { e -> MiniEntry in
            var n = e
            n.row -= top
            n.col -= left
            return n
        }
        let starts = Set(shifted.map { MiniCell(row: $0.row, col: $0.col) }).sorted { ($0.row, $0.col) < ($1.row, $1.col) }
        for i in shifted.indices {
            shifted[i].number = (starts.firstIndex(of: MiniCell(row: shifted[i].row, col: shifted[i].col)) ?? 0) + 1
        }
        shifted.sort { ($0.number, $0.across ? 0 : 1) < ($1.number, $1.across ? 0 : 1) }
        var keys = Set(shifted.flatMap(\.letters))
        for letter in pool.flatMap(\.1).shuffled(using: &rng) where keys.count < 18 { keys.insert(letter) }
        return MiniPuzzle(lang: lang, entries: shifted, keys: keys.sorted())
    }

    static func attempt<R: RandomNumberGenerator>(_ pool: [(GameWord, [String])], using rng: inout R) -> [MiniEntry] {
        guard let first = pool.first else { return [] }
        var placed = [MiniEntry(word: first.0, letters: first.1, row: 0, col: 0, across: true)]
        for (word, letters) in pool.dropFirst() where placed.count < wanted {
            var spots: [MiniEntry] = []
            for e in placed {
                for (i, a) in e.letters.enumerated() {
                    for (j, b) in letters.enumerated() where a == b {
                        let cross = e.cells[i]
                        let spot = MiniEntry(word: word, letters: letters, row: e.across ? cross.row - j : cross.row, col: e.across ? cross.col : cross.col - j, across: !e.across)
                        if fits(spot, placed) { spots.append(spot) }
                    }
                }
            }
            if let spot = spots.randomElement(using: &rng) { placed.append(spot) }
        }
        return placed
    }

    static func fits(_ e: MiniEntry, _ placed: [MiniEntry]) -> Bool {
        let cells = placed.flatMap(\.cells) + e.cells
        guard (cells.map(\.row).max() ?? 0) - (cells.map(\.row).min() ?? 0) < side, (cells.map(\.col).max() ?? 0) - (cells.map(\.col).min() ?? 0) < side else { return false }
        var letter: [MiniCell: String] = [:]
        var sameWay = Set<MiniCell>()
        for p in placed {
            for (cell, l) in zip(p.cells, p.letters) {
                letter[cell] = l
                if p.across == e.across { sameWay.insert(cell) }
            }
        }
        let before = e.across ? MiniCell(row: e.row, col: e.col - 1) : MiniCell(row: e.row - 1, col: e.col)
        let end = e.cells[e.cells.count - 1]
        let after = e.across ? MiniCell(row: end.row, col: end.col + 1) : MiniCell(row: end.row + 1, col: end.col)
        guard letter[before] == nil, letter[after] == nil else { return false }
        for (cell, l) in zip(e.cells, e.letters) {
            if sameWay.contains(cell) { return false }
            if let there = letter[cell] {
                if there != l { return false }
                continue
            }
            let sides = e.across ? [MiniCell(row: cell.row - 1, col: cell.col), MiniCell(row: cell.row + 1, col: cell.col)] : [MiniCell(row: cell.row, col: cell.col - 1), MiniCell(row: cell.row, col: cell.col + 1)]
            if sides.contains(where: { letter[$0] != nil }) { return false }
        }
        return true
    }
}
