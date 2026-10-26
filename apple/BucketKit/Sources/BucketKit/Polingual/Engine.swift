import Foundation

public let DAY_MS: Double = 86_400_000

public typealias Rating = Int

public struct OrderedMap<Value: Sendable & Equatable>: Sendable, Equatable {
    public private(set) var keys: [String] = []
    private var store: [String: Value] = [:]

    public init() {}

    public subscript(key: String) -> Value? {
        get { store[key] }
        set {
            if let newValue {
                if store.updateValue(newValue, forKey: key) == nil { keys.append(key) }
            } else if store.removeValue(forKey: key) != nil {
                keys.removeAll { $0 == key }
            }
        }
    }

    public var entries: [(key: String, value: Value)] { keys.map { ($0, store[$0]!) } }
    public var count: Int { keys.count }
    public func has(_ key: String) -> Bool { store[key] != nil }

    public func filter(_ keep: (String, Value) -> Bool) -> OrderedMap {
        var out = OrderedMap()
        for (k, v) in entries where keep(k, v) { out[k] = v }
        return out
    }
}

public struct Card: Sendable, Equatable {
    public var state: String?
    public var stability: Double?
    public var difficulty: Double?
    public var reps: Double?
    public var lapses: Double?
    public var lastReview: Double?
    public var due: Double?
    public var scheduledDays: Double?
    public var firedCredit: Double?
    public var introduced: String?
    public var placed: Bool?
    public var extra = JSObject()

    public init(state: String? = nil) { self.state = state }

    static let known: Set<String> = ["state", "stability", "difficulty", "reps", "lapses", "lastReview", "due", "scheduledDays", "firedCredit", "introduced", "placed"]

    public init(js: JSValue) {
        let o = js.object ?? JSObject()
        state = o["state"]?.string
        stability = o["stability"]?.number
        difficulty = o["difficulty"]?.number
        reps = o["reps"]?.number
        lapses = o["lapses"]?.number
        lastReview = o["lastReview"]?.number
        due = o["due"]?.number
        scheduledDays = o["scheduledDays"]?.number
        firedCredit = o["firedCredit"]?.number
        introduced = o["introduced"]?.string
        placed = o["placed"]?.bool
        for (k, v) in o.entries where !Self.known.contains(k) { extra[k] = v }
    }

    public var js: JSValue {
        var o = extra
        if let state { o["state"] = .string(state) }
        if let stability { o["stability"] = .number(stability) }
        if let difficulty { o["difficulty"] = .number(difficulty) }
        if let reps { o["reps"] = .number(reps) }
        if let lapses { o["lapses"] = .number(lapses) }
        if let lastReview { o["lastReview"] = .number(lastReview) }
        if let due { o["due"] = .number(due) }
        if let scheduledDays { o["scheduledDays"] = .number(scheduledDays) }
        if let firedCredit { o["firedCredit"] = .number(firedCredit) }
        if let introduced { o["introduced"] = .string(introduced) }
        if let placed { o["placed"] = .bool(placed) }
        return .object(o)
    }
}

func or(_ x: Double?, _ fallback: Double) -> Double {
    guard let x, x != 0, !x.isNaN else { return fallback }
    return x
}

public struct FSRS: Sendable {
    public static let defaultW: [Double] = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]
    static let decay = -0.5
    static let factor = pow(0.9, 1 / decay) - 1

    public var w: [Double] = defaultW
    public var requestRetention = 0.9
    public var maximumInterval = 3650.0

    public init() {}

    static func clampD(_ d: Double) -> Double { min(max(d, 1), 10) }
    static func clampS(_ s: Double) -> Double { max(s, 0.01) }

    public func retrievability(_ t: Double, _ s: Double) -> Double {
        if s <= 0 { return 0 }
        return pow(1 + Self.factor * (t / s), Self.decay)
    }

    public func interval(_ s: Double) -> Double {
        var ivl = (s / Self.factor) * (pow(requestRetention, 1 / Self.decay) - 1)
        ivl = max(1, jsRound(ivl))
        return min(ivl, maximumInterval)
    }

    func initStability(_ g: Rating) -> Double { Self.clampS(w[g - 1]) }
    func initDifficulty(_ g: Rating) -> Double { Self.clampD(w[4] - exp(w[5] * Double(g - 1)) + 1) }

    func nextDifficulty(_ d: Double, _ g: Rating) -> Double {
        let delta = -w[6] * Double(g - 3)
        var next = d + delta * ((10 - d) / 9)
        let d0easy = w[4] - exp(w[5] * 3) + 1
        next = w[7] * d0easy + (1 - w[7]) * next
        return Self.clampD(next)
    }

    func stabilityRecall(_ d: Double, _ s: Double, _ r: Double, _ g: Rating) -> Double {
        let hard = g == 2 ? w[15] : 1
        let easy = g == 4 ? w[16] : 1
        let inc = exp(w[8]) * (11 - d) * pow(s, -w[9]) * (exp(w[10] * (1 - r)) - 1) * hard * easy
        return Self.clampS(s * (1 + inc))
    }

    func stabilityForget(_ d: Double, _ s: Double, _ r: Double) -> Double {
        let sf = w[11] * pow(d, -w[12]) * (pow(s + 1, w[13]) - 1) * exp(w[14] * (1 - r))
        return Self.clampS(min(sf, s))
    }

    public func review(_ card: Card?, _ g: Rating, now: Double) -> Card {
        var out = card ?? Card()
        if card == nil || card?.state == "new" || card?.stability == nil {
            out.stability = initStability(g)
            out.difficulty = initDifficulty(g)
            out.reps = 1
            out.lapses = 0
        } else if let card, let stability = card.stability {
            let elapsed = max(0, (now - or(card.lastReview, now)) / DAY_MS)
            let s = Self.clampS(stability)
            let r = retrievability(elapsed, s)
            let d = Self.clampD(card.difficulty ?? initDifficulty(3))
            if g == 1 {
                out.stability = stabilityForget(d, s, r)
                out.lapses = or(card.lapses, 0) + 1
            } else {
                out.stability = stabilityRecall(d, s, r, g)
            }
            out.difficulty = nextDifficulty(d, g)
            out.reps = or(card.reps, 0) + 1
        }
        out.state = g == 1 ? "relearning" : "review"
        out.lastReview = now
        let ivl = g == 1 ? 1 : interval(out.stability!)
        out.scheduledDays = ivl
        out.due = now + ivl * DAY_MS
        return out
    }

    public func mastery(_ card: Card?) -> Double {
        guard let s = card?.stability else { return 0 }
        return max(0, min(1, 1 - exp(-s / 21)))
    }
}

