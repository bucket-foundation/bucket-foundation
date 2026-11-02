import Foundation

public struct Milestone: Hashable, Identifiable, Sendable {
    public enum Kind: Hashable, Sendable {
        case mastered(lang: String, count: Int)
        case streak(days: Int)
    }

    public let kind: Kind

    public init(kind: Kind) {
        self.kind = kind
    }

    public var id: String {
        switch kind {
        case .mastered(let lang, let count): "mastered:\(lang):\(count)"
        case .streak(let days): "streak:\(days)"
        }
    }

    var size: Int {
        switch kind {
        case .mastered(_, let count): count
        case .streak(let days): days
        }
    }
}

public enum Milestones {
    public static let words = [1, 5, 10, 25, 50, 100, 250, 500, 1000]
    public static let days = [3, 7, 14, 30, 50, 100, 200, 365]

    public static func earned(mastered: [String: Int], streak: Int) -> [Milestone] {
        let long = days.filter { $0 <= streak }.map { Milestone(kind: .streak(days: $0)) }
        let known = mastered.keys.sorted().flatMap { lang in
            words.filter { $0 <= mastered[lang, default: 0] }.map { Milestone(kind: .mastered(lang: lang, count: $0)) }
        }
        return long + known
    }

    public static func next(_ earned: [Milestone], seen: Set<String>) -> Milestone? {
        earned.filter { !seen.contains($0.id) }.max { $0.size < $1.size }
    }
}
