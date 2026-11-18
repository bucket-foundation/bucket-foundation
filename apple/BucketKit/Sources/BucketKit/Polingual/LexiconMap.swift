import Foundation

public enum LexiconWordState: Int, Sendable, CaseIterable, Comparable {
    case unseen, started, known, mastered

    public static func < (a: LexiconWordState, b: LexiconWordState) -> Bool { a.rawValue < b.rawValue }
}

public struct LexiconCounts: Sendable, Equatable {
    public var unseen = 0
    public var started = 0
    public var known = 0
    public var mastered = 0

    public init() {}

    public init(_ states: some Sequence<LexiconWordState>) {
        for s in states { self[s] += 1 }
    }

    public subscript(_ state: LexiconWordState) -> Int {
        get {
            switch state {
            case .unseen: unseen
            case .started: started
            case .known: known
            case .mastered: mastered
            }
        }
        set {
            switch state {
            case .unseen: unseen = newValue
            case .started: started = newValue
            case .known: known = newValue
            case .mastered: mastered = newValue
            }
        }
    }

    public var total: Int { unseen + started + known + mastered }
    public var seen: Int { started + known + mastered }
    public var learned: Int { known + mastered }
    public var left: Int { total - learned }
    public var share: Double { total > 0 ? Double(learned) / Double(total) : 0 }

    public func share(_ state: LexiconWordState) -> Double { total > 0 ? Double(self[state]) / Double(total) : 0 }

    public static func + (a: LexiconCounts, b: LexiconCounts) -> LexiconCounts {
        var out = a
        for s in LexiconWordState.allCases { out[s] += b[s] }
        return out
    }
}

public struct LexiconWord: Sendable, Identifiable, Equatable {
    public let id: String
    public let lang: String
    public let form: String
    public let meaning: String
    public let reading: Reading?
    public let state: LexiconWordState
}

public struct LexiconGroup: Sendable, Identifiable {
    public let id: String
    public let index: Int
    public let title: String
    public let words: [LexiconWord]
    public let counts: LexiconCounts
}

public struct LexiconLanguage: Sendable, Identifiable {
    public let lang: String
    public let learning: Bool
    public let groups: [LexiconGroup]
    public let counts: LexiconCounts
    public let pace: Double
    public var id: String { lang }

    public func finish(now: Double) -> Double? { LexiconMap.finish(left: counts.left, pace: pace, now: now) }
}

public enum LexiconPace: Sendable, Equatable {
    case day(Int)
    case week(Int)

    public init?(_ perDay: Double) {
        guard perDay > 0 else { return nil }
        self = perDay >= 1 ? .day(Int(perDay.rounded())) : .week(max(1, Int((perDay * 7).rounded())))
    }
}

public struct LexiconMap: Sendable {
    public static let knownAt = 0.5
    public static let masteredAt = 0.8
    public static let paceDays = 14
    public static let finishCapDays = 730.0

    public let root: String
    public let languages: [LexiconLanguage]
    public let counts: LexiconCounts
    public let lexicon: LexiconCounts
    public let pace: Double

    public var learning: [LexiconLanguage] { languages.filter(\.learning) }
    public var others: [LexiconLanguage] { languages.filter { !$0.learning } }

    public static func state(_ card: Card?, fsrs: FSRS = FSRS()) -> LexiconWordState {
        guard let card, isStarted(card) else { return .unseen }
        let m = fsrs.mastery(card)
        if m >= masteredAt { return .mastered }
        return m >= knownAt ? .known : .started
    }

    public static func finish(left: Int, pace: Double, now: Double) -> Double? {
        guard left > 0, pace > 0 else { return nil }
        let days = (Double(left) / pace).rounded(.up)
        return days <= finishCapDays ? now + days * DAY_MS : nil
    }

    public init(root: String, langs: [String] = Lang.codes, learning: [(system: LangSystem, state: EngineState)], corpus: LangCorpus, now: Double, tz: TimeZone = .current) {
        let fsrs = FSRS()
        let targets = learning.flatMap(\.system.targets)
        var order: [String] = []
        for l in targets + langs where l != root && !order.contains(l) { order.append(l) }
        let active = Set(targets)
        let window = Set((0..<Self.paceDays).map { dayKey(now - Double($0) * DAY_MS, tz: tz) })
        let vocab = corpus.items.filter(isVocab)
        languages = order.compactMap { lang in
            var byUnit: [Int: [LexiconWord]] = [:]
            var recent = 0
            for item in vocab where usable(item, root, lang) {
                guard let form = item.form(lang), let meaning = item.form(root) else { continue }
                let id = cardId(lang, item.id)
                var best = LexiconWordState.unseen
                var fresh = false
                for l in learning {
                    guard let c = l.state.cards[id] else { continue }
                    best = max(best, Self.state(c, fsrs: fsrs))
                    if isStarted(c), c.placed != true, let d = c.introduced, window.contains(d) { fresh = true }
                }
                if fresh { recent += 1 }
                byUnit[item.unit, default: []].append(LexiconWord(id: id, lang: lang, form: form, meaning: meaning, reading: item.readings[lang], state: best))
            }
            let groups = byUnit.keys.sorted().map { u in
                let unit = corpus.units.first { $0.index == u }
                let words = byUnit[u] ?? []
                return LexiconGroup(id: unit?.id ?? String(u), index: u, title: unit?.title ?? "", words: words, counts: LexiconCounts(words.map(\.state)))
            }
            guard !groups.isEmpty else { return nil }
            return LexiconLanguage(lang: lang, learning: active.contains(lang), groups: groups, counts: groups.reduce(LexiconCounts()) { $0 + $1.counts }, pace: Double(recent) / Double(Self.paceDays))
        }
        self.root = root
        counts = languages.filter(\.learning).reduce(LexiconCounts()) { $0 + $1.counts }
        lexicon = languages.reduce(LexiconCounts()) { $0 + $1.counts }
        pace = languages.reduce(0) { $0 + $1.pace }
    }

    public func language(_ lang: String) -> LexiconLanguage? { languages.first { $0.lang == lang } }

    public func finish(now: Double) -> Double? { Self.finish(left: counts.left, pace: pace, now: now) }
}
