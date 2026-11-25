import Foundation

public enum LogRow: Equatable, Sendable {
    case review(Review)
    case exposure(Exposure)
    case session(Session)

    public struct Meta: Equatable, Sendable {
        public var id: String
        public var at: Double
        public var device: String
        public var tz: String
        public var systemId: String
    }

    public struct Review: Equatable, Sendable {
        public var meta: Meta
        public var card: String
        public var rating: Int
        public var elapsedDays: Double?
        public var sBefore: Double?
        public var sAfter: Double?
        public var d: Double?
    }

    public struct Exposure: Equatable, Sendable {
        public var meta: Meta
        public var lang: String
        public var item: String
        public var unit: String
        public var lemmasSeen: [String]
        public var taps: [String]
        public var seconds: Int
        public var coveragePred: Double
        public var completed: Bool
    }

    public struct Session: Equatable, Sendable {
        public var meta: Meta
        public var lang: String
        public var sessionId: String
        public var started: Double
        public var ended: Double
        public var shareTarget: Double
        public var shareReal: Double
        public var arm: String
        public var units: Int
        public var cards: Int
    }

    public var meta: Meta {
        switch self {
        case .review(let r): r.meta
        case .exposure(let e): e.meta
        case .session(let s): s.meta
        }
    }

    public var isReview: Bool {
        if case .review = self { return true }
        return false
    }
}

public struct CardSummary: Equatable, Sendable {
    public var reps: Int
    public var lapses: Int
    public var stability: Double?
    public var difficulty: Double?
    public var lastReview: Double
}

public enum UploadGate: String, Sendable {
    case unknown, open, closed
}

public enum ReviewLog {
    public static let maxLemmas = 200
    public static let maxTaps = 50
    public static let maxExposureSeconds = 3600
    public static let maxSessionItems = 1000

    private static func matches(_ s: String, _ pattern: String) -> Bool {
        s.range(of: pattern, options: .regularExpression) != nil
    }

    private static func str(_ o: [String: Any], _ k: String, _ max: Int = 128) -> String? {
        guard let s = o[k] as? String, !s.isEmpty, s.count <= max else { return nil }
        return s
    }

    private static func num(_ o: [String: Any], _ k: String) -> Double? {
        guard let n = o[k] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() else { return nil }
        let d = n.doubleValue
        return d.isFinite ? d : nil
    }

    private static func nat(_ o: [String: Any], _ k: String, _ max: Int) -> Int? {
        guard let d = num(o, k), d == d.rounded(), d >= 0, d <= Double(max) else { return nil }
        return Int(d)
    }

    private static func share(_ o: [String: Any], _ k: String) -> Double? {
        guard let d = num(o, k), d >= 0, d <= 1 else { return nil }
        return d
    }

    private static func lemmas(_ o: [String: Any], _ k: String, _ max: Int) -> [String]? {
        guard let a = o[k] as? [Any], a.count <= max else { return nil }
        var out: [String] = []
        for x in a {
            guard let s = x as? String, s.unicodeScalars.count <= 40, matches(s, "^\\S{1,40}$") else { return nil }
            out.append(s)
        }
        return out
    }

