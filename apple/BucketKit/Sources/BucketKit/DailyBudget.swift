import Foundation
import Security

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
    case plain(left: Int)
    case none
}

public enum LessonGate: Sendable, Equatable {
    case open(newWords: Int, cards: Int)
    case reviewsOnly
    case limit
}

public enum AdOutcome: String, Sendable, Equatable {
    case earned, skipped, unavailable
}

public enum GrantResult: String, Sendable, Equatable {
    case free, ad, plain, fallback, skipped, refused

    public var granted: Bool { self != .skipped && self != .refused }
}

public enum DailyDeck {
    public static let utcGames: Set<String> = ["atlas", "shift", "flagTiles"]

    public static func key(_ game: String, now: Date, tz: TimeZone = .current) -> String {
        utcGames.contains(game) ? PlayDecks.deckDay(now) : dayKey(now.timeIntervalSince1970 * 1000, tz: tz)
    }

    public static func ordinal(_ key: String) -> Int? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3, (1...12).contains(parts[1]), (1...31).contains(parts[2]) else { return nil }
        return PolyDate(parts[0], parts[1], parts[2]).ordinal
    }

    public static let maxDaysAhead = 1

    public static func tooFarAhead(_ stored: String, of today: String) -> Bool {
        guard let x = ordinal(stored), let y = ordinal(today) else { return false }
        return x - y > maxDaysAhead
    }

    public static func later(_ a: String, than b: String) -> Bool {
        guard let x = ordinal(a) else { return false }
        guard let y = ordinal(b) else { return true }
        return x > y
    }
}

public struct DailyAttempt: Codable, Sendable, Equatable {
    public var deck: String
    public var played = false
    public var retries = 0
    public var title: String?
    public var shape: GameShare.Shape?

    public init(deck: String) { self.deck = deck }
}

public struct DailyBudget: Codable, Sendable, Equatable {
    public private(set) var day: String
    public private(set) var newWords = 0
    public private(set) var cards = 0
    public private(set) var adGrants = 0
    public private(set) var attempts: [String: DailyAttempt] = [:]

    public init(day: String) { self.day = day }

    public func on(_ today: String) -> DailyBudget {
        if DailyDeck.tooFarAhead(day, of: today) { return DailyBudget(day: today) }
        guard DailyDeck.later(today, than: day) else { return self }
        var next = DailyBudget(day: today)
        next.attempts = attempts
        return next
    }

    public static func newer(_ a: DailyBudget?, _ b: DailyBudget?) -> DailyBudget? {
        guard let a else { return b }
        guard let b else { return a }
        if DailyDeck.later(a.day, than: b.day) { return a }
        if DailyDeck.later(b.day, than: a.day) { return b }
        return a.cards + a.adGrants + a.attempts.count >= b.cards + b.adGrants + b.attempts.count ? a : b
    }

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

    public var cardGrantsLeft: Int { max(0, DailyLimits.adGrantsPerDay - adGrants) }

    @discardableResult
    public mutating func grantCards(day today: String) -> Bool {
        self = on(today)
        guard cardGrantsLeft > 0 else { return false }
        adGrants += 1
        return true
    }

    public func lessonGate(_ limits: DailyLimits, capped: Bool, dueReviews: Int) -> LessonGate {
        guard capped else { return .open(newWords: .max, cards: .max) }
        let left = cardsLeft(limits, capped: true) ?? 0
        if left > 0 { return .open(newWords: newWordsLeft(limits, capped: true) ?? 0, cards: left) }
        return dueReviews > 0 ? .reviewsOnly : .limit
    }

    func current(_ game: String, deck: String) -> DailyAttempt? {
        guard let a = attempts[game], !DailyDeck.later(deck, than: a.deck), !DailyDeck.tooFarAhead(a.deck, of: deck) else { return nil }
        return a
    }

    func stale(_ game: String, deck: String) -> Bool {
        attempts[game].map { DailyDeck.later($0.deck, than: deck) && !DailyDeck.tooFarAhead($0.deck, of: deck) } ?? false
    }

    public func hasPlayed(_ game: String, deck: String) -> Bool { current(game, deck: deck)?.played ?? false }

    public func first(_ game: String, deck: String) -> DailyAttempt? {
        guard let a = attempts[game], a.deck == deck, a.played else { return nil }
        return a
    }

    public mutating func markPlayed(_ game: String, deck: String, title: String? = nil, shape: GameShare.Shape? = nil) {
        guard !hasPlayed(game, deck: deck) else { return }
        var a = current(game, deck: deck) ?? DailyAttempt(deck: deck)
        a.played = true
        a.title = title
        a.shape = shape
        attempts[game] = a
    }

