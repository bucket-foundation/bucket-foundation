import Foundation

public struct DailyLimits: Sendable, Equatable {
    public static let adCards = 10
    public static let adGrantsPerDay = 2
    public static let retriesPerGame = 2

    public let newWords: Int
    public let cards: Int

    public init(newWords: Int, cards: Int) {
        self.newWords = max(0, newWords)
        self.cards = max(0, cards)
    }

    public init(flags: BetaFlags) {
        self.init(newWords: flags.dailyNewWords, cards: flags.dailyCards)
    }
}

public enum RetryOffer: Sendable, Equatable {
    case free
    case ad(left: Int)
    case none
}

public enum LessonGate: Sendable, Equatable {
    case open(newWords: Int)
    case reviewsOnly
    case limit
}

public enum AdOutcome: String, Sendable, Equatable {
    case earned, skipped, unavailable

    public var grants: Bool { self != .skipped }
    public var via: String { self == .unavailable ? "fallback" : "ad" }
}

public struct DailyBudget: Codable, Sendable, Equatable {
    public private(set) var day: String
    public private(set) var newWords = 0
    public private(set) var cards = 0
    public private(set) var adGrants = 0
    public private(set) var played: [String: Int] = [:]
    public private(set) var retries: [String: Int] = [:]

    public init(day: String) { self.day = day }

    public func on(_ today: String) -> DailyBudget { day == today ? self : DailyBudget(day: today) }

    public mutating func charge(newWords n: Int = 0, cards c: Int = 0, day today: String) {
        self = on(today)
        newWords += max(0, n)
        cards += max(0, c)
    }

    public func cardCap(_ limits: DailyLimits) -> Int { limits.cards + adGrants * DailyLimits.adCards }

    public func cardsLeft(_ limits: DailyLimits, capped: Bool) -> Int? {
        capped ? max(0, cardCap(limits) - cards) : nil
    }

    public func newWordsLeft(_ limits: DailyLimits, capped: Bool) -> Int? {
        guard capped else { return nil }
        return min(max(0, limits.newWords - newWords), max(0, cardCap(limits) - cards))
    }

    public func spent(_ limits: DailyLimits, capped: Bool) -> Bool { cardsLeft(limits, capped: capped) == 0 }

    public var canWatchForCards: Bool { adGrants < DailyLimits.adGrantsPerDay }

    @discardableResult
    public mutating func grantCards(day today: String) -> Bool {
        self = on(today)
        guard canWatchForCards else { return false }
        adGrants += 1
        return true
    }

    public func lessonGate(_ limits: DailyLimits, capped: Bool, dueReviews: Int) -> LessonGate {
        guard capped else { return .open(newWords: .max) }
        if !spent(limits, capped: true) { return .open(newWords: newWordsLeft(limits, capped: true) ?? 0) }
        return dueReviews > 0 ? .reviewsOnly : .limit
    }

    public func hasPlayed(_ game: String) -> Bool { (played[game] ?? 0) > 0 }

    public mutating func markPlayed(_ game: String, day today: String) {
        self = on(today)
        played[game, default: 0] += 1
    }

    public func retriesLeft(_ game: String) -> Int { max(0, DailyLimits.retriesPerGame - (retries[game] ?? 0)) }

    public func retryOffer(_ game: String, capped: Bool) -> RetryOffer {
        guard capped else { return .free }
        let left = retriesLeft(game)
        return left > 0 ? .ad(left: left) : .none
    }

    @discardableResult
    public mutating func grantRetry(_ game: String, capped: Bool, day today: String) -> Bool {
        self = on(today)
        guard capped else { return true }
        guard retriesLeft(game) > 0 else { return false }
        retries[game, default: 0] += 1
        return true
    }

    public static func resetsAt(_ now: Date, tz: TimeZone = .current) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        return cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) ?? now.addingTimeInterval(86_400)
    }

    public static func load(_ defaults: UserDefaults, key: String, day today: String) -> DailyBudget {
        let saved = defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(DailyBudget.self, from: $0) }
        return (saved ?? DailyBudget(day: today)).on(today)
    }

    public func save(_ defaults: UserDefaults, key: String) {
        if let data = try? JSONEncoder().encode(self) { defaults.set(data, forKey: key) }
    }
}

public enum LessonTrim {
    public static func queue(_ queue: [QueueEntry], gate: LessonGate, isNew: (QueueEntry) -> Bool, isDue: (QueueEntry) -> Bool) -> [QueueEntry] {
        switch gate {
        case .open(let allowed):
            var kept: [String] = []
            return queue.filter { e in
                guard isNew(e) else { return true }
                let id = cardId(e.lang, e.itemId)
                if kept.contains(id) { return true }
                guard kept.count < allowed else { return false }
                kept.append(id)
                return true
            }
        case .reviewsOnly:
            return queue.filter { !isNew($0) && isDue($0) }
        case .limit:
            return []
        }
    }
}
