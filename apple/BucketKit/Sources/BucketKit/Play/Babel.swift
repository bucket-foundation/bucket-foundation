import Foundation

public struct Meaning: Sendable, Equatable, Hashable {
    public let id: String
    public let meaning: String
    public let forms: [String: String]

    public init(id: String, meaning: String, forms: [String: String]) {
        self.id = id
        self.meaning = meaning
        self.forms = forms
    }
}

public struct Cell: Sendable, Equatable, Hashable {
    public let key: Int
    public let meaning: String
    public let lang: String

    public init(key: Int, meaning: String, lang: String) {
        self.key = key
        self.meaning = meaning
        self.lang = lang
    }
}

public struct BabelLevel: Sendable, Equatable {
    public let number: Int
    public let goal: Int
    public let moves: Int
}

public struct Resolved: Sendable, Equatable {
    public let board: [Cell]
    public let cleared: [Cell]
    public let cascades: Int
}

public struct LangSet: Sendable, Equatable, Hashable {
    public let id: String
    public let label: String
    public let targets: [String]
}

public enum LangSets {
    public static let all = [
        LangSet(id: "romance", label: "Spanish, French, Italian, Portuguese", targets: ["es", "fr", "it", "pt"]),
        LangSet(id: "germanic", label: "German, Dutch, Swedish", targets: ["de", "nl", "sv"]),
        LangSet(id: "asia", label: "Japanese, Chinese, Korean", targets: ["ja", "zh", "ko"]),
        LangSet(id: "east", label: "Russian, Greek, Arabic, Hindi", targets: ["ru", "el", "ar", "hi"]),
        LangSet(id: "world", label: "Spanish, German, Japanese, Arabic", targets: ["es", "de", "ja", "ar"]),
    ]
}

public struct XorRng: Sendable {
    var x: UInt32

    public init(_ seed: Int32) { x = seed == 0 ? 1 : UInt32(bitPattern: seed) }

    public mutating func next() -> Double {
        x ^= x << 13
        x ^= x >> 17
        x ^= x << 5
        return Double(x) / 4294967296.0
    }
}

public struct Dealer: Sendable {
    let meanings: [Meaning]
    let langs: [String]
    var rand: XorRng
    var key: Int

    public init(_ meanings: [Meaning], _ langs: [String], _ rand: XorRng, start: Int = 0) {
        self.meanings = meanings
        self.langs = langs
        self.rand = rand
        key = start
    }

    public mutating func next() -> Cell {
        let m = meanings[Int((rand.next() * Double(meanings.count)).rounded(.down))]
        let options = langs.filter { m.forms[$0] != nil }
        let lang = options[Int((rand.next() * Double(options.count)).rounded(.down))]
        key += 1
        return Cell(key: key - 1, meaning: m.id, lang: lang)
    }
}

public enum Babel {
    public static let size = 6
    public static let match = 3
    public static let meaningCount = 5

    public static func at(_ board: [Cell], _ r: Int, _ c: Int) -> Cell? { (0..<size).contains(r) && (0..<size).contains(c) ? board[r * size + c] : nil }

    public static func matches(_ board: [Cell]) -> Set<Int> {
        var out = Set<Int>()
        for r in 0..<size {
            for c in 0..<size {
                for (dr, dc) in [(0, 1), (1, 0)] {
                    var run = [r * size + c]
                    while true {
                        let last = run.last!
                        guard let next = at(board, last / size + dr, last % size + dc), next.meaning == board[last].meaning else { break }
                        run.append((last / size + dr) * size + last % size + dc)
                    }
                    if run.count >= match { out.formUnion(run) }
                }
            }
        }
        return out
    }

    public static func fresh(_ deal: inout Dealer) -> [Cell] {
        var board: [Cell] = []
        for i in 0..<(size * size) {
            var cell = deal.next()
            for _ in 0..<20 {
                let r = i / size, c = i % size
                let left = c >= 2 && board[i - 1].meaning == cell.meaning && board[i - 2].meaning == cell.meaning
                let up = r >= 2 && board[i - size].meaning == cell.meaning && board[i - 2 * size].meaning == cell.meaning
                if !left && !up { break }
                cell = deal.next()
            }
            board.append(cell)
        }
        return board
    }

    public static func adjacent(_ a: Int, _ b: Int) -> Bool { (a / size == b / size && abs(a - b) == 1) || abs(a - b) == size }

    public static func swapped(_ board: [Cell], _ a: Int, _ b: Int) -> [Cell] {
        var out = board
        out.swapAt(a, b)
        return out
    }

    public static func collapse(_ board: [Cell], _ gone: Set<Int>, _ deal: inout Dealer) -> [Cell] {
        var out = board
        for c in 0..<size {
            let keep = stride(from: size - 1, through: 0, by: -1).filter { !gone.contains($0 * size + c) }.map { board[$0 * size + c] }
            var k = 0
            for r in stride(from: size - 1, through: 0, by: -1) {
                out[r * size + c] = k < keep.count ? keep[k] : deal.next()
                k += 1
            }
        }
        return out
    }

    public static func resolve(_ board: [Cell], _ deal: inout Dealer) -> Resolved {
        var current = board
        var cleared: [Cell] = []
        var cascades = 0
        var found = matches(current)
        while !found.isEmpty {
            cascades += 1
            for i in found.sorted() { cleared.append(current[i]) }
            current = collapse(current, found, &deal)
            if cascades > 30 { break }
            found = matches(current)
        }
        return Resolved(board: current, cleared: cleared, cascades: cascades)
    }

    public static func hasMove(_ board: [Cell]) -> Bool {
        for i in 0..<(size * size) {
            for j in [i + 1, i + size] where j < size * size && adjacent(i, j) {
                if !matches(swapped(board, i, j)).isEmpty { return true }
            }
        }
        return false
    }

    public static func playable(_ deal: inout Dealer, start: [Cell]? = nil) -> [Cell] {
        var board = start ?? fresh(&deal)
        for _ in 0..<50 {
            if !matches(board).isEmpty { board = resolve(board, &deal).board }
            if hasMove(board) && matches(board).isEmpty { return board }
            board = fresh(&deal)
        }
        return board
    }

    public static func level(_ n: Int) -> BabelLevel { BabelLevel(number: n, goal: 12 + n * 3, moves: max(12, 22 - n / 2)) }

    public static func points(cleared: Int, cascades: Int) -> Int { cleared * 10 * max(1, cascades) }

    public static func meanings(_ items: [LangItem], langs: [String], level: Int, root: String = "en", count: Int = meaningCount) -> [Meaning] {
        var rand = WebRandom(WebRandom.seedOf("babel:\(langs.joined(separator: ",")):\(level)"))
        let pool = items.filter { i in
            i.kind == .word && i.form(root) != nil && langs.allSatisfy { l in i.form(l).map { $0.utf16.count <= 14 } ?? false }
                && Set(langs.map { i.form($0)!.lowercased() }).count == langs.count
        }
        var out: [Meaning] = []
        var used = Set<String>()
        var tries = 0
        while out.count < count && tries < 2000 && !pool.isEmpty {
            tries += 1
            let item = pool[Int((rand.next() * Double(min(pool.count, 600))).rounded(.down))]
            guard used.insert(item.form(root)!.lowercased()).inserted else { continue }
            out.append(Meaning(id: item.id, meaning: item.form(root)!, forms: Dictionary(uniqueKeysWithValues: langs.map { ($0, item.form($0)!) })))
        }
        return out
    }
}
