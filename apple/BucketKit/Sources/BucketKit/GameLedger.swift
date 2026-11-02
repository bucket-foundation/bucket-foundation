import Foundation

public struct GameResult: Sendable, Equatable {
    public var game: String
    public var points: Int?
    public var hits: Int
    public var missed: [String]
    public var dailyPattern: String?

    public init(game: String, points: Int? = nil, hits: Int, missed: [String], dailyPattern: String? = nil) {
        self.game = game
        self.points = points
        self.hits = hits
        self.missed = missed
        self.dailyPattern = dailyPattern
    }
}

public struct GameLedger: Sendable, Equatable {
    static let key = "games"
    public static let missCap = 20
    public static let perSession = 5
    public static let dayCredit = 30
    static let keptDays = 14

    public var misses: [String: Double] = [:]
    public var best: [String: Int] = [:]
    public var daily: [String: String] = [:]
    public var days: [String: Int] = [:]

    public init(_ state: EngineState) { self.init(state.settingsExtra) }

    init(_ settings: JSObject) {
        guard let o = settings[Self.key]?.object else { return }
        for (k, v) in o["misses"]?.object?.entries ?? [] { misses[k] = v.number }
        for (k, v) in o["best"]?.object?.entries ?? [] { best[k] = v.number.map { Int($0) } }
        for (k, v) in o["daily"]?.object?.entries ?? [] { daily[k] = v.string }
        for (k, v) in o["days"]?.object?.entries ?? [] { days[k] = v.number.map { Int($0) } }
    }

    var js: JSValue {
        func table<V>(_ d: [String: V], _ wrap: (V) -> JSValue) -> JSValue {
            .object(JSObject(d.keys.sorted().map { ($0, wrap(d[$0]!)) }))
        }
        return .object(JSObject([
            ("misses", table(misses) { .number($0) }),
            ("best", table(best) { .number(Double($0)) }),
            ("daily", table(daily) { .string($0) }),
            ("days", table(days) { .number(Double($0)) }),
        ]))
    }

    public func pending(_ state: EngineState) -> [String] {
        misses.filter { id, at in state.cards.started(id) && (state.cards[id]?.lastReview ?? 0) < at }
            .sorted { $0.value == $1.value ? $0.key < $1.key : $0.value < $1.value }
            .map(\.key)
    }

    public static func queue(_ system: LangSystem, _ state: EngineState, limit: Int = perSession) -> [QueueEntry] {
        let open = GameLedger(state).pending(state).compactMap { id -> QueueEntry? in
            let p = parseCardId(id)
            guard system.targets.contains(p.lang) else { return nil }
            return QueueEntry(itemId: p.itemId, lang: p.lang, stage: p.itemId.hasPrefix("abc:") ? .letter : .review)
        }
        return Array(open.prefix(limit))
    }

    public static func finishing(_ state: EngineState, _ game: GameResult, now: Double, tz: String? = nil) -> EngineState {
        guard game.hits > 0 || !game.missed.isEmpty else { return state }
        var next = markStudyDay(state, now: now, tz: tz)
        var ledger = GameLedger(next)
        let day = dayKey(now, tzName: tz)
        ledger.days[day] = min(dayCredit, (ledger.days[day] ?? 0) + game.hits)
        if let points = game.points { ledger.best[game.game] = max(ledger.best[game.game] ?? 0, points) }
        if let pattern = game.dailyPattern, ledger.daily[day] == nil { ledger.daily[day] = pattern }
        for id in game.missed where next.cards.started(id) { ledger.misses[id] = now }
        ledger.prune(next)
        next.settingsExtra[key] = ledger.js
        return next
    }

    mutating func prune(_ state: EngineState) {
        let open = pending(state)
        misses = misses.filter { open.contains($0.key) }
        for id in open.prefix(max(0, open.count - Self.missCap)) { misses[id] = nil }
        daily = Self.recent(daily)
        days = Self.recent(days)
    }

    static func recent<V>(_ table: [String: V]) -> [String: V] {
        let kept = table.keys.sorted { dayTime($0) > dayTime($1) }.prefix(keptDays)
        return table.filter { kept.contains($0.key) }
    }

    static func mergeSynced(_ out: inout EngineState, _ a: JSObject, _ b: JSObject) {
        guard a[key] != nil || b[key] != nil else { return }
        let x = GameLedger(a), y = GameLedger(b)
        var merged = x
        merged.misses.merge(y.misses, uniquingKeysWith: max)
        merged.best.merge(y.best, uniquingKeysWith: max)
        merged.days.merge(y.days, uniquingKeysWith: max)
        merged.daily.merge(y.daily) { first, _ in first }
        merged.prune(out)
        out.settingsExtra[key] = merged.js
    }
}
