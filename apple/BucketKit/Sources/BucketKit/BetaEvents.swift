import Foundation

public struct BetaEvent: Codable, Sendable, Equatable {
    public let id: String
    public let name: String
    public let ts: String
    public let sessionId: String?
    public let props: [String: JSONScalar]

    enum CodingKeys: String, CodingKey {
        case id, name, ts, props
        case sessionId = "session_id"
    }

    public init(id: String = UUID().uuidString.lowercased(), name: String, at date: Date = .now, sessionId: String?, props: [String: JSONScalar] = [:]) {
        self.id = id
        self.name = name
        self.ts = ISO8601DateFormatter().string(from: date)
        self.sessionId = sessionId
        self.props = props
    }

    public static let heldAgeLimit = 29.0 * 86_400

    public func restamped(at now: Date) -> BetaEvent {
        guard let then = ISO8601DateFormatter().date(from: ts), now.timeIntervalSince(then) > Self.heldAgeLimit else { return self }
        return BetaEvent(id: id, name: name, at: now, sessionId: sessionId, props: props)
    }
}

public enum JSONScalar: Codable, Sendable, Equatable {
    case string(String), number(Double), bool(Bool)

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let b = try? c.decode(Bool.self) { self = .bool(b) } else if let n = try? c.decode(Double.self) { self = .number(n) } else { self = .string(try c.decode(String.self)) }
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let s): try c.encode(String(s.prefix(128)))
        case .number(let n): try c.encode(n)
        case .bool(let b): try c.encode(b)
        }
    }
}

public struct BetaFlush: Equatable, Sendable {
    public let sent: Int
    public let kept: Int
}