func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }

public struct Proficiency: Sendable, Equatable {
    public var theta: Double
    public var n: Double
}

public struct DayStats: Sendable, Equatable {
    public var new: Double
    public var reviews: Double
}

public struct EngineState: Sendable, Equatable {
    public var cards = OrderedMap<Card>()
    public var prof = OrderedMap<Proficiency>()
    public var newPerDay: Double = 4
    public var requestRetention: Double = 0.9
    public var settingsExtra = JSObject()
    public var xp: Double = 0
    public var streak: Double = 0
    public var lastStudyDay: String?
    public var history = OrderedMap<DayStats>()

    public init() {}

    public init(js: JSValue?) {
        guard let o = js?.object else { return }
        if let cs = o["cards"]?.object { for (k, v) in cs.entries { cards[k] = Card(js: v) } }
        if let ps = o["prof"]?.object {
            for (k, v) in ps.entries { prof[k] = Proficiency(theta: v["theta"]?.number ?? 0, n: v["n"]?.number ?? 0) }
        }
        if let s = o["settings"]?.object {
            for (k, v) in s.entries {
                switch k {
                case "newPerDay": newPerDay = v.number ?? newPerDay
                case "requestRetention": requestRetention = v.number ?? requestRetention
                default: settingsExtra[k] = v
                }
            }
        }
        if let st = o["stats"]?.object {
            xp = st["xp"]?.number ?? 0
            streak = st["streak"]?.number ?? 0
            lastStudyDay = st["lastStudyDay"]?.string
            if let h = st["history"]?.object {
                for (k, v) in h.entries { history[k] = DayStats(new: v["new"]?.number ?? 0, reviews: v["reviews"]?.number ?? 0) }
            }
        }
    }

    public var js: JSValue {
        var cs = JSObject()
        for (k, c) in cards.entries { cs[k] = c.js }
        var ps = JSObject()
        for (k, p) in prof.entries { ps[k] = .object(JSObject([("theta", .number(p.theta)), ("n", .number(p.n))])) }
        var settings = JSObject([("newPerDay", .number(newPerDay)), ("requestRetention", .number(requestRetention))])
        for (k, v) in settingsExtra.entries { settings[k] = v }
        var h = JSObject()
        for (k, d) in history.entries { h[k] = .object(JSObject([("new", .number(d.new)), ("reviews", .number(d.reviews))])) }
        let stats = JSObject([("xp", .number(xp)), ("streak", .number(streak)), ("lastStudyDay", lastStudyDay.map(JSValue.string) ?? .null), ("history", .object(h))])
        return .object(JSObject([("cards", .object(cs)), ("prof", .object(ps)), ("settings", .object(settings)), ("stats", .object(stats))]))
    }

    public var fsrs: FSRS {
        var f = FSRS()
        f.requestRetention = or(requestRetention, 0.9)
        return f
    }
}

public func dayKey(_ now: Double, tz: TimeZone = .current) -> String {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = tz
    let c = cal.dateComponents([.year, .month, .day], from: Date(timeIntervalSince1970: now / 1000))
    return "\(c.year!)-\(c.month!)-\(c.day!)"
}

public func dayKey(_ now: Double, tzName: String?) -> String {
    if let tzName, let tz = TimeZone(identifier: tzName) { return dayKey(now, tz: tz) }
    return dayKey(now)
}

