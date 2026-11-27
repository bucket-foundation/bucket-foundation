import Foundation

public struct StudyGate: Equatable, Sendable {
    public var state: UploadGate
    public var at: Double
    public var holdUntil: Double?
    public init(state: UploadGate, at: Double, holdUntil: Double? = nil) { self.state = state; self.at = at; self.holdUntil = holdUntil }
    public static let recheckMs = 86_400_000.0
    public func probes(now: Double) -> Bool { state == .unknown || (state == .closed && now - at >= Self.recheckMs) }
}

public struct StudyPrefs: @unchecked Sendable {
    public static let base = "polingual.ci14"
    nonisolated(unsafe) public static var signedIn: String?
    static let gateKey = "polingual.reviewLog.gate"
    let d: UserDefaults
    public let account: String?

    public init(_ defaults: UserDefaults = .standard, account: String? = StudyPrefs.signedIn) {
        d = defaults
        self.account = account.flatMap { $0.isEmpty ? nil : $0 }
    }

    func key(_ name: String) -> String? { account.map { "\(Self.base).\($0).\(name)" } }
    func string(_ name: String) -> String? { key(name).flatMap { d.string(forKey: $0) } }
    func put(_ v: Any?, _ name: String) {
        guard let k = key(name) else { return }
        if let v { d.set(v, forKey: k) } else { d.removeObject(forKey: k) }
    }

    public var disclosed: Bool { string("disclosed") == "1" }
    public var optedOut: Bool { string("optedOut") == "1" }

    public func join() {
        put("1", "disclosed")
        put(nil, "optedOut")
    }

    public func leave() {
        put("1", "disclosed")
        put("1", "optedOut")
    }

    public var taken: (baseline: Bool, day28: Bool) {
        let t = string("taken") ?? ""
        return (t.contains("baseline"), t.contains("day28"))
    }

    public func markTaken(_ phase: String) {
        let t = taken
        put([t.baseline || phase == "baseline" ? "baseline" : "", t.day28 || phase == "day28" ? "day28" : ""].filter { !$0.isEmpty }.joined(separator: ","), "taken")
    }

    public var enrolment: InputExperiment.Enrolment? { InputExperiment.parseEnrolment(key("enrolment").flatMap { d.data(forKey: $0) }) }

    public func cache(_ e: InputExperiment.Enrolment) {
        if let data = try? JSONEncoder().encode(e) { put(data, "enrolment") }
    }

    public var gate: StudyGate {
        guard let o = d.dictionary(forKey: Self.gateKey), let s = (o["state"] as? String).flatMap(UploadGate.init(rawValue:)), let at = o["at"] as? Double else { return StudyGate(state: .unknown, at: 0) }
        return StudyGate(state: s, at: at, holdUntil: o["holdUntil"] as? Double)
    }

    public func setGate(_ g: StudyGate) {
        var o: [String: Any] = ["state": g.state.rawValue, "at": g.at]
        if let h = g.holdUntil { o["holdUntil"] = h }
        d.set(o, forKey: Self.gateKey)
    }

    public func consent(flag: Bool) -> InputExperiment.Consent {
        InputExperiment.Consent(flag: flag, uploadOpen: gate.state == .open, disclosed: disclosed, optedOut: optedOut)
    }

    public enum Step: Equatable, Sendable {
        case disclose
        case test(String)
    }

    public func step(flag: Bool, now: Double) -> Step? {
        let c = consent(flag: flag)
        if account == nil || !c.flag || !c.uploadOpen || c.optedOut { return nil }
        if !c.disclosed { return .disclose }
        let t = taken
        if !t.baseline { return .test("baseline") }
        return YesNoTest.due(enrolledAt: enrolment?.at, now: now, baseline: t.baseline, day28: t.day28) == "day28" ? .test("day28") : nil
    }

    public func showsLeave(flag: Bool) -> Bool { account != nil && flag && disclosed && !optedOut }
}

public enum ServerEnrolment: Equatable, Sendable {
    case failed
    case known(InputExperiment.Enrolment?)
}

public struct EventReply: Equatable, Sendable {
    public var outcome: String
    public var limited: [String]
    public init(outcome: String, limited: [String]) { self.outcome = outcome; self.limited = limited }
}

