import Foundation

public enum YesNoTest {
    public static let realWords = 50
    public static let pseudowords = 20
    public static let rankBands: [(Int, Int)] = [(1, 1000), (1001, 2000), (2001, 4000), (4001, 6000), (6001, 8000)]
    public static let bank = 8000.0
    public static let testDay = 28
    public static let windowEndDay = 35
    public static let maxAttempts = 40
    public static let minLength = 3
    public static let minBigramCount = 2
    static let dayMs = 86_400_000.0
    static let vowels = Set("aeiouyáéíóúýàèìòùâêîôûäëïöüãõåæøœ".unicodeScalars.map(\.value))
    static let plain = Set("aeiouy".unicodeScalars.map(\.value))

    public struct Syllable: Equatable, Sendable {
        public var o: String
        public var n: String
        public var c: String
    }

    public struct Lexicon: Sendable {
        public var words: Set<String>
        public var segments: [String: [String]]
        public var bigrams: Set<String>
    }

    public struct RankedWord: Sendable {
        public var word: String
        public var rank: Int
        public init(word: String, rank: Int) { self.word = word; self.rank = rank }
    }

    public struct TestItem: Equatable, Sendable {
        public var word: String
        public var real: Bool
        public var band: Int?
    }

    public struct Score: Equatable, Sendable {
        public var hits: Int
        public var words: Int
        public var falseAlarms: Int
        public var pseudowords: Int
        public var known: Double
    }

    public static func mulberry32(_ seed: UInt32) -> () -> Double {
        var a = seed
        return {
            a = a &+ 0x6d2b79f5
            var t = a
            t = (t ^ (t >> 15)) &* (t | 1)
            t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
            return Double(t ^ (t >> 14)) / 4294967296.0
        }
    }

