import Foundation

public struct MetricRow: Equatable, Sendable {
    public var kind: String?
    public var lang: String?
    public var reviewedAt: Double
    public var tz: String?
    public var seconds: Double?
    public var coveragePred: Double?
    public var started: Double?
    public var ended: Double?
    public var lemmasSeen: [String]
    public var taps: [String]
    public init(kind: String? = nil, lang: String? = nil, reviewedAt: Double, tz: String? = nil, seconds: Double? = nil, coveragePred: Double? = nil, started: Double? = nil, ended: Double? = nil, lemmasSeen: [String] = [], taps: [String] = []) {
        self.kind = kind; self.lang = lang; self.reviewedAt = reviewedAt; self.tz = tz; self.seconds = seconds; self.coveragePred = coveragePred
        self.started = started; self.ended = ended; self.lemmasSeen = lemmasSeen; self.taps = taps
    }
}

public struct MetricCard: Equatable, Sendable {
    public var stability: Double?
    public var lastReview: Double?
    public init(stability: Double? = nil, lastReview: Double? = nil) { self.stability = stability; self.lastReview = lastReview }
}

public struct LangMetrics: Equatable, Sendable {
    public var inputSeconds: Double
    public var inputHours: Double
    public var knownWords: Int
}

public struct InputStreak: Equatable, Sendable {
    public var streak: Int
    public var studiedToday: Bool
}

public enum ProgressMetric {
    public static let inputCoverage = 0.9
    public static let streakInputSeconds = 300.0

    public static func countsAsInput(_ r: MetricRow, lang: String) -> Bool {
        r.kind == "exposure" && r.lang == lang && (r.seconds ?? 0) > 0 && (r.coveragePred ?? -1) >= inputCoverage
    }

    public static func inputSeconds(_ rows: [MetricRow], lang: String) -> Double {
        rows.filter { countsAsInput($0, lang: lang) }.reduce(0) { $0 + ($1.seconds ?? 0) }
    }

    public static func dayKey(_ at: Double, tz: String?) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz.flatMap(TimeZone.init(identifier:)) ?? TimeZone(identifier: "UTC")!
        let c = cal.dateComponents([.year, .month, .day], from: Date(timeIntervalSince1970: at / 1000))
        return "\(c.year!)-\(c.month!)-\(c.day!)"
    }

    public static func inputDays(_ rows: [MetricRow], lang: String) -> [String] {
        let input = rows.filter { countsAsInput($0, lang: lang) }
        var days = Set<String>()
        for s in rows {
            guard s.kind == "session", s.lang == lang, let started = s.started, let ended = s.ended else { continue }
            let sum = input.filter { $0.reviewedAt >= started && $0.reviewedAt <= ended }.reduce(0) { $0 + ($1.seconds ?? 0) }
            if sum >= streakInputSeconds { days.insert(dayKey(ended, tz: s.tz)) }
        }
        return days.sorted()
    }

    public static func epochDay(_ day: String) -> Int {
        let p = day.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return Int.min }
        let y = p[0] - (p[1] <= 2 ? 1 : 0)
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let mp = (p[1] + 9) % 12
        let doy = (153 * mp + 2) / 5 + p[2] - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }

    public static func streakFromDays<S: Sequence>(_ days: S, today: String) -> InputStreak where S.Element == String {
        let set = Set(days.map(epochDay))
        let t = epochDay(today)
        let studiedToday = set.contains(t)
        var cur = studiedToday ? t : t - 1
        var streak = 0
        while set.contains(cur) {
            streak += 1
            cur -= 1
        }
        return InputStreak(streak: streak, studiedToday: studiedToday)
    }

    public static func streak(studyDays: [String], log: [MetricRow], langs: [String], today: String) -> InputStreak {
        streakFromDays(studyDays + langs.flatMap { inputDays(log, lang: $0) }, today: today)
    }

    public static func rows(_ log: [LogRow]) -> [MetricRow] {
        log.compactMap { r in
            switch r {
            case .vocabTest: nil
            case .exposure(let e): MetricRow(kind: "exposure", lang: e.lang, reviewedAt: e.meta.at, tz: e.meta.tz, seconds: Double(e.seconds), coveragePred: e.coveragePred, lemmasSeen: e.lemmasSeen, taps: e.taps)
            case .session(let s): MetricRow(kind: "session", lang: s.lang, reviewedAt: s.meta.at, tz: s.meta.tz, started: s.started, ended: s.ended)
            case .review(let v): MetricRow(kind: "review", reviewedAt: v.meta.at, tz: v.meta.tz)
            }
        }
    }

    public static func cards(_ states: [EngineState]) -> [String: MetricCard] {
        var out: [String: MetricCard] = [:]
        for s in states {
            for id in s.cards.keys {
                guard let c = s.cards[id], let st = c.stability, st > 0 else { continue }
                if let prev = out[id], (prev.lastReview ?? 0) >= (c.lastReview ?? 0) { continue }
                out[id] = MetricCard(stability: st, lastReview: c.lastReview)
            }
        }
        return out
    }

    public static func lemmaEvidence(lang: String, cards: [String: MetricCard], rows: [MetricRow]) -> [String: LemmaEvidence] {
        let prefix = "\(lang):"
        var out: [String: LemmaEvidence] = [:]
        for (id, c) in cards where id.hasPrefix(prefix) {
            out[String(id.dropFirst(prefix.count))] = LemmaEvidence(stability: c.stability, lastReview: c.lastReview)
        }
        for r in rows where r.kind == "exposure" && r.lang == lang {
            for l in Set(r.lemmasSeen) { out[l, default: LemmaEvidence()].exposures += 1 }
            for l in Set(r.taps) { out[l, default: LemmaEvidence()].lastTap = max(out[l]?.lastTap ?? -.infinity, r.reviewedAt) }
        }
        return out
    }

    public static func langMetrics(lang: String, cards: [String: MetricCard], rows: [MetricRow], now: Double, tier: Int = 0) -> LangMetrics {
        let secs = inputSeconds(rows, lang: lang)
        let known = LearnerModel.knownCount(lemmaEvidence(lang: lang, cards: cards, rows: rows), now: now, tier: tier)
        return LangMetrics(inputSeconds: secs, inputHours: (secs / 360).rounded(.down) / 10, knownWords: Int(known.rounded()))
    }
}
