import Foundation

public enum QuestionKind: String, Codable, Sendable, CaseIterable {
    case pick, calculate, order, spotError = "spot-error", match
}

public struct MatchPair: Codable, Sendable, Equatable {
    public let term: String
    public let meaning: String
}

public struct Question: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let atom: String
    public let kind: QuestionKind
    public let prompt: String
    public var explain: String?
    public var applied: Bool?
    public var options: [String]?
    public var answer: Double?
    public var tol: Double?
    public var relTol: Double?
    public var unit: String?
    public var steps: [String]?
    public var error: Int?
    public var fix: String?
    public var pairs: [MatchPair]?
}

public struct QuestionDeck: Codable, Sendable {
    public let branch: String
    public let version: String
    public let questions: [Question]

    public func questions(for atom: String, kind: QuestionKind? = nil) -> [Question] {
        questions.filter { $0.atom == atom && (kind == nil || $0.kind == kind) }
    }

    public func rotation(for atom: String, kind: QuestionKind? = nil) -> [Question] {
        let qs = questions(for: atom, kind: kind)
        return qs.filter { $0.applied == true } + qs.filter { $0.applied != true }
    }

    public func question(for atom: String, reps: Int, kind: QuestionKind? = nil) -> Question? {
        let qs = rotation(for: atom, kind: kind)
        let i = reps - 1
        return qs.isEmpty ? nil : qs[((i % qs.count) + qs.count) % qs.count]
    }
}

public enum QuestionResponse: Sendable {
    case pick(Int)
    case calculate(String)
    case order([Int])
    case spotError(Int)
    case match([String: String])
}

public struct QuestionGrade: Sendable, Equatable {
    public let correct: Bool
    public let score: Double
    public let rating: Int
}

public struct PresentedQuestion: Sendable {
    public let question: Question
    public let order: [Int]
    public var meanings: [Int]?
}

public enum QuestionEngine {
    static func hashSeed(_ s: String) -> UInt32 {
        var h: UInt32 = 2166136261
        for u in s.utf16 { h = (h ^ UInt32(u)) &* 16777619 }
        return h
    }

    static func mulberry(_ seed: UInt32) -> () -> Double {
        var a = seed
        return {
            a = a &+ 0x6d2b79f5
            var t = a
            t = (t ^ (t >> 15)) &* (t | 1)
            t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
            return Double(t ^ (t >> 14)) / 4294967296
        }
    }

    public static func shuffledIndices(_ n: Int, seed: String) -> [Int] {
        let r = mulberry(hashSeed(seed))
        var idx = Array(0..<n)
        var i = n - 1
        while i > 0 {
            let j = Int(floor(r() * Double(i + 1)))
            idx.swapAt(i, j)
            i -= 1
        }
        return idx
    }

    public static func present(_ q: Question, seed: String) -> PresentedQuestion {
        let key = "\(seed):\(q.id)"
        switch q.kind {
        case .pick: return PresentedQuestion(question: q, order: shuffledIndices(q.options?.count ?? 0, seed: key))
        case .order: return PresentedQuestion(question: q, order: shuffledIndices(q.steps?.count ?? 0, seed: key))
        case .match:
            let n = q.pairs?.count ?? 0
            return PresentedQuestion(question: q, order: Array(0..<n), meanings: shuffledIndices(n, seed: key))
        case .spotError: return PresentedQuestion(question: q, order: Array(0..<(q.steps?.count ?? 0)))
        case .calculate: return PresentedQuestion(question: q, order: [])
        }
    }

    static func result(_ score: Double) -> QuestionGrade {
        let s = max(0, min(1, score))
        return QuestionGrade(correct: s == 1, score: s, rating: s == 1 ? 3 : s >= 0.5 ? 2 : 1)
    }

    public static func parseNumber(_ v: String) -> Double {
        var t = v.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: "")
        t = t.components(separatedBy: .whitespaces).joined()
        if let r = t.range(of: "[×xX]10\\^?", options: .regularExpression) { t.replaceSubrange(r, with: "e") }
        if t.hasSuffix("%") { t.removeLast() }
        guard t.range(of: "^[-+]?([0-9]+\\.?[0-9]*|\\.[0-9]+)([eE][-+]?[0-9]+)?$", options: .regularExpression) != nil else { return .nan }
        return Double(t) ?? .nan
    }

    public static func grade(_ q: Question, _ r: QuestionResponse) -> QuestionGrade {
        switch (q.kind, r) {
        case (.pick, .pick(let c)): return result(Double(c) == q.answer ? 1 : 0)
        case (.calculate, .calculate(let v)):
            let x = parseNumber(v)
            guard x.isFinite, let a = q.answer else { return result(0) }
            let tol = max(q.tol ?? 0, abs(a) * (q.relTol ?? 0), 1e-9)
            return result(abs(x - a) <= tol ? 1 : 0)
        case (.order, .order(let order)):
            let n = q.steps?.count ?? 0
            guard order.count == n, Set(order).count == n, order.allSatisfy({ $0 >= 0 && $0 < n }), n > 1 else { return result(0) }
            var pairs = 0
            var good = 0
            for i in 0..<n { for j in (i + 1)..<n { pairs += 1; if order[i] < order[j] { good += 1 } } }
            let tau = 2 * (Double(good) / Double(pairs)) - 1
            return result(tau >= 0.5 ? tau : 0)
        case (.spotError, .spotError(let s)): return result(s == q.error ? 1 : 0)
        case (.match, .match(let given)):
            let ps = q.pairs ?? []
            guard ps.count > 1 else { return result(0) }
            let hits = ps.filter { given[$0.term] == $0.meaning }.count
            return result(Double(hits - 1) / Double(ps.count - 1))
        default: return result(0)
        }
    }
}