extension BucketAPI {
    static func enrolmentIn(_ data: Data) -> InputExperiment.Enrolment?? {
        guard let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }
        guard let e = o["enrolment"], !(e is NSNull) else { return .some(nil) }
        return .some(InputExperiment.parseEnrolment(try? JSONSerialization.data(withJSONObject: e)))
    }

    public func fetchEnrolment(token: String) async -> ServerEnrolment {
        var r = URLRequest(url: base.appending(path: "api/academy/experiment"))
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.cachePolicy = .reloadIgnoringLocalCacheData
        guard let (data, http) = try? await transport.send(r), http.statusCode == 200, let e = Self.enrolmentIn(data) else { return .failed }
        return .known(e)
    }

    public func registerEnrolment(token: String, stratum: String) async -> InputExperiment.Enrolment? {
        var r = URLRequest(url: base.appending(path: "api/academy/experiment"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try? JSONSerialization.data(withJSONObject: ["experiment": InputExperiment.experimentId, "stratum": stratum])
        guard let (data, http) = try? await transport.send(r), (200..<300).contains(http.statusCode), let e = Self.enrolmentIn(data) else { return nil }
        return e
    }

    public func postEvents(token: String, events: [[String: Any]]) async -> EventReply {
        let retry = EventReply(outcome: "retry", limited: [])
        var r = URLRequest(url: base.appending(path: "api/academy/event"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try? JSONSerialization.data(withJSONObject: ["events": events])
        guard let (data, http) = try? await transport.send(r), http.statusCode == 200,
              let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let outcome = o["outcome"] as? String else { return retry }
        if ["under_age", "no_consent", "no_profile"].contains(outcome) { return EventReply(outcome: outcome, limited: []) }
        guard outcome == "recorded" else { return retry }
        let limited = ((o["results"] as? [[String: Any]]) ?? []).filter { $0["outcome"] as? String == "rate_limited" }.compactMap { $0["id"] as? String }
        return EventReply(outcome: outcome, limited: limited)
    }
}

public enum StudyEnrolment {
    @MainActor
    public static func plan<T>(consent: InputExperiment.Consent, account: String?, device: String, prefs: StudyPrefs, token: String?,
                               fetch: (String) async -> ServerEnrolment, register: (String, String) async -> InputExperiment.Enrolment?,
                               compute: (InputExperiment.Consent, InputExperiment.Enrolment?, String?) -> T?, enrolment: (T) -> InputExperiment.Enrolment?) async -> T? {
        guard InputExperiment.mayTakePart(consent) else { return compute(consent, nil, nil) }
        var off = consent
        off.flag = false
        guard let token, case .known(let known) = await fetch(token) else { return compute(off, nil, nil) }
        if let known { prefs.cache(known) }
        let key = account.map { !$0.isEmpty } == true && prefs.taken.baseline ? InputExperiment.enrolmentKey(account: account, device: device) : nil
        guard let planned = compute(consent, known, key) else { return nil }
        guard let fresh = enrolment(planned), known == nil else { return planned }
        let saved = await register(token, fresh.stratum)
        if let saved { prefs.cache(saved) }
        return compute(saved == nil ? off : consent, saved, nil)
    }
}

extension InputExperiment {
    public static func withoutHeldOut(_ queue: [QueueEntry], corpus: LangCorpus, sets: [String: Set<String>]) -> [QueueEntry] {
        if sets.isEmpty { return queue }
        return queue.filter { e in
            guard let item = corpus.byId[e.itemId], item.kind == .word else { return true }
            return !item.forms.contains { l, f in sets[l]?.contains(YesNoTest.normalizeWord(f)) == true }
        }
    }
}

extension YesNoTest {
    public static func forms(_ data: Data?) -> [String: [TestItem]]? {
        guard let data, let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let f = o["forms"] as? [String: Any] else { return nil }
        var out: [String: [TestItem]] = [:]
        for key in ["A", "B"] {
            guard let raw = f[key] as? [[String: Any]] else { return nil }
            let items = raw.compactMap { x -> TestItem? in
                guard let w = x["word"] as? String, let r = x["real"] as? Bool else { return nil }
                return TestItem(word: w, real: r, band: x["band"] as? Int)
            }
            guard items.count == raw.count, !items.isEmpty else { return nil }
            out[key] = items
        }
        return out
    }

    public static func row(phase: String, lang: String, items: [TestItem], yes: Set<String>, seconds: Double, enrolment: InputExperiment.Enrolment?, meta: LogRow.Meta) -> LogRow {
        let s = score(items, yes: yes)
        let day = enrolment.map { max(0, Int(((meta.at - $0.at) / dayMs).rounded(.down))) } ?? 0
        return .vocabTest(.init(meta: meta, lang: lang, phase: phase, form: phase == "baseline" ? "A" : "B", arm: enrolment?.arm, hits: s.hits, words: s.words,
                                falseAlarms: s.falseAlarms, pseudowords: s.pseudowords, known: (s.known * 10).rounded() / 10, day: min(day, 3650), seconds: min(3600, Int(seconds.rounded()))))
    }
}

public enum StudyFlush: String, Sendable { case sent, replayOnly, held, empty }

@MainActor
public final class StudyUploader {
    static let file = "study-outbox.json"
    public static let maxPending = 2000
    let api: BucketAPI
    let disk: LangDisk
    let prefs: StudyPrefs
    let token: @MainActor () async -> String?
    let now: @MainActor () -> Double
    private var flushing = false

    public init(api: BucketAPI, disk: LangDisk, prefs: StudyPrefs = StudyPrefs(), token: @escaping @MainActor () async -> String?, now: @escaping @MainActor () -> Double = { Date().timeIntervalSince1970 * 1000 }) {
        self.api = api; self.disk = disk; self.prefs = prefs; self.token = token; self.now = now
    }

    public var pending: [LogRow] {
        guard let d = disk.read(Self.file), let a = (try? JSONSerialization.jsonObject(with: d)) as? [Any] else { return [] }
        return a.compactMap(ReviewLog.parse)
    }

    func write(_ rows: [LogRow]) {
        let raw = rows.compactMap(ReviewLog.encode)
        if raw.isEmpty { disk.remove(Self.file); return }
        if let d = try? JSONSerialization.data(withJSONObject: raw) { disk.write(Self.file, d) }
    }

    public func add(_ rows: [LogRow]) {
        let study = rows.filter { !$0.isReview }
        guard !study.isEmpty, prefs.gate.state != .closed else { return }
        write(Array((pending + study).suffix(Self.maxPending)))
    }

    public func flush() async -> StudyFlush {
        guard !flushing else { return .held }
        flushing = true
        defer { flushing = false }
        guard let t = await token() else { return .held }
        var gate = prefs.gate
        if gate.probes(now: now()) {
            let r = await api.postEvents(token: t, events: [])
            gate = next(r.outcome, gate)
            prefs.setGate(gate)
        }
        if gate.state == .closed { write([]); return .replayOnly }
        if gate.state != .open { return .held }
        if let h = gate.holdUntil, now() < h { return .held }
        let rows = pending
        guard let events = ReviewLog.batch(rows, gate: .open) else { return .empty }
        let reply = await api.postEvents(token: t, events: events)
        var after = next(reply.outcome, gate)
        if after.state == .closed { prefs.setGate(after); write([]); return .replayOnly }
        guard reply.outcome == "recorded" else { prefs.setGate(after); return .held }
        let limited = Set(reply.limited)
        if !limited.isEmpty {
            let d = Date(timeIntervalSince1970: now() / 1000)
            var cal = Calendar(identifier: .gregorian)
            cal.timeZone = TimeZone(identifier: "UTC")!
            after.holdUntil = cal.nextDate(after: d, matching: DateComponents(hour: 0, minute: 0, second: 0), matchingPolicy: .nextTime).map { $0.timeIntervalSince1970 * 1000 }
        }
        prefs.setGate(after)
        let done = Set(events.compactMap { $0["id"] as? String }).subtracting(limited)
        write(pending.filter { !done.contains($0.meta.id) })
        return limited.isEmpty ? .sent : .held
    }

    func next(_ outcome: String, _ g: StudyGate) -> StudyGate {
        let s = ReviewLog.gate(after: outcome, from: g.state)
        return s == g.state && outcome != "recorded" && s != .closed ? g : StudyGate(state: s, at: now())
    }
}