enum Adaptive {
    static let profDepthB: [String: Double] = ["recall": -0.8, "apply": -0.2, "derive": 0.6, "teach": 1.2]
    static let profRatingScore: [Int: Double] = [1: 0, 2: 0.6, 3: 1, 4: 1]
    static let depthXP: [String: Double] = ["recall": 5, "apply": 8, "derive": 14, "teach": 20]
    static let encompassBase = 0.6
    static let encompassDecay = 0.5
    static let encompassMin = 0.05
    static let encompassMaxHops = 4
    static let fireMaxCredit = 0.5
    static let fireMaxStabilityGain = 0.15
    static let fireMinRetrievability = 0.6
    static let fireMinRating = 3
}

func updateProficiency(_ prof: Proficiency?, _ depth: String, _ score: Double) -> Proficiency {
    let p = prof ?? Proficiency(theta: 0, n: 0)
    let b = Adaptive.profDepthB[depth] ?? 0
    let pr = 1 / (1 + exp(-(1.0 * (p.theta - b))))
    let k = 1.0 / (1 + 0.05 * p.n)
    return Proficiency(theta: p.theta + k * (score - pr), n: p.n + 1)
}

public func grade(_ state: EngineState, encompassing: [String: [EncEdge]] = [:], id: String, rating: Rating, level: String = "recall", now: Double, tz: String? = nil) -> EngineState {
    var next = state
    let fsrs = next.fsrs
    let prev = next.cards[id] ?? Card(state: "new")
    let wasNew = next.cards[id] == nil || prev.state == "new"
    next.cards[id] = fsrs.review(prev, rating, now: now)
    let score = Adaptive.profRatingScore[rating] ?? (rating > 1 ? 1 : 0)
    next.prof[id] = updateProficiency(next.prof[id], level, score)
    if rating >= Adaptive.fireMinRating {
        for p in fireCredits(encompassing[id] ?? [], next.cards, fsrs, now: now, ratingScore: score) {
            guard var c = next.cards[p.id] else { continue }
            c.stability = p.stability
            c.due = p.due
            c.firedCredit = toFixed((c.firedCredit ?? 0) + p.credit, 4)
            next.cards[p.id] = c
        }
    }
    if rating > 1 { next.xp += Adaptive.depthXP[level] ?? 5 }
    let dk = dayKey(now, tzName: tz)
    var h = next.history[dk] ?? DayStats(new: 0, reviews: 0)
    if wasNew { h.new += 1 } else { h.reviews += 1 }
    next.history[dk] = h
    if next.lastStudyDay != dk {
        next.streak = next.lastStudyDay == dayKey(now - DAY_MS, tzName: tz) ? next.streak + 1 : 1
        next.lastStudyDay = dk
    }
    return next
}

public func mergeState(_ a: EngineState?, _ b: EngineState?) -> EngineState {
    guard let a else { return b ?? EngineState() }
    guard let b else { return a }
    var out = EngineState()
    out.newPerDay = b.newPerDay
    out.requestRetention = b.requestRetention
    out.settingsExtra = a.settingsExtra
    for (k, v) in b.settingsExtra.entries { out.settingsExtra[k] = v }
    FlagMisses.mergeSynced(&out.settingsExtra, a.settingsExtra, b.settingsExtra)
    var ids = a.cards.keys
    for k in b.cards.keys where !a.cards.has(k) { ids.append(k) }
    for id in ids {
        let ca = a.cards[id]
        let cb = b.cards[id]
        if ca == nil { out.cards[id] = cb } else if cb == nil { out.cards[id] = ca } else { out.cards[id] = or(cb!.lastReview, 0) >= or(ca!.lastReview, 0) ? cb : ca }
    }
    var pids = a.prof.keys
    for k in b.prof.keys where !a.prof.has(k) { pids.append(k) }
    for id in pids {
        let pa = a.prof[id]
        let pb = b.prof[id]
        out.prof[id] = pa == nil ? pb : pb == nil ? pa : (pb!.n >= pa!.n ? pb : pa)
    }
    out.xp = max(a.xp, b.xp)
    out.streak = max(a.streak, b.streak)
    out.lastStudyDay = latestDay(a.lastStudyDay, b.lastStudyDay)
    var days = a.history.keys
    for k in b.history.keys where !a.history.has(k) { days.append(k) }
    for d in days {
        let x = a.history[d] ?? DayStats(new: 0, reviews: 0)
        let y = b.history[d] ?? DayStats(new: 0, reviews: 0)
        out.history[d] = DayStats(new: max(x.new, y.new), reviews: max(x.reviews, y.reviews))
    }
    return out
}

func latestDay(_ a: String?, _ b: String?) -> String? {
    guard let a else { return b }
    guard let b else { return a }
    return dayTime(a) >= dayTime(b) ? a : b
}

func dayTime(_ d: String) -> Double {
    let p = d.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3 else { return .nan }
    var c = DateComponents()
    c.year = p[0]
    c.month = p[1]
    c.day = p[2]
    return (Calendar(identifier: .gregorian).date(from: c)?.timeIntervalSince1970 ?? .nan) * 1000
}