    public func retriesLeft(_ game: String, deck: String) -> Int {
        if stale(game, deck: deck) { return 0 }
        return max(0, DailyLimits.retriesPerGame - (current(game, deck: deck)?.retries ?? 0))
    }

    public func retryOffer(_ game: String, deck: String, capped: Bool, adReady: Bool) -> RetryOffer {
        guard capped else { return .free }
        let left = retriesLeft(game, deck: deck)
        guard left > 0 else { return .none }
        return adReady ? .ad(left: left) : .plain(left: left)
    }

    @discardableResult
    public mutating func grantRetry(_ game: String, deck: String, capped: Bool) -> Bool {
        guard capped else { return true }
        guard retriesLeft(game, deck: deck) > 0 else { return false }
        var a = current(game, deck: deck) ?? DailyAttempt(deck: deck)
        a.retries += 1
        attempts[game] = a
        return true
    }

    public static func resetsAt(_ now: Date, tz: TimeZone = .current) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        return cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) ?? now.addingTimeInterval(86_400)
    }
}

public struct PracticeRound: Sendable, Equatable {
    public private(set) var practicing = false
    public private(set) var recorded = false
    public private(set) var score: String?

    public init() {}

    public mutating func begin() {
        practicing = true
        score = nil
    }

    public mutating func finish(score practiceScore: String? = nil) -> Bool {
        if practicing {
            practicing = false
            score = practiceScore
            return false
        }
        guard !recorded else { return false }
        recorded = true
        return true
    }
}

public protocol BudgetVault: Sendable {
    func load() -> DailyBudget?
    func save(_ budget: DailyBudget)
}

public final class MemoryBudgetVault: BudgetVault, @unchecked Sendable {
    private let lock = NSLock()
    private var value: DailyBudget?
    public private(set) var saves = 0

    public init(_ value: DailyBudget? = nil) { self.value = value }

    public func load() -> DailyBudget? { lock.withLock { value } }
    public func save(_ budget: DailyBudget) { lock.withLock { value = budget; saves += 1 } }
}

public struct DefaultsBudgetVault: BudgetVault, @unchecked Sendable {
    let defaults: UserDefaults
    let key: String

    public init(_ defaults: UserDefaults = .standard, key: String = "polingual.dailyBudget") {
        self.defaults = defaults
        self.key = key
    }

    public func load() -> DailyBudget? { defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(DailyBudget.self, from: $0) } }
    public func save(_ budget: DailyBudget) {
        if let data = try? JSONEncoder().encode(budget) { defaults.set(data, forKey: key) }
    }
}

public struct KeychainBudgetVault: BudgetVault {
    let service: String
    let account = "ledger"

    public init(service: String = "com.polingual.dailybudget") { self.service = service }

    var query: [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account] }

    public func load() -> DailyBudget? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(DailyBudget.self, from: data)
    }

    public func save(_ budget: DailyBudget) {
        guard let data = try? JSONEncoder().encode(budget) else { return }
        SecItemDelete(query as CFDictionary)
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(q as CFDictionary, nil)
    }
}

public struct PairedBudgetVault: BudgetVault {
    let first: any BudgetVault
    let second: any BudgetVault

    public init(_ first: any BudgetVault = KeychainBudgetVault(), _ second: any BudgetVault = DefaultsBudgetVault()) {
        self.first = first
        self.second = second
    }

    public func load() -> DailyBudget? { DailyBudget.newer(first.load(), second.load()) }
    public func save(_ budget: DailyBudget) {
        first.save(budget)
        second.save(budget)
    }
}

@MainActor
@Observable
public final class DailyLedger {
    public var capped = false
    public private(set) var budget: DailyBudget
    @ObservationIgnored let vault: any BudgetVault
    @ObservationIgnored let clock: @MainActor () -> Date
    @ObservationIgnored let tz: @MainActor () -> TimeZone
    @ObservationIgnored let flags: @MainActor () -> BetaFlags
    @ObservationIgnored let ad: @MainActor () async -> AdOutcome
    @ObservationIgnored let adReady: @MainActor () -> Bool
    @ObservationIgnored let log: @MainActor (String, [String: JSONScalar]) -> Void

    public init(
        vault: any BudgetVault,
        clock: @escaping @MainActor () -> Date = { Date() },
        tz: @escaping @MainActor () -> TimeZone = { .current },
        flags: @escaping @MainActor () -> BetaFlags = { BetaFlags() },
        ad: @escaping @MainActor () async -> AdOutcome = { .unavailable },
        adReady: @escaping @MainActor () -> Bool = { false },
        log: @escaping @MainActor (String, [String: JSONScalar]) -> Void = { _, _ in }
    ) {
        self.vault = vault
        self.clock = clock
        self.tz = tz
        self.flags = flags
        self.ad = ad
        self.adReady = adReady
        self.log = log
        let today = dayKey(clock().timeIntervalSince1970 * 1000, tz: tz())
        budget = (vault.load() ?? DailyBudget(day: today)).on(today)
    }