public actor BetaEvents {
    public static let batchSize = 100
    public static let maxQueue = 2000
    public static let optOutKey = "beta.optedOut"
    public static let pendingKey = "beta.optOutPending"
    public static let ownerKey = "beta.queueOwner"
    public static let heldKey = "beta.heldForSignIn"

    let app: String
    let base: URL
    let transport: any Transport
    let file: URL
    let defaults: UserDefaults
    var queue: [BetaEvent]
    var flushing = false

    public init(app: String, base: URL = BucketAPI.production, transport: any Transport = URLSessionTransport(), file: URL, suite: String? = nil) {
        self.app = app
        self.base = base
        self.transport = transport
        self.file = file
        self.defaults = suite.flatMap(UserDefaults.init(suiteName:)) ?? .standard
        queue = (try? JSONDecoder().decode([BetaEvent].self, from: Data(contentsOf: file))) ?? []
    }

    public var optedOut: Bool { defaults.bool(forKey: Self.optOutKey) }
    public var pending: Int { queue.count }

    public var owner: String? { defaults.string(forKey: Self.ownerKey) }

    public func log(_ event: BetaEvent, owner: String) {
        guard !optedOut else { return }
        if self.owner != owner {
            queue = []
            defaults.set(owner, forKey: Self.ownerKey)
        }
        queue.append(event)
        if queue.count > Self.maxQueue { queue.removeFirst(queue.count - Self.maxQueue) }
        save()
    }

    public var held: [BetaEvent] {
        defaults.data(forKey: Self.heldKey).flatMap { try? JSONDecoder().decode([BetaEvent].self, from: $0) } ?? []
    }

    public func hold(_ event: BetaEvent) {
        guard !optedOut else { return }
        let next = held.filter { $0.name != event.name } + [event]
        defaults.set(try? JSONEncoder().encode(next), forKey: Self.heldKey)
    }

    func adoptHeld(owner: String, now: Date) {
        let waiting = held
        guard !waiting.isEmpty else { return }
        defaults.removeObject(forKey: Self.heldKey)
        for event in waiting { log(event.restamped(at: now), owner: owner) }
    }

    public var pendingOptOut: Bool? { defaults.object(forKey: Self.pendingKey) as? Bool }

    public func flush(token: String?, owner: String?, now: Date = .now) async -> BetaFlush {
        if let token, let pending = pendingOptOut { await sendOptOut(pending, token: token) }
        if let owner, self.owner != nil, self.owner != owner { dropQueue() }
        if let owner { adoptHeld(owner: owner, now: now) }
        guard let token, owner != nil, !flushing, !queue.isEmpty, !optedOut else { return BetaFlush(sent: 0, kept: queue.count) }
        flushing = true
        defer { flushing = false }
        var sent = 0
        while !queue.isEmpty {
            let batch = Array(queue.prefix(Self.batchSize))
            guard let status = await post(batch, token: token) else { break }
            if status == 200 || status == 400 || status == 413 {
                queue.removeFirst(batch.count)
                sent += status == 200 ? batch.count : 0
                save()
            } else {
                break
            }
        }
        return BetaFlush(sent: sent, kept: queue.count)
    }

    public func setOptedOut(_ out: Bool, token: String?) async {
        defaults.set(out, forKey: Self.optOutKey)
        defaults.set(out, forKey: Self.pendingKey)
        if out {
            queue = []
            defaults.removeObject(forKey: Self.heldKey)
            save()
        }
        if let token { await sendOptOut(out, token: token) }
    }

    func sendOptOut(_ out: Bool, token: String) async {
        var r = URLRequest(url: base.appending(path: "api/beta/opt-out"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try? JSONEncoder().encode(["opted_out": out])
        guard let (_, http) = try? await transport.send(r), http.statusCode == 200 else { return }
        if pendingOptOut == out { defaults.removeObject(forKey: Self.pendingKey) }
    }

    public func record(_ event: BetaEvent, route: BetaRoute) {
        switch route {
        case .log(let owner): log(event, owner: owner)
        case .hold: hold(event)
        case .drop: break
        }
    }

    public func clearQueue() {
        defaults.removeObject(forKey: Self.heldKey)
        dropQueue()
    }

    func dropQueue() {
        queue = []
        defaults.removeObject(forKey: Self.ownerKey)
        save()
    }

    func post(_ batch: [BetaEvent], token: String) async -> Int? {
        struct Body: Encodable { let app: String; let events: [BetaEvent] }
        var r = URLRequest(url: base.appending(path: "api/beta/events"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try? JSONEncoder().encode(Body(app: app, events: batch))
        guard let (_, http) = try? await transport.send(r) else { return nil }
        return http.statusCode
    }

    func save() {
        try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? JSONEncoder().encode(queue).write(to: file, options: .atomic)
    }
}

extension BetaEvent {
    public static func answeredProps(deck: String, correct: Bool, ms: Int, kind: String, question: Question? = nil, streak: Int? = nil) -> [String: JSONScalar] {
        var props: [String: JSONScalar] = ["deck": .string(deck), "correct": .bool(correct), "ms": .number(Double(ms)), "kind": .string(kind)]
        if let question {
            props["question_kind"] = .string(question.kind.rawValue)
            props["applied"] = .bool(question.applied == true)
        }
        if let streak { props.merge(streakProps(streak)) { $1 } }
        return props
    }

    public static func wordProps(lang: String, itemId: String, stage: String, streak: Int) -> [String: JSONScalar] {
        ["lang": .string(lang), "item": .string(itemId), "stage": .string(stage)].merging(streakProps(streak)) { $1 }
    }

    public static func knownProps(_ known: KnownLanguages, source: KnownSource) -> [String: JSONScalar]? {
        guard !known.isBlank else { return nil }
        return ["count": .number(Double(min(known.codes.count, 40))), "codes": .string(known.eventCodes), "source": .string(source.rawValue)]
    }

    public static func known(_ known: KnownLanguages, source: KnownSource, sessionId: String?) -> BetaEvent? {
        knownProps(known, source: source).map { BetaEvent(name: knownName, sessionId: sessionId, props: $0) }
    }

    public static let knownName = "known_languages_set"

    public static func streakProps(_ day: Int) -> [String: JSONScalar] {
        ["streak_day": .number(Double(max(0, day))), "streak_band": .string(StreakBand.of(day).rawValue)]
    }
}

public enum BetaRoute: Equatable, Sendable {
    case log(String), hold, drop

    public static func of(owner: String?, signedIn: Bool) -> BetaRoute {
        if let owner { return .log(owner) }
        return signedIn ? .drop : .hold
    }
}

@MainActor
public final class OrderedTasks {
    private var tail: Task<Void, Never>?

    public init() {}

    public func run(_ work: @escaping @Sendable () async -> Void) {
        let before = tail
        tail = Task {
            await before?.value
            await work()
        }
    }

    public func drain() async { await tail?.value }
}

public enum KnownSource: String, CaseIterable, Sendable {
    case onboarding, settings
    case updateSheet = "update_sheet"
}

public enum StreakBand: String, CaseIterable, Sendable {
    case under7 = "0-6"
    case week = "7-29"
    case month = "30-99"
    case hundred = "100+"

    public static func of(_ day: Int) -> StreakBand {
        switch day {
        case 100...: .hundred
        case 30...: .month
        case 7...: .week
        default: .under7
        }
    }
}
