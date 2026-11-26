import Foundation

public struct InputLearner {
    public var p: (String) -> Double
    public var due: Set<String>
    public var rank: (String) -> Double?
    public var recent: [String: Int]
    public var lastVideo: String?
    public init(p: @escaping (String) -> Double, due: Set<String>, rank: @escaping (String) -> Double?, recent: [String: Int], lastVideo: String?) {
        self.p = p; self.due = due; self.rank = rank; self.recent = recent; self.lastVideo = lastVideo
    }
}

public struct InputPlan: Equatable, Sendable {
    public var unit: String
    public var tokens: Int
    public var media: Bool
    public var coverage: Double
    public var newWords: [String]
    public var glossed: [String]
    public var eligible: Bool
    public var score: Double
}

public struct SelectorWeights: Sendable {
    public var due: Double
    public var frequency: Double
    public var repeatPenalty: Double
    public var continuity: Double
    public init(due: Double, frequency: Double, repeatPenalty: Double, continuity: Double) {
        self.due = due; self.frequency = frequency; self.repeatPenalty = repeatPenalty; self.continuity = continuity
    }
    public static let unfitted = SelectorWeights(due: 2, frequency: 1, repeatPenalty: 3, continuity: 1.5)
}

public enum InputSelector {
    public static let minUnitTokens = 40
    public static let textBand = 0.95...0.98
    public static let mediaFloor = 0.9
    public static let maxNew = 3
    public static let newShare = 0.05
    public static let unknownBelow = 0.5
    public static let minGlossBudget = 2.0
    public static let glossShare = 0.05

    public static func glossBudget(_ tokens: Int) -> Double { max(minGlossBudget, glossShare * Double(tokens)) }

    static func bonus(_ rank: Double?) -> Double { rank.map { 1000 / (1000 + max(1, $0)) } ?? 0 }

    public static func plan(_ unit: String, lemmas: [String], targets: [String], media: Bool, video: String?, learner l: InputLearner, weights w: SelectorWeights = .unfitted) -> InputPlan {
        let n = lemmas.count
        let distinct = Array(Set(lemmas)).sorted()
        let unknown = distinct.filter { l.p($0) < unknownBelow }
        let pool = Set(targets.isEmpty ? distinct : targets)
        let room = min(maxNew, Int((newShare * Double(n)).rounded(.down)))
        let byFreq = unknown.filter { pool.contains($0) }.sorted { a, b in
            let ra = l.rank(a) ?? .infinity, rb = l.rank(b) ?? .infinity
            return ra != rb ? ra < rb : a < b
        }
        let newWords = Array(byFreq.prefix(max(0, room)))
        let keep = Set(newWords)
        let glossed = unknown.filter { !keep.contains($0) }
        let g = Set(glossed)
        var sum = 0.0
        for x in lemmas { sum += g.contains(x) ? 1 : min(1, max(0, l.p(x))) }
        let coverage = n > 0 ? sum / Double(n) : 0
        let band = media ? coverage >= mediaFloor : coverage >= textBand.lowerBound && coverage <= textBand.upperBound
        let k = newWords.count
        let eligible = n >= minUnitTokens && band && k >= 1 && k <= maxNew && Double(k) <= newShare * Double(n) && Double(glossed.count) <= glossBudget(n)
        let dueHits = distinct.filter { l.due.contains($0) }.count
        var freq = 0.0
        for x in newWords { freq += bonus(l.rank(x)) }
        let cont = video != nil && video == l.lastVideo ? w.continuity : 0
        let score = w.due * Double(dueHits) + w.frequency * freq - w.repeatPenalty * Double(l.recent[unit] ?? 0) + cont
        return InputPlan(unit: unit, tokens: n, media: media, coverage: coverage, newWords: newWords, glossed: glossed, eligible: eligible, score: score)
    }

    public static func rawCoverage(_ lemmas: [String], _ l: InputLearner) -> Double {
        guard !lemmas.isEmpty else { return 0 }
        var s = 0.0
        for x in lemmas { s += min(1, max(0, l.p(x))) }
        return s / Double(lemmas.count)
    }

    public static func select(_ plans: [InputPlan], learner l: InputLearner, lemmasOf: (String) -> [String]) -> (plan: InputPlan, fallback: Bool)? {
        let ok = plans.filter(\.eligible).sorted { $0.score != $1.score ? $0.score > $1.score : $0.unit < $1.unit }
        if let first = ok.first { return (first, false) }
        let big = plans.filter { $0.tokens >= minUnitTokens }
        guard var best = big.first else { return nil }
        var bestCov = rawCoverage(lemmasOf(best.unit), l)
        for p in big.dropFirst() {
            let c = rawCoverage(lemmasOf(p.unit), l)
            if c > bestCov || (c == bestCov && p.unit < best.unit) { best = p; bestCov = c }
        }
        best.glossed = Array(Set(lemmasOf(best.unit))).sorted().filter { l.p($0) < unknownBelow }
        best.newWords = []
        best.coverage = 1
        return (best, true)
    }
}