    public var today: String { dayKey(clock().timeIntervalSince1970 * 1000, tz: tz()) }
    public var limits: DailyLimits { DailyLimits(flags: flags()) }
    public var now: DailyBudget { budget.on(today) }
    public var spent: Bool { now.spent(limits, capped: capped) }
    public var cardOffer: RetryOffer {
        guard capped else { return .free }
        let left = now.cardGrantsLeft
        guard left > 0 else { return .none }
        return adReady() ? .ad(left: left) : .plain(left: left)
    }

    public func deck(_ game: String) -> String { DailyDeck.key(game, now: clock(), tz: tz()) }

    func update(_ change: (inout DailyBudget) -> Void) {
        var next = now
        change(&next)
        guard next != budget else { return }
        budget = next
        vault.save(next)
    }

    public func charge(newWords: Int = 0, cards: Int) {
        let day = today
        update { $0.charge(newWords: newWords, cards: cards, day: day) }
    }

    public func gate(dueReviews: Int) -> LessonGate { now.lessonGate(limits, capped: capped, dueReviews: dueReviews) }

    public func hasPlayed(_ game: String, deck: String? = nil) -> Bool { now.hasPlayed(game, deck: deck ?? self.deck(game)) }

    public func first(_ game: String, deck: String? = nil) -> DailyAttempt? { now.first(game, deck: deck ?? self.deck(game)) }

    public func markPlayed(_ game: String, deck: String? = nil, title: String? = nil, shape: GameShare.Shape? = nil) {
        let key = deck ?? self.deck(game)
        update { $0.markPlayed(game, deck: key, title: title, shape: shape) }
    }

    public func retryOffer(_ game: String, deck: String? = nil) -> RetryOffer {
        now.retryOffer(game, deck: deck ?? self.deck(game), capped: capped, adReady: adReady())
    }

    public func retry(_ game: String, deck: String? = nil) async -> GrantResult {
        guard capped else { return .free }
        let key = deck ?? self.deck(game)
        guard now.retriesLeft(game, deck: key) > 0 else { return .refused }
        let result = await pay(for: "retry", place: game)
        guard result.granted else { return result }
        guard now.retriesLeft(game, deck: key) > 0 else { return .refused }
        update { $0.grantRetry(game, deck: key, capped: true) }
        log("retry_granted", ["for": .string("retry"), "game": .string(game), "via": .string(result.rawValue)])
        return result
    }

    public func moreCards(place: String) async -> GrantResult {
        guard capped, now.cardGrantsLeft > 0 else { return .refused }
        let result = await pay(for: "cards", place: place)
        guard result.granted else { return result }
        let day = today
        guard now.cardGrantsLeft > 0 else { return .refused }
        update { $0.grantCards(day: day) }
        log("retry_granted", ["for": .string("cards"), "game": .string(place), "via": .string(result.rawValue)])
        return result
    }

    func pay(for reason: String, place: String) async -> GrantResult {
        guard adReady() else { return .plain }
        let outcome = await ad()
        if outcome != .unavailable { log("retry_ad_shown", ["for": .string(reason), "game": .string(place)]) }
        switch outcome {
        case .earned: return .ad
        case .skipped: return .skipped
        case .unavailable: return .fallback
        }
    }

    public func limitHit(_ place: String) {
        log("limit_hit", ["place": .string(place), "cards": .number(Double(now.cards)), "new": .number(Double(now.newWords))])
    }

    public func paywallTap(_ place: String) {
        log("limit_paywall_tap", ["from": .string(place)])
    }
}

public enum LessonTrim {
    public static func queue(_ queue: [QueueEntry], gate: LessonGate, isNew: (QueueEntry) -> Bool, isDue: (QueueEntry) -> Bool) -> [QueueEntry] {
        switch gate {
        case .open(let newWords, let cards):
            let due = queue.filter { !isNew($0) && isDue($0) }.count
            var room = cards == .max ? Int.max : max(0, cards - due)
            var admitted: [String] = []
            return queue.filter { e in
                if !isNew(e) && isDue(e) { return true }
                let id = cardId(e.lang, e.itemId)
                if isNew(e) {
                    if admitted.contains(id) { return true }
                    guard room > 0, admitted.count < newWords else { return false }
                    admitted.append(id)
                    room -= 1
                    return true
                }
                guard room > 0 else { return false }
                room -= 1
                return true
            }
        case .reviewsOnly:
            return queue.filter { !isNew($0) && isDue($0) }
        case .limit:
            return []
        }
    }
}