    public static func normalizeWord(_ w: String) -> String {
        w.precomposedStringWithCanonicalMapping.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func scalars(_ s: String) -> [UInt32] { s.unicodeScalars.map(\.value) }

    static func latin(_ c: UInt32) -> Bool { (97...122).contains(c) || (0xe0...0xff).contains(c) || c == 0x153 }

    static func str(_ cs: [UInt32]) -> String {
        var v = String.UnicodeScalarView()
        for c in cs { if let u = Unicode.Scalar(c) { v.append(u) } }
        return String(v)
    }

    public static func syllabify(_ word: String) -> [Syllable]? {
        let cs = scalars(normalizeWord(word))
        guard !cs.isEmpty, cs.allSatisfy(latin) else { return nil }
        var runs: [(Bool, [UInt32])] = []
        for c in cs {
            let v = vowels.contains(c)
            if let last = runs.last, last.0 == v { runs[runs.count - 1].1.append(c) } else { runs.append((v, [c])) }
        }
        guard runs.contains(where: { $0.0 }) else { return nil }
        var out: [Syllable] = []
        var onset = ""
        for i in runs.indices {
            let (v, s) = runs[i]
            if !v {
                if out.isEmpty && onset.isEmpty { onset = str(s) }
                continue
            }
            var syl = Syllable(o: onset, n: str(s), c: "")
            onset = ""
            if i + 1 < runs.count, !runs[i + 1].0 {
                let next = runs[i + 1].1
                if i + 2 >= runs.count { syl.c = str(next) }
                else if next.count >= 2 {
                    syl.c = str([next[0]])
                    onset = str(Array(next.dropFirst()))
                } else { onset = str(next) }
            }
            out.append(syl)
        }
        return out
    }

    public static func join(_ s: [Syllable]) -> String { s.map { $0.o + $0.n + $0.c }.joined() }

    static func position(_ i: Int, _ n: Int) -> String { n == 1 ? "m" : i == 0 ? "i" : i == n - 1 ? "f" : "x" }

    public static func less(_ a: String, _ b: String) -> Bool { scalars(a).lexicographicallyPrecedes(scalars(b)) }

    static func chain(_ s: [Syllable]) -> [String] { ["^"] + s.flatMap { ["o:\($0.o)", "n:\($0.n)", "c:\($0.c)"] } + ["$"] }

    static func seg(_ x: Syllable, _ k: Character) -> String { k == "o" ? x.o : k == "n" ? x.n : x.c }

    static func with(_ x: Syllable, _ k: Character, _ v: String) -> Syllable {
        var y = x
        if k == "o" { y.o = v } else if k == "n" { y.n = v } else { y.c = v }
        return y
    }

    public static func buildLexicon(_ core: [String], reject: [String] = []) -> Lexicon {
        var set = Set(reject.map(normalizeWord))
        var segs: [String: Set<String>] = [:]
        var counts: [String: Int] = [:]
        var seen = Set<String>()
        for raw in core {
            let w = normalizeWord(raw)
            if !seen.insert(w).inserted { continue }
            set.insert(w)
            guard let s = syllabify(w) else { continue }
            for (i, x) in s.enumerated() { for k in "onc" { segs["\(position(i, s.count))\(k)", default: []].insert(seg(x, k)) } }
            let c = chain(s)
            for i in 1..<c.count { counts["\(c[i - 1])|\(c[i])", default: 0] += 1 }
        }
        return Lexicon(words: set, segments: segs.mapValues { $0.sorted(by: less) }, bigrams: Set(counts.filter { $0.value >= minBigramCount }.keys))
    }

    static func legal(_ s: [Syllable], _ lex: Lexicon) -> Bool {
        let c = chain(s)
        return (1..<c.count).allSatisfy { lex.bigrams.contains("\(c[$0 - 1])|\(c[$0])") }
    }

    public static func marks(_ w: String) -> Int { scalars(normalizeWord(w)).filter { vowels.contains($0) && !plain.contains($0) }.count }

    static func pick(_ rand: () -> Double, _ n: Int) -> Int { Int((rand() * Double(n)).rounded(.down)) }

    public static func pseudoword(_ reference: String, lex: Lexicon, rand: () -> Double, taken: Set<String> = []) -> String? {
        guard let ref = syllabify(reference) else { return nil }
        let norm = normalizeWord(reference)
        let kinds = Array("onc")
        for _ in 0..<maxAttempts {
            var next: [Syllable] = []
            for (i, x) in ref.enumerated() {
                let k = kinds[pick(rand, 3)]
                let pool = (lex.segments["\(position(i, ref.count))\(k)"] ?? []).filter { $0 != seg(x, k) }
                next.append(pool.isEmpty ? x : with(x, k, pool[pick(rand, pool.count)]))
            }
            let w = join(next)
            let len = scalars(w).count
            if len < minLength || abs(len - scalars(norm).count) > 1 || marks(w) != marks(reference) { continue }
            if w == norm || lex.words.contains(w) || taken.contains(w) || syllabify(w) == nil || !legal(next, lex) { continue }
            return w
        }
        return nil
    }

    public static func assemble(_ candidates: [RankedWord], exclude: Set<String>, seed: UInt32, lex: Lexicon, avoid: Set<String> = []) -> [TestItem]? {
        let rand = mulberry32(seed)
        var pool: [String: Int] = [:]
        for c in candidates {
            let w = normalizeWord(c.word)
            if syllabify(w) == nil || exclude.contains(w) || avoid.contains(w) { continue }
            if let r = pool[w], r <= c.rank { continue }
            pool[w] = c.rank
        }
        let per = realWords / rankBands.count
        var real: [TestItem] = []
        for (b, band) in rankBands.enumerated() {
            let inBand = pool.filter { $0.value >= band.0 && $0.value <= band.1 }.map(\.key).sorted(by: less)
            if inBand.count < per { return nil }
            var picked = Set<String>()
            while picked.count < per { picked.insert(inBand[pick(rand, inBand.count)]) }
            for w in picked.sorted(by: less) { real.append(TestItem(word: w, real: true, band: b)) }
        }
        var taken = Set(real.map(\.word)).union(avoid)
        var pseudo: [TestItem] = []
        var i = 0
        while pseudo.count < pseudowords && i < pseudowords * 40 {
            i += 1
            let ref = real[pick(rand, real.count)].word
            guard let p = pseudoword(ref, lex: lex, rand: rand, taken: taken) else { continue }
            taken.insert(p)
            pseudo.append(TestItem(word: p, real: false, band: nil))
        }
        if pseudo.count < pseudowords { return nil }
        var all = real + pseudo
        var j = all.count - 1
        while j > 0 {
            let k = pick(rand, j + 1)
            all.swapAt(j, k)
            j -= 1
        }
        return all
    }

    public static func known(hits: Int, words: Int, falseAlarms: Int, pseudowords: Int, bank: Double = bank) -> Double {
        let h = words > 0 ? Double(hits) / Double(words) : 0
        let f = pseudowords > 0 ? Double(falseAlarms) / Double(pseudowords) : 0
        if f >= 1 { return 0 }
        return max(0, min(1, (h - f) / (1 - f))) * bank
    }

    public static func score(_ items: [TestItem], yes: Set<String>) -> Score {
        let real = items.filter(\.real)
        let pseudo = items.filter { !$0.real }
        let hits = real.filter { yes.contains($0.word) }.count
        let fa = pseudo.filter { yes.contains($0.word) }.count
        return Score(hits: hits, words: real.count, falseAlarms: fa, pseudowords: pseudo.count, known: bandWeightedKnown(real, yes: yes, falseAlarms: fa, pseudowords: pseudo.count))
    }

    public static func bandWeightedKnown(_ real: [TestItem], yes: Set<String>, falseAlarms: Int, pseudowords: Int) -> Double {
        var sum = 0.0
        for (b, band) in rankBands.enumerated() {
            let inBand = real.filter { $0.band == b }
            sum += known(hits: inBand.filter { yes.contains($0.word) }.count, words: inBand.count, falseAlarms: falseAlarms, pseudowords: pseudowords, bank: Double(band.1 - band.0 + 1))
        }
        return sum
    }

    public static func due(enrolledAt: Double?, now: Double, baseline: Bool, day28: Bool) -> String? {
        guard let e = enrolledAt, now >= e else { return nil }
        if !baseline { return "baseline" }
        let day = Int(((now - e) / dayMs).rounded(.down))
        return !day28 && day >= testDay && day <= windowEndDay ? "day28" : nil
    }
}