    public static func parse(_ raw: Any) -> LogRow? {
        guard let o = raw as? [String: Any],
              let id = str(o, "review_id"), let device = str(o, "device_id", 64), let tz = str(o, "tz", 64),
              let system = o["system_id"] as? String, let at = num(o, "reviewed_at") else { return nil }
        let meta = LogRow.Meta(id: id, at: at, device: device, tz: tz, systemId: system)
        let kind = o["kind"]
        if kind != nil && !(kind is String) { return nil }
        let k = kind as? String
        if k == nil || k == "review" {
            guard let card = str(o, "card_id", 256), let rating = nat(o, "rating", 4), rating >= 1,
                  o["level"] is String, o["atoms_version"] is String else { return nil }
            let m = ["elapsedDays", "S_before", "S_after", "D"].map { num(o, $0).flatMap { $0 >= 0 ? $0 : nil } }
            if m.allSatisfy({ $0 != nil }) {
                return .review(.init(meta: meta, card: card, rating: rating, elapsedDays: m[0], sBefore: m[1], sAfter: m[2], d: m[3]))
            }
            return .review(.init(meta: meta, card: card, rating: rating))
        }
        guard let lang = str(o, "lang", 3), matches(lang, "^[a-z]{2,3}$") else { return nil }
        let key = "^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$"
        switch k {
        case "exposure":
            guard let item = str(o, "item"), matches(item, key), let unit = str(o, "unit"), matches(unit, key),
                  let seen = lemmas(o, "lemmas_seen", maxLemmas), let taps = lemmas(o, "taps", maxTaps),
                  let seconds = nat(o, "seconds", maxExposureSeconds), let cov = share(o, "coverage_pred"),
                  let done = o["completed"] as? NSNumber, CFGetTypeID(done) == CFBooleanGetTypeID() else { return nil }
            return .exposure(.init(meta: meta, lang: lang, item: item, unit: unit, lemmasSeen: seen, taps: taps, seconds: seconds, coveragePred: cov, completed: done.boolValue))
        case "session":
            guard let sid = str(o, "id"), let started = num(o, "started"), let ended = num(o, "ended"), ended >= started,
                  let target = share(o, "share_target"), let real = share(o, "share_real"),
                  let arm = str(o, "arm", 32), matches(arm, "^[a-z0-9_-]{1,32}$"),
                  let units = nat(o, "units", maxSessionItems), let cards = nat(o, "cards", maxSessionItems) else { return nil }
            return .session(.init(meta: meta, lang: lang, sessionId: sid, started: started, ended: ended, shareTarget: target, shareReal: real, arm: arm, units: units, cards: cards))
        default:
            return nil
        }
    }

    private static func before(_ a: LogRow.Meta, _ b: LogRow.Meta) -> Bool {
        if a.at != b.at { return a.at < b.at }
        if a.device != b.device { return a.device < b.device }
        return a.id < b.id
    }

    public static func order(_ rows: [LogRow]) -> [LogRow] {
        var byId: [String: LogRow] = [:]
        for r in rows {
            if let prev = byId[r.meta.id], !before(r.meta, prev.meta) { continue }
            byId[r.meta.id] = r
        }
        return byId.values.sorted { before($0.meta, $1.meta) }
    }

    public static func replay(_ raw: [Any]) -> (accepted: [String], cards: [String: CardSummary]) {
        let rows = order(raw.compactMap(parse))
        var cards: [String: CardSummary] = [:]
        for case .review(let r) in rows {
            let c = cards[r.card] ?? CardSummary(reps: 0, lapses: 0, stability: nil, difficulty: nil, lastReview: 0)
            cards[r.card] = CardSummary(reps: c.reps + 1, lapses: c.lapses + (r.rating == 1 ? 1 : 0), stability: r.sAfter ?? c.stability, difficulty: r.d ?? c.difficulty, lastReview: r.meta.at)
        }
        return (rows.map(\.meta.id), cards)
    }

    public static func shareable(_ rows: [LogRow], gate: UploadGate) -> [LogRow] {
        gate == .open ? rows : rows.filter(\.isReview)
    }

    public static func batch(_ rows: [LogRow], gate: UploadGate) -> [[String: Any]]? {
        if gate == .closed { return nil }
        let events: [[String: Any]] = order(rows).compactMap { row in
            switch row {
            case .review: return nil
            case .exposure(let e):
                return ["id": e.meta.id, "name": "exposure", "props": ["item": e.item, "unit": e.unit, "lemmas_seen": e.lemmasSeen, "taps": e.taps, "seconds": e.seconds, "coverage_pred": e.coveragePred, "completed": e.completed] as [String: Any]]
            case .session(let s):
                return ["id": s.meta.id, "name": "session_mix", "props": ["session": s.sessionId, "share_target": s.shareTarget, "share_real": s.shareReal, "arm": s.arm, "units": s.units, "cards": s.cards, "seconds": min(86_400, Int(((s.ended - s.started) / 1000).rounded()))] as [String: Any]]
            }
        }
        return events.isEmpty ? nil : events
    }

    public static func gate(after outcome: String?, from gate: UploadGate) -> UploadGate {
        switch outcome {
        case "recorded": .open
        case "under_age", "no_consent": .closed
        default: gate
        }
    }
}
